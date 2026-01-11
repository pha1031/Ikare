import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GamePlayer, Player, RankType } from '@/types';

type GameState = {
  activePlayers: GamePlayer[];
  history: GamePlayer[][];
  
  setPlayers: (players: Player[]) => void;
  updateChip: (playerId: string, amount: number) => void;
  updateRankAndScore: (playerId: string, rank: RankType, score: number) => void;
  updateScore: (playerId: string, amount: number) => void;
  undo: () => void;
  resetGame: () => void;
};

// ヘルパー: 履歴保存
const saveHistory = (state: GameState) => {
  const newHistory = [...state.history, state.activePlayers].slice(-10);
  return { history: newHistory };
};

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      activePlayers: [],
      history: [],

      setPlayers: (players) => set(() => ({
        activePlayers: players.map(p => ({
          ...p, score: 0, chip: 0, rank: null
        })),
        history: [] // 新しい対局を始めたら履歴はリセット
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
          p.id === playerId ? { 
            ...p, 
            rank: anyToNumber(rank), 
            score: p.score + score 
          } : p
        )
      })),

      updateScore: (playerId, amount) => set((state) => ({
        ...saveHistory(state),
        activePlayers: state.activePlayers.map(p => 
          p.id === playerId ? { ...p, score: p.score + amount } : p
        )
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
    }),
    {
      name: 'ikare-storage', // ブラウザに保存する時のキー名
      storage: createJSONStorage(() => localStorage), // 保存場所（ローカルストレージ）
    }
  )
);

function anyToNumber(rank: string): number {
  if (rank.includes('1')) return 1;
  if (rank.includes('2')) return 2;
  if (rank.includes('3')) return 3;
  if (rank.includes('4')) return 4;
  return 0;
}