import { describe, expect, it } from 'vitest';
import { parseTimestamp } from './logic';

describe('parseTimestamp', () => {
  it('reads seconds and milliseconds, auto-detecting the unit', () => {
    expect(parseTimestamp('1700000000', 'auto')).toEqual({ date: new Date('2023-11-14T22:13:20Z'), unit: 's' });
    expect(parseTimestamp(' 1700000000123 ', 'auto')).toEqual({ date: new Date('2023-11-14T22:13:20.123Z'), unit: 'ms' });
    expect(parseTimestamp('1700000000', 'ms')?.date.toISOString()).toBe('1970-01-20T16:13:20.000Z');
    expect(parseTimestamp('-86400', 'auto')?.date.toISOString()).toBe('1969-12-31T00:00:00.000Z');
    expect(parseTimestamp('1.5', 's')?.date.getTime()).toBe(1500);
  });

  it('returns null for empty input', () => {
    expect(parseTimestamp('', 'auto')).toBeNull();
  });

  it('returns null for invalid or out-of-range input', () => {
    expect(parseTimestamp('12abc', 'auto')).toBeNull();
    expect(parseTimestamp('1e9', 'auto')).toBeNull();
    expect(parseTimestamp('9'.repeat(20), 'ms')).toBeNull();
  });
});
