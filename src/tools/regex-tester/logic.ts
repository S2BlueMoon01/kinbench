export type Match = { index: number; text: string; groups: (string | undefined)[]; named: Record<string, string | undefined> };
export type RegexResult =
  | { ok: true; matches: Match[]; truncated: boolean; replaced: string | null }
  | { ok: false; error: string };

export const MAX_MATCHES = 1000;

/** Runs in a worker (a pattern can backtrack for ever). Without the g flag only the first match counts, as in JavaScript. */
export function runRegex(pattern: string, flags: string, text: string, replacement: string | null): RegexResult {
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const toMatch = (m: RegExpExecArray | RegExpMatchArray): Match => ({ index: m.index ?? 0, text: m[0], groups: m.slice(1), named: { ...m.groups } });
  const matches: Match[] = [];
  let truncated = false;
  if (re.global) {
    for (const m of text.matchAll(re)) {
      if (matches.length === MAX_MATCHES) { truncated = true; break; }
      matches.push(toMatch(m));
    }
  } else {
    const m = re.exec(text);
    if (m) matches.push(toMatch(m));
  }
  re.lastIndex = 0;
  return { ok: true, matches, truncated, replaced: replacement === null ? null : text.replace(re, replacement) };
}
