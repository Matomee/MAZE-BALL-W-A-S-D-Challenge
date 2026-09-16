/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/storage.js
   ───────────────────────────────────────────────────────────────────────
   Progress + settings persistence on top of localStorage.

   localStorage can throw (Safari private mode, disabled storage, some
   file:// setups), so every access is guarded and the module transparently
   falls back to an in-memory store. The game must never break because of
   storage.
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const Storage = {
  KEY: Config.STORAGE_KEY,
  supported: true,
  data: null,
  _memory: null,

  /* ── Defaults ──────────────────────────────────────────────────────── */

  _defaults() {
    return {
      version: 1,
      unlocked: 1, // highest unlocked level id (1-based)
      sound: Config.DEFAULTS.sound,
      hints: Config.DEFAULTS.hints,
      demoSpeed: Config.DEFAULTS.demoSpeed,
      seenTutorial: false,
      completed: false, // finished all 10 levels at least once
      bestTimeMs: {}, // level id -> best time in ms
      bestAttempts: {}, // level id -> fewest attempts
      completedLevels: {}, // level id -> true
      totalTimeMs: 0,
      totalAttempts: 0,
      plays: 0,
    };
  },

  /* ── Read / write ──────────────────────────────────────────────────── */

  load() {
    if (this.data) return this.data;

    let raw = null;
    try {
      raw = window.localStorage.getItem(this.KEY);
    } catch (error) {
      this.supported = false;
      Utils.warn('localStorage unavailable, using in-memory settings.', error);
    }

    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        Utils.warn('Corrupt save data, starting fresh.', error);
        parsed = null;
      }
    }

    this.data = this._merge(this._defaults(), parsed);
    return this.data;
  },

  /** Shallow-merge saved data over defaults (protects against old saves). */
  _merge(defaults, saved) {
    if (!saved || typeof saved !== 'object') return defaults;
    const merged = Object.assign({}, defaults);
    for (const key of Object.keys(defaults)) {
      if (!(key in saved)) continue;
      const expected = typeof defaults[key];
      const actual = typeof saved[key];
      if (defaults[key] !== null && Array.isArray(defaults[key])) continue;
      if (expected === 'object' && defaults[key] !== null) {
        if (actual === 'object' && saved[key] !== null && !Array.isArray(saved[key])) {
          merged[key] = Object.assign({}, defaults[key], saved[key]);
        }
        continue;
      }
      if (expected === actual) merged[key] = saved[key];
    }
    return merged;
  },

  save() {
    if (!this.data) return;
    try {
      window.localStorage.setItem(this.KEY, JSON.stringify(this.data));
    } catch (error) {
      this.supported = false;
      Utils.warn('Could not save progress.', error);
    }
  },

  /* ── Generic accessors ─────────────────────────────────────────────── */

  get(key) {
    return this.load()[key];
  },

  set(key, value) {
    const data = this.load();
    data[key] = value;
    this.save();
    return value;
  },

  /* ── Settings ──────────────────────────────────────────────────────── */

  getSettings() {
    const data = this.load();
    return {
      sound: !!data.sound,
      hints: !!data.hints,
      demoSpeed: data.demoSpeed,
    };
  },

  setSetting(key, value) {
    return this.set(key, value);
  },

  /* ── Tutorial flag ─────────────────────────────────────────────────── */

  hasSeenTutorial() {
    return !!this.load().seenTutorial;
  },

  markTutorialSeen() {
    this.set('seenTutorial', true);
  },

  /* ── Level unlocking ───────────────────────────────────────────────── */

  isUnlocked(id) {
    return id <= this.load().unlocked;
  },

  unlockUpTo(id) {
    const safe = Utils.clamp(id, 1, Config.TOTAL_LEVELS);
    if (safe > this.load().unlocked) {
      this.set('unlocked', safe);
      return true; // something new opened up
    }
    return false;
  },

  /** Unlock everything (used by "show solution" style demo shortcuts). */
  unlockAll() {
    this.set('unlocked', Config.TOTAL_LEVELS);
  },

  isCompleted(id) {
    return !!this.load().completedLevels[id];
  },

  completedCount() {
    return Object.keys(this.load().completedLevels).length;
  },

  /* ── Run results ───────────────────────────────────────────────────── */

  /**
   * Record a finished level.
   * @returns {{isBestTime:boolean, isBestAttempts:boolean, unlockedNext:boolean}}
   */
  recordCompletion(id, timeMs, attempts) {
    const data = this.load();
    const result = { isBestTime: false, isBestAttempts: false, unlockedNext: false };

    if (!data.bestTimeMs[id] || timeMs < data.bestTimeMs[id]) {
      data.bestTimeMs[id] = timeMs;
      result.isBestTime = true;
    }
    if (!data.bestAttempts[id] || attempts < data.bestAttempts[id]) {
      data.bestAttempts[id] = attempts;
      result.isBestAttempts = true;
    }

    data.completedLevels[id] = true;
    data.totalTimeMs += Math.round(timeMs);
    data.totalAttempts += attempts;

    if (id < Config.TOTAL_LEVELS) {
      result.unlockedNext = data.unlocked < id + 1;
      if (result.unlockedNext) data.unlocked = id + 1;
    } else if (this.completedCount() >= Config.TOTAL_LEVELS) {
      data.completed = true;
    }

    this.save();
    return result;
  },

  /** Attempts that ended in a wall hit (kept across retries of a level). */
  addAttempts(count) {
    const data = this.load();
    data.totalAttempts += count;
    this.save();
  },

  registerPlay() {
    const data = this.load();
    data.plays += 1;
    this.save();
  },

  bestTime(id) {
    return this.load().bestTimeMs[id] || null;
  },

  bestAttempts(id) {
    return this.load().bestAttempts[id] || null;
  },

  totals() {
    const data = this.load();
    return {
      totalTimeMs: data.totalTimeMs,
      totalAttempts: data.totalAttempts,
      completed: data.completed,
      plays: data.plays,
    };
  },

  /* ── Reset ─────────────────────────────────────────────────────────── */

  /** Wipe everything (settings window -> "Reset Progress"). */
  resetAll() {
    const fresh = this._defaults();
    this.data = fresh;
    try {
      window.localStorage.removeItem(this.KEY);
    } catch (error) {
      /* ignore — memory fallback is already reset */
    }
    this.save();
    return fresh;
  },
};
