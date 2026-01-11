import { RankType } from "@/types";

// 順位ごとのスコア変動（順位点）
export const RANK_SCORE_BASE = {
  '1着': 60,
  '浮き2着': 20,
  '沈み2着': 20,
  '浮き3着': -20,
  '沈み3着': -20,
  '4着': -60,
};

// 順位の組み合わせに応じたチップ変動ロジック
export function calculateRankChips(ranks: RankType[]): Record<RankType, number> {
  // デフォルトの変動量（初期値0）
  const changes: Record<RankType, number> = {
    '1着': 0, '浮き2着': 0, '沈み2着': 0, 
    '浮き3着': 0, '沈み3着': 0, '4着': 0
  };

  const has = (type: RankType) => ranks.includes(type);

  // パターン判定
  if (has('沈み2着') && has('沈み3着')) {
    // パターンA: 1人浮き（1着のみプラス）
    changes['1着'] = 9;
    changes['沈み2着'] = -3;
    changes['沈み3着'] = -3;
    changes['4着'] = -3;
  } 
  else if (has('浮き2着') && has('沈み3着')) {
    // パターンB: 2人浮き（2着までプラス）
    changes['1着'] = 4;
    changes['浮き2着'] = 2;
    changes['沈み3着'] = -3;
    changes['4着'] = -3;
  } 
  else if (has('浮き2着') && has('浮き3着')) {
    // パターンC: 3人浮き（3着までプラス）
    changes['1着'] = 2;
    changes['浮き2着'] = 1;
    changes['浮き3着'] = 1;
    changes['4着'] = -4;
  }
  // ※イレギュラーな組み合わせ（全員浮きなど）の場合は変動なしとしています

  return changes;
}