# The Escape Room

A small, responsive escape-room game set in an abandoned Arctic research
station. It uses Next.js App Router, React, TypeScript, and Tailwind CSS. Game
progress is stored in the browser with `localStorage`; there is no backend.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Game structure

- `data/items.ts` and `data/puzzles.ts` define the items and puzzle dependency
  chain.
- `data/circuit.ts` defines the configurable 8x8 wire panel, rotated edge
  connections, power tracing, randomized unsolved layouts, and solvability
  checks. Large levels include a verified rotation solution; smaller levels can
  be checked by brute force. Both inputs must reach the output and power the
  center lamp.
- Selecting a puzzle opens its interaction panel in a modal.
- The title screen appears before each session; starting or continuing begins
  the countdown and room ambience.
- Each run has 2 minutes 30 seconds. Using a hint costs 15 seconds.
- `data/runNumbers.ts` generates fresh radio, cabinet, and exit numbers for
  each new run; these values are saved so refreshes keep the same clues.
- A starting flashlight can be toggled from the inventory. While the generator
  is unpowered, its beam follows the pointer across the dark room.
- Arctic ambience loops while the game is active. If the browser blocks
  autoplay, select the music button in the header to start playback.
- The escape sound plays when the player successfully opens the exit. If the
  browser blocks it, select the music button in the header.
- Puzzle rewards open a confirmation dialog before entering the inventory.
  The player must confirm to add them.
- Hints give indirect nudges, with a 30-second cooldown between uses. Cooldown
  progress is saved and accounts for time spent away from the game.
- Existing saves are migrated to include the starting flashlight and remove the
  unused UV flashlight while preserving the player's progress.
- `state/gameReducer.ts` owns game rules and rejects actions that violate
  prerequisites.
- `components/GameProvider.tsx` provides reducer state to client components.
- `hooks/` contains the countdown and local save/restore behavior.
- `components/Room.tsx` is the interactive room; `KeypadLock.tsx` is a
  reusable, controlled numeric lock.

Pages and the root layout remain Server Components. Interactive UI and browser
storage are isolated to client components and hooks.

Because the game has no backend, saved state and puzzle data live on the
client. The reducer prevents normal UI actions from skipping prerequisites;
it is not intended as tamper-proof server-side enforcement.
