import random

from flask import Flask, jsonify, render_template, request

import sudoku_logic


app = Flask(__name__)

# The current puzzle and its solution are kept in memory for this simple game.
CURRENT = {
    "puzzle": None,
    "solution": None,
}


def get_submitted_board():
    """Return the submitted 9x9 board, or an error message if it is invalid."""
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return None, "Request must contain a JSON object."

    board = data.get("board")

    if not isinstance(board, list) or len(board) != sudoku_logic.SIZE:
        return None, "Board must contain exactly 9 rows."

    for row in board:
        if not isinstance(row, list) or len(row) != sudoku_logic.SIZE:
            return None, "Each board row must contain exactly 9 cells."

        for value in row:
            if type(value) is not int or not 0 <= value <= sudoku_logic.SIZE:
                return None, "Each cell must be an integer from 0 to 9."

    return board, None


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/new")
def new_game():
    difficulty = request.args.get("difficulty", "easy").strip().lower()

    if difficulty not in sudoku_logic.DIFFICULTIES:
        allowed = ", ".join(sudoku_logic.DIFFICULTIES)
        return jsonify({
            "error": f"Invalid difficulty. Choose one of: {allowed}."
        }), 400

    try:
        puzzle, solution = sudoku_logic.generate_puzzle(difficulty)
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 503

    CURRENT["puzzle"] = puzzle
    CURRENT["solution"] = solution

    return jsonify({
        "puzzle": puzzle,
        "difficulty": difficulty,
    })


@app.route("/check", methods=["POST"])
def check_solution():
    solution = CURRENT.get("solution")

    if solution is None:
        return jsonify({"error": "No game in progress. Start a new game first."}), 400

    board, error = get_submitted_board()

    if error:
        return jsonify({"error": error}), 400

    incorrect = []

    for row in range(sudoku_logic.SIZE):
        for col in range(sudoku_logic.SIZE):
            if board[row][col] != sudoku_logic.EMPTY and board[row][col] != solution[row][col]:
                incorrect.append([row, col])

    return jsonify({"incorrect": incorrect})


@app.route("/hint", methods=["POST"])
def get_hint():
    puzzle = CURRENT.get("puzzle")
    solution = CURRENT.get("solution")

    if puzzle is None or solution is None:
        return jsonify({"error": "No game in progress. Start a new game first."}), 400

    board, error = get_submitted_board()

    if error:
        return jsonify({"error": error}), 400

    empty_cells = [
        (row, col)
        for row in range(sudoku_logic.SIZE)
        for col in range(sudoku_logic.SIZE)
        if puzzle[row][col] == sudoku_logic.EMPTY
        and board[row][col] == sudoku_logic.EMPTY
    ]

    if not empty_cells:
        return jsonify({"error": "There are no empty cells left for a hint."}), 409

    row, col = random.choice(empty_cells)

    return jsonify({
        "row": row,
        "col": col,
        "value": solution[row][col],
    })


@app.route("/solve-steps")
def get_solver_steps():
    puzzle = CURRENT.get("puzzle")

    if puzzle is None:
        return jsonify({"error": "No game in progress. Start a new game first."}), 400

    try:
        steps = sudoku_logic.solve_with_steps(puzzle)
    except (RuntimeError, ValueError) as error:
        return jsonify({"error": str(error)}), 422

    return jsonify({"steps": steps})


if __name__ == "__main__":
    app.run(debug=True)