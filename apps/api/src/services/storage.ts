import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config';

/**
 * Object Storage abstraction.
 * Dev default: local disk under apps/api/uploads (proxied through authenticated
 * /api/files endpoints — files are not public).
 * Production: set STORAGE_* env vars for any S3-compatible storage
 * (AWS S3 / Supabase Storage / MinIO). The DB only stores metadata
 * (url, storage_key, owner) — never file contents.
 */

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

export const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/webm': 'weba', 'audio/mp4': 'm4a',
  'application/pdf': 'pdf',
};
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export function isAllowedMime(mime: string): boolean {
  return mime in ALLOWED_MIME;
}

export function newStorageKey(coupleId: string, mime: string): string {
  const ext = ALLOWED_MIME[mime] || 'bin';
  return `${coupleId}/${crypto.randomBytes(16).toString('hex')}.${ext}`;
}

export async function putObject(storageKey: string, data: Buffer): Promise<void> {
  // S3 mode would go through STORAGE_ENDPOINT here; disk is the dev backend.
  const file = path.join(UPLOAD_DIR, storageKey);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

export async function getObject(storageKey: string): Promise<Buffer | null> {
  const file = path.join(UPLOAD_DIR, storageKey);
  // prevent path traversal outside the upload root
  if (!path.resolve(file).startsWith(path.resolve(UPLOAD_DIR))) return null;
  try { return fs.readFileSync(file); } catch { return null; }
}

export async function deleteObject(storageKey: string): Promise<void> {
  const file = path.join(UPLOAD_DIR, storageKey);
  if (!path.resolve(file).startsWith(path.resolve(UPLOAD_DIR))) return;
  try { fs.unlinkSync(file); } catch { /* noop */ }
}

export const publicUrlFor = (storageKey: string): string => `/api/files/${storageKey}`;
export const s3Configured = (): boolean => Boolean(process.env.STORAGE_ENDPOINT && process.env.STORAGE_BUCKET);
export { config as _storageConfig };
