import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { BRAND } from '@/lib/site';

export async function Footer() {
  const locale = await getLocale();
  const t = await getTranslations('ui.footer');
  const link = 'inline-flex min-h-11 items-center rounded-md hover:text-foreground';
  return (
    // On phones, clear the fixed action bar of tool pages (ToolCard marks it with data-action-bar).
    <footer className="border-t pb-[env(safe-area-inset-bottom)] max-sm:in-[body:has([data-action-bar])]:pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-6 text-sm text-muted-foreground sm:px-6">
        <span className="font-medium text-foreground">{BRAND}</span>
        <span>{t('note')}</span>
        <nav aria-label={t('label')} className="flex gap-5 sm:ml-auto">
          <Link href={`/${locale}/privacy`} className={link}>{t('privacy')}</Link>
          <Link href={`/${locale}/about`} className={link}>{t('about')}</Link>
        </nav>
      </div>
    </footer>
  );
}
