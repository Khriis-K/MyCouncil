import { describe, expect, test } from 'vitest';
import { clusterBootstrap, comparisonPairs, pairedDiffs, type ClusterValue } from './bootstrap';

const options = { iterations: 2000, seed: 1234 };

// n probes per scenario, every probe with the same diff
const cluster = (scenario: string, n: number, value: number): ClusterValue[] =>
  Array.from({ length: n }, () => ({ cluster: scenario, value }));

describe('clusterBootstrap', () => {
  test('is deterministic for a fixed seed', () => {
    const values = [...cluster('s1', 3, 0.5), ...cluster('s2', 2, -0.2), ...cluster('s3', 4, 0.1), ...cluster('s4', 1, 1)];
    expect(clusterBootstrap(values, options)).toEqual(clusterBootstrap(values, options));
  });

  test('identical systems: the mean diff is 0 and the CI contains 0', () => {
    const result = clusterBootstrap([...cluster('s1', 3, 0), ...cluster('s2', 5, 0)], options);
    expect(result.meanDiff).toBe(0);
    expect(result.lo).toBeLessThanOrEqual(0);
    expect(result.hi).toBeGreaterThanOrEqual(0);
  });

  test('always better by a constant: the CI excludes 0 and centers on the constant', () => {
    const result = clusterBootstrap([...cluster('s1', 3, 0.2), ...cluster('s2', 4, 0.2), ...cluster('s3', 2, 0.2)], options);
    expect(result.meanDiff).toBeCloseTo(0.2, 12);
    expect(result.lo).toBeCloseTo(0.2, 12);
    expect(result.hi).toBeCloseTo(0.2, 12);
    expect(result.lo).toBeGreaterThan(0);
  });

  test('the mean diff is over probes, not over scenarios', () => {
    // 1 probe at +1 and 3 probes at 0: probe mean 0.25, scenario mean 0.5
    expect(clusterBootstrap([...cluster('s1', 1, 1), ...cluster('s2', 3, 0)], options).meanDiff).toBe(0.25);
  });

  test('resamples scenarios, not probes', () => {
    // Two scenarios of five probes each, one all +1 and one all 0. Resampling scenarios draws
    // {s1,s1} a quarter of the time, so the CI runs from 0 to 1. Resampling the ten probes
    // independently would almost never give a mean of 0 or 1, so its CI would be much narrower.
    const result = clusterBootstrap([...cluster('s1', 5, 1), ...cluster('s2', 5, 0)], options);
    expect(result.meanDiff).toBe(0.5);
    expect(result.lo).toBe(0);
    expect(result.hi).toBe(1);
  });

  test('reports the scenario and probe counts', () => {
    expect(clusterBootstrap([...cluster('s1', 2, 1), ...cluster('s2', 3, 0)], options)).toMatchObject({ nScenarios: 2, nProbes: 5 });
  });

  test('refuses an empty input', () => {
    expect(() => clusterBootstrap([], options)).toThrow(/no values/i);
  });
});

describe('pairedDiffs', () => {
  const row = (system: string, scenarioId: string, probeId: string, recall: number) => ({ system, scenarioId, probeId, metrics: { 'recall@5': recall } });

  test('pairs the two systems by probe and keeps the scenario as the cluster', () => {
    const rows = [
      row('a', 's1', 'p1', 1), row('b', 's1', 'p1', 0.5),
      row('b', 's2', 'p2', 1), row('a', 's2', 'p2', 0),
    ];
    expect(pairedDiffs(rows, 'a', 'b', 'recall@5')).toEqual([
      { cluster: 's1', value: 0.5 },
      { cluster: 's2', value: -1 },
    ]);
  });

  test('a probe missing for one system is an error, not a silent drop', () => {
    expect(() => pairedDiffs([row('a', 's1', 'p1', 1)], 'a', 'b', 'recall@5')).toThrow(/p1/);
  });
});

describe('comparisonPairs', () => {
  test('each system vs existing-context and vs dense, without duplicates or self-pairs', () => {
    expect(comparisonPairs(['existing-context', 'recency', 'dense', 'memory-production'])).toEqual([
      ['recency', 'existing-context'],
      ['dense', 'existing-context'],
      ['memory-production', 'existing-context'],
      ['recency', 'dense'],
      ['memory-production', 'dense'],
    ]);
  });

  test('skips a baseline that was not run', () => {
    expect(comparisonPairs(['dense', 'bm25'])).toEqual([['bm25', 'dense']]);
  });
});
