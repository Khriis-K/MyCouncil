import { describe, expect, test } from 'vitest';
import { assemble } from './assemble';
import { renderReview, sampleReviewProbes } from './review';
import { syntheticContent } from './testContent';

const scenarios = Array.from({ length: 12 }, (_, i) =>
  assemble(syntheticContent(), { id: `s-${i}`, domain: 'career', split: i % 3 === 0 ? 'dev' : 'test' }),
);

describe('sampleReviewProbes', () => {
  const sample = sampleReviewProbes(scenarios, 'seed');

  test('takes 20 probes, 5 per category, from both splits', () => {
    expect(sample).toHaveLength(20);
    for (const c of ['explicit', 'implicit', 'multi', 'update']) {
      expect(sample.filter(x => x.probe.category === c)).toHaveLength(5);
    }
    expect(new Set(sample.map(x => x.scenario.split))).toEqual(new Set(['dev', 'test']));
  });

  test('has no duplicate probes and is deterministic for a seed', () => {
    expect(new Set(sample.map(x => x.probe.id)).size).toBe(20);
    expect(sampleReviewProbes(scenarios, 'seed').map(x => x.probe.id)).toEqual(sample.map(x => x.probe.id));
    expect(sampleReviewProbes(scenarios, 'other').map(x => x.probe.id)).not.toEqual(sample.map(x => x.probe.id));
  });
});

describe('renderReview', () => {
  const md = renderReview(sampleReviewProbes(scenarios, 'seed'));

  test('shows probe, gold with distance, three distractors and the three checkboxes for every probe', () => {
    expect(md.match(/- \[ \] gold is correct and sufficient/g)).toHaveLength(20);
    expect(md.match(/- \[ \] probe is realistic for MyCouncil/g)).toHaveLength(20);
    expect(md.match(/- \[ \] no other turn also answers it/g)).toHaveLength(20);
    expect(md.match(/distance \d+/g)!.length).toBeGreaterThanOrEqual(20);
    expect(md.match(/Closest distractors/g)).toHaveLength(20);
  });

  test('ranks distractors by overlap with the probe', () => {
    const s = assemble(syntheticContent(), { id: 'rank', domain: 'career', split: 'dev' });
    const probe = s.probes[0];
    const target = s.timeline.find(e => e.kind === 'distractor' && e.factId === undefined)!;
    target.text = `${probe.text} extra`;
    const out = renderReview([{ scenario: s, probe }]);
    expect(out.indexOf(target.text)).toBeGreaterThan(-1);
    expect(out.indexOf(target.text)).toBeLessThan(out.indexOf('- [ ] gold'));
  });
});
