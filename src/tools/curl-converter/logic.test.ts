import { describe, expect, it } from 'vitest';
import { parseCurl, toAxios, toFetch, tokenize } from './logic';

const parse = (cmd: string) => {
  const r = parseCurl(cmd);
  if (!r.ok) throw new Error(r.error);
  return r.request;
};

describe('tokenize', () => {
  it('handles quotes, $\'…\' escapes and line continuations', () => {
    expect(tokenize(`curl 'a b' "c \\"d\\"" $'e\\nf' g\\ h \\\n  -s`)).toEqual(['curl', 'a b', 'c "d"', 'e\nf', 'g h', '-s']);
  });
  it('rejects unterminated quotes', () => {
    expect(tokenize(`curl 'oops`)).toBeNull();
  });
});

describe('parseCurl', () => {
  it('reads a JSON POST with headers, as copied from DevTools', () => {
    const req = parse(`curl 'https://api.kinbench.dev/v1/items?x=1' \\
  -H 'Authorization: Bearer abc' \\
  -H 'content-type: application/json' \\
  --data-raw '{"name":"Kin","n":2}' \\
  --compressed`);
    expect(req).toEqual({
      url: 'https://api.kinbench.dev/v1/items?x=1',
      method: 'POST',
      headers: [['Authorization', 'Bearer abc'], ['content-type', 'application/json']],
      body: '{"name":"Kin","n":2}',
      form: null,
      ignored: [],
    });
    expect(toFetch(req)).toBe(`const response = await fetch("https://api.kinbench.dev/v1/items?x=1", {
  method: "POST",
  headers: {
    "Authorization": "Bearer abc",
    "content-type": "application/json"
  },
  body: JSON.stringify({
    "name": "Kin",
    "n": 2
  })
});
const data = await response.text();`);
    expect(toAxios(req)).toContain(`method: "post",\n  url: "https://api.kinbench.dev/v1/items?x=1",`);
    expect(toAxios(req)).toContain(`data: {\n    "name": "Kin",`);
  });

  it('handles -XPOST, bundled flags, --user, -G and form data', () => {
    expect(parse('curl -sSL -XPUT example.com -u me:pw')).toMatchObject({
      url: 'http://example.com',
      method: 'PUT',
      headers: [['Authorization', 'Basic bWU6cHc=']],
    });
    expect(parse('curl -G https://x.dev/s -d q=a --data-urlencode "t=b c"')).toMatchObject({ url: 'https://x.dev/s?q=a&t=b%20c', method: 'GET', body: null });
    const form = parse('curl -F name=Kin -F file=@photo.png https://x.dev/up');
    expect(form).toMatchObject({ method: 'POST', form: [['name', 'Kin'], ['file', '@photo.png']] });
    expect(toFetch(form)).toContain('form.append("file", fileInput.files[0]); // photo.png');
  });

  it('defaults to form encoding for -d and reports unknown flags', () => {
    expect(parse('curl -d a=1 --retry 3 https://x.dev')).toMatchObject({ headers: [['Content-Type', 'application/x-www-form-urlencoded']], body: 'a=1', ignored: ['--retry'] });
  });

  it('rejects empty input, other commands and a missing URL', () => {
    expect(parseCurl('')).toEqual({ ok: false, error: 'notCurl' });
    expect(parseCurl('wget https://x.dev')).toEqual({ ok: false, error: 'notCurl' });
    expect(parseCurl('curl -s')).toEqual({ ok: false, error: 'noUrl' });
    expect(parseCurl(`curl 'x`)).toEqual({ ok: false, error: 'quote' });
  });

  it('writes a plain GET without options', () => {
    expect(toFetch(parse('curl https://x.dev'))).toBe('const response = await fetch("https://x.dev");\nconst data = await response.text();');
  });
});
