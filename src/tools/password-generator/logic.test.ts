import { describe, expect, it } from 'vitest';
import { entropyBits, generatePassword, strength } from './logic';

describe('password generator', () => {
  it('uses only the chosen sets and includes each of them', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword({ length: 12, sets: ['lower', 'digits', 'symbols'], excludeSimilar: false })!;
      expect(pw).toHaveLength(12);
      expect(pw).toMatch(/^[a-z0-9!@#$%^&*()\-_=+[\]{};:,.<>/?~]+$/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/\d/);
      expect(pw).toMatch(/[^a-z0-9]/);
    }
  });

  it('can exclude look-alike characters', () => {
    const pw = generatePassword({ length: 128, sets: ['lower', 'upper', 'digits'], excludeSimilar: true })!;
    expect(pw).not.toMatch(/[Il1O0o]/);
  });

  it('rejects biased random values instead of using modulo', () => {
    const values = [0xffffffff, 3]; // the first is above the limit for an alphabet of 10 and must be redrawn
    const pw = generatePassword({ length: 4, sets: ['digits'], excludeSimilar: false }, () => values.shift() ?? 5);
    expect(pw).toBe('3555');
  });

  it('returns null with no sets (empty) or an invalid length', () => {
    expect(generatePassword({ length: 16, sets: [], excludeSimilar: false })).toBeNull();
    expect(generatePassword({ length: 3, sets: ['lower'], excludeSimilar: false })).toBeNull();
    expect(generatePassword({ length: 200, sets: ['lower'], excludeSimilar: false })).toBeNull();
  });

  it('estimates entropy and strength', () => {
    expect(entropyBits({ length: 16, sets: ['lower', 'upper', 'digits', 'symbols'], excludeSimilar: false })).toBe(104); // 16 × log2(89)
    expect(strength(30)).toBe('weak');
    expect(strength(104)).toBe('veryStrong');
  });
});
