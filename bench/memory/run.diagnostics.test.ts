import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { HashingEmbedder, OverlapReranker } from '../../server/memory/testHelpers';
import { loadDataset, renderMarkdown, runBenchmark, transitions, type ResultRow } from './run';

const fixturePath = path.join(import.meta.dirname, 'data', 'fixture.json');
const options = {
  split: 'fixture', k: 5, window: 6, candidatePool: 30,
  rerankers: { minilm: new OverlapReranker(), 'bge-base': new OverlapReranker() }, productionReranker: 'minilm' as const,
};

const row = (system: string, probeId: string, contextRecall: number): ResultRow => ({
  scenarioId: 's', probeId, category: 'implicit', channel: 'chat', system, goldRanks: [], metrics: { contextRecall }, contextChars: 0,
});

describe('transitions', () => {
  const rows = [
    row('dense', 'p1', 1), row('x', 'p1', 0),
    row('dense', 'p2', 0), row('x', 'p2', 1),
    row('dense', 'p3', 0.5), row('x', 'p3', 1),
    row('dense', 'p4', 1), row('x', 'p4', 1),
    row('dense', 'p5', 0), row('x', 'p5', 0),
  ];

  test('lists probes where contextRecall went up or down against the baseline', () => {
    expect(transitions(rows, 'dense', 'x')).toEqual({ better: ['p2', 'p3'], worse: ['p1'] });
  });

  test('a system compared with itself has no changes', () => {
    expect(transitions(rows, 'dense', 'dense')).toEqual({ better: [], worse: [] });
  });
});

describe('pool recall on the fixture', async () => {
  const dataset = loadDataset(fixturePath, 'fixture');
  const results = await runBenchmark({ ...options, dataset, embedder: new HashingEmbedder() });

  test('retrieval systems report how much required gold reached the candidate pool or the prompt', () => {
    for (const r of results.rows.filter(r => r.system === 'dense' || r.system === 'memory-production')) {
      expect(r.metrics.poolRecall).toBeGreaterThanOrEqual(r.metrics.contextRecall);
      expect(r.metrics.poolRecall).toBeLessThanOrEqual(1);
    }
  });

  test('systems without a retrieval stage have no pool recall', () => {
    for (const r of results.rows.filter(r => r.system === 'recency' || r.system === 'existing-context')) {
      expect(r.metrics).not.toHaveProperty('poolRecall');
    }
  });

  test('markdown shows pool recall per category and per-probe changes against dense', () => {
    const md = renderMarkdown(results);
    expect(md).toMatch(/poolRecall@30/);
    expect(md).toMatch(/## Per-probe changes vs dense/);
  });
});
