import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import { routing } from '@/i18n/routing';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ServiceWorker } from '@/components/ServiceWorker';
import { SITE_URL } from '@/lib/site';
import '../globals.css';

// Fonts are downloaded at build time and served from our own origin. `subsets` only picks what is preloaded.
// Both sans subsets are preloaded: when Vietnamese letters arrived late, paragraphs re-wrapped (layout shift).
// Mono is not preloaded; where it sets a line's width (the breadcrumb), the layout must not depend on it.
const sans = Be_Vietnam_Pro({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600'], variable: '--font-be-vietnam' });
const mono = JetBrains_Mono({ subsets: ['latin'], preload: false, variable: '--font-jetbrains' });

export const metadata: Metadata = { metadataBase: new URL(SITE_URL) };
export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f6f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f14' },
  ],
};

export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        {/* No disableTransitionOnChange: it injects an inline <style>, which the CSP blocks. */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* No NextIntlClientProvider here: only tool pages need translations on the client. */}
          <Header />
          {children}
          <Footer />
          <ServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
