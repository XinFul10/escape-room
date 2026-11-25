import { items } from '../data/items';
import { puzzles } from '../data/puzzles';
import { DEFAULT_RUN_NUMBERS, isValidRunNumbers } from '../data/runNumbers';
import type {
  GameAction,
  GameState,
  ItemId,
  PuzzleId,
  PuzzleRunNumbers,
  RoomObjectId,
} from '../types/game';

export const MAX_HINTS = 3;
export const HINT_COOLDOWN_SECONDS = 30;
export const INITIAL_TIME_SECONDS = 12 * 60;

const initialUnlockedObjects: RoomObjectId[] = ['radio'];
const initialInventory: ItemId[] = ['flashlight'];
const validRoomObjects = new Set<RoomObjectId>([
  ...initialUnlockedObjects,
  ...Object.values(puzzles).flatMap((puzzle) => [
    puzzle.objectId,
    ...puzzle.unlocks,
  ]),
]);

export function createInitialGameState(
  runNumbers: PuzzleRunNumbers = DEFAULT_RUN_NUMBERS,
): GameState {
  return {
    runNumbers: { ...runNumbers },
    inventory: [...initialInventory],
    availableItems: [],
    solvedPuzzles: [],
    unlockedObjects: [...initialUnlockedObjects],
    hintsUsed: 0,
    hintCooldown: 0,
    timeLeft: INITIAL_TIME_SECONDS,
    status: 'playing',
    feedback: 'Find a way out of the station.',
  };
}

export function getPuzzleSolution(state: GameState, puzzleId: PuzzleId): string {
  switch (puzzleId) {
    case 'radioReceiver':
      return String(
        state.runNumbers.radioBackupFrequency - state.runNumbers.weatherOffset,
      );
    case 'supplyCabinet':
      return String(state.runNumbers.cabinetCode);
    case 'exitKeypad':
      return String(state.runNumbers.exitCode);
    case 'generatorPanel': {
      const solution = puzzles.generatorPanel.solution;
      if (solution === null) {
        throw new Error('Generator puzzle requires a fixed route solution.');
      }
      return solution;
    }
  }
}

function withFeedback(state: GameState, feedback: string): GameState {
  return { ...state, feedback };
}

function hasItem(items: ItemId[], itemId: ItemId): boolean {
  return items.includes(itemId);
}

function missingRequirements(state: GameState, puzzleId: PuzzleId): ItemId[] {
  return puzzles[puzzleId].requires.filter(
    (itemId) => !hasItem(state.inventory, itemId),
  );
}

export function isCorrectSolution(input: string, solution: string): boolean {
  return input.trim().toUpperCase() === solution.toUpperCase();
}

function isUniqueArray<T>(values: T[]): boolean {
  return new Set(values).size === values.length;
}

function isOneOf<T extends string>(
  value: unknown,
  values: Record<T, unknown>,
): value is T {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(values, value);
}

export function isValidGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;

  const state = value as Partial<GameState>;
  if (
    !isValidRunNumbers(state.runNumbers) ||
    !Array.isArray(state.inventory) ||
    !Array.isArray(state.availableItems) ||
    !Array.isArray(state.solvedPuzzles) ||
    !Array.isArray(state.unlockedObjects) ||
    !Number.isInteger(state.hintsUsed) ||
    !Number.isInteger(state.hintCooldown) ||
    !Number.isInteger(state.timeLeft) ||
    typeof state.feedback !== 'string' ||
    (state.status !== 'playing' && state.status !== 'won' && state.status !== 'lost')
  ) {
    return false;
  }

  if (
    state.hintsUsed! < 0 ||
    state.hintsUsed! > MAX_HINTS ||
    state.hintCooldown! < 0 ||
    state.hintCooldown! > HINT_COOLDOWN_SECONDS ||
    state.timeLeft! < 0 ||
    state.timeLeft! > INITIAL_TIME_SECONDS ||
    (state.status === 'playing' && state.timeLeft === 0) ||
    (state.status === 'won' && state.timeLeft === 0) ||
    (state.status === 'lost' && state.timeLeft !== 0)
  ) {
    return false;
  }

  if (
    !state.inventory.every((id) => isOneOf(id, items)) ||
    !state.availableItems.every((id) => isOneOf(id, items)) ||
    !state.solvedPuzzles.every((id) => isOneOf(id, puzzles)) ||
    !state.unlockedObjects.every((id) => validRoomObjects.has(id)) ||
    !isUniqueArray(state.inventory) ||
    !isUniqueArray(state.availableItems) ||
    !isUniqueArray(state.solvedPuzzles) ||
    !isUniqueArray(state.unlockedObjects) ||
    initialInventory.some((id) => !state.inventory!.includes(id)) ||
    state.inventory.some((id) => state.availableItems!.includes(id))
  ) {
    return false;
  }

  const earnedItems = new Set<ItemId>(initialInventory);
  const expectedUnlocked = new Set<RoomObjectId>(initialUnlockedObjects);
  const unresolved = new Set(state.solvedPuzzles);
  let madeProgress = true;

  while (madeProgress) {
    madeProgress = false;
    for (const puzzleId of unresolved) {
      const puzzle = puzzles[puzzleId];
      const requirementsMet = puzzle.requires.every(
        (id) => earnedItems.has(id) && state.inventory!.includes(id),
      );
      if (!expectedUnlocked.has(puzzle.objectId) || !requirementsMet) continue;

      unresolved.delete(puzzleId);
      puzzle.grants.forEach((id) => earnedItems.add(id));
      puzzle.unlocks.forEach((id) => expectedUnlocked.add(id));
      madeProgress = true;
    }
  }

  const acquiredItems = [...state.inventory!, ...state.availableItems!];
  if (
    unresolved.size > 0 ||
    acquiredItems.some((id) => !earnedItems.has(id)) ||
    expectedUnlocked.size !== state.unlockedObjects.length ||
    state.unlockedObjects.some((id) => !expectedUnlocked.has(id)) ||
    (state.status === 'won' && !state.solvedPuzzles.includes('exitKeypad')) ||
    (state.status !== 'won' && state.solvedPuzzles.includes('exitKeypad'))
  ) {
    return false;
  }

  return true;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'RESTART' || action.type === 'NEW_GAME') {
    if (!isValidRunNumbers(action.runNumbers)) {
      return withFeedback(state, 'Could not start with invalid puzzle numbers.');
    }
    return {
      ...createInitialGameState(action.runNumbers),
      feedback: action.type === 'RESTART'
        ? 'Game restarted with new puzzle numbers.'
        : 'A new game has started.',
    };
  }

  if (action.type === 'LOAD') {
    if (!isValidGameState(action.state)) {
      return withFeedback(state, 'Saved progress is invalid. Current game was kept.');
    }
    return {
      ...action.state,
      inventory: [...action.state.inventory],
      availableItems: [...action.state.availableItems],
      solvedPuzzles: [...action.state.solvedPuzzles],
      unlockedObjects: [...action.state.unlockedObjects],
      feedback:
        action.state.status === 'lost'
          ? 'Time is up. The station is sealed.'
          : 'Progress restored.',
    };
  }

  if (state.status !== 'playing') {
    return withFeedback(state, 'The game has ended. Restart to play again.');
  }

  switch (action.type) {
    case 'COLLECT_ITEM': {
      if (!isOneOf(action.itemId, items)) {
        return withFeedback(state, 'That item does not exist.');
      }
      if (state.inventory.includes(action.itemId)) {
        return withFeedback(state, 'You already have that item.');
      }
      if (!state.availableItems.includes(action.itemId)) {
        return withFeedback(state, 'That item is not available to collect yet.');
      }
      return {
        ...state,
        availableItems: state.availableItems.filter((id) => id !== action.itemId),
        inventory: [...state.inventory, action.itemId],
        feedback: `Collected ${items[action.itemId].name}.`,
      };
    }

    case 'USE_ITEM': {
      const item = isOneOf(action.itemId, items) ? items[action.itemId] : undefined;
      const puzzle = Object.values(puzzles).find(
        (entry) => entry.objectId === action.objectId,
      );
      if (!item || !puzzle) {
        return withFeedback(state, 'That item or object does not exist.');
      }
      if (!state.inventory.includes(action.itemId)) {
        return withFeedback(state, `You do not have ${item.name}.`);
      }
      if (!state.unlockedObjects.includes(action.objectId)) {
        return withFeedback(state, 'That object is still locked.');
      }
      if (!puzzle.requires.includes(action.itemId)) {
        return withFeedback(state, 'That item does not fit this object.');
      }
      return withFeedback(
        state,
        `You use ${item.name} on the ${puzzle.name}.`,
      );
    }

    case 'SOLVE_PUZZLE': {
      const puzzle = isOneOf(action.puzzleId, puzzles)
        ? puzzles[action.puzzleId]
        : undefined;
      if (!puzzle) {
        return withFeedback(state, 'That puzzle does not exist.');
      }
      if (state.solvedPuzzles.includes(action.puzzleId)) {
        return withFeedback(state, 'That puzzle is already solved.');
      }
      if (!state.unlockedObjects.includes(puzzle.objectId)) {
        return withFeedback(state, 'That object is still locked.');
      }
      const missing = missingRequirements(state, action.puzzleId);
      if (missing.length > 0) {
        const names = missing.map((id) => items[id].name).join(', ');
        return withFeedback(state, `You need: ${names}.`);
      }
      if (
        typeof action.solution !== 'string' ||
        !isCorrectSolution(action.solution, getPuzzleSolution(state, action.puzzleId))
      ) {
        return withFeedback(state, 'That is not correct. Look for another clue.');
      }

      const availableItems = [
        ...state.availableItems,
        ...puzzle.grants.filter(
          (id) => !state.inventory.includes(id) && !state.availableItems.includes(id),
        ),
      ];
      return {
        ...state,
        solvedPuzzles: [...state.solvedPuzzles, action.puzzleId],
        availableItems,
        unlockedObjects: [...new Set([...state.unlockedObjects, ...puzzle.unlocks])],
        status: action.puzzleId === 'exitKeypad' ? 'won' : state.status,
        feedback:
          action.puzzleId === 'exitKeypad'
            ? 'The exit opens. You escaped!'
            : `${puzzle.name} solved.`,
      };
    }

    case 'USE_HINT': {
      const puzzle = isOneOf(action.puzzleId, puzzles)
        ? puzzles[action.puzzleId]
        : undefined;
      if (!puzzle) {
        return withFeedback(state, 'That puzzle does not exist.');
      }
      if (!state.unlockedObjects.includes(puzzle.objectId)) {
        return withFeedback(state, 'That object is still locked.');
      }
      if (state.solvedPuzzles.includes(action.puzzleId)) {
        return withFeedback(state, 'You have already solved that puzzle.');
      }
      if (missingRequirements(state, action.puzzleId).length > 0) {
        return withFeedback(state, 'Find the required items before asking for a hint.');
      }
      if (state.hintsUsed >= MAX_HINTS) {
        return withFeedback(state, 'No hints remain.');
      }
      if (state.hintCooldown > 0) {
        return withFeedback(
          state,
          `Wait ${state.hintCooldown} seconds before using another hint.`,
        );
      }
      return {
        ...state,
        hintsUsed: state.hintsUsed + 1,
        hintCooldown: HINT_COOLDOWN_SECONDS,
        feedback: puzzle.hint,
      };
    }

    case 'TICK': {
      if (state.timeLeft <= 1) {
        return {
          ...state,
          timeLeft: 0,
          status: 'lost',
          feedback: 'Time is up. The station is sealed.',
        };
      }
      return {
        ...state,
        timeLeft: state.timeLeft - 1,
        hintCooldown: Math.max(0, state.hintCooldown - 1),
      };
    }
  }
}
