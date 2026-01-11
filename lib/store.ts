import { create } from 'zustand';
import { GamePlayer, Player, RankType } from '@/types';

type GameState = {
  activePlayers: GamePlayer[];
  setPlayers: (players: Player[]) => void;
  updateChip: (playerId: string, amount: number) => void;
  updateRankAndScore: (playerId: string, rank: RankType, score: number) => void;
  // ▼ 追加: スコアだけの微調整用
  updateScore: (playerId: string, amount: number) => void; 
  resetGame: () => void;
};

export const useGameStore = create<GameState>((set) => ({
  activePlayers: [],

  setPlayers: (players) => set(() => ({
    activePlayers: players.map(p => ({
      ...p, score: 0, chip: 0, rank: null
    }))
  })),

  updateChip: (playerId, amount) => set((state) => ({
    activePlayers: state.activePlayers.map(p => 
      p.id === playerId ? { ...p, chip: p.chip + amount } : p
    )
  })),

  updateRankAndScore: (playerId, rank, score) => set((state) => ({
    activePlayers: state.activePlayers.map(p => 
      p.id === playerId ? { ...p, rank: anyToNumber(rank), score: p.score + score } : p
    )
  })),

  // ▼ 追加実装: スコアの加算・減算
  updateScore: (playerId, amount) => set((state) => ({
    activePlayers: state.activePlayers.map(p => 
      p.id === playerId ? { ...p, score: p.score + amount } : p
    )
  })),

  resetGame: () => set((state) => ({
    activePlayers: state.activePlayers.map(p => ({
      ...p, chip: 0, score: 0, rank: null
    }))
  })),
}));

// (anyToNumber関数はそのまま)
function anyToNumber(rank: string): number {
  if (rank.includes('1')) return 1;
  if (rank.includes('2')) return 2;
  if (rank.includes('3')) return 3;
  if (rank.includes('4')) return 4;
  return 0;
}