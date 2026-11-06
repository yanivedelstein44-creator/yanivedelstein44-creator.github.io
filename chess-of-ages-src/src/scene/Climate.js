/**
 * אקלים לכל אי: פלטת שמיים/תאורה/ערפל (משולבת עם פלטת ערכת העולם) + מזג אוויר חלקיקי.
 * שלג, גשם, אבק, ערפל, גחליליות, עלי דובדבן, עלי שלכת, גחלים, בועות, נצנוצים, כוכבים, פיח, זוהר צפוני וברקים.
 * החלקיקים הם Points אחד לכל שכבה (קריאת ציור אחת), מתעדכנים במעבד — זול גם בטלפון.
 */
import * as THREE from 'three';

const TAU = Math.PI * 2;
// פלטות מלאות (אותם שדות כמו palette של העידנים)
const P = {
  day: { skyTop: 0x2f6fd0, skyMid: 0x6aa8ec, skyHorizon: 0xd2eaff, skyBottom: 0x8fb8d8, sunDir: [0.4, 0.55, -0.7], sunGlow: 0xfff2c8, nebula: 0, stars: 0, key: 0xfff4e0, keyIntensity: 2.6, keyDir: [0.5, 0.85, 0.4], hemiSky: 0xdfefff, hemiGround: 0x4a5a3a, hemiIntensity: 1.0, fog: 0xbcdcf4, fogNear: 60, fogFar: 190, exposure: 1.05, env: 0.6, ground: 0x5d8a3a },
  dusk: { skyTop: 0x1d1838, skyMid: 0x7a4766, skyHorizon: 0xf4a259, skyBottom: 0x3b2418, sunDir: [-0.55, 0.16, -0.82], sunGlow: 0xffb36b, nebula: 0, stars: 0.3, key: 0xffc48a, keyIntensity: 2.3, keyDir: [0.5, 0.85, 0.45], hemiSky: 0xffd8b0, hemiGround: 0x40301e, hemiIntensity: 0.85, fog: 0x9d6553, fogNear: 55, fogFar: 170, exposure: 1.05, env: 0.55, ground: 0x6a7a3a },
  snow: { skyTop: 0x8fa8c8, skyMid: 0xc8d8ec, skyHorizon: 0xeef4fb, skyBottom: 0xdde8f4, sunDir: [0.3, 0.4, -0.8], sunGlow: 0xffffff, nebula: 0, stars: 0, key: 0xeaf2ff, keyIntensity: 2.0, keyDir: [0.4, 0.9, 0.3], hemiSky: 0xf2f8ff, hemiGround: 0x8a9aaa, hemiIntensity: 1.15, fog: 0xe2ecf6, fogNear: 35, fogFar: 140, exposure: 1.0, env: 0.7, ground: 0xe8eef4 },
  snowNight: { skyTop: 0x0a1428, skyMid: 0x1a2a4a, skyHorizon: 0x4a6080, skyBottom: 0x101828, sunDir: [-0.3, 0.5, -0.8], sunGlow: 0xc8d8ff, nebula: 0, stars: 1, key: 0xb8c8ff, keyIntensity: 1.4, keyDir: [0.4, 0.9, 0.3], hemiSky: 0x8a9ac8, hemiGround: 0x20283a, hemiIntensity: 0.85, fog: 0x2a3a58, fogNear: 35, fogFar: 140, exposure: 1.1, env: 0.5, ground: 0xc8d4e4 },
  rain: { skyTop: 0x3a4656, skyMid: 0x5c6a7c, skyHorizon: 0x8c98a6, skyBottom: 0x4a5462, sunDir: [0.2, 0.5, -0.8], sunGlow: 0xc8d4e2, nebula: 0, stars: 0, key: 0xc8d4e2, keyIntensity: 1.6, keyDir: [0.4, 0.9, 0.3], hemiSky: 0xb8c4d2, hemiGround: 0x2a3038, hemiIntensity: 0.95, fog: 0x7e8a98, fogNear: 30, fogFar: 130, exposure: 1.05, env: 0.5, ground: 0x4a7a40 },
  rainNight: { skyTop: 0x05060f, skyMid: 0x141838, skyHorizon: 0x4a2a6a, skyBottom: 0x0a0a18, sunDir: [0.2, 0.4, -0.8], sunGlow: 0xff3ad8, nebula: 0.3, stars: 0.2, key: 0x9ab0ff, keyIntensity: 1.3, keyDir: [0.4, 0.9, 0.3], hemiSky: 0x6a5ab8, hemiGround: 0x0a0a1a, hemiIntensity: 0.8, fog: 0x1a1838, fogNear: 30, fogFar: 130, exposure: 1.15, env: 0.45, ground: 0x2a3040 },
  desert: { skyTop: 0x3a7ac8, skyMid: 0x8cb8e0, skyHorizon: 0xf6dcb0, skyBottom: 0xd8b888, sunDir: [0.3, 0.6, -0.7], sunGlow: 0xfff0c0, nebula: 0, stars: 0, key: 0xfff0d0, keyIntensity: 2.8, keyDir: [0.5, 0.85, 0.3], hemiSky: 0xfff0d8, hemiGround: 0x8a6a40, hemiIntensity: 1.0, fog: 0xe8d0a8, fogNear: 45, fogFar: 170, exposure: 1.05, env: 0.6, ground: 0xd8b880 },
  marsDust: { skyTop: 0x5a2a1a, skyMid: 0xa85a3a, skyHorizon: 0xf0b080, skyBottom: 0x8a4a2a, sunDir: [0.3, 0.5, -0.8], sunGlow: 0xffd0a0, nebula: 0, stars: 0.2, key: 0xffd0b0, keyIntensity: 2.2, keyDir: [0.5, 0.85, 0.3], hemiSky: 0xffc8a8, hemiGround: 0x5a2a1a, hemiIntensity: 0.95, fog: 0xc88060, fogNear: 35, fogFar: 140, exposure: 1.05, env: 0.5, ground: 0xb8603a },
  fog: { skyTop: 0x8a96a4, skyMid: 0xaab4c0, skyHorizon: 0xcfd6de, skyBottom: 0xb8c0ca, sunDir: [0.2, 0.5, -0.8], sunGlow: 0xf0f4f8, nebula: 0, stars: 0, key: 0xe8ecf0, keyIntensity: 1.5, keyDir: [0.4, 0.9, 0.3], hemiSky: 0xdde4ea, hemiGround: 0x5a6470, hemiIntensity: 1.1, fog: 0xc4ccd4, fogNear: 18, fogFar: 95, exposure: 1.0, env: 0.55, ground: 0x6a8a62 },
  night: { skyTop: 0x060a1e, skyMid: 0x101a3e, skyHorizon: 0x2a3a6e, skyBottom: 0x0a1024, sunDir: [-0.3, 0.5, -0.8], sunGlow: 0xaac4ff, nebula: 0.2, stars: 1, key: 0x9ab8ff, keyIntensity: 1.3, keyDir: [0.4, 0.9, 0.3], hemiSky: 0x5a6aa8, hemiGround: 0x101420, hemiIntensity: 0.75, fog: 0x14203e, fogNear: 40, fogFar: 150, exposure: 1.12, env: 0.45, ground: 0x2a4a34 },
  blossom: { skyTop: 0x6a9ae0, skyMid: 0xb8cff0, skyHorizon: 0xffe0ea, skyBottom: 0xf0c8d4, sunDir: [0.3, 0.55, -0.75], sunGlow: 0xfff0f4, nebula: 0, stars: 0, key: 0xfff0f0, keyIntensity: 2.4, keyDir: [0.5, 0.85, 0.35], hemiSky: 0xffe8f0, hemiGround: 0x6a5a5a, hemiIntensity: 1.05, fog: 0xf4d8e2, fogNear: 50, fogFar: 170, exposure: 1.05, env: 0.6, ground: 0x7aa060 },
  autumn: { skyTop: 0x4a6aa0, skyMid: 0xa0a8c0, skyHorizon: 0xf8d0a0, skyBottom: 0xc89a70, sunDir: [-0.4, 0.35, -0.8], sunGlow: 0xffd8a0, nebula: 0, stars: 0, key: 0xffd8a8, keyIntensity: 2.3, keyDir: [0.5, 0.8, 0.35], hemiSky: 0xffe0c0, hemiGround: 0x5a3a20, hemiIntensity: 0.95, fog: 0xe0b890, fogNear: 45, fogFar: 160, exposure: 1.05, env: 0.55, ground: 0x9a7a3a },
  embers: { skyTop: 0x1a0a0a, skyMid: 0x4a1a12, skyHorizon: 0xc84a1a, skyBottom: 0x2a0a06, sunDir: [-0.4, 0.2, -0.85], sunGlow: 0xff6a20, nebula: 0, stars: 0.1, key: 0xffa060, keyIntensity: 2.0, keyDir: [0.5, 0.85, 0.3], hemiSky: 0xff9a6a, hemiGround: 0x2a0a04, hemiIntensity: 0.8, fog: 0x5a2a1a, fogNear: 35, fogFar: 140, exposure: 1.1, env: 0.45, ground: 0x4a3a30 },
  aurora: { skyTop: 0x041020, skyMid: 0x0a2a3a, skyHorizon: 0x2a6a6a, skyBottom: 0x061418, sunDir: [-0.3, 0.5, -0.8], sunGlow: 0x7affc8, nebula: 0.6, stars: 1, key: 0xa8ffe0, keyIntensity: 1.3, keyDir: [0.4, 0.9, 0.3], hemiSky: 0x6ad8c0, hemiGround: 0x0a1418, hemiIntensity: 0.85, fog: 0x0e2a30, fogNear: 40, fogFar: 150, exposure: 1.12, env: 0.45, ground: 0xb8d4dc },
  underwater: { skyTop: 0x02223a, skyMid: 0x064a6a, skyHorizon: 0x1a8aa0, skyBottom: 0x022a3a, sunDir: [0.1, 0.95, -0.2], sunGlow: 0x8af0ff, nebula: 0, stars: 0, key: 0x9af0ff, keyIntensity: 1.8, keyDir: [0.2, 1, 0.1], hemiSky: 0x6ae0f0, hemiGround: 0x022030, hemiIntensity: 1.0, fog: 0x0a5a78, fogNear: 20, fogFar: 110, exposure: 1.08, env: 0.5, ground: 0x5ab8a8 },
  storm: { skyTop: 0x1a1e2a, skyMid: 0x2e3444, skyHorizon: 0x5a6070, skyBottom: 0x20242e, sunDir: [0.2, 0.5, -0.8], sunGlow: 0x9aa4b8, nebula: 0, stars: 0, key: 0xb8c4d8, keyIntensity: 1.4, keyDir: [0.4, 0.9, 0.3], hemiSky: 0x8a96aa, hemiGround: 0x1a1e24, hemiIntensity: 0.85, fog: 0x3a404c, fogNear: 28, fogFar: 120, exposure: 1.1, env: 0.45, ground: 0x3e6040 },
  jungle: { skyTop: 0x3a7aa8, skyMid: 0x8ac0b8, skyHorizon: 0xd8f0c8, skyBottom: 0x5a8a5a, sunDir: [0.3, 0.6, -0.7], sunGlow: 0xf8ffe0, nebula: 0, stars: 0, key: 0xf8ffe0, keyIntensity: 2.2, keyDir: [0.5, 0.85, 0.3], hemiSky: 0xd8ffd8, hemiGround: 0x2a4a2a, hemiIntensity: 1.0, fog: 0x9ac8a0, fogNear: 30, fogFar: 140, exposure: 1.05, env: 0.55, ground: 0x2f7a32 },
  golden: { skyTop: 0x3a5ac8, skyMid: 0x9ab0f0, skyHorizon: 0xfff0c8, skyBottom: 0xf8e0b0, sunDir: [0.35, 0.45, -0.8], sunGlow: 0xfff4d0, nebula: 0.25, stars: 0, key: 0xfff8e0, keyIntensity: 2.7, keyDir: [0.5, 0.85, 0.35], hemiSky: 0xfff8e8, hemiGround: 0x8a7a5a, hemiIntensity: 1.15, fog: 0xf8ecd0, fogNear: 60, fogFar: 200, exposure: 1.05, env: 0.65, ground: 0x9aa05a },
  stars: { skyTop: 0x02020a, skyMid: 0x0a0a24, skyHorizon: 0x2a1a4a, skyBottom: 0x05050f, sunDir: [-0.3, 0.4, -0.8], sunGlow: 0xc8a8ff, nebula: 1, stars: 1, key: 0xd8c8ff, keyIntensity: 1.6, keyDir: [0.4, 0.9, 0.3], hemiSky: 0x8a7ad8, hemiGround: 0x0a0814, hemiIntensity: 0.85, fog: 0x120e28, fogNear: 50, fogFar: 180, exposure: 1.12, env: 0.45, ground: 0x4a3a6a },
  smog: { skyTop: 0x4a4a48, skyMid: 0x7a7468, skyHorizon: 0xc8b090, skyBottom: 0x5a5248, sunDir: [-0.4, 0.3, -0.8], sunGlow: 0xffd8a0, nebula: 0, stars: 0, key: 0xffe0b0, keyIntensity: 2.0, keyDir: [0.5, 0.85, 0.3], hemiSky: 0xd8c8b0, hemiGround: 0x3a3428, hemiIntensity: 0.95, fog: 0x9a8c78, fogNear: 30, fogFar: 140, exposure: 1.05, env: 0.5, ground: 0x6a6450 },
};
/** משקל האקלים מול פלטת ערכת העולם (1 = האקלים בלבד) + שכבות מזג אוויר */
export const CLIMATES = {
  day: { w: 0.55, fx: [{ type: 'pollen' }] },
  dusk: { w: 0.6, fx: [{ type: 'fireflies', n: 70 }] },
  snow: { w: 0.85, fx: [{ type: 'snow' }] },
  snowNight: { w: 0.9, fx: [{ type: 'snow', n: 600 }] },
  rain: { w: 0.85, fx: [{ type: 'rain' }] },
  rainNight: { w: 0.9, fx: [{ type: 'rain', n: 700 }] },
  desert: { w: 0.75, fx: [{ type: 'dust' }] },
  marsDust: { w: 0.9, fx: [{ type: 'dust', color: [0xd88050, 0xb85a3a], n: 600 }] },
  fog: { w: 0.85, fx: [{ type: 'mist' }] },
  night: { w: 0.85, fx: [{ type: 'fireflies' }] },
  blossom: { w: 0.7, fx: [{ type: 'petals' }] },
  autumn: { w: 0.7, fx: [{ type: 'leaves' }] },
  embers: { w: 0.85, fx: [{ type: 'embers' }, { type: 'soot', n: 200 }] },
  aurora: { w: 0.9, fx: [{ type: 'snow', n: 260 }], aurora: true },
  underwater: { w: 0.92, fx: [{ type: 'bubbles' }], shafts: true },
  storm: { w: 0.9, fx: [{ type: 'rain', n: 1100, slant: -5 }], storm: true },
  jungle: { w: 0.75, fx: [{ type: 'fireflies', n: 120 }, { type: 'mist', n: 24 }] },
  golden: { w: 0.7, fx: [{ type: 'sparkles' }] },
  stars: { w: 0.92, fx: [{ type: 'starmotes' }] },
  smog: { w: 0.8, fx: [{ type: 'soot' }] },
};

const COLOR_KEYS = ['skyTop', 'skyMid', 'skyHorizon', 'skyBottom', 'sunGlow', 'key', 'hemiSky', 'hemiGround', 'fog', 'ground'];
const NUM_KEYS = ['nebula', 'stars', 'keyIntensity', 'hemiIntensity', 'fogNear', 'fogFar', 'exposure', 'env'];
const _a = new THREE.Color(), _b = new THREE.Color();
/** פלטת ערכת העולם + האקלים של האי */
export function climatePalette(base, climate) {
  const cfg = CLIMATES[climate] || CLIMATES.day;
  const cp = P[climate] || P.day;
  const w = cfg.w;
  const out = { ...base };
  for (const k of COLOR_KEYS) { if (base[k] == null || cp[k] == null) continue; out[k] = _a.setHex(base[k]).lerp(_b.setHex(cp[k]), w).getHex(); }
  for (const k of NUM_KEYS) { if (cp[k] == null) continue; out[k] = (base[k] ?? cp[k]) + (cp[k] - (base[k] ?? cp[k])) * w; }
  for (const k of ['sunDir', 'keyDir']) { const a = base[k] || cp[k], b = cp[k]; const v = new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), w).normalize(); out[k] = [v.x, v.y, v.z]; }
  return out;
}

// ---------- טקסטורות חלקיקים ----------
const texCache = {};
function tex(kind) {
  if (texCache[kind]) return texCache[kind];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const radial = (stops) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, 64, 64); };
  if (kind === 'streak') { const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(29, 0, 6, 64); }
  else if (kind === 'petal') { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(32, 32, 26, 14, 0.6, 0, TAU); x.fill(); }
  else if (kind === 'leaf') { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(32, 32, 28, 15, -0.5, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 3; x.beginPath(); x.moveTo(10, 46); x.lineTo(54, 18); x.stroke(); }
  else if (kind === 'ring') { x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 5; x.beginPath(); x.arc(32, 32, 24, 0, TAU); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.25)'; x.fill(); x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(24, 23, 5, 0, TAU); x.fill(); }
  else if (kind === 'star') { radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]); x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(30, 4, 4, 56); x.fillRect(4, 30, 56, 4); }
  else if (kind === 'mist') radial([[0, 'rgba(255,255,255,0.55)'], [0.6, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);
  else radial([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.75)'], [1, 'rgba(255,255,255,0)']]);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  return (texCache[kind] = tx);
}

// הגדרות שכבות: n, צבע, גודל, מהירות, נדנוד, טקסטורה, חיבור אור
const LAYER = {
  snow: { n: 900, color: [0xffffff], size: 0.22, vy: -1.2, sway: 0.6, tex: 'dot', alpha: 0.95 },
  rain: { n: 900, color: [0xb8d0ff], size: 0.42, vy: -16, vx: -2, sway: 0, tex: 'streak', alpha: 0.5 },
  dust: { n: 420, color: [0xe8c890, 0xd8b070], size: 0.3, vy: 0.08, vx: 1.6, sway: 0.4, tex: 'dot', alpha: 0.45 },
  mist: { n: 50, color: [0xffffff], size: 7, vy: 0, vx: 0.4, sway: 0.2, tex: 'mist', alpha: 0.16, low: true },
  fireflies: { n: 160, color: [0xd8ff6a, 0xfff08a], size: 0.26, vy: 0.05, sway: 0.7, tex: 'dot', add: true, blink: true, low: true },
  petals: { n: 420, color: [0xffb8d0, 0xffd8e6, 0xff9ac0], size: 0.3, vy: -0.9, vx: 0.6, sway: 0.9, tex: 'petal', alpha: 0.95 },
  leaves: { n: 300, color: [0xe0802a, 0xc8502a, 0xf0b040], size: 0.34, vy: -1.1, vx: 0.5, sway: 1.0, tex: 'leaf', alpha: 0.95 },
  embers: { n: 340, color: [0xff8a30, 0xffd060, 0xff5a20], size: 0.2, vy: 1.6, sway: 0.5, tex: 'dot', add: true },
  soot: { n: 300, color: [0x3a3530, 0x4a443c], size: 0.24, vy: 0.5, vx: 0.8, sway: 0.4, tex: 'dot', alpha: 0.6 },
  bubbles: { n: 340, color: [0xc8f6ff, 0xffffff], size: 0.32, vy: 1.4, sway: 0.3, tex: 'ring', alpha: 0.75 },
  sparkles: { n: 240, color: [0xfff0b0, 0xffffff, 0xffd870], size: 0.2, vy: 0.3, sway: 0.4, tex: 'star', add: true, blink: true },
  starmotes: { n: 300, color: [0xd8c8ff, 0xffffff, 0x9ad8ff], size: 0.18, vy: 0.08, sway: 0.2, tex: 'star', add: true, blink: true },
  pollen: { n: 80, color: [0xfffff0], size: 0.12, vy: 0.05, vx: 0.4, sway: 0.5, tex: 'dot', alpha: 0.7, low: true },
};
const W = 24, H = 15;

export class Weather {
  constructor(sm, sound) {
    this.sm = sm;
    this.sound = sound;
    this.group = new THREE.Group();
    sm.world.add(this.group);
    this.layers = [];
    this.extras = [];
    this.flash = 0;
    this.nextBolt = 4;
    sm.onUpdate((dt, t) => this.update(dt, t));
  }

  /** מחליף אקלים (כולל ניקוי השכבות הקודמות) */
  set(climate, { quality = 'high' } = {}) {
    this.clear();
    this.climate = climate;
    const cfg = CLIMATES[climate] || CLIMATES.day;
    for (const L of cfg.fx || []) this.layers.push(this.makeLayer({ ...LAYER[L.type], ...L, color: L.color || LAYER[L.type].color }, quality));
    if (cfg.aurora) this.addAurora();
    if (cfg.shafts) this.addShafts();
    this.storm = !!cfg.storm;
  }

  makeLayer(L, quality) {
    const n = Math.max(8, Math.round(L.n * (quality === 'low' ? 0.4 : 1)));
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), ph = new Float32Array(n);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * W; pos[i * 3 + 1] = Math.random() * H; pos[i * 3 + 2] = (Math.random() * 2 - 1) * W;
      c.setHex(L.color[i % L.color.length]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      ph[i] = Math.random() * TAU;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: L.size, map: tex(L.tex), vertexColors: true, transparent: true, depthWrite: false, opacity: L.alpha ?? 0.9, blending: L.add ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 5;
    this.group.add(pts);
    return { L, pts, pos, ph, n, base: mat.opacity };
  }

  /** זוהר צפוני: וילונות אור מעל האופק בצד הצפוני */
  addAurora() {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec2 vUv; uniform float uTime;
        void main(){ float w = sin(vUv.x*14.0 + uTime*0.6) * 0.5 + sin(vUv.x*31.0 - uTime*0.9) * 0.25 + 0.6;
          float a = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y)) * w;
          vec3 c = mix(vec3(0.2, 1.0, 0.6), vec3(0.6, 0.3, 1.0), vUv.y * 1.2);
          gl_FragColor = vec4(c * a * 0.9, a * 0.8); }`,
    });
    for (let i = 0; i < 3; i++) {
      const g = new THREE.PlaneGeometry(150, 40, 48, 1);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setZ(k, Math.sin(x * 0.05 + i) * 12); }
      const m = new THREE.Mesh(g, mat);
      m.position.set(-20 + i * 20, 55 + i * 6, -110 - i * 10);
      m.rotation.x = 0.25;
      m.renderOrder = -5;
      this.group.add(m);
      this.extras.push(m);
    }
    this.auroraMat = mat;
  }

  /** קרני אור מלמעלה (מתחת למים) */
  addShafts() {
    const c = document.createElement('canvas'); c.width = 8; c.height = 64;
    const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(200,255,255,0.5)'); g.addColorStop(1, 'rgba(200,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 8, 64);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, opacity: 0.55 });
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3.5, 30, 10, 1, true), mat);
      m.position.set((Math.random() - 0.5) * 34, 14, (Math.random() - 0.5) * 30 - 6);
      m.rotation.z = (Math.random() - 0.5) * 0.25;
      m.userData.ph = Math.random() * TAU;
      this.group.add(m);
      this.extras.push(m);
    }
    this.shaftMat = mat;
  }

  clear() {
    for (const l of this.layers) { this.group.remove(l.pts); l.pts.geometry.dispose(); l.pts.material.dispose(); }
    for (const m of this.extras) { this.group.remove(m); m.geometry.dispose(); }
    this.layers = []; this.extras = [];
    this.auroraMat = this.shaftMat = null;
    if (this.flash) { this.sm.hemi.intensity -= this.flash; this.flash = 0; }
    this.storm = false;
  }

  update(dt, t) {
    for (const l of this.layers) {
      const { L, pos, ph, n } = l;
      const vx = L.vx || 0, vy = L.vy || 0, sw = L.sway || 0;
      for (let i = 0; i < n; i++) {
        const k = i * 3, p = ph[i];
        pos[k] += (vx + Math.sin(t * 0.9 + p) * sw) * dt;
        pos[k + 1] += vy * dt * (0.8 + (p % 1) * 0.4);
        pos[k + 2] += Math.cos(t * 0.7 + p * 1.3) * sw * 0.6 * dt;
        if (pos[k + 1] < 0) pos[k + 1] += H; else if (pos[k + 1] > H) pos[k + 1] -= H;
        if (pos[k] > W) pos[k] -= 2 * W; else if (pos[k] < -W) pos[k] += 2 * W;
        if (pos[k + 2] > W) pos[k + 2] -= 2 * W; else if (pos[k + 2] < -W) pos[k + 2] += 2 * W;
      }
      l.pts.geometry.attributes.position.needsUpdate = true;
      if (L.blink) l.pts.material.opacity = l.base * (0.65 + Math.sin(t * 3.1) * 0.2 + Math.sin(t * 7.3) * 0.15);
    }
    if (this.auroraMat) this.auroraMat.uniforms.uTime.value = t;
    if (this.shaftMat) this.shaftMat.opacity = 0.4 + Math.sin(t * 0.8) * 0.15;
    // סערה: ברקים מדי פעם
    if (this.storm) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.nextBolt = 3 + Math.random() * 6;
        const add = 2.2;
        this.sm.hemi.intensity += add; this.flash += add;
        setTimeout(() => { this.sm.hemi.intensity -= add; this.flash -= add; }, 90 + Math.random() * 80);
        setTimeout(() => this.sound?.thunder?.(), 250 + Math.random() * 500);
      }
    }
  }
}
