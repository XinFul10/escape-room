export type CircuitDirection = 'north' | 'east' | 'south' | 'west';
export type CircuitTileType =
  | 'straight'
  | 'corner'
  | 't-junction'
  | 'cross'
  | 'dead-end'
  | 'empty';

export interface CircuitPorts {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
}

export interface CircuitTile {
  type: CircuitTileType;
  ports: CircuitPorts;
  rotation: number;
  locked: boolean;
}

export interface CircuitLevel {
  tiles: CircuitTile[][];
  inputs: { row: number; color: 'red' | 'blue' }[];
  output: { row: number; column: number };
  requireBothInputs: boolean;
  requireCenterLamp: boolean;
  solutionRotations?: number[][];
}

export interface CircuitAnalysis {
  inputPowered: boolean[];
  inputReachesOutput: boolean[];
  poweredTiles: boolean[][];
  outputReached: boolean;
  centerLampPowered: boolean;
  solved: boolean;
}

const directionOffsets: Record<
  CircuitDirection,
  readonly [row: number, column: number]
> = {
  north: [-1, 0],
  east: [0, 1],
  south: [1, 0],
  west: [0, -1],
};

const oppositeDirection: Record<CircuitDirection, CircuitDirection> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
};

function emptyPorts(): CircuitPorts {
  return { north: false, east: false, south: false, west: false };
}

function ports(
  north: boolean,
  east: boolean,
  south: boolean,
  west: boolean,
): CircuitPorts {
  return { north, east, south, west };
}

function tile(
  type: CircuitTileType,
  connectors: CircuitPorts,
  rotation = 0,
  locked = false,
): CircuitTile {
  return { type, ports: connectors, rotation, locked };
}

const CIRCUIT_SIZE = 8;

function createSolvedTiles(): CircuitTile[][] {
  return Array.from({ length: CIRCUIT_SIZE }, (_, row) =>
    Array.from({ length: CIRCUIT_SIZE }, (_, column) => {
      if (column === CIRCUIT_SIZE - 1 && row < CIRCUIT_SIZE - 1) {
        if (row % 2 === 0) {
          return tile('empty', emptyPorts(), 0, true);
        }
        if (row === 3) {
          return tile('cross', ports(true, true, true, true));
        }
        return tile('dead-end', ports(true, false, false, false));
      }

      if (row === CIRCUIT_SIZE - 1 && column === CIRCUIT_SIZE - 2) {
        return tile('t-junction', ports(true, true, false, true));
      }
      if (row === 4 && column === 4) {
        return tile('straight', ports(false, true, false, true));
      }
      if (row === 0 && column === CIRCUIT_SIZE - 2) {
        return tile('corner', ports(false, false, true, true));
      }
      if (row > 0 && row < CIRCUIT_SIZE - 1 && column === 0) {
        return row % 2 === 0
          ? tile('corner', ports(true, true, false, false), 0, row === 2)
          : tile('corner', ports(false, true, true, false));
      }
      if (row > 0 && row < CIRCUIT_SIZE - 1 && column === CIRCUIT_SIZE - 2) {
        return row % 2 === 0
          ? tile('corner', ports(false, false, true, true))
          : tile('corner', ports(true, false, false, true));
      }
      return tile('straight', ports(false, true, false, true));
    }),
  );
}

export const CIRCUIT_LEVEL: CircuitLevel = {
  tiles: createSolvedTiles(),
  inputs: [
    { row: 0, color: 'red' },
    { row: 7, color: 'blue' },
  ],
  output: { row: 7, column: 7 },
  requireBothInputs: true,
  requireCenterLamp: true,
  solutionRotations: Array.from({ length: CIRCUIT_SIZE }, () =>
    Array.from({ length: CIRCUIT_SIZE }, () => 0),
  ),
};

function rotatePortsOnce(portsToRotate: CircuitPorts): CircuitPorts {
  return {
    north: portsToRotate.west,
    east: portsToRotate.north,
    south: portsToRotate.east,
    west: portsToRotate.south,
  };
}

export function getCircuitPorts(
  tileToRead: CircuitTile,
  rotation = tileToRead.rotation,
): CircuitPorts {
  let currentPorts = tileToRead.ports;
  for (let turn = 0; turn < ((rotation % 4) + 4) % 4; turn += 1) {
    currentPorts = rotatePortsOnce(currentPorts);
  }
  return currentPorts;
}

function traceInput(
  level: CircuitLevel,
  inputRow: number,
  rotations: number[][],
): { powered: boolean; reached: Set<number> } {
  const rows = level.tiles.length;
  const columns = level.tiles[0]?.length ?? 0;
  const startTile = level.tiles[inputRow]?.[0];
  if (!startTile || !getCircuitPorts(startTile, rotations[inputRow]?.[0]).west) {
    return { powered: false, reached: new Set() };
  }

  const startIndex = inputRow * columns;
  const reached = new Set([startIndex]);
  const queue: Array<{ row: number; column: number }> = [
    { row: inputRow, column: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentTile = level.tiles[current.row]?.[current.column];
    if (!currentTile) continue;
    const currentPorts = getCircuitPorts(
      currentTile,
      rotations[current.row]?.[current.column],
    );

    for (const [direction, [rowOffset, columnOffset]] of Object.entries(
      directionOffsets,
    ) as Array<[CircuitDirection, readonly [number, number]]>) {
      if (!currentPorts[direction]) continue;

      const nextRow = current.row + rowOffset;
      const nextColumn = current.column + columnOffset;
      if (
        nextRow < 0 ||
        nextRow >= rows ||
        nextColumn < 0 ||
        nextColumn >= columns
      ) {
        continue;
      }

      const nextTile = level.tiles[nextRow]?.[nextColumn];
      if (!nextTile) continue;
      const nextPorts = getCircuitPorts(
        nextTile,
        rotations[nextRow]?.[nextColumn],
      );
      if (!nextPorts[oppositeDirection[direction]]) continue;

      const nextIndex = nextRow * columns + nextColumn;
      if (reached.has(nextIndex)) continue;
      reached.add(nextIndex);
      queue.push({ row: nextRow, column: nextColumn });
    }
  }

  return { powered: true, reached };
}

export function analyzeCircuit(
  level: CircuitLevel,
  rotations = level.tiles.map((row) => row.map((tileToRead) => tileToRead.rotation)),
): CircuitAnalysis {
  const rows = level.tiles.length;
  const columns = level.tiles[0]?.length ?? 0;
  const inputPaths = level.inputs.map((input) =>
    traceInput(level, input.row, rotations),
  );
  const outputIndex = level.output.row * columns + level.output.column;
  const outputTile = level.tiles[level.output.row]?.[level.output.column];
  const outputHasEastPort =
    !!outputTile &&
    getCircuitPorts(outputTile, rotations[level.output.row]?.[level.output.column]).east;
  const inputReachesOutput = inputPaths.map(
    (path) => path.reached.has(outputIndex) && outputHasEastPort,
  );
  const outputReached = inputReachesOutput.some(Boolean);
  const centerIndex = Math.floor(rows / 2) * columns + Math.floor(columns / 2);
  const poweredTiles = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) =>
      inputPaths.some((path) => path.reached.has(row * columns + column)),
    ),
  );
  const centerLampPowered = inputPaths.some((path) =>
    path.reached.has(centerIndex),
  );
  const outputRequirementMet = level.requireBothInputs
    ? inputReachesOutput.length > 0 && inputReachesOutput.every(Boolean)
    : outputReached;

  return {
    inputPowered: inputPaths.map((path) => path.powered),
    inputReachesOutput,
    poweredTiles,
    outputReached,
    centerLampPowered,
    solved:
      outputRequirementMet &&
      (!level.requireCenterLamp || centerLampPowered),
  };
}

export function isCircuitSolved(
  level: CircuitLevel,
  rotations?: number[][],
): boolean {
  return analyzeCircuit(level, rotations).solved;
}

export function rotateCircuitTile(
  level: CircuitLevel,
  row: number,
  column: number,
): CircuitLevel {
  const tileToRotate = level.tiles[row]?.[column];
  if (!tileToRotate || tileToRotate.locked || tileToRotate.type === 'empty') {
    return level;
  }

  return {
    ...level,
    tiles: level.tiles.map((tileRow, rowIndex) =>
      tileRow.map((currentTile, columnIndex) =>
        rowIndex === row && columnIndex === column
          ? { ...currentTile, rotation: (currentTile.rotation + 1) % 4 }
          : currentTile,
      ),
    ),
  };
}

export function isCircuitLevelSolvable(level: CircuitLevel): boolean {
  const rotations = level.tiles.map((row) =>
    row.map((tileToRead) => tileToRead.rotation),
  );
  const rotatable: Array<{ row: number; column: number }> = [];
  level.tiles.forEach((row, rowIndex) => {
    row.forEach((tileToRead, columnIndex) => {
      if (!tileToRead.locked && tileToRead.type !== 'empty') {
        rotatable.push({ row: rowIndex, column: columnIndex });
      }
    });
  });

  if (level.solutionRotations) {
    if (
      level.solutionRotations.length !== level.tiles.length ||
      level.solutionRotations.some(
        (row, rowIndex) => row.length !== level.tiles[rowIndex].length,
      )
    ) {
      return false;
    }

    for (let row = 0; row < level.tiles.length; row += 1) {
      for (let column = 0; column < level.tiles[row].length; column += 1) {
        const solutionRotation = level.solutionRotations[row][column];
        const tileToCheck = level.tiles[row][column];
        if (
          !Number.isInteger(solutionRotation) ||
          solutionRotation < 0 ||
          solutionRotation > 3
        ) {
          return false;
        }
        if (
          tileToCheck.locked &&
          solutionRotation !== tileToCheck.rotation
        ) {
          return false;
        }
      }
    }
    return isCircuitSolved(level, level.solutionRotations);
  }

  if (rotatable.length > 9) {
    throw new RangeError(
      'Large circuit levels need solutionRotations to verify solvability.',
    );
  }

  function search(index: number): boolean {
    if (index >= rotatable.length) return isCircuitSolved(level, rotations);

    const position = rotatable[index];
    for (let rotation = 0; rotation < 4; rotation += 1) {
      rotations[position.row][position.column] = rotation;
      if (search(index + 1)) return true;
    }
    rotations[position.row][position.column] =
      level.tiles[position.row][position.column].rotation;
    return false;
  }

  return search(0);
}

function copyCircuitLevel(level: CircuitLevel): CircuitLevel {
  return {
    ...level,
    tiles: level.tiles.map((row) =>
      row.map((tileToCopy) => ({
        ...tileToCopy,
        ports: { ...tileToCopy.ports },
      })),
    ),
    inputs: level.inputs.map((input) => ({ ...input })),
    output: { ...level.output },
    solutionRotations: level.solutionRotations?.map((row) => [...row]),
  };
}

export function createScrambledCircuitLevel(
  level: CircuitLevel = CIRCUIT_LEVEL,
  random: () => number = Math.random,
): CircuitLevel {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const candidate = copyCircuitLevel(level);
    candidate.tiles = candidate.tiles.map((row) =>
      row.map((tileToScramble) => {
        if (tileToScramble.locked || tileToScramble.type === 'empty') {
          return tileToScramble;
        }
        const turns = Math.floor(random() * 4);
        return {
          ...tileToScramble,
          rotation: (tileToScramble.rotation + turns) % 4,
        };
      }),
    );
    if (!isCircuitSolved(candidate)) return candidate;
  }

  const fallback = copyCircuitLevel(level);
  const firstInput = fallback.inputs[0];
  const firstInputTile = fallback.tiles[firstInput.row]?.[0];
  if (firstInputTile && !firstInputTile.locked) {
    firstInputTile.rotation = (firstInputTile.rotation + 1) % 4;
  }
  if (isCircuitSolved(fallback)) {
    throw new Error('Could not generate an unsolved starting circuit layout.');
  }
  return fallback;
}
