export const b = (v: any): boolean => v === true || v === 1 || v === '1';
export const bint = (v: any): number => (b(v) ? 1 : 0);
export const splitTags = (s: string | null | undefined): string[] =>
  (s || '').split(',').map((t) => t.trim()).filter(Boolean);
export const joinTags = (arr: unknown): string =>
  Array.isArray(arr) ? arr.map((t) => String(t).trim()).filter(Boolean).join(',') : '';
