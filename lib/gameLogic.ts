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
  const changes: Record<RankType, number> = {
    '1着': 0, '浮き2着': 0, '沈み2着': 0, 
    '浮き3着': 0, '沈み3着': 0, '4着': 0
  };

  const has = (type: RankType) => ranks.includes(type);

  if (has('沈み2着') && has('沈み3着')) {
    changes['1着'] = 9;
    changes['沈み2着'] = -3;
    changes['沈み3着'] = -3;
    changes['4着'] = -3;
  } 
  else if (has('浮き2着') && has('沈み3着')) {
    changes['1着'] = 4;
    changes['浮き2着'] = 2;
    changes['沈み3着'] = -3;
    changes['4着'] = -3;
  } 
  else if (has('浮き2着') && has('浮き3着')) {
    changes['1着'] = 2;
    changes['浮き2着'] = 1;
    changes['浮き3着'] = 1;
    changes['4着'] = -4;
  }

  return changes;
}

/**
 * 同着(タイ)を考慮して順位点を計算する関数
 */
export function calculateSplitScores(ranks: RankType[]): Record<RankType, number> {
  // 基本点（順位点）
  const basePoints = [60, 20, -20, -60];

  // 1. 入力を「順位の数値」に変換して並べる
  const parsed = ranks.map(r => {
    let rankNum = 4;
    if (r.includes('1')) rankNum = 1;
    else if (r.includes('2')) rankNum = 2;
    else if (r.includes('3')) rankNum = 3;
    
    return { original: r, rankNum };
  });

  // 2. ランク順にソート
  parsed.sort((a, b) => a.rankNum - b.rankNum);

  // 3. ポイント配分計算
  const result: Record<string, number> = {};
  
  let currentBaseIndex = 0;
  let i = 0;
  while (i < parsed.length) {
    let count = 1;
    while (i + count < parsed.length && parsed[i + count].rankNum === parsed[i].rankNum) {
      count++;
    }

    let sum = 0;
    for (let j = 0; j < count; j++) {
      sum += basePoints[currentBaseIndex + j] || 0;
    }
    const averageScore = sum / count;

    result[parsed[i].original] = averageScore;

    currentBaseIndex += count;
    i += count;
  }

  return result as Record<RankType, number>;
}