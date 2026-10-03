import { randomUUID } from 'node:crypto';
import { bm25Search } from './bm25';
import { buildMemoryUnits } from './chunker';
import { denseSearch, type DenseHit } from './denseRetriever';
import type { Embedder } from './embedder';
import { contextSignals, type QueryOrigin } from './features';
import { rrf } from './fusion';
import { LtrRanker } from './ltr';
import type { Reranker } from './reranker';
import type { MemorySource, MemoryUnit, RetrievalTrace, Stage1Mode } from './types';

export interface RetrieveParams {
  query: string;
  sources: MemorySource[];
  excludeSourceIds: string[];
  k: number;
  candidatePool: number;
  /** omitted means 'dense' */
  stage1?: Stage1Mode;
  embedder: Embedder & { stats?: () => { hits: number; misses: number } };
  /** stage 2; null or omitted keeps stage-1 order. 'ltr' overrides stage1 with its own pool. */
  reranker?: Reranker | LtrRanker | null;
  /** the thread the query arrives on; required by the 'ltr' ranker */
  origin?: QueryOrigin;
  endpoint: RetrievalTrace['endpoint'];
}

const PREVIEW_CHARS = 80;

type Stage1Hit = DenseHit & { denseRank?: number; bm25Rank?: number; bm25Score?: number };

// Candidate pool of size n; hybrid fuses the dense and BM25 top n with RRF, then cuts back to n.
function stage1Search(mode: Stage1Mode, query: string, queryVec: Float32Array, unitVecs: Float32Array[], units: MemoryUnit[], n: number): Stage1Hit[] {
  if (mode === 'dense') return denseSearch(queryVec, unitVecs, units, n);
  if (mode === 'bm25') return bm25Search(query, units, n).map(h => ({ ...h, bm25Rank: h.rank, bm25Score: h.score }));
  const [dense, bm25] = [denseSearch(queryVec, unitVecs, units, n), bm25Search(query, units, n)];
  return rrf([dense, bm25])
    .slice(0, n)
    .map(({ inputs: [d, b], ...hit }) => ({ ...hit, denseRank: d?.rank, bm25Rank: b?.rank, bm25Score: b?.score }));
}

// The 'ltr' pool: the dense top n plus the BM25 top n, uncut, in RRF order. Its features need both
// scores for every candidate, so both lists are scored in full and only the pool is cut to n.
function unionSearch(query: string, queryVec: Float32Array, unitVecs: Float32Array[], units: MemoryUnit[], n: number) {
  const [dense, bm25] = [denseSearch(queryVec, unitVecs, units, units.length), bm25Search(query, units, units.length)];
  const hits: Stage1Hit[] = rrf([dense.slice(0, n), bm25.slice(0, n)])
    .map(({ inputs: [d, b], ...hit }) => ({ ...hit, denseRank: d?.rank, bm25Rank: b?.rank, bm25Score: b?.score }));
  return {
    hits,
    denseScore: new Map(dense.map(h => [h.unitId, h.score])),
    // BM25 leaves out units with no query term: their score is 0.
    bm25Score: new Map(bm25.map(h => [h.unitId, h.score])),
    maxBm25: bm25[0]?.score ?? 0,
  };
}

type Pool = ReturnType<typeof unionSearch>;

// Stage 2 scores, one per hit. Throws if the model does.
async function stage2Scores(
  reranker: Reranker | LtrRanker, query: string, hits: Stage1Hit[], unitById: Map<string, MemoryUnit>,
  ltr?: { pool: Pool; origin: QueryOrigin; sources: MemorySource[] },
): Promise<{ scores: number[]; features?: number[][] }> {
  if (reranker instanceof LtrRanker) {
    const { pool, origin, sources } = ltr!;
    return reranker.score(query, hits.map(h => {
      const unit = unitById.get(h.unitId)!;
      return {
        text: unit.embedText,
        denseScore: pool.denseScore.get(h.unitId)!,
        denseRank: h.denseRank,
        bm25Score: pool.bm25Score.get(h.unitId) ?? 0,
        bm25Rank: h.bm25Rank,
        maxBm25: pool.maxBm25,
        ...contextSignals(unit, origin, sources),
      };
    }));
  }
  const scores = await reranker.score(query, hits.map(h => unitById.get(h.unitId)!.embedText));
  if (scores.length !== hits.length) throw new Error(`expected ${hits.length} scores, got ${scores.length}`);
  return { scores };
}

// Sort by stage-2 score, ties by stage-1 rank.
function byScore<H extends DenseHit>(hits: H[], scores: number[]) {
  const scoreById = new Map(hits.map((h, i) => [h.unitId, scores[i]]));
  const order = [...hits].sort((a, b) => scoreById.get(b.unitId)! - scoreById.get(a.unitId)! || a.rank - b.rank);
  return { order, scoreById };
}

export async function retrieveMemories(params: RetrieveParams): Promise<{ used: MemoryUnit[]; trace: RetrievalTrace }> {
  const { query, sources, excludeSourceIds, k, candidatePool, embedder, endpoint, origin } = params;
  const reranker = params.reranker ?? null;
  const isLtr = reranker instanceof LtrRanker;
  if (isLtr && !origin) throw new Error("the 'ltr' ranker needs the query's origin");
  const stage1 = isLtr ? 'union' : params.stage1 ?? 'dense';
  const start = performance.now();
  const statsBefore = embedder.stats?.() ?? { hits: 0, misses: 0 };

  const excluded = new Set(excludeSourceIds);
  const allUnits = buildMemoryUnits(sources);
  const units = allUnits.filter(u => !excluded.has(u.sourceId));
  const afterChunk = performance.now();

  // BM25 alone needs no embeddings.
  const embed = units.length > 0 && stage1 !== 'bm25';
  const unitVecs = embed ? await embedder.embedPassages(units.map(u => u.embedText)) : [];
  const afterPassages = performance.now();

  const [queryVec] = embed ? await embedder.embedQueries([query]) : [new Float32Array(0)];
  const afterQuery = performance.now();

  let pool: Pool | undefined;
  let hits: Stage1Hit[];
  if (stage1 === 'union') {
    pool = unionSearch(query, queryVec, unitVecs, units, candidatePool);
    hits = pool.hits;
  } else {
    hits = stage1Search(stage1, query, queryVec, unitVecs, units, candidatePool);
  }
  const afterStage1 = performance.now();

  const unitById = new Map(units.map(u => [u.id, u]));
  let order = hits;
  let scoreById: Map<string, number> | undefined;
  let featuresById: Map<string, number[]> | undefined;
  let fallback: string | undefined;
  if (reranker && hits.length) {
    try {
      const { scores, features } = await stage2Scores(reranker, query, hits, unitById, pool && { pool, origin: origin!, sources });
      ({ order, scoreById } = byScore(hits, scores));
      if (features) featuresById = new Map(hits.map((h, i) => [h.unitId, features[i]]));
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
    config: { embedderId: embedder.id, stage1, rerankerId: reranker?.id ?? null, candidatePool, k },
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
        ...(h.denseRank !== undefined && { denseRank: h.denseRank }),
        ...(h.bm25Rank !== undefined && { bm25Rank: h.bm25Rank, bm25Score: h.bm25Score }),
        ...(scoreById && { rerankScore: scoreById.get(h.unitId)!, finalRank: i + 1, rankDelta: h.rank - (i + 1) }),
        ...(featuresById && { ltrFeatures: featuresById.get(h.unitId)! }),
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
