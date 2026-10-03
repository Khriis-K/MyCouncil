import { CachedEmbedder, type Embedder } from './embedder';
import { retrieveMemories } from './pipeline';
import { buildChatQuery } from './queries';
import { TransformersEmbedder } from './transformersEmbedder';
import type { MemorySource, MemoryUnit, RetrievalTrace } from './types';

export interface MemorySettings {
  enabled: boolean;
  k: number;
  candidatePool: number;
  recentWindow: number;
}

export interface ChatRecall {
  used: MemoryUnit[];
  trace?: RetrievalTrace;
  fallback?: string;
}

let sharedEmbedder: CachedEmbedder | undefined;
const defaultEmbedder = () => (sharedEmbedder ??= new CachedEmbedder(new TransformersEmbedder()));

// The client sends this counselor's whole chat as sources, so the verbatim window is its last N turns.
function windowSourceIds(sources: MemorySource[], counselorId: string, windowSize: number): string[] {
  return sources
    .filter(s => s.channel === 'chat' && s.counselorId === counselorId)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-windowSize)
    .map(s => s.id);
}

export async function recallForChat(params: {
  counselorId: string;
  message: string;
  sources: MemorySource[] | undefined;
  settings: MemorySettings;
  embedder?: Embedder;
}): Promise<ChatRecall> {
  const { counselorId, message, settings } = params;
  const sources = params.sources ?? [];
  if (!settings.enabled) return { used: [], fallback: 'disabled' };

  try {
    const lastCounselorTurn = sources
      .filter(s => s.channel === 'chat' && s.counselorId === counselorId && s.speaker === 'counselor')
      .sort((a, b) => a.timestamp - b.timestamp)
      .at(-1)?.text;

    return await retrieveMemories({
      query: buildChatQuery(message, lastCounselorTurn),
      sources,
      excludeSourceIds: windowSourceIds(sources, counselorId, settings.recentWindow),
      k: settings.k,
      candidatePool: settings.candidatePool,
      embedder: params.embedder ?? defaultEmbedder(),
    });
  } catch (error) {
    console.error('[memory] retrieval failed, continuing without memories:', error);
    return { used: [], fallback: `error: ${error instanceof Error ? error.message : String(error)}` };
  }
}
