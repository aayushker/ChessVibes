'use client';
import { Chessboard } from 'react-chessboard';
import { Square } from 'chess.js';
import { useGameStore } from '@/store/gameStore';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ChessBoardComponent() {
  const {
    fen,
    localGame,
    makeLocalMove,
    updateFromBackend,
    isGameOver,
    turn,
    gameMode,
    orientation,
    setStatusMessage,
    lastMoveUci,
  } = useGameStore();

  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [moveTo, setMoveTo] = useState<Square | null>(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [optionSquares, setOptionSquares] = useState({});
  const [rightClickedSquares, setRightClickedSquares] = useState({});
  const [moveSquares, setMoveSquares] = useState({}); // For highlighting last move

  useEffect(() => {
    // Highlight the last move
    if (lastMoveUci) {
      const from = lastMoveUci.substring(0, 2) as Square;
      const to = lastMoveUci.substring(2, 4) as Square;
      setMoveSquares({
        [from]: { background: 'rgba(255, 255, 0, 0.4)' },
        [to]: { background: 'rgba(255, 255, 0, 0.4)' },
      });
    } else {
      setMoveSquares({});
    }
  }, [lastMoveUci]);


  async function sendMoveToBackend(sourceSquare: Square, targetSquare: Square, promotionPiece?: string) {
    try {
      setStatusMessage("Sending move...");
      const response = await fetch(`${API_URL}/game/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSquare: sourceSquare,
          targetSquare: targetSquare,
          promotion: promotionPiece,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to make move');
      }
      const backendState = await response.json();
      updateFromBackend(backendState);
    } catch (error: any) {
      console.error('Error making move:', error);
      setStatusMessage(`Error: ${error.message}. Reverting.`);
      // Revert optimistic update if backend fails
      updateFromBackend({ // This will reload the board from the last valid FEN in store
        fen: localGame.fen(), // Use current localGame FEN before failed move
        isCheck: localGame.isCheck(),
        isCheckmate: localGame.isCheckmate(),
        isStalemate: localGame.isStalemate(),
        isGameOver: localGame.isGameOver(),
        turn: localGame.turn(),
        winner: null, // Or derive from localGame
      });
    }
  }

  function onPieceDragBegin (piece: string, sourceSquare: Square) {
    // Logic for highlighting valid moves on drag start (optional)
    const moves = localGame.moves({ square: sourceSquare, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false; // prevent dragging if no legal moves
    }
    const newSquares: any = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background:
          localGame.get(move.to) && localGame.get(move.to).color !== localGame.get(sourceSquare).color
            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%',
      };
      return move;
    });
    newSquares[sourceSquare] = { background: 'rgba(255, 255, 0, 0.4)' };
    setOptionSquares(newSquares);
    return true; // allow drag
  }


  function onSquareClick(square: Square) {
    setRightClickedSquares({}); // Clear any right-click highlights

    if (isGameOver) {
      setStatusMessage("Game is over. Start a new game.");
      return;
    }
    if (gameMode === 'human_vs_ai' && turn === 'b' && orientation === 'white') {
        setStatusMessage("Waiting for AI move...");
        return; // Don't allow human to move for AI
    }
    if (gameMode === 'human_vs_ai' && turn === 'w' && orientation === 'black') {
        setStatusMessage("Waiting for AI move...");
        return; // Don't allow human to move for AI (when human is black)
    }


    // If no piece selected, try to select one
    if (!moveFrom) {
      const piece = localGame.get(square);
      if (piece && piece.color === turn) {
        setMoveFrom(square);
        const moves = localGame.moves({ square, verbose: true });
        const newSquares: any = {};
        moves.forEach(move => {
          newSquares[move.to] = {
            background:
              localGame.get(move.to) && localGame.get(move.to).color !== piece.color
                ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
                : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
            borderRadius: '50%',
          };
        });
        newSquares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
        setOptionSquares(newSquares);
      }
      return;
    }

    // A piece is selected (moveFrom is set), try to make a move
    const piece = localGame.get(moveFrom);
    if (piece?.type === 'p' &&
       ((piece.color === 'w' && moveFrom[1] === '7' && square[1] === '8') ||
        (piece.color === 'b' && moveFrom[1] === '2' && square[1] === '1'))) {
      // Check if the target square is a legal move for promotion
      const isLegalPromotionMove = localGame.moves({ square: moveFrom, verbose: true })
        .some(m => m.to === square && m.promotion);

      if (isLegalPromotionMove) {
        setMoveTo(square); // Store target square for promotion
        setShowPromotionDialog(true);
        return; // Don't make move yet, wait for promotion choice
      }
    }

    // Attempt to make the move locally for responsiveness
    const localMoveSuccess = makeLocalMove({ from: moveFrom, to: square });
    setOptionSquares({}); // Clear highlights

    if (localMoveSuccess) {
      sendMoveToBackend(moveFrom, square);
    } else {
      // Invalid move according to chess.js, clear selection
      setStatusMessage(`Invalid move. ${turn === 'w' ? 'White' : 'Black'}'s turn.`);
    }
    setMoveFrom(null);
  }


  function onPieceDrop(sourceSquare: Square, targetSquare: Square, piece: string): boolean {
    setOptionSquares({}); // Clear highlights
    if (isGameOver) {
      setStatusMessage("Game is over. Start a new game.");
      return false;
    }
    if (gameMode === 'human_vs_ai' && turn === 'b' && orientation === 'white') {
        setStatusMessage("Waiting for AI move...");
        return false;
    }
    if (gameMode === 'human_vs_ai' && turn === 'w' && orientation === 'black') {
        setStatusMessage("Waiting for AI move...");
        return false;
    }

    // Check for promotion
    const p = localGame.get(sourceSquare);
    if (p?.type === 'p' &&
       ((p.color === 'w' && sourceSquare[1] === '7' && targetSquare[1] === '8') ||
        (p.color === 'b' && sourceSquare[1] === '2' && targetSquare[1] === '1'))) {
      // Check if the target square is a legal move for promotion
      const isLegalPromotionMove = localGame.moves({ square: sourceSquare, verbose: true })
        .some(m => m.to === targetSquare && m.promotion);

      if (isLegalPromotionMove) {
        setMoveFrom(sourceSquare);
        setMoveTo(targetSquare);
        setShowPromotionDialog(true);
        return false; // Do not update board yet, `react-chessboard` will snap back. We handle it after promotion.
      }
    }

    // Attempt local move
    const localMoveSuccess = makeLocalMove({ from: sourceSquare, to: targetSquare });

    if (localMoveSuccess) {
      sendMoveToBackend(sourceSquare, targetSquare);
      return true; // Allow react-chessboard to update
    }
    return false; // Invalid move, prevent react-chessboard update
  }

  function handlePromotion(piece: 'q' | 'r' | 'b' | 'n') {
    if (moveFrom && moveTo) {
      const localMoveSuccess = makeLocalMove({ from: moveFrom, to: moveTo, promotion: piece });
      if (localMoveSuccess) {
        sendMoveToBackend(moveFrom, moveTo, piece);
      } else {
        // This case should ideally not happen if onPieceDrop/onSquareClick logic is correct
         setStatusMessage("Promotion failed. Try again.");
      }
    }
    setShowPromotionDialog(false);
    setMoveFrom(null);
    setMoveTo(null);
  }

  // Custom square styles including last move and selected piece highlights
  const squareStyles = { ...optionSquares, ...moveSquares, ...rightClickedSquares};


  return (
    <div className="flex flex-col items-center">
      {showPromotionDialog && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Promote Pawn to:</h3>
            <div className="flex space-x-2">
              {['q', 'r', 'b', 'n'].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePromotion(p as 'q' | 'r' | 'b' | 'n')}
                  className="p-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  <img src={`/pieces/${turn === 'w' ? 'w' : 'b'}${p.toUpperCase()}.svg`} alt={p} className="w-8 h-8" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    <div style={{ width: 'clamp(300px, 80vw, 600px)' }} className="max-w-full">
      <Chessboard
        id="PlayVsPlay"
        position={fen}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        onPieceDragBegin={onPieceDragBegin}
        onSquareRightClick={(square) => {
        setRightClickedSquares({
          ...rightClickedSquares,
          [square]: { backgroundColor: 'rgba(0, 0, 255, 0.3)'},
        });
        }}
        boardOrientation={orientation}
        customSquareStyles={squareStyles}
        arePiecesDraggable={!isGameOver}
        animationDuration={200}
        customPieces={{
        wP: ({ squareWidth }) => <img src="/pieces/pawn-w.svg" style={{ width: squareWidth, height: squareWidth }} alt="wp"/>,
        wN: ({ squareWidth }) => <img src="/pieces/knight-w.svg" style={{ width: squareWidth, height: squareWidth }} alt="wn"/>,
        wB: ({ squareWidth }) => <img src="/pieces/bishop-w.svg" style={{ width: squareWidth, height: squareWidth }} alt="wb"/>,
        wR: ({ squareWidth }) => <img src="/pieces/rook-w.svg" style={{ width: squareWidth, height: squareWidth }} alt="wr"/>,
        wQ: ({ squareWidth }) => <img src="/pieces/queen-w.svg" style={{ width: squareWidth, height: squareWidth }} alt="wq"/>,
        wK: ({ squareWidth }) => <img src="/pieces/king-w.svg" style={{ width: squareWidth, height: squareWidth }} alt="wk"/>,
        bP: ({ squareWidth }) => <img src="/pieces/pawn-b.svg" style={{ width: squareWidth, height: squareWidth }} alt="bp"/>,
        bN: ({ squareWidth }) => <img src="/pieces/knight-b.svg" style={{ width: squareWidth, height: squareWidth }} alt="bn"/>,
        bB: ({ squareWidth }) => <img src="/pieces/bishop-b.svg" style={{ width: squareWidth, height: squareWidth }} alt="bb"/>,
        bR: ({ squareWidth }) => <img src="/pieces/rook-b.svg" style={{ width: squareWidth, height: squareWidth }} alt="br"/>,
        bQ: ({ squareWidth }) => <img src="/pieces/queen-b.svg" style={{ width: squareWidth, height: squareWidth }} alt="bq"/>,
        bK: ({ squareWidth }) => <img src="/pieces/king-b.svg" style={{ width: squareWidth, height: squareWidth }} alt="bk"/>,
        }}
      />
    </div>
    </div>
  );
}