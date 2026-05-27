import { z } from 'zod';

export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
} as const;

export type MatchStatus = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS];

const isoDateString = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid ISO date string' }
);

export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['scheduled', 'live', 'finished']).optional(),
});

export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createMatchSchema = z.object({
  sport: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  startTime: isoDateString,
  endTime: isoDateString.optional(),
  homeScore: z.number().int().nonnegative().optional(),
  awayScore: z.number().int().nonnegative().optional(),
}).superRefine((data, ctx) => {
  if (!data.endTime) return;
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  if (startTime >= endTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Start time must be before end time',
      path: ['endTime'],
    });
  }
});

export const updateMatchSchema = z.object({
  sport: z.string().min(1).optional(),
  homeTeam: z.string().min(1).optional(),
  awayTeam: z.string().min(1).optional(),
  startTime: isoDateString.optional(),
  endTime: isoDateString.optional(),
  homeScore: z.number().int().nonnegative().optional(),
  awayScore: z.number().int().nonnegative().optional(),
  status: z.enum(['scheduled', 'live', 'finished']).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export const updateMatchStatusSchema = z.object({
  status: z.enum(['scheduled', 'live', 'finished']),
});

export const updateScoreSchema = z.object({
  homeScore: z.number().int().nonnegative(),
  awayScore: z.number().int().nonnegative(),
});

// Inferred output types (post-validation)
export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;

// DTOs — raw wire types matching what Express receives before zod coercion
export type ListMatchesQueryDTO = {
  limit?: string;
  status?: string;
};
export type CreateMatchDTO = CreateMatchInput;