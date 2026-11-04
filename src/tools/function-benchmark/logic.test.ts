import { describe, expect, it } from 'vitest';
import { compare, parseArgs, stats } from './logic';

describe('benchmark stats', () => {
  it('computes mean and relative margin of error', () => {
    const s = stats([90, 100, 110, 100]);
    expect(s.hz).toBe(100);
    expect(s.samples).toBe(4);
    expect(s.rme).toBeCloseTo(8.0, 1); // 1.96 × sd(8.165) / √4 / 100
  });

  it('compares against the fastest', () => {
    expect(compare([200, 100, 50])).toEqual([{ share: 1, slower: 1 }, { share: 0.5, slower: 2 }, { share: 0.25, slower: 4 }]);
  });

  it('handles empty input', () => {
    expect(stats([])).toEqual({ hz: 0, rme: 0, samples: 0 });
    expect(parseArgs('')).toEqual([]);
    expect(compare([0])).toEqual([{ share: 0, slower: Infinity }]);
  });

  it('rejects params that are not a JSON array', () => {
    expect(parseArgs('[1, "a"]')).toEqual([1, 'a']);
    expect(parseArgs('{"a":1}')).toBeNull();
    expect(parseArgs('1,')).toBeNull();
  });
});
