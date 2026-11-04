import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('the preview frame policy allows exactly its own script and no network', () => {
  const html = readFileSync('public/html-preview.html', 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
  const hash = createHash('sha256').update(script, 'utf8').digest('base64');
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)![1];
  expect(csp).toBe(`default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'`);
});
