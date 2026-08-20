import type { Request } from 'express';
import { getDb, newId, now } from '../db';

/** Audit trail for auth + security-sensitive actions. */
export async function audit(req: Request, action: string, meta: Record<string, any> = {}) {
  try {
    const db = await getDb();
    await db.run(
      'INSERT INTO audit_logs (id, user_id, couple_id, action, meta, ip, created_at) VALUES (?,?,?,?,?,?,?)',
      [newId(), req.user?.id ?? meta.userId ?? null, req.coupleId ?? meta.coupleId ?? null, action, JSON.stringify(meta), req.ip ?? null, now()],
    );
  } catch { /* auditing must never break the request */ }
}
