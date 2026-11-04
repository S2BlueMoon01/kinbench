export const cases = ['camel', 'pascal', 'snake', 'constant', 'kebab', 'dot', 'title', 'sentence', 'lower', 'upper'] as const;
export type Case = (typeof cases)[number];

/** Identifier cases are ASCII: "Việt Nam" → "viet-nam". */
const stripMarks = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

/** "XMLHttpRequest2 user_id-v2Api" → XML, Http, Request2, user, id, v2, Api. */
export function words(s: string): string[] {
  return s.normalize('NFC').match(/\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?\p{Ll}+\p{N}*|\p{Lu}+\p{N}*|\p{N}+|\p{L}+/gu) ?? [];
}

const cap = (w: string, locale: string) => w.charAt(0).toLocaleUpperCase(locale) + w.slice(1).toLocaleLowerCase(locale);

function identifier(line: string, c: Case): string {
  const w = words(stripMarks(line));
  switch (c) {
    case 'camel': return w.map((x, i) => (i ? cap(x, 'en') : x.toLowerCase())).join('');
    case 'pascal': return w.map((x) => cap(x, 'en')).join('');
    case 'snake': return w.join('_').toLowerCase();
    case 'constant': return w.join('_').toUpperCase();
    case 'kebab': return w.join('-').toLowerCase();
    default: return w.join('.').toLowerCase();
  }
}

/** Identifier cases convert each line on its own; text cases keep diacritics and line breaks. */
export function convertCase(text: string, c: Case, locale: string): string {
  const lower = text.toLocaleLowerCase(locale);
  switch (c) {
    case 'lower': return lower;
    case 'upper': return text.toLocaleUpperCase(locale);
    case 'title': return lower.replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (_, pre: string, ch: string) => pre + ch.toLocaleUpperCase(locale));
    case 'sentence': return lower.replace(/(^\s*|[.!?]\s+|\n\s*)(\p{L})/gu, (_, pre: string, ch: string) => pre + ch.toLocaleUpperCase(locale));
    default: return text.split('\n').map((line) => identifier(line, c)).join('\n');
  }
}
