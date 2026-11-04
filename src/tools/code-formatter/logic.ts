export const LANGUAGES = ['html', 'javascript', 'typescript'] as const;
export type Language = (typeof LANGUAGES)[number];
export type Style = { printWidth: number; tabWidth: number; semi: boolean; singleQuote: boolean };
export type FormatResult = { ok: true; output: string } | { ok: false; message: string; line: number; column: number };

const PARSER: Record<Language, string> = { html: 'html', javascript: 'babel', typescript: 'babel-ts' };

/**
 * Prettier with only the plugins these languages need (HTML also formats its inline <script> and <style>).
 * They are imported on first use, inside the worker.
 */
export async function formatCode(code: string, language: Language, style: Style): Promise<FormatResult> {
  if (!code.trim()) return { ok: true, output: '' };
  const [{ format }, ...plugins] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
    ...(language === 'html' ? [import('prettier/plugins/html'), import('prettier/plugins/postcss')] : []),
  ]);
  try {
    return { ok: true, output: await format(code, { parser: PARSER[language], plugins, ...style }) };
  } catch (e) {
    const err = e as { message?: string; loc?: { start: { line: number; column: number } } };
    const message = (err.message ?? String(e)).split('\n')[0].replace(/\s*\(\d+:\d+\)$/, '');
    return { ok: false, message, line: err.loc?.start.line ?? 0, column: err.loc?.start.column ?? 0 };
  }
}
