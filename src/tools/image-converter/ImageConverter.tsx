'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, LoaderCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DownloadButton } from '@/components/DownloadButton';
import { FileDrop, usePasteFiles } from '@/components/FileDrop';
import { Segmented } from '@/components/Segmented';
import { Pane, ToolCard } from '@/components/ToolCard';
import { useByteFormat } from '@/lib/useByteFormat';
import { useWorker } from '@/lib/useWorker';
import { cn } from '@/lib/utils';
import { clampQuality, formats, outputName, sizeChange, type Format } from './logic';
import type { ImageApi } from './image.worker';

type Output = { blob: Blob; url: string; width: number; height: number };

/** An object URL for the blob, revoked when it changes or the component unmounts. */
function useObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return setUrl(null);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export default function ImageConverter() {
  const t = useTranslations('tools.image-converter.ui');
  const tActions = useTranslations('ui.actions');
  const bytes = useByteFormat();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<Format>('webp');
  const [quality, setQuality] = useState(80);
  const [result, setResult] = useState<Omit<Output, 'url'> | null>(null);
  const [state, setState] = useState<'idle' | 'encoding' | 'error'>('idle');
  const [avifLoaded, setAvifLoaded] = useState(false);
  const [pos, setPos] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const api = useWorker<ImageApi>(() => new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' }));
  usePasteFiles(file ? setFile : null, 'image/*'); // replaces the image while the picker is hidden
  const before = useObjectUrl(file);
  const after = useObjectUrl(result?.blob ?? null);

  // Through CSSOM, so the CSP needs no 'unsafe-inline' for styles.
  useEffect(() => frame.current?.style.setProperty('--pos', `${pos}%`), [pos, after]);

  useEffect(() => {
    if (!file) { setResult(null); setState('idle'); return; }
    let stale = false;
    setState('encoding');
    const id = setTimeout(async () => {
      try {
        const r = await api().convert(file, format, clampQuality(quality));
        if (stale) return;
        setResult(r);
        setState('idle');
        if (format === 'avif') setAvifLoaded(true);
      } catch {
        if (!stale) { setResult(null); setState('error'); }
      }
    }, 250);
    return () => { stale = true; clearTimeout(id); };
  }, [file, format, quality]); // api() is a stable lazy getter

  const change = file && result ? sizeChange(file.size, result.blob.size) : 0;

  return (
    <ToolCard
      actions={
        <>
          <DownloadButton data={result?.blob ?? null} filename={outputName(file?.name ?? '', format)} className="max-sm:ml-auto max-sm:order-last" />
          {file && (
            <Button variant="ghost" onClick={() => setFile(null)}>
              <X />
              {tActions('clear')}
            </Button>
          )}
        </>
      }
      options={
        <>
          <Segmented label={t('format')} showLabel value={format} onChange={setFormat} options={(Object.keys(formats) as Format[]).map((f) => ({ value: f, label: f.toUpperCase() }))} />
          <label className={cn('flex items-center gap-3 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase', !formats[format].lossy && 'opacity-60')}>
            {t('quality')}
            <input
              type="range"
              min={1}
              max={100}
              value={quality}
              disabled={!formats[format].lossy}
              onChange={(e) => setQuality(e.target.valueAsNumber)}
              className="h-11 w-36 accent-primary sm:h-8"
            />
            <span className="w-7 text-right text-sm text-foreground tabular-nums">{quality}</span>
          </label>
        </>
      }
    >
      <Pane
        label={t('preview')}
        aside={
          <span role="status" className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            {state === 'encoding' && <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />}
            {state === 'encoding' && t(format === 'avif' && !avifLoaded ? 'loadingAvif' : 'encoding')}
            {!formats[format].lossy && state !== 'encoding' && t('lossless')}
          </span>
        }
      >
        {!file ? (
          <div className="p-4">
            <FileDrop onFile={setFile} accept="image/*" className="min-h-52 flex-col sm:min-h-72" />
            <p className="mt-3 text-center text-sm text-muted-foreground">{t('hint')}</p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {state === 'error' && (
              <p role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/8 px-3 py-2.5 text-sm font-medium text-destructive">
                <CircleAlert aria-hidden className="size-4 shrink-0" />
                {t('decodeError')}
              </p>
            )}
            {/* Rendered only once the worker has decoded the file: an <img> of a non-image blob makes Chrome
                attempt a blob: fetch that the CSP (connect-src) blocks and reports. */}
            {before && after && (
              <div
                ref={frame}
                className="relative mx-auto w-fit overflow-hidden rounded-lg bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-size-[16px_16px] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
              >
                <img src={before} alt={t('before')} className="block max-h-[60vh] max-w-full" />
                <img src={after} alt={t('after')} className="absolute inset-0 size-full [clip-path:inset(0_0_0_var(--pos))]" />
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-(--pos) w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.3)]" />
                <span aria-hidden className="absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-xs text-white">{t('before')}</span>
                <span aria-hidden className="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-xs text-white">{t('after')}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pos}
                  onChange={(e) => setPos(e.target.valueAsNumber)}
                  aria-label={t('compare')}
                  className="absolute inset-0 size-full cursor-ew-resize opacity-0"
                />
              </div>
            )}
            <dl className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
              <div className="bg-card px-4 py-3">
                <dt className="text-xs text-muted-foreground">{t('before')}</dt>
                <dd className="mt-0.5 font-mono text-sm break-all">{file.name}</dd>
                <dd className="font-mono text-lg font-semibold">{bytes(file.size)}</dd>
              </div>
              <div className="bg-card px-4 py-3">
                <dt className="text-xs text-muted-foreground">{t('after')}</dt>
                <dd className="mt-0.5 font-mono text-sm">{result ? `${format.toUpperCase()} · ${t('dimensions', { width: result.width, height: result.height })}` : '—'}</dd>
                <dd className="font-mono text-lg font-semibold">
                  {result ? bytes(result.blob.size) : '—'}
                  {result && (
                    <span className={cn('ml-2 rounded px-1.5 py-0.5 font-sans text-xs font-medium', change <= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                      {change < 0 ? t('smaller', { percent: -change }) : change > 0 ? t('larger', { percent: change }) : t('same')}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Pane>
    </ToolCard>
  );
}
