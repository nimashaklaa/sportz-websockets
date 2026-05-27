import type { Match } from '../types';
import { StatusBadge } from './StatusBadge';

const sportEmoji: Record<string, string> = {
  football: '⚽',
  soccer:   '⚽',
  cricket:  '🏏',
  basketball: '🏀',
  tennis:   '🎾',
  rugby:    '🏉',
  baseball: '⚾',
};

function getSportEmoji(sport: string): string {
  return sportEmoji[sport.toLowerCase()] ?? '🏆';
}

interface Props {
  match: Match;
  onClick: () => void;
  isSelected: boolean;
}

export function MatchCard({ match, onClick, isSelected }: Props) {
  const startDate = new Date(match.startTime);
  const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${
        isSelected
          ? 'border-violet-500 bg-violet-500/10'
          : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/80'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span>{getSportEmoji(match.sport)}</span>
          <span className="uppercase tracking-wider">{match.sport}</span>
        </div>
        <StatusBadge status={match.status} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-right">
          <p className="font-semibold text-slate-100 text-sm leading-tight">{match.homeTeam}</p>
        </div>

        <div className="flex items-center gap-2 px-3">
          {match.status === 'scheduled' ? (
            <div className="text-center">
              <p className="text-slate-100 font-bold text-sm">{timeStr}</p>
              <p className="text-slate-500 text-xs">{dateStr}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-slate-100 font-bold text-xl tabular-nums">
                {match.homeScore} <span className="text-slate-500 mx-1">—</span> {match.awayScore}
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 text-left">
          <p className="font-semibold text-slate-100 text-sm leading-tight">{match.awayTeam}</p>
        </div>
      </div>
    </button>
  );
}
