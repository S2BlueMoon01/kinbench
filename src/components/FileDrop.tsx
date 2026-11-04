'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileUp } from 'lucide-react';
import { accepts } from '@/lib/accepts';
import { cn } from '@/lib/utils';

type Props = { onFile: (file: File) => void; accept?: string; multiple?: boolean; className?: string };

/**
 * A file picker that also accepts drag and drop. Files are only read in the page; nothing is uploaded.
 * With `multiple`, onFile is called once per file, in order. While it is on screen, Ctrl+V / ⌘V of a matching file
 * (e.g. a screenshot) anywhere on the page picks it too; pasting text still goes to the focused field.
 */
export function FileDrop({ onFile, accept, multiple, className }: Props) {
  const t = useTranslations('ui.actions');
  const [over, setOver] = useState(false);
  usePasteFiles(onFile, accept, multiple);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        for (const file of multiple ? [...e.dataTransfer.files] : [...e.dataTransfer.files].slice(0, 1)) onFile(file);
      }}
      className={cn(
        'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-center text-sm text-muted-foreground transition-colors hover:border-ring has-focus-visible:outline-2 has-focus-visible:outline-ring motion-reduce:transition-none',
        over && 'border-ring bg-accent text-accent-foreground',
        className,
      )}
    >
      <FileUp aria-hidden className="size-4 shrink-0" />
      <span>
        <span className="font-medium text-foreground underline underline-offset-4">{t('chooseFile')}</span> {t('orDrop')}
        {accepts({ name: 'image.png', type: 'image/png' }, accept) && <span className="block text-xs">{t('orPaste')}</span>}
      </span>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          for (const file of e.target.files ?? []) onFile(file);
          e.target.value = ''; // picking the same file again still fires change
        }}
      />
    </label>
  );
}

/**
 * Ctrl+V / ⌘V of a matching file anywhere on the page calls onFile; text pastes are left alone. FileDrop uses it
 * while visible; a tool that hides its FileDrop once a file is chosen calls it itself so a new paste replaces the
 * file. Pass null to stop listening.
 */
export function usePasteFiles(onFile: ((file: File) => void) | null, accept?: string, multiple?: boolean) {
  const latest = useRef(onFile);
  useEffect(() => { latest.current = onFile; });
  const enabled = onFile !== null;

  useEffect(() => {
    if (!enabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((file) => accepts(file, accept));
      if (!files.length || !latest.current) return;
      e.preventDefault();
      for (const file of multiple ? files : files.slice(0, 1)) latest.current(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [enabled, accept, multiple]);
}
