import { describe, expect, test } from 'vitest';
import { retrieveMemories } from './pipeline';
import { HashingEmbedder } from './testHelpers';
import { CachedEmbedder } from './embedder';
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

const base = { query: 'should I renew my lease in March', excludeSourceIds: [] as string[], k: 3, candidatePool: 10, endpoint: 'chat' as const };

describe('retrieveMemories', () => {
  test('ranks relevant units above unrelated ones', async () => {
    const { used } = await retrieveMemories({ ...base, k: 4, sources, embedder: new HashingEmbedder() });
    expect(used.map(u => u.sourceId).at(-1)).toBe('s2');
  });

  test('excludes window sources from the index and results', async () => {
    const { used, trace } = await retrieveMemories({ ...base, excludeSourceIds: ['s1', 's4'], sources, embedder: new HashingEmbedder() });
    expect(used.map(u => u.sourceId)).not.toContain('s1');
    expect(used.map(u => u.sourceId)).not.toContain('s4');
    expect(trace.indexSize).toBe(2);
  });

  test('dedupes by sourceId keeping the best chunk', async () => {
    const long = 'Filler words about nothing particular here. '.repeat(10) + 'My lease ends in March. ' + 'More filler about other stuff entirely. '.repeat(10);
    const { used, trace } = await retrieveMemories({
      ...base, k: 5, sources: [user('big', long, 1)], embedder: new HashingEmbedder(),
    });
    expect(trace.candidates.length).toBeGreaterThan(1);
    expect(used).toHaveLength(1);
    expect(used[0].id).toBe(trace.candidates[0].unitId);
    expect(trace.candidates.filter(c => c.selected)).toHaveLength(1);
  });

  test('respects k', async () => {
    const { used, trace } = await retrieveMemories({ ...base, k: 2, sources, embedder: new HashingEmbedder() });
    expect(used).toHaveLength(2);
    expect(trace.candidates.filter(c => c.selected)).toHaveLength(2);
  });

  test('respects candidatePool', async () => {
    const { trace } = await retrieveMemories({ ...base, candidatePool: 2, k: 5, sources, embedder: new HashingEmbedder() });
    expect(trace.candidates).toHaveLength(2);
    expect(trace.candidates.map(c => c.stage1Rank)).toEqual([1, 2]);
  });

  test('records query, timings and cache stats', async () => {
    const embedder = new CachedEmbedder(new HashingEmbedder());
    const first = await retrieveMemories({ ...base, sources, embedder });
    expect(first.trace.query).toBe(base.query);
    expect(first.trace.indexSize).toBe(4);
    expect(first.trace.cache).toEqual({ hits: 0, misses: 5 });
    for (const key of ['chunk', 'embedPassages', 'embedQuery', 'stage1', 'total'] as const) {
      expect(first.trace.timingsMs[key]).toBeGreaterThanOrEqual(0);
    }
    const second = await retrieveMemories({ ...base, sources, embedder });
    expect(second.trace.cache).toEqual({ hits: 5, misses: 0 });
  });

  test('empty index returns no memories', async () => {
    const { used, trace } = await retrieveMemories({ ...base, sources: [], embedder: new HashingEmbedder() });
    expect(used).toEqual([]);
    expect(trace.indexSize).toBe(0);
  });
});
