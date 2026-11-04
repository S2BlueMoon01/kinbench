'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, LoaderCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { RememberToggle } from '@/components/RememberToggle';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { useWorker } from '@/lib/useWorker';
import { cn } from '@/lib/utils';
import type { FormatResult, Language, Style } from './logic';
import type { CodeApi } from './code.worker';

const LABEL: Record<Language, string> = { html: 'HTML', javascript: 'JavaScript', typescript: 'TypeScript' };
const EXT: Record<Language, string> = { html: 'html', javascript: 'js', typescript: 'ts' };
const check = 'inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground pointer-coarse:min-h-11';

export default function CodeFormatter() {
  const t = useTranslations('tools.code-formatter.ui');
  const tActions = useTranslations('ui.actions');
  const [input, setInput, remember, setRemember] = useRememberedInput('code-formatter', '');
  const [language, setLanguage] = useState<Language>('html');
  const [style, setStyle] = useState<Style>({ printWidth: 80, tabWidth: 2, semi: true, singleQuote: false });
  const [result, setResult] = useState<FormatResult>({ ok: true, output: '' });
  const [loading, setLoading] = useState<'idle' | 'first' | 'done'>('idle');
  const api = useWorker<CodeApi>(() => new Worker(new URL('./code.worker.ts', import.meta.url), { type: 'module' }));

  useEffect(() => {
    let stale = false;
    const id = setTimeout(async () => {
      if (input.trim()) setLoading((l) => (l === 'idle' ? 'first' : l));
      const r = await api().formatCode(input, language, style).catch((e: unknown): FormatResult => ({ ok: false, message: String(e), line: 0, column: 0 }));
      if (stale) return;
      setResult(r);
      if (input.trim()) setLoading('done');
    }, 300);
    return () => { stale = true; clearTimeout(id); };
  }, [input, language, style]); // api() is a stable lazy getter

  const output = result.ok ? result.output : '';

  return (
    <ToolCard
      actions={
        <>
          <Segmented label={t('language')} value={language} onChange={setLanguage} options={(Object.keys(LABEL) as Language[]).map((l) => ({ value: l, label: LABEL[l] }))} />
          <CopyButton text={output} className="max-sm:ml-auto" />
          <DownloadButton data={output} filename={`formatted.${EXT[language]}`} type="text/plain" />
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            {t('printWidth')}
            <select value={style.printWidth} onChange={(e) => setStyle({ ...style, printWidth: Number(e.target.value) })} className={cn(fieldClass, 'font-sans')}>
              {[80, 100, 120].map((w) => <option key={w}>{w}</option>)}
            </select>
          </label>
          <Segmented label={t('indent')} showLabel value={String(style.tabWidth) as '2' | '4'} onChange={(v) => setStyle({ ...style, tabWidth: Number(v) })} options={[{ value: '2', label: '2' }, { value: '4', label: '4' }]} />
          <label className={check}><input type="checkbox" checked={style.semi} onChange={(e) => setStyle({ ...style, semi: e.target.checked })} className="size-4 accent-primary" />{t('semi')}</label>
          <label className={check}><input type="checkbox" checked={style.singleQuote} onChange={(e) => setStyle({ ...style, singleQuote: e.target.checked })} className="size-4 accent-primary" />{t('singleQuote')}</label>
          <RememberToggle checked={remember} onChange={setRemember} />
        </>
      }
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label={LABEL[language]}
            htmlFor="code-input"
            aside={input && (
              <Button variant="ghost" size="xs" onClick={() => setInput('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <textarea id="code-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('placeholder', { language: LABEL[language] })} spellCheck={false} aria-invalid={!result.ok} className={editorClass} />
            {!result.ok && (
              <p aria-live="polite" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm text-destructive">
                <CircleAlert aria-hidden className="size-4 shrink-0" />
                <span className="font-medium">{t('syntaxError')}</span>
                <span className="font-mono text-xs break-all">{result.message}</span>
                {result.line > 0 && <span className="font-mono text-xs">{t('errorAt', { line: result.line, column: result.column })}</span>}
              </p>
            )}
          </Pane>
        }
        right={
          <Pane
            label={t('output')}
            htmlFor="code-output"
            className="max-lg:border-t"
            aside={loading === 'first' && (
              <span role="status" className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />
                {t('loading')}
              </span>
            )}
          >
            <textarea id="code-output" readOnly value={output} placeholder={t('outputPlaceholder')} spellCheck={false} className={cn(editorClass, 'text-foreground/90')} />
          </Pane>
        }
      />
    </ToolCard>
  );
}
