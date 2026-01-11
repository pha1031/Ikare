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
 * チップ変動ロジック
 * 仕様: 同着がいても「浮いている人の数」でパターン(A,B,C)を判定する
 */
export function calculateRankChips(ranks: RankType[]): Record<RankType, number> {
  const changes: Record<string, number> = {};
  
  // 初期化（念のため入力されたキー全てに0を入れておく）
  ranks.forEach(r => changes[r] = 0);

  // 浮いている人をカウント (1着、または "浮き" を含む順位)
  const isFloat = (r: string) => r === '1着' || r.includes('浮き');
  const floatCount = ranks.filter(isFloat).length;

  // --- パターン判定 ---

  // パターンA: 1人浮き (1着のみ)
  // ※沈み2着×2 の場合などがここに来る
  if (floatCount <= 1) {
    ranks.forEach(r => {
      if (r === '1着') changes[r] = 9;
      else changes[r] = -3;
    });
  }
  // パターンB: 2人浮き (1着 + もう1人)
  // ※浮き2着と沈み3着の場合などがここに来る
  else if (floatCount === 2) {
    ranks.forEach(r => {
      if (r === '1着') changes[r] = 4;
      else if (isFloat(r)) changes[r] = 2; // 浮き2着
      else changes[r] = -3;                // 沈み3着・4着・(ありえないが沈み2着)
    });
  }
  // パターンC: 3人以上浮き (1着 + 2人以上)
  // ※浮き2着×2 の場合などがここに来る
  else {
    ranks.forEach(r => {
      if (r === '1着') changes[r] = 2;
      else if (r === '4着') changes[r] = -4;
      else changes[r] = 1; // 浮き2着・浮き3着はどちらも+1
    });
  }

  return changes as Record<RankType, number>;
}


/**
 * 順位点（ウマ）の計算ロジック
 * 仕様: 同着（同じ選択肢が複数ある場合）は、対象となる順位点を合計して人数で割る
 */
export function calculateSplitScores(ranks: RankType[]): Record<RankType, number> {
  // 順位ごとの基本点 [1着, 2着, 3着, 4着]
  const basePoints = [60, 20, -20, -60];

  // 1. 入力を「順位の数値」に変換してオブジェクト化
  const parsed = ranks.map(r => {
    let rankNum = 4;
    if (r.includes('1')) rankNum = 1;
    else if (r.includes('2')) rankNum = 2;
    else if (r.includes('3')) rankNum = 3;
    
    return { original: r, rankNum };
  });

  // 2. ランク順(1->4)にソート
  parsed.sort((a, b) => a.rankNum - b.rankNum);

  // 3. ポイント配分計算
  const result: Record<string, number> = {};
  
  let currentBaseIndex = 0; // basePointsの何番目を使っているか
  let i = 0;
  while (i < parsed.length) {
    // 同じ順位の人が何人連続しているか数える（同着判定）
    let count = 1;
    while (i + count < parsed.length && parsed[i + count].rankNum === parsed[i].rankNum) {
      count++;
    }

    // 対応する順位点を取得して平均する
    // 例: 2着が2人(count=2)なら、basePoints[1](+20) と basePoints[2](-20) を足して 2で割る -> 0
    let sum = 0;
    for (let j = 0; j < count; j++) {
      sum += basePoints[currentBaseIndex + j] || 0;
    }
    const averageScore = sum / count;

    // マップに保存（入力された文字列に対してスコアを割り当て）
    result[parsed[i].original] = averageScore;

    // インデックスを進める
    currentBaseIndex += count;
    i += count;
  }

  return result as Record<RankType, number>;
}