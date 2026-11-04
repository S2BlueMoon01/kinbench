'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props<T extends string> = {
  label: string;
  showLabel?: boolean;
  value: T | undefined;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
};

/** Native radio group styled as a segmented control: keyboard arrows and screen readers work for free. */
export function Segmented<T extends string>({ label, showLabel, value, options, onChange, className }: Props<T>) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex items-center gap-2', className)}>
      {showLabel && <span aria-hidden className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">{label}</span>}
      <div className="inline-flex rounded-lg border bg-muted/60 p-0.5">
        {options.map((o) => (
          <label
            key={o.value}
            className="grid h-8 min-w-8 place-items-center rounded-md px-2.5 text-sm text-muted-foreground transition-colors select-none hover:text-foreground has-checked:bg-card has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-ring pointer-coarse:h-10 pointer-coarse:min-w-10"
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}
