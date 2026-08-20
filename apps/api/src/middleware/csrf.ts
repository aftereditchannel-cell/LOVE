import type { NextFunction, Request, Response } from 'express';
import { err } from '../lib/http';
import { sha256 } from '../lib/crypto';
import { config } from '../config';
import { URL } from 'node:url';

/**
 * CSRF defence-in-depth:
 * 1. Authenticated mutations → double-submit cookie (`x-csrf-token` header
 *    must equal sha256('csrf:' + refresh-cookie), readable value mirrored in
 *    the non-HttpOnly `co_csrf` cookie set at login).
 * 2. Pre-auth endpoints (register/login/forgot…) have no session cookie yet,
 *    so they rely on fetch-metadata + origin checks instead.
 * 3. SameSite=Lax cookies make cross-site POSTs unable to carry credentials.
 */

const PRE_AUTH_PATHS = new Set([
  '/api/auth/register', '/api/auth/login', '/api/auth/refresh',
  '/api/auth/forgot-password', '/api/auth/reset-password',
  '/api/auth/2fa/verify', '/api/auth/verify-email',
]);

function originAllowed(req: Request): boolean {
  // Browsers always send Sec-Fetch-Site on navigations/fetch — same-origin/same-site are trusted
  const sfs = req.headers['sec-fetch-site'];
  if (typeof sfs === 'string' && !['same-origin', 'same-site', 'none'].includes(sfs)) return false;
  const origin = req.headers.origin;
  if (typeof origin === 'string') {
    try {
      const host = new URL(origin).host;
      if (host === req.headers.host) return true;
      return [config.webOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin);
    } catch { return false; }
  }
  return true; // non-browser clients (curl/tests) — no cookies implied by CSRF anyway
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();
  if (!req.originalUrl.startsWith('/api')) return next();
  if (!originAllowed(req)) return next(err(403, 'CSRF_ORIGIN', 'منشأ درخواست معتبر نیست.'));
  const path = req.originalUrl.split('?')[0];
  if (PRE_AUTH_PATHS.has(path)) return next();
  const refresh = req.cookies?.co_rt;
  const header = (req.headers['x-csrf-token'] as string) || '';
  if (!refresh || !header) return next(err(403, 'CSRF', 'درخواست نامعتبر (CSRF).'));
  const expected = sha256('csrf:' + refresh).slice(0, 48);
  if (header !== expected) return next(err(403, 'CSRF', 'درخواست نامعتبر (CSRF).'));
  next();
}

export const csrfValueFor = (refresh: string) => sha256('csrf:' + refresh).slice(0, 48);
