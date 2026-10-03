import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../../server/config';
import { CachedEmbedder, type Embedder } from '../../server/memory/embedder';
import { TransformersEmbedder } from '../../server/memory/transformersEmbedder';
import { allGoldAtK, contextRecall, contextTokens, METRIC_KS, mrr, ndcgAtK, recallAtK } from './metrics';
import { datasetSchema, type Dataset } from './schema';
import { createSystems } from './systems';

const BENCH_DIR = import.meta.dirname;
const CATEGORIES = ['explicit', 'implicit', 'multi', 'update'] as const;

export interface CliArgs {
  split: string;
  systems?: string[];
  k: number;
  window: number;
  data?: string;
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
    if (flag === '--split' && value) args.split = value;
    else if (flag === '--systems' && value) args.systems = value.split(',');
    else if (flag === '--k') args.k = number(flag, value);
    else if (flag === '--window') args.window = number(flag, value);
    else if (flag === '--data' && value) args.data = value;
    else throw new Error(`unknown or incomplete flag: ${flag}`);
  }
  return args;
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
  meta: { split: string; timestamp: string; datasetVersion: string; embedderId: string; k: number; window: number; candidatePool: number };
  systems: string[];
  rows: ResultRow[];
  aggregates: Record<string, { overall: Aggregate; byCategory: Record<string, Aggregate> }>;
}

export interface RunOptions {
  dataset: Dataset;
  split: string;
  embedder: Embedder;
  k: number;
  window: number;
  candidatePool: number;
  systems?: string[];
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
  const all = createSystems({ embedder, k, window, candidatePool });
  const unknown = (options.systems ?? []).filter(name => !all.some(s => s.name === name));
  if (unknown.length) throw new Error(`unknown system(s): ${unknown.join(', ')} (available: ${all.map(s => s.name).join(', ')})`);
  const systems = options.systems ? all.filter(s => options.systems!.includes(s.name)) : all;

  // Load models before anything is timed.
  await embedder.embedPassages(['warm up']);
  await embedder.embedQueries(['warm up']);

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
    meta: { split, timestamp: new Date().toISOString(), datasetVersion: dataset.version, embedderId: embedder.id, k, window, candidatePool },
    systems: systems.map(s => s.name),
    rows,
    aggregates,
  };
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
    `- settings: k=${meta.k}, window=${meta.window}, candidatePool=${meta.candidatePool}`,
    `- probes per system: ${aggregates[systems[0]]?.overall.n ?? 0}`,
    '- token counts are approximate (context chars / 4)',
    '- existing-context is an upper bound on today\'s prompts: debate resets when the overlay closes, and refinement really carries only a <=50-char label, not the full previous text',
    '- the embedding cache is shared across probes, so timings reflect a warm cache',
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
        ['system', 'recall@5', 'nDCG@5', 'allGold@5', 'contextRecall'],
        systems.map(s => [s, metric(s, 'recall@5', cat), metric(s, 'ndcg@5', cat), metric(s, 'allGold@5', cat), metric(s, 'contextRecall', cat)]),
      ),
    );
  }
  return lines.join('\n') + '\n';
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
  const dataPath = args.data ?? path.join(BENCH_DIR, 'data', `${args.split}.json`);
  const dataset = loadDataset(dataPath, args.split);
  const results = await runBenchmark({
    dataset,
    split: args.split,
    embedder: new CachedEmbedder(new TransformersEmbedder()),
    k: args.k,
    window: args.window,
    candidatePool: config.memory.candidatePool,
    systems: args.systems,
  });
  const written = writeResults(results, path.join(BENCH_DIR, 'results'));
  console.log(`wrote ${written.jsonPath}\nwrote ${written.mdPath}\nwrote ${written.latestPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
