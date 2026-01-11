"use client"; // ユーザー操作（入力やクリック）があるため必須

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/lib/store';
import { Player } from '@/types';
import { UserPlus, Users, Check, ArrowRight } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const setPlayers = useGameStore((state) => state.setPlayers);

  // 状態管理（React State）
  const [players, setPlayersList] = useState<Player[]>([]); // 全プレイヤーリスト
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // 選択中のIDリスト
  const [newName, setNewName] = useState(''); // 新規登録用の入力欄
  const [loading, setLoading] = useState(false);

  // 画面が表示されたらデータベースからプレイヤー一覧を取得
  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    // Supabaseからデータを取得（作成日順）
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching players:', error);
    } else {
      setPlayersList(data || []);
    }
  };

  // プレイヤー新規登録処理
  const handleAddPlayer = async () => {
    if (!newName.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from('players')
      .insert([{ name: newName }]);

    if (error) {
      alert('登録エラーが発生しました');
      console.error(error);
    } else {
      setNewName(''); // 入力欄をクリア
      fetchPlayers(); // リストを再取得
    }
    setLoading(false);
  };

  // プレイヤー選択の切り替え処理
  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      // 既に選択されていたら解除
      setSelectedIds(selectedIds.filter(pid => pid !== id));
    } else {
      // 選択されていなければ追加（ただし4人まで）
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  // 対局開始処理
  const handleStartGame = () => {
    if (selectedIds.length !== 4) return;

    // 選択されたIDからプレイヤーオブジェクトを抽出
    const selectedPlayers = players.filter(p => selectedIds.includes(p.id));
    
    // ストア（グローバル変数）に保存
    setPlayers(selectedPlayers);

    // 対局画面へ移動
    router.push('/game/dashboard');
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-32">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Users className="text-blue-600" />
        プレイヤー選択
      </h1>

      {/* 新規登録フォーム */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex gap-2">
        <input
          type="text"
          placeholder="新規プレイヤー名"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button 
          onClick={handleAddPlayer}
          disabled={loading || !newName}
          className="bg-green-600 text-white p-3 rounded-lg disabled:opacity-50"
        >
          <UserPlus size={24} />
        </button>
      </div>

      {/* プレイヤーリスト */}
      <div className="grid grid-cols-2 gap-3">
        {players.map((player) => {
          const isSelected = selectedIds.includes(player.id);
          return (
            <div
              key={player.id}
              onClick={() => toggleSelection(player.id)}
              className={`
                p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between
                ${isSelected 
                  ? 'border-blue-600 bg-blue-50 text-blue-800' 
                  : 'border-gray-200 bg-white text-gray-700'}
              `}
            >
              <span className="font-bold">{player.name}</span>
              {isSelected && <Check size={20} className="text-blue-600" />}
            </div>
          );
        })}
      </div>

      {/* 開始ボタン（画面下部に固定） */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white to-transparent">
        <button
          onClick={handleStartGame}
          disabled={selectedIds.length !== 4}
          className={`
            w-full py-4 rounded-2xl text-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all
            ${selectedIds.length === 4 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
          `}
        >
          対局開始 ({selectedIds.length}/4)
          <ArrowRight />
        </button>
      </div>
    </main>
  );
}