'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readRecent, type SearchItem } from '@/lib/search';

/** Tools opened before on this device, read from localStorage after mount (nothing in the static HTML). */
export function RecentTools({ items, title }: { items: SearchItem[]; title: string }) {
  const [recent, setRecent] = useState<SearchItem[]>([]);
  useEffect(() => setRecent(readRecent().flatMap((slug) => items.filter((i) => i.slug === slug))), [items]);
  if (recent.length === 0) return null;
  return (
    <section aria-labelledby="recent" className="mb-10">
      <h2 id="recent" className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {recent.map((r) => (
          <li key={r.slug}>
            <Link href={r.href} className="inline-flex min-h-11 items-center rounded-lg border bg-card px-3 text-sm hover:bg-muted">{r.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
