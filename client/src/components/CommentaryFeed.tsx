import { useEffect, useRef } from 'react';
import type { Commentary } from '../types';

const eventAccent: Record<string, string> = {
  goal:         'border-l-emerald-500',
  yellow_card:  'border-l-yellow-400',
  red_card:     'border-l-red-500',
  substitution: 'border-l-blue-400',
  penalty:      'border-l-orange-500',
  foul:         'border-l-slate-300',
};

const eventLabelColor: Record<string, string> = {
  goal:         'text-emerald-700 bg-emerald-50',
  yellow_card:  'text-yellow-700 bg-yellow-50',
  red_card:     'text-red-700 bg-red-50',
  substitution: 'text-blue-700 bg-blue-50',
  penalty:      'text-orange-700 bg-orange-50',
  foul:         'text-slate-600 bg-slate-100',
};

function getEventAccent(eventType: string | null): string {
  return eventType ? (eventAccent[eventType.toLowerCase()] ?? 'border-l-[#e2e8f0]') : 'border-l-[#e2e8f0]';
}

function getEventLabelColor(eventType: string | null): string {
  return eventType ? (eventLabelColor[eventType.toLowerCase()] ?? 'text-[#64748b] bg-[#f1f5f9]') : 'text-[#64748b] bg-[#f1f5f9]';
}

interface Props {
  commentary: Commentary[];
  isLive: boolean;
}

export function CommentaryFeed({ commentary, isLive }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commentary.length]);

  if (commentary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14">
        <svg className="w-8 h-8 text-[#cbd5e1] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-sm font-medium text-[#64748b]">No commentary yet</p>
        {isLive && <p className="text-xs text-[#94a3b8] mt-1">Updates will appear here live</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[480px]">
      {[...commentary].reverse().map((entry) => (
        <div
          key={entry.id}
          className={`flex gap-3 p-3 rounded-lg bg-[#f8fafc] hover:bg-[#f1f5f9] transition-colors border-l-4 ${getEventAccent(entry.eventType)}`}
        >
          <div className="min-w-[32px] text-right pt-0.5">
            {entry.minute != null && (
              <span className="text-[#94a3b8] text-[11px] font-mono font-semibold">{entry.minute}'</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {entry.eventType && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${getEventLabelColor(entry.eventType)}`}>
                  {entry.eventType.replace(/_/g, ' ')}
                </span>
              )}
              {entry.period && (
                <span className="text-[#94a3b8] text-[10px] font-medium">{entry.period.replace(/_/g, ' ')}</span>
              )}
              {entry.actor && (
                <span className="text-[#1e293b] text-xs font-semibold">{entry.actor}</span>
              )}
              {entry.team && (
                <span className="text-[#94a3b8] text-xs">({entry.team})</span>
              )}
            </div>
            {entry.message && (
              <p className="text-[#334155] text-sm leading-snug">{entry.message}</p>
            )}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {entry.tags.map((tag) => (
                  <span key={tag} className="text-[10px] bg-white border border-[#e2e8f0] text-[#64748b] px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
