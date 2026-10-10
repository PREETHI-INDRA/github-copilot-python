// Client-side rendering and interaction for the Flask-backed Sudoku.
const SIZE = 9;
const SCORE_STORAGE_KEY = 'sudoku-top-scores';
const THEME_STORAGE_KEY = 'sudoku-theme';
const MAX_SCORES = 10;
const DIGITS = Array.from({length: SIZE}, (_, index) => index + 1);
let puzzle = [];
let timerInterval = null;
let timerStartedAt = null;
let elapsedSeconds = 0;
let hintsUsed = 0;
let currentDifficulty = 'easy';
let gameCompleted = false;
let pendingScore = null;
let leaderboard = [];
let scoreStorageAvailable = true;
let darkModeEnabled = false;
let selectedDigit = null;
let noteModeEnabled = false;
let solverSteps = [];
let solverStepIndex = 0;
let solverTimer = null;
let solverBoardValues = [];

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  const timer = document.getElementById('timer');
  timer.textContent = formatTime(elapsedSeconds);
}

function startTimer() {
  stopTimer();

  elapsedSeconds = 0;
  timerStartedAt = Date.now();
  updateTimerDisplay();

  timerInterval = window.setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - timerStartedAt) / 1000);
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }

  if (timerStartedAt !== null) {
    elapsedSeconds = Math.floor((Date.now() - timerStartedAt) / 1000);
    timerStartedAt = null;
    updateTimerDisplay();
  }

  return elapsedSeconds;
}

function compareScores(first, second) {
  return first.timeSeconds - second.timeSeconds;
}

function isValidScore(score) {
  return (
    score !== null &&
    typeof score === 'object' &&
    typeof score.name === 'string' &&
    score.name.trim().length > 0 &&
    Number.isInteger(score.timeSeconds) &&
    score.timeSeconds >= 0 &&
    Number.isInteger(score.hintsUsed) &&
    score.hintsUsed >= 0 &&
    ['easy', 'medium', 'hard'].includes(score.difficulty)
  );
}

function readSavedScores() {
  const savedScores = localStorage.getItem(SCORE_STORAGE_KEY);
  if (savedScores === null) {
    return [];
  }

  const parsedScores = JSON.parse(savedScores);
  if (!Array.isArray(parsedScores) || !parsedScores.every(isValidScore)) {
    throw new Error('The saved scores have an invalid format.');
  }

  return parsedScores.sort(compareScores).slice(0, MAX_SCORES);
}

function renderLeaderboard() {
  const tableBody = document.getElementById('leaderboard-body');
  tableBody.replaceChildren();

  if (leaderboard.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No scores yet. Complete a puzzle to be listed here.';
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  leaderboard.forEach((score, index) => {
    const row = document.createElement('tr');
    const values = [
      String(index + 1),
      score.name,
      formatTime(score.timeSeconds),
      String(score.hintsUsed),
      score.difficulty[0].toUpperCase() + score.difficulty.slice(1)
    ];

    for (const value of values) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }

    tableBody.appendChild(row);
  });
}

function updateHintCount() {
  document.getElementById('hint-count').textContent = String(hintsUsed);
}

function addButtonTooltips() {
  const descriptions = {
    'new-game': 'Start a new puzzle at the selected difficulty.',
    'check-solution': 'Check your entries and highlight incorrect cells.',
    'hint-button': 'Reveal a correct number in an empty cell.',
    'solver-start': 'Play or resume the visual solving steps.',
    'solver-step': 'Show the next step in the solving process.',
    'solver-reset': 'Return the visual solver to the beginning.',
    'open-solver': 'Open the visual solver in a separate view.',
    'back-to-game': 'Return to your Sudoku game.',
    'score-form': 'Save your completed game to the leaderboard.'
  };

  for (const button of document.querySelectorAll('button, .button-link')) {
    if (button.classList.contains('tooltip-button')) {
      continue;
    }

    const description = button.classList.contains('number-tracker-button')
      ? `Highlight all placed ${button.dataset.digit}s on the board.`
      : descriptions[button.id] ||
        descriptions[button.closest('form')?.id] ||
        `Activate ${button.textContent.trim()}.`;
    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip-text';
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.textContent = description;
    button.classList.add('tooltip-button');
    if (button.id === 'solver-start') {
      const label = document.createElement('span');
      label.className = 'button-label';
      label.textContent = button.textContent.trim();
      button.prepend(label);
    }
    button.appendChild(tooltip);
  }
}

function setSolverStartLabel(text) {
  document.querySelector('#solver-start .button-label').textContent = text;
}

function renderNumberTracker() {
  const container = document.getElementById('number-tracker-buttons');
  container.replaceChildren();

  for (const digit of DIGITS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'number-tracker-button';
    button.dataset.digit = String(digit);
    button.setAttribute('aria-pressed', String(selectedDigit === digit));

    const number = document.createElement('span');
    number.className = 'tracker-digit';
    number.textContent = String(digit);

    const count = document.createElement('span');
    count.className = 'tracker-count';
    count.dataset.countFor = String(digit);
    count.textContent = '0/9';

    button.append(number, count);
    container.appendChild(button);
  }
}

function updateNumberTracker() {
  const inputs = Array.from(
    document.getElementById('sudoku-board').getElementsByTagName('input')
  );
  const counts = new Map(DIGITS.map((digit) => [digit, 0]));

  for (const input of inputs) {
    input.classList.toggle(
      'selected-digit',
      selectedDigit !== null && input.value === String(selectedDigit)
    );
    if (input.value !== '') {
      const digit = Number(input.value);
      counts.set(digit, counts.get(digit) + 1);
    }
  }

  for (const digit of DIGITS) {
    const count = counts.get(digit);
    const buttons = document.querySelectorAll('.number-tracker-button');
    const button = Array.from(buttons).find(
      (item) => Number(item.dataset.digit) === digit
    );
    if (button) {
      const countElement = button.querySelector('.tracker-count');
      countElement.textContent = `${count}/9`;
      const complete = count === 9 && !hasDigitConflict(inputs, digit);
      button.classList.toggle('number-complete', complete);
      button.setAttribute(
        'aria-label',
        complete
          ? `Number ${digit}: all nine placed`
          : `Number ${digit}: ${count} of 9 placed`
      );
    }
  }
}

function showHintFeedback(text, type = 'success') {
  const feedback = document.getElementById('hint-feedback');
  feedback.textContent = text;
  feedback.classList.toggle('hint-feedback-success', type === 'success');
  feedback.classList.toggle('hint-feedback-error', type === 'error');
  feedback.hidden = text === '';
}

function hasDigitConflict(inputs, digit) {
  const positions = inputs
    .filter((input) => input.value === String(digit))
    .map((input) => ({
      row: Number(input.dataset.row),
      col: Number(input.dataset.col)
    }));

  return positions.some((first, index) =>
    positions.slice(index + 1).some((second) =>
      first.row === second.row ||
      first.col === second.col ||
      (Math.floor(first.row / 3) === Math.floor(second.row / 3) &&
        Math.floor(first.col / 3) === Math.floor(second.col / 3))
    )
  );
}

function selectTrackedDigit(event) {
  const button = event.target.closest('.number-tracker-button');
  if (!button) {
    return;
  }

  const digit = Number(button.dataset.digit);
  selectedDigit = selectedDigit === digit ? null : digit;
  for (const trackerButton of document.querySelectorAll('.number-tracker-button')) {
    trackerButton.setAttribute(
      'aria-pressed',
      String(Number(trackerButton.dataset.digit) === selectedDigit)
    );
  }
  updateNumberTracker();
  const status = document.getElementById('number-tracker-status');
  status.classList.toggle('tracker-status-active', selectedDigit !== null);
  status.textContent =
    selectedDigit === null
      ? 'Number highlighting cleared.'
      : `Highlighting all placed ${digit}s.`;
}

function renderCellNotes(input) {
  const shell = input.parentElement;
  const noteGrid = shell.querySelector('.cell-notes');
  const notes = new Set((input.dataset.notes || '').split('').filter(Boolean));
  shell.classList.toggle('has-notes', notes.size > 0 && input.value === '');
  for (const note of noteGrid.children) {
    note.textContent = notes.has(note.dataset.note) ? note.dataset.note : '';
  }

  const baseLabel =
    `Row ${Number(input.dataset.row) + 1}, column ${Number(input.dataset.col) + 1}`;
  input.setAttribute(
    'aria-label',
    notes.size > 0 ? `${baseLabel}, notes ${Array.from(notes).join(', ')}` : baseLabel
  );
}

function toggleNoteMode() {
  noteModeEnabled = !noteModeEnabled;
  const button = document.getElementById('note-mode-toggle');
  document.body.classList.toggle('pencil-mode', noteModeEnabled);
  button.setAttribute('aria-pressed', String(noteModeEnabled));
  document.getElementById('note-mode-label').textContent =
    noteModeEnabled ? 'Pencil Mode On' : 'Enable Pencil Mode';
  button.querySelector('.tooltip-text').textContent = noteModeEnabled
    ? 'Pencil mode is on: add or remove notes in empty cells'
    : 'Pencil mode is off: click to add or remove notes';
  document.getElementById('note-mode-status').textContent = noteModeEnabled
    ? 'Pencil mode is on. Type a number in an empty cell to add or remove that note.'
    : 'Pencil mode is off. Typed numbers will be entered as answers.';
}

function handleBoardInput(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.disabled) {
    return;
  }

  if (noteModeEnabled) {
    const note = input.value.replace(/[^1-9]/g, '').slice(0, 1);
    input.value = '';
    if (note) {
      const notes = new Set((input.dataset.notes || '').split('').filter(Boolean));
      if (notes.has(note)) {
        notes.delete(note);
      } else {
        notes.add(note);
      }
      input.dataset.notes = Array.from(notes).sort().join('');
      renderCellNotes(input);
      const row = Number(input.dataset.row) + 1;
      const col = Number(input.dataset.col) + 1;
      const action = notes.has(note) ? 'Added' : 'Removed';
      document.getElementById('note-mode-status').textContent =
        `${action} pencil note ${note} at row ${row}, column ${col}.`;
    }
  } else {
    input.value = input.value.replace(/[^1-9]/g, '').slice(0, 1);
    if (input.value !== '') {
      input.dataset.notes = '';
      renderCellNotes(input);
    }
  }

  input.classList.remove('incorrect');
  updateConflictHighlights();
}

function createSolverBoard(initialBoard) {
  const board = document.getElementById('solver-board');
  board.replaceChildren();
  solverBoardValues = initialBoard.map((row) => [...row]);

  for (let row = 0; row < SIZE; row++) {
    const rowElement = document.createElement('div');
    rowElement.className = 'solver-row';
    rowElement.setAttribute('role', 'row');

    for (let col = 0; col < SIZE; col++) {
      const cell = document.createElement('div');
      cell.className = 'solver-cell';
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);
      cell.textContent = initialBoard[row][col] === 0
        ? ''
        : String(initialBoard[row][col]);
      if (initialBoard[row][col] !== 0) {
        cell.classList.add('solver-given');
      }
      rowElement.appendChild(cell);
    }
    board.appendChild(rowElement);
  }
}

function updateSolverCell(row, col, value, isBacktrack = false) {
  const cell = document.querySelector(
    `#solver-board .solver-cell[data-row="${row}"][data-col="${col}"]`
  );
  cell.classList.remove('solver-current', 'solver-backtrack');
  if (isBacktrack) {
    cell.textContent = '';
    solverBoardValues[row][col] = 0;
    cell.classList.add('solver-backtrack');
    return;
  }
  cell.textContent = String(value);
  solverBoardValues[row][col] = value;
  cell.classList.add('solver-current');
}

function applySolverStep() {
  if (solverStepIndex >= solverSteps.length) {
    stopSolverPlayback();
    document.getElementById('solver-status').textContent =
      'Solver trace finished.';
    return false;
  }

  const step = solverSteps[solverStepIndex];
  solverStepIndex += 1;

  if (step.type === 'try') {
    updateSolverCell(step.row, step.col, step.value);
    document.getElementById('solver-status').textContent =
      `Try ${step.value} at row ${step.row + 1}, column ${step.col + 1}. ` +
      `Legal candidates for this cell: ${step.candidates.join(', ')}.`;
    return true;
  }

  if (step.type === 'backtrack') {
    updateSolverCell(step.row, step.col, step.value, true);
    document.getElementById('solver-status').textContent =
      `${step.value} led to a dead end at row ${step.row + 1}, column ${step.col + 1}; backtrack and try another candidate.`;
    return true;
  }

  stopSolverPlayback();
  document.getElementById('solver-status').textContent =
    'Solved. Every empty cell has been filled without breaking Sudoku rules.';
  document.getElementById('solver-start').disabled = true;
  document.getElementById('solver-step').disabled = true;
  return false;
}

function stopSolverPlayback() {
  if (solverTimer !== null) {
    window.clearTimeout(solverTimer);
    solverTimer = null;
  }
  const startButton = document.getElementById('solver-start');
  if (startButton) {
    setSolverStartLabel('Play Solver');
  }
}

function playSolver() {
  if (solverTimer !== null) {
    stopSolverPlayback();
    document.getElementById('solver-status').textContent =
      'Solver paused. Use Step to advance or Play Solver to continue.';
    return;
  }

  setSolverStartLabel('Pause Solver');
  const advance = () => {
    const shouldContinue = applySolverStep();
    if (shouldContinue) {
      const delay = Number(document.getElementById('solver-speed').value);
      solverTimer = window.setTimeout(() => {
        solverTimer = null;
        advance();
      }, delay);
    }
  };
  advance();
}

async function startSolver() {
  const startButton = document.getElementById('solver-start');
  startButton.disabled = true;
  document.getElementById('solver-status').textContent =
    'Preparing the solver trace...';

  try {
    const response = await fetch('/solve-steps');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Could not prepare the solver.');
    }
    if (!Array.isArray(data.steps)) {
      throw new Error('The server returned an invalid solver trace.');
    }

    solverSteps = data.steps;
    solverStepIndex = 0;
    createSolverBoard(puzzle);
    document.getElementById('solver-board').hidden = false;
    document.getElementById('solver-step').disabled = false;
    document.getElementById('solver-reset').disabled = false;
    document.getElementById('solver-status').textContent =
      `Solver ready: ${solverSteps.length} decisions and backtracks.`;
    setSolverStartLabel('Play Solver');
  } catch (error) {
    document.getElementById('solver-status').textContent =
      `Could not start solver: ${error.message}`;
  } finally {
    startButton.disabled = false;
  }
}

function resetSolver(clearTrace = false) {
  stopSolverPlayback();
  if (clearTrace) {
    solverSteps = [];
  }
  solverStepIndex = 0;
  if (puzzle.length === SIZE) {
    createSolverBoard(puzzle);
    document.getElementById('solver-status').textContent =
      'Solver reset to the starting puzzle.';
  }
  document.getElementById('solver-start').disabled = puzzle.length !== SIZE;
  document.getElementById('solver-step').disabled = solverSteps.length === 0;
  document.getElementById('solver-reset').disabled = solverSteps.length === 0;
}

function updateConflictHighlights() {
  const inputs = Array.from(
    document.getElementById('sudoku-board').getElementsByTagName('input')
  );

  for (const input of inputs) {
    input.classList.remove('conflict');
  }

  for (let firstIndex = 0; firstIndex < inputs.length; firstIndex++) {
    const firstInput = inputs[firstIndex];
    if (firstInput.value === '') {
      continue;
    }

    const firstRow = Number(firstInput.dataset.row);
    const firstCol = Number(firstInput.dataset.col);

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < inputs.length;
      secondIndex++
    ) {
      const secondInput = inputs[secondIndex];
      if (firstInput.value !== secondInput.value) {
        continue;
      }

      const secondRow = Number(secondInput.dataset.row);
      const secondCol = Number(secondInput.dataset.col);
      const sameRow = firstRow === secondRow;
      const sameColumn = firstCol === secondCol;
      const sameBox =
        Math.floor(firstRow / 3) === Math.floor(secondRow / 3) &&
        Math.floor(firstCol / 3) === Math.floor(secondCol / 3);

      if (sameRow || sameColumn || sameBox) {
        firstInput.classList.add('conflict');
        secondInput.classList.add('conflict');
      }
    }
  }
  updateNumberTracker();
}

function applyTheme() {
  document.body.classList.toggle('dark-mode', darkModeEnabled);
  const themeToggleLabel = document.getElementById('theme-toggle-label');
  themeToggleLabel.textContent = darkModeEnabled
    ? 'Enable Light Mode'
    : 'Enable Dark Mode';
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.setAttribute('aria-pressed', String(darkModeEnabled));
  themeToggle.querySelector('.tooltip-text').textContent = darkModeEnabled
    ? 'Switch to light mode'
    : 'Switch to dark mode';
}

function updatePageView(focusView = true) {
  const showSolver = window.location.hash === '#solver-view';
  const gameView = document.getElementById('game-view');
  const solverView = document.getElementById('solver-view');

  document.body.classList.toggle('solver-view-active', showSolver);
  gameView.hidden = showSolver;
  solverView.hidden = !showSolver;
  if (focusView) {
    document
      .getElementById(showSolver ? 'solver-title' : 'open-solver')
      .focus();
    window.scrollTo({top: 0, behavior: 'auto'});
  }
}

function toggleTheme() {
  darkModeEnabled = !darkModeEnabled;
  applyTheme();

  try {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      darkModeEnabled ? 'dark' : 'light'
    );
    document.getElementById('theme-message').textContent = '';
  } catch (error) {
    document.getElementById('theme-message').textContent =
      `Theme changed, but your preference could not be saved: ${error.message}`;
  }
}

function qualifiesForLeaderboard(timeSeconds) {
  return (
    leaderboard.length < MAX_SCORES ||
    timeSeconds < leaderboard[leaderboard.length - 1].timeSeconds
  );
}

function completeGame() {
  if (gameCompleted) {
    return;
  }

  gameCompleted = true;
  const finalTime = stopTimer();
  pendingScore = {
    timeSeconds: finalTime,
    hintsUsed,
    difficulty: currentDifficulty
  };

  document.getElementById('hint-button').disabled = true;
  document.getElementById('check-solution').disabled = true;

  const congratulations =
    `Congratulations! You solved it in ${formatTime(finalTime)} ` +
    `using ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}.`;

  if (scoreStorageAvailable && qualifiesForLeaderboard(finalTime)) {
    const scoreForm = document.getElementById('score-form');
    scoreForm.hidden = false;
    document.getElementById('player-name').focus();
    showMessage(`${congratulations} Enter your name to save your score.`);
  } else {
    showMessage(congratulations);
  }
}

function savePendingScore(event) {
  event.preventDefault();

  if (pendingScore === null || !scoreStorageAvailable) {
    showMessage('A score cannot be saved right now.', true);
    return;
  }

  const nameInput = document.getElementById('player-name');
  const name = nameInput.value.trim();
  if (name.length === 0) {
    nameInput.focus();
    showMessage('Enter your name before saving your score.', true);
    return;
  }

  const savedScore = {...pendingScore, name};
  const updatedLeaderboard = [...leaderboard, savedScore]
    .sort(compareScores)
    .slice(0, MAX_SCORES);

  try {
    localStorage.setItem(
      SCORE_STORAGE_KEY,
      JSON.stringify(updatedLeaderboard)
    );
    leaderboard = updatedLeaderboard;
    renderLeaderboard();
    document.getElementById('score-form').hidden = true;
    nameInput.value = '';
    pendingScore = null;
    document.getElementById('leaderboard-message').textContent = '';
    showMessage('Your score was saved to the Top 10 leaderboard.');
  } catch (error) {
    scoreStorageAvailable = false;
    document.getElementById('leaderboard-message').textContent =
      `Could not save your score: ${error.message}`;
    showMessage(`Could not save your score: ${error.message}`, true);
  }
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  boardDiv.setAttribute('role', 'grid');

  for (let row = 0; row < SIZE; row++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    rowDiv.setAttribute('role', 'row');

    for (let col = 0; col < SIZE; col++) {
      const shell = document.createElement('div');
      shell.className = 'cell-shell';
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = row;
      input.dataset.col = col;
      input.dataset.notes = '';
      input.setAttribute('inputmode', 'numeric');
      input.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('spellcheck', 'false');

      const noteGrid = document.createElement('span');
      noteGrid.className = 'cell-notes';
      noteGrid.setAttribute('aria-hidden', 'true');
      for (const digit of DIGITS) {
        const note = document.createElement('span');
        note.dataset.note = String(digit);
        noteGrid.appendChild(note);
      }

      shell.append(input, noteGrid);
      rowDiv.appendChild(shell);
    }

    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(newPuzzle) {
  puzzle = newPuzzle;
  createBoardElement();

  const inputs = document
    .getElementById('sudoku-board')
    .getElementsByTagName('input');

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const index = row * SIZE + col;
      const value = puzzle[row][col];
      const input = inputs[index];

      if (value !== 0) {
        input.value = value;
        input.disabled = true;
        input.classList.add('prefilled');
      } else {
        input.value = '';
        input.disabled = false;
        input.dataset.notes = '';
      }
      renderCellNotes(input);
    }
  }
  selectedDigit = null;
  updateConflictHighlights();
  updateNumberTracker();
}

function readBoardFromPage() {
  const inputs = document
    .getElementById('sudoku-board')
    .getElementsByTagName('input');

  const board = [];

  for (let row = 0; row < SIZE; row++) {
    board[row] = [];

    for (let col = 0; col < SIZE; col++) {
      const index = row * SIZE + col;
      const value = inputs[index].value;
      board[row][col] = value ? parseInt(value, 10) : 0;
    }
  }

  return board;
}

function showMessage(text, isError = false) {
  const message = document.getElementById('message');
  message.textContent = text;
  message.classList.toggle('message-error', isError);
}

function showCheckFeedback(text, isError = false) {
  const feedback = document.getElementById('check-feedback');
  feedback.textContent = text;
  feedback.classList.toggle('message-error', isError);
  feedback.hidden = text === '';
}

function showGameStatus(text, type = 'success') {
  const status = document.getElementById('game-status');
  status.textContent = text;
  status.classList.toggle('game-status-success', type === 'success');
  status.classList.toggle('game-status-error', type === 'error');
  status.classList.toggle('game-status-loading', type === 'loading');
  status.hidden = text === '';
}

async function newGame() {
  const difficulty = document.getElementById('difficulty').value;
  const newGameButton = document.getElementById('new-game');

  showCheckFeedback('');
  showHintFeedback('');
  showGameStatus('Starting a new game...', 'loading');
  newGameButton.disabled = true;

  try {
    const response = await fetch(
      `/new?difficulty=${encodeURIComponent(difficulty)}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not start a new game.');
    }

    renderPuzzle(data.puzzle);
    startTimer();
    hintsUsed = 0;
    updateHintCount();
    currentDifficulty = data.difficulty;
    gameCompleted = false;
    pendingScore = null;
    document.getElementById('score-form').hidden = true;
    document.getElementById('player-name').value = '';
    document.getElementById('hint-button').disabled = false;
    document.getElementById('check-solution').disabled = false;
    resetSolver(true);
    document.getElementById('solver-board').hidden = true;

    const displayDifficulty =
      data.difficulty[0].toUpperCase() + data.difficulty.slice(1);

    showGameStatus(`${displayDifficulty} puzzle ready.`);
  } catch (error) {
    showGameStatus(`Could not start the game: ${error.message}`, 'error');
  } finally {
    newGameButton.disabled = false;
  }
}

async function getHint() {
  if (gameCompleted) {
    return;
  }

  showHintFeedback('');
  const hintButton = document.getElementById('hint-button');
  hintButton.disabled = true;

  try {
    const response = await fetch('/hint', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({board: readBoardFromPage()})
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not get a hint.');
    }

    const {row, col, value} = data;

    if (
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      row >= SIZE ||
      col < 0 ||
      col >= SIZE ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > SIZE
    ) {
      throw new Error('The server returned an invalid hint.');
    }

    const cellIndex = row * SIZE + col;
    const cell = document
      .getElementById('sudoku-board')
      .getElementsByTagName('input')[cellIndex];

    cell.value = value;
    cell.disabled = true;
    cell.classList.add('hinted');
    hintsUsed += 1;
    updateHintCount();
    updateConflictHighlights();

    showHintFeedback(`Hint added at row ${row + 1}, column ${col + 1}.`);
  } catch (error) {
    showHintFeedback(`Could not get a hint: ${error.message}`, 'error');
  } finally {
    hintButton.disabled = false;
  }
}

async function checkSolution() {
  if (gameCompleted) {
    return;
  }

  showCheckFeedback('');

  try {
    const board = readBoardFromPage();
    const response = await fetch('/check', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({board})
    });
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Could not check the puzzle.');
    }

    const inputs = document
      .getElementById('sudoku-board')
      .getElementsByTagName('input');
    const incorrect = new Set(
      data.incorrect.map(([row, col]) => row * SIZE + col)
    );

    for (let index = 0; index < inputs.length; index++) {
      inputs[index].classList.remove('incorrect');

      if (!inputs[index].disabled && incorrect.has(index)) {
        inputs[index].classList.add('incorrect');
      }
    }

    const hasEmptyCells = board.some((row) => row.includes(0));

    if (incorrect.size === 0 && !hasEmptyCells) {
      completeGame();
    } else if (incorrect.size === 0) {
      showCheckFeedback(
        'Your filled entries are correct. Fill in the remaining cells.'
      );
    } else {
      showCheckFeedback('Some filled cells are incorrect.', true);
    }
  } catch (error) {
    showCheckFeedback(`Could not check the puzzle: ${error.message}`, true);
  }
}

window.addEventListener('load', () => {
  updatePageView(false);
  window.addEventListener('hashchange', () => updatePageView());
  const sudokuBoard = document.getElementById('sudoku-board');
  sudokuBoard.addEventListener('beforeinput', (event) => {
    const input = event.target;
    if (
      noteModeEnabled &&
      input instanceof HTMLInputElement &&
      input.value !== ''
    ) {
      event.preventDefault();
      document.getElementById('note-mode-status').textContent =
        'Pencil notes can only be entered in empty cells. This cell already has an answer.';
    }
  });
  sudokuBoard.addEventListener('input', handleBoardInput);
  renderNumberTracker();
  addButtonTooltips();
  document
    .getElementById('number-tracker-buttons')
    .addEventListener('click', selectTrackedDigit);
  document
    .getElementById('note-mode-toggle')
    .addEventListener('click', toggleNoteMode);
  document
    .getElementById('solver-start')
    .addEventListener('click', async () => {
      if (solverSteps.length === 0) {
        await startSolver();
        if (solverSteps.length > 0) {
          playSolver();
        }
      } else {
        playSolver();
      }
    });
  document.getElementById('solver-step').addEventListener('click', () => {
    stopSolverPlayback();
    document.getElementById('solver-start').disabled = false;
    applySolverStep();
  });
  document
    .getElementById('solver-reset')
    .addEventListener('click', () => resetSolver());

  try {
    darkModeEnabled = localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  } catch (error) {
    document.getElementById('theme-message').textContent =
      `Could not load your saved theme preference: ${error.message}`;
  }
  applyTheme();

  try {
    leaderboard = readSavedScores();
  } catch (error) {
    scoreStorageAvailable = false;
    document.getElementById('leaderboard-message').textContent =
      `Could not load saved scores: ${error.message}`;
  }

  renderLeaderboard();
  updateHintCount();
  document
    .getElementById('score-form')
    .addEventListener('submit', savePendingScore);
  document
    .getElementById('theme-toggle')
    .addEventListener('click', toggleTheme);
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('hint-button').addEventListener('click', getHint);
  document
    .getElementById('check-solution')
    .addEventListener('click', checkSolution);

  newGame();
});