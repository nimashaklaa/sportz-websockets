import { Router, Request, Response } from 'express';
import { createMatchSchema, listMatchesQuerySchema, type ListMatchesQueryDTO, type CreateMatchDTO } from '../validation/matches';
import { db } from '../db/db';
import { matches, type Match } from '../db/schema';
import { getMatchStatus } from '../utils/match-status';
import { desc, eq } from 'drizzle-orm';

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get('/', async (req: Request<Record<string, never>, unknown, unknown, ListMatchesQueryDTO>, res: Response) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query', details: parsed.error.issues });
  }

  const { limit: rawLimit, status } = parsed.data;
  const limit = Math.min(rawLimit ?? 50, MAX_LIMIT);

  try {
    const result: Match[] = await db
      .select()
      .from(matches)
      .where(status ? eq(matches.status, status) : undefined)
      .orderBy(desc(matches.createdAt))
      .limit(limit);
    return res.status(200).json({ data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

matchRouter.post('/', async (req: Request<Record<string, never>, unknown, CreateMatchDTO>, res: Response) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
  }

  const { startTime, endTime, homeScore, awayScore } = parsed.data;

  try {
    const calculatedStatus = getMatchStatus(startTime, endTime) ?? 'scheduled';

    const [event]: Match[] = await db.insert(matches).values({
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