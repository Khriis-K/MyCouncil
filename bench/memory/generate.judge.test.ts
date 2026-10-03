import { describe, expect, test } from 'vitest';
import { assemble } from './assemble';
import { buildDataset, judgeDataset, type Llm } from './generate';
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

describe('judgeDataset', () => {
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
});
