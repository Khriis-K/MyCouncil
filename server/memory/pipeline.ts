import { buildMemoryUnits } from './chunker';
import { denseSearch } from './denseRetriever';
import type { Embedder } from './embedder';
import type { MemorySource, MemoryUnit, RetrievalTrace } from './types';

export interface RetrieveParams {
  query: string;
  sources: MemorySource[];
  excludeSourceIds: string[];
  k: number;
  candidatePool: number;
  embedder: Embedder & { stats?: () => { hits: number; misses: number } };
}

const PREVIEW_CHARS = 80;

export async function retrieveMemories(params: RetrieveParams): Promise<{ used: MemoryUnit[]; trace: RetrievalTrace }> {
  const { query, sources, excludeSourceIds, k, candidatePool, embedder } = params;
  const start = performance.now();
  const statsBefore = embedder.stats?.() ?? { hits: 0, misses: 0 };

  const excluded = new Set(excludeSourceIds);
  const units = buildMemoryUnits(sources).filter(u => !excluded.has(u.sourceId));
  const afterChunk = performance.now();

  const unitVecs = units.length ? await embedder.embedPassages(units.map(u => u.embedText)) : [];
  const afterPassages = performance.now();

  const [queryVec] = units.length ? await embedder.embedQueries([query]) : [new Float32Array(0)];
  const afterQuery = performance.now();

  // Stage 1: dense candidates. A later ticket inserts a rerank stage between here and selection.
  const hits = denseSearch(queryVec, unitVecs, units, candidatePool);
  const afterStage1 = performance.now();

  const unitById = new Map(units.map(u => [u.id, u]));
  const seenSources = new Set<string>();
  const selectedIds = new Set<string>();
  for (const hit of hits) {
    if (selectedIds.size >= k) break;
    if (seenSources.has(hit.sourceId)) continue;
    seenSources.add(hit.sourceId);
    selectedIds.add(hit.unitId);
  }

  const used = hits.filter(h => selectedIds.has(h.unitId)).map(h => unitById.get(h.unitId)!);
  const statsAfter = embedder.stats?.() ?? { hits: 0, misses: 0 };

  const trace: RetrievalTrace = {
    query,
    indexSize: units.length,
    candidates: hits.map(h => {
      const unit = unitById.get(h.unitId)!;
      return {
        unitId: h.unitId,
        sourceId: h.sourceId,
        channel: unit.channel,
        textPreview: unit.text.slice(0, PREVIEW_CHARS),
        stage1Rank: h.rank,
        stage1Score: h.score,
        selected: selectedIds.has(h.unitId),
      };
    }),
    timingsMs: {
      chunk: afterChunk - start,
      embedPassages: afterPassages - afterChunk,
      embedQuery: afterQuery - afterPassages,
      stage1: afterStage1 - afterQuery,
      total: performance.now() - start,
    },
    cache: { hits: statsAfter.hits - statsBefore.hits, misses: statsAfter.misses - statsBefore.misses },
  };

  return { used, trace };
}
