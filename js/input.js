/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/input.js
   ───────────────────────────────────────────────────────────────────────
   Keyboard (W/A/S/D + arrows) and the on-screen D-pad.

   Movement keys give instant axis values with no repeat delay, so holding
   W+A moves diagonally at the same speed as W alone (see Player).

   Any key not used for movement is handed to Game.handleGlobalKey via the
   onKeyDownHook so the whole input story lives in one place.
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const Input = {
  DIRS: ['up', 'down', 'left', 'right'],

  keys: {
    up: false,
    down: false,
    left: false,
    right: false,
  },

  axis: { x: 0, y: 0 },

  /** Direction set by the D-pad: 'up'|'down'|'left'|'right'|null */
  dpadDir: null,

  /**
   * Optional global-key handler receives keydown/keyup events that are
   * not movement keys. Set by main.js to Game.handleGlobalKey.
   */
  onKeyDownHook: null,
  onDpadHook: null,

  KEYMAP: {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
  },

  init() {
    window.addEventListener('keydown', (event) => this.onKeyDown(event), { passive: false });
    window.addEventListener('keyup', (event) => this.onKeyUp(event));
    window.addEventListener('blur', () => this.clear());

    const dpad = Utils.$('dpad');
    if (dpad) {
      const buttons = dpad.querySelectorAll('.dpad-btn[data-dir]');
      for (const button of buttons) {
        button.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          this.setDpad(button.dataset.dir, true);
        });
        for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
          button.addEventListener(type, () => this.setDpad(button.dataset.dir, false));
        }
      }
    }
  },

  /* ── Movement state ────────────────────────────────────────────────── */

  isDown(direction) {
    return this.keys[direction] === true;
  },

  isAnyDown() {
    return this.keys.up || this.keys.down || this.keys.left || this.keys.right;
  },

  setKey(direction, down) {
    if (!(direction in this.keys)) return false;
    const was = this.keys[direction];
    const is = !!down;
    if (was === is) return is;
    this.keys[direction] = is;
    this._propagate(direction, is);
    return is;
  },

  setDpad(direction, down) {
    this.dpadDir = down ? direction : this.dpadDir;
    if (this.onDpadHook) this.onDpadHook(direction, down);
  },

  getDirection(side) {
    if (this.keys[side] || this.dpadDir === side) return true;
    return false;
  },

  /** Recompute the axis from the held keys. */
  refreshAxis() {
    this.axis.x = (this.keys.right || this.dpadDir === 'right' ? 1 : 0) -
      (this.keys.left || this.dpadDir === 'left' ? 1 : 0);
    this.axis.y = (this.keys.down || this.dpadDir === 'down' ? 1 : 0) -
      (this.keys.up || this.dpadDir === 'up' ? 1 : 0);
    return this.axis;
  },

  clear() {
    for (const dir of this.DIRS) this.setKey(dir, false);
    this.dpadDir = null;
    UI.clearKeys();
    this.refreshAxis();
  },

  /* ── Keyboard events ───────────────────────────────────────────────── */

  onKeyDown(event) {
    const direction = this.KEYMAP[event.code];
    if (direction) {
      if (!event.repeat) {
        this.setKey(direction, true);
        UI.setKeyActive(direction, true);
        this.refreshAxis();

        // Block edge-scrolling on the arrow keys; W/A/S/D are safe to leave.
        if (
          event.code === 'ArrowUp' ||
          event.code === 'ArrowDown' ||
          event.code === 'ArrowLeft' ||
          event.code === 'ArrowRight'
        ) {
          event.preventDefault();
        }
      }
      return;
    }

    // Not a movement key -> pass to the global handler.
    if (this.onKeyDownHook && !event.repeat) {
      this.onKeyDownHook(event);
    }
  },

  onKeyUp(event) {
    const direction = this.KEYMAP[event.code];
    if (direction) {
      this.setKey(direction, false);
      UI.setKeyActive(direction, false);
      this.refreshAxis();
      return;
    }
  },

  _propagate(direction, down) {
    if (this.onDpadHook && !down) return;
    if (this.onDpadHook) this.onDpadHook(direction, down);
  },
};