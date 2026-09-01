import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http';
import { config } from '../config';

export function notFoundHandler(req: Request, res: Response) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'مسیر پیدا نشد.' } });
  }
  res.status(404).send('Not found');
}

export function errorHandler(e: any, req: Request, res: Response, _next: NextFunction) {
  const status = e instanceof HttpError ? e.status : (e?.status && Number.isInteger(e.status) ? e.status : 500);
  const code = e instanceof HttpError
    ? e.code
    : (e?.code && typeof e.code === 'string' && /^[A-Z0-9_]+$/.test(e.code) ? e.code : 'INTERNAL');
  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.path}`, e);
  }
  const message = status >= 500 && config.isProd ? 'مشکلی پیش آمد؛ دوباره تلاش کن.' : (e.message || 'خطای داخلی');
  res.status(status).json({ ok: false, error: { code, message } });
}
