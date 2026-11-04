import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { BRAND, SITE_URL } from './site';

const ogLocale: Record<Locale, string> = { vi: 'vi_VN', en: 'en_US' };

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).href;

/**
 * Title, description, canonical + hreflang (vi, en, x-default → en) and social cards for one page.
 * `ogImage` names a card rendered by app/og/[locale]/[file]: "<tool slug>.png" or the generic "site.png".
 */
export function pageMetadata(locale: Locale, path: string, title: string, description: string, ogImage = 'site.png'): Metadata {
  const url = `/${locale}${path}`;
  const image = { url: `/og/${locale}/${ogImage}`, width: 1200, height: 630, type: 'image/png' };
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
      languages: { vi: `/vi${path}`, en: `/en${path}`, 'x-default': `/en${path}` },
    },
    openGraph: { type: 'website', siteName: BRAND, title, description, url, locale: ogLocale[locale], images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  };
}

export const faqJsonLd = (items: { q: string; a: string }[]) => ({
  '@type': 'FAQPage',
  mainEntity: items.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

export function JsonLd({ data }: { data: object }) {
  // Escape "<" so user-visible text can never close the script element.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
