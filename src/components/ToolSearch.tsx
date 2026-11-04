'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { searchTools, type SearchItem } from '@/lib/search';
import { cn } from '@/lib/utils';

export type SearchLabels = { label: string; placeholder: string; empty: string };
type Props = { items: SearchItem[]; labels: SearchLabels; icon: ReactNode; listAllWhenEmpty?: boolean; autoFocus?: boolean; onNavigate?: () => void; className?: string };

/** Combobox over the tool list: type to filter, arrows to move, Enter to open. Strings and icon come from the server. */
export function ToolSearch({ items, labels, icon, listAllWhenEmpty, autoFocus, onNavigate, className }: Props) {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const open = listAllWhenEmpty || query.trim() !== '';
  const results = useMemo(() => (open ? searchTools(items, query) : []), [items, query, open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (e.key === 'ArrowDown' ? Math.min(results.length - 1, a + 1) : Math.max(0, a - 1)));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      router.push(results[active].href);
      onNavigate?.();
    }
  }

  return (
    <div className={className}>
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground [&_svg]:size-4.5">{icon}</span>
        <input
          type="search"
          role="combobox"
          aria-label={labels.label}
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={results[active] ? `${id}-${active}` : undefined}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder={labels.placeholder}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={onKeyDown}
          className="h-12 w-full rounded-xl border border-input bg-card pr-4 pl-11 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {open && (
        <ul id={`${id}-list`} role="listbox" aria-label={labels.label} className="mt-2 max-h-[min(60vh,28rem)] overflow-y-auto">
          {results.map((r, i) => (
            <li key={r.slug} id={`${id}-${i}`} role="option" aria-selected={i === active}>
              <Link
                href={r.href}
                tabIndex={-1}
                onClick={onNavigate}
                onMouseMove={() => setActive(i)}
                className={cn('flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm', i === active && 'bg-accent text-accent-foreground')}
              >
                <span className="font-medium">{r.title}</span>
                <span className="truncate text-xs text-muted-foreground">{r.category}</span>
              </Link>
            </li>
          ))}
          {results.length === 0 && <li role="presentation" className="px-3 py-4 text-sm text-muted-foreground">{labels.empty}</li>}
        </ul>
      )}
    </div>
  );
}
