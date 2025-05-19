import { create } from 'zustand';
import { Chess, Square, PieceSymbol } from 'chess.js'; // Import Chess class

interface GameState {
  fen: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isGameOver: boolean;
  turn: 'w' | 'b';
  winner: 'white' | 'black' | 'draw' | null;
  lastMoveUci: string | null; // UCI of the last move e.g. e2e4
  gameMode: 'human_vs_human' | 'human_vs_ai';
  aiDifficulty: number; // 0 for random, 1 for simple
  localGame: Chess; // chess.js instance for client-side interaction
  statusMessage: string;
  orientation: 'white' | 'black';
}

interface GameActions {
  setGameState: (newState: Partial<GameState>) => void;
  initializeNewGame: (fen: string, turn: 'w' | 'b', mode: 'human_vs_human' | 'human_vs_ai', aiDiff: number, orientation?: 'white' | 'black') => void;
  makeLocalMove: (move: { from: Square; to: Square; promotion?: PieceSymbol }) => boolean;
  updateFromBackend: (backendState: {
    fen: string;
    isCheck: boolean;
    isCheckmate: boolean;
    isStalemate: boolean;
    isGameOver: boolean;
    turn: string; // 'w' or 'b'
    winner?: string | null;
    last_move_uci?: string | null;
  }) => void;
  setGameMode: (mode: 'human_vs_human' | 'human_vs_ai') => void;
  setAiDifficulty: (difficulty: number) => void;
  setStatusMessage: (message: string) => void;
  setOrientation: (orientation: 'white' | 'black') => void;
}

const initialChessInstance = new Chess();

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  fen: initialChessInstance.fen(),
  isCheck: false,
  isCheckmate: false,
  isStalemate: false,
  isGameOver: false,
  turn: 'w',
  winner: null,
  lastMoveUci: null,
  gameMode: 'human_vs_human',
  aiDifficulty: 0,
  localGame: initialChessInstance,
  statusMessage: "White's turn to move.",
  orientation: 'white',

  setGameState: (newState) => set((state) => ({ ...state, ...newState })),

  initializeNewGame: (fen, turn, mode, aiDiff, orientation = 'white') => {
    const newGame = new Chess(fen);
    set({
      fen,
      turn: turn as 'w' | 'b',
      isCheck: newGame.isCheck(),
      isCheckmate: newGame.isCheckmate(),
      isStalemate: newGame.isStalemate(),
      isGameOver: newGame.isGameOver(),
      winner: null,
      lastMoveUci: null,
      localGame: newGame,
      gameMode: mode,
      aiDifficulty: aiDiff,
      statusMessage: `${turn === 'w' ? 'White' : 'Black'}'s turn. Mode: ${mode.replace('_', ' ')}.`,
      orientation: orientation,
    });
  },

  makeLocalMove: (move) => {
    const game = get().localGame;
    try {
      const result = game.move(move);
      if (result) {
        set({
          fen: game.fen(),
          turn: game.turn(),
          isCheck: game.isCheck(),
          isCheckmate: game.isCheckmate(),
          isStalemate: game.isStalemate(),
          isGameOver: game.isGameOver(),
          lastMoveUci: `${move.from}${move.to}${move.promotion || ''}`,
        });
        return true;
      }
    } catch (error) {
      console.warn("Invalid local move attempt:", error);
      // Potentially revert fen if react-chessboard updated it optimistically
      set({ fen: game.fen() }); // ensure fen is correct from chess.js
      return false;
    }
    return false;
  },

  updateFromBackend: (backendState) => {
    const newGame = new Chess(backendState.fen);
    let status = "";
    if (backendState.isGameOver) {
        if (backendState.winner === 'white') status = "Checkmate! White wins.";
        else if (backendState.winner === 'black') status = "Checkmate! Black wins.";
        else if (backendState.winner === 'draw') status = "Stalemate or Draw!";
        else status = "Game Over."; // Other draw conditions
    } else {
        status = `${backendState.turn === 'w' ? 'White' : 'Black'}'s turn.`;
        if (backendState.isCheck) status += " Check!";
    }

    set({
      fen: backendState.fen,
      isCheck: backendState.isCheck,
      isCheckmate: backendState.isCheckmate,
      isStalemate: backendState.isStalemate,
      isGameOver: backendState.isGameOver,
      turn: backendState.turn as 'w' | 'b',
      winner: backendState.winner as 'white' | 'black' | 'draw' | null,
      lastMoveUci: backendState.last_move_uci || null,
      localGame: newGame, // Sync localGame instance
      statusMessage: status,
    });
  },
  setGameMode: (mode) => set({ gameMode: mode, statusMessage: `Game mode changed to ${mode.replace('_', ' ')}.` }),
  setAiDifficulty: (difficulty) => set({ aiDifficulty: difficulty, statusMessage: `AI difficulty set to ${difficulty === 0 ? 'Easy' : 'Medium'}.` }),
  setStatusMessage: (message) => set({ statusMessage: message }),
  setOrientation: (orientation) => set({ orientation }),
}));