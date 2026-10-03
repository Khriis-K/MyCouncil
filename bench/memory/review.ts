import { rngFor, shuffle } from './rng';
import type { Probe, Scenario } from './schema';
import { jaccard } from './validate';

const CATEGORIES = ['explicit', 'implicit', 'multi', 'update'] as const;
const DEV_PER_CATEGORY = 2;
const TEST_PER_CATEGORY = 3;
const DISTRACTORS_SHOWN = 3;

export interface ReviewItem {
  scenario: Scenario;
  probe: Probe;
}

/** 20 probes: per category, 2 from dev and 3 from test, seeded. */
export function sampleReviewProbes(scenarios: Scenario[], seed: string): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const category of CATEGORIES) {
    for (const [split, count] of [['dev', DEV_PER_CATEGORY], ['test', TEST_PER_CATEGORY]] as const) {
      const pool = scenarios
        .filter(s => s.split === split)
        .flatMap(scenario => scenario.probes.filter(p => p.category === category).map(probe => ({ scenario, probe })));
      items.push(...shuffle(pool, rngFor(`${seed}:review:${category}:${split}`)).slice(0, count));
    }
  }
  return items;
}

const where = (e: { channel: string; counselorId?: string; debatePairId?: string }) =>
  e.channel === 'chat' ? `chat with ${e.counselorId}` : e.channel === 'debate' ? `debate ${e.debatePairId}` : 'refinement';

export function renderReview(items: ReviewItem[]): string {
  const lines = [
    '# Human review sheet',
    '',
    `${items.length} probes sampled with a seeded RNG, stratified by category, from both splits. Tick each box after reading the gold turns and the closest distractors.`,
    '',
  ];
  items.forEach(({ scenario, probe }, i) => {
    const byId = new Map(scenario.timeline.map(e => [e.id, e]));
    const distractors = scenario.timeline
      .filter(e => e.kind === 'distractor')
      .map(e => ({ e, score: jaccard(probe.text, e.text) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, DISTRACTORS_SHOWN);
    lines.push(
      `## ${i + 1}. ${scenario.id} / ${probe.id} (${probe.category}, ${scenario.split})`,
      '',
      `**Probe** (${where(probe)}): ${probe.text}`,
      '',
      '**Gold**',
      ...probe.gold.map(g => {
        const e = byId.get(g.sourceId)!;
        return `- grade ${g.grade}, ${where(e)}, distance ${g.distance ?? 'n/a'}: ${e.text}`;
      }),
      '',
      `**Closest distractors** (by content-word overlap with the probe)`,
      ...distractors.map(({ e, score }) => `- ${where(e)}, overlap ${score.toFixed(2)}: ${e.text}`),
      '',
      '- [ ] gold is correct and sufficient',
      '- [ ] probe is realistic for MyCouncil',
      '- [ ] no other turn also answers it',
      '',
    );
  });
  return lines.join('\n');
}
