import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { HashingEmbedder, OverlapReranker } from '../../server/memory/testHelpers';
import type { Reranker } from '../../server/memory/reranker';
import { datasetSchema } from './schema';
import { createSystems } from './systems';

const dataset = datasetSchema.parse(JSON.parse(readFileSync(path.join(import.meta.dirname, 'data', 'fixture.json'), 'utf8')));
const base = {
  embedder: new HashingEmbedder(), k: 5, window: 6, candidatePool: 30,
  rerankers: { minilm: new OverlapReranker(), 'bge-base': new OverlapReranker() }, productionReranker: 'none' as const,
};

describe('dense+llm-select', () => {
  test('is only offered when a selector is configured', () => {
    expect(createSystems(base).map(s => s.name)).not.toContain('dense+llm-select');
    expect(createSystems({ ...base, llmSelector: new OverlapReranker() }).map(s => s.name)).toContain('dense+llm-select');
  });

  test('dense-top2+llm-select is only offered when a hybrid selector is configured', () => {
    expect(createSystems(base).map(s => s.name)).not.toContain('dense-top2+llm-select');
    expect(createSystems({ ...base, hybridSelector: new OverlapReranker() }).map(s => s.name)).toContain('dense-top2+llm-select');
  });

  test('ranks by the selector and fails the row instead of falling back', async () => {
    const broken: Reranker = { id: 'broken', score: async () => { throw new Error('boom'); } };
    const system = createSystems({ ...base, llmSelector: broken }).find(s => s.name === 'dense+llm-select')!;
    const scenario = dataset.scenarios[0];
    await expect(system.run({ scenario, probe: scenario.probes[0] })).rejects.toThrow(/boom/);
  });
});
