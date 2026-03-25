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

/**
 * チップ変動ロジック (合計0を完全に保証する修正版)
 */
export function calculateRankChips(ranks: RankType[]): Record<RankType, number> {
  // 浮いている人をカウント
  const isFloat = (r: string) => r === '1着' || r.includes('浮き');
  const floatCount = ranks.filter(isFloat).length;

  // 浮き人数に応じたチップの基本配分プール (1位, 2位, 3位, 4位)
  let baseChips: number[] = [];
  if (floatCount <= 1) {
    baseChips = [9, -3, -3, -3]; // パターンA
  } else if (floatCount === 2) {
    baseChips = [4, 2, -3, -3];  // パターンB
  } else {
    baseChips = [2, 1, 1, -4];   // パターンC
  }

  // 順位の数値に変換してソートする
  const parsed = ranks.map(r => {
    let rankNum = 4;
    if (r.includes('1')) rankNum = 1;
    else if (r.includes('2')) rankNum = 2;
    else if (r.includes('3')) rankNum = 3;
    return { original: r, rankNum };
  });
  parsed.sort((a, b) => a.rankNum - b.rankNum);

  // チップ配分計算（同着はプールされたチップを足して人数で割る）
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
      sum += baseChips[currentBaseIndex + j] || 0;
    }
    // ここで折半を行うため、合計は必ず0になる
    const averageChip = sum / count;

    result[parsed[i].original] = averageChip;

    currentBaseIndex += count;
    i += count;
  }

  return result as Record<RankType, number>;
}

/**
 * 順位点（ウマ）の計算ロジック
 */
export function calculateSplitScores(ranks: RankType[]): Record<RankType, number> {
  const basePoints = [60, 20, -20, -60];

  const parsed = ranks.map(r => {
    let rankNum = 4;
    if (r.includes('1')) rankNum = 1;
    else if (r.includes('2')) rankNum = 2;
    else if (r.includes('3')) rankNum = 3;
    return { original: r, rankNum };
  });
  parsed.sort((a, b) => a.rankNum - b.rankNum);

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