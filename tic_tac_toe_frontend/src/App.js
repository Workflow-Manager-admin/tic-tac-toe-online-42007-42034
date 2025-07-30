import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// --- THEME CONSTANTS ---
const COLORS = {
  primary: '#3498db',
  secondary: '#2ecc71',
  accent: '#e74c3c',
};

// --- BOARD HELPERS ---
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (let [a, b, c] of lines) {
    if (
      squares[a] &&
      squares[a] === squares[b] &&
      squares[a] === squares[c]
    ) {
      return squares[a];
    }
  }
  return null;
}
function isDraw(squares) {
  return squares.every(Boolean) && !calculateWinner(squares);
}
function aiMove(squares, mark) {
  const emptyIdx = squares
    .map((val, idx) => (val ? null : idx))
    .filter((x) => x !== null);
  return emptyIdx[Math.floor(Math.random() * emptyIdx.length)];
}
function minimax(squares, player, aiMark) {
  const winner = calculateWinner(squares);
  if (winner === aiMark) return { score: 1 };
  if (winner && winner !== aiMark) return { score: -1 };
  if (isDraw(squares)) return { score: 0 };

  const moves = [];
  for (let i = 0; i < 9; i++) {
    if (!squares[i]) {
      const next = squares.slice();
      next[i] = player;
      let result = minimax(next, player === 'X' ? 'O' : 'X', aiMark);
      moves.push({ idx: i, score: result.score });
    }
  }
  if (player === aiMark) {
    const max = Math.max(...moves.map((m) => m.score));
    return moves.find((m) => m.score === max) || moves[0];
  } else {
    const min = Math.min(...moves.map((m) => m.score));
    return moves.find((m) => m.score === min) || moves[0];
  }
}
function Square({ value, onClick, highlight }) {
  return (
    <button
      className="ttt-square"
      onClick={onClick}
      style={{
        color: value === 'X' ? COLORS.primary : value === 'O' ? COLORS.accent : '',
        borderColor: highlight ? COLORS.secondary : 'var(--border-color)',
        background: highlight ? 'rgba(46,204,113,0.07)' : ''
      }}
      aria-label={`Board square${value ? ` occupied by ${value}` : ''}`}
    >
      {value}
    </button>
  );
}
function Board({ squares, onPlay, winnerLine }) {
  function renderSquare(i) {
    return (
      <Square
        key={i}
        value={squares[i]}
        onClick={() => onPlay(i)}
        highlight={winnerLine && winnerLine.includes(i)}
      />
    );
  }
  return (
    <div className="ttt-board">
      {[0, 1, 2].map((row) => (
        <div key={row} className="ttt-board-row">
          {renderSquare(row * 3 + 0)}
          {renderSquare(row * 3 + 1)}
          {renderSquare(row * 3 + 2)}
        </div>
      ))}
    </div>
  );
}
function getWinnerLine(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (let line of lines) {
    const [a, b, c] = line;
    if (
      squares[a] &&
      squares[a] === squares[b] &&
      squares[a] === squares[c]
    ) {
      return line;
    }
  }
  return null;
}
const GAME_MODES = {
  LOCAL_TWO_PLAYER: 'Local 2P',
  VERSUS_AI: 'Vs AI',
  REALTIME: 'Real-Time',
};

// PUBLIC_INTERFACE
function App() {
  // THEME SWITCHER
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // GAME STATE
  const [gameMode, setGameMode] = useState(GAME_MODES.LOCAL_TWO_PLAYER);
  const [aiDifficulty, setAiDifficulty] = useState('hard');
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);
  const [winnerLine, setWinnerLine] = useState(null);
  const [status, setStatus] = useState('');
  const [draw, setDraw] = useState(false);
  const [score, setScore] = useState({ X: 0, O: 0, Draw: 0 });
  const [realtimeRoom, setRealtimeRoom] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState('');
  const [mySymbol, setMySymbol] = useState('X');
  const ws = useRef(null);

  // TRACK GAME STATUS & WINNER
  useEffect(() => {
    const win = calculateWinner(squares);
    setWinner(win);
    setWinnerLine(getWinnerLine(squares));
    setDraw(isDraw(squares));
    if (win) {
      setStatus(`Winner: ${win === mySymbol && gameMode === GAME_MODES.REALTIME ? 'You' : win}`);
    } else if (isDraw(squares)) {
      setStatus('Draw');
    } else {
      setStatus(
        gameMode === GAME_MODES.REALTIME && ((isXNext && mySymbol === 'O') || (!isXNext && mySymbol === 'X'))
          ? "Waiting for opponent's move..."
          : `Next: ${isXNext ? 'X' : 'O'}${gameMode === GAME_MODES.REALTIME ? (isXNext === (mySymbol === 'X') ? ' (Your turn)' : '') : ''}`
      );
    }
  }, [squares, isXNext, gameMode, mySymbol]);

  // AUTO AI MOVE LOGIC
  useEffect(() => {
    if (
      gameMode === GAME_MODES.VERSUS_AI &&
      !winner &&
      !draw &&
      !isXNext
    ) {
      const t = setTimeout(() => {
        let idx;
        if (aiDifficulty === 'easy') {
          idx = aiMove(squares, 'O');
        } else {
          idx = minimax(squares, 'O', 'O').idx;
        }
        if (idx !== undefined) onPlay(idx);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isXNext, squares, winner, draw, gameMode, aiDifficulty]);

  // PUBLIC_INTERFACE
  function onPlay(idx) {
    if (squares[idx] || winner || draw) return;
    if (gameMode === GAME_MODES.REALTIME) {
      if ((isXNext && mySymbol !== 'X') || (!isXNext && mySymbol !== 'O')) return;
    }
    const board = squares.slice();
    board[idx] = isXNext ? 'X' : 'O';
    setSquares(board);
    setIsXNext(!isXNext);
  }

  // Update score
  useEffect(() => {
    if (winner) {
      setScore((s) => ({ ...s, [winner]: s[winner] + 1 }));
    } else if (draw) {
      setScore((s) => ({ ...s, Draw: s.Draw + 1 }));
    }
  }, [winner, draw]);

  // PUBLIC_INTERFACE
  function resetGame() {
    setSquares(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinnerLine(null);
    setDraw(false);
  }
  // PUBLIC_INTERFACE
  function resetScore() {
    setScore({ X: 0, O: 0, Draw: 0 });
    resetGame();
  }
  function handleModeChange(mode) {
    if (mode === GAME_MODES.REALTIME) {
      const room = Math.random().toString(36).slice(2, 8).toUpperCase();
      setRealtimeRoom(room);
      setRealtimeStatus('Waiting for second player (simulated room mode)');
      setMySymbol('X');
    } else {
      setRealtimeRoom('');
      setRealtimeStatus('');
      setMySymbol('X');
    }
    setGameMode(mode);
    resetScore();
  }
  function handleAiDiffChange(diff) {
    setAiDifficulty(diff);
    resetScore();
  }
  return (
    <div className="App ttt-root" style={{ background: 'var(--bg-primary)' }}>
      <header className="ttt-header">
        <button className="theme-toggle" onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <div className="ttt-title" style={{ color: COLORS.primary, marginBottom: 6 }}>
          <span role="img" aria-label="tic-tac-toe" style={{ fontWeight: 700, fontSize: 34, marginRight: 10, color: COLORS.primary }}>
            井
          </span>
          Tic Tac Toe Online
        </div>
        <div className="ttt-status" style={{
          fontWeight: 500,
          color: winner ? COLORS.secondary : draw ? COLORS.accent : COLORS.accent,
          fontSize: 19,
          marginBottom: 12,
          letterSpacing: 0.1
        }}>{status}</div>
        {gameMode === GAME_MODES.REALTIME && (
          <div className="ttt-realtime-room" style={{ color: COLORS.primary, fontSize: 13, marginBottom: 5 }}>
            Room: <b>{realtimeRoom}</b> | You: <b>{mySymbol}</b>
            <br />
            <span style={{ color: COLORS.accent }}>{realtimeStatus}</span>
          </div>
        )}
      </header>
      <main>
        <div className="ttt-board-center">
          <Board squares={squares} onPlay={onPlay} winnerLine={winnerLine} />
        </div>
        <div className="ttt-controls" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 18
        }}>
          <div className="ttt-mode-selector" style={{ marginBottom: 2, display: 'flex', gap: 11 }}>
            <button
              className={`ttt-btn${gameMode === GAME_MODES.LOCAL_TWO_PLAYER ? ' active' : ''}`}
              style={{
                background: gameMode === GAME_MODES.LOCAL_TWO_PLAYER ? COLORS.primary : '',
                color: gameMode === GAME_MODES.LOCAL_TWO_PLAYER ? '#fff' : COLORS.primary
              }}
              onClick={() => handleModeChange(GAME_MODES.LOCAL_TWO_PLAYER)}
            >Local 2P</button>
            <button
              className={`ttt-btn${gameMode === GAME_MODES.VERSUS_AI ? ' active' : ''}`}
              style={{
                background: gameMode === GAME_MODES.VERSUS_AI ? COLORS.accent : '',
                color: gameMode === GAME_MODES.VERSUS_AI ? '#fff' : COLORS.accent
              }}
              onClick={() => handleModeChange(GAME_MODES.VERSUS_AI)}
            >Vs AI</button>
            <button
              className={`ttt-btn${gameMode === GAME_MODES.REALTIME ? ' active' : ''}`}
              style={{
                background: gameMode === GAME_MODES.REALTIME ? COLORS.secondary : '',
                color: gameMode === GAME_MODES.REALTIME ? '#fff' : COLORS.secondary
              }}
              onClick={() => handleModeChange(GAME_MODES.REALTIME)}
            >Real-Time</button>
          </div>
          {gameMode === GAME_MODES.VERSUS_AI && (
            <div className="ttt-ai-diff" style={{ marginTop: '-6px', marginBottom: '3px' }}>
              <span style={{ fontSize: 13, color: COLORS.primary, marginRight: 8 }}>AI Difficulty:</span>
              <button className={`ttt-btn-small${aiDifficulty === 'easy' ? ' selected' : ''}`}
                style={{ color: COLORS.primary }}
                onClick={() => handleAiDiffChange('easy')}>Easy</button>
              <button className={`ttt-btn-small${aiDifficulty === 'hard' ? ' selected' : ''}`}
                style={{ color: COLORS.accent }}
                onClick={() => handleAiDiffChange('hard')}>Hard</button>
            </div>
          )}
          <div className="ttt-score" style={{
            background: '#fff', display: 'flex', gap: 24, justifyContent: 'center', margin: '7px 0 0',
            padding: '8px 35px', borderRadius: 10, boxShadow: '0 1px 8px rgba(44,62,80,0.07)'
          }}>
            <div style={{
              color: COLORS.primary, fontWeight: 600, fontSize: 15
            }}>X: <span style={{ fontWeight: 700, fontSize: 16 }}>{score.X}</span></div>
            <div style={{
              color: COLORS.accent, fontWeight: 600, fontSize: 15
            }}>O: <span style={{ fontWeight: 700 }}>{score.O}</span></div>
            <div style={{
              color: COLORS.secondary, fontWeight: 600, fontSize: 15
            }}>Draw: <span style={{ fontWeight: 700 }}>{score.Draw}</span></div>
          </div>
          <div style={{ display: 'flex', gap: 13, marginTop: 10 }}>
            <button
              className="ttt-btn"
              style={{
                background: COLORS.accent, color: '#fff'
              }}
              onClick={resetGame}>Restart Game</button>
            <button
              className="ttt-btn"
              style={{
                background: '#999',
                color: '#fff'
              }}
              onClick={resetScore}>Reset Scores</button>
          </div>
        </div>
      </main>
      <footer className="ttt-footer" style={{
        marginTop: 38,
        fontSize: 13,
        padding: 10,
        opacity: 0.72,
        color: '#888'
      }}>&copy; {new Date().getFullYear()} Tic Tac Toe Online • Modern React UI
      </footer>
    </div>
  );
}

export default App;
