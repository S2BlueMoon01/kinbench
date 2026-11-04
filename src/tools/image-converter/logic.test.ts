import { describe, expect, it } from 'vitest';
import { clampQuality, outputName, sizeChange } from './logic';

describe('image converter helpers', () => {
  it('names the output after the input', () => {
    expect(outputName('holiday.photo.HEIC', 'webp')).toBe('holiday.photo.webp');
    expect(outputName('scan', 'jpeg')).toBe('scan.jpg');
  });

  it('falls back to a name for empty or extension-only names', () => {
    expect(outputName('', 'avif')).toBe('image.avif');
    expect(outputName('.png', 'png')).toBe('image.png');
  });

  it('computes the size change', () => {
    expect(sizeChange(1000, 250)).toBe(-75);
    expect(sizeChange(1000, 1500)).toBe(50);
    expect(sizeChange(0, 10)).toBe(0);
  });

  it('clamps invalid quality values', () => {
    expect(clampQuality(150)).toBe(100);
    expect(clampQuality(0)).toBe(1);
    expect(clampQuality(Number.NaN)).toBe(80);
  });
});
