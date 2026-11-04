'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

const clamp = (n: number) => Math.min(80, Math.max(20, Math.round(n)));

/** Stacked below 1024px, side by side with a draggable/keyboard splitter above. Pure CSS grid, so no layout shift. */
export function SplitPanes({ left, right, label }: { left: ReactNode; right: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [split, setSplit] = useState(50);

  // Set through CSSOM rather than a style attribute so the CSP needs no 'unsafe-inline' for styles.
  useEffect(() => ref.current?.style.setProperty('--split', `${split}%`), [split]);

  return (
    <div ref={ref} className="grid [--split:50%] lg:grid-cols-[minmax(0,var(--split))_auto_minmax(0,1fr)]">
      {left}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuenow={split}
        aria-valuemin={20}
        aria-valuemax={80}
        tabIndex={0}
        className="group hidden w-3 cursor-col-resize touch-none place-items-center lg:grid"
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => {
          if (!dragging.current || !ref.current) return;
          const r = ref.current.getBoundingClientRect();
          setSplit(clamp(((e.clientX - r.left) / r.width) * 100));
        }}
        onPointerUp={() => (dragging.current = false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setSplit((s) => clamp(s - 5));
          if (e.key === 'ArrowRight') setSplit((s) => clamp(s + 5));
        }}
      >
        <span className="h-full w-px bg-border transition-colors group-hover:bg-ring group-focus-visible:bg-ring" />
      </div>
      {right}
    </div>
  );
}
