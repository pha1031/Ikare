// プレイヤーの定義
export type Player = {
  id: string;
  name: string;
};

// ゲームに参加中のプレイヤー情報
export type GamePlayer = Player & {
  score: number; // 持ち点（順位点計算前）
  chip: number;  // チップ枚数
  rank: number | null; // 着順 (1-4)
};

// 順位の種類（UI選択用）
export type RankType = '1着' | '浮き2着' | '沈み2着' | '浮き3着' | '沈み3着' | '4着';