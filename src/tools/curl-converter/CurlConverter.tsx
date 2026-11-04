'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { RememberToggle } from '@/components/RememberToggle';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { parseCurl, toAxios, toFetch } from './logic';

const SAMPLE = `curl 'https://api.example.com/v1/items?limit=10' \\
  -H 'Authorization: Bearer <token>' \\
  -H 'Content-Type: application/json' \\
  --data-raw '{"name":"Kinbench","tags":["local"]}'`;

export default function CurlConverter() {
  const t = useTranslations('tools.curl-converter.ui');
  const tActions = useTranslations('ui.actions');
  const [input, setInput, remember, setRemember] = useRememberedInput('curl-converter', '');
  const [target, setTarget] = useState<'fetch' | 'axios'>('fetch');
  const deferred = useDeferredValue(input);
  const parsed = useMemo(() => (deferred.trim() ? parseCurl(deferred) : null), [deferred]);
  const output = parsed?.ok ? (target === 'fetch' ? toFetch(parsed.request) : toAxios(parsed.request)) : '';

  return (
    <ToolCard
      actions={
        <>
          <Segmented label={t('target')} value={target} onChange={setTarget} options={[{ value: 'fetch', label: 'fetch' }, { value: 'axios', label: 'axios' }]} />
          <CopyButton text={output} className="max-sm:ml-auto" />
        </>
      }
      options={<RememberToggle checked={remember} onChange={setRemember} />}
    >
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane
            label={t('input')}
            htmlFor="curl-input"
            aside={input && (
              <Button variant="ghost" size="xs" onClick={() => setInput('')}>
                <X />
                {tActions('clear')}
              </Button>
            )}
          >
            <div className="relative">
              <textarea
                id="curl-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('placeholder')}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                aria-invalid={parsed?.ok === false}
                aria-describedby={parsed?.ok === false ? 'curl-error' : undefined}
                className={editorClass}
              />
              {!input && (
                <Button variant="secondary" size="sm" className="absolute bottom-4 left-4" onClick={() => setInput(SAMPLE)}>
                  {t('sample')}
                </Button>
              )}
            </div>
            {parsed?.ok === false && (
              <p id="curl-error" aria-live="polite" className="flex items-center gap-2 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm font-medium text-destructive">
                <CircleAlert aria-hidden className="size-4 shrink-0" />
                {t(`errors.${parsed.error}`)}
              </p>
            )}
          </Pane>
        }
        right={
          <Pane label={target === 'fetch' ? 'fetch' : 'axios'} htmlFor="curl-output" className="max-lg:border-t">
            <textarea id="curl-output" readOnly value={output} placeholder={t('outputPlaceholder')} spellCheck={false} className={cn(editorClass, 'text-foreground/90')} />
            {parsed?.ok && parsed.request.ignored.length > 0 && (
              <p aria-live="polite" className="flex items-start gap-2 border-t px-4 py-2.5 text-sm text-muted-foreground">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{t('ignored')} <code className="font-mono text-foreground">{parsed.request.ignored.join(' ')}</code></span>
              </p>
            )}
          </Pane>
        }
      />
    </ToolCard>
  );
}
