import { describe, expect, it } from 'vitest';
import { bytesToBase64, decodeBase64, encodeText } from './logic';

describe('base64', () => {
  it('encodes and decodes UTF-8 text', () => {
    expect(encodeText('Xin chào ệ')).toBe('WGluIGNow6BvIOG7hw==');
    expect(decodeBase64('WGluIGNow6BvIOG7hw==')).toMatchObject({ ok: true, text: 'Xin chào ệ' });
  });

  it('accepts URL-safe input, missing padding and line breaks', () => {
    expect(decodeBase64('-_8')).toMatchObject({ ok: true, text: null, bytes: new Uint8Array([0xfb, 0xff]) });
    expect(decodeBase64('aGVs\nbG8')).toMatchObject({ ok: true, text: 'hello' });
  });

  it('reports binary data without text', () => {
    const r = decodeBase64(bytesToBase64(new Uint8Array([0, 1, 2, 255])));
    expect(r).toMatchObject({ ok: true, text: null });
    expect(r.ok && [...r.bytes]).toEqual([0, 1, 2, 255]);
  });

  it('handles large input without overflowing the stack', () => {
    const big = new Uint8Array(3_000_000).fill(65);
    expect(bytesToBase64(big)).toHaveLength(4_000_000);
  });

  it('returns empty results for empty input', () => {
    expect(encodeText('')).toBe('');
    expect(decodeBase64('')).toMatchObject({ ok: true, text: '' });
  });

  it('rejects invalid input', () => {
    expect(decodeBase64('abc$')).toEqual({ ok: false });
    expect(decodeBase64('a')).toEqual({ ok: false });
  });
});
