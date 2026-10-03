import { describe, expect, test } from 'vitest';
import { allGoldAtK, contextRecall, contextTokens, mrr, ndcgAtK, recallAtK, type Gold } from './metrics';

const req = (sourceId: string): Gold => ({ sourceId, grade: 2 });
const part = (sourceId: string): Gold => ({ sourceId, grade: 1 });

describe('recallAtK', () => {
  test('perfect ranking', () => expect(recallAtK(['g', 'x', 'y'], [req('g')], 1)).toBe(1));
  test('gold at rank 3 is missed by K=2 and found by K=3', () => {
    const ranked = ['x', 'y', 'g'];
    expect(recallAtK(ranked, [req('g')], 2)).toBe(0);
    expect(recallAtK(ranked, [req('g')], 3)).toBe(1);
  });
  test('gold absent', () => expect(recallAtK(['x', 'y'], [req('g')], 10)).toBe(0));
  test('two required gold, one in the top K', () => expect(recallAtK(['a', 'x', 'b'], [req('a'), req('b')], 2)).toBe(0.5));
  test('partial gold is not counted as required', () => expect(recallAtK(['p'], [req('g'), part('p')], 1)).toBe(0));
});

describe('mrr', () => {
  test('rank 1', () => expect(mrr(['g'], [req('g')])).toBe(1));
  test('first required gold at rank 3', () => expect(mrr(['x', 'y', 'g'], [req('g')])).toBeCloseTo(1 / 3));
  test('uses the first of several required gold', () => expect(mrr(['x', 'b', 'a'], [req('a'), req('b')])).toBe(0.5));
  test('ignores partial gold', () => expect(mrr(['p', 'g'], [req('g'), part('p')])).toBe(0.5));
  test('absent', () => expect(mrr(['x'], [req('g')])).toBe(0));
});

describe('allGoldAtK', () => {
  test('1 only when every required gold is in the top K', () => {
    const gold = [req('a'), req('b')];
    expect(allGoldAtK(['a', 'b'], gold, 2)).toBe(1);
    expect(allGoldAtK(['a', 'x', 'b'], gold, 2)).toBe(0);
    expect(allGoldAtK(['a', 'x', 'b'], gold, 3)).toBe(1);
  });
});

describe('ndcgAtK', () => {
  test('perfect ordering is 1', () => expect(ndcgAtK(['a', 'p'], [req('a'), part('p')], 5)).toBeCloseTo(1));

  // gold: a (grade 2, gain 3), p (grade 1, gain 1). ranked: p, x, a.
  // DCG@3  = 1/log2(2) + 0 + 3/log2(4) = 1 + 1.5 = 2.5
  // IDCG@3 = 3/log2(2) + 1/log2(3)     = 3 + 0.6309297 = 3.6309297
  // nDCG   = 2.5 / 3.6309297 = 0.6885
  test('graded case', () => expect(ndcgAtK(['p', 'x', 'a'], [req('a'), part('p')], 3)).toBeCloseTo(0.6885, 4));

  test('gold beyond K contributes nothing', () => expect(ndcgAtK(['x', 'y', 'a'], [req('a')], 2)).toBe(0));
  test('single gold at rank 3 scores 1/log2(4) = 0.5', () => expect(ndcgAtK(['x', 'y', 'a'], [req('a')], 5)).toBeCloseTo(0.5));
});

describe('context metrics', () => {
  test('contextRecall is the fraction of required gold in the context', () => {
    expect(contextRecall(new Set(['a', 'x']), [req('a'), req('b'), part('p')])).toBe(0.5);
  });
  test('contextTokens is chars / 4', () => expect(contextTokens(400)).toBe(100));
});

describe('null cases', () => {
  const gold = [req('a'), part('p')];
  test('an empty ranking scores 0 on everything', () => {
    for (const k of [1, 3, 5, 10]) {
      expect(recallAtK([], gold, k)).toBe(0);
      expect(ndcgAtK([], gold, k)).toBe(0);
      expect(allGoldAtK([], gold, k)).toBe(0);
    }
    expect(mrr([], gold)).toBe(0);
    expect(contextRecall(new Set(), gold)).toBe(0);
  });
  test('a constant ranking that ignores the query does not score perfectly', () => {
    const constant = ['x', 'y', 'z', 'w'];
    expect(recallAtK(constant, gold, 10)).toBe(0);
    expect(ndcgAtK(constant, gold, 10)).toBe(0);
    expect(mrr(constant, gold)).toBe(0);
  });
  test('a ranking with gold buried deep scores below one with gold first', () => {
    expect(ndcgAtK(['x', 'y', 'a'], gold, 10)).toBeLessThan(ndcgAtK(['a', 'x', 'y'], gold, 10));
  });
});
