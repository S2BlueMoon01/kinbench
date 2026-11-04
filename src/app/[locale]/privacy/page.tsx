import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/privacy'>): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return pageMetadata(locale, '/privacy', t('metaTitle'), t('metaDescription'));
}

export default async function PrivacyPage({ params }: PageProps<'/[locale]/privacy'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const { privacy } = await getMessages();
  const { verify, ...sections } = privacy.sections;

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <PrivacyBadge />
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{privacy.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{privacy.intro}</p>
      {Object.entries(sections).map(([key, s]) => (
        <section key={key} className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{s.body}</p>
        </section>
      ))}
      <section className="mt-10 rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight">{verify.title}</h2>
        <ol className="mt-4 space-y-3">
          {Object.values(verify.steps).map((step, i) => (
            <li key={i} className="flex gap-3 leading-relaxed">
              <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-accent font-mono text-xs font-semibold text-accent-foreground">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
