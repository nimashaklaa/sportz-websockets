import type { MatchStatus } from '../types';

const config: Record<MatchStatus, { label: string; className: string }> = {
  live:      { label: 'LIVE',      className: 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' },
  scheduled: { label: 'UPCOMING',  className: 'bg-slate-700/60 text-slate-400 border border-slate-600' },
  finished:  { label: 'FINISHED',  className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' },
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  const { label, className } = config[status];
  return (
    <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
