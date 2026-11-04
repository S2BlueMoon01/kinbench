'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import cronstrue from 'cronstrue';
import 'cronstrue/locales/vi';
import { CircleAlert } from 'lucide-react';
import { Segmented } from '@/components/Segmented';
import { fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { cn } from '@/lib/utils';
import { FIELDS, nextRuns, parseCron } from './logic';

const PRESETS = ['* * * * *', '*/5 * * * *', '0 * * * *', '0 0 * * *', '0 9 * * MON-FRI', '0 0 1 * *'];

export default function CronParser() {
  const t = useTranslations('tools.cron-parser.ui');
  const format = useFormatter();
  const locale = useLocale();
  const [input, setInput] = useState('*/15 9-17 * * MON-FRI');
  const [zone, setZone] = useState<'local' | 'utc'>('local');
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), [input, zone]); // client only: the static HTML must not contain build-time dates

  const parsed = useMemo(() => parseCron(input), [input]);
  const description = useMemo(() => {
    if (!parsed.ok) return '';
    try {
      return cronstrue.toString(parsed.expression, { locale, use24HourTimeFormat: true, throwExceptionOnParseError: true });
    } catch {
      return '';
    }
  }, [parsed, locale]);
  const runs = parsed.ok && now !== null ? nextRuns(parsed.cron, new Date(now), 10, zone === 'utc') : [];
  const timeZone = zone === 'utc' ? 'UTC' : now === null ? undefined : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = parsed.ok ? parsed.expression.split(/\s+/) : [];

  return (
    <ToolCard>
      <div className="border-b p-4">
        <label htmlFor="cron-input" className="text-sm text-muted-foreground">{t('expression')}</label>
        <input
          id="cron-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-invalid={!parsed.ok}
          aria-describedby="cron-description"
          className={cn(fieldClass, 'mt-2 w-full text-lg')}
        />
        <p id="cron-description" aria-live="polite" className={cn('mt-3 flex items-start gap-2 text-lg', parsed.ok ? 'font-medium' : 'text-base font-medium text-destructive')}>
          {!parsed.ok && <CircleAlert aria-hidden className="mt-1 size-4 shrink-0" />}
          {parsed.ok ? description : t(`errors.${parsed.error}`)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => setInput(p)} className="rounded-lg border bg-muted/60 px-2.5 py-1 font-mono text-xs hover:bg-muted pointer-coarse:py-3">
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Pane label={t('fields')}>
          <dl className="divide-y divide-dashed">
            {FIELDS.map((f, i) => (
              <div key={f} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
                <dt className="text-muted-foreground">{t(`field.${f}`)}</dt>
                <dd className="font-mono">{parts[i] ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </Pane>
        <Pane
          label={t('next')}
          className="max-lg:border-t lg:border-l"
          aside={<Segmented label={t('timeZone')} value={zone} onChange={setZone} options={[{ value: 'local', label: t('local') }, { value: 'utc', label: 'UTC' }]} />}
        >
          {runs.length > 0 ? (
            <ol className="divide-y divide-dashed">
              {runs.map((d) => (
                <li key={d.getTime()} className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2 text-sm">
                  <span className="font-mono">{format.dateTime(d, { dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23', timeZone })}</span>
                  <span className="text-xs text-muted-foreground">{format.relativeTime(d, now!)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{parsed.ok && now !== null ? t('never') : t('empty')}</p>
          )}
        </Pane>
      </div>
    </ToolCard>
  );
}
