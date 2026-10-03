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
  textPreview: string;
  stage1Rank: number;
  stage1Score: number;
  selected: boolean;
}

export interface RetrievalTrace {
  query: string;
  indexSize: number;
  candidates: TraceCandidate[];
  timingsMs: { chunk: number; embedPassages: number; embedQuery: number; stage1: number; total: number };
  cache: { hits: number; misses: number };
  fallback?: string;
}
