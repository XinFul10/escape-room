'use client';

import { MAX_HINTS } from '../state/gameReducer';
import type { PuzzleId } from '../types/game';
import { useGame } from './GameProvider';

interface GameHeaderProps {
  puzzleId: PuzzleId;
  onRestart: () => void;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function GameHeader({ puzzleId, onRestart }: GameHeaderProps) {
  const { state, dispatch, persistence } = useGame();

  return (
    <header className="game-header" aria-label="Game status">
      <h1><span>⌁</span> Assessment 01 — <strong>The Escape Room</strong></h1>
      <div className="game-header-actions">
        <button
          type="button"
          className="hint-button"
          onClick={() => dispatch({ type: 'USE_HINT', puzzleId })}
          disabled={state.status !== 'playing' || state.hintsUsed >= MAX_HINTS}
        >
          Hints <b>{MAX_HINTS - state.hintsUsed}</b>
        </button>
        <div
          className={`timer-box ${state.timeLeft <= 60 ? 'timer-low' : ''}`}
          aria-label={`Time remaining: ${formatTime(state.timeLeft)}`}
        >
          <span>⏳</span>
          <time>{formatTime(state.timeLeft)}</time>
        </div>
        <button
          type="button"
          className="restart-button"
          onClick={onRestart}
          aria-label="Restart game"
        >
          ↻
        </button>
      </div>
      {persistence.message && (
        <p className="persistence-message" role="status">{persistence.message}</p>
      )}
    </header>
  );
}
