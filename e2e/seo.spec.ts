import { expect, test, type APIRequestContext } from '@playwright/test';
import { locales, messages } from './helpers';

type Locale = (typeof locales)[number];
const attr = (html: string, re: RegExp) => [...html.matchAll(re)].map((m) => m[1]);
const esc = (s: string) => s.replaceAll('&', '&amp;');
const slugs = Object.keys(messages.en.tools) as (keyof typeof messages.en.tools)[];

test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop-1440', 'static HTML is the same for every viewport'));

/** Title, description, canonical, hreflang and a real PNG social card: shared by every page. */
async function checkHead(request: APIRequestContext, locale: Locale, path: string, meta: { metaTitle: string; metaDescription: string }) {
  const html = await (await request.get(`/${locale}${path}`)).text();
  expect(html).toContain(`<html lang="${locale}"`);
  expect(html).toContain(`<title>${esc(meta.metaTitle)}</title>`);
  expect([...meta.metaDescription].length).toBeLessThanOrEqual(155);
  expect(html).toContain(`<meta name="description" content="${esc(meta.metaDescription)}"/>`);
  expect(attr(html, /<link rel="canonical" href="([^"]+)"/g)).toEqual([expect.stringMatching(new RegExp(`/${locale}${path}$`))]);
  const alternates = Object.fromEntries([...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  expect(Object.keys(alternates).sort()).toEqual(['en', 'vi', 'x-default']);
  expect(alternates['x-default']).toBe(alternates.en);
  expect(alternates.vi).toMatch(new RegExp(`/vi${path}$`));

  const [image] = attr(html, /<meta property="og:image" content="([^"]+)"/g);
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image"/>');
  const png = await request.get(new URL(image).pathname);
  expect(png.headers()['content-type']).toBe('image/png');
  expect([...(await png.body()).subarray(1, 4)].map((c) => String.fromCharCode(c)).join('')).toBe('PNG');
  return html;
}

for (const locale of locales) {
  const m = messages[locale];

  for (const slug of slugs) {
    test(`${locale} · ${slug}: head tags, JSON-LD and FAQ are in the static HTML`, async ({ request }) => {
      const t = m.tools[slug];
      const html = await checkHead(request, locale, `/tools/${slug}`, t);
      expect(html).toContain(`/og/${locale}/${slug}.png`);

      const ld = attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g).map((s) => JSON.parse(s));
      const graph = ld[0]['@graph'] as Record<string, unknown>[];
      expect(graph.map((n) => n['@type'])).toEqual(['WebApplication', 'FAQPage', 'BreadcrumbList']);
      expect(graph[0]).toMatchObject({ name: t.title, applicationCategory: 'DeveloperApplication', offers: { price: '0' }, inLanguage: locale });
      expect(graph[0].featureList).toEqual(Object.values(m.site.featureList));
      const questions = (graph[1].mainEntity as { name: string; acceptedAnswer: { text: string } }[]);
      expect(questions.map((q) => q.name)).toContain(m.site.faqPrivacy.q);
      expect(questions.length).toBeGreaterThanOrEqual(3);
      expect(questions.length).toBeLessThanOrEqual(5);
      expect((graph[2].itemListElement as unknown[]).length).toBe(3);

      // How-to and FAQ are server-rendered, not added by JS.
      expect(html).toContain(esc(Object.values(t.howTo)[0]));
      expect(html).toContain(esc(m.site.faqPrivacy.q));
    });
  }

  test(`${locale}: home, privacy, about and category pages have head tags`, async ({ request }) => {
    const home = await checkHead(request, locale, '', m.home);
    expect(home).toContain('"@type":"WebSite"');
    await checkHead(request, locale, '/privacy', m.privacy);
    await checkHead(request, locale, '/about', m.about);
    await checkHead(request, locale, '/category/format', {
      metaTitle: m.category.metaTitle.replace('{name}', m.site.categories.format.name),
      metaDescription: m.category.metaDescription.replace('{name}', m.site.categories.format.name),
    });
  });
}

test('sitemap lists every page in both languages with alternates, and robots points to it', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const urls = attr(xml, /<loc>([^<]+)<\/loc>/g);
  const pages = 3 + Object.keys(messages.en.site.categories).length + slugs.length; // home, privacy, about + categories + tools
  expect(urls.length).toBeGreaterThanOrEqual(2 * (3 + slugs.length));
  expect(urls.length).toBeLessThanOrEqual(2 * pages);
  for (const slug of slugs) for (const l of locales) expect(urls).toContainEqual(expect.stringMatching(new RegExp(`/${l}/tools/${slug}$`)));
  expect(xml).toContain('hreflang="x-default"');
  expect(await (await request.get('/robots.txt')).text()).toMatch(/Sitemap: \S+\/sitemap\.xml/);
});
