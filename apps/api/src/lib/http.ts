import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) {
    super(message); this.status = status; this.code = code;
  }
}
export const err = (status: number, code: string, message: string) => new HttpError(status, code, message);

export const asyncH = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };

export function ok(res: Response, data: any = {}, status = 200) {
  res.status(status).json({ ok: true, data });
}
