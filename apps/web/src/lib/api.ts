/** Typed API client — reads the CSRF cookie, auto-refreshes expired sessions. */

export class ApiError extends Error {
  code: string; status: number;
  constructor(status: number, code: string, message: string) {
    super(message); this.status = status; this.code = code;
  }
}

export function getCookie(name: string): string {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

type Opts = { method?: string; body?: any; formData?: FormData; skipRetry?: boolean };

let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'x-csrf-token': getCookie('co_csrf') },
      credentials: 'same-origin',
    }).then((r) => { refreshing = null; return r.ok; }).catch(() => { refreshing = null; return false; });
  }
  return refreshing;
}

async function raw<T>(path: string, opts: Opts): Promise<T> {
  const headers: Record<string, string> = {};
  const init: RequestInit = { method: opts.method ?? 'GET', headers, credentials: 'same-origin' };
  if (opts.formData) init.body = opts.formData;
  else if (opts.body !== undefined) { headers['content-type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
  if ((init.method ?? 'GET') !== 'GET') headers['x-csrf-token'] = getCookie('co_csrf');
  const res = await fetch(path, init);
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new ApiError(res.status, json?.error?.code ?? 'UNKNOWN', json?.error?.message ?? 'خطای ناشناخته');
  return (json?.data ?? json) as T;
}

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  try {
    return await raw<T>(path, opts);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && e.code === 'TOKEN_EXPIRED' && !opts.skipRetry) {
      if (await tryRefresh()) return raw<T>(path, { ...opts, skipRetry: true });
    }
    throw e;
  }
}

export const get = <T = any>(p: string) => api<T>(p);
export const post = <T = any>(p: string, b?: any) => api<T>(p, { method: 'POST', body: b });
export const patch = <T = any>(p: string, b?: any) => api<T>(p, { method: 'PATCH', body: b });
export const put = <T = any>(p: string, b?: any) => api<T>(p, { method: 'PUT', body: b });
export const del = <T = any>(p: string) => api<T>(p, { method: 'DELETE' });
export const upload = <T = any>(p: string, fd: FormData) => api<T>(p, { method: 'POST', formData: fd });
