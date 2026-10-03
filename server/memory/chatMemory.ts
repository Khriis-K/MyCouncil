import { CachedEmbedder, type Embedder } from './embedder';
import { retrieveMemories } from './pipeline';
import type { RerankerName } from './models';
import { createProductionSelector } from './productionSelector';
import { buildChatQuery } from './queries';
import { createReranker, type Reranker } from './reranker';
import { TransformersEmbedder } from './transformersEmbedder';
import type { MemorySource, MemoryUnit, RetrievalTrace, Stage1Mode } from './types';

export interface MemorySettings {
  enabled: boolean;
  k: number;
  candidatePool: number;
  recentWindow: number;
  /** omitted means 'dense' */
  stage1?: Stage1Mode;
  /** stage-2 model; omitted means 'none' */
  reranker?: RerankerName;
  /** 'llm-select' only: past this, ranking falls back to dense order */
  selectorTimeoutMs?: number;
}

export interface ChatRecall {
  used: MemoryUnit[];
  trace?: RetrievalTrace;
  fallback?: string;
}

let sharedEmbedder: CachedEmbedder | undefined;
const defaultEmbedder = () => (sharedEmbedder ??= new CachedEmbedder(new TransformersEmbedder()));

const sharedRerankers = new Map<RerankerName, Reranker | null>();
function defaultReranker({ reranker: name = 'none', k, selectorTimeoutMs }: MemorySettings) {
  if (!sharedRerankers.has(name)) {
    sharedRerankers.set(name, name === 'llm-select' ? createProductionSelector(k, selectorTimeoutMs) : createReranker(name));
  }
  return sharedRerankers.get(name)!;
}

// The client sends this counselor's whole chat as sources, so the verbatim window is its last N turns.
export function windowSourceIds(sources: MemorySource[], counselorId: string, windowSize: number): string[] {
  return sources
    .filter(s => s.channel === 'chat' && s.counselorId === counselorId)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-windowSize)
    .map(s => s.id);
}

export function lastCounselorTurn(sources: MemorySource[], counselorId: string): string | undefined {
  return sources
    .filter(s => s.channel === 'chat' && s.counselorId === counselorId && s.speaker === 'counselor')
    .sort((a, b) => a.timestamp - b.timestamp)
    .at(-1)?.text;
}

export async function recallForChat(params: {
  counselorId: string;
  message: string;
  sources: MemorySource[] | undefined;
  settings: MemorySettings;
  embedder?: Embedder;
  /** overrides settings.reranker */
  reranker?: Reranker | null;
}): Promise<ChatRecall> {
  const { counselorId, message, settings } = params;
  const sources = params.sources ?? [];
  if (!settings.enabled) return { used: [], fallback: 'disabled' };

  try {
    return await retrieveMemories({
      query: buildChatQuery(message, lastCounselorTurn(sources, counselorId)),
      sources,
      excludeSourceIds: windowSourceIds(sources, counselorId, settings.recentWindow),
      k: settings.k,
      candidatePool: settings.candidatePool,
      stage1: settings.stage1,
      embedder: params.embedder ?? defaultEmbedder(),
      reranker: params.reranker !== undefined ? params.reranker : defaultReranker(settings),
      endpoint: 'chat',
    });
  } catch (error) {
    console.error('[memory] retrieval failed, continuing without memories:', error);
    return { used: [], fallback: `error: ${error instanceof Error ? error.message : String(error)}` };
  }
}
