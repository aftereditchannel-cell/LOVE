import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getDb, now } from '../db';
import { requireAuth, requireCouple } from '../middleware/auth';
import { asyncH, err, ok } from '../lib/http';
import { parse } from '../lib/validate';
import { hashPassword, verifyPassword } from '../lib/password';
import { audit } from '../middleware/audit';
import { isAllowedMime, newStorageKey, putObject, publicUrlFor, MAX_FILE_BYTES } from '../services/storage';
import { uploadLimiter } from '../middleware/rateLimit';

export const profileRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } });

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  nickname: z.string().trim().max(60).nullable().optional(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  favoriteColor: z.string().trim().max(30).nullable().optional(),
  favoriteThings: z.string().trim().max(500).nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  theme: z.enum(['dark', 'light', 'system']).optional(),
  locale: z.enum(['fa', 'en']).optional(),
});

profileRouter.get('/', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  const p = await db.get('SELECT * FROM profiles WHERE user_id = ?', [req.user!.id]);
  const u = await db.get('SELECT display_name, avatar_url, email, email_verified_at, theme, locale, last_seen_at FROM users WHERE id = ?', [req.user!.id]);
  ok(res, {
    user: {
      displayName: u.display_name, avatarUrl: u.avatar_url, email: u.email,
      emailVerified: !!u.email_verified_at, theme: u.theme, locale: u.locale, lastSeenAt: u.last_seen_at,
    },
    profile: p ? {
      nickname: p.nickname, birthday: p.birthday, favoriteColor: p.favorite_color,
      favoriteThings: p.favorite_things, bio: p.bio,
    } : null,
  });
}));

profileRouter.patch('/', requireAuth, asyncH(async (req, res) => {
  const body = parse(profileSchema, req.body);
  const db = await getDb();
  const t = now();
  await db.tx(async () => {
    if (body.displayName) await db.run('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?', [body.displayName, t, req.user!.id]);
    if (body.theme) await db.run('UPDATE users SET theme = ? WHERE id = ?', [body.theme, req.user!.id]);
    if (body.locale) await db.run('UPDATE users SET locale = ? WHERE id = ?', [body.locale, req.user!.id]);
    const fields: string[] = [], params: any[] = [];
    const map: Record<string, string> = {
      nickname: 'nickname', birthday: 'birthday', favoriteColor: 'favorite_color',
      favoriteThings: 'favorite_things', bio: 'bio',
    };
    for (const [k, col] of Object.entries(map)) {
      if (k in body) { fields.push(`${col} = ?`); params.push((body as any)[k]); }
    }
    if (fields.length) {
      fields.push('updated_at = ?'); params.push(t, req.user!.id);
      await db.run(`UPDATE profiles SET ${fields.join(', ')} WHERE user_id = ?`, params);
    }
  });
  ok(res, { saved: true });
}));

profileRouter.post('/avatar', requireAuth, uploadLimiter, upload.single('file'), asyncH(async (req, res) => {
  if (!req.file || !isAllowedMime(req.file.mimetype) || !req.file.mimetype.startsWith('image/')) {
    throw err(400, 'BAD_FILE', 'فقط فایل تصویری معتبر (jpg/png/webp/gif) قابل قبول است.');
  }
  const db = await getDb();
  const key = newStorageKey(`avatars/${req.user!.id}`, req.file.mimetype);
  await putObject(key, req.file.buffer);
  const url = publicUrlFor(key);
  await db.run('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?', [url, now(), req.user!.id]);
  ok(res, { avatarUrl: url });
}));

profileRouter.post('/change-password', requireAuth, asyncH(async (req, res) => {
  const body = parse(z.object({
    currentPassword: z.string().min(1, 'رمز فعلی لازم است'),
    newPassword: z.string().min(8, 'رمز جدید باید حداقل ۸ کاراکتر باشد').max(100),
  }), req.body);
  const db = await getDb();
  const u = await db.get('SELECT password_hash FROM users WHERE id = ?', [req.user!.id]);
  if (!(await verifyPassword(body.currentPassword, u.password_hash))) {
    throw err(401, 'BAD_CREDENTIALS', 'رمز فعلی اشتباه است.');
  }
  await db.tx(async () => {
    await db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [await hashPassword(body.newPassword), now(), req.user!.id]);
    // keep current session, revoke others (session rotation on credential change)
    await db.run('UPDATE user_sessions SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at IS NULL',
      [now(), req.user!.id, req.sessionId]);
  });
  await audit(req, 'auth.password_changed');
  ok(res, { changed: true });
}));

// Partner profile (read-only, same couple only)
profileRouter.get('/partner', requireAuth, requireCouple, asyncH(async (req, res) => {
  if (!req.partnerId) return ok(res, { partner: null });
  const db = await getDb();
  const u = await db.get('SELECT display_name, avatar_url, last_seen_at FROM users WHERE id = ?', [req.partnerId]);
  const p = await db.get('SELECT * FROM profiles WHERE user_id = ?', [req.partnerId]);
  const ll = await db.get('SELECT primary_lang, secondary_lang FROM love_languages WHERE user_id = ?', [req.partnerId]);
  ok(res, {
    partner: {
      id: req.partnerId, displayName: u.display_name, avatarUrl: u.avatar_url, lastSeenAt: u.last_seen_at,
      nickname: p?.nickname, birthday: p?.birthday, favoriteColor: p?.favorite_color, favoriteThings: p?.favorite_things,
      loveLanguage: ll ? { primary: ll.primary_lang, secondary: ll.secondary_lang } : null,
    },
  });
}));
