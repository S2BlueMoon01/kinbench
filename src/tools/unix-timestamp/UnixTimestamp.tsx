'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { CircleAlert, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/Segmented';
import { SplitPanes } from '@/components/SplitPanes';
import { fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { cn } from '@/lib/utils';
import { parseTimestamp, type Unit } from './logic';

export default function UnixTimestamp() {
  const t = useTranslations('tools.unix-timestamp.ui');
  const tActions = useTranslations('ui.actions');
  const format = useFormatter();
  const [now, setNow] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [unit, setUnit] = useState<Unit>('auto');
  const [local, setLocal] = useState('');

  // The clock starts after mount: the static HTML must not contain the build time.
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const parsed = useMemo(() => parseTimestamp(input, unit), [input, unit]);
  const fromLocal = local ? new Date(local).getTime() : NaN; // datetime-local values are in the device's time zone
  const timeZone = now === null ? '' : Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <ToolCard>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Clock aria-hidden className="size-4" />
          {t('now')}
        </span>
        <span className="font-mono text-xl font-semibold tabular-nums">{now === null ? '—' : Math.floor(now / 1000)}</span>
        <Button variant="outline" size="sm" disabled={now === null} onClick={() => { setInput(String(Math.floor(Date.now() / 1000))); setUnit('auto'); }}>
          {t('useNow')}
        </Button>
      </div>
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane label={t('toDate')}>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <label htmlFor="ts-input" className="sr-only">{t('timestamp')}</label>
              <input
                id="ts-input"
                inputMode="numeric"
                autoComplete="off"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="1700000000"
                aria-invalid={input !== '' && !parsed}
                aria-describedby={input !== '' && !parsed ? 'ts-error' : undefined}
                className={cn(fieldClass, 'min-w-0 flex-1 basis-48 text-base')}
              />
              <Segmented label={t('unit')} value={unit} onChange={setUnit} options={[{ value: 'auto', label: t('auto') }, { value: 's', label: t('seconds') }, { value: 'ms', label: t('milliseconds') }]} />
            </div>
            {input !== '' && !parsed && (
              <p id="ts-error" aria-live="polite" className="flex items-center gap-2 border-t border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm font-medium text-destructive">
                <CircleAlert aria-hidden className="size-4 shrink-0" />
                {t('invalid')}
              </p>
            )}
            {parsed && now !== null && (
              <div className="border-t border-dashed">
                <p className="px-4 pt-2.5 font-mono text-xs text-muted-foreground">{t(parsed.unit === 's' ? 'readAsSeconds' : 'readAsMilliseconds')}</p>
                <ValueRows
                  rows={[
                    { label: t('iso'), value: parsed.date.toISOString() },
                    { label: t('localTime', { timeZone }), value: format.dateTime(parsed.date, { dateStyle: 'full', timeStyle: 'medium', timeZone }) },
                    { label: t('relative'), value: format.relativeTime(parsed.date, now) },
                    { label: t('seconds'), value: String(Math.floor(parsed.date.getTime() / 1000)) },
                    { label: t('milliseconds'), value: String(parsed.date.getTime()) },
                  ]}
                />
              </div>
            )}
          </Pane>
        }
        right={
          <Pane label={t('toTimestamp')} className="max-lg:border-t">
            <div className="p-4">
              <label htmlFor="ts-local" className="text-sm text-muted-foreground">{t('localDate', { timeZone })}</label>
              <input id="ts-local" type="datetime-local" step={1} value={local} onChange={(e) => setLocal(e.target.value)} className={cn(fieldClass, 'mt-2 w-full font-sans text-base')} />
            </div>
            {Number.isFinite(fromLocal) && (
              <div className="border-t border-dashed">
                <ValueRows
                  rows={[
                    { label: t('seconds'), value: String(Math.floor(fromLocal / 1000)) },
                    { label: t('milliseconds'), value: String(fromLocal) },
                    { label: t('iso'), value: new Date(fromLocal).toISOString() },
                  ]}
                />
              </div>
            )}
          </Pane>
        }
      />
    </ToolCard>
  );
}
