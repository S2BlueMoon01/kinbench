export type Kind = 'uuid' | 'ulid' | 'nanoid';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const NANOID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'; // 64 symbols: & 63 is unbiased

export const LIMITS = { count: [1, 1000], size: [2, 64] } as const;
const clamp = (n: number, [min, max]: readonly [number, number]) => (Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : min);

/** ULID: 48-bit millisecond time + 80 random bits, Crockford Base32 (https://github.com/ulid/spec). */
export function ulid(time = Date.now(), random = crypto.getRandomValues(new Uint8Array(16))): string {
  let out = '';
  for (let t = time, i = 0; i < 10; i++, t = Math.floor(t / 32)) out = CROCKFORD[t % 32] + out;
  for (let i = 0; i < 16; i++) out += CROCKFORD[random[i] & 31]; // 256 is a multiple of 32, so no bias
  return out;
}

export function nanoid(size = 21, random = crypto.getRandomValues(new Uint8Array(size))): string {
  let out = '';
  for (let i = 0; i < size; i++) out += NANOID_ALPHABET[random[i] & 63];
  return out;
}

export function generate(kind: Kind, count: number, size = 21): string[] {
  const n = clamp(count, LIMITS.count);
  const s = clamp(size, LIMITS.size);
  return Array.from({ length: n }, () => (kind === 'uuid' ? crypto.randomUUID() : kind === 'ulid' ? ulid() : nanoid(s)));
}
