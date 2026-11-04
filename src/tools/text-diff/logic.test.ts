import { describe, expect, it } from 'vitest';
import { diffStats, diffTexts, unifiedPatch } from './logic';

const a = 'line one\nline two\nline three\n';
const b = 'line one\nline 2\nline three\nline four\n';

describe('text diff', () => {
  it('diffs by line and counts changes', () => {
    const changes = diffTexts(a, b, 'lines', false);
    expect(changes.map((c) => [c.added ? '+' : c.removed ? '-' : ' ', c.value])).toEqual([
      [' ', 'line one\n'],
      ['-', 'line two\n'],
      ['+', 'line 2\n'],
      [' ', 'line three\n'],
      ['+', 'line four\n'],
    ]);
    expect(diffStats(changes, 'lines')).toEqual({ added: 2, removed: 1 });
  });

  it('diffs by word, keeping Vietnamese words whole', () => {
    const changes = diffTexts('Xin chào thế giới', 'Xin chào Việt Nam', 'words', false);
    expect(changes.filter((c) => c.removed).map((c) => c.value)).toEqual(['thế', 'giới']);
    expect(changes.filter((c) => c.added).map((c) => c.value)).toEqual(['Việt', 'Nam']);
    expect(diffStats(changes, 'words')).toEqual({ added: 2, removed: 2 });
  });

  it('can ignore leading and trailing whitespace', () => {
    expect(diffTexts('  a b\n', 'a b  \n', 'lines', true).every((c) => !c.added && !c.removed)).toBe(true);
    expect(diffTexts('a  b\n', 'a b\n', 'lines', true).some((c) => c.added)).toBe(true);
  });

  it('handles empty input', () => {
    expect(diffStats(diffTexts('', '', 'lines', false), 'lines')).toEqual({ added: 0, removed: 0 });
    expect(diffStats(diffTexts('', 'new\n', 'lines', false), 'lines')).toEqual({ added: 1, removed: 0 });
  });

  it('writes a unified patch', () => {
    expect(unifiedPatch(a, b, ['a.txt', 'b.txt'])).toContain('--- a.txt\n+++ b.txt\n@@ -1,3 +1,4 @@\n line one\n-line two\n+line 2\n line three\n+line four\n');
  });
});
