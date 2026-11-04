import { describe, expect, it } from 'vitest';
import { processJson } from './logic';

describe('processJson', () => {
  it('formats with 2 spaces by default', async () => {
    expect(await processJson('{"a":1,"b":[true,null]}', 'format')).toEqual({
      ok: true,
      output: '{\n  "a": 1,\n  "b": [\n    true,\n    null\n  ]\n}',
    });
  });

  it('formats with 4 spaces and tabs', async () => {
    expect(await processJson('{"a":1}', 'format', '4')).toEqual({ ok: true, output: '{\n    "a": 1\n}' });
    expect(await processJson('{"a":1}', 'format', 'tab')).toEqual({ ok: true, output: '{\n\t"a": 1\n}' });
  });

  it('minifies', async () => {
    expect(await processJson('{\n  "a": 1,\n  "b": [ 1, 2 ]\n}', 'minify')).toEqual({ ok: true, output: '{"a":1,"b":[1,2]}' });
  });

  it('keeps big numbers, trailing zeros, escapes and unicode as written', async () => {
    const input = '{"id":12345678901234567890,"price":1.50,"e":"\\u00e9","vi":"ệ ữ ở ặ ỹ"}';
    const r = await processJson(input, 'minify');
    expect(r).toEqual({ ok: true, output: input });
    const f = await processJson(input, 'format');
    expect(f.ok && f.output).toContain('"id": 12345678901234567890');
    expect(f.ok && f.output).toContain('"price": 1.50');
    expect(f.ok && f.output).toContain('"e": "\\u00e9"');
  });

  it('returns empty output for empty or whitespace input', async () => {
    expect(await processJson('', 'format')).toEqual({ ok: true, output: '' });
    expect(await processJson('  \n ', 'minify')).toEqual({ ok: true, output: '' });
  });

  it('reports the line and column of the first error', async () => {
    const r = await processJson('{\n  "a": 1\n  "b": 2\n}', 'format');
    expect(r).toMatchObject({ ok: false, error: { code: 'CommaExpected', line: 3, column: 3 } });
  });

  it('rejects comments, trailing commas and single quotes', async () => {
    expect(await processJson('{"a":1 // c\n}', 'format')).toMatchObject({ ok: false, error: { code: 'InvalidCommentToken', line: 1, column: 8 } });
    expect(await processJson('[1,2,]', 'format')).toMatchObject({ ok: false, error: { line: 1, column: 6 } });
    expect(await processJson("{'a':1}", 'format')).toMatchObject({ ok: false, error: { line: 1, column: 2 } });
  });

  it('rejects content after the root value and unterminated strings', async () => {
    expect(await processJson('{} {}', 'format')).toMatchObject({ ok: false, error: { code: 'EndOfFileExpected' } });
    expect(await processJson('{"a":"x', 'format')).toMatchObject({ ok: false, error: { code: 'UnexpectedEndOfString' } });
  });
});
