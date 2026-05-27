import { Router, Request, Response } from 'express';
import {
  parseMatchParams,
  parseCommentaryParams,
  parseListCommentaryQuery,
  parseCreateCommentaryBody,
  parseUpdateCommentaryBody,
  type MatchParamsDTO,
  type CommentaryParamsDTO,
  type ListCommentaryQueryDTO,
  type CreateCommentaryDTO,
  type UpdateCommentaryDTO,
} from '../validation/commentary';
import { db } from '../db/db';
import { commentary, matches } from '../db/schema';
import { eq, desc, and, SQL } from 'drizzle-orm';
import type { Commentary } from '../db/schema';

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

type GetReq<P, Q> = Request<P, unknown, unknown, Q>;
type MutateReq<P, B> = Request<P, unknown, B>;

// GET /matches/:matchId/commentary
commentaryRouter.get('/', async (req: GetReq<MatchParamsDTO, ListCommentaryQueryDTO>, res: Response) => {
  const paramParsed = parseMatchParams(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({ error: 'Invalid match ID', details: paramParsed.error.issues });
  }

  const queryParsed = parseListCommentaryQuery(req.query);
  if (!queryParsed.success) {
    return res.status(400).json({ error: 'Invalid query', details: queryParsed.error.issues });
  }

  const { matchId } = paramParsed.data;
  const { limit: rawLimit, eventType, period, team } = queryParsed.data;
  const limit = Math.min(rawLimit ?? 50, MAX_LIMIT);

  try {
    const matchExists: { id: number }[] = await db.select({ id: matches.id }).from(matches).where(eq(matches.id, matchId)).limit(1);
    if (matchExists.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const filters: SQL[] = [
      eq(commentary.matchId, matchId),
      ...(eventType ? [eq(commentary.eventType, eventType)] : []),
      ...(period    ? [eq(commentary.period, period)]       : []),
      ...(team      ? [eq(commentary.team, team)]           : []),
    ];

    const result: Commentary[] = await db
      .select()
      .from(commentary)
      .where(and(...filters))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    return res.status(200).json({ data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch commentary' });
  }
});

// GET /matches/:matchId/commentary/:id
commentaryRouter.get('/:id', async (req: GetReq<CommentaryParamsDTO, never>, res: Response) => {
  const paramParsed = parseCommentaryParams(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({ error: 'Invalid params', details: paramParsed.error.issues });
  }

  try {
    const [entry]: Commentary[] = await db
      .select()
      .from(commentary)
      .where(and(eq(commentary.id, paramParsed.data.id), eq(commentary.matchId, paramParsed.data.matchId)));

    if (!entry) {
      return res.status(404).json({ error: 'Commentary not found' });
    }

    return res.status(200).json({ data: entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch commentary' });
  }
});

// POST /matches/:matchId/commentary
commentaryRouter.post('/', async (req: MutateReq<MatchParamsDTO, CreateCommentaryDTO>, res: Response) => {
  const paramParsed = parseMatchParams(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({ error: 'Invalid match ID', details: paramParsed.error.issues });
  }

  const bodyParsed = parseCreateCommentaryBody(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: bodyParsed.error.issues });
  }

  const { matchId } = paramParsed.data;

  try {
    const matchExists: { id: number }[] = await db.select({ id: matches.id }).from(matches).where(eq(matches.id, matchId)).limit(1);
    if (matchExists.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const [entry]: Commentary[] = await db.insert(commentary).values({ ...bodyParsed.data, matchId }).returning();

    if (res.app.locals.broadcastCommentary) {
      res.app.locals.broadcastCommentary(entry.matchId, entry);
    }

    return res.status(201).json({ data: entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create commentary' });
  }
});

// PATCH /matches/:matchId/commentary/:id
commentaryRouter.patch('/:id', async (req: MutateReq<CommentaryParamsDTO, UpdateCommentaryDTO>, res: Response) => {
  const paramParsed = parseCommentaryParams(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({ error: 'Invalid params', details: paramParsed.error.issues });
  }

  const bodyParsed = parseUpdateCommentaryBody(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: bodyParsed.error.issues });
  }

  try {
    const [entry]: Commentary[] = await db
      .update(commentary)
      .set(bodyParsed.data)
      .where(and(eq(commentary.id, paramParsed.data.id), eq(commentary.matchId, paramParsed.data.matchId)))
      .returning();

    if (!entry) {
      return res.status(404).json({ error: 'Commentary not found' });
    }

    return res.status(200).json({ data: entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update commentary' });
  }
});

// DELETE /matches/:matchId/commentary/:id
commentaryRouter.delete('/:id', async (req: GetReq<CommentaryParamsDTO, never>, res: Response) => {
  const paramParsed = parseCommentaryParams(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({ error: 'Invalid params', details: paramParsed.error.issues });
  }

  try {
    const [entry]: Commentary[] = await db
      .delete(commentary)
      .where(and(eq(commentary.id, paramParsed.data.id), eq(commentary.matchId, paramParsed.data.matchId)))
      .returning();

    if (!entry) {
      return res.status(404).json({ error: 'Commentary not found' });
    }

    return res.status(200).json({ data: entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete commentary' });
  }
});
