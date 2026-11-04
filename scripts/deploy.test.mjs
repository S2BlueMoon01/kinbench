import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { headers, pathHeaders } from '../csp.config.mjs';
import { vercelJson } from './postbuild.mjs';

// The nginx files are written by hand, so this catches drift from csp.config.mjs (_headers and
// vercel.json are generated from it at build time).
const addHeaders = (conf) => [...conf.matchAll(/add_header ([\w-]+) "([^"]*)" always;/g)].map(([, k, v]) => [k, v]);

describe('deploy configs', () => {
  it('nginx sends exactly the configured headers', () => {
    expect(Object.fromEntries(addHeaders(readFileSync('deploy/nginx-security-headers.conf', 'utf8')))).toEqual(headers);
  });

  it('nginx gives the runner worker its own CSP', () => {
    const block = readFileSync('deploy/nginx.conf', 'utf8').split('location ~ ^/(runner|bench)\\.worker\\.js$ {')[1]?.split('}')[0] ?? '';
    expect(Object.fromEntries(addHeaders(block))).toEqual(pathHeaders['/runner.worker.js']);
    expect(pathHeaders['/bench.worker.js']).toEqual(pathHeaders['/runner.worker.js']);
    expect(block).toContain('include /etc/nginx/kinbench/nginx-security-headers.conf;');
  });

  it('vercel.json has clean URLs and every header rule', () => {
    const config = JSON.parse(vercelJson());
    expect(config.cleanUrls).toBe(true);
    expect(config.headers.map((h) => h.source)).toEqual(['/(.*)', '/runner.worker.js', '/bench.worker.js']);
    expect(config.headers[0].headers).toContainEqual({ key: 'Content-Security-Policy', value: headers['Content-Security-Policy'] });
  });
});
