'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';
import { fieldClass } from './ToolCard';

type Props = { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (n: number) => void; className?: string };

/** A slider with a number field next to it; both edit the same value and share one label. */
export function RangeField({ label, value, min, max, step = 1, unit, onChange, className }: Props) {
  const id = useId();
  const set = (n: number) => onChange(Number.isFinite(n) ? n : min);
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-x-3 gap-y-1', className)}>
      <label htmlFor={id} className="col-span-2 flex justify-between text-sm text-muted-foreground">
        {label}
        {unit && <span className="font-mono text-xs">{unit}</span>}
      </label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(e.target.valueAsNumber)} aria-label={label} className="h-11 w-full accent-primary sm:h-8" />
      <input id={id} type="number" min={min} max={max} step={step} value={value} onChange={(e) => set(e.target.valueAsNumber)} className={cn(fieldClass, 'w-full')} />
    </div>
  );
}
