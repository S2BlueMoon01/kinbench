import { describe, expect, it } from 'vitest';
import { pxToRem, remToPx } from './logic';

describe('px ↔ rem', () => {
  it('converts both ways with a root font size', () => {
    expect(pxToRem(24, 16)).toBe(1.5);
    expect(pxToRem(1, 16)).toBe(0.0625);
    expect(pxToRem(10, 12)).toBe(0.8333);
    expect(remToPx(1.5, 16)).toBe(24);
    expect(remToPx(0.875, 18)).toBe(15.75);
  });

  it('handles zero and empty (NaN) input', () => {
    expect(pxToRem(0, 16)).toBe(0);
    expect(pxToRem(Number.NaN, 16)).toBeNull();
  });

  it('rejects an invalid root size', () => {
    expect(pxToRem(16, 0)).toBeNull();
    expect(remToPx(1, -16)).toBeNull();
  });
});
