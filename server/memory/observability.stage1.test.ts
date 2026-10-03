import { describe, expect, test } from 'vitest';
import { candidateRows } from './observability';
import type { RetrievalTrace } from './types';

const trace: RetrievalTrace = {
  requestId: 'ab12cd34',
  endpoint: 'chat',
  query: 'lease',
  config: { embedderId: 'emb', stage1: 'hybrid', rerankerId: null, candidatePool: 30, k: 2 },
  indexSize: 2,
  excludedCount: 0,
  cache: { hits: 0, misses: 0 },
  candidates: [
    { unitId: 'u1', sourceId: 's1', channel: 'chat', textPreview: 'lease', stage1Rank: 1, stage1Score: 0.0322581, denseRank: 2, bm25Rank: 1, bm25Score: 1.55742, selected: true },
    { unitId: 'u2', sourceId: 's2', channel: 'chat', textPreview: 'zebra', stage1Rank: 2, stage1Score: 0.0163934, denseRank: 1, selected: true },
  ],
  timingsMs: { chunk: 0, embedPassages: 0, embedQuery: 0, stage1: 0, rerank: 0, total: 0 },
};

describe('candidateRows for a lexical stage 1', () => {
  test('adds dense rank, BM25 rank and BM25 score, blank where the unit was not in that list', () => {
    const [both, denseOnly] = candidateRows(trace);
    expect(both).toMatchObject({ stage1Score: 0.032, denseRank: 2, bm25Rank: 1, bm25Score: 1.557 });
    expect(denseOnly).toMatchObject({ denseRank: 1, bm25Rank: '', bm25Score: '' });
  });

  test('a dense trace has no lexical columns', () => {
    expect(candidateRows({ ...trace, config: { ...trace.config, stage1: 'dense' } })[0]).not.toHaveProperty('bm25Rank');
  });
});
