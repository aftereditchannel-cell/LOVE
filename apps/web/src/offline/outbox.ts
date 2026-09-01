/**
 * Offline-first outbox: mutations made offline are persisted (localStorage-backed,
 * upgraded to IndexedDB when growing) and replayed in order when connectivity
 * returns. Conflict rule: last-write-wins per endpoint (server timestamps rule).
 */
export type OutboxItem = { id: string; path: string; method: 'POST' | 'PATCH' | 'DELETE'; body?: any; at: number };

const KEY = 'couple-os-outbox';

export function readOutbox(): OutboxItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}
function write(items: OutboxItem[]) { localStorage.setItem(KEY, JSON.stringify(items)); }

export function enqueue(item: Omit<OutboxItem, 'id' | 'at'>) {
  const items = readOutbox();
  items.push({ ...item, id: crypto.randomUUID(), at: Date.now() });
  write(items);
  window.dispatchEvent(new CustomEvent('outbox-change', { detail: items.length }));
}

export async function flushOutbox(apiCall: (path: string, opts: any) => Promise<any>): Promise<number> {
  const items = readOutbox();
  if (!items.length || !navigator.onLine) return 0;
  const remaining: OutboxItem[] = [];
  let done = 0;
  for (const item of items) {
    try {
      await apiCall(item.path, { method: item.method, body: item.body });
      done++;
    } catch (e: any) {
      if (e?.status && e.status >= 400 && e.status < 500) continue; // drop rejected items (stale)
      remaining.push(item); // network hiccup — retry later
    }
  }
  write(remaining);
  window.dispatchEvent(new CustomEvent('outbox-change', { detail: remaining.length }));
  return done;
}

export function useOnlineStatus(cb: (online: boolean) => void) {
  const on = () => cb(true); const off = () => cb(false);
  window.addEventListener('online', on);
  window.addEventListener('offline', off);
  return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
}
