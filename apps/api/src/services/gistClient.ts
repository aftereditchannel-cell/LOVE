import { config } from '../config';

/**
 * GitHub Gist API client.
 * SECURITY: the token is read ONLY from the server-side env (COUPLE_OS_GITHUB_TOKEN).
 * It is never sent to the client, never logged, never included in backups.
 */
const API = 'https://api.github.com';

export interface GistFile { content: string }
export interface GistResult { id: string; files: Record<string, { content?: string }> }

function assertToken(): string {
  if (!config.githubToken) {
    throw Object.assign(new Error('Backup پیکربندی نشده: COUPLE_OS_GITHUB_TOKEN در env سرور تنظیم نشده است.'), { status: 503, code: 'BACKUP_NOT_CONFIGURED' });
  }
  return config.githubToken;
}

async function gh(path: string, init: RequestInit = {}): Promise<any> {
  const token = assertToken();
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
    throw Object.assign(
      new Error('اتصال به GitHub برقرار نشد؛ شبکه یا فایروال سرور را بررسی کنید.'),
      { status: 502, code: 'GITHUB_NETWORK', detail: String(e?.cause?.code || e?.message || e) },
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      throw Object.assign(new Error('توکن GitHub معتبر نیست یا دسترسی gist ندارد (scope: gist).'), { status: 502, code: 'GITHUB_AUTH' });
    }
    throw Object.assign(new Error(`GitHub API error ${res.status}`), { status: 502, code: 'GITHUB_API', detail: text.slice(0, 300) });
  }
  return res.json();
}

export async function createGist(files: Record<string, GistFile>, description: string): Promise<GistResult> {
  return gh('/gists', { method: 'POST', body: JSON.stringify({ description, public: false, files }) });
}
export async function updateGist(id: string, files: Record<string, GistFile | null>): Promise<GistResult> {
  return gh(`/gists/${id}`, { method: 'PATCH', body: JSON.stringify({ files }) });
}
export async function getGist(id: string): Promise<GistResult> {
  return gh(`/gists/${id}`);
}
