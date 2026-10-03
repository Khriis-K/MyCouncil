import { describe, expect, test } from 'vitest';
import type { Embedder } from './embedder';
import { FEATURE_NAMES } from './features';
import type { LogRegModel } from './logreg';
import { LtrRanker } from './ltr';
import { retrieveMemories } from './pipeline';
import type { Reranker } from './reranker';
import { OverlapReranker } from './testHelpers';
import type { MemorySource } from './types';

const user = (id: string, text: string, timestamp: number, counselorId = 'Architect'): MemorySource => ({
  id, channel: 'chat', speaker: 'user', counselorId, text, timestamp,
});

// Dense score is fixed per source, so the dense order is known regardless of wording.
const denseScore: Record<string, number> = {
  'zebra notes about something entirely unrelated to anything here today': 0.9,
  'my lease renewal deadline is coming up very soon now': 0.5,
  'pizza friday night with friends again this week for sure': 0.3,
  'lease lease lease renewal is the only thing on my mind': 0.1,
};
const sources = Object.keys(denseScore).map((text, i) => user(`s${i + 1}`, text, i + 1, i === 3 ? 'Advocate' : 'Architect'));

class FixedEmbedder implements Embedder {
  readonly id = 'fixed';
  async embedQueries(texts: string[]) { return texts.map(() => new Float32Array([1])); }
  async embedPassages(texts: string[]) { return texts.map(t => new Float32Array([denseScore[t]])); }
}

// dense top 2: s1, s2      bm25 top 2: s4, s2      s3 is in neither
const base = {
  query: 'lease renewal', sources, excludeSourceIds: [] as string[], k: 3, candidatePool: 2, endpoint: 'chat' as const,
  embedder: new FixedEmbedder(), origin: { channel: 'chat' as const, counselorId: 'Architect' },
};

// A model that only looks at one feature, unstandardized.
const only = (feature: (typeof FEATURE_NAMES)[number], weight = 1): LogRegModel => ({
  means: FEATURE_NAMES.map(() => 0),
  stds: FEATURE_NAMES.map(() => 1),
  weights: FEATURE_NAMES.map(name => (name === feature ? weight : 0)),
  bias: 0,
});
const featureOf = (c: { ltrFeatures?: number[] }, name: (typeof FEATURE_NAMES)[number]) => c.ltrFeatures![FEATURE_NAMES.indexOf(name)];

describe("retrieveMemories with the 'ltr' ranker", () => {
  test('ranks the union of the dense and BM25 top n, whatever stage1 says', async () => {
    const { trace } = await retrieveMemories({ ...base, stage1: 'dense', reranker: new LtrRanker(new OverlapReranker(), only('ceScore')) });
    expect(trace.config.stage1).toBe('union');
    expect(trace.candidates.map(c => c.sourceId).sort()).toEqual(['s1', 's2', 's4']);
  });

  test('scores each candidate with sigmoid(w·x + b) and orders by it', async () => {
    // Prefer the other counselor: s4 is the only Advocate turn.
    const { trace, used } = await retrieveMemories({ ...base, reranker: new LtrRanker(new OverlapReranker(), only('sameCounselorOrPair', -2)) });
    expect(used[0].sourceId).toBe('s4');
    expect(trace.candidates[0].rerankScore).toBeCloseTo(1 / (1 + Math.exp(0)));
    expect(trace.candidates[1].rerankScore).toBeCloseTo(1 / (1 + Math.exp(2)));
    expect(trace.candidates.map(c => c.finalRank)).toEqual([1, 2, 3]);
  });

  test('puts the feature vector on every candidate, with the real cosine even outside the dense top n', async () => {
    const { trace } = await retrieveMemories({ ...base, reranker: new LtrRanker(new OverlapReranker(), only('ceScore')) });
    const s4 = trace.candidates.find(c => c.sourceId === 's4')!;
    expect(s4.ltrFeatures).toHaveLength(FEATURE_NAMES.length);
    expect(featureOf(s4, 'denseScore')).toBeCloseTo(0.1);
    expect(featureOf(s4, 'denseRecipRank')).toBe(0);
    expect(featureOf(s4, 'bm25Norm')).toBe(1);
    expect(featureOf(s4, 'bm25RecipRank')).toBe(1);
    // OverlapReranker: distinct query words in the passage
    expect(featureOf(s4, 'ceScore')).toBe(2);
    expect(featureOf(s4, 'sameCounselorOrPair')).toBe(0);
    const s1 = trace.candidates.find(c => c.sourceId === 's1')!;
    expect([featureOf(s1, 'denseRecipRank'), featureOf(s1, 'bm25Norm'), featureOf(s1, 'logUserTurnsSince')]).toEqual([1, 0, Math.log1p(3)]);
  });

  test('degrades to stage-1 order when the cross-encoder fails', async () => {
    const failing: Reranker = { id: 'broken', score: async () => { throw new Error('onnx exploded'); } };
    const { trace } = await retrieveMemories({ ...base, reranker: new LtrRanker(failing, only('ceScore')) });
    expect(trace.fallback).toMatch(/onnx exploded/);
    expect(trace.candidates.every(c => c.rerankScore === undefined && c.ltrFeatures === undefined)).toBe(true);
  });

  test('needs the query origin', async () => {
    await expect(retrieveMemories({ ...base, origin: undefined, reranker: new LtrRanker(new OverlapReranker(), only('ceScore')) }))
      .rejects.toThrow(/origin/);
  });
});
