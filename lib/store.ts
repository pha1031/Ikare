import { create } from 'zustand';
import { GamePlayer, Player, RankType } from '@/types';

type GameState = {
  activePlayers: GamePlayer[];
  history: GamePlayer[][]; // 履歴保存用
  
  setPlayers: (players: Player[]) => void;
  updateChip: (playerId: string, amount: number) => void;
  updateRankAndScore: (playerId: string, rank: RankType, score: number) => void;
  updateScore: (playerId: string, amount: number) => void;
  undo: () => void; // 元に戻す関数
  resetGame: () => void;
};

// ヘルパー: 状態変更前に履歴にプッシュする
const saveHistory = (state: GameState) => {
  // 履歴は最大10件まで保持（メモリ節約のため）
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
    history: [] // ゲーム開始時に履歴リセット
  })),

  updateChip: (playerId, amount) => set((state) => ({
    ...saveHistory(state), // 変更前に保存
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

  // ▼ Undo機能
  undo: () => set((state) => {
    if (state.history.length === 0) return {}; // 履歴がなければ何もしない
    
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