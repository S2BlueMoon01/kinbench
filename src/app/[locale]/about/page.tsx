import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/about'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'about' });
  return pageMetadata(locale, '/about', t('metaTitle'), t('metaDescription'));
}

export default async function AboutPage({ params }: PageProps<'/[locale]/about'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const { about } = await getMessages();

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{about.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{about.intro}</p>
      {Object.entries(about.sections).map(([key, s]) => (
        <section key={key} className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{s.body}</p>
        </section>
      ))}
      <p className="mt-10">
        <Link href={`/${locale}/privacy`} className="font-medium text-link underline underline-offset-4 hover:no-underline">{about.privacyLink}</Link>
      </p>
    </main>
  );
}
