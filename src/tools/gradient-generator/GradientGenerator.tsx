'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RangeField } from '@/components/RangeField';
import { Segmented } from '@/components/Segmented';
import { Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { useStyle } from '@/lib/useStyle';
import { DEFAULT_GRADIENT, gradientCss, type Gradient, type GradientType } from './logic';

const MAX_STOPS = 6;

export default function GradientGenerator() {
  const t = useTranslations('tools.gradient-generator.ui');
  const [g, setG] = useState<Gradient>(DEFAULT_GRADIENT);
  const css = gradientCss(g);
  const preview = useStyle({ 'background-image': css });
  const setStop = (i: number, patch: Partial<Gradient['stops'][number]>) => setG({ ...g, stops: g.stops.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  return (
    <ToolCard>
      <div className="grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Pane label={t('settings')}>
          <div className="space-y-4 p-4">
            <Segmented<GradientType> label={t('type')} showLabel value={g.type} onChange={(type) => setG({ ...g, type })} options={(['linear', 'radial', 'conic'] as const).map((v) => ({ value: v, label: t(`types.${v}`) }))} />
            {g.type !== 'radial' && <RangeField label={t('angle')} unit="deg" min={0} max={359} value={g.angle} onChange={(angle) => setG({ ...g, angle })} />}
          </div>
          <fieldset className="space-y-4 border-t border-dashed p-4">
            <legend className="sr-only">{t('stops')}</legend>
            {g.stops.map((s, i) => (
              <div key={i} className="flex items-end gap-3">
                <input type="color" aria-label={t('stopColor', { n: i + 1 })} value={s.color} onChange={(e) => setStop(i, { color: e.target.value })} className="mb-1 h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-input bg-background p-1 pointer-coarse:h-11" />
                <RangeField className="min-w-0 flex-1" label={t('stop', { n: i + 1 })} unit="%" min={0} max={100} value={s.position} onChange={(position) => setStop(i, { position })} />
                {g.stops.length > 2 && (
                  <Button variant="ghost" size="icon" className="mb-0.5" aria-label={t('removeStop', { n: i + 1 })} onClick={() => setG({ ...g, stops: g.stops.filter((_, j) => j !== i) })}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
            {g.stops.length < MAX_STOPS && (
              <Button variant="outline" size="sm" onClick={() => setG({ ...g, stops: [...g.stops, { color: '#ffffff', position: 50 }] })}>
                <Plus />
                {t('addStop')}
              </Button>
            )}
          </fieldset>
        </Pane>
        <Pane label={t('preview')} className="max-lg:border-t lg:border-l">
          <div className="p-4">
            <div ref={preview} role="img" aria-label={t('preview')} className="h-56 rounded-xl border sm:h-72" />
          </div>
          <div className="border-t border-dashed">
            <ValueRows rows={[{ label: 'CSS', value: `background-image: ${css};` }]} />
          </div>
        </Pane>
      </div>
    </ToolCard>
  );
}
