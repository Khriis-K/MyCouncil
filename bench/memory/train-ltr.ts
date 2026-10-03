import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../../server/config';
import { CachedEmbedder } from '../../server/memory/embedder';
import { FEATURE_NAMES } from '../../server/memory/features';
import { EPOCHS, LEARNING_RATE, predict, trainLogReg, type LogRegModel, type TrainOptions } from '../../server/memory/logreg';
import { LTR_WEIGHTS_FILE, LtrRanker, type LtrWeights } from '../../server/memory/ltr';
import { retrieveMemories } from '../../server/memory/pipeline';
import { createReranker } from '../../server/memory/reranker';
import { TransformersEmbedder } from '../../server/memory/transformersEmbedder';
import type { RetrievalTrace } from '../../server/memory/types';
import { mrr, ndcgAtK, recallAtK, type Gold } from './metrics';
import { gitInfo, sha256File } from './provenance';
import { rngFor, shuffle } from './rng';
import { defaultDataPath, loadDataset } from './run';
import { probeOrigin, probeQuery } from './systems';

export const LAMBDAS = [0, 0.01, 0.1, 1];
export const N_FOLDS = 4;
const CV_SEED = 'ltr-cv-v1';
const BASELINE = 'dense+rerank';

export interface Candidate {
  sourceId: string;
  stage1Rank: number;
  /** FEATURE_NAMES order */
  features: number[];
}

export interface ProbeRows {
  scenarioId: string;
  probeId: string;
  gold: Gold[];
  candidates: Candidate[];
}

export type CvMetrics = Record<'ndcg@5' | 'recall@5' | 'mrr', number>;

type Trainer = (x: number[][], y: number[], options: TrainOptions) => LogRegModel;

/** The test split is held out: nothing that isn't dev may reach training. */
export function assertDevOnly(scenarios: { id: string; split: string }[]): void {
  if (scenarios.length === 0) throw new Error('no scenarios to train on');
  const leaked = scenarios.filter(s => s.split !== 'dev');
  if (leaked.length) {
    throw new Error(`scenario(s) ${leaked.map(s => `${s.id} (${s.split})`).join(', ')} are not in the dev split: LTR trains on dev only`);
  }
}

/** Scenario-level folds: a scenario's probes share one timeline, so they must never straddle train and validation. */
export function groupedFolds(scenarioIds: string[], nFolds: number, seed: string): string[][] {
  if (scenarioIds.length < nFolds) throw new Error(`${nFolds} folds need at least ${nFolds} scenarios, got ${scenarioIds.length}`);
  const folds: string[][] = Array.from({ length: nFolds }, () => []);
  shuffle([...scenarioIds].sort(), rngFor(seed)).forEach((id, i) => folds[i % nFolds].push(id));
  return folds;
}

/** Sources best first: by score, ties by stage-1 rank, each source once (as the pipeline orders them). */
export function rankSources(candidates: Candidate[], scores: number[]): string[] {
  const order = candidates.map((c, i) => ({ c, score: scores[i] })).sort((a, b) => b.score - a.score || a.c.stage1Rank - b.c.stage1Rank);
  return [...new Set(order.map(({ c }) => c.sourceId))];
}

export function probeMetrics(ranked: string[], gold: Gold[]): CvMetrics {
  return { 'ndcg@5': ndcgAtK(ranked, gold, 5), 'recall@5': recallAtK(ranked, gold, 5), mrr: mrr(ranked, gold) };
}

function meanMetrics(list: CvMetrics[]): CvMetrics {
  const mean = (key: keyof CvMetrics) => list.reduce((sum, m) => sum + m[key], 0) / list.length;
  return { 'ndcg@5': mean('ndcg@5'), 'recall@5': mean('recall@5'), mrr: mean('mrr') };
}

/** Label 1: the candidate's source is gold with grade >= 1 (partially relevant counts). */
export function trainingSet(probes: ProbeRows[]): { x: number[][]; y: number[] } {
  const rows = probes.flatMap(p => {
    const gold = new Set(p.gold.filter(g => g.grade >= 1).map(g => g.sourceId));
    return p.candidates.map(c => ({ x: c.features, y: gold.has(c.sourceId) ? 1 : 0 }));
  });
  return { x: rows.map(r => r.x), y: rows.map(r => r.y) };
}

const inFold = (fold: string[]) => (p: ProbeRows) => fold.includes(p.scenarioId);
const probeKey = (p: { scenarioId: string; probeId: string }) => `${p.scenarioId}/${p.probeId}`;

/** Per fold: train on the other folds (z-scores included), then score the fold's probes. */
export function crossValidate(probes: ProbeRows[], folds: string[][], lambda: number, train: Trainer = trainLogReg): CvMetrics[] {
  return folds.map(fold => {
    const { x, y } = trainingSet(probes.filter(p => !inFold(fold)(p)));
    const model = train(x, y, { lambda });
    return meanMetrics(probes.filter(inFold(fold)).map(p =>
      probeMetrics(rankSources(p.candidates, p.candidates.map(c => predict(model, c.features))), p.gold)));
  });
}

/** An untrained system's metrics, averaged over the same folds. */
export function baselineFolds(probes: ProbeRows[], folds: string[][], perProbe: Map<string, CvMetrics>): CvMetrics[] {
  return folds.map(fold => meanMetrics(probes.filter(inFold(fold)).map(p => perProbe.get(probeKey(p))!)));
}

/** Best mean nDCG@5; on a tie, the stronger penalty (the simpler model). */
export function chooseLambda(results: { lambda: number; ndcg: number }[]): number {
  return [...results].sort((a, b) => b.ndcg - a.ndcg || b.lambda - a.lambda)[0].lambda;
}

const f = (n: number) => n.toFixed(3);
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(3)}`;
const table = (headers: string[], body: string[][]) =>
  [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...body.map(r => `| ${r.join(' | ')} |`)].join('\n');

interface CvReport {
  cv: { lambda: number; folds: CvMetrics[] }[];
  baseline: CvMetrics[];
  folds: string[][];
  weights: LtrWeights;
}

export function renderCvReport({ cv, baseline, folds, weights }: CvReport): string {
  const t = weights.training;
  const chosen = cv.find(r => r.lambda === weights.lambda)!;
  const keys: (keyof CvMetrics)[] = ['ndcg@5', 'recall@5', 'mrr'];
  return [
    '# LTR: grouped cross-validation on dev',
    '',
    `- generated: ${t.date}`,
    `- ${N_FOLDS} folds grouped by scenario (seed \`${CV_SEED}\`): ${folds.map(fold => `[${fold.join(', ')}]`).join(' ')}`,
    `- ${t.nScenarios} scenarios, ${t.nProbes} probes; training rows: ${t.nPositives} positive, ${t.nNegatives} negative (positive = gold with grade >= 1)`,
    `- candidates: the dense top ${t.candidatePool} ∪ the BM25 top ${t.candidatePool}; ${BASELINE} ranks the dense top ${t.candidatePool} with ${t.crossEncoderId}`,
    `- each cell is the mean over folds of the per-fold mean over probes`,
    `- lambda picked by mean CV nDCG@5. The chosen lambda's CV score is slightly optimistic: it was selected on these same folds`,
    `- ${folds[0].length} scenarios per validation fold: the per-fold numbers are noisy, read the spread before the mean`,
    '',
    '## CV by lambda',
    '',
    table(
      ['system', ...keys, 'nDCG@5 per fold'],
      [
        ...cv.map(r => [`ltr λ=${r.lambda}${r.lambda === weights.lambda ? ' (chosen)' : ''}`, ...keys.map(k => f(meanMetrics(r.folds)[k])), r.folds.map(m => f(m['ndcg@5'])).join(', ')]),
        [BASELINE, ...keys.map(k => f(meanMetrics(baseline)[k])), baseline.map(m => f(m['ndcg@5'])).join(', ')],
      ],
    ),
    '',
    `## Chosen ltr (λ=${weights.lambda}) − ${BASELINE}, per fold`,
    '',
    table(['fold', ...keys], chosen.folds.map((m, i) => [String(i + 1), ...keys.map(k => signed(m[k] - baseline[i][k]))])),
    '',
    '## Final model: trained on all of dev',
    '',
    '- weights act on z-scored features, so their sizes are comparable; the sign is the direction of the effect',
    '',
    table(['feature', 'weight', 'train mean', 'train std'], FEATURE_NAMES.map((name, i) =>
      [name, signed(weights.weights[i]), f(weights.means[i]), f(weights.stds[i])])),
    '',
    `- bias: ${signed(weights.bias)}`,
    '',
    '## Provenance',
    '',
    `- dataset: ${t.datasetPath} (sha256 ${t.datasetSha256})`,
    `- git: ${t.gitSha}${t.gitDirty ? ' (uncommitted changes)' : ''}`,
    `- embedder: ${t.embedderId}; cross-encoder: ${t.crossEncoderId}`,
    `- gradient descent: learning rate ${t.learningRate}, ${t.epochs} epochs, zero init, positive weight neg/pos`,
  ].join('\n') + '\n';
}

const BENCH_DIR = import.meta.dirname;
const REPO_ROOT = path.resolve(BENCH_DIR, '../..');

function assertScored(trace: RetrievalTrace) {
  if (trace.fallback) throw new Error(`${trace.config.rerankerId}: ${trace.fallback}`);
}

async function main() {
  const dataPath = defaultDataPath('dev');
  const dataset = loadDataset(dataPath, 'dev');
  assertDevOnly(dataset.scenarios);

  const { k, candidatePool } = config.memory;
  const embedder = new CachedEmbedder(new TransformersEmbedder());
  const crossEncoder = createReranker('minilm')!;
  // A zero model: its scores are ignored, it is only here to read the product's own feature vectors from the trace.
  const collector = new LtrRanker(crossEncoder, {
    means: FEATURE_NAMES.map(() => 0), stds: FEATURE_NAMES.map(() => 1), weights: FEATURE_NAMES.map(() => 0), bias: 0,
  });

  const probes: ProbeRows[] = [];
  const baseline = new Map<string, CvMetrics>();
  for (const scenario of dataset.scenarios) {
    for (const probe of scenario.probes) {
      const common = {
        query: probeQuery({ scenario, probe }), sources: scenario.timeline, excludeSourceIds: [], k, candidatePool, embedder, endpoint: 'bench' as const,
      };
      const { trace } = await retrieveMemories({ ...common, reranker: collector, origin: probeOrigin(probe) });
      assertScored(trace);
      const rows = { scenarioId: scenario.id, probeId: probe.id, gold: probe.gold };
      probes.push({ ...rows, candidates: trace.candidates.map(c => ({ sourceId: c.sourceId, stage1Rank: c.stage1Rank, features: c.ltrFeatures! })) });

      const dense = await retrieveMemories({ ...common, stage1: 'dense', reranker: crossEncoder });
      assertScored(dense.trace);
      baseline.set(probeKey(rows), probeMetrics([...new Set(dense.trace.candidates.map(c => c.sourceId))], probe.gold));
    }
    console.log(`features: ${scenario.id}`);
  }

  const folds = groupedFolds(dataset.scenarios.map(s => s.id), N_FOLDS, CV_SEED);
  const cv = LAMBDAS.map(lambda => ({ lambda, folds: crossValidate(probes, folds, lambda) }));
  const lambda = chooseLambda(cv.map(r => ({ lambda: r.lambda, ndcg: meanMetrics(r.folds)['ndcg@5'] })));

  const { x, y } = trainingSet(probes);
  const model = trainLogReg(x, y, { lambda });
  const git = gitInfo();
  const date = new Date().toISOString();
  const weights: LtrWeights = {
    featureNames: [...FEATURE_NAMES],
    ...model,
    lambda,
    training: {
      split: 'dev',
      datasetPath: path.relative(REPO_ROOT, dataPath).split(path.sep).join('/'),
      datasetSha256: sha256File(dataPath),
      gitSha: git.sha,
      gitDirty: git.dirty,
      date,
      nScenarios: dataset.scenarios.length,
      nProbes: probes.length,
      nPositives: y.filter(v => v === 1).length,
      nNegatives: y.filter(v => v === 0).length,
      embedderId: embedder.id,
      crossEncoderId: crossEncoder.id,
      candidatePool,
      learningRate: LEARNING_RATE,
      epochs: EPOCHS,
      folds: N_FOLDS,
      cvSeed: CV_SEED,
    },
  };
  writeFileSync(LTR_WEIGHTS_FILE, JSON.stringify(weights, null, 2) + '\n');

  const report = renderCvReport({ cv, baseline: baselineFolds(probes, folds, baseline), folds, weights });
  const dir = path.join(BENCH_DIR, 'results');
  mkdirSync(dir, { recursive: true });
  const reportPath = path.join(dir, `ltr-cv-dev-${date.replace(/[:.]/g, '-')}.md`);
  writeFileSync(reportPath, report);
  writeFileSync(path.join(dir, 'latest-ltr-cv.md'), report);
  console.log(`wrote ${LTR_WEIGHTS_FILE}\nwrote ${reportPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
