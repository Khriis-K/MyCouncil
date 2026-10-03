import { describe, expect, test } from 'vitest';
import { assemble } from './assemble';
import type { Scenario } from './schema';
import { findSupersededGold, renderSupersededReview } from './supersededReview';
import { syntheticContent } from './testContent';

const base = assemble(syntheticContent(), { id: 'career-1', domain: 'career', split: 'dev' });
const update = base.timeline.find(e => e.kind === 'update')!;
const superseded = base.timeline.find(e => e.id === update.supersedes)!;

// Point the first non-update probe's required gold at the superseded fact.
const withStaleGold = (): Scenario => {
  const s = structuredClone(base);
  const probe = s.probes.find(p => p.category !== 'update')!;
  probe.gold = [{ sourceId: superseded.id, grade: 2 }];
  return s;
};

describe('findSupersededGold', () => {
  test('lists a non-update probe whose required gold was later superseded, with the update that replaced it', () => {
    const s = withStaleGold();
    const probe = s.probes.find(p => p.category !== 'update')!;
    expect(findSupersededGold([s])).toEqual([{ scenario: s, probe, fact: superseded, update }]);
  });

  test('ignores update probes and grade-1 gold', () => {
    const s = withStaleGold();
    s.probes.find(p => p.category !== 'update')!.gold = [{ sourceId: superseded.id, grade: 1 }, { sourceId: update.id, grade: 2 }];
    expect(findSupersededGold([s])).toEqual([]);
  });
});

describe('renderSupersededReview', () => {
  test('shows the probe, the superseded fact and the update, with stale/fine checkboxes', () => {
    const items = findSupersededGold([withStaleGold()]);
    const md = renderSupersededReview(items);
    expect(md).toContain(items[0].probe.id);
    expect(md).toContain(items[0].probe.text);
    expect(md).toContain(superseded.text);
    expect(md).toContain(update.text);
    expect(md).toMatch(/- \[ \] stale/);
    expect(md).toMatch(/- \[ \] fine/);
  });
});
