/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/collision.js
   ───────────────────────────────────────────────────────────────────────
   Circle-vs-AABB tests. Walls are stored as merged horizontal runs
   (see Utils.mergeHorizontalRuns), so a level is typically 20-45 rects,
   which keeps the per-frame loop cheap.

   All rects use { x, y, w, h } with x/y at the top-left corner.
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const Collision = {
  /** Closest point on a rect to a point (clamped projection). */
  closestPointOnRect(x, y, rect) {
    return {
      x: Utils.clamp(x, rect.x, rect.x + rect.w),
      y: Utils.clamp(y, rect.y, rect.y + rect.h),
    };
  },

  /** Signed distance from a circle centre to the rect surface (< 0 = overlap). */
  distanceToCircle(x, y, radius, rect) {
    const closest = Collision.closestPointOnRect(x, y, rect);
    return Utils.dist(x, y, closest.x, closest.y) - radius;
  },

  /** Does a circle overlap this rect? */
  circleRect(x, y, radius, rect) {
    const closest = Collision.closestPointOnRect(x, y, rect);
    return Utils.distSq(x, y, closest.x, closest.y) < radius * radius;
  },

  /** First wall hit by the circle, or null when it is clear. */
  hitAny(x, y, radius, rects) {
    const rSquared = radius * radius;
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      // Cheap reject: bounding-box test before the exact distance test.
      if (x + radius < rect.x || x - radius > rect.x + rect.w) continue;
      if (y + radius < rect.y || y - radius > rect.y + rect.h) continue;
      const closest = Collision.closestPointOnRect(x, y, rect);
      if (Utils.distSq(x, y, closest.x, closest.y) < rSquared) return rect;
    }
    return null;
  },

  /** True when any wall overlaps the circle. */
  hits(x, y, radius, rects) {
    return Collision.hitAny(x, y, radius, rects) !== null;
  },

  /**
   * Nearest wall to a circle.
   * @returns {{distance:number, rect:object|null, dirX:number, dirY:number}}
   *          `distance` is the free space between the circle edge and the
   *          wall surface (negative means the circle is overlapping).
   *          `dirX/dirY` point from the ball towards the wall (unit vector).
   */
  nearestWall(x, y, radius, rects) {
    let bestDistance = Infinity;
    let bestRect = null;
    let bestX = 0;
    let bestY = 0;

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      const closest = Collision.closestPointOnRect(x, y, rect);
      const centreDistance = Utils.dist(x, y, closest.x, closest.y);
      if (centreDistance < bestDistance) {
        bestDistance = centreDistance;
        bestRect = rect;
        bestX = closest.x;
        bestY = closest.y;
      }
    }

    if (!bestRect) return { distance: Infinity, rect: null, dirX: 0, dirY: 0 };

    const surfaceDistance = bestDistance - radius;
    const dx = bestX - x;
    const dy = bestY - y;
    const len = Math.hypot(dx, dy);

    return {
      distance: surfaceDistance,
      rect: bestRect,
      dirX: len > 0.0001 ? dx / len : 0,
      dirY: len > 0.0001 ? dy / len : 0,
    };
  },

  /**
   * Free travel before the circle touches something, along one axis.
   * Used by the brake assist and by the "wall ahead" hint.
   *
   * @param {'up'|'down'|'left'|'right'} direction
   * @returns {number} px of clear space (0 = blocked immediately)
   */
  gapAhead(x, y, radius, rects, direction) {
    let best = Infinity;

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      const right = rect.x + rect.w;
      const bottom = rect.y + rect.h;

      if (direction === 'right') {
        if (y + radius <= rect.y || y - radius >= bottom) continue;
        if (right <= x + radius) continue;
        best = Math.min(best, Math.max(0, rect.x - (x + radius)));
      } else if (direction === 'left') {
        if (y + radius <= rect.y || y - radius >= bottom) continue;
        if (rect.x >= x - radius) continue;
        best = Math.min(best, Math.max(0, x - radius - right));
      } else if (direction === 'down') {
        if (x + radius <= rect.x || x - radius >= right) continue;
        if (bottom <= y + radius) continue;
        best = Math.min(best, Math.max(0, rect.y - (y + radius)));
      } else if (direction === 'up') {
        if (x + radius <= rect.x || x - radius >= right) continue;
        if (rect.y >= y - radius) continue;
        best = Math.min(best, Math.max(0, y - radius - bottom));
      }
    }

    return best === Infinity ? Infinity : best;
  },

  /** Free travel on all four sides at once. */
  gapsAround(x, y, radius, rects) {
    return {
      up: Collision.gapAhead(x, y, radius, rects, 'up'),
      down: Collision.gapAhead(x, y, radius, rects, 'down'),
      left: Collision.gapAhead(x, y, radius, rects, 'left'),
      right: Collision.gapAhead(x, y, radius, rects, 'right'),
    };
  },

  /** Circle vs circle (used for goal detection + particle collisions). */
  circleCircle(x1, y1, r1, x2, y2, r2) {
    const reach = r1 + r2;
    return Utils.distSq(x1, y1, x2, y2) < reach * reach;
  },
};
