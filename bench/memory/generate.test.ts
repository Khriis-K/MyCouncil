import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { PROMPT_VERSION } from './content';
import { buildDataset, buildMessages, extractJson, generateScenario, planScenarios } from './generate';
import { datasetSchema } from './schema';
import { syntheticContent } from './testContent';

const seed = { id: 'career-1', domain: 'career', index: 1, persona: 'a 34-year-old nurse', split: 'dev' as const };
const good = (_: unknown) => Promise.resolve(JSON.stringify(syntheticContent()));

describe('planScenarios', () => {
  const plan = planScenarios();

  test('plans 48 scenarios, 6 per domain, with unique ids and a persona each', () => {
    expect(plan).toHaveLength(48);
    expect(new Set(plan.map(p => p.id)).size).toBe(48);
    expect(plan.every(p => p.persona.length > 0)).toBe(true);
    expect(plan.filter(p => p.domain === 'career')).toHaveLength(6);
  });

  test('splits 16 dev / 32 test and is deterministic', () => {
    expect(plan.filter(p => p.split === 'dev')).toHaveLength(16);
    expect(planScenarios()).toEqual(plan);
  });
});

describe('buildMessages', () => {
  const text = buildMessages(seed).map(m => m.content).join('\n');

  test('carries the domain, persona and the hard rules', () => {
    expect(text).toContain('career');
    expect(text).toContain('a 34-year-old nurse');
    expect(text).toMatch(/strict JSON/i);
    expect(text).toMatch(/implicit/);
    expect(text).toMatch(/share no content words/i);
  });

  test('prompt version is v1', () => {
    expect(PROMPT_VERSION).toBe('v1');
  });
});

describe('extractJson', () => {
  test('parses plain JSON, fenced JSON, and JSON with surrounding prose', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go:\n{"a":{"b":2}}\nHope that helps')).toEqual({ a: { b: 2 } });
  });

  test('throws on text with no JSON', () => {
    expect(() => extractJson('no json here')).toThrow();
  });
});

describe('generateScenario', () => {
  test('returns the scenario and records the raw response on success', async () => {
    const result = await generateScenario(seed, good);
    expect(result.scenario?.id).toBe('career-1');
    expect(result.scenario?.split).toBe('dev');
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].raw).toContain('"dilemma"');
    expect(result.attempts[0].errors).toEqual([]);
  });

  test('retries invalid output and succeeds on a later attempt', async () => {
    let calls = 0;
    const result = await generateScenario(seed, async () => (++calls < 3 ? 'not json' : JSON.stringify(syntheticContent())));
    expect(calls).toBe(3);
    expect(result.scenario?.id).toBe('career-1');
    expect(result.attempts.map(a => a.errors.length > 0)).toEqual([true, true, false]);
  });

  test('retries when the LLM call itself throws', async () => {
    let calls = 0;
    const result = await generateScenario(seed, async () => {
      if (++calls === 1) throw new Error('503');
      return JSON.stringify(syntheticContent());
    });
    expect(result.scenario?.id).toBe('career-1');
    expect(result.attempts[0].errors[0]).toMatch(/503/);
  });

  test('gives up after 3 attempts and reports why', async () => {
    let calls = 0;
    const result = await generateScenario(seed, async () => {
      calls++;
      return JSON.stringify({ ...syntheticContent(), probes: [] });
    });
    expect(calls).toBe(3);
    expect(result.scenario).toBeUndefined();
    expect(result.dropReason).toMatch(/probes/);
  });

  test('rejects content whose dilemma leaks a gold fact', async () => {
    const leaky = syntheticContent();
    leaky.facts[2].text = 'zebrafact3 quokka marmot';
    leaky.dilemma = (leaky.dilemma + ' zebrafact3 quokka').slice(0, 900);
    const result = await generateScenario(seed, async () => JSON.stringify(leaky));
    expect(result.scenario).toBeUndefined();
    expect(result.dropReason).toMatch(/dilemma overlaps/);
  });
});

describe('buildDataset', () => {
  test('builds a frozen dataset, review sheet and report, with a matching sha256', async () => {
    const out = await buildDataset({ llm: good, model: 'test/model', date: '2026-10-02', concurrency: 8 });
    expect(() => datasetSchema.parse(out.dataset)).not.toThrow();
    expect(out.dataset.scenarios).toHaveLength(48);
    expect(out.dataset.scenarios.filter(s => s.split === 'dev')).toHaveLength(16);
    expect(out.dataset.meta).toMatchObject({ generatorModel: 'test/model', promptVersion: 'v1', generatedAt: '2026-10-02', dropped: [] });
    const sha = createHash('sha256').update(JSON.stringify(out.dataset.scenarios)).digest('hex');
    expect(out.dataset.meta.sha256).toBe(sha);
    expect(out.review).toContain('gold is correct and sufficient');
    expect(out.report).toContain('same-channel');
    expect(Object.keys(out.raw)).toHaveLength(48);
  });

  test('drops a scenario that never validates, records it, and keeps the others', async () => {
    const out = await buildDataset({
      llm: async messages => (messages.map(m => m.content).join().includes('SCENARIO career-2 ') ? 'garbage' : JSON.stringify(syntheticContent())),
      model: 'test/model',
      date: '2026-10-02',
      concurrency: 8,
    });
    expect(out.dataset.scenarios).toHaveLength(47);
    expect(out.dataset.meta.dropped).toEqual([expect.objectContaining({ id: 'career-2' })]);
    expect(out.raw['career-2'].attempts).toHaveLength(3);
  });
});
