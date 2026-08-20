import { Router } from 'express';
import { z } from 'zod';
import { getDb, newId, now } from '../db';
import { requireAuth, requireCouple } from '../middleware/auth';
import { asyncH, ok } from '../lib/http';
import { parse } from '../lib/validate';
import { decryptString } from '../lib/crypto';
import { todayStr, daysBetween, addDays } from '../lib/dates';

export const notificationsRouter = Router();
export const searchRouter = Router();
export const dashboardRouter = Router();
export const datePlannerRouter = Router();

// ---------------- Notifications (stored + computed reminders) ----------------
async function computedReminders(userId: string, coupleId: string | undefined) {
  const db = await getDb();
  const s = await db.get('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
  const items: any[] = [];
  const today = todayStr();
  if (!coupleId) return items;
  const add = (type: string, title: string, body?: string, enabled = true) => {
    if (enabled) items.push({ id: `auto-${type}-${title}`, type, title, body, computed: true });
  };
  // countdowns
  const cds = await db.all('SELECT * FROM countdowns WHERE couple_id = ? AND deleted_at IS NULL', [coupleId]);
  for (const c of cds) {
    const d = daysBetween(today, c.target_date);
    if (d >= 0 && d <= 7) add('countdown', `${c.emoji} ${c.title}`, d === 0 ? 'همین امروزه! 🎉' : `${d} روز دیگه می‌رسه`, true);
  }
  // birthdays (members)
  const members = await db.all(
    'SELECT u.display_name, p.birthday FROM couple_members m JOIN users u ON u.id = m.user_id LEFT JOIN profiles p ON p.user_id = u.id WHERE m.couple_id = ?',
    [coupleId]);
  for (const m of members) {
    if (!m.birthday) continue;
    const [, mm, dd] = String(m.birthday).split('-');
    const nowD = new Date();
    let cand = `${nowD.getFullYear()}-${mm}-${dd}`;
    if (daysBetween(today, cand) < 0) cand = `${nowD.getFullYear() + 1}-${mm}-${dd}`;
    const d = daysBetween(today, cand);
    if (d <= 14) add('birthday', `🎂 تولد ${m.display_name}`, d === 0 ? 'امروزه! سورپرایز آماده‌ست؟' : `${d} روز دیگه`, !!s?.notif_birthday);
  }
  // calendar events (next 48h with reminders)
  if (s?.notif_calendar) {
    const evs = await db.all('SELECT * FROM calendar_events WHERE couple_id = ? AND deleted_at IS NULL AND date >= ? AND date <= ?', [coupleId, today, addDays(today, 2)]);
    for (const e of evs) add('calendar', `📅 ${e.title}`, `${e.date}${e.time ? ' ساعت ' + e.time : ''}`, true);
  }
  // period / pms (private reminders, only if enabled)
  if (s?.period_tracking_enabled && (s?.notif_period || s?.notif_pms)) {
    const cycles = await db.all('SELECT * FROM period_cycles WHERE user_id = ? AND deleted_at IS NULL ORDER BY start_date DESC LIMIT 6', [userId]);
    if (cycles.length) {
      const lens = cycles.map((c: any) => c.cycle_length).filter((n: number) => n > 0);
      const avg = Math.round(lens.reduce((a: number, n: number) => a + n, 0) / lens.length);
      const next = addDays(cycles[0].start_date, avg);
      const d = daysBetween(today, next);
      if (s?.notif_pms && d >= 1 && d <= 5) add('pms', '🌸 روزهای PMS نزدیکه', 'احتمالاً روزهای سخت در راهه؛ مهربون‌تر با خودت باش ❤️');
      if (s?.notif_period && d >= 0 && d <= 2) add('period', '🩸 پریود احتمالی نزدیکه', `حدوداً ${d === 0 ? 'امروز' : d + ' روز دیگر'} — این فقط یادآوریه، نه تشخیص.`);
    }
  }
  return items;
}

notificationsRouter.get('/', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  const member = await db.get('SELECT couple_id FROM couple_members WHERE user_id = ?', [req.user!.id]);
  const stored = await db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [req.user!.id]);
  const computed = await computedReminders(req.user!.id, member?.couple_id);
  const unread = stored.filter((n: any) => !n.read_at).length;
  ok(res, {
    notifications: stored.map((n: any) => ({ id: n.id, type: n.type, title: n.title, body: n.body, read: !!n.read_at, createdAt: n.created_at })),
    reminders: computed,
    unread,
  });
}));

notificationsRouter.post('/read', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  await db.run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', [now(), req.user!.id]);
  ok(res, { read: true });
}));

notificationsRouter.get('/prefs', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  const s = await db.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user!.id]);
  const keys = ['notif_birthday', 'notif_anniversary', 'notif_period', 'notif_pms', 'notif_calendar', 'notif_task', 'notif_memory', 'notif_letter', 'notif_question', 'notif_mood'] as const;
  const prefs: Record<string, boolean> = {};
  for (const k of keys) prefs[k] = !!s?.[k];
  ok(res, { prefs });
}));

/** Helper used by other modules to push a stored notification. */
export async function notify(userId: string, type: string, title: string, body?: string, data?: any) {
  const db = await getDb();
  await db.run('INSERT INTO notifications (id, user_id, type, title, body, data, created_at) VALUES (?,?,?,?,?,?,?)',
    [newId(), userId, type, title, body ?? null, data ? JSON.stringify(data) : null, now()]);
}

// ---------------- Global search ----------------
searchRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const q = String(req.query.q || '').slice(0, 80).trim();
  if (!q) return ok(res, { results: [] });
  const db = await getDb();
  const like = `%${q}%`;
  const results: any[] = [];
  const [memories, journal, events, wishlist, letters, photos] = await Promise.all([
    db.all('SELECT id, title, date FROM memories WHERE couple_id = ? AND deleted_at IS NULL AND (title LIKE ? OR description LIKE ? OR location LIKE ?) LIMIT 8', [req.coupleId, like, like, like]),
    db.all("SELECT id, title, entry_date, content_enc FROM journal_entries WHERE couple_id = ? AND deleted_at IS NULL AND title LIKE ? AND (visibility='shared' OR author_id=?) LIMIT 8", [req.coupleId, like, req.user!.id]),
    db.all('SELECT id, title, date, kind FROM calendar_events WHERE couple_id = ? AND deleted_at IS NULL AND (title LIKE ? OR location LIKE ?) LIMIT 8', [req.coupleId, like, like]),
    db.all('SELECT id, title, category FROM wishlist_items WHERE couple_id = ? AND deleted_at IS NULL AND title LIKE ? LIMIT 8', [req.coupleId, like]),
    db.all('SELECT id, title FROM love_letters WHERE couple_id = ? AND deleted_at IS NULL AND title LIKE ? LIMIT 5', [req.coupleId, like]),
    db.all('SELECT id, caption, url FROM photos WHERE couple_id = ? AND deleted_at IS NULL AND (caption LIKE ? OR tags LIKE ?) LIMIT 8', [req.coupleId, like, like]),
  ]);
  // encrypted journal content search (bounded, in-memory decrypt)
  const jExtra = await db.all("SELECT id, title, entry_date, content_enc FROM journal_entries WHERE couple_id = ? AND deleted_at IS NULL AND (visibility='shared' OR author_id=?) ORDER BY entry_date DESC LIMIT 60", [req.coupleId, req.user!.id]);
  const jMatches = new Set(journal.map((j: any) => j.id));
  for (const j of jExtra) {
    if (jMatches.has(j.id)) continue;
    try { if (decryptString(j.content_enc).includes(q)) { journal.push(j); jMatches.add(j.id); } } catch { /* skip */ }
    if (journal.length >= 8) break;
  }
  for (const m of memories) results.push({ type: 'memory', id: m.id, title: m.title, sub: m.date, href: `/memories/${m.id}` });
  for (const j of journal) results.push({ type: 'journal', id: j.id, title: j.title, sub: j.entry_date, href: `/journal/${j.id}` });
  for (const e of events) results.push({ type: 'event', id: e.id, title: e.title, sub: e.date, href: '/calendar' });
  for (const w of wishlist) results.push({ type: 'wishlist', id: w.id, title: w.title, sub: w.category, href: '/wishlist' });
  for (const l of letters) results.push({ type: 'letter', id: l.id, title: l.title, sub: 'نامه', href: '/love-letters' });
  for (const p of photos) results.push({ type: 'photo', id: p.id, title: p.caption || 'عکس', sub: p.url, href: '/photos' });
  ok(res, { results: results.slice(0, 30) });
}));

// ---------------- Dashboard aggregate ----------------
dashboardRouter.get('/', requireAuth, requireCouple, asyncH(async (req, res) => {
  const db = await getDb();
  const today = todayStr();
  const couple = await db.get('SELECT * FROM couples WHERE id = ?', [req.coupleId]);
  const moods = await db.all('SELECT * FROM moods WHERE couple_id = ? AND date = ?', [req.coupleId, today]);
  const mine = moods.find((m: any) => m.user_id === req.user!.id) ?? null;
  const partnerMood = moods.find((m: any) => m.user_id !== req.user!.id) ?? null;
  const partner = req.partnerId
    ? await db.get('SELECT display_name, avatar_url, last_seen_at FROM users WHERE id = ?', [req.partnerId]) : null;
  const questions = await db.all('SELECT * FROM daily_questions ORDER BY id');
  const q = questions.length ? questions[Math.floor(Date.now() / 86400000) % questions.length] : null;
  const qAnswers = q ? await db.all('SELECT user_id FROM question_answers WHERE question_id = ? AND couple_id = ?', [q.id, req.coupleId]) : [];
  const cds = await db.all('SELECT * FROM countdowns WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]);
  const nextCd = cds.map((c: any) => ({ ...c, daysLeft: daysBetween(today, c.target_date) })).filter((c: any) => c.daysLeft >= 0).sort((a: any, b: any) => a.daysLeft - b.daysLeft)[0] ?? null;
  const memoryCount = await db.get('SELECT COUNT(*) AS n FROM memories WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]);
  const photoCount = await db.get('SELECT COUNT(*) AS n FROM photos WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]);
  const journalCount = await db.get("SELECT COUNT(*) AS n FROM journal_entries WHERE couple_id = ? AND deleted_at IS NULL AND (visibility='shared' OR author_id = ?)", [req.coupleId, req.user!.id]);
  const upcoming = await db.all('SELECT * FROM calendar_events WHERE couple_id = ? AND deleted_at IS NULL AND date >= ? ORDER BY date, time LIMIT 3', [req.coupleId, today]);
  const unread = await db.get('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user!.id]);
  const unreadMsgs = req.partnerId
    ? await db.get('SELECT COUNT(*) AS n FROM messages WHERE couple_id = ? AND deleted_at IS NULL AND sender_id != ? AND created_at > COALESCE((SELECT last_read_message_at FROM couple_members WHERE couple_id = ? AND user_id = ?), ?)', [req.coupleId, req.user!.id, req.coupleId, req.user!.id, '1970-01-01']) : { n: 0 };
  ok(res, {
    couple: {
      title: couple.title, startDate: couple.start_date,
      daysTogether: couple.start_date ? daysBetween(couple.start_date) + 1 : null,
    },
    me: req.user,
    partner,
    moods: { mine: mine ? { mood: mine.mood, energy: mine.energy } : null, partner: partnerMood ? { mood: partnerMood.mood, energy: partnerMood.energy, supportWish: partnerMood.support_wish } : null },
    question: q ? { id: q.id, text: q.text, answered: qAnswers.some((a: any) => a.user_id === req.user!.id), partnerAnswered: qAnswers.some((a: any) => a.user_id !== req.user!.id) } : null,
    nextCountdown: nextCd,
    stats: { memories: Number(memoryCount.n), photos: Number(photoCount.n), journal: Number(journalCount.n) },
    upcomingEvents: upcoming.map((e: any) => ({ id: e.id, title: e.title, date: e.date, time: e.time, kind: e.kind })),
    unreadNotifications: Number(unread.n),
    unreadMessages: Number(unreadMsgs?.n ?? 0),
  });
}));

// ---------------- Date planner / random date generator ----------------
const DATE_CATEGORIES: Record<string, string[]> = {
  movie: ['شب فیلم سرگرم‌کننده 🎬', 'پارت فیلم ترسناک با چراغ کم 👻', 'ماراتن انیمیشن 🍿'],
  dinner: ['شام در رستوران موردعلاقه 🍽️', 'آشپزی دونفره با رسپی جدید 👩‍🍳', 'پیتزای خانگی و سس مخصوص 🍕'],
  walk: ['قدم‌زدن غروب کنار رودخانه 🌇', 'کافه‌گردی در محله‌ی قدیمی ☕', 'ستاره‌نگری بیرون شهر ✨'],
  gaming: ['بازی دونفره رقابتی 🎮', 'پازل ۱۰۰۰ تکه با موزیک 🧩', 'مسابقه‌ی ماریو کارت 🏎️'],
  home: ['شب Spa خانگی 🛁', 'کتاب‌خوانی دونفره با چای 📚', 'بازی «۲۰ سؤال» 💬'],
  trip: ['رود تریپ یک‌روزه 🚗', 'کمپ کوتاه آخر هفته ⛺', 'بازدید از شهر همسایه 🗺️'],
  photo: ['عکاسی دونفره در طبیعت 📸', 'بازسازی اولین عکس مشترک 🖼️', 'شب عکاسی از ماه 🌙'],
};

datePlannerRouter.get('/ideas', requireAuth, requireCouple, asyncH(async (req, res) => {
  ok(res, { categories: Object.keys(DATE_CATEGORIES), ideas: DATE_CATEGORIES });
}));

datePlannerRouter.get('/random', requireAuth, requireCouple, asyncH(async (req, res) => {
  const cat = String(req.query.category || '');
  const pool = cat && DATE_CATEGORIES[cat] ? DATE_CATEGORIES[cat] : Object.values(DATE_CATEGORIES).flat();
  // pick varies per request; also add a wishlist-inspired idea sometimes
  const idea = pool[Math.floor(Math.random() * pool.length)];
  const db = await getDb();
  const wish = await db.get("SELECT title FROM wishlist_items WHERE couple_id = ? AND deleted_at IS NULL AND category IN ('places_we_want','things_to_do') AND status = 'wanted' ORDER BY RANDOM() LIMIT 1", [req.coupleId]);
  ok(res, { idea, fromWishlist: wish?.title ?? null });
}));
