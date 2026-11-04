'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeftRight, CircleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { RememberToggle } from '@/components/RememberToggle';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { convert, FORMATS, type Converted, type Format } from './logic';

const LABEL: Record<Format, string> = { json: 'JSON', yaml: 'YAML', xml: 'XML', csv: 'CSV', toml: 'TOML' };
const MIME: Record<Format, string> = { json: 'application/json', yaml: 'application/yaml', xml: 'application/xml', csv: 'text/csv', toml: 'application/toml' };

export default function JsonConverter() {
  const t = useTranslations('tools.json-converter.ui');
  const tActions = useTranslations('ui.actions');
  const [input, setInput, remember, setRemember] = useRememberedInput('json-converter', '');
  const [from, setFrom] = useState<Format>('json');
  const [to, setTo] = useState<Format>('yaml');
  const [result, setResult] = useState<Converted>({ ok: true, output: '' });

  useEffect(() => {
    let stale = false;
    const id = setTimeout(() => convert(input, from, to).then((r) => !stale && setResult(r)), 200);
    return () => { stale = true; clearTimeout(id); };
  }, [input, from, to]);

  const output = result.ok ? result.output : '';
  const options = FORMATS.map((f) => ({ value: f, label: LABEL[f] }));
  const swap = () => { setFrom(to); setTo(from); if (output) setInput(output); };

  return (
    <ToolCard
      actions={
        <>
          <CopyButton text={output} />
          <DownloadButton data={output} filename={`converted.${to}`} type={MIME[to]} />
        </>
      }
      options={<RememberToggle checked={remember} onChange={setRemember} />}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3">
        <Segmented label={t('from')} showLabel value={from} onChange={setFrom} options={options} />
        <Button variant="ghost" size="icon" onClick={swap} aria-label={t('swap')}>
          <ArrowLeftRight />
        </Button>
        <Segmented label={t('to')} showLabel value={to} onChange={setTo} options={options} />
      </div>
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label={LABEL[from]}
            htmlFor="conv-input"
            aside={input && (
              <Button variant="ghost" size="xs" onClick={() => setInput('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <textarea
              id="conv-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('placeholder', { format: LABEL[from] })}
              spellCheck={false}
              aria-invalid={!result.ok}
              aria-describedby={result.ok ? undefined : 'conv-error'}
              className={editorClass}
            />
            {!result.ok && (
              <p id="conv-error" aria-live="polite" className="flex items-start gap-2 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm text-destructive">
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="font-medium">{t(`errors.${result.error}`, { format: LABEL[from] })}</span>
                  {result.message && <span className="ml-2 font-mono text-xs break-all">{result.message}</span>}
                </span>
              </p>
            )}
          </Pane>
        }
        right={
          <Pane label={LABEL[to]} htmlFor="conv-output" className="max-lg:border-t">
            <textarea id="conv-output" readOnly value={output} placeholder={t('outputPlaceholder')} spellCheck={false} className={cn(editorClass, 'text-foreground/90')} />
          </Pane>
        }
      />
    </ToolCard>
  );
}
