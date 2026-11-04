'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { CopyButton } from '@/components/CopyButton';

type Row = { label: string; value: string; extra?: ReactNode };

/** Labelled read-only values, each with its own copy button (in a second <dd>: a <dl> group may hold only dt/dd). */
export function ValueRows({ rows }: { rows: Row[] }) {
  const t = useTranslations('ui.actions');
  return (
    <dl className="divide-y divide-dashed">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5">
          <dt className="col-start-1 text-xs text-muted-foreground">{r.label}</dt>
          <dd className="col-start-1 mt-0.5 font-mono text-sm break-all whitespace-pre-wrap">
            {r.value}
            {r.extra}
          </dd>
          <dd className="col-start-2 row-span-2 row-start-1">
            <CopyButton iconOnly text={r.value} label={t('copyNamed', { name: r.label })} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
