import { CachedEmbedder, type Embedder } from './embedder';
import { retrieveMemories } from './pipeline';
import type { RerankerName } from './models';
import { createProductionSelector } from './productionSelector';
import { buildChatQuery, buildDebateQuery, buildRefinementQuery } from './queries';
import { createReranker, type Reranker } from './reranker';
import { TransformersEmbedder } from './transformersEmbedder';
import type { MemorySource, MemoryUnit, RetrievalTrace, Stage1Mode } from './types';

export type RecallEndpoint = Exclude<RetrievalTrace['endpoint'], 'bench'>;

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

export interface MemoryRecall {
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

// The client sends every debate turn it remembers; the ones already in this transcript are in the prompt verbatim.
// The client's pair id may list the two counselors in either order.
export function debateTranscriptSourceIds(
  sources: MemorySource[],
  transcript: { speaker: string; text: string }[],
  [c1, c2]: string[],
): string[] {
  const pairIds = new Set([`${c1}-${c2}`, `${c2}-${c1}`]);
  const inTranscript = new Set(transcript.map(t => t.text));
  return sources
    .filter(s => s.channel === 'debate' && pairIds.has(s.debatePairId ?? '') && inTranscript.has(s.text))
    .map(s => s.id);
}

interface RecallOptions {
  sources: MemorySource[] | undefined;
  settings: MemorySettings;
  embedder?: Embedder;
  /** overrides settings.reranker */
  reranker?: Reranker | null;
}

async function recall(
  options: RecallOptions,
  endpoint: RecallEndpoint,
  plan: (sources: MemorySource[]) => { query: string; excludeSourceIds: string[] },
): Promise<MemoryRecall> {
  const { settings } = options;
  const sources = options.sources ?? [];
  if (!settings.enabled) return { used: [], fallback: 'disabled' };

  try {
    return await retrieveMemories({
      ...plan(sources),
      sources,
      k: settings.k,
      candidatePool: settings.candidatePool,
      stage1: settings.stage1,
      embedder: options.embedder ?? defaultEmbedder(),
      reranker: options.reranker !== undefined ? options.reranker : defaultReranker(settings),
      endpoint,
    });
  } catch (error) {
    console.error('[memory] retrieval failed, continuing without memories:', error);
    return { used: [], fallback: `error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export function recallForChat(params: RecallOptions & { counselorId: string; message: string }): Promise<MemoryRecall> {
  const { counselorId, message, settings } = params;
  return recall(params, 'chat', sources => ({
    query: buildChatQuery(message, lastCounselorTurn(sources, counselorId)),
    excludeSourceIds: windowSourceIds(sources, counselorId, settings.recentWindow),
  }));
}

// The client sends only earlier refinements, so nothing here is already in the prompt.
export function recallForRefinement(params: RecallOptions & { additionalContext: string }): Promise<MemoryRecall> {
  return recall(params, 'refinement', () => ({ query: buildRefinementQuery(params.additionalContext), excludeSourceIds: [] }));
}

export function recallForDebate(
  params: RecallOptions & { userInput: string; history: { speaker: string; text: string }[]; counselorIds: string[] },
): Promise<MemoryRecall> {
  return recall(params, 'debate', sources => ({
    query: buildDebateQuery(params.userInput),
    excludeSourceIds: debateTranscriptSourceIds(sources, params.history, params.counselorIds),
  }));
}
