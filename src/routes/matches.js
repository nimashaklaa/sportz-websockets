import { Router } from 'express';
import { createMatchSchema ,listMatchesQuerySchema } from '../validation/matches.js';
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { getMatchStatus } from '../utils/match-status.js';
import {desc} from 'drizzle-orm';

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get('/', async(req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);

    if(!parsed.success) return res.status(400).json({
        error:'Invalid payload',
        details:parsed.error.issues
    })
    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);
    try{
        const result = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);

        return res.status(200).json({data: result});

    }catch(err){
        res.status(500).json({error:'Failed to fetch matches'})
    }
})

matchRouter.post('/', async (req, res) => {
    // safeParse is a method used to validate data without throwing a runtime error if the validation fails
    const parsed = createMatchSchema.safeParse(req.body);

    if(!parsed.success) return res.status(400).json({
        error:'Invalid payload',
        details:parsed.error.issues
    })

    const { startTime, endTime, homeScore, awayScore } = parsed.data;

    try{
        const calculatedStatus = getMatchStatus(startTime, endTime) || 'scheduled';

        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: calculatedStatus
        }).returning();

        res.status(201).json({data: event});
    }catch(err){
        console.error("Database Insertion Error:", err);
        res.status(500).json({
            error:'Failed to create match',
            details:JSON.stringify(parsed.error)
        })
    }
})