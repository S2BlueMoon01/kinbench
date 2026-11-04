import { describe, expect, it } from 'vitest';
import { decodeBase64 } from '../base64/logic';
import { decrypt, encrypt } from './logic';

const FAST = 1000; // the real 600,000 iterations are slow on purpose; the format is the same

describe('aes-gcm', () => {
  it('round-trips Unicode text with a fresh salt and IV each time', async () => {
    const a = await encrypt('Bí mật 🔒', 'mật khẩu', FAST);
    const b = await encrypt('Bí mật 🔒', 'mật khẩu', FAST);
    expect(a).not.toBe(b);
    expect(await decrypt(a, 'mật khẩu', FAST)).toBe('Bí mật 🔒');
    const bytes = decodeBase64(a);
    expect(bytes.ok && bytes.bytes.length).toBe(16 + 12 + new TextEncoder().encode('Bí mật 🔒').length + 16);
  });

  it('encrypts empty text', async () => {
    expect(await decrypt(await encrypt('', 'pw', FAST), 'pw', FAST)).toBe('');
  });

  it('rejects a wrong password, tampered data and invalid input', async () => {
    const payload = await encrypt('secret', 'right', FAST);
    expect(await decrypt(payload, 'wrong', FAST)).toBeNull();
    const tampered = decodeBase64(payload);
    if (!tampered.ok) throw new Error();
    tampered.bytes[tampered.bytes.length - 1] ^= 1;
    expect(await decrypt(Buffer.from(tampered.bytes).toString('base64'), 'right', FAST)).toBeNull();
    expect(await decrypt('not base64!', 'right', FAST)).toBeNull();
    expect(await decrypt('', 'right', FAST)).toBeNull();
  });
});
