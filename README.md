# 🕹 MAZE BALL — W A S D Challenge

> **Steer a glowing ball through 10 neon mazes using `W A S D`. Reach the goal
> without ever touching a wall — one touch and the attempt fails.**

A polished, single-page arcade game built with **100% vanilla HTML, CSS and
JavaScript (Canvas)**. No engines. No libraries. No build step. Open
`index.html` and play.

![Platform](https://img.shields.io/badge/platform-web-brightgreen)
![Tech](https://img.shields.io/badge/tech-vanilla%20JS%20%2B%20Canvas-blue)
![Deps](https://img.shields.io/badge/dependencies-none-orange)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Table of Contents

1. [What is Maze Ball?](#what-is-maze-ball)
2. [Problem & Solution](#problem--solution)
3. [Features](#features)
4. [How to Play](#how-to-play)
5. [Game Screens & UX Flow](#game-screens--ux-flow)
6. [The 10 Levels](#the-10-levels)
7. [Tech Stack](#tech-stack)
8. [Project Structure](#project-structure)
9. [Architecture Deep-Dive](#architecture-deep-dive)
10. [Movement & Collision](#movement--collision)
11. [Autoplay / Demo Mode](#autoplay--demo-mode)
12. [Contextual Hint Engine](#contextual-hint-engine)
13. [Progress & Settings](#progress--settings)
14. [Validation & Testing](#validation--testing)
15. [Known Limitations](#known-limitations)
16. [Presentation Guide](#presentation-guide)
17. [License](#license)

---

## What is Maze Ball?

Maze Ball is a **precision puzzle-arcade game** that runs entirely in the
browser. The player controls a small glowing ball with the `W A S D` keys and
must navigate it from the **start pad** to the glowing **goal** in each of 10
increasingly difficult mazes.

The core twist: **the walls are deadly.** If the ball touches any wall, the
attempt fails instantly and the ball resets to the start. The game is designed
to feel like a real, finished product — smooth physics, neon visuals, synth
sound effects, adaptive hints and even an autoplay "demo mode" that solves the
maze for you.

### Quick facts

| | |
|---|---|
| Genre | Precision puzzle / arcade |
| Controls | Keyboard (`W A S D` + arrow keys), touch D-pad |
| Levels | 10 hand-crafted + generated mazes |
| Session size | ~2–10 minutes to complete |
| Persistence | `localStorage` (progress, best times, settings) |
| Internet needed | No — works offline from `file://` |

---

## Problem & Solution

**Problem**
Most "browser game" projects are either tiny toy demos or code that depends on
heavy frameworks and build tooling. They don't demonstrate real game
engineering: physics, collision, pathfinding, state machines, or adaptive UI.

**Solution**
Maze Ball is a **complete, self-contained game** that shows serious engineering
behind a playful exterior:

- **Real-time physics** — sub-stepped movement (no wall tunnelling), circle-vs-AABB
  collision, delta-time loops.
- **Pathfinding** — a BFS solver computes the shortest safe route for every maze,
  powering the demo mode, the hint engine and the solution overlay.
- **Performance** — wall runs are merged into AABBs (~30–116 rects instead of
  300 cells), so collision checks are cheap and the game holds 60 fps.
- **Quality-of-life** — contextual hints, wrong-key feedback, an animated
  tutorial, autoplay demo, per-level best times.
- **Zero dependencies** — runs from a double-clicked HTML file.

---

## Features

**Core gameplay**
- Smooth, hold-to-move ball physics (`W/A/S/D` or arrow keys).
- Wall-touch = failed attempt with red flash, screen shake and crash sound.
- Goal detection with generous radius → confetti, chime, level complete.
- 10 distinct levels with a carefully tuned difficulty curve.

**Help systems (helpful, not punishing)**
- 💡 **Contextual hints** react to what you're doing (blocked direction,
  hugging a wall, idle, repeated failures, solved route).
- 🤖 **Demo Mode** autoplays the shortest safe route — watch it, then copy it.
- 🛣 **Solution overlay** draws the path from your position to the goal.
- 🎓 **Animated tutorial** on your very first start.

**Polish**
- Neon "labyrinth" theme: Orbitron display font, glow, motion trail, particles.
- Fully synthesized sound (Web Audio API) — zero audio asset files.
- Pause / main menu (`Esc`, `M` or ☰), level select grid, settings.
- Progress & settings persist in `localStorage`.

---

## How to Play

| Action | Key |
| --- | --- |
| Move up | `W` or `↑` |
| Move left | `A` or `←` |
| Move down | `S` or `↓` |
| Move right | `D` or `→` |
| Pause / main menu | `Esc`, `M`, or the ☰ button |
| Restart level | `R` |
| Pause menu | `Space` (while playing) |

**Objective:** roll the ball to the glowing 🎯 goal on each floor.

**The one rule:** the walls are deadly. If the ball touches any wall, the
attempt fails and the ball resets to the start pad. **Attempts** count your
wall collisions; the **timer** runs only while you're moving in a level.

**Fairness assist:** the ball automatically brakes as it approaches a wall it's
heading into, so near-misses are recoverable and the touch-rule feels fair
instead of random.

> 💡 Touch devices get an on-screen D-pad, but the game is keyboard-first.

---

## Game Screens & UX Flow

```
OPEN PAGE → START SCREEN → INTERACTIVE TUTORIAL (first time)
   → LEVEL 1 → PLAY (W/A/S/D)
        ├─ HIT WALL? → LEVEL FAILED → RETRY
        ├─ REACH GOAL? → LEVEL COMPLETE (time + attempts) → NEXT LEVEL
        └─ … → LEVEL 10 → 🎉 GAME COMPLETE → PLAY AGAIN
```

| Screen | What it shows |
| --- | --- |
| **Start screen** | Title, objective, `W A S D` control diagram, START GAME button |
| **Tutorial** | Auto-playing demo of the ball moving to the goal, with labelled arrows |
| **Game (HUD)** | Level `4 / 10`, progress bar, timer, attempt counter, hint panel |
| **Pause / ☰ menu** | Resume · Restart Level · Select Level · Demo · Settings · How to Play |
| **Level select** | Grid of levels 1–10; later levels unlock as you complete earlier ones |
| **Settings** | Sound on/off, hints on/off, demo speed (slow/normal/fast), Reset Progress |
| **How to play** | Controls diagram + rules |
| **Level complete** | Confetti, stats (time + attempts), NEXT LEVEL |
| **Level failed** | "LEVEL FAILED", RETRY, and a contextual tip |
| **Game complete** | 🎉 Fireworks, total time + attempts, PLAY AGAIN |

---

## The 10 Levels

Difficulty is controlled by corridor width (2-cell → 1-cell), number of turns,
route length, number of dead-ends, and how close the goal sits to walls.

| # | Name | Difficulty | Idea |
| -- | --- | --- | --- |
| 1 | First Steps | Very Easy | one block, go around it |
| 2 | Corner Turn | Easy | three wall bands with gaps |
| 3 | Detour | Easy | more bands + pillars |
| 4 | The Corridor | Medium | first one-cell-high corridors |
| 5 | Switchbacks | Medium | vertical walls force an S-route |
| 6 | The Long Way | Medium | long single corridor |
| 7 | Precision | Hard | one-cell corridors + dead ends |
| 8 | The Labyrinth | Hard | generated maze, 12 dead ends |
| 9 | Razor's Edge | Very Hard | longest forced route |
| 10 | The Gauntlet | Extreme | one corridor through every cell |

Levels 8–10 are generated by `tools/generate-levels.js`; all 10 are validated by
`tools/validate-levels.js` (structural checks **plus** a full physics
simulation that actually steers the ball to the goal).

---

## Tech Stack

- **HTML** — single page shell + all overlays (no templating).
- **CSS** — neon theme, animations, responsive layout.
- **JavaScript** — all game logic on the HTML5 **Canvas**.
- **Web Audio API** — synthesised sound effects (no audio files).
- **localStorage** — persistent progress and settings.
- **Node.js** (dev-only) — level generation & validation scripts.

No build step, no package manager, no frameworks, no CDN. Open and play.

```sh
# Option 1 — just open the file in your browser
open index.html          # (double-click works too)

# Option 2 — serve it locally (recommended for the most consistent behaviour)
npx serve .              # or: python -m http.server 8000
```

The game uses classic `<script>` tags (not ES modules), so `file://` works
without CORS issues.

---

## Project Structure

```text
dude- Game/
├── index.html            # shell + all overlays
├── css/
│   └── style.css         # neon theme
├── js/
│   ├── config.js         # every tunable: speed, radius, colours, states
│   ├── utils.js          # math, formatting, wall merging, DOM sugar
│   ├── levels.js         # 10 ASCII mazes + parser + BFS solver/distance field
│   ├── collision.js      # circle-vs-AABB
│   ├── player.js         # ball physics, trail, wall-proximity brake
│   ├── audio.js          # Web Audio synth (no asset files)
│   ├── storage.js        # localStorage progress/settings
│   ├── hints.js          # contextual hint engine (rate-limited ranking)
│   ├── demo.js           # autoplay along the solved route
│   ├── game.js           # state machine + rAF loop + win/lose + rendering
│   ├── ui.js             # HUD, overlays, level grid, toast + canvas FX
│   ├── input.js          # keyboard + touch D-pad
│   └── main.js           # bootstrap, wiring, debug API + self-test
├── tools/
│   ├── generate-levels.js    # generates the L8–L10 mazes (dev tool)
│   └── validate-levels.js    # headless validator + physics simulation
├── docs/                 # PRD, ARCHITECTURE, GAME_DESIGN, PLAN
└── README.md             # this file
```

**Script load order** (dependency-safe): `config → utils → levels → collision →
player → audio → storage → hints → demo → game → ui → input → main`.

---

## Architecture Deep-Dive

### Coordinate & data model

- Virtual world: **800 × 600 px** (20 cols × 15 rows @ 40px cells).
- Ball radius **11 px** — a 1-cell (40px) corridor leaves 9px of clearance.
- Goal radius **18 px** — ball centre within that distance of the goal = win.
- Ball speed **200 px/s** (hold-to-move, not tap-to-step).
- Levels are ASCII grids: `#` wall, ` ` floor, `S` start, `G` goal.
- `utils.mergeHorizontalRuns()` collapses every run of `#` into one AABB, so
  each level has ~30–116 collision rects instead of 300 cells.

### Module responsibilities

| Module | Responsibility |
| --- | --- |
| `Config` | Tuning constants: speed, radius, colours, demo speeds, hint thresholds |
| `Utils` | `clamp`, `dist`, `lerp`, `formatTime`, `mergeHorizontalRuns`, `uuid` |
| `Levels` | `parseLevel`, `getLevel`, `solvePath` (BFS), `count` |
| `Collision` | `circleRect(cx, cy, r, rect)`, `closestPointOnRect` |
| `Player` | ball pos/velocity, `resetTo(level)`, `update(dt)`, trail history |
| `AudioFX` | `init`, `play(name)`, `setEnabled`, small synth engine |
| `Storage` | `get/set` progress, settings, stats |
| `Hints` | `tick(state)` → picks a contextual hint string + type |
| `DemoController` | `start/pause/stop`, follow `level.path`, always fail-safe |
| `Game` | state machine, main rAF loop, collision/win/fail, timer, attempts |
| `UI` | render HUD/hint/panel, show/hide screens, particles, progress |
| `Input` | key mapping, `preventDefault`, D-pad, focus handling |
| `main` | boot, event listeners, global hotkeys |

### State machine

```
                 ┌──────────┐
        ┌───────►│  IDLE    │◄──────────┐
        │        └────┬─────┘           │
        │             │ start           │ menu
        │             ▼                 │
        │        ┌──────────┐           │
   retry│        │ PLAYING  │◄── resume │
        │        └──┬───┬───┘           │
        │    wall   │   │ goal          │
        │   ┌───────┘   └──────┐        │
        │   ▼                  ▼        │
        │ FAILED            SUCCESS     │
        │   │                  │        │
        │   └── retry ─────────┘ next   │
        │                    ┌──────────┴──┐
        │                    │  COMPLETE   │  (after L10)
        │                    └─────────────┘
        │   DEMO  (start/pause/stop from any game screen)
        └───────────────────────────────────┘
```

`PAUSED` and `MENU` are overlays that suspend the update step but keep
rendering.

### Rendering

- One `<canvas>` re-rendered each frame via `requestAnimationFrame`.
- `devicePixelRatio` scaling for crispness; CSS keeps aspect ratio.
- Visual layers: grid floor → goal pad → walls → solution path → trail →
  ball → particles.
- DOM is used only for HUD/menus, updated only when values change (no per-frame
  DOM writes).

---

## Movement & Collision

1. `Input` reads the held keys → a direction vector (diagonals normalised).
2. `Player.update(dt)` moves the ball at `Config.SPEED` (200 px/s) in
   **sub-steps of at most 4px** (no tunnelling) and checks collision each step.
3. A wall touch → **FAILED**: red flash, screen shake, crash sound, ball reset,
   attempt counter +1. This both prevents passing through and enforces the rule.
4. Goal overlap (ball centre within 18px of the goal centre) → **SUCCESS**:
   confetti, chime, level complete.

The update loop uses `requestAnimationFrame` with a clamped `dt`
(`MAX_DT = 1/30`), so tab-switches can't teleport the ball.

---

## Autoplay / Demo Mode

`Levels` computes a **BFS distance field** from the goal, so it can reconstruct
a shortest route from any cell. The demo walks that route through **cell
centres** — always a full half-cell away from walls, so it can never crash.
Pause freezes it; Stop warps the ball back to the start and hands you the
controls. Demo speed is configurable (slow / normal / fast).

This same BFS path also powers the **solution overlay** and part of the **hint
engine**.

---

## Contextual Hint Engine

The hint engine ranks **observations**, not guesses:

1. pressed into a wall → *"there's a wall above you, try A"*
2. hugging a wall while moving → *"ease off"*
3. no input for a while → *"press W A S D"*
4. several failed attempts → *"watch the demo"*
5. otherwise → *"the path continues down/up/left/right from here"*

Changes are rate-limited so the panel never flickers, and the fail screen picks
a contextual tip too.

---

## Progress & Settings

Everything persists in `localStorage` under `mazeBall.save.v1`:

- unlocked levels (beat level N to unlock N+1)
- best time and fewest attempts per level
- lifetime total time / attempts
- sound on/off, hints on/off, demo speed (slow / normal / fast)

`⚙ Settings → Reset Progress` wipes everything (with a confirm).

---

## Validation & Testing

The repo ships a **headless validator** that checks every maze structurally
(15×20, solid border, one S/G, reachable, no sealed pockets, path clearance)
and then **simulates a player steering the ball along the real solution path
with the real `Player`/`Collision` code** until it reaches the goal:

```sh
node tools/validate-levels.js
```

Expected output: `Levels: 10 | failures: 0` and `All levels validated OK`.

`tools/generate-levels.js` regenerates the L8–L10 mazes (great for adding
Level 11+):

```sh
node tools/generate-levels.js          # sweep seeds, best candidates
node tools/generate-levels.js --seed 42
node tools/generate-levels.js --spiral
```

### In-browser self-test

Open the game, then in the devtools console:

```js
MazeBall.selfTest()
```

Runs the same checks (level validity, path clearance, collision math,
sub-stepping, demo traversal of every route) and prints a pass/fail report.
`window.MazeBall` also exposes `Game`, `Levels`, `Player`, `Demo`, `Input`,
`Storage` and `AudioFX` for ad-hoc poking.

---

## Known Limitations

- **1-cell corridors are genuinely hard** (that's the point of levels 7–10).
  The wall-proximity brake and instant stop keep it fair, and demo/solution
  show the way.
- Touch devices get an on-screen D-pad, but the game is keyboard-first.
- Audio requires a user gesture before the browser will let it start (the
  first click/keypress unlocks it automatically).

---

## Presentation Guide

Use this section as a script / talking-points cheat-sheet when presenting the
project.

### 1. The pitch (30 seconds)

> "Maze Ball is a complete arcade game that runs in any browser with zero
> dependencies. You move a ball with `W A S D` through 10 mazes, and the rule
> is simple: touch a wall and the attempt fails. It looks like a toy, but
> underneath it's a real game engine — physics, collision, pathfinding, a state
> machine, and even an AI demo that solves each maze by itself."

### 2. Live demo flow

1. Open `index.html` → show the **start screen** (title, WASD diagram, START).
2. Hit **START GAME** → mention the **tutorial** that plays automatically.
3. Play **Level 1** (very easy) → complete it → show the confetti + stats.
4. Open the **☰ menu → Demo** → let the demo solve a harder level on its own.
5. Open **☰ menu → Select Level** → jump to **Level 8 (The Labyrinth)** to show
   a generated maze and the difficulty ramp.
6. Trigger a **wall hit** deliberately to show the fail flow (flash, shake,
   retry, hint).

### 3. What to talk about per area

| Area | Talking point |
| --- | --- |
| **Physics** | Sub-stepped movement (max 4px per step) prevents tunnelling; delta-time loop clamps dt so tab-switches can't cheat. |
| **Collision** | Circle-vs-AABB against ~30–116 merged wall rects instead of 300 cells → 60 fps. |
| **Pathfinding** | BFS distance field from the goal powers the demo, solution view and hints. |
| **State machine** | `IDLE → PLAYING → SUCCESS/FAILED → COMPLETE`, plus `PAUSED/MENU/DEMO` overlays. |
| **AI/demo mode** | Follows cell-centre route — provably can never touch a wall. |
| **UX** | Contextual hints, wrong-key feedback, demo autoplay, tutorial → "helpful, not punishing". |
| **Persistence** | `localStorage`: unlocks, best times, attempts, settings. |
| **QA** | Headless Node validator simulates real physics through every level; in-browser `MazeBall.selfTest()`. |
| **Accessibility** | Arrow keys + WASD, touch D-pad, resize-safe canvas, no per-frame DOM writes. |

### 4. Likely questions & answers

- **"Is this a library or framework demo?"** — Neither. It's pure vanilla JS
  with zero dependencies and no build step; you can read every line.
- **"How hard is it to add a level?"** — Add an ASCII string to `levels.js`;
  the parser, BFS solver and validator handle the rest.
- **"How do we know every level is beatable?"** — A Node script simulates a
  player driving the real physics code along the solved path; 10/10 pass.
- **"Where does the sound come from?"** — Synthesised live with the Web Audio
  API — there are no audio files in the repo.
- **"Why does the ball slow down near walls?"** — A proximity brake makes
  near-misses recoverable, so the deadly-wall rule feels fair.

---

## License

MIT — see the [LICENSE](./LICENSE) file. Copyright (c) 2026 Matomee.

---

*Made with plain HTML, CSS and JavaScript — and a lot of neon.*