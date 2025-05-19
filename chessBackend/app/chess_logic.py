import chess
import chess.engine
import random
from typing import Optional

# For a more advanced AI, you would configure Stockfish path here
# For simplicity, we'll use a very basic AI or python-chess's simple capabilities.
# STOCKFISH_PATH = "/usr/games/stockfish" # Example path, install Stockfish separately

class ChessGame:
    def __init__(self):
        self.board = chess.Board()
        # For a simple built-in AI (if not using Stockfish)
        # self.engine = None # Placeholder if you want to add a simple engine later

    def get_fen(self) -> str:
        return self.board.fen()

    def get_turn(self) -> str:
        return 'w' if self.board.turn == chess.WHITE else 'b'

    def is_game_over(self):
        return self.board.is_game_over()

    def get_game_result(self):
        if self.board.is_checkmate():
            return "white" if self.board.turn == chess.BLACK else "black"
        if self.board.is_stalemate() or \
           self.board.is_insufficient_material() or \
           self.board.is_seventyfive_moves() or \
           self.board.is_fivefold_repetition():
            return "draw"
        return None

    def make_move(self, source_square: str, target_square: str, promotion: Optional[str] = None) -> Optional[chess.Move]:
        move_uci = source_square + target_square
        if promotion:
            move_uci += promotion.lower()

        try:
            move = chess.Move.from_uci(move_uci)
            if move in self.board.legal_moves:
                self.board.push(move)
                return move
            else:
                # Try to find a promotion move if it's a pawn reaching the last rank
                if self.board.piece_at(chess.SQUARE_NAMES.index(source_square)) and \
                   self.board.piece_at(chess.SQUARE_NAMES.index(source_square)).piece_type == chess.PAWN:
                    # Check if it's a promotion move without explicit promotion piece
                    for legal_move in self.board.legal_moves:
                        if legal_move.from_square == chess.SQUARE_NAMES.index(source_square) and \
                           legal_move.to_square == chess.SQUARE_NAMES.index(target_square) and \
                           legal_move.promotion:
                            if promotion: # if promotion piece is specified
                                prom_piece = getattr(chess, promotion.upper(), None)
                                if prom_piece and legal_move.promotion == prom_piece:
                                    self.board.push(legal_move)
                                    return legal_move
                            else: # if no promotion piece, default to queen
                                if legal_move.promotion == chess.QUEEN:
                                    self.board.push(legal_move)
                                    return legal_move
                return None
        except ValueError: # Invalid UCI string
            return None
        return None


    def get_ai_move(self, difficulty: int = 0) -> Optional[chess.Move]:
        if self.board.is_game_over():
            return None

        legal_moves = list(self.board.legal_moves)
        if not legal_moves:
            return None

        if difficulty == 0: # Random move
            return random.choice(legal_moves)
        else: # Simple evaluation (capture or random) - very basic
            # Prefer captures
            capturing_moves = [m for m in legal_moves if self.board.is_capture(m)]
            if capturing_moves:
                # Prefer capturing higher value pieces (simplified)
                best_capture = None
                max_value = -1
                for move in capturing_moves:
                    captured_piece = self.board.piece_at(move.to_square)
                    if captured_piece:
                        value = {"P":1, "N":3, "B":3, "R":5, "Q":9, "K":0}.get(captured_piece.symbol().upper(), 0)
                        if value > max_value:
                            max_value = value
                            best_capture = move
                if best_capture: return best_capture
                return random.choice(capturing_moves)

            # If no captures, try to find a check
            checking_moves = []
            for move in legal_moves:
                temp_board = self.board.copy()
                temp_board.push(move)
                if temp_board.is_check():
                    checking_moves.append(move)
            if checking_moves:
                return random.choice(checking_moves)

            return random.choice(legal_moves) # Fallback to random

    def reset_board(self):
        self.board.reset()

    def get_current_state(self, last_move: Optional[chess.Move] = None) -> dict:
        winner = None
        if self.board.is_game_over():
            result = self.board.result(claim_draw=True) # claim_draw to resolve 75moves/5fold
            if result == "1-0": winner = "white"
            elif result == "0-1": winner = "black"
            elif result in ["1/2-1/2", "*"]: winner = "draw"


        return {
            "fen": self.get_fen(),
            "isCheck": self.board.is_check(),
            "isCheckmate": self.board.is_checkmate(),
            "isStalemate": self.board.is_stalemate(),
            "isGameOver": self.board.is_game_over(claim_draw=True),
            "turn": self.get_turn(),
            "winner": winner,
            "last_move_uci": last_move.uci() if last_move else None
        }

# Global game instance (simple for this example, for multi-user use a dictionary of games)
game = ChessGame()
game_mode: str = 'human_vs_human' # 'human_vs_human' or 'human_vs_ai'
ai_difficulty_level: int = 0