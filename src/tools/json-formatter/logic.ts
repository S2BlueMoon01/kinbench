export type Mode = 'format' | 'minify';
export type Indent = '2' | '4' | 'tab';
export type ErrorCode = Exclude<ReturnType<typeof import('jsonc-parser').printParseErrorCode>, '<unknown ParseErrorCode>'> | 'Unknown';
export type JsonError = { code: ErrorCode; line: number; column: number; offset: number; length: number };
export type JsonResult = { ok: true; output: string } | { ok: false; error: JsonError };

/**
 * Validates with the native JSON.parse (strict RFC 8259), then rewrites the original tokens with
 * jsonc-parser so numbers like 12345678901234567890 or 1.50 and escape sequences (backslash-u etc.) are kept as written.
 */
export async function processJson(input: string, mode: Mode, indent: Indent = '2'): Promise<JsonResult> {
  if (!input.trim()) return { ok: true, output: '' };
  const jsonc = await import('jsonc-parser');

  try {
    JSON.parse(input);
  } catch {
    let error: JsonError | undefined;
    jsonc.visit(
      input,
      {
        onError: (code, offset, length, line, column) => {
          const name = jsonc.printParseErrorCode(code);
          error ??= { code: name === '<unknown ParseErrorCode>' ? 'Unknown' : name, line: line + 1, column: column + 1, offset, length };
        },
      },
      { disallowComments: true, allowTrailingComma: false },
    );
    // jsonc-parser is slightly more lenient than JSON.parse in rare cases; line 0 means "position unknown".
    return { ok: false, error: error ?? { code: 'Unknown', line: 0, column: 0, offset: 0, length: 0 } };
  }

  if (mode === 'minify') {
    const scanner = jsonc.createScanner(input, true);
    let out = '';
    // 17 = SyntaxKind.EOF (a const enum, not importable under isolatedModules)
    while (scanner.scan() !== 17) out += input.substr(scanner.getTokenOffset(), scanner.getTokenLength());
    return { ok: true, output: out };
  }

  const edits = jsonc.format(input, undefined, {
    tabSize: indent === '4' ? 4 : 2,
    insertSpaces: indent !== 'tab',
    eol: '\n',
    insertFinalNewline: false,
    keepLines: false,
  });
  return { ok: true, output: jsonc.applyEdits(input, edits) };
}
