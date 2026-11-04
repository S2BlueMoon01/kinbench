import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { absoluteUrl } from '@/lib/seo';
import { tools, usedCategories } from '@/tools/registry';

export const dynamic = 'force-static';

const paths = ['', '/privacy', '/about', ...usedCategories.map((c) => `/category/${c}`), ...tools.map((t) => `/tools/${t.slug}`)];

/** Every page in both languages, each listing its vi/en/x-default alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) => {
    const languages = { vi: absoluteUrl(`/vi${path}`), en: absoluteUrl(`/en${path}`), 'x-default': absoluteUrl(`/en${path}`) };
    return routing.locales.map((locale) => ({ url: absoluteUrl(`/${locale}${path}`), alternates: { languages } }));
  });
}
