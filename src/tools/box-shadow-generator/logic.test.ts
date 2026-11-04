import { describe, expect, it } from 'vitest';
import { boxShadowCss, DEFAULT_SHADOW, rgba } from './logic';

describe('box-shadow', () => {
  it('writes one or more layers', () => {
    expect(boxShadowCss([DEFAULT_SHADOW])).toBe('0 8px 24px -4px rgb(11 26 42 / 0.25)');
    expect(boxShadowCss([{ ...DEFAULT_SHADOW, inset: true, opacity: 100 }, { x: 1, y: 1, blur: 0, spread: 0, color: '#ffffff', opacity: 50, inset: false }])).toBe(
      'inset 0 8px 24px -4px rgb(11 26 42), 1px 1px 0 0 rgb(255 255 255 / 0.5)',
    );
  });

  it('writes none for no layers', () => {
    expect(boxShadowCss([])).toBe('none');
  });

  it('cleans invalid values', () => {
    expect(boxShadowCss([{ ...DEFAULT_SHADOW, blur: -5, x: Number.NaN, color: 'nope', opacity: 300 }])).toBe('0 8px 0 -4px rgb(0 0 0)');
    expect(rgba('#7cc8f8', 40)).toBe('rgb(124 200 248 / 0.4)');
  });
});
