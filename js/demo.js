/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/demo.js
   ───────────────────────────────────────────────────────────────────────
   Autoplay: walks the ball along the BFS solution path.

   The route only ever travels between the centres of orthogonally adjacent
   floor cells, so the ball stays a full half-cell away from every wall and
   the demo can never crash. Pause freezes it; Stop hands control back.
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const Demo = {
  active: false,
  paused: false,
  finished: false,
  path: [], // pixel waypoints (cell centres)
  segment: 0, // index of the segment currently being traversed
  segmentOffset: 0, // px travelled into that segment
  speed: 165, // px per second
  holdMs: 0, // pause on the goal before finishing
  x: 0,
  y: 0,
  totalLength: 0,
  travelledTotal: 0,

  /* ── Controls ──────────────────────────────────────────────────────── */

  /**
   * Begin autoplay for a level.
   * @param {object} level parsed level (uses `.path`)
   * @param {string} [speedName] 'slow' | 'normal' | 'fast'
   * @returns {boolean} false when the level has no route to follow
   */
  start(level, speedName) {
    const path = level && level.path && level.path.length > 1 ? level.path : null;
    if (!path) {
      Utils.warn('Demo requested but the level has no solution path.');
      return false;
    }

    this.path = path;
    this.segment = 0;
    this.segmentOffset = 0;
    this.x = path[0].x;
    this.y = path[0].y;
    this.active = true;
    this.paused = false;
    this.finished = false;
    this.holdMs = 0;
    this.travelledTotal = 0;
    this.setSpeed(speedName);

    this.totalLength = 0;
    for (let i = 1; i < path.length; i++) {
      this.totalLength += Utils.dist(path[i - 1].x, path[i - 1].y, path[i].x, path[i].y);
    }

    return true;
  },

  setSpeed(speedName) {
    const table = Config.DEMO_SPEEDS;
    this.speed = table[speedName] || table.normal;
  },

  pause() {
    if (!this.active) return;
    this.paused = true;
  },

  resume() {
    if (!this.active) return;
    this.paused = false;
  },

  /** Stop and release everything (caller decides where the ball goes next). */
  stop() {
    this.active = false;
    this.paused = false;
    this.finished = false;
    this.path = [];
    this.segment = 0;
    this.segmentOffset = 0;
    this.holdMs = 0;
    this.travelledTotal = 0;
  },

  /* ── Queries ───────────────────────────────────────────────────────── */

  get position() {
    return { x: this.x, y: this.y };
  },

  /** 0..1 progress along the route (for the demo bar / HUD). */
  progress() {
    if (!this.totalLength) return 0;
    return Utils.clamp(this.travelledTotal / this.totalLength, 0, 1);
  },

  /** The direction the demo is currently travelling. */
  direction() {
    const from = this.path[this.segment];
    const to = this.path[this.segment + 1];
    if (!from || !to) return null;
    if (to.x > from.x) return 'right';
    if (to.x < from.x) return 'left';
    if (to.y > from.y) return 'down';
    if (to.y < from.y) return 'up';
    return null;
  },

  /* ── Per-frame update ──────────────────────────────────────────────── */

  /**
   * Advance along the path.
   * @param {number} dt seconds
   * @returns {{x:number, y:number, done:boolean, justArrived:boolean}}
   */
  update(dt) {
    if (!this.active) {
      return { x: this.x, y: this.y, done: false, justArrived: false };
    }

    if (this.paused) {
      return { x: this.x, y: this.y, done: false, justArrived: false };
    }

    let justArrived = false;

    if (this.finished) {
      // Hold on the goal for a moment so the player sees the finish.
      this.holdMs += dt * 1000;
      return {
        x: this.x,
        y: this.y,
        done: this.holdMs >= Config.DEMO_HOLD_MS,
        justArrived: false,
      };
    }

    let budget = this.speed * dt;
    const lastIndex = this.path.length - 1;

    while (budget > 0 && this.segment < lastIndex) {
      const from = this.path[this.segment];
      const to = this.path[this.segment + 1];
      const segmentLength = Utils.dist(from.x, from.y, to.x, to.y);

      if (segmentLength <= 0.0001) {
        this.segment++;
        this.segmentOffset = 0;
        continue;
      }

      const remaining = segmentLength - this.segmentOffset;

      if (budget >= remaining) {
        budget -= remaining;
        this.travelledTotal += remaining;
        this.segment++;
        this.segmentOffset = 0;
      } else {
        this.segmentOffset += budget;
        this.travelledTotal += budget;
        budget = 0;
      }
    }

    if (this.segment >= lastIndex) {
      const end = this.path[lastIndex];
      this.x = end.x;
      this.y = end.y;
      this.finished = true;
      justArrived = true;
    } else {
      const from = this.path[this.segment];
      const to = this.path[this.segment + 1];
      const segmentLength = Utils.dist(from.x, from.y, to.x, to.y);
      const t = segmentLength > 0 ? this.segmentOffset / segmentLength : 0;
      this.x = Utils.lerp(from.x, to.x, t);
      this.y = Utils.lerp(from.y, to.y, t);
    }

    return { x: this.x, y: this.y, done: false, justArrived };
  },
};
