'use client';
import { useGameStore } from '@/store/gameStore';

export default function GameInfo() {
  const { statusMessage } = useGameStore();

  return (
    <div className="mt-4 p-3 bg-gray-100 rounded shadow text-center">
      <p className="text-lg font-semibold">{statusMessage}</p>
    </div>
  );
}