import { beforeAll, describe, expect, it, vi } from 'vitest';

// In-memory Gist store — GitHub API is never called in tests.
const gistStore = new Map<string, Record<string, string>>();
const verifyBehavior: { mode: 'ok' | 'auth' | 'scope'; login: string } = { mode: 'ok', login: 'test-gh-user' };
vi.mock('../src/services/gistClient', () => ({
  createGist: vi.fn(async (_token: string, files: Record<string, { content: string }>) => {
    const id = 'gist-test-1';
    gistStore.set(id, Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.content])));
    return { id, files: {} };
  }),
  updateGist: vi.fn(async (_token: string, id: string, files: Record<string, { content: string } | null>) => {
    const g = gistStore.get(id) ?? {};
    for (const [k, v] of Object.entries(files)) {
      if (v === null) delete g[k]; else g[k] = v.content;
    }
    gistStore.set(id, g);
    return { id, files: {} };
  }),
  getGist: vi.fn(async (_token: string, id: string) => ({
    id,
    files: Object.fromEntries(Object.entries(gistStore.get(id) ?? {}).map(([k, content]) => [k, { content }])),
  })),
  looksLikeGithubToken: (t: string) => {
    const s = t.trim();
    return s.length >= 30 && s.length <= 255 && /^[A-Za-z0-9_]+$/.test(s);
  },
  verifyToken: vi.fn(async () => {
    if (verifyBehavior.mode === 'auth') {
      throw Object.assign(new Error('توکن GitHub نامعتبر یا مسدود است؛ یک توکن تازه با scope فقط gist بساز.'), { status: 422, code: 'GITHUB_AUTH' });
    }
    if (verifyBehavior.mode === 'scope') {
      throw Object.assign(new Error('این توکن scope موردنیاز gist را ندارد؛ هنگام ساخت، فقط تیک gist را بزن.'), { status: 422, code: 'GITHUB_SCOPE' });
    }
    return { login: verifyBehavior.login, scopes: ['gist'] };
  }),
}));

import { createApp } from '../src/app';
import { registerUser, makeCouple } from './helpers';
import { getDb } from '../src/db';
import { runBackup, restoreVersion, listVersions, backupStatus } from '../src/services/backup';

const app = createApp();
beforeAll(async () => { await getDb(); });

describe('encrypted versioned backup', () => {
  it('runs backup: gist receives ONLY ciphertext, version recorded', async () => {
    const me = await registerUser(app, 'bk-a@test.local', 'BK');
    const { coupleId } = await makeCouple(me, 'bk-b@test.local');
    await me.post('/api/journal', { title: 'یادداشت بکاپ', content: 'این متن نباید سمت gist دیده بشه 🔒' });
    await me.post('/api/moods', { mood: 'great', energy: 9 });

    const res = await runBackup(coupleId, 'manual');
    expect(res.status).toBe('success');
    expect(res.version).toBe(1);

    const gistContent = [...gistStore.values()].flatMap((g) => Object.values(g)).join('\n');
    expect(gistContent).not.toContain('این متن نباید سمت gist دیده بشه');
    expect(gistContent).not.toContain('بکاپ');
    const encFile = gistStore.get(res.gistId)!['couple-os/backup_v1.enc.json'];
    expect(encFile).toContain('"iv"');
    expect(encFile).toContain('"tag"');

    const versions = await listVersions(coupleId);
    expect(versions).toHaveLength(1);
    expect(Number(versions[0].version)).toBe(1);
  });

  it('restore rolls the couple data back to the backup version', async () => {
    const me = await registerUser(app, 'rs-a@test.local', 'RS');
    const { coupleId } = await makeCouple(me, 'rs-b@test.local');
    await me.post('/api/journal', { title: 'نسخه‌ی اول', content: 'متن اول' });
    const b1 = await runBackup(coupleId, 'manual');
    expect(b1.version).toBeGreaterThanOrEqual(1);

    // mutate after backup
    const entries = (await me.get('/api/journal')).json.data.entries;
    await me.del(`/api/journal/${entries[0].id}`);
    await me.post('/api/journal', { title: 'نسخه‌ی نامطلوب', content: 'متن دوم' });
    expect((await me.get('/api/journal')).json.data.entries.find((e: any) => e.title === 'نسخه‌ی اول')).toBeUndefined();

    const restored = await restoreVersion(coupleId, b1.version);
    expect(restored.restored).toBe(true);
    const after = (await me.get('/api/journal')).json.data.entries;
    const first = after.find((e: any) => e.title === 'نسخه‌ی اول');
    expect(first).toBeTruthy();
    expect(first.content).toBe('متن اول');
    expect(after.find((e: any) => e.title === 'نسخه‌ی نامطلوب')).toBeUndefined();
  });

  it('old versions are pruned beyond keepVersions', async () => {
    const db = await getDb();
    await db.run('UPDATE couple_settings SET keep_versions = 3 WHERE couple_id IN (SELECT couple_id FROM couple_members LIMIT 2)');
    const me = await registerUser(app, 'pr-a@test.local', 'PR');
    const { coupleId } = await makeCouple(me, 'pr-b@test.local');
    await db.run('UPDATE couple_settings SET keep_versions = 3 WHERE couple_id = ?', [coupleId]);
    for (let i = 0; i < 5; i++) await runBackup(coupleId, 'manual');
    const versions = await listVersions(coupleId);
    expect(versions.length).toBeLessThanOrEqual(3);
    const status = await backupStatus(coupleId);
    expect(status.configured).toBe(true); // env present, mocked transport
    expect(status.versions.length).toBeLessThanOrEqual(3);
  });

  it('secrets never enter the backup payload', async () => {
    const me = await registerUser(app, 'sc-a@test.local', 'SECRET');
    const { coupleId } = await makeCouple(me, 'sc-b@test.local');
    await runBackup(coupleId, 'manual');
    const gistContent = [...gistStore.values()].flatMap((g) => Object.values(g)).join('\n');
    // encrypted payload means every sensitive string must be absent from ciphertext
    for (const marker of ['password_hash', 'totp_secret', 'refresh_hash', 'lock_pin_hash', 'sc-a@test.local', 'AUTH_SECRET', 'BACKUP_ENCRYPTION_KEY']) {
      expect(gistContent).not.toContain(marker);
    }
  });
});

describe('user-entered Gist token (Settings → Backup)', () => {
  const FAKE_TOKEN = 'ghp_' + 'Ab3dEf5Hi7Jk9Lm1No3Pq5Rs7Tu9Vw5Xy7Z1';

  it('saves a verified token ENCRYPTED; status reports only a masked hint', async () => {
    const me = await registerUser(app, 'tk-a@test.local', 'TK');
    const { coupleId } = await makeCouple(me, 'tk-b@test.local');
    verifyBehavior.mode = 'ok';

    const res = await me.call('PUT', '/api/backup/token', { token: FAKE_TOKEN });
    expect(res.status).toBe(200);
    expect(res.json.data.saved).toBe(true);
    expect(res.json.data.login).toBe('test-gh-user');
    expect(JSON.stringify(res.json)).not.toContain(FAKE_TOKEN); // never echoed

    const db = await getDb();
    const row = await db.get('SELECT gist_token_enc FROM couples WHERE id = ?', [coupleId]);
    expect(row.gist_token_enc).toBeTruthy();
    expect(row.gist_token_enc).not.toContain(FAKE_TOKEN);          // stored ciphertext only
    expect(row.gist_token_enc).toContain('"iv"');                  // AES-GCM envelope

    const status = await me.get('/api/backup/status');
    expect(status.json.data.tokenSource).toBe('site');
    expect(status.json.data.tokenHint).toBe('••••' + FAKE_TOKEN.slice(-4));
    expect(JSON.stringify(status.json)).not.toContain(FAKE_TOKEN);
  });

  it('backup with site token still produces ciphertext-only gist content (token never inside)', async () => {
    const db = await getDb();
    const me = await registerUser(app, 'tk-c@test.local', 'TK2');
    const { coupleId } = await makeCouple(me, 'tk-d@test.local');
    verifyBehavior.mode = 'ok';
    await me.call('PUT', '/api/backup/token', { token: FAKE_TOKEN });
    const r = await runBackup(coupleId, 'manual');
    expect(r.status).toBe('success');
    const all = [...gistStore.values()].flatMap((g) => Object.values(g)).join('\n');
    expect(all).not.toContain(FAKE_TOKEN);
    // token was resolved+decrypted internally (resolveGistToken returns it for gist calls)
    const { resolveGistToken } = await import('../src/services/backup');
    const couple = await db.get('SELECT * FROM couples WHERE id = ?', [coupleId]);
    const auth = resolveGistToken(couple);
    expect(auth.source).toBe('site');
    expect(auth.token).toBe(FAKE_TOKEN);
  });

  it('rejects tokens GitHub rejects (nothing stored)', async () => {
    const me = await registerUser(app, 'tk-e@test.local', 'TK3');
    const { coupleId } = await makeCouple(me, 'tk-f@test.local');
    verifyBehavior.mode = 'scope';
    const bad = await me.call('PUT', '/api/backup/token', { token: FAKE_TOKEN });
    expect(bad.status).toBe(422);
    expect(bad.json.error.code).toBe('GITHUB_SCOPE');
    const db = await getDb();
    const row = await db.get('SELECT gist_token_enc FROM couples WHERE id = ?', [coupleId]);
    expect(row.gist_token_enc).toBeNull();
    verifyBehavior.mode = 'ok';
  });

  it('rejects malformed tokens without any network call', async () => {
    const me = await registerUser(app, 'tk-g@test.local', 'TK4');
    await makeCouple(me, 'tk-h@test.local');
    // passes zod length, fails the token-shape check (spaces + symbols are impossible in PATs)
    const bad = await me.call('PUT', '/api/backup/token', { token: 'not a real github token at all !!' });
    expect(bad.status).toBe(422);
    expect(bad.json.error.code).toBe('TOKEN_FORMAT');
  });

  it('clearing removes the site token (env fallback reported again)', async () => {
    const me = await registerUser(app, 'tk-i@test.local', 'TK5');
    await makeCouple(me, 'tk-j@test.local');
    verifyBehavior.mode = 'ok';
    await me.call('PUT', '/api/backup/token', { token: FAKE_TOKEN });
    const del = await me.del('/api/backup/token');
    expect(del.status).toBe(200);
    const status = await me.get('/api/backup/status');
    expect(status.json.data.tokenSource).toBe('env'); // test env provides COUPLE_OS_GITHUB_TOKEN
  });

  it('token is not readable by the other couple (isolation)', async () => {
    const me = await registerUser(app, 'tk-k@test.local', 'TK6');
    await makeCouple(me, 'tk-l@test.local');
    verifyBehavior.mode = 'ok';
    await me.call('PUT', '/api/backup/token', { token: FAKE_TOKEN });

    const other = await registerUser(app, 'tk-m@test.local', 'TK7');
    await makeCouple(other, 'tk-n@test.local');
    const st = await other.get('/api/backup/status');
    expect(st.json.data.tokenSource).toBe('env');
    expect(st.json.data.tokenHint).toBeNull();
    expect(JSON.stringify(st.json)).not.toContain(FAKE_TOKEN);

    const exp = await me.get('/api/export');
    expect(JSON.stringify(exp.json)).not.toContain(FAKE_TOKEN); // GDPR export excludes token
  });
});
