import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../../server/config';
import { generateText } from '../../server/llm';
import { assemble } from './assemble';
import { PROMPT_VERSION } from './content';
import { pick, rngFor } from './rng';
import { renderReview, sampleReviewProbes } from './review';
import { datasetSchema, type Dataset, type Scenario } from './schema';
import { assignSplits, DOMAINS, SCENARIOS_PER_DOMAIN } from './split';
import { auditBias, renderReport, validateContent, validateScenario } from './validate';

const DATA_DIR = path.join(import.meta.dirname, 'data');
const MAX_ATTEMPTS = 3;
const SEED = 'mycouncil-memory-bench-v1';
const DEFAULT_CONCURRENCY = 4;

export type Llm = (messages: { role: 'system' | 'user'; content: string }[]) => Promise<string>;

export interface ScenarioSeed {
  id: string;
  domain: string;
  index: number;
  persona: string;
  split: 'dev' | 'test';
}

const PERSONAS = [
  'a 34-year-old hospital nurse who is practical and a little burned out',
  'a 22-year-old recent graduate who second-guesses everything',
  'a 41-year-old single parent juggling two jobs',
  'a 58-year-old manager approaching a big transition and wary of change',
  'a 29-year-old freelancer who loves independence but dreads uncertainty',
  'a 47-year-old teacher who feels responsible for everyone around them',
  'a 36-year-old engineer who over-analyzes and avoids hard conversations',
  'a 25-year-old graduate student living far from family',
  'a 52-year-old small-business owner who hates asking for help',
  'a 31-year-old new parent short on sleep and certainty',
  'a 63-year-old recently retired person looking for purpose',
  'a 27-year-old artist who is warm, impulsive, and short on money',
];

export function planScenarios(): ScenarioSeed[] {
  const base = DOMAINS.flatMap(domain =>
    Array.from({ length: SCENARIOS_PER_DOMAIN }, (_, i) => ({
      id: `${domain.replace(/\W+/g, '-')}-${i + 1}`,
      domain,
      index: i + 1,
    })),
  );
  const splits = assignSplits(base, SEED);
  return base.map(s => ({ ...s, persona: pick(PERSONAS, rngFor(`${SEED}:persona:${s.id}`)), split: splits.get(s.id)! }));
}

export function buildMessages(seed: ScenarioSeed) {
  const system = [
    'You write synthetic but realistic test data for a personal-advice app. A user talks to a council of four counselors about a personal dilemma, in 1-on-1 chats, debates, and a refinement step.',
    'You output STRICT JSON only: one object, no markdown fences, no commentary.',
  ].join(' ');

  const user = `SCENARIO ${seed.id} (domain: ${seed.domain}; persona: ${seed.persona}; prompt ${PROMPT_VERSION})

Invent a specific, believable dilemma in the domain "${seed.domain}" for this persona. Use concrete names, places, dates, amounts and past events. Everything is written in the first person by the user.

Return one JSON object with exactly these keys:

{
  "dilemma": string,      // 300-900 chars, first person, the opening problem statement. It must NOT contain any fact that a probe needs.
  "facts": [              // 6-8 items
    { "id": "f1", "text": string, "counselorQuestion": string }
  ],
  "updates": [            // 1-2 items: a later change to an earlier fact
    { "id": "u1", "supersedes": "f2", "text": string, "counselorQuestion": string }
  ],
  "distractors": [        // 6-10 items
    { "id": "d1", "text": string, "counselorQuestion": string }
  ],
  "filler": [             // 20-30 items
    { "text": string, "counselorQuestion": string }
  ],
  "probes": [             // exactly 5 items
    { "id": "p1", "text": string, "goldFactIds": ["f3"], "category": "explicit" }
  ]
}

Rules:
- facts[].text: a natural first-person user message, at most 280 chars, revealing ONE concrete detail (a person, a constraint, a date, a feeling, a past event). Not a list, not stilted.
- counselorQuestion: the counselor's line just before the user message, at most 160 chars, a question that makes the user's message a natural reply.
- updates[].text: e.g. "Actually, the deadline moved to Friday." It changes a fact the user stated earlier, so "supersedes" must be that fact's id.
- distractors: same surface topic as some fact (same people, places, themes) but they do NOT answer any probe and do not change any fact.
- filler: reactions, opinions, hesitations. No new facts, no names, dates, amounts or decisions.
- Every user message is at most 280 chars and sounds like a real person typing.
- probes[].text: at most 300 chars, a message the user might send to a counselor later. Exactly these categories:
  - 1 "explicit": shares key terms with its one gold fact. goldFactIds has 1 fact id.
  - 2 "implicit": a good answer NEEDS the fact, but the probe and the fact share no content words (no shared names, nouns, or distinctive verbs). Ask about the consequence, not the fact. goldFactIds has 1 fact id each, different facts.
  - 1 "multi": needs 2 different facts together. goldFactIds has 2 fact ids.
  - 1 "update": needs the updated information. goldFactIds has the id of ONE update (not the fact it supersedes).
- Probe ids are p1..p5. Fact ids f1.., update ids u1.., distractor ids d1.. and all ids are unique.
- Output the JSON object and nothing else.`;

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ];
}

export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in response');
  return JSON.parse(text.slice(start, end + 1));
}

export interface Attempt {
  raw: string;
  errors: string[];
}

export interface GenerationResult {
  scenario?: Scenario;
  attempts: Attempt[];
  dropReason?: string;
}

export async function generateScenario(seed: ScenarioSeed, llm: Llm): Promise<GenerationResult> {
  const attempts: Attempt[] = [];
  for (let n = 0; n < MAX_ATTEMPTS; n++) {
    let raw = '';
    try {
      raw = await llm(buildMessages(seed));
      const checked = validateContent(extractJson(raw));
      if ('errors' in checked) {
        attempts.push({ raw, errors: checked.errors });
        continue;
      }
      const scenario = assemble(checked.content, seed);
      const errors = validateScenario(scenario);
      attempts.push({ raw, errors });
      if (errors.length === 0) return { scenario, attempts };
    } catch (error) {
      attempts.push({ raw, errors: [error instanceof Error ? error.message : String(error)] });
    }
  }
  return { attempts, dropReason: attempts[attempts.length - 1].errors.slice(0, 3).join('; ') };
}

export interface BuildOptions {
  llm: Llm;
  model: string;
  date: string;
  concurrency?: number;
  seeds?: ScenarioSeed[];
}

export interface BuildOutput {
  dataset: Dataset;
  report: string;
  review: string;
  raw: Record<string, { scenarioId: string; promptVersion: string; model: string; attempts: Attempt[] }>;
}

async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

interface Generated {
  scenarios: Scenario[];
  dropped: { id: string; reason: string }[];
  raw: BuildOutput['raw'];
}

async function generateAll(seeds: ScenarioSeed[], options: BuildOptions): Promise<Generated> {
  const results = await mapPool(seeds, options.concurrency ?? DEFAULT_CONCURRENCY, seed => generateScenario(seed, options.llm));
  const out: Generated = { scenarios: [], dropped: [], raw: {} };
  seeds.forEach((seed, i) => {
    out.raw[seed.id] = { scenarioId: seed.id, promptVersion: PROMPT_VERSION, model: options.model, attempts: results[i].attempts };
    if (results[i].scenario) out.scenarios.push(results[i].scenario!);
    else out.dropped.push({ id: seed.id, reason: results[i].dropReason ?? 'unknown' });
  });
  return out;
}

function freeze(generated: Generated, meta: Record<string, unknown>): BuildOutput {
  const { scenarios, dropped, raw } = generated;
  const dataset: Dataset = {
    version: 'v1',
    meta: {
      promptVersion: PROMPT_VERSION,
      seedScheme: `splits: ${SEED}:split:<domain> (stratified, scenario-level); assembly: sha256("assemble:<scenarioId>") -> mulberry32; personas: ${SEED}:persona:<scenarioId>`,
      ...meta,
      dropped,
      sha256: createHash('sha256').update(JSON.stringify(scenarios)).digest('hex'),
    },
    scenarios,
  };
  return {
    dataset,
    report: renderReport(auditBias(scenarios), { scenarios: scenarios.length, dropped }),
    review: renderReview(sampleReviewProbes(scenarios, SEED)),
    raw,
  };
}

export async function buildDataset(options: BuildOptions): Promise<BuildOutput> {
  const generated = await generateAll(options.seeds ?? planScenarios(), options);
  return freeze(generated, { generatorModel: options.model, generatedAt: options.date });
}

/** Re-run only `ids` against an existing frozen dataset; everything else is kept byte-for-byte. */
export async function regenerateScenarios(existing: Dataset, options: BuildOptions & { ids: string[] }): Promise<BuildOutput> {
  if (existing.meta.generatorModel !== options.model) {
    throw new Error(`model mismatch: dataset was generated with ${existing.meta.generatorModel}, not ${options.model}`);
  }
  const plan = planScenarios();
  const seeds = options.ids.map(id => {
    const seed = plan.find(p => p.id === id);
    if (!seed) throw new Error(`unknown scenario id: ${id}`);
    return seed;
  });
  const fresh = await generateAll(seeds, options);
  const order = new Map(plan.map((p, i) => [p.id, i]));
  const scenarios = [...existing.scenarios.filter(s => !options.ids.includes(s.id)), ...fresh.scenarios].sort(
    (a, b) => order.get(a.id)! - order.get(b.id)!,
  );
  const previousDrops = (existing.meta.dropped as { id: string; reason: string }[]).filter(d => !options.ids.includes(d.id));
  const regeneratedAt = { ...(existing.meta.regeneratedAt as Record<string, string> | undefined) };
  for (const id of options.ids) regeneratedAt[id] = options.date;
  return freeze(
    { scenarios, dropped: [...previousDrops, ...fresh.dropped], raw: fresh.raw },
    { generatorModel: existing.meta.generatorModel, generatedAt: existing.meta.generatedAt, regeneratedAt },
  );
}

async function main() {
  if (!config.openRouterApiKey) throw new Error('OPENROUTER_API_KEY is missing: put it in .env.local');
  const base = { llm: generateText, model: config.model, date: new Date().toISOString().slice(0, 10) };
  const onlyFlag = process.argv.indexOf('--only');
  const out =
    onlyFlag === -1
      ? await buildDataset(base)
      : await regenerateScenarios(datasetSchema.parse(JSON.parse(readFileSync(path.join(DATA_DIR, 'scenarios.v1.json'), 'utf8'))), {
          ...base,
          ids: (process.argv[onlyFlag + 1] ?? '').split(',').filter(Boolean),
        });
  mkdirSync(path.join(DATA_DIR, 'raw'), { recursive: true });
  for (const [id, record] of Object.entries(out.raw)) writeFileSync(path.join(DATA_DIR, 'raw', `${id}.json`), JSON.stringify(record, null, 2));
  writeFileSync(path.join(DATA_DIR, 'scenarios.v1.json'), JSON.stringify(out.dataset, null, 2));
  writeFileSync(path.join(DATA_DIR, 'DATASET_REPORT.md'), out.report);
  writeFileSync(path.join(DATA_DIR, 'REVIEW.md'), out.review);
  const dropped = (out.dataset.meta.dropped as unknown[]).length;
  console.log(`wrote ${out.dataset.scenarios.length} scenarios (${dropped} dropped) to ${DATA_DIR}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
