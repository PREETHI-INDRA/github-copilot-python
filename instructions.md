# Sudoku Game Instructions

## Start the game on Windows

Open PowerShell in the repository's `starter` folder:

```powershell
cd C:\projects\github-copilot-python\starter
```

Create a virtual environment if you have not created one already, then install
the project dependencies:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\requirements.txt
```

Start the Flask app:

```powershell
.\.venv\Scripts\python.exe .\app.py
```

Open <http://127.0.0.1:5000> in your browser. Keep the PowerShell window open
while playing. To stop the server, press `Ctrl+C` in that window.

## Play

1. Choose **Easy**, **Medium**, or **Hard** and select **New Game**.
2. Fill the empty cells with digits from 1 to 9. Given puzzle numbers cannot be
   changed.
3. Select **Check Puzzle** to check your entries. Incorrect entries are
   highlighted; correct entries with remaining blanks are not marked wrong.
4. Select **Hint** to reveal a correct number in an empty cell. The hint count
   tracks how many hints you have used.
5. Use the Number Tracker to select a digit and highlight its occurrences.
6. Enable **Pencil Mode** to add or remove candidate notes in empty cells.
7. Select **Visual Solver** to view the solving animation. Use **Back to Sudoku**
   to return to your current game.
8. When the puzzle is solved, enter a name to save the result to the local
   Top 10 leaderboard.

The theme control switches between light and dark mode. Button hover or keyboard
focus provides a short tooltip.

## Run the tests

Open a second PowerShell window in the `starter` folder and run:

```powershell
.\.venv\Scripts\python.exe -m pip install -r .\requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest .\tests -v
```

The tests should report **34 passed**.
