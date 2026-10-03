import { describe, expect, test } from 'vitest';
import type { LogRegModel, TrainOptions } from '../../server/memory/logreg';
import { assertDevOnly, baselineFolds, chooseLambda, crossValidate, groupedFolds, rankSources, trainingSet, type ProbeRows } from './train-ltr';

describe('assertDevOnly', () => {
  test('passes dev scenarios', () => {
    expect(() => assertDevOnly([{ id: 'a', split: 'dev' }, { id: 'b', split: 'dev' }])).not.toThrow();
  });

  test.each(['test', 'fixture'])('throws if a %s scenario is passed', split => {
    expect(() => assertDevOnly([{ id: 'a', split: 'dev' }, { id: 'b', split }])).toThrow(/b.*dev/);
  });

  test('throws on no scenarios at all', () => {
    expect(() => assertDevOnly([])).toThrow();
  });
});

const ids = Array.from({ length: 10 }, (_, i) => `s${i}`);

describe('groupedFolds', () => {
  test('puts every scenario in exactly one fold, and folds differ in size by at most one', () => {
    const folds = groupedFolds(ids, 4, 'seed');
    expect(folds).toHaveLength(4);
    expect(folds.flat().sort()).toEqual([...ids].sort());
    const sizes = folds.map(f => f.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  test('is deterministic for a seed and ignores input order', () => {
    expect(groupedFolds([...ids].reverse(), 4, 'seed')).toEqual(groupedFolds(ids, 4, 'seed'));
  });

  test('throws with fewer scenarios than folds', () => {
    expect(() => groupedFolds(['a', 'b'], 4, 'seed')).toThrow();
  });
});

describe('rankSources', () => {
  test('orders by score, ties by stage-1 rank, and keeps each source once', () => {
    const candidates = [
      { sourceId: 'a', stage1Rank: 1, features: [] },
      { sourceId: 'b', stage1Rank: 2, features: [] },
      { sourceId: 'a', stage1Rank: 3, features: [] },
      { sourceId: 'c', stage1Rank: 4, features: [] },
    ];
    expect(rankSources(candidates, [0.1, 0.5, 0.9, 0.5])).toEqual(['a', 'b', 'c']);
  });
});

// One probe per scenario; its candidates' only feature is the scenario's number, so the
// rows a trainer receives say which scenarios they came from.
const probes: ProbeRows[] = ids.map((scenarioId, n) => ({
  scenarioId,
  probeId: 'p1',
  gold: [{ sourceId: `${scenarioId}-gold`, grade: 2 }],
  candidates: [
    { sourceId: `${scenarioId}-gold`, stage1Rank: 2, features: [n] },
    { sourceId: `${scenarioId}-other`, stage1Rank: 1, features: [n] },
  ],
}));

describe('trainingSet', () => {
  test('labels a candidate 1 when its source is gold with grade >= 1', () => {
    const partial: ProbeRows = { ...probes[0], gold: [{ sourceId: 's0-other', grade: 1 }, { sourceId: 's0-gold', grade: 2 }] };
    expect(trainingSet([partial, probes[1]]).y).toEqual([1, 1, 1, 0]);
  });
});

describe('crossValidate', () => {
  test('trains each fold only on the other folds, so standardization never sees a validation scenario', () => {
    const folds = groupedFolds(ids, 4, 'seed');
    const seen: number[][] = [];
    const spy = (x: number[][], _y: number[], _o: TrainOptions): LogRegModel => {
      seen.push(x.map(row => row[0]));
      return { means: [0], stds: [1], weights: [0], bias: 0 };
    };
    crossValidate(probes, folds, 0.1, spy);
    expect(seen).toHaveLength(4);
    folds.forEach((fold, f) => {
      const trainedOn = new Set(seen[f].map(n => ids[n]));
      expect(fold.filter(id => trainedOn.has(id))).toEqual([]);
      expect(trainedOn.size).toBe(ids.length - fold.length);
    });
  });

  test('scores each validation probe with the fold model: a flat model keeps stage-1 order', () => {
    const flat = (): LogRegModel => ({ means: [0], stds: [1], weights: [0], bias: 0 });
    const result = crossValidate(probes, groupedFolds(ids, 4, 'seed'), 0, flat);
    // gold is stage-1 rank 2 everywhere: MRR 1/2, recall@5 1
    expect(result.every(m => m.mrr === 0.5 && m['recall@5'] === 1)).toBe(true);
  });
});

describe('baselineFolds', () => {
  test('averages per-probe metrics over each fold, keyed by scenario and probe', () => {
    const folds = [['s0', 's1'], ['s2']];
    const metrics = (v: number) => ({ 'ndcg@5': v, 'recall@5': v, mrr: v });
    const perProbe = new Map([['s0/p1', metrics(1)], ['s1/p1', metrics(0)], ['s2/p1', metrics(0.5)]]);
    expect(baselineFolds(probes.slice(0, 3), folds, perProbe).map(m => m.mrr)).toEqual([0.5, 0.5]);
  });
});

describe('chooseLambda', () => {
  test('picks the best mean nDCG@5 and prefers the stronger penalty on a tie', () => {
    expect(chooseLambda([{ lambda: 0, ndcg: 0.5 }, { lambda: 0.1, ndcg: 0.7 }, { lambda: 1, ndcg: 0.6 }])).toBe(0.1);
    expect(chooseLambda([{ lambda: 0, ndcg: 0.7 }, { lambda: 0.1, ndcg: 0.7 }])).toBe(0.1);
  });
});
