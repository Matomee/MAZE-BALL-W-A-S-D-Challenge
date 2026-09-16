/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/ui.js
   ───────────────────────────────────────────────────────────────────────
   Two jobs, kept deliberately separate from the simulation:

     1. DOM   — HUD, overlays/modals, hint panel, level grid, toasts.
                Values are only written when they actually change, so no
                per-frame layout thrash.
     2. FX    — canvas feedback: screen shake, flash, confetti + sparks.
                game.js drives it; this file owns the maths.

   Overlays behave like a small stack, so nested navigation works:
   menu -> settings -> "Back" returns to the menu.
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const UI = {
  el: {},
  overlayIds: [
    'startScreen',
    'tutorialScreen',
    'menuScreen',
    'levelsScreen',
    'settingsScreen',
    'howtoScreen',
    'successScreen',
    'failScreen',
    'completeScreen',
  ],
  stack: [],
  toastTimer: 0,
  keyElements: {},

  /* ── Setup ─────────────────────────────────────────────────────────── */

  init() {
    const ids = [
      'gameCanvas',
      'canvasWrap',
      'canvasShade',
      'levelIndicator',
      'progressFill',
      'timeDisplay',
      'attemptsDisplay',
      'hintText',
      'hintSub',
      'btnSound',
      'btnMenu',
      'btnStart',
      'btnTutorialStart',
      'btnDemoStart',
      'btnDemoPause',
      'btnDemoStop',
      'btnSolution',
      'menuResume',
      'menuRestart',
      'menuDemo',
      'menuClose',
      'levelsClose',
      'levelGrid',
      'settingsClose',
      'settingsReset',
      'settingSound',
      'settingHints',
      'settingSpeed',
      'howtoClose',
      'successTime',
      'successAttempts',
      'btnNext',
      'btnShowSolution',
      'btnSuccessMenu',
      'failHint',
      'btnRetry',
      'btnFailMenu',
      'completeTime',
      'completeAttempts',
      'btnPlayAgain',
      'btnCompleteMenu',
      'toast',
      'dpad',
    ];

    for (const id of ids) this.el[id] = Utils.$(id);
    for (const id of this.overlayIds) this.el[id] = Utils.$(id);

    for (const dir of ['up', 'down', 'left', 'right']) {
      const suffix = { up: 'w', down: 's', left: 'a', right: 'd' }[dir];
      this.keyElements[dir] = Array.from(
        document.querySelectorAll(
          `.controls-card .key-${suffix}, .mini-wasd .key-${suffix}`
        )
      );
    }

    this.speedButtons = Array.from(
      document.querySelectorAll('#settingSpeed button[data-speed]')
    );

    const missing = Object.keys(this.el).filter((key) => !this.el[key]);
    if (missing.length) Utils.warn('Missing DOM elements:', missing.join(', '));
  },

  /* ── Overlay stack ─────────────────────────────────────────────────── */

  show(id) {
    const node = this.el[id];
    if (node) node.classList.remove('hidden');
  },

  hide(id) {
    const node = this.el[id];
    if (node) node.classList.add('hidden');
  },

  current() {
    return this.stack.length ? this.stack[this.stack.length - 1] : null;
  },

  /** Open an overlay on top of whatever is showing. */
  push(id) {
    if (this.current() === id) return;
    const top = this.current();
    if (top) this.hide(top);
    this.stack.push(id);
    this.show(id);
  },

  /** Close the top overlay and reveal the one underneath (if any). */
  pop() {
    const top = this.stack.pop();
    if (top) this.hide(top);
    const next = this.current();
    if (next) this.show(next);
    return next || null;
  },

  /** Close every overlay (used when a level starts). */
  closeAll() {
    while (this.stack.length) this.hide(this.stack.pop());
  },

  isOpen(id) {
    return this.stack.includes(id);
  },

  /* ── HUD ───────────────────────────────────────────────────────────── */

  setLevelIndicator(levelNumber, total) {
    Utils.setText(this.el.levelIndicator, `LEVEL ${levelNumber} / ${total}`);
  },

  /** @param {number} fraction 0..1 */
  setProgress(fraction) {
    const percent = Utils.clamp(fraction, 0, 1) * 100;
    Utils.setStyle(this.el.progressFill, 'width', `${percent.toFixed(1)}%`);
  },

  setTime(ms) {
    Utils.setText(this.el.timeDisplay, Utils.formatTime(ms));
  },

  setAttempts(count) {
    Utils.setText(this.el.attemptsDisplay, String(count));
  },

  setHint(text, sub) {
    Utils.setText(this.el.hintText, text);
    Utils.setText(this.el.hintSub, sub || '');
  },

  setKeyActive(direction, on) {
    const nodes = this.keyElements[direction];
    if (!nodes) return;
    for (const node of nodes) node.classList.toggle('active', !!on);
  },

  clearKeys() {
    for (const direction of ['up', 'down', 'left', 'right']) {
      this.setKeyActive(direction, false);
    }
  },

  setSoundIcon(on) {
    const button = this.el.btnSound;
    if (!button) return;
    Utils.setText(button, on ? '🔊' : '🔇');
    button.classList.toggle('muted-icon', !on);
    button.setAttribute('title', on ? 'Sound on' : 'Sound off');
  },

  setSwitch(which, on) {
    const node = which === 'sound' ? this.el.settingSound : this.el.settingHints;
    if (node) node.setAttribute('aria-checked', on ? 'true' : 'false');
  },

  setSpeedSegment(speedName) {
    for (const button of this.speedButtons) {
      button.classList.toggle('active', button.dataset.speed === speedName);
    }
  },

  /**
   * Enable/disable the demo bar buttons for the current mode.
   * @param {{active:boolean, paused:boolean, solution:boolean}} state
   */
  setDemoControls(state) {
    const start = this.el.btnDemoStart;
    const pause = this.el.btnDemoPause;
    const stop = this.el.btnDemoStop;
    const solution = this.el.btnSolution;

    if (start) start.disabled = state.active;
    if (pause) {
      pause.disabled = !state.active;
      Utils.setText(pause, state.paused ? '▶ Resume' : '⏸ Pause');
    }
    if (stop) stop.disabled = !state.active;
    if (solution) Utils.setText(solution, state.solution ? '🚫 Hide Path' : '🛣 Solution');
  },

  /* ── Level select ──────────────────────────────────────────────────── */

  buildLevelGrid(onPick) {
    const grid = this.el.levelGrid;
    if (!grid) return;
    grid.innerHTML = '';

    for (let id = 1; id <= Config.TOTAL_LEVELS; id++) {
      const button = document.createElement('button');
      button.className = 'level-cell';
      button.dataset.level = String(id);
      button.type = 'button';
      button.textContent = String(id);

      const check = document.createElement('span');
      check.className = 'check';
      check.textContent = '✓';
      check.style.display = 'none';
      button.appendChild(check);

      button.addEventListener('click', () => {
        if (button.classList.contains('locked')) {
          AudioFX.play('blocked');
          this.toast(`Level ${id} is still locked — finish level ${id - 1} first.`);
          return;
        }
        AudioFX.play('click');
        onPick(id);
      });

      grid.appendChild(button);
    }
  },

  refreshLevelGrid(currentLevel, isUnlocked, isCompleted) {
    const grid = this.el.levelGrid;
    if (!grid) return;
    for (const button of grid.querySelectorAll('.level-cell')) {
      const id = Number(button.dataset.level);
      const locked = !isUnlocked(id);
      const done = isCompleted(id);

      button.classList.toggle('locked', locked);
      button.classList.toggle('done', done && !locked);
      button.classList.toggle('current', id === currentLevel);

      const check = button.querySelector('.check');
      if (check) check.style.display = done && !locked ? 'block' : 'none';

      button.title = locked ? `Level ${id} — locked` : `Level ${id}`;
    }
  },

  /* ── Result cards ──────────────────────────────────────────────────── */

  setSuccessStats(timeMs, attempts) {
    Utils.setText(this.el.successTime, Utils.formatSeconds(timeMs));
    Utils.setText(this.el.successAttempts, String(attempts));
  },

  setCompleteStats(timeMs, attempts) {
    Utils.setText(this.el.completeTime, Utils.formatClock(timeMs));
    Utils.setText(this.el.completeAttempts, String(attempts));
  },

  setFailHint(text) {
    Utils.setText(this.el.failHint, text);
  },

  /* ── Toast ─────────────────────────────────────────────────────────── */

  toast(message, ms) {
    const node = this.el.toast;
    if (!node) return;
    Utils.setText(node, message);
    node.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(
      () => node.classList.remove('show'),
      ms || 2200
    );
  },

  /* ═════════════════════════════════════════════════════════════════════
     FX — canvas feedback layer (shake, flash, particles)
     ═════════════════════════════════════════════════════════════════ */

  FX: {
    particles: [],
    shakeMagnitude: 0,
    shakeX: 0,
    shakeY: 0,
    flashAlpha: 0,
    flashColor: '#fb7185',
    MAX_PARTICLES: 260,

    reset() {
      this.particles.length = 0;
      this.shakeMagnitude = 0;
      this.shakeX = 0;
      this.shakeY = 0;
      this.flashAlpha = 0;
    },

    /** Screen shake, scaled by magnitude in px. */
    shake(magnitude) {
      this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
    },

    /** Full-screen colour flash (alpha 0..1). */
    flash(color, alpha) {
      this.flashColor = color;
      this.flashAlpha = Math.max(this.flashAlpha, alpha);
    },

    /**
     * Spawn particles.
     * @param {object} options
     */
    burst(x, y, options) {
      const {
        count = 18,
        colors = ['#22d3ee', '#e879f9', '#fbbf24', '#34d399'],
        speed = 160,
        spread = Math.PI * 2,
        angle = 0,
        life = 0.8,
        size = 4,
        gravity = 260,
        drag = 0.86,
        shape = 'spark',
        upwardBias = 0,
      } = options || {};

      for (let i = 0; i < count; i++) {
        if (this.particles.length >= this.MAX_PARTICLES) break;

        const direction = angle + (Math.random() - 0.5) * spread;
        const velocity = speed * Utils.rand(0.45, 1.15);

        this.particles.push({
          x,
          y,
          vx: Math.cos(direction) * velocity,
          vy: Math.sin(direction) * velocity - upwardBias,
          life: 0,
          maxLife: life * Utils.rand(0.7, 1.25),
          size: size * Utils.rand(0.7, 1.4),
          color: Utils.pick(colors),
          gravity,
          drag,
          shape,
          rotation: Utils.rand(0, Math.PI * 2),
          spin: Utils.rand(-10, 10),
        });
      }
    },

    /** Celebration confetti (level complete / game complete). */
    confetti(x, y, count) {
      this.burst(x, y, {
        count: count || 60,
        colors: ['#22d3ee', '#e879f9', '#fbbf24', '#34d399', '#fb7185'],
        speed: 260,
        spread: Math.PI * 2,
        life: 1.5,
        size: 6,
        gravity: 420,
        drag: 0.9,
        shape: 'confetti',
        upwardBias: 90,
      });
    },

    update(dt) {
      /* Shake decay */
      if (this.shakeMagnitude > 0.05) {
        this.shakeMagnitude *= Math.pow(0.0015, dt);
        const angle = Math.random() * Math.PI * 2;
        this.shakeX = Math.cos(angle) * this.shakeMagnitude;
        this.shakeY = Math.sin(angle) * this.shakeMagnitude;
      } else {
        this.shakeMagnitude = 0;
        this.shakeX = 0;
        this.shakeY = 0;
      }

      /* Flash decay */
      if (this.flashAlpha > 0.002) {
        this.flashAlpha *= Math.pow(0.0009, dt);
      } else {
        this.flashAlpha = 0;
      }

      /* Particles */
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          this.particles.splice(i, 1);
          continue;
        }
        const damping = Math.pow(p.drag, dt * 60);
        p.vx *= damping;
        p.vy = p.vy * damping + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.spin * dt;
      }
    },

    /** Canvas translation for the current shake. */
    offset() {
      return { x: this.shakeX, y: this.shakeY };
    },

    /** Draw the colour flash (call inside the world transform). */
    drawFlash(ctx) {
      if (this.flashAlpha <= 0.002) return;
      ctx.save();
      ctx.globalAlpha = Utils.clamp(this.flashAlpha, 0, 0.85);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, Config.WORLD_W, Config.WORLD_H);
      ctx.restore();
    },

    drawParticles(ctx) {
      for (const p of this.particles) {
        const progress = p.life / p.maxLife;
        const alpha = 1 - progress * progress;
        ctx.save();
        ctx.globalAlpha = Utils.clamp(alpha, 0, 1);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.shape === 'confetti') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    },
  },
};
