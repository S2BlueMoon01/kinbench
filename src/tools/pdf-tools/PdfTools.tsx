'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, CircleAlert, Combine, LoaderCircle, Scissors, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DownloadButton } from '@/components/DownloadButton';
import { FileDrop } from '@/components/FileDrop';
import { Segmented } from '@/components/Segmented';
import { fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { useByteFormat } from '@/lib/useByteFormat';
import { useWorker } from '@/lib/useWorker';
import { cn } from '@/lib/utils';
import { parseRanges, type PdfError } from './logic';
import type { PdfApi } from './pdf.worker';

type Mode = 'merge' | 'split';
type Item = { id: number; name: string; bytes: Uint8Array; pages: number | null; error?: PdfError };
type Output = { blob: Blob; name: string };
const baseName = (n: string) => n.replace(/\.pdf$/i, '') || 'document';

export default function PdfTools() {
  const t = useTranslations('tools.pdf-tools.ui');
  const tActions = useTranslations('ui.actions');
  const bytes = useByteFormat();
  const api = useWorker<PdfApi>(() => new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' }));
  const [mode, setMode] = useState<Mode>('merge');
  const [items, setItems] = useState<Item[]>([]);
  const [ranges, setRanges] = useState('');
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<Output | null>(null);
  const [error, setError] = useState<{ code: PdfError; file?: string } | null>(null);

  async function add(file: File) {
    const id = Math.random();
    const b = new Uint8Array(await file.arrayBuffer());
    setItems((list) => [...(mode === 'split' ? [] : list), { id, name: file.name, bytes: b, pages: null }]);
    setOutput(null);
    const r = await api().pageCount(b);
    setItems((list) => list.map((i) => (i.id === id ? { ...i, pages: r.ok ? r.value : 0, error: r.ok ? undefined : r.code } : i)));
  }
  const move = (i: number, d: -1 | 1) => setItems((list) => { const next = [...list]; [next[i], next[i + d]] = [next[i + d], next[i]]; return next; });

  const split = mode === 'split' ? items[0] : undefined;
  const parsed = split?.pages ? parseRanges(ranges, split.pages) : null;
  const ready = mode === 'merge' ? items.length >= 2 && items.every((i) => i.pages && !i.error) : !!parsed;

  async function run() {
    setBusy(true);
    setError(null);
    if (mode === 'merge') {
      const r = await api().merge(items.map(({ name, bytes: b }) => ({ name, bytes: b })));
      if (r.ok) setOutput({ blob: new Blob([r.value as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), name: 'merged.pdf' });
      else setError(r);
    } else if (split && parsed) {
      const r = await api().split(split.bytes, parsed);
      if (!r.ok) setError(r);
      else if (r.value.length === 1) setOutput({ blob: new Blob([r.value[0] as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), name: `${baseName(split.name)}-${ranges.trim()}.pdf` });
      else {
        const { zipSync } = await import('fflate');
        const files = Object.fromEntries(r.value.map((part, i) => [`${baseName(split.name)}-${parsed[i][0]}${parsed[i].length > 1 ? `-${parsed[i].at(-1)}` : ''}.pdf`, part]));
        setOutput({ blob: new Blob([zipSync(files)], { type: 'application/zip' }), name: `${baseName(split.name)}-split.zip` });
      }
    }
    setBusy(false);
  }

  return (
    <ToolCard
      actions={
        <>
          <Segmented label={t('mode')} value={mode} onChange={(m) => { setMode(m); setItems([]); setOutput(null); setError(null); }} options={[{ value: 'merge', label: t('merge') }, { value: 'split', label: t('split') }]} />
          <Button onClick={run} disabled={!ready || busy}>
            {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : mode === 'merge' ? <Combine /> : <Scissors />}
            <span className="max-sm:sr-only">{t(mode === 'merge' ? 'mergeAction' : 'splitAction')}</span>
          </Button>
          <DownloadButton data={output?.blob ?? null} filename={output?.name ?? 'document.pdf'} className="max-sm:ml-auto" />
        </>
      }
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Pane label={t(mode === 'merge' ? 'files' : 'file')}>
          <div className="space-y-3 p-4">
            {(mode === 'merge' || !split) && <FileDrop onFile={add} accept="application/pdf,.pdf" multiple={mode === 'merge'} />}
            <ol className="divide-y divide-dashed rounded-lg border empty:hidden">
              {items.map((item, i) => (
                <li key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="w-5 font-mono text-xs text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className={cn('font-mono text-xs', item.error ? 'text-destructive' : 'text-muted-foreground')}>
                      {item.error ? t(`errors.${item.error}`) : item.pages === null ? '…' : t('pages', { count: item.pages })} · {bytes(item.bytes.length)}
                    </span>
                  </span>
                  {mode === 'merge' && (
                    <>
                      <Button variant="ghost" size="icon-sm" disabled={i === 0} aria-label={t('moveUp', { name: item.name })} onClick={() => move(i, -1)}><ArrowUp /></Button>
                      <Button variant="ghost" size="icon-sm" disabled={i === items.length - 1} aria-label={t('moveDown', { name: item.name })} onClick={() => move(i, 1)}><ArrowDown /></Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon-sm" aria-label={t('remove', { name: item.name })} onClick={() => { setItems(items.filter((x) => x.id !== item.id)); setOutput(null); }}><X /></Button>
                </li>
              ))}
            </ol>
            {mode === 'merge' && items.length === 1 && <p className="text-sm text-muted-foreground">{t('addMore')}</p>}
          </div>
        </Pane>
        <Pane label={t(mode === 'merge' ? 'result' : 'pagesToKeep')} className="max-lg:border-t lg:border-l">
          <div className="space-y-3 p-4">
            {mode === 'split' && split?.pages ? (
              <>
                <label htmlFor="pdf-ranges" className="text-sm text-muted-foreground">{t('ranges', { count: split.pages })}</label>
                <input id="pdf-ranges" value={ranges} onChange={(e) => { setRanges(e.target.value); setOutput(null); }} placeholder="1-3, 5, 8-" aria-invalid={ranges !== '' && !parsed} className={cn(fieldClass, 'w-full text-base')} />
                {ranges !== '' && !parsed && <p className="text-sm text-destructive">{t('invalidRanges', { count: split.pages })}</p>}
                <Button variant="outline" size="sm" onClick={() => setRanges(Array.from({ length: split.pages! }, (_, i) => i + 1).join(', '))}>{t('everyPage')}</Button>
                <p className="text-xs text-muted-foreground">{t('rangesHint')}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t(mode === 'merge' ? 'mergeHint' : 'splitHint')}</p>
            )}
            <div aria-live="polite">
              {error && <p className="flex items-start gap-2 text-sm font-medium text-destructive"><CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />{t(`errors.${error.code}`)}{error.file ? `: ${error.file}` : ''}</p>}
              {output && <p className="rounded-lg bg-success/10 px-3 py-2.5 font-mono text-sm text-success">{output.name} · {bytes(output.blob.size)}</p>}
            </div>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setItems([]); setOutput(null); setRanges(''); }}><X />{tActions('clear')}</Button>
            )}
          </div>
        </Pane>
      </div>
    </ToolCard>
  );
}
