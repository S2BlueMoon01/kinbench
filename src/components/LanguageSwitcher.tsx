'use client';

import { usePathname } from 'next/navigation';

const locales = ['vi', 'en'] as const;

export function LanguageSwitcher({ locale, labels }: { locale: string; labels: Record<'label' | (typeof locales)[number], string> }) {
  const rest = usePathname().replace(/^\/[^/]+/, ''); // same page, other locale prefix
  return (
    <nav aria-label={labels.label} className="inline-flex rounded-lg border bg-muted/60 p-0.5 font-mono text-xs">
      {locales.map((l) => (
        // A plain <a>, not next/link: switching language swaps the root layout (<html lang>), and a client-side
        // swap re-renders next-themes' no-flash <script>, which React refuses to run on the client.
        <a
          key={l}
          href={`/${l}${rest}`}
          hrefLang={l}
          aria-current={l === locale ? 'true' : undefined}
          // Read by the "/" redirect page (public/index.html).
          onClick={() => { try { localStorage.setItem('kinbench:locale', l); } catch {} }}
          className="grid h-8 min-w-9 place-items-center rounded-md px-2 text-muted-foreground uppercase transition-colors hover:text-foreground aria-[current]:bg-card aria-[current]:text-foreground aria-[current]:shadow-sm pointer-coarse:h-10 pointer-coarse:min-w-11"
        >
          {l}
          <span className="sr-only" lang={l}> {labels[l]}</span>
        </a>
      ))}
    </nav>
  );
}
