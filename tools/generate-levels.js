#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — level generator (development tool, not shipped to the game)
   ═══════════════════════════════════════════════════════════════════════

   Generates guaranteed-solvable ASCII mazes that fit the game grid
   (20 columns x 15 rows) with 1-cell wide corridors.

   Usage:
     node tools/generate-levels.js              # print a report + 3 candidates
     node tools/generate-levels.js --seed 42    # single maze from one seed
     node tools/generate-levels.js --spiral     # print the L10 spiral

   ─────────────────────────────────────────────────────────────────────
   LATTICE MODEL
   ─────────────────────────────────────────────────────────────────────
   Corridor cells sit on odd rows and even columns:

       rows : 1, 3, 5, 7, 9, 11, 13          ->  7 cell rows
       cols : 2, 4, 6, 8, 10, 12, 14, 16, 18 ->  9 cell cols

   Everything else in the playable area (even rows / odd cols) is a wall.
   A maze is built by *carving* the single wall cell that sits between two
   neighbouring lattice cells, which is exactly how the BFS solver in
   js/levels.js walks the maze. Corridors are therefore always 1 cell wide
   and every floor cell is reachable from every other floor cell.

   '#' wall    ' ' floor    'S' start    'G' goal
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const GRID_W = 20;
const GRID_H = 15;

/** Grid rows that hold walkable cells. */
const CELL_ROWS = [1, 3, 5, 7, 9, 11, 13];
/** Grid columns that hold walkable cells. */
const CELL_COLS = [2, 4, 6, 8, 10, 12, 14, 16, 18];

const ROWS = CELL_ROWS.length; // 7
const COLS = CELL_COLS.length; // 9

/** Lattice coordinates of the start / goal (top-left and bottom-right). */
const START_CELL = { r: 0, c: 0 };
const GOAL_CELL = { r: ROWS - 1, c: COLS - 1 };

/* ── deterministic RNG ───────────────────────────────────────────────── */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, rnd) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/* ── grid helpers ────────────────────────────────────────────────────── */

/** Wall-only grid with the lattice cells punched out as floor. */
function makeGrid() {
  const grid = [];
  for (let y = 0; y < GRID_H; y++) {
    grid.push(new Array(GRID_W).fill('#'));
  }
  for (const r of CELL_ROWS) {
    for (const c of CELL_COLS) grid[r][c] = ' ';
  }
  return grid;
}

/**
 * Remove the wall between two neighbouring lattice cells.
 * Vertical neighbours  -> wall cell is at (even row, even col)
 * Horizontal neighbours-> wall cell is at (odd row, odd col)
 */
function carve(grid, r1, c1, r2, c2) {
  const wallRow = (CELL_ROWS[r1] + CELL_ROWS[r2]) / 2;
  const wallCol = (CELL_COLS[c1] + CELL_COLS[c2]) / 2;
  grid[wallRow][wallCol] = ' ';
}

function cellNeighbours(r, c) {
  return [
    { r: r - 1, c },
    { r: r + 1, c },
    { r, c: c - 1 },
    { r, c: c + 1 },
  ].filter((n) => n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS);
}

/** Number of carved openings around a lattice cell (1 === dead end). */
function openness(grid, r, c) {
  let open = 0;
  for (const n of cellNeighbours(r, c)) {
    const wallRow = (CELL_ROWS[r] + CELL_ROWS[n.r]) / 2;
    const wallCol = (CELL_COLS[c] + CELL_COLS[n.c]) / 2;
    if (grid[wallRow][wallCol] !== '#') open++;
  }
  return open;
}

/* ── maze generation (iterative randomised DFS = perfect maze) ───────── */

function generateMaze(seed) {
  const rnd = mulberry32(seed);
  const grid = makeGrid();
  const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));

  const stack = [START_CELL];
  visited[START_CELL.r][START_CELL.c] = true;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const options = shuffled(
      cellNeighbours(cur.r, cur.c).filter((n) => !visited[n.r][n.c]),
      rnd
    );

    if (!options.length) {
      stack.pop();
      continue;
    }

    const next = options[0];
    carve(grid, cur.r, cur.c, next.r, next.c);
    visited[next.r][next.c] = true;
    stack.push(next);
  }

  return grid;
}

/* ── spiral generation (Hamiltonian path over every cell) ────────────── */

/**
 * Walks the lattice inwards as a rectangular spiral. The result is a single
 * continuous corridor that visits every cell exactly once and ends at the
 * middle of the board - the ultimate precision gauntlet.
 */
function generateSpiral() {
  const grid = makeGrid();
  const order = [];

  let top = 0;
  let bottom = ROWS - 1;
  let left = 0;
  let right = COLS - 1;

  const visit = (r, c) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const last = order[order.length - 1];
    if (last && last.r === r && last.c === c) return;
    order.push({ r, c });
  };

  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) visit(top, c);
    top++;
    for (let r = top; r <= bottom; r++) visit(r, right);
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) visit(bottom, c);
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) visit(r, left);
      left++;
    }
  }

  for (let i = 1; i < order.length; i++) {
    carve(grid, order[i - 1].r, order[i - 1].c, order[i].r, order[i].c);
  }

  return { grid, order };
}

/* ── solver (BFS over the *grid*, same rules as js/levels.js) ────────── */

function solve(grid, from, to) {
  const key = (c, r) => r * GRID_W + c;
  const dist = new Map();
  const prev = new Map();
  const queue = [from];
  dist.set(key(from.c, from.r), 0);

  const dirs = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
  ];

  while (queue.length) {
    const cur = queue.shift();
    if (cur.c === to.c && cur.r === to.r) break;
    for (const d of dirs) {
      const nc = cur.c + d.dc;
      const nr = cur.r + d.dr;
      if (nc < 0 || nc >= GRID_W || nr < 0 || nr >= GRID_H) continue;
      if (grid[nr][nc] === '#') continue;
      const k = key(nc, nr);
      if (dist.has(k)) continue;
      dist.set(k, dist.get(key(cur.c, cur.r)) + 1);
      prev.set(k, cur);
      queue.push({ r: nr, c: nc });
    }
  }

  const goalKey = key(to.c, to.r);
  if (!dist.has(goalKey)) return { reachable: false, length: 0, path: [] };

  const path = [];
  let node = { r: to.r, c: to.c };
  while (node) {
    path.push(node);
    node = prev.get(key(node.c, node.r));
  }
  path.reverse();

  return { reachable: true, length: dist.get(goalKey), path };
}

function analyse(grid, goalCell) {
  const target = goalCell || GOAL_CELL;
  const start = { r: CELL_ROWS[START_CELL.r], c: CELL_COLS[START_CELL.c] };
  const goal = { r: CELL_ROWS[target.r], c: CELL_COLS[target.c] };
  const sol = solve(grid, start, goal);

  let deadEnds = 0;
  let floors = 0;
  for (let r = 0; r < GRID_H; r++) {
    for (let c = 0; c < GRID_W; c++) {
      if (grid[r][c] === '#') continue;
      floors++;
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (openness(grid, r, c) === 1) deadEnds++;
    }
  }

  return { reachable: sol.reachable, steps: sol.length, path: sol.path, floors, deadEnds };
}

/* ── rendering ───────────────────────────────────────────────────────── */

function toAscii(grid, startCell, goalCell) {
  const rows = grid.map((row) => row.slice());
  rows[CELL_ROWS[startCell.r]][CELL_COLS[startCell.c]] = 'S';
  rows[CELL_ROWS[goalCell.r]][CELL_COLS[goalCell.c]] = 'G';
  return rows.map((row) => row.join(''));
}

function toJsLines(rows) {
  return rows
    .map((row) => `      "${row.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}",`)
    .join('\n');
}

function printCandidate(title, rows, info) {
  console.log(`\n\u2500\u2500 ${title} \u2500\u2500`);
  console.log(`   solution: ${info.steps} steps | floor cells: ${info.floors} | dead ends: ${info.deadEnds}`);
  console.log('');
  for (const row of rows) console.log(`   ${row}`);
  console.log('');
  console.log('   JS:');
  console.log(toJsLines(rows));
}

/* ── CLI ─────────────────────────────────────────────────────────────── */

function main() {
  const args = process.argv.slice(2);
  const seedFlag = args.indexOf('--seed');

  if (args.includes('--spiral')) {
    const { grid, order } = generateSpiral();
    const endCell = order[order.length - 1];
    const rows = toAscii(grid, START_CELL, endCell);
    const info = analyse(grid, endCell);
    printCandidate(`SPIRAL (visits all ${order.length} cells)`, rows, info);
    return;
  }

  if (seedFlag !== -1) {
    const seed = Number(args[seedFlag + 1]) || 1;
    const grid = generateMaze(seed);
    const rows = toAscii(grid, START_CELL, GOAL_CELL);
    printCandidate(`seed ${seed}`, rows, analyse(grid));
    return;
  }

  /* Sweep seeds and report the best candidate for each difficulty goal. */
  let bestLongest = null; // level 9: longest forced route
  let bestBalanced = null; // level 8: many dead ends, medium route
  let bestGauntlet = null; // level 10: brutal - long route AND many dead ends

  for (let seed = 1; seed <= 400; seed++) {
    const grid = generateMaze(seed);
    const info = analyse(grid);
    if (!info.reachable) continue;

    if (!bestLongest || info.steps > bestLongest.info.steps) {
      bestLongest = { seed, grid, info };
    }

    const balance = info.deadEnds * 100 - Math.abs(info.steps - 30);
    if (!bestBalanced || balance > bestBalanced.balance) {
      bestBalanced = { seed, grid, info, balance };
    }

    const gauntlet = info.steps * 4 + info.deadEnds * 10;
    if (!bestGauntlet || gauntlet > bestGauntlet.gauntlet) {
      bestGauntlet = { seed, grid, info, gauntlet };
    }
  }

  if (bestBalanced) {
    printCandidate(
      `L8 "The Labyrinth" - seed ${bestBalanced.seed}`,
      toAscii(bestBalanced.grid, START_CELL, GOAL_CELL),
      bestBalanced.info
    );
  }
  if (bestLongest) {
    printCandidate(
      `L9 "Razor's Edge" - seed ${bestLongest.seed}`,
      toAscii(bestLongest.grid, START_CELL, GOAL_CELL),
      bestLongest.info
    );
  }
  if (bestGauntlet) {
    printCandidate(
      `L10 alternative - seed ${bestGauntlet.seed}`,
      toAscii(bestGauntlet.grid, START_CELL, GOAL_CELL),
      bestGauntlet.info
    );
  }

  const spiral = generateSpiral();
  const lastCell = spiral.order[spiral.order.length - 1];
  printCandidate(
    'L10 "The Gauntlet" - full spiral',
    toAscii(spiral.grid, START_CELL, lastCell),
    analyse(spiral.grid, lastCell)
  );
}

main();
