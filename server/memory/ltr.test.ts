import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { FEATURE_NAMES } from './features';
import { loadLtrWeights } from './ltr';

const dir = mkdtempSync(path.join(os.tmpdir(), 'ltr-'));
const zeros = FEATURE_NAMES.map(() => 0);
const valid = { featureNames: [...FEATURE_NAMES], means: zeros, stds: zeros.map(() => 1), weights: zeros, bias: 0, lambda: 0.1, training: {} };
const write = (name: string, content: unknown) => {
  const file = path.join(dir, name);
  writeFileSync(file, JSON.stringify(content));
  return file;
};

describe('loadLtrWeights', () => {
  test('loads weights trained on the current features', () => {
    expect(loadLtrWeights(write('ok.json', valid)).lambda).toBe(0.1);
  });

  test('refuses weights trained on other or reordered features', () => {
    const swapped = [...FEATURE_NAMES];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    expect(() => loadLtrWeights(write('swapped.json', { ...valid, featureNames: swapped }))).toThrow(/retrain/);
  });

  test('refuses a weight vector of the wrong length', () => {
    expect(() => loadLtrWeights(write('short.json', { ...valid, weights: [1] }))).toThrow(/weights/);
  });
});
