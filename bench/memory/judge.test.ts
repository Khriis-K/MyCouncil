import { describe, expect, test } from 'vitest';
import { assemble } from './assemble';
import { buildJudgeMessages, judgeScenario } from './judge';
import { syntheticContent } from './testContent';

const scenario = assemble(syntheticContent(), { id: 'career-1', domain: 'career', split: 'dev' });
const probe = scenario.probes[0];
const goldIds = new Set(probe.gold.map(g => g.sourceId));
const userTurns = scenario.timeline.filter(e => e.speaker === 'user');
const nonGold = userTurns.find(e => e.kind === 'distractor' && !goldIds.has(e.id))!;
const filler = userTurns.find(e => e.kind === 'filler')!;
const supported = [{ claim: 'a stated fact', supportedBy: [...goldIds][0] }];
const verdict = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    probes: scenario.probes.map(p => ({
      id: p.id,
      claims: [{ claim: 'a stated fact', supportedBy: p.gold[0].sourceId }],
      otherAnsweringTurnIds: [],
      ...(p.id === probe.id ? over : {}),
    })),
  });

describe('buildJudgeMessages', () => {
  const text = buildJudgeMessages(scenario).map(m => m.content).join('\n');

  test('lists the dilemma, every non-filler user turn with its id, and each probe with its gold ids', () => {
    expect(text).toContain(scenario.dilemma);
    for (const turn of userTurns.filter(e => e.kind !== 'filler')) expect(text).toContain(`[${turn.id}]`);
    expect(text).toContain(probe.text);
    for (const id of goldIds) expect(text).toContain(id);
  });

  test('leaves counselor turns and filler out and demands strict JSON', () => {
    const counselor = scenario.timeline.find(e => e.speaker === 'counselor')!;
    expect(text).not.toContain(counselor.text);
    expect(text).not.toContain(filler.text);
    expect(text).toMatch(/strict JSON/i);
  });
});

describe('judgeScenario', () => {
  test('returns no issues when every probe is supported and unambiguous', async () => {
    expect(await judgeScenario(scenario, async () => verdict())).toEqual([]);
  });

  test('flags a probe with a claim that no turn states, quoting the claim', async () => {
    const issues = await judgeScenario(scenario, async () =>
      verdict({ claims: [...supported, { claim: 'the shortfall lasted four months', supportedBy: null }] }),
    );
    expect(issues).toEqual([expect.objectContaining({ probeId: probe.id, kind: 'insufficient' })]);
    expect(issues[0].detail).toContain('four months');
  });

  test('counts a claim backed only by a non-gold turn as unsupported, but accepts the dilemma as support', async () => {
    const viaDistractor = await judgeScenario(scenario, async () => verdict({ claims: [{ claim: 'x', supportedBy: nonGold.id }] }));
    expect(viaDistractor).toEqual([expect.objectContaining({ probeId: probe.id, kind: 'insufficient' })]);
    expect(await judgeScenario(scenario, async () => verdict({ claims: [{ claim: 'x', supportedBy: 'dilemma' }] }))).toEqual([]);
  });

  test('flags a non-gold turn that also answers the probe, quoting that turn', async () => {
    const issues = await judgeScenario(scenario, async () => verdict({ otherAnsweringTurnIds: [nonGold.id] }));
    expect(issues).toEqual([expect.objectContaining({ probeId: probe.id, kind: 'ambiguous' })]);
    expect(issues[0].detail).toContain(nonGold.text);
  });

  test('ignores answering ids that are gold, filler, or do not exist', async () => {
    const issues = await judgeScenario(scenario, async () => verdict({ otherAnsweringTurnIds: [[...goldIds][0], filler.id, 'ghost'] }));
    expect(issues).toEqual([]);
  });

  test('parses a fenced verdict', async () => {
    expect(await judgeScenario(scenario, async () => '```json\n' + verdict() + '\n```')).toEqual([]);
  });

  test('throws when the verdict is malformed or skips a probe', async () => {
    await expect(judgeScenario(scenario, async () => 'no json')).rejects.toThrow();
    const partial = JSON.stringify({ probes: [{ id: probe.id, claims: [] }] });
    await expect(judgeScenario(scenario, async () => partial)).rejects.toThrow(/probe/i);
  });
});
