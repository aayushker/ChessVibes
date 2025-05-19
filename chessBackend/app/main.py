from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import Move, GameState, NewGameRequest
from .chess_logic import game, game_mode, ai_difficulty_level # Import global instance

app = FastAPI()

# CORS (Cross-Origin Resource Sharing)
origins = [
    "http://localhost:3000", # Next.js dev server
    "http://127.0.0.1:3000",
    # Add your production frontend URL here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/game/new", response_model=GameState)
async def new_game(request: NewGameRequest):
    global game_mode, ai_difficulty_level
    game.reset_board()
    game_mode = request.mode
    ai_difficulty_level = request.ai_difficulty if request.ai_difficulty is not None else 0
    print(f"New game started. Mode: {game_mode}, AI Difficulty: {ai_difficulty_level}")
    return game.get_current_state()

@app.post("/game/move", response_model=GameState)
async def make_move(move_data: Move):
    print(f"Received move: {move_data.sourceSquare}{move_data.targetSquare}{move_data.promotion or ''}")
    if game.is_game_over():
        raise HTTPException(status_code=400, detail="Game is over.")

    player_move = game.make_move(move_data.sourceSquare, move_data.targetSquare, move_data.promotion)

    if player_move is None:
        raise HTTPException(status_code=400, detail="Invalid move.")

    current_state = game.get_current_state(last_move=player_move)

    if game_mode == 'human_vs_ai' and not game.is_game_over() and game.get_turn() == 'b': # Assuming AI is black
        ai_chess_move = game.get_ai_move(ai_difficulty_level)
        if ai_chess_move:
            game.board.push(ai_chess_move) # Make AI move on the board
            current_state = game.get_current_state(last_move=ai_chess_move)
        else: # AI could not make a move (should only happen if game is over for AI)
            print("AI could not make a move, game might be over for AI.")
            current_state = game.get_current_state(last_move=player_move) # Re-fetch state

    return current_state


@app.get("/game/state", response_model=GameState)
async def get_game_state():
    return game.get_current_state()

@app.get("/game/valid_moves/{square}", response_model=list[str])
async def get_valid_moves(square: str):
    try:
        square_index = chess.SQUARE_NAMES.index(square.lower())
        moves = []
        for move in game.board.legal_moves:
            if move.from_square == square_index:
                moves.append(move.uci()[2:4]) # target square
        return moves
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid square.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)