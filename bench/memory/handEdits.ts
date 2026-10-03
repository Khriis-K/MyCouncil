import type { Dataset } from './schema';
import { validateScenario } from './validate';

/** A reviewed text fix to one probe or timeline turn. `probe` is the reviewed probe the edit repairs. */
export interface HandEdit {
  probe: string;
  id: string;
  before: string;
  after: string;
  reason: string;
}

/**
 * Apply hand edits to a copy of the dataset. An edit already applied is skipped; an edit whose
 * `before` no longer matches is refused, so a regenerated scenario never gets a stale fix.
 */
export function applyHandEdits(dataset: Dataset, edits: HandEdit[]): Dataset {
  const out: Dataset = structuredClone(dataset);
  const touched = new Set<Dataset['scenarios'][number]>();
  for (const edit of edits) {
    const scenario = out.scenarios.find(s => s.probes.some(p => p.id === edit.id) || s.timeline.some(e => e.id === edit.id));
    if (!scenario) throw new Error(`hand edit: unknown id ${edit.id}`);
    const target = scenario.probes.find(p => p.id === edit.id) ?? scenario.timeline.find(e => e.id === edit.id)!;
    if (target.text === edit.after) continue;
    if (target.text !== edit.before) throw new Error(`hand edit: ${edit.id} no longer has the expected text`);
    target.text = edit.after;
    touched.add(scenario);
  }
  for (const scenario of touched) {
    const errors = validateScenario(scenario);
    if (errors.length) throw new Error(`hand edit broke ${scenario.id}: ${errors.join('; ')}`);
  }
  return out;
}
