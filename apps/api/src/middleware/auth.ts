import type { NextFunction, Request, Response } from 'express';
import { getDb, now } from '../db';
import { verifyAccessToken } from '../lib/tokens';
import { err } from '../lib/http';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: any;
      coupleId?: string;
      partnerId?: string;
      sessionId?: string;
    }
  }
}

/**
 * requireAuth — verifies the short-lived JWT access cookie.
 * Never trusts client-supplied identifiers: identity comes only from the token.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.co_at;
    if (!token) throw err(401, 'AUTH_REQUIRED', 'برای ادامه باید وارد شوی.');
    let payload: { sub: string; sid: string };
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw err(401, 'TOKEN_EXPIRED', 'نشست منقضی شده؛ لطفاً دوباره وارد شو.');
    }
    const db = await getDb();
    const user = await db.get(
      'SELECT id, email, display_name, avatar_url, totp_enabled, lock_pin_hash, theme, locale, last_seen_at FROM users WHERE id = ? AND deleted_at IS NULL',
      [payload.sub],
    );
    if (!user) throw err(401, 'AUTH_REQUIRED', 'کاربر یافت نشد.');
    // never expose credential material to the client
    user.lock_enabled = !!user.lock_pin_hash;
    delete user.lock_pin_hash;
    // sliding last-seen (best-effort, throttled by DB write cost)
    db.run('UPDATE users SET last_seen_at = ? WHERE id = ?', [now(), user.id]).catch(() => {});
    req.user = user;
    req.sessionId = payload.sid;
    next();
  } catch (e) { next(e); }
}

/**
 * requireCouple — Couple Authorization core.
 * Loads the caller's couple membership from the DB. Couple id is NEVER taken
 * from params/body/query — user A can never reach user B's couple data by
 * changing an id: every scoped query filters on req.coupleId from here.
 */
export async function requireCouple(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) throw err(401, 'AUTH_REQUIRED', 'برای ادامه باید وارد شوی.');
    const db = await getDb();
    const member = await db.get(
      `SELECT m.couple_id, m.nickname, c.id AS cid, c.title, c.start_date, c.gist_id
       FROM couple_members m JOIN couples c ON c.id = m.couple_id
       WHERE m.user_id = ? AND c.deleted_at IS NULL`,
      [req.user.id],
    );
    if (!member) throw err(409, 'COUPLE_REQUIRED', 'هنوز فضای دونفره‌ات را نساخته‌ای.');
    const partner = await db.get(
      'SELECT user_id FROM couple_members WHERE couple_id = ? AND user_id != ?',
      [member.couple_id, req.user.id],
    );
    req.coupleId = member.couple_id;
    req.partnerId = partner?.user_id;
    next();
  } catch (e) { next(e); }
}

/** Verifies a resource row belongs to the caller's couple; 404 (not 403) to avoid id enumeration. */
export async function ownedOr404(table: string, id: string, coupleId: string, idCol = 'id'): Promise<any> {
  const db = await getDb();
  const row = await db.get(
    `SELECT * FROM ${table} WHERE ${idCol} = ? AND couple_id = ? AND (deleted_at IS NULL)`,
    [id, coupleId],
  );
  if (!row) throw err(404, 'NOT_FOUND', 'موردی پیدا نشد.');
  return row;
}
