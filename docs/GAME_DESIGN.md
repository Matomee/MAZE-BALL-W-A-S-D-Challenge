# MAZE BALL — Game Design Document

## 1. Core Pillars

1. **Readable at a glance** — a first-time user understands the game in ~5s.
2. **Helpful, not punishing** — the game teaches through hints and demos.
3. **Feels alive** — glow, trail, pulsing goal, particles, sound, transitions.

## 2. Visual Style

**"Neon labyrinth"** — dark sci-fi arcade.

| Token | Value |
|-------|-------|
| Background | `#0a0e17` → `#101828` gradient |
| Panel | `#111827` with 1px `#1f2937` border, 16px radius |
| Primary accent | Cyan `#22d3ee` |
| Secondary accent | Magenta `#e879f9` |
| Success | Green `#34d399` |
| Danger | Red `#fb7185` |
| Warning/hint | Amber `#fbbf24` |
| Text | `#e5e7eb` / muted `#94a3b8` |
| Font | Orbitron (display) + Rajdhani / Inter (body), system fallback |

- Ball: cyan radial gradient + outer glow + motion trail.
- Goal: amber/magenta pulsing target with rotating dashed ring.
- Walls: slate `#1e293b` fill, lighter top edge, soft cyan inner glow.
- Start pad: subtle green glow.

## 3. Level Design

Grid: 20 × 15 cells. All levels validated by `tools/validate-levels.js`
(width, border, single S/G, BFS-reachable, solvable path).

| # | Name | Difficulty | Design intent |
|---|------|-----------|----------------|
| 1 | First Steps | Very Easy | One central wall block; go around it. |
| 2 | Corner Turn | Easy | Two L-shaped walls forming turns. |
| 3 | Detour | Easy | More walls, multiple small turns. |
| 4 | The Corridor | Medium | First 1-cell narrow corridors. |
| 5 | Switchbacks | Medium | S-shaped forced route. |
| 6 | The Long Way | Medium | Long snaking route with dead-ends. |
| 7 | Precision | Hard | Long narrow corridors with tight turns. |
| 8 | The Labyrinth | Hard | Dense maze, many dead-ends. |
| 9 | Razor's Edge | Very Hard | Maximum narrow-path precision. |
| 10 | The Gauntlet | Extreme | Combination of all mechanics. |

Difficulty is controlled by: corridor width (2-cell → 1-cell), number of turns,
route length, number of dead-ends, and proximity of goal to walls.

## 4. UX Flows

```
OPEN WEBSITE → START SCREEN → INTERACTIVE DEMO (optional) → LEVEL 1
   → PLAY (W/A/S/D) → HIT WALL? → FAILED → RETRY
                    → REACH GOAL → LEVEL COMPLETE → NEXT LEVEL
   ... → LEVEL 10 → 🎉 COMPLETE → PLAY AGAIN / MENU
```

- **Start screen** = title + objective + WASD diagram + START GAME.
- **Tutorial** = auto-playing demo overlay with labelled arrows.
- **Failure** = quick red flash + shake + "RETRY" + contextual hint.
- **Completion** = confetti burst + stats + NEXT LEVEL.

## 5. Feedback Map

| Event | Visual | Audio | Hint |
|-------|--------|-------|------|
| Move | trail | soft tick | — |
| Near wall | wall proximity glow | — | "careful" |
| Wrong key | blocked-direction flash | low thud | "wall ahead" |
| Wall hit | red flash + shake | crash | "try again" hint |
| Goal | confetti + ring | chime | — |
| Level complete | overlay + stats | fanfare | — |
| Game complete | fireworks | fanfare | — |

## 6. Accessibility & Robustness

- Keyboard focus handled; WASD `preventDefault` avoided where unnecessary.
- On-screen D-pad shown for touch devices.
- Sound & hints toggles persist.
- Window resize re-fits canvas without resetting gameplay state.
