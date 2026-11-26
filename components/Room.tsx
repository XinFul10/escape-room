'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type CSSProperties } from 'react';
import { items } from '../data/items';
import { puzzles } from '../data/puzzles';
import {
  CIRCUIT_LEVEL,
  createScrambledCircuitLevel,
  type CircuitLevel,
} from '../data/circuit';
import { createRunNumbers } from '../data/runNumbers';
import { digitCipher, encodeNumber, shapeGlyphs } from '../data/shapeCipher';
import { CircuitBoard } from './CircuitBoard';
import type { ItemId, RoomObjectId } from '../types/game';
import { FeedbackToast } from './FeedbackToast';
import { GameHeader } from './GameHeader';
import { InventoryBar } from './InventoryBar';
import { KeypadLock } from './KeypadLock';
import { useGame } from './GameProvider';
import { getPuzzleSolution, isCorrectSolution } from '../state/gameReducer';

const roomPuzzles = Object.values(puzzles);

export function Room() {
  const { state, dispatch, persistence, gameStarted, startGame } = useGame();
  const [selectedObjectId, setSelectedObjectId] =
    useState<RoomObjectId>('radio');
  const [showObjectCard, setShowObjectCard] = useState(false);
  const [showMaintenanceNote, setShowMaintenanceNote] = useState(false);
  const [showShapeCipher, setShowShapeCipher] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<ItemId | null>(null);
  const [answer, setAnswer] = useState('');
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [flashlightPosition, setFlashlightPosition] = useState({ x: 50, y: 50 });
  const [circuitLevel, setCircuitLevel] = useState<CircuitLevel>(() =>
    createScrambledCircuitLevel(CIRCUIT_LEVEL, () => 0.25),
  );
  const puzzleDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = puzzleDialog.current;
    if (!showObjectCard) {
      if (dialog?.open) dialog.close();
      return;
    }
    if (!dialog || dialog.open) return;

    dialog.showModal();
    const focusFrame = window.requestAnimationFrame(() => {
      dialog
        .querySelector<HTMLButtonElement>('[data-circuit-tile]:not(:disabled)')
        ?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      if (dialog.open) dialog.close();
    };
  }, [showObjectCard, selectedObjectId]);

  const selectedPuzzle = roomPuzzles.find(
    (puzzle) => puzzle.objectId === selectedObjectId,
  );
  if (!selectedPuzzle) {
    return <main className="game-shell">Room configuration is incomplete.</main>;
  }
  if (!persistence.ready) {
    return (
      <main className="game-shell">
        <p role="status">Preparing a randomized room...</p>
      </main>
    );
  }
  if (!gameStarted) {
    const savedRun = persistence.hasSave && state.status === 'playing';
    return (
      <main className="game-shell title-screen-shell">
        <section className="title-screen" aria-labelledby="title-screen-heading">
          <div className="title-screen-copy">
            <div className="title-screen-mark">
              <Image
                src="/logo.jpg"
                alt="Arctic research station beneath the northern lights"
                width={58}
                height={58}
              />
            </div>
            <p className="title-screen-eyebrow">ARCTIC RESEARCH STATION · AIRLOCK INCIDENT</p>
            <p className="title-screen-story">
              The station has gone dark. Restore the power, uncover the exit code,
              and escape before the airlock seals. You have 2:30 before the station locks down. Good luck.
            </p>
            {persistence.message && (
              <p className="title-screen-message" role="status">{persistence.message}</p>
            )}
          </div>
          <button
            type="button"
            className="start-game-button"
            onClick={() => {
              if (state.status !== 'playing') restartGame();
              else setCircuitLevel(createScrambledCircuitLevel(CIRCUIT_LEVEL));
              startGame();
            }}
          >
            {savedRun
              ? 'Continue Game'
              : persistence.hasSave
                ? 'Start New Game'
                : 'Start Game'}
          </button>
          {savedRun && (
            <p className="title-screen-saved">Your progress is saved in this browser.</p>
          )}
        </section>
      </main>
    );
  }

  const isUnlocked = state.unlockedObjects.includes(selectedObjectId);
  const isSolved = state.solvedPuzzles.includes(selectedPuzzle.id);
  const missingItems = selectedPuzzle.requires.filter(
    (itemId) => !state.inventory.includes(itemId),
  );
  const puzzleSolution = getPuzzleSolution(state, selectedPuzzle.id);
  const cabinetCipher = encodeNumber(String(state.runNumbers.cabinetCode));
  const exitCodeCipher = encodeNumber(String(state.runNumbers.exitCode));
  const generatorSolved = state.solvedPuzzles.includes('generatorPanel');

  function restartGame() {
    setCircuitLevel(createScrambledCircuitLevel(CIRCUIT_LEVEL));
    setFlashlightOn(false);
    dispatch({
      type: 'RESTART',
      runNumbers: createRunNumbers(state.runNumbers),
    });
  }

  function updateFlashlightPosition(event: ReactPointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setFlashlightPosition({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  }

  function selectObject(objectId: RoomObjectId) {
    setSelectedObjectId(objectId);
    setShowObjectCard(true);
    setAnswer('');
  }

  function submitSolution(solution: string): boolean {
    if (!selectedPuzzle) return false;
    dispatch({
      type: 'SOLVE_PUZZLE',
      puzzleId: selectedPuzzle.id,
      solution,
    });
    return isCorrectSolution(solution, puzzleSolution);
  }

  function submitNonKeypadPuzzle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPuzzle) return;
    submitSolution(answer);
  }

  const objectCardContent = (
    <>
      <div className="object-card-heading">
        <div>
          <span>Selected object</span>
          <h2 id="selected-object-title">{selectedPuzzle.name}</h2>
        </div>
        <button
          type="button"
          onClick={() => puzzleDialog.current?.close()}
          aria-label="Close selected object"
        >
          ×
        </button>
      </div>

      {!isUnlocked ? (
        <p className="object-card-message">Locked. Solve the previous step first.</p>
      ) : (
        <>
          <p className="object-card-clue">{selectedPuzzle.clue}</p>
          {missingItems.length > 0 && !isSolved && (
            <p className="required-items">
              Requires: {missingItems.map((id) => items[id].name).join(', ')}
            </p>
          )}

          {selectedItemId && selectedItemId !== 'flashlight' && (
            <button
              type="button"
              disabled={state.status !== 'playing'}
              onClick={() =>
                dispatch({
                  type: 'USE_ITEM',
                  itemId: selectedItemId,
                  objectId: selectedObjectId,
                })
              }
              className="scene-action use-item-action"
            >
              Use {items[selectedItemId].name}
            </button>
          )}

          {isSolved ? (
            <p className="object-card-message solved-message">Puzzle solved</p>
          ) : selectedPuzzle.interaction === 'keypad' ? (
            <KeypadLock
              length={puzzleSolution.length}
              value={answer}
              onChange={setAnswer}
              onSubmit={submitSolution}
              disabled={state.status !== 'playing' || missingItems.length > 0}
            />
          ) : selectedPuzzle.interaction === 'circuit' ? (
            <CircuitBoard
              level={circuitLevel}
              disabled={state.status !== 'playing' || missingItems.length > 0 || isSolved}
              solved={isSolved}
              onChange={setCircuitLevel}
              onSolved={() => submitSolution(puzzleSolution)}
              onCancel={() => puzzleDialog.current?.close()}
            />
          ) : (
            <form onSubmit={submitNonKeypadPuzzle} className="scene-form">
              <label>
                Tune frequency
                <input
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={`${selectedPuzzle.name} solution`}
                  disabled={state.status !== 'playing'}
                  placeholder="**"
                />
              </label>
              <button
                type="submit"
                disabled={state.status !== 'playing'}
                className="scene-action"
              >
                Check
              </button>
            </form>
          )}
        </>
      )}
    </>
  );

  return (
    <main className="game-shell">
      <GameHeader puzzleId={selectedPuzzle.id} onRestart={restartGame} />

      <section
        className="room-stage"
        aria-label="Interactive escape room"
        onPointerMove={updateFlashlightPosition}
        onPointerDown={updateFlashlightPosition}
      >
        <div className="room-ceiling" />
        <div className="room-back-wall">
          <div className="room-window">
            <span className="room-window-bar room-window-bar-x" />
            <span className="room-window-bar room-window-bar-y" />
          </div>

          <div
            className={`wall-tv${generatorSolved ? ' wall-tv-powered' : ''}`}
            role="img"
            aria-label={
              generatorSolved
                ? 'Wall-mounted television showing the exit code as a shape cipher'
                : 'Wall-mounted television with no signal'
            }
          >
            <div className="wall-tv-screen">
              {generatorSolved ? (
                <>
                  <small>EXIT CODE</small>
                  <span className="tv-cipher">
                    {exitCodeCipher.map((pair, index) => (
                      <span key={index}>
                        {pair.map((shape) => shapeGlyphs[shape]).join('')}
                      </span>
                    ))}
                  </span>
                </>
              ) : (
                <span></span>
              )}
            </div>
          </div>

          <button
            type="button"
            aria-label="Emergency radio"
            aria-pressed={selectedObjectId === 'radio'}
            onClick={() => selectObject('radio')}
            className="scene-hotspot radio-hotspot"
          >
            <span className="radio-body">
              <span className="radio-dial" />
            </span>
            {state.solvedPuzzles.includes('radioReceiver') && (
              <span className="solved-dot" aria-label="Solved" />
            )}
          </button>

          <div className="wall-shelf">
            <span className="shelf-book book-red" />
            <span className="shelf-book book-gold" />
            <span className="shelf-book book-blue" />
            <span className="shelf-box" />
            <button
              type="button"
              className="cipher-hotspot"
              aria-label="Inspect faded shape cipher behind the books"
              aria-expanded={showShapeCipher}
              title="Inspect hidden clue"
              onClick={() => {
                setShowMaintenanceNote(false);
                setShowShapeCipher((visible) => !visible);
              }}
            >
              △ ◇ □
            </button>
          </div>

          <button
            type="button"
            aria-label="Supply cabinet"
            aria-pressed={selectedObjectId === 'cabinet'}
            onClick={() => selectObject('cabinet')}
            className="scene-hotspot cabinet-hotspot"
          >
            <span className="cabinet-body">
              <span className="cabinet-door" />
              <span className="cabinet-label" aria-label="Three pairs of symbols on cabinet label">
                {cabinetCipher.map((pair, index) => (
                  <span key={index}>
                    {pair.map((shape) => shapeGlyphs[shape]).join('')}
                  </span>
                ))}
              </span>
              <span className="cabinet-lock">●</span>
            </span>
            {state.solvedPuzzles.includes('supplyCabinet') && (
              <span className="solved-dot" aria-label="Solved" />
            )}
          </button>

          <button
            type="button"
            aria-label={
              generatorSolved
                ? 'Powered generator panel. Interact to inspect.'
                : 'Unpowered wall-mounted generator panel. Interact to inspect.'
            }
            aria-pressed={selectedObjectId === 'generator'}
            onClick={() => selectObject('generator')}
            className={`scene-hotspot generator-hotspot${generatorSolved ? ' generator-hotspot-powered' : ''}`}
          >
            <span className={`generator-screen${generatorSolved ? ' generator-powered' : ''}`} aria-hidden="true">
              <Image
                src="/circuitbox.png"
                alt=""
                fill
                sizes="(max-width: 700px) 74px, 92px"
                className="generator-panel-art"
              />
              <span className="generator-power-lights">
                {[0, 1, 2].map((light) => <i key={light} />)}
              </span>
              <span className="generator-spark" />
            </span>
          </button>

          <div className="exit-door">
            <span className="exit-sign" aria-hidden="true">EXIT <b>↗</b></span>
            <button
              type="button"
              aria-label="Exit keypad"
              aria-pressed={selectedObjectId === 'exitDoor'}
              onClick={() => selectObject('exitDoor')}
              className="scene-hotspot exit-keypad-hotspot"
            >
              <span className="exit-keypad" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6].map((digit) => (
                  <i key={digit} />
                ))}
              </span>
              {state.solvedPuzzles.includes('exitKeypad') && (
                <span className="solved-dot" aria-label="Solved" />
              )}
            </button>
          </div>
        </div>

        <div className="room-floor">
          <span className="floor-board floor-board-one" />
          <span className="floor-board floor-board-two" />
        </div>

        <div className="desk">
          <span className="desk-top" />
          <span className="desk-books" />
          <button
            type="button"
            className="desk-sheet"
            aria-label="Inspect folded slip partly hidden beneath the desk plant"
            aria-expanded={showMaintenanceNote}
            title="Inspect hidden clue"
            onClick={() => {
              setShowShapeCipher(false);
              setShowMaintenanceNote((visible) => !visible);
            }}
          >
            <span className="note-scribble note-scribble-one" />
            <span className="note-scribble note-scribble-two" />
            <span className="note-scribble note-scribble-three" />
          </button>
        </div>

        {showMaintenanceNote && (
          <aside className="maintenance-note" aria-live="polite">
            <button
              type="button"
              onClick={() => setShowMaintenanceNote(false)}
              aria-label="Close maintenance note"
            >
              ×
            </button>
            <span>FIELD NOTES · RADIO DESK</span>
            <strong>Storm procedure</strong>
            <p>Backup relay: <b>{state.runNumbers.radioBackupFrequency} MHz</b></p>
            <small>
              Weather band is {state.runNumbers.weatherOffset} MHz below the backup relay.
            </small>
          </aside>
        )}

        {showShapeCipher && (
          <aside className="shape-cipher-card" aria-live="polite">
            <button
              type="button"
              onClick={() => setShowShapeCipher(false)}
              aria-label="Close shape cipher"
            >
              ×
            </button>
            <span>CALIBRATION CIPHER · FOUND BEHIND THE BOOKS</span>
            <strong>Calibration key: digits 0–9</strong>
            <div className="cipher-grid">
              {Object.entries(digitCipher).map(([digit, pair]) => (
                <div key={digit} className="cipher-entry">
                  <b>{digit}</b>
                  <span>{pair.map((shape) => shapeGlyphs[shape]).join('')}</span>
                </div>
              ))}
            </div>
            <small>Each digit uses two shapes. Decode the cabinet pairs from left to right.</small>
          </aside>
        )}

        {state.status !== 'playing' && (
          <div className="game-result" role="status">
            <h2>{state.status === 'won' ? 'You escaped!' : 'Time is up'}</h2>
            <p>
              {state.status === 'won'
                ? 'The station airlock is open.'
                : 'The station has sealed.'}
            </p>
            <button type="button" onClick={restartGame}>
              Restart
            </button>
          </div>
        )}
        {!state.solvedPuzzles.includes('generatorPanel') && (
          <div
            className={`room-darkness${flashlightOn ? ' flashlight-on' : ''}`}
            aria-hidden="true"
            style={{
              '--flashlight-x': `${flashlightPosition.x}%`,
              '--flashlight-y': `${flashlightPosition.y}%`,
            } as CSSProperties}
          />
        )}
      </section>

      {showObjectCard && (
        <dialog
          ref={puzzleDialog}
          className="object-card puzzle-dialog"
          aria-labelledby="selected-object-title"
          onClose={() => setShowObjectCard(false)}
        >
          {objectCardContent}
        </dialog>
      )}

      <FeedbackToast />
      <InventoryBar
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        flashlightOn={flashlightOn}
        onToggleFlashlight={() => setFlashlightOn((isOn) => !isOn)}
      />
    </main>
  );
}
