import { describe, expect, it } from 'vitest';
import { generate, nanoid, ulid } from './logic';

describe('id generators', () => {
  it('generates UUID v4, ULID and nanoid in the right shape', () => {
    expect(generate('uuid', 3).every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))).toBe(true);
    expect(generate('ulid', 3).every((id) => /^[0-9A-HJKMNP-TV-Z]{26}$/.test(id))).toBe(true);
    expect(generate('nanoid', 3, 10).every((id) => /^[\w-]{10}$/.test(id))).toBe(true);
    expect(new Set(generate('uuid', 100)).size).toBe(100);
  });

  it('encodes the ULID timestamp like the spec', () => {
    expect(ulid(1469918176385, new Uint8Array(16))).toBe('01ARYZ6S410000000000000000');
    expect(ulid(0, new Uint8Array(16).fill(31))).toBe(`0000000000${'Z'.repeat(16)}`);
    expect(nanoid(4, new Uint8Array([0, 1, 62, 63]))).toBe('AB_-');
  });

  it('clamps empty or invalid counts and sizes', () => {
    expect(generate('uuid', 0)).toHaveLength(1);
    expect(generate('uuid', Number.NaN)).toHaveLength(1);
    expect(generate('ulid', 5000)).toHaveLength(1000);
    expect(generate('nanoid', 1, 999)[0]).toHaveLength(64);
    expect(generate('nanoid', 1, 0)[0]).toHaveLength(2);
  });
});
