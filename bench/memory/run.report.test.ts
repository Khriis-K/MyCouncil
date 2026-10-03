import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { HashingEmbedder, OverlapReranker } from '../../server/memory/testHelpers';
import { loadDataset, parseArgs, renderMarkdown, runBenchmark } from './run';

const fixturePath = path.join(import.meta.dirname, 'data', 'fixture.json');

describe('test-split guard', () => {
  test('refuses the test split without --final', () => {
    expect(() => parseArgs(['--split', 'test'])).toThrow(/--final/);
    expect(() => parseArgs(['--split', 'test', '--probe', 'p1', '--trace'])).toThrow(/--final/);
  });

  test('runs the test split with --final', () => {
    expect(parseArgs(['--split', 'test', '--final'])).toMatchObject({ split: 'test', final: true });
  });

  test('dev and fixture need no --final', () => {
    expect(parseArgs(['--split', 'dev']).final).toBeUndefined();
  });
});

describe('fixture run report', async () => {
  const dataset = loadDataset(fixturePath, 'fixture');
  const results = await runBenchmark({
    dataset, datasetPath: fixturePath, split: 'fixture', embedder: new HashingEmbedder(), k: 5, window: 6, candidatePool: 30,
    rerankers: { minilm: new OverlapReranker(), 'bge-base': new OverlapReranker() }, productionReranker: 'minilm',
  });
  const md = renderMarkdown(results);

  test('the markdown has all five sections, in order', () => {
    const headings = ['## Headline', '## Slices', '## Paired bootstrap', '## Latency', '## Provenance'];
    const positions = headings.map(h => md.indexOf(h));
    expect(positions.every(p => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (const slice of ['Category: explicit', 'Same-channel vs cross-channel', 'Distance']) expect(md).toContain(slice);
  });

  test('the headline table has the documented columns', () => {
    for (const column of ['recall@1', 'recall@10', 'MRR', 'nDCG@5', 'allGold@5', 'contextRecall', 'context tokens (approx)']) expect(md).toContain(column);
  });

  test('every system has channel and distance slices', () => {
    for (const name of results.systems) {
      expect(Object.keys(results.aggregates[name].slices.channel).sort()).toEqual(['cross', 'same']);
      expect(Object.keys(results.aggregates[name].slices.distance)).toEqual(['0-10', '11-20', '21-30', '31+']);
    }
  });

  test('bootstrap comparisons are in the JSON with their settings', () => {
    expect(results.bootstrap).toMatchObject({ iterations: 2000, seed: 1234 });
    const pair = results.bootstrap.comparisons.find(c => c.a === 'memory-production' && c.b === 'existing-context' && c.metric === 'recall@5')!;
    expect(pair.lo).toBeLessThanOrEqual(pair.meanDiff);
    expect(pair.hi).toBeGreaterThanOrEqual(pair.meanDiff);
    expect(pair.nScenarios).toBe(3);
  });

  test('provenance is recorded', () => {
    const p = results.meta.provenance;
    expect(p.datasetPath).toBe('bench/memory/data/fixture.json');
    expect(p.datasetSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(p.embedderId).toBe('hashing-256');
    expect(Object.keys(p.rerankerIds).sort()).toEqual(['bge-base', 'minilm']);
    expect(p.memoryConfig).toHaveProperty('stage1');
    expect(p.git.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(p.node).toBe(process.version);
    expect(p.cpu).toBe(os.cpus()[0]?.model ?? 'unknown');
    expect(md).toContain(p.datasetSha256);
    expect(md).toContain(p.git.sha);
  });
});
