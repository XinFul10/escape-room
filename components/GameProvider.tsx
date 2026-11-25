'use client';

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { useCountdown } from '../hooks/useCountdown';
import {
  usePersistedState,
  type PersistenceStatus,
} from '../hooks/usePersistedState';
import { createInitialGameState, gameReducer } from '../state/gameReducer';
import type { GameAction, GameState } from '../types/game';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  persistence: PersistenceStatus;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, createInitialGameState());
  const persistence = usePersistedState(state, dispatch);
  useCountdown(state.status, dispatch, persistence.ready);
  const { ready, message } = persistence;
  const value = useMemo(
    () => ({ state, dispatch, persistence: { ready, message } }),
    [state, dispatch, ready, message],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider.');
  }
  return context;
}
