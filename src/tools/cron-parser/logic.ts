export const FIELDS = ['minute', 'hour', 'day', 'month', 'weekday'] as const;
export type Field = (typeof FIELDS)[number];

const RANGES: Record<Field, [number, number]> = { minute: [0, 59], hour: [0, 23], day: [1, 31], month: [1, 12], weekday: [0, 7] };
const NAMES: Partial<Record<Field, string[]>> = {
  month: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  weekday: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
};
const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

export type Cron = Record<Field, Set<number>> & { anyDay: boolean; anyWeekday: boolean };
export type CronResult = { ok: true; cron: Cron; expression: string } | { ok: false; error: 'fields' | Field };

function parseField(text: string, field: Field): Set<number> | null {
  const [min, max] = RANGES[field];
  const value = (s: string) => {
    const named = NAMES[field]?.indexOf(s.toUpperCase()) ?? -1;
    const n = named >= 0 ? named + (field === 'month' ? 1 : 0) : /^\d+$/.test(s) ? Number(s) : NaN;
    return n >= min && n <= max ? n : null;
  };
  const out = new Set<number>();
  for (const part of text.split(',')) {
    const m = part.match(/^(?:(\*)|(\w+)(?:-(\w+))?)(?:\/(\d+))?$/);
    if (!m) return null;
    const start = m[1] ? min : value(m[2]);
    const end = m[1] ? max : m[3] !== undefined ? value(m[3]) : m[4] !== undefined ? max : start;
    const step = m[4] === undefined ? 1 : Number(m[4]);
    if (start === null || end === null || start > end || step < 1) return null;
    for (let n = start; n <= end; n += step) out.add(field === 'weekday' && n === 7 ? 0 : n); // 7 is Sunday too
  }
  return out;
}

/** Standard 5-field cron (minute hour day month weekday) with names, ranges, steps, lists and @macros. */
export function parseCron(input: string): CronResult {
  const expression = (MACROS[input.trim().toLowerCase()] ?? input).trim();
  const parts = expression.split(/\s+/);
  if (parts.length !== 5) return { ok: false, error: 'fields' };
  const sets = {} as Record<Field, Set<number>>;
  for (const [i, field] of FIELDS.entries()) {
    const set = parseField(parts[i], field);
    if (!set) return { ok: false, error: field };
    sets[field] = set;
  }
  return { ok: true, expression, cron: { ...sets, anyDay: parts[2] === '*', anyWeekday: parts[4] === '*' } };
}

/**
 * The next `count` run times after `from`, in UTC or the device's time zone. As in Vixie cron, when both day and
 * weekday are restricted a time matches if either does. Gives up after ~5 years (e.g. "0 0 31 2 *" never runs).
 */
export function nextRuns(cron: Cron, from: Date, count: number, utc: boolean): Date[] {
  const get = (d: Date) => (utc
    ? { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), wd: d.getUTCDay() }
    : { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate(), h: d.getHours(), mi: d.getMinutes(), wd: d.getDay() });
  const at = (y: number, mo: number, day: number, h: number, mi: number) => (utc ? new Date(Date.UTC(y, mo, day, h, mi)) : new Date(y, mo, day, h, mi));
  const dayOk = (t: ReturnType<typeof get>) => {
    const dom = cron.day.has(t.d);
    const dow = cron.weekday.has(t.wd);
    return cron.anyDay && cron.anyWeekday ? true : cron.anyDay ? dow : cron.anyWeekday ? dom : dom || dow;
  };
  const start = get(from);
  let d = at(start.y, start.mo, start.d, start.h, start.mi + 1);
  const limit = from.getTime() + 5 * 366 * 86_400_000;
  const out: Date[] = [];
  while (out.length < count && d.getTime() <= limit) {
    const t = get(d);
    if (!cron.month.has(t.mo + 1)) d = at(t.y, t.mo + 1, 1, 0, 0);
    else if (!dayOk(t)) d = at(t.y, t.mo, t.d + 1, 0, 0);
    else if (!cron.hour.has(t.h)) d = at(t.y, t.mo, t.d, t.h + 1, 0);
    else if (!cron.minute.has(t.mi)) d = at(t.y, t.mo, t.d, t.h, t.mi + 1);
    else {
      out.push(d);
      d = at(t.y, t.mo, t.d, t.h, t.mi + 1);
    }
  }
  return out;
}
