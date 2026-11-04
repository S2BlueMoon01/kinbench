import { expect, test, type Request } from '@playwright/test';
import { locales, messages, trackProblems } from './helpers';

const isPhone = (name: string) => name === 'mobile-375';

for (const locale of locales) {
  const m = messages[locale];

  test(`${locale}: home search finds tools without diacritics and opens them`, async ({ page }) => {
    const problems = await trackProblems(page);
    await page.goto(`/${locale}`);
    const search = page.getByRole('main').getByRole('combobox', { name: m.ui.search.label });
    await search.fill(locale === 'vi' ? 'dem ky' : 'count');
    await expect(page.getByRole('option', { name: new RegExp(m.tools['text-counter'].title) })).toBeVisible();
    await search.fill('zzz');
    await expect(page.getByText(m.ui.search.empty)).toBeVisible();
    await search.fill('jwt');
    await search.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/${locale}/tools/jwt-decoder$`));
    expect(problems).toEqual([]);
  });

  test(`${locale}: command palette opens with Ctrl+K or the header button`, async ({ page }, info) => {
    await page.goto(`/${locale}/tools/json-formatter`);
    const dialog = page.getByRole('dialog', { name: m.ui.search.label });
    // Retried: the shortcut only works once the page has hydrated.
    await expect(async () => {
      if (isPhone(info.project.name)) await page.getByRole('button', { name: m.ui.search.open }).click();
      else await page.keyboard.press('Control+k');
      await expect(dialog).toBeVisible({ timeout: 500 });
    }).toPass();
    await expect(dialog.getByRole('option')).toHaveCount(Object.keys(m.tools).length);
    await page.keyboard.type('hash');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/${locale}/tools/hash-generator$`));
    await expect(dialog).toBeHidden();
  });
}

test('recently used tools are listed on the home page, storing slugs only', async ({ page }) => {
  const m = messages.en;
  await page.goto('/en/tools/base64');
  await page.getByLabel(m.tools.base64.ui.input, { exact: true }).fill('private text');
  await page.goto('/en/tools/uuid-generator');
  await expect(page.getByLabel(m.tools['uuid-generator'].ui.output, { exact: true })).not.toHaveValue(''); // hydrated, visit recorded
  await page.goto('/en');
  const recent = page.getByRole('region', { name: m.home.recentTitle });
  await expect(recent.getByRole('link')).toHaveText([m.tools['uuid-generator'].title, m.tools.base64.title]);
  const stored = await page.evaluate(() => ({ ...localStorage }));
  expect(JSON.stringify(stored)).not.toContain('private text');
  expect(JSON.parse(stored['kinbench:recent'])).toEqual(['uuid-generator', 'base64']);
});

test('privacy page is linked from every page and explains how to verify', async ({ page }) => {
  const m = messages.vi;
  await page.goto('/vi/tools/json-formatter');
  await page.getByRole('contentinfo').getByRole('link', { name: m.ui.footer.privacy }).click();
  await expect(page).toHaveURL(/\/vi\/privacy$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.privacy.title);
  await expect(page.getByText(m.privacy.sections.verify.steps.check)).toBeVisible();
});

test('Markdown preview drops inline event handlers, and the CSP blocks them before they could run', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-1440', 'does not depend on the viewport');
  const blocked: string[] = [];
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => console.log(`CSP ${e.violatedDirective}`)));
  page.on('console', (m) => m.text().startsWith('CSP ') && blocked.push(m.text()));
  await page.goto('/en/tools/markdown-preview');
  await page.locator('#md-input').fill('<a href="https://x.dev" onclick="window.__pwned = 1">link</a> <img src="x" onerror="window.__pwned = 2">');
  const link = page.locator('.markdown a');
  await expect(link).toHaveText('link');
  await expect(link).not.toHaveAttribute('onclick');
  await expect(page.locator('.markdown img')).not.toHaveAttribute('onerror');
  await link.click({ modifiers: ['ControlOrMeta'] }); // opens a new tab; the page itself must stay untouched
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  // DOMPurify parses with DOMParser, whose document inherits this page's CSP: the handlers are refused there.
  expect(blocked.length).toBeGreaterThan(0);
  expect(new Set(blocked)).toEqual(new Set(['CSP script-src-attr']));
});

test('HTML preview runs no script and loads nothing from other servers', async ({ page, context, baseURL }, info) => {
  test.skip(info.project.name !== 'desktop-1440', 'does not depend on the viewport');
  const outside: Request[] = [];
  context.on('request', (r) => new URL(r.url()).origin !== new URL(baseURL!).origin && !r.url().startsWith('data:') && outside.push(r));
  await page.goto('/en/tools/html-preview');
  await page.locator('#html-input').fill(
    '<meta http-equiv="refresh" content="0;url=https://example.com/refresh"><link rel="stylesheet" href="https://example.com/x.css"><link rel="preconnect" href="https://example.org">' +
      '<style>@import url(https://example.com/i.css); body { background: url(https://example.com/bg.png) }</style>' +
      '<img src="https://example.com/x.png" onerror="document.body.dataset.ran = 1"><img alt="inline" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">' +
      '<iframe src="https://example.com/frame"></iframe><form action="https://example.com/f"><button>send</button></form><p>ok</p>',
  );
  const frame = page.frameLocator('iframe[sandbox]');
  await expect(frame.getByText('ok')).toBeVisible();
  await frame.getByRole('button', { name: 'send' }).click();
  await page.waitForLoadState('networkidle');
  await expect(frame.locator('body')).not.toHaveAttribute('data-ran');
  await expect(frame.locator('link, meta[http-equiv]')).toHaveCount(0);
  await expect(frame.getByText('ok')).toBeVisible(); // still the preview: no refresh, no form submission
  // Chromium reports CSP-refused loads as requests that failed with "csp"; they never reach the network.
  expect(outside.length).toBeGreaterThan(0);
  expect(outside.filter((r) => r.failure()?.errorText !== 'csp').map((r) => r.url())).toEqual([]);
});

test('image tools take a pasted screenshot (Ctrl+V)', async ({ page }, info) => {
  test.skip(info.project.name === 'tablet-768', 'covered at 375 and 1440');
  await page.goto('/vi/tools/image-converter');
  const m = messages.vi.tools['image-converter'].ui;
  await expect(page.getByText(messages.vi.ui.actions.orPaste)).toBeVisible();
  const paste = (w: number, h: number) =>
    page.evaluate(async ([w, h]) => {
      const canvas = new OffscreenCanvas(w, h);
      canvas.getContext('2d')!.fillRect(0, 0, w, h);
      const data = new DataTransfer();
      data.items.add(new File([await canvas.convertToBlob({ type: 'image/png' })], 'image.png', { type: 'image/png' }));
      document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
    }, [w, h]);
  const shown = (w: number, h: number) => page.getByText(`WEBP · ${m.dimensions.replace('{width}', String(w)).replace('{height}', String(h))}`);
  // Retried until the page has hydrated and listens for paste.
  await expect(async () => {
    await paste(40, 30);
    await expect(shown(40, 30)).toBeVisible({ timeout: 2000 });
  }).toPass();
  await paste(60, 20); // a second paste replaces the image
  await expect(shown(60, 20)).toBeVisible();
});

test('a visited tool keeps working offline', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop-1440', 'service worker behaviour does not depend on the viewport');
  const m = messages.en.tools['json-formatter'].ui;
  await page.goto('/en/tools/json-formatter');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.getByLabel(m.input, { exact: true }).fill('{"a":1}'); // loads the parser chunk through the worker
  await expect(page.getByLabel(m.output, { exact: true })).toHaveValue('{\n  "a": 1\n}');
  await page.waitForFunction(async () => !!(await (await caches.open('kinbench-v1')).match('/en/tools/json-formatter')));

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.en.tools['json-formatter'].title);
  await page.getByLabel(m.input, { exact: true }).fill('[1,2]');
  await expect(page.getByLabel(m.output, { exact: true })).toHaveValue('[\n  1,\n  2\n]');
  await context.setOffline(false);
});
