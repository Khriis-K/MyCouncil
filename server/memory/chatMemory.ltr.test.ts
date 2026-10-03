import { describe, expect, test } from 'vitest';
import { recallForChat, recallForDebate, recallForRefinement } from './chatMemory';
import { FEATURE_NAMES } from './features';
import { LtrRanker } from './ltr';
import { HashingEmbedder, OverlapReranker } from './testHelpers';
import type { MemorySource, TraceCandidate } from './types';

const sources: MemorySource[] = [
  { id: 'c1', channel: 'chat', speaker: 'user', counselorId: 'Architect', text: 'my lease ends in March', timestamp: 1 },
  { id: 'd1', channel: 'debate', speaker: 'user', debatePairId: 'Architect-Advocate', text: 'the lease is my main worry', timestamp: 2 },
  { id: 'r1', channel: 'refinement', speaker: 'user', text: 'also my lease is up soon', timestamp: 3 },
  // the chat window: excluded from chat recall
  { id: 'c2', channel: 'chat', speaker: 'user', counselorId: 'Architect', text: 'lease again', timestamp: 4 },
];
const settings = { enabled: true, k: 5, candidatePool: 30, recentWindow: 1 };
const ltr = new LtrRanker(new OverlapReranker(), {
  means: FEATURE_NAMES.map(() => 0), stds: FEATURE_NAMES.map(() => 1), weights: FEATURE_NAMES.map(() => 0), bias: 0,
});
const common = { sources, settings, embedder: new HashingEmbedder(), reranker: ltr };

// [sameChannel, sameCounselorOrPair] per source
const thread = (candidates: TraceCandidate[]) => Object.fromEntries(candidates.map(c => [
  c.sourceId, [c.ltrFeatures![FEATURE_NAMES.indexOf('sameChannel')], c.ltrFeatures![FEATURE_NAMES.indexOf('sameCounselorOrPair')]],
]));

describe("each endpoint gives the 'ltr' ranker the thread its query comes from", () => {
  test('chat: the counselor', async () => {
    const { trace } = await recallForChat({ ...common, counselorId: 'Architect', message: 'lease' });
    expect(trace!.fallback).toBeUndefined();
    expect(thread(trace!.candidates)).toEqual({ c1: [1, 1], d1: [0, 0], r1: [0, 0] });
  });

  test('debate: the pair, in either order', async () => {
    const { trace } = await recallForDebate({ ...common, userInput: 'lease', history: [], counselorIds: ['Advocate', 'Architect'] });
    expect(thread(trace!.candidates)).toEqual({ c1: [0, 0], c2: [0, 0], d1: [1, 1], r1: [0, 0] });
  });

  test('refinement: the channel only', async () => {
    const { trace } = await recallForRefinement({ ...common, additionalContext: 'lease' });
    expect(thread(trace!.candidates)).toEqual({ c1: [0, 0], c2: [0, 0], d1: [0, 0], r1: [1, 0] });
  });
});
