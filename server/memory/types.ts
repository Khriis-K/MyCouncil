export type MemoryChannel = 'refinement' | 'chat' | 'debate';

/** stage-1 candidate generator; 'hybrid' is RRF of the dense and BM25 lists */
export type Stage1Mode = 'dense' | 'bm25' | 'hybrid';

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
  /** cosine for dense, BM25 for bm25, the RRF score for hybrid */
  stage1Score: number;
  // Set only for bm25/hybrid stage 1: the unit's place in each input list.
  denseRank?: number;
  bm25Rank?: number;
  bm25Score?: number;
  // Set only when stage 2 actually reranked.
  rerankScore?: number;
  finalRank?: number;
  /** stage1Rank - finalRank: positive means the reranker promoted it */
  rankDelta?: number;
  /** 'ltr' only: the raw feature vector, in FEATURE_NAMES order */
  ltrFeatures?: number[];
  selected: boolean;
}

export interface RetrievalTrace {
  requestId: string;
  endpoint: 'chat' | 'debate' | 'refinement' | 'bench';
  query: string;
  /** stage1 'union' is the 'ltr' pool: the dense top n plus the BM25 top n, in RRF order, uncut */
  config: { embedderId: string; stage1: Stage1Mode | 'union'; rerankerId: string | null; candidatePool: number; k: number };
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
