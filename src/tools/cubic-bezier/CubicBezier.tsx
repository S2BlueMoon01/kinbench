'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fieldClass, Pane, ToolCard } from '@/components/ToolCard';
import { ValueRows } from '@/components/ValueRows';
import { useStyle } from '@/lib/useStyle';
import { cn } from '@/lib/utils';
import { bezierCss, clampBezier, PRESETS, type Bezier } from './logic';

// Graph space: x 0–1, y −0.5–1.5 (room for overshoot). SVG y grows downward, so y is drawn as 1 − y.
const VIEW = { x: -0.05, y: -0.55, w: 1.1, h: 2.1 };
const LABELS = ['x1', 'y1', 'x2', 'y2'] as const;

export default function CubicBezier() {
  const t = useTranslations('tools.cubic-bezier.ui');
  const [b, setB] = useState<Bezier>(PRESETS.ease);
  const [played, setPlayed] = useState(false);
  const drag = useRef<0 | 1 | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const css = bezierCss(b);
  const curveDot = useStyle({ 'transition-timing-function': css });
  const [x1, y1, x2, y2] = b;

  function move(e: React.PointerEvent) {
    if (drag.current === null || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * VIEW.w + VIEW.x;
    const y = 1 - (((e.clientY - r.top) / r.height) * VIEW.h + VIEW.y);
    const next = [...b] as Bezier;
    next[drag.current * 2] = x;
    next[drag.current * 2 + 1] = Math.min(1.5, Math.max(-0.5, y));
    setB(clampBezier(next));
  }

  const handle = (i: 0 | 1, x: number, y: number) => (
    <circle cx={x} cy={1 - y} r={0.045} className="cursor-grab fill-primary stroke-background" strokeWidth={2} vectorEffect="non-scaling-stroke" onPointerDown={(e) => { drag.current = i; e.currentTarget.setPointerCapture(e.pointerId); }} />
  );

  return (
    <ToolCard>
      <div className="grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Pane label={t('curve')}>
          <div className="p-4">
            {/* Mouse/touch editing; the number fields below are the keyboard and screen-reader way to set the same values. */}
            <svg
              ref={svg}
              aria-hidden
              viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
              className="mx-auto block aspect-[1.1/2.1] w-full max-w-56 touch-none rounded-lg bg-muted/50"
              onPointerMove={move}
              onPointerUp={() => (drag.current = null)}
            >
              <rect x={0} y={0} width={1} height={1} className="fill-card stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <line x1={0} y1={1} x2={1} y2={0} className="stroke-border" strokeDasharray="4 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <line x1={0} y1={1} x2={x1} y2={1 - y1} className="stroke-muted-foreground" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <line x1={1} y1={0} x2={x2} y2={1 - y2} className="stroke-muted-foreground" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <path d={`M0,1 C${x1},${1 - y1} ${x2},${1 - y2} 1,0`} className="fill-none stroke-ring" strokeWidth={3} vectorEffect="non-scaling-stroke" />
              {handle(0, x1, y1)}
              {handle(1, x2, y2)}
            </svg>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {LABELS.map((label, i) => (
                <label key={label} className="text-xs text-muted-foreground">
                  {label}
                  <input
                    type="number"
                    step={0.01}
                    min={i % 2 === 0 ? 0 : -2}
                    max={i % 2 === 0 ? 1 : 3}
                    value={b[i]}
                    onChange={(e) => { const next = [...b] as Bezier; next[i] = e.target.valueAsNumber || 0; setB(clampBezier(next)); }}
                    className={cn(fieldClass, 'mt-1 w-full px-2')}
                  />
                </label>
              ))}
            </div>
          </div>
        </Pane>
        <Pane label={t('preview')} className="max-lg:border-t lg:border-l">
          <div className="flex flex-wrap gap-2 border-b border-dashed p-4">
            {Object.keys(PRESETS).map((name) => (
              <button key={name} type="button" onClick={() => setB(PRESETS[name])} className="rounded-lg border bg-muted/60 px-2.5 py-1 font-mono text-xs hover:bg-muted pointer-coarse:py-3">{name}</button>
            ))}
          </div>
          <div className="space-y-4 p-4">
            <Button variant="outline" onClick={() => setPlayed((p) => !p)}>
              <Play />
              {t('play')}
            </Button>
            {([['curve', curveDot], ['linear', null]] as const).map(([kind, ref]) => (
              <div key={kind}>
                <p className="text-xs text-muted-foreground">{t(kind === 'curve' ? 'yourCurve' : 'linear')}</p>
                <div className="@container mt-1 h-8 rounded-full bg-muted p-1">
                  <div ref={ref ?? undefined} className={cn('size-6 rounded-full transition-transform duration-1000 motion-reduce:transition-none', kind === 'curve' ? 'bg-primary' : 'bg-muted-foreground ease-linear', played && 'translate-x-[calc(100cqw-1.5rem)]')} />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed">
            <ValueRows rows={[{ label: 'CSS', value: css }, { label: 'transition', value: `transition: transform 300ms ${css};` }]} />
          </div>
        </Pane>
      </div>
    </ToolCard>
  );
}
