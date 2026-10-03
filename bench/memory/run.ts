import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../../server/config';
import { generateText } from '../../server/llm';
import { CachedEmbedder } from '../../server/memory/embedder';
import { FEATURE_NAMES } from '../../server/memory/features';
import { createLtrRanker, LTR_WEIGHTS_FILE } from '../../server/memory/ltr';
import { LlmSelector } from '../../server/memory/llmSelector';
import { createProductionSelector } from '../../server/memory/productionSelector';
import { createReranker } from '../../server/memory/reranker';
import type { RetrievalTrace } from '../../server/memory/types';
import { TransformersEmbedder } from '../../server/memory/transformersEmbedder';
import { BOOTSTRAP, clusterBootstrap, comparisonPairs, pairedDiffs, percentile, type Interval } from './bootstrap';
import { allGoldAtK, contextRecall, contextTokens, METRIC_KS, mrr, ndcgAtK, recallAtK } from './metrics';
import { appendTestRun, configHash, gitInfo, readTestRuns, sha256File } from './provenance';
import { datasetSchema, type Dataset } from './schema';
import { DISTANCE_BUCKETS, goldAttributes, meanAggregate, sliceAggregates, type Aggregate, type Slices } from './slices';
import { createSystems, productionRerankerOf, type System, type SystemOptions } from './systems';

export { percentile };
export type { Aggregate };

const BENCH_DIR = import.meta.dirname;
const REPO_ROOT = path.resolve(BENCH_DIR, '../..');
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
  /** required for the held-out test split */
  final?: boolean;
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
    } else if (flag === '--final') {
      args.final = true;
      i--;
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
  if (args.split === 'test' && !args.final) {
    throw new Error('the test split is held out: tune on dev, and run test once with --final (it is logged in results/test-runs.log)');
  }
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
  /** the gold turn's channel and counselor/pair match the probe's */
  sameChannel: boolean;
  /** user turns after the gold turn */
  distance: number;
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

export interface Provenance {
  datasetPath: string | null;
  datasetSha256: string | null;
  embedderId: string;
  rerankerIds: Record<string, string>;
  llmSelectorId: string | null;
  memoryConfig: typeof config.memory;
  git: { sha: string; dirty: boolean };
  node: string;
  cpu: string;
  timestamp: string;
}

export interface Comparison extends Interval {
  a: string;
  b: string;
  metric: string;
}

export interface BenchResults {
  meta: {
    split: string; timestamp: string; datasetVersion: string; embedderId: string; rerankerId: string | null; llmSelectorId?: string;
    k: number; window: number; candidatePool: number; machine: string;
    provenance: Provenance;
    /** set when the ltr system ran: its learned weights on z-scored features, by feature name */
    ltr?: { id: string; bias: number; weights: Record<string, number> };
  };
  systems: string[];
  rows: ResultRow[];
  aggregates: Record<string, { overall: Aggregate; byCategory: Record<string, Aggregate>; slices: Slices }>;
  /** paired cluster bootstrap of A − B, resampling scenarios */
  bootstrap: { iterations: number; seed: number; comparisons: Comparison[] };
}

export interface RunOptions extends SystemOptions {
  dataset: Dataset;
  /** recorded with its sha256 in the provenance */
  datasetPath?: string;
  split: string;
  systems?: string[];
}

function selectSystems(options: RunOptions): System[] {
  const all = createSystems(options);
  const unknown = (options.systems ?? []).filter(name => !all.some(s => s.name === name));
  if (unknown.length) throw new Error(`unknown system(s): ${unknown.join(', ')} (available: ${all.map(s => s.name).join(', ')})`);
  return options.systems ? all.filter(s => options.systems!.includes(s.name)) : all;
}

const BOOTSTRAP_METRICS = ['recall@5', 'mrr', 'ndcg@5', 'allGold@5', 'contextRecall'] as const;

export function bootstrapComparisons(rows: ResultRow[], systems: string[]): Comparison[] {
  return comparisonPairs(systems).flatMap(([a, b]) =>
    BOOTSTRAP_METRICS.map(metric => ({ a, b, metric, ...clusterBootstrap(pairedDiffs(rows, a, b, metric), BOOTSTRAP) })));
}

function collectProvenance(options: RunOptions, timestamp: string): Provenance {
  return {
    datasetPath: options.datasetPath ? path.relative(REPO_ROOT, options.datasetPath).split(path.sep).join('/') : null,
    datasetSha256: options.datasetPath ? sha256File(options.datasetPath) : null,
    embedderId: options.embedder.id,
    rerankerIds: {
      ...Object.fromEntries(Object.entries(options.rerankers).map(([name, r]) => [name, r.id])),
      ...(options.ltr && { ltr: options.ltr.id }),
    },
    llmSelectorId: options.llmSelector?.id ?? null,
    memoryConfig: config.memory,
    git: gitInfo(),
    node: process.version,
    cpu: os.cpus()[0]?.model ?? 'unknown',
    timestamp,
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
      const attributes = goldAttributes(scenario, probe);
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
          goldRanks: probe.gold.map((g, i) => {
            const index = out.ranked.indexOf(g.sourceId);
            const { sameChannel, distance } = attributes[i];
            return { ...g, rank: index === -1 ? null : index + 1, inContext: out.context.has(g.sourceId), sameChannel, distance };
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
      overall: meanAggregate(own),
      byCategory: Object.fromEntries(CATEGORIES.map(c => [c, meanAggregate(own.filter(r => r.category === c))])),
      slices: sliceAggregates(own),
    };
  }

  const timestamp = new Date().toISOString();
  const names = systems.map(s => s.name);
  return {
    meta: {
      split, timestamp, datasetVersion: dataset.version, embedderId: embedder.id,
      rerankerId: productionRerankerOf(options)?.id ?? null,
      llmSelectorId: options.llmSelector?.id,
      k, window, candidatePool, machine: os.cpus()[0]?.model ?? 'unknown',
      provenance: collectProvenance(options, timestamp),
      ...(options.ltr && names.includes('ltr') && {
        ltr: {
          id: options.ltr.id,
          bias: options.ltr.model.bias,
          weights: Object.fromEntries(FEATURE_NAMES.map((name, i) => [name, options.ltr!.model.weights[i]])),
        },
      }),
    },
    systems: names,
    rows,
    aggregates,
    bootstrap: { ...BOOTSTRAP, comparisons: bootstrapComparisons(rows, names) },
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
    `### Per-probe changes vs ${BASELINE} (contextRecall)`,
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
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(3)}`;
const cell = (agg: Aggregate, key: string) => (agg.n ? f(agg.metrics[key]) : '-');
const table = (headers: string[], body: string[][]) =>
  [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...body.map(r => `| ${r.join(' | ')} |`)].join('\n');

export function renderMarkdown(results: BenchResults): string {
  const { meta, systems, aggregates } = results;
  const ks = METRIC_KS;
  const metric = (name: string, key: string) => cell(aggregates[name].overall, key);

  const lines = [`# Memory benchmark: ${meta.split}`, ''];
  if (meta.split === 'fixture') {
    lines.push('> Fixture run: this only proves the harness works. Three hand-written scenarios say nothing about retrieval quality. Do not quote these numbers.', '');
  }
  lines.push(
    `- generated: ${meta.timestamp}`,
    `- dataset version: ${meta.datasetVersion}`,
    `- embedder: ${meta.embedderId}`,
    `- memory-production reranker: ${meta.rerankerId ?? 'none'}`,
    ...(meta.llmSelectorId ? [`- dense+llm-select selector: ${meta.llmSelectorId} (temperature 0, live API calls: rerank latency includes the network); dense-top2+llm-select keeps the dense top 2 and lets the selector fill the rest`] : []),
    `- settings: k=${meta.k}, window=${meta.window}, candidatePool=${meta.candidatePool}`,
    `- probes per system: ${aggregates[systems[0]]?.overall.n ?? 0}`,
    '- token counts are approximate (context chars / 4)',
    '- existing-context is an upper bound on today\'s prompts: debate resets when the overlay closes, and refinement really carries only a <=50-char label, not the full previous text',
    '- the embedding cache is shared across probes, so timings reflect a warm cache',
    `- poolRecall@${meta.candidatePool}: required gold in the stage-1 candidate pool or the prompt; the ceiling any reordering of the pool could reach`,
    '- every metric at every cutoff is in the JSON; these tables show a subset',
    '',
    '## Headline (mean over probes)',
    '',
    table(
      ['system', ...ks.map(k => `recall@${k}`), 'MRR', 'nDCG@5', 'allGold@5', 'contextRecall', 'context tokens (approx)'],
      systems.map(s => [s, ...ks.map(k => metric(s, `recall@${k}`)), metric(s, 'mrr'), metric(s, 'ndcg@5'), metric(s, 'allGold@5'), metric(s, 'contextRecall'), metric(s, 'contextTokensApprox')]),
    ),
    '',
    '## Slices',
    '',
  );

  for (const cat of CATEGORIES) {
    const n = aggregates[systems[0]].byCategory[cat].n;
    if (!n) continue;
    lines.push(
      `### Category: ${cat} (n=${n})`, '',
      table(
        ['system', 'recall@5', 'nDCG@5', 'allGold@5', 'contextRecall', `poolRecall@${meta.candidatePool}`],
        systems.map(s => [s, ...['recall@5', 'ndcg@5', 'allGold@5', 'contextRecall', 'poolRecall'].map(key => cell(aggregates[s].byCategory[cat], key))]),
      ),
      '',
    );
  }
  lines.push(
    ...channelSection(results), ...distanceSection(results), ...transitionsSection(results),
    ...bootstrapSection(results), ...ltrSection(results), ...latencySection(results), '', ...provenanceSection(results),
  );
  return lines.join('\n') + '\n';
}

function channelSection({ systems, aggregates }: BenchResults): string[] {
  return [
    '### Same-channel vs cross-channel',
    '',
    '- same-channel: the gold turn has the probe\'s channel and counselor (chat) or pair (debate)',
    '- recall@5 and contextRecall count each required gold once; MRR, nDCG@5 and allGold@5 count probes, a probe being cross-channel if any of its required gold is',
    '',
    table(
      ['system', 'slice', 'gold', 'recall@5', 'contextRecall', 'probes', 'MRR', 'nDCG@5', 'allGold@5'],
      systems.flatMap(s => (['same', 'cross'] as const).map(slice => {
        const { gold, probe } = aggregates[s].slices.channel[slice];
        return [s, slice, String(gold.n), cell(gold, 'recall@5'), cell(gold, 'contextRecall'), String(probe.n), cell(probe, 'mrr'), cell(probe, 'ndcg@5'), cell(probe, 'allGold@5')];
      })),
    ),
    '',
  ];
}

function distanceSection({ systems, aggregates }: BenchResults): string[] {
  const first = aggregates[systems[0]].slices.distance;
  return [
    '### Distance: user turns since the gold turn',
    '',
    '- per required gold; each cell is recall@5 / contextRecall',
    '',
    table(
      ['system', ...DISTANCE_BUCKETS.map(b => `${b} (n=${first[b].n})`)],
      systems.map(s => [s, ...DISTANCE_BUCKETS.map(b => {
        const agg = aggregates[s].slices.distance[b];
        return agg.n ? `${f(agg.metrics['recall@5'])} / ${f(agg.metrics.contextRecall)}` : '-';
      })]),
    ),
    '',
  ];
}

const BOOTSTRAP_LABELS: Record<(typeof BOOTSTRAP_METRICS)[number], string> = {
  'recall@5': 'recall@5', mrr: 'MRR', 'ndcg@5': 'nDCG@5', 'allGold@5': 'allGold@5', contextRecall: 'contextRecall',
};

function bootstrapSection({ systems, bootstrap }: BenchResults): string[] {
  const { comparisons } = bootstrap;
  if (comparisons.length === 0) return [];
  return [
    '## Paired bootstrap: A − B, 95% CI',
    '',
    `- scenarios are resampled with replacement (probes in one scenario share a timeline, so they are not independent); B=${bootstrap.iterations}, seed=${bootstrap.seed}`,
    `- each cell: mean over probes of A − B [2.5th, 97.5th percentile]; * marks a CI that excludes 0; ${comparisons[0].nScenarios} scenarios, ${comparisons[0].nProbes} probes`,
    '',
    table(
      ['A', 'B', ...BOOTSTRAP_METRICS.map(m => BOOTSTRAP_LABELS[m])],
      comparisonPairs(systems).map(([a, b]) => [a, b, ...BOOTSTRAP_METRICS.map(m => {
        const c = comparisons.find(x => x.a === a && x.b === b && x.metric === m)!;
        return `${signed(c.meanDiff)} [${signed(c.lo)}, ${signed(c.hi)}]${c.lo > 0 || c.hi < 0 ? '*' : ''}`;
      })]),
    ),
    '',
  ];
}

function ltrSection({ meta }: BenchResults): string[] {
  if (!meta.ltr) return [];
  return [
    '## LTR weights (standardized)',
    '',
    `- ranker: ${meta.ltr.id}`,
    '- ltr was trained on the whole dev split, so its dev numbers here are in-sample and optimistic: read results/latest-ltr-cv.md for the honest dev estimate, and the test split for the held-out comparison',
    '- weights act on z-scored features, so their sizes are comparable; the sign is the direction of the effect',
    '',
    table(['feature', 'weight'], Object.entries(meta.ltr.weights).map(([name, w]) => [name, signed(w)])),
    '',
    `- bias: ${signed(meta.ltr.bias)}`,
    '',
  ];
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

function provenanceSection({ meta, bootstrap }: BenchResults): string[] {
  const p = meta.provenance;
  return [
    '## Provenance',
    '',
    `- dataset: ${p.datasetPath ?? 'unknown'} (sha256 ${p.datasetSha256 ?? 'unknown'})`,
    `- embedder: ${p.embedderId}`,
    `- rerankers: ${Object.entries(p.rerankerIds).map(([name, id]) => `${name}=${id}`).join(', ')}`,
    `- llm selector: ${p.llmSelectorId ?? 'none'}`,
    `- memory config: \`${JSON.stringify(p.memoryConfig)}\``,
    `- git: ${p.git.sha}${p.git.dirty ? ' (uncommitted changes)' : ''}`,
    `- node ${p.node}, cpu: ${p.cpu}`,
    `- timestamp: ${p.timestamp}`,
    `- bootstrap: B=${bootstrap.iterations}, seed=${bootstrap.seed}`,
  ];
}

const fixed = (n: number | undefined, digits: number) => (n === undefined ? '' : n.toFixed(digits));
const pad = (cells: string[], widths: number[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ');

/** Debug view of one retrieval: final order, gold marked with ★, plus gold that never reached the pool. */
export function renderTrace(trace: RetrievalTrace, probe: { gold: string[]; context: Set<string> }): string {
  const gold = new Set(probe.gold);
  const header = ['', 'final', 's1', 'Δ', 's1 score', 'dense', 'bm25', 'bm25 score', 'rerank', 'sel', 'source', 'preview'];
  const body = trace.candidates.map(c => [
    gold.has(c.sourceId) ? '★' : '',
    String(c.finalRank ?? ''),
    String(c.stage1Rank),
    c.rankDelta === undefined ? '' : c.rankDelta > 0 ? `+${c.rankDelta}` : String(c.rankDelta),
    fixed(c.stage1Score, 3),
    String(c.denseRank ?? ''),
    String(c.bm25Rank ?? ''),
    fixed(c.bm25Score, 3),
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
    `stage1: ${trace.config.stage1}  reranker: ${trace.config.rerankerId ?? 'none'}  index=${trace.indexSize} excluded=${trace.excludedCount} pool=${trace.candidates.length} k=${trace.config.k}`,
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

const TEST_RUN_LOG = path.join(BENCH_DIR, 'results', 'test-runs.log');

/** Logged before the run starts, so a crashed or abandoned test run still counts. */
function logTestRun(args: CliArgs, dataPath: string) {
  const previous = readTestRuns(TEST_RUN_LOG);
  if (previous.length) {
    const bar = '!'.repeat(78);
    console.warn(`${bar}\n! The held-out test split has already been run ${previous.length} time(s); see ${TEST_RUN_LOG}.\n! Every extra run spends the held-out data. Do not tune on these numbers.\n${bar}`);
  }
  const hash = configHash({
    memory: config.memory, k: args.k, window: args.window, systems: args.systems ?? 'all', probe: args.probe ?? null,
    // the LLM selector systems run only with a key, and use the chat model
    llmModel: config.openRouterApiKey ? config.model : null, dataset: sha256File(dataPath),
  });
  const { sha, dirty } = gitInfo();
  appendTestRun(TEST_RUN_LOG, { timestamp: new Date().toISOString(), gitSha: sha, dirty, configHash: hash });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataPath = args.data ?? defaultDataPath(args.split);
  const dataset = loadDataset(dataPath, args.split);
  // Cross-encoders load lazily, so an unselected system never loads its model.
  const complete = (messages: Parameters<typeof generateText>[0]) => generateText(messages, config.model, { temperature: 0 });
  // Needs the OpenRouter key; without it the LLM selector systems are simply not offered.
  const llm = Boolean(config.openRouterApiKey);
  const minilm = createReranker('minilm')!;
  const options: RunOptions = {
    dataset,
    split: args.split,
    embedder: new CachedEmbedder(new TransformersEmbedder()),
    k: args.k,
    window: args.window,
    candidatePool: config.memory.candidatePool,
    rerankers: { minilm, 'bge-base': createReranker('bge-base')! },
    productionReranker: config.memory.reranker,
    productionStage1: config.memory.stage1,
    llmSelector: llm ? new LlmSelector(complete, config.model, args.k) : undefined,
    // No timeout: the bench measures the full call; production caps it with config.memory.selectorTimeoutMs.
    hybridSelector: llm ? createProductionSelector(args.k) : undefined,
    // Until the ranker is trained there are no weights, and the ltr system is simply not offered.
    ltr: existsSync(LTR_WEIGHTS_FILE) ? createLtrRanker(LTR_WEIGHTS_FILE, minilm) : undefined,
    systems: args.systems,
    datasetPath: dataPath,
  };
  if (args.split === 'test') logTestRun(args, dataPath);
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
