import { useEffect } from 'react';
import type { Dispatch } from 'react';
import type { GameAction, GameStatus } from '../types/game';

export function useCountdown(
  status: GameStatus,
  dispatch: Dispatch<GameAction>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled || status !== 'playing') return;

    const intervalId = window.setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [dispatch, enabled, status]);
}
