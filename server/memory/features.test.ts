import { describe, expect, test } from 'vitest';
import { contextSignals, FEATURE_NAMES, featureVector, type CandidateSignals } from './features';
import type { MemoryUnit } from './types';

const signals: CandidateSignals = {
  denseScore: 0.8, denseRank: 4, bm25Score: 3, bm25Rank: 2, maxBm25: 6, ceScore: -1.5,
  sameChannel: true, sameCounselorOrPair: false, isShortReply: true,
};

describe('featureVector', () => {
  test('a hand-built candidate gives the expected vector, in FEATURE_NAMES order', () => {
    expect(FEATURE_NAMES).toEqual([
      'denseScore', 'denseRecipRank', 'bm25Norm', 'bm25RecipRank', 'ceScore',
      'sameChannel', 'sameCounselorOrPair', 'isShortReply',
    ]);
    expect(featureVector(signals)).toEqual([0.8, 0.25, 0.5, 0.5, -1.5, 1, 0, 1]);
  });

  test('ranks outside the top n give 0, and no BM25 match gives 0 instead of dividing by zero', () => {
    const v = featureVector({ ...signals, denseRank: undefined, bm25Rank: undefined, bm25Score: 0, maxBm25: 0 });
    expect(v.slice(1, 4)).toEqual([0, 0, 0]);
  });
});

const unit = (overrides: Partial<MemoryUnit>): MemoryUnit => ({
  id: 'u', sourceId: 'u', channel: 'chat', counselorId: 'Seeker', text: 'yes', embedText: 'yes', timestamp: 2, ...overrides,
});

describe('contextSignals', () => {
  test('flags counselor context and same thread', () => {
    const s = contextSignals(unit({ embedText: 'Counselor asked: "?"\nUser: "yes"' }), { channel: 'chat', counselorId: 'Seeker' });
    expect(s).toEqual({ sameChannel: true, sameCounselorOrPair: true, isShortReply: true });
  });

  test('another counselor in the same channel is same-channel but not the same counselor', () => {
    const s = contextSignals(unit({}), { channel: 'chat', counselorId: 'Analyst' });
    expect([s.sameChannel, s.sameCounselorOrPair, s.isShortReply]).toEqual([true, false, false]);
  });

  test('a debate pair matches in either order', () => {
    const debate = unit({ channel: 'debate', counselorId: undefined, debatePairId: 'Seeker-Analyst' });
    expect(contextSignals(debate, { channel: 'debate', debatePairId: 'Analyst-Seeker' }).sameCounselorOrPair).toBe(true);
    expect(contextSignals(debate, { channel: 'debate', debatePairId: 'Analyst-Guardian' }).sameCounselorOrPair).toBe(false);
  });

  test('a chat unit seen from refinement is neither same channel nor same counselor', () => {
    const s = contextSignals(unit({}), { channel: 'refinement' });
    expect([s.sameChannel, s.sameCounselorOrPair]).toEqual([false, false]);
  });
});
