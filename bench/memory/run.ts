import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../../server/config';
import { generateText } from '../../server/llm';
import { CachedEmbedder } from '../../server/memory/embedder';
import { LlmSelector } from '../../server/memory/llmSelector';
import { createReranker } from '../../server/memory/reranker';
import type { RetrievalTrace } from '../../server/memory/types';
import { TransformersEmbedder } from '../../server/memory/transformersEmbedder';
import { allGoldAtK, contextRecall, contextTokens, METRIC_KS, mrr, ndcgAtK, recallAtK } from './metrics';
import { datasetSchema, type Dataset } from './schema';
import { createSystems, productionRerankerOf, type System, type SystemOptions } from './systems';

const BENCH_DIR = import.meta.dirname;
const CATEGORIES = ['explicit', 'implicit', 'multi', 'update'] as const;

export interface CliArgs {
  split: string;
  systems?: string[];
  k: number;
  window: number;
  data?: string;
  /** with trace: print this probe's retrieval traces instead of running the benchmark */
  probe?: string;
  trace?: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { split: 'fixture', k: config.memory.k, window: config.memory.recentWindow };
  const number = (flag: string, value: string | undefined) => {
    const n = Number(value);
    if (!value || !Number.isInteger(n) || n < 0) throw new Error(`${flag} needs a non-negative integer`);
    return n;
  };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--trace') {
      args.trace = true;
      i--; // boolean flag: no value to skip
    } else if (flag === '--probe' && value) args.probe = value;
    else if (flag === '--split' && value) args.split = value;
    else if (flag === '--systems' && value) args.systems = value.split(',');
    else if (flag === '--k') args.k = number(flag, value);
    else if (flag === '--window') args.window = number(flag, value);
    else if (flag === '--data' && value) args.data = value;
    else throw new Error(`unknown or incomplete flag: ${flag}`);
  }
  if (args.trace && !args.probe) throw new Error('--trace needs --probe <probeId>');
  if (args.probe && !args.trace) throw new Error('--probe is only used with --trace');
  return args;
}

export function defaultDataPath(split: string): string {
  return path.join(BENCH_DIR, 'data', split === 'fixture' ? 'fixture.json' : 'scenarios.v1.json');
}

export function loadDataset(file: string, split: string): Dataset {
  const dataset = datasetSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
  const scenarios = dataset.scenarios.filter(s => s.split === split);
  if (scenarios.length === 0) throw new Error(`no scenarios with split "${split}" in ${file}`);
  return { ...dataset, scenarios };
}

export interface GoldRank {
  sourceId: string;
  grade: number;
  rank: number | null;
  inContext: boolean;
}

export interface ResultRow {
  scenarioId: string;
  probeId: string;
  category: string;
  channel: string;
  system: string;
  goldRanks: GoldRank[];
  metrics: Record<string, number>;
  contextChars: number;
  timingsMs?: Record<string, number>;
}

export interface Aggregate {
  n: number;
  metrics: Record<string, number>;
}

export interface BenchResults {
  meta: {
    split: string; timestamp: string; datasetVersion: string; embedderId: string; rerankerId: string | null; llmSelectorId?: string;
    k: number; window: number; candidatePool: number; machine: string;
  };
  systems: string[];
  rows: ResultRow[];
  aggregates: Record<string, { overall: Aggregate; byCategory: Record<string, Aggregate> }>;
}

export interface RunOptions extends SystemOptions {
  dataset: Dataset;
  split: string;
  systems?: string[];
}

function selectSystems(options: RunOptions): System[] {
  const all = createSystems(options);
  const unknown = (options.systems ?? []).filter(name => !all.some(s => s.name === name));
  if (unknown.length) throw new Error(`unknown system(s): ${unknown.join(', ')} (available: ${all.map(s => s.name).join(', ')})`);
  return options.systems ? all.filter(s => options.systems!.includes(s.name)) : all;
}

/** Nearest-rank percentile; undefined for no values. */
export function percentile(values: number[], p: number): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

function mean(rows: ResultRow[]): Aggregate {
  const keys = rows.length ? Object.keys(rows[0].metrics) : [];
  return {
    n: rows.length,
    metrics: Object.fromEntries(keys.map(key => [key, rows.reduce((sum, r) => sum + r.metrics[key], 0) / rows.length])),
  };
}

export async function runBenchmark(options: RunOptions): Promise<BenchResults> {
  const { dataset, split, embedder, k, window, candidatePool } = options;
  const systems = selectSystems(options);

  // Warm-up: one untimed run per system loads every model it needs before anything is recorded.
  const first = dataset.scenarios[0];
  if (first?.probes[0]) for (const system of systems) await system.run({ scenario: first, probe: first.probes[0] });

  const rows: ResultRow[] = [];
  for (const scenario of dataset.scenarios) {
    for (const probe of scenario.probes) {
      for (const system of systems) {
        const out = await system.run({ scenario, probe });
        const metrics: Record<string, number> = { mrr: mrr(out.ranked, probe.gold) };
        for (const n of METRIC_KS) {
          metrics[`recall@${n}`] = recallAtK(out.ranked, probe.gold, n);
          metrics[`ndcg@${n}`] = ndcgAtK(out.ranked, probe.gold, n);
          metrics[`allGold@${n}`] = allGoldAtK(out.ranked, probe.gold, n);
        }
        metrics.contextRecall = contextRecall(out.context, probe.gold);
        // Gold the ranking stage could still have picked: in the candidate pool, or already in the prompt.
        if (out.trace) metrics.poolRecall = contextRecall(new Set([...out.context, ...out.trace.candidates.map(c => c.sourceId)]), probe.gold);
        metrics.contextTokensApprox = contextTokens(out.contextChars);
        rows.push({
          scenarioId: scenario.id,
          probeId: probe.id,
          category: probe.category,
          channel: probe.channel,
          system: system.name,
          goldRanks: probe.gold.map(g => {
            const index = out.ranked.indexOf(g.sourceId);
            return { ...g, rank: index === -1 ? null : index + 1, inContext: out.context.has(g.sourceId) };
          }),
          metrics,
          contextChars: out.contextChars,
          timingsMs: out.timingsMs,
        });
      }
    }
  }

  const aggregates: BenchResults['aggregates'] = {};
  for (const { name } of systems) {
    const own = rows.filter(r => r.system === name);
    aggregates[name] = {
      overall: mean(own),
      byCategory: Object.fromEntries(CATEGORIES.map(c => [c, mean(own.filter(r => r.category === c))])),
    };
  }

  return {
    meta: {
      split, timestamp: new Date().toISOString(), datasetVersion: dataset.version, embedderId: embedder.id,
      rerankerId: productionRerankerOf(options)?.id ?? null,
      llmSelectorId: options.llmSelector?.id,
      k, window, candidatePool, machine: os.cpus()[0]?.model ?? 'unknown',
    },
    systems: systems.map(s => s.name),
    rows,
    aggregates,
  };
}

/** Probes where `system` scored a higher or lower contextRecall than `baseline`. */
export function transitions(rows: ResultRow[], baseline: string, system: string): { better: string[]; worse: string[] } {
  const base = new Map(rows.filter(r => r.system === baseline).map(r => [r.probeId, r.metrics.contextRecall]));
  const better: string[] = [];
  const worse: string[] = [];
  for (const r of rows.filter(r => r.system === system && base.has(r.probeId))) {
    const before = base.get(r.probeId)!;
    if (r.metrics.contextRecall > before) better.push(r.probeId);
    else if (r.metrics.contextRecall < before) worse.push(r.probeId);
  }
  return { better, worse };
}

const BASELINE = 'dense';

function transitionsSection({ systems, rows }: BenchResults): string[] {
  if (!systems.includes(BASELINE)) return [];
  const others = systems.filter(s => s !== BASELINE);
  return [
    `## Per-probe changes vs ${BASELINE} (contextRecall)`,
    '',
    table(
      ['system', 'better', 'worse', 'probes better', 'probes worse'],
      others.map(s => {
        const { better, worse } = transitions(rows, BASELINE, s);
        return [s, String(better.length), String(worse.length), better.join(', ') || '-', worse.join(', ') || '-'];
      }),
    ),
    '',
  ];
}

const f = (n: number | undefined) => (n === undefined ? '-' : n.toFixed(3));
const table = (headers: string[], body: string[][]) =>
  [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...body.map(r => `| ${r.join(' | ')} |`)].join('\n');

export function renderMarkdown(results: BenchResults): string {
  const { meta, systems, aggregates } = results;
  const ks = METRIC_KS;
  const metric = (name: string, key: string, cat?: string) => {
    const agg = cat ? aggregates[name].byCategory[cat] : aggregates[name].overall;
    return agg.n ? f(agg.metrics[key]) : '-';
  };

  const lines = [`# Memory benchmark: ${meta.split}`, ''];
  if (meta.split === 'fixture') {
    lines.push('> Fixture run: this only proves the harness works. Three hand-written scenarios say nothing about retrieval quality. Do not quote these numbers.', '');
  }
  lines.push(
    `- generated: ${meta.timestamp}`,
    `- dataset version: ${meta.datasetVersion}`,
    `- embedder: ${meta.embedderId}`,
    `- memory-production reranker: ${meta.rerankerId ?? 'none'}`,
    ...(meta.llmSelectorId ? [`- dense+llm-select selector: ${meta.llmSelectorId} (temperature 0, live API calls: rerank latency includes the network)`] : []),
    `- settings: k=${meta.k}, window=${meta.window}, candidatePool=${meta.candidatePool}`,
    `- probes per system: ${aggregates[systems[0]]?.overall.n ?? 0}`,
    '- token counts are approximate (context chars / 4)',
    '- existing-context is an upper bound on today\'s prompts: debate resets when the overlay closes, and refinement really carries only a <=50-char label, not the full previous text',
    '- the embedding cache is shared across probes, so timings reflect a warm cache',
    `- poolRecall@${meta.candidatePool}: required gold in the stage-1 candidate pool or the prompt; the ceiling any reordering of the pool could reach`,
    '',
    '## Ranking quality (mean over probes)',
    '',
    table(
      ['system', ...ks.map(k => `recall@${k}`), 'MRR', ...ks.map(k => `nDCG@${k}`)],
      systems.map(s => [s, ...ks.map(k => metric(s, `recall@${k}`)), metric(s, 'mrr'), ...ks.map(k => metric(s, `ndcg@${k}`))]),
    ),
    '',
    '## All required gold found, and what lands in the prompt',
    '',
    table(
      ['system', ...ks.map(k => `allGold@${k}`), 'contextRecall', 'context tokens (approx)'],
      systems.map(s => [s, ...ks.map(k => metric(s, `allGold@${k}`)), metric(s, 'contextRecall'), metric(s, 'contextTokensApprox')]),
    ),
  );

  for (const cat of CATEGORIES) {
    const n = aggregates[systems[0]].byCategory[cat].n;
    if (!n) continue;
    lines.push(
      '', `## Category: ${cat} (n=${n})`, '',
      table(
        ['system', 'recall@5', 'nDCG@5', 'allGold@5', 'contextRecall', `poolRecall@${meta.candidatePool}`],
        systems.map(s => [s, metric(s, 'recall@5', cat), metric(s, 'ndcg@5', cat), metric(s, 'allGold@5', cat), metric(s, 'contextRecall', cat), metric(s, 'poolRecall', cat)]),
      ),
    );
  }
  lines.push('', ...transitionsSection(results), ...latencySection(results));
  return lines.join('\n') + '\n';
}

const STAGES = ['embedPassages', 'embedQuery', 'stage1', 'rerank', 'total'] as const;

function latencySection({ meta, systems, rows }: BenchResults): string[] {
  const ms = (n: number | undefined) => (n === undefined ? '-' : n < 10 ? n.toFixed(1) : String(Math.round(n)));
  const timed = systems.filter(s => rows.some(r => r.system === s && r.timingsMs));
  return [
    '## Latency per stage, ms (p50 / p95)',
    '',
    `- machine: ${meta.machine}`,
    '- warm-up excluded: each system runs one untimed probe first, so model loading is not counted',
    '- the embedding cache is shared, so embedding cost lands on whichever system embeds a text first; compare systems on the rerank column, not total',
    '',
    table(
      ['system', ...STAGES],
      timed.map(s => {
        const own = rows.filter(r => r.system === s && r.timingsMs);
        return [s, ...STAGES.map(stage => {
          const values = own.map(r => r.timingsMs![stage]).filter(v => v !== undefined);
          return `${ms(percentile(values, 50))} / ${ms(percentile(values, 95))}`;
        })];
      }),
    ),
  ];
}

const fixed = (n: number | undefined, digits: number) => (n === undefined ? '' : n.toFixed(digits));
const pad = (cells: string[], widths: number[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ');

/** Debug view of one retrieval: final order, gold marked with ★, plus gold that never reached the pool. */
export function renderTrace(trace: RetrievalTrace, probe: { gold: string[]; context: Set<string> }): string {
  const gold = new Set(probe.gold);
  const header = ['', 'final', 's1', 'Δ', 's1 score', 'rerank', 'sel', 'source', 'preview'];
  const body = trace.candidates.map(c => [
    gold.has(c.sourceId) ? '★' : '',
    String(c.finalRank ?? ''),
    String(c.stage1Rank),
    c.rankDelta === undefined ? '' : c.rankDelta > 0 ? `+${c.rankDelta}` : String(c.rankDelta),
    fixed(c.stage1Score, 3),
    fixed(c.rerankScore, 3),
    c.selected ? '✓' : '',
    c.sourceId,
    c.textPreview,
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...body.map(r => r[i].length)));
  const pooled = new Set(trace.candidates.map(c => c.sourceId));
  const outside = probe.gold.filter(id => !pooled.has(id)).map(id => `${id} (${probe.context.has(id) ? 'in window' : 'missed'})`);
  return [
    `query: ${trace.query}`,
    `reranker: ${trace.config.rerankerId ?? 'none'}  index=${trace.indexSize} excluded=${trace.excludedCount} pool=${trace.candidates.length} k=${trace.config.k}`,
    ...(trace.fallback ? [`fallback: ${trace.fallback}`] : []),
    pad(header, widths),
    ...body.map(r => pad(r, widths)),
    ...(outside.length ? [`gold outside the candidate pool: ${outside.join(', ')}`] : []),
  ].join('\n');
}

export async function traceProbe(options: RunOptions & { probeId: string }): Promise<string> {
  const scenario = options.dataset.scenarios.find(s => s.probes.some(p => p.id === options.probeId));
  if (!scenario) throw new Error(`no probe "${options.probeId}" in the ${options.split} split`);
  const probe = scenario.probes.find(p => p.id === options.probeId)!;
  const gold = probe.gold.map(g => g.sourceId);

  const sections = [`probe ${probe.id} (${probe.category}, ${probe.channel}): ${probe.text}`];
  for (const system of selectSystems(options)) {
    const out = await system.run({ scenario, probe });
    sections.push(out.trace
      ? `== ${system.name} (${out.ranked.length} sources ranked) ==\n${renderTrace(out.trace, { gold, context: out.context })}`
      : `== ${system.name}: no retrieval trace ==`);
  }
  return sections.join('\n\n');
}

export function writeResults(results: BenchResults, dir: string): { jsonPath: string; mdPath: string; latestPath: string } {
  mkdirSync(dir, { recursive: true });
  const stamp = results.meta.timestamp.replace(/[:.]/g, '-');
  const base = path.join(dir, `${results.meta.split}-${stamp}`);
  const md = renderMarkdown(results);
  writeFileSync(`${base}.json`, JSON.stringify(results, null, 2));
  writeFileSync(`${base}.md`, md);
  const latestPath = path.join(dir, `latest-${results.meta.split}.md`);
  writeFileSync(latestPath, md);
  return { jsonPath: `${base}.json`, mdPath: `${base}.md`, latestPath };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataPath = args.data ?? defaultDataPath(args.split);
  const dataset = loadDataset(dataPath, args.split);
  // Cross-encoders load lazily, so an unselected system never loads its model.
  const options: RunOptions = {
    dataset,
    split: args.split,
    embedder: new CachedEmbedder(new TransformersEmbedder()),
    k: args.k,
    window: args.window,
    candidatePool: config.memory.candidatePool,
    rerankers: { minilm: createReranker('minilm')!, 'bge-base': createReranker('bge-base')! },
    productionReranker: config.memory.reranker,
    // Needs the OpenRouter key; without it the dense+llm-select system is simply not offered.
    llmSelector: config.openRouterApiKey
      ? new LlmSelector(messages => generateText(messages, config.model, { temperature: 0 }), config.model, args.k)
      : undefined,
    systems: args.systems,
  };
  if (args.probe) {
    console.log(await traceProbe({ ...options, probeId: args.probe }));
    return;
  }
  const results = await runBenchmark(options);
  const written = writeResults(results, path.join(BENCH_DIR, 'results'));
  console.log(`wrote ${written.jsonPath}\nwrote ${written.mdPath}\nwrote ${written.latestPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
