import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { HashingEmbedder, OverlapReranker } from '../../server/memory/testHelpers';
import { datasetSchema } from './schema';
import { defaultDataPath, loadDataset, parseArgs, renderMarkdown, runBenchmark, writeResults } from './run';

const fixturePath = path.join(import.meta.dirname, 'data', 'fixture.json');
const options = {
  split: 'fixture', k: 5, window: 6, candidatePool: 30,
  rerankers: { minilm: new OverlapReranker(), 'bge-base': new OverlapReranker() }, productionReranker: 'minilm' as const,
};

describe('parseArgs', () => {
  test('defaults to the fixture split and all systems', () => {
    const args = parseArgs([]);
    expect(args.split).toBe('fixture');
    expect(args.systems).toBeUndefined();
  });

  test('reads flags', () => {
    const args = parseArgs(['--split', 'dev', '--systems', 'dense,recency', '--k', '3', '--window', '4', '--data', 'x.json']);
    expect(args).toMatchObject({ split: 'dev', systems: ['dense', 'recency'], k: 3, window: 4, data: 'x.json' });
  });

  test('rejects an unknown flag and a non-numeric --k', () => {
    expect(() => parseArgs(['--nope', '1'])).toThrow(/unknown/i);
    expect(() => parseArgs(['--k', 'abc'])).toThrow(/--k/);
  });
});

describe('defaultDataPath', () => {
  test('uses the fixture for the fixture split and the frozen v1 dataset for dev and test', () => {
    expect(path.basename(defaultDataPath('fixture'))).toBe('fixture.json');
    expect(path.basename(defaultDataPath('dev'))).toBe('scenarios.v1.json');
    expect(path.basename(defaultDataPath('test'))).toBe('scenarios.v1.json');
  });
});

describe('loadDataset', () => {
  test('keeps only scenarios of the requested split', () => {
    expect(loadDataset(fixturePath, 'fixture').scenarios).toHaveLength(3);
    expect(() => loadDataset(fixturePath, 'dev')).toThrow(/no scenarios/i);
  });
});

describe('runBenchmark on the fixture', async () => {
  const dataset = loadDataset(fixturePath, 'fixture');
  const results = await runBenchmark({ ...options, dataset, embedder: new HashingEmbedder() });
  const probeCount = dataset.scenarios.reduce((n, s) => n + s.probes.length, 0);
  const row = (system: string, probeId: string) => results.rows.find(r => r.system === system && r.probeId === probeId)!;

  test('has one row per probe per system with the documented structure', () => {
    expect(results.meta).toMatchObject({ split: 'fixture', k: 5, window: 6, candidatePool: 30, embedderId: 'hashing-256' });
    expect(results.systems).toEqual(['existing-context', 'recency', 'dense', 'bm25', 'hybrid', 'dense+rerank', 'hybrid+rerank', 'dense+rerank-bge', 'memory-production']);
    expect(results.rows).toHaveLength(probeCount * results.systems.length);
    for (const r of results.rows) {
      expect(r.goldRanks.length).toBeGreaterThan(0);
      for (const g of r.goldRanks) expect(typeof g.inContext).toBe('boolean');
      expect(r.metrics).toHaveProperty('recall@1');
      expect(r.metrics).toHaveProperty('ndcg@10');
      expect(r.metrics).toHaveProperty('allGold@5');
      expect(r.metrics).toHaveProperty('mrr');
      expect(r.metrics).toHaveProperty('contextRecall');
      expect(r.metrics).toHaveProperty('contextTokensApprox');
    }
  });

  test('has overall and per-category aggregates for every system', () => {
    for (const name of results.systems) {
      expect(results.aggregates[name].overall.n).toBe(probeCount);
      expect(Object.keys(results.aggregates[name].byCategory).sort()).toEqual(['explicit', 'implicit', 'multi', 'update']);
    }
  });

  test('deterministic membership: existing-context misses cross-channel gold and has same-channel gold', () => {
    const cross = row('existing-context', 'job-p1').goldRanks.find(g => g.sourceId === 'job-c1')!;
    expect(cross).toMatchObject({ rank: null, inContext: false });
    const same = row('existing-context', 'bake-p3').goldRanks.find(g => g.sourceId === 'bake-c1')!;
    expect(same.inContext).toBe(true);
    expect(same.rank).toBeGreaterThanOrEqual(1);
  });

  test('deterministic membership: refinement probe sees only the previous refinement under existing-context', () => {
    const r = row('existing-context', 'grad-p3');
    expect(r.goldRanks.find(g => g.sourceId === 'grad-r2')!.inContext).toBe(true);
    expect(r.goldRanks.find(g => g.sourceId === 'grad-c3')!.inContext).toBe(false);
  });

  test('deterministic membership: memory-production reaches cross-channel gold', () => {
    expect(row('memory-production', 'job-p1').goldRanks.find(g => g.sourceId === 'job-c1')!.inContext).toBe(true);
  });

  test('--systems filters the run', async () => {
    const only = await runBenchmark({ ...options, dataset, embedder: new HashingEmbedder(), systems: ['recency'] });
    expect(only.systems).toEqual(['recency']);
    expect(only.rows.every(r => r.system === 'recency')).toBe(true);
  });

  test('an unknown system name is an error', async () => {
    await expect(runBenchmark({ ...options, dataset, embedder: new HashingEmbedder(), systems: ['nope'] })).rejects.toThrow(/nope/);
  });

  test('writes JSON, a Markdown summary and latest-<split>.md', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'bench-'));
    const written = writeResults(results, dir);
    const files = readdirSync(dir);
    expect(files.some(f => /^fixture-.*\.json$/.test(f))).toBe(true);
    expect(files.some(f => /^fixture-.*\.md$/.test(f))).toBe(true);
    expect(files).toContain('latest-fixture.md');
    expect(existsSync(written.jsonPath)).toBe(true);
    expect(JSON.parse(readFileSync(written.jsonPath, 'utf8')).rows).toHaveLength(results.rows.length);
    expect(readFileSync(path.join(dir, 'latest-fixture.md'), 'utf8')).toBe(readFileSync(written.mdPath, 'utf8'));
  });

  test('markdown labels token counts approximate and flags the fixture as a harness check', () => {
    const md = renderMarkdown(results);
    expect(md).toMatch(/approx/i);
    expect(md).toMatch(/harness/i);
    expect(md).toMatch(/upper bound/i);
    for (const name of results.systems) expect(md).toContain(name);
  });
});

test('the fixture file satisfies the dataset schema', () => {
  expect(() => datasetSchema.parse(JSON.parse(readFileSync(fixturePath, 'utf8')))).not.toThrow();
});
