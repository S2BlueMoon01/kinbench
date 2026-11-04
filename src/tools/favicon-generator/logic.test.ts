import { describe, expect, it } from 'vitest';
import { buildIco, manifest, placement } from './logic';

describe('favicon', () => {
  it('writes an ICO directory pointing at each PNG', () => {
    const ico = buildIco([{ size: 16, png: new Uint8Array([1, 2, 3]) }, { size: 256, png: new Uint8Array([4, 5]) }]);
    const v = new DataView(ico.buffer);
    expect([v.getUint16(0, true), v.getUint16(2, true), v.getUint16(4, true)]).toEqual([0, 1, 2]);
    expect([ico[6], ico[7], v.getUint16(12, true), v.getUint32(14, true), v.getUint32(18, true)]).toEqual([16, 16, 32, 3, 38]);
    expect([ico[22], v.getUint32(30, true), v.getUint32(34, true)]).toEqual([0, 2, 41]); // 256 is stored as 0
    expect([...ico.subarray(38)]).toEqual([1, 2, 3, 4, 5]);
  });

  it('writes an empty ICO for no images', () => {
    expect([...buildIco([])]).toEqual([0, 0, 1, 0, 0, 0]);
  });

  it('centers the image inside the padding', () => {
    expect(placement(200, 100, 64, 0)).toEqual({ x: 0, y: 16, w: 64, h: 32 });
    expect(placement(100, 100, 100, 10)).toEqual({ x: 10, y: 10, w: 80, h: 80 });
    expect(placement(100, 100, 100, 90).w).toBeCloseTo(20); // padding is capped at 40%
  });

  it('writes a web manifest', () => {
    expect(JSON.parse(manifest('Kin', '#7cc8f8'))).toMatchObject({ name: 'Kin', theme_color: '#7cc8f8', icons: [{ sizes: '192x192' }, { sizes: '512x512' }] });
  });
});
