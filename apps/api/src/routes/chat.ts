import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getDb, newId, now } from '../db';
import { requireAuth, requireCouple } from '../middleware/auth';
import { asyncH, err, ok } from '../lib/http';
import { parse } from '../lib/validate';
import { encryptString, decryptString } from '../lib/crypto';
import { isAllowedMime, newStorageKey, putObject, publicUrlFor, deleteObject, MAX_FILE_BYTES } from '../services/storage';
import { uploadLimiter } from '../middleware/rateLimit';

export const chatRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } });

/**
 * Private couple chat.
 * Message text is encrypted at rest (AES-256-GCM). The schema + API keep
 * per-sender envelopes so real E2E encryption can be layered later without
 * migration: content_enc could become a client-encrypted blob — the server
 * would then only relay ciphertext it cannot read.
 */

// in-memory typing heartbeats: coupleId -> userId -> ts
const typingMap = new Map<string, Map<string, number>>();

const msgOut = (r: any, reactions: any[], attachments: any[], meId: string) => ({
  id: r.id, senderId: r.sender_id, isMine: r.sender_id === meId,
  content: (() => { try { return decryptString(r.content_enc); } catch { return ''; } })(),
  replyToId: r.reply_to_id, pinned: !!r.pinned, editedAt: r.edited_at, createdAt: r.created_at,
  reactions: reactions.filter((x) => x.message_id === r.id).map((x) => ({ userId: x.user_id, emoji: x.emoji })),
  attachments: attachments.filter((a) => a.message_id === r.id).map((a) => ({ id: a.id, url: a.url, mime: a.mime, size: a.size })),
});

async function loadMessages(coupleId: string, meId: string, before?: string, limit = 50) {
  const db = await getDb();
  const params: any[] = [coupleId];
  let cond = 'couple_id = ? AND deleted_at IS NULL';
  if (before) { cond += ' AND created_at < ?'; params.push(before); }
  params.push(limit);
  const rows = await db.all(`SELECT * FROM messages WHERE ${cond} ORDER BY created_at DESC LIMIT ?`, params);
  const ids = rows.map((r: any) => r.id);
  let reactions: any[] = [], attachments: any[] = [];
  if (ids.length) {
    const ph = ids.map(() => '?').join(',');
    reactions = await db.all(`SELECT * FROM message_reactions WHERE message_id IN (${ph})`, ids);
    attachments = await db.all(`SELECT * FROM message_attachments WHERE message_id IN (${ph})`, ids);
  }
  return rows.reverse().map((r: any) => msgOut(r, reactions, attachments, meId));
}

chatRouter.get('/messages', requireAuth, requireCouple, asyncH(async (req, res) => {
  const messages = await loadMessages(req.coupleId!, req.user!.id, req.query.before ? String(req.query.before) : undefined);
  const db = await getDb();
  const member = await db.get('SELECT last_read_message_at FROM couple_members WHERE couple_id = ? AND user_id = ?', [req.coupleId, req.user!.id]);
  const partner = req.partnerId ? await db.get('SELECT last_seen_at FROM users WHERE id = ?', [req.partnerId]) : null;
  const partnerMember = req.partnerId
    ? await db.get('SELECT last_read_message_at FROM couple_members WHERE couple_id = ? AND user_id = ?', [req.coupleId, req.partnerId])
    : null;
  const typed = typingMap.get(req.coupleId!)?.get(req.partnerId ?? '') ?? 0;
  ok(res, {
    messages,
    hasMore: messages.length === 50,
    state: {
      partnerOnline: partner?.last_seen_at ? (Date.now() - new Date(partner.last_seen_at).getTime() < 60_000) : false,
      partnerTyping: Date.now() - typed < 4_000,
      partnerLastReadAt: partnerMember?.last_read_message_at ?? null,
      myLastReadAt: member?.last_read_message_at ?? null,
    },
  });
}));

chatRouter.post('/messages', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(z.object({
    content: z.string().trim().min(1).max(4000),
    replyToId: z.string().nullable().optional(),
  }), req.body);
  const db = await getDb();
  if (body.replyToId) {
    const parent = await db.get('SELECT id FROM messages WHERE id = ? AND couple_id = ? AND deleted_at IS NULL', [body.replyToId, req.coupleId]);
    if (!parent) throw err(404, 'NOT_FOUND', 'پیام مرجع پیدا نشد.');
  }
  const id = newId(); const t = now();
  await db.run(
    'INSERT INTO messages (id, couple_id, sender_id, content_enc, reply_to_id, created_at) VALUES (?,?,?,?,?,?)',
    [id, req.coupleId, req.user!.id, encryptString(body.content), body.replyToId ?? null, t]);
  typingMap.get(req.coupleId!)?.delete(req.user!.id);
  ok(res, { message: msgOut(await db.get('SELECT * FROM messages WHERE id = ?', [id]), [], [], req.user!.id) }, 201);
}));

chatRouter.post('/messages/with-file', requireAuth, requireCouple, uploadLimiter, upload.single('file'), asyncH(async (req, res) => {
  const content = String(req.body?.content || '').slice(0, 4000);
  if (!req.file && !content) throw err(400, 'EMPTY', 'پیام خالی است.');
  if (req.file && !isAllowedMime(req.file.mimetype)) throw err(400, 'BAD_FILE', 'نوع فایل مجاز نیست.');
  const db = await getDb();
  const id = newId(); const t = now();
  await db.run(
    'INSERT INTO messages (id, couple_id, sender_id, content_enc, created_at) VALUES (?,?,?,?,?)',
    [id, req.coupleId, req.user!.id, encryptString(content || ''), t]);
  let att = null;
  if (req.file) {
    const key = newStorageKey(req.coupleId!, req.file.mimetype);
    await putObject(key, req.file.buffer);
    att = { id: newId(), url: publicUrlFor(key), mime: req.file.mimetype, size: req.file.size };
    await db.run(
      'INSERT INTO message_attachments (id, message_id, url, storage_key, mime, size) VALUES (?,?,?,?,?,?)',
      [att.id, id, att.url, key, req.file.mimetype, req.file.size]);
  }
  const r = await db.get('SELECT * FROM messages WHERE id = ?', [id]);
  ok(res, { message: msgOut(r, [], att ? [{ ...att, message_id: id, storage_key: '' }] : [], req.user!.id) }, 201);
}));

chatRouter.patch('/messages/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const { content } = parse(z.object({ content: z.string().trim().min(1).max(4000) }), req.body);
  const db = await getDb();
  const r = await db.get('SELECT * FROM messages WHERE id = ? AND couple_id = ? AND deleted_at IS NULL', [req.params.id, req.coupleId]);
  if (!r) throw err(404, 'NOT_FOUND', 'پیام پیدا نشد.');
  if (r.sender_id !== req.user!.id) throw err(403, 'FORBIDDEN', 'فقط فرستنده می‌تواند ویرایش کند.');
  await db.run('UPDATE messages SET content_enc = ?, edited_at = ? WHERE id = ?', [encryptString(content), now(), r.id]);
  ok(res, { edited: true });
}));

chatRouter.delete('/messages/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const r = await db.get('SELECT * FROM messages WHERE id = ? AND couple_id = ? AND deleted_at IS NULL', [req.params.id, req.coupleId]);
  if (!r) throw err(404, 'NOT_FOUND', 'پیام پیدا نشد.');
  if (r.sender_id !== req.user!.id) throw err(403, 'FORBIDDEN', 'فقط فرستنده می‌تواند حذف کند.');
  const atts = await db.all('SELECT storage_key FROM message_attachments WHERE message_id = ?', [r.id]);
  await db.run('UPDATE messages SET deleted_at = ? WHERE id = ?', [now(), r.id]);
  for (const a of atts) await deleteObject(a.storage_key);
  ok(res, { deleted: true });
}));

chatRouter.post('/messages/:id/pin', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const r = await db.get('SELECT * FROM messages WHERE id = ? AND couple_id = ? AND deleted_at IS NULL', [req.params.id, req.coupleId]);
  if (!r) throw err(404, 'NOT_FOUND', 'پیام پیدا نشد.');
  await db.run('UPDATE messages SET pinned = ? WHERE id = ?', [r.pinned ? 0 : 1, r.id]);
  ok(res, { pinned: !r.pinned });
}));

chatRouter.post('/messages/:id/reactions', requireAuth, requireCouple, asyncH(async (req, res) => {
  const { emoji } = parse(z.object({ emoji: z.string().min(1).max(8) }), req.body);
  const db = await getDb();
  const r = await db.get('SELECT id FROM messages WHERE id = ? AND couple_id = ? AND deleted_at IS NULL', [req.params.id, req.coupleId]);
  if (!r) throw err(404, 'NOT_FOUND', 'پیام پیدا نشد.');
  const existing = await db.get('SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', [r.id, req.user!.id, emoji]);
  if (existing) {
    await db.run('DELETE FROM message_reactions WHERE id = ?', [existing.id]);
    return ok(res, { reacted: false });
  }
  await db.run('INSERT INTO message_reactions (id, message_id, user_id, emoji) VALUES (?,?,?,?)', [newId(), r.id, req.user!.id, emoji]);
  ok(res, { reacted: true });
}));

chatRouter.post('/read', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  await db.run('UPDATE couple_members SET last_read_message_at = ? WHERE couple_id = ? AND user_id = ?', [now(), req.coupleId, req.user!.id]);
  ok(res, { read: true });
}));

chatRouter.post('/typing', requireAuth, requireCouple, asyncH(async (req, res) => {
  if (!typingMap.has(req.coupleId!)) typingMap.set(req.coupleId!, new Map());
  typingMap.get(req.coupleId!)!.set(req.user!.id, Date.now());
  ok(res, { typing: true });
}));

chatRouter.get('/search', requireAuth, requireCouple, asyncH(async (req, res) => {
  const q = String(req.query.q || '').slice(0, 100);
  if (!q) return ok(res, { messages: [] });
  // messages are encrypted at rest — search decrypts in-memory (bounded)
  const messages = await loadMessages(req.coupleId!, req.user!.id, undefined, 300);
  ok(res, { messages: messages.filter((m) => m.content.includes(q)).slice(0, 50) });
}));
