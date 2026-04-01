"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useGameStore, GameMode } from '@/lib/store';
import { Player } from '@/types';
import { ArrowRight, UserPlus, Users, User, CheckCircle2, Loader2 } from 'lucide-react';

// ルームID（6桁の英数字）を生成する関数
const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default function SetupPage() {
  const router = useRouter();
  // storeの更新関数も一応呼ぶが、これからはサーバーが主役になる
  const { setPlayers, setGameMode, setSittingOut } = useGameStore();
  
  const [step, setStep] = useState<'mode' | 'players'>('mode');
  const [selectedMode, setSelectedMode] = useState<GameMode>('4ma');

  const [players, setPlayersList] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false); // ▼ 開局中のローディング状態を追加

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase.from('players').select('*').order('name');
      if (!error && data) setPlayersList(data);
      setLoading(false);
    };
    fetchPlayers();
  }, []);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    const { data, error } = await supabase
      .from('players')
      .insert([{ name: newPlayerName }])
      .select()
      .single();

    if (error) {
      alert('エラー: ' + error.message);
    } else if (data) {
      setPlayersList([...players, data]);
      setNewPlayerName('');
      const maxPlayers = selectedMode === '5ma' ? 5 : 4;
      if (selectedIds.length < maxPlayers) {
        setSelectedIds([...selectedIds, data.id]);
      }
    }
  };

  const toggleSelection = (id: string) => {
    const maxPlayers = selectedMode === '5ma' ? 5 : 4;
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(pid => pid !== id));
    } else {
      if (selectedIds.length < maxPlayers) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  // ▼▼▼ ここを大改修：サーバーに部屋を作る処理に変更 ▼▼▼
  const handleStartGame = async () => {
    setIsStarting(true);
    const selectedPlayers = players.filter(p => selectedIds.includes(p.id));
    
    // 1. ルームIDと初期状態の作成
    const roomId = generateRoomId();
    const initialSittingOutId = selectedMode === '5ma' ? selectedPlayers[4].id : null;
    
    // Supabaseに送るための「対局プレイヤーの初期データ」
    const initialPlayersData = selectedPlayers.map(p => ({
        ...p, score: 0, chip: 0, rank: null
    }));

    // 2. Supabaseの active_games テーブルに部屋を作成
    const { error } = await supabase.from('active_games').insert([{
        room_id: roomId,
        game_mode: selectedMode,
        players_data: initialPlayersData,
        sitting_out_id: initialSittingOutId,
        history: [] // 最初は履歴なし
    }]);

    if (error) {
        alert('部屋の作成に失敗しました: ' + error.message);
        setIsStarting(false);
        return;
    }

    // 3. ローカルのStoreにも一応保存しておく（おまじない）
    setGameMode(selectedMode);
    setPlayers(selectedPlayers);
    setSittingOut(initialSittingOutId);

    // 4. URLにルームIDをつけてダッシュボードへ移動！ (例: /game/dashboard?room=A1B2C3)
    router.push(`/game/dashboard?room=${roomId}`);
  };

  if (step === 'mode') {
    return (
      <main className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">対局モードを選択</h1>
        <div className="space-y-4 w-full max-w-md">
          <button onClick={() => { setSelectedMode('4ma'); setStep('players'); }} className="w-full bg-white p-6 rounded-2xl shadow-sm border-2 border-blue-100 hover:border-blue-500 transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-full text-blue-600"><Users size={24} /></div><div className="text-left"><span className="block text-lg font-bold text-gray-800">4人打ち</span><span className="text-sm text-gray-500">通常の対局</span></div></div><ArrowRight className="text-gray-300 group-hover:text-blue-500" />
          </button>
          <button onClick={() => { setSelectedMode('5ma'); setStep('players'); }} className="w-full bg-white p-6 rounded-2xl shadow-sm border-2 border-green-100 hover:border-green-500 transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4"><div className="p-3 bg-green-100 rounded-full text-green-600"><Users size={24} /></div><div className="text-left"><span className="block text-lg font-bold text-gray-800">5人打ち</span><span className="text-sm text-gray-500">抜け番あり</span></div></div><ArrowRight className="text-gray-300 group-hover:text-green-500" />
          </button>
          <button disabled className="w-full bg-gray-100 p-6 rounded-2xl border-2 border-transparent flex items-center justify-between opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-4"><div className="p-3 bg-gray-200 rounded-full text-gray-400"><User size={24} /></div><div className="text-left"><span className="block text-lg font-bold text-gray-400">3人打ち</span><span className="text-xs font-bold bg-gray-300 text-gray-600 px-2 py-1 rounded mt-1 inline-block">Coming Soon</span></div></div>
          </button>
        </div>
      </main>
    );
  }

  const maxPlayers = selectedMode === '5ma' ? 5 : 4;
  const isReady = selectedIds.length === maxPlayers;

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-32">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">プレイヤー選択 <span className="text-sm font-normal text-gray-500 ml-2">({selectedMode === '5ma' ? '5人' : '4人'}選んでください)</span></h1>
        <button onClick={() => setStep('mode')} className="text-sm text-blue-600 underline">戻る</button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex gap-2">
        <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="新しいプレイヤー名" className="flex-1 border-gray-300 rounded-lg border px-3 py-2" />
        <button onClick={handleAddPlayer} disabled={!newPlayerName.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold disabled:bg-gray-300"><UserPlus size={20} /></button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">読み込み中...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {players.map(p => {
            const isSelected = selectedIds.includes(p.id);
            return (
              <button key={p.id} onClick={() => toggleSelection(p.id)} className={`p-4 rounded-xl border-2 text-left transition-all relative ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <span className={`font-bold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>{p.name}</span>
                {isSelected && <CheckCircle2 className="absolute top-2 right-2 text-blue-500" size={16} />}
              </button>
            );
          })}
        </div>
      )}

      <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t">
        {/* ▼ ボタンが押されたらローディング表示にする ▼ */}
        <button 
          onClick={handleStartGame}
          disabled={!isReady || isStarting}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg disabled:bg-gray-300 disabled:text-gray-500 shadow-lg active:scale-95 transition flex justify-center items-center gap-2"
        >
          {isStarting ? (
            <><Loader2 className="animate-spin" size={20} /> 部屋を作成中...</>
          ) : (
            `${selectedIds.length} / ${maxPlayers} 人選択中 - 開局`
          )}
        </button>
      </div>
    </main>
  );
}