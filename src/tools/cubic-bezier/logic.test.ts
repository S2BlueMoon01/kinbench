import { describe, expect, it } from 'vitest';
import { bezierCss, parseBezier, PRESETS } from './logic';

describe('cubic-bezier', () => {
  it('writes and reads timing functions', () => {
    expect(bezierCss(PRESETS.ease)).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)');
    expect(parseBezier('cubic-bezier(.17,.67,.83,.67)')).toEqual([0.17, 0.67, 0.83, 0.67]);
    expect(parseBezier('0.68, -0.6, 0.32, 1.6')).toEqual(PRESETS.easeInOutBack);
    expect(parseBezier('Ease-In')).toEqual(PRESETS['ease-in']);
  });

  it('rounds, and keeps x within 0–1 while y may overshoot', () => {
    expect(bezierCss([1.2, 1.555, -0.3, -0.5])).toBe('cubic-bezier(1, 1.56, 0, -0.5)');
  });

  it('rejects empty and invalid input', () => {
    expect(parseBezier('')).toBeNull();
    expect(parseBezier('cubic-bezier(1.5, 0, 0, 1)')).toBeNull();
    expect(parseBezier('1, 2, 3')).toBeNull();
    expect(parseBezier('bounce')).toBeNull();
  });
});
