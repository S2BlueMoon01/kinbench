'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { LoaderCircle, Play, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RememberToggle } from '@/components/RememberToggle';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { deepEqual, formatValue, parseCase, TIMEOUT, type Case } from './logic';

type Reply = { ok: true; value: unknown; logs: string[]; ms: number } | { ok: false; code: 'notFunction' | 'uncloneable' | 'threw'; message?: string; logs: string[]; ms: number };
type Result =
  | { status: 'passed' | 'failed'; actual: string; ms: number; logs: string[] }
  | { status: 'error'; message: string; ms: number; logs: string[] }
  | { status: 'timeout' }
  | { status: 'invalid'; field: 'params' | 'expected' };

/** How long a busy device may take to start the worker; the user's timeout starts only once it runs. */
const LOAD_GRACE_MS = 10_000;

/** One case per fresh worker, so a hung case is killed by terminate() and can't leak state into the next. */
function runInWorker(code: string, args: unknown[], timeoutMs: number) {
  return new Promise<Reply | null>((resolve) => {
    // A fixed public path, not a bundled chunk, so it can be served with its own CSP (see csp.config.mjs).
    const worker = new Worker('/runner.worker.js');
    const done = (reply: Reply | null) => { clearTimeout(timer); worker.terminate(); resolve(reply); };
    let timer = setTimeout(() => done(null), LOAD_GRACE_MS + timeoutMs);
    let started = false;
    worker.onmessage = (e: MessageEvent<Reply | { started: true }>) => {
      if (!('started' in e.data)) return done(e.data);
      if (started) return; // only the worker's own first signal; user code can't extend its time by repeating it
      started = true;
      clearTimeout(timer);
      timer = setTimeout(() => done(null), timeoutMs);
    };
    worker.onerror = (e) => { e.preventDefault(); done({ ok: false, code: 'threw', message: e.message, logs: [], ms: 0 }); };
    worker.postMessage({ code, args });
  });
}

const SAMPLE = {
  code: "function sum(a, b) {\n  console.log('adding', a, b);\n  return a + b;\n}",
  cases: [
    { params: '[1, 2]', expected: '3' },
    { params: '[0.1, 0.2]', expected: '0.3' },
    { params: '["Kin", "bench"]', expected: '"Kinbench"' },
  ],
};

const statusStyle = {
  passed: 'bg-success/10 text-success',
  failed: 'bg-destructive/10 text-destructive',
  error: 'bg-destructive/10 text-destructive',
  timeout: 'bg-destructive/10 text-destructive',
  invalid: 'bg-muted text-muted-foreground',
};

export default function FunctionRunner() {
  const t = useTranslations('tools.function-runner.ui');
  const tActions = useTranslations('ui.actions');
  const format = useFormatter();
  const [state, setState, remember, setRemember] = useRememberedInput('function-runner', { code: '', cases: [{ params: '', expected: '' }] as Case[] });
  const [timeout, setTimeoutMs] = useState<number>(TIMEOUT.default);
  const [results, setResults] = useState<(Result | undefined)[]>([]);
  const [running, setRunning] = useState(false);
  const { code, cases } = state;

  const edit = (next: Partial<typeof state>) => { setState({ ...state, ...next }); setResults([]); };
  const editCase = (i: number, patch: Partial<Case>) => edit({ cases: cases.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const limit = Number.isFinite(timeout) ? Math.min(TIMEOUT.max, Math.max(TIMEOUT.min, timeout)) : TIMEOUT.default;

  async function runAll() {
    setRunning(true);
    const out: (Result | undefined)[] = [];
    setResults([]);
    for (const c of cases) {
      const parsed = parseCase(c);
      let result: Result;
      if (!parsed.ok) result = { status: 'invalid', field: parsed.error };
      else {
        const reply = await runInWorker(code, parsed.args, limit);
        if (!reply) result = { status: 'timeout' };
        else if (!reply.ok) result = { status: 'error', message: reply.code === 'threw' ? (reply.message ?? '') : t(`errors.${reply.code}`), ms: reply.ms, logs: reply.logs };
        else result = { status: deepEqual(reply.value, parsed.expected) ? 'passed' : 'failed', actual: formatValue(reply.value), ms: reply.ms, logs: reply.logs };
      }
      out.push(result);
      setResults([...out]);
    }
    setRunning(false);
  }

  const passed = results.filter((r) => r?.status === 'passed').length;
  const ms = (n: number) => format.number(n, { style: 'unit', unit: 'millisecond', maximumFractionDigits: n < 10 ? 2 : 0 });

  return (
    <ToolCard
      actions={
        <>
          <Button onClick={runAll} disabled={running || !code.trim() || cases.length === 0}>
            {running ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Play />}
            {t(running ? 'running' : 'run')}
          </Button>
          <span aria-live="polite" className="font-mono text-sm text-muted-foreground max-sm:ml-auto">
            {!running && results.length === cases.length && results.length > 0 && t('summary', { passed, total: cases.length })}
          </span>
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            {t('timeout')}
            <input type="number" min={TIMEOUT.min} max={TIMEOUT.max} step={100} value={Number.isNaN(timeout) ? '' : timeout} onChange={(e) => setTimeoutMs(e.target.valueAsNumber)} className={cn(fieldClass, 'w-24')} />
          </label>
          <RememberToggle checked={remember} onChange={setRemember} />
        </>
      }
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane label={t('code')} htmlFor="fn-code">
            <div className="relative">
              <textarea
                id="fn-code"
                value={code}
                onChange={(e) => edit({ code: e.target.value })}
                placeholder={t('codePlaceholder')}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className={editorClass}
              />
              {!code && (
                <Button variant="secondary" size="sm" className="absolute bottom-4 left-4" onClick={() => edit(SAMPLE)}>
                  {t('sample')}
                </Button>
              )}
            </div>
          </Pane>
        }
        right={
          <Pane label={t('cases')} className="max-lg:border-t">
            <ol className="divide-y divide-dashed">
              {cases.map((c, i) => {
                const r = results[i];
                return (
                  <li key={i} className="space-y-2 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{t('case', { n: i + 1 })}</span>
                      <div className="flex items-center gap-1">
                        {r && <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', statusStyle[r.status])}>{t(`status.${r.status}`)}</span>}
                        {r && 'ms' in r && <span className="font-mono text-xs text-muted-foreground">{ms(r.ms)}</span>}
                        <Button variant="ghost" size="icon-sm" aria-label={t('removeCase', { n: i + 1 })} onClick={() => edit({ cases: cases.filter((_, j) => j !== i) })}>
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="space-y-1">
                        <span className="block text-xs text-muted-foreground">{t('params')}</span>
                        <input value={c.params} onChange={(e) => editCase(i, { params: e.target.value })} placeholder="[1, 2]" spellCheck={false} autoComplete="off" aria-invalid={r?.status === 'invalid' && r.field === 'params'} className={cn(fieldClass, 'w-full')} />
                      </label>
                      <label className="space-y-1">
                        <span className="block text-xs text-muted-foreground">{t('expected')}</span>
                        <input value={c.expected} onChange={(e) => editCase(i, { expected: e.target.value })} placeholder="3" spellCheck={false} autoComplete="off" aria-invalid={r?.status === 'invalid' && r.field === 'expected'} className={cn(fieldClass, 'w-full')} />
                      </label>
                    </div>
                    {r?.status === 'invalid' && <p className="text-sm text-destructive">{t(`invalid.${r.field}`)}</p>}
                    {r?.status === 'timeout' && <p className="text-sm text-destructive">{t('timedOut', { ms: limit })}</p>}
                    {r?.status === 'error' && <p className="font-mono text-sm break-all text-destructive">{r.message}</p>}
                    {(r?.status === 'passed' || r?.status === 'failed') && (
                      <p className="font-mono text-sm break-all"><span className="text-muted-foreground">{t('actual')}: </span>{r.actual}</p>
                    )}
                    {r && 'logs' in r && r.logs.length > 0 && (
                      <details className="rounded-lg bg-muted/60 text-sm">
                        <summary className="cursor-pointer px-3 py-1.5 font-mono text-xs text-muted-foreground pointer-coarse:py-3">{t('logs', { count: r.logs.length })}</summary>
                        <pre className="overflow-x-auto px-3 pb-2 font-mono text-xs leading-relaxed">{r.logs.join('\n')}</pre>
                      </details>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="border-t border-dashed p-3">
              <Button variant="outline" size="sm" onClick={() => edit({ cases: [...cases, { params: '', expected: '' }] })}>
                <Plus />
                {t('addCase')}
              </Button>
            </div>
          </Pane>
        }
      />
    </ToolCard>
  );
}
