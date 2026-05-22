import { MATCH_STATUS } from "../validation/matches.js";

export function getMatchStatus(startTime, endTime, now= new Date()) {
  const start = new Date(startTime);

  if(Number.isNaN(start.getTime())) {
      return null;
  }
  if(now < start) {
      return MATCH_STATUS.SCHEDULED;
  }

  const end = endTime ? new Date(endTime) : null;
  if(end && !Number.isNaN(end.getTime()) && now >= end) {
      return MATCH_STATUS.FINISHED;
  }

  return MATCH_STATUS.LIVE;
}

export async function syncMatchStatus(match, updateStatus) {
    const nextStatus = getMatchStatus(match.startTime, match.endTime);
    if(!nextStatus) {
        return match.status;
    }
    if(nextStatus !== match.status) {
        await updateStatus(nextStatus);
        match.status = nextStatus;
    }
    return match.status;
}