import { Router } from 'express';
import { z } from 'zod';
import { getDb, newId, now } from '../db';
import { hashPassword, verifyPassword, PASSWORD_MIN } from '../lib/password';
import {
  signAccessToken, signMfaToken, signResetToken, verifyMfaToken, verifyResetToken, newRefreshToken,
} from '../lib/tokens';
import { generateTotpSecret, otpauthUrl, verifyTotp } from '../lib/totp';
import { csrfValueFor } from '../middleware/csrf';
import { requireAuth } from '../middleware/auth';
import { loginLimiter, registerLimiter, forgotLimiter } from '../middleware/rateLimit';
import { audit } from '../middleware/audit';
import { asyncH, err, ok } from '../lib/http';
import { parse } from '../lib/validate';
import { sendMail } from '../lib/mailer';
import { sha256, randomToken } from '../lib/crypto';
import { config } from '../config';

export const authRouter = Router();

const emailSchema = z.string().trim().toLowerCase().email('ایمیل نامعتبر است').max(200);

function cookieOpts(maxAgeMs: number, httpOnly = true) {
  return {
    httpOnly, sameSite: 'lax' as const, secure: config.isProd,
    path: '/', maxAge: maxAgeMs,
  };
}
const THIRTY_DAYS = 30 * 24 * 3600 * 1000;

function setSessionCookies(res: any, accessToken: string, refreshToken: string) {
  res.cookie('co_at', accessToken, cookieOpts(15 * 60 * 1000));
  res.cookie('co_rt', refreshToken, cookieOpts(THIRTY_DAYS));
  res.cookie('co_csrf', csrfValueFor(refreshToken), cookieOpts(THIRTY_DAYS, false));
}
function clearSessionCookies(res: any) {
  for (const name of ['co_at', 'co_rt', 'co_csrf']) res.clearCookie(name, { path: '/' });
}

async function createSession(req: any, res: any, userId: string) {
  const db = await getDb();
  const sessionId = newId();
  const { token: refresh, hash } = newRefreshToken();
  await db.run(
    'INSERT INTO user_sessions (id, user_id, refresh_hash, device_name, user_agent, ip, created_at, last_used_at) VALUES (?,?,?,?,?,?,?,?)',
    [sessionId, userId, hash, (req.headers['x-device-name'] as string) || null,
     String(req.headers['user-agent'] || '').slice(0, 255), req.ip ?? null, now(), now()],
  );
  setSessionCookies(res, signAccessToken(userId, sessionId), refresh);
}

async function issueEmailVerification(userId: string, email: string) {
  const db = await getDb();
  const token = randomToken(32);
  await db.run('UPDATE users SET verify_token_hash = ? WHERE id = ?', [sha256(token), userId]);
  const link = `${config.webOrigin}/verify-email?token=${token}`;
  await sendMail(email, 'تأیید ایمیل Couple OS ❤️', `برای تأیید ایمیلت روی این لینک بزن:\n${link}`);
}

function publicUser(u: any) {
  return {
    id: u.id, email: u.email, displayName: u.display_name, avatarUrl: u.avatar_url,
    emailVerified: !!u.email_verified_at, totpEnabled: !!u.totp_enabled,
    lockEnabled: !!u.lock_pin_hash, theme: u.theme, locale: u.locale,
  };
}

// ---------------- Register ----------------
authRouter.post('/register', registerLimiter, asyncH(async (req, res) => {
  const body = parse(z.object({
    email: emailSchema,
    password: z.string().min(PASSWORD_MIN, `رمز باید حداقل ${PASSWORD_MIN} کاراکتر باشد`).max(100),
    displayName: z.string().trim().min(1, 'نام لازم است').max(80),
  }), req.body);
  const db = await getDb();
  const existing = await db.get('SELECT id FROM users WHERE email = ?', [body.email]);
  if (existing) throw err(409, 'EMAIL_TAKEN', 'این ایمیل قبلاً ثبت شده.');
  const id = newId();
  const t = now();
  await db.tx(async () => {
    await db.run(
      'INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?,?,?,?,?,?)',
      [id, body.email, await hashPassword(body.password), body.displayName, t, t],
    );
    await db.run('INSERT INTO profiles (id, user_id, created_at, updated_at) VALUES (?,?,?,?)', [newId(), id, t, t]);
    await db.run('INSERT INTO user_settings (id, user_id) VALUES (?,?)', [newId(), id]);
  });
  await createSession(req, res, id);
  await issueEmailVerification(id, body.email);
  await audit(req, 'auth.register', { userId: id });
  const u = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  ok(res, { user: publicUser(u), couple: null }, 201);
}));

// ---------------- Login ----------------
authRouter.post('/login', loginLimiter, asyncH(async (req, res) => {
  const body = parse(z.object({ email: emailSchema, password: z.string().min(1, 'رمز لازم است') }), req.body);
  const db = await getDb();
  const u = await db.get('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [body.email]);
  if (!u || !(await verifyPassword(body.password, u.password_hash))) {
    await audit(req, 'auth.login_failed', { userId: u?.id });
    throw err(401, 'BAD_CREDENTIALS', 'ایمیل یا رمز اشتباه است.');
  }
  if (u.totp_enabled) {
    // second step required — no session yet
    await audit(req, 'auth.mfa_challenge', { userId: u.id });
    return ok(res, { mfaRequired: true, mfaToken: signMfaToken(u.id) });
  }
  await createSession(req, res, u.id);
  await audit(req, 'auth.login', { userId: u.id });
  const member = await db.get('SELECT couple_id FROM couple_members WHERE user_id = ?', [u.id]);
  ok(res, { user: publicUser(u), coupleId: member?.couple_id ?? null });
}));

// ---------------- 2FA verify at login ----------------
authRouter.post('/2fa/verify', loginLimiter, asyncH(async (req, res) => {
  const body = parse(z.object({ mfaToken: z.string(), code: z.string().min(4).max(10) }), req.body);
  let userId: string;
  try { userId = verifyMfaToken(body.mfaToken); } catch { throw err(401, 'MFA_EXPIRED', 'مهلت تأیید دو مرحله‌ای تمام شد؛ دوباره وارد شو.'); }
  const db = await getDb();
  const u = await db.get('SELECT * FROM users WHERE id = ? AND totp_enabled = 1', [userId]);
  if (!u || !verifyTotp(u.totp_secret, body.code)) throw err(401, 'MFA_BAD_CODE', 'کد تأیید اشتباه است.');
  await createSession(req, res, u.id);
  await audit(req, 'auth.login_2fa', { userId: u.id });
  const member = await db.get('SELECT couple_id FROM couple_members WHERE user_id = ?', [u.id]);
  ok(res, { user: publicUser(u), coupleId: member?.couple_id ?? null });
}));

// ---------------- Refresh (rotation) ----------------
authRouter.post('/refresh', asyncH(async (req, res) => {
  const refresh = req.cookies?.co_rt;
  if (!refresh) throw err(401, 'AUTH_REQUIRED', 'نشستی وجود ندارد.');
  const db = await getDb();
  const session = await db.get('SELECT * FROM user_sessions WHERE refresh_hash = ?', [sha256(refresh)]);
  if (!session || session.revoked_at) {
    clearSessionCookies(res);
    throw err(401, 'SESSION_REVOKED', 'نشست معتبر نیست؛ دوباره وارد شو.');
  }
  const { token: newRefreshTokenValue, hash } = newRefreshToken();
  await db.run('UPDATE user_sessions SET refresh_hash = ?, last_used_at = ? WHERE id = ?', [hash, now(), session.id]);
  setSessionCookies(res, signAccessToken(session.user_id, session.id), newRefreshTokenValue);
  ok(res, { refreshed: true });
}));

// ---------------- Logout ----------------
authRouter.post('/logout', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  if (req.sessionId) await db.run('UPDATE user_sessions SET revoked_at = ? WHERE id = ?', [now(), req.sessionId]);
  clearSessionCookies(res);
  await audit(req, 'auth.logout');
  ok(res, { loggedOut: true });
}));

// ---------------- Me ----------------
authRouter.get('/me', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  const u = await db.get('SELECT * FROM users WHERE id = ?', [req.user!.id]);
  const profile = await db.get('SELECT * FROM profiles WHERE user_id = ?', [req.user!.id]);
  const member = await db.get(
    `SELECT m.couple_id, m.nickname, c.title, c.start_date FROM couple_members m
     JOIN couples c ON c.id = m.couple_id WHERE m.user_id = ? AND c.deleted_at IS NULL`, [req.user!.id]);
  ok(res, {
    user: publicUser(u),
    profile: profile ? {
      nickname: profile.nickname, birthday: profile.birthday,
      favoriteColor: profile.favorite_color, favoriteThings: profile.favorite_things, bio: profile.bio,
    } : null,
    couple: member ? { id: member.couple_id, title: member.title, startDate: member.start_date } : null,
  });
}));

// ---------------- Email verification ----------------
authRouter.post('/verify-email', asyncH(async (req, res) => {
  const { token } = parse(z.object({ token: z.string().min(10) }), req.body);
  const db = await getDb();
  const u = await db.get('SELECT id FROM users WHERE verify_token_hash = ?', [sha256(token)]);
  if (!u) throw err(400, 'BAD_TOKEN', 'لینک تأیید معتبر نیست یا منقضی شده.');
  await db.run('UPDATE users SET email_verified_at = ?, verify_token_hash = NULL WHERE id = ?', [now(), u.id]);
  ok(res, { verified: true });
}));

authRouter.post('/resend-verification', requireAuth, asyncH(async (req, res) => {
  await issueEmailVerification(req.user!.id, req.user!.email);
  ok(res, { sent: true });
}));

// ---------------- Forgot / Reset password ----------------
authRouter.post('/forgot-password', forgotLimiter, asyncH(async (req, res) => {
  const { email } = parse(z.object({ email: emailSchema }), req.body);
  const db = await getDb();
  const u = await db.get('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
  if (u) {
    const token = signResetToken(u.id);
    await db.run('UPDATE users SET reset_token_hash = ?, reset_token_exp = ? WHERE id = ?',
      [sha256(token), new Date(Date.now() + 3600_000).toISOString(), u.id]);
    const link = `${config.webOrigin}/reset-password?token=${token}`;
    await sendMail(email, 'بازنشانی رمز Couple OS', `برای تعیین رمز جدید:\n${link}\n(۱ ساعت معتبر است)`);
    await audit(req, 'auth.forgot', { userId: u.id });
  }
  // uniform response — no account enumeration
  ok(res, { sent: true });
}));

authRouter.post('/reset-password', forgotLimiter, asyncH(async (req, res) => {
  const body = parse(z.object({
    token: z.string().min(10),
    password: z.string().min(PASSWORD_MIN).max(100),
  }), req.body);
  let userId: string;
  try { userId = verifyResetToken(body.token); } catch { throw err(400, 'BAD_TOKEN', 'لینک بازنشانی معتبر نیست یا منقضی شده.'); }
  const db = await getDb();
  const u = await db.get('SELECT id, reset_token_hash, reset_token_exp FROM users WHERE id = ?', [userId]);
  if (!u || u.reset_token_hash !== sha256(body.token) || !u.reset_token_exp || u.reset_token_exp < now()) {
    throw err(400, 'BAD_TOKEN', 'لینک بازنشانی معتبر نیست یا منقضی شده.');
  }
  await db.tx(async () => {
    await db.run('UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_exp = NULL, updated_at = ? WHERE id = ?',
      [await hashPassword(body.password), now(), userId]);
    await db.run('UPDATE user_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', [now(), userId]);
  });
  await audit(req, 'auth.reset_password', { userId });
  ok(res, { reset: true });
}));

// ---------------- 2FA management (authenticated) ----------------
authRouter.post('/2fa/setup', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  if (req.user!.totp_enabled) throw err(409, 'MFA_ALREADY', 'تأیید دو مرحله‌ای از قبل فعال است.');
  const secret = generateTotpSecret();
  await db.run('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, req.user!.id]);
  ok(res, { secret, otpauthUrl: otpauthUrl(secret, req.user!.email) });
}));

authRouter.post('/2fa/enable', requireAuth, asyncH(async (req, res) => {
  const { code } = parse(z.object({ code: z.string().min(4).max(10) }), req.body);
  const db = await getDb();
  const u = await db.get('SELECT totp_secret FROM users WHERE id = ?', [req.user!.id]);
  if (!u?.totp_secret) throw err(400, 'MFA_NOT_SETUP', 'اول راه‌اندازی را انجام بده.');
  if (!verifyTotp(u.totp_secret, code)) throw err(400, 'MFA_BAD_CODE', 'کد تأیید اشتباه است.');
  await db.run('UPDATE users SET totp_enabled = 1 WHERE id = ?', [req.user!.id]);
  await audit(req, 'auth.2fa_enabled');
  ok(res, { enabled: true });
}));

authRouter.post('/2fa/disable', requireAuth, asyncH(async (req, res) => {
  const { password } = parse(z.object({ password: z.string().min(1) }), req.body);
  const db = await getDb();
  const u = await db.get('SELECT password_hash FROM users WHERE id = ?', [req.user!.id]);
  if (!(await verifyPassword(password, u.password_hash))) throw err(401, 'BAD_CREDENTIALS', 'رمز اشتباه است.');
  await db.run('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?', [req.user!.id]);
  await audit(req, 'auth.2fa_disabled');
  ok(res, { disabled: true });
}));

// ---------------- Sessions / devices ----------------
authRouter.get('/sessions', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  const rows = await db.all(
    'SELECT id, device_name, user_agent, ip, created_at, last_used_at FROM user_sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_used_at DESC',
    [req.user!.id]);
  ok(res, {
    sessions: rows.map((s: any) => ({
      id: s.id, deviceName: s.device_name, userAgent: s.user_agent, ip: s.ip,
      createdAt: s.created_at, lastUsedAt: s.last_used_at, current: s.id === req.sessionId,
    })),
  });
}));

authRouter.delete('/sessions/:id', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  const r = await db.run(
    'UPDATE user_sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL',
    [now(), req.params.id, req.user!.id]);
  if (!r.changes) throw err(404, 'NOT_FOUND', 'نشست پیدا نشد.');
  await audit(req, 'auth.session_revoked', { target: req.params.id });
  if (req.params.id === req.sessionId) clearSessionCookies(res);
  ok(res, { revoked: true });
}));
