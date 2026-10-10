import pytest

from app import CURRENT, app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    CURRENT["puzzle"] = None
    CURRENT["solution"] = None

    with app.test_client() as test_client:
        yield test_client

    CURRENT["puzzle"] = None
    CURRENT["solution"] = None


def test_home_page_loads(client):
    response = client.get("/")

    assert response.status_code == 200
    assert b"Sudoku Game" in response.data


def test_new_game_returns_a_9_by_9_puzzle(client):
    response = client.get("/new")

    assert response.status_code == 200

    data = response.get_json()
    assert "puzzle" in data
    assert len(data["puzzle"]) == 9
    assert all(len(row) == 9 for row in data["puzzle"])


@pytest.mark.parametrize("difficulty", ["easy", "medium", "hard"])
def test_new_game_accepts_each_difficulty(client, difficulty):
    response = client.get(f"/new?difficulty={difficulty}")

    assert response.status_code == 200

    data = response.get_json()
    assert data["difficulty"] == difficulty
    assert len(data["puzzle"]) == 9
    assert all(len(row) == 9 for row in data["puzzle"])


def test_new_game_defaults_to_easy(client):
    response = client.get("/new")

    assert response.status_code == 200
    assert response.get_json()["difficulty"] == "easy"


def test_new_game_rejects_unknown_difficulty(client):
    response = client.get("/new?difficulty=extreme")

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_check_accepts_the_correct_solution(client):
    client.get("/new")
    solution = CURRENT["solution"]

    response = client.post("/check", json={"board": solution})

    assert response.status_code == 200
    assert response.get_json() == {"incorrect": []}


def test_check_reports_an_incorrect_cell(client):
    client.get("/new")
    board = [row[:] for row in CURRENT["solution"]]
    board[0][0] = board[0][0] % 9 + 1

    response = client.post("/check", json={"board": board})

    assert response.status_code == 200
    assert response.get_json() == {"incorrect": [[0, 0]]}


def test_check_does_not_report_empty_cells_as_incorrect(client):
    client.get("/new")
    puzzle = CURRENT["puzzle"]

    response = client.post("/check", json={"board": puzzle})

    assert response.status_code == 200
    assert response.get_json() == {"incorrect": []}


def test_check_reports_only_filled_incorrect_cells(client):
    client.get("/new")
    board = [row[:] for row in CURRENT["puzzle"]]
    solution = CURRENT["solution"]
    empty_cell = next(
        (row, col)
        for row in range(9)
        for col in range(9)
        if board[row][col] == 0
    )
    row, col = empty_cell
    board[row][col] = solution[row][col] % 9 + 1

    response = client.post("/check", json={"board": board})

    assert response.status_code == 200
    assert response.get_json() == {"incorrect": [[row, col]]}


def test_check_rejects_a_request_when_no_game_is_active(client):
    response = client.post("/check", json={"board": [[0] * 9 for _ in range(9)]})

    assert response.status_code == 400
    assert "No game in progress" in response.get_json()["error"]


@pytest.mark.parametrize(
    "board",
    [
        [],
        [[0] * 9 for _ in range(8)],
        [[0] * 8 for _ in range(9)],
        [[0] * 9 for _ in range(8)] + [["bad", 0, 0, 0, 0, 0, 0, 0, 0]],
        [[False] + [0] * 8] + [[0] * 9 for _ in range(8)],
    ],
)
def test_check_rejects_malformed_boards(client, board):
    client.get("/new")

    response = client.post("/check", json={"board": board})

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_check_rejects_a_request_without_json(client):
    client.get("/new")

    response = client.post("/check", data="not JSON")

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_hint_returns_an_empty_puzzle_cell_with_its_solution(client):
    client.get("/new")
    puzzle = [row[:] for row in CURRENT["puzzle"]]
    solution = CURRENT["solution"]

    response = client.post("/hint", json={"board": puzzle})

    assert response.status_code == 200

    hint = response.get_json()
    row = hint["row"]
    col = hint["col"]

    assert puzzle[row][col] == 0
    assert hint["value"] == solution[row][col]


def test_hint_reports_when_no_empty_cells_are_available(client):
    client.get("/new")
    solution = CURRENT["solution"]

    response = client.post("/hint", json={"board": solution})

    assert response.status_code == 409
    assert "no empty cells" in response.get_json()["error"]


def test_hint_rejects_a_request_when_no_game_is_active(client):
    response = client.post("/hint", json={"board": [[0] * 9 for _ in range(9)]})

    assert response.status_code == 400
    assert "No game in progress" in response.get_json()["error"]


def test_solver_steps_returns_a_trace_for_the_active_puzzle(client):
    client.get("/new")

    response = client.get("/solve-steps")

    assert response.status_code == 200
    steps = response.get_json()["steps"]
    assert steps
    assert steps[-1] == {"type": "solved"}
    assert all(step["type"] in {"try", "backtrack", "solved"} for step in steps)


def test_solver_steps_rejects_a_request_when_no_game_is_active(client):
    response = client.get("/solve-steps")

    assert response.status_code == 400
    assert "No game in progress" in response.get_json()["error"]