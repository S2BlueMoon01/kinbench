const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  parts.reduce((at, p) => (out.set(p, at), at + p.length), 0);
  return out;
};

/**
 * Removes metadata from a JPEG without re-encoding it: drops APP1 (EXIF, GPS, XMP), APP13 (IPTC) and comments;
 * keeps APP0 (JFIF), APP2 (ICC color profile) and APP14 (Adobe color transform), which affect how it looks.
 * Null if the bytes aren't a JPEG this can walk.
 */
export function stripJpeg(bytes: Uint8Array): Uint8Array<ArrayBuffer> | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const parts = [bytes.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xda) return concat([...parts, bytes.subarray(i)]); // start of scan: the rest is image data
    const end = i + 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
    if (end > bytes.length) return null;
    if (![0xe1, 0xed, 0xfe].includes(marker)) parts.push(bytes.subarray(i, end));
    i = end;
  }
  return null;
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_METADATA = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

/** Removes text, EXIF and timestamp chunks from a PNG, losslessly. Null if it isn't a PNG. */
export function stripPng(bytes: Uint8Array): Uint8Array<ArrayBuffer> | null {
  if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return null;
  const parts = [bytes.subarray(0, 8)];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 8; i + 12 <= bytes.length; ) {
    const end = i + 12 + view.getUint32(i);
    if (end > bytes.length) return null;
    const type = String.fromCharCode(...bytes.subarray(i + 4, i + 8));
    if (!PNG_METADATA.has(type)) parts.push(bytes.subarray(i, end));
    i = end;
    if (type === 'IEND') return concat(parts);
  }
  return null;
}

export const stripLossless = (bytes: Uint8Array, type: string) =>
  type === 'image/jpeg' ? stripJpeg(bytes) : type === 'image/png' ? stripPng(bytes) : null;

/** Metadata as "Name → value" rows; exifr is loaded on first use. */
export async function readMetadata(file: Blob): Promise<Record<string, unknown>> {
  const exifr = (await import('exifr')).default;
  const data = await exifr.parse(file, { tiff: true, exif: true, gps: true, xmp: true, iptc: true, icc: false, interop: false, mergeOutput: true }).catch(() => null);
  return (data ?? {}) as Record<string, unknown>;
}

/** How a value is shown: dates as ISO, byte arrays summarized, objects as JSON. */
export function formatValue(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (v instanceof Uint8Array) return `${v.length} bytes`;
  if (Array.isArray(v)) return v.map(formatValue).join(', ');
  if (typeof v === 'object' && v !== null) return JSON.stringify(v);
  return String(v);
}
