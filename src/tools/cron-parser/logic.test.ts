import { describe, expect, it } from 'vitest';
import { nextRuns, parseCron } from './logic';

const from = new Date('2025-01-30T10:07:30Z'); // a Thursday
const runs = (expr: string, n = 3) => {
  const r = parseCron(expr);
  if (!r.ok) throw new Error(r.error);
  return nextRuns(r.cron, from, n, true).map((d) => d.toISOString().slice(0, 16));
};

describe('cron', () => {
  it('computes next runs for steps, ranges and names', () => {
    expect(runs('*/15 9-17 * * MON-FRI')).toEqual(['2025-01-30T10:15', '2025-01-30T10:30', '2025-01-30T10:45']);
    expect(runs('0 0 1 */3 *')).toEqual(['2025-04-01T00:00', '2025-07-01T00:00', '2025-10-01T00:00']);
    expect(runs('30 8 * * sun,7', 2)).toEqual(['2025-02-02T08:30', '2025-02-09T08:30']);
    expect(runs('@hourly', 2)).toEqual(['2025-01-30T11:00', '2025-01-30T12:00']);
  });

  it('matches day OR weekday when both are restricted, like Vixie cron', () => {
    expect(runs('0 12 13 * FRI', 3)).toEqual(['2025-01-31T12:00', '2025-02-07T12:00', '2025-02-13T12:00']);
  });

  it('handles leap days and impossible dates', () => {
    expect(runs('0 0 29 2 *', 2)).toEqual(['2028-02-29T00:00']); // 2032 is past the 5-year horizon
    expect(runs('0 0 31 2 *')).toEqual([]);
  });

  it('rejects empty input', () => {
    expect(parseCron('')).toEqual({ ok: false, error: 'fields' });
  });

  it('says which field is invalid', () => {
    expect(parseCron('60 * * * *')).toEqual({ ok: false, error: 'minute' });
    expect(parseCron('* 24 * * *')).toEqual({ ok: false, error: 'hour' });
    expect(parseCron('* * 0 * *')).toEqual({ ok: false, error: 'day' });
    expect(parseCron('* * * FOO *')).toEqual({ ok: false, error: 'month' });
    expect(parseCron('* * * * 5-2')).toEqual({ ok: false, error: 'weekday' });
    expect(parseCron('0 * * * * *')).toEqual({ ok: false, error: 'fields' });
  });
});
