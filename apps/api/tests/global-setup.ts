import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export default async function setup() {
  const dir = path.join(process.cwd(), 'tests', '.tmp');
  fs.mkdirSync(dir, { recursive: true });
  const dbFile = path.join(dir, 'test.db');
  for (const f of [dbFile, dbFile + '-wal', dbFile + '-shm']) { try { fs.unlinkSync(f); } catch { /* noop */ } }
  process.env.DATABASE_URL = `file:${dbFile}`;
  process.env.AUTH_SECRET = crypto.randomBytes(32).toString('hex');
  process.env.BACKUP_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  process.env.COUPLE_OS_GITHUB_TOKEN = 'test-token-mocked';
  process.env.WEB_ORIGIN = 'http://localhost:5173';
  process.env.NODE_ENV = 'test';
  // schema applies automatically on first getDb(); seed the question pool
  const { getDb, newId } = await import('../src/db');
  const db = await getDb();
  for (let i = 1; i <= 6; i++) {
    await db.run('INSERT OR IGNORE INTO daily_questions (id, text, tags) VALUES (?,?,?)', [newId(), `سؤال تستی شماره ${i}؟`, 'test']);
  }
}
