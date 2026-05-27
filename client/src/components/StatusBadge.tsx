import type { MatchStatus } from '../types';

const config: Record<MatchStatus, { label: string; className: string }> = {
  live:      { label: 'LIVE',     className: 'bg-red-50 text-red-600 border border-red-200' },
  scheduled: { label: 'UPCOMING', className: 'bg-blue-50 text-blue-600 border border-blue-200' },
  finished:  { label: 'FINISHED', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full ${className}`}>
      {status === 'live' && (
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
      )}
      {label}
    </span>
  );
}
