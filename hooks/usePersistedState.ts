import { useEffect, useState, type Dispatch } from 'react';
import { createRunNumbers } from '../data/runNumbers';
import { isValidGameState } from '../state/gameReducer';
import type { GameAction, GameState } from '../types/game';

const STORAGE_KEY = 'arctic-escape-room-save';

interface PersistedGame {
  version: 5;
  savedAt: number;
  state: GameState;
}

export interface PersistenceStatus {
  ready: boolean;
  message: string | null;
  hasSave: boolean;
}

function removeUnusedUvFlashlight(value: unknown): unknown {
  return Array.isArray(value)
    ? value.filter((itemId: unknown) => itemId !== 'uvFlashlight')
    : value;
}

function readPersistedGame(value: unknown): PersistedGame | null {
  if (typeof value !== 'object' || value === null) return null;

  const saved = value as {
    version?: unknown;
    savedAt?: unknown;
    state?: unknown;
  };
  if (
    (saved.version !== 2 &&
      saved.version !== 3 &&
      saved.version !== 4 &&
      saved.version !== 5) ||
    typeof saved.savedAt !== 'number' ||
    !Number.isFinite(saved.savedAt) ||
    saved.savedAt <= 0 ||
    typeof saved.state !== 'object' ||
    saved.state === null
  ) {
    return null;
  }

  let state: unknown = saved.state;
  if (saved.version !== 5) {
    const legacyState = saved.state as Partial<GameState>;
    if (saved.version === 2 && !Array.isArray(legacyState.inventory)) return null;
    const inventory = removeUnusedUvFlashlight(legacyState.inventory);
    state = {
      ...legacyState,
      inventory:
        saved.version === 2 &&
        Array.isArray(inventory) &&
        !inventory.includes('flashlight')
          ? [...inventory, 'flashlight']
          : inventory,
      availableItems: removeUnusedUvFlashlight(legacyState.availableItems),
      ...(saved.version < 4 ? { hintCooldown: 0 } : {}),
    };
  }

  if (!isValidGameState(state)) return null;
  return { version: 5, savedAt: saved.savedAt, state };
}

export function usePersistedState(
  state: GameState,
  dispatch: Dispatch<GameAction>,
): PersistenceStatus {
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      let raw: string | null;
      try {
        raw = window.localStorage.getItem(STORAGE_KEY);
      } catch (error) {
        console.error('Could not read saved game progress.', error);
        setMessage('Saved progress could not be read from this browser.');
        dispatch({ type: 'NEW_GAME', runNumbers: createRunNumbers() });
        setReady(true);
        return;
      }

      if (raw !== null) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch (error) {
          console.error('Saved game progress is not valid JSON.', error);
          setMessage('Saved progress was corrupted. A new game has started.');
          dispatch({ type: 'NEW_GAME', runNumbers: createRunNumbers() });
          setReady(true);
          return;
        }

        const savedGame = readPersistedGame(parsed);
        if (!savedGame) {
          setMessage('Saved progress was invalid. A new game has started.');
          dispatch({ type: 'NEW_GAME', runNumbers: createRunNumbers() });
          setReady(true);
          return;
        }

        const elapsedSeconds = Math.max(
          0,
          Math.floor((Date.now() - savedGame.savedAt) / 1000),
        );
        const timeLeft = Math.max(0, savedGame.state.timeLeft - elapsedSeconds);
        const restoredState: GameState = {
          ...savedGame.state,
          timeLeft,
          hintCooldown: Math.max(
            0,
            savedGame.state.hintCooldown - elapsedSeconds,
          ),
          status:
            savedGame.state.status === 'playing' && timeLeft === 0
              ? 'lost'
              : savedGame.state.status,
        };

        dispatch({ type: 'LOAD', state: restoredState });
        setHasSave(true);
      } else {
        dispatch({ type: 'NEW_GAME', runNumbers: createRunNumbers() });
      }

      setReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch]);

  useEffect(() => {
    if (!ready) return;

    const saved: PersistedGame = {
      version: 5,
      savedAt: Date.now(),
      state,
    };

    let messageTimeout: number | null = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (error) {
      console.error('Could not save game progress.', error);
      messageTimeout = window.setTimeout(
        () => setMessage('Progress could not be saved in this browser.'),
        0,
      );
    }

    return () => {
      if (messageTimeout !== null) window.clearTimeout(messageTimeout);
    };
  }, [ready, state]);

  return { ready, message, hasSave };
}
