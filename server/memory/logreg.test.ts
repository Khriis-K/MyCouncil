import { describe, expect, test } from 'vitest';
import { predict, trainLogReg } from './logreg';

// Two features, separable on the first; the second is noise.
const x = [[0, 5], [1, 3], [2, 4], [3, 1], [6, 2], [7, 5], [8, 3], [9, 4]];
const y = [0, 0, 0, 0, 1, 1, 1, 1];
const norm = (w: number[]) => Math.hypot(...w);

describe('trainLogReg', () => {
  test('converges on linearly separable data: accuracy 1', () => {
    const model = trainLogReg(x, y, { lambda: 0 });
    const predicted = x.map(row => (predict(model, row) > 0.5 ? 1 : 0));
    expect(predicted).toEqual(y);
  });

  test('is deterministic', () => {
    expect(trainLogReg(x, y, { lambda: 0.1 })).toEqual(trainLogReg(x, y, { lambda: 0.1 }));
  });

  test('L2 shrinks the weights', () => {
    const free = norm(trainLogReg(x, y, { lambda: 0 }).weights);
    const some = norm(trainLogReg(x, y, { lambda: 0.1 }).weights);
    const lots = norm(trainLogReg(x, y, { lambda: 1 }).weights);
    expect(some).toBeLessThan(free);
    expect(lots).toBeLessThan(some);
  });

  test('standardization is fitted on the training data and stored with the model', () => {
    const model = trainLogReg(x, y, { lambda: 0 });
    expect(model.means).toEqual([4.5, 3.375]);
    expect(model.stds[0]).toBeCloseTo(Math.sqrt(10.25));
    // A row far outside the training range doesn't refit anything: it is scaled by the stored stats.
    const before = structuredClone(model);
    predict(model, [100, -100]);
    expect(model).toEqual(before);
  });

  test('a constant feature gets std 1, not a division by zero', () => {
    const model = trainLogReg(x.map(r => [r[0], 7]), y, { lambda: 0 });
    expect(model.stds[1]).toBe(1);
    expect(model.weights.every(Number.isFinite)).toBe(true);
  });

  test('weights the positive class by neg/pos, so a rare positive still gets ranked first', () => {
    const rare = [[0], [1], [2], [3], [4], [5], [6], [9]];
    const model = trainLogReg(rare, [0, 0, 0, 0, 0, 0, 0, 1], { lambda: 0 });
    expect(predict(model, [9])).toBeGreaterThan(0.5);
  });

  test('throws when a class is missing', () => {
    expect(() => trainLogReg(x, y.map(() => 0), { lambda: 0 })).toThrow(/both classes/);
  });
});
