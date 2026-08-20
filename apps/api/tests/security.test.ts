import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { Client, registerUser, makeCouple } from './helpers';
import { getDb } from '../src/db';

const app = createApp();
beforeAll(async () => { await getDb(); });

describe('security controls', () => {
  it('mutations without CSRF header → 403', async () => {
    const c = await registerUser(app, 'csrf@test.local', 'CSRF');
    const res = await fetch(c['base'] + '/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: `co_at=${(c as any).cookies.get('co_at')}; co_rt=${(c as any).cookies.get('co_rt')}` },
      body: JSON.stringify({ displayName: 'هکر' }),
    });
    expect(res.status).toBe(403);
  });

  it('helmet security headers are present', async () => {
    const c = new Client(app); await c.start();
    const { res } = await c.get('/api/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-dns-prefetch-control')).toBeTruthy();
  });

  it('rate limiter kicks in on login abuse', async () => {
    const c = new Client(app); await c.start();
    let got429 = false;
    for (let i = 0; i < 12; i++) {
      const r = await c.post('/api/auth/login', { email: 'rl@test.local', password: `wrong${i}xx` });
      if (r.status === 429) { got429 = true; break; }
    }
    expect(got429).toBe(true);
  });

  it('file upload rejects invalid MIME; valid upload is couple-scoped', async () => {
    const me = await registerUser(app, 'up-a@test.local', 'UP');
    const { partner } = await makeCouple(me, 'up-b@test.local');
    const fd = new FormData();
    fd.append('file', new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), 'evil.html');
    const bad = await me.call('POST', '/api/photos', fd, { raw: true });
    expect(bad.status).toBe(400);
    const okFd = new FormData();
    okFd.append('file', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }), 'dot.png');
    okFd.append('caption', 'عکس تستی');
    const good = await me.call('POST', '/api/photos', okFd, { raw: true });
    expect(good.status).toBe(201);
    const url: string = good.json.data.photo.url;
    expect((await me.get(url)).status).toBe(200);
    expect((await partner.get(url)).status).toBe(200); // partner in same couple can view
    const stranger = await registerUser(app, 'up-c@test.local', 'STRANGER');
    expect((await stranger.get(url)).status).toBe(404); // stranger cannot
  });

  it('lock PIN set & verify (hashed server-side)', async () => {
    const c = await registerUser(app, 'lock@test.local', 'LOCK');
    expect((await c.post('/api/settings/lock', { pin: '1234' })).status).toBe(200);
    expect((await c.post('/api/settings/lock/verify', { pin: '0000' })).status).toBe(401);
    expect((await c.post('/api/settings/lock/verify', { pin: '1234' })).status).toBe(200);
    const db = await getDb();
    const u = await c.get('/api/auth/me');
    const row = await db.get('SELECT lock_pin_hash FROM users WHERE id = ?', [u.json.data.user.id]);
    expect(row.lock_pin_hash).toBeTruthy();
    expect(row.lock_pin_hash).not.toContain('1234');
  });
});
