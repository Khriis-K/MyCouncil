import { contentWords } from '../../server/memory/stopwords';
import { threadKey } from './assemble';
import { contentSchema, type ScenarioContent } from './content';
import { scenarioSchema, type Scenario } from './schema';

const MAX_DILEMMA_OVERLAP = 0.5;
const REFINEMENT_MAX_CHARS = 300;
const CATEGORIES = ['explicit', 'implicit', 'multi', 'update'] as const;
const GOLD_ARITY = { explicit: 1, implicit: 1, multi: 2, update: 1 } as const;
const CATEGORY_COUNT = { explicit: 1, implicit: 2, multi: 1, update: 1 } as const;

export function jaccard(a: string, b: string): number {
  const x = contentWords(a);
  const y = contentWords(b);
  const shared = [...x].filter(w => y.has(w)).length;
  const union = x.size + y.size - shared;
  return union === 0 ? 0 : shared / union;
}

/** Share of `text`'s content words that also appear in `container`. */
export function containment(text: string, container: string): number {
  const words = contentWords(text);
  if (words.size === 0) return 0;
  const other = contentWords(container);
  return [...words].filter(w => other.has(w)).length / words.size;
}

export type ContentResult = { ok: true; content: ScenarioContent } | { ok: false; errors: string[] };

export function validateContent(raw: unknown): ContentResult {
  const parsed = contentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map(i => `schema: ${i.path.join('.')}: ${i.message}`) };
  }
  const c = parsed.data;
  const errors: string[] = [];

  const ids = [...c.facts, ...c.updates, ...c.distractors, ...c.probes].map(x => x.id);
  for (const id of duplicates(ids)) errors.push(`duplicate id: ${id}`);

  const factIds = new Set(c.facts.map(f => f.id));
  const updateIds = new Set(c.updates.map(u => u.id));
  for (const u of c.updates) if (!factIds.has(u.supersedes)) errors.push(`update ${u.id} supersedes unknown fact ${u.supersedes}`);

  for (const category of CATEGORIES) {
    const n = c.probes.filter(p => p.category === category).length;
    if (n !== CATEGORY_COUNT[category]) errors.push(`category ${category}: expected ${CATEGORY_COUNT[category]} probe(s), got ${n}`);
  }

  const textOf = new Map([...c.facts, ...c.updates].map(x => [x.id, x.text]));
  for (const p of c.probes) {
    if (p.goldFactIds.length !== GOLD_ARITY[p.category]) {
      errors.push(`probe ${p.id} (${p.category}) needs ${GOLD_ARITY[p.category]} gold id(s)`);
    }
    const allowed = p.category === 'update' ? updateIds : p.category === 'multi' ? new Set([...factIds, ...updateIds]) : factIds;
    for (const id of p.goldFactIds) {
      if (!allowed.has(id)) errors.push(`probe ${p.id} (${p.category}) gold ${id} is not an allowed id for this category`);
      else if (containment(textOf.get(id)!, c.dilemma) >= MAX_DILEMMA_OVERLAP) errors.push(`dilemma overlaps gold ${id} (probe ${p.id})`);
    }
    for (const u of c.updates) {
      if (p.category !== 'update' && p.goldFactIds.includes(u.id) && p.goldFactIds.includes(u.supersedes)) {
        errors.push(`probe ${p.id} gold has update ${u.id} and the fact it supersedes (${u.supersedes})`);
      }
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, content: c };
}

export function validateScenario(scenario: Scenario): string[] {
  const parsed = scenarioSchema.safeParse(scenario);
  if (!parsed.success) return parsed.error.issues.map(i => `schema: ${i.path.join('.')}: ${i.message}`);
  const errors: string[] = [];

  const ids = scenario.timeline.map(e => e.id);
  for (const id of duplicates(ids)) errors.push(`duplicate timeline id: ${id}`);

  const byId = new Map(scenario.timeline.map(e => [e.id, e]));
  for (const p of scenario.probes) {
    if (p.text.length > 300) errors.push(`probe ${p.id} text is over 300 chars`);
    for (const g of p.gold) {
      const event = byId.get(g.sourceId);
      if (!event) errors.push(`probe ${p.id} gold ${g.sourceId} does not exist`);
      else if (event.speaker !== 'user') errors.push(`probe ${p.id} gold ${g.sourceId} is not a user event`);
    }
  }
  for (const e of scenario.timeline) {
    if (e.channel === 'refinement' && e.text.length > REFINEMENT_MAX_CHARS) errors.push(`refinement turn ${e.id} is over ${REFINEMENT_MAX_CHARS} chars`);
  }
  return errors;
}

export interface CategoryStats {
  n: number;
  meanJaccard: number;
  medianJaccard: number;
  zeroOverlapShare: number;
}

export interface BiasAudit {
  byCategory: Record<(typeof CATEGORIES)[number], CategoryStats>;
  sameChannelShare: number;
  distance: { n: number; min: number; median: number; mean: number; max: number; buckets: Record<string, number> };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
const duplicates = (ids: string[]) => [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];

/** Report-only: measures how easy the benchmark is for keyword matching and how it is spread. Never used to filter. */
export function auditBias(scenarios: Scenario[]): BiasAudit {
  const overlaps: Record<string, number[]> = { explicit: [], implicit: [], multi: [], update: [] };
  const distances: number[] = [];
  let same = 0;
  let probes = 0;

  for (const s of scenarios) {
    const byId = new Map(s.timeline.map(e => [e.id, e]));
    for (const p of s.probes) {
      const required = p.gold.filter(g => g.grade === 2);
      // Best-matching required gold: the most favourable case for a keyword matcher.
      overlaps[p.category].push(Math.max(...required.map(g => jaccard(p.text, byId.get(g.sourceId)!.text))));
      if (required.some(g => threadKey(byId.get(g.sourceId)!) === threadKey(p))) same++;
      probes++;
      for (const g of required) if (g.distance !== undefined) distances.push(g.distance);
    }
  }

  const stats = (xs: number[]): CategoryStats => ({
    n: xs.length,
    meanJaccard: mean(xs),
    medianJaccard: median(xs),
    zeroOverlapShare: xs.length ? xs.filter(x => x === 0).length / xs.length : 0,
  });
  const buckets: Record<string, number> = { '0-9': 0, '10-19': 0, '20-29': 0, '30+': 0 };
  for (const d of distances) buckets[d < 10 ? '0-9' : d < 20 ? '10-19' : d < 30 ? '20-29' : '30+']++;

  return {
    byCategory: Object.fromEntries(CATEGORIES.map(c => [c, stats(overlaps[c])])) as BiasAudit['byCategory'],
    sameChannelShare: probes ? same / probes : 0,
    distance: {
      n: distances.length,
      min: distances.length ? Math.min(...distances) : 0,
      median: median(distances),
      mean: mean(distances),
      max: distances.length ? Math.max(...distances) : 0,
      buckets,
    },
  };
}

/** 95% Wilson score interval for k successes in n trials. */
export function wilsonInterval(k: number, n: number): [number, number] {
  const z = 1.96;
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

export interface HumanReview {
  /** Per reviewed probe: the check it failed, or null if it passed. */
  labels: Record<string, 'gold' | 'unique' | null>;
  fixedProbeIds: string[];
  /** Gold references regraded after a person marked them stale in SUPERSEDED_REVIEW.md. */
  regradedGold?: number;
  /** Regraded probes whose text was also rewritten because it stated the old fact as current. */
  rewrittenStale?: number;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function renderHumanReview({ labels, fixedProbeIds, regradedGold, rewrittenStale }: HumanReview, totalProbes: number): string[] {
  const ids = Object.keys(labels);
  const failedOn = (check: 'gold' | 'unique') => ids.filter(id => labels[id] === check);
  const gold = failedOn('gold');
  const unique = failedOn('unique');
  const failed = gold.length + unique.length;
  const [lo, hi] = wilsonInterval(failed, ids.length);
  return [
    '## Human review',
    '',
    `Seeded sample from REVIEW.md, checked by a person: is the gold sufficient, is the probe realistic, and does no other turn also answer it.`,
    '',
    `- ${failed} of ${ids.length} failed (${pct(failed / ids.length)}; 95% Wilson interval ${pct(lo)}-${pct(hi)})`,
    `- gold not sufficient: ${gold.length}${gold.length ? ` (${gold.join(', ')})` : ''}`,
    `- another turn also answers: ${unique.length}${unique.length ? ` (${unique.join(', ')})` : ''}`,
    `- fixed by hand (data/hand-edits.json): ${fixedProbeIds.length ? fixedProbeIds.join(', ') : 'none'}`,
    ...(regradedGold
      ? [
          `- superseded gold: ${regradedGold} gold references pointed at a fact a later update superseded and were marked stale by a person in SUPERSEDED_REVIEW.md (which lists every such reference on non-update probes); they were regraded so the update is required gold and the old fact grade 1`,
        ]
      : []),
    ...(rewrittenStale
      ? [`- ${rewrittenStale} of those probes stated the old fact as current, so their text was rewritten by hand to use the updated fact`]
      : []),
    '',
    `The other ${totalProbes - ids.length} probes were not reviewed for these checks, and nothing automated checks these two failure kinds: the validator checks structure and word overlap, not whether the gold turn semantically suffices or a distractor also answers. Expect a similar share of the unreviewed probes to have the same defects. An LLM judge (bench/memory/judge.ts) exists as an opt-in check, and \`--judge-check\` scores it against data/human-labels.json, but no committed measurement shows it agrees with these labels, so it gates nothing.`,
    '',
  ];
}

export function renderReport(
  audit: BiasAudit,
  info: { scenarios: number; dropped: { id: string; reason: string }[]; humanReview?: HumanReview },
): string {
  const f = (n: number) => n.toFixed(3);
  const rows = CATEGORIES.map(c => {
    const s = audit.byCategory[c];
    return `| ${c} | ${s.n} | ${f(s.meanJaccard)} | ${f(s.medianJaccard)} | ${pct(s.zeroOverlapShare)} |`;
  });
  const d = audit.distance;
  return [
    '# Dataset report (bias audit)',
    '',
    'Report only: nothing here filters the dataset. Overlap is content-word Jaccard between a probe and its best-matching required gold turn (a high value means a keyword matcher has an easy time).',
    '',
    `- scenarios: ${info.scenarios}`,
    `- dropped: ${info.dropped.length ? info.dropped.map(x => `${x.id} (${x.reason})`).join('; ') : 'none'}`,
    '',
    '## Probe vs gold overlap by category',
    '',
    '| category | probes | mean Jaccard | median Jaccard | zero-overlap share |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    '## Channel',
    '',
    `- same-channel probes: ${pct(audit.sameChannelShare)}; cross-channel: ${pct(1 - audit.sameChannelShare)} (a probe is same-channel when it sits in the thread of one of its required gold turns)`,
    '',
    '## Gold distance (user turns between the gold turn and the end of the timeline)',
    '',
    `- required gold turns: ${d.n}; min ${d.min}, median ${d.median}, mean ${d.mean.toFixed(1)}, max ${d.max}`,
    ...Object.entries(d.buckets).map(([k, v]) => `- ${k}: ${v}`),
    '',
    ...(info.humanReview ? renderHumanReview(info.humanReview, CATEGORIES.reduce((n, c) => n + audit.byCategory[c].n, 0)) : []),
  ].join('\n');
}
