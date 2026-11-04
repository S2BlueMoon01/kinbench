'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Gauge, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RememberToggle } from '@/components/RememberToggle';
import { fieldClass, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { useStyle } from '@/lib/useStyle';
import { cn } from '@/lib/utils';
import { BUDGET, compare, parseArgs, stats, type Stats } from './logic';

type Fn = { name: string; code: string };
type Reply = { ok: true; samples: number[] } | { ok: false; code: 'notFunction' | 'threw'; message?: string };
type Result = { ok: true; stats: Stats } | { ok: false; error: string } | { ok: false; timeout: true };
const GRACE_MS = 10_000; // worker start-up plus warm-up on a slow device

/** Each function in a fresh worker, one after another, so they don't compete for the CPU. */
function measure(code: string, args: unknown[], budgetMs: number) {
  return new Promise<Reply | null>((resolve) => {
    // Fixed public path with its own CSP, like the Function Runner's sandbox (see csp.config.mjs).
    const worker = new Worker('/bench.worker.js');
    const done = (r: Reply | null) => { clearTimeout(timer); worker.terminate(); resolve(r); };
    let timer = setTimeout(() => done(null), GRACE_MS + budgetMs);
    let started = false;
    worker.onmessage = (e: MessageEvent<Reply | { started: true }>) => {
      if (!('started' in e.data)) return done(e.data);
      if (started) return;
      started = true;
      clearTimeout(timer);
      timer = setTimeout(() => done(null), budgetMs * 2 + 2000); // a call that never returns is a timeout
    };
    worker.onerror = (e) => { e.preventDefault(); done({ ok: false, code: 'threw', message: e.message }); };
    worker.postMessage({ code, args, budgetMs });
  });
}

const SAMPLE: { args: string; fns: Fn[] } = {
  args: '[[5, 1, 4, 2, 3, 9, 8, 7, 6, 0]]',
  fns: [
    { name: 'spread + sort', code: '(a) => [...a].sort((x, y) => x - y)' },
    { name: 'slice + sort', code: '(a) => a.slice().sort((x, y) => x - y)' },
    { name: 'toSorted', code: '(a) => a.toSorted((x, y) => x - y)' },
  ],
};

function Bar({ share }: { share: number }) {
  const ref = useStyle({ width: `${Math.max(2, share * 100)}%` });
  return <div className="h-1.5 rounded-full bg-muted"><div ref={ref} className="h-full rounded-full bg-primary" /></div>;
}

export default function FunctionBenchmark() {
  const t = useTranslations('tools.function-benchmark.ui');
  const format = useFormatter();
  const [s, setS, remember, setRemember] = useRememberedInput('function-benchmark', { args: '', fns: [{ name: 'A', code: '' }, { name: 'B', code: '' }] as Fn[] });
  const [budget, setBudget] = useState<number>(BUDGET.default);
  const [results, setResults] = useState<(Result | undefined)[]>([]);
  const [running, setRunning] = useState<number | null>(null);
  const args = parseArgs(s.args);
  const edit = (next: Partial<typeof s>) => { setS({ ...s, ...next }); setResults([]); };
  const editFn = (i: number, patch: Partial<Fn>) => edit({ fns: s.fns.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const limit = Number.isFinite(budget) ? Math.min(BUDGET.max, Math.max(BUDGET.min, budget)) : BUDGET.default;

  async function run() {
    if (!args) return;
    const out: (Result | undefined)[] = [];
    setResults([]);
    for (const [i, f] of s.fns.entries()) {
      setRunning(i);
      const r = await measure(f.code, args, limit);
      out[i] = !r ? { ok: false, timeout: true } : r.ok ? { ok: true, stats: stats(r.samples) } : { ok: false, error: r.code === 'threw' ? (r.message ?? '') : t('notFunction') };
      setResults([...out]);
    }
    setRunning(null);
  }

  const hz = s.fns.map((_, i) => { const r = results[i]; return r?.ok ? r.stats.hz : 0; });
  const rel = compare(hz);
  const fastest = hz.indexOf(Math.max(...hz));

  return (
    <ToolCard
      actions={
        <Button onClick={run} disabled={running !== null || !args || s.fns.some((f) => !f.code.trim())}>
          {running !== null ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Gauge />}
          {running !== null ? t('running', { name: s.fns[running].name }) : t('run')}
        </Button>
      }
      options={
        <>
          <label className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            {t('budget')}
            <input type="number" min={BUDGET.min} max={BUDGET.max} step={100} value={Number.isNaN(budget) ? '' : budget} onChange={(e) => setBudget(e.target.valueAsNumber)} className={cn(fieldClass, 'w-24')} />
          </label>
          <RememberToggle checked={remember} onChange={setRemember} />
        </>
      }
    >
      <div className="border-b p-4">
        <label htmlFor="bench-args" className="text-sm text-muted-foreground">{t('args')}</label>
        <input id="bench-args" value={s.args} onChange={(e) => edit({ args: e.target.value })} placeholder="[[3, 1, 2]]" spellCheck={false} autoComplete="off" aria-invalid={!args} className={cn(fieldClass, 'mt-2 w-full')} />
        {!args && <p className="mt-1 text-sm text-destructive">{t('invalidArgs')}</p>}
        {s.fns.every((f) => !f.code) && (
          <button type="button" onClick={() => edit(SAMPLE)} className="mt-2 rounded text-sm font-medium text-link underline underline-offset-4 hover:no-underline pointer-coarse:py-3">{t('sample')}</button>
        )}
      </div>
      <ol className="divide-y">
        {s.fns.map((f, i) => {
          const r = results[i];
          return (
            <li key={i} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`bench-name-${i}`}>{t('name', { n: i + 1 })}</label>
                  <input id={`bench-name-${i}`} value={f.name} onChange={(e) => editFn(i, { name: e.target.value })} className={cn(fieldClass, 'w-40 font-sans font-medium')} />
                  {s.fns.length > 2 && (
                    <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label={t('remove', { name: f.name })} onClick={() => edit({ fns: s.fns.filter((_, j) => j !== i) })}><Trash2 /></Button>
                  )}
                </div>
                <label className="sr-only" htmlFor={`bench-code-${i}`}>{t('code', { name: f.name })}</label>
                <textarea id={`bench-code-${i}`} value={f.code} onChange={(e) => editFn(i, { code: e.target.value })} placeholder="(a) => a.slice().sort()" spellCheck={false} autoCapitalize="off" rows={4} className={cn(fieldClass, 'block h-auto w-full resize-y py-2 leading-relaxed pointer-coarse:h-auto')} />
              </div>
              <div aria-live="polite" className="self-center text-sm">
                {r?.ok ? (
                  <div className="space-y-1.5">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-lg font-semibold">{t('ops', { hz: format.number(r.stats.hz, { maximumFractionDigits: 0 }) })}</span>
                      {i === fastest && <span className="rounded bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success">{t('fastest')}</span>}
                    </p>
                    <Bar share={rel[i].share} />
                    <p className="font-mono text-xs text-muted-foreground">
                      ±{format.number(r.stats.rme, { maximumFractionDigits: 1 })}% · {i === fastest ? t('baseline') : t('slower', { times: format.number(rel[i].slower, { maximumFractionDigits: 2 }) })}
                    </p>
                  </div>
                ) : r && 'timeout' in r ? (
                  <p className="text-destructive">{t('timedOut')}</p>
                ) : r ? (
                  <p className="font-mono text-xs break-all text-destructive">{r.error}</p>
                ) : running === i ? (
                  <p className="flex items-center gap-2 text-muted-foreground"><LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />{t('measuring')}</p>
                ) : (
                  <p className="text-muted-foreground">—</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {s.fns.length < 6 && (
        <div className="border-t p-3">
          <Button variant="outline" size="sm" onClick={() => edit({ fns: [...s.fns, { name: String.fromCharCode(65 + s.fns.length), code: '' }] })}>
            <Plus />
            {t('add')}
          </Button>
        </div>
      )}
    </ToolCard>
  );
}
