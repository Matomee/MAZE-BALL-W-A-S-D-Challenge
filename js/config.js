/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/config.js
   ───────────────────────────────────────────────────────────────────────
   Every tunable value in one place. This file is loaded first; all other
   modules read from it. Change a number here and the whole game follows.
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const Config = {
  /* ── World / grid ──────────────────────────────────────────────────── */
  COLS: 20, // grid columns
  ROWS: 15, // grid rows
  CELL: 40, // px per cell
  WORLD_W: 800, // virtual canvas width  (COLS * CELL)
  WORLD_H: 600, // virtual canvas height (ROWS * CELL)

  /* ── Ball & movement ───────────────────────────────────────────────── */
  BALL_RADIUS: 11, // 1-cell corridor (40px) leaves 9px clearance per side
  SPEED: 200, // px per second (hold-to-move, not tap-to-step)
  MAX_DT: 1 / 30, // clamp frame delta so tab-switching can't teleport
  SUBSTEP: 4, // collision sub-step size in px (prevents tunnelling)
  DIAGONAL_NORMALISE: true, // W+A must not be faster than W alone

  /**
   * Wall proximity brake (accessibility / feel assist).
   * When a wall sits directly ahead, the ball slows down instead of
   * slamming into it: this is what makes instant-fail fair. The effect is
   * per-axis, so travelling *along* a narrow corridor is never slowed.
   */
  ASSIST: {
    ENABLED: true,
    DIST: 30, // start braking when a wall is this close ahead (px)
    MIN_FACTOR: 0.3, // slowest possible speed multiplier near a wall
  },

  /* ── Goal ──────────────────────────────────────────────────────────── */
  GOAL_RADIUS: 18, // ball centre within this distance of goal centre = win
  GOAL_PULSE_MS: 1600, // pulse / ring rotation period

  /* ── Visuals ───────────────────────────────────────────────────────── */
  TRAIL_MAX: 26, // trail points kept
  TRAIL_MIN_DIST: 3.5, // min px between recorded trail points
  COLORS: {
    floor: '#0b1220',
    floorAlt: '#0d1526',
    gridLine: 'rgba(34, 211, 238, 0.07)',
    wall: '#1e293b',
    wallTop: '#334155',
    wallGlow: 'rgba(34, 211, 238, 0.30)',
    wallEdge: '#0f172a',
    ballCore: '#7ff0ff',
    ball: '#22d3ee',
    ballDeep: '#0e7490',
    ballGlow: 'rgba(34, 211, 238, 0.85)',
    trail: '34, 211, 238',
    goal: '#fbbf24',
    goalGlow: 'rgba(251, 191, 36, 0.75)',
    goalRing: '#e879f9',
    start: '#34d399',
    solution: '#e879f9',
    solutionGlow: 'rgba(232, 121, 249, 0.55)',
    danger: '#fb7185',
    success: '#34d399',
    nearWall: 'rgba(251, 191, 36, 0.9)',
  },

  /* ── Demo / autoplay ───────────────────────────────────────────────── */
  DEMO_SPEEDS: { slow: 90, normal: 165, fast: 280 }, // px per second
  DEMO_SPEED_ORDER: ['slow', 'normal', 'fast'],
  DEMO_HOLD_MS: 700, // pause on the goal before handing control back

  /* ── Hints ─────────────────────────────────────────────────────────── */
  HINT: {
    COOLDOWN_MS: 4200, // never change the hint more often than this
    IDLE_MS: 5000, // no input for this long -> "press WASD"
    NEAR_WALL_PX: 24, // ball edge this close to a wall -> "careful"
    STRUGGLE_ATTEMPTS: 3, // fails before the "watch the demo" hint appears
  },

  /* ── Levels / progress ─────────────────────────────────────────────── */
  TOTAL_LEVELS: 10,
  STORAGE_KEY: 'mazeBall.save.v1',

  /* ── States ────────────────────────────────────────────────────────── */
  STATE: {
    IDLE: 'idle', // start screen / no run in progress
    PLAYING: 'playing',
    PAUSED: 'paused', // overlay open, simulation suspended
    DEMO: 'demo', // autoplay
    SUCCESS: 'success',
    FAILED: 'failed',
    COMPLETE: 'complete', // all 10 levels finished
  },

  /* ── First-run settings (mirrored in localStorage by storage.js) ───── */
  DEFAULTS: {
    sound: true,
    hints: true,
    demoSpeed: 'normal',
  },

  DEBUG: false, // set true for verbose console logging
};

/** Convert a grid cell to the pixel centre of that cell. */
Config.cellCenterX = function cellCenterX(col) {
  return col * Config.CELL + Config.CELL / 2;
};

Config.cellCenterY = function cellCenterY(row) {
  return row * Config.CELL + Config.CELL / 2;
};
