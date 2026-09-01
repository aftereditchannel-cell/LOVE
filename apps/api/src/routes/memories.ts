import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getDb, newId, now } from '../db';
import { requireAuth, requireCouple, ownedOr404 } from '../middleware/auth';
import { asyncH, err, ok } from '../lib/http';
import { parse } from '../lib/validate';
import { joinTags, splitTags } from '../lib/serialize';
import { isAllowedMime, newStorageKey, putObject, publicUrlFor, deleteObject, MAX_FILE_BYTES } from '../services/storage';
import { uploadLimiter } from '../middleware/rateLimit';
import { queueBackup } from '../services/backupQueue';

export const memoriesRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } });

const MILESTONES = ['first_date', 'first_trip', 'first_gift', 'first_kiss', 'met_day', 'birthday', 'anniversary', 'other'] as const;
const memorySchema = z.object({
  title: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ نامعتبر است'),
  location: z.string().max(200).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  milestone: z.enum(MILESTONES).nullable().optional(),
});

const mediaOut = (m: any) => ({ id: m.id, type: m.type, url: m.url, createdAt: m.created_at });
const out = (r: any, media: any[] = []) => ({
  id: r.id, title: r.title, date: r.date, location: r.location, description: r.description,
  tags: splitTags(r.tags), milestone: r.milestone, createdById: r.created_by_id,
  createdAt: r.created_at, media: media.map(mediaOut),
});

memoriesRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all(
    'SELECT * FROM memories WHERE couple_id = ? AND deleted_at IS NULL ORDER BY date DESC LIMIT 500', [req.coupleId]);
  const media = await db.all(
    `SELECT mm.* FROM memory_media mm JOIN memories m ON m.id = mm.memory_id WHERE m.couple_id = ?`, [req.coupleId]);
  const byMemory = new Map<string, any[]>();
  for (const m of media) {
    if (!byMemory.has(m.memory_id)) byMemory.set(m.memory_id, []);
    byMemory.get(m.memory_id)!.push(m);
  }
  ok(res, { memories: rows.map((r: any) => out(r, byMemory.get(r.id) || [])) });
}));

memoriesRouter.get('/timeline', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const couple = await db.get('SELECT start_date FROM couples WHERE id = ?', [req.coupleId]);
  const milestones = await db.all(
    `SELECT * FROM memories WHERE couple_id = ? AND deleted_at IS NULL AND milestone IS NOT NULL ORDER BY date ASC`,
    [req.coupleId]);
  const events: any[] = [];
  if (couple?.start_date) {
    events.push({ kind: 'start', date: couple.start_date, title: 'شروع رابطه ما', emoji: '❤️' });
  }
  for (const m of milestones) {
    events.push({ kind: 'milestone', milestone: m.milestone, date: m.date, title: m.title, memoryId: m.id, emoji: '📍' });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  ok(res, { events });
}));

memoriesRouter.get('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('memories', req.params.id, req.coupleId!);
  const db = await getDb();
  const media = await db.all('SELECT * FROM memory_media WHERE memory_id = ?', [r.id]);
  ok(res, { memory: out(r, media) });
}));

memoriesRouter.post('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(memorySchema, req.body);
  const db = await getDb();
  const id = newId(); const t = now();
  await db.run(
    `INSERT INTO memories (id, couple_id, created_by_id, title, date, location, description, tags, milestone, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.coupleId, req.user!.id, body.title, body.date, body.location ?? null,
     body.description ?? null, joinTags(body.tags), body.milestone ?? null, t, t]);
  queueBackup(req.coupleId!);
  ok(res, { memory: out(await db.get('SELECT * FROM memories WHERE id = ?', [id])) }, 201);
}));

memoriesRouter.patch('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('memories', req.params.id, req.coupleId!);
  const body = parse(memorySchema.partial(), req.body);
  const db = await getDb();
  const fields: string[] = [], params: any[] = [];
  const map: Record<string, string> = { title: 'title', date: 'date', location: 'location', description: 'description', milestone: 'milestone' };
  for (const [k, col] of Object.entries(map)) if (k in body) { fields.push(`${col} = ?`); params.push((body as any)[k]); }
  if (body.tags !== undefined) { fields.push('tags = ?'); params.push(joinTags(body.tags)); }
  if (fields.length) {
    fields.push('updated_at = ?'); params.push(now(), r.id);
    await db.run(`UPDATE memories SET ${fields.join(', ')} WHERE id = ?`, params);
    queueBackup(req.coupleId!);
  }
  const media = await db.all('SELECT * FROM memory_media WHERE memory_id = ?', [r.id]);
  ok(res, { memory: out(await db.get('SELECT * FROM memories WHERE id = ?', [r.id]), media) });
}));

memoriesRouter.delete('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('memories', req.params.id, req.coupleId!);
  const db = await getDb();
  await db.run('UPDATE memories SET deleted_at = ? WHERE id = ?', [now(), r.id]);
  queueBackup(req.coupleId!);
  ok(res, { deleted: true });
}));

memoriesRouter.post('/:id/media', requireAuth, requireCouple, uploadLimiter, upload.single('file'), asyncH(async (req, res) => {
  const r = await ownedOr404('memories', req.params.id, req.coupleId!);
  if (!req.file || !isAllowedMime(req.file.mimetype)) throw err(400, 'BAD_FILE', 'نوع فایل مجاز نیست.');
  const type = req.file.mimetype.startsWith('video/') ? 'video' : req.file.mimetype.startsWith('audio/') ? 'audio' : 'image';
  const key = newStorageKey(req.coupleId!, req.file.mimetype);
  await putObject(key, req.file.buffer);
  const db = await getDb();
  const id = newId();
  await db.run(
    'INSERT INTO memory_media (id, memory_id, owner_id, type, url, storage_key, created_at) VALUES (?,?,?,?,?,?,?)',
    [id, r.id, req.user!.id, type, publicUrlFor(key), key, now()]);
  ok(res, { media: mediaOut(await db.get('SELECT * FROM memory_media WHERE id = ?', [id])) }, 201);
}));

memoriesRouter.delete('/:id/media/:mediaId', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('memories', req.params.id, req.coupleId!);
  const db = await getDb();
  const m = await db.get('SELECT * FROM memory_media WHERE id = ? AND memory_id = ?', [req.params.mediaId, r.id]);
  if (!m) throw err(404, 'NOT_FOUND', 'مدیا پیدا نشد.');
  await db.run('DELETE FROM memory_media WHERE id = ?', [m.id]);
  await deleteObject(m.storage_key);
  ok(res, { deleted: true });
}));
