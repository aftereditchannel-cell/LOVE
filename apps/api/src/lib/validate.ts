import { z, ZodTypeAny } from 'zod';
import { err } from './http';

export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const first = r.error.issues[0];
    throw err(400, 'VALIDATION', `ورودی نامعتبر: ${first.path.join('.') || 'body'} — ${first.message}`);
  }
  return r.data as z.output<S>;
}
