import { randomUUID } from 'node:crypto';
import { buildMemoryUnits } from './chunker';
import { denseSearch, type DenseHit } from './denseRetriever';
import type { Embedder } from './embedder';
import type { Reranker } from './reranker';
import type { MemorySource, MemoryUnit, RetrievalTrace } from './types';

export interface RetrieveParams {
  query: string;
  sources: MemorySource[];
  excludeSourceIds: string[];
  k: number;
  candidatePool: number;
  embedder: Embedder & { stats?: () => { hits: number; misses: number } };
  /** stage 2; null or omitted keeps stage-1 order */
  reranker?: Reranker | null;
  endpoint: RetrievalTrace['endpoint'];
}

const PREVIEW_CHARS = 80;

// Stage 2: sort by rerank score, ties by stage-1 rank. Throws if the reranker does.
async function rerank(reranker: Reranker, query: string, hits: DenseHit[], unitById: Map<string, MemoryUnit>) {
  const scores = await reranker.score(query, hits.map(h => unitById.get(h.unitId)!.embedText));
  if (scores.length !== hits.length) throw new Error(`expected ${hits.length} scores, got ${scores.length}`);
  const scoreById = new Map(hits.map((h, i) => [h.unitId, scores[i]]));
  const order = [...hits].sort((a, b) => scoreById.get(b.unitId)! - scoreById.get(a.unitId)! || a.rank - b.rank);
  return { order, scoreById };
}

export async function retrieveMemories(params: RetrieveParams): Promise<{ used: MemoryUnit[]; trace: RetrievalTrace }> {
  const { query, sources, excludeSourceIds, k, candidatePool, embedder, endpoint } = params;
  const reranker = params.reranker ?? null;
  const start = performance.now();
  const statsBefore = embedder.stats?.() ?? { hits: 0, misses: 0 };

  const excluded = new Set(excludeSourceIds);
  const allUnits = buildMemoryUnits(sources);
  const units = allUnits.filter(u => !excluded.has(u.sourceId));
  const afterChunk = performance.now();

  const unitVecs = units.length ? await embedder.embedPassages(units.map(u => u.embedText)) : [];
  const afterPassages = performance.now();

  const [queryVec] = units.length ? await embedder.embedQueries([query]) : [new Float32Array(0)];
  const afterQuery = performance.now();

  // Stage 1: dense candidates.
  const hits = denseSearch(queryVec, unitVecs, units, candidatePool);
  const afterStage1 = performance.now();

  const unitById = new Map(units.map(u => [u.id, u]));
  let order = hits;
  let scoreById: Map<string, number> | undefined;
  let fallback: string | undefined;
  if (reranker && hits.length) {
    try {
      ({ order, scoreById } = await rerank(reranker, query, hits, unitById));
    } catch (error) {
      // Degrade to stage-1 order rather than dropping memories.
      fallback = `rerank_failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  const afterRerank = reranker && hits.length ? performance.now() : afterStage1;

  // Dedupe after reranking, so each source contributes the chunk the final ranking liked best.
  const seenSources = new Set<string>();
  const selectedIds = new Set<string>();
  for (const hit of order) {
    if (selectedIds.size >= k) break;
    if (seenSources.has(hit.sourceId)) continue;
    seenSources.add(hit.sourceId);
    selectedIds.add(hit.unitId);
  }

  const used = order.filter(h => selectedIds.has(h.unitId)).map(h => unitById.get(h.unitId)!);
  const statsAfter = embedder.stats?.() ?? { hits: 0, misses: 0 };

  const trace: RetrievalTrace = {
    requestId: randomUUID().slice(0, 8),
    endpoint,
    query,
    config: { embedderId: embedder.id, stage1: 'dense', rerankerId: reranker?.id ?? null, candidatePool, k },
    indexSize: units.length,
    excludedCount: allUnits.length - units.length,
    cache: { hits: statsAfter.hits - statsBefore.hits, misses: statsAfter.misses - statsBefore.misses },
    candidates: order.map((h, i) => {
      const unit = unitById.get(h.unitId)!;
      return {
        unitId: h.unitId,
        sourceId: h.sourceId,
        channel: unit.channel,
        counselorId: unit.counselorId,
        textPreview: unit.text.slice(0, PREVIEW_CHARS),
        stage1Rank: h.rank,
        stage1Score: h.score,
        ...(scoreById && { rerankScore: scoreById.get(h.unitId)!, finalRank: i + 1, rankDelta: h.rank - (i + 1) }),
        selected: selectedIds.has(h.unitId),
      };
    }),
    timingsMs: {
      chunk: afterChunk - start,
      embedPassages: afterPassages - afterChunk,
      embedQuery: afterQuery - afterPassages,
      stage1: afterStage1 - afterQuery,
      rerank: afterRerank - afterStage1,
      total: performance.now() - start,
    },
    ...(fallback && { fallback }),
  };

  return { used, trace };
}
