import { describe, expect, it } from 'vitest';
import { DEFAULT_GRADIENT, gradientCss } from './logic';

describe('gradient', () => {
  it('writes linear, radial and conic gradients', () => {
    expect(gradientCss(DEFAULT_GRADIENT)).toBe('linear-gradient(135deg, #7cc8f8 0%, #c4b5fd 100%)');
    expect(gradientCss({ ...DEFAULT_GRADIENT, type: 'radial' })).toBe('radial-gradient(circle, #7cc8f8 0%, #c4b5fd 100%)');
    expect(gradientCss({ ...DEFAULT_GRADIENT, type: 'conic', angle: 90 })).toBe('conic-gradient(from 90deg, #7cc8f8 0%, #c4b5fd 100%)');
  });

  it('sorts stops and normalizes angles', () => {
    const g = { type: 'linear' as const, angle: -90, stops: [{ color: 'red', position: 80 }, { color: 'blue', position: 10 }, { color: 'lime', position: 150 }] };
    expect(gradientCss(g)).toBe('linear-gradient(270deg, blue 10%, red 80%, lime 100%)');
  });

  it('handles an empty or invalid angle', () => {
    expect(gradientCss({ ...DEFAULT_GRADIENT, angle: Number.NaN })).toBe('linear-gradient(0deg, #7cc8f8 0%, #c4b5fd 100%)');
  });
});
