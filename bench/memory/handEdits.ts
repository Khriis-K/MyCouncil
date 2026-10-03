import type { Dataset, Scenario } from './schema';
import { validateScenario } from './validate';

/** A reviewed text fix to one probe or timeline turn. `probe` is the reviewed probe the edit repairs. */
export interface TextEdit {
  probe: string;
  id: string;
  before: string;
  after: string;
  reason: string;
}

/**
 * A probe whose required gold fact was later superseded: the update becomes required gold and the
 * old fact drops to grade 1, the same grading update probes use.
 */
export interface RegradeEdit {
  probe: string;
  regrade: { superseded: string; update: string };
  reason: string;
}

export type HandEdit = TextEdit | RegradeEdit;

function applyText(out: Dataset, edit: TextEdit): Scenario | undefined {
  const scenario = out.scenarios.find(s => s.probes.some(p => p.id === edit.id) || s.timeline.some(e => e.id === edit.id));
  if (!scenario) throw new Error(`hand edit: unknown id ${edit.id}`);
  const target = scenario.probes.find(p => p.id === edit.id) ?? scenario.timeline.find(e => e.id === edit.id)!;
  if (target.text === edit.after) return undefined;
  if (target.text !== edit.before) throw new Error(`hand edit: ${edit.id} no longer has the expected text`);
  target.text = edit.after;
  return scenario;
}

function applyRegrade(out: Dataset, { probe: probeId, regrade }: RegradeEdit): Scenario | undefined {
  const scenario = out.scenarios.find(s => s.probes.some(p => p.id === probeId));
  if (!scenario) throw new Error(`hand edit: unknown probe ${probeId}`);
  const probe = scenario.probes.find(p => p.id === probeId)!;
  const fact = probe.gold.find(g => g.sourceId === regrade.superseded);
  if (fact?.grade === 1 && probe.gold.some(g => g.sourceId === regrade.update && g.grade === 2)) return undefined;
  if (fact?.grade !== 2) throw new Error(`hand edit: ${regrade.superseded} is not required gold of ${probeId}`);
  const update = scenario.timeline.find(e => e.id === regrade.update);
  if (update?.kind !== 'update' || update.supersedes !== regrade.superseded) {
    throw new Error(`hand edit: ${regrade.update} does not supersede ${regrade.superseded}`);
  }
  const userTurns = scenario.timeline.filter(e => e.speaker === 'user');
  fact.grade = 1;
  probe.gold.push({ sourceId: update.id, grade: 2, distance: userTurns.length - 1 - userTurns.indexOf(update) });
  return scenario;
}

/**
 * Apply hand edits to a copy of the dataset. An edit already applied is skipped; an edit that no
 * longer matches the data is refused, so a regenerated scenario never gets a stale fix.
 */
export function applyHandEdits(dataset: Dataset, edits: HandEdit[]): Dataset {
  const out: Dataset = structuredClone(dataset);
  const touched = new Set<Scenario>();
  for (const edit of edits) {
    const scenario = 'regrade' in edit ? applyRegrade(out, edit) : applyText(out, edit);
    if (scenario) touched.add(scenario);
  }
  for (const scenario of touched) {
    const errors = validateScenario(scenario);
    if (errors.length) throw new Error(`hand edit broke ${scenario.id}: ${errors.join('; ')}`);
  }
  return out;
}
