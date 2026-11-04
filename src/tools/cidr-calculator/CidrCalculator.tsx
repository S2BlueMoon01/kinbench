'use client';

import { useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { CircleAlert } from 'lucide-react';
import { fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { cn } from '@/lib/utils';
import { cidr } from './logic';

export default function CidrCalculator() {
  const t = useTranslations('tools.cidr-calculator.ui');
  const format = useFormatter();
  const [input, setInput] = useState('');
  const info = useMemo(() => cidr(input), [input]);
  const invalid = input.trim() !== '' && !info;

  return (
    <ToolCard>
      <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Pane label={t('input')} htmlFor="cidr-input">
          <div className="space-y-3 p-4">
            <input
              id="cidr-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="192.168.1.0/24"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              aria-invalid={invalid}
              aria-describedby="cidr-hint"
              className={cn(fieldClass, 'w-full text-base')}
            />
            <p id="cidr-hint" aria-live="polite" className={cn('flex items-center gap-2 text-sm', invalid ? 'font-medium text-destructive' : 'text-muted-foreground')}>
              {invalid && <CircleAlert aria-hidden className="size-4 shrink-0" />}
              {t(invalid ? 'invalid' : 'hint')}
            </p>
          </div>
        </Pane>
        <Pane label={info ? t('result', { version: info.version }) : t('resultEmpty')} className="max-lg:border-t lg:border-l">
          {info ? (
            <ValueRows
              rows={[
                { label: t('network'), value: `${info.network}/${info.prefix}` },
                { label: t(info.version === 4 ? 'broadcast' : 'last'), value: info.last },
                { label: t('netmask'), value: info.netmask },
                { label: t('hostmask'), value: info.hostmask },
                { label: t('firstHost'), value: info.firstHost },
                { label: t('lastHost'), value: info.lastHost },
                { label: t('total'), value: format.number(info.total) },
                { label: t(info.version === 4 ? 'usable' : 'usableV6'), value: format.number(info.usable) },
              ]}
            />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{t('empty')}</p>
          )}
        </Pane>
      </div>
    </ToolCard>
  );
}
