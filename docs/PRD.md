# MAZE BALL — Product Requirements Document (PRD)

> Version 1.0 · 2026-09-15 · Status: **Accepted**

## 1. Overview

**Maze Ball** is a polished, browser-based, single-player puzzle game. The player
steers a ball through a maze with the `W A S D` keys. The goal is to reach the
`GOAL` tile **without ever touching a wall**.

The product must feel like a real, finished game — not a coding exercise.

## 2. Goals

1. Reliable core loop: move → avoid walls → reach goal → next level.
2. Teach the player to play within seconds (start screen + interactive demo).
3. Help, don't punish: contextual hints, wrong-key feedback, demo mode.
4. Feel premium: smooth movement, animations, sound, a modern dark UI.

## 3. Non-Goals

- No backend, no accounts, no multiplayer.
- Mobile is optional (touch D-pad is a nice-to-have, not required).
- No external game engine (vanilla HTML/CSS/JS + Canvas).

## 4. Personas / First-time user

A first-time user opens the page and must be able to:

1. Read the title "MAZE BALL".
2. See "Reach the goal without touching the walls."
3. See the `W A S D` control diagram.
4. Press **START GAME**.
5. Watch an **interactive tutorial/demo** that shows the ball moving on its own.
6. Play Level 1 and understand success/failure feedback.

## 5. Functional Requirements

### 5.1 Core Gameplay
- A ball exists inside a maze on a Canvas.
- `W` = up, `A` = left, `S` = down, `D` = right.
- Movement is **smooth** (velocity + delta-time, not `x += 50` per keypress).
- A ball **cannot pass through walls** (collision detection with radius).
- Touching a wall = **failed attempt** (per the primary rule).

### 5.2 Levels
- Exactly **10 levels**, distinct layouts, rising difficulty.
- Difficulty curve:

| Level | Difficulty | Theme |
|-------|------------|-------|
| 1 | Very Easy | Basic movement |
| 2 | Easy | Simple turns |
| 3 | Easy | More walls |
| 4 | Medium | Narrower paths |
| 5 | Medium | Complex maze |
| 6 | Medium | Longer route |
| 7 | Hard | Narrow paths |
| 8 | Hard | Complex maze |
| 9 | Very Hard | Precision movement |
| 10 | Extreme | Final challenge |

### 5.3 States
`IDLE → PLAYING → SUCCESS` and `PLAYING → WALL COLLISION → FAILED`,
plus `PAUSED`, `DEMO`, `MENU`, `COMPLETE`.

### 5.4 Start Experience
Clean start screen showing: title, level 1 label, objective line,
`W A S D` control diagram, and a **START GAME** button.

### 5.5 Interactive Tutorial / Demo
- A visual demo that **shows** (not just tells) how to move.
- Control diagram: `W↑ / A← ● →D / S↓`.
- Auto-run sequence: ball moves `↓ ↓ → → → ↑ ↑ → → 🎯`.
- Shows what happens when a wall is touched.

### 5.6 Autoplay / Demo Mode
- Start / Pause / Stop controls.
- Ball follows a **valid solution path**, visibly moves, reaches the goal.
- Returns control to the player when stopped.

### 5.7 Hint System
- Dedicated hint area that updates **dynamically** with game state.
- Contextual hints (not random):
  - "Press W to move up."
  - "The path on your left looks safer — try A."
  - "You're close to a wall. Slow down."
- Wrong-key feedback: "There's a wall ahead. Try moving left with A."
- Triggered by player struggle (idle time, repeated bad moves, near-misses).

### 5.8 Main Menu (☰)
`Resume · Restart Level · Select Level · Demo · Settings · How to Play`

### 5.9 Level Select
- Grid of levels `1–10`.
- Level 1 unlocked; later levels unlock as they are completed.
- (All levels can be force-unlocked for demos.)

### 5.10 HUD / Progress
- Current level, `LEVEL 4 / 10`, progress bar/percentage.
- Timer `00:18.42` (starts on play, stops on end, resets on restart).
- Attempt counter (wall collision = +1 attempt).

### 5.11 Completion / Failure / Final screens
- Level complete: `LEVEL COMPLETE!` + time + attempts + `NEXT LEVEL`.
- Failure: `LEVEL FAILED` + `RETRY` + a hint (not a browser error).
- After level 10: `🎉 COMPLETE!` + total time + total attempts + `PLAY AGAIN`.

### 5.12 Sound (optional, encouraged)
- Toggle 🔊 ON/OFF. Movement, wall hit, goal, complete, click, hint sounds.
- Generated with Web Audio API (no asset files).

### 5.13 Replay / Solution (bonus)
- `SHOW SOLUTION` overlay draws the optimal path on the maze.

## 6. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Responsive | Desktop, laptop, small windows; keyboard-first. |
| Performance | 60 fps, minimal DOM churn, no memory leaks. |
| Robustness | No console errors on resize/restart/menu/demo/rapid keys. |
| Code quality | Modular, readable, documented, easy to add Level 11+ |
| Error handling | Graceful on unexpected input/focus loss. |

## 7. Tech Stack Decision

**Vanilla HTML + CSS + JavaScript (Canvas)** — no build step.
- Open `index.html` directly, or serve with any static server.
- Plain `<script>` tags (not ES modules) so `file://` works without CORS issues.
- Modular via separate global namespaces per concern.

## 8. Acceptance Criteria (minimum)

- Ball exists; controllable with W/A/S/D.
- Ball cannot pass through walls.
- Goal + goal detection + wall collision + fail/retry + level complete.
- 10 levels.
- Start screen, game screen, hint area, menu, level indicator, progress,
  instructions, responsive layout.
- Autoplay/demo, visual movement demo, contextual hints, keyboard feedback,
  level progression.
