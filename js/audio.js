/* ═══════════════════════════════════════════════════════════════════════
   MAZE BALL — js/audio.js
   ───────────────────────────────────────────────────────────────────────
   A tiny Web Audio synthesiser: every sound effect is generated at runtime,
   so the game ships with no audio assets.

   Browsers block audio until the user interacts with the page, so the
   AudioContext is created lazily on the first click/keypress (see
   AudioFX.unlock, called from input.js / main.js).
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

const AudioFX = {
  enabled: true,
  ready: false,
  ctx: null,
  master: null,
  noiseBuffer: null,
  lastTickAt: 0,

  /* ── Setup ─────────────────────────────────────────────────────────── */

  /** Create the AudioContext + master gain. Safe to call many times. */
  init() {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;

    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.35 : 0;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this._makeNoiseBuffer(0.5);
      this.ready = true;
    } catch (error) {
      Utils.warn('Audio unavailable:', error);
      this.ctx = null;
      this.ready = false;
    }

    return this.ctx;
  },

  /** Resume a suspended context (required after a user gesture). */
  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  setEnabled(on) {
    this.enabled = !!on;
    if (this.master) {
      this.master.gain.value = this.enabled ? 0.35 : 0;
    }
    if (this.enabled) this.unlock();
  },

  /* ── Primitives ────────────────────────────────────────────────────── */

  _makeNoiseBuffer(seconds) {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  },

  /**
   * One synthesised note.
   * @param {object} options
   */
  tone(options) {
    if (!this.enabled) return;
    const ctx = this.init();
    if (!ctx || ctx.state === 'suspended') {
      // Still suspended: try to resume and silently skip this sound.
      if (ctx) ctx.resume().catch(() => {});
      return;
    }

    const {
      freq = 440,
      freqEnd = null,
      type = 'sine',
      delay = 0,
      duration = 0.15,
      gain = 0.3,
      attack = 0.008,
      release = 0.12,
    } = options;

    const startAt = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    if (freqEnd !== null && freqEnd !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), startAt + duration);
    }

    amp.gain.setValueAtTime(0.0001, startAt);
    amp.gain.exponentialRampToValueAtTime(gain, startAt + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, startAt + Math.max(duration, attack + release));

    osc.connect(amp);
    amp.connect(this.master);

    osc.start(startAt);
    osc.stop(startAt + Math.max(duration, attack + release) + 0.02);
  },

  /** Filtered noise burst — used for the crash and whoosh effects. */
  noise(options) {
    if (!this.enabled) return;
    const ctx = this.init();
    if (!ctx || ctx.state === 'suspended') return;

    const {
      delay = 0,
      duration = 0.25,
      gain = 0.25,
      filterType = 'lowpass',
      filterFreq = 1200,
      filterEnd = null,
    } = options;

    const startAt = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, startAt);
    if (filterEnd !== null) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, filterEnd), startAt + duration);
    }

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, startAt);
    amp.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);

    source.start(startAt);
    source.stop(startAt + duration + 0.02);
  },

  /* ── Sound library ─────────────────────────────────────────────────── */

  play(name) {
    if (!this.enabled) return;

    switch (name) {
      /* UI ------------------------------------------------------------ */
      case 'click':
        this.tone({ freq: 660, freqEnd: 880, type: 'triangle', duration: 0.07, gain: 0.16 });
        break;

      case 'back':
        this.tone({ freq: 520, freqEnd: 380, type: 'triangle', duration: 0.08, gain: 0.14 });
        break;

      case 'start':
        this.tone({ freq: 440, type: 'triangle', duration: 0.12, gain: 0.22 });
        this.tone({ freq: 660, type: 'triangle', delay: 0.09, duration: 0.16, gain: 0.22 });
        break;

      /* Gameplay ------------------------------------------------------ */
      case 'move': {
        // Soft, rate-limited tick while rolling.
        const now = performance.now();
        if (now - this.lastTickAt < 120) break;
        this.lastTickAt = now;
        this.tone({ freq: 1200, freqEnd: 1500, type: 'sine', duration: 0.04, gain: 0.05 });
        break;
      }

      case 'blocked':
        this.tone({ freq: 180, freqEnd: 120, type: 'square', duration: 0.09, gain: 0.1 });
        break;

      case 'hint':
        this.tone({ freq: 1320, type: 'sine', duration: 0.1, gain: 0.08 });
        this.tone({ freq: 1760, type: 'sine', delay: 0.08, duration: 0.12, gain: 0.06 });
        break;

      case 'crash':
        this.noise({ duration: 0.3, gain: 0.3, filterType: 'lowpass', filterFreq: 1800, filterEnd: 200 });
        this.tone({ freq: 240, freqEnd: 60, type: 'sawtooth', duration: 0.28, gain: 0.22 });
        break;

      case 'goal':
        this.tone({ freq: 880, type: 'triangle', duration: 0.12, gain: 0.25 });
        this.tone({ freq: 1175, type: 'triangle', delay: 0.1, duration: 0.14, gain: 0.24 });
        this.tone({ freq: 1568, type: 'triangle', delay: 0.2, duration: 0.26, gain: 0.22 });
        break;

      case 'complete':
        // Little fanfare in A: A4 C#5 E5 A5
        this.tone({ freq: 440, type: 'triangle', duration: 0.16, gain: 0.24 });
        this.tone({ freq: 554, type: 'triangle', delay: 0.14, duration: 0.16, gain: 0.24 });
        this.tone({ freq: 659, type: 'triangle', delay: 0.28, duration: 0.16, gain: 0.24 });
        this.tone({ freq: 880, type: 'triangle', delay: 0.42, duration: 0.5, gain: 0.26 });
        this.tone({ freq: 1108, type: 'sine', delay: 0.42, duration: 0.5, gain: 0.12 });
        break;

      case 'demo':
        this.tone({ freq: 523, type: 'sine', duration: 0.1, gain: 0.14 });
        this.tone({ freq: 784, type: 'sine', delay: 0.09, duration: 0.14, gain: 0.12 });
        break;

      case 'unlock':
        this.tone({ freq: 740, freqEnd: 1108, type: 'triangle', duration: 0.22, gain: 0.2 });
        break;

      default:
        break;
    }
  },
};
