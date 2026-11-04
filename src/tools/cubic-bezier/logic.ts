export type Bezier = [number, number, number, number];

/** CSS keywords and common easings (easings.net). */
export const PRESETS: Record<string, Bezier> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1],
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutCubic: [0.65, 0, 0.35, 1],
  easeOutBack: [0.34, 1.56, 0.64, 1],
  easeInOutBack: [0.68, -0.6, 0.32, 1.6],
};

const round = (n: number) => Math.round(n * 100) / 100;

/** x values must stay within 0–1 for a valid timing function; y may overshoot (bounce effects). */
export const clampBezier = ([x1, y1, x2, y2]: Bezier): Bezier => [Math.min(1, Math.max(0, round(x1))), round(y1), Math.min(1, Math.max(0, round(x2))), round(y2)];

export const bezierCss = (b: Bezier) => `cubic-bezier(${clampBezier(b).join(', ')})`;

/** Reads "cubic-bezier(.17,.67,.83,.67)", "0.17, 0.67, 0.83, 0.67" or a keyword like "ease-in". */
export function parseBezier(input: string): Bezier | null {
  const s = input.trim().toLowerCase();
  if (/^[a-z-]+$/.test(s) && PRESETS[s]) return PRESETS[s];
  const nums = s.replace(/^cubic-bezier\(|\)$/g, '').split(/[\s,]+/).filter(Boolean).map(Number);
  if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n)) || nums[0] < 0 || nums[0] > 1 || nums[2] < 0 || nums[2] > 1) return null;
  return nums as Bezier;
}
