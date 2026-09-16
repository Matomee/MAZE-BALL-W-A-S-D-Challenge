/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/levels.js
   ───────────────────────────────────────────────────────────────────────
   The 10 level layouts plus everything the game needs to understand them:

     • parse()      ASCII grid  ->  walls / start / goal / solved path
     • solveFrom()  BFS shortest route (powers demo, hints, "show solution")
     • validate()   structural self-check (also used by tools/validate-levels)

   Grid legend:   '#' wall     ' ' floor     'S' start     'G' goal

   Levels 8, 9 and 10 were generated with tools/generate-levels.js, which
   guarantees a single connected corridor network and a solvable route.
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const Levels = {
  /* ── Level definitions ─────────────────────────────────────────────
     Every `rows` array MUST be 15 strings of exactly 20 characters.
     The border must be solid '#' so the ball can never escape.
     ------------------------------------------------------------------ */
  DEFINITIONS: [
    {
      id: 1,
      name: 'First Steps',
      difficulty: 'Very Easy',
      intent: 'One central block — simply walk around it.',
      rows: [
        '####################',
        '#S                 #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#    ##########    #',
        '#    ##########    #',
        '#    ##########    #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                 G#',
        '####################',
      ],
    },
    {
      id: 2,
      name: 'Corner Turn',
      difficulty: 'Easy',
      intent: 'Three wall bands with gaps — the first real turns.',
      rows: [
        '####################',
        '#S                 #',
        '#                  #',
        '##########     #####',
        '#                  #',
        '#                  #',
        '#####     ##########',
        '#                  #',
        '#                  #',
        '##########     #####',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                 G#',
        '####################',
      ],
    },
    {
      id: 3,
      name: 'Detour',
      difficulty: 'Easy',
      intent: 'More bands and pillars — keep choosing the open lane.',
      rows: [
        '####################',
        '#S                 #',
        '#                  #',
        '##########     #####',
        '#                  #',
        '#     ##     ##    #',
        '#####     ##########',
        '#        ##        #',
        '#                  #',
        '##########     #####',
        '#                  #',
        '#     ##     ##    #',
        '#####     ##########',
        '#                 G#',
        '####################',
      ],
    },
    {
      id: 4,
      name: 'The Corridor',
      difficulty: 'Medium',
      intent: 'First one-cell-high corridors. Line yourself up before you turn.',
      rows: [
        '####################',
        '#S                 #',
        '###########    #####',
        '#                  #',
        '####    ############',
        '#                  #',
        '###########    #####',
        '#                  #',
        '####    ############',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                 G#',
        '####################',
      ],
    },
    {
      id: 5,
      name: 'Switchbacks',
      difficulty: 'Medium',
      intent: 'Vertical walls force an S-shaped route — four sharp reversals.',
      rows: [
        '####################',
        '#S  #       #      #',
        '#   #       #      #',
        '#   #   #   #   #  #',
        '#   #   #   #   #  #',
        '#   #   #   #   #  #',
        '#   #   #   #   #  #',
        '#   #   #   #   #  #',
        '#   #   #   #   #  #',
        '#   #   #   #   #  #',
        '#   #   #   #   #  #',
        '#   #   #   #   #  #',
        '#       #       #  #',
        '#       #       # G#',
        '####################',
      ],
    },
    {
      id: 6,
      name: 'The Long Way',
      difficulty: 'Medium',
      intent: 'A long single corridor — patience beats speed.',
      rows: [
        '####################',
        '#S                 #',
        '###########    #####',
        '#                  #',
        '####    ############',
        '#                  #',
        '###########    #####',
        '#                  #',
        '####    ############',
        '#                  #',
        '###########    #####',
        '#                  #',
        '####    ############',
        '#                 G#',
        '####################',
      ],
    },
    {
      id: 7,
      name: 'Precision',
      difficulty: 'Hard',
      intent: 'Full-height one-cell corridors with dead-end pockets.',
      rows: [
        '####################',
        '#S#   #   #   #    #',
        '# #   #   #   #    #',
        '# # # # # # # # #  #',
        '# # # # # # # # #  #',
        '# # # # # # # # #  #',
        '# # # # # # # # #  #',
        '# # # # # # # # #  #',
        '# # # # # # # # #  #',
        '# # # # # # # # #  #',
        '# # # # # # # # #  #',
        '# # # # # # # # #  #',
        '#   #   #   #   #  #',
        '#   #   #   #   # G#',
        '####################',
      ],
    },
    {
      id: 8,
      name: 'The Labyrinth',
      difficulty: 'Hard',
      intent: 'A dense maze with a dozen dead ends. Read before you roll.',
      rows: [
        '####################',
        '##S  #     #       #',
        '#### # ### # ##### #',
        '## # # # # #     # #',
        '## # # # # ####### #',
        '## #   # #         #',
        '## ##### ######### #',
        '##   #           # #',
        '## ### # ##### ### #',
        '##     # #     #   #',
        '## ##### ### ### ###',
        '##   # #   # #   # #',
        '#### # ### ### ### #',
        '##       #        G#',
        '####################',
      ],
    },
    {
      id: 9,
      name: "Razor's Edge",
      difficulty: 'Very Hard',
      intent: 'The longest forced route — maximum narrow-path precision.',
      rows: [
        '####################',
        '##S  #             #',
        '#### # ########### #',
        '## # #   #       # #',
        '## # ### # ##### # #',
        '## # #   #     # # #',
        '## # # ####### # # #',
        '## # # #       # # #',
        '## # # # ####### # #',
        '##   #     #     # #',
        '## ####### # ##### #',
        '## #     # #   # # #',
        '## ### # ##### # # #',
        '##     #       #  G#',
        '####################',
      ],
    },
    {
      id: 10,
      name: 'The Gauntlet',
      difficulty: 'Extreme',
      intent: 'One corridor, every cell, no second chances.',
      rows: [
        '####################',
        '##S                #',
        '################## #',
        '##               # #',
        '## ############# # #',
        '## #           # # #',
        '## # ######### # # #',
        '## # #      G# # # #',
        '## # # ####### # # #',
        '## # #         # # #',
        '## # ########### # #',
        '## #             # #',
        '## ############### #',
        '##                 #',
        '####################',
      ],
    },
  ],

  /* ── Runtime cache ─────────────────────────────────────────────────── */
  _cache: {},

  /** Number of levels in the game. */
  get count() {
    return this.DEFINITIONS.length;
  },

  /* ── Parsing ───────────────────────────────────────────────────────── */

  /**
   * Turn one raw definition into a runtime level object.
   * The result is cached because it also holds the BFS distance field.
   *
   * @param {object} def entry from DEFINITIONS
   * @returns {{id:number,name:string,difficulty:string,intent:string,
   *            grid:string[],walls:object[],cols:number,rows:number,
   *            start:{x:number,y:number},goal:{x:number,y:number},
   *            startCell:{col:number,row:number},goalCell:{col:number,row:number},
   *            path:{x:number,y:number}[],maxSteps:number,dist:number[][]}}
   */
  parse(def) {
    if (this._cache[def.id]) return this._cache[def.id];

    const grid = def.rows.map((row) => row.split(''));
    const rowCount = grid.length;
    const colCount = grid[0].length;

    let startCell = null;
    let goalCell = null;

    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        const ch = grid[row][col];
        if (ch === 'S') startCell = { col, row };
        else if (ch === 'G') goalCell = { col, row };
      }
    }

    if (!startCell || !goalCell) {
      throw new Error(`Level ${def.id} ("${def.name}") is missing S or G.`);
    }

    const level = {
      id: def.id,
      name: def.name,
      difficulty: def.difficulty,
      intent: def.intent,
      grid: def.rows,
      cols: colCount,
      rows: rowCount,
      walls: Utils.mergeHorizontalRuns(def.rows, Config.CELL),
      startCell,
      goalCell,
      start: {
        x: Config.cellCenterX(startCell.col),
        y: Config.cellCenterY(startCell.row),
      },
      goal: {
        x: Config.cellCenterX(goalCell.col),
        y: Config.cellCenterY(goalCell.row),
      },
    };

    level.dist = Levels._distanceField(level);
    level.path = Levels.solve(level, level.startCell);
    level.maxSteps = level.dist[level.startCell.row][level.startCell.col];
    level.solutionVisible = false;

    this._cache[def.id] = level;
    return level;
  },

  /** Get a parsed level by its 1-based id. */
  get(id) {
    const def = this.DEFINITIONS.find((d) => d.id === id);
    if (!def) throw new Error(`No such level: ${id}`);
    return this.parse(def);
  },

  /** Get a parsed level by 0-based array index. */
  byIndex(index) {
    const safe = Utils.clamp(index, 0, this.count - 1);
    return this.parse(this.DEFINITIONS[safe]);
  },

  /** Parse (and cache) every level. */
  all() {
    return this.DEFINITIONS.map((def) => this.parse(def));
  },

  /* ── Grid helpers ──────────────────────────────────────────────────── */

  isInside(level, col, row) {
    return col >= 0 && col < level.cols && row >= 0 && row < level.rows;
  },

  isFloor(level, col, row) {
    if (!Levels.isInside(level, col, row)) return false;
    return level.grid[row][col] !== '#';
  },

  /** Exact pixel centre of a cell. */
  cellCenter(col, row) {
    return { x: Config.cellCenterX(col), y: Config.cellCenterY(row) };
  },

  /** Nearest grid cell to a pixel position. */
  cellAt(x, y) {
    return {
      col: Utils.clamp(Math.floor(x / Config.CELL), 0, Config.COLS - 1),
      row: Utils.clamp(Math.floor(y / Config.CELL), 0, Config.ROWS - 1),
    };
  },

  /* ── Solving ───────────────────────────────────────────────────────── */

  /**
   * BFS from the goal across every floor cell. Gives the shortest number of
   * steps from any cell to the goal, which is what the hint engine and the
   * demo/solution overlays read.
   */
  _distanceField(level) {
    const dist = Array.from({ length: level.rows }, () =>
      new Array(level.cols).fill(Infinity)
    );

    const { col, row } = level.goalCell;
    dist[row][col] = 0;
    const queue = [{ col, row }];
    let head = 0;

    const steps = [
      { dc: 0, dr: -1 },
      { dc: 0, dr: 1 },
      { dc: -1, dr: 0 },
      { dc: 1, dr: 0 },
    ];

    while (head < queue.length) {
      const current = queue[head++];
      const currentDist = dist[current.row][current.col];
      for (const step of steps) {
        const nc = current.col + step.dc;
        const nr = current.row + step.dr;
        if (!Levels.isFloor(level, nc, nr)) continue;
        if (dist[nr][nc] !== Infinity) continue;
        dist[nr][nc] = currentDist + 1;
        queue.push({ col: nc, row: nr });
      }
    }

    return dist;
  },

  /** True when a floor cell can actually reach the goal. */
  isSolvable(level) {
    const { col, row } = level.startCell;
    return Number.isFinite(level.dist[row][col]);
  },

  /**
   * Greedy descent of the distance field: shortest route from `fromCell`
   * to the goal as a list of pixel-space waypoints (cell centres).
   * Returns [] when the cell cannot reach the goal.
   */
  solve(level, fromCell) {
    const startVal = level.dist[fromCell.row]?.[fromCell.col];
    if (!Number.isFinite(startVal)) return [];

    const path = [];
    let current = { col: fromCell.col, row: fromCell.row };
    path.push(Levels.cellCenter(current.col, current.row));

    const steps = [
      { dc: 0, dr: -1 },
      { dc: 0, dr: 1 },
      { dc: -1, dr: 0 },
      { dc: 1, dr: 0 },
    ];

    let guard = 0;
    const limit = level.rows * level.cols + 4;

    while (level.dist[current.row][current.col] > 0 && guard++ < limit) {
      let best = null;
      let bestDist = level.dist[current.row][current.col];

      for (const step of steps) {
        const nc = current.col + step.dc;
        const nr = current.row + step.dr;
        if (!Levels.isFloor(level, nc, nr)) continue;
        const value = level.dist[nr][nc];
        if (value < bestDist) {
          bestDist = value;
          best = { col: nc, row: nr };
        }
      }

      if (!best) break; // unreachable / malformed data
      current = best;
      path.push(Levels.cellCenter(current.col, current.row));
    }

    return path;
  },

  /**
   * Shortest route from an arbitrary pixel position. The path starts at the
   * exact ball position so the drawn line never "jumps".
   */
  solveFromPoint(level, x, y) {
    const cell = Levels.cellAt(x, y);
    if (!Levels.isFloor(level, cell.col, cell.row)) {
      // Fall back to the closest neighbouring floor cell that can reach the goal.
      let best = null;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nc = cell.col + dc;
          const nr = cell.row + dr;
          if (!Levels.isFloor(level, nc, nr)) continue;
          const value = level.dist[nr][nc];
          if (!Number.isFinite(value)) continue;
          if (!best || value < best.value) best = { col: nc, row: nr, value };
        }
      }
      if (!best) return [];
      return [{ x, y }, ...Levels.solve(level, best)];
    }

    const route = Levels.solve(level, cell);
    if (!route.length) return [];
    return [{ x, y }, ...route];
  },

  /**
   * Direction the solver would take next from a position.
   * @returns {'up'|'down'|'left'|'right'|null}
   */
  directionFromPoint(level, x, y) {
    const cell = Levels.cellAt(x, y);
    if (!Levels.isFloor(level, cell.col, cell.row)) return null;

    let bestDist = level.dist[cell.row][cell.col];
    if (!Number.isFinite(bestDist)) return null;

    const options = [
      { dir: 'up', dc: 0, dr: -1 },
      { dir: 'down', dc: 0, dr: 1 },
      { dir: 'left', dc: -1, dr: 0 },
      { dir: 'right', dc: 1, dr: 0 },
    ];

    let bestDir = null;
    for (const option of options) {
      const nc = cell.col + option.dc;
      const nr = cell.row + option.dr;
      if (!Levels.isFloor(level, nc, nr)) continue;
      const value = level.dist[nr][nc];
      if (value < bestDist) {
        bestDist = value;
        bestDir = option.dir;
      }
    }
    return bestDir;
  },

  /** Which of the 4 sides of a cell are open (used by hints + validation). */
  openSides(level, col, row) {
    return {
      up: Levels.isFloor(level, col, row - 1),
      down: Levels.isFloor(level, col, row + 1),
      left: Levels.isFloor(level, col - 1, row),
      right: Levels.isFloor(level, col + 1, row),
    };
  },

  /* ── Validation ────────────────────────────────────────────────────── */

  /**
   * Structural check of every definition.
   * @returns {{level:number,name:string,errors:string[],warnings:string[]}[]}
   */
  validate() {
    const report = [];

    for (const def of this.DEFINITIONS) {
      const errors = [];
      const warnings = [];

      if (!Array.isArray(def.rows) || def.rows.length !== Config.ROWS) {
        errors.push(`expected ${Config.ROWS} rows, got ${def.rows ? def.rows.length : 0}`);
        report.push({ level: def.id, name: def.name, errors, warnings });
        continue;
      }

      const widths = new Set(def.rows.map((r) => r.length));
      if (widths.size !== 1 || !widths.has(Config.COLS)) {
        errors.push(
          `all rows must be ${Config.COLS} chars wide (found widths: ${[...widths].join(', ')})`
        );
      }

      // Border must be solid.
      let borderOk = true;
      for (let i = 0; i < Config.COLS; i++) {
        if (def.rows[0][i] !== '#' || def.rows[Config.ROWS - 1][i] !== '#') borderOk = false;
      }
      for (let i = 0; i < Config.ROWS; i++) {
        if (def.rows[i][0] !== '#' || def.rows[i][Config.COLS - 1] !== '#') borderOk = false;
      }
      if (!borderOk) errors.push('border is not fully solid (#)');

      // Legal characters only.
      const illegal = new Set();
      for (const row of def.rows) {
        for (const ch of row) if (!'# SG'.includes(ch)) illegal.add(ch);
      }
      if (illegal.size) errors.push(`illegal characters: ${[...illegal].join(' ')}`);

      // Exactly one start and one goal.
      const flat = def.rows.join('');
      const startCount = (flat.match(/S/g) || []).length;
      const goalCount = (flat.match(/G/g) || []).length;
      if (startCount !== 1) errors.push(`expected exactly one S (found ${startCount})`);
      if (goalCount !== 1) errors.push(`expected exactly one G (found ${goalCount})`);

      if (errors.length) {
        report.push({ level: def.id, name: def.name, errors, warnings });
        continue;
      }

      const level = this.parse(def);

      if (!Levels.isSolvable(level)) {
        errors.push('goal is unreachable from the start (BFS found no route)');
      }

      // Every floor cell should be reachable from the start (no sealed pockets).
      const startDist = level.dist[level.startCell.row][level.startCell.col];
      const reachable = Levels._reachableCount(level, level.startCell);
      let floorCount = 0;
      for (let r = 0; r < level.rows; r++) {
        for (let c = 0; c < level.cols; c++) if (level.grid[r][c] !== '#') floorCount++;
      }
      if (reachable !== floorCount) {
        warnings.push(
          `${floorCount - reachable} floor cell(s) cannot be reached from the start`
        );
      }

      if (!Number.isFinite(startDist)) {
        errors.push('start has no route to the goal');
      }

      // The ball must fit: a ball wider than a corridor is unplayable.
      const minCorridor = Levels._minCorridorWidth(level);
      const ballDiameter = Config.BALL_RADIUS * 2;
      if (minCorridor < ballDiameter) {
        errors.push(
          `corridor too narrow for the ball (${minCorridor}px < ${ballDiameter}px)`
        );
      } else if (minCorridor - ballDiameter < 4) {
        warnings.push(`ball clearance is very tight (${minCorridor - ballDiameter}px)`);
      }

      // Start / goal must not already be touching a wall.
      if (Levels._touchesWall(level, level.start)) {
        errors.push('ball starts already overlapping a wall');
      }
      if (Levels._touchesWall(level, level.goal)) {
        warnings.push('goal centre overlaps a wall by the ball radius');
      }

      // The solved path must stay clear of walls (fail-safe demo).
      const clearance = Levels._minPathClearance(level);
      if (clearance !== null && clearance < Config.BALL_RADIUS) {
        errors.push(
          `solved path clips a wall (clearance ${clearance.toFixed(1)}px < radius ${Config.BALL_RADIUS}px)`
        );
      }

      report.push({
        level: def.id,
        name: def.name,
        errors,
        warnings,
        steps: level.maxSteps,
        walls: level.walls.length,
      });
    }

    return report;
  },

  _reachableCount(level, fromCell) {
    const seen = new Set();
    const queue = [fromCell];
    seen.add(fromCell.row * level.cols + fromCell.col);
    let head = 0;
    const steps = [
      { dc: 0, dr: -1 },
      { dc: 0, dr: 1 },
      { dc: -1, dr: 0 },
      { dc: 1, dr: 0 },
    ];
    while (head < queue.length) {
      const current = queue[head++];
      for (const step of steps) {
        const nc = current.col + step.dc;
        const nr = current.row + step.dr;
        if (!Levels.isFloor(level, nc, nr)) continue;
        const key = nr * level.cols + nc;
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push({ col: nc, row: nr });
      }
    }
    return seen.size;
  },

  /** Narrowest horizontal corridor in px (a run of floor rows). */
  _minCorridorWidth(level) {
    let minCells = Infinity;
    for (let row = 0; row < level.rows; row++) {
      let run = 0;
      for (let col = 0; col < level.cols; col++) {
        if (level.grid[row][col] === '#') {
          if (run > 0 && run < minCells) minCells = run;
          run = 0;
        } else {
          run++;
        }
      }
      if (run > 0 && run < minCells) minCells = run;
    }
    return minCells === Infinity ? 0 : minCells * Config.CELL;
  },

  _touchesWall(level, point) {
    const r = Config.BALL_RADIUS;
    const probe = { x: point.x - r, y: point.y - r, w: r * 2, h: r * 2 };
    return level.walls.some(
      (wall) =>
        probe.x < wall.x + wall.w &&
        probe.x + probe.w > wall.x &&
        probe.y < wall.y + wall.h &&
        probe.y + probe.h > wall.y
    );
  },

  /** Smallest gap between the solved path and any wall (px). */
  _minPathClearance(level) {
    if (!level.path || level.path.length < 2) return null;
    let min = Infinity;

    for (let i = 1; i < level.path.length; i++) {
      const a = level.path[i - 1];
      const b = level.path[i];
      // Sample the segment; the path is axis-aligned so 8 samples is plenty.
      for (let s = 0; s <= 8; s++) {
        const t = s / 8;
        const x = Utils.lerp(a.x, b.x, t);
        const y = Utils.lerp(a.y, b.y, t);
        for (const wall of level.walls) {
          const cx = Utils.clamp(x, wall.x, wall.x + wall.w);
          const cy = Utils.clamp(y, wall.y, wall.y + wall.h);
          const d = Utils.dist(x, y, cx, cy);
          if (d < min) min = d;
        }
      }
    }

    return min === Infinity ? null : min;
  },
};
