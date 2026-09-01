import type { NextFunction, Request, Response } from 'express';
import { err } from '../lib/http';
import { config } from '../config';

/** In-memory fixed-window rate limiter (per process). */
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

setInterval(() => {
  const t = Date.now();
  for (const [k, v] of buckets) if (v.reset < t) buckets.delete(k);
}, 60_000).unref();

export function rateLimit(name: string, limit: number, windowMs: number, keyFn?: (req: Request) => string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = `${name}:${keyFn ? keyFn(req) : req.ip}`;
    const t = Date.now();
    let b = buckets.get(key);
    if (!b || b.reset < t) { b = { count: 0, reset: t + windowMs }; buckets.set(key, b); }
    b.count++;
    if (b.count > limit) {
      return next(err(429, 'RATE_LIMITED', 'درخواست‌هات زیاد شد؛ چند لحظه بعد دوباره تلاش کن.'));
    }
    next();
  };
}

export const loginLimiter = rateLimit('login', 10, 5 * 60_000, (req) => `${req.ip}:${(req.body?.email || '').toLowerCase()}`);
export const registerLimiter = rateLimit('register', 8, 60 * 60_000);
export const forgotLimiter = rateLimit('forgot', 5, 60 * 60_000);
export const apiLimiter = rateLimit('api', 600, 60_000);
export const uploadLimiter = rateLimit('upload', 60, 60 * 60_000);
