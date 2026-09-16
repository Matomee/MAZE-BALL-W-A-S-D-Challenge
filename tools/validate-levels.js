#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — tools/validate-levels.js
   ───────────────────────────────────────────────────────────────────────
   Headless validation LANCHER for the level data AND the core physics,
   run from Node (no browser needed):

     node tools/validate-levels.js

   Checks performed per level:
     1. 15 rows × 20 chars, solid border, one S, one G, legal chars
     2. goal reachable from start (BFS)
     3. every floor cell reachable (no sealed pockets)
     4. solved path never clips a wall (fail-safe demo)
     5. ball spawn point is clear of walls
     6. end-to-end: a simulated player following the solved route reaches
        the goal without touching a wall (real Player/Collision code paths)

   Exits with code 1 when anything fails (useful for CI).
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/config.js', 'js/utils.js', 'js/levels.js', 'js/collision.js', 'js/player.js', 'js/demo.js'];

/** Load the classic <script> modules into a shared function scope. */
function loadModules() {
  const sources = FILES.map((file) => fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const factory = new Function(
    sources.join('\n;\n') +
      '\n;return { Config, Utils, Levels, Collision, Player, Demo };'
  );
  return factory();
}

/* ── Command-line report helpers ─────────────────────────────────────── */

function pad(value, width) {
  value = String(value);
  return value.padEnd(width);
}

function main() {
  const { Config, Utils, Levels, Collision, Player, Demo } = loadModules();

  const levels = Levels.all();
  const report = Levels.validate();
  const failures = [];
  let warnings = 0;
  const table = [];

  for (const entry of report) {
    const row = {
      id: entry.level,
      name: entry.name,
      errors: (entry.errors || []).slice(),
      warnings: (entry.warnings || []).slice(),
      steps: entry.steps,
      walls: entry.walls,
    };

    if (row.errors.length) failures.push(row);

    // Headless physics simulation: steer the ball along the solved path.
    const sim = simulateLevel(Levels.get(entry.level), Player, Collision, Config, Utils);
    if (!sim.passed) {
      failures.push({ ...row, sim });
    }
    row.sim = sim.passed ? 'ok' : `FAIL (${sim.reason})`;
    warnings += (entry.warnings || []).length;

    table.push(row);
  }

  /* Plain text table */
  console.log('');
  console.log('  MAZE BALL — level validation');
  console.log('  ' + '-'.repeat(76));
  console.log(
    '  ' +
      pad('ID', 4) +
      pad('NAME', 20) +
      pad('STEPS', 8) +
      pad('WALLS', 8) +
      pad('SIM', 12) +
      pad('ERRORS', 10) +
      'WARNINGS'
  );
  console.log('  ' + '-'.repeat(76));

  for (const row of table) {
    console.log(
      '  ' +
        pad(row.id, 4) +
        pad(row.name, 20) +
        pad(row.steps ?? '-', 8) +
        pad(row.walls, 8) +
        pad(row.sim, 12) +
        pad(row.errors.length || '-', 10) +
        (row.errors.length ? row.errors.join('; ') : row.warnings.length || '-')
    );
  }

  console.log('  ' + '-'.repeat(76));
  console.log(
    `  Levels: ${table.length} | failures: ${failures.length} | warnings: ${warnings}`
  );

  if (failures.length) {
    console.log('\n  Failures:');
    for (const failure of failures) {
      console.log(`    • L${failure.id} ${failure.name}`);
      for (const error of failure.errors) console.log(`        - ${error}`);
      if (failure.sim) {
        const simDetail =
          typeof failure.sim === 'object' ? failure.sim.reason : failure.sim;
        console.log(`        - simulation: ${simDetail}`);
      }
    }
    process.exitCode = 1;
  } else {
    console.log('\n  All levels validated OK ✅');
  }
}

/**
 * Follow the solved path: each game-tick the axis points straight at the
 * next waypoint until the ball is ~2px away, then advance. Uses the real
 * Player.update / Collision code, so it exercises sub-stepping, the brake
 * assist and goal detection.
 */
function simulateLevel(level, Player, Collision, Config, Utils) {
  Player.resetTo(level);
  let targetIndex = 0;
  const path = level.path;
  const maxTicks = Math.ceil((level.maxSteps * 40 + 200) / (Config.SPEED / 60)) * 3;
  let ticks = 0;

  while (ticks < maxTicks) {
    ticks++;

    const result = Player.update(1 / 60, level, axisToward(Player, path[targetIndex]));
    if (result.hit) {
      return { passed: false, reason: `touched a wall on tick ${ticks}` };
    }
    if (Player.reachedGoal(level)) {
      return { passed: true };
    }
    if (targetIndex < path.length - 1) {
      const target = path[targetIndex];
      const dist = Utils.dist(Player.x, Player.y, target.x, target.y);
      // Advance once the ball is inside one frame of the waypoint (the ball
      // moves about SPEED/60 px per tick and would otherwise oscillate).
      if (dist < Config.SPEED / 60 + 1.5) targetIndex++;
    }
  }

  return {
    passed: false,
    reason: `did not reach the goal after ${maxTicks} ticks (at ${ticks})`,
  };
}

function axisToward(player, target) {
  if (!target) return { x: 0, y: 0 };
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  return {
    x: Math.abs(dx) > 1.5 ? Math.sign(dx) : 0,
    y: Math.abs(dy) > 1.5 ? Math.sign(dy) : 0,
  };
}

main();