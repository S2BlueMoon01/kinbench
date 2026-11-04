import { describe, expect, it } from 'vitest';
import { decodeQr, qrMatrix, qrSvg } from './logic';

/** Draws a QR matrix as black/white RGBA pixels, `scale` px per module. */
function pixels(matrix: boolean[][], scale: number) {
  const size = matrix.length * scale;
  const rgba = new Uint8ClampedArray(size * size * 4).fill(255);
  matrix.forEach((row, y) => row.forEach((dark, x) => {
    if (!dark) return;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) rgba.fill(0, ((y * scale + dy) * size + x * scale + dx) * 4, ((y * scale + dy) * size + x * scale + dx) * 4 + 3);
  }));
  return { rgba, size };
}

describe('qr code', () => {
  it('round-trips UTF-8 text through encode and decode', async () => {
    for (const text of ['https://kinbench.dev/vi', 'Xin chào Việt Nam ệ 😀']) {
      const { rgba, size } = pixels(qrMatrix(text, { ecc: 'M', margin: 4 }), 4);
      expect(await decodeQr(rgba, size, size)).toBe(text);
    }
  });

  it('renders SVG with the chosen colors', () => {
    const svg = qrSvg('hi', { ecc: 'L', margin: 2, fg: '#0b1a2a', bg: '#ffffff' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('#0b1a2a');
  });

  it('encodes empty text as a valid (empty) code', () => {
    expect(qrMatrix('', { ecc: 'L', margin: 0 }).length).toBe(21); // version 1
  });

  it('returns null when there is no QR code', async () => {
    expect(await decodeQr(new Uint8ClampedArray(40 * 40 * 4).fill(255), 40, 40)).toBeNull();
  });
});
