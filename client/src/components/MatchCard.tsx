import type { Match } from '../types';
import { StatusBadge } from './StatusBadge';

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
      className={`w-full text-left rounded-lg border p-3.5 transition-all cursor-pointer ${
        isSelected
          ? 'border-[#1d4ed8] bg-white shadow-sm border-l-4'
          : 'border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[#94a3b8]">{match.sport}</span>
        <StatusBadge status={match.status} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-right">
          <p className="font-semibold text-sm leading-tight text-[#1e293b]">{match.homeTeam}</p>
          <p className="text-[10px] text-[#94a3b8] mt-0.5">Home</p>
        </div>

        <div className="flex items-center gap-2 px-2">
          {match.status === 'scheduled' ? (
            <div className="text-center">
              <p className="text-[#0f172a] font-bold text-sm tabular-nums">{timeStr}</p>
              <p className="text-[#94a3b8] text-xs">{dateStr}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[#0f172a] font-bold text-lg tabular-nums">
                {match.homeScore}
                <span className="text-[#cbd5e1] mx-1.5 font-normal">—</span>
                {match.awayScore}
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 text-left">
          <p className="font-semibold text-sm leading-tight text-[#1e293b]">{match.awayTeam}</p>
          <p className="text-[10px] text-[#94a3b8] mt-0.5">Away</p>
        </div>
      </div>
    </button>
  );
}
