import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GamePlayer, Player, RankType } from '@/types';

// モードの型定義
export type GameMode = '3ma' | '4ma' | '5ma';

type GameState = {
  gameMode: GameMode;         // ▼ 追加: 3人/4人/5人打ち
  activePlayers: GamePlayer[]; // 参加している全プレイヤー（5人打ちなら5人入る）
  sittingOutId: string | null; // ▼ 追加: 抜け番のプレイヤーID
  history: { players: GamePlayer[]; sittingOutId: string | null }[]; // 履歴も抜け番情報を保持するように変更
  
  setGameMode: (mode: GameMode) => void; // ▼ 追加
  setPlayers: (players: Player[]) => void;
  setSittingOut: (playerId: string | null) => void; // ▼ 追加
  updateChip: (playerId: string, amount: number) => void;
  updateRankAndScore: (playerId: string, rank: RankType, score: number) => void;
  updateScore: (playerId: string, amount: number) => void;
  updateAllPlayers: (players: GamePlayer[]) => void; 
  undo: () => void;
  resetGame: () => void;
};

const saveHistory = (state: GameState) => {
  // プレイヤー状態と抜け番状態の両方を履歴に残す
  const newHistory = [...state.history, { 
    players: state.activePlayers, 
    sittingOutId: state.sittingOutId 
  }].slice(-10);
  return { history: newHistory };
};

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      gameMode: '4ma', // デフォルト
      activePlayers: [],
      sittingOutId: null,
      history: [],

      setGameMode: (mode) => set(() => ({ gameMode: mode })),

      setPlayers: (players) => set(() => ({
        activePlayers: players.map(p => ({
          ...p, score: 0, chip: 0, rank: null
        })),
        sittingOutId: null, // 初期化時は抜け番なし（あとで設定）
        history: []
      })),

      setSittingOut: (playerId) => set((state) => ({
        ...saveHistory(state),
        sittingOutId: playerId
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

      updateAllPlayers: (players) => set((state) => ({
        ...saveHistory(state),
        activePlayers: players
      })),

      undo: () => set((state) => {
        if (state.history.length === 0) return {};
        const previousState = state.history[state.history.length - 1];
        const newHistory = state.history.slice(0, -1);
        return {
          activePlayers: previousState.players,
          sittingOutId: previousState.sittingOutId,
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
      name: 'ikare-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      skipHydration: true,
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