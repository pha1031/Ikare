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

const saveHistory = (state: GameState) => {
  const newHistory = [...state.history, state.activePlayers].slice(-10);
  return { history: newHistory };
};

// サーバーサイドでのビルドエラーを防ぐための安全なストレージ設定
const storage = createJSONStorage<GameState>(() => {
  if (typeof window !== 'undefined') {
    return localStorage;
  }
  // サーバー側では何もしないダミーのストレージを返す
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
});

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
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
        if (state.history.length === 0) return state; // 何も返さないと型エラーになることがあるのでstateを返す
        
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
      name: 'ikare-storage',
      storage: storage, // 安全装置付きのストレージを使用
      skipHydration: true, // サーバーとクライアントの不整合エラー（Hydration Error）を防ぐ
    }
  )
);

// Hydration（初期化）を手動で行うためのフック（必須ではないが安全のため）
// コンポーネント側で useEffect(() => { useGameStore.persist.rehydrate() }, []) を呼ぶのがベストだが、
// 今回は skipHydration: true にしているので、クライアント側で自動的に読み込まれるのを待つ形にします。

function anyToNumber(rank: string): number {
  if (rank.includes('1')) return 1;
  if (rank.includes('2')) return 2;
  if (rank.includes('3')) return 3;
  if (rank.includes('4')) return 4;
  return 0;
}