import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { tools } from '@/tools/registry';
import type { SearchItem } from './search';

/** The tool list in the current language, built on the server and passed to client search components. */
export async function searchItems(locale: Locale): Promise<SearchItem[]> {
  const t = await getTranslations({ locale });
  return tools.map((tool) => ({
    slug: tool.slug,
    href: `/${locale}/tools/${tool.slug}`,
    title: t(`tools.${tool.slug}.title`),
    category: t(`site.categories.${tool.category}.name`),
  }));
}
