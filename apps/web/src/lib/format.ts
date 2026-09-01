/** Persian-first formatting helpers (fa digits, Persian calendar, relative time). */

const faDigits = '۰۱۲۳۴۵۶۷۸۹';
export const fa = (n: number | string): string => String(n).replace(/\d/g, (d) => faDigits[+d]);

const dtFa = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
const dtFaShort = new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' });
const dtFaFull = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' });
const tmFa = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' });
const wdFa = new Intl.DateTimeFormat('fa-IR', { weekday: 'short' });
const monthFa = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long' });

export const toDay = (s: string | Date): Date => (typeof s === 'string' ? new Date(s.length === 10 ? s + 'T00:00:00' : s) : s);
export const faDate = (s: string | Date): string => dtFa.format(toDay(s));
export const faDateShort = (s: string | Date): string => dtFaShort.format(toDay(s));
export const faDateFull = (s: string | Date): string => dtFaFull.format(toDay(s));
export const faTime = (s: string | Date): string => tmFa.format(toDay(s));
export const faWeekday = (d: Date): string => wdFa.format(d);
export const faMonth = (d: Date): string => monthFa.format(d);

export const todayKey = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function daysUntil(target: string): number {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = toDay(target); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function relTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'همین الان';
  if (m < 60) return `${fa(m)} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${fa(h)} ساعت پیش`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${fa(days)} روز پیش`;
  return faDate(iso);
}

export const Moods: Record<string, { emoji: string; label: string; color: string }> = {
  great: { emoji: '😍', label: 'عالی', color: '#f472b6' },
  good: { emoji: '😊', label: 'خوب', color: '#4ade80' },
  ok: { emoji: '🙂', label: 'معمولی', color: '#a3e635' },
  neutral: { emoji: '😐', label: 'خنثی', color: '#facc15' },
  sad: { emoji: '😔', label: 'ناراحت', color: '#fb923c' },
  awful: { emoji: '😢', label: 'خیلی بد', color: '#ef4444' },
  angry: { emoji: '😡', label: 'عصبانی', color: '#dc2626' },
  loving: { emoji: '🥰', label: 'عاشق', color: '#ec4899' },
  tired: { emoji: '😴', label: 'خسته', color: '#a78bfa' },
};

export const SupportWishes: Record<string, string> = {
  hug: '🤗 بغلم کن', talk: '💬 باهام حرف بزن', space: '🌫️ تنهام بذار',
  gift: '🎁 یه چیزی برام بفرست', time: '⏳ بیا با هم وقت بگذرونیم', notok: '💔 حالم خوب نیست',
};

export const LangLabels: Record<string, string> = {
  words: 'کلمات تأییدکننده', time: 'وقت باکیفیت', service: 'کمک و خدمت', gifts: 'هدیه', touch: 'تماس فیزیکی',
};
