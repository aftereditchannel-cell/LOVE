/**
 * GitHub Gist API client.
 * SECURITY: tokens come from either the server env (COUPLE_OS_GITHUB_TOKEN) or a
 * couple-scoped token saved by the user in Settings → Backup (stored ENCRYPTED in
 * the DB, column couples.gist_token_enc). Tokens are passed explicitly to every
 * call — never logged, never sent to the client, never included in backups/exports.
 */
const API = 'https://api.github.com';

export interface GistFile { content: string }
export interface GistResult { id: string; files: Record<string, { content?: string }> }

function ghError(status: number, msg: string, code: string, detail = ''): never {
  throw Object.assign(new Error(msg), { status, code, detail });
}

async function gh(token: string, path: string, init: RequestInit = {}): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'couple-os-backup',
        ...(init.headers || {}),
      },
    });
  } catch (e: any) {
    ghError(502, 'اتصال به GitHub برقرار نشد؛ شبکه یا فایروال سرور را بررسی کنید.', 'GITHUB_NETWORK',
      String(e?.cause?.code || e?.message || e));
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      ghError(502, 'توکن GitHub معتبر نیست یا دسترسی gist ندارد (scope: gist).', 'GITHUB_AUTH');
    }
    if (res.status === 404) ghError(404, 'Gist پیدا نشد؛ شاید حذف شده یا به این توکن تعلق ندارد.', 'GIST_NOT_FOUND');
    ghError(502, `GitHub API error ${res.status}`, 'GITHUB_API', text.slice(0, 300));
  }
  return res.json();
}

/** Basic shape check before even calling GitHub (classic ghp_ / fine-grained github_pat_). */
export function looksLikeGithubToken(token: string): boolean {
  const t = token.trim();
  return t.length >= 30 && t.length <= 255 && /^[A-Za-z0-9_]+$/.test(t);
}

/**
 * Verify a token against GitHub before storing it.
 * Returns { login, scopes } on success; throws typed ghError otherwise.
 * Classic tokens: X-OAuth-Scopes must include "gist" when the header is present.
 */
export async function verifyToken(token: string): Promise<{ login: string; scopes: string[] }> {
  let res: Response;
  try {
    res = await fetch(`${API}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'couple-os-backup',
      },
    });
  } catch (e: any) {
    ghError(502, 'اتصال به GitHub برقرار نشد؛ شبکه یا فایروال سرور را بررسی کنید.', 'GITHUB_NETWORK',
      String(e?.cause?.code || e?.message || e));
  }
  if (res.status === 401 || res.status === 403) {
    ghError(422, 'توکن GitHub نامعتبر یا مسدود است؛ یک توکن تازه با scope فقط gist بساز.', 'GITHUB_AUTH');
  }
  if (!res.ok) ghError(502, `GitHub API error ${res.status}`, 'GITHUB_API');
  const scopes = (res.headers.get('x-oauth-scopes') ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  // Fine-grained tokens (github_pat_) have no scope header but CANNOT access gists at all.
  if (token.startsWith('github_pat_')) {
    ghError(422, 'توکن‌های Fine-grained به Gist دسترسی ندارند؛ یک توکن Classic با scope فقط gist بساز.', 'GITHUB_SCOPE');
  }
  if (scopes.length && !scopes.includes('gist')) {
    ghError(422, 'این توکن scope موردنیاز gist را ندارد؛ هنگام ساخت، فقط تیک gist را بزن.', 'GITHUB_SCOPE');
  }
  const body: any = await res.json().catch(() => ({}));
  return { login: body?.login ?? 'github-user', scopes };
}

export async function createGist(token: string, files: Record<string, GistFile>, description: string): Promise<GistResult> {
  return gh(token, '/gists', { method: 'POST', body: JSON.stringify({ description, public: false, files }) });
}
export async function updateGist(token: string, id: string, files: Record<string, GistFile | null>): Promise<GistResult> {
  return gh(token, `/gists/${id}`, { method: 'PATCH', body: JSON.stringify({ files }) });
}
export async function getGist(token: string, id: string): Promise<GistResult> {
  return gh(token, `/gists/${id}`);
}
