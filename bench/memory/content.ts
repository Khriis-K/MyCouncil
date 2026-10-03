import { z } from 'zod';

export const PROMPT_VERSION = 'v1';

const text = (max: number) => z.string().min(1).max(max);
const turn = { text: text(280), counselorQuestion: text(160) };

export const contentSchema = z.object({
  dilemma: z.string().min(300).max(900),
  facts: z.array(z.object({ id: z.string(), ...turn })).min(6).max(8),
  updates: z.array(z.object({ id: z.string(), supersedes: z.string(), ...turn })).min(1).max(2),
  distractors: z.array(z.object({ id: z.string(), ...turn })).min(6).max(10),
  filler: z.array(z.object(turn)).min(20).max(30),
  probes: z
    .array(
      z.object({
        id: z.string(),
        text: text(300),
        goldFactIds: z.array(z.string()).min(1),
        category: z.enum(['explicit', 'implicit', 'multi', 'update']),
      }),
    )
    .length(5),
});

export type ScenarioContent = z.infer<typeof contentSchema>;
