/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/player.js
   ───────────────────────────────────────────────────────────────────────
   The ball: position, velocity, trail and the wall-proximity brake.

   Movement model
   --------------
   Hold-to-move. The velocity is derived directly from the held keys each
   frame (no inertia), so releasing a key stops the ball within one frame.
   That responsiveness is what makes a "touch a wall = fail" rule feel fair.

   The optional brake assist slows the ball *only when it is moving towards
   a nearby wall* (a dot-product test), so travelling along a narrow
   corridor is never slowed down.
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const Player = {
  x: 0,
  y: 0,
  r: Config.BALL_RADIUS,
  vx: 0,
  vy: 0,
  speed: 0, // px/s actually applied this frame
  brake: 1, // brake multiplier (1 = full speed)
  moving: false,
  travelling: false, // any key held this frame
  travelled: 0, // total px travelled this attempt
  trail: [],
  overlapAtSpawn: false,

  /* ── Lifecycle ─────────────────────────────────────────────────────── */

  resetTo(level) {
    this.x = level.start.x;
    this.y = level.start.y;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.brake = 1;
    this.moving = false;
    this.travelling = false;
    this.travelled = 0;
    this.trail = [{ x: this.x, y: this.y }];

    // A well-formed level never spawns inside a wall; if one does (bad level
    // data) we ignore that single frame instead of failing instantly.
    this.overlapAtSpawn = Collision.hits(this.x, this.y, this.r, level.walls);
    if (this.overlapAtSpawn) {
      Utils.warn('Player spawned overlapping a wall on level', level.id);
    }
  },

  /** Teleport without touching the trail (used by demo mode). */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  },

  /* ── Per-frame update ──────────────────────────────────────────────── */

  /**
   * @param {number} dt     seconds since the last frame
   * @param {object} level  parsed level (needs .walls)
   * @param {{x:number,y:number}} axis  -1..1 per axis from Input
   * @returns {{hit:object|null, travelX:number, travelY:number,
   *            brake:number, speed:number, moved:boolean}}
   */
  update(dt, level, axis) {
    const walls = level.walls;

    let ax = axis.x;
    let ay = axis.y;

    // Never let diagonal movement be faster than straight movement.
    if (Config.DIAGONAL_NORMALISE) {
      const magnitude = Math.hypot(ax, ay);
      if (magnitude > 1) {
        ax /= magnitude;
        ay /= magnitude;
      }
    }

    this.travelling = ax !== 0 || ay !== 0;

    /* Wall-proximity brake: only applies when heading into a wall. */
    let brake = 1;
    if (Config.ASSIST.ENABLED && this.travelling) {
      const nearest = Collision.nearestWall(this.x, this.y, this.r, walls);
      if (nearest.distance < Config.ASSIST.DIST) {
        const alignment = ax * nearest.dirX + ay * nearest.dirY;
        if (alignment > 0.25) {
          const closeness = Utils.clamp(nearest.distance / Config.ASSIST.DIST, 0, 1);
          brake = Utils.lerp(Config.ASSIST.MIN_FACTOR, 1, closeness);
        }
      }
    }

    this.brake = brake;
    this.speed = Config.SPEED * brake;
    this.vx = ax * this.speed;
    this.vy = ay * this.speed;

    const travelX = this.vx * dt;
    const travelY = this.vy * dt;

    /* Sub-stepping: never move more than SUBSTEP px per collision test, so
       the ball can't tunnel through a wall on a slow frame. */
    const totalDistance = Math.hypot(travelX, travelY);
    const steps = Math.max(1, Math.ceil(totalDistance / Config.SUBSTEP));
    const stepX = travelX / steps;
    const stepY = travelY / steps;

    let hit = null;
    const skipFirstTest = this.overlapAtSpawn;
    this.overlapAtSpawn = false;

    for (let i = 0; i < steps; i++) {
      this.x += stepX;
      this.y += stepY;

      if (skipFirstTest && i === 0) continue;

      const wall = Collision.hitAny(this.x, this.y, this.r, walls);
      if (wall) {
        hit = wall;
        break;
      }
    }

    /* Trail sampling. */
    if (totalDistance > 0) {
      this.travelled += totalDistance;
      const last = this.trail[this.trail.length - 1];
      if (!last || Utils.dist(last.x, last.y, this.x, this.y) >= Config.TRAIL_MIN_DIST) {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > Config.TRAIL_MAX) this.trail.shift();
      }
    }

    this.moving = totalDistance > 0.01;

    return {
      hit,
      travelX,
      travelY,
      brake,
      speed: this.speed,
      moved: this.moving,
    };
  },

  /* ── Queries used by the hint engine ───────────────────────────────── */

  /** Free space on each side of the ball, in px. */
  gaps(level) {
    return Collision.gapsAround(this.x, this.y, this.r, level.walls);
  },

  /** Distance from the ball centre to the goal centre. */
  distanceToGoal(level) {
    return Utils.dist(this.x, this.y, level.goal.x, level.goal.y);
  },

  /** Has the ball reached the goal? */
  reachedGoal(level) {
    return this.distanceToGoal(level) < Config.GOAL_RADIUS;
  },

  /** Direction the ball is currently pressing (unit-ish vector). */
  direction() {
    const magnitude = Math.hypot(this.vx, this.vy);
    if (magnitude < 0.001) return { x: 0, y: 0 };
    return { x: this.vx / magnitude, y: this.vy / magnitude };
  },

  /** Which side is closest to a wall (used for "wall ahead" warnings). */
  tightestSide(level) {
    const gaps = this.gaps(level);
    let side = null;
    let value = Infinity;
    for (const key of ['up', 'down', 'left', 'right']) {
      if (gaps[key] < value) {
        value = gaps[key];
        side = key;
      }
    }
    return { side, gap: value === Infinity ? Infinity : value };
  },
};
