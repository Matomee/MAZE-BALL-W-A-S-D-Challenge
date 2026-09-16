/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/hints.js
   ───────────────────────────────────────────────────────────────────────
   Contextual hint engine.

   Hints are ranked, not random. Every candidate is derived from a real
   observation about the current run:

     1. pressed into a wall   -> "there's a wall above you, try A"
     2. hugging a wall        -> "ease off"
     3. idle                  -> "press W A S D"
     4. repeated failures     -> "watch the demo"
     5. solved route          -> "the path continues to the right"
     6. default               -> level objective

   Non-urgent hints are rate-limited so the panel never flickers.
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const Hints = {
  lastChangeAt: 0,
  current: { text: '', sub: '' },
  idleMs: 0,

  DIRECTION_LABEL: {
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
  },

  DIRECTION_KEY: {
    up: 'W',
    down: 'S',
    left: 'A',
    right: 'D',
  },

  OPPOSITE: {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
  },

  /** Reset per-level state. */
  reset() {
    this.lastChangeAt = 0;
    this.idleMs = 0;
    this.current = { text: '', sub: '' };
  },

  /** Track idle time from the input layer. */
  tickIdle(dt, isTravelling) {
    if (isTravelling) {
      this.idleMs = 0;
    } else {
      this.idleMs += dt * 1000;
    }
    return this.idleMs;
  },

  /**
   * Decide which hint (if any) should be displayed right now.
   *
   * @param {object} ctx snapshot built by Game.snapshot()
   * @returns {{text:string, sub:string, urgent:boolean}|null}
   */
  evaluate(ctx) {
    if (!ctx.hintsEnabled) return null;

    /* 1 ── Pressed into a wall: the most actionable feedback. */
    if (ctx.blocked && ctx.blocked.side) {
      const side = ctx.blocked.side;
      const sideWord =
        side === 'up' ? 'above' : side === 'down' ? 'below' : side === 'left' ? 'to your left' : 'to your right';
      const alternatives = ['up', 'down', 'left', 'right'].filter(
        (dir) => dir !== side && ctx.gaps[dir] > ctx.gaps[side] + 4
      );
      const suggestion = alternatives.length ? alternatives[0] : null;
      return {
        text: `There's a wall ${sideWord}.`,
        sub: suggestion
          ? `Try moving ${this.DIRECTION_LABEL[suggestion]} with ${this.DIRECTION_KEY[suggestion]}.`
          : 'Release the key — the ball stops instantly.',
        urgent: true,
      };
    }

    /* 2 ── Very close to a wall while moving. */
    if (ctx.travelling && ctx.nearestGap < Config.HINT.NEAR_WALL_PX) {
      return {
        text: 'You are very close to a wall — ease off.',
        sub: 'Release the key and the ball freezes on the spot.',
        urgent: true,
      };
    }

    /* 3 ── Idle: encourage input. */
    if (this.idleMs > Config.HINT.IDLE_MS) {
      return {
        text: 'Press W, A, S or D to move the ball.',
        sub: 'Hold a key to roll in that direction.',
        urgent: false,
      };
    }

    /* 4 ── Repeated failures on this level. */
    if (ctx.attempts >= Config.HINT.STRUGGLE_ATTEMPTS) {
      return {
        text: `Stuck after ${ctx.attempts} fails? Watch the route.`,
        sub: 'Use ▶ Start Demo, or 🛣 Solution to draw the path.',
        urgent: false,
      };
    }

    /* 5 ── Follow the solved route. */
    if (ctx.pathDirection) {
      const dir = ctx.pathDirection;
      const adverb =
        dir === 'up' ? 'up' : dir === 'down' ? 'down' : dir === 'left' ? 'left' : 'right';
      return {
        text: `The path continues ${adverb} from here.`,
        sub: `Hold ${this.DIRECTION_KEY[dir]} and keep the ball centred.`,
        urgent: false,
      };
    }

    /* 6 ── Default objective text. */
    return {
      text: ctx.level.id === 1 ? 'Reach the goal without touching a wall.' : ctx.level.intent,
      sub: `${ctx.level.name} · ${ctx.level.difficulty}`,
      urgent: false,
    };
  },

  /**
   * Rate-limited wrapper around evaluate().
   * @returns {{text:string, sub:string}|null} hint to display, or null
   */
  update(ctx, now) {
    const candidate = this.evaluate(ctx);
    if (!candidate) return null;

    const enoughTime = now - this.lastChangeAt >= Config.HINT.COOLDOWN_MS;
    const changed = candidate.text !== this.current.text;

    if (!changed) return null;
    if (!candidate.urgent && !enoughTime) return null;

    this.current = { text: candidate.text, sub: candidate.sub };
    this.lastChangeAt = now;
    return this.current;
  },

  /**
   * A short, relevant tip for the "LEVEL FAILED" screen.
   * @param {object} ctx snapshot (attempts, level, distanceToGoal, lastHitSide)
   */
  failHint(ctx) {
    const gapToGoal = Player.distanceToGoal(ctx.level);

    if (gapToGoal < Config.CELL * 2.5) {
      return '💡 So close! Approach the goal dead centre and let the ball settle in.';
    }

    if (ctx.attempts >= 4) {
      return '💡 Try ▶ Start Demo to watch the exact route, then copy it.';
    }

    if (ctx.lastHitSide === 'up' || ctx.lastHitSide === 'down') {
      return '💡 Short taps beat long holds — stop before the wall, then turn.';
    }

    if (ctx.level.id >= 6) {
      return '💡 In tight corridors, line the ball up first, then move straight.';
    }

    return '💡 Release the key early: the ball stops the instant you let go.';
  },
};
