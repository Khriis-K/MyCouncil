import { describe, expect, test } from 'vitest';
import { denseSearch } from './denseRetriever';
import type { MemoryUnit } from './types';

const unit = (id: string, timestamp: number): MemoryUnit => ({
  id, sourceId: id, channel: 'chat', text: id, embedText: id, timestamp,
});

describe('denseSearch', () => {
  const q = new Float32Array([1, 0]);

  test('sorts by dot product descending with 1-based ranks', () => {
    const units = [unit('low', 1), unit('high', 2), unit('mid', 3)];
    const vecs = [new Float32Array([0, 1]), new Float32Array([1, 0]), new Float32Array([0.6, 0.8])];
    const hits = denseSearch(q, vecs, units, 10);
    expect(hits.map(h => h.unitId)).toEqual(['high', 'mid', 'low']);
    expect(hits.map(h => h.rank)).toEqual([1, 2, 3]);
    expect(hits[0].score).toBeCloseTo(1);
    expect(hits[0].sourceId).toBe('high');
  });

  test('ties break by newer timestamp, then by id', () => {
    const units = [unit('a', 1), unit('c', 5), unit('b', 5)];
    const v = new Float32Array([1, 0]);
    const hits = denseSearch(q, [v, v, v], units, 10);
    expect(hits.map(h => h.unitId)).toEqual(['b', 'c', 'a']);
  });

  test('truncates to n', () => {
    const units = [unit('a', 1), unit('b', 2), unit('c', 3)];
    const v = new Float32Array([1, 0]);
    expect(denseSearch(q, [v, v, v], units, 2)).toHaveLength(2);
  });
});
