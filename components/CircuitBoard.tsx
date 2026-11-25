'use client';

import {
  CIRCUIT_COLUMNS,
  CIRCUIT_ROWS,
  CIRCUIT_TILES,
  getCircuitPorts,
} from '../data/circuit';
import type { CircuitDirection } from '../data/circuit';

interface CircuitBoardProps {
  rotations: number[];
  powered: boolean;
  disabled: boolean;
  onRotate: (tileIndex: number) => void;
}

const directionLabels: Record<CircuitDirection, string> = {
  north: 'up',
  east: 'right',
  south: 'down',
  west: 'left',
};

const portCoordinates: Record<CircuitDirection, readonly [number, number]> = {
  north: [50, 5],
  east: [95, 50],
  south: [50, 95],
  west: [5, 50],
};

export function CircuitBoard({ rotations, powered, disabled, onRotate }: CircuitBoardProps) {
  return (
    <div className={`circuit-board-wrap${powered ? ' circuit-powered' : ''}`}>
      <div className="circuit-endpoints" aria-hidden="true">
        <span>POWER IN</span>
        <span>TO MONITOR</span>
      </div>
      <div
        className="circuit-board"
        role="group"
        aria-label="Generator switchboard. Rotate each tile clockwise to connect power from the lower left input to the lower right output."
        style={{ gridTemplateColumns: `repeat(${CIRCUIT_COLUMNS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: CIRCUIT_ROWS * CIRCUIT_COLUMNS }, (_, cellIndex) => {
          const row = Math.floor(cellIndex / CIRCUIT_COLUMNS);
          const column = cellIndex % CIRCUIT_COLUMNS;
          const tileIndex = CIRCUIT_TILES.findIndex(
            (tile) => tile.row === row && tile.column === column,
          );
          if (tileIndex < 0) {
            return <span key={cellIndex} className="circuit-empty" aria-hidden="true" />;
          }

          const tile = CIRCUIT_TILES[tileIndex];
          const ports = getCircuitPorts(tile, rotations[tileIndex] ?? 0);
          const portLabel = ports.map((port) => directionLabels[port]).join(' and ');
          const isInput = row === 2 && column === 0;
          const isOutput = row === 2 && column === CIRCUIT_COLUMNS - 1;

          return (
            <button
              key={cellIndex}
              type="button"
              className={`circuit-tile${powered ? ' circuit-tile-powered' : ''}${isInput ? ' circuit-input-tile' : ''}${isOutput ? ' circuit-output-tile' : ''}`}
              onClick={() => onRotate(tileIndex)}
              disabled={disabled}
              aria-label={`Rotate row ${row + 1}, column ${column + 1} tile clockwise. Connections face ${portLabel}.`}
            >
              <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                {ports.map((port) => {
                  const [x, y] = portCoordinates[port];
                  return (
                    <line
                      key={port}
                      x1="50"
                      y1="50"
                      x2={x}
                      y2={y}
                      className="circuit-wire"
                    />
                  );
                })}
                <circle cx="50" cy="50" r="8" className="circuit-joint" />
              </svg>
              <span className="circuit-tile-rotation" aria-hidden="true">↻</span>
            </button>
          );
        })}
      </div>
      <p className="circuit-status" aria-live="polite">
        {powered ? 'Power routed to the monitor.' : 'Rotate tiles until the path reaches the output.'}
      </p>
    </div>
  );
}
