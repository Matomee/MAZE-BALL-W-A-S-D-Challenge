/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/utils.js
   ───────────────────────────────────────────────────────────────────────
   Small, dependency-free helpers shared by every other module:
   math, formatting, grid -> geometry conversion and DOM sugar.
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const Utils = {
  /* ── Math ──────────────────────────────────────────────────────────── */

  clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /** Frame-rate independent smoothing: t is "fraction remaining per second". */
  damp(current, target, smoothing, dt) {
    return Utils.lerp(target, current, Math.pow(smoothing, dt));
  },

  dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  },

  distSq(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  },

  /** Map a value from one range to another (unclamped). */
  mapRange(value, inMin, inMax, outMin, outMax) {
    if (inMax - inMin === 0) return outMin;
    return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
  },

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  },

  easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  },

  /** Deterministic PRNG — handy for reproducible particles/tests. */
  mulberry32(seed) {
    let a = seed >>> 0;
    return function random() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  rand(min, max) {
    return min + Math.random() * (max - min);
  },

  randInt(min, max) {
    return Math.floor(Utils.rand(min, max + 1));
  },

  pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  },

  /* ── Time formatting ───────────────────────────────────────────────── */

  /** "00:18.42" — minutes:seconds.centiseconds (the HUD timer). */
  formatTime(ms) {
    const safe = Math.max(0, ms);
    const minutes = Math.floor(safe / 60000);
    const seconds = Math.floor((safe % 60000) / 1000);
    const centis = Math.floor((safe % 1000) / 10);
    return (
      String(minutes).padStart(2, '0') +
      ':' +
      String(seconds).padStart(2, '0') +
      '.' +
      String(centis).padStart(2, '0')
    );
  },

  /** "1:24" — compact minutes:seconds (summary screens). */
  formatClock(ms) {
    const safe = Math.max(0, ms);
    const minutes = Math.floor(safe / 60000);
    const seconds = Math.floor((safe % 60000) / 1000);
    return minutes + ':' + String(seconds).padStart(2, '0');
  },

  /** "12.4s" — short single-unit time (level-complete card). */
  formatSeconds(ms) {
    return (Math.max(0, ms) / 1000).toFixed(1) + 's';
  },

  /* ── Grid → geometry ───────────────────────────────────────────────── */

  /**
   * Merge every horizontal run of '#' in an ASCII grid into one AABB.
   * A 20x15 grid becomes roughly 20-45 rects instead of 300 cells, which
   * keeps the per-frame collision loop tiny.
   *
   * @param {string[]} grid ASCII rows
   * @param {number} cell  px per cell
   * @returns {{x:number,y:number,w:number,h:number}[]}
   */
  mergeHorizontalRuns(grid, cell) {
    const rects = [];
    for (let row = 0; row < grid.length; row++) {
      const line = grid[row];
      let col = 0;
      while (col < line.length) {
        if (line[col] !== '#') {
          col++;
          continue;
        }
        const start = col;
        while (col < line.length && line[col] === '#') col++;
        rects.push({
          x: start * cell,
          y: row * cell,
          w: (col - start) * cell,
          h: cell,
        });
      }
    }
    return rects;
  },

  /** True when the character at (col,row) is solid. */
  isWallChar(ch) {
    return ch === '#';
  },

  /* ── DOM sugar ─────────────────────────────────────────────────────── */

  /** Cached getElementById. */
  $(id) {
    return document.getElementById(id);
  },

  /** Add / remove / toggle a class, safely (no-op when el is null). */
  addClass(el, name) {
    if (el) el.classList.add(name);
  },

  removeClass(el, name) {
    if (el) el.classList.remove(name);
  },

  toggleClass(el, name, on) {
    if (!el) return;
    if (on === undefined) el.classList.toggle(name);
    else el.classList.toggle(name, !!on);
  },

  /** Set textContent only when it actually changed (avoids layout churn). */
  setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  },

  setStyle(el, prop, value) {
    if (el && el.style[prop] !== value) el.style[prop] = value;
  },

  /** Play a one-shot CSS animation class (removed on animationend). */
  pulseClass(el, name, ms) {
    if (!el) return;
    el.classList.remove(name);
    // Force reflow so the animation restarts even when it runs twice in a row.
    void el.offsetWidth;
    el.classList.add(name);
    window.setTimeout(() => el.classList.remove(name), ms);
  },

  /* ── Misc ──────────────────────────────────────────────────────────── */

  /** Structured clone fallback (used by tests / debug dumps). */
  clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  },

  /** Debug logging that respects Config.DEBUG. */
  log(...args) {
    if (Config.DEBUG) console.log('[maze-ball]', ...args);
  },

  warn(...args) {
    console.warn('[maze-ball]', ...args);
  },
};
