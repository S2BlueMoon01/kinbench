import { describe, expect, it } from 'vitest';
import { centeredCrop, clampRect, outputSize, resizeCrop } from './logic';

describe('resize and crop', () => {
  it('finds the largest centered crop for an aspect ratio', () => {
    expect(centeredCrop(1920, 1080, 1)).toEqual({ x: 420, y: 0, w: 1080, h: 1080 });
    expect(centeredCrop(1000, 1000, 16 / 9)).toEqual({ x: 0, y: 219, w: 1000, h: 563 });
    expect(centeredCrop(800, 600, null)).toEqual({ x: 0, y: 0, w: 800, h: 600 });
  });

  it('resizes a crop from its corner, keeping the ratio and the image bounds', () => {
    expect(resizeCrop({ x: 100, y: 100, w: 200, h: 200 }, 500, 300, 1, 1000, 1000)).toEqual({ x: 100, y: 100, w: 300, h: 300 });
    expect(resizeCrop({ x: 900, y: 0, w: 50, h: 50 }, 500, 500, null, 1000, 1000)).toEqual({ x: 900, y: 0, w: 100, h: 500 });
  });

  it('computes the output size with the ratio locked or not', () => {
    const crop = { x: 0, y: 0, w: 1600, h: 900 };
    expect(outputSize(crop, 'w', 800, 0, true)).toEqual({ w: 800, h: 450 });
    expect(outputSize(crop, 'h', 90, 0, true)).toEqual({ w: 160, h: 90 });
    expect(outputSize(crop, 'w', 300, 900, false)).toEqual({ w: 300, h: 900 });
  });

  it('cleans empty and out-of-range values', () => {
    expect(outputSize({ x: 0, y: 0, w: 10, h: 10 }, 'w', Number.NaN, 0, true)).toEqual({ w: 1, h: 1 });
    expect(outputSize({ x: 0, y: 0, w: 10, h: 10 }, 'w', 99_999, 0, true)).toEqual({ w: 10_000, h: 10_000 });
    expect(clampRect({ x: -5, y: 990, w: 0, h: 50.4 }, 1000, 1000)).toEqual({ x: 0, y: 950, w: 1, h: 50 });
  });
});
