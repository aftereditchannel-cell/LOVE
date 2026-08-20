import { Router } from 'express';
import { z } from 'zod';
import { getDb, newId, now } from '../db';
import { requireAuth, requireCouple, ownedOr404 } from '../middleware/auth';
import { asyncH, err, ok } from '../lib/http';
import { parse } from '../lib/validate';
import { encryptString, decryptString } from '../lib/crypto';
import { queueBackup } from '../services/backupQueue';
import { todayStr } from '../lib/dates';

export const lettersRouter = Router();
export const questionsRouter = Router();
export const loveLanguageRouter = Router();
export const relationshipRouter = Router();
export const complimentsRouter = Router();
export const storyRouter = Router();

// ---------------- Love Letters (sealed-with-a-date) ----------------
const letterSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(20000).default(''),
  openAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
const letterOut = (r: any, meId: string) => {
  const sealed = r.open_at && r.open_at > todayStr();
  const mine = r.author_id === meId;
  return {
    id: r.id, title: r.title, openAt: r.open_at, openedAt: r.opened_at,
    sealed: !!sealed, isMine: mine, authorId: r.author_id, createdAt: r.created_at,
    // authors can always re-read their own letter; partner only after unseal
    content: (mine || !sealed) ? (() => { try { return decryptString(r.content_enc); } catch { return ''; } })() : null,
  };
};

lettersRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM love_letters WHERE couple_id = ? AND deleted_at IS NULL ORDER BY created_at DESC', [req.coupleId]);
  ok(res, { letters: rows.map((r: any) => letterOut(r, req.user!.id)) });
}));

lettersRouter.post('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(letterSchema, req.body);
  const db = await getDb();
  const id = newId(); const t = now();
  await db.run(
    'INSERT INTO love_letters (id, couple_id, author_id, title, content_enc, open_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
    [id, req.coupleId, req.user!.id, body.title, encryptString(body.content), body.openAt ?? null, t, t]);
  queueBackup(req.coupleId!);
  ok(res, { letter: letterOut(await db.get('SELECT * FROM love_letters WHERE id = ?', [id]), req.user!.id) }, 201);
}));

lettersRouter.post('/:id/open', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('love_letters', req.params.id, req.coupleId!);
  if (r.open_at && r.open_at > todayStr()) {
    throw err(423, 'SEALED', `این نامه تا ${r.open_at} مُهروموم است 💌`);
  }
  const db = await getDb();
  if (!r.opened_at) await db.run('UPDATE love_letters SET opened_at = ? WHERE id = ?', [now(), r.id]);
  ok(res, { letter: letterOut(await db.get('SELECT * FROM love_letters WHERE id = ?', [r.id]), req.user!.id) });
}));

lettersRouter.delete('/:id', requireAuth, requireCouple, asyncH(async (req, res) => {
  const r = await ownedOr404('love_letters', req.params.id, req.coupleId!);
  if (r.author_id !== req.user!.id) throw err(403, 'FORBIDDEN', 'فقط نویسنده می‌تواند حذف کند.');
  const db = await getDb();
  await db.run('UPDATE love_letters SET deleted_at = ? WHERE id = ?', [now(), r.id]);
  ok(res, { deleted: true });
}));

// ---------------- Daily Questions ----------------
questionsRouter.get('/today', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const all = await db.all('SELECT * FROM daily_questions ORDER BY id');
  if (!all.length) return ok(res, { question: null, myAnswer: null, partnerAnswer: null });
  // deterministic question of the day
  const dayIndex = Math.floor(Date.now() / 86400000) % all.length;
  const q = all[dayIndex];
  const answers = await db.all('SELECT * FROM question_answers WHERE question_id = ? AND couple_id = ?', [q.id, req.coupleId]);
  const mine = answers.find((a: any) => a.user_id === req.user!.id);
  const partner = answers.find((a: any) => a.user_id !== req.user!.id);
  ok(res, {
    question: { id: q.id, text: q.text },
    myAnswer: mine?.answer ?? null,
    // partner's answer is revealed only after you answer (compare answers fairly)
    partnerAnswer: mine ? (partner?.answer ?? null) : null,
    partnerAnswered: !!partner,
  });
}));

questionsRouter.post('/:id/answer', requireAuth, requireCouple, asyncH(async (req, res) => {
  const { answer } = parse(z.object({ answer: z.string().trim().min(1).max(2000) }), req.body);
  const db = await getDb();
  const q = await db.get('SELECT id FROM daily_questions WHERE id = ?', [req.params.id]);
  if (!q) throw err(404, 'NOT_FOUND', 'سؤال پیدا نشد.');
  const existing = await db.get('SELECT id FROM question_answers WHERE question_id = ? AND user_id = ? AND couple_id = ?',
    [q.id, req.user!.id, req.coupleId]);
  if (existing) {
    await db.run('UPDATE question_answers SET answer = ? WHERE id = ?', [answer, existing.id]);
  } else {
    await db.run('INSERT INTO question_answers (id, question_id, user_id, couple_id, answer, created_at) VALUES (?,?,?,?,?,?)',
      [newId(), q.id, req.user!.id, req.coupleId, answer, now()]);
  }
  queueBackup(req.coupleId!);
  ok(res, { saved: true });
}));

questionsRouter.get('/history', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all(
    `SELECT q.id AS qid, q.text, a.user_id, a.answer, a.created_at FROM question_answers a
     JOIN daily_questions q ON q.id = a.question_id WHERE a.couple_id = ? ORDER BY a.created_at DESC LIMIT 200`,
    [req.coupleId]);
  const grouped = new Map<string, any>();
  for (const r of rows) {
    if (!grouped.has(r.qid)) grouped.set(r.qid, { id: r.qid, text: r.text, answers: [] });
    grouped.get(r.qid)!.answers.push({ userId: r.user_id, answer: r.answer, createdAt: r.created_at });
  }
  ok(res, { history: [...grouped.values()], me: req.user!.id });
}));

// ---------------- Love Language ----------------
const LANGS = ['words', 'time', 'service', 'gifts', 'touch'] as const;

loveLanguageRouter.get('/', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  const mine = await db.get('SELECT * FROM love_languages WHERE user_id = ?', [req.user!.id]);
  const member = await db.get('SELECT couple_id FROM couple_members WHERE user_id = ?', [req.user!.id]);
  let partner = null;
  if (member) {
    const other = await db.get('SELECT user_id FROM couple_members WHERE couple_id = ? AND user_id != ?', [member.couple_id, req.user!.id]);
    if (other) partner = await db.get('SELECT * FROM love_languages WHERE user_id = ?', [other.user_id]);
  }
  ok(res, {
    mine: mine ? { primary: mine.primary_lang, secondary: mine.secondary_lang } : null,
    partner: partner ? { primary: partner.primary_lang, secondary: partner.secondary_lang } : null,
  });
}));

loveLanguageRouter.put('/', requireAuth, asyncH(async (req, res) => {
  const body = parse(z.object({
    primary: z.enum(LANGS),
    secondary: z.enum(LANGS).nullable().optional(),
  }), req.body);
  const db = await getDb();
  const existing = await db.get('SELECT id FROM love_languages WHERE user_id = ?', [req.user!.id]);
  if (existing) {
    await db.run('UPDATE love_languages SET primary_lang = ?, secondary_lang = ?, updated_at = ? WHERE id = ?',
      [body.primary, body.secondary ?? null, now(), existing.id]);
  } else {
    await db.run('INSERT INTO love_languages (id, user_id, primary_lang, secondary_lang, updated_at) VALUES (?,?,?,?,?)',
      [newId(), req.user!.id, body.primary, body.secondary ?? null, now()]);
  }
  ok(res, { saved: true });
}));

// ---------------- Relationship Health (self-reflection, non-clinical) ----------------
const AXES = ['communication', 'trust', 'quality_time', 'affection', 'fun', 'support'] as const;
const checkinSchema = z.object({
  communication: z.number().int().min(1).max(10),
  trust: z.number().int().min(1).max(10),
  qualityTime: z.number().int().min(1).max(10),
  affection: z.number().int().min(1).max(10),
  fun: z.number().int().min(1).max(10),
  support: z.number().int().min(1).max(10),
  note: z.string().max(1000).nullable().optional(),
});
const checkinOut = (r: any) => ({
  id: r.id, authorId: r.author_id, note: r.note, createdAt: r.created_at,
  communication: r.communication, trust: r.trust, qualityTime: r.quality_time,
  affection: r.affection, fun: r.fun, support: r.support,
  average: Math.round(((r.communication + r.trust + r.quality_time + r.affection + r.fun + r.support) / 6) * 10) / 10,
});

relationshipRouter.get('/checkins', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM relationship_checkins WHERE couple_id = ? ORDER BY created_at DESC LIMIT 100', [req.coupleId]);
  ok(res, { checkins: rows.map(checkinOut), axes: AXES, me: req.user!.id });
}));

relationshipRouter.post('/checkins', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(checkinSchema, req.body);
  const db = await getDb();
  const id = newId();
  await db.run(
    `INSERT INTO relationship_checkins (id, couple_id, author_id, communication, trust, quality_time, affection, fun, support, note, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.coupleId, req.user!.id, body.communication, body.trust, body.qualityTime, body.affection, body.fun, body.support, body.note ?? null, now()]);
  ok(res, { checkin: checkinOut(await db.get('SELECT * FROM relationship_checkins WHERE id = ?', [id])), disclaimer: 'این بخش صرفاً خودارزیابی دونفره است و جایگزین مشاوره نیست.' }, 201);
}));

// ---------------- Compliments & Gratitude ----------------
complimentsRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const type = req.query.type === 'gratitude' ? 'gratitude' : 'compliment';
  const db = await getDb();
  const rows = await db.all(
    'SELECT * FROM compliments WHERE couple_id = ? AND type = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 200',
    [req.coupleId, type]);
  ok(res, { items: rows.map((r: any) => ({ id: r.id, text: r.text, authorId: r.author_id, createdAt: r.created_at })), me: req.user!.id });
}));

complimentsRouter.post('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const body = parse(z.object({
    type: z.enum(['compliment', 'gratitude']).default('compliment'),
    text: z.string().trim().min(1).max(1000),
  }), req.body);
  const db = await getDb();
  const id = newId();
  await db.run('INSERT INTO compliments (id, couple_id, author_id, type, text, created_at) VALUES (?,?,?,?,?,?)',
    [id, req.coupleId, req.user!.id, body.type, body.text, now()]);
  queueBackup(req.coupleId!);
  ok(res, { saved: true }, 201);
}));

// ---------------- Our Story (chaptered digital book) ----------------
const CHAPTERS = [
  { key: 'how_we_met', title: 'چطور آشنا شدیم' },
  { key: 'first_date', title: 'اولین قرار' },
  { key: 'first_trip', title: 'اولین سفر' },
  { key: 'best_memory', title: 'بهترین خاطره' },
  { key: 'hard_times', title: 'روزهای سخت' },
  { key: 'funny_moments', title: 'لحظه‌های خنده‌دار' },
  { key: 'future', title: 'آینده‌ی ما' },
];

storyRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM story_chapters WHERE couple_id = ?', [req.coupleId]);
  const byKey = Object.fromEntries(rows.map((r: any) => [r.key, r]));
  ok(res, {
    chapters: CHAPTERS.map((c, i) => {
      const r = byKey[c.key];
      return {
        key: c.key, title: r?.title ?? c.title, order: r?.sort_order ?? i,
        content: r?.content_enc ? (() => { try { return decryptString(r.content_enc); } catch { return ''; } })() : '',
        memoryIds: (r?.memory_ids || '').split(',').filter(Boolean),
      };
    }),
  });
}));

storyRouter.put('/:key', requireAuth, requireCouple, asyncH(async (req, res) => {
  const keyDef = CHAPTERS.find((c) => c.key === req.params.key);
  if (!keyDef) throw err(404, 'NOT_FOUND', 'فصل پیدا نشد.');
  const body = parse(z.object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().max(20000).optional(),
    memoryIds: z.array(z.string()).max(20).optional(),
  }), req.body);
  const db = await getDb();
  const existing = await db.get('SELECT * FROM story_chapters WHERE couple_id = ? AND key = ?', [req.coupleId, req.params.key]);
  const t = now();
  if (existing) {
    await db.run('UPDATE story_chapters SET title = ?, content_enc = ?, memory_ids = ?, updated_at = ? WHERE id = ?',
      [body.title ?? existing.title, body.content !== undefined ? encryptString(body.content) : existing.content_enc,
       body.memoryIds ? body.memoryIds.join(',') : existing.memory_ids, t, existing.id]);
  } else {
    await db.run('INSERT INTO story_chapters (id, couple_id, key, title, content_enc, memory_ids, sort_order, updated_at) VALUES (?,?,?,?,?,?,?,?)',
      [newId(), req.coupleId, req.params.key, body.title ?? keyDef.title, encryptString(body.content ?? ''),
       (body.memoryIds ?? []).join(','), CHAPTERS.indexOf(keyDef), t]);
  }
  queueBackup(req.coupleId!);
  ok(res, { saved: true });
}));
