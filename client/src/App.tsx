import { useEffect } from 'react';
import type { MatchStatus } from './types';
import { useSportzStore } from './store';
import { MatchCard } from './components/MatchCard';
import { MatchDetail } from './components/MatchDetail';

const FILTERS: { label: string; value: MatchStatus | 'all' }[] = [
  { label: 'All',      value: 'all' },
  { label: 'Live',     value: 'live' },
  { label: 'Upcoming', value: 'scheduled' },
  { label: 'Finished', value: 'finished' },
];

export default function App() {
  const { matches, matchesLoading, filter, selectedMatch, setFilter, fetchMatches, selectMatch } = useSportzStore();

  useEffect(() => {
    fetchMatches();
  }, []);

  const liveCount = matches.filter((m) => m.status === 'live').length;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-[#1d4ed8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-[#0f172a] tracking-tight">Sportz</span>
              <span className="text-xs text-[#94a3b8] font-normal hidden sm:inline">Live match tracker</span>
            </div>
          </div>
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 text-red-600 text-xs font-semibold bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              {liveCount} live {liveCount === 1 ? 'match' : 'matches'}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-5 items-start">
          {/* Sidebar */}
          <div className="w-72 shrink-0 sticky top-20">
            {/* Filter tabs */}
            <div className="flex border-b border-[#e2e8f0] mb-4">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`flex-1 text-xs py-2.5 font-medium transition-all cursor-pointer border-b-2 -mb-px ${
                    filter === f.value
                      ? 'border-[#1d4ed8] text-[#1d4ed8]'
                      : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {matchesLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-5 h-5 border-2 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-16 text-[#94a3b8]">
                <svg className="w-8 h-8 text-[#cbd5e1] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">No matches found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
                {matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    isSelected={selectedMatch?.id === match.id}
                    onClick={() => selectMatch(match)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {selectedMatch ? (
              <MatchDetail
                key={selectedMatch.id}
                match={selectedMatch}
                onBack={() => selectMatch(null)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-white" style={{ minHeight: 'calc(100vh - 140px)' }}>
                <svg className="w-10 h-10 text-[#cbd5e1] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm font-semibold text-[#64748b]">Select a match to view details</p>
                <p className="text-xs text-[#94a3b8] mt-1.5">Scores, commentary and live updates</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
