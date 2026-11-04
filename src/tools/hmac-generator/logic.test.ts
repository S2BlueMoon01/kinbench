import { describe, expect, it } from 'vitest';
import { hmac, keyBytes } from './logic';

describe('hmac', () => {
  it('matches RFC 4231 test case 2', async () => {
    const r = await hmac('what do ya want for nothing?', keyBytes('Jefe', 'text')!, 'SHA-256');
    expect(r.hex).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
    expect(r.base64).toBe('W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM=');
  });

  it('accepts hex and Base64 keys', async () => {
    const hexKey = keyBytes('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'hex')!; // RFC 4231 test case 1
    expect((await hmac('Hi There', hexKey, 'SHA-512')).hex).toBe(
      '87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cdedaa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854',
    );
    expect(keyBytes('SmVmZQ==', 'base64')).toEqual(keyBytes('Jefe', 'text'));
  });

  it('signs an empty message', async () => {
    expect((await hmac('', keyBytes('key', 'text')!, 'SHA-1')).hex).toBe('f42bb0eeb018ebbd4597ae7213711ec60760843f');
  });

  it('rejects empty or malformed keys', () => {
    expect(keyBytes('', 'text')).toBeNull();
    expect(keyBytes('abc', 'hex')).toBeNull();
    expect(keyBytes('zz', 'hex')).toBeNull();
    expect(keyBytes('$$$', 'base64')).toBeNull();
  });
});
