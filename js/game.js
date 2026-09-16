/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/game.js
   ───────────────────────────────────────────────────────────────────────
   The game master.

     • owns the state machine (idle / playing / paused / demo / success /
       failed / complete)
     • runs the single requestAnimationFrame loop (update + render)
     • resolves wall hits (FAIL) and goal overlaps (SUCCESS)
     • drives the demo controller, hint engine and canvas FX

   Simulation only runs in `playing` and `demo`; everything else renders
   (overlays suspend the update step but the canvas keeps drawing behind
   them, per ARCHITECTURE.md §5).
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const Game = {
  /* ── State ─────────────────────────────────────────────────────────── */
  state: Config.STATE.IDLE,
  levelIndex: 0, // 0-based index into Levels.DEFINITIONS
  level: null, // parsed level object
  attempts: 0, // wall hits on the current level
  elapsedMs: 0, // current run timer
  lastHitSide: null, // direction the ball was moving when it failed
  solutionVisible: false,
  lastDemoDir: null,
  demoProgress: 0,

  /* ── Loop / canvas ─────────────────────────────────────────────────── */
  rafId: 0,
  lastTs: 0,
  running: false,
  canvas: null,
  ctx: null,
  dpr: window.devicePixelRatio || 1,
  transform: {},
  hudSyncAt: 0,
  hintAt: 0,
  lastHintText: '',
  blockedToneAt: 0,

  /* ── Init ──────────────────────────────────────────────────────────── */

  init() {
    this.canvas = Utils.$('gameCanvas');
    if (!this.canvas) throw new Error('Canvas not found.');
    this.ctx = this.canvas.getContext('2d');

    // Pre-warm the level cache + pick the starting level.
    Levels.all();
    const settings = Storage.getSettings();
    this.levelIndex = this._firstIncompleteIndex();
    this.level = Levels.byIndex(this.levelIndex);
    Player.resetTo(this.level);

    // UI scaffolding that only depends on stable data.
    UI.setLevelIndicator(this.levelIndex + 1, Config.TOTAL_LEVELS);
    UI.setProgress(this.progressFraction());
    UI.setTime(0);
    UI.setAttempts(0);
    UI.setSoundIcon(Storage.get('sound'));
    UI.setSwitch('sound', Storage.get('sound'));
    UI.setSwitch('hints', Storage.get('hints'));
    UI.setSpeedSegment(Storage.get('demoSpeed'));
    UI.buildLevelGrid((id) => this.selectLevel(id));

    Hints.reset();
    this.lastTs = 0;
    this.running = true;
    this.rafId = requestAnimationFrame((ts) => this.loop(ts));
    this.ready = true;
    Utils.log('Game initialised.');
  },

  /** Index of the first level that is not yet completed. */
  _firstIncompleteIndex() {
    for (let i = 0; i < Config.TOTAL_LEVELS; i++) {
      if (!Storage.isCompleted(i + 1)) return i;
    }
    return 0;
  },

  /* ── Entry points (called by main.js / overlays) ───────────────────── */

  /** "▶ START GAME" — begin at the first unfinished level. */
  startGame() {
    AudioFX.unlock();
    const firstIncomplete = this._firstIncompleteIndex();
    this.startLevel(firstIncomplete, { showTutorial: true });
  },

  /** Start (or restart) a level by 0-based index. */
  startLevel(index, options = {}) {
    this.levelIndex = Utils.clamp(index, 0, Config.TOTAL_LEVELS - 1);
    this.level = Levels.byIndex(this.levelIndex);
    this.attempts = 0;
    this.elapsedMs = 0;
    this.lastHitSide = null;
    this.solutionVisible = false;
    this.level.solutionVisible = false;
    this.level.solutionPath = null;
    this.demoProgress = 0;
    this.hintAt = 0;
    this.lastHintText = '';
    Demo.stop();

    Player.resetTo(this.level);
    Hints.reset();
    UI.FX.reset();
    UI.closeAll();
    UI.clearKeys();

    // First-ever start: show the animated tutorial before level 1.
    const showTutorial =
      options.showTutorial !== false && !Storage.hasSeenTutorial();

    if (showTutorial && this.levelIndex === 0) {
      UI.closeAll();
      UI.push('tutorialScreen');
      this.state = Config.STATE.IDLE;
    } else {
      this.state = Config.STATE.PLAYING;
      AudioFX.play('start');
      UI.toast(
        this.levelIndex === 0 ? 'Hold W A S or D to roll. Reach 🎯.' : this.level.intent,
        2400
      );
    }

    this._syncHUD();
    this._refreshLevelGrid();
    this.ready = true;
  },

  /** "↻ RETRY" — replay the same level. */
  retry() {
    this.state = Config.STATE.PLAYING;
    this.elapsedMs = 0;
    this.solutionVisible = false;
    this.level.solutionVisible = false;
    this.level.solutionPath = null;
    Demo.stop();
    Player.resetTo(this.level);
    Hints.reset();
    UI.FX.reset();
    UI.closeAll();
    UI.setDemoControls({ active: false, paused: false, solution: false });
    AudioFX.play('start');
    this._syncHUD();
  },

  /** "NEXT LEVEL →" */
  nextLevel() {
    if (this.levelIndex + 1 >= Config.TOTAL_LEVELS) {
      this.showComplete();
    } else {
      this.startLevel(this.levelIndex + 1);
    }
  },

  /** "↻ PLAY AGAIN" on the complete screen. */
  playAgain() {
    this.levelIndex = 0;
    this.startLevel(0);
  },

  /** Pick a level from the level-select grid (1-based id). */
  selectLevel(id) {
    UI.closeAll();
    this.startLevel(id - 1);
  },

  /** Return to the start screen (idle). */
  toStart() {
    this.stopDemo();
    this.state = Config.STATE.IDLE;
    this.solutionVisible = false;
    if (this.level) this.level.solutionVisible = false;
    // Keep the level they were on rendered behind the start screen.
    UI.closeAll();
    UI.push('startScreen');
    Input.clear();
    this._gainFocus();
  },

  /* ── Win / lose ────────────────────────────────────────────────────── */

  onWallHit() {
    this.attempts += 1;
    this.lastHitSide = this._hitSide();

    AudioFX.play('crash');
    UI.FX.flash(Config.COLORS.danger, 0.5);
    UI.FX.shake(8);
    UI.FX.burst(Player.x, Player.y, {
      count: 20,
      colors: ['#fb7185', '#f87171', '#fda4af'],
      speed: 210,
      life: 0.7,
      shape: 'spark',
    });

    this.state = Config.STATE.FAILED;
    Player.resetTo(this.level);
    this._syncHUD();

    const snap = this.snapshot();
    UI.setFailHint(Hints.failHint(snap));
    UI.setAttempts(this.attempts);

    UI.push('failScreen');
  },

  onGoalReached() {
    const level = this.level;
    const settings = Storage.getSettings();

    AudioFX.play('goal');
    UI.FX.confetti(level.goal.x, level.goal.y, 80);
    UI.FX.flash(Config.COLORS.success, 0.18);

    // Record progress once.
    const record = Storage.recordCompletion(level.id, this.elapsedMs, this.attempts);

    if (record.unlockedNext) {
      AudioFX.play('unlock');
      UI.toast(`Level ${level.id + 1} unlocked!`, 1800);
    }

    if (level.id >= Config.TOTAL_LEVELS) {
      AudioFX.play('complete');
      UI.FX.confetti(Config.WORLD_W / 2, Config.WORLD_H / 2, 120);
      this.showComplete();
      return;
    }

    this.state = Config.STATE.SUCCESS;
    UI.closeAll();
    UI.push('successScreen');
    UI.setSuccessStats(this.elapsedMs, this.attempts);
    UI.setDemoControls({ active: false, paused: false, solution: false });
    this._refreshLevelGrid();
  },

  showComplete() {
    this.state = Config.STATE.COMPLETE;
    const totals = Storage.totals();
    UI.closeAll();
    UI.push('completeScreen');
    UI.setCompleteStats(totals.totalTimeMs, totals.totalAttempts);
    this._refreshLevelGrid();
  },

  _hitSide() {
    const dir = Player.direction();
    if (!dir.x && !dir.y) return null;
    if (Math.abs(dir.x) > Math.abs(dir.y)) return dir.x > 0 ? 'right' : 'left';
    return dir.y > 0 ? 'down' : 'up';
  },

  /* ── Pause / menu ──────────────────────────────────────────────────── */

  openMenu() {
    // Suspend whatever is running so "Resume" can bring it back.
    if (this.state === Config.STATE.PLAYING || this.state === Config.STATE.DEMO) {
      this.pausedFrom = this.state;
      this.state = Config.STATE.PAUSED;
    }
    Input.clear();
    UI.push('menuScreen');
    this._syncHUD();
  },

  resume() {
    UI.closeAll();
    if (this.state === Config.STATE.IDLE) {
      // Menu was opened from the start screen -> begin the game.
      this.startGame();
      return;
    }
    if (this.pausedFrom === Config.STATE.DEMO) {
      this.resumeDemo();
    } else {
      this.state = Config.STATE.PLAYING;
      UI.setDemoControls({ active: false, paused: false, solution: this.solutionVisible });
    }
    this._gainFocus();
  },

  pause() {
    if (this.state === Config.STATE.PLAYING || this.state === Config.STATE.DEMO) {
      this.pausedFrom = this.state;
      this.state = Config.STATE.PAUSED;
    }
  },

  /* ── Demo / solution ───────────────────────────────────────────────── */

  startDemo() {
    if (!this.level) return;
    AudioFX.unlock();
    UI.closeAll();

    // Make sure the ball is at the start so the demo plays the whole route.
    Player.resetTo(this.level);
    const settings = Storage.getSettings();
    if (!Demo.start(this.level, settings.demoSpeed)) {
      UI.toast('No route found for this level.', 2200);
      this.state = Config.STATE.PLAYING;
      UI.setDemoControls({ active: false, paused: false, solution: false });
      return;
    }

    this.state = Config.STATE.DEMO;
    Demo.paused = false;
    AudioFX.play('demo');
    UI.setDemoControls({ active: true, paused: false, solution: this.solutionVisible });
    this._syncHUD();
  },

  pauseDemo() {
    if (this.state !== Config.STATE.DEMO) return;
    Demo.pause();
    UI.setDemoControls({ active: true, paused: true, solution: this.solutionVisible });
  },

  resumeDemo() {
    if (this.state !== Config.STATE.DEMO && this.state !== Config.STATE.PAUSED) return;
    UI.closeAll();
    Demo.resume();
    this.state = Config.STATE.DEMO;
    UI.setDemoControls({ active: true, paused: false, solution: this.solutionVisible });
  },

  stopDemo() {
    const wasDemo = this.state === Config.STATE.DEMO;
    Demo.stop();
    this.demoProgress = 0;
    if (this.level) Player.resetTo(this.level);
    if (wasDemo || this.state === Config.STATE.PAUSED) {
      this.state = Config.STATE.PLAYING;
    }
    if (this.level) this.level.solutionVisible = this.solutionVisible;
    UI.setDemoControls({ active: false, paused: false, solution: this.solutionVisible });
  },

  toggleSolution() {
    this.solutionVisible = !this.solutionVisible;
    if (this.level) this.level.solutionVisible = this.solutionVisible;
    if (this.solutionVisible) {
      this.level.solutionPath = Levels.solveFromPoint(this.level, Player.x, Player.y);
      AudioFX.play('hint');
    } else {
      this.level.solutionPath = null;
    }
    UI.setDemoControls({ active: Demo.active && !Demo.paused, paused: !!Demo.paused, solution: this.solutionVisible });
  },

  onDemoFinished() {
    AudioFX.play('goal');
    UI.FX.confetti(Player.x, Player.y, 50);
    UI.toast('Demo complete — now you try!', 2200);
    Demo.stop();
    this.demoProgress = 0;
    Player.resetTo(this.level);
    this.state = Config.STATE.PLAYING;
    this.pausedFrom = Config.STATE.PLAYING;
    UI.setDemoControls({ active: false, paused: false, solution: this.solutionVisible });
  },

  /* ── Loop ──────────────────────────────────────────────────────────── */

  loop(ts) {
    if (!this.running) return;
    this.rafId = requestAnimationFrame((t) => this.loop(t));

    if (!this.lastTs) this.lastTs = ts;
    let dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    if (dt > Config.MAX_DT) dt = Config.MAX_DT;
    if (dt <= 0) dt = 1 / 1000;

    this._update(dt, ts);
    this._render();
  },

  _update(dt, ts) {
    UI.FX.update(dt);

    if (this.state === Config.STATE.PLAYING) {
      Hints.tickIdle(dt, Input.isAnyDown() || Player.moving);

      const result = Player.update(dt, this.level, Input.axis);

      if (result.hit) {
        this.onWallHit();
      } else if (Player.reachedGoal(this.level)) {
        this.onGoalReached();
      } else {
        this.elapsedMs += dt * 1000;
        if (!this.level.solutionVisible || !this.level.solutionPath) {
          // keep invalidation cheap: nothing to do
        }
        this._blockedTone();
      }

      this._updateHint(ts);
      this._syncHUD();

    } else if (this.state === Config.STATE.DEMO) {
      const demoResult = Demo.update(dt);
      Player.setPosition(demoResult.x, demoResult.y);
      this._pushTrail(demoResult.x, demoResult.y);
      this.demoProgress = Demo.progress();

      if (demoResult.justArrived) {
        AudioFX.play('goal');
        UI.FX.confetti(Player.x, Player.y, 40);
      }

      if (demoResult.done) {
        this.onDemoFinished();
      }
    }

    // Idle/others: only FX runs (particles keep animating after success).
  },

  /** Push a trail point (used by the demo so it leaves a trail too). */
  _pushTrail(x, y) {
    const last = Player.trail[Player.trail.length - 1];
    if (!last || Utils.dist(last.x, last.y, x, y) >= Config.TRAIL_MIN_DIST) {
      Player.trail.push({ x, y });
      if (Player.trail.length > Config.TRAIL_MAX) Player.trail.shift();
    }
  },

  _blockedTone() {
    const now = performance.now();
    if (now - this.blockedToneAt < 280) return;
    // Only when pressing directly into a wall that is basically touching.
    const gaps = Player.gaps(this.level);
    const pressed = Input.axis;
    let blocked = false;
    if (pressed.x > 0 && gaps.right < 3) blocked = true;
    if (pressed.x < 0 && gaps.left < 3) blocked = true;
    if (pressed.y > 0 && gaps.down < 3) blocked = true;
    if (pressed.y < 0 && gaps.up < 3) blocked = true;
    if (blocked) {
      this.blockedToneAt = now;
      AudioFX.play('blocked');
    }
  },

  _updateHint(ts) {
    const settings = Storage.getSettings();
    if (!settings.hints) {
      UI.setHint('Hints are turned off in Settings.', '');
      return;
    }
    const hint = Hints.update(this.snapshot(), ts);
    if (hint) {
      UI.setHint(hint.text, hint.sub);
      this.lastHintText = hint.text;
      AudioFX.play('hint');
    }
  },

  /* ── Snapshot for the hint engine ──────────────────────────────────── */

  snapshot() {
    const gaps = Player.gaps(this.level);
    const sides = { up: gaps.up, down: gaps.down, left: gaps.left, right: gaps.right };

    let blocked = null;
    if (Input.axis.x > 0.5 && sides.right < 2) blocked = { side: 'right', gap: sides.right };
    else if (Input.axis.x < -0.5 && sides.left < 2) blocked = { side: 'left', gap: sides.left };
    else if (Input.axis.y > 0.5 && sides.down < 2) blocked = { side: 'down', gap: sides.down };
    else if (Input.axis.y < -0.5 && sides.up < 2) blocked = { side: 'up', gap: sides.up };

    let nearestGap = Infinity;
    for (const key of Object.keys(sides)) nearestGap = Math.min(nearestGap, sides[key]);

    return {
      state: this.state,
      level: this.level,
      player: Player,
      attempts: this.attempts,
      elapsedMs: this.elapsedMs,
      hintsEnabled: Storage.get('hints') !== false,
      travelling: (Math.abs(Input.axis.x) + Math.abs(Input.axis.y)) > 0,
      axis: Input.axis,
      gaps: sides,
      blocked,
      nearestGap,
      pathDirection: Levels.directionFromPoint(this.level, Player.x, Player.y),
      lastHitSide: this.lastHitSide,
      distanceToGoal: Player.distanceToGoal(this.level),
    };
  },

  /* ── HUD helpers ───────────────────────────────────────────────────── */

  _syncHUD() {
    if (!this.level) return;
    UI.setLevelIndicator(this.level.id, Config.TOTAL_LEVELS);
    UI.setProgress(this.progressFraction());
    UI.setTime(this.elapsedMs);
    UI.setAttempts(this.attempts);
  },

  progressFraction() {
    const completed = Storage.completedCount();
    const current = this.level ? this.level.id - 1 : 0;
    const deepest = Math.max(completed, current);
    return Utils.clamp(deepest / Config.TOTAL_LEVELS, 0, 1);
  },

  _refreshLevelGrid() {
    UI.refreshLevelGrid(
      this.level ? this.level.id : 1,
      (id) => Storage.isUnlocked(id),
      (id) => Storage.isCompleted(id)
    );
  },

  _gainFocus() {
    // Move focus off any button so Space/Enter can drive the game.
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  },

  /* ── Rendering ─────────────────────────────────────────────────────── */

  _render() {
    const canvas = this.canvas;
    const ctx = this.ctx;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW < 4 || cssH < 4) return;

    const dpr = this.dpr;
    const pixelW = Math.max(1, Math.round(cssW * dpr));
    const pixelH = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0f1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Fit the 800x600 world into the canvas, preserving aspect ratio.
    const scale = Math.min(cssW / Config.WORLD_W, cssH / Config.WORLD_H);
    const offsetX = (cssW - Config.WORLD_W * scale) / 2;
    const offsetY = (cssH - Config.WORLD_H * scale) / 2;
    const shake = UI.FX.offset();

    ctx.setTransform(
      dpr * scale,
      0,
      0,
      dpr * scale,
      dpr * (offsetX + shake.x),
      dpr * (offsetY + shake.y)
    );

    // Each layer writes in canvas units width its own coordinate system.
    this._drawFloor(ctx);
    this._drawStart(ctx);
    this._drawGoal(ctx);
    this._drawWalls(ctx);
    this._drawSolution(ctx);
    this._drawTrail(ctx);
    this._drawBall(ctx);
    UI.FX.drawParticles(ctx);
    UI.FX.drawFlash(ctx);
  },

  _drawFloor(ctx) {
    ctx.save();
    // Base fill
    ctx.fillStyle = Config.COLORS.floor;
    ctx.fillRect(0, 0, Config.WORLD_W, Config.WORLD_H);

    // Subtle checkerboard + faint grid lines.
    ctx.fillStyle = Config.COLORS.floorAlt;
    for (let row = 0; row < Config.ROWS; row++) {
      for (let col = 0; col < Config.COLS; col++) {
        if ((row + col) % 2 === 0) continue;
        ctx.fillRect(col * Config.CELL, row * Config.CELL, Config.CELL, Config.CELL);
      }
    }
    ctx.strokeStyle = Config.COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = 1; col < Config.COLS; col++) {
      ctx.moveTo(col * Config.CELL, 0);
      ctx.lineTo(col * Config.CELL, Config.WORLD_H);
    }
    for (let row = 1; row < Config.ROWS; row++) {
      ctx.moveTo(0, row * Config.CELL);
      ctx.lineTo(Config.WORLD_W, row * Config.CELL);
    }
    ctx.stroke();
    ctx.restore();
  },

  _drawStart(ctx) {
    const { x, y } = this.level.start;
    ctx.save();
    const glow = 0.5 + 0.5 * Math.sin(performance.now() / 500);
    ctx.globalAlpha = 0.25 + 0.2 * glow;
    ctx.fillStyle = Config.COLORS.start;
    ctx.beginPath();
    ctx.arc(x, y, Config.BALL_RADIUS + 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.9;
    ctx.font = '700 10px Orbitron, sans-serif';
    ctx.fillStyle = Config.COLORS.start;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', x, y);
    ctx.restore();
  },

  _drawGoal(ctx) {
    const { x, y } = this.level.goal;
    const t = performance.now() / 1000;
    const pulse = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / (Config.GOAL_PULSE_MS / 1000));

    ctx.save();

    // Soft ambience ring.
    const outer = Config.GOAL_RADIUS + 6 + 3 * pulse;
    ctx.globalAlpha = 0.18 + 0.1 * pulse;
    ctx.fillStyle = Config.COLORS.goal;
    ctx.beginPath();
    ctx.arc(x, y, outer, 0, Math.PI * 2);
    ctx.fill();

    // Rotating dashed ring.
    const dashRotation = t * 1.8;
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = Config.COLORS.goalRing;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -dashRotation * 8;
    ctx.beginPath();
    ctx.arc(x, y, Config.GOAL_RADIUS + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Core disc.
    const coreR = Config.GOAL_RADIUS * (0.72 + 0.28 * pulse);
    const gradient = ctx.createRadialGradient(x, y, 1, x, y, coreR);
    gradient.addColorStop(0, '#fff7cc');
    gradient.addColorStop(0.4, Config.COLORS.goal);
    gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, coreR, 0, Math.PI * 2);
    ctx.fill();

    // Small solid dot.
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(x, y, Config.BALL_RADIUS * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  _drawWalls(ctx) {
    ctx.save();
    for (const wall of this.level.walls) {
      ctx.fillStyle = Config.COLORS.wall;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

      // Light top edge (3D feel) + dark inner border.
      ctx.fillStyle = Config.COLORS.wallTop;
      ctx.fillRect(wall.x, wall.y, wall.w, 2);
      ctx.fillStyle = Config.COLORS.wallEdge;
      ctx.fillRect(wall.x, wall.y + wall.h - 2, wall.w, 2);
      ctx.fillRect(wall.x, wall.y, 1, wall.h);
      ctx.fillRect(wall.x + wall.w - 1, wall.y, 1, wall.h);
    }

    // Soft cyan under-glow along wall seams (cheap: single pass).
    ctx.strokeStyle = Config.COLORS.wallGlow;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const wall of this.level.walls) {
      ctx.moveTo(wall.x, wall.y);
      ctx.lineTo(wall.x + wall.w, wall.y);
    }
    ctx.stroke();
    ctx.restore();
  },

  _drawSolution(ctx) {
    let path = this.level.solutionPath;
    if (!path || path.length < 2) {
      // In demo mode, always show the (remaining) route as a guide.
      if (this.state === Config.STATE.DEMO && Demo.path.length > 2) {
        path = Demo.path;
      } else {
        return;
      }
    }
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = Config.COLORS.solution;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 8]);
    ctx.shadowColor = Config.COLORS.solutionGlow;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    ctx.restore();
  },

  _drawTrail(ctx) {
    const trail = Player.trail;
    if (trail.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const max = Config.TRAIL_MAX;
    for (let i = 1; i < trail.length; i++) {
      const alpha = (i / max) * 0.7;
      const width = 1 + (i / max) * 4;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `rgba(${Config.COLORS.trail}, 1)`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  },

  _drawBall(ctx) {
    const r = Player.r;
    const x = Player.x;
    const y = Player.y;
    ctx.save();

    ctx.shadowColor = Config.COLORS.ballGlow;
    ctx.shadowBlur = 18;

    const gradient = ctx.createRadialGradient(
      x - r * 0.35,
      y - r * 0.4,
      1,
      x,
      y,
      r
    );
    gradient.addColorStop(0, Config.COLORS.ballCore);
    gradient.addColorStop(0.45, Config.COLORS.ball);
    gradient.addColorStop(1, Config.COLORS.ballDeep);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight.
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.45, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  /* ── Global keys ───────────────────────────────────────────────────── */

  handleGlobalKey(event) {
    const code = event.code;

    // Escape / M toggles the menu; from nested overlays it walks back.
    if (code === 'Escape' || code === 'KeyM') {
      event.preventDefault();
      const overlay = UI.current();
      if (overlay === 'menuScreen') {
        UI.pop();
        if (this.state === Config.STATE.PAUSED) this.resume();
      } else if (overlay === 'tutorialScreen') {
        Storage.markTutorialSeen();
        UI.closeAll();
        this.startLevel(0, { showTutorial: false });
      } else if (overlay && ['levelsScreen', 'settingsScreen', 'howtoScreen'].includes(overlay)) {
        UI.pop();
      } else if (overlay && ['successScreen', 'failScreen', 'completeScreen'].includes(overlay)) {
        UI.closeAll();
        this.openMenu();
      } else if (this.state === Config.STATE.PLAYING || this.state === Config.STATE.DEMO) {
        this.openMenu();
      }
      return;
    }

    // Space = open the pause menu during play.
    if (code === 'Space') {
      event.preventDefault();
      if (this.state === Config.STATE.PLAYING && !UI.current()) {
        this.openMenu();
      }
      return;
    }

    // R = retry.
    if (code === 'KeyR' && (this.state === Config.STATE.PLAYING || this.state === Config.STATE.FAILED)) {
      if (this.state === Config.STATE.FAILED) UI.closeAll();
      this.retry();
      return;
    }

    // Enter = start the game from the start screen.
    if (code === 'Enter' && this.state === Config.STATE.IDLE) {
      AudioFX.play('click');
      this.startGame();
      return;
    }
  },
};