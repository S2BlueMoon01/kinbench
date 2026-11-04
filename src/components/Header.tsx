import Link from 'next/link';
import { Menu, Monitor, Moon, Search, Sun, X } from 'lucide-react';
import { getLocale, getMessages } from 'next-intl/server';
import { LOGO_SVG } from '@/lib/logo';
import { searchItems } from '@/lib/searchItems';
import { BRAND } from '@/lib/site';
import type { Locale } from 'next-intl';
import { CategoryNav } from './CategoryNav';
import { CommandPalette } from './CommandPalette';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NavDrawer } from './NavDrawer';
import { ThemeToggle } from './ThemeToggle';

export async function Header() {
  const locale = (await getLocale()) as Locale;
  const { ui } = await getMessages();
  const themeOptions = ([['light', Sun], ['dark', Moon], ['system', Monitor]] as const).map(([value, Icon]) => ({
    value,
    label: <><Icon aria-hidden className="size-4" /><span className="sr-only">{ui.theme[value]}</span></>,
  }));
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md supports-backdrop-filter:bg-background/65">
      <a href="#main" className="sr-only rounded-md bg-card px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50">
        {ui.nav.skip}
      </a>
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-2 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6">
        <NavDrawer
          labels={ui.nav}
          icons={{ menu: <Menu aria-hidden />, close: <X aria-hidden /> }}
          footer={<ThemeToggle label={ui.theme.label} options={themeOptions} />}
        >
          <CategoryNav />
        </NavDrawer>
        <Link href={`/${locale}`} className="flex items-center gap-2.5 rounded-md py-2 font-semibold tracking-tight">
          <span aria-hidden className="size-7 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
          {BRAND}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <CommandPalette items={await searchItems(locale)} labels={ui.search} icon={<Search aria-hidden />} />
          <LanguageSwitcher locale={locale} labels={ui.language} />
          <ThemeToggle label={ui.theme.label} options={themeOptions} className="hidden sm:flex" />
        </div>
      </div>
    </header>
  );
}
