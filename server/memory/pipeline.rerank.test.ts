import { describe, expect, test } from 'vitest';
import { retrieveMemories, type RetrieveParams } from './pipeline';
import type { Reranker } from './reranker';
import { HashingEmbedder, OverlapReranker } from './testHelpers';
import type { MemorySource } from './types';

const user = (id: string, text: string, timestamp: number, counselorId = 'Architect'): MemorySource => ({
  id, channel: 'chat', speaker: 'user', counselorId, text, timestamp,
});

const sources: MemorySource[] = [
  user('s1', 'my lease ends in March and the landlord wants an answer soon', 1, 'Architect'),
  user('s2', 'pizza on Friday nights with friends is great', 2, 'Advocate'),
  user('s3', 'the lease renewal price went up a lot this year', 3, 'Advocate'),
  user('s4', 'my lease ends in March so timing matters here', 4, 'Architect'),
];

const base: RetrieveParams = {
  query: 'should I renew my lease in March', sources, excludeSourceIds: [], k: 4, candidatePool: 10,
  embedder: new HashingEmbedder(), endpoint: 'chat',
};

// Scores the stage-1 list in reverse, so the reranked order is exactly stage 1 backwards.
const reversing: Reranker = { id: 'reverse', score: async (_q, passages) => passages.map((_, i) => i) };
const failing: Reranker = { id: 'broken', score: async () => { throw new Error('onnx exploded'); } };

describe('retrieveMemories with a reranker', () => {
  test('reorders candidates and memories by rerank score', async () => {
    const plain = await retrieveMemories(base);
    const reranked = await retrieveMemories({ ...base, reranker: reversing });
    const stage1Order = plain.trace.candidates.map(c => c.unitId);
    expect(reranked.trace.candidates.map(c => c.unitId)).toEqual([...stage1Order].reverse());
    expect(reranked.used.map(u => u.id)).toEqual([...plain.used.map(u => u.id)].reverse());
  });

  test('fills rerankScore, finalRank, rankDelta and selected on every candidate', async () => {
    const { trace } = await retrieveMemories({ ...base, k: 2, reranker: reversing });
    const n = trace.candidates.length;
    trace.candidates.forEach((c, i) => {
      expect(c.finalRank).toBe(i + 1);
      expect(c.stage1Rank).toBe(n - i);
      expect(c.rerankScore).toBe(c.stage1Rank - 1);
      expect(c.rankDelta).toBe(c.stage1Rank - c.finalRank!);
      expect(c.selected).toBe(i < 2);
    });
  });

  test('ties keep stage-1 order', async () => {
    const flat: Reranker = { id: 'flat', score: async (_q, passages) => passages.map(() => 0) };
    const plain = await retrieveMemories(base);
    const { trace } = await retrieveMemories({ ...base, reranker: flat });
    expect(trace.candidates.map(c => c.unitId)).toEqual(plain.trace.candidates.map(c => c.unitId));
    expect(trace.candidates.every(c => c.rankDelta === 0)).toBe(true);
  });

  test('dedupes by source after reranking, keeping the chunk the reranker liked best', async () => {
    const long = 'Filler words about nothing particular here. '.repeat(10) + 'My lease ends in March. ' + 'More filler about other stuff entirely. '.repeat(10);
    const { used, trace } = await retrieveMemories({ ...base, k: 5, sources: [user('big', long, 1)], reranker: reversing });
    expect(trace.candidates.length).toBeGreaterThan(1);
    const lastStage1 = trace.candidates.find(c => c.stage1Rank === trace.candidates.length)!;
    expect(used.map(u => u.id)).toEqual([lastStage1.unitId]);
    expect(trace.candidates.filter(c => c.selected).map(c => c.unitId)).toEqual([lastStage1.unitId]);
  });

  test('passes the query and each candidate embedText to the reranker', async () => {
    const calls: { query: string; passages: string[] }[] = [];
    const spy: Reranker = { id: 'spy', score: async (query, passages) => { calls.push({ query, passages }); return passages.map(() => 0); } };
    await retrieveMemories({ ...base, reranker: spy });
    expect(calls).toHaveLength(1);
    expect(calls[0].query).toBe(base.query);
    expect(calls[0].passages).toHaveLength(4);
    expect(calls[0].passages.some(p => p.includes('pizza'))).toBe(true);
  });

  test('works with the overlap fake', async () => {
    const { trace } = await retrieveMemories({ ...base, reranker: new OverlapReranker() });
    expect(trace.config.rerankerId).toBe('overlap');
    expect(trace.candidates.at(-1)!.sourceId).toBe('s2');
  });

  test('a reranker failure falls back to stage-1 order with a reason, keeping the memories', async () => {
    const plain = await retrieveMemories(base);
    const { used, trace } = await retrieveMemories({ ...base, reranker: failing });
    expect(trace.fallback).toBe('rerank_failed: onnx exploded');
    expect(used.map(u => u.id)).toEqual(plain.used.map(u => u.id));
    expect(trace.candidates.map(c => c.unitId)).toEqual(plain.trace.candidates.map(c => c.unitId));
    expect(trace.candidates.every(c => c.rerankScore === undefined && c.finalRank === undefined)).toBe(true);
  });

  test('a reranker returning the wrong number of scores also falls back', async () => {
    const short: Reranker = { id: 'short', score: async () => [1] };
    const { trace } = await retrieveMemories({ ...base, reranker: short });
    expect(trace.fallback).toMatch(/^rerank_failed: /);
  });

  test("no reranker ('none') behaves exactly like stage 1 alone", async () => {
    const a = await retrieveMemories(base);
    const b = await retrieveMemories({ ...base, reranker: null });
    expect(b.used).toEqual(a.used);
    expect(b.trace.candidates).toEqual(a.trace.candidates);
    expect(b.trace.candidates.every(c => c.rerankScore === undefined && c.finalRank === undefined && c.rankDelta === undefined)).toBe(true);
    expect(b.trace.config.rerankerId).toBeNull();
    expect(b.trace.timingsMs.rerank).toBe(0);
    expect(b.trace.fallback).toBeUndefined();
  });

  test('timings are present and non-negative', async () => {
    const { trace } = await retrieveMemories({ ...base, reranker: reversing });
    for (const key of ['chunk', 'embedPassages', 'embedQuery', 'stage1', 'rerank', 'total'] as const) {
      expect(trace.timingsMs[key]).toBeGreaterThanOrEqual(0);
    }
  });

  test('the trace records request, config and exclusion details', async () => {
    const { trace } = await retrieveMemories({ ...base, k: 2, excludeSourceIds: ['s4'], reranker: reversing });
    expect(trace.requestId).toMatch(/^[0-9a-f]{8}$/);
    expect(trace.endpoint).toBe('chat');
    expect(trace.config).toEqual({ embedderId: 'hashing-256', stage1: 'dense', rerankerId: 'reverse', candidatePool: 10, k: 2 });
    expect(trace.indexSize).toBe(3);
    expect(trace.excludedCount).toBe(1);
    expect(trace.candidates.find(c => c.sourceId === 's2')!.counselorId).toBe('Advocate');
  });

  test('an empty index never calls the reranker', async () => {
    const { used, trace } = await retrieveMemories({ ...base, sources: [], reranker: failing });
    expect(used).toEqual([]);
    expect(trace.fallback).toBeUndefined();
  });
});
