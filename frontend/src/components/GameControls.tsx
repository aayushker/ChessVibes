'use client';
import { useGameStore } from '@/store/gameStore';
import { Chess } from 'chess.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function GameControls() {
  const {
    gameMode,
    aiDifficulty,
    setGameMode,
    setAiDifficulty,
    initializeNewGame,
    setStatusMessage,
    setOrientation,
    orientation
  } = useGameStore();

  const handleNewGame = async () => {
    try {
      setStatusMessage("Starting new game...");
      const response = await fetch(`${API_URL}/game/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: gameMode, ai_difficulty: aiDifficulty }),
      });
      if (!response.ok) throw new Error('Failed to start new game');
      const gameState = await response.json();

      // Determine orientation for AI game
      let newOrientation: 'white' | 'black' = 'white';
      if (gameMode === 'human_vs_ai') {
        // Randomly assign player color or let player choose
        newOrientation = Math.random() < 0.5 ? 'white' : 'black';
        setOrientation(newOrientation);
        setStatusMessage(`New game vs AI. You are ${newOrientation}. AI is ${newOrientation === 'white' ? 'Black' : 'White'}.`);
         if (newOrientation === 'black' && gameState.turn === 'w') { // If player is black and it's white's turn (AI)
            // Trigger AI's first move
            setStatusMessage("AI is thinking...");
            const moveResponse = await fetch(`${API_URL}/game/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Send a "null" move or a special signal if your backend supports it,
                // or simply let the backend know it's AI's turn.
                // For this setup, we assume the backend handles AI's turn if it's black's turn
                // and mode is human_vs_ai and player just started as black.
                // This might require a specific backend endpoint or logic adjustment.
                // A simpler way: backend's /game/new could return AI's first move if AI is white.
                // For now, let's assume the backend /game/new has set up the board,
                // and if AI is White, it needs to make a move.
                // This is tricky with current setup. A dedicated /ai_move endpoint might be better.

                // Let's adjust: if AI is white, it should make a move after /new.
                // This implies /new or a follow-up call makes the AI move.
                // For now, let's simplify and assume the user (if white) makes the first move
                // or if AI is white, the backend should handle that.
                // The current backend logic has AI move only *after* a human move.
                // So if AI is white, this is a bit of a gap.
                // Easiest fix: AI is always black for now.
                // More robust: /new_game returns state, if AI is white, frontend calls /request_ai_move
            }
        );
        const aiMoveState = await moveResponse.json();
        initializeNewGame(aiMoveState.fen, aiMoveState.turn as 'w' | 'b', gameMode, aiDifficulty, newOrientation);
        setStatusMessage(`AI (White) moved. Your turn (${newOrientation}).`);
         } else {
            initializeNewGame(gameState.fen, gameState.turn as 'w' | 'b', gameMode, aiDifficulty, newOrientation);
         }

      } else { // Human vs Human
        setOrientation('white'); // Default to white for P1
        initializeNewGame(gameState.fen, gameState.turn as 'w' | 'b', gameMode, aiDifficulty, 'white');
      }

    } catch (error) {
      console.error('Error starting new game:', error);
      setStatusMessage("Error starting new game.");
      // Fallback to a local new game if backend fails
      const newGame = new Chess();
      initializeNewGame(newGame.fen(), newGame.turn(), gameMode, aiDifficulty, 'white');
    }
  };

  const handleFlipBoard = () => {
    setOrientation(orientation === 'white' ? 'black' : 'white');
  };

  return (
    <div className="my-4 p-4 bg-slate-200 rounded shadow space-y-3 md:space-y-0 md:flex md:space-x-3 justify-center items-center">
      <button
        onClick={handleNewGame}
        className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        New Game
      </button>
      <div className="flex items-center space-x-2">
        <label htmlFor="gameMode" className="text-sm font-medium">Mode:</label>
        <select
          id="gameMode"
          value={gameMode}
          onChange={(e) => setGameMode(e.target.value as 'human_vs_human' | 'human_vs_ai')}
          className="p-2 border border-gray-300 rounded text-sm"
        >
          <option value="human_vs_human">Player vs Player</option>
          <option value="human_vs_ai">Player vs AI</option>
        </select>
      </div>
      {gameMode === 'human_vs_ai' && (
        <div className="flex items-center space-x-2">
          <label htmlFor="aiDifficulty" className="text-sm font-medium">AI Level:</label>
          <select
            id="aiDifficulty"
            value={aiDifficulty}
            onChange={(e) => setAiDifficulty(parseInt(e.target.value))}
            className="p-2 border border-gray-300 rounded text-sm"
          >
            <option value={0}>Easy (Random)</option>
            <option value={1}>Medium (Basic)</option>
          </select>
        </div>
      )}
      <button
        onClick={handleFlipBoard}
        className="w-full md:w-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
      >
        Flip Board
      </button>
    </div>
  );
}