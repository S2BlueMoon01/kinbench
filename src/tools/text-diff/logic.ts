import { createTwoFilesPatch, diffLines, diffWordsWithSpace, type ChangeObject } from 'diff';

export type DiffMode = 'lines' | 'words';
export type Change = ChangeObject<string>;

export function diffTexts(a: string, b: string, mode: DiffMode, ignoreWhitespace: boolean): Change[] {
  return mode === 'lines' ? diffLines(a, b, { ignoreWhitespace }) : diffWordsWithSpace(a, b);
}

/** Added and removed units: lines in line mode, words in word mode. */
export function diffStats(changes: Change[], mode: DiffMode) {
  const size = (c: Change) => (mode === 'lines' ? (c.count ?? 0) : c.value.trim() ? c.value.trim().split(/\s+/).length : 0);
  return {
    added: changes.filter((c) => c.added).reduce((n, c) => n + size(c), 0),
    removed: changes.filter((c) => c.removed).reduce((n, c) => n + size(c), 0),
  };
}

/** A standard unified diff (what `git diff` and `patch` read). */
export const unifiedPatch = (a: string, b: string, names: [string, string]) => createTwoFilesPatch(names[0], names[1], a, b, '', '', { context: 3 });
