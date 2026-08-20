import { getDb, newId, now } from '../db';
import { encryptString, decryptString, sha256 } from '../lib/crypto';
import { config } from '../config';
import * as gist from './gistClient';

/**
 * Encrypted, versioned backup of a couple's NON-SECRET data to a private Gist.
 *
 *   Data → Serialize (plain JSON per module) → Encrypt (AES-256-GCM) → Gist
 *
 * Never backed up: password hashes, tokens, sessions, encryption keys,
 * totp secrets, lock pin hashes, api credentials (see secret table filters).
 * Files inside the gist:
 *   couple-os/manifest.json   → version list + non-sensitive metadata (plaintext)
 *   couple-os/backup_v<N>.enc → encrypted payload {v, iv, tag, data}
 */

const MODULE_TABLES: Array<[string, string]> = [
  ['moods', 'moods'],
  ['journal', 'journal_entries'],
  ['memories', 'memories'],
  ['calendar', 'calendar_events'],
  ['tasks', 'tasks'],
  ['wishlist', 'wishlist_items'],
  ['bucket', 'bucket_items'],
  ['expenses', 'expenses'],
  ['letters', 'love_letters'],
  ['answers', 'question_answers'],
  ['countdowns', 'countdowns'],
  ['compliments', 'compliments'],
  ['relationship', 'relationship_checkins'],
  ['story', 'story_chapters'],
];

export const BACKUP_VERSIONS_KEPT = 10;

async function collectCoupleData(coupleId: string): Promise<Record<string, any>> {
  const db = await getDb();
  const files: Record<string, any> = {};
  for (const [name, table] of MODULE_TABLES) {
    files[`${name}.json`] = await db.all(`SELECT * FROM ${table} WHERE couple_id = ?`, [coupleId]);
  }
  // couple profile row (title/startDate) — couples table has no couple_id column
  const coupleRow = await db.get('SELECT id, title, start_date, created_at FROM couples WHERE id = ?', [coupleId]);
  files['profile.json'] = coupleRow ? [coupleRow] : [];
  // members' public profile metadata (no secrets)
  const members = await db.all(
    `SELECT u.id, u.display_name, u.avatar_url, p.nickname, p.birthday, p.favorite_color, p.favorite_things
     FROM couple_members m JOIN users u ON u.id = m.user_id LEFT JOIN profiles p ON p.user_id = u.id
     WHERE m.couple_id = ?`, [coupleId]);
  files['members.json'] = members;
  return files;
}

export async function runBackup(coupleId: string, trigger: 'manual' | 'auto'): Promise<any> {
  const db = await getDb();
  const jobId = newId();
  await db.run("INSERT INTO backup_jobs (id, couple_id, status, trigger_type, started_at) VALUES (?,?,?,?,?)",
    [jobId, coupleId, 'running', trigger, now()]);
  try {
    if (!config.githubToken) {
      await db.run("UPDATE backup_jobs SET status = 'skipped', error = ?, finished_at = ? WHERE id = ?",
        ['COUPLE_OS_GITHUB_TOKEN not configured on server', now(), jobId]);
      return { status: 'skipped', reason: 'توکن گیت‌هاب سرور تنظیم نشده؛ Backup ذخیره نشد.' };
    }
    const couple = await db.get('SELECT * FROM couples WHERE id = ?', [coupleId]);
    const settings = await db.get('SELECT * FROM couple_settings WHERE couple_id = ?', [coupleId]);
    const keep = settings?.keep_versions ?? BACKUP_VERSIONS_KEPT;

    const last = await db.get('SELECT MAX(version) AS v FROM backup_versions WHERE couple_id = ?', [coupleId]);
    const version = Number(last?.v ?? 0) + 1;

    const data = await collectCoupleData(coupleId);
    const payload = JSON.stringify({ app: 'couple-os', version, exportedAt: now(), files: data });
    const encrypted = encryptString(payload); // {v, iv, tag, data}
    const fileName = `couple-os/backup_v${version}.enc.json`;

    let gistId: string = couple?.gist_id || config.githubGistId || '';
    if (!gistId) {
      const g = await gist.createGist({
        'couple-os/manifest.json': { content: JSON.stringify({ app: 'couple-os', createdAt: now(), versions: [] }, null, 2) },
        [fileName]: { content: encrypted },
      }, 'Couple OS — encrypted backup');
      gistId = g.id;
      await db.run('UPDATE couples SET gist_id = ? WHERE id = ?', [gistId, coupleId]);
    } else {
      await gist.updateGist(gistId, { [fileName]: { content: encrypted } });
    }

    const versionId = newId();
    await db.run(
      'INSERT INTO backup_versions (id, couple_id, version, gist_id, file_name, size_bytes, sha, created_at) VALUES (?,?,?,?,?,?,?,?)',
      [versionId, coupleId, version, gistId, fileName, encrypted.length, sha256(encrypted), now()]);

    // prune old versions (DB + gist)
    const old = await db.all('SELECT * FROM backup_versions WHERE couple_id = ? ORDER BY version DESC LIMIT -1 OFFSET ?', [coupleId, keep]);
    for (const o of old) {
      try { await gist.updateGist(gistId, { [o.file_name]: null }); } catch { /* best-effort */ }
      await db.run('DELETE FROM backup_versions WHERE id = ?', [o.id]);
    }
    const versions = await db.all('SELECT version, file_name, created_at FROM backup_versions WHERE couple_id = ? ORDER BY version', [coupleId]);
    try {
      await gist.updateGist(gistId, {
        'couple-os/manifest.json': { content: JSON.stringify({ app: 'couple-os', updatedAt: now(), versions }, null, 2) },
      });
    } catch { /* manifest update best-effort */ }

    await db.run("UPDATE backup_jobs SET status = 'success', version_id = ?, finished_at = ? WHERE id = ?", [versionId, now(), jobId]);
    return { status: 'success', version, gistId };
  } catch (e: any) {
    await db.run("UPDATE backup_jobs SET status = 'failed', error = ?, finished_at = ? WHERE id = ?",
      [String(e?.code || e?.message || 'error').slice(0, 300), now(), jobId]);
    throw e;
  }
}

export async function listVersions(coupleId: string) {
  const db = await getDb();
  const rows = await db.all('SELECT id, version, file_name, size_bytes, sha, note, created_at FROM backup_versions WHERE couple_id = ? ORDER BY version DESC', [coupleId]);
  return rows;
}

export async function restoreVersion(coupleId: string, version: number): Promise<any> {
  const db = await getDb();
  const v = await db.get('SELECT * FROM backup_versions WHERE couple_id = ? AND version = ?', [coupleId, version]);
  if (!v || !v.gist_id || !v.file_name) {
    throw Object.assign(new Error('نسخه‌ی بکاپ پیدا نشد.'), { status: 404, code: 'BACKUP_NOT_FOUND' });
  }
  const g = await gist.getGist(v.gist_id);
  const file = g.files[v.file_name];
  if (!file?.content) {
    throw Object.assign(new Error('فایل بکاپ در Gist پیدا نشد.'), { status: 404, code: 'GIST_FILE_MISSING' });
  }
  // Decrypt → Validate → Restore (this version is encrypted with this deployment's key)
  const plain = decryptString(file.content);
  let parsed: any;
  try {
    parsed = JSON.parse(plain);
    if (parsed.app !== 'couple-os' || typeof parsed.files !== 'object') throw new Error('bad shape');
  } catch {
    throw Object.assign(new Error('ساختار بکاپ معتبر نیست.'), { status: 422, code: 'BACKUP_INVALID' });
  }
  const tables: Record<string, string> = Object.fromEntries(MODULE_TABLES.map(([n, t]) => [`${n}.json`, t]));
  await db.tx(async () => {
    // restore couple profile fields (never replace the couple row itself)
    const profileRows = parsed.files['profile.json'];
    if (Array.isArray(profileRows) && profileRows[0] && profileRows[0].id === coupleId) {
      await db.run('UPDATE couples SET title = ?, start_date = ?, updated_at = ? WHERE id = ?',
        [profileRows[0].title ?? null, profileRows[0].start_date ?? null, now(), coupleId]);
    }
    for (const [fileName, table] of Object.entries(tables)) {
      const rows = parsed.files[fileName];
      if (!Array.isArray(rows)) continue;
      await db.run(`DELETE FROM ${table} WHERE couple_id = ?`, [coupleId]);
      for (const row of rows) {
        if (row.couple_id !== coupleId) continue; // never import foreign rows
        const cols = Object.keys(row);
        const ph = cols.map(() => '?').join(',');
        await db.run(`INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${ph})`, cols.map((c) => row[c]));
      }
    }
  });
  return { restored: true, version };
}

export async function backupStatus(coupleId: string) {
  const db = await getDb();
  const jobs = await db.all('SELECT * FROM backup_jobs WHERE couple_id = ? ORDER BY started_at DESC LIMIT 10', [coupleId]);
  const versions = await listVersions(coupleId);
  const couple = await db.get('SELECT gist_id FROM couples WHERE id = ?', [coupleId]);
  return {
    configured: Boolean(config.githubToken),
    gistLinked: Boolean(couple?.gist_id || config.githubGistId),
    lastJob: jobs[0] ?? null,
    jobs,
    versions,
  };
}
