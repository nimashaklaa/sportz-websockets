import { Router, Request, Response } from 'express';
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches';
import { db } from '../db/db';
import { matches } from '../db/schema';
import { getMatchStatus } from '../utils/match-status';
import { desc } from 'drizzle-orm';

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get('/', async (req: Request, res: Response) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query', details: parsed.error.issues });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const result = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
    return res.status(200).json({ data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

matchRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
  }

  const { startTime, endTime, homeScore, awayScore } = parsed.data;

  try {
    const calculatedStatus = getMatchStatus(startTime, endTime) ?? 'scheduled';

    const [event] = await db.insert(matches).values({
      ...parsed.data,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      homeScore: homeScore ?? 0,
      awayScore: awayScore ?? 0,
      status: calculatedStatus,
    }).returning();

    if(res.app.locals.broadcastMatchCreated) {
      res.app.locals.broadcastMatchCreated(event);
    }

    return res.status(201).json({ data: event });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create match' });
  }
});