import { getLocale, getTranslations } from 'next-intl/server';
import { categories, toolsIn, usedCategories } from '@/tools/registry';
import { NavLink } from './NavLink';

export async function CategoryNav() {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <nav aria-label={t('ui.nav.tools')}>
      <ul className="space-y-6">
        {usedCategories.map((c) => {
          const Icon = categories[c];
          return (
            <li key={c} data-cat={c}>
              <NavLink
                href={`/${locale}/category/${c}`}
                className="flex items-center gap-2.5 rounded-md px-2 py-1 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground aria-[current=page]:text-foreground pointer-coarse:py-2.5"
              >
                <span className="grid size-6 place-items-center rounded-md bg-(--cat-bg) text-(--cat-fg)">
                  <Icon aria-hidden className="size-3.5" />
                </span>
                {t(`site.categories.${c}.name`)}
              </NavLink>
              <ul className="mt-1.5 ml-5 border-l pl-2">
                {toolsIn(c).map((tool) => (
                  <li key={tool.slug}>
                    <NavLink
                      href={`/${locale}/tools/${tool.slug}`}
                      className="block rounded-md px-3 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground pointer-coarse:py-3"
                    >
                      {t(`tools.${tool.slug}.title`)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
