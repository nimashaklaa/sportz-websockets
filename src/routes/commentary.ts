import { Router, Request, Response } from 'express';
import {
  createCommentarySchema,
  updateCommentarySchema,
  listCommentaryQuerySchema,
  commentaryIdParamSchema,
  commentaryMatchParamSchema,
} from '../validation/commentary';
import { db } from '../db/db';
import { commentary, matches } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

// GET /matches/:matchId/commentary
commentaryRouter.get('/', async (req: Request, res: Response) => {
  const paramParsed = commentaryMatchParamSchema.safeParse(req.params);

  if (!paramParsed.success) {
    return res.status(400).json({ error: 'Invalid match ID', details: paramParsed.error.issues });
  }

  const queryParsed = listCommentaryQuerySchema.safeParse(req.query);

  if (!queryParsed.success) {
    return res.status(400).json({ error: 'Invalid query', details: queryParsed.error.issues });
  }

  const { matchId } = paramParsed.data;
  const { limit: rawLimit, eventType, period, team } = queryParsed.data;
  const limit = Math.min(rawLimit ?? 50, MAX_LIMIT);

  try {
    const matchExists = await db.select({ id: matches.id }).from(matches).where(eq(matches.id, matchId)).limit(1);

    if (matchExists.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const filters = [
      eq(commentary.matchId, matchId),
      ...(eventType ? [eq(commentary.eventType, eventType)] : []),
      ...(period    ? [eq(commentary.period, period)]     : []),
      ...(team      ? [eq(commentary.team, team)]         : []),
    ];

    const result = await db
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
commentaryRouter.get('/:id', async (req: Request, res: Response) => {
  const paramParsed = commentaryMatchParamSchema.safeParse(req.params);
  const idParsed = commentaryIdParamSchema.safeParse(req.params);

  if (!paramParsed.success || !idParsed.success) {
    return res.status(400).json({ error: 'Invalid params' });
  }

  try {
    const [entry] = await db
      .select()
      .from(commentary)
      .where(and(eq(commentary.id, idParsed.data.id), eq(commentary.matchId, paramParsed.data.matchId)));

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
commentaryRouter.post('/', async (req: Request, res: Response) => {
  const paramParsed = commentaryMatchParamSchema.safeParse(req.params);

  if (!paramParsed.success) {
    return res.status(400).json({ error: 'Invalid match ID', details: paramParsed.error.issues });
  }

  const bodyParsed = createCommentarySchema.omit({ matchId: true }).safeParse(req.body);

  if (!bodyParsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: bodyParsed.error.issues });
  }

  const { matchId } = paramParsed.data;

  try {
    const matchExists = await db.select({ id: matches.id }).from(matches).where(eq(matches.id, matchId)).limit(1);

    if (matchExists.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const [entry] = await db.insert(commentary).values({ ...bodyParsed.data, matchId }).returning();

    if (res.app.locals.broadcastCommentary) {
      res.app.locals.broadcastCommentary(entry);
    }

    return res.status(201).json({ data: entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create commentary' });
  }
});

// PATCH /matches/:matchId/commentary/:id
commentaryRouter.patch('/:id', async (req: Request, res: Response) => {
  const paramParsed = commentaryMatchParamSchema.safeParse(req.params);
  const idParsed = commentaryIdParamSchema.safeParse(req.params);

  if (!paramParsed.success || !idParsed.success) {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const bodyParsed = updateCommentarySchema.safeParse(req.body);

  if (!bodyParsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: bodyParsed.error.issues });
  }

  try {
    const [entry] = await db
      .update(commentary)
      .set(bodyParsed.data)
      .where(and(eq(commentary.id, idParsed.data.id), eq(commentary.matchId, paramParsed.data.matchId)))
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
commentaryRouter.delete('/:id', async (req: Request, res: Response) => {
  const paramParsed = commentaryMatchParamSchema.safeParse(req.params);
  const idParsed = commentaryIdParamSchema.safeParse(req.params);

  if (!paramParsed.success || !idParsed.success) {
    return res.status(400).json({ error: 'Invalid params' });
  }

  try {
    const [entry] = await db
      .delete(commentary)
      .where(and(eq(commentary.id, idParsed.data.id), eq(commentary.matchId, paramParsed.data.matchId)))
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
