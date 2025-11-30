import { z } from 'zod';

export const summonSchema = z.object({
  dilemma: z.string()
    .min(10, "Dilemma must be at least 10 characters long")
    .max(1000, "Dilemma cannot exceed 1000 characters"),
  mbti: z.string().nullable().optional(),
  councilSize: z.number().min(3).max(7).optional().default(4),
  previousSummary: z.string().optional(),
  additionalContext: z.string()
    .max(300, "Additional context cannot exceed 300 characters")
    .optional(),
  reflectionFocus: z.enum(['Decision-Making', 'Emotional Processing', 'Creative Problem Solving']).optional(),
});

export const debateInjectionSchema = z.object({
  dilemma: z.string(),
  tension: z.object({
    core_issue: z.string(),
    counselor_ids: z.array(z.string()).length(2),
    c1_claim: z.string().optional(),
    c1_evidence: z.string().optional(),
    c2_claim: z.string().optional(),
    c2_evidence: z.string().optional()
  }),
  history: z.array(z.object({
    speaker: z.string(),
    text: z.string()
  })),
  user_input: z.string().min(1).max(500),
  counselors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    description: z.string()
  })).min(2)
});
