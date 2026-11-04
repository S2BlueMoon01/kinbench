'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, LoaderCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { RememberToggle } from '@/components/RememberToggle';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { useWorker } from '@/lib/useWorker';
import { cn } from '@/lib/utils';
import { libraryFor, type CssResult, type Lang, type Mode } from './logic';
import type { CssApi } from './css.worker';

const SAMPLE = '$accent: #7cc8f8;\n$radius: 12px;\n\n.card{border-radius:$radius;padding:16px 20px;\n  .title{font-weight:600;color:$accent}\n  &:hover{box-shadow:0 4px 12px rgba($accent,.4)}\n}';
const filenames: Record<Mode, (lang: Lang) => string> = { format: (l) => `styles.${l}`, compile: () => 'styles.css', minify: () => 'styles.min.css' };

export default function CssFormatter() {
  const t = useTranslations('tools.css-formatter.ui');
  const tActions = useTranslations('ui.actions');
  const [input, setInput, remember, setRemember] = useRememberedInput('css-formatter', '');
  const [lang, setLang] = useState<Lang>('scss');
  const [mode, setMode] = useState<Mode>('format');
  const [result, setResult] = useState<CssResult>({ ok: true, output: '' });
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState<string[]>([]);
  const api = useWorker<CssApi>(() => new Worker(new URL('./css.worker.ts', import.meta.url), { type: 'module' }));
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let stale = false;
    const lib = libraryFor(mode);
    const id = setTimeout(async () => {
      if (input.trim()) setBusy(true);
      const r = await api().processCss(input, lang, mode).catch((e: unknown): CssResult => ({ ok: false, message: String(e), line: 0, column: 0 }));
      if (stale) return;
      setResult(r);
      setBusy(false);
      if (input.trim()) setLoaded((l) => (l.includes(lib) ? l : [...l, lib]));
    }, 300);
    return () => { stale = true; clearTimeout(id); };
  }, [input, lang, mode]); // api() is a stable lazy getter

  function changeLang(l: Lang) {
    setLang(l);
    if (l === 'css' && mode === 'compile') setMode('format');
  }

  function jumpToError() {
    if (result.ok || !inputRef.current) return;
    const offset = input.split('\n').slice(0, result.line - 1).reduce((n, l) => n + l.length + 1, 0) + result.column - 1;
    inputRef.current.focus();
    inputRef.current.setSelectionRange(offset, offset + 1);
  }

  const output = result.ok ? result.output : '';
  const loading = busy && !loaded.includes(libraryFor(mode));
  const modes: { value: Mode; label: string }[] = [
    { value: 'format', label: t('format') },
    ...(lang === 'scss' ? [{ value: 'compile' as const, label: t('compile') }] : []),
    { value: 'minify', label: t('minify') },
  ];

  return (
    <ToolCard
      actions={
        <>
          <Segmented label={t('mode')} value={mode} onChange={setMode} options={modes} />
          <CopyButton text={output} className="max-sm:ml-auto" />
          <DownloadButton data={output} filename={filenames[mode](lang)} type="text/css" />
        </>
      }
      options={
        <>
          <Segmented label={t('language')} showLabel value={lang} onChange={changeLang} options={[{ value: 'css', label: 'CSS' }, { value: 'scss', label: 'SCSS' }]} />
          <RememberToggle checked={remember} onChange={setRemember} />
        </>
      }
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label={t('input')}
            htmlFor="css-input"
            aside={input && (
              <Button variant="ghost" size="xs" onClick={() => setInput('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <div className="relative">
              <textarea
                id="css-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t(lang === 'scss' ? 'scssPlaceholder' : 'cssPlaceholder')}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                aria-invalid={!result.ok}
                aria-describedby={result.ok ? undefined : 'css-error'}
                className={editorClass}
              />
              {!input && (
                <Button variant="secondary" size="sm" className="absolute bottom-4 left-4" onClick={() => { setInput(SAMPLE); changeLang('scss'); }}>
                  {t('sample')}
                </Button>
              )}
            </div>
            <div aria-live="polite">
              {!result.ok && (
                <div id="css-error" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm text-destructive">
                  <CircleAlert aria-hidden className="size-4 shrink-0" />
                  <span className="font-medium">{t('syntaxError')}</span>
                  <span className="font-mono text-xs break-all">{result.message}</span>
                  {result.line > 0 && (
                    <button type="button" onClick={jumpToError} className="rounded font-mono text-xs underline underline-offset-4 hover:no-underline pointer-coarse:py-3">
                      {t('errorAt', { line: result.line, column: result.column })}
                    </button>
                  )}
                </div>
              )}
            </div>
          </Pane>
        }
        right={
          <Pane
            label={t('output')}
            htmlFor="css-output"
            className="max-lg:border-t"
            aside={loading && (
              <span role="status" className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />
                {t(libraryFor(mode) === 'sass' ? 'loadingSass' : 'loadingPrettier')}
              </span>
            )}
          >
            <textarea id="css-output" readOnly value={output} placeholder={t('outputPlaceholder')} spellCheck={false} className={cn(editorClass, 'text-foreground/90', mode === 'minify' && 'break-all')} />
          </Pane>
        }
      />
    </ToolCard>
  );
}
