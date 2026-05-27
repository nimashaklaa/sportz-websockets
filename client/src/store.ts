import { create } from 'zustand';
import type { Match, Commentary, MatchStatus } from './types';

interface SportzState {
  // Matches
  matches: Match[];
  matchesLoading: boolean;
  filter: MatchStatus | 'all';

  // Selected match
  selectedMatch: Match | null;

  // Commentary keyed by matchId
  commentary: Record<number, Commentary[]>;
  commentaryLoading: boolean;

  // Actions
  setFilter: (filter: MatchStatus | 'all') => void;
  fetchMatches: () => Promise<void>;
  selectMatch: (match: Match | null) => void;
  fetchCommentary: (matchId: number) => Promise<void>;
  appendCommentary: (entry: Commentary) => void;
  updateMatch: (match: Match) => void;
}

export const useSportzStore = create<SportzState>((set, get) => ({
  matches: [],
  matchesLoading: false,
  filter: 'all',
  selectedMatch: null,
  commentary: {},
  commentaryLoading: false,

  setFilter: (filter) => {
    set({ filter, selectedMatch: null });
    get().fetchMatches();
  },

  fetchMatches: async () => {
    set({ matchesLoading: true });
    const { filter } = get();
    const params = filter !== 'all' ? `?status=${filter}` : '';
    try {
      const res = await fetch(`/matches${params}`);
      const json = await res.json() as { data: Match[] };
      set({ matches: json.data, matchesLoading: false });
    } catch {
      set({ matchesLoading: false });
    }
  },

  selectMatch: (match) => {
    set({ selectedMatch: match });
  },

  fetchCommentary: async (matchId) => {
    set({ commentaryLoading: true });
    try {
      const res = await fetch(`/matches/${matchId}/commentary`);
      const json = await res.json() as { data: Commentary[] };
      set((state) => ({
        commentary: { ...state.commentary, [matchId]: json.data },
        commentaryLoading: false,
      }));
    } catch {
      set({ commentaryLoading: false });
    }
  },

  appendCommentary: (entry) => {
    set((state) => ({
      commentary: {
        ...state.commentary,
        [entry.matchId]: [...(state.commentary[entry.matchId] ?? []), entry],
      },
    }));
  },

  updateMatch: (updated) => {
    set((state) => ({
      matches: state.matches.map((m) => (m.id === updated.id ? updated : m)),
      selectedMatch: state.selectedMatch?.id === updated.id ? updated : state.selectedMatch,
    }));
  },
}));
