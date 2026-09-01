import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getDb, newId, now } from '../db';
import { requireAuth, requireCouple, ownedOr404 } from '../middleware/auth';
import { asyncH, err, ok } from '../lib/http';
import { parse } from '../lib/validate';
import { joinTags, splitTags } from '../lib/serialize';
import { isAllowedMime, newStorageKey, putObject, publicUrlFor, getObject, deleteObject, MAX_FILE_BYTES, ALLOWED_MIME } from '../services/storage';
import { uploadLimiter } from '../middleware/rateLimit';

export const photosRouter = Router();
export const albumsRouter = Router();
export const filesRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } });

const photoOut = (p: any) => ({
  id: p.id, url: p.url, albumId: p.album_id, favorite: !!p.favorite, tags: splitTags(p.tags),
  caption: p.caption, takenAt: p.taken_at, ownerId: p.owner_id, createdAt: p.created_at,
});

photosRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const clauses = ['couple_id = ?', 'deleted_at IS NULL'];
  const params: any[] = [req.coupleId];
  if (req.query.albumId) { clauses.push('album_id = ?'); params.push(String(req.query.albumId)); }
  if (req.query.favorite === '1') { clauses.push('favorite = 1'); }
  if (req.query.q) { clauses.push('(caption LIKE ? OR tags LIKE ?)'); params.push(`%${req.query.q}%`, `%${req.query.q}%`); }
  const rows = await db.all(`SELECT * FROM photos WHERE ${clauses.join(' AND ')} ORDER BY taken_at DESC LIMIT 500`, params);
  ok(res, { photos: rows.map(photoOut) });
}));

photosRouter.post('/', requireAuth, requireCouple, uploadLimiter, upload.single('file'), asyncH(async (req, res) => {
  if (!req.file || !isAllowedMime(req.file.mimetype)) {
    throw err(400, 'BAD_FILE', `نوع فایل مجاز نیست. انواع مجاز: ${Object.keys(ALLOWED_MIME).join(', ')}`);
  }
  const body = parse(z.object({
    albumId: z.string().optional(), caption: z.string().max(500).optional(),
    tags: z.string().max(300).optional(),
  }), req.body ?? {});
  const db = await getDb();
  if (body.albumId) await ownedOr404('albums', body.albumId, req.coupleId!);
  const key = newStorageKey(req.coupleId!, req.file.mimetype);
  await putObject(key, req.file.buffer);
  const id = newId(); const t = now();
  await db.run(
    `INSERT INTO photos (id, couple_id, album_id, owner_id, url, storage_key, favorite, tags, caption, taken_at, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.coupleId, body.albumId ?? null, req.user!.id, publicUrlFor(key), key, 0, body.tags ?? '', body.caption ?? null, t, t]);
  ok(res, { photo: photoOut(await db.get('SELECT * FROM photos WHERE id = ?', [id])) }, 201);
}));

photosRouter.patch('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const p = await ownedOr404('photos', req.params.id, req.coupleId!);
  const body = parse(z.object({
    favorite: z.boolean().optional(), caption: z.string().max(500).nullable().optional(),
    albumId: z.string().nullable().optional(), tags: z.array(z.string().max(40)).max(20).optional(),
  }), req.body);
  const db = await getDb();
  if (body.albumId) await ownedOr404('albums', body.albumId, req.coupleId!);
  const fields: string[] = [], params: any[] = [];
  if (body.favorite !== undefined) { fields.push('favorite = ?'); params.push(body.favorite ? 1 : 0); }
  if (body.caption !== undefined) { fields.push('caption = ?'); params.push(body.caption); }
  if (body.albumId !== undefined) { fields.push('album_id = ?'); params.push(body.albumId); }
  if (body.tags !== undefined) { fields.push('tags = ?'); params.push(joinTags(body.tags)); }
  if (fields.length) { params.push(p.id); await db.run(`UPDATE photos SET ${fields.join(', ')} WHERE id = ?`, params); }
  ok(res, { photo: photoOut(await db.get('SELECT * FROM photos WHERE id = ?', [p.id])) });
}));

photosRouter.delete('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const p = await ownedOr404('photos', req.params.id, req.coupleId!);
  const db = await getDb();
  await db.run('UPDATE photos SET deleted_at = ? WHERE id = ?', [now(), p.id]);
  await deleteObject(p.storage_key);
  ok(res, { deleted: true });
}));

// ---------------- Albums ----------------
albumsRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM albums WHERE couple_id = ? AND deleted_at IS NULL ORDER BY created_at DESC', [req.coupleId]);
  const counts = await db.all('SELECT album_id, COUNT(*) AS n FROM photos WHERE couple_id = ? AND deleted_at IS NULL AND album_id IS NOT NULL GROUP BY album_id', [req.coupleId]);
  const covers = await db.all(
    `SELECT p.album_id, p.url FROM photos p WHERE p.deleted_at IS NULL AND p.album_id IS NOT NULL
     AND p.id IN (SELECT id FROM photos p2 WHERE p2.album_id = p.album_id AND p2.deleted_at IS NULL ORDER BY taken_at DESC LIMIT 1)`, []);
  const coverBy: Record<string, string> = {}; for (const c of covers) coverBy[c.album_id] = c.url;
  const countBy: Record<string, number> = {}; for (const c of counts) countBy[c.album_id] = Number(c.n);
  ok(res, { albums: rows.map((a: any) => ({ id: a.id, title: a.title, count: countBy[a.id] ?? 0, coverUrl: coverBy[a.id] ?? null, createdAt: a.created_at })) });
}));

albumsRouter.post('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const { title } = parse(z.object({ title: z.string().trim().min(1).max(100) }), req.body);
  const db = await getDb();
  const id = newId();
  await db.run('INSERT INTO albums (id, couple_id, title, created_at) VALUES (?,?,?,?)', [id, req.coupleId, title, now()]);
  ok(res, { album: { id, title, count: 0 } }, 201);
}));

albumsRouter.delete('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const a = await ownedOr404('albums', req.params.id, req.coupleId!);
  const db = await getDb();
  await db.tx(async () => {
    await db.run('UPDATE photos SET album_id = NULL WHERE album_id = ?', [a.id]);
    await db.run('UPDATE albums SET deleted_at = ? WHERE id = ?', [now(), a.id]);
  });
  ok(res, { deleted: true });
}));

// ---------------- Authenticated file serving ----------------
filesRouter.get('/*', requireAuth, asyncH(async (req, res) => {
  const key = String((req.params as any)[0] ?? '');
  if (!key || key.includes('..')) throw err(400, 'BAD_KEY', 'کلید نامعتبر.');
  // Authorization: object must belong to the caller's couple (or their avatar space).
  const db = await getDb();
  const member = await db.get('SELECT couple_id FROM couple_members WHERE user_id = ?', [req.user!.id]);
  const avatarOk = key.startsWith(`avatars/${req.user!.id}/`);
  const partnerRows = member
    ? await db.all('SELECT user_id FROM couple_members WHERE couple_id = ?', [member.couple_id])
    : [];
  const partnerAvatarOk = partnerRows.some((r: any) => key.startsWith(`avatars/${r.user_id}/`));
  const coupleOk = member && key.startsWith(`${member.couple_id}/`);
  if (!avatarOk && !partnerAvatarOk && !coupleOk) throw err(404, 'NOT_FOUND', 'فایل پیدا نشد.');
  const data = await getObject(key);
  if (!data) throw err(404, 'NOT_FOUND', 'فایل پیدا نشد.');
  const ext = key.split('.').pop() || '';
  const mime = Object.entries(ALLOWED_MIME).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(data);
}));
