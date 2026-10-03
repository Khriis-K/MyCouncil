import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { FEATURE_NAMES } from '../../server/memory/features';
import { HashingEmbedder, OverlapReranker } from '../../server/memory/testHelpers';
import { loadDataset } from './run';
import { collectProbes } from './train-ltr';

const fixture = loadDataset(path.join(import.meta.dirname, 'data', 'fixture.json'), 'fixture');
const deps = { embedder: new HashingEmbedder(), crossEncoder: new OverlapReranker(), k: 5, candidatePool: 30 };

describe('collectProbes, the path the training script takes', () => {
  test('throws before retrieving anything if a non-dev scenario is passed', async () => {
    const dev = { ...fixture.scenarios[0], split: 'dev' as const };
    const test = { ...fixture.scenarios[1], split: 'test' as const };
    await expect(collectProbes([dev, test], deps)).rejects.toThrow(/not in the dev split/);
  });

  test('collects one feature row per pooled candidate and a dense+rerank baseline per probe', async () => {
    const scenarios = fixture.scenarios.map(s => ({ ...s, split: 'dev' as const }));
    const { probes, baseline } = await collectProbes(scenarios, deps);
    const nProbes = scenarios.reduce((n, s) => n + s.probes.length, 0);
    expect(probes).toHaveLength(nProbes);
    expect(baseline.size).toBe(nProbes);
    expect(probes.every(p => p.candidates.length > 0 && p.candidates.every(c => c.features.length === FEATURE_NAMES.length))).toBe(true);
  });
});
