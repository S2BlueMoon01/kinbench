'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { cn } from '@/lib/utils';
import { COMMON_PX, pxToRem, remToPx } from './logic';

const show = (n: number | null) => (n === null ? '' : String(n));

export default function PxRem() {
  const t = useTranslations('tools.px-rem.ui');
  const format = useFormatter();
  const [base, setBase] = useState(16);
  const [px, setPx] = useState('16');
  const [rem, setRem] = useState('1');

  // Editing one field recomputes the other; changing the root size keeps px and updates rem.
  const onPx = (v: string) => { setPx(v); setRem(v === '' ? '' : show(pxToRem(Number(v), base))); };
  const onRem = (v: string) => { setRem(v); setPx(v === '' ? '' : show(remToPx(Number(v), base))); };
  const onBase = (b: number) => { setBase(b); if (px !== '') setRem(show(pxToRem(Number(px), b))); };

  const field = (id: string, label: string, value: string, onChange: (v: string) => void) => (
    <label htmlFor={id} className="block">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input id={id} type="number" inputMode="decimal" step="any" value={value} onChange={(e) => onChange(e.target.value)} className={cn(fieldClass, 'mt-2 w-full text-lg')} />
    </label>
  );

  return (
    <ToolCard>
      <div className="grid lg:grid-cols-2">
        <Pane label={t('convert')}>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3">
              {field('px-value', t('px'), px, onPx)}
              {field('rem-value', t('rem'), rem, onRem)}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              {t('base')}
              <input type="number" min={1} value={Number.isNaN(base) ? '' : base} onChange={(e) => onBase(e.target.valueAsNumber)} className={cn(fieldClass, 'w-20')} />
              px
            </label>
            <p className="text-sm text-muted-foreground">{t('hint', { base: Number.isNaN(base) ? 16 : base })}</p>
          </div>
        </Pane>
        <Pane label={t('table')} className="max-lg:border-t lg:border-l">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-normal">px</th>
                <th scope="col" className="px-4 py-2 font-normal">rem</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {COMMON_PX.map((p) => (
                <tr key={p} className="border-t border-dashed">
                  <td className="px-4 py-1.5">{p}px</td>
                  <td className="px-4 py-1.5">{pxToRem(p, base) === null ? '—' : `${format.number(pxToRem(p, base)!, { maximumFractionDigits: 4, useGrouping: false })}rem`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Pane>
      </div>
    </ToolCard>
  );
}
