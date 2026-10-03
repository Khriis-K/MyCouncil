import { describe, expect, test } from 'vitest';
import type { Embedder } from './embedder';
import { retrieveMemories } from './pipeline';
import { OverlapReranker } from './testHelpers';
import type { MemorySource } from './types';

const user = (id: string, text: string, timestamp: number): MemorySource => ({
  id, channel: 'chat', speaker: 'user', counselorId: 'Architect', text, timestamp,
});

// Dense score is fixed per source, so the dense order is known regardless of wording.
const denseScore: Record<string, number> = {
  'zebra notes about something entirely unrelated to anything here today': 0.9,
  'my lease renewal deadline is coming up very soon now': 0.5,
  'pizza friday night with friends again this week for sure': 0.3,
  'lease lease lease renewal is the only thing on my mind': 0.1,
};
const sources = Object.keys(denseScore).map((text, i) => user(`s${i + 1}`, text, i + 1));

class FixedEmbedder implements Embedder {
  readonly id = 'fixed';
  passageCalls = 0;
  async embedQueries(texts: string[]) { return texts.map(() => new Float32Array([1])); }
  async embedPassages(texts: string[]) {
    this.passageCalls++;
    return texts.map(t => new Float32Array([denseScore[t]]));
  }
}

// dense top 3: s1 (0.9), s2 (0.5), s3 (0.3)        [s4 is dense rank 4, outside the pool]
// bm25:        s4 (lease x3 + renewal), s2 (lease + renewal); s1 and s3 share no query term
const base = { query: 'lease renewal', sources, excludeSourceIds: [] as string[], k: 3, candidatePool: 3, endpoint: 'chat' as const };

const ranksOf = (candidates: { sourceId: string; stage1Rank: number; denseRank?: number; bm25Rank?: number }[]) =>
  candidates.map(c => [c.sourceId, c.stage1Rank, c.denseRank, c.bm25Rank]);

describe("retrieveMemories with stage1: 'hybrid'", () => {
  test('fuses dense and BM25 candidates with RRF and truncates to the pool size', async () => {
    const { trace } = await retrieveMemories({ ...base, stage1: 'hybrid', embedder: new FixedEmbedder() });
    // s2: 1/62 + 1/62; s1: 1/61 (dense only); s4: 1/61 (bm25 only, after s1 on the tie); s3: 1/63 -> cut by the pool of 3
    expect(ranksOf(trace.candidates)).toEqual([
      ['s2', 1, 2, 2],
      ['s1', 2, 1, undefined],
      ['s4', 3, undefined, 1],
    ]);
    expect(trace.candidates[0].stage1Score).toBeCloseTo(2 / 62, 12);
    expect(trace.candidates[1].stage1Score).toBeCloseTo(1 / 61, 12);
    expect(trace.candidates[0].bm25Score).toBeGreaterThan(0);
    expect(trace.candidates[1].bm25Score).toBeUndefined();
    expect(trace.config.stage1).toBe('hybrid');
  });

  test('a larger pool keeps the whole union of both lists', async () => {
    const { trace } = await retrieveMemories({ ...base, candidatePool: 4, k: 4, stage1: 'hybrid', embedder: new FixedEmbedder() });
    expect(new Set(trace.candidates.map(c => c.sourceId))).toEqual(new Set(['s1', 's2', 's3', 's4']));
    expect(trace.candidates.map(c => c.stage1Rank)).toEqual([1, 2, 3, 4]);
  });

  test('stage 2 reranks the fused candidates', async () => {
    const { trace } = await retrieveMemories({ ...base, stage1: 'hybrid', embedder: new FixedEmbedder(), reranker: new OverlapReranker() });
    expect(trace.candidates.map(c => c.finalRank)).toEqual([1, 2, 3]);
    expect(trace.candidates.at(-1)!.sourceId).toBe('s1');
  });
});

describe("retrieveMemories with stage1: 'bm25'", () => {
  test('ranks lexical matches only and never embeds', async () => {
    const embedder = new FixedEmbedder();
    const { used, trace } = await retrieveMemories({ ...base, stage1: 'bm25', embedder });
    expect(ranksOf(trace.candidates)).toEqual([['s4', 1, undefined, 1], ['s2', 2, undefined, 2]]);
    expect(trace.candidates[0].stage1Score).toBe(trace.candidates[0].bm25Score);
    expect(used.map(u => u.sourceId)).toEqual(['s4', 's2']);
    expect(embedder.passageCalls).toBe(0);
    expect(trace.config.stage1).toBe('bm25');
  });
});

describe("retrieveMemories with stage1: 'dense' (default)", () => {
  test('dense order with no lexical fields on the trace', async () => {
    const { trace } = await retrieveMemories({ ...base, embedder: new FixedEmbedder() });
    expect(trace.candidates.map(c => c.sourceId)).toEqual(['s1', 's2', 's3']);
    expect(trace.candidates.every(c => c.denseRank === undefined && c.bm25Rank === undefined && c.bm25Score === undefined)).toBe(true);
    expect(trace.config.stage1).toBe('dense');
  });
});
