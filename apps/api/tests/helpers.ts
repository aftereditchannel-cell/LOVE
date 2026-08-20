import type { Express } from 'express';
import type { AddressInfo } from 'node:net';

/** Small cookie-aware test client (stores cookies per instance, auto-CSRF). */
export class Client {
  base = '';
  private cookies = new Map<string, string>();
  private ip = `10.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
  constructor(private app: Express) {}
  async start() {
    const srv = this.app.listen(0);
    this.base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
    srv.unref();
    (this as any).srv = srv;
  }
  get csrf(): string {
    return this.cookies.get('co_csrf') ?? '';
  }
  private storeCookies(res: Response) {
    const set = (res.headers as any).getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(';');
      const idx = pair.indexOf('=');
      const k = pair.slice(0, idx).trim(); const v = pair.slice(idx + 1).trim();
      if (v === '' || v === 'undefined') this.cookies.delete(k); else this.cookies.set(k, v);
    }
  }
  async call(method: string, path: string, body?: any, opts: { raw?: boolean } = {}): Promise<{ status: number; json: any; res: Response }> {
    const headers: Record<string, string> = {
      cookie: [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; '),
      'x-forwarded-for': this.ip,
    };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      if (opts.raw && body instanceof FormData) { init.body = body as any; }
      else { headers['content-type'] = 'application/json'; init.body = JSON.stringify(body); }
    }
    if (method !== 'GET' && this.csrf) headers['x-csrf-token'] = this.csrf;
    const res = await fetch(this.base + path, init);
    this.storeCookies(res);
    let json: any = null;
    try { json = await res.json(); } catch { /* non-json */ }
    return { status: res.status, json, res };
  }
  get(p: string) { return this.call('GET', p); }
  post(p: string, b?: any) { return this.call('POST', p, b ?? {}); }
  patch(p: string, b?: any) { return this.call('PATCH', p, b ?? {}); }
  del(p: string) { return this.call('DELETE', p); }
}

export async function registerUser(app: Express, email: string, name = 'کاربر تست') {
  const c = new Client(app); await c.start();
  const r = await c.post('/api/auth/register', { email, password: 'Passw0rd!!', displayName: name });
  if (r.status !== 201) throw new Error(`register failed: ${JSON.stringify(r.json)}`);
  return c;
}

export async function makeCouple(me: Client, partnerEmail: string) {
  const r = await me.post('/api/couple', {
    startDate: '2024-01-01',
    me: { name: 'کاربر الف', nickname: 'آلفا' },
    partner: { name: 'کاربر ب', nickname: 'بتا' },
  });
  if (r.status !== 201) throw new Error(`couple create failed: ${JSON.stringify(r.json)}`);
  const inv = await me.post('/api/couple/invite');
  const code = inv.json.data.code as string;
  const partner = await registerUser(me['app'], partnerEmail, 'کاربر ب');
  const j = await partner.post('/api/couple/join', { code });
  if (j.status !== 200) throw new Error(`join failed: ${JSON.stringify(j.json)}`);
  return { partner, coupleId: r.json.data.coupleId as string };
}
