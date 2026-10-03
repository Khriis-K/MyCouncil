import { describe, expect, test } from 'vitest';
import { bm25Search, tokenize } from './bm25';
import type { MemoryUnit } from './types';

const unit = (id: string, embedText: string, timestamp = 1): MemoryUnit => ({
  id, sourceId: `src-${id}`, channel: 'chat', text: embedText, embedText, timestamp,
});

describe('tokenize', () => {
  test('lowercases, splits on non-alphanumerics and drops stopwords', () => {
    expect(tokenize('The LEASE ends; in March, and I am worried!')).toEqual(['lease', 'end', 'march', 'worried']);
  });

  test('strips a trailing plural s only on tokens longer than 3 chars', () => {
    expect(tokenize('leases pizzas bus gas cats')).toEqual(['lease', 'pizza', 'bus', 'gas', 'cat']);
  });

  test('keeps repeated tokens (term frequency matters)', () => {
    expect(tokenize('lease lease')).toEqual(['lease', 'lease']);
  });

  test('contractions match the stopword list', () => {
    expect(tokenize("I don't know")).toEqual(['know']);
  });
});

describe('bm25Search', () => {
  // Corpus, after tokenizing:
  //   d1 "lease lease march"  -> [lease, lease, march]   |d| = 3
  //   d2 "leases pizza"       -> [lease, pizza]          |d| = 2
  //   d3 "pizza friday night" -> [pizza, friday, night]  |d| = 3
  // N = 3, avgdl = 8/3, k1 = 1.2, b = 0.75. Query "lease march".
  //
  // idf(lease) = ln(1 + (3 - 2 + 0.5) / (2 + 0.5)) = ln(1.6)    = 0.470004
  // idf(march) = ln(1 + (3 - 1 + 0.5) / (1 + 0.5)) = ln(2.6667) = 0.980829
  //
  // d1: norm = 1 - b + b * 3 / (8/3) = 0.25 + 0.84375 = 1.09375, k1 * norm = 1.3125
  //     lease: 0.470004 * 2 * 2.2 / (2 + 1.3125) = 0.470004 * 1.328302 = 0.624308
  //     march: 0.980829 * 1 * 2.2 / (1 + 1.3125) = 0.980829 * 0.951351 = 0.933113
  //     score = 1.557420
  // d2: norm = 0.25 + 0.75 * 2 / (8/3) = 0.8125, k1 * norm = 0.975
  //     lease: 0.470004 * 2.2 / (1 + 0.975) = 0.470004 * 1.113924 = 0.523548
  //     score = 0.523548
  // d3: no query term -> 0, so it is not a lexical match and is left out.
  const corpus = [unit('d1', 'lease lease march'), unit('d2', 'leases pizza'), unit('d3', 'pizza friday night')];

  test('scores match the hand-computed Okapi BM25 values', () => {
    const hits = bm25Search('lease march', corpus, 10);
    expect(hits.map(h => h.unitId)).toEqual(['d1', 'd2']);
    expect(hits[0].score).toBeCloseTo(1.55742, 5);
    expect(hits[1].score).toBeCloseTo(0.523548, 5);
    expect(hits.map(h => h.rank)).toEqual([1, 2]);
    expect(hits[0].sourceId).toBe('src-d1');
  });

  test('repeating a query term does not change the score', () => {
    expect(bm25Search('lease lease march', corpus, 10).map(h => h.score)).toEqual(bm25Search('lease march', corpus, 10).map(h => h.score));
  });

  test('truncates to n', () => {
    expect(bm25Search('lease march', corpus, 1).map(h => h.unitId)).toEqual(['d1']);
  });

  test('ties break like denseSearch: newer first, then id', () => {
    const tied = [unit('b', 'lease', 1), unit('a', 'lease', 1), unit('c', 'lease', 2)];
    expect(bm25Search('lease', tied, 10).map(h => h.unitId)).toEqual(['c', 'a', 'b']);
  });

  test('empty corpus or stopword-only query returns nothing', () => {
    expect(bm25Search('lease', [], 10)).toEqual([]);
    expect(bm25Search('the and of', corpus, 10)).toEqual([]);
  });
});
