import { Router } from 'express';
import { z } from 'zod';
import { getDb, newId, now } from '../db';
import { requireAuth, requireCouple, ownedOr404 } from '../middleware/auth';
import { asyncH, err, ok } from '../lib/http';
import { parse } from '../lib/validate';
import { encryptString, decryptString } from '../lib/crypto';
import { joinTags, splitTags } from '../lib/serialize';
import { queueBackup } from '../services/backupQueue';

export const journalRouter = Router();

const entrySchema = z.object({
  title: z.string().trim().min(1, 'عنوان لازم است').max(200),
  content: z.string().max(20000).default(''),
  mood: z.string().max(30).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  visibility: z.enum(['private', 'shared']).default('shared'),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const out = (r: any, meId: string) => ({
  id: r.id, title: r.title,
  content: (() => { try { return decryptString(r.content_enc); } catch { return ''; } })(),
  mood: r.mood, location: r.location, tags: splitTags(r.tags), visibility: r.visibility,
  entryDate: r.entry_date, authorId: r.author_id, isMine: r.author_id === meId,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

journalRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const q = `%${String(req.query.q || '').slice(0, 100)}%`;
  // shared entries of the couple + my private ones
  const rows = await db.all(
    `SELECT * FROM journal_entries
     WHERE couple_id = ? AND deleted_at IS NULL
       AND (visibility = 'shared' OR author_id = ?)
       AND (? = '%%' OR title LIKE ?)
     ORDER BY entry_date DESC LIMIT 300`,
    [req.coupleId, req.user!.id, q, q]);
  ok(res, { entries: rows.map((r: any) => out(r, req.user!.id)) });
}));

journalRouter.get('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('journal_entries', req.params.id, req.coupleId!);
  if (r.visibility === 'private' && r.author_id !== req.user!.id) {
    throw err(404, 'NOT_FOUND', 'موردی پیدا نشد.'); // private entries invisible to partner
  }
  ok(res, { entry: out(r, req.user!.id) });
}));

journalRouter.post('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(entrySchema, req.body);
  const db = await getDb();
  const id = newId(); const t = now();
  await db.run(
    `INSERT INTO journal_entries (id, couple_id, author_id, title, content_enc, mood, location, tags, visibility, entry_date, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.coupleId, req.user!.id, body.title, encryptString(body.content), body.mood ?? null,
     body.location ?? null, joinTags(body.tags), body.visibility, body.entryDate ?? t.slice(0, 10), t, t]);
  queueBackup(req.coupleId!);
  ok(res, { entry: out(await db.get('SELECT * FROM journal_entries WHERE id = ?', [id]), req.user!.id) }, 201);
}));

journalRouter.patch('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('journal_entries', req.params.id, req.coupleId!);
  if (r.author_id !== req.user!.id) throw err(403, 'FORBIDDEN', 'فقط نویسنده می‌تواند این یادداشت را ویرایش کند.');
  const body = parse(entrySchema.partial(), req.body);
  const db = await getDb();
  const fields: string[] = [], params: any[] = [];
  if (body.title !== undefined) { fields.push('title = ?'); params.push(body.title); }
  if (body.content !== undefined) { fields.push('content_enc = ?'); params.push(encryptString(body.content)); }
  if (body.mood !== undefined) { fields.push('mood = ?'); params.push(body.mood); }
  if (body.location !== undefined) { fields.push('location = ?'); params.push(body.location); }
  if (body.tags !== undefined) { fields.push('tags = ?'); params.push(joinTags(body.tags)); }
  if (body.visibility !== undefined) { fields.push('visibility = ?'); params.push(body.visibility); }
  if (body.entryDate !== undefined) { fields.push('entry_date = ?'); params.push(body.entryDate); }
  if (fields.length) {
    fields.push('updated_at = ?'); params.push(now(), r.id);
    await db.run(`UPDATE journal_entries SET ${fields.join(', ')} WHERE id = ?`, params);
    queueBackup(req.coupleId!);
  }
  ok(res, { entry: out(await db.get('SELECT * FROM journal_entries WHERE id = ?', [r.id]), req.user!.id) });
}));

journalRouter.delete('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('journal_entries', req.params.id, req.coupleId!);
  if (r.author_id !== req.user!.id) throw err(403, 'FORBIDDEN', 'فقط نویسنده می‌تواند حذف کند.');
  const db = await getDb();
  await db.run('UPDATE journal_entries SET deleted_at = ? WHERE id = ?', [now(), r.id]);
  queueBackup(req.coupleId!);
  ok(res, { deleted: true });
}));
