'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  analyzeCircuit,
  getCircuitPorts,
  rotateCircuitTile,
  type CircuitDirection,
  type CircuitLevel,
} from '../data/circuit';

interface CircuitBoardProps {
  level: CircuitLevel;
  disabled?: boolean;
  solved?: boolean;
  onChange: (level: CircuitLevel) => void;
  onSolved: () => void;
  onCancel: () => void;
}

const directionEdges: Record<
  CircuitDirection,
  { x: number; y: number }
> = {
  north: { x: 50, y: 7 },
  east: { x: 93, y: 50 },
  south: { x: 50, y: 93 },
  west: { x: 7, y: 50 },
};

const directionNames: Record<CircuitDirection, string> = {
  north: 'north',
  east: 'east',
  south: 'south',
  west: 'west',
};

function isSelectable(tile: CircuitLevel['tiles'][number][number]): boolean {
  return !tile.locked && tile.type !== 'empty';
}

function firstSelectableIndex(level: CircuitLevel): number {
  for (let row = 0; row < level.tiles.length; row += 1) {
    for (let column = 0; column < level.tiles[row].length; column += 1) {
      if (isSelectable(level.tiles[row][column])) {
        return row * level.tiles[row].length + column;
      }
    }
  }
  return -1;
}

export function CircuitBoard({
  level,
  disabled = false,
  solved: alreadySolved = false,
  onChange,
  onSolved,
  onCancel,
}: CircuitBoardProps) {
  const analysis = analyzeCircuit(level);
  const solved = alreadySolved || analysis.solved;
  const rowCount = level.tiles.length;
  const columnCount = level.tiles[0]?.length ?? 0;
  const tileCount = rowCount * columnCount;
  const [selectedIndex, setSelectedIndex] = useState(() =>
    firstSelectableIndex(level),
  );
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);
  const [unlocking, setUnlocking] = useState(solved && !alreadySolved);
  const tileRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lockTimer = useRef<number | null>(null);
  const solveTimer = useRef<number | null>(null);
  const hasReportedSolution = useRef(alreadySolved);
  const latestHandlers = useRef({ onCancel, onSolved, onChange });
  const previousGamepadButtons = useRef<boolean[]>([]);
  const lastStickMove = useRef(0);

  useEffect(() => {
    latestHandlers.current = { onCancel, onSolved, onChange };
  }, [onCancel, onChange, onSolved]);

  useEffect(() => {
    return () => {
      if (lockTimer.current !== null) window.clearTimeout(lockTimer.current);
      if (solveTimer.current !== null) window.clearTimeout(solveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (selectedIndex < 0) return;
    tileRefs.current[selectedIndex]?.focus({ preventScroll: true });
  }, [selectedIndex]);

  useEffect(() => {
    if (!solved || alreadySolved || hasReportedSolution.current) return;
    setUnlocking(true);
    solveTimer.current = window.setTimeout(() => {
      hasReportedSolution.current = true;
      setUnlocking(false);
      solveTimer.current = null;
      latestHandlers.current.onSolved();
    }, 520);
    return () => {
      if (solveTimer.current !== null) {
        window.clearTimeout(solveTimer.current);
        solveTimer.current = null;
      }
    };
  }, [alreadySolved, solved]);

  const moveSelection = useCallback(
    (rowDelta: number, columnDelta: number) => {
      if (disabled || solved || animatingIndex !== null || tileCount === 0) return;
      const current = selectedIndex < 0 ? 0 : selectedIndex;
      const currentRow = Math.floor(current / columnCount);
      const currentColumn = current % columnCount;
      const rowCount = level.tiles.length;

      for (let step = 1; step <= tileCount; step += 1) {
        const row =
          (currentRow + rowDelta * step + rowCount * tileCount) % rowCount;
        const column =
          (currentColumn + columnDelta * step + columnCount * tileCount) %
          columnCount;
        if (isSelectable(level.tiles[row][column])) {
          setSelectedIndex(row * columnCount + column);
          return;
        }
      }
    },
    [
      animatingIndex,
      columnCount,
      disabled,
      level.tiles,
      selectedIndex,
      solved,
      tileCount,
    ],
  );

  const rotateSelection = useCallback(
    (index = selectedIndex) => {
      if (
        disabled ||
        solved ||
        animatingIndex !== null ||
        index < 0 ||
        index >= tileCount
      ) {
        return;
      }
      const row = Math.floor(index / columnCount);
      const column = index % columnCount;
      const tile = level.tiles[row]?.[column];
      if (!tile || !isSelectable(tile)) return;

      setSelectedIndex(index);
      setAnimatingIndex(index);
      latestHandlers.current.onChange(rotateCircuitTile(level, row, column));
      lockTimer.current = window.setTimeout(() => {
        setAnimatingIndex(null);
        lockTimer.current = null;
      }, 150);
    },
    [
      animatingIndex,
      columnCount,
      disabled,
      level,
      selectedIndex,
      solved,
      tileCount,
    ],
  );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();
    const movement: Record<string, [number, number]> = {
      arrowup: [-1, 0],
      w: [-1, 0],
      arrowright: [0, 1],
      d: [0, 1],
      arrowdown: [1, 0],
      s: [1, 0],
      arrowleft: [0, -1],
      a: [0, -1],
    };

    if (key === 'escape' || key === 'b') {
      event.preventDefault();
      event.stopPropagation();
      if (!solved) latestHandlers.current.onCancel();
      return;
    }
    if (movement[key]) {
      event.preventDefault();
      moveSelection(...movement[key]);
      return;
    }
    if (key === ' ' || key === 'enter' || key === 'x') {
      event.preventDefault();
      rotateSelection();
    }
  };

  useEffect(() => {
    let frameId = 0;
    let mounted = true;
    const pollGamepad = (timestamp: number) => {
      if (!mounted) return;
      const gamepad = Array.from(navigator.getGamepads()).find(
        (candidate) => candidate?.connected,
      );
      if (gamepad) {
        const pressed = (index: number) =>
          gamepad.buttons[index]?.pressed ?? false;
        const previous = previousGamepadButtons.current;
        const pressEdge = (index: number) => pressed(index) && !previous[index];
        const directions: Array<[number, number, number]> = [
          [12, -1, 0],
          [13, 1, 0],
          [14, 0, -1],
          [15, 0, 1],
        ];
        let moved = false;
        for (const [button, rowDelta, columnDelta] of directions) {
          if (pressEdge(button)) {
            moveSelection(rowDelta, columnDelta);
            moved = true;
            break;
          }
        }

        if (!moved && timestamp - lastStickMove.current >= 180) {
          const x = gamepad.axes[0] ?? 0;
          const y = gamepad.axes[1] ?? 0;
          if (Math.abs(x) > 0.6 || Math.abs(y) > 0.6) {
            if (Math.abs(x) > Math.abs(y)) {
              moveSelection(0, x > 0 ? 1 : -1);
            } else {
              moveSelection(y > 0 ? 1 : -1, 0);
            }
            lastStickMove.current = timestamp;
          }
        }

        if (pressEdge(0) || pressEdge(2) || pressEdge(9)) rotateSelection();
        if (pressEdge(1) || pressEdge(8)) {
          if (!solved) latestHandlers.current.onCancel();
        }
        previousGamepadButtons.current = gamepad.buttons.map(
          (button) => button.pressed,
        );
      } else {
        previousGamepadButtons.current = [];
      }
      frameId = window.requestAnimationFrame(pollGamepad);
    };

    frameId = window.requestAnimationFrame(pollGamepad);
    return () => {
      mounted = false;
      window.cancelAnimationFrame(frameId);
    };
  }, [moveSelection, rotateSelection, solved]);

  const selectable = (index: number) => {
    const row = Math.floor(index / columnCount);
    const column = index % columnCount;
    return isSelectable(level.tiles[row][column]);
  };

  return (
    <section
      className={`circuit-board-wrap${unlocking ? ' circuit-unlocking' : ''}`}
      aria-label="Generator wire-routing puzzle"
      onKeyDown={handleKeyDown}
    >
      <div className="circuit-panel">
        <div className="circuit-panel-rail circuit-panel-rail-left" aria-hidden="true" />
        <div className="circuit-panel-content">
          <div className="circuit-labels" aria-hidden="true">
            <span>DUAL INPUT</span>
            <span>POWER ROUTING</span>
            <span>OUTPUT</span>
          </div>
          <div
            className="circuit-board-layout"
          >
            <div
              className="circuit-inputs"
              role="group"
              aria-label="Power input terminals"
              style={{
                gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
              }}
            >
              {level.inputs.map((input, index) => (
                <div
                  key={`${input.row}-${index}`}
                  className={`circuit-input-terminal circuit-input-${input.color}`}
                  style={{ gridRow: input.row + 1 }}
                  role="img"
                  aria-label={`${input.color} input ${analysis.inputPowered[index] ? 'powered' : 'unpowered'}`}
                >
                  <span
                    className={`circuit-terminal-light${analysis.inputPowered[index] ? ' is-lit' : ''}`}
                  />
                </div>
              ))}
            </div>
            <div
              className="circuit-grid"
              role="group"
              aria-label={`${rowCount} by ${columnCount} wire tiles`}
              style={{
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
              }}
            >
              {level.tiles.flatMap((row, rowIndex) =>
                row.map((tile, columnIndex) => {
                  const index = rowIndex * columnCount + columnIndex;
                  const currentPorts = getCircuitPorts(tile);
                  const rotation = ((tile.rotation % 4) + 4) % 4;
                  const edges = Object.keys(directionEdges) as CircuitDirection[];
                  const powered = analysis.poweredTiles[rowIndex][columnIndex];
                  const centerTile =
                    rowIndex === Math.floor(level.tiles.length / 2) &&
                    columnIndex === Math.floor(columnCount / 2);
                  const locked = tile.locked || tile.type === 'empty';
                  const connections = edges
                    .filter((direction) => currentPorts[direction])
                    .map((direction) => directionNames[direction]);

                  return (
                    <button
                      key={`${rowIndex}-${columnIndex}`}
                      ref={(element) => {
                        tileRefs.current[index] = element;
                      }}
                      type="button"
                      className={[
                        'circuit-tile',
                        `circuit-tile-${tile.type}`,
                        powered ? 'is-powered' : 'is-unpowered',
                        selectedIndex === index ? 'is-selected' : '',
                        locked ? 'is-locked' : '',
                        animatingIndex === index ? 'is-rotating' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}, ${tile.type}${tile.locked ? ', locked' : ''}${powered ? ', powered' : ', unpowered'}. Connections: ${connections.join(', ') || 'none'}.`}
                      aria-pressed={selectedIndex === index}
                      disabled={disabled || solved || locked}
                      data-circuit-tile=""
                      tabIndex={
                        !disabled && !solved && !locked && selectedIndex === index
                          ? 0
                          : -1
                      }
                      onFocus={() => setSelectedIndex(index)}
                      onClick={() => rotateSelection(index)}
                    >
                      <svg
                        className="circuit-wire-piece"
                        viewBox="0 0 100 100"
                        aria-hidden="true"
                        style={{
                          transform: `rotate(${rotation * 90}deg)`,
                        }}
                      >
                        <circle className="circuit-wire-hub" cx="50" cy="50" r="9" />
                        {edges.map((direction) => {
                          if (!tile.ports[direction]) return null;
                          const edge = directionEdges[direction];
                          return (
                            <line
                              key={direction}
                              className="circuit-wire-segment"
                              x1="50"
                              y1="50"
                              x2={edge.x}
                              y2={edge.y}
                            />
                          );
                        })}
                      </svg>
                      {centerTile && (
                        <span
                          className={`circuit-center-lamp${analysis.centerLampPowered ? ' is-lit' : ''}`}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                }),
              )}
            </div>
            <div
              className="circuit-output-terminal"
              style={{
                top: `${(level.output.row / rowCount) * 100}%`,
                height: `${100 / rowCount}%`,
              }}
            >
              <span className="circuit-output-cable" aria-hidden="true" />
              <div
                className="circuit-output-lights"
                role="img"
                aria-label={`Output ${analysis.outputReached ? 'powered' : 'unpowered'}`}
              >
                {[0, 1, 2].map((light) => (
                  <span
                    key={light}
                    className={`circuit-terminal-light${analysis.outputReached ? ' is-lit' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="circuit-status" role="status" aria-live="polite">
            {solved
              ? 'Power routed. Generator unlocked.'
              : analysis.outputReached
                ? 'Output powered. Verify the configured input and lamp requirements.'
                : 'Route power from the left-side inputs through the panel to the output.'}
          </div>
        </div>
        <div className="circuit-panel-rail circuit-panel-rail-right" aria-hidden="true" />
      </div>
      <div className="circuit-controls" aria-label="Puzzle controls">
        <span><kbd>Arrows / WASD</kbd> Select tile</span>
        <button
          type="button"
          className="circuit-rotate-button"
          disabled={disabled || solved || selectedIndex < 0}
          onClick={() => rotateSelection()}
        >
          <kbd>Click / Space / Enter / X</kbd> Rotate selected
        </button>
        <button
          type="button"
          disabled={solved}
          onClick={() => latestHandlers.current.onCancel()}
        >
          <kbd>Esc / B</kbd> Cancel
        </button>
      </div>
      <span className="sr-only">
        {selectedIndex >= 0 && selectable(selectedIndex)
          ? `Selected tile ${Math.floor(selectedIndex / columnCount) + 1}, ${selectedIndex % columnCount + 1}.`
          : 'No selectable tile.'}
      </span>
    </section>
  );
}
