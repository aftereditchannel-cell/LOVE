import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { Client, registerUser, makeCouple } from './helpers';
import { totp, generateTotpSecret } from '../src/lib/totp';
import { getDb } from '../src/db';

const app = createApp();
beforeAll(async () => { await getDb(); });

describe('auth', () => {
  it('registers, logs in, refreshes, logs out', async () => {
    const c = new Client(app); await c.start();
    const reg = await c.post('/api/auth/register', { email: 'a@test.local', password: 'Passw0rd!!', displayName: 'الف' });
    expect(reg.status).toBe(201);
    const me = await c.get('/api/auth/me');
    expect(me.json.data.user.email).toBe('a@test.local');

    const before = await c.get('/api/auth/me');
    await new Promise((r) => setTimeout(r, 10));
    const refresh = await c.post('/api/auth/refresh');
    expect(refresh.status).toBe(200);
    const after = await c.get('/api/auth/me');
    expect(after.status).toBe(200);

    const out = await c.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect((await c.get('/api/auth/me')).status).toBe(401);

    const login = await c.post('/api/auth/login', { email: 'a@test.local', password: 'Passw0rd!!' });
    expect(login.status).toBe(200);
    expect((await c.get('/api/auth/me')).status).toBe(200);
  });

  it('rejects wrong password & duplicate email & weak password', async () => {
    const c = new Client(app); await c.start();
    await c.post('/api/auth/register', { email: 'b@test.local', password: 'Passw0rd!!', displayName: 'ب' });
    const bad = await c.post('/api/auth/login', { email: 'b@test.local', password: 'wrong-pass' });
    expect(bad.status).toBe(401);
    const dup = await c.post('/api/auth/register', { email: 'b@test.local', password: 'Passw0rd!!', displayName: 'ب۲' });
    expect(dup.status).toBe(409);
    const weak = await c.post('/api/auth/register', { email: 'w@test.local', password: '123', displayName: 'ضعیف' });
    expect(weak.status).toBe(400);
  });

  it('full 2FA TOTP round-trip: setup → enable → login challenge', async () => {
    const c = new Client(app); await c.start();
    await c.post('/api/auth/register', { email: 'mfa@test.local', password: 'Passw0rd!!', displayName: 'ام‌اف‌ای' });
    const setup = await c.post('/api/auth/2fa/setup');
    expect(setup.status).toBe(200);
    const secret: string = setup.json.data.secret;
    const enable = await c.post('/api/auth/2fa/enable', { code: totp(secret) });
    expect(enable.status).toBe(200);
    await c.post('/api/auth/logout');
    // login now demands the second factor
    const login = await c.post('/api/auth/login', { email: 'mfa@test.local', password: 'Passw0rd!!' });
    expect(login.json.data.mfaRequired).toBe(true);
    const verify = await c.post('/api/auth/2fa/verify', { mfaToken: login.json.data.mfaToken, code: totp(secret) });
    expect(verify.status).toBe(200);
    expect((await c.get('/api/auth/me')).status).toBe(200);
    const badLogin = new Client(app); await badLogin.start();
    const l2 = await badLogin.post('/api/auth/login', { email: 'mfa@test.local', password: 'Passw0rd!!' });
    const v2 = await badLogin.post('/api/auth/2fa/verify', { mfaToken: l2.json.data.mfaToken, code: '000000' });
    expect(v2.status).toBe(401);
  });

  it('password reset flow issues a usable token', async () => {
    const c = new Client(app); await c.start();
    await c.post('/api/auth/register', { email: 'reset@test.local', password: 'Passw0rd!!', displayName: 'ریست' });
    const forgot = await c.post('/api/auth/forgot-password', { email: 'reset@test.local' });
    expect(forgot.json.data.sent).toBe(true);
    // no SMTP in tests — pull the token directly from the DB store
    const db = await getDb();
    const u = await db.get('SELECT id FROM users WHERE email = ?', ['reset@test.local']);
    const { signResetToken } = await import('../src/lib/tokens');
    const { sha256 } = await import('../src/lib/crypto');
    const token = signResetToken(u.id);
    await db.run('UPDATE users SET reset_token_hash = ?, reset_token_exp = ? WHERE id = ?',
      [sha256(token), new Date(Date.now() + 3600_000).toISOString(), u.id]);
    const reset = await c.post('/api/auth/reset-password', { token, password: 'NewPassw0rd!!' });
    expect(reset.status).toBe(200);
    const relog = await c.post('/api/auth/login', { email: 'reset@test.local', password: 'NewPassw0rd!!' });
    expect(relog.status).toBe(200);
  });
});

describe('couple flow', () => {
  it('create → invite → join caps at 2 members, blocks double-join', async () => {
    const a = await registerUser(app, 'ca@test.local', 'A');
    const { partner, coupleId } = await makeCouple(a, 'cb@test.local');
    const g = await a.get('/api/couple');
    expect(g.json.data.couple.id).toBe(coupleId);
    expect(g.json.data.couple.members).toHaveLength(2);
    expect(g.json.data.couple.daysTogether).toBeGreaterThan(0);
    // third user cannot join
    const inv2 = await a.post('/api/couple/invite');
    const code2 = inv2.json.data.code;
    const d = await registerUser(app, 'cd@test.local', 'D');
    const j = await d.post('/api/couple/join', { code: code2 });
    expect(j.status).toBe(409);
    // user without couple gets COUPLE_REQUIRED on scoped routes
    expect((await d.get('/api/dashboard')).status).toBe(409);
    // partner sees same couple
    const g2 = await partner.get('/api/couple');
    expect(g2.json.data.couple.id).toBe(coupleId);
  });
});
