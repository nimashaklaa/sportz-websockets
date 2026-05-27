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

export const createCommentaryBodySchema = createCommentarySchema.omit({ matchId: true });

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

// Inferred output types (post-validation)
export type CreateCommentaryInput = z.infer<typeof createCommentarySchema>;
export type UpdateCommentaryInput = z.infer<typeof updateCommentarySchema>;

// DTOs — raw wire types matching what Express receives before zod coercion
export type MatchParamsDTO = { matchId: string };
export type CommentaryParamsDTO = { matchId: string; id: string };
export type ListCommentaryQueryDTO = {
  limit?: string;
  eventType?: string;
  period?: string;
  team?: string;
};
export type CreateCommentaryDTO = z.infer<typeof createCommentaryBodySchema>;
export type UpdateCommentaryDTO = UpdateCommentaryInput;

// Parse result type
type ParseOk<T> = { success: true; data: T; error?: never };
type ParseFail = { success: false; data?: never; error: z.ZodError };
type ParseResult<T> = ParseOk<T> | ParseFail;

// Parse helpers with explicit return types — avoids Zod v4 + TS6 inference issues
export function parseMatchParams(params: unknown): ParseResult<{ matchId: number }> {
  return commentaryMatchParamSchema.safeParse(params);
}

export function parseCommentaryParams(params: unknown): ParseResult<{ matchId: number; id: number }> {
  const matchId = commentaryMatchParamSchema.safeParse(params);
  const id = commentaryIdParamSchema.safeParse(params);
  if (!matchId.success) return matchId;
  if (!id.success) return id;
  return { success: true, data: { matchId: matchId.data.matchId, id: id.data.id } };
}

export function parseListCommentaryQuery(query: unknown): ParseResult<{ limit?: number; eventType?: string; period?: string; team?: string }> {
  return listCommentaryQuerySchema.safeParse(query);
}

export function parseCreateCommentaryBody(body: unknown): ParseResult<CreateCommentaryDTO> {
  return createCommentaryBodySchema.safeParse(body);
}

export function parseUpdateCommentaryBody(body: unknown): ParseResult<UpdateCommentaryInput> {
  return updateCommentarySchema.safeParse(body);
}
