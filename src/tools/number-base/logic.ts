const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const PREFIX: Record<string, number> = { '0b': 2, '0o': 8, '0x': 16 };

/** Parses an integer of any size in base 2–36. Accepts a sign, a matching 0b/0o/0x prefix, and _ or spaces as separators. */
export function parseInteger(input: string, base: number): bigint | null {
  let s = input.trim().toLowerCase().replace(/[_\s]/g, '');
  const negative = s.startsWith('-');
  if (negative) s = s.slice(1);
  if (PREFIX[s.slice(0, 2)] === base) s = s.slice(2);
  if (!s || base < 2 || base > 36) return null;
  const big = BigInt(base);
  let n = 0n;
  for (const ch of s) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return null;
    n = n * big + BigInt(d);
  }
  return negative ? -n : n;
}

export const formatInteger = (n: bigint, base: number) => n.toString(base);
