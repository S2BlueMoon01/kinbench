export const PNG_FILES = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180, opaque: true }, // iOS draws transparent pixels black
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
] as const;
export const ICO_SIZES = [16, 32, 48] as const;

/** A .ico holding PNG images (supported by every current browser and Windows Vista+). */
export function buildIco(images: { size: number; png: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const header = 6 + 16 * images.length;
  const out = new Uint8Array(header + images.reduce((n, i) => n + i.png.length, 0));
  const view = new DataView(out.buffer);
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, images.length, true);
  let offset = header;
  images.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i;
    out[e] = size >= 256 ? 0 : size; // 0 means 256
    out[e + 1] = size >= 256 ? 0 : size;
    view.setUint16(e + 4, 1, true); // color planes
    view.setUint16(e + 6, 32, true); // bits per pixel
    view.setUint32(e + 8, png.length, true);
    view.setUint32(e + 12, offset, true);
    out.set(png, offset);
    offset += png.length;
  });
  return out;
}

export const manifest = (name: string, color: string) =>
  JSON.stringify(
    {
      name,
      short_name: name,
      icons: [192, 512].map((s) => ({ src: `/android-chrome-${s}x${s}.png`, sizes: `${s}x${s}`, type: 'image/png' })),
      theme_color: color,
      background_color: color,
      display: 'standalone',
    },
    null,
    2,
  );

export const HTML_TAGS = `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;

/** Where to draw the source in a square icon: centered, scaled to fit inside the padding (percent of each side). */
export function placement(srcW: number, srcH: number, size: number, padding: number) {
  const box = size * (1 - (2 * Math.min(40, Math.max(0, padding))) / 100);
  const scale = Math.min(box / srcW, box / srcH);
  const [w, h] = [srcW * scale, srcH * scale];
  return { x: (size - w) / 2, y: (size - h) / 2, w, h };
}
