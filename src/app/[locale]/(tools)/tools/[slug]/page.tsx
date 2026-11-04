import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, type Locale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Faq } from '@/components/Faq';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { absoluteUrl, faqJsonLd, JsonLd, pageMetadata } from '@/lib/seo';
import { BRAND } from '@/lib/site';
import { ToolComponent } from '@/tools/components';
import { getTool, tools } from '@/tools/registry';

export const dynamicParams = false;
export const generateStaticParams = () => tools.map((t) => ({ slug: t.slug }));

export async function generateMetadata({ params }: PageProps<'/[locale]/tools/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  const t = await getTranslations({ locale: locale as Locale, namespace: `tools.${tool.slug}` });
  return pageMetadata(locale as Locale, `/tools/${tool.slug}`, t('metaTitle'), t('metaDescription'), `${tool.slug}.png`);
}

export default async function ToolPage({ params }: PageProps<'/[locale]/tools/[slug]'>) {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const tool = getTool(slug);
  if (!tool) notFound();

  const t = await getTranslations();
  const messages = await getMessages();
  const title = t(`tools.${tool.slug}.title`);
  const category = t(`site.categories.${tool.category}.name`);
  // Lists are objects with named keys in messages/*.json, because next-intl's typed keys break on arrays.
  const content = messages.tools[tool.slug];
  const howTo = Object.values(content.howTo);
  const whySafe = Object.values(messages.site.whySafe);
  const faq = [...Object.values(content.faq), messages.site.faqPrivacy];
  const crumbs = [
    { name: BRAND, path: '' },
    { name: category, path: `/category/${tool.category}` },
    { name: title, path: `/tools/${tool.slug}` },
  ];
  const h2 = 'text-xl font-semibold tracking-tight';

  return (
    <article>
      <nav aria-label={t('site.breadcrumb')}>
        {/* One line, last crumb truncated: wrapping depended on the mono font loading, which shifted the page (CLS). */}
        <ol className="flex items-center gap-1 font-mono text-xs whitespace-nowrap text-muted-foreground">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex min-w-0 items-center gap-1 not-last:shrink-0">
              {i > 0 && <ChevronRight aria-hidden className="size-3" />}
              {i < crumbs.length - 1 ? (
                <Link href={`/${locale}${c.path}`} className="rounded py-1 hover:text-foreground">{c.name}</Link>
              ) : (
                <span aria-current="page" className="truncate text-foreground">{c.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header className="mt-4 max-w-3xl" data-cat={tool.category}>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-(--cat-bg) text-(--cat-fg)">
            <tool.icon className="size-5" />
          </span>
          {title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">{t(`tools.${tool.slug}.intro`)}</p>
        <PrivacyBadge className="mt-4" />
      </header>

      <div className="mt-6">
        <NextIntlClientProvider messages={{ ui: { actions: messages.ui.actions }, tools: { [tool.slug]: { ui: content.ui } } }}>
          <ToolComponent slug={tool.slug} />
        </NextIntlClientProvider>
      </div>

      <div className="mt-14 grid max-w-5xl gap-10 md:grid-cols-2">
        <section>
          <h2 className={h2}>{t('site.toolPage.howTo')}</h2>
          <ol className="mt-4 space-y-3">
            {howTo.map((step, i) => (
              <li key={i} className="flex gap-3 leading-relaxed">
                <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-accent font-mono text-xs font-semibold text-accent-foreground">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className={h2}>{t('site.toolPage.whySafe')}</h2>
          <ul className="mt-4 space-y-3">
            {whySafe.map((line, i) => (
              <li key={i} className="flex gap-3 leading-relaxed">
                <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
                {line}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-14 max-w-3xl">
        <h2 className={h2}>{t('site.toolPage.faq')}</h2>
        <Faq items={faq} />
      </section>

      {tool.relatedTools.length > 0 && (
        <section className="mt-14">
          <h2 className={h2}>{t('site.toolPage.related')}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {tool.relatedTools.map((s) => (
              <li key={s}><Link href={`/${locale}/tools/${s}`} className="rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted">{t(`tools.${s as typeof tool.slug}.title`)}</Link></li>
            ))}
          </ul>
        </section>
      )}

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebApplication',
              name: title,
              description: t(`tools.${tool.slug}.metaDescription`),
              url: absoluteUrl(`/${locale}/tools/${tool.slug}`),
              inLanguage: locale,
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Any',
              browserRequirements: 'Requires JavaScript',
              isAccessibleForFree: true,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              featureList: Object.values(messages.site.featureList),
            },
            faqJsonLd(faq),
            {
              '@type': 'BreadcrumbList',
              itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(`/${locale}${c.path}`) })),
            },
          ],
        }}
      />
    </article>
  );
}
