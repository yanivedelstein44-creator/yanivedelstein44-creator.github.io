/**
 * SoundEngine — סינתיסייזר Web Audio ללא קבצים חיצוניים.
 * ריוורב קונבולוציה פרוצדורלי (אולם מלכותי שגדל עם העידן), צלילים לפי חומר ועידן,
 * פסקול אווירה דינמי + מוזיקה אדפטיבית, קולות חיות מחמד, סאונד מרחבי ורטט מסונכרן.
 */
import { Capacitor } from '@capacitor/core';

const ERA_PROFILE = {
  1: { move: 'wood', check: 'drums', amb: 'fire', inst: 'pluck', scale: [0, 3, 5, 7, 10], root: 50, reverb: 1.4 },
  2: { move: 'marble', check: 'brass', amb: 'water', inst: 'harp', scale: [0, 2, 4, 7, 9], root: 55, reverb: 2.6 },
  3: { move: 'metal', check: 'warhorn', amb: 'castle', inst: 'lute', scale: [0, 2, 3, 5, 7, 9, 10], root: 50, reverb: 3.0 },
  4: { move: 'clock', check: 'steam', amb: 'clockwork', inst: 'musicbox', scale: [0, 2, 4, 5, 7, 9, 10], root: 57, reverb: 1.9 },
  5: { move: 'synth', check: 'synthstab', amb: 'cosmic', inst: 'synth', scale: [0, 3, 5, 7, 10], root: 45, reverb: 3.2 },
  6: { move: 'woodblock', check: 'taiko', amb: 'chimes', inst: 'koto', scale: [0, 1, 5, 7, 8], root: 52, reverb: 2.2 },
  7: { move: 'stone', check: 'horn', amb: 'desert', inst: 'oud', scale: [0, 1, 4, 5, 7, 8, 10], root: 50, reverb: 2.8 },
  8: { move: 'iron', check: 'horn', amb: 'blizzard', inst: 'pluck', scale: [0, 2, 3, 5, 7, 8, 10], root: 45, reverb: 2.6 },
  9: { move: 'water', check: 'whale', amb: 'underwater', inst: 'bell', scale: [0, 2, 4, 6, 7, 9, 11], root: 53, reverb: 3.6 },
  10: { move: 'crystal', check: 'choir', amb: 'celestial', inst: 'celesta', scale: [0, 2, 4, 7, 9], root: 60, reverb: 4.2 },
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class SoundEngine {
  constructor({ sfx = true, ambience = true } = {}) {
    this.sfxOn = sfx;
    this.ambOn = ambience;
    this.era = 1;
    this.ctx = null;
    this.tension = 0;
    this.native = Capacitor?.isNativePlatform?.() || false;
    const unlock = () => this.unlock();
    ['touchstart', 'pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else if (this.unlocked) this.ctx.resume();
    });
    if (this.native) import('@capacitor/haptics').then((m) => { this.Haptics = m.Haptics; }).catch(() => {});
  }

  // ---------- אתחול ----------
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.build();
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (!this.unlocked) {
      this.unlocked = true;
      this.startAmbience();
      this.startMusic();
    }
  }

  build() {
    const c = this.ctx;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -16; this.comp.ratio.value = 4; this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
    this.master = c.createGain(); this.master.gain.value = 0.9;
    this.master.connect(this.comp).connect(c.destination);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.sfxOn ? 1 : 0;
    this.ambBus = c.createGain(); this.ambBus.gain.value = this.ambOn ? 0.55 : 0;
    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.32;
    this.musicBus.connect(this.ambBus);
    // שני מקונבלים להחלפה רכה בין עידנים
    this.rev = [c.createConvolver(), c.createConvolver()];
    this.revGain = [c.createGain(), c.createGain()];
    this.revIdx = 0;
    this.rev.forEach((r, i) => { r.connect(this.revGain[i]).connect(this.master); this.revGain[i].gain.value = i === 0 ? 1 : 0; });
    this.sfxSend = c.createGain(); this.sfxSend.gain.value = 0.32;
    this.ambSend = c.createGain(); this.ambSend.gain.value = 0.25;
    this.sfxBus.connect(this.master); this.sfxBus.connect(this.sfxSend);
    this.ambBus.connect(this.master); this.ambBus.connect(this.ambSend);
    this.sfxSend.connect(this.rev[0]); this.sfxSend.connect(this.rev[1]);
    this.ambSend.connect(this.rev[0]); this.ambSend.connect(this.rev[1]);
    this.rev[0].buffer = this.impulse(ERA_PROFILE[this.era].reverb);
    // באפרים של רעש
    const len = c.sampleRate * 2;
    this.white = c.createBuffer(1, len, c.sampleRate);
    this.brown = c.createBuffer(1, len, c.sampleRate);
    this.pink = c.createBuffer(1, len, c.sampleRate);
    const w = this.white.getChannelData(0), br = this.brown.getChannelData(0), pk = this.pink.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const r = Math.random() * 2 - 1;
      w[i] = r;
      last = (last + 0.02 * r) / 1.02; br[i] = last * 3.5;
      b0 = 0.99765 * b0 + r * 0.099; b1 = 0.963 * b1 + r * 0.2965; b2 = 0.57 * b2 + r * 1.0526; pk[i] = (b0 + b1 + b2 + r * 0.1848) * 0.2;
    }
  }

  /** תגובת הלם פרוצדורלית: רעש סטריאו עם דעיכה מעריכית והחזרים מוקדמים */
  impulse(seconds) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (t < 0.01 ? t * 100 : 1);
      }
      for (let k = 0; k < 6; k++) { const at = Math.floor(c.sampleRate * (0.012 + k * 0.017 + ch * 0.004)); if (at < len) d[at] += (0.6 - k * 0.08) * (Math.random() > 0.5 ? 1 : -1); }
    }
    return buf;
  }

  get ok() { return this.ctx && this.ctx.state === 'running'; }
  get now() { return this.ctx.currentTime; }

  // ---------- עזרי סינתזה ----------
  out(pan = 0, bus = this.sfxBus) {
    if (!pan || !this.ctx.createStereoPanner) return bus;
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(bus);
    return p;
  }

  tone(freq, t0, dur, { type = 'sine', gain = 0.3, attack = 0.005, freqEnd = null, dest, detune = 0, release = null } = {}) {
    const c = this.ctx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0); o.detune.value = detune;
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (release ?? dur));
    o.connect(g).connect(dest || this.sfxBus);
    o.start(t0); o.stop(t0 + (release ?? dur) + 0.05);
    return { o, g };
  }

  noise(t0, dur, { type = 'bandpass', freq = 1000, q = 1, gain = 0.3, attack = 0.002, freqEnd = null, dest, buffer } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = buffer || this.white;
    s.loopStart = 0; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(dest || this.sfxBus);
    s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
    return { s, f, g };
  }

  chord(freqs, t0, dur, { type = 'sawtooth', gain = 0.12, cutoff = [300, 2400, 600], q = 4, dest, attack = 0.06 } = {}) {
    const c = this.ctx;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q;
    f.frequency.setValueAtTime(cutoff[0], t0);
    f.frequency.exponentialRampToValueAtTime(cutoff[1], t0 + dur * 0.3);
    f.frequency.exponentialRampToValueAtTime(cutoff[2], t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack); g.gain.setValueAtTime(gain, t0 + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    f.connect(g).connect(dest || this.sfxBus);
    freqs.forEach((fr, i) => {
      for (const det of [-7, 7]) {
        const o = c.createOscillator(); o.type = type; o.frequency.value = fr; o.detune.value = det + i * 2;
        o.connect(f); o.start(t0); o.stop(t0 + dur + 0.05);
      }
    });
  }

  pluck(freq, t0, { gain = 0.2, decay = 1.2, type = 'triangle', dest, bright = 3000 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = type; o2.type = 'sine'; o.frequency.value = freq; o2.frequency.value = freq * 2.01;
    f.type = 'lowpass'; f.frequency.setValueAtTime(bright, t0); f.frequency.exponentialRampToValueAtTime(400, t0 + decay);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
    const g2 = c.createGain(); g2.gain.value = 0.25;
    o.connect(f); o2.connect(g2).connect(f); f.connect(g).connect(dest || this.sfxBus);
    o.start(t0); o2.start(t0); o.stop(t0 + decay + 0.05); o2.stop(t0 + decay + 0.05);
  }

  // ---------- רטט ----------
  vibrate(pattern) {
    if (!this.sfxOn) return;
    try {
      if (this.Haptics) {
        const seq = Array.isArray(pattern) ? pattern : [pattern];
        let t = 0;
        seq.forEach((d, i) => { if (i % 2 === 0) setTimeout(() => this.Haptics.vibrate({ duration: d }), t); t += d; });
      } else if (navigator.vibrate) navigator.vibrate(pattern);
    } catch { /* haptics unavailable */ }
  }

  // ---------- הגדרות ----------
  setSfx(on) { this.sfxOn = on; if (this.ctx) this.sfxBus.gain.setTargetAtTime(on ? 1 : 0, this.now, 0.05); }
  setAmbience(on) { this.ambOn = on; if (this.ctx) this.ambBus.gain.setTargetAtTime(on ? 0.55 : 0, this.now, 0.3); }

  setEra(era) {
    if (era === this.era) return;
    this.era = era;
    if (!this.ctx) return;
    const next = 1 - this.revIdx;
    this.rev[next].buffer = this.impulse(ERA_PROFILE[era].reverb);
    this.revGain[next].gain.setTargetAtTime(1, this.now, 0.6);
    this.revGain[this.revIdx].gain.setTargetAtTime(0, this.now, 0.6);
    this.revIdx = next;
    this.startAmbience();
  }

  setTension(v) { this.tension = Math.max(0, Math.min(1, v)); }

  get P() { return ERA_PROFILE[this.era] || ERA_PROFILE[1]; }

  // ---------- צלילי משחק ----------
  pickup(pan = 0) {
    if (!this.ok) return;
    const t = this.now, d = this.out(pan);
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; hp.connect(d);
    this.tone(1568, t, 0.7, { gain: 0.12, attack: 0.018, dest: hp });
    this.tone(2349, t + 0.01, 0.55, { gain: 0.06, attack: 0.02, dest: hp });
    this.tone(3136, t + 0.02, 0.4, { gain: 0.03, attack: 0.02, dest: hp });
    this.vibrate(10);
  }

  move(pan = 0) {
    if (!this.ok) return;
    const t = this.now, d = this.out(pan);
    switch (this.P.move) {
      case 'wood': // נקישת עץ/אבן חלולה: רעש פס + משולש 110→50Hz
        this.noise(t, 0.07, { type: 'bandpass', freq: 900, q: 2.2, gain: 0.35, dest: d });
        this.tone(110, t, 0.12, { type: 'triangle', freqEnd: 50, gain: 0.5, dest: d, release: 0.12 });
        break;
      case 'marble': { // נקישת שיש פריכה + החזר תהודה קצר
        this.noise(t, 0.035, { type: 'bandpass', freq: 3200, q: 4, gain: 0.32, dest: d });
        this.tone(1850, t, 0.09, { gain: 0.1, dest: d });
        this.tone(140, t, 0.08, { type: 'triangle', freqEnd: 60, gain: 0.35, dest: d });
        const dl = this.ctx.createDelay(); dl.delayTime.value = 0.034; const fb = this.ctx.createGain(); fb.gain.value = 0.35;
        const tap = this.ctx.createGain(); tap.gain.value = 0.5;
        this.noise(t, 0.03, { type: 'bandpass', freq: 2600, q: 5, gain: 0.25, dest: tap });
        tap.connect(dl); dl.connect(fb).connect(dl); dl.connect(d);
        setTimeout(() => { try { tap.disconnect(); dl.disconnect(); fb.disconnect(); } catch { /* ok */ } }, 600);
        break;
      }
      case 'metal': // שריון/אבן כבדה + צלצול 2200Hz
        this.noise(t, 0.06, { type: 'bandpass', freq: 1500, q: 2, gain: 0.35, dest: d });
        this.tone(90, t, 0.14, { type: 'triangle', freqEnd: 45, gain: 0.5, dest: d });
        this.tone(2200, t, 0.6, { gain: 0.06, dest: d });
        this.tone(3170, t, 0.4, { gain: 0.03, dest: d });
        break;
      case 'clock': // קליק מכני מדויק + טרנזיינט מתכתי
        this.noise(t, 0.008, { type: 'highpass', freq: 4500, gain: 0.4, dest: d });
        this.noise(t + 0.032, 0.008, { type: 'highpass', freq: 3800, gain: 0.3, dest: d });
        this.tone(3200, t, 0.03, { type: 'square', gain: 0.05, dest: d });
        this.tone(120, t, 0.07, { type: 'triangle', freqEnd: 70, gain: 0.3, dest: d });
        break;
      case 'synth': // פולס סינת' גבישי עם סוויפ
        this.tone(2400, t, 0.14, { type: 'triangle', freqEnd: 900, gain: 0.18, dest: d });
        this.tone(4800, t, 0.09, { type: 'sine', freqEnd: 1800, gain: 0.05, dest: d });
        this.tone(80, t, 0.1, { type: 'sine', freqEnd: 40, gain: 0.35, dest: d });
        break;
      case 'woodblock':
        this.tone(820, t, 0.08, { type: 'sine', freqEnd: 760, gain: 0.3, dest: d });
        this.noise(t, 0.03, { type: 'bandpass', freq: 1800, q: 6, gain: 0.25, dest: d });
        break;
      case 'stone':
        this.noise(t, 0.08, { type: 'lowpass', freq: 1200, gain: 0.4, dest: d });
        this.tone(95, t, 0.12, { type: 'triangle', freqEnd: 50, gain: 0.45, dest: d });
        this.tone(1760, t, 0.25, { gain: 0.04, dest: d });
        break;
      case 'iron':
        this.noise(t, 0.07, { type: 'bandpass', freq: 700, q: 1.5, gain: 0.4, dest: d });
        this.tone(75, t, 0.16, { type: 'triangle', freqEnd: 40, gain: 0.55, dest: d });
        this.tone(1320, t, 0.35, { gain: 0.05, dest: d });
        break;
      case 'water':
        this.tone(600, t, 0.12, { type: 'sine', freqEnd: 1400, gain: 0.18, dest: d });
        this.tone(300, t + 0.04, 0.1, { type: 'sine', freqEnd: 900, gain: 0.08, dest: d });
        this.noise(t, 0.05, { type: 'lowpass', freq: 800, gain: 0.2, dest: d });
        break;
      case 'crystal':
        [2093, 2637, 3136].forEach((f, i) => this.tone(f, t + i * 0.012, 0.8, { gain: 0.07, dest: d }));
        this.tone(130, t, 0.1, { type: 'sine', freqEnd: 65, gain: 0.3, dest: d });
        break;
      default:
    }
    this.vibrate(15);
  }

  capture(pan = 0) {
    if (!this.ok) return;
    const t = this.now, d = this.out(pan);
    // שכבה כבדה כפולה
    this.tone(70, t, 0.32, { type: 'sine', freqEnd: 38, gain: 0.7, dest: d });
    this.noise(t, 0.18, { type: 'lowpass', freq: 500, gain: 0.55, dest: d });
    this.noise(t + 0.02, 0.12, { type: 'bandpass', freq: 1400, q: 1.5, gain: 0.3, dest: d });
    // התפוררות — פרצי רעש מסוננים
    for (let i = 0; i < 12; i++) {
      const at = t + 0.06 + Math.random() * 0.42;
      this.noise(at, 0.02 + Math.random() * 0.04, { type: 'bandpass', freq: 1500 + Math.random() * 3500, q: 3, gain: 0.18 * (1 - (at - t) / 0.6), dest: d });
    }
    if (this.P.check === 'drums' || this.P.check === 'taiko') this.drum(t + 0.05, 0.5, d);
    if (this.era === 5 || this.era === 10) this.tone(1200, t, 0.25, { type: 'sawtooth', freqEnd: 200, gain: 0.06, dest: d });
    this.vibrate([30, 40, 30]);
  }

  drum(t, gain = 0.6, dest) {
    this.tone(110, t, 0.35, { type: 'sine', freqEnd: 45, gain, dest });
    this.noise(t, 0.08, { type: 'lowpass', freq: 400, gain: gain * 0.5, dest });
  }

  illegal() {
    if (!this.ok) return;
    const t = this.now;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; lp.connect(this.sfxBus);
    this.tone(80, t, 0.07, { type: 'triangle', gain: 0.5, dest: lp });
    this.tone(80, t + 0.11, 0.07, { type: 'triangle', gain: 0.4, dest: lp });
    this.vibrate([12, 60, 12]);
  }

  check(pan = 0) {
    if (!this.ok) return;
    const t = this.now, d = this.out(pan);
    const A = (n) => mtof(n);
    switch (this.P.check) {
      case 'drums':
        [0, 0.18, 0.36, 0.62].forEach((dt, i) => this.drum(t + dt, i === 3 ? 0.8 : 0.55, d));
        this.chord([A(38), A(45)], t + 0.3, 1.2, { gain: 0.08, cutoff: [200, 900, 300], dest: d });
        break;
      case 'warhorn':
        this.chord([A(38), A(45), A(50)], t, 1.6, { gain: 0.13, cutoff: [180, 1600, 400], q: 6, dest: d, attack: 0.15 });
        break;
      case 'steam':
        this.chord([A(57), A(61), A(64)], t, 1.1, { type: 'square', gain: 0.07, cutoff: [800, 3000, 1200], q: 2, dest: d });
        this.noise(t, 1.0, { type: 'bandpass', freq: 3500, q: 0.8, gain: 0.12, dest: d });
        break;
      case 'synthstab':
        this.chord([A(45), A(52), A(57), A(60)], t, 0.9, { gain: 0.1, cutoff: [400, 5000, 500], q: 8, dest: d, attack: 0.01 });
        break;
      case 'taiko':
        [0, 0.22, 0.44].forEach((dt) => this.drum(t + dt, 0.8, d));
        this.tone(220, t + 0.5, 0.8, { type: 'triangle', gain: 0.08, dest: d });
        break;
      case 'horn':
        this.chord([A(41), A(48)], t, 1.5, { gain: 0.14, cutoff: [150, 1300, 300], q: 5, dest: d, attack: 0.2 });
        break;
      case 'whale':
        this.tone(220, t, 1.6, { type: 'sine', freqEnd: 140, gain: 0.2, attack: 0.3, dest: d });
        this.tone(330, t + 0.2, 1.2, { type: 'sine', freqEnd: 210, gain: 0.1, attack: 0.3, dest: d });
        break;
      case 'choir':
        this.chord([A(48), A(55), A(60), A(64)], t, 1.8, { type: 'triangle', gain: 0.1, cutoff: [600, 2400, 800], q: 2, dest: d, attack: 0.25 });
        break;
      default: // brass
        this.chord([A(43), A(50), A(55), A(58)], t, 1.2, { gain: 0.11, cutoff: [300, 2400, 600], dest: d });
    }
    this.vibrate([50, 50, 100]);
  }

  promotion(pan = 0) {
    if (!this.ok) return;
    const t = this.now, d = this.out(pan);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      if (this.era === 5 || this.era === 10) this.tone(f, t + i * 0.09, 0.6, { type: 'square', gain: 0.06, dest: d });
      else this.pluck(f, t + i * 0.09, { gain: 0.22, decay: 1.3, dest: d });
    });
    this.tone(2093, t + 0.4, 1.2, { gain: 0.05, dest: d });
    this.vibrate([20, 30, 20, 30, 40]);
  }

  /** בנייה: רעם אדמה 40-75Hz (1.8ש׳) → נעילה כבדה → פאנפרה */
  structureRise(withFanfare = true) {
    if (!this.ok) return;
    const t = this.now, c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.brown; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 60; lp.Q.value = 4;
    const lfo = c.createOscillator(); lfo.frequency.value = 7; const lfoG = c.createGain(); lfoG.gain.value = 15;
    lfo.connect(lfoG).connect(lp.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.35); g.gain.setValueAtTime(0.9, t + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.85);
    src.connect(lp).connect(g).connect(this.sfxBus);
    src.start(t); lfo.start(t); src.stop(t + 1.9); lfo.stop(t + 1.9);
    this.noise(t, 1.8, { type: 'bandpass', freq: 260, q: 1.2, gain: 0.12, freqEnd: 420 });
    // נעילה
    this.tone(60, t + 1.8, 0.5, { type: 'sine', freqEnd: 30, gain: 0.9 });
    this.noise(t + 1.8, 0.25, { type: 'lowpass', freq: 600, gain: 0.5 });
    if (withFanfare) setTimeout(() => this.fanfare(), 1950);
    this.vibrate([40, 60, 40, 60, 150]);
  }

  fanfare(big = false) {
    if (!this.ok) return;
    const t = this.now;
    const synth = this.era === 5 || this.era === 10;
    const notes = [60, 64, 67, 72];
    notes.forEach((n, i) => this.chord([mtof(n), mtof(n + 12) * 0.5], t + i * 0.13, 0.35, { type: synth ? 'square' : 'sawtooth', gain: 0.08, cutoff: [500, 3200, 900] }));
    this.chord([mtof(60), mtof(64), mtof(67), mtof(72)], t + 0.55, big ? 2.2 : 1.4, { type: synth ? 'square' : 'sawtooth', gain: 0.1, cutoff: [600, 3500, 800] });
    if (synth) this.chord([mtof(48), mtof(55)], t + 0.55, 1.6, { type: 'triangle', gain: 0.1, cutoff: [200, 900, 300] });
    this.drum(t + 0.55, 0.6);
  }

  eraEvolution() {
    if (!this.ok) return;
    const t = this.now;
    this.noise(t, 1.6, { type: 'bandpass', freq: 200, q: 1.5, gain: 0.25, freqEnd: 5000, buffer: this.pink });
    this.tone(55, t + 1.4, 1.4, { type: 'sine', freqEnd: 30, gain: 0.9 });
    this.chord([mtof(48), mtof(55), mtof(60), mtof(64), mtof(67)], t + 1.45, 2.6, { type: 'triangle', gain: 0.09, cutoff: [800, 4000, 1000], q: 1 });
    [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, t + 1.6 + i * 0.08, 1.4, { gain: 0.04 }));
    this.vibrate([60, 40, 60, 40, 200]);
  }

  victory() { this.fanfare(true); this.vibrate([40, 60, 40, 60, 150]); }

  checkmate() {
    if (!this.ok) return;
    const t = this.now;
    if (this.era === 5 || this.era === 10) {
      this.chord([mtof(48), mtof(55), mtof(60), mtof(64), mtof(67), mtof(72)], t, 2.8, { type: 'sawtooth', gain: 0.08, cutoff: [400, 6000, 900], q: 3, attack: 0.02 });
      this.chord([mtof(36), mtof(43)], t, 2.8, { type: 'square', gain: 0.07, cutoff: [150, 800, 200] });
    } else this.fanfare(true);
    this.drum(t, 0.9);
  }

  defeat() {
    if (!this.ok) return;
    const t = this.now;
    [67, 63, 60, 55].forEach((n, i) => this.tone(mtof(n), t + i * 0.28, 0.6, { type: 'triangle', gain: 0.14 }));
  }

  draw() {
    if (!this.ok) return;
    const t = this.now;
    [60, 65, 62, 67].forEach((n, i) => this.pluck(mtof(n), t + i * 0.18, { gain: 0.15 }));
  }

  ui() { if (this.ok) this.tone(1300, this.now, 0.05, { gain: 0.05 }); }
  coin() { if (!this.ok) return; const t = this.now; this.tone(1567, t, 0.12, { type: 'square', gain: 0.05 }); this.tone(2093, t + 0.08, 0.3, { type: 'square', gain: 0.05 }); }
  notify() { if (!this.ok) return; const t = this.now; this.tone(880, t, 0.2, { gain: 0.08 }); this.tone(1320, t + 0.1, 0.3, { gain: 0.07 }); }
  pop() { if (this.ok) this.tone(600, this.now, 0.1, { freqEnd: 1200, gain: 0.12 }); }
  /** משב רוח של מסע על החיה */
  whoosh(dur = 1.6) { if (!this.ok) return; const t = this.now; this.noise(t, dur, { type: 'bandpass', freq: 260, freqEnd: 1300, q: 0.8, gain: 0.2, attack: dur * 0.45 }); }
  land() { if (!this.ok) return; const t = this.now; this.noise(t, 0.3, { type: 'lowpass', freq: 600, gain: 0.3 }); this.tone(196, t, 0.28, { type: 'triangle', gain: 0.1, freqEnd: 98 }); }
  thunder() { if (!this.ok) return; const t = this.now; this.noise(t, 1.8, { type: 'lowpass', freq: 160, gain: 0.5, attack: 0.04 }); this.noise(t + 0.05, 0.5, { type: 'lowpass', freq: 420, gain: 0.22 }); }
  /** צלצול טבעת אור / שער (גובה עולה בכל טבעת) */
  chime(i = 0) { if (!this.ok) return; const t = this.now; const f = [988, 1175, 1397, 1568][i % 4]; this.tone(f, t, 0.4, { gain: 0.07 }); this.tone(f * 2, t + 0.02, 0.3, { gain: 0.025 }); }

  jackpot() {
    if (!this.ok) return;
    const t = this.now;
    for (let i = 0; i < 10; i++) this.tone(mtof(72 + [0, 4, 7, 12][i % 4]), t + i * 0.07, 0.25, { type: 'square', gain: 0.05 });
    this.chord([mtof(60), mtof(64), mtof(67), mtof(72)], t + 0.7, 1.8, { gain: 0.1, cutoff: [800, 4000, 1000] });
    this.vibrate([40, 40, 40, 40, 200]);
  }

  /** קולות חיות מחמד */
  petVoice(kind, pan = 0, angry = false) {
    if (!this.ok) return;
    const t = this.now, d = this.out(pan);
    switch (kind) {
      case 'wolf':
        if (angry) this.tone(300, t, 1.0, { type: 'sawtooth', freqEnd: 520, gain: 0.08, attack: 0.15, dest: d });
        else [0, 0.16].forEach((dt) => { this.noise(t + dt, 0.09, { type: 'bandpass', freq: 900, q: 3, gain: 0.3, dest: d }); this.tone(420, t + dt, 0.1, { type: 'sawtooth', freqEnd: 260, gain: 0.1, dest: d }); });
        break;
      case 'owl':
        [0, 0.38].forEach((dt, i) => this.tone(i ? 360 : 400, t + dt, 0.32, { type: 'sine', freqEnd: i ? 330 : 380, gain: 0.22, attack: 0.06, dest: d }));
        break;
      case 'horse':
        this.tone(700, t, 0.7, { type: 'sawtooth', freqEnd: 300, gain: 0.08, dest: d });
        this.noise(t, 0.6, { type: 'bandpass', freq: 1200, q: 2, gain: 0.1, dest: d });
        break;
      case 'dragon':
        this.noise(t, 1.0, { type: 'lowpass', freq: 400, gain: 0.5, freqEnd: 150, buffer: this.brown, dest: d });
        this.tone(90, t, 1.0, { type: 'sawtooth', freqEnd: 60, gain: 0.15, dest: d });
        if (angry) this.noise(t + 0.2, 1.2, { type: 'bandpass', freq: 2500, q: 0.7, gain: 0.25, dest: d });
        break;
      case 'phoenix':
        [1318, 1760, 2093, 2637].forEach((f, i) => this.tone(f, t + i * 0.06, 1.0, { gain: 0.06, dest: d }));
        this.tone(880, t, 0.6, { type: 'triangle', freqEnd: 1760, gain: 0.08, dest: d });
        break;
      case 'fox':
        [0, 0.08, 0.16].forEach((dt, i) => this.tone(1200 + i * 400, t + dt, 0.07, { type: 'square', freqEnd: 2400 + i * 300, gain: 0.05, dest: d }));
        break;
      case 'griffin':
        this.tone(2200, t, 0.5, { type: 'sawtooth', freqEnd: 900, gain: 0.07, dest: d });
        this.noise(t, 0.4, { type: 'bandpass', freq: 3000, q: 2, gain: 0.12, dest: d });
        if (angry) this.tone(60, t + 0.1, 0.6, { freqEnd: 30, gain: 0.6, dest: d });
        break;
      case 'unicorn':
        for (let i = 0; i < 8; i++) this.tone(mtof(76 + [0, 2, 4, 7, 9, 12, 14, 16][i]), t + i * 0.05, 0.5, { gain: 0.05, dest: d });
        break;
      // ---------- קן השמיים ----------
      case 'parrot':
        [0, 0.2].forEach((dt, i) => { this.tone(i ? 1500 : 1100, t + dt, 0.16, { type: 'sawtooth', freqEnd: i ? 1900 : 700, gain: 0.07, dest: d }); this.noise(t + dt, 0.12, { type: 'bandpass', freq: 2200, q: 4, gain: 0.12, dest: d }); });
        break;
      case 'raven':
        [0, 0.28].forEach((dt) => { this.tone(520, t + dt, 0.22, { type: 'sawtooth', freqEnd: 380, gain: 0.08, dest: d }); this.noise(t + dt, 0.2, { type: 'bandpass', freq: 1200, q: 2.5, gain: 0.18, dest: d }); });
        if (angry) this.noise(t + 0.3, 1.0, { type: 'lowpass', freq: 300, gain: 0.5, freqEnd: 120, buffer: this.brown, dest: d });
        break;
      case 'eagle':
        this.tone(2600, t, 0.6, { type: 'sawtooth', freqEnd: 1600, gain: 0.06, dest: d });
        this.noise(t, 0.5, { type: 'bandpass', freq: 3400, q: 3, gain: 0.12, dest: d });
        break;
      case 'bat':
        [0, 0.07, 0.14].forEach((dt, i) => this.tone(3000 + i * 500, t + dt, 0.05, { type: 'sine', freqEnd: 4200 + i * 400, gain: 0.08, dest: d }));
        break;
      case 'pegasus':
        this.tone(700, t, 0.6, { type: 'sawtooth', freqEnd: 320, gain: 0.07, dest: d });
        [1568, 2093, 2637].forEach((f, i) => this.tone(f, t + 0.12 + i * 0.07, 0.6, { gain: 0.045, dest: d }));
        break;
      case 'butterfly':
        [0, 4, 7, 12, 16].forEach((st, i) => this.tone(mtof(84 + st), t + i * 0.06, 0.45, { gain: 0.035, dest: d }));
        break;
      case 'whale':
        this.tone(170, t, 1.3, { type: 'sine', freqEnd: 320, gain: 0.2, attack: 0.3, dest: d });
        this.tone(300, t + 0.9, 1.0, { type: 'sine', freqEnd: 210, gain: 0.14, attack: 0.25, dest: d });
        break;
      default:
    }
  }

  // ---------- פסקול אווירה ----------
  stopAmbience() {
    (this.ambNodes || []).forEach((n) => { try { n.stop ? n.stop() : n.disconnect(); } catch { /* ok */ } });
    this.ambNodes = [];
    clearInterval(this.ambTimer);
  }

  loopNoise({ buffer, type = 'lowpass', freq = 500, q = 0.7, gain = 0.2, lfoRate = 0, lfoDepth = 0, gainLfo = 0 }) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = buffer || this.pink; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(gain, c.currentTime, 1.2);
    s.connect(f).connect(g).connect(this.ambBus);
    s.start(c.currentTime, Math.random());
    const nodes = [s, f, g];
    if (lfoRate) { const l = c.createOscillator(); l.frequency.value = lfoRate; const lg = c.createGain(); lg.gain.value = lfoDepth; l.connect(lg).connect(f.frequency); l.start(); nodes.push(l); }
    if (gainLfo) { const l = c.createOscillator(); l.frequency.value = gainLfo; const lg = c.createGain(); lg.gain.value = gain * 0.6; l.connect(lg).connect(g.gain); l.start(); nodes.push(l); }
    this.ambNodes.push(...nodes);
  }

  pad(freqs, gain = 0.05, type = 'sine') {
    const c = this.ctx;
    const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(gain, c.currentTime, 2);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const l = c.createOscillator(); l.frequency.value = 0.08; const lg = c.createGain(); lg.gain.value = 400; l.connect(lg).connect(f.frequency); l.start();
    f.connect(g).connect(this.ambBus);
    this.ambNodes.push(g, f, l);
    freqs.forEach((fr) => [-5, 5].forEach((det) => { const o = c.createOscillator(); o.type = type; o.frequency.value = fr; o.detune.value = det; o.connect(f); o.start(); this.ambNodes.push(o); }));
  }

  startAmbience() {
    if (!this.ctx) return;
    this.stopAmbience();
    const kind = this.P.amb;
    const wind = (g = 0.12) => this.loopNoise({ type: 'bandpass', freq: 450, q: 0.6, gain: g, lfoRate: 0.07, lfoDepth: 250, gainLfo: 0.05 });
    const water = (g = 0.1) => { this.loopNoise({ buffer: this.white, type: 'bandpass', freq: 1300, q: 0.5, gain: g, lfoRate: 0.3, lfoDepth: 400 }); this.loopNoise({ buffer: this.white, type: 'highpass', freq: 4000, gain: g * 0.3 }); };
    let crackle = 0, tick = 0, chimes = 0, bubbles = 0, twinkle = 0;
    switch (kind) {
      case 'fire': wind(0.1); this.loopNoise({ buffer: this.brown, type: 'lowpass', freq: 220, gain: 0.12 }); crackle = 1; break;
      case 'water': water(0.12); wind(0.04); break;
      case 'castle': water(0.07); wind(0.08); crackle = 0.5; break;
      case 'clockwork': this.pad([60, 120], 0.03, 'sine'); tick = 1; this.loopNoise({ buffer: this.brown, type: 'lowpass', freq: 150, gain: 0.06 }); break;
      case 'cosmic': this.pad([mtof(45), mtof(52), mtof(59), mtof(66)], 0.04, 'triangle'); this.loopNoise({ type: 'bandpass', freq: 2000, q: 0.3, gain: 0.02, lfoRate: 0.05, lfoDepth: 1200 }); twinkle = 1; break;
      case 'chimes': wind(0.06); water(0.06); chimes = 1; break;
      case 'desert': wind(0.16); crackle = 0.4; break;
      case 'blizzard': this.loopNoise({ type: 'bandpass', freq: 700, q: 1.2, gain: 0.16, lfoRate: 0.12, lfoDepth: 450, gainLfo: 0.09 }); crackle = 0.6; break;
      case 'underwater': this.loopNoise({ buffer: this.brown, type: 'lowpass', freq: 300, gain: 0.2, lfoRate: 0.05, lfoDepth: 120 }); bubbles = 1; break;
      case 'celestial': this.pad([mtof(48), mtof(55), mtof(60), mtof(64), mtof(71)], 0.035, 'sine'); twinkle = 1.4; break;
      default: wind();
    }
    let k = 0;
    this.ambTimer = setInterval(() => {
      if (!this.ok || !this.ambOn) return;
      const t = this.now;
      k++;
      if (crackle && Math.random() < 0.5 * crackle) for (let i = 0; i < 3; i++) this.noise(t + Math.random() * 0.1, 0.01 + Math.random() * 0.02, { type: 'highpass', freq: 1500 + Math.random() * 3000, gain: 0.05 + Math.random() * 0.08, dest: this.ambBus });
      if (tick && k % 5 === 0) this.noise(t, 0.012, { type: 'bandpass', freq: (k / 5) % 2 ? 2600 : 2100, q: 6, gain: 0.12, dest: this.ambBus });
      if (chimes && Math.random() < 0.06) [0, 1, 2].forEach((i) => this.tone(mtof(84 + this.P.scale[Math.floor(Math.random() * this.P.scale.length)]), t + i * 0.13, 2.4, { gain: 0.025, dest: this.ambBus }));
      if (bubbles && Math.random() < 0.25) this.tone(300 + Math.random() * 500, t, 0.08, { freqEnd: 900 + Math.random() * 900, gain: 0.04, dest: this.ambBus });
      if (twinkle && Math.random() < 0.08 * twinkle) this.tone(mtof(88 + this.P.scale[Math.floor(Math.random() * this.P.scale.length)]), t, 1.6, { gain: 0.02, dest: this.ambBus });
    }, 200);
  }

  // ---------- קהל וחיי רקע (ArenaLife) ----------
  /** תגובות הקהל: ooh (לכידה), gasp (שח), cheer (ניצחון), aww (הפסד) — רעש מסונן בפורמנטים של קול אנושי */
  crowd(kind = 'ooh') {
    if (!this.ok) return;
    const t = this.now, d = this.sfxBus;
    const voice = (t0, dur, f0, f1, g) => {
      this.noise(t0, dur, { type: 'bandpass', freq: f0, freqEnd: f1, q: 2.4, gain: g, attack: dur * 0.35, buffer: this.pink, dest: d });
      this.noise(t0, dur, { type: 'bandpass', freq: f0 * 2.6, freqEnd: f1 * 2.4, q: 3.2, gain: g * 0.4, attack: dur * 0.35, buffer: this.pink, dest: d });
    };
    if (kind === 'ooh') voice(t, 0.75, 430, 640, 0.09);
    else if (kind === 'gasp') { voice(t, 0.55, 950, 520, 0.1); this.tone(58, t, 1.5, { gain: 0.16, freqEnd: 46, attack: 0.08 }); this.tone(220, t + 0.1, 1.2, { type: 'triangle', gain: 0.025, freqEnd: 330, attack: 0.4 }); }
    else if (kind === 'cheer') {
      voice(t, 2.4, 620, 860, 0.1);
      for (let i = 0; i < 52; i++) this.noise(t + 0.1 + Math.random() * 2.8, 0.018, { type: 'bandpass', freq: 1300 + Math.random() * 1700, q: 1.4, gain: 0.05 + Math.random() * 0.07, dest: d });
    } else if (kind === 'aww') voice(t, 1.2, 560, 320, 0.08);
  }

  /** צלילי אווירה נקודתיים לפי עידן (לאפיק האווירה; פאן מרחבי לפי מיקום) */
  ambientEvent(kind, pan = 0) {
    if (!this.ok || !this.ambOn) return;
    const t = this.now, d = this.out(pan, this.ambBus), P = this.P;
    const note = (deg, oct = 0) => {
      const n = P.scale.length, k = ((deg % n) + n) % n;
      return mtof(P.root + 12 * (oct + Math.floor(deg / n)) + P.scale[k]);
    };
    const lp = (freq) => { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.connect(d); return f; };
    switch (kind) {
      case 'howl': { // זאב רחוק
        const f0 = 360 + Math.random() * 120, dst = lp(1400);
        const { o } = this.tone(f0, t, 3.2, { gain: 0.03, freqEnd: f0 * 1.3, attack: 0.9, dest: dst });
        const l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = 9; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + 3.3);
        break;
      }
      case 'bird': for (let i = 0; i < 3; i++) this.tone(2300 + Math.random() * 900, t + i * 0.13, 0.08, { freqEnd: 3100 + Math.random() * 900, gain: 0.018, dest: d }); break;
      case 'step': this.noise(t, 0.05, { type: 'lowpass', freq: 380 + Math.random() * 120, gain: 0.05, dest: d }); break;
      case 'clink': [2637, 3520, 4186].forEach((f, i) => this.tone(f * (0.97 + Math.random() * 0.06), t + i * 0.005, 0.28, { gain: 0.011, dest: d })); break;
      case 'clank': [523, 1244, 2093, 3135].forEach((f) => this.tone(f * (0.98 + Math.random() * 0.04), t, 0.7, { type: 'triangle', gain: 0.016, dest: d })); break;
      case 'trumpet': { // חצוצרה רחוקה מהטירה
        const dst = lp(1600);
        [0, 0, 2, 4, 7].forEach((deg, i) => this.tone(note(deg, 1), t + i * 0.22, i === 4 ? 0.9 : 0.2, { type: 'sawtooth', gain: 0.02, attack: 0.03, dest: dst }));
        break;
      }
      case 'whistle': this.tone(1180, t, 1.9, { gain: 0.026, freqEnd: 1330, attack: 0.15, dest: d }); this.noise(t, 2.0, { type: 'bandpass', freq: 2400, q: 6, gain: 0.03, attack: 0.1, dest: d }); break;
      case 'hover': this.noise(t, 1.5, { type: 'bandpass', freq: 280, freqEnd: 1700, q: 1.6, gain: 0.07, attack: 0.55, dest: d }); this.tone(105, t, 1.5, { type: 'sawtooth', gain: 0.012, freqEnd: 165, attack: 0.55, dest: lp(800) }); break;
      case 'flute': { // חליל במבוק
        const degs = [0, 2, 4, 3, 1, 0].slice(0, 4 + Math.floor(Math.random() * 3));
        let tt = t;
        degs.forEach((deg, i) => {
          const dur = i === degs.length - 1 ? 1.6 : 0.5 + Math.random() * 0.3;
          const f = note(deg, 1);
          this.tone(f, tt, dur, { gain: 0.028, attack: 0.14, dest: d });
          this.noise(tt, dur * 0.8, { type: 'bandpass', freq: f * 2, q: 9, gain: 0.008, attack: 0.1, dest: d });
          tt += dur * 0.92;
        });
        break;
      }
      case 'oud': { // כלי מיתר מדברי
        const start = Math.floor(Math.random() * 3);
        [0, 1, 2, 1, 0, -1, 0].map((x) => x + start).forEach((deg, i) => this.pluck(note(deg, 0), t + i * 0.19 + (i > 3 ? 0.12 : 0), { gain: 0.06, decay: 0.9, dest: d, bright: 2400 }));
        break;
      }
      case 'drums': [0, 0.62, 1.24, 1.46].forEach((dt, i) => this.drum(t + dt, i === 0 ? 0.42 : 0.3, d)); break;
      case 'bells': for (let i = 0; i < 3; i++) { const f = note(Math.floor(Math.random() * 7), 2); this.tone(f, t + i * 0.24, 3.2, { gain: 0.018, dest: d }); this.tone(f * 2.76, t + i * 0.24, 1.4, { gain: 0.006, dest: d }); } break;
      default: break;
    }
  }

  // ---------- מוזיקה אדפטיבית ----------
  startMusic() {
    clearInterval(this.musicTimer);
    let step = 0;
    let nextAt = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ok || !this.ambOn || this.filmOn) return; // בזמן סרט בקולנוע — רק המוזיקה של הסרט
      const t = this.now;
      if (t < nextAt) return;
      const P = this.P, ten = this.tension;
      const bpm = 64 + ten * 46;
      const stepDur = 60 / bpm / 2;
      nextAt = t + stepDur;
      step++;
      const density = 0.35 + ten * 0.45;
      if (Math.random() < density) {
        const deg = P.scale[Math.floor(Math.random() * P.scale.length)];
        const oct = Math.random() < 0.3 ? 12 : 0;
        const f = mtof(P.root + 12 + deg + oct);
        this.instrument(P.inst, f, t, 0.12 + Math.random() * 0.08);
      }
      if (step % 8 === 0) this.instrument(P.inst, mtof(P.root + P.scale[0]), t, 0.16, true);
      if (ten > 0.45 && step % 2 === 0) { this.tone(70, t, 0.18, { freqEnd: 40, gain: 0.12 * ten, dest: this.musicBus }); }
      if (ten > 0.7 && step % 2 === 1) this.noise(t, 0.03, { type: 'highpass', freq: 6000, gain: 0.05, dest: this.musicBus });
    }, 50);
  }

  // ---------- סרטי הקולנוע ----------
  /**
   * מוזיקת סרט (דו מז'ור, 96 BPM, תיבה = 2.5 שניות): פד, בס, ארפג'ו ותופים שנבנים לאט, ואקורד גדול בסוף.
   * עוברת בערוץ המוזיקה (שקטה אם המוזיקה כבויה), והמוזיקה הרגילה שותקת בינתיים. מחזירה { stop(fade) }.
   */
  filmScore(bars = 14) {
    if (!this.ok) return { stop() {} };
    const c = this.ctx, t0 = this.now + 0.05;
    const out = c.createGain(); out.gain.value = 2.6; out.connect(this.ambBus); // ערוץ המוזיקה שקט — הסרט צריך מוזיקה נוכחת
    this.filmOn = true;
    const beat = 60 / 96, bar = beat * 4;
    const prog = [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]]; // C · G · Am · F (בס + אקורד)
    const arp = [0, 1, 2, 1, 0, 2, 1, 2];
    for (let b = 0; b < bars; b++) {
      const [bass, ...ch] = prog[b % 4];
      const t = t0 + b * bar, lift = Math.min(1, b / 8);
      this.chord(ch.map(mtof), t, bar + 0.15, { type: 'sawtooth', gain: 0.035 + 0.02 * lift, cutoff: [400, 1400 + 1400 * lift, 700], dest: out, attack: 0.25 });
      this.pluck(mtof(bass), t, { gain: 0.1, decay: bar * 0.9, dest: out, bright: 900 });
      if (b >= 2) for (let i = 0; i < 8; i++) this.pluck(mtof(ch[arp[i]] + 12), t + (i * beat) / 2, { gain: 0.035 + 0.03 * lift, decay: 0.5, dest: out, bright: 3200 });
      if (b >= 4) for (let k = 0; k < 4; k++) if (k % 2 === 0 || b >= 8) this.drum(t + k * beat, k === 0 ? 0.22 : 0.14, out);
      if (b >= 8) for (let k = 0; k < 8; k++) this.noise(t + (k * beat) / 2, 0.04, { type: 'highpass', freq: 7000, gain: 0.02, dest: out });
    }
    // הסיום: אקורד דו גדול, בס עמוק ומצלתיים רכות
    const te = t0 + bars * bar;
    this.chord([60, 64, 67, 72, 76].map(mtof), te, 3.2, { type: 'sawtooth', gain: 0.05, cutoff: [600, 3200, 800], dest: out, attack: 0.04 });
    this.pluck(mtof(36), te, { gain: 0.14, decay: 2.8, dest: out, bright: 700 });
    this.noise(te, 2.4, { type: 'highpass', freq: 5000, gain: 0.04, dest: out, attack: 0.01 });
    this.drum(te, 0.3, out);
    const timer = setTimeout(() => { this.filmOn = false; }, (te - this.now + 3.4) * 1000);
    return {
      stop: (fade = 0.6) => {
        clearTimeout(timer);
        this.filmOn = false;
        const n = this.now;
        out.gain.cancelScheduledValues(n); out.gain.setValueAtTime(out.gain.value, n); out.gain.linearRampToValueAtTime(0, n + fade);
      },
    };
  }

  /** מכה של "בוס" בסרט: תוף נמוך ואקורד כבד קצר */
  filmHit() {
    if (!this.ok) return;
    const t = this.now;
    this.drum(t, 0.5);
    this.chord([mtof(36), mtof(43), mtof(48)], t, 1.3, { type: 'sawtooth', gain: 0.08, cutoff: [180, 900, 220] });
  }

  instrument(kind, f, t, gain, bass = false) {
    const dest = this.musicBus;
    const fr = bass ? f / 2 : f;
    switch (kind) {
      case 'harp': case 'koto': case 'lute': case 'oud': case 'pluck': this.pluck(fr, t, { gain, decay: kind === 'koto' ? 1.6 : 1.2, dest, type: kind === 'oud' ? 'sawtooth' : 'triangle', bright: kind === 'oud' ? 1600 : 2800 }); break;
      case 'musicbox': case 'celesta': case 'bell': this.tone(fr, t, 1.4, { gain: gain * 0.7, dest }); this.tone(fr * (kind === 'bell' ? 2.76 : 2), t, 0.7, { gain: gain * 0.25, dest }); break;
      case 'synth': this.tone(fr, t, 0.4, { type: 'sawtooth', gain: gain * 0.4, dest }); break;
      default: this.pluck(fr, t, { gain, dest });
    }
  }
}
