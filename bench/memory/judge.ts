import { z } from 'zod';
import { extractJson } from './json';
import type { Scenario } from './schema';

export type JudgeLlm = (messages: { role: 'system' | 'user'; content: string }[]) => Promise<string>;

export interface JudgeIssue {
  probeId: string;
  kind: 'insufficient' | 'ambiguous';
  detail: string;
}

const verdictSchema = z.object({
  probes: z.array(
    z.object({
      id: z.string(),
      claims: z.array(z.object({ claim: z.string(), supportedBy: z.string().nullable() })).default([]),
      otherAnsweringTurnIds: z.array(z.string()).default([]),
    }),
  ),
});

export function buildJudgeMessages(scenario: Scenario) {
  const system =
    'You audit test data for a memory-retrieval benchmark. Judge literally and strictly: do not give the benefit of the doubt. Output STRICT JSON only: one object, no markdown fences, no commentary.';

  const turns = scenario.timeline
    .filter(e => e.speaker === 'user' && e.kind !== 'filler')
    .map(e => `[${e.id}] ${e.text}`)
    .join('\n');
  const probes = scenario.probes
    .map(p => `- ${p.id}: "${p.text}"\n  gold turns: ${p.gold.map(g => `${g.sourceId} (grade ${g.grade})`).join(', ')}`)
    .join('\n');

  const user = `SCENARIO ${scenario.id} (${scenario.domain})

Opening statement (context every answer may use, not a retrievable turn):
${scenario.dilemma}

All user turns, as [id] text:
${turns}

Probes, each with its gold turns (grade 2 = needed, grade 1 = an earlier version that was later updated):
${probes}

For EACH probe do two things:
1. claims: list every factual claim the probe asserts or presupposes about the user's situation (people, amounts, dates, durations, events, causes). Skip questions and plain feelings. For each claim give supportedBy: the id of a GOLD turn that actually states it, "dilemma" if the opening statement states it, or null if neither does. Be literal: a claim is supported only if the turn states it, not merely if it is consistent with it.
2. otherAnsweringTurnIds: ids of NON-gold turns that state a concrete fact a good answer to the probe would also use. Generic feelings or reactions do not count.

Return exactly this shape, with one entry per probe and each "id" copied verbatim from the probe list above:
{"probes":[{"id":"${scenario.probes[0].id}","claims":[{"claim":"...","supportedBy":"<turn id>"}],"otherAnsweringTurnIds":[]}]}`;

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ];
}

/**
 * Judge a scenario `samples` times and keep an issue only if a strict majority of samples raise
 * the same kind for the same probe. A single sample is one noisy opinion; voting steadies it.
 */
export async function judgeScenario(scenario: Scenario, llm: JudgeLlm, samples = 1): Promise<JudgeIssue[]> {
  const runs = await Promise.all(Array.from({ length: samples }, () => judgeOnce(scenario, llm)));
  const votes = new Map<string, { issue: JudgeIssue; count: number }>();
  for (const run of runs) {
    const seen = new Set<string>();
    for (const issue of run) {
      const key = `${issue.probeId}:${issue.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = votes.get(key) ?? { issue, count: 0 };
      entry.count++;
      votes.set(key, entry);
    }
  }
  return [...votes.values()].filter(v => v.count > samples / 2).map(v => v.issue);
}

const LABEL_KIND = { gold: 'insufficient', unique: 'ambiguous' } as const;

/** Compare judge issues with human labels: the check each probe failed, or null if it passed. */
export function scoreAgreement(labels: Record<string, 'gold' | 'unique' | null>, issues: JudgeIssue[]) {
  const score = { caught: [] as string[], missed: [] as string[], falselyFlagged: [] as string[], correctlyPassed: [] as string[], wrongKind: [] as string[] };
  for (const [probeId, failed] of Object.entries(labels)) {
    const judged = issues.filter(i => i.probeId === probeId);
    if (failed && judged.length > 0) {
      score.caught.push(probeId);
      if (!judged.some(i => i.kind === LABEL_KIND[failed])) score.wrongKind.push(probeId);
    } else if (failed) score.missed.push(probeId);
    else if (judged.length > 0) score.falselyFlagged.push(probeId);
    else score.correctlyPassed.push(probeId);
  }
  return score;
}

async function judgeOnce(scenario: Scenario, llm: JudgeLlm): Promise<JudgeIssue[]> {
  const verdict = verdictSchema.parse(extractJson(await llm(buildJudgeMessages(scenario))));
  const byId = new Map(scenario.timeline.map(e => [e.id, e]));
  const issues: JudgeIssue[] = [];
  for (const probe of scenario.probes) {
    const v = verdict.probes.find(x => x.id === probe.id);
    if (!v) throw new Error(`judge verdict is missing probe ${probe.id}`);
    const gold = new Set(probe.gold.map(g => g.sourceId));
    const unsupported = v.claims.filter(c => c.supportedBy !== 'dilemma' && !(c.supportedBy && gold.has(c.supportedBy)));
    if (unsupported.length > 0) {
      issues.push({ probeId: probe.id, kind: 'insufficient', detail: `gold does not support: ${unsupported.map(c => c.claim).join('; ')}` });
    }
    for (const id of v.otherAnsweringTurnIds) {
      const turn = byId.get(id);
      if (turn && turn.kind !== 'filler' && !gold.has(id)) issues.push({ probeId: probe.id, kind: 'ambiguous', detail: `non-gold turn also answers it: "${turn.text}"` });
    }
  }
  return issues;
}
