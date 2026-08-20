export const todayStr = (d = new Date()): string => {
  const y = d.getFullYear(), m = `${d.getMonth() + 1}`.padStart(2, '0'), day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};
export const parseDay = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const daysBetween = (a: string | Date, b: string | Date = new Date()): number => {
  const da = typeof a === 'string' ? parseDay(a) : a;
  const db = typeof b === 'string' ? parseDay(b) : b;
  const d0 = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const d1 = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((d1 - d0) / 86400000);
};
export const addDays = (s: string, n: number): string => {
  const d = parseDay(s); d.setDate(d.getDate() + n); return todayStr(d);
};
export const isValidDay = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseDay(s).getTime());
