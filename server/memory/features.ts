import type { MemoryChannel, MemoryUnit } from './types';

/**
 * The single source of feature order: vectors, weights and means all follow it.
 * Left out on purpose: the source's age and text length. In the generated benchmark, gold turns
 * are planted earlier and written longer than filler, so those weights learned the generator,
 * not relevance, and no split of that data can tell the two apart.
 */
export const FEATURE_NAMES = [
  'denseScore', 'denseRecipRank', 'bm25Norm', 'bm25RecipRank', 'ceScore',
  'sameChannel', 'sameCounselorOrPair', 'isShortReply',
] as const;

/** The thread the new message arrives on. */
export interface QueryOrigin {
  channel: MemoryChannel;
  counselorId?: string;
  debatePairId?: string;
}

export interface CandidateSignals {
  /** cosine to the query, known for every unit */
  denseScore: number;
  /** 1-based place in the dense top n; undefined outside it */
  denseRank?: number;
  /** 0 when no query term matches */
  bm25Score: number;
  bm25Rank?: number;
  /** the query's highest BM25 score over all units */
  maxBm25: number;
  /** cross-encoder logit */
  ceScore: number;
  sameChannel: boolean;
  /** same counselor (chat) or same pair (debate) as the origin */
  sameCounselorOrPair: boolean;
  /** the embedText carries the counselor's question */
  isShortReply: boolean;
}

const recip = (rank: number | undefined) => (rank === undefined ? 0 : 1 / rank);
const flag = (b: boolean) => (b ? 1 : 0);

export function featureVector(s: CandidateSignals): number[] {
  return [
    s.denseScore,
    recip(s.denseRank),
    s.maxBm25 > 0 ? s.bm25Score / s.maxBm25 : 0,
    recip(s.bm25Rank),
    s.ceScore,
    flag(s.sameChannel),
    flag(s.sameCounselorOrPair),
    flag(s.isShortReply),
  ];
}

// The client's pair id lists the two counselors in either order.
const samePair = (a: string, b: string) => a.split('-').sort().join('-') === b.split('-').sort().join('-');

function isSameThread(unit: MemoryUnit, origin: QueryOrigin): boolean {
  if (unit.channel !== origin.channel) return false;
  if (origin.channel === 'chat') return unit.counselorId === origin.counselorId;
  if (origin.channel === 'debate') return !!unit.debatePairId && !!origin.debatePairId && samePair(unit.debatePairId, origin.debatePairId);
  return false;
}

/** The query-independent signals of one candidate, given where the query comes from. */
export function contextSignals(unit: MemoryUnit, origin: QueryOrigin): Pick<CandidateSignals, 'sameChannel' | 'sameCounselorOrPair' | 'isShortReply'> {
  return {
    sameChannel: unit.channel === origin.channel,
    sameCounselorOrPair: isSameThread(unit, origin),
    isShortReply: unit.embedText !== unit.text,
  };
}
