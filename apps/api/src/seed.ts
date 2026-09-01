/**
 * Seed: daily-question pool (+ demo couple & sample content when SEED_DEMO=true).
 * Demo data is CLEARLY marked as demo. The seeded lock PIN (28042005) is stored
 * hashed — never in plaintext anywhere.
 */
import { config, assertSecrets } from './config';
import { getDb, newId, now } from './db';
import { hashPassword } from './lib/password';
import { encryptString } from './lib/crypto';

const QUESTIONS = [
  'امروز بیشتر از همه دلت چی می‌خواد؟',
  'اولین چیزی که باعث شد عاشقم بشی چی بود؟',
  'اگه همین الان می‌تونستیم بریم هر جای دنیا، کجا می‌رفتیم؟',
  'قشنگ‌ترین خاطره‌ای که با هم داریم چیه؟',
  'چه عادت کوچیک من رو بیشتر دوست داری؟',
  'اگه یه روز کامل فقط مال ما بود، چیکار می‌کردیم؟',
  'چه آهنگی یاد تو می‌ندازتم؟',
  'بزرگ‌ترین رویاهامون برای پنج سال آینده چیه؟',
  'چه چیزی تو رابطه‌مون رو منحصربه‌فرد می‌کنه؟',
  'الان اگه کنارم بودی اولین کارت چی بود؟',
  'کدوم سفر مشترکمون (یا آینده‌مون) رو بیشتر دوست داری؟',
  'چه چیزی این هفته حالت رو خوب کرد؟',
  'سه کلمه برای توصیف رابطه‌ی ما؟',
  'چه غذایی رو دوست داری با هم درست کنیم؟',
  'یادت ترین سورپرایزمون چی بود؟',
];

async function ensureQuestions() {
  const db = await getDb();
  for (const text of QUESTIONS) {
    await db.run('INSERT OR IGNORE INTO daily_questions (id, text, tags) VALUES (?,?,?)', [newId(), text, 'couple']);
  }
  console.log(`✅ question pool ready (${QUESTIONS.length} questions)`);
}

async function seedDemo() {
  if (!config.seedDemo && process.env.FORCE_SEED !== '1') { console.log('ℹ️  SEED_DEMO=false — skipping demo data.'); return; }
  const db = await getDb();
  const t = now();
  const mkUser = async (email: string, name: string, opts: { nickname?: string; birthday?: string; color?: string; things?: string; lockPin?: string } = {}) => {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return existing.id as string;
    const id = newId();
    await db.run('INSERT INTO users (id, email, password_hash, display_name, email_verified_at, lock_pin_hash, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
      [id, email, await hashPassword('Demo1234!'), name, t, opts.lockPin ? await hashPassword(opts.lockPin) : null, t, t]);
    await db.run('INSERT INTO profiles (id, user_id, nickname, birthday, favorite_color, favorite_things, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
      [newId(), id, opts.nickname ?? null, opts.birthday ?? null, opts.color ?? null, opts.things ?? null, t, t]);
    await db.run('INSERT INTO user_settings (id, user_id, lock_enabled) VALUES (?,?,?)', [newId(), id, opts.lockPin ? 1 : 0]);
    return id;
  };
  const arman = await mkUser('arman@demo.local', 'آرمان', { nickname: 'آرمی', birthday: '1998-05-12', color: 'سرمه‌ای', things: 'قهوه‌ی تلخ، عکاسی، کوه', lockPin: '28042005' });
  const nilu = await mkUser('niloofar@demo.local', 'نیلوفر', { nickname: 'نیلی', birthday: '1999-10-03', color: 'صورتی پاستیلی', things: 'گل کوکب، پاستا، رمان' });
  let couple = await db.get('SELECT id FROM couples WHERE title = ?', ['آرمان و نیلوفر (دمو)']);
  let coupleId: string;
  if (couple) { coupleId = couple.id; }
  else {
    coupleId = newId();
    const start = new Date(); start.setDate(start.getDate() - 640);
    await db.run('INSERT INTO couples (id, title, start_date, created_at, updated_at) VALUES (?,?,?,?,?)',
      [coupleId, 'آرمان و نیلوفر (دمو)', start.toISOString().slice(0, 10), t, t]);
    await db.run('INSERT INTO couple_settings (id, couple_id) VALUES (?,?)', [newId(), coupleId]);
    await db.run('INSERT INTO couple_members (id, couple_id, user_id, nickname, joined_at) VALUES (?,?,?,?,?)', [newId(), coupleId, arman, 'آرمی', t]);
    await db.run('INSERT INTO couple_members (id, couple_id, user_id, nickname, joined_at) VALUES (?,?,?,?,?)', [newId(), coupleId, nilu, 'نیلی', t]);
    await db.run('INSERT INTO love_languages (id, user_id, primary_lang, secondary_lang, updated_at) VALUES (?,?,?,?,?)', [newId(), arman, 'time', 'service', t]);
    await db.run('INSERT INTO love_languages (id, user_id, primary_lang, secondary_lang, updated_at) VALUES (?,?,?,?,?)', [newId(), nilu, 'words', 'gifts', t]);

    // memories
    const memories = [
      { title: 'روز آشنایی ما', date: '2023-11-18', milestone: 'met_day', location: 'کافه‌ه گوشه‌ی خیابون', description: '(دمو) جایی که همه‌چیز شروع شد.' },
      { title: 'اولین قرار رسمی', date: '2023-12-01', milestone: 'first_date', location: 'سینما و شام', description: '(دمو) دست‌هامون یادمون رفته بود پاپ‌کورن بخورن.' },
      { title: 'اولین سفر دونفره', date: '2024-04-20', milestone: 'first_trip', location: 'شمال', description: '(دمو) بارون، جنگل و خنده‌های بی‌وقفه.' },
      { title: 'اولین هدیه', date: '2024-02-14', milestone: 'first_gift', location: '', description: '(دمو) یک کتاب با یادداشت دستی روی جلد.' },
    ];
    for (const m of memories) {
      await db.run('INSERT INTO memories (id, couple_id, created_by_id, title, date, location, description, milestone, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [newId(), coupleId, Math.random() > 0.5 ? arman : nilu, m.title, m.date, m.location || null, m.description, m.milestone, t, t]);
    }
    // moods (30 days of demo data)
    const moodPool = ['good', 'great', 'loving', 'ok', 'tired', 'neutral', 'sad'];
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      for (const uid of [arman, nilu]) {
        if (Math.random() < 0.15) continue;
        await db.run('INSERT OR IGNORE INTO moods (id, user_id, couple_id, date, mood, energy, stress, sleep, love_level, social_battery, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          [newId(), uid, coupleId, date, moodPool[Math.floor(Math.random() * moodPool.length)], 3 + Math.floor(Math.random() * 8), 1 + Math.floor(Math.random() * 9), 3 + Math.floor(Math.random() * 8), 6 + Math.floor(Math.random() * 5), 3 + Math.floor(Math.random() * 8), t, t]);
      }
    }
    // calendar + countdowns
    const ann = new Date(); ann.setMonth(ann.getMonth() + 1, 5);
    await db.run('INSERT INTO calendar_events (id, couple_id, created_by_id, title, date, time, kind, color, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [newId(), coupleId, nilu, '(دمو) شام سالگرد 🌹', new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10), '20:00', 'anniversary', 'rose', t, t]);
    await db.run('INSERT INTO calendar_events (id, couple_id, created_by_id, title, date, kind, color, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [newId(), coupleId, arman, '(دمو) خرید آخر هفته', new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), 'event', 'purple', t, t]);
    await db.run('INSERT INTO countdowns (id, couple_id, title, emoji, target_date, repeat, created_at) VALUES (?,?,?,?,?,?,?)',
      [newId(), coupleId, '(دمو) سالگردمون ❤️', '💍', ann.toISOString().slice(0, 10), 'yearly', t]);
    await db.run('INSERT INTO countdowns (id, couple_id, title, emoji, target_date, repeat, created_at) VALUES (?,?,?,?,?,?,?)',
      [newId(), coupleId, '(دمو) تولد نیلوفر 🎂', '🎂', '2026-10-03', 'yearly', t]);
    // wishlist + bucket
    for (const w of [
      ['(دمو) دوربین فوری 📷', 'things_we_want'], ['(دمو) سفر به استانبول ✈️', 'places_we_want'],
      ['(دمو) کلاس رقص دونفره 💃', 'things_to_do'], ['(دمو) خونه‌ی باغی رویاها 🏡', 'dreams'],
    ]) {
      await db.run('INSERT INTO wishlist_items (id, couple_id, owner_id, category, title, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
        [newId(), coupleId, null, w[1], w[0], t, t]);
    }
    for (const [title, done] of [['(دمو) سفر شمال', 1], ['(دمو) کمپ‌زدن', 0], ['(دمو) کنسرت با هم', 0], ['(دمو) عکس حرفه‌ای دونفره', 1]] as Array<[string, number]>) {
      await db.run('INSERT INTO bucket_items (id, couple_id, title, done, done_at, created_at) VALUES (?,?,?,?,?,?)',
        [newId(), coupleId, title, done, done ? t : null, t]);
    }
    // journal + letter + compliments + tasks + expenses
    await db.run('INSERT INTO journal_entries (id, couple_id, author_id, title, content_enc, mood, visibility, entry_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [newId(), coupleId, nilu, 'اولین برف (دمو)', encryptString('امروز اولین برف و باهم توی بالکن قهوه خوردیم. دنیا جای بهتریه وقتی تویی ❄️☕'), 'loving', 'shared', t.slice(0, 10), t, t]);
    await db.run('INSERT INTO love_letters (id, couple_id, author_id, title, content_enc, open_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
      [newId(), coupleId, arman, 'برای وقتی دلتنگ شدی (دمو)', encryptString('اگه اینو می‌خونی یعنی دلت تنگمه. یادت باشه همیشه، حتی از دور، عاشقتم. — آرمان'), new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), t, t]);
    await db.run('INSERT INTO compliments (id, couple_id, author_id, type, text, created_at) VALUES (?,?,?,?,?,?)',
      [newId(), coupleId, arman, 'compliment', '(دمو) خندت قشنگ‌ترین صدای دنیامه 😊', t]);
    await db.run('INSERT INTO compliments (id, couple_id, author_id, type, text, created_at) VALUES (?,?,?,?,?,?)',
      [newId(), coupleId, nilu, 'gratitude', '(دمو) ممنون که دیروز غذا درست کردی وقتی خسته بودم 🌷', t]);
    for (const [title, assignee, done] of [['(دمو) خرید هفتگی', 'both', 0], ['(دمو) رزرو هتل شمال', 'me', 1], ['(دمو) سرویس ماشین', 'partner', 0]] as Array<[string, string, number]>) {
      await db.run('INSERT INTO tasks (id, couple_id, title, assignee, done, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
        [newId(), coupleId, title, assignee, done, arman, t, t]);
    }
    for (const [amount, cat, payer] of [[42.5, 'food', arman], [18, 'fun', nilu], [120, 'travel', arman]] as Array<[number, string, string]>) {
      await db.run('INSERT INTO expenses (id, couple_id, paid_by_id, amount, category, date, created_at) VALUES (?,?,?,?,?,?,?)',
        [newId(), coupleId, payer, amount, cat, t.slice(0, 10), t]);
    }
    await db.run('INSERT INTO relationship_checkins (id, couple_id, author_id, communication, trust, quality_time, affection, fun, support, note, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [newId(), coupleId, arman, 8, 9, 7, 9, 8, 8, '(دمو) هفته‌ی خوبی بود', t]);
    // a couple of demo chat messages
    const msgs: Array<[string, string, number]> = [
      [nilu, 'سلام قشنگم 🌸 ناهار خوردی؟', 55],
      [arman, 'سلام نیلی جان 😍 نه هنوز، دلم واسه شام شی پولادو', 50],
      [nilu, 'پس امشب مهمان آشپزخونه‌می 🍝', 45],
    ];
    for (const [uid, text, minsAgo] of msgs) {
      await db.run('INSERT INTO messages (id, couple_id, sender_id, content_enc, created_at) VALUES (?,?,?,?,?)',
        [newId(), coupleId, uid, encryptString(text), new Date(Date.now() - minsAgo * 60000).toISOString()]);
    }
    console.log('💞 demo couple + sample data seeded (demo users: arman@demo.local / niloofar@demo.local, password: Demo1234!)');
  }
}

async function main() {
  assertSecrets();
  await ensureQuestions();
  await seedDemo();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
