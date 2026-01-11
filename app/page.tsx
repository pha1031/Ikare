import Link from 'next/link';
import { PlayCircle, History } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <h1 className="text-4xl font-bold mb-12 text-blue-600 tracking-wider">IKARE</h1>
      
      <div className="flex flex-col gap-6 w-full max-w-xs">
        {/* 開局ボタン */}
        <Link href="/game/setup" className="group relative w-full">
          <button className="w-full bg-blue-600 text-white p-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 text-xl font-bold transition transform active:scale-95">
            <PlayCircle size={28} />
            開局
          </button>
        </Link>

        {/* 過去データボタン */}
        <Link href="/history" className="group relative w-full">
          <button className="w-full bg-white text-gray-700 border-2 border-gray-200 p-6 rounded-2xl shadow-sm flex items-center justify-center gap-3 text-xl font-bold transition transform active:scale-95">
            <History size={28} />
            過去データ
          </button>
        </Link>
      </div>
    </main>
  );
}