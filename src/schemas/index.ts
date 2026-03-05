import { z } from 'zod';

export const planSchema = z.object({
  chapters: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
    }),
  ),
});

export type PlanOutput = z.infer<typeof planSchema>;

export const assessmentSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correctIndex: z.number().min(0).max(3),
      explanation: z.string(),
    }),
  ),
});

export type AssessmentOutput = z.infer<typeof assessmentSchema>;
