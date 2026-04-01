"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/lib/store';
import { calculateRankChips, calculateSplitScores } from '@/lib/gameLogic';
import { RankType, GamePlayer } from '@/types';
import { Coins, Trophy, Calculator, X, Save, Settings, Undo2, AlertTriangle, Loader2, Coffee, Copy, Check } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  
  // ZustandのStore（リアルタイム受信したデータを画面に反映するために使う）
  const { gameMode, activePlayers, sittingOutId, history } = useGameStore();
  
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

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
  const [isTobi, setIsTobi] = useState(false);
  const [tobiLoserId, setTobiLoserId] = useState('');
  const [tobiWinnerId, setTobiWinnerId] = useState('');

  // ▼ 1. URLからルームIDを取得する ▼
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (!room) {
      alert('ルームIDがありません。開局画面に戻ります。');
      router.push('/game/setup');
    } else {
      setRoomId(room);
    }
  }, [router]);

  // ▼ 2. データの初回読み込み ＆ リアルタイム受信の設定 ▼
  useEffect(() => {
    if (!roomId) return;

    const fetchAndSubscribe = async () => {
      // サーバーから現在の部屋のデータを取得
      const { data, error } = await supabase.from('active_games').select('*').eq('room_id', roomId).single();
      
      if (error || !data) {
         alert('部屋が見つかりませんでした。すでに終了しているか、URLが間違っています。');
         router.push('/game/setup');
         return;
      }

      // 初回データをStoreにセット
      useGameStore.setState({
         gameMode: data.game_mode as any,
         activePlayers: data.players_data,
         sittingOutId: data.sitting_out_id,
         history: data.history || []
      });
      setIsLoaded(true);

      // ▼ 魔法のコード：リアルタイム同期の設定 ▼
      const channel = supabase.channel(`room-${roomId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'active_games', filter: `room_id=eq.${roomId}` },
          (payload) => {
            const newData = payload.new;
            // 誰かがデータを更新したら、自分の画面（Store）も書き換える
            useGameStore.setState({
              gameMode: newData.game_mode,
              activePlayers: newData.players_data,
              sittingOutId: newData.sitting_out_id,
              history: newData.history || []
            });
          }
        )
        .subscribe();

      // 画面を閉じたら通信を切る
      return () => { supabase.removeChannel(channel); };
    };

    fetchAndSubscribe();
  }, [roomId, router]);

  // ▼ 3. サーバーへデータを送信する共通関数 ▼
  const applyStateChange = async (newPlayers: GamePlayer[], newSittingOutId: string | null) => {
    if (!roomId) return;
    
    // 変更前の状態を履歴に追加
    const newHistory = [...history, { players: activePlayers, sittingOutId }].slice(-10);

    // 先に自分の画面を素早く書き換える（サクサク感を出すため）
    useGameStore.setState({ activePlayers: newPlayers, sittingOutId: newSittingOutId, history: newHistory });

    // サーバーへ送信（これが他の人に共有される）
    await supabase.from('active_games').update({
       players_data: newPlayers,
       sitting_out_id: newSittingOutId,
       history: newHistory,
       updated_at: new Date().toISOString()
    }).eq('room_id', roomId);
  };

  // --- ローディング画面 ---
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" size={32} />
          <p>対局データを同期中...</p>
        </div>
      </div>
    );
  }

  const playingMembers = activePlayers.filter(p => p.id !== sittingOutId);
  const calculateBalance = (p: GamePlayer) => (p.chip * 80) + (p.score * 20);
  const rankToNumber = (rank: string): number => {
    if (rank.includes('1')) return 1; if (rank.includes('2')) return 2;
    if (rank.includes('3')) return 3; if (rank.includes('4')) return 4;
    return 0;
  };

  // --- URLコピー機能 ---
  const copyRoomUrl = () => {
    const url = `${window.location.origin}/game/dashboard?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- 各種操作処理（ローカル更新ではなくapplyStateChangeを使用） ---
  const handleChipSubmit = () => {
    if (!winnerId || chipAmount <= 0) return;
    const newPlayers = activePlayers.map(p => {
      if (p.id === sittingOutId) return p;
      let change = 0;
      if (chipAction === 'tsumo') {
        if (p.id === winnerId) change = chipAmount * 3;
        else change = -chipAmount;
      } else {
        if (p.id === winnerId) change = chipAmount;
        if (p.id === loserId) change = -chipAmount;
      }
      return { ...p, chip: p.chip + change };
    });
    applyStateChange(newPlayers, sittingOutId);
    setModal('none'); setWinnerId(''); setLoserId(''); setChipAmount(1);
  };

  const handleRankSubmit = () => {
    if (Object.keys(rankSelection).length !== 4) return;
    if (isTobi && (!tobiLoserId || !tobiWinnerId || tobiLoserId === tobiWinnerId)) {
        alert('飛びの設定を確認してください'); return;
    }

    const selectedRanks = Object.values(rankSelection);
    const chipDeltas = calculateRankChips(selectedRanks);
    const scoreMap = calculateSplitScores(selectedRanks);
    
    const newPlayers = activePlayers.map(p => {
      if (p.id === sittingOutId) return { ...p, rank: null }; 

      const rankStr = rankSelection[p.id];
      let chipChange = chipDeltas[rankStr];
      const scoreChange = scoreMap[rankStr];

      if (isTobi) {
        if (p.id === tobiWinnerId) chipChange += 2;
        if (p.id === tobiLoserId) chipChange -= 2;
      }
      return { ...p, chip: p.chip + chipChange, score: p.score + scoreChange, rank: rankToNumber(rankStr) };
    });

    applyStateChange(newPlayers, sittingOutId);
    setModal('none'); setIsTobi(false); setTobiLoserId(''); setTobiWinnerId(''); setRankSelection({});
  };

  const handleSwapSittingOut = (newSittingOutId: string) => {
    if (!window.confirm('抜け番を交代しますか？')) return;
    applyStateChange(activePlayers, newSittingOutId);
    setModal('none');
  };

  const adjustChip = (id: string, amount: number) => {
    const newPlayers = activePlayers.map(p => p.id === id ? { ...p, chip: p.chip + amount } : p);
    applyStateChange(newPlayers, sittingOutId);
  };

  const adjustScore = (id: string, amount: number) => {
    const newPlayers = activePlayers.map(p => p.id === id ? { ...p, score: p.score + amount } : p);
    applyStateChange(newPlayers, sittingOutId);
  };

  const handleUndo = async () => {
    if (history.length === 0 || !roomId) return;
    const previousState = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    useGameStore.setState({ activePlayers: previousState.players, sittingOutId: previousState.sittingOutId, history: newHistory });

    await supabase.from('active_games').update({
       players_data: previousState.players,
       sitting_out_id: previousState.sittingOutId,
       history: newHistory,
       updated_at: new Date().toISOString()
    }).eq('room_id', roomId);
  };

  const handleGameSave = async () => {
    setSaving(true);
    const resultsToSave = activePlayers.map(p => ({
        id: p.id, name: p.name, rank: p.rank, chip: p.chip, score: p.score, total_yen: calculateBalance(p)
    }));

    const { error } = await supabase.from('game_results').insert([
        { results: resultsToSave, memo: gameMode === '5ma' ? '5人打ち' : '通常対局' }
    ]);

    if (error) {
        alert('保存失敗: ' + error.message);
        setSaving(false);
    } else {
        // オプション: 保存完了時に active_games から部屋を削除しても良いですが、今回はそのまま残します
        alert('保存完了！');
        useGameStore.getState().resetGame();
        router.push('/');
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 pb-32">
      {/* 招待ヘッダー（新規追加） */}
      <div className="flex justify-between items-center mb-2">
         <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">ID: {roomId}</span>
         </div>
         <button onClick={copyRoomUrl} className="text-blue-600 font-bold text-sm flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full active:scale-95 transition">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'コピーしました' : '招待URLをコピー'}
         </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-700">対局中 ({gameMode === '5ma' ? '5人' : '4人'})</h1>
        <div className="flex items-center gap-2">
           <button onClick={handleUndo} disabled={history.length === 0} className="p-2 bg-gray-200 rounded-full text-gray-600 disabled:opacity-30 active:bg-gray-300 transition">
             <Undo2 size={20} />
           </button>
           <div className="text-sm bg-white px-3 py-1 rounded-full shadow text-gray-500">
             合計: {activePlayers.reduce((sum, p) => sum + p.chip, 0)}
           </div>
        </div>
      </div>

      {/* プレイヤーカード一覧 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {activePlayers.map((p) => {
          const balance = calculateBalance(p);
          const isSittingOut = p.id === sittingOutId;
          return (
            <div key={p.id} onClick={() => { setAdjustingPlayer(p); setModal('adjust'); }} className={`p-4 rounded-xl shadow-sm border-b-4 flex flex-col items-center relative cursor-pointer active:scale-95 transition ${isSittingOut ? 'bg-gray-200 border-gray-400 opacity-80' : 'bg-white border-blue-500'}`}>
                {isSittingOut && (
                    <span className="absolute top-2 left-2 bg-gray-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><Coffee size={10} /> 抜け番</span>
                )}
                <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full ${balance >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                    {balance > 0 ? '+' : ''}{balance.toLocaleString()}
                </span>
                <span className="text-gray-500 text-sm mb-1">{p.name}</span>
                <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${p.chip >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{p.chip > 0 ? '+' : ''}{p.chip}</span>
                    <span className="text-xs text-gray-400">枚</span>
                </div>
                <span className="text-xs text-gray-400 mt-1">順位点: {p.score > 0 ? '+' : ''}{p.score}</span>
            </div>
          );
        })}
      </div>

      {/* フッター */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t flex justify-around items-center shadow-lg z-10">
        <button onClick={() => setModal('chip')} className="flex flex-col items-center text-blue-600 gap-1 active:scale-95 transition"><div className="p-3 bg-blue-100 rounded-full"><Coins /></div><span className="text-xs font-bold">チップ</span></button>
        <button onClick={() => setModal('rank')} className="flex flex-col items-center text-orange-600 gap-1 active:scale-95 transition"><div className="p-3 bg-orange-100 rounded-full"><Trophy /></div><span className="text-xs font-bold">順位/ウマ</span></button>
        <button onClick={() => setModal('settlement')} className="flex flex-col items-center text-green-600 gap-1 active:scale-95 transition"><div className="p-3 bg-green-100 rounded-full"><Calculator /></div><span className="text-xs font-bold">精算/保存</span></button>
      </div>

      {/* モーダル群 */}
      {modal === 'adjust' && adjustingPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                <div className="flex justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Settings /> {adjustingPlayer.name}の調整</h2>
                    <button onClick={() => setModal('none')}><X className="text-gray-400" /></button>
                </div>
                {gameMode === '5ma' && adjustingPlayer.id !== sittingOutId && (
                    <div className="mb-6 pb-6 border-b">
                        <button onClick={() => handleSwapSittingOut(adjustingPlayer.id)} className="w-full py-3 bg-gray-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"><Coffee size={20} />この人を「抜け番」にする</button>
                    </div>
                )}
                <div className="mb-6">
                    <p className="text-sm font-bold text-gray-500 mb-2">チップ枚数</p>
                    <div className="flex gap-4">
                        <button onClick={() => adjustChip(adjustingPlayer.id, -1)} className="flex-1 py-3 bg-red-100 text-red-600 font-bold rounded-lg">-1</button>
                        <button onClick={() => adjustChip(adjustingPlayer.id, 1)} className="flex-1 py-3 bg-blue-100 text-blue-600 font-bold rounded-lg">+1</button>
                    </div>
                </div>
                <div className="mb-6">
                    <p className="text-sm font-bold text-gray-500 mb-2">順位点</p>
                    <div className="flex gap-4">
                        <button onClick={() => adjustScore(adjustingPlayer.id, -10)} className="flex-1 py-3 bg-red-100 text-red-600 font-bold rounded-lg">-10</button>
                        <button onClick={() => adjustScore(adjustingPlayer.id, 10)} className="flex-1 py-3 bg-blue-100 text-blue-600 font-bold rounded-lg">+10</button>
                    </div>
                </div>
                <button onClick={() => setModal('none')} className="w-full mt-6 py-3 bg-gray-800 text-white rounded-xl font-bold">閉じる</button>
            </div>
        </div>
      )}

      {modal === 'chip' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Coins /> チップ移動</h2>
              <button onClick={() => setModal('none')}><X className="text-gray-400" /></button>
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
                {playingMembers.map(p => (
                   <button key={p.id} onClick={() => setWinnerId(p.id)} className={`p-2 rounded-lg border-2 text-sm font-bold ${winnerId === p.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200'}`}>{p.name}</button>
                ))}
              </div>
              {chipAction === 'ron' && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <p className="col-span-2 text-xs text-gray-400">放銃者</p>
                    {playingMembers.map(p => (
                      <button key={p.id} disabled={winnerId === p.id} onClick={() => setLoserId(p.id)} className={`p-2 rounded-lg border-2 text-sm font-bold ${loserId === p.id ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 disabled:opacity-30'}`}>{p.name}</button>
                    ))}
                </div>
              )}
            </div>
            <button onClick={handleChipSubmit} disabled={!winnerId || (chipAction === 'ron' && !loserId)} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg disabled:bg-gray-300">確定する</button>
          </div>
        </div>
      )}

      {modal === 'rank' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl h-[80vh] overflow-y-auto">
             <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Trophy /> 順位精算</h2>
              <button onClick={() => setModal('none')}><X className="text-gray-400" /></button>
            </div>
            <div className="space-y-4 mb-6">
              {playingMembers.map(p => (
                <div key={p.id} className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700">{p.name}</label>
                  <select className="p-3 border rounded-lg bg-gray-50" value={rankSelection[p.id] || ''} onChange={(e) => setRankSelection({...rankSelection, [p.id]: e.target.value as RankType})}>
                    <option value="">選択してください</option>
                    <option value="1着">1着</option><option value="浮き2着">浮き2着</option><option value="沈み2着">沈み2着</option>
                    <option value="浮き3着">浮き3着</option><option value="沈み3着">沈み3着</option><option value="4着">4着</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="bg-red-50 p-4 rounded-xl mb-6 border border-red-100">
                <div className="flex items-center gap-2 mb-3 cursor-pointer" onClick={() => setIsTobi(!isTobi)}>
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${isTobi ? 'bg-red-500 border-red-500 text-white' : 'border-gray-400 bg-white'}`}>
                        {isTobi && <Settings size={14} />}
                    </div>
                    <span className="font-bold text-gray-700 flex items-center gap-1"><AlertTriangle size={18} className="text-red-500"/>飛び発生 (チップ±2)</span>
                </div>
                {isTobi && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">飛んだ人</label>
                            <select className="w-full p-2 border rounded-lg bg-white" value={tobiLoserId} onChange={(e) => setTobiLoserId(e.target.value)}>
                                <option value="">選択...</option>
                                {playingMembers.map(p => <option key={p.id} value={p.id} disabled={p.id === tobiWinnerId}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">飛ばした人</label>
                            <select className="w-full p-2 border rounded-lg bg-white" value={tobiWinnerId} onChange={(e) => setTobiWinnerId(e.target.value)}>
                                <option value="">選択...</option>
                                {playingMembers.map(p => <option key={p.id} value={p.id} disabled={p.id === tobiLoserId}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>
            <button onClick={handleRankSubmit} className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold text-lg">計算して反映</button>
          </div>
        </div>
      )}

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
                    const isSittingOut = p.id === sittingOutId;
                    return (
                        <div key={p.id} className={`flex justify-between items-center border-b pb-2 ${isSittingOut ? 'opacity-50' : ''}`}>
                            <div>
                                <span className="font-bold text-lg block flex items-center gap-2">{p.name} {isSittingOut && <Coffee size={14} />}</span>
                                <span className="text-xs text-gray-400">チップ:{p.chip}枚 / 順位点:{p.score}</span>
                            </div>
                            <span className={`text-2xl font-bold ${total >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                {total > 0 ? '+' : ''}{total.toLocaleString()}
                            </span>
                        </div>
                    );
                })}
            </div>
            <button onClick={handleGameSave} disabled={saving} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg flex justify-center items-center gap-2 disabled:opacity-50">
                <Save size={20} />{saving ? '保存中...' : '保存して終了'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}