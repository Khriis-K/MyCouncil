import { z } from 'zod';

const channel = z.enum(['refinement', 'chat', 'debate']);

// A timeline event IS a product MemorySource, plus benchmark-only tags.
export const timelineEventSchema = z.object({
  id: z.string(),
  channel,
  speaker: z.enum(['user', 'counselor']),
  counselorId: z.string().optional(),
  debatePairId: z.string().optional(),
  text: z.string(),
  timestamp: z.number(),
  kind: z.enum(['fact', 'update', 'distractor', 'filler', 'counselor']),
  factId: z.string().optional(),
  supersedes: z.string().optional(),
});

export const probeSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    channel,
    counselorId: z.string().optional(),
    debatePairId: z.string().optional(),
    // 2 = required, 1 = partially relevant (e.g. a superseded fact)
    gold: z.array(z.object({ sourceId: z.string(), grade: z.number().int().min(1).max(2) })),
    category: z.enum(['explicit', 'implicit', 'multi', 'update']),
  })
  .refine(p => p.gold.some(g => g.grade === 2), { message: 'probe needs at least one required (grade 2) gold' })
  .refine(p => p.channel !== 'chat' || !!p.counselorId, { message: 'chat probe needs counselorId' })
  .refine(p => p.channel !== 'debate' || !!p.debatePairId, { message: 'debate probe needs debatePairId' });

export const scenarioSchema = z
  .object({
    id: z.string(),
    split: z.enum(['fixture', 'dev', 'test']),
    domain: z.string(),
    dilemma: z.string(),
    counselors: z.array(z.string()),
    timeline: z.array(timelineEventSchema),
    probes: z.array(probeSchema),
  })
  .refine(
    s => {
      const ids = new Set(s.timeline.map(e => e.id));
      return s.probes.every(p => p.gold.every(g => ids.has(g.sourceId)));
    },
    { message: 'every gold sourceId must exist in the scenario timeline' },
  );

export const datasetSchema = z.object({
  version: z.string(),
  meta: z.record(z.string(), z.unknown()),
  scenarios: z.array(scenarioSchema),
});

export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type Probe = z.infer<typeof probeSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
