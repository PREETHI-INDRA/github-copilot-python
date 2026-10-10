import copy
import random

SIZE = 9
EMPTY = 0

DIFFICULTIES = {
    "easy": 40,
    "medium": 32,
    "hard": 26,
}


def deep_copy(board):
    return copy.deepcopy(board)


def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]


def is_safe(board, row, col, num):
    for index in range(SIZE):
        if board[row][index] == num or board[index][col] == num:
            return False

    start_row = row - row % 3
    start_col = col - col % 3
    for box_row in range(start_row, start_row + 3):
        for box_col in range(start_col, start_col + 3):
            if board[box_row][box_col] == num:
                return False
    return True


def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def count_solutions(board, limit=2):
    """Count solutions up to limit, leaving board unchanged."""
    if len(board) != SIZE or any(len(row) != SIZE for row in board):
        raise ValueError("A Sudoku board must have 9 rows and 9 columns.")
    if any(
        not isinstance(value, int) or value < EMPTY or value > SIZE
        for row in board
        for value in row
    ):
        raise ValueError("Sudoku cells must be integers from 0 to 9.")
    if not isinstance(limit, int) or limit < 1:
        raise ValueError("limit must be a positive integer.")

    for index in range(SIZE):
        row_values = [value for value in board[index] if value != EMPTY]
        col_values = [
            board[row][index] for row in range(SIZE) if board[row][index] != EMPTY
        ]
        if len(row_values) != len(set(row_values)):
            return 0
        if len(col_values) != len(set(col_values)):
            return 0

    for box_row in range(0, SIZE, 3):
        for box_col in range(0, SIZE, 3):
            box_values = [
                board[row][col]
                for row in range(box_row, box_row + 3)
                for col in range(box_col, box_col + 3)
                if board[row][col] != EMPTY
            ]
            if len(box_values) != len(set(box_values)):
                return 0

    working_board = deep_copy(board)
    solutions_found = 0

    def search():
        nonlocal solutions_found
        best_cell = None
        best_candidates = None

        for row in range(SIZE):
            for col in range(SIZE):
                if working_board[row][col] != EMPTY:
                    continue

                candidates = [
                    number
                    for number in range(1, SIZE + 1)
                    if is_safe(working_board, row, col, number)
                ]
                if not candidates:
                    return
                if best_candidates is None or len(candidates) < len(best_candidates):
                    best_cell = (row, col)
                    best_candidates = candidates
                    if len(candidates) == 1:
                        break
            if best_candidates is not None and len(best_candidates) == 1:
                break

        if best_cell is None:
            solutions_found += 1
            return

        row, col = best_cell
        for candidate in best_candidates:
            working_board[row][col] = candidate
            search()
            working_board[row][col] = EMPTY
            if solutions_found >= limit:
                return

    search()
    return solutions_found


def solve_with_steps(board, max_steps=10000):
    """Return a backtracking trace that solves a valid Sudoku board."""
    if count_solutions(board, limit=1) == 0:
        raise ValueError("The Sudoku board has no valid solution.")
    if not isinstance(max_steps, int) or max_steps < 1:
        raise ValueError("max_steps must be a positive integer.")

    working_board = deep_copy(board)
    steps = []

    def search():
        best_cell = None
        best_candidates = None

        for row in range(SIZE):
            for col in range(SIZE):
                if working_board[row][col] != EMPTY:
                    continue

                candidates = [
                    number
                    for number in range(1, SIZE + 1)
                    if is_safe(working_board, row, col, number)
                ]
                if not candidates:
                    return False
                if best_candidates is None or len(candidates) < len(best_candidates):
                    best_cell = (row, col)
                    best_candidates = candidates
                    if len(candidates) == 1:
                        break
            if best_candidates is not None and len(best_candidates) == 1:
                break

        if best_cell is None:
            steps.append({"type": "solved"})
            return True

        row, col = best_cell
        for candidate in best_candidates:
            steps.append({
                "type": "try",
                "row": row,
                "col": col,
                "value": candidate,
                "candidates": best_candidates,
            })
            if len(steps) > max_steps:
                raise RuntimeError("The solver trace exceeded the step limit.")

            working_board[row][col] = candidate
            if search():
                return True

            working_board[row][col] = EMPTY
            steps.append({
                "type": "backtrack",
                "row": row,
                "col": col,
                "value": candidate,
            })
            if len(steps) > max_steps:
                raise RuntimeError("The solver trace exceeded the step limit.")

        return False

    if not search():
        raise ValueError("The Sudoku board has no valid solution.")

    return steps


def remove_cells(board, clues):
    """Remove clues while retaining a unique solution; return success status."""
    cells = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(cells)

    remaining = SIZE * SIZE
    for row, col in cells:
        if remaining <= clues:
            break

        value = board[row][col]
        board[row][col] = EMPTY
        if count_solutions(board) == 1:
            remaining -= 1
        else:
            board[row][col] = value

    return remaining == clues


def _clue_count(value):
    if isinstance(value, str):
        difficulty = value.lower()
        if difficulty not in DIFFICULTIES:
            choices = ", ".join(DIFFICULTIES)
            raise ValueError(f"Difficulty must be one of: {choices}.")
        return DIFFICULTIES[difficulty]

    if not isinstance(value, int) or not 17 <= value <= SIZE * SIZE:
        raise ValueError("Clue count must be an integer from 17 to 81.")
    return value


def generate_puzzle(clues=35):
    """Generate a unique puzzle from a difficulty name or clue count.

    Integer clue counts are accepted to preserve the original function API.
    """
    target_clues = _clue_count(clues)

    for _ in range(10):
        solution = create_empty_board()
        if not fill_board(solution):
            raise RuntimeError("Could not generate a complete Sudoku solution.")

        puzzle = deep_copy(solution)
        if remove_cells(puzzle, target_clues):
            return puzzle, solution

    raise RuntimeError(
        f"Could not generate a unique puzzle with {target_clues} clues. "
        "Please try again."
    )
