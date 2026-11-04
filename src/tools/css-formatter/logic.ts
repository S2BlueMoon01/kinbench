export type Lang = 'css' | 'scss';
export type Mode = 'format' | 'compile' | 'minify';
export type CssResult = { ok: true; output: string } | { ok: false; message: string; line: number; column: number };

/** Which heavy library a mode needs; the UI shows a one-time loading notice for it. */
export const libraryFor = (mode: Mode) => (mode === 'format' ? 'prettier' : 'sass');

/** Format with Prettier; compile and minify with Dart Sass. Both are loaded only when first needed. */
export async function processCss(code: string, lang: Lang, mode: Mode): Promise<CssResult> {
  if (!code.trim()) return { ok: true, output: '' };
  try {
    if (mode === 'format') {
      const [{ format }, postcss] = await Promise.all([import('prettier/standalone'), import('prettier/plugins/postcss')]);
      return { ok: true, output: await format(code, { parser: lang, plugins: [postcss] }) };
    }
    const { compileString, Logger } = await import('sass');
    const { css } = compileString(code, { syntax: lang, style: mode === 'minify' ? 'compressed' : 'expanded', logger: Logger.silent });
    return { ok: true, output: css };
  } catch (e) {
    return toError(e);
  }
}

function toError(e: unknown): CssResult {
  // Sass: sassMessage + a 0-based span. Prettier: loc.start is 1-based and the message ends with a code frame.
  const err = e as { sassMessage?: string; span?: { start: { line: number; column: number } }; loc?: { start: { line: number; column: number } }; message?: string };
  if (err.span) return { ok: false, message: err.sassMessage ?? '', line: err.span.start.line + 1, column: err.span.start.column + 1 };
  const message = (err.message ?? String(e)).split('\n')[0].replace(/\s*\(\d+:\d+\)$/, '');
  return { ok: false, message, line: err.loc?.start.line ?? 0, column: err.loc?.start.column ?? 0 };
}
