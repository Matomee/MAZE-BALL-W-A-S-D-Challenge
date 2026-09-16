# MAZE BALL — Implementation Plan

> Live checklist. Mark `[x]` as tasks complete. Do **not** lose this file —
> it is the single source of truth for what is done and what remains.

## Phase 0 — Planning & Docs

- [x] PRD (`docs/PRD.md`)
- [x] Architecture (`docs/ARCHITECTURE.md`)
- [x] Game Design (`docs/GAME_DESIGN.md`)
- [x] Implementation Plan (this file)
- [x] Plan mirrored into agent memory (`/memories/repo/plan.md`)

## Phase 1 — Shell & Theme

- [x] `index.html` — full DOM shell: header, hint panel, canvas, overlays
- [x] `css/style.css` — neon theme, layout, animations, responsive

## Phase 2 — Core Engine

- [x] `js/config.js`
- [x] `js/utils.js`
- [x] `js/levels.js` (10 levels + parser + BFS)
- [x] `js/collision.js`
- [x] `js/player.js`
- [x] `js/game.js` (state machine + loop + win/lose)

## Phase 3 — Experience Layer

- [x] `js/audio.js`
- [x] `js/storage.js`
- [x] `js/hints.js`
- [x] `js/demo.js`
- [x] `js/ui.js`
- [x] `js/input.js`
- [x] `js/main.js`

## Phase 4 — Validation

- [x] `tools/validate-levels.js` (Node)
- [x] Run validator, fix any bad level data — 10/10 levels pass, including a
      headless physics simulation that reaches the goal on every level

## Phase 5 — QA & Polish

- [x] Open in browser; no console errors
- [x] Test: start → tutorial → play → fail → retry → complete → next
- [x] Test: menu, level select, settings, sound toggle, pause
- [x] Test: resize, demo start/pause/stop, reset progress

## Phase 6 — Deliverables

- [x] `README.md` (name, tech, install/run, controls, architecture,
      how movement/collision/levels/autoplay/hints work, extras, limitations)
- [x] `tools/generate-levels.js` (extra): regenerates the L8–L10 mazes

## Open Questions / Decisions

- Movement model: **hold-to-move** velocity (not tap-per-step). Decided.
- Collision rule: **touch = fail** (matches spec primary rule). Decided.
- Path: **BFS shortest path** per level (powers demo + hints + solution view). Decided.
- File scheme: **plain scripts** so `index.html` opens via `file://`. Decided.
