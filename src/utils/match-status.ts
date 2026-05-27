import { MATCH_STATUS, MatchStatus } from '../validation/matches.ts';
import { Match } from '../db/schema.ts';

export function getMatchStatus(startTime: string | Date, endTime?: string | Date | null, now = new Date()): MatchStatus | null {
  const start = new Date(startTime);

  if (Number.isNaN(start.getTime())) {
    return null;
  }
  if (now < start) {
    return MATCH_STATUS.SCHEDULED;
  }

  const end = endTime ? new Date(endTime) : null;
  if (end && !Number.isNaN(end.getTime()) && now >= end) {
    return MATCH_STATUS.FINISHED;
  }

  return MATCH_STATUS.LIVE;
}

export async function syncMatchStatus(
  match: Match,
  updateStatus: (status: MatchStatus) => Promise<void>
): Promise<MatchStatus> {
  const nextStatus = getMatchStatus(match.startTime, match.endTime);
  if (!nextStatus) {
    return match.status;
  }
  if (nextStatus !== match.status) {
    await updateStatus(nextStatus);
    match = { ...match, status: nextStatus };
  }
  return match.status;
}