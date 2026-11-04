export const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>/?~',
} as const;
export type SetName = keyof typeof SETS;
export type Options = { length: number; sets: SetName[]; excludeSimilar: boolean };

const SIMILAR = /[Il1O0o]/g;
export const LENGTH = { min: 4, max: 128 } as const;

const pools = ({ sets, excludeSimilar }: Options) => sets.map((s) => (excludeSimilar ? SETS[s].replace(SIMILAR, '') : SETS[s]));

/** Unbiased integer in [0, n): rejection sampling instead of `% n` on raw random bytes. */
function randomIndex(n: number, random: () => number) {
  const limit = Math.floor(2 ** 32 / n) * n;
  let x: number;
  do x = random(); while (x >= limit);
  return x % n;
}

const cryptoRandom = () => crypto.getRandomValues(new Uint32Array(1))[0];

/** One character from every chosen set is guaranteed, by redrawing until each appears (keeps the result uniform). */
export function generatePassword(opts: Options, random: () => number = cryptoRandom): string | null {
  const p = pools(opts);
  if (p.length === 0 || opts.length < Math.max(LENGTH.min, p.length) || opts.length > LENGTH.max) return null;
  const alphabet = p.join('');
  for (;;) {
    const pw = Array.from({ length: opts.length }, () => alphabet[randomIndex(alphabet.length, random)]).join('');
    if (p.every((pool) => [...pool].some((c) => pw.includes(c)))) return pw;
  }
}

/** Bits of entropy for a random password of this length over this alphabet. */
export const entropyBits = (opts: Options) => {
  const size = pools(opts).join('').length;
  return size ? Math.round(opts.length * Math.log2(size)) : 0;
};

export const strength = (bits: number) => (bits < 40 ? 'weak' : bits < 60 ? 'fair' : bits < 80 ? 'strong' : 'veryStrong');
