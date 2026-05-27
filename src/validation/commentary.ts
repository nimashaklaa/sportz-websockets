import { z } from 'zod';

export const commentaryIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const commentaryMatchParamSchema = z.object({
  matchId: z.coerce.number().int().positive(),
});

export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  eventType: z.string().min(1).optional(),
  period: z.string().min(1).optional(),
  team: z.string().min(1).optional(),
});

export const createCommentarySchema = z.object({
  matchId: z.number().int().positive(),
  minute: z.number().int().nonnegative().max(200).optional(),
  sequence: z.number().int().nonnegative().optional(),
  period: z.string().min(1).max(50).optional(),
  eventType: z.string().min(1).max(100).optional(),
  actor: z.string().min(1).max(255).optional(),
  team: z.string().min(1).max(255).optional(),
  message: z.string().min(1).max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string().min(1).max(100)).optional(),
});

export const updateCommentarySchema = z.object({
  minute: z.number().int().nonnegative().max(200).optional(),
  sequence: z.number().int().nonnegative().optional(),
  period: z.string().min(1).max(50).optional(),
  eventType: z.string().min(1).max(100).optional(),
  actor: z.string().min(1).max(255).optional(),
  team: z.string().min(1).max(255).optional(),
  message: z.string().min(1).max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string().min(1).max(100)).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export type CreateCommentaryInput = z.infer<typeof createCommentarySchema>;
export type UpdateCommentaryInput = z.infer<typeof updateCommentarySchema>;
