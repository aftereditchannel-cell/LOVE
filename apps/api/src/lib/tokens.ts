import jwt from 'jsonwebtoken';
import { config } from '../config';
import { randomToken, sha256 } from './crypto';

export type TokenType = 'access' | 'mfa' | 'reset';

export function signAccessToken(userId: string, sessionId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId, typ: 'access' }, config.authSecret, { expiresIn: '15m' });
}
export function verifyAccessToken(token: string): { sub: string; sid: string } {
  const p = jwt.verify(token, config.authSecret) as any;
  if (p.typ !== 'access') throw new Error('bad token type');
  return { sub: p.sub, sid: p.sid };
}
export function signMfaToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: 'mfa' }, config.authSecret, { expiresIn: '5m' });
}
export function verifyMfaToken(token: string): string {
  const p = jwt.verify(token, config.authSecret) as any;
  if (p.typ !== 'mfa') throw new Error('bad token type');
  return p.sub as string;
}
export function signResetToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: 'reset' }, config.authSecret, { expiresIn: '1h' });
}
export function verifyResetToken(token: string): string {
  const p = jwt.verify(token, config.authSecret) as any;
  if (p.typ !== 'reset') throw new Error('bad token type');
  return p.sub as string;
}

export function newRefreshToken(): { token: string; hash: string } {
  const token = randomToken(48);
  return { token, hash: sha256(token) };
}
/** CSRF double-submit: derivable from the (httpOnly) refresh cookie, unknowable to attackers. */
export function csrfFor(refreshToken: string): string {
  return sha256('csrf:' + refreshToken).slice(0, 48);
}
