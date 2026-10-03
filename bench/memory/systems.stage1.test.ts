import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { HashingEmbedder, OverlapReranker } from '../../server/memory/testHelpers';
import type { Reranker } from '../../server/memory/reranker';
import { datasetSchema } from './schema';
import { createSystems, type SystemOptions } from './systems';

const dataset = datasetSchema.parse(JSON.parse(readFileSync(path.join(import.meta.dirname, 'data', 'fixture.json'), 'utf8')));
const scenario = dataset.scenarios.find(s => s.id === 'job-offer')!;
const probe = scenario.probes.find(p => p.id === 'job-p1')!;
const mini: Reranker = Object.assign(new OverlapReranker(), { id: 'mini' });
const base = {
  embedder: new HashingEmbedder(), k: 5, window: 6, candidatePool: 30,
  rerankers: { minilm: mini, 'bge-base': new OverlapReranker() }, productionReranker: 'none' as const,
};
const system = (name: string, extra: Partial<SystemOptions> = {}) => createSystems({ ...base, ...extra }).find(s => s.name === name)!;

describe('lexical and hybrid stage-1 systems', () => {
  test('bm25 and hybrid run stage 1 only, with their own candidate generator', async () => {
    for (const name of ['bm25', 'hybrid']) {
      const { trace } = await system(name).run({ scenario, probe });
      expect(trace!.config).toMatchObject({ stage1: name, rerankerId: null });
    }
  });

  test('hybrid+rerank reranks hybrid candidates with MiniLM', async () => {
    const { trace } = await system('hybrid+rerank').run({ scenario, probe });
    expect(trace!.config).toMatchObject({ stage1: 'hybrid', rerankerId: 'mini' });
  });

  test('dense stays dense', async () => {
    expect((await system('dense').run({ scenario, probe })).trace!.config.stage1).toBe('dense');
  });

  test('memory-production follows the configured stage 1', async () => {
    const { trace } = await system('memory-production', { productionStage1: 'hybrid' }).run({ scenario, probe });
    expect(trace!.config.stage1).toBe('hybrid');
  });
});
