// L2-regularized logistic regression, batch gradient descent. No dependencies, fully deterministic.

export interface LogRegModel {
  /** z-score stats, fitted on the training rows only */
  means: number[];
  stds: number[];
  /** on standardized features */
  weights: number[];
  bias: number;
}

export interface TrainOptions {
  lambda: number;
}

export const LEARNING_RATE = 0.1;
export const EPOCHS = 2000;

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

function fitStandardizer(x: number[][]): { means: number[]; stds: number[] } {
  const n = x.length;
  const means = x[0].map((_, j) => x.reduce((sum, row) => sum + row[j], 0) / n);
  const stds = means.map((mean, j) => {
    const std = Math.sqrt(x.reduce((sum, row) => sum + (row[j] - mean) ** 2, 0) / n);
    // A constant feature carries no signal; std 1 keeps it at 0 instead of dividing by zero.
    return std > 0 ? std : 1;
  });
  return { means, stds };
}

const standardize = (row: number[], { means, stds }: { means: number[]; stds: number[] }) =>
  row.map((v, j) => (v - means[j]) / stds[j]);

const logit = (model: LogRegModel, z: number[]) => z.reduce((sum, v, j) => sum + v * model.weights[j], model.bias);

/** P(relevant) for one raw (unstandardized) feature row. */
export function predict(model: LogRegModel, row: number[]): number {
  return sigmoid(logit(model, standardize(row, model)));
}

/**
 * Minimizes the class-weighted mean log loss + (lambda / 2)·‖w‖² (the bias is not penalized).
 * Positives weigh neg/pos, so both classes count equally in total. Zero init, fixed steps.
 */
export function trainLogReg(x: number[][], y: number[], { lambda }: TrainOptions): LogRegModel {
  const nPos = y.filter(v => v === 1).length;
  const nNeg = y.length - nPos;
  if (nPos === 0 || nNeg === 0) throw new Error(`need both classes to train, got ${nPos} positives and ${nNeg} negatives`);

  const stats = fitStandardizer(x);
  const z = x.map(row => standardize(row, stats));
  const sampleWeight = y.map(v => (v === 1 ? nNeg / nPos : 1));
  const totalWeight = sampleWeight.reduce((a, b) => a + b, 0);
  const model: LogRegModel = { ...stats, weights: new Array(x[0].length).fill(0), bias: 0 };

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const gradW = model.weights.map(w => lambda * w);
    let gradB = 0;
    z.forEach((row, i) => {
      const err = (sampleWeight[i] * (sigmoid(logit(model, row)) - y[i])) / totalWeight;
      row.forEach((v, j) => { gradW[j] += err * v; });
      gradB += err;
    });
    model.weights = model.weights.map((w, j) => w - LEARNING_RATE * gradW[j]);
    model.bias -= LEARNING_RATE * gradB;
  }
  return model;
}
