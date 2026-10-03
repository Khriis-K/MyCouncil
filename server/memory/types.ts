export type MemoryChannel = 'refinement' | 'chat' | 'debate';

export interface MemorySource {
  id: string;
  channel: MemoryChannel;
  speaker: 'user' | 'counselor';
  counselorId?: string;
  debatePairId?: string;
  text: string;
  timestamp: number;
}

export interface MemoryUnit {
  id: string;
  sourceId: string;
  channel: MemoryChannel;
  counselorId?: string;
  debatePairId?: string;
  text: string;
  embedText: string;
  timestamp: number;
}

export interface TraceCandidate {
  unitId: string;
  sourceId: string;
  channel: MemoryChannel;
  counselorId?: string;
  textPreview: string;
  stage1Rank: number;
  stage1Score: number;
  // Set only when stage 2 actually reranked.
  rerankScore?: number;
  finalRank?: number;
  /** stage1Rank - finalRank: positive means the reranker promoted it */
  rankDelta?: number;
  selected: boolean;
}

export interface RetrievalTrace {
  requestId: string;
  endpoint: 'chat' | 'debate' | 'refinement' | 'bench';
  query: string;
  config: { embedderId: string; stage1: string; rerankerId: string | null; candidatePool: number; k: number };
  /** units searched, after exclusion */
  indexSize: number;
  /** units dropped because their source was excluded (e.g. the verbatim window) */
  excludedCount: number;
  cache: { hits: number; misses: number };
  /** in final order: rerank order when stage 2 ran, else stage-1 order */
  candidates: TraceCandidate[];
  timingsMs: { chunk: number; embedPassages: number; embedQuery: number; stage1: number; rerank: number; total: number };
  fallback?: string;
}
