import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { RetrievalTrace } from './types';

export const TRACE_FILE = path.resolve('logs/memory-traces.jsonl');

const ms = (n: number) => (n < 10 ? n.toFixed(1) : String(Math.round(n)));
const blank = (n: number | undefined, digits?: number) => (n === undefined ? '' : digits === undefined ? n : Number(n.toFixed(digits)));

export function summaryLine(trace: RetrievalTrace): string {
  const { timingsMs: t, cache } = trace;
  const used = trace.candidates.filter(c => c.selected).length;
  return (
    `[memory] ${trace.endpoint} req=${trace.requestId} idx=${trace.indexSize} pool=${trace.candidates.length} used=${used} ` +
    `total=${Math.round(t.total)}ms (embedQ ${ms(t.embedQuery)} | s1 ${ms(t.stage1)} | rerank ${ms(t.rerank)}) cache ${cache.hits}/${cache.misses}` +
    (trace.fallback ? ` fallback=${trace.fallback}` : '')
  );
}

export function candidateRows(trace: RetrievalTrace) {
  // Lexical columns only when stage 1 was bm25 or hybrid; a dense table stays as it was.
  const lexical = trace.config.stage1 !== 'dense';
  return trace.candidates.map(c => ({
    stage1Rank: c.stage1Rank,
    stage1Score: blank(c.stage1Score, 3),
    ...(lexical && { denseRank: blank(c.denseRank), bm25Rank: blank(c.bm25Rank), bm25Score: blank(c.bm25Score, 3) }),
    rerankScore: blank(c.rerankScore, 3),
    finalRank: blank(c.finalRank),
    rankDelta: blank(c.rankDelta),
    selected: c.selected,
    preview: c.textPreview,
  }));
}

export function appendTraceJsonl(trace: RetrievalTrace, file: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(trace) + '\n');
}

export function reportRetrieval(trace: RetrievalTrace, options: { debug: boolean; traceFile: string }): void {
  console.log(summaryLine(trace));
  if (!options.debug) return;
  console.table(candidateRows(trace));
  try {
    appendTraceJsonl(trace, options.traceFile);
  } catch (error) {
    console.error('[memory] could not write trace:', error);
  }
}
