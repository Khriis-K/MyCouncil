import { describe, expect, test } from 'vitest';
import { assemble } from './assemble';
import type { ScenarioContent } from './content';
import type { Scenario } from './schema';
import { syntheticContent } from './testContent';
import { auditBias, containment, jaccard, renderReport, validateContent, validateScenario } from './validate';

const meta = { id: 'career-1', domain: 'career', split: 'dev' as const };
const clone = (): ScenarioContent => structuredClone(syntheticContent());
const errorsOf = (content: unknown) => {
  const result = validateContent(content);
  return 'errors' in result ? result.errors.join('; ') : '';
};

describe('overlap functions', () => {
  test('jaccard is intersection over union of content words', () => {
    expect(jaccard('red apple pie', 'green apple tart')).toBeCloseTo(1 / 5);
    expect(jaccard('apple', 'apple')).toBe(1);
    expect(jaccard('apple', 'pear')).toBe(0);
  });

  test('jaccard ignores stopwords and returns 0 when both sides are empty', () => {
    expect(jaccard('the and of', 'it is to')).toBe(0);
    expect(jaccard('the apple', 'an apple')).toBe(1);
  });

  test('containment is the share of the first text\'s content words found in the second', () => {
    expect(containment('apple pie recipe', 'I love apple pie and tarts')).toBeCloseTo(2 / 3);
    expect(containment('', 'anything')).toBe(0);
  });
});

describe('validateContent', () => {
  test('accepts well-formed content', () => {
    expect(validateContent(clone()).ok).toBe(true);
  });

  test('rejects schema violations: probe count, over-long fact, short dilemma', () => {
    const fewProbes = clone();
    fewProbes.probes.pop();
    expect(errorsOf(fewProbes)).toMatch(/probes/);
    const longFact = clone();
    longFact.facts[0].text = 'x'.repeat(281);
    expect(errorsOf(longFact)).toMatch(/facts/);
    const shortDilemma = clone();
    shortDilemma.dilemma = 'too short';
    expect(errorsOf(shortDilemma)).toMatch(/dilemma/);
    expect(errorsOf({ nonsense: true })).not.toBe('');
  });

  test('rejects duplicate ids', () => {
    const c = clone();
    c.distractors[0].id = c.facts[0].id;
    expect(errorsOf(c)).toMatch(/duplicate id/i);
  });

  test('rejects an update that supersedes an unknown fact', () => {
    const c = clone();
    c.updates[0].supersedes = 'nope';
    expect(errorsOf(c)).toMatch(/supersedes/);
  });

  test('rejects probe gold that does not exist or has the wrong kind', () => {
    const missing = clone();
    missing.probes[0].goldFactIds = ['ghost'];
    expect(errorsOf(missing)).toMatch(/ghost/);
    const distractorGold = clone();
    distractorGold.probes[0].goldFactIds = ['d1'];
    expect(errorsOf(distractorGold)).toMatch(/d1/);
    const updateOnExplicit = clone();
    updateOnExplicit.probes[0].goldFactIds = ['u1'];
    expect(errorsOf(updateOnExplicit)).toMatch(/u1/);
    const factOnUpdate = clone();
    factOnUpdate.probes[4].goldFactIds = ['f1'];
    expect(errorsOf(factOnUpdate)).toMatch(/f1/);
  });

  test('rejects the wrong category mix or gold arity', () => {
    const mix = clone();
    mix.probes[1].category = 'explicit';
    expect(errorsOf(mix)).toMatch(/category/);
    const arity = clone();
    arity.probes[3].goldFactIds = ['f6'];
    expect(errorsOf(arity)).toMatch(/multi/);
  });

  test('rejects a dilemma that already contains a gold fact (containment >= 0.5)', () => {
    const c = clone();
    c.facts[2].text = 'zebrafact3 quokka marmot';
    c.dilemma = (c.dilemma + ' zebrafact3 quokka').slice(0, 900);
    expect(errorsOf(c)).toMatch(/dilemma overlaps/i);
  });

  test('does not flag a dilemma that overlaps a non-gold fact', () => {
    const c = clone();
    c.facts[0].text = 'zebrafact1 quokka marmot';
    c.dilemma = c.dilemma.slice(0, 800) + ' zebrafact1 quokka marmot';
    expect(validateContent(c).ok).toBe(true);
  });
});

describe('validateScenario', () => {
  const good = () => structuredClone(assemble(syntheticContent(), meta));

  test('accepts an assembled scenario', () => {
    expect(validateScenario(good())).toEqual([]);
  });

  test('catches duplicate timeline ids', () => {
    const s = good();
    s.timeline[1].id = s.timeline[0].id;
    expect(validateScenario(s).join()).toMatch(/duplicate/i);
  });

  test('catches gold that is missing or points at a counselor event', () => {
    const missing = good();
    missing.probes[0].gold[0].sourceId = 'ghost';
    expect(validateScenario(missing).length).toBeGreaterThan(0);
    const counselorGold = good();
    counselorGold.probes[0].gold[0].sourceId = counselorGold.timeline.find(e => e.speaker === 'counselor')!.id;
    expect(validateScenario(counselorGold).join()).toMatch(/user event/);
  });

  test('catches an over-long refinement turn and an over-long probe', () => {
    const s = good();
    const refinement = s.timeline.find(e => e.channel === 'refinement' && e.speaker === 'user')!;
    refinement.text = 'x'.repeat(301);
    expect(validateScenario(s).join()).toMatch(/refinement/);
    const p = good();
    p.probes[0].text = 'x'.repeat(301);
    expect(validateScenario(p).join()).toMatch(/probe/i);
  });
});

describe('auditBias', () => {
  const scenarios: Scenario[] = Array.from({ length: 20 }, (_, i) => assemble(syntheticContent(), { ...meta, id: `a-${i}` }));
  const audit = auditBias(scenarios);

  test('counts probes per category and reports overlap stats', () => {
    expect(audit.byCategory.explicit.n).toBe(20);
    expect(audit.byCategory.implicit.n).toBe(40);
    expect(audit.byCategory.implicit.zeroOverlapShare).toBeGreaterThanOrEqual(0);
    expect(audit.byCategory.implicit.zeroOverlapShare).toBeLessThanOrEqual(1);
  });

  test('uses the best-matching required gold for each probe', () => {
    const s = assemble(syntheticContent(), meta);
    s.probes = [{ ...s.probes[3], text: 'zebrafact6', category: 'multi' }];
    const result = auditBias([s]);
    expect(result.byCategory.multi.meanJaccard).toBeCloseTo(0.5);
  });

  test('same-channel share and distance distribution are consistent', () => {
    expect(audit.sameChannelShare).toBeGreaterThan(0.3);
    expect(audit.sameChannelShare).toBeLessThan(0.5);
    expect(audit.distance.n).toBeGreaterThan(0);
    expect(audit.distance.min).toBeLessThanOrEqual(audit.distance.median);
    expect(audit.distance.median).toBeLessThanOrEqual(audit.distance.max);
  });

  test('report renders the audit and mentions drops', () => {
    const md = renderReport(audit, { scenarios: 20, dropped: [{ id: 'x-1', reason: 'overlap' }] });
    expect(md).toContain('implicit');
    expect(md).toContain('x-1');
    expect(md).toMatch(/same-channel/i);
  });
});

describe('validateContent: multi probes may use an update as one of their gold ids', () => {
  test('accepts a fact plus an update', () => {
    const c = clone();
    c.probes[3].goldFactIds = ['f6', 'u2'];
    expect(validateContent(c).ok).toBe(true);
  });

  test('still rejects an update id on explicit and implicit probes', () => {
    const c = clone();
    c.probes[1].goldFactIds = ['u1'];
    expect(errorsOf(c)).toMatch(/u1/);
  });

  test('rejects a multi probe whose gold includes both a fact and the update that supersedes it', () => {
    const c = clone();
    c.probes[3].goldFactIds = ['f1', 'u1'];
    expect(errorsOf(c)).toMatch(/supersed/);
  });
});
