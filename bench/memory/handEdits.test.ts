import { describe, expect, test } from 'vitest';
import { assemble } from './assemble';
import { applyHandEdits } from './handEdits';
import type { Dataset } from './schema';
import { syntheticContent } from './testContent';

const scenario = assemble(syntheticContent(), { id: 'career-1', domain: 'career', split: 'dev' });
const dataset: Dataset = { version: 'v1', meta: {}, scenarios: [scenario] };
const probe = scenario.probes[0];
const turn = scenario.timeline.find(e => e.kind === 'distractor')!;
const edit = (id: string, before: string, after: string) => ({ probe: probe.id, id, before, after, reason: 'test' });

describe('applyHandEdits', () => {
  test('replaces the text of a probe and of a timeline turn, leaving the input untouched', () => {
    const out = applyHandEdits(dataset, [edit(probe.id, probe.text, 'new probe text'), edit(turn.id, turn.text, 'a new distractor text')]);
    const s = out.scenarios[0];
    expect(s.probes.find(p => p.id === probe.id)!.text).toBe('new probe text');
    expect(s.timeline.find(e => e.id === turn.id)!.text).toBe('a new distractor text');
    expect(dataset.scenarios[0].probes[0].text).toBe(probe.text);
  });

  test('is idempotent: an edit whose text is already applied is a no-op', () => {
    const once = applyHandEdits(dataset, [edit(probe.id, probe.text, 'new probe text')]);
    expect(applyHandEdits(once, [edit(probe.id, probe.text, 'new probe text')])).toEqual(once);
  });

  test('refuses an edit whose before text no longer matches', () => {
    expect(() => applyHandEdits(dataset, [edit(probe.id, 'something else', 'x')])).toThrow(new RegExp(probe.id));
  });

  test('refuses an unknown id', () => {
    expect(() => applyHandEdits(dataset, [edit('ghost', 'a', 'b')])).toThrow(/ghost/);
  });

  test('refuses an edit that makes the scenario fail validation', () => {
    expect(() => applyHandEdits(dataset, [edit(probe.id, probe.text, 'x'.repeat(400))])).toThrow(/career-1/);
  });
});

describe('applyHandEdits regrade', () => {
  const update = scenario.timeline.find(e => e.kind === 'update')!;
  const userTurns = scenario.timeline.filter(e => e.speaker === 'user');
  // A dataset where a non-update probe requires the fact that `update` later replaced.
  const stale = (): Dataset => {
    const d = structuredClone(dataset);
    d.scenarios[0].probes[0].gold = [{ sourceId: update.supersedes!, grade: 2, distance: 0 }];
    return d;
  };
  const regrade = { probe: probe.id, regrade: { superseded: update.supersedes!, update: update.id }, reason: 'stale' };

  test('demotes the superseded fact to grade 1 and adds the update as required gold with its distance', () => {
    const gold = applyHandEdits(stale(), [regrade]).scenarios[0].probes[0].gold;
    expect(gold).toEqual([
      { sourceId: update.supersedes, grade: 1, distance: 0 },
      { sourceId: update.id, grade: 2, distance: userTurns.length - 1 - userTurns.indexOf(update) },
    ]);
  });

  test('is idempotent', () => {
    const once = applyHandEdits(stale(), [regrade]);
    expect(applyHandEdits(once, [regrade])).toEqual(once);
  });

  test('refuses when the fact is not required gold of the probe, or the update does not supersede it', () => {
    expect(() => applyHandEdits(dataset, [{ ...regrade, regrade: { ...regrade.regrade, superseded: 'career-1-f99' } }])).toThrow(probe.id);
    const other = scenario.timeline.find(e => e.kind === 'fact' && e.id !== update.supersedes)!;
    const d = stale();
    d.scenarios[0].probes[0].gold.push({ sourceId: other.id, grade: 2 });
    expect(() => applyHandEdits(d, [{ ...regrade, regrade: { superseded: other.id, update: update.id } }])).toThrow(/supersede/);
  });
});
