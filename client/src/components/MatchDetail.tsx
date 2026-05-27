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
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-700/50"
        >
          ← Back
        </button>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-400 text-sm capitalize">{liveMatch.sport}</span>
          <StatusBadge status={liveMatch.status} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-right">
            <p className="text-xl font-bold text-slate-100">{liveMatch.homeTeam}</p>
            <p className="text-slate-500 text-xs mt-1">Home</p>
          </div>

          <div className="text-center px-4">
            {liveMatch.status === 'scheduled' ? (
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {startDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            ) : (
              <p className="text-5xl font-bold tabular-nums text-slate-100">
                {liveMatch.homeScore}
                <span className="text-slate-600 mx-3 font-light">:</span>
                {liveMatch.awayScore}
              </p>
            )}
          </div>

          <div className="flex-1 text-left">
            <p className="text-xl font-bold text-slate-100">{liveMatch.awayTeam}</p>
            <p className="text-slate-500 text-xs mt-1">Away</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/20 p-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-200 font-semibold text-sm tracking-wide uppercase">Commentary</h2>
          {liveMatch.status === 'live' && (
            <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>

        {commentaryLoading && matchCommentary.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <CommentaryFeed commentary={matchCommentary} isLive={liveMatch.status === 'live'} />
        )}
      </div>
    </div>
  );
}
