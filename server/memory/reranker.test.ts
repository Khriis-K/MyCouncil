import { describe, expect, test } from 'vitest';
import { RERANKER_MODELS } from './models';
import { createReranker } from './reranker';
import { OverlapReranker } from './testHelpers';

describe('createReranker', () => {
  test("'none' means no stage 2", () => {
    expect(createReranker('none')).toBeNull();
  });

  test('builds a cross-encoder pinned to the registered revision without loading it', () => {
    for (const name of ['minilm', 'bge-base'] as const) {
      const reranker = createReranker(name)!;
      expect(reranker.id).toContain(RERANKER_MODELS[name].id);
      expect(reranker.id).toContain(RERANKER_MODELS[name].revision);
    }
  });
});

describe('OverlapReranker', () => {
  test('scores each passage by the number of distinct query tokens it shares', async () => {
    const scores = await new OverlapReranker().score('my lease ends in March', ['The lease ends soon', 'pizza night', 'March: my LEASE']);
    expect(scores).toEqual([2, 0, 3]);
  });
});
