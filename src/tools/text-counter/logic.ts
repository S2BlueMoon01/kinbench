export type TextStats = {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  bytes: number;
  readingMinutes: number;
};

export const WORDS_PER_MINUTE = 200;

/** Characters are grapheme clusters, so "ệ" counts once whether it is typed precomposed or with combining marks. */
export function countText(text: string, locale: string): TextStats {
  if (!text) return { characters: 0, charactersNoSpaces: 0, words: 0, lines: 0, bytes: 0, readingMinutes: 0 };
  let characters = 0;
  let spaces = 0;
  for (const { segment } of new Intl.Segmenter(locale, { granularity: 'grapheme' }).segment(text)) {
    characters++;
    if (/^\s+$/u.test(segment)) spaces++;
  }
  let words = 0;
  for (const s of new Intl.Segmenter(locale, { granularity: 'word' }).segment(text)) if (s.isWordLike) words++;
  return {
    characters,
    charactersNoSpaces: characters - spaces,
    words,
    lines: text.split(/\r\n|\r|\n/).length,
    bytes: new TextEncoder().encode(text).length,
    readingMinutes: Math.ceil(words / WORDS_PER_MINUTE),
  };
}
