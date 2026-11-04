import { setRequestLocale } from 'next-intl/server';
import type { Locale } from 'next-intl';
import { CategoryNav } from '@/components/CategoryNav';

export default async function ToolsLayout({ children, params }: LayoutProps<'/[locale]'>) {
  setRequestLocale((await params).locale as Locale);
  return (
    <div className="mx-auto grid max-w-screen-2xl gap-10 px-4 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto py-8">
          <CategoryNav />
        </div>
      </aside>
      <main id="main" className="min-w-0 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
