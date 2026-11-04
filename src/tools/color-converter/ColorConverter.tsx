'use client';

import { useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { ArrowUpDown, CircleCheck, CircleX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SplitPanes } from '@/components/SplitPanes';
import { fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { useStyle } from '@/lib/useStyle';
import { cn } from '@/lib/utils';
import { contrastRatio, parseColor, toHex, toHsl, toOklch, toRgb, wcag, type Rgba } from './logic';

/** Our parser first; then the browser's own (named colors like "rebeccapurple", and anything else canvas accepts). */
function readColor(input: string): Rgba | null {
  const parsed = parseColor(input);
  if (parsed || !input.trim() || typeof OffscreenCanvas === 'undefined') return parsed;
  const ctx = new OffscreenCanvas(1, 1).getContext('2d')!;
  ctx.fillStyle = '#010203';
  ctx.fillStyle = input.trim();
  return ctx.fillStyle === '#010203' ? null : parseColor(String(ctx.fillStyle));
}

function ColorField({ id, label, pickLabel, value, onChange, color }: { id: string; label: string; pickLabel: string; value: string; onChange: (v: string) => void; color: Rgba | null }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm text-muted-foreground">{label}</label>
      <div className="mt-2 flex gap-2">
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} autoComplete="off" aria-invalid={!color} className={cn(fieldClass, 'min-w-0 flex-1 text-base')} />
        <input type="color" aria-label={pickLabel} value={color ? toHex({ ...color, a: 1 }) : '#000000'} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-input bg-background p-1 pointer-coarse:h-11" />
      </div>
    </div>
  );
}

export default function ColorConverter() {
  const t = useTranslations('tools.color-converter.ui');
  const tActions = useTranslations('ui.actions');
  const format = useFormatter();
  const [input, setInput] = useState('#7cc8f8');
  const [fg, setFg] = useState('#131820');
  const [bg, setBg] = useState('#ffffff');
  const color = useMemo(() => readColor(input), [input]);
  const fgc = useMemo(() => readColor(fg), [fg]);
  const bgc = useMemo(() => readColor(bg), [bg]);
  const ratio = fgc && bgc ? contrastRatio(fgc, { ...bgc, a: 1 }) : null;
  const swatch = useStyle({ 'background-color': color ? toRgb(color) : 'transparent' });
  const preview = useStyle({ color: fgc ? toRgb(fgc) : 'inherit', 'background-color': bgc ? toRgb({ ...bgc, a: 1 }) : 'transparent' });
  const checks = ratio === null ? null : wcag(ratio);

  return (
    <ToolCard>
      <SplitPanes
        label={tActions('resize')}
        left={
          <Pane label={t('convert')}>
            <div className="flex items-end gap-4 p-4">
              <div className="min-w-0 flex-1">
                <ColorField id="color-input" label={t('color')} pickLabel={t('pick', { name: t('color') })} value={input} onChange={setInput} color={color} />
              </div>
              <div ref={swatch} aria-hidden className="size-20 shrink-0 rounded-xl border bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)]" />
            </div>
            {color ? (
              <div className="border-t border-dashed">
                <ValueRows rows={[{ label: 'HEX', value: toHex(color) }, { label: 'RGB', value: toRgb(color) }, { label: 'HSL', value: toHsl(color) }, { label: 'OKLCH', value: toOklch(color) }]} />
              </div>
            ) : (
              <p aria-live="polite" className="border-t px-4 py-3 text-sm text-destructive">{t('invalid')}</p>
            )}
          </Pane>
        }
        right={
          <Pane label={t('contrast')} className="max-lg:border-t">
            <div className="space-y-3 p-4">
              <ColorField id="fg-input" label={t('foreground')} pickLabel={t('pick', { name: t('foreground') })} value={fg} onChange={setFg} color={fgc} />
              <Button variant="ghost" size="sm" onClick={() => { setFg(bg); setBg(fg); }}>
                <ArrowUpDown />
                {t('swap')}
              </Button>
              <ColorField id="bg-input" label={t('background')} pickLabel={t('pick', { name: t('background') })} value={bg} onChange={setBg} color={bgc} />
              <div ref={preview} className="rounded-xl border p-4">
                <p className="text-lg font-semibold">{t('sampleLarge')}</p>
                <p className="mt-1 text-sm">{t('sampleNormal')}</p>
              </div>
              {ratio !== null && checks && (
                <div aria-live="polite">
                  <p className="font-mono text-3xl font-semibold">{format.number(ratio, { maximumFractionDigits: 2 })}:1</p>
                  <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    {(['aa', 'aaLarge', 'aaa', 'aaaLarge'] as const).map((k) => (
                      <li key={k} className={cn('flex items-center gap-2 rounded-lg px-3 py-2', checks[k] ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                        {checks[k] ? <CircleCheck aria-hidden className="size-4" /> : <CircleX aria-hidden className="size-4" />}
                        {t(`levels.${k}`)} · {t(checks[k] ? 'pass' : 'fail')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Pane>
        }
      />
    </ToolCard>
  );
}
