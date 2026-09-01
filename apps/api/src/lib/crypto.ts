import crypto from 'node:crypto';
import { config } from '../config';

/**
 * AES-256-GCM authenticated encryption for sensitive fields
 * (journal content, love letters, chat messages, period notes, backups).
 * Key derived from BACKUP_ENCRYPTION_KEY via scrypt. Salt fixed per-purpose so
 * the deployment key alone can decrypt; the IV is random per record.
 * The key itself NEVER leaves the server (never logged, never in backups/gist).
 */
const SCRYPT_SALT = 'couple-os/field-encryption/v1';
let cached: Buffer | null = null;

function key(): Buffer {
  if (!cached) cached = crypto.scryptSync(config.backupKey, SCRYPT_SALT, 32);
  return cached;
}

export function encryptString(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: data.toString('base64'),
  });
}

export function decryptString(payload: string): string {
  try {
    const { iv, tag, data } = JSON.parse(payload);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw Object.assign(new Error('رمزگشایی داده ناموفق بود.'), { status: 500, code: 'DECRYPT_FAILED' });
  }
}

export function encryptIfString(v: string | undefined | null): string | null {
  return v == null ? null : encryptString(v);
}
export function decryptIfString(v: string | undefined | null): string | null {
  return v == null ? null : decryptString(v);
}

export const sha256 = (s: string): string => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 32): string => crypto.randomBytes(bytes).toString('base64url');
export const timingSafeEq = (a: string, b: string): boolean => {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};
