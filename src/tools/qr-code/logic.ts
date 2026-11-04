import { encode, renderSVG } from 'uqr';

export type Ecc = 'L' | 'M' | 'Q' | 'H';
export type QrOptions = { ecc: Ecc; margin: number; fg: string; bg: string };

/** Text is encoded as UTF-8 bytes, which every current scanner reads, Vietnamese included. */
const bytes = (text: string) => [...new TextEncoder().encode(text)];

export const qrSvg = (text: string, o: QrOptions) => renderSVG(bytes(text), { ecc: o.ecc, border: o.margin, pixelSize: 10, blackColor: o.fg, whiteColor: o.bg });

export const qrMatrix = (text: string, o: Pick<QrOptions, 'ecc' | 'margin'>) => encode(bytes(text), { ecc: o.ecc, border: o.margin }).data;

/** Reads a QR code from RGBA pixels with jsQR, loaded on first use. */
export async function decodeQr(rgba: Uint8ClampedArray, width: number, height: number): Promise<string | null> {
  const jsQR = (await import('jsqr')).default;
  const found = jsQR(rgba, width, height, { inversionAttempts: 'attemptBoth' });
  if (!found) return null;
  // jsQR decodes byte segments as Latin-1 unless the code says UTF-8; re-read the raw bytes as UTF-8 when valid.
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(found.binaryData));
  } catch {
    return found.data;
  }
}
