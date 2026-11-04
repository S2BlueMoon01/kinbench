export type Unit = 'auto' | 's' | 'ms';

/** Auto treats |n| ≥ 1e11 as milliseconds: as seconds that would be after the year 5000. */
export function parseTimestamp(input: string, unit: Unit): { date: Date; unit: 's' | 'ms' } | null {
  const s = input.trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  const u = unit === 'auto' ? (Math.abs(n) >= 1e11 ? 'ms' : 's') : unit;
  const date = new Date(u === 's' ? n * 1000 : n);
  return Number.isNaN(date.getTime()) ? null : { date, unit: u };
}
