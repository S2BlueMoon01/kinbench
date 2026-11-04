export type Rect = { x: number; y: number; w: number; h: number };

export const ASPECTS = { free: null, '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9, '9:16': 9 / 16 } as const;
export type Aspect = keyof typeof ASPECTS;

/** The largest crop with this aspect ratio, centered; the whole image for "free". */
export function centeredCrop(imgW: number, imgH: number, ratio: number | null): Rect {
  if (!ratio) return { x: 0, y: 0, w: imgW, h: imgH };
  const w = Math.min(imgW, Math.round(imgH * ratio));
  const h = Math.min(imgH, Math.round(w / ratio));
  return { x: Math.round((imgW - w) / 2), y: Math.round((imgH - h) / 2), w, h };
}

/** Whole pixels, at least 1×1, inside the image. */
export function clampRect(r: Rect, imgW: number, imgH: number): Rect {
  const w = Math.max(1, Math.min(imgW, Math.round(r.w)));
  const h = Math.max(1, Math.min(imgH, Math.round(r.h)));
  return { x: Math.min(imgW - w, Math.max(0, Math.round(r.x))), y: Math.min(imgH - h, Math.max(0, Math.round(r.y))), w, h };
}

/** Resizes the crop's bottom-right corner to (w, h), keeping the ratio if there is one. */
export function resizeCrop(r: Rect, w: number, h: number, ratio: number | null, imgW: number, imgH: number): Rect {
  let [nw, nh] = [Math.min(w, imgW - r.x), Math.min(h, imgH - r.y)];
  if (ratio) {
    if (nw / nh > ratio) nw = nh * ratio;
    else nh = nw / ratio;
  }
  return clampRect({ ...r, w: nw, h: nh }, imgW, imgH);
}

/** Output size from one edited dimension; the other follows the crop's ratio when locked. */
export function outputSize(crop: Rect, edited: 'w' | 'h', value: number, other: number, locked: boolean) {
  const v = Math.max(1, Math.min(10_000, Math.round(value) || 1));
  if (!locked) return edited === 'w' ? { w: v, h: other } : { w: other, h: v };
  return edited === 'w' ? { w: v, h: Math.max(1, Math.round((v * crop.h) / crop.w)) } : { w: Math.max(1, Math.round((v * crop.w) / crop.h)), h: v };
}
