import { expect, test } from '@playwright/test';
import { hasHorizontalScroll, locales, messages, trackProblems } from './helpers';
import { toolActions } from './tool-actions';

// json-formatter has its own, more detailed spec.
const slugs = (Object.keys(toolActions) as (keyof typeof toolActions)[]).filter((s) => s !== 'json-formatter');

for (const slug of slugs) {
  for (const locale of locales) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${slug} · ${locale} · ${theme}: loads and works`, async ({ page, context }, info) => {
        test.skip(info.project.name === 'tablet-768', 'tools are checked at 375 and 1440 px; the JSON spec also covers 768');
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await page.emulateMedia({ colorScheme: theme });
        const problems = await trackProblems(page);
        await page.goto(`/${locale}/tools/${slug}`);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages[locale].tools[slug].title);

        await toolActions[slug]({ page, locale, info, secret: `kinbench-secret-${Date.now()}` });

        expect(await hasHorizontalScroll(page)).toBe(false);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `e2e/screenshots/tools/${slug}-${info.project.name}-${locale}-${theme}.png`, fullPage: true });
        expect(problems).toEqual([]);
      });
    }
  }
}
