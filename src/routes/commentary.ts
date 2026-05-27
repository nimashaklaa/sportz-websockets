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
import { eq, desc } from 'drizzle-orm';

export const commentaryRouter = Router();

const MAX_LIMIT = 100;

// GET /commentary?limit=&eventType=&period=&team=
commentaryRouter.get('/', async (req: Request, res: Response) => {
  const parsed = listCommentaryQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query', details: parsed.error.issues });
  }

  const { limit: rawLimit, eventType, period, team } = parsed.data;
  const limit = Math.min(rawLimit ?? 50, MAX_LIMIT);

  try {
    const result = await db
      .select()
      .from(commentary)
      .where(
        eventType ? eq(commentary.eventType, eventType) :
        period    ? eq(commentary.period, period) :
        team      ? eq(commentary.team, team) :
        undefined
      )
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    return res.status(200).json({ data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch commentary' });
  }
});

// GET /commentary/match/:matchId
commentaryRouter.get('/match/:matchId', async (req: Request, res: Response) => {
  const parsed = commentaryMatchParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid match ID', details: parsed.error.issues });
  }

  const queryParsed = listCommentaryQuerySchema.safeParse(req.query);

  if (!queryParsed.success) {
    return res.status(400).json({ error: 'Invalid query', details: queryParsed.error.issues });
  }

  const { matchId } = parsed.data;
  const limit = Math.min(queryParsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const matchExists = await db.select({ id: matches.id }).from(matches).where(eq(matches.id, matchId)).limit(1);

    if (matchExists.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const result = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, matchId))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    return res.status(200).json({ data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch commentary' });
  }
});

// GET /commentary/:id
commentaryRouter.get('/:id', async (req: Request, res: Response) => {
  const parsed = commentaryIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid ID', details: parsed.error.issues });
  }

  try {
    const [entry] = await db.select().from(commentary).where(eq(commentary.id, parsed.data.id));

    if (!entry) {
      return res.status(404).json({ error: 'Commentary not found' });
    }

    return res.status(200).json({ data: entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch commentary' });
  }
});

// POST /commentary
commentaryRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createCommentarySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
  }

  try {
    const matchExists = await db.select({ id: matches.id }).from(matches).where(eq(matches.id, parsed.data.matchId)).limit(1);

    if (matchExists.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const [entry] = await db.insert(commentary).values(parsed.data).returning();

    if (res.app.locals.broadcastCommentary) {
      res.app.locals.broadcastCommentary(entry);
    }

    return res.status(201).json({ data: entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create commentary' });
  }
});

// PATCH /commentary/:id
commentaryRouter.patch('/:id', async (req: Request, res: Response) => {
  const paramParsed = commentaryIdParamSchema.safeParse(req.params);

  if (!paramParsed.success) {
    return res.status(400).json({ error: 'Invalid ID', details: paramParsed.error.issues });
  }

  const bodyParsed = updateCommentarySchema.safeParse(req.body);

  if (!bodyParsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: bodyParsed.error.issues });
  }

  try {
    const [entry] = await db
      .update(commentary)
      .set(bodyParsed.data)
      .where(eq(commentary.id, paramParsed.data.id))
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

// DELETE /commentary/:id
commentaryRouter.delete('/:id', async (req: Request, res: Response) => {
  const parsed = commentaryIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid ID', details: parsed.error.issues });
  }

  try {
    const [entry] = await db
      .delete(commentary)
      .where(eq(commentary.id, parsed.data.id))
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
