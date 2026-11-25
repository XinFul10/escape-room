export type ItemId = 'flashlight' | 'brassKey' | 'uvFlashlight' | 'fuse' | 'accessCard';

export type PuzzleId =
  | 'radioReceiver'
  | 'supplyCabinet'
  | 'generatorPanel'
  | 'exitKeypad';

export type RoomObjectId =
  | 'radio'
  | 'cabinet'
  | 'generator'
  | 'exitDoor';

export type PuzzleInteraction = 'dial' | 'keypad' | 'circuit';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  inspectText: string;
}

export interface PuzzleDefinition {
  id: PuzzleId;
  objectId: RoomObjectId;
  unlocks: RoomObjectId[];
  name: string;
  interaction: PuzzleInteraction;
  requires: ItemId[];
  grants: ItemId[];
  solution: string | null;
  clue: string;
  hint: string;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface PuzzleRunNumbers {
  radioBackupFrequency: number;
  weatherOffset: number;
  cabinetCode: number;
  exitCode: number;
}

export interface GameState {
  runNumbers: PuzzleRunNumbers;
  inventory: ItemId[];
  availableItems: ItemId[];
  solvedPuzzles: PuzzleId[];
  unlockedObjects: RoomObjectId[];
  hintsUsed: number;
  hintCooldown: number;
  timeLeft: number;
  status: GameStatus;
  feedback: string;
}

export type GameAction =
  | { type: 'COLLECT_ITEM'; itemId: ItemId }
  | { type: 'USE_ITEM'; itemId: ItemId; objectId: RoomObjectId }
  | { type: 'SOLVE_PUZZLE'; puzzleId: PuzzleId; solution: string }
  | { type: 'USE_HINT'; puzzleId: PuzzleId }
  | { type: 'TICK' }
  | { type: 'RESTART'; runNumbers: PuzzleRunNumbers }
  | { type: 'NEW_GAME'; runNumbers: PuzzleRunNumbers }
  | { type: 'LOAD'; state: GameState };
