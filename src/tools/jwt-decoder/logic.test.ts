import { describe, expect, it } from 'vitest';
import { decodeJwt, timeClaims, verifyHmac } from './logic';

// The jwt.io example token, signed with HS256 and the secret "your-256-bit-secret".
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

describe('decodeJwt', () => {
  it('decodes header and payload', () => {
    const r = decodeJwt(` ${TOKEN}\n`);
    expect(r.ok && r.jwt.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(r.ok && r.jwt.payload).toEqual({ sub: '1234567890', name: 'John Doe', iat: 1516239022 });
    expect(r.ok && timeClaims(r.jwt.payload)).toEqual([{ name: 'iat', date: new Date(1516239022000) }]);
  });

  it('rejects empty input', () => {
    expect(decodeJwt('')).toEqual({ ok: false, error: 'parts' });
  });

  it('says which part is broken', () => {
    expect(decodeJwt('a.b')).toEqual({ ok: false, error: 'parts' });
    expect(decodeJwt('bm9wZQ.e30.')).toEqual({ ok: false, error: 'header' });
    expect(decodeJwt('e30.bm9wZQ.')).toEqual({ ok: false, error: 'payload' });
    expect(decodeJwt('e30.e30.')).toMatchObject({ ok: true }); // {} . {} with an empty signature ("alg": "none")
  });
});

describe('verifyHmac', () => {
  it('verifies with the right secret only', async () => {
    const r = decodeJwt(TOKEN);
    if (!r.ok) throw new Error('decode failed');
    expect(await verifyHmac(r.jwt, 'your-256-bit-secret')).toBe(true);
    expect(await verifyHmac(r.jwt, 'wrong')).toBe(false);
    expect(await verifyHmac({ ...r.jwt, header: { alg: 'RS256' } }, 'your-256-bit-secret')).toBe(false);
  });
});
