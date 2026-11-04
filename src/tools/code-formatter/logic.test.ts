import { describe, expect, it } from 'vitest';
import { formatCode, type Style } from './logic';

const style: Style = { printWidth: 80, tabWidth: 2, semi: true, singleQuote: false };

describe('code formatter', () => {
  it('formats JavaScript and TypeScript', async () => {
    expect(await formatCode("const a={b:1,c:'x'}", 'javascript', style)).toEqual({ ok: true, output: 'const a = { b: 1, c: "x" };\n' });
    expect(await formatCode('function f(a:number):string{return `${a}`}', 'typescript', { ...style, semi: false, singleQuote: true })).toEqual({
      ok: true,
      output: 'function f(a: number): string {\n  return `${a}`\n}\n',
    });
  });

  it('formats HTML with inline script and style', async () => {
    const r = await formatCode('<div><p>Hi</p><script>let x=1</script><style>a{color:red}</style></div>', 'html', style);
    expect(r.ok && r.output).toContain('<script>\n    let x = 1;\n  </script>');
    expect(r.ok && r.output).toContain('a {\n      color: red;\n    }');
  });

  it('returns empty output for empty input', async () => {
    expect(await formatCode('', 'html', style)).toEqual({ ok: true, output: '' });
  });

  it('reports syntax errors with a position', async () => {
    expect(await formatCode('const = 1', 'javascript', style)).toMatchObject({ ok: false, line: 1, column: 7 });
  });
});
