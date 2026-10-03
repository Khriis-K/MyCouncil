import path from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Reranker } from '../../server/memory/reranker';
import { HashingEmbedder, OverlapReranker } from '../../server/memory/testHelpers';
import type { RetrievalTrace } from '../../server/memory/types';
import { loadDataset, parseArgs, percentile, renderMarkdown, renderTrace, runBenchmark, traceProbe } from './run';

const fixturePath = path.join(import.meta.dirname, 'data', 'fixture.json');
const dataset = loadDataset(fixturePath, 'fixture');
const rerankers = { minilm: new OverlapReranker(), 'bge-base': new OverlapReranker() };
const options = { dataset, split: 'fixture', k: 5, window: 6, candidatePool: 30, embedder: new HashingEmbedder(), rerankers, productionReranker: 'minilm' as const };

describe('parseArgs --probe/--trace', () => {
  test('reads the probe id and the boolean --trace flag in any order', () => {
    expect(parseArgs(['--probe', 'job-p1', '--trace'])).toMatchObject({ probe: 'job-p1', trace: true });
    expect(parseArgs(['--trace', '--split', 'dev', '--probe', 'x'])).toMatchObject({ probe: 'x', trace: true, split: 'dev' });
  });

  test('they only make sense together', () => {
    expect(() => parseArgs(['--trace'])).toThrow(/--probe/);
    expect(() => parseArgs(['--probe', 'x'])).toThrow(/--trace/);
  });
});

describe('percentile', () => {
  test('nearest-rank on unsorted input', () => {
    const values = [5, 1, 4, 2, 3, 6, 7, 8, 9, 10];
    expect(percentile(values, 50)).toBe(5);
    expect(percentile(values, 95)).toBe(10);
    expect(percentile([7], 95)).toBe(7);
  });

  test('undefined when there is nothing to summarize', () => {
    expect(percentile([], 50)).toBeUndefined();
  });
});

describe('latency in the report', async () => {
  const results = await runBenchmark(options);

  test('records the machine and every rerank system', () => {
    expect(results.meta.machine).toEqual(expect.any(String));
    expect(results.meta.rerankerId).toBe('overlap');
    expect(results.systems).toEqual(expect.arrayContaining(['dense+rerank', 'dense+rerank-bge']));
  });

  test('has per-stage p50/p95 for retrieval systems, and states the CPU and warm-up policy', () => {
    const md = renderMarkdown(results);
    expect(md).toMatch(/## Latency/);
    expect(md).toContain(results.meta.machine);
    expect(md).toMatch(/warm-up/i);
    const latency = md.slice(md.indexOf('## Latency')).split('\n');
    const row = latency.find(l => l.startsWith('| dense+rerank |'))!;
    expect(row).toMatch(/\d+(\.\d+)? \/ \d+(\.\d+)?/);
    expect(latency.some(l => l.startsWith('| recency |'))).toBe(false);
  });
});

const trace = (over: Partial<RetrievalTrace> = {}): RetrievalTrace => ({
  requestId: 'r', endpoint: 'bench', query: 'should I move?',
  config: { embedderId: 'e', stage1: 'dense', rerankerId: 'rr', candidatePool: 30, k: 1 },
  indexSize: 2, excludedCount: 0, cache: { hits: 0, misses: 0 },
  candidates: [
    { unitId: 'b', sourceId: 'gold-1', channel: 'chat', textPreview: 'my daughter has asthma', stage1Rank: 2, stage1Score: 0.4, rerankScore: 2, finalRank: 1, rankDelta: 1, selected: true },
    { unitId: 'a', sourceId: 'noise', channel: 'chat', textPreview: 'lease ends in March', stage1Rank: 1, stage1Score: 0.5, rerankScore: 1, finalRank: 2, rankDelta: -1, selected: false },
  ],
  timingsMs: { chunk: 0, embedPassages: 0, embedQuery: 0, stage1: 0, rerank: 0, total: 0 },
  ...over,
});

describe('renderTrace', () => {
  test('marks gold candidates with a star and shows ranks, scores and previews', () => {
    const lines = renderTrace(trace(), { gold: ['gold-1'], context: new Set(['gold-1']) }).split('\n');
    const goldLine = lines.find(l => l.includes('asthma'))!;
    const noiseLine = lines.find(l => l.includes('lease ends'))!;
    expect(goldLine).toContain('★');
    expect(noiseLine).not.toContain('★');
    expect(lines.indexOf(goldLine)).toBeLessThan(lines.indexOf(noiseLine));
    expect(goldLine).toMatch(/\+1/);
    expect(lines.join('\n')).toContain('should I move?');
  });

  test('says which gold never made the candidate pool, and whether the window covered it', () => {
    const text = renderTrace(trace(), { gold: ['gold-1', 'in-window', 'lost'], context: new Set(['gold-1', 'in-window']) });
    expect(text).toMatch(/in-window \(in window\)/);
    expect(text).toMatch(/lost \(missed\)/);
  });

  test('shows a fallback', () => {
    expect(renderTrace(trace({ fallback: 'rerank_failed: x' }), { gold: [], context: new Set() })).toContain('rerank_failed: x');
  });
});

describe('traceProbe', () => {
  test('prints one section per selected system for the requested probe', async () => {
    const text = await traceProbe({ ...options, probeId: 'job-p1', systems: ['dense', 'dense+rerank', 'recency'] });
    expect(text).toMatch(/dense \(/);
    expect(text).toMatch(/dense\+rerank \(/);
    expect(text).toMatch(/recency: no retrieval trace/);
    expect(text).toContain('★');
  });

  test('an unknown probe id is an error', async () => {
    await expect(traceProbe({ ...options, probeId: 'nope' })).rejects.toThrow(/nope/);
  });

  test('uses the reranker it was given', async () => {
    const reversing: Reranker = { id: 'reverse', score: async (_q, p) => p.map((_, i) => i) };
    const text = await traceProbe({ ...options, rerankers: { minilm: reversing, 'bge-base': reversing }, probeId: 'job-p1', systems: ['dense+rerank'] });
    expect(text).toContain('reverse');
  });
});
