import { useEffect, useRef } from 'react';
import type { Commentary } from '../types';

const eventColors: Record<string, string> = {
  goal:        'text-emerald-400',
  yellow_card: 'text-yellow-400',
  red_card:    'text-red-400',
  substitution:'text-blue-400',
  penalty:     'text-orange-400',
  foul:        'text-slate-400',
};

const eventIcons: Record<string, string> = {
  goal:        '⚽',
  yellow_card: '🟨',
  red_card:    '🟥',
  substitution:'🔄',
  penalty:     '🎯',
  foul:        '🛑',
};

function getEventColor(eventType: string | null): string {
  return eventType ? (eventColors[eventType.toLowerCase()] ?? 'text-slate-300') : 'text-slate-300';
}

function getEventIcon(eventType: string | null): string {
  return eventType ? (eventIcons[eventType.toLowerCase()] ?? '📋') : '📋';
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
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">No commentary yet</p>
        {isLive && <p className="text-xs text-slate-600 mt-1">Updates will appear here live</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto max-h-[500px] pr-1">
      {[...commentary].reverse().map((entry) => (
        <div
          key={entry.id}
          className="flex gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
        >
          <div className="flex flex-col items-center min-w-[36px]">
            <span className="text-lg">{getEventIcon(entry.eventType)}</span>
            {entry.minute != null && (
              <span className="text-slate-500 text-xs font-mono mt-1">{entry.minute}'</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              {entry.eventType && (
                <span className={`text-xs font-semibold uppercase tracking-wide ${getEventColor(entry.eventType)}`}>
                  {entry.eventType.replace(/_/g, ' ')}
                </span>
              )}
              {entry.period && (
                <span className="text-slate-600 text-xs">{entry.period.replace(/_/g, ' ')}</span>
              )}
              {entry.actor && (
                <span className="text-slate-300 text-xs font-medium">{entry.actor}</span>
              )}
              {entry.team && (
                <span className="text-slate-500 text-xs">({entry.team})</span>
              )}
            </div>
            {entry.message && (
              <p className="text-slate-300 text-sm leading-snug">{entry.message}</p>
            )}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {entry.tags.map((tag) => (
                  <span key={tag} className="text-[10px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded">
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
