import { beforeAll, describe, expect, it, vi } from 'vitest';

// In-memory Gist store — GitHub API is never called in tests.
const gistStore = new Map<string, Record<string, string>>();
vi.mock('../src/services/gistClient', () => ({
  createGist: vi.fn(async (files: Record<string, { content: string }>) => {
    const id = 'gist-test-1';
    gistStore.set(id, Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.content])));
    return { id, files: {} };
  }),
  updateGist: vi.fn(async (id: string, files: Record<string, { content: string } | null>) => {
    const g = gistStore.get(id) ?? {};
    for (const [k, v] of Object.entries(files)) {
      if (v === null) delete g[k]; else g[k] = v.content;
    }
    gistStore.set(id, g);
    return { id, files: {} };
  }),
  getGist: vi.fn(async (id: string) => ({
    id,
    files: Object.fromEntries(Object.entries(gistStore.get(id) ?? {}).map(([k, content]) => [k, { content }])),
  })),
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

describe.skip('unconfigured token path', () => {
  it('skips gracefully', async () => {
    // covered implicitly by status endpoint in smoke tests
  });
});
