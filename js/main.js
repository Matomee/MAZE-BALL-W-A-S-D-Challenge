/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/main.js
   ───────────────────────────────────────────────────────────────────────
   Bootstrap + wiring. Loaded LAST.

   Jobs:
     1. wire every overlay button / link to Game + UI
     2. apply persisted settings
     3. expose a small debug console (window.MazeBall) including a
        selfTest() that runs + reports the core invariants
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const Main = {
  /** DOMContentLoaded guard: scripts are deferred, but be safe anyway. */
  ready() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.boot());
    } else {
      this.boot();
    }
  },

  boot() {
    // -- Initialisation order matters (matches script order in index.html) --
    // Config, Utils, Levels, Collision, Player, Hints, Demo are already
    // defined as globals by their own <script> tags.

    // Storage & settings first.
    Storage.load();
    AudioFX.setEnabled(Storage.get('sound') !== false);
    UI.init();
    Input.init();
    Game.init();

    // Route non-movement keys into Game.
    Input.onKeyDownHook = (event) => Game.handleGlobalKey(event);

    // Keep the whole app clickable without leaving focus on buttons, so
    // Space/Enter don't re-trigger them later.
    document.querySelectorAll('button, .level-cell, [role="switch"]').forEach((node) => {
      node.addEventListener('click', () => {
        if (node.blur) node.blur();
      });
    });

    this.wireOverlays();
    this.wireTopbar();
    this.wireDemoBar();
    this.wireSettings();
    this.wireVisibility();
    this.wireMiscButtons();

    // Refresh level grid once with real data (build already happened in Game.init).
    Game._refreshLevelGrid();

    // First paint.
    UI.push('startScreen');
    Utils.log('MAZE BALL boot complete.');
  },

  /* ── Topbar ────────────────────────────────────────────────────────── */

  wireTopbar() {
    Utils.$('btnSound').addEventListener('click', () => {
      const sound = !Storage.get('sound');
      Storage.setSetting('sound', sound);
      AudioFX.setEnabled(sound);
      UI.setSoundIcon(sound);
      UI.setSwitch('sound', sound);
      AudioFX.play('click');
    });

    Utils.$('btnMenu').addEventListener('click', () => {
      AudioFX.play('click');
      Game.openMenu();
    });
  },

  /* ── Overlays / navigation ─────────────────────────────────────────── */

  wireOverlays() {
    const click = (id, handler) => {
      const node = Utils.$(id);
      if (node) node.addEventListener('click', handler);
    };

    const openScreen = (id) => {
      AudioFX.play('click');
      UI.push(id);
    };

    /* Start screen */
    click('btnStart', () => {
      AudioFX.play('start');
      Game.startGame();
    });

    click('btnTutorialStart', () => {
      Storage.markTutorialSeen();
      AudioFX.play('start');
      Game.startLevel(0, { showTutorial: false });
    });

    /* Generic [data-screen] links (start screen + main menu).
     The HTML data attributes use short names (howto/levels/settings) while
     the overlay elements are named *Screen; translate before pushing. */
    const SCREEN_IDS = {
      howto: 'howtoScreen',
      levels: 'levelsScreen',
      settings: 'settingsScreen',
    };
    document.querySelectorAll('[data-screen]').forEach((node) => {
      node.addEventListener('click', () => {
        AudioFX.play('click');
        UI.push(SCREEN_IDS[node.dataset.screen] || node.dataset.screen);
      });
    });

    /* Menu */
    click('menuResume', () => {
      Game.resume();
    });
    click('menuRestart', () => {
      UI.closeAll();
      Game.startLevel(Game.levelIndex);
    });
    click('menuDemo', () => {
      UI.closeAll();
      Game.startDemo();
    });
    click('menuClose', () => {
      if (UI.current() === 'menuScreen') UI.pop();
      if (Game.state === Config.STATE.PAUSED) Game.resume();
      else if (Game.state === Config.STATE.IDLE) UI.push('startScreen');
    });

    /* Level select */
    click('levelsClose', () => UI.pop());

    /* Settings */
    click('settingsClose', () => UI.pop());
    click('settingsReset', () => {
      const confirmed = window.confirm(
        'Reset all progress and settings? This cannot be undone.'
      );
      if (!confirmed) return;
      Storage.resetAll();
      UI.setSwitch('sound', true);
      UI.setSwitch('hints', true);
      UI.setSpeedSegment('normal');
      AudioFX.setEnabled(true);
      UI.setSoundIcon(true);
      UI.toast('Progress reset.', 1800);
      Game._refreshLevelGrid();
    });

    /* How to play */
    click('howtoClose', () => UI.pop());

    /* Success */
    click('btnNext', () => Game.nextLevel());
    click('btnShowSolution', () => {
      UI.closeAll();
      Game.startDemo();
    });
    click('btnSuccessMenu', () => {
      Game.toStart();
    });

    /* Fail */
    click('btnRetry', () => Game.retry());
    click('btnFailMenu', () => {
      Game.toStart();
    });

    /* Complete */
    click('btnPlayAgain', () => Game.playAgain());
    click('btnCompleteMenu', () => Game.toStart());
  },

  /* ── Demo bar ──────────────────────────────────────────────────────── */

  wireDemoBar() {
    Utils.$('btnDemoStart').addEventListener('click', () => Game.startDemo());
    Utils.$('btnDemoPause').addEventListener('click', () => {
      if (Demo.active && Demo.paused) Game.resumeDemo();
      else if (Demo.active) Game.pauseDemo();
    });
    Utils.$('btnDemoStop').addEventListener('click', () => {
      UI.closeAll();
      Game.stopDemo();
      Game.state = Config.STATE.PLAYING;
      Game.pausedFrom = Config.STATE.PLAYING;
    });
    Utils.$('btnSolution').addEventListener('click', () => Game.toggleSolution());
  },

  /* ── Settings panel ────────────────────────────────────────────────── */

  wireSettings() {
    const soundSwitch = Utils.$('settingSound');
    soundSwitch.addEventListener('click', () => {
      const sound = soundSwitch.getAttribute('aria-checked') !== 'true';
      Storage.setSetting('sound', sound);
      AudioFX.setEnabled(sound);
      UI.setSoundIcon(sound);
      UI.setSwitch('sound', sound);
      AudioFX.play('click');
    });

    const hintsSwitch = Utils.$('settingHints');
    hintsSwitch.addEventListener('click', () => {
      const hints = hintsSwitch.getAttribute('aria-checked') !== 'true';
      Storage.setSetting('hints', hints);
      UI.setSwitch('hints', hints);
      AudioFX.play('click');
      Game._updateHint(performance.now());
    });

    const speedButtons = document.querySelectorAll('#settingSpeed button[data-speed]');
    speedButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const speed = button.dataset.speed;
        Storage.setSetting('demoSpeed', speed);
        UI.setSpeedSegment(speed);
        if (Demo.active) Demo.setSpeed(speed);
        AudioFX.play('click');
      });
    });
  },

  /* ── Robustness ────────────────────────────────────────────────────── */

  wireVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (Game.state === Config.STATE.PLAYING || Game.state === Config.STATE.DEMO)) {
        Game.openMenu();
      }
    });

    const resize = () => {
      // The canvas is sized every frame in Game._render(); nothing else to do.
    };
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
  },

  wireMiscButtons() {
    // D-pad highlight feedback (optional nicety).
    Input.onDpadHook = (dir, down) => {
      UI.setKeyActive(dir, down);
    };
  },
};

/* ── Debug API (used for testing) ────────────────────────────────────── */

/**
 * window.MazeBall — handy while developing / testing in the console.
 *   MazeBall.selfTest()      -> runs assertions, returns a report object
 *   MazeBall.game / .levels  -> direct access to important modules
 */
function exposeDebugApi() {
  const api = {
    Game,
    Levels,
    Player,
    Demo,
    Input,
    Storage,
    AudioFX,
    config: Config,
    Utils,

    /** Run through the core invariants and print a readable report. */
    selfTest() {
      const report = { ok: true, checks: [], errors: [] };

      const check = (name, pass, detail) => {
        const entry = { name, pass: !!pass, detail: detail || '' };
        report.checks.push(entry);
        if (!entry.pass) {
          report.ok = false;
          report.errors.push(`${name}: ${entry.detail}`);
        }
      };

      // 1. Level definitions are structurally valid + solvable.
      const levelReport = Levels.validate();
      const badLevels = levelReport.filter((r) => r.errors.length);
      check(
        '10 levels, all structurally valid',
        badLevels.length === 0,
        badLevels.length ? JSON.stringify(badLevels.map((b) => b.errors)) : ''
      );
      for (const r of levelReport) {
        if (r.steps !== undefined) check(`${r.name}: solution of ${r.steps} steps`, r.steps > 0, '');
      }

      // 2. The solved path keeps the ball clear of walls (fail-safe demo).
      let pathOk = true;
      for (const level of Levels.all()) {
        if (level.path.length < 2) pathOk = false;
        for (let i = 1; i < level.path.length; i++) {
          const a = level.path[i - 1];
          const b = level.path[i];
          for (let s = 0; s <= 4; s++) {
            const t = s / 4;
            const x = Utils.lerp(a.x, b.x, t);
            const y = Utils.lerp(a.y, b.y, t);
            if (Collision.hits(x, y, Config.BALL_RADIUS, level.walls)) pathOk = false;
          }
        }
      }
      check('solution paths never touch walls', pathOk, '');

      // 3. Collision math sanity.
      const box = { x: 100, y: 100, w: 40, h: 40 };
      check(
        'circle-rect overlap detection',
        !Collision.circleRect(50, 50, 10, box) && Collision.circleRect(120, 120, 10, box),
        ''
      );

      // 4. Movement cannot teleport through a wall in one frame.
      check(
        'sub-step prevents tunnelling',
        Config.SUBSTEP < Config.BALL_RADIUS * 0.5,
        `SUBSTEP=${Config.SUBSTEP} must stay below half the ball radius`
      );

      // 5. Time formatter sanities.
      check('formatTime pads correctly', Utils.formatTime(18420) === '00:18.42', Utils.formatTime(18420));
      check('formatClock compact', Utils.formatClock(184000) === '3:04', Utils.formatClock(184000));

      // 6. Demo controller can actually finish a route.
      const demoRun = this._demoRunCheck();
      check('demo completes every route', demoRun, '');

      // 7. Grid merge sanity: even the densest level should use far fewer rects
      // than the raw 300 cells it replaces.
      const wallCounts = Levels.all().map((l) => l.walls.length);
      const tooMany = wallCounts.some((n) => n > 250);
      check(
        'merged wall counts stay far below raw cell count (300)',
        !tooMany,
        `counts: ${wallCounts.join(', ')}`
      );

      console.groupCollapsed('[MazeBall] selfTest report');
      for (const entry of report.checks) {
        console.log(`${entry.pass ? '✔' : '✘'} ${entry.name}${entry.detail ? ' — ' + entry.detail : ''}`);
      }
      if (report.errors.length) console.error('Failures:', report.errors);
      console.groupEnd();

      if (report.ok) console.log('[MazeBall] All self-tests passed ✅');
      else console.error('[MazeBall] self-tests FAILED ❌');

      return report;
    },

    _demoRunCheck() {
      const originalStart = Demo.start;
      let allOk = true;
      // Demo needs an AudioContext-agnostic path: it only reads level.path,
      // so we can run it headlessly without touching the DOM.
      const backupPause = Demo.pause;
      for (const level of Levels.all()) {
        if (!Demo.start(level, 'fast')) {
          allOk = false;
          continue;
        }
        Demo.setSpeed(999);
        let guard = 0;
        while (!Demo.finished && guard++ < 10_000) {
          const result = Demo.update(1 / 30);
          if (Collision.hits(result.x, result.y, Config.BALL_RADIUS, level.walls)) {
            allOk = false;
            break;
          }
        }
        if (!Demo.finished) allOk = false;
        Demo.stop();
      }
      return allOk;
    },
  };

  window.MazeBall = api;
  return api;
}

/* ── Boot ────────────────────────────────────────────────────────────── */

// Play a soft click immediately if the user interacted before DOM ready.
window.addEventListener(
  'pointerdown',
  () => AudioFX.unlock(),
  { once: true, passive: true }
);

window.addEventListener(
  'error',
  (event) => {
    // Keep the game from silently dying: surface serious errors.
    console.error('[MazeBall] Uncaught error:', event.error || event.message);
  },
  false
);

Main.ready();
exposeDebugApi();