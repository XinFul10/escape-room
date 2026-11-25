'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_HINTS } from '../state/gameReducer';
import type { PuzzleId } from '../types/game';
import { useGame } from './GameProvider';

type AmbientAudioState = 'idle' | 'playing' | 'blocked' | 'error';
type EscapeAudioState = 'idle' | 'playing' | 'blocked' | 'error';

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
  const ambientAudio = useRef<HTMLAudioElement>(null);
  const escapeAudio = useRef<HTMLAudioElement>(null);
  const [ambientAudioState, setAmbientAudioState] =
    useState<AmbientAudioState>('idle');
  const [escapeAudioState, setEscapeAudioState] =
    useState<EscapeAudioState>('idle');

  const playAmbientAudio = useCallback(() => {
    const audio = ambientAudio.current;
    if (!audio) return;

    audio.volume = 0.04;
    void audio.play().then(
      () => setAmbientAudioState('playing'),
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setAmbientAudioState('blocked');
          return;
        }
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Could not play the ambient room audio.', error);
        setAmbientAudioState('error');
      },
    );
  }, []);

  const playEscapeAudio = useCallback(() => {
    const audio = escapeAudio.current;
    if (!audio) return;

    audio.currentTime = 0;
    void audio.play().then(
      () => setEscapeAudioState('playing'),
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setEscapeAudioState('blocked');
          return;
        }
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Could not play the escape sound.', error);
        setEscapeAudioState('error');
      },
    );
  }, []);

  useEffect(() => {
    const audio = ambientAudio.current;
    if (!audio) return;

    if (!persistence.ready || state.status !== 'playing') {
      audio.pause();
      return;
    }

    playAmbientAudio();
    return () => audio.pause();
  }, [persistence.ready, playAmbientAudio, state.status]);

  useEffect(() => {
    const audio = escapeAudio.current;
    if (state.status !== 'won') {
      audio?.pause();
      return;
    }

    playEscapeAudio();
    return () => audio?.pause();
  }, [playEscapeAudio, state.status]);

  return (
    <header className="game-header" aria-label="Game status">
      <h1><strong>Arctic Escape Room</strong></h1>
      <audio
        ref={ambientAudio}
        src="/audio/Arctic_ambient_noise.mp3"
        hidden
        loop
        preload="auto"
        onError={() => {
          console.error('Could not load the ambient room audio.');
          setAmbientAudioState('error');
        }}
      />
      <audio
        ref={escapeAudio}
        src="/audio/escape.mp3"
        hidden
        preload="auto"
        onError={() => {
          console.error('Could not load the escape sound.');
          setEscapeAudioState('error');
        }}
      />
      <div className="game-header-actions">
        {state.status === 'playing' && ambientAudioState === 'blocked' && (
          <button
            type="button"
            className="ambient-audio-button"
            onClick={playAmbientAudio}
            aria-label="Play ambient room audio"
            title="Play ambient room audio"
          >
            ♫
          </button>
        )}
        {state.status === 'playing' && ambientAudioState === 'error' && (
          <span className="ambient-audio-error" role="status">
            Audio unavailable
          </span>
        )}
        {state.status === 'won' && escapeAudioState === 'blocked' && (
          <button
            type="button"
            className="ambient-audio-button"
            onClick={playEscapeAudio}
            aria-label="Play escape sound"
            title="Play escape sound"
          >
            ♫
          </button>
        )}
        {state.status === 'won' && escapeAudioState === 'error' && (
          <span className="ambient-audio-error" role="status">
            Escape sound unavailable
          </span>
        )}
        <button
          type="button"
          className="hint-button"
          onClick={() => dispatch({ type: 'USE_HINT', puzzleId })}
          disabled={
            state.status !== 'playing' ||
            state.hintsUsed >= MAX_HINTS ||
            state.hintCooldown > 0
          }
          aria-label={
            state.hintCooldown > 0
              ? `Hints remaining: ${MAX_HINTS - state.hintsUsed}. Available in ${state.hintCooldown} seconds.`
              : `Hints remaining: ${MAX_HINTS - state.hintsUsed}`
          }
          title={
            state.hintCooldown > 0
              ? `Next hint available in ${state.hintCooldown} seconds`
              : 'Use a hint'
          }
        >
          <span>Hints</span>
          <b>{MAX_HINTS - state.hintsUsed}</b>
          {state.hintCooldown > 0 && (
            <span className="hint-cooldown">{state.hintCooldown}s</span>
          )}
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
