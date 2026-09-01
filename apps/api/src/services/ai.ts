import { getDb } from '../db';
import { decryptString } from '../lib/crypto';
import { daysBetween } from '../lib/dates';

/**
 * Couple Assistant — a privacy-first suggestion engine that runs ENTIRELY on
 * this server (no third-party API, your data never leaves). It reads recent
 * moods, love languages, wishlist and countdowns to generate warm, concrete
 * suggestions in Persian. NOT a therapist / medical tool — just ideas.
 */

const LANG_FA: Record<string, string> = {
  words: 'کلمات تأییدکننده', time: 'وقت‌گذراندن باکیفیت', service: 'کمک و خدمت',
  gifts: 'هدیه‌دادن', touch: 'تماس فیزیکی',
};

const DATE_IDEAS: Record<string, string[]> = {
  cozy: ['شب فیلم با پتو و پاپ‌کورن 🎬', 'درست‌کردن شام با هم 🍝', 'مسابقه‌ی بازی رومیزی 🎲'],
  out: ['قدم‌زدن زیر بارون با یک چتر ☔', 'قهوه در یک کافه‌ی دنج جدید ☕', 'عکاسی دونفره در شهر 📸', 'ピکنیک غروب در پارک 🧺'],
  surprise: ['یک دست‌نوشته زیر بالشش بذار 💌', 'موزیک موردعلاقه‌تون رو پخش کن و برقصید 🎶', 'صبحانه سرو کن توی رختخواب 🥞'],
};
DATE_IDEAS.out[3] = 'پیک‌نیک غروب در پارک 🧺';

const CONVERSATION_STARTERS = [
  'اگه قرار بود همین هفته یک روز کامل فقط مال ما باشه، دوست داری چیکار کنیم؟',
  'کدوم خاطره‌ی مشترکمون رو دوست داری دوباره زنده کنی؟',
  'امسال دوست داری چه عادت جدیدی رو با هم شروع کنیم؟',
  'سه چیز بگو که این هفته باعث شد لبخند بزنی 😊',
  'اگه بتونیم یک جاده‌گردی رؤیایی بریم، مسیرش کجاست؟',
];

const GIFT_IDEAS_GENERIC = ['کتابی که مدت‌هاست می‌خواد 📚', 'قاب عکس از بهترین خاطره‌تون 🖼️', 'بلیط کنسرت/سینما 🎟️', 'گلدون کوچیک 🌷', 'چیزی توی رنگ موردعلاقه‌ش 🎨'];

export async function buildSuggestions(coupleId: string, userId: string, partnerId?: string) {
  const db = await getDb();
  const out: any = { sections: [] as any[], generatedAt: new Date().toISOString(), note: 'این پیشنهادها فقط ایده‌اند؛ تصمیم با شماست ❤️' };

  // partner state
  let partnerMood: any = null;
  if (partnerId) {
    partnerMood = await db.get(
      'SELECT * FROM moods WHERE user_id = ? ORDER BY date DESC LIMIT 1', [partnerId]);
  }
  const partnerLang = partnerId
    ? await db.get('SELECT * FROM love_languages WHERE user_id = ?', [partnerId]) : null;
  const partnerProfile = partnerId
    ? await db.get('SELECT favorite_color, favorite_things, nickname FROM profiles WHERE user_id = ?', [partnerId]) : null;
  const partnerNameRow = partnerId ? await db.get('SELECT display_name FROM users WHERE id = ?', [partnerId]) : null;
  const pname = partnerNameRow?.display_name || 'پارتنرت';

  const wishes = await db.all("SELECT * FROM wishlist_items WHERE couple_id = ? AND deleted_at IS NULL AND status = 'wanted'", [coupleId]);
  const countdowns = await db.all('SELECT * FROM countdowns WHERE couple_id = ? AND deleted_at IS NULL', [coupleId]);
  const nextCountdown = countdowns
    .map((c: any) => ({ ...c, daysLeft: daysBetween(new Date().toISOString().slice(0, 10), c.target_date) }))
    .filter((c: any) => c.daysLeft >= 0).sort((a: any, b: any) => a.daysLeft - b.daysLeft)[0];

  // 1) امروز برای بهتر شدن حالش
  const careIdeas: string[] = [];
  if (partnerMood) {
    if (['sad', 'awful'].includes(partnerMood.mood)) careIdeas.push(`امروز ${pname} حال خوبی نداشته 🤍 — یک بغل گرم یا پیام مهربونانه می‌تونه معجزه کنه.`);
    if (partnerMood.mood === 'tired') careIdeas.push(`${pname} خسته‌ست 😴 — امشب کار خونه رو تو انجام بده و یک چای داغ آماده کن.`);
    if (partnerMood.stress >= 7) careIdeas.push('استرسش بالاست — یک قدم‌زدن کوتاه دست‌در‌دست پیشنهاد بده.');
    if (partnerMood.support_wish === 'hug') careIdeas.push('خودش گفته دلش بغل می‌خواد 🤗');
    if (partnerMood.support_wish === 'space') careIdeas.push('امروز به فضای شخصی نیاز داره — با احترام کنارش باش، بی‌قضاوت.');
    if (partnerMood.support_wish === 'talk') careIdeas.push('دوست داره حرف بزنه — گوشی رو بذار کنار و با دقت گوش بده 👂');
  }
  if (partnerLang) {
    careIdeas.push(`زبان عشق اصلیش «${LANG_FA[partnerLang.primary_lang]}» است — امروز دقیقاً با همین زبان باهاش عشق بازی کن.`);
    if (partnerLang.primary_lang === 'words') careIdeas.push('یک جمله‌ی قشنگ درباره‌ی یک خصلتش بنویس و بفرست ✍️');
    if (partnerLang.primary_lang === 'gifts') careIdeas.push('یک چیز کوچیک ولی فکرشده هدیه بده؛ اندازه‌ش مهم نیست، پیامش مهمه 🎁');
    if (partnerLang.primary_lang === 'time') careIdeas.push('۳۰ دقیقه‌ی بدون موبایل، فقط شما دو نفر. همین امروز.');
  }
  if (!careIdeas.length) careIdeas.push('امروز هنوز چیزی ثبت نشده — اولین قدم: «امروز حالت چطوره؟» 🌱');
  out.sections.push({ kind: 'care', title: 'امروز چطور کنارش باشی؟', ideas: careIdeas.slice(0, 4) });

  // 2) پیشنهاد قرار
  const pool = [...DATE_IDEAS.cozy, ...DATE_IDEAS.out];
  const seedDay = new Date().getDate();
  out.sections.push({
    kind: 'date', title: 'قرار پیشنهادی امشب',
    ideas: [pool[seedDay % pool.length], pool[(seedDay + 5) % pool.length], ...DATE_IDEAS.surprise.slice(0, 1)],
  });

  // 3) هدیه
  const giftIdeas = wishes.filter((w: any) => w.owner_id && w.owner_id !== userId).map((w: any) => `از wishlist خودش: «${w.title}» 🎁`);
  if (partnerProfile?.favorite_color) giftIdeas.push(`چیزی به رنگ موردعلاقه‌ش (${partnerProfile.favorite_color}) 🎨`);
  out.sections.push({ kind: 'gift', title: 'ایده‌ی هدیه', ideas: [...giftIdeas.slice(0, 3), ...GIFT_IDEAS_GENERIC.slice(0, 2)] });

  // 4) برنامه‌ی آخر هفته
  out.sections.push({
    kind: 'weekend', title: 'برنامه‌ی آخر هفته',
    ideas: [
      nextCountdown ? `آماده‌شدن برای «${nextCountdown.title}» (${nextCountdown.daysLeft} روز مونده! ⏳)` : 'یک countdown جدید بسازید تا هیجانش شروع بشه ⏳',
      'یک ساعت برنامه‌ریزی bucket list با چای 🫖',
      'یک خاطره‌ی جدید ثبت کنید و به «داستان ما» اضافه‌ش کنید 📖',
    ],
    note: undefined,
  });
  out.sections[3].ideas[0] = nextCountdown
    ? `آماده‌شدن برای «${nextCountdown.title}» (${nextCountdown.daysLeft} روز مونده! ⏳)`
    : 'یک countdown جدید بسازید تا هیجانش شروع بشه ⏳';

  // 5) گفتگو
  out.sections.push({ kind: 'talk', title: 'شروع‌کننده‌ی گفتگو', ideas: CONVERSATION_STARTERS.slice(seedDay % CONVERSATION_STARTERS.length).concat(CONVERSATION_STARTERS).slice(0, 3) });

  // 6) نامه‌ی آماده (draft)
  const nickname = partnerProfile?.nickname || pname;
  out.letterDraft = `به ${nickname} عزیزم،\n\nهمین که هستی، روزهای معمولی هم قشنگ می‌شن. امروز وسط شلوغی به فکرت بودم و لبخند زدم. قدردان همه‌ی لحظه‌ها، همه‌ی بغل‌ها و همه‌ی حمایت‌های بی‌ادعات هستم.\n\nدوستت دارم، بیشتر از دیروز و کمتر از فردا ❤️`;

  // 7) خاطره → داستان
  const memories = await db.all('SELECT title, date, description FROM memories WHERE couple_id = ? AND deleted_at IS NULL ORDER BY date ASC LIMIT 3', [coupleId]);
  if (memories.length) {
    out.storyDraft = memories.map((m: any) => `در ${m.date}، «${m.title}»${m.description ? ' — ' + String(m.description).slice(0, 120) : ''}`).join('\n');
  }
  return out;
}
