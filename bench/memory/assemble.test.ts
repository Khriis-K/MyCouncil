import { describe, expect, test } from 'vitest';
import { assemble, councilTitles, threadKey } from './assemble';
import { scenarioSchema } from './schema';
import { syntheticContent } from './testContent';

const meta = { id: 'career-1', domain: 'career', split: 'dev' as const };
const userTurns = (s: ReturnType<typeof assemble>) => s.timeline.filter(e => e.speaker === 'user');
const indexOfUser = (s: ReturnType<typeof assemble>, id: string) => userTurns(s).findIndex(e => e.id === id);

describe('assemble', () => {
  const scenario = assemble(syntheticContent(), meta);

  test('is deterministic for the same content and id, and varies with the id', () => {
    expect(assemble(syntheticContent(), meta)).toEqual(scenario);
    expect(assemble(syntheticContent(), { ...meta, id: 'career-2' }).timeline.map(e => e.kind)).not.toEqual(scenario.timeline.map(e => e.kind));
  });

  test('produces a scenario the benchmark schema accepts, with the 4 BALANCED counselors', () => {
    expect(() => scenarioSchema.parse(scenario)).not.toThrow();
    expect(scenario.counselors).toEqual(councilTitles());
    expect(scenario.counselors).toHaveLength(4);
    expect(scenario.counselors.every(t => !t.startsWith('The '))).toBe(true);
  });

  test('includes every user turn exactly once and timestamps strictly increase', () => {
    const content = syntheticContent();
    expect(userTurns(scenario)).toHaveLength(content.facts.length + content.updates.length + content.distractors.length + content.filler.length);
    for (let i = 1; i < scenario.timeline.length; i++) {
      expect(scenario.timeline[i].timestamp).toBeGreaterThan(scenario.timeline[i - 1].timestamp);
    }
  });

  test('every chat or debate user turn is directly preceded by a counselor event in the same thread; refinement has none', () => {
    scenario.timeline.forEach((e, i) => {
      if (e.speaker !== 'user') return;
      if (e.channel === 'refinement') {
        expect(scenario.timeline[i - 1]?.speaker).not.toBe('counselor');
        return;
      }
      const before = scenario.timeline[i - 1];
      expect(before.speaker).toBe('counselor');
      expect(threadKey(before)).toBe(threadKey(e));
    });
    expect(scenario.timeline.filter(e => e.channel === 'refinement').every(e => e.speaker === 'user' && e.text.length <= 300)).toBe(true);
  });

  test.each(Array.from({ length: 30 }, (_, i) => i))('facts sit in the first half and updates come >=5 user turns after their fact (id %i)', i => {
    const s = assemble(syntheticContent(), { ...meta, id: `seed-${i}` });
    const total = userTurns(s).length;
    for (const fact of userTurns(s).filter(e => e.kind === 'fact')) {
      expect(indexOfUser(s, fact.id)).toBeLessThan(total / 2);
    }
    for (const update of userTurns(s).filter(e => e.kind === 'update')) {
      expect(indexOfUser(s, update.id) - indexOfUser(s, update.supersedes!)).toBeGreaterThanOrEqual(5);
    }
  });

  test('maps gold to user events with grades; the update probe also carries the superseded fact at grade 1', () => {
    const byId = new Map(scenario.timeline.map(e => [e.id, e]));
    for (const probe of scenario.probes) {
      expect(probe.gold.every(g => byId.get(g.sourceId)?.speaker === 'user')).toBe(true);
    }
    const update = scenario.probes.find(p => p.category === 'update')!;
    expect(update.gold.map(g => [g.sourceId, g.grade])).toEqual([
      ['career-1-u1', 2],
      ['career-1-f1', 1],
    ]);
    expect(scenario.probes.find(p => p.category === 'multi')!.gold.map(g => g.grade)).toEqual([2, 2]);
  });

  test('stores gold distance as the number of user turns after it', () => {
    const total = userTurns(scenario).length;
    for (const g of scenario.probes.flatMap(p => p.gold)) {
      expect(g.distance).toBe(total - 1 - indexOfUser(scenario, g.sourceId));
    }
  });

  test('probe channel fields match their channel', () => {
    for (const p of scenario.probes) {
      if (p.channel === 'chat') expect(scenario.counselors).toContain(p.counselorId);
      if (p.channel === 'debate') expect(p.debatePairId).toMatch(/\|/);
    }
  });

  test('about 40% of probes share a thread with a required gold fact; the rest never do', () => {
    let same = 0;
    let total = 0;
    for (let i = 0; i < 200; i++) {
      const s = assemble(syntheticContent(), { ...meta, id: `many-${i}` });
      const thread = new Map(s.timeline.map(e => [e.id, threadKey(e)]));
      for (const p of s.probes) {
        const probeKey = threadKey(p);
        const goldKeys = p.gold.map(g => thread.get(g.sourceId));
        const isSame = p.gold.filter(g => g.grade === 2).some(g => thread.get(g.sourceId) === probeKey);
        if (!isSame) expect(goldKeys).not.toContain(probeKey);
        same += isSame ? 1 : 0;
        total++;
      }
    }
    expect(same / total).toBeGreaterThan(0.35);
    expect(same / total).toBeLessThan(0.45);
  });

  test('channel mix is roughly 15% refinement, 20% debate, 65% chat', () => {
    const counts = { refinement: 0, debate: 0, chat: 0 };
    let total = 0;
    for (let i = 0; i < 100; i++) {
      for (const e of userTurns(assemble(syntheticContent(), { ...meta, id: `mix-${i}` }))) {
        counts[e.channel]++;
        total++;
      }
    }
    expect(counts.refinement / total).toBeCloseTo(0.15, 1);
    expect(counts.debate / total).toBeCloseTo(0.2, 1);
    expect(counts.chat / total).toBeCloseTo(0.65, 1);
  });
});

describe('assemble: multi probe with an update gold', () => {
  test('adds the superseded fact at grade 1 next to the required grades', () => {
    const content = syntheticContent();
    content.probes[3].goldFactIds = ['f6', 'u2'];
    const multi = assemble(content, meta).probes.find(p => p.category === 'multi')!;
    expect(multi.gold.map(g => [g.sourceId, g.grade])).toEqual([
      ['career-1-f6', 2],
      ['career-1-u2', 2],
      ['career-1-f2', 1],
    ]);
  });
});
