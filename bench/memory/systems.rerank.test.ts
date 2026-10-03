import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import type { Reranker } from '../../server/memory/reranker';
import { HashingEmbedder } from '../../server/memory/testHelpers';
import { datasetSchema } from './schema';
import { createSystems } from './systems';

const dataset = datasetSchema.parse(JSON.parse(readFileSync(new URL('./data/fixture.json', import.meta.url), 'utf8')));
const scenario = dataset.scenarios.find(s => s.id === 'job-offer')!;
const probe = scenario.probes.find(p => p.id === 'job-p1')!;

const named = (id: string): Reranker => ({ id, score: async (_q, p) => p.map((_, i) => i) });
const base = { embedder: new HashingEmbedder(), k: 5, window: 6, candidatePool: 30, rerankers: { minilm: named('mini'), 'bge-base': named('bge') } };
const system = (name: string, productionReranker: 'none' | 'minilm' | 'bge-base' = 'minilm') =>
  createSystems({ ...base, productionReranker }).find(s => s.name === name)!;

describe('rerank systems', () => {
  test('dense+rerank uses MiniLM and dense+rerank-bge uses bge-base', async () => {
    expect((await system('dense+rerank').run({ scenario, probe })).trace!.config.rerankerId).toBe('mini');
    expect((await system('dense+rerank-bge').run({ scenario, probe })).trace!.config.rerankerId).toBe('bge');
  });

  test('dense stays stage-1 only', async () => {
    expect((await system('dense').run({ scenario, probe })).trace!.config.rerankerId).toBeNull();
  });

  test('reranking changes the ranking (reversing fake)', async () => {
    const plain = await system('dense').run({ scenario, probe });
    const reranked = await system('dense+rerank').run({ scenario, probe });
    expect(reranked.ranked).not.toEqual(plain.ranked);
    expect(new Set(reranked.ranked)).toEqual(new Set(plain.ranked));
    expect(reranked.timingsMs).toHaveProperty('rerank');
  });

  test('a reranker failure is an error in the bench, never silently scored as stage 1', async () => {
    const broken: Reranker = { id: 'broken', score: async () => { throw new Error('model missing'); } };
    const systems = createSystems({ ...base, rerankers: { minilm: broken, 'bge-base': broken }, productionReranker: 'minilm' });
    for (const name of ['dense+rerank', 'dense+rerank-bge', 'memory-production']) {
      await expect(systems.find(s => s.name === name)!.run({ scenario, probe })).rejects.toThrow(/rerank_failed: model missing/);
    }
  });

  test('memory-production follows the configured reranker', async () => {
    expect((await system('memory-production', 'bge-base').run({ scenario, probe })).trace!.config.rerankerId).toBe('bge');
    expect((await system('memory-production', 'none').run({ scenario, probe })).trace!.config.rerankerId).toBeNull();
    const refinement = dataset.scenarios.flatMap(s => s.probes.map(p => ({ s, p }))).find(x => x.p.channel !== 'chat')!;
    expect((await system('memory-production').run({ scenario: refinement.s, probe: refinement.p })).trace!.config.rerankerId).toBe('mini');
  });
});
