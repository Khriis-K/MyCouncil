import { describe, expect, test } from 'vitest';
import { OverlapReranker, HashingEmbedder } from '../../server/memory/testHelpers';
import { productionRerankerOf } from './systems';

const base = {
  embedder: new HashingEmbedder(), k: 5, window: 6, candidatePool: 30,
  rerankers: { minilm: new OverlapReranker(), 'bge-base': new OverlapReranker() },
};

describe('productionRerankerOf', () => {
  test("'llm-select' runs the hybrid selector, the same one dense-top2+llm-select benchmarks", () => {
    const hybridSelector = new OverlapReranker();
    expect(productionRerankerOf({ ...base, productionReranker: 'llm-select', hybridSelector })).toBe(hybridSelector);
  });

  test("'llm-select' without a configured selector is an error, not a silent dense run", () => {
    expect(() => productionRerankerOf({ ...base, productionReranker: 'llm-select' })).toThrow(/OPENROUTER_API_KEY|selector/);
  });

  test("'none' and cross-encoder names behave as before", () => {
    expect(productionRerankerOf({ ...base, productionReranker: 'none' })).toBeNull();
    expect(productionRerankerOf({ ...base, productionReranker: 'minilm' })).toBe(base.rerankers.minilm);
  });
});
