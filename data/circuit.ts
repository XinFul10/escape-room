export type CircuitDirection = 'north' | 'east' | 'south' | 'west';
export type CircuitTileShape = 'corner' | 'straight';

export interface CircuitTile {
  row: number;
  column: number;
  shape: CircuitTileShape;
  basePorts: readonly [CircuitDirection, CircuitDirection];
}

export const CIRCUIT_ROWS = 3;
export const CIRCUIT_COLUMNS = 4;

export const CIRCUIT_TILES: readonly CircuitTile[] = [
  { row: 2, column: 0, shape: 'corner', basePorts: ['north', 'east'] },
  { row: 1, column: 0, shape: 'corner', basePorts: ['north', 'east'] },
  { row: 1, column: 1, shape: 'straight', basePorts: ['north', 'south'] },
  { row: 1, column: 2, shape: 'corner', basePorts: ['north', 'east'] },
  { row: 2, column: 2, shape: 'corner', basePorts: ['north', 'east'] },
  { row: 2, column: 3, shape: 'straight', basePorts: ['north', 'south'] },
];

export const INITIAL_CIRCUIT_ROTATIONS = CIRCUIT_TILES.map(() => 0);

const directions: readonly CircuitDirection[] = ['north', 'east', 'south', 'west'];
const offsets: Record<CircuitDirection, readonly [number, number]> = {
  north: [-1, 0],
  east: [0, 1],
  south: [1, 0],
  west: [0, -1],
};

export function getCircuitPorts(tile: CircuitTile, rotation: number): CircuitDirection[] {
  return tile.basePorts.map((port) => {
    const directionIndex = directions.indexOf(port);
    return directions[(directionIndex + rotation) % directions.length];
  });
}

export function isCircuitComplete(rotations: readonly number[]): boolean {
  const tilesByPosition = new Map(
    CIRCUIT_TILES.map((tile, index) => [`${tile.row},${tile.column}`, { tile, index }]),
  );
  const start = tilesByPosition.get('2,0');
  if (!start) return false;

  function canReachOutput(
    row: number,
    column: number,
    incoming: CircuitDirection,
    visited: Set<string>,
  ): boolean {
    const position = `${row},${column}`;
    const current = tilesByPosition.get(position);
    if (!current || visited.has(position)) return false;

    const ports = getCircuitPorts(current.tile, rotations[current.index] ?? 0);
    if (!ports.includes(incoming)) return false;
    if (row === 2 && column === CIRCUIT_COLUMNS - 1) return ports.includes('east');

    const nextVisited = new Set(visited);
    nextVisited.add(position);

    return ports.some((port) => {
      if (port === incoming) return false;
      const [rowOffset, columnOffset] = offsets[port];
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      const neighbor = tilesByPosition.get(`${nextRow},${nextColumn}`);
      if (!neighbor) return false;

      const opposite = directions[(directions.indexOf(port) + 2) % directions.length];
      const neighborPorts = getCircuitPorts(neighbor.tile, rotations[neighbor.index] ?? 0);
      return neighborPorts.includes(opposite) &&
        canReachOutput(nextRow, nextColumn, opposite, nextVisited);
    });
  }

  return canReachOutput(2, 0, 'west', new Set());
}
