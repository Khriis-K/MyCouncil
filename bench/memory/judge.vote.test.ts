import { describe, expect, test } from 'vitest';
import { assemble } from './assemble';
import { buildDataset, judgeDataset, type Llm } from './generate';
import { judgeScenario, scoreAgreement, type JudgeIssue } from './judge';
import { syntheticContent } from './testContent';

const seed = { id: 'career-1', domain: 'career', index: 1, persona: 'a 34-year-old nurse', split: 'dev' as const };
const scenario = assemble(syntheticContent(), seed);
const [p1, p2] = scenario.probes;
const distractor = scenario.timeline.find(e => e.kind === 'distractor' && !p1.gold.some(g => g.sourceId === e.id))!;

// One judge sample: which probes it calls insufficient and which it calls ambiguous.
const sample = (insufficient: string[] = [], ambiguous: string[] = [], scenarioId = seed.id) =>
  JSON.stringify({
    probes: assemble(syntheticContent(), { ...seed, id: scenarioId }).probes.map(p => ({
      id: p.id,
      claims: insufficient.includes(p.id) ? [{ claim: 'made-up claim', supportedBy: null }] : [],
      otherAnsweringTurnIds: ambiguous.includes(p.id) ? [distractor.id] : [],
    })),
  });
const sequence = (...replies: string[]) => {
  let n = 0;
  return async () => replies[n++ % replies.length];
};
const kinds = (issues: JudgeIssue[]) => issues.map(i => `${i.probeId}:${i.kind}`).sort();

describe('judgeScenario majority vote', () => {
  test('asks the judge once per sample', async () => {
    let calls = 0;
    await judgeScenario(scenario, async () => (calls++, sample()), 3);
    expect(calls).toBe(3);
  });

  test('keeps a flag raised by a majority of samples and drops one raised by a minority', async () => {
    const llm = sequence(sample([p1.id, p2.id]), sample([p1.id]), sample());
    expect(kinds(await judgeScenario(scenario, llm, 3))).toEqual([`${p1.id}:insufficient`]);
  });

  test('votes on each kind separately', async () => {
    const llm = sequence(sample([p1.id]), sample([], [p1.id]), sample([], [p1.id]));
    expect(kinds(await judgeScenario(scenario, llm, 3))).toEqual([`${p1.id}:ambiguous`]);
  });

  test('a sample that flags the same probe and kind twice still casts one vote', async () => {
    const twice = JSON.parse(sample([], [p1.id]));
    twice.probes[0].otherAnsweringTurnIds = [distractor.id, distractor.id];
    const llm = sequence(JSON.stringify(twice), sample(), sample());
    expect(await judgeScenario(scenario, llm, 3)).toEqual([]);
  });

  test('defaults to a single sample', async () => {
    let calls = 0;
    expect(kinds(await judgeScenario(scenario, async () => (calls++, sample([p1.id]))))).toEqual([`${p1.id}:insufficient`]);
    expect(calls).toBe(1);
  });
});

describe('scoreAgreement', () => {
  const labels = { a: 'gold', b: 'unique', c: null, d: null, e: 'gold' } as const;
  const issue = (probeId: string, kind: JudgeIssue['kind']): JudgeIssue => ({ probeId, kind, detail: '' });

  test('splits labelled probes into caught, missed, falsely flagged and correctly passed', () => {
    const score = scoreAgreement(labels, [issue('a', 'insufficient'), issue('c', 'ambiguous'), issue('zzz', 'ambiguous')]);
    expect(score).toEqual({
      caught: ['a'],
      missed: ['b', 'e'],
      falselyFlagged: ['c'],
      correctlyPassed: ['d'],
      wrongKind: [],
    });
  });

  test('a judge that flags nothing catches nothing, and one that flags everything falsely flags every ok probe', () => {
    expect(scoreAgreement(labels, [])).toMatchObject({ caught: [], falselyFlagged: [] });
    const all = Object.keys(labels).map(id => issue(id, 'insufficient'));
    expect(scoreAgreement(labels, all)).toMatchObject({ caught: ['a', 'b', 'e'], falselyFlagged: ['c', 'd'] });
  });

  test('lists caught probes whose judged kind does not match the failed check', () => {
    const score = scoreAgreement(labels, [issue('a', 'ambiguous'), issue('b', 'ambiguous'), issue('e', 'ambiguous'), issue('e', 'insufficient')]);
    expect(score.wrongKind).toEqual(['a']);
  });
});

describe('judge samples in the dataset flow', () => {
  const opts = { model: 'test/model', date: '2026-10-02', concurrency: 8 };
  const good: Llm = async () => JSON.stringify(syntheticContent());

  test('judgeDataset votes over samples', async () => {
    const { dataset } = await buildDataset({ ...opts, llm: good });
    const idOf = (m: Parameters<Llm>[0]) => m.map(x => x.content).join().match(/SCENARIO (\S+) /)![1];
    const seen: Record<string, number> = {};
    // career-2 gets flagged on 2 of 3 samples, career-3 on 1 of 3.
    const judge: Llm = async m => {
      const id = idOf(m);
      const n = (seen[id] = (seen[id] ?? 0) + 1);
      const flagged = (id === 'career-2' && n <= 2) || (id === 'career-3' && n === 1);
      return sample(flagged ? ['career-1-p1'.replace('career-1', id)] : [], [], id);
    };
    expect(Object.keys(await judgeDataset(dataset, judge, 1, 3))).toEqual(['career-2']);
  });
});
