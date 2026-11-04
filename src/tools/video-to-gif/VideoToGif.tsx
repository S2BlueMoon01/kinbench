'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { proxy, wrap, type Remote } from 'comlink';
import { CircleAlert, Clapperboard, Download, LoaderCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DownloadButton } from '@/components/DownloadButton';
import { FileDrop } from '@/components/FileDrop';
import { RangeField } from '@/components/RangeField';
import { fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { useByteFormat } from '@/lib/useByteFormat';
import { cn } from '@/lib/utils';
import { CORE_BYTES, CORE_DIR, gifArgs, LIMITS, type GifOptions } from './logic';
import type { FfmpegApi } from './ffmpeg.worker';

type Engine = { state: 'none' | 'starting' | 'ready' } | { state: 'downloading'; done: number; total: number } | { state: 'failed' };
type Job = { state: 'idle' } | { state: 'running'; progress: number } | { state: 'done'; blob: Blob; url: string } | { state: 'failed'; message: string };
const WIDTHS = [240, 320, 480, 640];

/** Downloads the ~32 MB core with progress. Same origin, so the CSP stays connect-src 'self'. */
async function downloadCore(onProgress: (done: number, total: number) => void, signal: AbortSignal) {
  const res = await fetch(`${CORE_DIR}/ffmpeg-core.wasm`, { signal });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const length = Number(res.headers.get('content-length'));
  // A compressed response's length is the compressed size; the body we read is decompressed.
  const total = length && !res.headers.get('content-encoding') ? length : CORE_BYTES;
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const reader = res.body.getReader();
  let done = 0;
  for (;;) {
    const { done: end, value } = await reader.read();
    if (end) break;
    chunks.push(value);
    done += value.length;
    onProgress(Math.min(done, total), total);
  }
  return new Blob(chunks).arrayBuffer();
}

export default function VideoToGif() {
  const t = useTranslations('tools.video-to-gif.ui');
  const tActions = useTranslations('ui.actions');
  const format = useFormatter();
  const bytes = useByteFormat();
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [length, setLength] = useState(0);
  const [o, setO] = useState<GifOptions>({ start: 0, duration: 5, fps: 12, width: 480 });
  const [engine, setEngine] = useState<Engine>({ state: 'none' });
  const [job, setJob] = useState<Job>({ state: 'idle' });
  const worker = useRef<{ w: Worker; api: Remote<FfmpegApi> } | null>(null);
  const wasm = useRef<ArrayBuffer | null>(null); // kept, so a cancelled job can restart without downloading again
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!file) return setVideoUrl(null);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => { worker.current?.w.terminate(); abort.current?.abort(); }, []);
  useEffect(() => () => { if (job.state === 'done') URL.revokeObjectURL(job.url); }, [job]);

  async function ensureEngine() {
    if (worker.current) return worker.current.api;
    if (!wasm.current) {
      abort.current = new AbortController();
      setEngine({ state: 'downloading', done: 0, total: CORE_BYTES });
      wasm.current = await downloadCore((done, total) => setEngine({ state: 'downloading', done, total }), abort.current.signal);
    }
    setEngine({ state: 'starting' });
    const w = new Worker(new URL('./ffmpeg.worker.ts', import.meta.url), { type: 'module' });
    const api = wrap<FfmpegApi>(w);
    await api.load(`${CORE_DIR}/ffmpeg-core.js`, wasm.current);
    worker.current = { w, api };
    setEngine({ state: 'ready' });
    return api;
  }

  async function convert() {
    if (!file) return;
    try {
      const api = await ensureEngine();
      setJob({ state: 'running', progress: 0 });
      const input = new Uint8Array(await file.arrayBuffer());
      const out = await api.convert(input, gifArgs(o), proxy((p: number) => setJob({ state: 'running', progress: p })));
      const blob = new Blob([out as Uint8Array<ArrayBuffer>], { type: 'image/gif' });
      setJob({ state: 'done', blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      if (abort.current?.signal.aborted) return;
      if (!worker.current) setEngine({ state: 'failed' }); // failed before the engine was up
      setJob({ state: 'failed', message: (e as Error).message });
    }
  }

  function cancel() {
    abort.current?.abort();
    worker.current?.w.terminate(); // stops a running ffmpeg immediately
    worker.current = null;
    setEngine({ state: 'none' });
    setJob({ state: 'idle' });
  }

  const busy = engine.state === 'downloading' || engine.state === 'starting' || job.state === 'running';
  const mb = (n: number) => format.number(n / 1048576, { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  return (
    <ToolCard
      actions={
        <>
          <Button onClick={convert} disabled={!file || busy}>
            {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Clapperboard />}
            {t('convert')}
          </Button>
          {busy && <Button variant="ghost" onClick={cancel}><X />{t('cancel')}</Button>}
          <DownloadButton data={job.state === 'done' ? job.blob : null} filename={`${file?.name.replace(/\.[^.]*$/, '') ?? 'video'}.gif`} className="max-sm:ml-auto" />
        </>
      }
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Pane label={t('video')}>
          <div className="space-y-3 p-4">
            {videoUrl ? (
              <>
                <video src={videoUrl} controls muted playsInline onLoadedMetadata={(e) => { const d = e.currentTarget.duration; setLength(d); setO((x) => ({ ...x, duration: Math.min(x.duration, d || x.duration) })); }} className="mx-auto max-h-80 max-w-full rounded-lg border bg-black" />
                <p className="font-mono text-sm break-all">{file!.name} · {bytes(file!.size)}{length ? ` · ${format.number(length, { maximumFractionDigits: 1 })} s` : ''}</p>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setJob({ state: 'idle' }); }}><X />{tActions('clear')}</Button>
              </>
            ) : (
              <>
                <FileDrop onFile={(f) => { setFile(f); setJob({ state: 'idle' }); }} accept="video/*" className="min-h-52 flex-col" />
                <p className="text-center text-sm text-muted-foreground">{t('hint')}</p>
              </>
            )}
          </div>
        </Pane>
        <Pane label={t('settings')} className="max-lg:border-t lg:border-l">
          <div className="space-y-4 p-4">
            <RangeField label={t('start')} unit="s" min={0} max={Math.max(0, Math.floor(length))} step={0.1} value={o.start} onChange={(start) => setO({ ...o, start })} />
            <RangeField label={t('duration')} unit="s" min={0.5} max={LIMITS.duration} step={0.5} value={o.duration} onChange={(duration) => setO({ ...o, duration })} />
            <RangeField label={t('fps')} unit="fps" min={LIMITS.fps[0]} max={LIMITS.fps[1]} value={o.fps} onChange={(fps) => setO({ ...o, fps })} />
            <label className="block text-sm text-muted-foreground">
              {t('width')}
              <select value={o.width ?? ''} onChange={(e) => setO({ ...o, width: e.target.value ? Number(e.target.value) : null })} className={cn(fieldClass, 'mt-1 w-full font-sans')}>
                {WIDTHS.map((w) => <option key={w} value={w}>{w} px</option>)}
                <option value="">{t('original')}</option>
              </select>
            </label>
          </div>
        </Pane>
      </div>

      {(engine.state !== 'none' && engine.state !== 'ready') || job.state !== 'idle' ? (
        <div aria-live="polite" className="border-t p-4">
          {engine.state === 'downloading' && (
            <div>
              <p className="flex items-center gap-2 text-sm font-medium"><Download aria-hidden className="size-4" />{t('downloading')}</p>
              <progress max={engine.total} value={engine.done} aria-label={t('downloading')} className="mt-2 h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary" />
              <p className="mt-1 flex justify-between font-mono text-xs text-muted-foreground">
                <span>{mb(engine.done)} / {mb(engine.total)} MB</span>
                <span>{Math.round((engine.done / engine.total) * 100)}%</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('downloadNote')}</p>
            </div>
          )}
          {engine.state === 'starting' && <p className="flex items-center gap-2 text-sm"><LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />{t('starting')}</p>}
          {engine.state === 'failed' && <p className="flex items-center gap-2 text-sm font-medium text-destructive"><CircleAlert aria-hidden className="size-4" />{t('engineFailed')}</p>}
          {job.state === 'running' && (
            <div>
              <p className="text-sm font-medium">{t('converting', { percent: Math.round(job.progress * 100) })}</p>
              <progress max={1} value={job.progress} aria-label={t('converting', { percent: Math.round(job.progress * 100) })} className="mt-2 h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary" />
            </div>
          )}
          {job.state === 'failed' && (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span><span className="font-medium">{t('convertFailed')}</span> <span className="font-mono text-xs break-all whitespace-pre-wrap">{job.message}</span></span>
            </p>
          )}
          {job.state === 'done' && (
            <figure className="text-center">
              <img src={job.url} alt={t('result')} className="mx-auto max-h-96 max-w-full rounded-lg border" />
              <figcaption className="mt-2 font-mono text-sm">{t('result')} · {bytes(job.blob.size)}</figcaption>
            </figure>
          )}
        </div>
      ) : null}
    </ToolCard>
  );
}
