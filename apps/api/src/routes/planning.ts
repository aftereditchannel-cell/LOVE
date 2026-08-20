import { Router } from 'express';
import { z } from 'zod';
import { getDb, newId, now } from '../db';
import { requireAuth, requireCouple, ownedOr404 } from '../middleware/auth';
import { asyncH, ok } from '../lib/http';
import { parse } from '../lib/validate';
import { queueBackup } from '../services/backupQueue';
import { daysBetween, todayStr } from '../lib/dates';

export const calendarRouter = Router();
export const countdownsRouter = Router();
export const tasksRouter = Router();
export const wishlistRouter = Router();
export const bucketRouter = Router();
export const expensesRouter = Router();

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ---------------- Calendar ----------------
const eventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  date: day, time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  reminderMinutes: z.number().int().min(0).max(10080).nullable().optional(),
  color: z.string().max(20).default('rose'),
  kind: z.enum(['event', 'birthday', 'anniversary', 'date', 'trip', 'doctor']).default('event'),
});
const eventOut = (r: any) => ({
  id: r.id, title: r.title, date: r.date, time: r.time, location: r.location, description: r.description,
  reminderMinutes: r.reminder_minutes, color: r.color, kind: r.kind, createdById: r.created_by_id,
});

calendarRouter.get('/events', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const from = String(req.query.from || '0000-01-01'), to = String(req.query.to || '9999-12-31');
  const rows = await db.all(
    'SELECT * FROM calendar_events WHERE couple_id = ? AND deleted_at IS NULL AND date >= ? AND date <= ? ORDER BY date, time',
    [req.coupleId, from, to]);
  ok(res, { events: rows.map(eventOut) });
}));

calendarRouter.post('/events', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(eventSchema, req.body);
  const db = await getDb();
  const id = newId(); const t = now();
  await db.run(
    `INSERT INTO calendar_events (id, couple_id, created_by_id, title, date, time, location, description, reminder_minutes, color, kind, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.coupleId, req.user!.id, body.title, body.date, body.time ?? null, body.location ?? null,
     body.description ?? null, body.reminderMinutes ?? null, body.color, body.kind, t, t]);
  queueBackup(req.coupleId!);
  ok(res, { event: eventOut(await db.get('SELECT * FROM calendar_events WHERE id = ?', [id])) }, 201);
}));

calendarRouter.patch('/events/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('calendar_events', req.params.id, req.coupleId!);
  const body = parse(eventSchema.partial(), req.body);
  const db = await getDb();
  const map: Record<string, string> = {
    title: 'title', date: 'date', time: 'time', location: 'location', description: 'description',
    reminderMinutes: 'reminder_minutes', color: 'color', kind: 'kind',
  };
  const fields: string[] = [], params: any[] = [];
  for (const [k, col] of Object.entries(map)) if (k in body) { fields.push(`${col} = ?`); params.push((body as any)[k]); }
  if (fields.length) {
    fields.push('updated_at = ?'); params.push(now(), r.id);
    await db.run(`UPDATE calendar_events SET ${fields.join(', ')} WHERE id = ?`, params);
    queueBackup(req.coupleId!);
  }
  ok(res, { event: eventOut(await db.get('SELECT * FROM calendar_events WHERE id = ?', [r.id])) });
}));

calendarRouter.delete('/events/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('calendar_events', req.params.id, req.coupleId!);
  const db = await getDb();
  await db.run('UPDATE calendar_events SET deleted_at = ? WHERE id = ?', [now(), r.id]);
  queueBackup(req.coupleId!);
  ok(res, { deleted: true });
}));

// ---------------- Countdowns ----------------
const countdownSchema = z.object({
  title: z.string().trim().min(1).max(100),
  emoji: z.string().max(8).default('❤️'),
  targetDate: day,
  repeat: z.enum(['none', 'yearly']).default('none'),
});
function withDays(r: any) {
  let target = r.target_date;
  if (r.repeat === 'yearly') {
    const [, mm, dd] = target.split('-');
    const nowD = new Date();
    let candidate = `${nowD.getFullYear()}-${mm}-${dd}`;
    if (daysBetween(todayStr(), candidate) < 0) candidate = `${nowD.getFullYear() + 1}-${mm}-${dd}`;
    target = candidate;
  }
  return { id: r.id, title: r.title, emoji: r.emoji, targetDate: r.target_date, effectiveDate: target, repeat: r.repeat, daysLeft: daysBetween(todayStr(), target) };
}

countdownsRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM countdowns WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]);
  ok(res, { countdowns: rows.map(withDays).sort((a: any, b: any) => a.daysLeft - b.daysLeft) });
}));

countdownsRouter.post('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(countdownSchema, req.body);
  const db = await getDb();
  const id = newId();
  await db.run('INSERT INTO countdowns (id, couple_id, title, emoji, target_date, repeat, created_at) VALUES (?,?,?,?,?,?,?)',
    [id, req.coupleId, body.title, body.emoji, body.targetDate, body.repeat, now()]);
  queueBackup(req.coupleId!);
  ok(res, { countdown: withDays(await db.get('SELECT * FROM countdowns WHERE id = ?', [id])) }, 201);
}));

countdownsRouter.delete('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  await ownedOr404('countdowns', req.params.id, req.coupleId!);
  const db = await getDb();
  await db.run('UPDATE countdowns SET deleted_at = ? WHERE id = ?', [now(), req.params.id]);
  ok(res, { deleted: true });
}));

// ---------------- Tasks ----------------
const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.enum(['shopping', 'house', 'planning', 'travel', 'bills', 'projects', 'general']).default('general'),
  assignee: z.enum(['me', 'partner', 'both']).default('both'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: day.nullable().optional(),
});
const taskOut = (r: any) => ({
  id: r.id, title: r.title, category: r.category, assignee: r.assignee, priority: r.priority,
  done: !!r.done, doneAt: r.done_at, dueDate: r.due_date, createdBy: r.created_by,
});

tasksRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM tasks WHERE couple_id = ? AND deleted_at IS NULL ORDER BY done ASC, created_at DESC LIMIT 300', [req.coupleId]);
  ok(res, { tasks: rows.map(taskOut) });
}));

tasksRouter.post('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(taskSchema, req.body);
  const db = await getDb();
  const id = newId(); const t = now();
  await db.run(
    'INSERT INTO tasks (id, couple_id, title, category, assignee, priority, due_date, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, req.coupleId, body.title, body.category, body.assignee, body.priority, body.dueDate ?? null, req.user!.id, t, t]);
  queueBackup(req.coupleId!);
  ok(res, { task: taskOut(await db.get('SELECT * FROM tasks WHERE id = ?', [id])) }, 201);
}));

tasksRouter.patch('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('tasks', req.params.id, req.coupleId!);
  const body = parse(taskSchema.partial().extend({ done: z.boolean().optional() }), req.body);
  const db = await getDb();
  const fields: string[] = [], params: any[] = [];
  const map: Record<string, string> = { title: 'title', category: 'category', assignee: 'assignee', priority: 'priority', dueDate: 'due_date' };
  for (const [k, col] of Object.entries(map)) if (k in body) { fields.push(`${col} = ?`); params.push((body as any)[k]); }
  if (body.done !== undefined) {
    fields.push('done = ?', 'done_at = ?');
    params.push(body.done ? 1 : 0, body.done ? now() : null);
  }
  if (fields.length) {
    fields.push('updated_at = ?'); params.push(now(), r.id);
    await db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, params);
  }
  ok(res, { task: taskOut(await db.get('SELECT * FROM tasks WHERE id = ?', [r.id])) });
}));

tasksRouter.delete('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  await ownedOr404('tasks', req.params.id, req.coupleId!);
  const db = await getDb();
  await db.run('UPDATE tasks SET deleted_at = ? WHERE id = ?', [now(), req.params.id]);
  ok(res, { deleted: true });
}));

// ---------------- Wishlist ----------------
const wishSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.enum(['things_i_want', 'things_we_want', 'places_we_want', 'things_to_do', 'dreams']).default('things_i_want'),
  imageUrl: z.string().url().max(500).nullable().optional(),
  price: z.number().min(0).nullable().optional(),
  currency: z.string().max(6).default('EUR'),
  link: z.string().url().max(500).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['wanted', 'planned', 'done']).default('wanted'),
  mine: z.boolean().default(true),
});
const wishOut = (r: any) => ({
  id: r.id, title: r.title, category: r.category, imageUrl: r.image_url, price: r.price, currency: r.currency,
  link: r.link, priority: r.priority, status: r.status, ownerId: r.owner_id, createdAt: r.created_at,
});

wishlistRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM wishlist_items WHERE couple_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 300', [req.coupleId]);
  ok(res, { items: rows.map(wishOut) });
}));

wishlistRouter.post('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(wishSchema, req.body);
  const db = await getDb();
  const id = newId(); const t = now();
  await db.run(
    `INSERT INTO wishlist_items (id, couple_id, owner_id, category, title, image_url, price, currency, link, priority, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.coupleId, body.mine ? req.user!.id : null, body.category, body.title, body.imageUrl ?? null,
     body.price ?? null, body.currency, body.link ?? null, body.priority, body.status, t, t]);
  queueBackup(req.coupleId!);
  ok(res, { item: wishOut(await db.get('SELECT * FROM wishlist_items WHERE id = ?', [id])) }, 201);
}));

wishlistRouter.patch('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('wishlist_items', req.params.id, req.coupleId!);
  const body = parse(wishSchema.partial(), req.body);
  const db = await getDb();
  const map: Record<string, string> = {
    title: 'title', category: 'category', imageUrl: 'image_url', price: 'price', currency: 'currency',
    link: 'link', priority: 'priority', status: 'status',
  };
  const fields: string[] = [], params: any[] = [];
  for (const [k, col] of Object.entries(map)) if (k in body) { fields.push(`${col} = ?`); params.push((body as any)[k]); }
  if (fields.length) {
    fields.push('updated_at = ?'); params.push(now(), r.id);
    await db.run(`UPDATE wishlist_items SET ${fields.join(', ')} WHERE id = ?`, params);
  }
  ok(res, { item: wishOut(await db.get('SELECT * FROM wishlist_items WHERE id = ?', [r.id])) });
}));

wishlistRouter.delete('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  await ownedOr404('wishlist_items', req.params.id, req.coupleId!);
  const db = await getDb();
  await db.run('UPDATE wishlist_items SET deleted_at = ? WHERE id = ?', [now(), req.params.id]);
  ok(res, { deleted: true });
}));

// ---------------- Bucket list ----------------
bucketRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM bucket_items WHERE couple_id = ? AND deleted_at IS NULL ORDER BY created_at', [req.coupleId]);
  const done = rows.filter((r: any) => r.done).length;
  ok(res, {
    items: rows.map((r: any) => ({ id: r.id, title: r.title, done: !!r.done, doneAt: r.done_at })),
    progress: { done, total: rows.length },
  });
}));

bucketRouter.post('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const { title } = parse(z.object({ title: z.string().trim().min(1).max(200) }), req.body);
  const db = await getDb();
  const id = newId();
  await db.run('INSERT INTO bucket_items (id, couple_id, title, created_at) VALUES (?,?,?,?)', [id, req.coupleId, title, now()]);
  queueBackup(req.coupleId!);
  ok(res, { item: { id, title, done: false } }, 201);
}));

bucketRouter.patch('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('bucket_items', req.params.id, req.coupleId!);
  const body = parse(z.object({ done: z.boolean().optional(), title: z.string().trim().min(1).max(200).optional() }), req.body);
  const db = await getDb();
  if (body.done !== undefined) {
    await db.run('UPDATE bucket_items SET done = ?, done_at = ? WHERE id = ?', [body.done ? 1 : 0, body.done ? now() : null, r.id]);
  }
  if (body.title) await db.run('UPDATE bucket_items SET title = ? WHERE id = ?', [body.title, r.id]);
  ok(res, { saved: true });
}));

bucketRouter.delete('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  await ownedOr404('bucket_items', req.params.id, req.coupleId!);
  const db = await getDb();
  await db.run('UPDATE bucket_items SET deleted_at = ? WHERE id = ?', [now(), req.params.id]);
  ok(res, { deleted: true });
}));

// ---------------- Expenses ----------------
const expenseSchema = z.object({
  amount: z.number().positive('مبلغ باید مثبت باشد').max(1_000_000),
  currency: z.string().max(6).default('EUR'),
  category: z.enum(['food', 'home', 'travel', 'fun', 'bills', 'gift', 'general']).default('general'),
  split: z.enum(['equal', 'full_mine', 'full_partner']).default('equal'),
  note: z.string().max(300).nullable().optional(),
  date: day,
});
const expOut = (r: any) => ({
  id: r.id, amount: r.amount, currency: r.currency, category: r.category, split: r.split,
  note: r.note, date: r.date, paidById: r.paid_by_id,
});

expensesRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM expenses WHERE couple_id = ? AND deleted_at IS NULL ORDER BY date DESC LIMIT 300', [req.coupleId]);
  ok(res, { expenses: rows.map(expOut) });
}));

expensesRouter.post('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(expenseSchema, req.body);
  const db = await getDb();
  const id = newId();
  await db.run(
    'INSERT INTO expenses (id, couple_id, paid_by_id, amount, currency, category, split, note, date, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, req.coupleId, req.user!.id, body.amount, body.currency, body.category, body.split, body.note ?? null, body.date, now()]);
  queueBackup(req.coupleId!);
  ok(res, { expense: expOut(await db.get('SELECT * FROM expenses WHERE id = ?', [id])) }, 201);
}));

expensesRouter.delete('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  await ownedOr404('expenses', req.params.id, req.coupleId!);
  const db = await getDb();
  await db.run('UPDATE expenses SET deleted_at = ? WHERE id = ?', [now(), req.params.id]);
  ok(res, { deleted: true });
}));

/** Balance: positive = partner owes me, negative = I owe partner (equal split assumed). */
expensesRouter.get('/balance', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT paid_by_id, amount, split FROM expenses WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]);
  let balance = 0;
  for (const r of rows) {
    const mine = r.paid_by_id === req.user!.id;
    const amt = Number(r.amount);
    if (r.split === 'equal') balance += mine ? amt / 2 : -amt / 2;
    else if (r.split === 'full_partner') balance += mine ? amt : -amt;
    // full_mine: payer covers their own share fully → no balance effect
  }
  const totals = await db.get('SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]);
  ok(res, { balance: Math.round(balance * 100) / 100, iAmOwed: balance > 0, totalSpent: Number(totals.total) });
}));
