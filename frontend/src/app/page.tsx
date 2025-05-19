'use client'; // Required for components with hooks
import ChessBoardComponent from '@/components/ChessBoardComponents';
import GameControls from '@/components/GameControls';
import GameInfo from '@/components/GameInfo';
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore'; // Import the store
import { Chess } from 'chess.js'; // For initial local state

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function HomePage() {
  const { initializeNewGame, setStatusMessage } = useGameStore();

  // Fetch initial game state or start a new one on component mount
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        setStatusMessage("Loading game...");
        const response = await fetch(`${API_URL}/game/state`); // Get current server state
        if (!response.ok) {
             // If server state fails, try to start a new default game
            console.warn("Failed to fetch existing game state, starting new default game.");
            const newGameResponse = await fetch(`${API_URL}/game/new`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: "human_vs_human", ai_difficulty: 0 }),
            });
            if (!newGameResponse.ok) throw new Error('Failed to start a new game after failing to fetch state.');
            const defaultGameState = await newGameResponse.json();
            initializeNewGame(defaultGameState.fen, defaultGameState.turn, "human_vs_human", 0);
            return;
        }
        const gameState = await response.json();
        initializeNewGame(gameState.fen, gameState.turn, useGameStore.getState().gameMode, useGameStore.getState().aiDifficulty); // Use current store mode/diff
      } catch (error) {
        console.error('Error fetching initial game state:', error);
        setStatusMessage("Error loading game. Using local board.");
        // Fallback to a local new game if backend is completely unavailable
        const newGame = new Chess();
        initializeNewGame(newGame.fen(), newGame.turn(), "human_vs_human", 0);
      }
    };

    fetchInitialState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return (
    <div className="w-full max-w-3xl bg-gray-700 p-6 rounded-lg shadow-xl">
      <GameControls />
      <GameInfo />
      <div className="mt-5">
        <ChessBoardComponent />
      </div>
    </div>
  );
}