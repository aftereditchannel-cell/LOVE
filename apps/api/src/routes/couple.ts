import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { getDb, newId, now } from '../db';
import { requireAuth, requireCouple } from '../middleware/auth';
import { asyncH, err, ok } from '../lib/http';
import { parse } from '../lib/validate';
import { audit } from '../middleware/audit';
import { daysBetween, todayStr, isValidDay, addDays } from '../lib/dates';
import { encryptString, decryptString } from '../lib/crypto';

export const coupleRouter = Router();

const partnerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  nickname: z.string().trim().max(60).optional().default(''),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().default(null),
  favoriteColor: z.string().trim().max(30).optional().default(''),
  favoriteThings: z.string().trim().max(500).optional().default(''),
});

// Create couple space (post-registration onboarding)
coupleRouter.post('/', requireAuth, asyncH(async (req, res) => {
  const body = parse(z.object({
    title: z.string().trim().max(80).optional().default(''),
    startDate: z.string().refine(isValidDay, 'تاریخ شروع رابطه نامعتبر است'),
    me: partnerSchema,
    partner: partnerSchema,
  }), req.body);
  const db = await getDb();
  const existing = await db.get('SELECT couple_id FROM couple_members WHERE user_id = ?', [req.user!.id]);
  if (existing) throw err(409, 'COUPLE_EXISTS', 'از قبل عضو یک فضای دونفره هستی.');
  const coupleId = newId();
  const t = now();
  await db.tx(async () => {
    await db.run(
      'INSERT INTO couples (id, title, start_date, pending_partner, created_at, updated_at) VALUES (?,?,?,?,?,?)',
      [coupleId, body.title || null, body.startDate, JSON.stringify(body.partner), t, t],
    );
    await db.run('INSERT INTO couple_settings (id, couple_id) VALUES (?,?)', [newId(), coupleId]);
    await db.run(
      'INSERT INTO couple_members (id, couple_id, user_id, nickname, joined_at) VALUES (?,?,?,?,?)',
      [newId(), coupleId, req.user!.id, body.me.nickname || null, t],
    );
    // my own profile fields
    await db.run('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?', [body.me.name, t, req.user!.id]);
    await db.run(
      'UPDATE profiles SET nickname = ?, birthday = ?, favorite_color = ?, favorite_things = ?, updated_at = ? WHERE user_id = ?',
      [body.me.nickname || null, body.me.birthday, body.me.favoriteColor || null, body.me.favoriteThings || null, t, req.user!.id],
    );
  });
  await audit(req, 'couple.created', { coupleId });
  ok(res, { coupleId }, 201);
}));

// Join via invite code (partner B)
coupleRouter.post('/join', requireAuth, asyncH(async (req, res) => {
  const { code } = parse(z.object({ code: z.string().trim().min(4).max(20) }), req.body);
  const db = await getDb();
  const couple = await db.get('SELECT * FROM couples WHERE invite_code = ? AND deleted_at IS NULL', [code.toUpperCase()]);
  if (!couple) throw err(404, 'BAD_INVITE', 'کد دعوت معتبر نیست.');
  const existing = await db.get('SELECT couple_id FROM couple_members WHERE user_id = ?', [req.user!.id]);
  if (existing) throw err(409, 'COUPLE_EXISTS', 'از قبل عضو یک فضای دونفره هستی.');
  const count = await db.get('SELECT COUNT(*) AS n FROM couple_members WHERE couple_id = ?', [couple.id]);
  if (Number(count.n) >= 2) throw err(409, 'COUPLE_FULL', 'این فضا قبلاً کامل شده.');
  const t = now();
  await db.tx(async () => {
    await db.run('INSERT INTO couple_members (id, couple_id, user_id, joined_at) VALUES (?,?,?,?)', [newId(), couple.id, req.user!.id, t]);
    // merge pending partner profile into the joining user's profile
    if (couple.pending_partner) {
      try {
        const p = JSON.parse(couple.pending_partner);
        await db.run(
          'UPDATE profiles SET nickname = COALESCE(?, nickname), birthday = COALESCE(?, birthday), favorite_color = COALESCE(?, favorite_color), favorite_things = COALESCE(?, favorite_things), updated_at = ? WHERE user_id = ?',
          [p.nickname || null, p.birthday || null, p.favoriteColor || null, p.favoriteThings || null, t, req.user!.id],
        );
        await db.run('UPDATE couples SET pending_partner = NULL, invite_code = NULL, updated_at = ? WHERE id = ?', [t, couple.id]);
      } catch { /* ignore bad pending payload */ }
    }
  });
  await audit(req, 'couple.joined', { coupleId: couple.id });
  ok(res, { coupleId: couple.id });
}));

// Everything below requires an existing couple
coupleRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const c = await db.get('SELECT * FROM couples WHERE id = ?', [req.coupleId]);
  const members = await db.all(
    `SELECT m.user_id, m.nickname, m.joined_at, u.display_name, u.avatar_url, u.last_seen_at,
            p.birthday, p.favorite_color, p.favorite_things
     FROM couple_members m JOIN users u ON u.id = m.user_id LEFT JOIN profiles p ON p.user_id = u.id
     WHERE m.couple_id = ?`, [req.coupleId]);
  const languages = await db.all('SELECT * FROM love_languages WHERE user_id IN (SELECT user_id FROM couple_members WHERE couple_id = ?)', [req.coupleId]);
  const langByUser = Object.fromEntries(languages.map((l: any) => [l.user_id, { primary: l.primary_lang, secondary: l.secondary_lang }]));
  let pendingPartner = null;
  if (c.pending_partner) { try { pendingPartner = JSON.parse(c.pending_partner); } catch { /* noop */ } }
  const days = c.start_date ? daysBetween(c.start_date) + 1 : null;
  ok(res, {
    couple: {
      id: c.id, title: c.title, startDate: c.start_date, daysTogether: days, inviteCode: c.invite_code,
      members: members.map((m: any) => ({
        userId: m.user_id, displayName: m.display_name, avatarUrl: m.avatar_url, nickname: m.nickname,
        birthday: m.birthday, favoriteColor: m.favorite_color, favoriteThings: m.favorite_things,
        lastSeenAt: m.last_seen_at, loveLanguage: langByUser[m.user_id] ?? null,
        isMe: m.user_id === req.user!.id,
      })),
      pendingPartner,
    },
  });
}));

coupleRouter.patch('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(z.object({
    title: z.string().trim().max(80).nullable().optional(),
    startDate: z.string().refine(isValidDay).optional(),
  }), req.body);
  const db = await getDb();
  const fields: string[] = [], params: any[] = [];
  if ('title' in body) { fields.push('title = ?'); params.push(body.title); }
  if (body.startDate) { fields.push('start_date = ?'); params.push(body.startDate); }
  if (!fields.length) return ok(res, { saved: true });
  fields.push('updated_at = ?'); params.push(now(), req.coupleId);
  await db.run(`UPDATE couples SET ${fields.join(', ')} WHERE id = ?`, params);
  ok(res, { saved: true });
}));

coupleRouter.post('/invite', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars
  await db.run('UPDATE couples SET invite_code = ?, updated_at = ? WHERE id = ?', [code, now(), req.coupleId]);
  await audit(req, 'couple.invite_created');
  ok(res, { code });
}));

coupleRouter.delete('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const { confirm } = parse(z.object({ confirm: z.literal('DELETE') }), req.body);
  const db = await getDb();
  // soft-delete the couple space; hard purge available via /api/settings/delete-couple
  await db.run('UPDATE couples SET deleted_at = ?, updated_at = ? WHERE id = ?', [now(), now(), req.coupleId]);
  await audit(req, 'couple.soft_deleted');
  ok(res, { deleted: true });
}));

// ---------------- Moods ----------------
export const moodsRouter = Router();

const MOODS = ['great', 'good', 'ok', 'neutral', 'sad', 'awful', 'angry', 'loving', 'tired'] as const;
const moodSchema = z.object({
  date: z.string().refine(isValidDay).optional(),
  mood: z.enum(MOODS),
  energy: z.number().int().min(1).max(10).default(5),
  stress: z.number().int().min(1).max(10).default(5),
  sleep: z.number().int().min(1).max(10).default(5),
  loveLevel: z.number().int().min(1).max(10).default(5),
  socialBattery: z.number().int().min(1).max(10).default(5),
  supportWish: z.enum(['hug', 'talk', 'space', 'gift', 'time', 'notok']).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});
const moodOut = (r: any) => ({
  id: r.id, userId: r.user_id, date: r.date, mood: r.mood, energy: r.energy, stress: r.stress,
  sleep: r.sleep, loveLevel: r.love_level, socialBattery: r.social_battery,
  supportWish: r.support_wish, note: r.note, updatedAt: r.updated_at,
});

moodsRouter.post('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(moodSchema, req.body);
  const db = await getDb();
  const date = body.date ?? todayStr();
  const t = now();
  const existing = await db.get('SELECT id FROM moods WHERE user_id = ? AND date = ?', [req.user!.id, date]);
  if (existing) {
    await db.run(
      `UPDATE moods SET mood=?, energy=?, stress=?, sleep=?, love_level=?, social_battery=?, support_wish=?, note=?, updated_at=? WHERE id=?`,
      [body.mood, body.energy, body.stress, body.sleep, body.loveLevel, body.socialBattery, body.supportWish ?? null, body.note ?? null, t, existing.id]);
    const row = await db.get('SELECT * FROM moods WHERE id = ?', [existing.id]);
    return ok(res, { mood: moodOut(row) });
  }
  const id = newId();
  await db.run(
    `INSERT INTO moods (id, user_id, couple_id, date, mood, energy, stress, sleep, love_level, social_battery, support_wish, note, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.user!.id, req.coupleId, date, body.mood, body.energy, body.stress, body.sleep, body.loveLevel, body.socialBattery, body.supportWish ?? null, body.note ?? null, t, t]);
  const row = await db.get('SELECT * FROM moods WHERE id = ?', [id]);
  ok(res, { mood: moodOut(row) }, 201);
}));

moodsRouter.get('/today', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM moods WHERE couple_id = ? AND date = ?', [req.coupleId, todayStr()]);
  const mine = rows.find((r: any) => r.user_id === req.user!.id);
  const partner = rows.find((r: any) => r.user_id !== req.user!.id);
  ok(res, { mine: mine ? moodOut(mine) : null, partner: partner ? moodOut(partner) : null });
}));

moodsRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const from = String(req.query.from || '0000-01-01');
  const to = String(req.query.to || '9999-12-31');
  const scope = String(req.query.scope || 'couple');
  const db = await getDb();
  const rows = scope === 'me'
    ? await db.all('SELECT * FROM moods WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date DESC LIMIT 400', [req.user!.id, from, to])
    : await db.all('SELECT * FROM moods WHERE couple_id = ? AND date >= ? AND date <= ? ORDER BY date DESC LIMIT 800', [req.coupleId, from, to]);
  ok(res, { moods: rows.map(moodOut), me: req.user!.id });
}));

moodsRouter.get('/summary', requireAuth, requireCouple, asyncH(async (req, res) => {
  const days = Math.min(90, Math.max(7, parseInt(String(req.query.days || '30'), 10) || 30));
  const db = await getDb();
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const rows = await db.all(
    'SELECT date, user_id, mood, energy, stress, sleep, love_level FROM moods WHERE couple_id = ? AND date >= ? ORDER BY date ASC',
    [req.coupleId, from]);
  ok(res, { days, entries: rows, me: req.user!.id, partnerId: req.partnerId ?? null });
}));

// ---------------- Period / PMS (private + encrypted notes) ----------------
export const periodRouter = Router();

const cycleSchema = z.object({
  startDate: z.string().refine(isValidDay, 'تاریخ شروع نامعتبر است'),
  endDate: z.string().refine(isValidDay).nullable().optional(),
  cycleLength: z.number().int().min(15).max(60).default(28),
  notes: z.string().max(2000).nullable().optional(),
});
const cycleOut = (r: any) => ({
  id: r.id, startDate: r.start_date, endDate: r.end_date, cycleLength: r.cycle_length,
  notes: r.notes_enc ? (() => { try { return decryptString(r.notes_enc); } catch { return null; } })() : null,
  createdAt: r.created_at,
});

periodRouter.get('/cycles', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  // strictly the caller's own data — period data never leaves through couple scope
  const rows = await db.all('SELECT * FROM period_cycles WHERE user_id = ? AND deleted_at IS NULL ORDER BY start_date DESC', [req.user!.id]);
  ok(res, { cycles: rows.map(cycleOut) });
}));

periodRouter.post('/cycles', requireAuth, asyncH(async (req, res) => {
  const body = parse(cycleSchema, req.body);
  const db = await getDb();
  const id = newId(); const t = now();
  await db.run(
    'INSERT INTO period_cycles (id, user_id, start_date, end_date, cycle_length, notes_enc, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
    [id, req.user!.id, body.startDate, body.endDate ?? null, body.cycleLength, body.notes ? encryptString(body.notes) : null, t, t]);
  ok(res, { cycle: cycleOut(await db.get('SELECT * FROM period_cycles WHERE id = ?', [id])) }, 201);
}));

periodRouter.patch('/cycles/:id', requireAuth, asyncH(async (req, res) => {
  const body = parse(cycleSchema.partial(), req.body);
  const db = await getDb();
  const row = await db.get('SELECT * FROM period_cycles WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.params.id, req.user!.id]);
  if (!row) throw err(404, 'NOT_FOUND', 'چرخه پیدا نشد.');
  await db.run(
    'UPDATE period_cycles SET start_date = ?, end_date = ?, cycle_length = ?, notes_enc = ?, updated_at = ? WHERE id = ?',
    [body.startDate ?? row.start_date, body.endDate !== undefined ? body.endDate : row.end_date,
     body.cycleLength ?? row.cycle_length,
     body.notes !== undefined ? (body.notes ? encryptString(body.notes) : null) : row.notes_enc, now(), row.id]);
  ok(res, { cycle: cycleOut(await db.get('SELECT * FROM period_cycles WHERE id = ?', [row.id])) });
}));

periodRouter.delete('/cycles/:id', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  const r = await db.run('UPDATE period_cycles SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [now(), req.params.id, req.user!.id]);
  if (!r.changes) throw err(404, 'NOT_FOUND', 'چرخه پیدا نشد.');
  ok(res, { deleted: true });
}));

periodRouter.post('/cycles/:id/symptoms', requireAuth, asyncH(async (req, res) => {
  const body = parse(z.object({
    date: z.string().refine(isValidDay),
    pain: z.number().int().min(0).max(10).default(0),
    energy: z.number().int().min(1).max(10).default(5),
    mood: z.string().max(30).nullable().optional(),
    cravings: z.string().max(500).nullable().optional(),
    sleep: z.number().int().min(1).max(10).default(5),
    headache: z.boolean().default(false),
    bloating: z.boolean().default(false),
    skin: z.string().max(60).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  }), req.body);
  const db = await getDb();
  const cycle = await db.get('SELECT id FROM period_cycles WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.params.id, req.user!.id]);
  if (!cycle) throw err(404, 'NOT_FOUND', 'چرخه پیدا نشد.');
  const id = newId(); const t = now();
  await db.run(
    `INSERT INTO period_symptoms (id, cycle_id, date, pain, energy, mood, cravings, sleep, headache, bloating, skin, notes_enc)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, cycle.id, body.date, body.pain, body.energy, body.mood ?? null, body.cravings ?? null, body.sleep,
     body.headache ? 1 : 0, body.bloating ? 1 : 0, body.skin ?? null, body.notes ? encryptString(body.notes) : null]);
  ok(res, { id }, 201);
}));

periodRouter.get('/cycles/:id/symptoms', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  const cycle = await db.get('SELECT id FROM period_cycles WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.params.id, req.user!.id]);
  if (!cycle) throw err(404, 'NOT_FOUND', 'چرخه پیدا نشد.');
  const rows = await db.all('SELECT * FROM period_symptoms WHERE cycle_id = ? ORDER BY date', [cycle.id]);
  ok(res, {
    symptoms: rows.map((r: any) => ({
      id: r.id, date: r.date, pain: r.pain, energy: r.energy, mood: r.mood, cravings: r.cravings,
      sleep: r.sleep, headache: !!r.headache, bloating: !!r.bloating, skin: r.skin,
      notes: r.notes_enc ? (() => { try { return decryptString(r.notes_enc); } catch { return null; } })() : null,
    })),
  });
}));

/**
 * Prediction (informational only — NOT medical advice):
 * period = last start; next = last start + avg cycle length;
 * pms window = 5 days before next; ovulation ≈ 14 days before next.
 */
periodRouter.get('/prediction', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  const cycles = await db.all(
    'SELECT * FROM period_cycles WHERE user_id = ? AND deleted_at IS NULL ORDER BY start_date DESC LIMIT 6', [req.user!.id]);
  if (!cycles.length) return ok(res, { prediction: null, cycles: 0 });
  const lens = cycles.map((c: any) => c.cycle_length).filter((n: number) => n > 0);
  const avgCycle = Math.round(lens.reduce((a: number, n: number) => a + n, 0) / lens.length);
  const last = cycles[0].start_date;
  const nextStart = addDays(last, avgCycle);
  ok(res, {
    prediction: {
      lastStart: last,
      nextStart,
      pmsStart: addDays(nextStart, -5),
      pmsEnd: addDays(nextStart, -1),
      ovulation: addDays(nextStart, -14),
      avgCycleLength: avgCycle,
      daysUntilNext: daysBetween(new Date().toISOString().slice(0, 10), nextStart),
      disclaimer: 'این فقط یک پیش‌بینی تقریبی برای پیگیری و یادآوری است و تشخیص پزشکی محسوب نمی‌شود.',
    },
    cycles: cycles.length,
  });
}));

// Period privacy/notification prefs (per-user settings)
periodRouter.get('/settings', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  const s = await db.get('SELECT period_tracking_enabled, notif_period, notif_pms FROM user_settings WHERE user_id = ?', [req.user!.id]);
  ok(res, { enabled: !!s?.period_tracking_enabled, notifPeriod: !!s?.notif_period, notifPms: !!s?.notif_pms });
}));

periodRouter.patch('/settings', requireAuth, asyncH(async (req, res) => {
  const body = parse(z.object({
    enabled: z.boolean().optional(), notifPeriod: z.boolean().optional(), notifPms: z.boolean().optional(),
  }), req.body);
  const db = await getDb();
  const map: Record<string, string> = { enabled: 'period_tracking_enabled', notifPeriod: 'notif_period', notifPms: 'notif_pms' };
  const fields: string[] = [], params: any[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (k in body) { fields.push(`${col} = ?`); params.push((body as any)[k] ? 1 : 0); }
  }
  if (fields.length) { params.push(req.user!.id); await db.run(`UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`, params); }
  ok(res, { saved: true });
}));
