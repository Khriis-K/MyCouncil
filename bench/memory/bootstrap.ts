import { mulberry32 } from './rng';

/** One probe's value (e.g. A − B on a metric), tagged with the scenario it belongs to. */
export interface ClusterValue {
  cluster: string;
  value: number;
}

export interface BootstrapOptions {
  iterations: number;
  seed: number;
}

export interface Interval {
  meanDiff: number;
  /** 2.5th percentile of the resampled means */
  lo: number;
  /** 97.5th percentile of the resampled means */
  hi: number;
  nScenarios: number;
  nProbes: number;
}

export const BOOTSTRAP: BootstrapOptions = { iterations: 2000, seed: 1234 };

/** Nearest-rank percentile; undefined for no values. */
export function percentile(values: number[], p: number): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

/**
 * Cluster bootstrap of the mean over probes. Probes in one scenario share a timeline, so they are
 * not independent: each resample draws whole scenarios with replacement, then averages over all
 * the probes it drew.
 */
export function clusterBootstrap(values: ClusterValue[], { iterations, seed }: BootstrapOptions): Interval {
  if (values.length === 0) throw new Error('clusterBootstrap: no values');
  const byCluster = new Map<string, { sum: number; n: number }>();
  for (const { cluster, value } of values) {
    const c = byCluster.get(cluster) ?? { sum: 0, n: 0 };
    c.sum += value;
    c.n++;
    byCluster.set(cluster, c);
  }
  const clusters = [...byCluster.values()];
  const rng = mulberry32(seed);
  const means: number[] = [];
  for (let i = 0; i < iterations; i++) {
    let sum = 0;
    let n = 0;
    for (let j = 0; j < clusters.length; j++) {
      const c = clusters[Math.floor(rng() * clusters.length)];
      sum += c.sum;
      n += c.n;
    }
    means.push(sum / n);
  }
  return {
    meanDiff: values.reduce((sum, v) => sum + v.value, 0) / values.length,
    lo: percentile(means, 2.5)!,
    hi: percentile(means, 97.5)!,
    nScenarios: clusters.length,
    nProbes: values.length,
  };
}

export interface PairRow {
  system: string;
  scenarioId: string;
  probeId: string;
  metrics: Record<string, number>;
}

/** Per-probe A − B on one metric, clustered by scenario. */
export function pairedDiffs(rows: PairRow[], a: string, b: string, metric: string): ClusterValue[] {
  const key = (r: PairRow) => `${r.scenarioId}\0${r.probeId}`;
  const value = (r: PairRow) => {
    const v = r.metrics[metric];
    if (v === undefined) throw new Error(`pairedDiffs: ${r.system} has no ${metric} for probe ${r.probeId}`);
    return v;
  };
  const baseline = new Map(rows.filter(r => r.system === b).map(r => [key(r), r]));
  return rows
    .filter(r => r.system === a)
    .map(r => {
      const other = baseline.get(key(r));
      if (!other) throw new Error(`pairedDiffs: probe ${r.probeId} has no ${b} row for ${metric}`);
      return { cluster: r.scenarioId, value: value(r) - value(other) };
    });
}

const BASELINES = ['existing-context', 'dense'];

/** [A, B] pairs to compare: each system vs existing-context, then each vs dense; no duplicates. */
export function comparisonPairs(systems: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  const seen = new Set<string>();
  for (const baseline of BASELINES.filter(b => systems.includes(b))) {
    for (const system of systems) {
      const key = [system, baseline].sort().join('\0');
      if (system === baseline || seen.has(key)) continue;
      seen.add(key);
      pairs.push([system, baseline]);
    }
  }
  return pairs;
}
