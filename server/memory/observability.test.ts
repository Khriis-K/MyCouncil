import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { appendTraceJsonl, candidateRows, reportRetrieval, summaryLine } from './observability';
import type { RetrievalTrace } from './types';

const trace: RetrievalTrace = {
  requestId: 'ab12cd34',
  endpoint: 'chat',
  query: 'should I move?',
  config: { embedderId: 'emb', stage1: 'dense', rerankerId: 'rr', candidatePool: 30, k: 1 },
  indexSize: 42,
  excludedCount: 3,
  cache: { hits: 40, misses: 2 },
  candidates: [
    { unitId: 'u2', sourceId: 's2', channel: 'chat', counselorId: 'Advocate', textPreview: 'my daughter has asthma', stage1Rank: 2, stage1Score: 0.51234, rerankScore: 3.21, finalRank: 1, rankDelta: 1, selected: true },
    { unitId: 'u1', sourceId: 's1', channel: 'refinement', textPreview: 'my lease ends in March', stage1Rank: 1, stage1Score: 0.6, rerankScore: -1, finalRank: 2, rankDelta: -1, selected: false },
  ],
  timingsMs: { chunk: 0.2, embedPassages: 8.7, embedQuery: 12.3, stage1: 0.43, rerank: 96.4, total: 118.2 },
};

afterEach(() => vi.restoreAllMocks());

describe('summaryLine', () => {
  test('one line with request, sizes, stage timings and cache', () => {
    expect(summaryLine(trace)).toBe('[memory] chat req=ab12cd34 idx=42 pool=2 used=1 total=118ms (embedQ 12 | s1 0.4 | rerank 96) cache 40/2');
  });

  test('mentions a fallback', () => {
    expect(summaryLine({ ...trace, fallback: 'rerank_failed: boom' })).toMatch(/ fallback=rerank_failed: boom$/);
  });
});

describe('candidateRows', () => {
  test('one row per candidate with the columns worth eyeballing', () => {
    expect(candidateRows(trace)[0]).toEqual({
      stage1Rank: 2, stage1Score: 0.512, rerankScore: 3.21, finalRank: 1, rankDelta: 1, selected: true, preview: 'my daughter has asthma',
    });
  });

  test('blank rerank columns when there was no stage 2', () => {
    const row = candidateRows({ ...trace, candidates: [{ ...trace.candidates[1], rerankScore: undefined, finalRank: undefined, rankDelta: undefined }] })[0];
    expect(row).toMatchObject({ rerankScore: '', finalRank: '', rankDelta: '' });
  });
});

describe('appendTraceJsonl', () => {
  test('creates the folder and appends one valid JSON line per trace', () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'traces-')), 'logs', 'memory-traces.jsonl');
    appendTraceJsonl(trace, file);
    appendTraceJsonl({ ...trace, requestId: 'ffff0000' }, file);
    const lines = readFileSync(file, 'utf8').trimEnd().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual(trace);
    expect(JSON.parse(lines[1]).requestId).toBe('ffff0000');
  });
});

describe('reportRetrieval', () => {
  test('always logs the summary line; debug off writes nothing else', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const table = vi.spyOn(console, 'table').mockImplementation(() => {});
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'traces-')), 'memory-traces.jsonl');
    reportRetrieval(trace, { debug: false, traceFile: file });
    expect(log).toHaveBeenCalledWith(summaryLine(trace));
    expect(table).not.toHaveBeenCalled();
    expect(existsSync(file)).toBe(false);
  });

  test('debug on also prints the candidate table and appends the trace', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const table = vi.spyOn(console, 'table').mockImplementation(() => {});
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'traces-')), 'memory-traces.jsonl');
    reportRetrieval(trace, { debug: true, traceFile: file });
    expect(table).toHaveBeenCalledWith(candidateRows(trace));
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(trace);
  });

  test('a failing trace write is logged, not thrown', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'table').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dir = mkdtempSync(path.join(tmpdir(), 'traces-'));
    expect(() => reportRetrieval(trace, { debug: true, traceFile: dir })).not.toThrow();
    expect(error).toHaveBeenCalled();
  });
});
