export const formats = {
  png: { mime: 'image/png', ext: 'png', lossy: false },
  jpeg: { mime: 'image/jpeg', ext: 'jpg', lossy: true },
  webp: { mime: 'image/webp', ext: 'webp', lossy: true },
  avif: { mime: 'image/avif', ext: 'avif', lossy: true },
} as const;
export type Format = keyof typeof formats;

/** "holiday.photo.HEIC" → "holiday.photo.webp"; keeps a sensible name for odd inputs. */
export function outputName(name: string, format: Format): string {
  const base = name.replace(/\.[^./\\]*$/, '').trim() || 'image';
  return `${base}.${formats[format].ext}`;
}

/** Size change in whole percent: -75 means the result is 75% smaller. */
export function sizeChange(before: number, after: number): number {
  return before > 0 ? Math.round(((after - before) / before) * 100) : 0;
}

export const clampQuality = (q: number) => (Number.isFinite(q) ? Math.min(100, Math.max(1, Math.round(q))) : 80);
