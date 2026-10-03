import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { HashingEmbedder, OverlapReranker } from '../../server/memory/testHelpers';
import { datasetSchema, type Probe, type Scenario } from './schema';
import { createSystems } from './systems';

const dataset = datasetSchema.parse(JSON.parse(readFileSync(new URL('./data/fixture.json', import.meta.url), 'utf8')));
const scenario = (id: string): Scenario => dataset.scenarios.find(s => s.id === id)!;
const probe = (s: Scenario, id: string): Probe => s.probes.find(p => p.id === id)!;

const rerank = { rerankers: { minilm: new OverlapReranker(), 'bge-base': new OverlapReranker() }, productionReranker: 'minilm' as const };
const systems = createSystems({ embedder: new HashingEmbedder(), k: 5, window: 6, candidatePool: 30, ...rerank });
const system = (name: string) => systems.find(s => s.name === name)!;

describe('fixture', () => {
  test('parses, is marked as fixture, and every scenario has user turns across 2+ counselors', () => {
    expect(dataset.scenarios).toHaveLength(3);
    for (const s of dataset.scenarios) {
      expect(s.split).toBe('fixture');
      const userTurns = s.timeline.filter(e => e.speaker === 'user');
      expect(userTurns.length).toBeGreaterThanOrEqual(8);
      expect(userTurns.length).toBeLessThanOrEqual(12);
      expect(s.timeline.some(e => e.channel === 'refinement')).toBe(true);
      expect(s.probes.length).toBeGreaterThanOrEqual(2);
      expect(s.probes.length).toBeLessThanOrEqual(3);
    }
    expect(JSON.stringify(dataset.meta)).toMatch(/harness testing only/i);
    const categories = dataset.scenarios.flatMap(s => s.probes.map(p => p.category));
    expect(categories).toContain('update');
  });
});

describe('existing-context', () => {
  test('chat probe: contains same-channel gold from the full chat transcript', async () => {
    const s = scenario('bakery');
    const out = await system('existing-context').run({ scenario: s, probe: probe(s, 'bake-p3') });
    expect(out.context.has('bake-c1')).toBe(true);
    expect(out.context.has('bake-c5')).toBe(true);
  });

  test('chat probe: misses cross-channel gold', async () => {
    const s = scenario('job-offer');
    const out = await system('existing-context').run({ scenario: s, probe: probe(s, 'job-p1') });
    expect(out.context.has('job-c1')).toBe(false);
  });

  test('chat probe: ranked is the context user sources newest first, and only this counselor chat', async () => {
    const s = scenario('bakery');
    const out = await system('existing-context').run({ scenario: s, probe: probe(s, 'bake-p3') });
    expect(out.ranked).toEqual(['bake-c5', 'bake-c3', 'bake-c1']);
    expect([...out.context].sort()).toEqual([...out.ranked].sort());
  });

  test('contextChars counts counselor turns too, since they are in the prompt', async () => {
    const s = scenario('bakery');
    const out = await system('existing-context').run({ scenario: s, probe: probe(s, 'bake-p3') });
    const transcript = s.timeline.filter(e => e.channel === 'chat' && e.counselorId === 'Commander');
    expect(out.contextChars).toBe(transcript.reduce((n, e) => n + e.text.length, 0));
  });

  test('debate probe: sees the whole pair transcript', async () => {
    const s = scenario('grad-school');
    const out = await system('existing-context').run({ scenario: s, probe: probe(s, 'grad-p2') });
    expect(out.context.has('grad-d1')).toBe(true);
    expect(out.context.has('grad-c1')).toBe(false);
  });

  test('refinement probe: sees only the previous refinement, not chat gold', async () => {
    const s = scenario('grad-school');
    const out = await system('existing-context').run({ scenario: s, probe: probe(s, 'grad-p3') });
    expect([...out.context]).toEqual(['grad-r2']);
    expect(out.ranked).toEqual(['grad-r2']);
    expect(out.context.has('grad-c3')).toBe(false);
    expect(out.contextChars).toBe(s.timeline.find(e => e.id === 'grad-r2')!.text.length);
  });
});

describe('recency', () => {
  test('ranks every user source newest first across channels and puts the k newest in context', async () => {
    const s = scenario('bakery');
    const out = await system('recency').run({ scenario: s, probe: probe(s, 'bake-p3') });
    const users = s.timeline.filter(e => e.speaker === 'user').sort((a, b) => b.timestamp - a.timestamp);
    expect(out.ranked).toEqual(users.map(u => u.id));
    expect([...out.context]).toEqual(users.slice(0, 5).map(u => u.id));
  });
});

describe('dense', () => {
  test('returns a deduped ranking and a top-k context from the product retriever', async () => {
    const s = scenario('job-offer');
    const out = await system('dense').run({ scenario: s, probe: probe(s, 'job-p1') });
    expect(new Set(out.ranked).size).toBe(out.ranked.length);
    expect(out.context.size).toBeLessThanOrEqual(5);
    expect([...out.context].every(id => out.ranked.includes(id))).toBe(true);
    expect(Object.keys(out.timingsMs!)).toEqual(expect.arrayContaining(["embedPassages", "embedQuery", "stage1", "total"]));
  });

  test('can reach cross-channel gold that existing-context cannot', async () => {
    const s = scenario('job-offer');
    const out = await system('dense').run({ scenario: s, probe: probe(s, 'job-p1') });
    expect(out.ranked).toContain('job-c1');
  });

  test('only ever returns user sources', async () => {
    const s = scenario('job-offer');
    const out = await system('dense').run({ scenario: s, probe: probe(s, 'job-p1') });
    const userIds = new Set(s.timeline.filter(e => e.speaker === 'user').map(e => e.id));
    expect(out.ranked.every(id => userIds.has(id))).toBe(true);
  });
});

describe('memory-production', () => {
  test('context is the last W turns of the probe thread plus retrieved memories', async () => {
    const s = scenario('job-offer');
    const windowOnly = (window: number) =>
      createSystems({ embedder: new HashingEmbedder(), k: 0, window, candidatePool: 30, ...rerank }).find(x => x.name === 'memory-production')!;
    // Advocate chat turns in order: v1 u, v2 c, v3 u, v4 c, v5 u. With k=0 only the window remains.
    const two = await windowOnly(2).run({ scenario: s, probe: probe(s, 'job-p1') });
    expect([...two.context]).toEqual(['job-v5']);
    const four = await windowOnly(4).run({ scenario: s, probe: probe(s, 'job-p1') });
    expect([...four.context].sort()).toEqual(['job-v3', 'job-v5']);
    expect(four.contextChars).toBe(['job-v2', 'job-v3', 'job-v4', 'job-v5'].reduce((n, id) => n + s.timeline.find(e => e.id === id)!.text.length, 0));
  });

  test('window turns are excluded from retrieval, so they are never double counted', async () => {
    const s = scenario('job-offer');
    const out = await system('memory-production').run({ scenario: s, probe: probe(s, 'job-p1') });
    expect(new Set(out.ranked).size).toBe(out.ranked.length);
  });

  test('reaches cross-channel gold via retrieval', async () => {
    const s = scenario('job-offer');
    const out = await system('memory-production').run({ scenario: s, probe: probe(s, 'job-p1') });
    expect(out.context.has('job-c1')).toBe(true);
  });

  test('refinement probe: window is the last W refinement turns', async () => {
    const s = scenario('grad-school');
    const out = await system('memory-production').run({ scenario: s, probe: probe(s, 'grad-p3') });
    expect(out.context.has('grad-r2')).toBe(true);
  });
});
