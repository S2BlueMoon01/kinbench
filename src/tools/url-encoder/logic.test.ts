import { describe, expect, it } from 'vitest';
import { decodeUrl, encodeUrl, parseUrl } from './logic';

describe('url encoder', () => {
  it('encodes a component or a full URL', () => {
    expect(encodeUrl('a b&c=ệ/?', 'component')).toBe('a%20b%26c%3D%E1%BB%87%2F%3F');
    expect(encodeUrl('https://x.dev/tìm kiếm?q=a b', 'full')).toBe('https://x.dev/t%C3%ACm%20ki%E1%BA%BFm?q=a%20b');
  });

  it('decodes, keeping reserved characters in full mode', () => {
    expect(decodeUrl('a%20b%26c%3D%E1%BB%87', 'component')).toBe('a b&c=ệ');
    expect(decodeUrl('a%20b%26c', 'full')).toBe('a b%26c');
  });

  it('handles empty input', () => {
    expect(encodeUrl('', 'component')).toBe('');
    expect(decodeUrl('', 'full')).toBe('');
    expect(parseUrl('')).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(decodeUrl('%E0%A4%A', 'component')).toBeNull();
    expect(encodeUrl('\uD800', 'component')).toBeNull();
    expect(parseUrl('not a url')).toBeNull();
  });

  it('parses a URL with decoded query parameters', () => {
    expect(parseUrl(' https://user:pw@api.kinbench.dev:8443/v1/items?q=a+b&tag=%E1%BB%87&tag=2#top ')).toEqual({
      protocol: 'https:',
      username: 'user',
      password: 'pw',
      hostname: 'api.kinbench.dev',
      port: '8443',
      pathname: '/v1/items',
      hash: '#top',
      params: [['q', 'a b'], ['tag', 'ệ'], ['tag', '2']],
    });
  });
});
