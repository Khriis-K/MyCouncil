import { describe, expect, test } from 'vitest';
import { rrf } from './fusion';

const hit = (unitId: string, rank: number, score: number) => ({ unitId, sourceId: `src-${unitId}`, rank, score });

describe('rrf', () => {
  const dense = [hit('a', 1, 0.9), hit('b', 2, 0.8), hit('c', 3, 0.7)];
  const bm25 = [hit('b', 1, 7), hit('d', 2, 5)];

  test('sums 1 / (k + rank) over the lists that contain the unit', () => {
    const fused = rrf([dense, bm25]);
    // b: 1/62 + 1/61, a: 1/61, d: 1/62, c: 1/63
    expect(fused.map(f => f.unitId)).toEqual(['b', 'a', 'd', 'c']);
    expect(fused[0].score).toBeCloseTo(1 / 62 + 1 / 61, 12);
    expect(fused[1].score).toBeCloseTo(1 / 61, 12);
    expect(fused[2].score).toBeCloseTo(1 / 62, 12);
    expect(fused[3].score).toBeCloseTo(1 / 63, 12);
    expect(fused.map(f => f.rank)).toEqual([1, 2, 3, 4]);
    expect(fused[0].sourceId).toBe('src-b');
  });

  test("keeps each list's original rank and score, undefined where absent", () => {
    const byId = Object.fromEntries(rrf([dense, bm25]).map(f => [f.unitId, f.inputs]));
    expect(byId.b).toEqual([{ rank: 2, score: 0.8 }, { rank: 1, score: 7 }]);
    expect(byId.a).toEqual([{ rank: 1, score: 0.9 }, undefined]);
    expect(byId.d).toEqual([undefined, { rank: 2, score: 5 }]);
  });

  test('custom kRrf', () => {
    expect(rrf([dense], 0)[0].score).toBe(1);
  });

  test('equal fused scores keep the order of first appearance', () => {
    const fused = rrf([[hit('x', 1, 1)], [hit('y', 1, 1)]]);
    expect(fused.map(f => f.unitId)).toEqual(['x', 'y']);
  });

  test('no lists, or empty lists, fuse to nothing', () => {
    expect(rrf([])).toEqual([]);
    expect(rrf([[], []])).toEqual([]);
  });
});
