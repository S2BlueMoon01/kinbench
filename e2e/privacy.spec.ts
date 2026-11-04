import { statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Request } from '@playwright/test';
import { toolActions } from './tool-actions';

/** True if the path is a file of the static build (clean URLs map to .html or index.html, like the host does). */
const isBuiltFile = (pathname: string) =>
  ['', '.html', '/index.html'].some((ext) => {
    try { return statSync(join('out', decodeURIComponent(pathname) + ext)).isFile(); } catch { return false; }
  });

// Backs the "nothing is uploaded" claim in the UI, FAQ and SEO copy: using each tool may only load
// same-origin GETs of files that exist in the static build (code chunks, workers, codecs, pages the service
// worker caches), never send anything.
for (const slug of Object.keys(toolActions) as (keyof typeof toolActions)[]) {
  test(`using ${slug} sends no request carrying user data`, async ({ page, context, baseURL }, info) => {
    test.skip(info.project.name !== 'desktop-1440', 'network behaviour does not depend on the viewport');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`/en/tools/${slug}`);
    await page.waitForLoadState('networkidle');

    // Context-level, so requests from workers are included too.
    const requests: Request[] = [];
    context.on('request', (r) => requests.push(r));
    const secret = `kinbench-secret-${Date.now()}`;
    await toolActions[slug]({ page, locale: 'en', info, secret });
    await page.waitForLoadState('networkidle');

    const origin = new URL(baseURL!).origin;
    for (const r of requests) {
      const url = new URL(r.url());
      expect(r.url()).not.toContain(secret);
      expect(r.postData()).toBeNull();
      expect(r.method()).toBe('GET');
      if (url.protocol === 'blob:' || url.protocol === 'data:') continue; // created in-page (downloads, previews)
      expect(url.origin).toBe(origin);
      expect(isBuiltFile(url.pathname), url.pathname).toBe(true);
    }
  });
}

test('the Content-Security-Policy blocks requests to other servers', async ({ page }) => {
  await page.goto('/en/tools/json-formatter');
  const result = await page.evaluate(async () => {
    const violation = new Promise<string>((resolve) => document.addEventListener('securitypolicyviolation', (e) => resolve(e.violatedDirective)));
    const fetched = await fetch('https://example.com/collect', { method: 'POST', body: 'data' }).then(() => 'sent', () => 'blocked');
    return { fetched, directive: await violation };
  });
  expect(result).toEqual({ fetched: 'blocked', directive: 'connect-src' });
});
