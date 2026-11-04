export type SearchItem = { slug: string; href: string; title: string; category: string };

/** Lowercase without diacritics, so "dem ky tu" finds "Đếm ký tự". */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd');

/** Every word of the query must appear in the tool's title, category or slug. */
export function searchTools(items: SearchItem[], query: string): SearchItem[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const haystack = fold(`${item.title} ${item.category} ${item.slug.replaceAll('-', ' ')}`);
    return words.every((w) => haystack.includes(w));
  });
}

const RECENT_KEY = 'kinbench:recent';
export const RECENT_MAX = 6;

/** Most recent first, no duplicates. Only tool slugs are stored, never what was typed into a tool. */
export const withRecent = (list: string[], slug: string) => [slug, ...list.filter((s) => s !== slug)].slice(0, RECENT_MAX);

export function readRecent(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberVisit(slug: string) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(withRecent(readRecent(), slug))); } catch {}
}
