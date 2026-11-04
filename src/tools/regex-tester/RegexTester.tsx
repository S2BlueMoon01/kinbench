'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import { RememberToggle } from '@/components/RememberToggle';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import type { RegexResult } from './logic';

const FLAGS = ['g', 'i', 'm', 's', 'u', 'y'] as const;
const TIMEOUT_MS = 1500;
type State = RegexResult | { ok: 'timeout' } | null;

/** Runs each pattern in a worker and terminates it after TIMEOUT_MS, so a catastrophic pattern can't freeze the tab. */
function useRegexWorker() {
  const worker = useRef<Worker | null>(null);
  const seq = useRef(0);
  useEffect(() => () => worker.current?.terminate(), []);
  return (job: { pattern: string; flags: string; text: string; replacement: string | null }) =>
    new Promise<State>((resolve) => {
      worker.current ??= new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module' });
      const w = worker.current;
      const id = ++seq.current;
      const timer = setTimeout(() => { w.terminate(); worker.current = null; resolve({ ok: 'timeout' }); }, TIMEOUT_MS);
      w.onmessage = (e: MessageEvent<{ id: number; result: RegexResult }>) => {
        if (e.data.id !== id) return;
        clearTimeout(timer);
        resolve(e.data.result);
      };
      w.postMessage({ id, ...job });
    });
}

export default function RegexTester() {
  const t = useTranslations('tools.regex-tester.ui');
  const tActions = useTranslations('ui.actions');
  const [s, setS, remember, setRemember] = useRememberedInput('regex-tester', { pattern: '', flags: 'g', text: '', replacement: '' });
  const [result, setResult] = useState<State>(null);
  const run = useRegexWorker();
  const set = (patch: Partial<typeof s>) => setS({ ...s, ...patch });

  useEffect(() => {
    if (!s.pattern) { setResult(null); return; }
    let stale = false;
    const id = setTimeout(() => run({ pattern: s.pattern, flags: s.flags, text: s.text, replacement: s.replacement || null }).then((r) => !stale && setResult(r)), 150);
    return () => { stale = true; clearTimeout(id); };
  }, [s.pattern, s.flags, s.text, s.replacement]); // run is stable per mount

  const ok = result?.ok === true ? result : null;
  // Highlight: plain text between matches, <mark> for each non-empty match.
  const segments: { text: string; match?: number }[] = [];
  if (ok) {
    let at = 0;
    ok.matches.forEach((m, i) => {
      if (m.index < at || !m.text) return;
      segments.push({ text: s.text.slice(at, m.index) }, { text: m.text, match: i });
      at = m.index + m.text.length;
    });
    segments.push({ text: s.text.slice(at) });
  }

  return (
    <ToolCard
      options={
        <>
          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">{t('flags')}</legend>
            <span aria-hidden className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">{t('flags')}</span>
            {FLAGS.map((f) => (
              <label key={f} title={t(`flag.${f}`)} className="grid h-8 min-w-8 cursor-pointer place-items-center rounded-md border font-mono text-sm has-checked:border-ring has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:outline-2 has-focus-visible:outline-ring pointer-coarse:h-11 pointer-coarse:min-w-11">
                <input type="checkbox" className="sr-only" checked={s.flags.includes(f)} onChange={(e) => set({ flags: FLAGS.filter((x) => (x === f ? e.target.checked : s.flags.includes(x))).join('') })} />
                <span aria-hidden>{f}</span>
                <span className="sr-only">{t(`flag.${f}`)}</span>
              </label>
            ))}
          </fieldset>
          <RememberToggle checked={remember} onChange={setRemember} />
        </>
      }
    >
      <div className="border-b p-4">
        <label htmlFor="regex-pattern" className="text-sm text-muted-foreground">{t('pattern')}</label>
        <div className="mt-2 flex items-center gap-1 font-mono text-base">
          <span aria-hidden className="text-muted-foreground">/</span>
          <input
            id="regex-pattern"
            value={s.pattern}
            onChange={(e) => set({ pattern: e.target.value })}
            placeholder="(\w+)@(\w+)\.com"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-invalid={result?.ok === false}
            aria-describedby="regex-status"
            className={cn(fieldClass, 'min-w-0 flex-1 text-base')}
          />
          <span aria-hidden className="text-muted-foreground">/{s.flags}</span>
        </div>
        <p id="regex-status" aria-live="polite" className={cn('mt-2 flex items-center gap-2 text-sm', result && result.ok !== true ? 'font-medium text-destructive' : 'text-muted-foreground')}>
          {result && result.ok !== true && <CircleAlert aria-hidden className="size-4 shrink-0" />}
          {result === null ? t('hint') : result.ok === 'timeout' ? t('timeout') : result.ok === false ? t('invalid', { message: result.error }) : t('matches', { count: result.matches.length })}
          {ok?.truncated && ` · ${t('truncated')}`}
        </p>
      </div>
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane label={t('text')} htmlFor="regex-text">
            <textarea id="regex-text" value={s.text} onChange={(e) => set({ text: e.target.value })} placeholder={t('textPlaceholder')} spellCheck={false} className={cn(editorClass, 'lg:h-[min(40vh,420px)]')} />
            <div className="border-t border-dashed p-4">
              <label htmlFor="regex-replace" className="text-sm text-muted-foreground">{t('replacement')}</label>
              <input id="regex-replace" value={s.replacement} onChange={(e) => set({ replacement: e.target.value })} placeholder="$2: $1" spellCheck={false} autoComplete="off" className={cn(fieldClass, 'mt-2 w-full')} />
            </div>
          </Pane>
        }
        right={
          <Pane label={t('result')} className="max-lg:border-t">
            {ok && s.text ? (
              <>
                <p className="max-h-[40vh] overflow-auto p-4 font-mono text-[13px] leading-relaxed break-all whitespace-pre-wrap">
                  {segments.map((seg, i) => (seg.match === undefined ? <span key={i}>{seg.text}</span> : <mark key={i} className="rounded-sm bg-accent text-accent-foreground outline-1 outline-ring/60">{seg.text}</mark>))}
                </p>
                {ok.matches.length > 0 && (
                  <ol className="max-h-72 divide-y divide-dashed overflow-auto border-t border-dashed font-mono text-xs">
                    {ok.matches.slice(0, 100).map((m, i) => (
                      <li key={i} className="px-4 py-2">
                        <span className="text-muted-foreground">#{i + 1} @{m.index}</span> <span className="break-all">{JSON.stringify(m.text)}</span>
                        {m.groups.map((g, gi) => (
                          <span key={gi} className="ml-3 text-muted-foreground">${gi + 1}={g === undefined ? '—' : JSON.stringify(g)}</span>
                        ))}
                      </li>
                    ))}
                  </ol>
                )}
                {ok.replaced !== null && (
                  <div className="border-t border-dashed p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('replaced')}</span>
                      <CopyButton iconOnly text={ok.replaced} label={tActions('copyNamed', { name: t('replaced') })} />
                    </div>
                    <p className="mt-1 font-mono text-[13px] break-all whitespace-pre-wrap">{ok.replaced}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">{t('empty')}</p>
            )}
          </Pane>
        }
      />
    </ToolCard>
  );
}
