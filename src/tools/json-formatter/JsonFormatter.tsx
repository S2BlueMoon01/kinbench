'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { RememberToggle } from '@/components/RememberToggle';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { useByteFormat } from '@/lib/useByteFormat';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { processJson, type Indent, type JsonResult, type Mode } from './logic';

export default function JsonFormatter() {
  const t = useTranslations('tools.json-formatter.ui');
  const tActions = useTranslations('ui.actions');
  const bytes = useByteFormat();
  const [input, setInput, remember, setRemember] = useRememberedInput('json-formatter', '');
  const [mode, setMode] = useState<Mode>('format');
  const [indent, setIndent] = useState<Indent>('2');
  const [result, setResult] = useState<JsonResult>({ ok: true, output: '' });
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let stale = false;
    const id = setTimeout(() => processJson(input, mode, indent).then((r) => !stale && setResult(r)), 200);
    return () => { stale = true; clearTimeout(id); };
  }, [input, mode, indent]);

  const output = result.ok ? result.output : '';
  const size = useMemo(() => new TextEncoder().encode(output).length, [output]);

  function jumpToError() {
    if (result.ok || !inputRef.current) return;
    inputRef.current.focus();
    inputRef.current.setSelectionRange(result.error.offset, result.error.offset + Math.max(1, result.error.length));
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    try {
      setInput(await file.text());
      setFileError(false);
    } catch {
      setFileError(true);
    }
  }

  const sample = `{"tool":"Kinbench","note":${JSON.stringify(t('sampleNote'))},"id":12345678901234567890,"price":1.50,"tags":["json","format"],"local":true,"server":null}`;

  return (
    <ToolCard
      actions={
        <>
          <Segmented
            label={t('mode')}
            value={mode}
            onChange={setMode}
            options={[{ value: 'format', label: t('format') }, { value: 'minify', label: t('minify') }]}
          />
          <CopyButton text={output} className="max-sm:ml-auto" />
          <DownloadButton data={output} filename={mode === 'minify' ? 'data.min.json' : 'data.json'} type="application/json" />
        </>
      }
      options={
        <>
          <Segmented
            label={t('indent')}
            showLabel
            value={indent}
            onChange={setIndent}
            options={[
              { value: '2', label: t('spaces', { count: 2 }) },
              { value: '4', label: t('spaces', { count: 4 }) },
              { value: 'tab', label: t('tab') },
            ]}
          />
          <RememberToggle checked={remember} onChange={setRemember} />
        </>
      }
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label={t('input')}
            htmlFor="json-input"
            aside={input && (
              <Button variant="ghost" size="xs" onClick={() => setInput('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <div
              className="relative"
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <textarea
                id="json-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('inputPlaceholder')}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                aria-invalid={!result.ok}
                aria-describedby={result.ok ? undefined : 'json-error'}
                className={editorClass}
              />
              {!input && (
                <Button variant="secondary" size="sm" className="absolute bottom-4 left-4" onClick={() => setInput(sample)}>
                  {t('sample')}
                </Button>
              )}
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-2 grid place-items-center rounded-xl border-2 border-dashed border-ring bg-accent/85 font-medium text-accent-foreground transition-opacity motion-reduce:transition-none',
                  dragging ? 'opacity-100' : 'opacity-0',
                )}
              >
                {t('dropHint')}
              </div>
            </div>
            <div aria-live="polite">
              {!result.ok && (
                <div id="json-error" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm text-destructive">
                  <CircleAlert aria-hidden className="size-4 shrink-0" />
                  <span className="font-medium">{t(`errors.${result.error.code}`)}</span>
                  {result.error.line > 0 && (
                    <button type="button" onClick={jumpToError} className="rounded font-mono text-xs underline underline-offset-4 hover:no-underline pointer-coarse:py-3">
                      {t('errorAt', { line: result.error.line, column: result.error.column })} · {t('jumpToError')}
                    </button>
                  )}
                </div>
              )}
              {fileError && <p className="border-t px-4 py-2.5 text-sm text-destructive">{t('fileError')}</p>}
            </div>
          </Pane>
        }
        right={
          <Pane
            label={t('output')}
            htmlFor="json-output"
            className="max-lg:border-t"
            aside={output && (
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-success">
                <CircleCheck aria-hidden className="size-3.5" />
                {t('valid')} · {bytes(size)}
              </span>
            )}
          >
            <textarea id="json-output" readOnly value={output} placeholder={t('outputPlaceholder')} spellCheck={false} className={cn(editorClass, 'text-foreground/90')} />
          </Pane>
        }
      />
    </ToolCard>
  );
}
