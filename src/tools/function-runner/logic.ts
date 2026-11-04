export type Case = { params: string; expected: string };
export type ParsedCase = { ok: true; args: unknown[]; expected: unknown } | { ok: false; error: 'params' | 'expected' };

/** Params must be a JSON array (the arguments); expected is any JSON value. */
export function parseCase({ params, expected }: Case): ParsedCase {
  let args: unknown;
  try { args = JSON.parse(params.trim() || '[]'); } catch { return { ok: false, error: 'params' }; }
  if (!Array.isArray(args)) return { ok: false, error: 'params' };
  try { return { ok: true, args, expected: JSON.parse(expected) }; } catch { return { ok: false, error: 'expected' }; }
}

/** Structural equality for JSON-like values: NaN equals NaN, 0 equals -0, key order is ignored. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b || (Number.isNaN(a) && Number.isNaN(b))) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** How a returned value is shown: JSON where possible, otherwise what JSON would lose (undefined, NaN, 10n). */
export function formatValue(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (typeof v === 'number' && !Number.isFinite(v)) return String(v);
  if (typeof v === 'bigint') return `${v}n`;
  try { return JSON.stringify(v) ?? String(v); } catch { return String(v); }
}

export const TIMEOUT = { default: 3000, min: 100, max: 60000 } as const;
