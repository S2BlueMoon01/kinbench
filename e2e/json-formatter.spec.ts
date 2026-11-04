import { expect, test } from '@playwright/test';
import { hasHorizontalScroll, locales, messages, trackProblems } from './helpers';

for (const locale of locales) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${locale} · ${theme}: formats, minifies and points at errors`, async ({ page }, info) => {
      const m = messages[locale].tools['json-formatter'].ui;
      await page.emulateMedia({ colorScheme: theme });
      const problems = await trackProblems(page);
      await page.goto(`/${locale}/tools/json-formatter`);

      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages[locale].tools['json-formatter'].title);

      const input = page.getByLabel(m.input, { exact: true });
      const output = page.getByLabel(m.output, { exact: true });
      await input.fill('{"id":12345678901234567890,"b":[1,2]}');
      await expect(output).toHaveValue('{\n  "id": 12345678901234567890,\n  "b": [\n    1,\n    2\n  ]\n}');
      await page.getByText(m.minify, { exact: true }).click();
      await expect(output).toHaveValue('{"id":12345678901234567890,"b":[1,2]}');
      await page.getByText(m.format, { exact: true }).click();

      await input.fill('{\n  "a": 1\n  "b": 2\n}');
      const error = page.locator('#json-error');
      await expect(error).toContainText(m.errors.CommaExpected);
      await expect(error).toContainText(m.errorAt.replace('{line}', '3').replace('{column}', '3'));
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await page.screenshot({ path: `e2e/screenshots/${info.project.name}-${locale}-${theme}-error.png` });

      await page.getByRole('button', { name: messages[locale].ui.actions.clear }).click();
      await page.getByRole('button', { name: m.sample }).click();
      await expect(output).toHaveValue(/12345678901234567890/);
      expect(await hasHorizontalScroll(page)).toBe(false);

      if (locale === 'vi') {
        // Both fonts must load their Vietnamese subset (sample text renders "ệ ữ ở ặ ỹ" in mono and sans).
        const loaded = await page.evaluate(async () => {
          await document.fonts.ready;
          return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.unicodeRange}`);
        });
        expect(loaded.some((f) => /Vietnam/i.test(f) && f.includes('U+1EA0'))).toBe(true);
        expect(loaded.some((f) => /JetBrains/i.test(f) && f.includes('U+1EA0'))).toBe(true);
      }

      if (info.project.name === 'mobile-375') {
        // The action bar must stay within thumb reach at the bottom of the screen, not of the card.
        const copy = await page.getByRole('button', { name: messages[locale].ui.actions.copy }).boundingBox();
        const viewport = page.viewportSize()!;
        expect(copy!.y + copy!.height).toBeGreaterThan(viewport.height - 80);
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `e2e/screenshots/${info.project.name}-${locale}-${theme}.png`, fullPage: true });
      expect(problems).toEqual([]);
    });
  }
}

test('input is not persisted unless "remember" is on', async ({ page }, info) => {
  const m = messages.en;
  await page.goto('/en/tools/json-formatter');
  // On phones the options panel is collapsed behind a button.
  const openOptions = () => info.project.name === 'mobile-375' && page.getByRole('button', { name: m.ui.actions.options }).click();
  const input = page.getByLabel(m.tools['json-formatter'].ui.input, { exact: true });
  await input.fill('{"a":1}');
  await page.reload();
  await expect(input).toHaveValue('');

  await openOptions();
  await page.getByLabel(m.ui.actions.remember).check({ force: true });
  await input.fill('{"kept":true}');
  await page.reload();
  await expect(input).toHaveValue('{"kept":true}');

  await openOptions();
  await page.getByLabel(m.ui.actions.remember).uncheck({ force: true });
  await page.reload();
  await expect(input).toHaveValue('');
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('kinbench:input:')))).toEqual([]);
});

test('language switch keeps the tool, and "/" honours the saved choice', async ({ page }) => {
  await page.goto('/vi/tools/json-formatter');
  await page.getByRole('link', { name: /^en\b/i }).click();
  await expect(page).toHaveURL(/\/en\/tools\/json-formatter$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto('/');
  await expect(page).toHaveURL(/\/en$/);
  await page.evaluate(() => localStorage.setItem('kinbench:locale', 'vi'));
  await page.goto('/');
  await expect(page).toHaveURL(/\/vi$/);
});

test('theme choice persists across reloads without a flash', async ({ page }, info) => {
  const m = messages.en.ui;
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/en/tools/json-formatter');
  if (info.project.name === 'mobile-375') await page.getByRole('button', { name: m.nav.openMenu }).click();
  await page.getByRole('radiogroup', { name: m.theme.label }).getByText(m.theme.dark).locator('..').click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await page.reload({ waitUntil: 'commit' });
  // next-themes' inline script runs before first paint; check right after the DOM is parsed.
  await page.waitForLoadState('domcontentloaded');
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
});

test('mobile drawer opens, lists the tool and closes on navigation', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop-1440', 'drawer is only shown below 1024px');
  const m = messages.en;
  await page.goto('/en');
  await page.getByRole('button', { name: m.ui.nav.openMenu }).click();
  const drawer = page.getByRole('dialog', { name: m.ui.nav.tools });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('link', { name: m.tools['json-formatter'].title }).click();
  await expect(page).toHaveURL(/\/en\/tools\/json-formatter$/);
  await expect(drawer).toBeHidden();
});
