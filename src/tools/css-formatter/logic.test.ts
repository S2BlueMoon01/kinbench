import { describe, expect, it } from 'vitest';
import { processCss } from './logic';

const scss = '$brand: #7cc8f8;\n.card { color: $brand; &:hover { opacity: 0.8; } }';

describe('processCss', () => {
  it('formats CSS and SCSS with Prettier', async () => {
    expect(await processCss('a{color:red;margin:0 auto}', 'css', 'format')).toEqual({ ok: true, output: 'a {\n  color: red;\n  margin: 0 auto;\n}\n' });
    const r = await processCss(scss, 'scss', 'format');
    expect(r.ok && r.output).toContain('  &:hover {\n    opacity: 0.8;');
  });

  it('compiles SCSS to CSS and minifies', async () => {
    expect(await processCss(scss, 'scss', 'compile')).toEqual({
      ok: true,
      output: '.card {\n  color: #7cc8f8;\n}\n.card:hover {\n  opacity: 0.8;\n}',
    });
    expect(await processCss('a {\n  color: red;\n}\n\nb { margin: 0 }', 'css', 'minify')).toEqual({ ok: true, output: 'a{color:red}b{margin:0}' });
  });

  it('returns empty output for empty input', async () => {
    expect(await processCss('  \n', 'scss', 'compile')).toEqual({ ok: true, output: '' });
  });

  it('reports syntax errors with their position', async () => {
    expect(await processCss('a {\n  color: red;\n', 'css', 'format')).toMatchObject({ ok: false, line: 1, column: 1 });
    expect(await processCss('.a {\n  color: $missing;\n}', 'scss', 'compile')).toEqual({ ok: false, message: 'Undefined variable.', line: 2, column: 10 });
  });
});
