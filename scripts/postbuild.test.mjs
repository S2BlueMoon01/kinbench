import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { addCspMeta, flattenedSegmentPath, headersFile } from './postbuild.mjs';

const sha = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;

describe('flattenedSegmentPath', () => {
  it('maps nested segment files to the names the client requests', () => {
    expect(flattenedSegmentPath('en/tools/x/__next.$d$locale/!KHRvb2xzKQ/tools/$d$slug/__PAGE__.txt')).toBe('en/tools/x/__next.$d$locale.!KHRvb2xzKQ.tools.$d$slug.__PAGE__.txt');
    expect(flattenedSegmentPath('en\\__next.$d$locale\\__PAGE__.txt')).toBe('en\\__next.$d$locale.__PAGE__.txt');
    expect(flattenedSegmentPath('en/__next.$d$locale.txt')).toBeNull();
    expect(flattenedSegmentPath('en/tools/x.html')).toBeNull();
  });
});

describe('addCspMeta', () => {
  it('hashes inline scripts only and puts the meta right after <meta charset>', () => {
    const html = '<html><head><meta charset="utf-8"><script src="/a.js"></script><script>self.x=1</script></head><body><script id="t">ệ()</script></body></html>';
    const out = addCspMeta(html);
    expect(out.startsWith('<html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy"')).toBe(true);
    expect(out).toContain(sha('self.x=1'));
    expect(out).toContain(sha('ệ()'));
    expect(out).not.toContain(sha(''));
  });

  it('refuses HTML without <head> or with a CSP already', () => {
    expect(() => addCspMeta('<p>x</p>')).toThrow();
    expect(() => addCspMeta(addCspMeta('<head></head>'))).toThrow();
  });
});

describe('headersFile', () => {
  it('gives every path its headers and the runner worker its own CSP', () => {
    const file = headersFile();
    expect(file.startsWith("/*\n  Content-Security-Policy: connect-src 'self'")).toBe(true);
    expect(file).toContain("/runner.worker.js\n  Content-Security-Policy: default-src 'none'; script-src 'self' 'unsafe-eval'\n");
  });
});
