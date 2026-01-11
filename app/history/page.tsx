"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Trash2 } from 'lucide-react'; // Trash2を追加
import Link from 'next/link';

type GameResult = {
  id: string;
  played_at: string;
  memo: string;
  results: {
    id: string;
    name: string;
    total_yen: number;
    chip: number;
    score: number;
  }[];
};

export default function HistoryPage() {
  const [games, setGames] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('game_results')
      .select('*')
      .order('played_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
    } else {
      setGames(data || []);
    }
    setLoading(false);
  };

  // ▼ 追加: 削除機能
  const handleDelete = async (id: string) => {
    if (!window.confirm('この対局履歴を削除しますか？\n（取り消せません）')) return;

    const { error } = await supabase
      .from('game_results')
      .delete()
      .eq('id', id);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
    } else {
      // 画面からも削除
      setGames(games.filter(g => g.id !== id));
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <button className="p-2 bg-white rounded-full border shadow-sm">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">対局履歴</h1>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 mt-10">読み込み中...</p>
      ) : games.length === 0 ? (
        <div className="text-center mt-20 text-gray-400">
          <p>まだ履歴がありません。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {games.map((game) => (
            <div key={game.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative">
              
              {/* ▼ 追加: 削除ボタン (右上に配置) */}
              <button 
                onClick={() => handleDelete(game.id)}
                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={20} />
              </button>

              {/* 日付とメモ */}
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 pr-8">
                <div className="flex items-center gap-2 text-gray-500 text-sm font-bold">
                  <Calendar size={16} />
                  {formatDate(game.played_at)}
                </div>
                {game.memo && <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">{game.memo}</span>}
              </div>

              {/* プレイヤーごとの結果 */}
              <div className="space-y-2">
                {game.results
                  .sort((a, b) => b.total_yen - a.total_yen)
                  .map((player) => (
                  <div key={player.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${player.total_yen > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                            {player.name.slice(0, 1)}
                        </div>
                        <span className="font-bold text-gray-700">{player.name}</span>
                    </div>
                    <div className="text-right">
                        <span className={`font-bold text-lg ${player.total_yen > 0 ? 'text-blue-600' : player.total_yen < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                            {player.total_yen > 0 ? '+' : ''}{player.total_yen.toLocaleString()}
                        </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}