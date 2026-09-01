import { getDb } from '../db';
import { runBackup } from './backup';

/**
 * Change events are batched per couple: the first mutation arms a timer,
 * subsequent mutations within the window reset it (debounce). When it fires
 * and the couple has autoBackup enabled, an encrypted 'auto' backup runs.
 * This keeps GitHub API usage low during editing bursts.
 */
const timers = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_MS = 45_000;

export function queueBackup(coupleId: string) {
  const prev = timers.get(coupleId);
  if (prev) clearTimeout(prev);
  timers.set(coupleId, setTimeout(async () => {
    timers.delete(coupleId);
    try {
      const db = await getDb();
      const members = await db.all('SELECT user_id FROM couple_members WHERE couple_id = ?', [coupleId]);
      const enabled = await db.all(
        `SELECT user_id FROM user_settings WHERE auto_backup = 1 AND user_id IN (${members.map(() => '?').join(',') || "''"})`,
        members.map((m: any) => m.user_id));
      if (!enabled.length) return; // nobody opted into auto backup
      await runBackup(coupleId, 'auto');
    } catch (e) {
      console.error('[auto-backup] failed:', (e as Error).message);
    }
  }, DEBOUNCE_MS));
  timers.get(coupleId)!.unref?.();
}
