import { describe, expect, it } from 'vitest';
import { countText } from './logic';

describe('countText', () => {
  it('counts a normal multi-line text', () => {
    expect(countText('Hello world\nXin chào Việt Nam!', 'vi')).toEqual({
      characters: 30,
      charactersNoSpaces: 25,
      words: 6,
      lines: 2,
      bytes: 33,
      readingMinutes: 1,
    });
  });

  it('counts Vietnamese with combining marks as one character each', () => {
    const nfd = 'ệ'.normalize('NFD'); // e + two combining marks
    expect(nfd.length).toBe(3);
    expect(countText(nfd, 'vi')).toMatchObject({ characters: 1, words: 1, bytes: 5 });
    expect(countText('👍🏽', 'en')).toMatchObject({ characters: 1, bytes: 8 });
  });

  it('returns zeros for empty input', () => {
    expect(countText('', 'en')).toEqual({ characters: 0, charactersNoSpaces: 0, words: 0, lines: 0, bytes: 0, readingMinutes: 0 });
  });

  it('handles whitespace-only and odd line endings', () => {
    expect(countText(' \r\n\t', 'en')).toMatchObject({ characters: 3, charactersNoSpaces: 0, words: 0, lines: 2 });
    expect(countText('a\rb\nc', 'en').lines).toBe(3);
    expect(countText('word '.repeat(201), 'en').readingMinutes).toBe(2);
  });
});
