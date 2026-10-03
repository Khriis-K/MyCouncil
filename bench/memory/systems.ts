import { lastCounselorTurn, recallForChat, windowSourceIds } from '../../server/memory/chatMemory';
import type { Embedder } from '../../server/memory/embedder';
import { retrieveMemories } from '../../server/memory/pipeline';
import type { RerankerName } from '../../server/memory/models';
import { buildChatQuery } from '../../server/memory/queries';
import type { Reranker } from '../../server/memory/reranker';
import type { MemoryUnit, RetrievalTrace } from '../../server/memory/types';
import type { Probe, Scenario, TimelineEvent } from './schema';

export interface ProbeContext {
  scenario: Scenario;
  probe: Probe;
}

export interface SystemOutput {
  /** sourceIds, best first, deduped */
  ranked: string[];
  /** sourceIds that would actually be in the prompt */
  context: Set<string>;
  /** chars of memory/history text placed in the prompt (excl. dilemma and instructions) */
  contextChars: number;
  timingsMs?: Record<string, number>;
  /** retrieval systems only */
  trace?: RetrievalTrace;
}

export interface System {
  name: string;
  run(ctx: ProbeContext): Promise<SystemOutput>;
}

export interface SystemOptions {
  embedder: Embedder;
  /** memory items retrieved into the prompt */
  k: number;
  /** verbatim recent turns kept in the prompt */
  window: number;
  candidatePool: number;
  rerankers: Record<Exclude<RerankerName, 'none'>, Reranker>;
  /** what memory-production runs, i.e. config.memory.reranker */
  productionReranker: RerankerName;
}

const byTime = (a: TimelineEvent, b: TimelineEvent) => a.timestamp - b.timestamp;
const newestFirst = (a: TimelineEvent, b: TimelineEvent) => b.timestamp - a.timestamp;
const charCount = (events: { text: string }[]) => events.reduce((n, e) => n + e.text.length, 0);
const dedupe = (ids: string[]) => [...new Set(ids)];

// Every probe is a new message at the end of the timeline, in the thread it names.
function threadOf(timeline: TimelineEvent[], probe: Probe): TimelineEvent[] {
  return timeline
    .filter(e => {
      if (probe.channel === 'chat') return e.channel === 'chat' && e.counselorId === probe.counselorId;
      if (probe.channel === 'debate') return e.channel === 'debate' && e.debatePairId === probe.debatePairId;
      return e.channel === 'refinement';
    })
    .sort(byTime);
}

function chatQuery({ scenario, probe }: ProbeContext): string {
  return probe.channel === 'chat'
    ? buildChatQuery(probe.text, lastCounselorTurn(scenario.timeline, probe.counselorId!))
    : probe.text;
}

function rankedFromTrace(trace: RetrievalTrace): string[] {
  return dedupe(trace.candidates.map(c => c.sourceId));
}

const unitText = (units: MemoryUnit[]) => charCount(units);

// Upper bound on what the app sends today: chat and debate stuff the whole thread; refinement is
// really only a <=50-char label of the previous one, so crediting its full text is generous.
// Debate also resets when the overlay closes in the app, so the full pair transcript is generous too.
const existingContext: System = {
  name: 'existing-context',
  async run({ scenario, probe }) {
    const thread = threadOf(scenario.timeline, probe);
    const seen = probe.channel === 'refinement' ? thread.filter(e => e.speaker === 'user').slice(-1) : thread;
    const users = seen.filter(e => e.speaker === 'user').sort(newestFirst);
    return { ranked: users.map(e => e.id), context: new Set(users.map(e => e.id)), contextChars: charCount(seen) };
  },
};

const recency = (k: number): System => ({
  name: 'recency',
  async run({ scenario }) {
    const users = scenario.timeline.filter(e => e.speaker === 'user').sort(newestFirst);
    const inPrompt = users.slice(0, k);
    return { ranked: users.map(e => e.id), context: new Set(inPrompt.map(e => e.id)), contextChars: charCount(inPrompt) };
  },
});

const dense = (name: string, reranker: Reranker | null, { embedder, k, candidatePool }: SystemOptions): System => ({
  name,
  async run(ctx) {
    const { used, trace } = await retrieveMemories({
      query: chatQuery(ctx), sources: ctx.scenario.timeline, excludeSourceIds: [], k, candidatePool, embedder, reranker, endpoint: 'bench',
    });
    return {
      ranked: rankedFromTrace(trace),
      context: new Set(used.map(u => u.sourceId)),
      contextChars: unitText(used),
      timingsMs: { ...trace.timingsMs },
      trace,
    };
  },
});

// Shipped chat prompt: the thread's last `window` turns verbatim, plus retrieved memories that exclude them.
const memoryProduction = ({ embedder, k, window, candidatePool, rerankers, productionReranker }: SystemOptions): System => ({
  name: 'memory-production',
  async run(ctx) {
    const reranker = productionReranker === 'none' ? null : rerankers[productionReranker];
    const { scenario, probe } = ctx;
    const sources = scenario.timeline;
    const windowIds =
      probe.channel === 'chat'
        ? windowSourceIds(sources, probe.counselorId!, window)
        : threadOf(sources, probe).slice(-window).map(e => e.id);

    const recall: { used: MemoryUnit[]; trace?: RetrievalTrace; fallback?: string } =
      probe.channel === 'chat'
        ? await recallForChat({
            counselorId: probe.counselorId!, message: probe.text, sources,
            settings: { enabled: true, k, candidatePool, recentWindow: window }, embedder, reranker,
          })
        : await retrieveMemories({ query: probe.text, sources, excludeSourceIds: windowIds, k, candidatePool, embedder, reranker, endpoint: 'bench' });
    if (!recall.trace) throw new Error(`memory-production retrieval fell back: ${recall.fallback ?? 'no trace'}`);

    const windowEvents = sources.filter(e => windowIds.includes(e.id));
    const windowUsers = windowEvents.filter(e => e.speaker === 'user').sort(newestFirst).map(e => e.id);
    return {
      ranked: dedupe([...windowUsers, ...rankedFromTrace(recall.trace)]),
      context: new Set([...windowUsers, ...recall.used.map(u => u.sourceId)]),
      contextChars: charCount(windowEvents) + unitText(recall.used),
      timingsMs: { ...recall.trace.timingsMs },
      trace: recall.trace,
    };
  },
});

export function createSystems(options: SystemOptions): System[] {
  return [
    existingContext,
    recency(options.k),
    dense('dense', null, options),
    dense('dense+rerank', options.rerankers.minilm, options),
    dense('dense+rerank-bge', options.rerankers['bge-base'], options),
    memoryProduction(options),
  ];
}
