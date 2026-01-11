"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/lib/store';
import { calculateRankChips, calculateSplitScores } from '@/lib/gameLogic';
import { RankType, GamePlayer } from '@/types';
import { Coins, Trophy, Calculator, X, Save, Settings, Undo2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { 
    activePlayers, 
    updateChip, 
    updateRankAndScore, 
    updateScore, 
    resetGame, 
    undo,
    history 
  } = useGameStore();
  
  // モーダル制御
  const [modal, setModal] = useState<string>('none');
  const [saving, setSaving] = useState(false);
  const [adjustingPlayer, setAdjustingPlayer] = useState<GamePlayer | null>(null);

  // チップ・順位用のState
  const [chipAction, setChipAction] = useState<'tsumo' | 'ron'>('tsumo');
  const [chipAmount, setChipAmount] = useState<number>(1);
  const [winnerId, setWinnerId] = useState<string>('');
  const [loserId, setLoserId] = useState<string>('');
  const [rankSelection, setRankSelection] = useState<Record<string, RankType>>({});

  useEffect(() => {
    if (activePlayers.length !== 4) router.push('/game/setup');
  }, [activePlayers, router]);

  const calculateBalance = (p: GamePlayer) => (p.chip * 80) + (p.score * 20);

  // --- チップ計算処理 ---
  const handleChipSubmit = () => {
    if (!winnerId || chipAmount <= 0) return;
    if (chipAction === 'tsumo') {
      activePlayers.forEach(p => {
        if (p.id === winnerId) updateChip(p.id, chipAmount * 3);
        else updateChip(p.id, -chipAmount);
      });
    } else {
      if (!loserId || winnerId === loserId) return;
      updateChip(winnerId, chipAmount);
      updateChip(loserId, -chipAmount);
    }
    closeChipModal();
  };

  const closeChipModal = () => {
    setModal('none');
    setWinnerId('');
    setLoserId('');
    setChipAmount(1);
  };

  // --- 順位精算処理 (同着対応版) ---
  const handleRankSubmit = () => {
    if (Object.keys(rankSelection).length !== 4) return;
    const selectedRanks = Object.values(rankSelection);
    
    const chipDeltas = calculateRankChips(selectedRanks);
    const scoreMap = calculateSplitScores(selectedRanks);
    
    activePlayers.forEach(p => {
      const rankStr = rankSelection[p.id];
      updateChip(p.id, chipDeltas[rankStr]);
      updateRankAndScore(p.id, rankStr, scoreMap[rankStr]);
    });
    setModal('none');
    alert('順位とウマを反映しました。');
  };

  // --- 最終保存処理 ---
  const handleGameSave = async () => {
    setSaving(true);
    const resultsToSave = activePlayers.map(p => ({
        id: p.id,
        name: p.name,
        rank: p.rank,
        chip: p.chip,
        score: p.score,
        total_yen: calculateBalance(p)
    }));

    const { error } = await supabase.from('game_results').insert([
        { results: resultsToSave, memo: '通常対局' }
    ]);

    if (error) {
        alert('保存失敗: ' + error.message);
        setSaving(false);
    } else {
        alert('保存完了！');
        resetGame();
        router.push('/');
    }
  };

  const openAdjustment = (player: GamePlayer) => {
    setAdjustingPlayer(player);
    setModal('adjust');
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 pb-32">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-700">対局中</h1>
        
        <div className="flex items-center gap-2">
           {/* Undoボタン */}
           <button 
             onClick={undo}
             disabled={history.length === 0}
             className="p-2 bg-gray-200 rounded-full text-gray-600 disabled:opacity-30 active:bg-gray-300 transition"
           >
             <Undo2 size={20} />
           </button>
           <div className="text-sm bg-white px-3 py-1 rounded-full shadow text-gray-500">
             合計: {activePlayers.reduce((sum, p) => sum + p.chip, 0)}
           </div>
        </div>
      </div>

      {/* プレイヤーカード */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {activePlayers.map((p) => {
          const balance = calculateBalance(p);
          return (
            <div 
              key={p.id} 
              onClick={() => openAdjustment(p)}
              className="bg-white p-4 rounded-xl shadow-sm border-b-4 border-blue-500 flex flex-col items-center relative cursor-pointer active:scale-95 transition"
            >
                <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full ${balance >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                    {balance > 0 ? '+' : ''}{balance.toLocaleString()}
                </span>
                <span className="text-gray-500 text-sm mb-1">{p.name}</span>
                <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${p.chip >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {p.chip > 0 ? '+' : ''}{p.chip}
                    </span>
                    <span className="text-xs text-gray-400">枚</span>
                </div>
                <span className="text-xs text-gray-400 mt-1">
                   順位点: {p.score > 0 ? '+' : ''}{p.score}
                </span>
            </div>
          );
        })}
      </div>

      {/* フッター */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t flex justify-around items-center shadow-lg z-10">
        <button onClick={() => setModal('chip')} className="flex flex-col items-center text-blue-600 gap-1 active:scale-95 transition">
          <div className="p-3 bg-blue-100 rounded-full"><Coins /></div>
          <span className="text-xs font-bold">チップ</span>
        </button>
        <button onClick={() => setModal('rank')} className="flex flex-col items-center text-orange-600 gap-1 active:scale-95 transition">
          <div className="p-3 bg-orange-100 rounded-full"><Trophy /></div>
          <span className="text-xs font-bold">順位/ウマ</span>
        </button>
        <button onClick={() => setModal('settlement')} className="flex flex-col items-center text-green-600 gap-1 active:scale-95 transition">
          <div className="p-3 bg-green-100 rounded-full"><Calculator /></div>
          <span className="text-xs font-bold">精算/保存</span>
        </button>
      </div>

      {/* モーダル: 個別調整 */}
      {modal === 'adjust' && adjustingPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                <div className="flex justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Settings /> {adjustingPlayer.name}の調整
                    </h2>
                    <button onClick={() => setModal('none')}><X className="text-gray-400" /></button>
                </div>
                <div className="mb-6">
                    <p className="text-sm font-bold text-gray-500 mb-2">チップ枚数</p>
                    <div className="flex gap-4">
                        <button onClick={() => updateChip(adjustingPlayer.id, -1)} className="flex-1 py-3 bg-red-100 text-red-600 font-bold rounded-lg">-1</button>
                        <button onClick={() => updateChip(adjustingPlayer.id, 1)} className="flex-1 py-3 bg-blue-100 text-blue-600 font-bold rounded-lg">+1</button>
                    </div>
                </div>
                <div className="mb-6">
                    <p className="text-sm font-bold text-gray-500 mb-2">順位点</p>
                    <div className="flex gap-4">
                        <button onClick={() => updateScore(adjustingPlayer.id, -10)} className="flex-1 py-3 bg-red-100 text-red-600 font-bold rounded-lg">-10</button>
                        <button onClick={() => updateScore(adjustingPlayer.id, 10)} className="flex-1 py-3 bg-blue-100 text-blue-600 font-bold rounded-lg">+10</button>
                    </div>
                </div>
                <button onClick={() => setModal('none')} className="w-full mt-6 py-3 bg-gray-800 text-white rounded-xl font-bold">閉じる</button>
            </div>
        </div>
      )}

      {/* モーダル: チップ */}
      {modal === 'chip' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Coins /> チップ移動</h2>
              <button onClick={closeChipModal}><X className="text-gray-400" /></button>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <button className={`flex-1 py-2 rounded-md font-bold transition-all ${chipAction === 'tsumo' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`} onClick={() => setChipAction('tsumo')}>ツモ</button>
              <button className={`flex-1 py-2 rounded-md font-bold transition-all ${chipAction === 'ron' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`} onClick={() => setChipAction('ron')}>ロン</button>
            </div>
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setChipAmount(Math.max(1, chipAmount - 1))} className="w-10 h-10 rounded-full bg-gray-200 text-xl font-bold">-</button>
              <div className="text-3xl font-bold">{chipAmount} <span className="text-sm font-normal text-gray-500">枚</span></div>
              <button onClick={() => setChipAmount(chipAmount + 1)} className="w-10 h-10 rounded-full bg-gray-200 text-xl font-bold">+</button>
            </div>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-2">
                {activePlayers.map(p => (
                   <button key={p.id} onClick={() => setWinnerId(p.id)} className={`p-2 rounded-lg border-2 text-sm font-bold ${winnerId === p.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200'}`}>{p.name}</button>
                ))}
              </div>
              {chipAction === 'ron' && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <p className="col-span-2 text-xs text-gray-400">放銃者</p>
                    {activePlayers.map(p => (
                      <button key={p.id} disabled={winnerId === p.id} onClick={() => setLoserId(p.id)} className={`p-2 rounded-lg border-2 text-sm font-bold ${loserId === p.id ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 disabled:opacity-30'}`}>{p.name}</button>
                    ))}
                </div>
              )}
            </div>
            <button onClick={handleChipSubmit} disabled={!winnerId || (chipAction === 'ron' && !loserId)} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg disabled:bg-gray-300">確定する</button>
          </div>
        </div>
      )}

      {/* モーダル: 順位 */}
      {modal === 'rank' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl h-[80vh] overflow-y-auto">
             <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Trophy /> 順位精算</h2>
              <button onClick={() => setModal('none')}><X className="text-gray-400" /></button>
            </div>
            <div className="space-y-4 mb-6">
              {activePlayers.map(p => (
                <div key={p.id} className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700">{p.name}</label>
                  <select className="p-3 border rounded-lg bg-gray-50" value={rankSelection[p.id] || ''} onChange={(e) => setRankSelection({...rankSelection, [p.id]: e.target.value as RankType})}>
                    <option value="">選択してください</option>
                    <option value="1着">1着</option>
                    <option value="浮き2着">浮き2着</option>
                    <option value="沈み2着">沈み2着</option>
                    <option value="浮き3着">浮き3着</option>
                    <option value="沈み3着">沈み3着</option>
                    <option value="4着">4着</option>
                  </select>
                </div>
              ))}
            </div>
            <button onClick={handleRankSubmit} className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold text-lg">計算して反映</button>
          </div>
        </div>
      )}

      {/* モーダル: 最終精算 */}
      {modal === 'settlement' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Calculator /> 最終精算</h2>
              <button onClick={() => setModal('none')}><X className="text-gray-400" /></button>
            </div>
            <div className="space-y-4 mb-8">
                {activePlayers.map(p => {
                    const total = calculateBalance(p);
                    return (
                        <div key={p.id} className="flex justify-between items-center border-b pb-2">
                            <div>
                                <span className="font-bold text-lg block">{p.name}</span>
                                <span className="text-xs text-gray-400">
                                    チップ:{p.chip}枚 / 順位点:{p.score}
                                </span>
                            </div>
                            <span className={`text-2xl font-bold ${total >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                {total > 0 ? '+' : ''}{total.toLocaleString()}
                            </span>
                        </div>
                    );
                })}
            </div>
            <button onClick={handleGameSave} disabled={saving} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg flex justify-center items-center gap-2 disabled:opacity-50">
                <Save size={20} />
                {saving ? '保存中...' : '保存して終了'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}