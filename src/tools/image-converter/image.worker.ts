import { expose } from 'comlink';
import type { AVIFModule } from '@jsquash/avif/codec/enc/avif_enc.js';
import { formats, type Format } from './logic';

// @jsquash/avif's encode.js also imports its multi-threaded codec, whose pthread worker imports itself
// back; Turbopack's build hangs on that cycle. Threads need cross-origin isolation, which this site
// doesn't enable, so load the single-threaded codec the same way encode.js would.
let avif: Promise<AVIFModule> | undefined;
async function encodeAvif(pixels: ImageData, quality: number) {
  avif ??= Promise.all([import('@jsquash/avif/utils.js'), import('@jsquash/avif/codec/enc/avif_enc.js')]).then(
    ([{ initEmscriptenModule }, codec]) => initEmscriptenModule(codec.default) as Promise<AVIFModule>,
  );
  const { defaultOptions } = await import('@jsquash/avif/meta.js');
  const out = (await avif).encode(new Uint8Array(pixels.data.buffer), pixels.width, pixels.height, { ...defaultOptions, quality });
  if (!out) throw new Error('AVIF encoding failed');
  return out.buffer as ArrayBuffer;
}

async function convert(file: Blob, format: Format, quality: number) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  if (format === 'jpeg') {
    ctx.fillStyle = '#fff'; // JPEG has no alpha; flatten transparency onto white instead of black
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const { mime } = formats[format];
  if (format !== 'avif') {
    const blob = await canvas.convertToBlob({ type: mime, quality: quality / 100 });
    if (blob.type === mime) return { blob, width, height };
  }
  // No browser encodes AVIF from a canvas, and Safari silently returns PNG for WebP: use the wasm codecs.
  const pixels = ctx.getImageData(0, 0, width, height);
  const encoded =
    format === 'avif'
      ? await encodeAvif(pixels, quality)
      : await (await import('@jsquash/webp/encode.js')).default(pixels, { quality });
  return { blob: new Blob([encoded], { type: mime }), width, height };
}

const api = { convert };
export type ImageApi = typeof api;
expose(api);
