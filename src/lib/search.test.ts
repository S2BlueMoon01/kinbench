import { describe, expect, it } from 'vitest';
import { fold, RECENT_MAX, searchTools, withRecent } from './search';

const items = [
  { slug: 'text-counter', href: '/vi/tools/text-counter', title: 'Đếm ký tự', category: 'Văn bản' },
  { slug: 'hash-generator', href: '/vi/tools/hash-generator', title: 'Tạo mã hash', category: 'Hash & mã hoá' },
  { slug: 'json-formatter', href: '/vi/tools/json-formatter', title: 'JSON Formatter', category: 'Format & kiểm tra' },
];

describe('searchTools', () => {
  it('matches Vietnamese without diacritics, English slugs and categories', () => {
    expect(fold('Đếm KÝ tự')).toBe('dem ky tu');
    expect(searchTools(items, 'dem ky').map((i) => i.slug)).toEqual(['text-counter']);
    expect(searchTools(items, 'counter').map((i) => i.slug)).toEqual(['text-counter']);
    expect(searchTools(items, 'ma hoa').map((i) => i.slug)).toEqual(['hash-generator']);
    expect(searchTools(items, 'json format').map((i) => i.slug)).toEqual(['json-formatter']);
  });

  it('returns every tool for an empty query', () => {
    expect(searchTools(items, '  ')).toHaveLength(3);
  });

  it('returns nothing when a word does not match', () => {
    expect(searchTools(items, 'json yaml')).toEqual([]);
  });
});

describe('withRecent', () => {
  it('puts the latest first, without duplicates, capped', () => {
    expect(withRecent(['a', 'b'], 'b')).toEqual(['b', 'a']);
    expect(withRecent([], 'a')).toEqual(['a']);
    expect(withRecent(['1', '2', '3', '4', '5', '6'], '7')).toHaveLength(RECENT_MAX);
  });
});
