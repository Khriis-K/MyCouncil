import { describe, expect, test } from 'vitest';
import { applyEdits, buildDataset, type Llm } from './generate';
import { syntheticContent } from './testContent';

const good: Llm = async () => JSON.stringify(syntheticContent());
const opts = { model: 'test/model', date: '2026-10-02', concurrency: 8 };

describe('applyEdits', () => {
  test('re-freezes with the edit applied, keeps other scenarios as they were, and records the edited probes', async () => {
    const { dataset } = await buildDataset({ ...opts, llm: good });
    const probe = dataset.scenarios[1].probes[0];
    const edits = [{ probe: probe.id, id: probe.id, before: probe.text, after: 'a fixed probe text', reason: 'test' }];
    const out = applyEdits(dataset, edits, { labels: { [probe.id]: 'gold' }, fixedProbeIds: [probe.id] });

    expect(out.dataset.scenarios[1].probes[0].text).toBe('a fixed probe text');
    expect(out.dataset.scenarios[0]).toEqual(dataset.scenarios[0]);
    expect(out.dataset.meta.sha256).not.toBe(dataset.meta.sha256);
    expect(out.dataset.meta).toMatchObject({ generatorModel: dataset.meta.generatorModel, handEditedProbes: [probe.id] });
    expect(out.report).toContain('## Human review');
    expect(out.review).toContain('# Human review sheet');
  });

  test('buildDataset puts the human review into the report when given one', async () => {
    const out = await buildDataset({ ...opts, llm: good, humanReview: { labels: { x: null }, fixedProbeIds: [] } });
    expect(out.report).toContain('## Human review');
  });
});
