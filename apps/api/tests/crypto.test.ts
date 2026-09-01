import { describe, expect, it } from 'vitest';
import { encryptString, decryptString } from '../src/lib/crypto';
import { hotp, totp, verifyTotp, base32Encode, generateTotpSecret } from '../src/lib/totp';

describe('AES-256-GCM field encryption', () => {
  it('encrypts and decrypts round-trip', () => {
    const secret = 'متن خیلی محرمانه با emoji ❤️‍🔥 و نویسه‌های فارسی';
    const enc = encryptString(secret);
    expect(enc).not.toContain('محرمانه');
    expect(decryptString(enc)).toBe(secret);
  });

  it('IVs are random — same input twice differs', () => {
    expect(encryptString('x')).not.toBe(encryptString('x'));
  });

  it('detects tampering (GCM auth tag)', () => {
    const enc = JSON.parse(encryptString('payload'));
    enc.data = Buffer.from('tampered-data!!').toString('base64').slice(0, enc.data.length);
    expect(() => decryptString(JSON.stringify(enc))).toThrow();
  });
});

describe('TOTP (RFC 4226 / 6238 vectors)', () => {
  it('matches published HOTP test values', () => {
    // RFC 4226 — secret = ASCII "12345678901234567890"
    const secret = Buffer.from('12345678901234567890', 'ascii');
    const b32 = base32Encode(secret);
    const expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
    expected.forEach((code, i) => expect(hotp(b32, i)).toBe(code));
  });

  it('matches RFC 6238 SHA-1 T=59 test value', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890', 'ascii'));
    // RFC 6238 test: Time=59s → 94287082 (8-digit)
    expect(hotp(secret, 1, 8)).toBe('94287082');
    expect(totp(secret, 59_000, 30, 8)).toBe('94287082');
  });

  it('verifies current code and rejects a wrong one', () => {
    const secret = generateTotpSecret();
    const code = totp(secret);
    expect(verifyTotp(secret, code)).toBe(true);
    const wrong = code === '000000' ? '111111' : '000000';
    // pick something guaranteed different from the current ±window codes
    expect(verifyTotp(secret, wrong, 0)).toBe(wrong === totp(secret));
  });
});
