import { describe, expect, it } from 'vitest';
import { contrastRatio, parseColor, toHex, toHsl, toOklch, toRgb, wcag } from './logic';

const c = (s: string) => parseColor(s)!;

describe('color converter', () => {
  it('parses hex, rgb, hsl and oklch in both syntaxes', () => {
    expect(c('#7cc8f8')).toEqual({ r: 124, g: 200, b: 248, a: 1 });
    expect(c('7CC8F8')).toEqual(c('#7cc8f8'));
    expect(toHex(c('#abc'))).toBe('#aabbcc');
    expect(toHex(c('#0008'))).toBe('#00000088');
    expect(toHex(c('rgb(124, 200, 248)'))).toBe('#7cc8f8');
    expect(toHex(c('rgba(255 0 0 / 50%)'))).toBe('#ff000080');
    expect(toHex(c('hsl(120deg 100% 25%)'))).toBe('#008000');
    expect(toHex(c('hsla(0.5turn, 100%, 50%, 1)'))).toBe('#00ffff');
    expect(toHex(c('oklch(62.8% 0.2577 29.23)'))).toBe('#ff0000');
  });

  it('formats to every notation', () => {
    const blue = c('#7cc8f8');
    expect(toRgb(blue)).toBe('rgb(124 200 248)');
    expect(toHsl(blue)).toBe('hsl(203.2 89.9% 72.9%)');
    expect(toOklch(c('#ff0000'))).toBe('oklch(62.8% 0.2577 29.23)');
    expect(toOklch(c('#ffffff'))).toBe('oklch(100% 0 0)');
    expect(toRgb(c('#ff000080'))).toBe('rgb(255 0 0 / 0.502)');
  });

  it('computes WCAG contrast', () => {
    expect(contrastRatio(c('#000'), c('#fff'))).toBeCloseTo(21, 5);
    expect(contrastRatio(c('#777'), c('#fff'))).toBeCloseTo(4.48, 2);
    expect(wcag(4.48)).toEqual({ aa: false, aaLarge: true, aaa: false, aaaLarge: false });
    expect(contrastRatio(c('rgb(0 0 0 / 0)'), c('#fff'))).toBeCloseTo(1, 5); // fully transparent text vanishes
  });

  it('returns null for empty input', () => {
    expect(parseColor('')).toBeNull();
  });

  it('rejects invalid colors', () => {
    expect(parseColor('#12345')).toBeNull();
    expect(parseColor('rgb(1, 2)')).toBeNull();
    expect(parseColor('rgb(a, b, c)')).toBeNull();
    expect(parseColor('notacolor')).toBeNull();
  });
});
