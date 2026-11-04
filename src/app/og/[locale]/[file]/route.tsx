import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { ogImage } from '@/lib/og';
import { getTool, tools } from '@/tools/registry';

// A Route Handler rather than opengraph-image.tsx: static export writes these as real .png files (served as
// image/png by any host), and pageMetadata links them explicitly, so no page loses its image to metadata merging.
export const dynamic = 'force-static';
export const dynamicParams = false;
export const generateStaticParams = () =>
  routing.locales.flatMap((locale) => ['site.png', ...tools.map((t) => `${t.slug}.png`)].map((file) => ({ locale, file })));

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; file: string }> }) {
  const { locale, file } = await params;
  const t = await getTranslations({ locale: locale as Locale });
  const tool = getTool(file.replace(/\.png$/, ''));
  const badge = t('site.og.badge');
  return tool
    ? ogImage({ eyebrow: t(`site.categories.${tool.category}.name`), title: t(`tools.${tool.slug}.title`), badge })
    : ogImage({ eyebrow: t('site.tagline'), title: t('home.title'), badge });
}
