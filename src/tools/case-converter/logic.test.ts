import { describe, expect, it } from 'vitest';
import { convertCase, words } from './logic';

describe('case converter', () => {
  it('splits identifiers and phrases into words', () => {
    expect(words('XMLHttpRequest2 user_id-v2Api')).toEqual(['XML', 'Http', 'Request2', 'user', 'id', 'v2', 'Api']);
  });

  it('converts to identifier cases, stripping Vietnamese diacritics', () => {
    const s = 'Xin chào Việt Nam đẹp';
    expect(convertCase(s, 'camel', 'vi')).toBe('xinChaoVietNamDep');
    expect(convertCase(s, 'pascal', 'vi')).toBe('XinChaoVietNamDep');
    expect(convertCase(s, 'snake', 'vi')).toBe('xin_chao_viet_nam_dep');
    expect(convertCase(s, 'constant', 'vi')).toBe('XIN_CHAO_VIET_NAM_DEP');
    expect(convertCase(s, 'kebab', 'vi')).toBe('xin-chao-viet-nam-dep');
    expect(convertCase('getHTTPResponse', 'dot', 'en')).toBe('get.http.response');
    expect(convertCase('first name\nlastName', 'snake', 'en')).toBe('first_name\nlast_name');
  });

  it('converts text cases, keeping diacritics', () => {
    expect(convertCase("đây là KINBENCH. it's local! ok", 'title', 'vi')).toBe("Đây Là Kinbench. It's Local! Ok");
    expect(convertCase('XIN CHÀO. TẠM BIỆT!\nhẹn gặp lại', 'sentence', 'vi')).toBe('Xin chào. Tạm biệt!\nHẹn gặp lại');
    expect(convertCase('Ưu Tiên', 'upper', 'vi')).toBe('ƯU TIÊN');
  });

  it('returns empty output for empty input', () => {
    expect(convertCase('', 'camel', 'en')).toBe('');
    expect(convertCase('', 'title', 'en')).toBe('');
  });

  it('drops characters that cannot be part of an identifier', () => {
    expect(convertCase('!!! --- ???', 'kebab', 'en')).toBe('');
    expect(convertCase('a+b=c', 'snake', 'en')).toBe('a_b_c');
  });
});
