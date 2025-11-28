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
