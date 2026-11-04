'use client';

import { useDeferredValue, useMemo } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RememberToggle } from '@/components/RememberToggle';
import { editorClass, Pane, ToolCard } from '@/components/ToolCard';
import { useRememberedInput } from '@/lib/useRememberedInput';
import { cn } from '@/lib/utils';
import { countText, type TextStats } from './logic';

const order: (keyof TextStats)[] = ['characters', 'charactersNoSpaces', 'words', 'lines', 'bytes', 'readingMinutes'];

export default function TextCounter() {
  const t = useTranslations('tools.text-counter.ui');
  const tActions = useTranslations('ui.actions');
  const format = useFormatter();
  const locale = useLocale();
  const [text, setText, remember, setRemember] = useRememberedInput('text-counter', '');
  // Counting a few MB of text takes a moment; deferring keeps typing responsive.
  const deferred = useDeferredValue(text);
  const stats = useMemo(() => countText(deferred, locale), [deferred, locale]);

  return (
    <ToolCard options={<RememberToggle checked={remember} onChange={setRemember} />}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Pane
          label={t('input')}
          htmlFor="text-input"
          aside={text && (
            <Button variant="ghost" size="xs" onClick={() => setText('')}>
              <X />
              {tActions('clear')}
            </Button>
          )}
        >
          <textarea
            id="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('placeholder')}
            className={cn(editorClass, 'font-sans text-[15px]')}
          />
        </Pane>
        <Pane label={t('stats')} className="max-lg:order-first max-lg:border-b lg:border-l">
          <dl className="grid grid-cols-2 gap-px bg-border lg:grid-cols-1">
            {order.map((key) => (
              <div key={key} className="flex flex-col gap-1 bg-card px-4 py-3 lg:flex-row lg:items-baseline lg:justify-between">
                <dt className="text-sm text-muted-foreground">{t(`labels.${key}`)}</dt>
                <dd className="font-mono text-2xl font-semibold tabular-nums lg:text-xl">
                  {key === 'readingMinutes'
                    ? format.number(stats.readingMinutes, { style: 'unit', unit: 'minute', unitDisplay: 'long' })
                    : format.number(stats[key])}
                </dd>
              </div>
            ))}
          </dl>
        </Pane>
      </div>
    </ToolCard>
  );
}
