import { describe, expect, it } from 'vitest';
import { deepEqual, formatValue, parseCase } from './logic';

describe('parseCase', () => {
  it('parses params as an argument list and expected as JSON', () => {
    expect(parseCase({ params: '[1, "a", {"b": [2]}]', expected: '{"ok": true}' })).toEqual({ ok: true, args: [1, 'a', { b: [2] }], expected: { ok: true } });
  });

  it('treats empty params as no arguments', () => {
    expect(parseCase({ params: '  ', expected: 'null' })).toEqual({ ok: true, args: [], expected: null });
  });

  it('rejects params that are not a JSON array, and invalid expected values', () => {
    expect(parseCase({ params: '1, 2', expected: '3' })).toEqual({ ok: false, error: 'params' });
    expect(parseCase({ params: '{"a":1}', expected: '3' })).toEqual({ ok: false, error: 'params' });
    expect(parseCase({ params: '[1]', expected: '' })).toEqual({ ok: false, error: 'expected' });
    expect(parseCase({ params: '[1]', expected: "'x'" })).toEqual({ ok: false, error: 'expected' });
  });
});

describe('deepEqual', () => {
  it('compares structurally, ignoring key order', () => {
    expect(deepEqual({ a: [1, { b: 2 }], c: null }, { c: null, a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual(Number.NaN, Number.NaN)).toBe(true);
    expect(deepEqual(0, -0)).toBe(true);
  });

  it('spots differences', () => {
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual('1', 1)).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
  });
});

describe('formatValue', () => {
  it('shows values JSON cannot', () => {
    expect(formatValue({ a: [1, 'x'] })).toBe('{"a":[1,"x"]}');
    expect(formatValue(undefined)).toBe('undefined');
    expect(formatValue(Number.NaN)).toBe('NaN');
    expect(formatValue(10n)).toBe('10n');
  });
});
