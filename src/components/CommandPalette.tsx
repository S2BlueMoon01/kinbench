'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { SearchItem } from '@/lib/search';
import { ToolSearch, type SearchLabels } from './ToolSearch';

type Props = { items: SearchItem[]; labels: SearchLabels & { open: string }; icon: ReactNode };

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

/** Ctrl/⌘+K anywhere, or the header button, opens tool search in a native <dialog>. */
export function CommandPalette({ items, labels, icon }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(0); // bumping it remounts the search: empty query, focused input
  const mac = useSyncExternalStore(() => () => {}, isMac, () => false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpened((n) => n + 1);
        if (!ref.current?.open) ref.current?.showModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => { setOpened((n) => n + 1); ref.current?.showModal(); }}
        className="flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground hover:text-foreground pointer-coarse:h-11 max-md:size-11 max-md:justify-center max-md:border-0 max-md:bg-transparent [&_svg]:size-4 max-md:[&_svg]:size-5"
      >
        {icon}
        <span className="max-md:sr-only">{labels.open}</span>
        <kbd aria-hidden className="ml-3 rounded border bg-muted px-1.5 font-mono text-[11px] max-md:hidden">{mac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      <dialog
        ref={ref}
        aria-label={labels.label}
        onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
        className="mx-auto mt-[max(1rem,10vh)] w-[min(36rem,calc(100vw-2rem))] max-w-none rounded-2xl border bg-popover p-3 text-popover-foreground shadow-2xl backdrop:bg-black/30 backdrop:backdrop-blur-xs"
      >
        {opened > 0 && <ToolSearch key={opened} items={items} labels={labels} icon={icon} listAllWhenEmpty autoFocus onNavigate={() => ref.current?.close()} />}
      </dialog>
    </>
  );
}
