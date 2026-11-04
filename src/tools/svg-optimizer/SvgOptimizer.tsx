'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { FileDrop } from '@/components/FileDrop';
import { RememberToggle } from '@/components/RememberToggle';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { useByteFormat } from '@/lib/useByteFormat';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { useWorker } from '@/lib/useWorker';
import { cn } from '@/lib/utils';
import type { SvgResult } from './logic';
import type { SvgApi } from './svg.worker';

const check = 'inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground pointer-coarse:min-h-11';
const size = (s: string) => new TextEncoder().encode(s).length;

/** Shown through <img>, never inline, so scripts inside an SVG can't run. */
function Preview({ svg, label }: { svg: string; label: string }) {
  const url = useMemo(() => (svg ? URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })) : null), [svg]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return (
    <figure className="min-w-0 flex-1 text-center">
      <div className="grid h-32 place-items-center rounded-lg border bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-size-[16px_16px] p-2">
        {url && <img src={url} alt={label} className="max-h-full max-w-full" />}
      </div>
      <figcaption className="mt-1 text-xs text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

export default function SvgOptimizer() {
  const t = useTranslations('tools.svg-optimizer.ui');
  const tActions = useTranslations('ui.actions');
  const bytes = useByteFormat();
  const [input, setInput, remember, setRemember] = useRememberedInput('svg-optimizer', '');
  const [multipass, setMultipass] = useState(true);
  const [pretty, setPretty] = useState(false);
  const [result, setResult] = useState<SvgResult>({ ok: true, output: '' });
  const [fileError, setFileError] = useState(false);
  const api = useWorker<SvgApi>(() => new Worker(new URL('./svg.worker.ts', import.meta.url), { type: 'module' }));

  useEffect(() => {
    let stale = false;
    const id = setTimeout(async () => {
      const r = await api().optimizeSvg(input, multipass, pretty).catch((e: unknown): SvgResult => ({ ok: false, message: String(e) }));
      if (!stale) setResult(r);
    }, 250);
    return () => { stale = true; clearTimeout(id); };
  }, [input, multipass, pretty]); // api() is a stable lazy getter

  const output = result.ok ? result.output : '';
  const [before, after] = [size(input), size(output)];
  const saved = before && after ? Math.round((1 - after / before) * 100) : 0;

  return (
    <ToolCard
      actions={
        <>
          <CopyButton text={output} />
          <DownloadButton data={output} filename="optimized.svg" type="image/svg+xml" />
        </>
      }
      options={
        <>
          <label className={check}><input type="checkbox" checked={multipass} onChange={(e) => setMultipass(e.target.checked)} className="size-4 accent-primary" />{t('multipass')}</label>
          <label className={check}><input type="checkbox" checked={pretty} onChange={(e) => setPretty(e.target.checked)} className="size-4 accent-primary" />{t('pretty')}</label>
          <RememberToggle checked={remember} onChange={setRemember} />
        </>
      }
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label="SVG"
            htmlFor="svg-input"
            aside={input && (
              <Button variant="ghost" size="xs" onClick={() => setInput('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <textarea id="svg-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('placeholder')} spellCheck={false} aria-invalid={!result.ok} className={cn(editorClass, 'lg:h-[min(46vh,480px)]')} />
            <div className="border-t border-dashed p-3">
              <FileDrop accept=".svg,image/svg+xml" onFile={async (f) => { try { setInput(await f.text()); setFileError(false); } catch { setFileError(true); } }} />
            </div>
            <div aria-live="polite">
              {!result.ok && (
                <p className="flex items-start gap-2 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm text-destructive">
                  <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span><span className="font-medium">{t('invalid')}</span> <span className="font-mono text-xs break-all">{result.message}</span></span>
                </p>
              )}
              {fileError && <p className="border-t px-4 py-2.5 text-sm text-destructive">{t('fileError')}</p>}
            </div>
          </Pane>
        }
        right={
          <Pane
            label={t('output')}
            htmlFor="svg-output"
            className="max-lg:border-t"
            aside={output && (
              <span className="font-mono text-xs text-success">
                {bytes(before)} → {bytes(after)} ({t('saved', { percent: saved })})
              </span>
            )}
          >
            <textarea id="svg-output" readOnly value={output} placeholder={t('outputPlaceholder')} spellCheck={false} className={cn(editorClass, 'h-[24vh] sm:h-[28vh] lg:h-[min(32vh,340px)] break-all text-foreground/90')} />
            {output && (
              <div className="flex gap-3 border-t border-dashed p-4">
                <Preview svg={input} label={t('before')} />
                <Preview svg={output} label={t('after')} />
              </div>
            )}
          </Pane>
        }
      />
    </ToolCard>
  );
}
