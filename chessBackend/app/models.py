from pydantic import BaseModel
from typing import Optional, List

class Move(BaseModel):
    sourceSquare: str
    targetSquare: str
    promotion: Optional[str] = None # e.g., 'q' for queen

class GameState(BaseModel):
    fen: str
    isCheck: bool
    isCheckmate: bool
    isStalemate: bool
    isGameOver: bool
    turn: str # 'w' or 'b'
    winner: Optional[str] = None # 'white', 'black', or None
    last_move_uci: Optional[str] = None # UCI string of the last move e.g. e2e4

class NewGameRequest(BaseModel):
    mode: str # 'human' vs 'human', 'human' vs 'ai'
    ai_difficulty: Optional[int] = 1 # 0: random, 1: simple lookahead