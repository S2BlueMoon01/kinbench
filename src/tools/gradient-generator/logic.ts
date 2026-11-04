export type GradientType = 'linear' | 'radial' | 'conic';
export type Stop = { color: string; position: number };
export type Gradient = { type: GradientType; angle: number; stops: Stop[] };

export const DEFAULT_GRADIENT: Gradient = {
  type: 'linear',
  angle: 135,
  stops: [
    { color: '#7cc8f8', position: 0 },
    { color: '#c4b5fd', position: 100 },
  ],
};

const clamp = (n: number, max: number) => Math.min(max, Math.max(0, Number.isFinite(n) ? Math.round(n) : 0));

/** Stops are sorted by position; angle is ignored for radial gradients, which are circles from the center. */
export function gradientCss({ type, angle, stops }: Gradient): string {
  const list = [...stops].sort((a, b) => a.position - b.position).map((s) => `${s.color} ${clamp(s.position, 100)}%`).join(', ');
  const a = clamp(((angle % 360) + 360) % 360, 359);
  if (type === 'radial') return `radial-gradient(circle, ${list})`;
  if (type === 'conic') return `conic-gradient(from ${a}deg, ${list})`;
  return `linear-gradient(${a}deg, ${list})`;
}
