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
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6">

        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <h1 className="text-xl font-bold text-slate-100 leading-tight">Sportz</h1>
              <p className="text-slate-500 text-xs">Live match tracker</p>
            </div>
          </div>
          {liveCount > 0 && (
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              {liveCount} live {liveCount === 1 ? 'match' : 'matches'}
            </div>
          )}
        </header>

        <div className="flex gap-6">
          <div className="w-80 shrink-0">
            <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 mb-4">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                    filter === f.value
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {matchesLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm">No matches found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
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

          <div className="flex-1 min-w-0">
            {selectedMatch ? (
              <MatchDetail
                key={selectedMatch.id}
                match={selectedMatch}
                onBack={() => selectMatch(null)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-600 rounded-2xl border border-slate-700/40 border-dashed">
                <p className="text-4xl mb-3">👈</p>
                <p className="text-sm">Select a match to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
