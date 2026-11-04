/** sRGB channels 0–255 (may be fractional) and alpha 0–1. */
export type Rgba = { r: number; g: number; b: number; a: number };

const clamp = (n: number, max: number) => Math.min(max, Math.max(0, n));
const num = (s: string, percentOf: number) => (s.endsWith('%') ? (parseFloat(s) / 100) * percentOf : parseFloat(s));
const hue = (s: string) => (s.endsWith('turn') ? parseFloat(s) * 360 : s.endsWith('rad') ? (parseFloat(s) * 180) / Math.PI : parseFloat(s));

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** OKLCH → sRGB (Björn Ottosson's OKLab matrices), clamped to the sRGB gamut. */
function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return rgb.map((c) => clamp(fromLinear(c), 1) * 255) as [number, number, number];
}

/** Hex (#rgb, #rgba, #rrggbb, #rrggbbaa, with or without #), rgb(), hsl() and oklch(), in comma or space syntax. */
export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();
  const hex = s.match(/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
    const [r, g, b, a = 255] = full.match(/../g)!.map((h) => parseInt(h, 16));
    return { r, g, b, a: a / 255 };
  }
  const fn = s.match(/^(rgba?|hsla?|oklch)\(\s*([^)]*)\)$/);
  if (!fn) return null;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4 || parts.some((p) => !/^-?[\d.]+(%|deg|turn|rad)?$/.test(p))) return null;
  const alpha = parts[3] === undefined ? 1 : clamp(num(parts[3], 1), 1);
  let rgb: [number, number, number];
  if (fn[1].startsWith('rgb')) rgb = parts.slice(0, 3).map((p) => clamp(num(p, 255), 255)) as [number, number, number];
  else if (fn[1].startsWith('hsl')) rgb = hslToRgb(((hue(parts[0]) % 360) + 360) % 360, clamp(num(parts[1], 100), 100) / 100, clamp(num(parts[2], 100), 100) / 100);
  else rgb = oklchToRgb(clamp(num(parts[0], 1), 1), Math.max(0, num(parts[1], 0.4)), hue(parts[2]));
  return { r: rgb[0], g: rgb[1], b: rgb[2], a: alpha };
}

const byte = (n: number) => Math.round(clamp(n, 255));
const fixed = (n: number, d: number) => String(Number(n.toFixed(d)));

export function toHex({ r, g, b, a }: Rgba): string {
  const hex = [r, g, b, ...(a < 1 ? [a * 255] : [])].map((c) => byte(c).toString(16).padStart(2, '0')).join('');
  return `#${hex}`;
}

export const toRgb = ({ r, g, b, a }: Rgba) => `rgb(${byte(r)} ${byte(g)} ${byte(b)}${a < 1 ? ` / ${fixed(a, 3)}` : ''})`;

export function toHsl({ r, g, b, a }: Rgba): string {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const h = d === 0 ? 0 : max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return `hsl(${fixed(h * 60, 1)} ${fixed(s * 100, 1)}% ${fixed(l * 100, 1)}%${a < 1 ? ` / ${fixed(a, 3)}` : ''})`;
}

export function toOklch({ r, g, b, a }: Rgba): string {
  const [R, G, B] = [r, g, b].map((c) => toLinear(c / 255));
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, Bb);
  const H = C < 0.0002 ? 0 : ((Math.atan2(Bb, A) * 180) / Math.PI + 360) % 360;
  return `oklch(${fixed(L * 100, 2)}% ${fixed(C, 4)} ${fixed(H, 2)}${a < 1 ? ` / ${fixed(a, 3)}` : ''})`;
}

/** WCAG 2.x relative luminance. */
const luminance = ({ r, g, b }: Rgba) => 0.2126 * toLinear(r / 255) + 0.7152 * toLinear(g / 255) + 0.0722 * toLinear(b / 255);

/** Contrast ratio 1–21. A translucent foreground is first blended over the (opaque) background. */
export function contrastRatio(fg: Rgba, bg: Rgba): number {
  const over = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 };
  const [hi, lo] = [luminance(over), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG 2.2 thresholds: AA 4.5 (large text 3), AAA 7 (large text 4.5). */
export const wcag = (ratio: number) => ({ aa: ratio >= 4.5, aaLarge: ratio >= 3, aaa: ratio >= 7, aaaLarge: ratio >= 4.5 });
