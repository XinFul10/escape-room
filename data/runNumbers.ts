import type { PuzzleRunNumbers } from '../types/game';

export const DEFAULT_RUN_NUMBERS: PuzzleRunNumbers = {
  radioBackupFrequency: 90,
  weatherOffset: 2,
  cabinetCode: 100,
  exitCode: 1000,
};

function randomInteger(minimum: number, maximum: number): number {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function randomIntegerExcluding(
  minimum: number,
  maximum: number,
  previous: number,
): number {
  const candidate = randomInteger(minimum, maximum);
  return candidate === previous
    ? minimum + ((candidate - minimum + 1) % (maximum - minimum + 1))
    : candidate;
}

export function createRunNumbers(
  previous?: PuzzleRunNumbers,
): PuzzleRunNumbers {
  return {
    radioBackupFrequency: randomIntegerExcluding(
      90,
      99,
      previous?.radioBackupFrequency ?? DEFAULT_RUN_NUMBERS.radioBackupFrequency,
    ),
    weatherOffset: randomIntegerExcluding(
      2,
      6,
      previous?.weatherOffset ?? DEFAULT_RUN_NUMBERS.weatherOffset,
    ),
    cabinetCode: randomIntegerExcluding(
      100,
      999,
      previous?.cabinetCode ?? DEFAULT_RUN_NUMBERS.cabinetCode,
    ),
    exitCode: randomIntegerExcluding(
      1000,
      9999,
      previous?.exitCode ?? DEFAULT_RUN_NUMBERS.exitCode,
    ),
  };
}

export function isValidRunNumbers(value: unknown): value is PuzzleRunNumbers {
  if (typeof value !== 'object' || value === null) return false;

  const numbers = value as Partial<PuzzleRunNumbers>;
  return Number.isInteger(numbers.radioBackupFrequency) &&
    numbers.radioBackupFrequency! >= 90 &&
    numbers.radioBackupFrequency! <= 99 &&
    Number.isInteger(numbers.weatherOffset) &&
    numbers.weatherOffset! >= 2 &&
    numbers.weatherOffset! <= 6 &&
    numbers.radioBackupFrequency! - numbers.weatherOffset! >= 1 &&
    Number.isInteger(numbers.cabinetCode) &&
    numbers.cabinetCode! >= 100 &&
    numbers.cabinetCode! <= 999 &&
    Number.isInteger(numbers.exitCode) &&
    numbers.exitCode! >= 1000 &&
    numbers.exitCode! <= 9999;
}
