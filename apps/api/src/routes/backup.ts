import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireCouple } from '../middleware/auth';
import { asyncH, err, ok } from '../lib/http';
import { parse } from '../lib/validate';
import { runBackup, listVersions, restoreVersion, backupStatus } from '../services/backup';
import { rateLimit } from '../middleware/rateLimit';
import { audit } from '../middleware/audit';
import { getDb, now } from '../db';
import { s3Configured } from '../services/storage';
import { config } from '../config';

export const backupRouter = Router();
const backupLimiter = rateLimit('backup-run', 10, 60 * 60_000);

// GET /api/backup/status — configuration + last job + history (never leaks secrets)
backupRouter.get('/status', requireAuth, requireCouple, asyncH(async (req, res) => {
  const status = await backupStatus(req.coupleId!);
  const db = await getDb();
  const s = await db.get('SELECT auto_backup FROM user_settings WHERE user_id = ?', [req.user!.id]);
  ok(res, {
    ...status,
    autoBackupEnabled: !!s?.auto_backup,
    encryption: 'AES-256-GCM',
    storage: s3Configured() ? 's3' : 'local-disk',
    // note: token presence is boolean only — the token itself is never exposed
  });
}));

// POST /api/backup/run — manual encrypted backup to Gist
backupRouter.post('/run', requireAuth, requireCouple, backupLimiter, asyncH(async (req, res) => {
  const result = await runBackup(req.coupleId!, 'manual');
  await audit(req, 'backup.run', { status: result.status });
  ok(res, result, result.status === 'success' ? 201 : 200);
}));

// GET /api/backup/versions
backupRouter.get('/versions', requireAuth, requireCouple, asyncH(async (req, res) => {
  ok(res, { versions: await listVersions(req.coupleId!) });
}));

// POST /api/backup/restore {version}
backupRouter.post('/restore', requireAuth, requireCouple, backupLimiter, asyncH(async (req, res) => {
  const { version } = parse(z.object({ version: z.number().int().positive() }), req.body);
  const result = await restoreVersion(req.coupleId!, version);
  await audit(req, 'backup.restore', { version });
  ok(res, result);
}));

// PATCH /api/backup/settings {autoBackup}
backupRouter.patch('/settings', requireAuth, asyncH(async (req, res) => {
  const { autoBackup } = parse(z.object({ autoBackup: z.boolean() }), req.body);
  const db = await getDb();
  await db.run('UPDATE user_settings SET auto_backup = ? WHERE user_id = ?', [autoBackup ? 1 : 0, req.user!.id]);
  ok(res, { autoBackup });
}));

export const aiRouter = Router();
aiRouter.get('/suggestions', requireAuth, requireCouple, asyncH(async (req, res) => {
  const { buildSuggestions } = await import('../services/ai');
  const data = await buildSuggestions(req.coupleId!, req.user!.id, req.partnerId);
  ok(res, data);
}));

export const exportRouter = Router();
/** Full data export (GDPR-style): everything about the caller + their couple. */
exportRouter.get('/', requireAuth, requireCouple, rateLimit('export', 5, 3600_000), asyncH(async (req, res) => {
  const db = await getDb();
  const { decryptString } = await import('../lib/crypto');
  const dec = (v: any) => { try { return v ? decryptString(v) : null; } catch { return null; } };
  const user = await db.get('SELECT id, email, display_name, avatar_url, created_at, theme, locale FROM users WHERE id = ?', [req.user!.id]);
  const profile = await db.get('SELECT * FROM profiles WHERE user_id = ?', [req.user!.id]);
  const couple = await db.get('SELECT id, title, start_date, created_at FROM couples WHERE id = ?', [req.coupleId]);
  const period = await db.all('SELECT id, start_date, end_date, cycle_length, notes_enc, created_at FROM period_cycles WHERE user_id = ? AND deleted_at IS NULL', [req.user!.id]);
  const tryTable = async (sql: string, params: any[]) => { try { return await db.all(sql, params); } catch { return []; } };
  const data = {
    exportedAt: now(), format: 'couple-os-export/v1',
    user, profile, couple,
    periodCycles: period.map((p: any) => ({ ...p, notes: dec(p.notes_enc), notes_enc: undefined })),
    moods: await tryTable('SELECT * FROM moods WHERE user_id = ?', [req.user!.id]),
    journal: (await tryTable('SELECT * FROM journal_entries WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]))
      .map((j: any) => ({ ...j, content: dec(j.content_enc), content_enc: undefined })),
    memories: await tryTable('SELECT * FROM memories WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]),
    calendarEvents: await tryTable('SELECT * FROM calendar_events WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]),
    tasks: await tryTable('SELECT * FROM tasks WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]),
    wishlist: await tryTable('SELECT * FROM wishlist_items WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]),
    bucketList: await tryTable('SELECT * FROM bucket_items WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]),
    expenses: await tryTable('SELECT * FROM expenses WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]),
    loveLetters: (await tryTable('SELECT * FROM love_letters WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]))
      .map((l: any) => ({ ...l, content: dec(l.content_enc), content_enc: undefined })),
    countdowns: await tryTable('SELECT * FROM countdowns WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]),
    compliments: await tryTable('SELECT * FROM compliments WHERE couple_id = ? AND deleted_at IS NULL', [req.coupleId]),
    relationshipCheckins: await tryTable('SELECT * FROM relationship_checkins WHERE couple_id = ?', [req.coupleId]),
    questionAnswers: await tryTable('SELECT * FROM question_answers WHERE couple_id = ?', [req.coupleId]),
    loveLanguage: await tryTable('SELECT * FROM love_languages WHERE user_id = ?', [req.user!.id]),
  };
  await audit(req, 'data.exported');
  res.setHeader('Content-Disposition', `attachment; filename="couple-os-export-${now().slice(0, 10)}.json"`);
  res.json(data);
}));

export const settingsRouter = Router();

settingsRouter.get('/', requireAuth, asyncH(async (req, res) => {
  const db = await getDb();
  const s = await db.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user!.id]);
  const boolKeys = [
    'notif_birthday', 'notif_anniversary', 'notif_period', 'notif_pms', 'notif_calendar',
    'notif_task', 'notif_memory', 'notif_letter', 'notif_question', 'notif_mood',
    'period_tracking_enabled', 'auto_backup', 'lock_enabled',
  ] as const;
  const out: Record<string, any> = {};
  for (const k of boolKeys) out[k] = !!s?.[k];
  out.lock_timeout_minutes = s?.lock_timeout_minutes ?? 5;
  ok(res, { settings: out });
}));

settingsRouter.patch('/', requireAuth, asyncH(async (req, res) => {
  const allowed = [
    'notif_birthday', 'notif_anniversary', 'notif_period', 'notif_pms', 'notif_calendar',
    'notif_task', 'notif_memory', 'notif_letter', 'notif_question', 'notif_mood',
    'period_tracking_enabled', 'auto_backup', 'lock_enabled', 'lock_timeout_minutes',
  ] as const;
  const body = req.body ?? {};
  const fields: string[] = [], params: any[] = [];
  for (const k of allowed) {
    if (k in body) {
      fields.push(`${k} = ?`);
      params.push(k === 'lock_timeout_minutes' ? Math.min(120, Math.max(1, parseInt(String(body[k]), 10) || 5)) : (body[k] ? 1 : 0));
    }
  }
  if (fields.length) {
    const db = await getDb();
    params.push(req.user!.id);
    await db.run(`UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`, params);
  }
  ok(res, { saved: true });
}));

// ---- App lock PIN (hashed server-side, NEVER in client bundle) ----
settingsRouter.post('/lock', requireAuth, asyncH(async (req, res) => {
  const { pin } = parse(z.object({ pin: z.string().regex(/^\d{4,10}$/, 'پین باید ۴ تا ۱۰ رقم باشد') }), req.body);
  const { hashPassword } = await import('../lib/password');
  const db = await getDb();
  await db.run('UPDATE users SET lock_pin_hash = ? WHERE id = ?', [await hashPassword(pin), req.user!.id]);
  await db.run('UPDATE user_settings SET lock_enabled = 1 WHERE user_id = ?', [req.user!.id]);
  await audit(req, 'security.lock_enabled');
  ok(res, { enabled: true });
}));

settingsRouter.delete('/lock', requireAuth, asyncH(async (req, res) => {
  const { pin } = parse(z.object({ pin: z.string().min(4) }), req.body);
  const { verifyPassword } = await import('../lib/password');
  const db = await getDb();
  const u = await db.get('SELECT lock_pin_hash FROM users WHERE id = ?', [req.user!.id]);
  if (!u?.lock_pin_hash || !(await verifyPassword(pin, u.lock_pin_hash))) throw err(401, 'BAD_PIN', 'پین اشتباه است.');
  await db.run('UPDATE users SET lock_pin_hash = NULL WHERE id = ?', [req.user!.id]);
  await db.run('UPDATE user_settings SET lock_enabled = 0 WHERE user_id = ?', [req.user!.id]);
  ok(res, { disabled: true });
}));

settingsRouter.post('/lock/verify', requireAuth, asyncH(async (req, res) => {
  const { pin } = parse(z.object({ pin: z.string().min(4) }), req.body);
  const { verifyPassword } = await import('../lib/password');
  const db = await getDb();
  const u = await db.get('SELECT lock_pin_hash FROM users WHERE id = ?', [req.user!.id]);
  if (!u?.lock_pin_hash || !(await verifyPassword(pin, u.lock_pin_hash))) throw err(401, 'BAD_PIN', 'پین اشتباه است.');
  ok(res, { unlocked: true });
}));

// ---- Account & couple lifecycle ----
settingsRouter.delete('/couple', requireAuth, requireCouple, asyncH(async (req, res) => {
  const { confirm } = parse(z.object({ confirm: z.literal('DELETE') }), req.body);
  const db = await getDb();
  await db.tx(async () => {
    // hard purge of couple-scoped data (soft delete of the couple row retained for audit)
    const tables = ['moods', 'journal_entries', 'memories', 'calendar_events', 'tasks', 'wishlist_items',
      'bucket_items', 'expenses', 'love_letters', 'question_answers', 'countdowns', 'compliments',
      'relationship_checkins', 'story_chapters', 'messages', 'albums', 'photos', 'backup_jobs', 'backup_versions',
      'couple_settings'];
    for (const t of tables) await db.run(`DELETE FROM ${t} WHERE couple_id = ?`, [req.coupleId]);
    await db.run('DELETE FROM couple_members WHERE couple_id = ?', [req.coupleId]);
    await db.run('UPDATE couples SET deleted_at = ?, gist_id = NULL, invite_code = NULL WHERE id = ?', [now(), req.coupleId]);
  });
  await audit(req, 'couple.purged');
  ok(res, { deleted: true });
}));

settingsRouter.delete('/account', requireAuth, asyncH(async (req, res) => {
  const { password } = parse(z.object({ password: z.string().min(1, 'رمز لازم است') }), req.body);
  const { verifyPassword } = await import('../lib/password');
  const db = await getDb();
  const u = await db.get('SELECT password_hash FROM users WHERE id = ?', [req.user!.id]);
  if (!(await verifyPassword(password, u.password_hash))) throw err(401, 'BAD_CREDENTIALS', 'رمز اشتباه است.');
  await db.tx(async () => {
    await db.run('UPDATE users SET deleted_at = ?, email = ?, verify_token_hash = NULL, reset_token_hash = NULL, totp_secret = NULL, lock_pin_hash = NULL WHERE id = ?',
      [now(), `deleted-${req.user!.id}@removed.local`, req.user!.id]);
    await db.run('DELETE FROM user_sessions WHERE user_id = ?', [req.user!.id]);
  });
  await audit(req, 'account.deleted');
  res.clearCookie('co_at', { path: '/' }); res.clearCookie('co_rt', { path: '/' }); res.clearCookie('co_csrf', { path: '/' });
  ok(res, { deleted: true });
}));
