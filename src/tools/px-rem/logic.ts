/** Rounded to 4 decimals, which is more precision than any browser renders. */
const round = (n: number) => Math.round(n * 10_000) / 10_000;

export const pxToRem = (px: number, base: number) => (Number.isFinite(px) && base > 0 ? round(px / base) : null);
export const remToPx = (rem: number, base: number) => (Number.isFinite(rem) && base > 0 ? round(rem * base) : null);

export const COMMON_PX = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96];
