import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { FEATURE_NAMES } from '../../server/memory/features';
import { LtrRanker } from '../../server/memory/ltr';
import { HashingEmbedder, OverlapReranker } from '../../server/memory/testHelpers';
import { loadDataset, renderMarkdown, runBenchmark } from './run';

const fixturePath = path.join(import.meta.dirname, 'data', 'fixture.json');

describe('the ltr benchmark system', async () => {
  const ltr = new LtrRanker(new OverlapReranker(), {
    means: FEATURE_NAMES.map(() => 0), stds: FEATURE_NAMES.map(() => 1), weights: FEATURE_NAMES.map((_, i) => i / 10), bias: -0.5,
  });
  const results = await runBenchmark({
    dataset: loadDataset(fixturePath, 'fixture'), datasetPath: fixturePath, split: 'fixture', embedder: new HashingEmbedder(),
    k: 5, window: 6, candidatePool: 30, rerankers: { minilm: new OverlapReranker(), 'bge-base': new OverlapReranker() },
    productionReranker: 'minilm', ltr, systems: ['dense+rerank', 'ltr'],
  });
  const md = renderMarkdown(results);

  test('runs on every probe', () => {
    const rows = results.rows.filter(r => r.system === 'ltr');
    expect(rows.length).toBe(results.rows.filter(r => r.system === 'dense+rerank').length);
    expect(rows.length).toBeGreaterThan(0);
  });

  test('records the learned weights by feature name, and the ranker id in the provenance', () => {
    expect(results.meta.ltr).toEqual({ id: ltr.id, bias: -0.5, weights: Object.fromEntries(FEATURE_NAMES.map((n, i) => [n, i / 10])) });
    expect(results.meta.provenance.rerankerIds.ltr).toBe(ltr.id);
  });

  test('the report lists the standardized weights and warns that dev is in-sample', () => {
    const section = md.slice(md.indexOf('## LTR weights'));
    expect(section).toContain('| sameChannel | +0.600 |');
    expect(section).toContain('bias: -0.500');
    expect(section).toMatch(/in-sample/);
  });

  test('a run without the ltr system has no weights section', async () => {
    const plain = await runBenchmark({
      dataset: loadDataset(fixturePath, 'fixture'), split: 'fixture', embedder: new HashingEmbedder(), k: 5, window: 6, candidatePool: 30,
      rerankers: { minilm: new OverlapReranker(), 'bge-base': new OverlapReranker() }, productionReranker: 'minilm', ltr, systems: ['dense'],
    });
    expect(plain.meta.ltr).toBeUndefined();
    expect(renderMarkdown(plain)).not.toContain('## LTR weights');
  });
});
