import { describe, expect, test } from 'vitest';
import { assemble } from './assemble';
import { buildDataset, generateScenario, judgeDataset, regenerateScenarios, type Llm } from './generate';
import { syntheticContent } from './testContent';

const seed = { id: 'career-1', domain: 'career', index: 1, persona: 'a 34-year-old nurse', split: 'dev' as const };
const good: Llm = async () => JSON.stringify(syntheticContent());
const verdict = (flagged: boolean, scenarioId = seed.id) =>
  JSON.stringify({
    probes: assemble(syntheticContent(), { ...seed, id: scenarioId }).probes.map((p, i) => ({
      id: p.id,
      claims: flagged && i === 0 ? [{ claim: 'made-up claim', supportedBy: null }] : [],
      otherAnsweringTurnIds: [],
    })),
  });
const scenarioIdOf = (messages: Parameters<Llm>[0]) => messages.map(m => m.content).join().match(/SCENARIO (\S+) /)![1];
const flagging = (flaggedId: string): Llm => async messages => verdict(scenarioIdOf(messages) === flaggedId, scenarioIdOf(messages));
const opts = { model: 'test/model', date: '2026-10-02', concurrency: 8 };

describe('generateScenario with a judge', () => {
  test('retries when the judge rejects, feeding the rejection back to the generator', async () => {
    let judged = 0;
    const seen: Parameters<Llm>[0][] = [];
    const llm: Llm = async messages => {
      seen.push(messages);
      return JSON.stringify(syntheticContent());
    };
    const result = await generateScenario(seed, llm, async () => verdict(++judged === 1));
    expect(result.scenario?.id).toBe('career-1');
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0].errors.join()).toMatch(/made-up claim/);
    const retry = seen[1].map(m => `${m.role}:${m.content}`).join('\n');
    expect(retry).toMatch(/made-up claim/);
    expect(retry).toContain(`assistant:${result.attempts[0].raw}`);
  });

  test('drops the scenario when the judge never accepts it', async () => {
    const result = await generateScenario(seed, good, async () => verdict(true));
    expect(result.scenario).toBeUndefined();
    expect(result.attempts).toHaveLength(3);
    expect(result.dropReason).toMatch(/made-up claim/);
  });

  test('a judge that throws counts as a failed attempt', async () => {
    let calls = 0;
    const result = await generateScenario(seed, good, async () => {
      if (++calls === 1) throw new Error('judge 503');
      return verdict(false);
    });
    expect(result.scenario?.id).toBe('career-1');
    expect(result.attempts[0].errors[0]).toMatch(/judge 503/);
  });

  test('a judge failure re-judges the same scenario instead of regenerating it', async () => {
    let generated = 0;
    let judged = 0;
    const result = await generateScenario(
      seed,
      async () => (generated++, JSON.stringify(syntheticContent())),
      async () => {
        if (++judged === 1) throw new Error('judge 503');
        return verdict(false);
      },
    );
    expect(result.scenario?.id).toBe('career-1');
    expect(generated).toBe(1);
    expect(judged).toBe(2);
  });

  test('a judge failure is never fed back to the generator as a rejection', async () => {
    const seen: Parameters<Llm>[0][] = [];
    let judged = 0;
    const llm: Llm = async messages => (seen.push(messages), JSON.stringify(syntheticContent()));
    // Fails, then rejects with a real issue, then accepts: the regeneration must carry only the real issue.
    const judge = async () => {
      if (++judged === 1) throw new Error('judge 503');
      return verdict(judged === 2);
    };
    const result = await generateScenario(seed, llm, judge);
    expect(result.scenario?.id).toBe('career-1');
    expect(seen).toHaveLength(2);
    const retry = seen[1].map(m => m.content).join('\n');
    expect(retry).toMatch(/made-up claim/);
    expect(retry).not.toMatch(/judge 503/);
  });
});

describe('judge in the dataset flow', () => {
  test('buildDataset judges every scenario it keeps', async () => {
    let calls = 0;
    const out = await buildDataset({ ...opts, llm: good, judge: async messages => (calls++, verdict(false, scenarioIdOf(messages))) });
    expect(calls).toBe(48);
    expect(out.dataset.scenarios).toHaveLength(48);
  });

  test('judgeDataset returns issues only for the scenarios the judge flags', async () => {
    const { dataset } = await buildDataset({ ...opts, llm: good });
    const issues = await judgeDataset(dataset, flagging('career-2'), 8);
    expect(Object.keys(issues)).toEqual(['career-2']);
    expect(issues['career-2'][0]).toMatchObject({ kind: 'insufficient' });
  });

  test('judgeDataset retries a malformed verdict, then names the scenario if it keeps failing', async () => {
    const { dataset } = await buildDataset({ ...opts, llm: good });
    const calls: Record<string, number> = {};
    const flaky: Llm = async messages => {
      const id = scenarioIdOf(messages);
      calls[id] = (calls[id] ?? 0) + 1;
      return id === 'career-2' && calls[id] === 1 ? '{"probes":[{"id":' : verdict(false, id);
    };
    expect(await judgeDataset(dataset, flaky, 8)).toEqual({});
    expect(calls['career-2']).toBe(2);
    const broken: Llm = async messages => (scenarioIdOf(messages) === 'career-2' ? 'garbage' : verdict(false, scenarioIdOf(messages)));
    await expect(judgeDataset(dataset, broken, 8)).rejects.toThrow(/career-2/);
  });

  test('regenerateScenarios applies the judge to the replacement', async () => {
    const { dataset } = await buildDataset({ ...opts, llm: good });
    const after = await regenerateScenarios(dataset, { ...opts, llm: good, ids: ['career-2'], judge: flagging('career-2') });
    expect(after.dataset.scenarios).toHaveLength(47);
    expect(after.dataset.meta.dropped).toEqual([expect.objectContaining({ id: 'career-2' })]);
  });
});
