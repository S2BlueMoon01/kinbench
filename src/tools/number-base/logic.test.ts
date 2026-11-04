import { describe, expect, it } from 'vitest';
import { formatInteger, parseInteger } from './logic';

describe('number base', () => {
  it('parses and formats in any base', () => {
    expect(parseInteger('ff', 16)).toBe(255n);
    expect(parseInteger('0xFF', 16)).toBe(255n);
    expect(parseInteger('0b1010_1010', 2)).toBe(170n);
    expect(parseInteger('-777', 8)).toBe(-511n);
    expect(parseInteger('zz', 36)).toBe(1295n);
    expect(formatInteger(255n, 2)).toBe('11111111');
    expect(formatInteger(-511n, 16)).toBe('-1ff');
  });

  it('keeps precision beyond 2^53', () => {
    const big = parseInteger('18446744073709551615', 10)!;
    expect(formatInteger(big, 16)).toBe('ffffffffffffffff');
  });

  it('returns null for empty input', () => {
    expect(parseInteger('', 10)).toBeNull();
    expect(parseInteger('0x', 16)).toBeNull();
  });

  it('rejects digits that do not belong to the base', () => {
    expect(parseInteger('102', 2)).toBeNull();
    expect(parseInteger('12.5', 10)).toBeNull();
    expect(parseInteger('0x10', 10)).toBeNull();
  });
});
