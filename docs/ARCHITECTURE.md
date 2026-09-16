# MAZE BALL — Architecture

## 1. Project Structure

```
dude- Game/
├── index.html              # Single page shell + all overlays
├── css/
│   └── style.css           # Theme, layout, animations, responsiveness
├── js/
│   ├── config.js           # Constants, tunables, default settings
│   ├── utils.js            # Math helpers, time format, wall merging
│   ├── levels.js           # 10 ASCII level definitions + grid parser + BFS solver
│   ├── collision.js        # Circle-vs-AABB collision
│   ├── player.js           # Ball state (position, velocity, trail)
│   ├── audio.js            # Web Audio sound manager
│   ├── storage.js          # localStorage progress/settings
│   ├── hints.js            # Adaptive/contextual hint engine
│   ├── demo.js             # Autoplay path follower (start/pause/stop)
│   ├── game.js             # State machine + rAF loop + win/lose logic
│   ├── ui.js               # HUD, hint panel, modals, level grid, particles
│   ├── input.js            # Keyboard + touch D-pad handling
│   └── main.js             # Bootstrap & wiring
├── tools/
│   └── validate-levels.js  # Node script: validates all level data
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md     # this file
│   ├── GAME_DESIGN.md
│   └── PLAN.md
└── README.md
```

## 2. Script Loading Order (dependencies)

```
config.js → utils.js → levels.js → collision.js → audio.js
→ storage.js → player.js → hints.js → demo.js
→ game.js → ui.js → input.js → main.js
```

Each file declares one or two global objects (plain classic scripts, no modules).

## 3. Coordinate & Data Model

- **Virtual world:** `800 × 600` px.
- **Grid:** `COLS = 20`, `ROWS = 15`, `CELL = 40` px.
- **Ball radius:** `R = 12` px (fits a 1-cell, 40px corridor with 8px clearance).
- Levels are stored as ASCII grids:

```js
// rows of 20 chars; '#' wall, ' ' floor, 'S' start, 'G' goal
[
  "####################",
  "#S                 #",
  "#   #########      #",
  "#                  #",
  "#                 G#",
  "####################"
]
```

### Parsed level object

```js
{
  id: 1,
  name: "First Steps",
  grid: [...],             // raw strings
  walls: [{x,y,w,h}],      // merged horizontal wall runs (px)
  start: {x, y},           // cell centers (px)
  goal:  {x, y},
  path:  [{cx,cy}, ...]    // BFS solution path through cell centers (px)
}
```

### Wall merging

`utils.mergeHorizontalRuns(grid, CELL)` scans each row and merges consecutive
`#` cells into a single AABB. This gives clean drawing + fewer collision checks
(~10–40 rects instead of 300 cells).

## 4. Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `Config` | Tuning constants: speed, radius, colors, demo speeds, hint thresholds. |
| `Utils` | `clamp`, `dist`, `lerp`, `formatTime`, `mergeHorizontalRuns`, `uuid`. |
| `Levels` | `parseLevel`, `getLevel`, `solvePath` (BFS), `count`. |
| `Collision` | `circleRect(cx, cy, r, rect)`, `closestPointOnRect`. |
| `Player` | ball pos/velocity, `resetTo(level)`, `update(dt)`, trail history. |
| `AudioFX` | `init`, `play(name)`, `setEnabled`, small synth engine. |
| `Storage` | `get/set` progress, settings, stats. |
| `Hints` | `tick(state)` → picks contextual hint string + type. |
| `DemoController` | `start/pause/stop`, follow `level.path`, emit fail-safe. |
| `Game` | state machine, main rAF loop, collision/win/fail, timer, attempts. |
| `UI` | render HUD/hint/panel, show/hide screens, particles, progress. |
| `Input` | key mapping, `preventDefault`, D-pad, focus handling. |
| `main` | boot, event listeners, global hotkeys. |

## 5. State Machine

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

`PAUSED` and `MENU` are overlays that suspend the loop's update step but keep
rendering.

## 6. Movement & Collision

1. `Input` sets `player.vx/vy` from held keys (W/A/S/D).
2. `player.update(dt)`: `x += vx*dt*speed; y += vy*dt*speed`.
3. `Game` checks `Collision.circleRect` against every wall rect.
4. **On any wall touch → FAIL** (primary rule). Ball resets to start.
   (This both prevents passing through and enforces the rule.)
5. **On goal overlap → SUCCESS**: distance from ball center to goal center
   `< goalRadius` (generous, ~18px) triggers completion.

## 7. Autoplay / Demo

- `Levels.solvePath` computes shortest path via BFS on the grid.
- `DemoController` moves the ball along `path` at `demoSpeed` (slow/normal/fast),
  interpolating between consecutive cell centers.
- Pause freezes position; Stop returns control to the player and resets the ball.
- Demo is **always fail-safe**: it follows the exact cell-center path, so it
  cannot touch walls.

## 8. Hint Engine

The hint engine consumes game-state observations and ranks hint candidates:

1. **Stuck/idle** — no input for N seconds → "Press W/A/S/D to move."
2. **Wrong direction** — key held while wall is adjacent → "Wall ahead, try X."
3. **Near wall** — distance to nearest wall < threshold → "Careful, slow down."
4. **Path hint** — BFS path next direction → "The path continues to the right."
5. **Struggle** — many attempts, little progress → general tip.

Hints are rate-limited (cooldown) so they never spam the player. A "tutorial"
variant runs on level 1's first play-through.

## 9. Persistence (localStorage)

```js
{
  mb_unlocked: 3,            // highest unlocked level
  mb_sound: true,
  mb_hints: true,
  mb_demoSpeed: "normal",
  mb_stats: { totalTimeMs, totalAttempts, completed: false }
}
```

## 10. Rendering

- Single `<canvas>` re-rendered every frame via `requestAnimationFrame`.
- `devicePixelRatio` scaling for crispness; CSS keeps aspect ratio.
- Visual layers: grid floor → goal pad → walls → solution path (if shown)
  → trail → ball → particles.
- DOM is used only for HUD/menus, updated only when values change (no per-frame
  DOM writes).
