import { describe, expect, it } from 'vitest';
import { MAX_MATCHES, runRegex } from './logic';

describe('regex tester', () => {
  it('finds all matches with numbered and named groups', () => {
    expect(runRegex('(?<user>\\w+)@(\\w+)\\.dev', 'g', 'a@x.dev, bob@y.dev', null)).toEqual({
      ok: true,
      truncated: false,
      replaced: null,
      matches: [
        { index: 0, text: 'a@x.dev', groups: ['a', 'x'], named: { user: 'a' } },
        { index: 9, text: 'bob@y.dev', groups: ['bob', 'y'], named: { user: 'bob' } },
      ],
    });
  });

  it('matches Unicode letters with the u flag and replaces with groups', () => {
    const r = runRegex('(\\p{L}+)@(\\w+)', 'gu', 'bé@y', '$2:$1');
    expect(r.ok && r.matches.map((m) => m.text)).toEqual(['bé@y']);
    expect(r.ok && r.replaced).toBe('y:bé');
  });

  it('returns only the first match without the g flag', () => {
    const r = runRegex('\\d', '', 'a1b2', 'X');
    expect(r.ok && r.matches.map((m) => m.index)).toEqual([1]);
    expect(r.ok && r.replaced).toBe('aXb2');
  });

  it('handles empty pattern and text', () => {
    expect(runRegex('', 'g', '', null)).toMatchObject({ ok: true, matches: [{ index: 0, text: '' }] });
    expect(runRegex('a', 'g', '', null)).toMatchObject({ ok: true, matches: [] });
  });

  it('reports invalid patterns and caps huge match lists', () => {
    expect(runRegex('(', 'g', 'x', null)).toMatchObject({ ok: false });
    expect(runRegex('a', 'gq', 'x', null)).toMatchObject({ ok: false });
    expect(runRegex('.', 'g', 'x'.repeat(MAX_MATCHES + 5), null)).toMatchObject({ ok: true, truncated: true });
  });
});
