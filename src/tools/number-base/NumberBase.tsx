'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert } from 'lucide-react';
import { Segmented } from '@/components/Segmented';
import { fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { cn } from '@/lib/utils';
import { formatInteger, parseInteger } from './logic';

const BASES = ['2', '8', '10', '16'] as const;

export default function NumberBase() {
  const t = useTranslations('tools.number-base.ui');
  const [input, setInput] = useState('');
  const [from, setFrom] = useState<(typeof BASES)[number]>('10');
  const [custom, setCustom] = useState(36);
  const value = useMemo(() => parseInteger(input, Number(from)), [input, from]);
  const customOk = Number.isInteger(custom) && custom >= 2 && custom <= 36;
  const invalid = input.trim() !== '' && value === null;

  return (
    <ToolCard>
      <div className="grid lg:grid-cols-2">
        <Pane label={t('input')}>
          <div className="space-y-4 p-4">
            <Segmented label={t('from')} showLabel value={from} onChange={setFrom} options={BASES.map((b) => ({ value: b, label: t(`bases.${b}`) }))} />
            <label className="block">
              <span className="text-sm text-muted-foreground">{t('number')}</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t(`placeholders.${from}`)}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={invalid}
                aria-describedby={invalid ? 'base-error' : undefined}
                className={cn(fieldClass, 'mt-2 w-full text-base')}
              />
            </label>
            {invalid && (
              <p id="base-error" aria-live="polite" className="flex items-center gap-2 text-sm font-medium text-destructive">
                <CircleAlert aria-hidden className="size-4 shrink-0" />
                {t('invalid', { base: from })}
              </p>
            )}
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              {t('customBase')}
              <input type="number" min={2} max={36} value={Number.isNaN(custom) ? '' : custom} onChange={(e) => setCustom(e.target.valueAsNumber)} aria-invalid={!customOk} className={cn(fieldClass, 'w-20')} />
            </label>
          </div>
        </Pane>
        <Pane label={t('output')} className="max-lg:border-t lg:border-l">
          {value === null ? (
            <p className="p-4 text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <ValueRows
              rows={[
                ...BASES.map((b) => ({ label: t(`bases.${b}`), value: formatInteger(value, Number(b)) })),
                ...(customOk ? [{ label: t('baseN', { base: custom }), value: formatInteger(value, custom) }] : []),
              ]}
            />
          )}
        </Pane>
      </div>
    </ToolCard>
  );
}
