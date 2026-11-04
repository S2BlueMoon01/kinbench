export type Shadow = { x: number; y: number; blur: number; spread: number; color: string; opacity: number; inset: boolean };

export const DEFAULT_SHADOW: Shadow = { x: 0, y: 8, blur: 24, spread: -4, color: '#0b1a2a', opacity: 25, inset: false };

/** "#rrggbb" + opacity 0–100 → "rgb(r g b / a)". */
export function rgba(hex: string, opacity: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0;
  const a = Math.min(100, Math.max(0, opacity)) / 100;
  return `rgb(${n >> 16} ${(n >> 8) & 255} ${n & 255}${a < 1 ? ` / ${Number(a.toFixed(2))}` : ''})`;
}

const px = (n: number) => (Number.isFinite(n) && n !== 0 ? `${n}px` : '0');

/** Layers are drawn front to back in CSS order. No layers means `none`. */
export function boxShadowCss(layers: Shadow[]): string {
  if (layers.length === 0) return 'none';
  return layers.map((s) => `${s.inset ? 'inset ' : ''}${px(s.x)} ${px(s.y)} ${px(Math.max(0, s.blur))} ${px(s.spread)} ${rgba(s.color, s.opacity)}`).join(', ');
}
