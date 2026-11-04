import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Locale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { categories, toolsIn, usedCategories, type Category } from '@/tools/registry';

export const dynamicParams = false;
export const generateStaticParams = () => usedCategories.map((category) => ({ category }));

export async function generateMetadata({ params }: PageProps<'/[locale]/category/[category]'>): Promise<Metadata> {
  const { locale, category } = await params;
  const t = await getTranslations({ locale: locale as Locale });
  const name = t(`site.categories.${category as Category}.name`);
  return pageMetadata(locale as Locale, `/category/${category}`, t('category.metaTitle', { name }), t('category.metaDescription', { name }));
}

export default async function CategoryPage({ params }: PageProps<'/[locale]/category/[category]'>) {
  const { locale, category: c } = await params;
  setRequestLocale(locale as Locale);
  if (!(c in categories)) notFound();
  const category = c as Category;
  const t = await getTranslations();
  const Icon = categories[category];
  const list = toolsIn(category);

  return (
    <div data-cat={category}>
      <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-(--cat-bg) text-(--cat-fg)">
          <Icon className="size-5" />
        </span>
        {t(`site.categories.${category}.name`)}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">{t(`site.categories.${category}.description`)}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{t('category.toolCount', { count: list.length })}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((tool) => (
          <li key={tool.slug}>
            <Link href={`/${locale}/tools/${tool.slug}`} className="flex h-full flex-col gap-2 rounded-2xl border bg-card p-5 transition-colors hover:border-ring">
              <tool.icon aria-hidden className="size-5 text-(--cat-fg)" />
              <span className="font-semibold">{t(`tools.${tool.slug}.title`)}</span>
              <span className="text-sm text-muted-foreground">{t(`tools.${tool.slug}.metaDescription`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
