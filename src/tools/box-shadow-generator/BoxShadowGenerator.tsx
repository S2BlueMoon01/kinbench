'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RangeField } from '@/components/RangeField';
import { Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { useStyle } from '@/lib/useStyle';
import { cn } from '@/lib/utils';
import { boxShadowCss, DEFAULT_SHADOW, type Shadow } from './logic';

const MAX_LAYERS = 5;

export default function BoxShadowGenerator() {
  const t = useTranslations('tools.box-shadow-generator.ui');
  const [layers, setLayers] = useState<Shadow[]>([DEFAULT_SHADOW]);
  const [active, setActive] = useState(0);
  const css = boxShadowCss(layers);
  const preview = useStyle({ 'box-shadow': css });
  const layer = layers[active];
  const update = (patch: Partial<Shadow>) => setLayers(layers.map((l, i) => (i === active ? { ...l, ...patch } : l)));

  return (
    <ToolCard>
      <div className="grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Pane label={t('layers')}>
          <div className="flex flex-wrap items-center gap-2 border-b border-dashed p-3" role="group" aria-label={t('layers')}>
            {layers.map((_, i) => (
              <button key={i} type="button" aria-pressed={i === active} onClick={() => setActive(i)} className={cn('h-8 rounded-md border px-2.5 text-sm pointer-coarse:h-11', i === active ? 'border-ring bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {t('layer', { n: i + 1 })}
              </button>
            ))}
            {layers.length < MAX_LAYERS && (
              <Button variant="ghost" size="sm" onClick={() => { setLayers([...layers, { ...DEFAULT_SHADOW, y: 2, blur: 4, spread: 0, opacity: 15 }]); setActive(layers.length); }}>
                <Plus />
                {t('addLayer')}
              </Button>
            )}
          </div>
          {layer && (
            <div className="space-y-3 p-4">
              <RangeField label={t('x')} unit="px" min={-100} max={100} value={layer.x} onChange={(x) => update({ x })} />
              <RangeField label={t('y')} unit="px" min={-100} max={100} value={layer.y} onChange={(y) => update({ y })} />
              <RangeField label={t('blur')} unit="px" min={0} max={200} value={layer.blur} onChange={(blur) => update({ blur })} />
              <RangeField label={t('spread')} unit="px" min={-100} max={100} value={layer.spread} onChange={(spread) => update({ spread })} />
              <RangeField label={t('opacity')} unit="%" min={0} max={100} value={layer.opacity} onChange={(opacity) => update({ opacity })} />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                  <input type="color" value={layer.color} onChange={(e) => update({ color: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-input bg-background p-1" />
                  {t('color')}
                </label>
                <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={layer.inset} onChange={(e) => update({ inset: e.target.checked })} className="size-4 accent-primary" />
                  {t('inset')}
                </label>
                {layers.length > 1 && (
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setLayers(layers.filter((_, i) => i !== active)); setActive(0); }}>
                    <Trash2 />
                    {t('removeLayer')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Pane>
        <Pane label={t('preview')} className="max-lg:border-t lg:border-l">
          <div className="grid min-h-72 place-items-center bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[16px_16px] p-10">
            <div ref={preview} className="size-40 rounded-2xl border border-border/60 bg-card" />
          </div>
          <div className="border-t border-dashed">
            <ValueRows rows={[{ label: 'CSS', value: `box-shadow: ${css};` }]} />
          </div>
        </Pane>
      </div>
    </ToolCard>
  );
}
