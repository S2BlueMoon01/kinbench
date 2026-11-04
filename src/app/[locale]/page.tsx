import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Faq } from '@/components/Faq';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { RecentTools } from '@/components/RecentTools';
import { ToolSearch } from '@/components/ToolSearch';
import { searchItems } from '@/lib/searchItems';
import { absoluteUrl, faqJsonLd, JsonLd, pageMetadata } from '@/lib/seo';
import { BRAND } from '@/lib/site';
import { categories, toolsIn, usedCategories } from '@/tools/registry';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'home' });
  return pageMetadata(locale, '', t('metaTitle'), t('metaDescription'));
}

export default async function Home({ params }: PageProps<'/[locale]'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations();
  const items = await searchItems(locale);
  const messages = await getMessages();
  const faq = Object.values(messages.home.faq);
  const h2 = 'text-xl font-semibold tracking-tight';

  return (
    <main id="main" className="mx-auto max-w-screen-2xl px-4 pb-20 sm:px-6">
      <section className="max-w-3xl py-14 sm:py-24">
        <PrivacyBadge />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">{t('home.title')}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t('home.subtitle')}</p>
        <ToolSearch
          items={items}
          labels={{ label: t('ui.search.label'), placeholder: t('ui.search.placeholder'), empty: t('ui.search.empty') }}
          icon={<Search />}
          className="mt-8 max-w-xl"
        />
      </section>
      <RecentTools items={items} title={t('home.recentTitle')} />
      <section aria-labelledby="categories">
        <h2 id="categories" className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">{t('home.categoriesTitle')}</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {usedCategories.map((c) => {
            const Icon = categories[c];
            return (
              <li key={c} data-cat={c} className="flex flex-col rounded-2xl border bg-card p-5">
                <Link href={`/${locale}/category/${c}`} className="group flex items-center gap-3 font-semibold">
                  <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-(--cat-bg) text-(--cat-fg)">
                    <Icon className="size-4.5" />
                  </span>
                  {t(`site.categories.${c}.name`)}
                  <ArrowRight aria-hidden className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
                <p className="mt-2 text-sm text-muted-foreground">{t(`site.categories.${c}.description`)}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {toolsIn(c).map((tool) => (
                    <li key={tool.slug}>
                      <Link href={`/${locale}/tools/${tool.slug}`} className="inline-flex rounded-lg bg-muted px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground pointer-coarse:py-3">
                        {t(`tools.${tool.slug}.title`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>
      <div className="mt-20 grid max-w-5xl gap-10 md:grid-cols-2">
        <section aria-labelledby="why-safe">
          <h2 id="why-safe" className={h2}>{t('home.whySafeTitle')}</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">{t('home.whySafeIntro')}</p>
          <ul className="mt-4 space-y-3">
            {Object.values(messages.site.whySafe).map((line, i) => (
              <li key={i} className="flex gap-3 leading-relaxed">
                <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-6">
            <Link href={`/${locale}/privacy`} className="font-medium text-link underline underline-offset-4 hover:no-underline">{t('about.privacyLink')}</Link>
          </p>
        </section>
        <section aria-labelledby="faq">
          <h2 id="faq" className={h2}>{t('site.toolPage.faq')}</h2>
          <Faq items={faq} />
        </section>
      </div>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'WebSite', name: BRAND, url: absoluteUrl(`/${locale}`), inLanguage: locale, description: t('home.metaDescription') },
            { '@type': 'Organization', name: BRAND, url: absoluteUrl('/'), logo: absoluteUrl('/icon.svg') },
            faqJsonLd(faq),
          ],
        }}
      />
    </main>
  );
}
