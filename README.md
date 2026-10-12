# Refactor a Sudoku Game written in Python Flask

Use this simple Sudoku game as a starting point to practice your skills with GitHub Copilot. The goal is to refactor the code to use modern technologies, while also adding new features and improving the overall user experience.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.
For gameplay instructions and Windows run/test commands, see
[instructions.md](./instructions.md).

### Dependencies

```
- Modern web browser (Chrome, Firefox, Edge, etc.)
- Python 3
```

### Installation

1. Fork this repository to your GitHub account. (You can use the "Fork" button on the top right corner of the repository page.)

2. Clone your forked repository to your local machine.

3. Open a terminal window and navigate to the "github-copilot-python/starter" directory.

4. Create a Python virtual environment and activate it (optional but highly recommended).

```bash
python3 -m venv .venv
source .venv/bin/activate
```

5. Install required Python packages.

```bash
pip install -r requirements.txt
```

6. Run the Flask app.

```bash
python app.py
```

7. Open http://127.0.0.1:5000 in your browser.

## Project Instructions

Use GitHub Copilot to refactor the code for this game to add more advanced features. The goal is to create a more modern and maintainable codebase and add additional functionality to the final product. You can use any combination of code completion and chat features, like Ask, Edit, or Agent modes.

- Errors should be handled gracefully with appropriate messages to the user.
- Implement a Sudoku board generator that creates a valid Sudoku puzzle with a unique solution.
- Add a timer to track how long it takes to solve the puzzle.
- Implement a solution checker that verifies if the user's solution is correct using event delegation.
- Add a difficulty selector to allow users to choose between easy, medium, and hard puzzles.
- Add a hint feature that provides clues for the user that are noted with unique colors.
- Add a check puzzle button that checks the current state of the board against the solution.
- User should get immediate feedback on their input, such as highlighting invalid entries.
- Top 10 scores should be saved in local storage and displayed on the page with the user's name, time taken, hints used, and difficulty level.
- The game should be responsive and work well on both desktop and mobile devices.
- UI colors should be visually appealing and accessible.
- Completed and correct puzzles should display a congratulatory message with the time taken and hints used and ask for the user's name for Top 10 times.

## Tests

Run the tests from the `starter` directory in PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pytest .\tests -v
```

The Sudoku logic tests cover valid solutions, clue counts by difficulty, and puzzle uniqueness.

## Optional Challenges

The game also includes optional number tracking, pencil-note mode, and an animated
backtracking solver. Reusable project prompt templates are stored in `prompts.json`.
The interface includes accessibility improvements such as a skip link, labeled
controls, keyboard-visible focus, status announcements, and reduced-motion support.
These improvements are not a formal WCAG 2.1 AA audit or certification.

The game board and Visual Solver alternate the 3×3 region colors in both light
and dark themes. Switching themes does not change the board dimensions.

To test the solver, start a puzzle, select **Visual Solver** above the board, and use
**Play Solver**, **Step**, **Pause Solver**, and **Reset Solver**. Use **Back to Sudoku**
to return to the same puzzle; its timer and entries are preserved. To test pencil
notes, enable **Pencil Mode** above the board, focus an empty cell, and type digits;
the note appears in the cell and typing that digit again removes it. The Number
Tracker counts each digit and its buttons highlight matching board cells.

### Copilot suggestion review example

During the Visual Solver styling work, the first suggested change for alternating
region colors looked correct in the stylesheet, but browser inspection showed
solver-cell styling could obscure those colors. The styling was revised to retain
each cell's base or alternating fill beneath solver highlights, then checked in
both themes to confirm the region pattern and board geometry remained consistent.
