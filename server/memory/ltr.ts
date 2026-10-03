import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FEATURE_NAMES, featureVector, type CandidateSignals } from './features';
import { predict, type LogRegModel } from './logreg';
import { CrossEncoderReranker, type Reranker } from './reranker';
import { RERANKER_MODELS } from './models';

/** Written by `npm run bench:memory:train-ltr`; trained on the dev split only. */
export const LTR_WEIGHTS_FILE = path.join(import.meta.dirname, 'ltrWeights.json');

/** Provenance of a trained model, written by the training script. */
export interface LtrTraining {
  split: 'dev';
  datasetPath: string;
  datasetSha256: string;
  gitSha: string;
  gitDirty: boolean;
  date: string;
  nScenarios: number;
  nProbes: number;
  nPositives: number;
  nNegatives: number;
  embedderId: string;
  crossEncoderId: string;
  candidatePool: number;
  learningRate: number;
  epochs: number;
  folds: number;
  cvSeed: string;
}

export interface LtrWeights extends LogRegModel {
  featureNames: string[];
  lambda: number;
  training: LtrTraining;
}

/** Everything a feature needs except the cross-encoder score, which the ranker computes. */
export type LtrCandidate = Omit<CandidateSignals, 'ceScore'> & { text: string };

/**
 * Stage 2 by learned score fusion: logistic regression over both stage-1 signals, the cross-encoder and context.
 * Its pool is the dense top n plus the BM25 top n, so the cross-encoder scores up to 2n candidates per query.
 */
export class LtrRanker {
  readonly id: string;

  constructor(readonly crossEncoder: Reranker, readonly model: LogRegModel) {
    const hash = createHash('sha256').update(JSON.stringify(model)).digest('hex').slice(0, 8);
    this.id = `ltr@${hash}+${crossEncoder.id}`;
  }

  /** P(relevant) per candidate, same order, plus the raw feature vectors (FEATURE_NAMES order). */
  async score(query: string, candidates: LtrCandidate[]): Promise<{ scores: number[]; features: number[][] }> {
    const ce = await this.crossEncoder.score(query, candidates.map(c => c.text));
    if (ce.length !== candidates.length) throw new Error(`expected ${candidates.length} cross-encoder scores, got ${ce.length}`);
    const features = candidates.map((c, i) => featureVector({ ...c, ceScore: ce[i] }));
    return { scores: features.map(row => predict(this.model, row)), features };
  }
}

export function loadLtrWeights(file: string): LtrWeights {
  const weights = JSON.parse(readFileSync(file, 'utf8')) as LtrWeights;
  // Weights are positional: a reordered or renamed feature would silently score garbage.
  if (JSON.stringify(weights.featureNames) !== JSON.stringify(FEATURE_NAMES)) {
    throw new Error(`${file} was trained on features [${weights.featureNames}], expected [${FEATURE_NAMES}]; retrain with npm run bench:memory:train-ltr`);
  }
  for (const key of ['means', 'stds', 'weights'] as const) {
    if (weights[key]?.length !== FEATURE_NAMES.length) throw new Error(`${file}: ${key} needs ${FEATURE_NAMES.length} values`);
  }
  return weights;
}

/** The trained ranker; pass a cross-encoder only to share an already-loaded MiniLM, the one it was trained with. */
export function createLtrRanker(file = LTR_WEIGHTS_FILE, crossEncoder: Reranker = new CrossEncoderReranker(RERANKER_MODELS.minilm)): LtrRanker {
  const { means, stds, weights, bias } = loadLtrWeights(file);
  return new LtrRanker(crossEncoder, { means, stds, weights, bias });
}
