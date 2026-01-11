import { create } from 'zustand';
import { GamePlayer, Player, RankType } from '@/types';

type GameState = {
  activePlayers: GamePlayer[];
  history: GamePlayer[][];
  
  setPlayers: (players: Player[]) => void;
  updateChip: (playerId: string, amount: number) => void;
  updateRankAndScore: (playerId: string, rank: RankType, score: number) => void;
  updateScore: (playerId: string, amount: number) => void;
  // ▼ 追加: 全員まとめて更新する関数 (Undo対策)
  updateAllPlayers: (players: GamePlayer[]) => void; 
  undo: () => void;
  resetGame: () => void;
};

const saveHistory = (state: GameState) => {
  const newHistory = [...state.history, state.activePlayers].slice(-10);
  return { history: newHistory };
};

export const useGameStore = create<GameState>((set) => ({
  activePlayers: [],
  history: [],

  setPlayers: (players) => set(() => ({
    activePlayers: players.map(p => ({
      ...p, score: 0, chip: 0, rank: null
    })),
    history: []
  })),

  updateChip: (playerId, amount) => set((state) => ({
    ...saveHistory(state),
    activePlayers: state.activePlayers.map(p => 
      p.id === playerId ? { ...p, chip: p.chip + amount } : p
    )
  })),

  updateRankAndScore: (playerId, rank, score) => set((state) => ({
    ...saveHistory(state),
    activePlayers: state.activePlayers.map(p => 
      p.id === playerId ? { ...p, rank: anyToNumber(rank), score: p.score + score } : p
    )
  })),

  updateScore: (playerId, amount) => set((state) => ({
    ...saveHistory(state),
    activePlayers: state.activePlayers.map(p => 
      p.id === playerId ? { ...p, score: p.score + amount } : p
    )
  })),

  // ▼ 追加: 一括更新の実装
  updateAllPlayers: (players) => set((state) => ({
    ...saveHistory(state), // ここで履歴保存は1回だけ行われる
    activePlayers: players
  })),

  undo: () => set((state) => {
    if (state.history.length === 0) return {};
    const previousPlayers = state.history[state.history.length - 1];
    const newHistory = state.history.slice(0, -1);
    return {
      activePlayers: previousPlayers,
      history: newHistory
    };
  }),

  resetGame: () => set((state) => ({
    activePlayers: state.activePlayers.map(p => ({
      ...p, chip: 0, score: 0, rank: null
    })),
    history: []
  })),
}));

function anyToNumber(rank: string): number {
  if (rank.includes('1')) return 1;
  if (rank.includes('2')) return 2;
  if (rank.includes('3')) return 3;
  if (rank.includes('4')) return 4;
  return 0;
}