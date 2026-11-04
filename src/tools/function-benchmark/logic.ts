export type Stats = { hz: number; rme: number; samples: number };

/** Mean ops/sec and relative margin of error (95%, normal approximation), as benchmark.js reports them. */
export function stats(samples: number[]): Stats {
  const n = samples.length;
  if (!n) return { hz: 0, rme: 0, samples: 0 };
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? samples.reduce((a, s) => a + (s - mean) ** 2, 0) / (n - 1) : 0;
  return { hz: mean, rme: mean ? ((1.96 * Math.sqrt(variance / n)) / mean) * 100 : 0, samples: n };
}

/** Each result as a share of the fastest (1 = fastest), and how many times slower it is. */
export function compare(hz: number[]) {
  const best = Math.max(...hz, 0);
  return hz.map((h) => ({ share: best ? h / best : 0, slower: h ? best / h : Infinity }));
}

/** Params as a JSON array; empty means no arguments. */
export function parseArgs(s: string): unknown[] | null {
  try {
    const v: unknown = JSON.parse(s.trim() || '[]');
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export const BUDGET = { default: 1000, min: 200, max: 5000 } as const;
