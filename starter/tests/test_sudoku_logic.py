import pytest

import sudoku_logic


def test_generate_puzzle_returns_9_by_9_boards():
    puzzle, solution = sudoku_logic.generate_puzzle()

    assert len(puzzle) == 9
    assert len(solution) == 9
    assert all(len(row) == 9 for row in puzzle)
    assert all(len(row) == 9 for row in solution)


def test_generated_solution_obeys_sudoku_rules():
    _, solution = sudoku_logic.generate_puzzle()
    expected_numbers = list(range(1, 10))

    # Every row contains the digits 1 through 9 exactly once.
    for row in solution:
        assert sorted(row) == expected_numbers

    # Every column contains the digits 1 through 9 exactly once.
    for col in range(9):
        column = [solution[row][col] for row in range(9)]
        assert sorted(column) == expected_numbers

    # Every 3-by-3 box contains the digits 1 through 9 exactly once.
    for box_row in range(0, 9, 3):
        for box_col in range(0, 9, 3):
            box = [
                solution[row][col]
                for row in range(box_row, box_row + 3)
                for col in range(box_col, box_col + 3)
            ]
            assert sorted(box) == expected_numbers


def test_puzzle_clues_match_the_solution():
    puzzle, solution = sudoku_logic.generate_puzzle()

    for row in range(9):
        for col in range(9):
            if puzzle[row][col] != sudoku_logic.EMPTY:
                assert puzzle[row][col] == solution[row][col]


@pytest.mark.parametrize(
    ("difficulty", "expected_clues"),
    [
        ("easy", 40),
        ("medium", 32),
        ("hard", 26),
    ],
)
def test_difficulty_generates_unique_puzzle_with_expected_clue_count(
    difficulty, expected_clues
):
    puzzle, solution = sudoku_logic.generate_puzzle(difficulty)

    clue_count = sum(
        value != sudoku_logic.EMPTY for row in puzzle for value in row
    )
    assert clue_count == expected_clues
    assert sudoku_logic.count_solutions(puzzle) == 1
    for row in range(9):
        for col in range(9):
            if puzzle[row][col] != sudoku_logic.EMPTY:
                assert puzzle[row][col] == solution[row][col]


def test_solution_counter_stops_at_limit_and_does_not_change_board():
    board = sudoku_logic.create_empty_board()
    original_board = sudoku_logic.deep_copy(board)

    assert sudoku_logic.count_solutions(board, limit=2) == 2
    assert board == original_board


def test_solution_counter_rejects_duplicate_givens():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 1
    board[0][1] = 1

    assert sudoku_logic.count_solutions(board) == 0


def test_solver_trace_reaches_a_valid_solution_without_mutating_the_puzzle():
    puzzle, solution = sudoku_logic.generate_puzzle("easy")
    original_puzzle = sudoku_logic.deep_copy(puzzle)

    steps = sudoku_logic.solve_with_steps(puzzle)

    assert steps[-1] == {"type": "solved"}
    assert puzzle == original_puzzle

    replayed_board = sudoku_logic.deep_copy(puzzle)
    for step in steps[:-1]:
        row = step["row"]
        col = step["col"]
        if step["type"] == "try":
            assert step["value"] in step["candidates"]
            replayed_board[row][col] = step["value"]
        elif step["type"] == "backtrack":
            replayed_board[row][col] = sudoku_logic.EMPTY

    assert replayed_board == solution


def test_solver_trace_rejects_a_board_with_duplicate_values():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 1
    board[0][1] = 1

    with pytest.raises(ValueError, match="no valid solution"):
        sudoku_logic.solve_with_steps(board)


def test_generate_puzzle_rejects_unknown_difficulty():
    with pytest.raises(ValueError, match="Difficulty"):
        sudoku_logic.generate_puzzle("extreme")