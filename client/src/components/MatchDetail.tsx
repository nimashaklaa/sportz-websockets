import { useEffect, useCallback } from 'react';
import type { Match, Commentary } from '../types';
import { useSportzStore } from '../store';
import { StatusBadge } from './StatusBadge';
import { CommentaryFeed } from './CommentaryFeed';
import { useMatchSocket } from '../hooks/useMatchSocket';

interface Props {
  match: Match;
  onBack: () => void;
}

export function MatchDetail({ match, onBack }: Props) {
  const { commentary, commentaryLoading, fetchCommentary, appendCommentary, updateMatch, selectedMatch } = useSportzStore();

  const liveMatch = selectedMatch ?? match;
  const matchCommentary: Commentary[] = commentary[match.id] ?? [];

  const handleSocketMessage = useCallback((msg: Record<string, unknown>) => {
    if (msg.type === 'commentary_update') {
      const entry = msg.data as Commentary;
      if (entry.matchId === match.id) {
        appendCommentary(entry);
      }
    }
    if (msg.type === 'match_update') {
      const updated = msg.data as Match;
      if (updated.id === match.id) {
        updateMatch(updated);
      }
    }
  }, [match.id, appendCommentary, updateMatch]);

  const { subscribe, unsubscribe } = useMatchSocket(handleSocketMessage);

  useEffect(() => {
    fetchCommentary(match.id);
  }, [match.id]);

  useEffect(() => {
    const timer = setTimeout(() => subscribe(match.id), 300);
    return () => {
      clearTimeout(timer);
      unsubscribe(match.id);
    };
  }, [match.id, subscribe, unsubscribe]);

  const startDate = new Date(liveMatch.startTime);

  return (
    <div className="flex flex-col gap-4">
      {/* Back navigation */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1d4ed8] transition-colors font-medium"
        >
          <span className="text-base leading-none">←</span>
          All matches
        </button>
      </div>

      {/* Scoreboard */}
      <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm overflow-hidden">
        {/* Sport & status row */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#f1f5f9] bg-[#f8fafc]">
          <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">{liveMatch.sport}</span>
          <StatusBadge status={liveMatch.status} />
        </div>

        {/* Score block */}
        <div className="flex items-center justify-between gap-4 px-5 py-6">
          <div className="flex-1 text-right">
            <p className="text-lg font-bold text-[#0f172a] leading-tight">{liveMatch.homeTeam}</p>
            <p className="text-xs text-[#94a3b8] mt-1 font-medium uppercase tracking-wide">Home</p>
          </div>

          <div className="text-center px-4">
            {liveMatch.status === 'scheduled' ? (
              <div>
                <p className="text-3xl font-bold text-[#0f172a] tabular-nums">
                  {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm text-[#64748b] mt-1">
                  {startDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-5xl font-bold tabular-nums text-[#0f172a]">
                  {liveMatch.homeScore}
                  <span className="text-[#cbd5e1] mx-3 font-light">:</span>
                  {liveMatch.awayScore}
                </p>
                {liveMatch.status === 'live' && (
                  <p className="text-xs text-red-500 font-semibold mt-2 tracking-wide">IN PROGRESS</p>
                )}
                {liveMatch.status === 'finished' && (
                  <p className="text-xs text-[#94a3b8] font-medium mt-2 tracking-wide">FULL TIME</p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 text-left">
            <p className="text-lg font-bold text-[#0f172a] leading-tight">{liveMatch.awayTeam}</p>
            <p className="text-xs text-[#94a3b8] mt-1 font-medium uppercase tracking-wide">Away</p>
          </div>
        </div>
      </div>

      {/* Commentary section */}
      <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#f1f5f9]">
          <h2 className="text-sm font-semibold text-[#0f172a] tracking-wide">Commentary</h2>
          {liveMatch.status === 'live' && (
            <span className="flex items-center gap-1.5 text-red-600 text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Live updates
            </span>
          )}
        </div>

        <div className="p-4">
          {commentaryLoading && matchCommentary.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <CommentaryFeed commentary={matchCommentary} isLive={liveMatch.status === 'live'} />
          )}
        </div>
      </div>
    </div>
  );
}
