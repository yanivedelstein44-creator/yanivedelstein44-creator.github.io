/**
 * מוזיאון הזמן — האי המרכזי.
 * - בית הקולנוע המרכזי (נוגעים בו → סרט הסיפור / סרט ההדרכה) והחנות (בוטים, חיות ובגדים).
 * - האי מתחיל קטן ומתרחב: כל אי שנכבש שולח אריח אדמה גדול ממנו — קרקע באקלים שלו, המונומנט שלו
 *   על כן אבן ומעט צמחייה — שעף מעבר לים ונצמד לחוף. האריחים מסודרים בטבעות (קודם בחזית האי),
 *   כך שהאי גדל טבעת אחרי טבעת: מ-17 יחידות רדיוס עד יותר מפי 3 (כל אריח מרחיב את החוף בכ-40%).
 * - בניין "מוזיאון הזמן" עם שעון מעל הרחבה (נגיעה → אלבום האיים).
 * - מיקרו-אקלים מעל כל חלק: שלג, עלי דובדבן, גחלים, בועות, נצנוצים…
 * כל החלקים מאוחדים לשתי רשתות (מוצק + זוהר) כדי שגם 98 חלקים יעלו מעט קריאות ציור.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder, MON_COLORS as C, monumentGeometry, MONUMENT_SOLID, MONUMENT_GLOW } from './Monuments.js';
import { HUB_ID, PREMIUM_FIRST, regionOf, islandDef } from '../config/Islands.js';
import { GROUND } from '../config/IslandEras.js';
import { islandPos } from './WorldMap.js';
import { PlayerAvatar3D } from './PlayerAvatar3D.js';
import { buildPetRig } from './PetCompanion3D.js';
import { drawIcon } from '../ui/icons.js';
import { t } from '../ui/i18n.js';

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;
// הרובעים: העולמות המוקדמים בצפון (מול המצלמה), השאר מתפזרים לצדדים ומאחור
const SECTOR_OFF = { 1: 0, 2: -1, 3: 1, 4: -2, 5: 2, 6: -3, 7: 3, 8: -4, 9: 4, 10: 5 };
const SECTOR = TAU / 10;
const ROCK = { snow: 0x8a96a6, snowNight: 0x6a7686, desert: 0xb8925a, marsDust: 0x8a4a2a, underwater: 0x3a7a8a, embers: 0x2a2220, stars: 0x3a3060, aurora: 0x5a6a7a };
// מיקרו-אקלים לחלקי הפסיפס
const MICRO = {
  snow: { color: 0xffffff, vy: -0.9, add: false }, snowNight: { color: 0xffffff, vy: -0.9 }, aurora: { color: 0xc8fff0, vy: -0.6, add: true },
  blossom: { color: 0xffb8d0, vy: -0.7 }, autumn: { color: 0xe0802a, vy: -0.8 }, rain: { color: 0xb8d0ff, vy: -6 }, storm: { color: 0xb8d0ff, vy: -7 }, rainNight: { color: 0xff8ae8, vy: -6, add: true },
  embers: { color: 0xff8a30, vy: 1.2, add: true }, underwater: { color: 0xc8f6ff, vy: 1.0 }, golden: { color: 0xfff0b0, vy: 0.4, add: true },
  stars: { color: 0xd8c8ff, vy: 0.2, add: true }, night: { color: 0xd8ff6a, vy: 0.1, add: true }, jungle: { color: 0xd8ff6a, vy: 0.1, add: true },
  desert: { color: 0xe8c890, vy: 0.1 }, marsDust: { color: 0xd88050, vy: 0.1 },
  // איי הפרימיום
  magnetic: { color: 0x8ad0ff, vy: 0.3, add: true }, glassIce: { color: 0xffffff, vy: -0.8 }, basalt: { color: 0xff8a30, vy: 1.2, add: true }, vinyl: { color: 0xff7ab8, vy: 0.4, add: true },
  whisper: { color: 0xd8ff6a, vy: 0.1, add: true }, abyssal: { color: 0xc8f6ff, vy: 1.0 }, clockwork: { color: 0xffd070, vy: 0.4, add: true }, candy: { color: 0xffc8e8, vy: -0.7 },
  mirror: { color: 0xffffff, vy: 0.2, add: true }, starDune: { color: 0xd8c8ff, vy: 0.2, add: true }, cyberLab: { color: 0x33ff8a, vy: -3, add: true }, library: { color: 0xffe0a0, vy: -0.3 },
  stormCloud: { color: 0xb8d0ff, vy: -7 }, ink: { color: 0xc8282a, vy: -0.7 }, reef: { color: 0xffffff, vy: 0.6 }, hive: { color: 0xffd060, vy: 0.4, add: true },
  marbleDay: { color: 0xffffff, vy: -0.3 }, space: { color: 0xd8c8ff, vy: 0.2, add: true }, geyser: { color: 0xffffff, vy: 1.0 }, mushroom: { color: 0x9affd8, vy: 0.3, add: true },
  porcelain: { color: 0x8ab0e8, vy: -0.7 }, toy: { color: 0xffd23a, vy: -0.8 }, wheat: { color: 0xfff0b0, vy: 0.1 }, sepia: { color: 0xd8c4a0, vy: 0.1 },
  cobweb: { color: 0xdfe6ff, vy: 0.1, add: true }, rapids: { color: 0xc8ecff, vy: -5 }, tundra: { color: 0xffffff, vy: -0.9 }, cell: { color: 0xffd0e8, vy: 1.0 },
  rune: { color: 0xff4a2a, vy: 0.4, add: true }, zenith: { color: 0xfff0b0, vy: 0.4, add: true },
};

/** האי המרכזי בהתחלה (רדיוס), רוחב כל טבעת של אריחים, ומספר האריחים בכל טבעת */
export const HUB_BASE_R = 17;
const RING_W = 7.5;
const RING_N = [15, 21, 26, 32, 37, 43];

/**
 * מקום האריח לפי סדר הכיבוש (0 = האי הראשון שנכבש). מתחילים בחזית האי (מול המצלמה, הכי גלוי)
 * ומתפשטים לסירוגין שמאלה/ימינה; כל טבעת מוזזת בחצי אריח (כמו לבנים).
 */
export function hubSlot(index) {
  let k = 0, i = index;
  while (k < RING_N.length - 1 && i >= RING_N[k]) { i -= RING_N[k]; k++; }
  const n = RING_N[k], span = TAU / n;
  const j = i % 2 ? Math.ceil(i / 2) : -i / 2;
  const a = Math.PI / 2 + j * span + (k % 2 ? span / 2 : 0);
  const rIn = HUB_BASE_R + k * RING_W, rOut = rIn + RING_W, rad = (rIn + rOut) / 2;
  return { x: Math.cos(a) * rad, z: Math.sin(a) * rad, a, rad, rIn, rOut, span, ring: k };
}

function dotTex() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

/** שלט מואר עם טקסט (קנבס) */
function signTexture(text, { w = 512, h = 128, bg = '#5a0a14', fg = '#ffe9a8', border = '#f2c14e', bulbs = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.lineWidth = 10; x.strokeStyle = border; x.strokeRect(8, 8, w - 16, h - 16);
  if (bulbs) { x.fillStyle = '#fff6c8'; for (let i = 0; i < 18; i++) { const px = 24 + (i * (w - 48)) / 17; x.beginPath(); x.arc(px, 18, 5, 0, TAU); x.arc(px, h - 18, 5, 0, TAU); x.fill(); } }
  x.fillStyle = fg; x.font = `900 ${Math.round(h * 0.46)}px Rubik, Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(255,200,80,0.9)'; x.shadowBlur = 18;
  x.fillText(text, w / 2, h / 2 + 2);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}
function labelSprite(text, ic) {
  const c = document.createElement('canvas'); c.width = 320; c.height = 96;
  const x = c.getContext('2d');
  const r = 40;
  x.fillStyle = 'rgba(16,10,32,0.86)'; x.beginPath(); x.moveTo(8 + r, 8); x.arcTo(312, 8, 312, 88, r); x.arcTo(312, 88, 8, 88, r); x.arcTo(8, 88, 8, 8, r); x.arcTo(8, 8, 312, 8, r); x.fill();
  x.lineWidth = 4; x.strokeStyle = 'rgba(242,201,76,0.95)'; x.stroke();
  drawIcon(x, ic, 62, 48, 54);
  x.fillStyle = '#fff3c8'; x.font = '800 40px Rubik, Arial, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle';
  x.fillText(text, 100, 50);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthWrite: false, transparent: true }));
  sp.scale.set(4.2, 1.26, 1);
  return sp;
}

function cinemaGeometry() {
  const b = new Builder();
  b.box(4.4, 0.25, 3.6, C.lstone, [0, 0.12, 0.2]);
  b.box(3.6, 2.6, 2.6, C.cream, [0, 1.55, -0.3]).box(3.9, 0.3, 2.9, C.gold, [0, 2.95, -0.3]).box(3.4, 0.5, 2.4, C.cream, [0, 3.35, -0.4]);
  b.box(0.8, 2.6, 0.6, C.cream, [0, 4.4, 0.5]).box(0.86, 0.16, 0.66, C.gold, [0, 5.75, 0.5]).cone(0.32, 0.7, C.gold, [0, 6.2, 0.5], 8);
  for (let i = 0; i < 6; i++) b.box(0.08, 0.32, 0.02, C.flame, [0, 3.4 + i * 0.4, 0.81], undefined, true);
  b.box(3.2, 0.3, 1.3, C.red, [0, 2.25, 1.35]);
  for (let i = 0; i < 12; i++) b.sph(0.06, C.flame, [-1.45 + i * 0.264, 2.07, 2.01], undefined, 6, true);
  b.box(1.2, 1.55, 0.06, C.dark, [0, 1.0, 1.02]).box(0.04, 1.55, 0.08, C.gold, [0, 1.0, 1.04]);
  b.box(0.6, 0.85, 0.05, C.blue, [-1.3, 1.15, 1.02]).box(0.6, 0.85, 0.05, C.purple, [1.3, 1.15, 1.02]);
  b.box(0.5, 0.3, 0.06, C.flame, [-1.3, 1.25, 1.05], undefined, true).box(0.5, 0.3, 0.06, C.cyan, [1.3, 1.25, 1.05], undefined, true);
  b.box(1.1, 0.03, 2.0, C.red, [0, 0.27, 2.1]);
  [-1.9, 1.9].forEach((x) => { b.cyl(0.08, 0.1, 1.1, C.iron, [x, 0.8, 2.1], 8).cone(0.2, 0.35, C.silver, [x, 1.45, 2.1], 8, [0.5, 0, x < 0 ? 0.4 : -0.4]); b.cyl(0.04, 0.04, 0.8, C.gold, [x * 0.6, 0.65, 2.7], 6).sph(0.07, C.gold, [x * 0.6, 1.05, 2.7]); });
  return b.build();
}

/** "מוזיאון הזמן": מקדש קלאסי עם עמודים, גמלון ושעון גדול — מאחורי הלוח */
function museumGeometry() {
  const b = new Builder();
  b.box(6.8, 0.22, 3.6, C.lstone, [0, 0.11, 0]).box(6.4, 0.22, 3.2, C.marble, [0, 0.33, -0.05]);
  b.box(5.6, 2.9, 2.1, C.cream, [0, 1.89, -0.55]);
  for (let i = 0; i < 6; i++) {
    const x = -2.6 + i * 1.04;
    b.cyl(0.2, 0.23, 2.9, C.marble, [x, 1.89, 1.05], 10).box(0.5, 0.16, 0.5, C.gold, [x, 3.42, 1.05]).box(0.5, 0.12, 0.5, C.lstone, [x, 0.5, 1.05]);
  }
  b.box(6.4, 0.42, 3.1, C.cream, [0, 3.71, -0.05]).box(6.5, 0.1, 3.2, C.gold, [0, 3.97, -0.05]);
  b.prism(6.4, 1.25, 3.0, C.cream, [0, 4.02, -0.05]);
  b.box(1.1, 0.12, 1.2, C.dark, [0, 1.05, 0.46]).box(1.0, 1.7, 0.08, C.dark, [0, 1.3, 0.47]).box(0.06, 1.7, 0.1, C.gold, [0, 1.3, 0.5]);
  // השעון הגדול בגמלון
  b.cyl(0.62, 0.62, 0.1, C.white, [0, 4.5, 1.47], 24, [Math.PI / 2, 0, 0]).tor(0.64, 0.06, C.gold, [0, 4.5, 1.5]);
  b.box(0.05, 0.42, 0.04, C.dark, [0, 4.66, 1.55]).box(0.3, 0.05, 0.04, C.dark, [0.12, 4.5, 1.55]);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.box(0.05, 0.1, 0.03, C.gold, [Math.sin(a) * 0.5, 4.5 + Math.cos(a) * 0.5, 1.53], [0, 0, -a]); }
  // כיפה עם שעון חול
  b.cyl(0.95, 1.05, 0.7, C.cream, [0, 5.05, -0.6], 14).hemi(0.95, C.gold, [0, 5.4, -0.6]).cyl(0.06, 0.06, 0.5, C.gold, [0, 6.55, -0.6], 6);
  b.cone(0.22, 0.32, C.gold, [0, 7.0, -0.6], 8, [Math.PI, 0, 0]).cone(0.22, 0.32, C.gold, [0, 7.3, -0.6], 8).sph(0.07, C.flame, [0, 7.15, -0.6], undefined, 6, true);
  // לפידים בכניסה
  [-3.0, 3.0].forEach((x) => b.cyl(0.07, 0.09, 1.2, C.iron, [x, 0.9, 1.55], 8).sph(0.13, C.flame, [x, 1.6, 1.55], undefined, 8, true));
  return b.build();
}

function shopGeometry() {
  const b = new Builder();
  b.box(3.8, 0.25, 3.0, C.lstone, [0, 0.12, 0.1]);
  b.box(3.2, 1.7, 2.2, C.wood, [0, 1.1, -0.3]).prism(3.5, 1.0, 2.5, C.red, [0, 1.95, -0.3]);
  b.box(3.0, 0.95, 0.55, C.dwood, [0, 0.72, 1.0]).box(3.1, 0.08, 0.65, C.gold, [0, 1.22, 1.0]);
  for (let i = 0; i < 7; i++) b.box(0.46, 0.05, 1.3, i % 2 ? C.white : C.red, [-1.38 + i * 0.46, 2.15, 1.05], [0.38, 0, 0]);
  [-1.45, 1.45].forEach((x) => b.cyl(0.06, 0.06, 2.0, C.dwood, [x, 1.15, 1.65], 6));
  b.cyl(0.05, 0.05, 0.9, C.gold, [0, 3.2, -0.3], 6).oct(0.48, C.cyan, [0, 3.95, -0.3], [1, 1.35, 1], true).tor(0.62, 0.05, C.gold, [0, 3.95, -0.3], [Math.PI / 2, 0, 0]);
  b.box(0.3, 0.3, 0.3, C.gold, [-0.9, 1.42, 1.0]).sph(0.16, C.pink, [-0.4, 1.42, 1.0]).oct(0.15, C.violet, [0.2, 1.45, 1.0], [1, 1.3, 1], true).box(0.35, 0.25, 0.25, C.blue, [0.85, 1.38, 1.0]);
  b.box(0.6, 0.5, 0.6, C.wood, [1.6, 0.5, 1.5]).box(0.5, 0.4, 0.5, C.wood, [-1.65, 0.45, 1.6]);
  return b.build();
}

/** אריח של אי: טבעת־מקטע בקרקע של האקלים שלו, לוח סלע וזיז מתחת, כן אבן עם המונומנט וצמחייה. קואורדינטות מקומיות (מרכז האריח) */
function chunkGeometry(id, slot) {
  const d = islandDef(id);
  const cl = d.era.climate;
  const { a, span, rIn, rOut, rad } = slot;
  const cx = slot.x, cz = slot.z;
  const b = new Builder();
  const local = (g) => g.translate(-cx, 0, -cz);
  // פני הקרקע (מעט מעל לוח הסלע)
  const top = new THREE.RingGeometry(rIn, rOut, 14, 1, -(a + span / 2), span).rotateX(-Math.PI / 2);
  b.add(local(top), GROUND[cl] ?? C.grass);
  // לוח סלע עבה
  const sh = new THREE.Shape();
  sh.moveTo(Math.cos(a - span / 2) * rIn, Math.sin(a - span / 2) * rIn);
  sh.absarc(0, 0, rOut, a - span / 2, a + span / 2, false);
  sh.absarc(0, 0, rIn, a + span / 2, a - span / 2, true);
  const slab = new THREE.ExtrudeGeometry(sh, { depth: 1.1, bevelEnabled: false, curveSegments: 10 }).rotateX(Math.PI / 2).translate(0, -0.03, 0);
  b.add(local(slab), ROCK[cl] ?? 0x6a5848);
  // זיז סלע מתחת (מראה של אי מרחף)
  const keelR = Math.min(RING_W, span * rad) * 0.42;
  b.cyl(keelR, 0.35, 3.6, ROCK[cl] ?? 0x6a5848, [0, -1.13 - 1.8, 0], 7);
  // כן אבן + המונומנט, פונה אל מרכז האי
  b.cyl(1.85, 2.0, 0.28, C.lstone, [0, 0.14, 0], 12).cyl(1.93, 1.93, 0.06, C.gold, [0, 0.29, 0], 12);
  // צמחייה סביב
  const veg = { snow: C.snow, snowNight: C.snow, desert: 0x6a8a3a, blossom: C.pink, autumn: 0xe0802a, underwater: C.coral, stars: C.crystal, aurora: C.ice, embers: C.dstone, marsDust: C.mars }[cl] ?? C.leaf;
  const glowVeg = cl === 'stars' || cl === 'aurora';
  for (let i = 0; i < 8; i++) {
    const u = 0.14 + ((id * 7 + i * 3) % 10) / 10 * 0.72, v = 0.12 + ((id * 3 + i * 5) % 10) / 10 * 0.76;
    const rr = rIn + (rOut - rIn) * u, aa = a - span / 2 + span * v;
    const x = Math.cos(aa) * rr - cx, z = Math.sin(aa) * rr - cz;
    if (Math.hypot(x, z) < 2.5) continue;
    if (cl === 'underwater') b.cone(0.14, 0.8, veg, [x, 0.4, z], 6);
    else if (cl === 'desert' || cl === 'marsDust') b.dod(0.3, ROCK[cl], [x, 0.16, z]);
    else if (glowVeg) b.oct(0.22, veg, [x, 0.4, z], [1, 1.6, 1], true);
    else { b.cyl(0.07, 0.08, 0.55, C.wood, [x, 0.27, z], 5); b.cone(0.38, 1.0, veg, [x, 0.9, z], 7); }
  }
  const { solid, glow } = b.build();
  const out = { solid: [solid], glow: glow ? [glow] : [] };
  const mon = monumentGeometry(d.era.monument);
  const mm = new THREE.Matrix4().compose(new V3(0, 0.32, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a - Math.PI / 2, 0)), new V3(2.0, 2.0, 2.0));
  if (mon.solid) out.solid.push(mon.solid.clone().applyMatrix4(mm));
  if (mon.glow) out.glow.push(mon.glow.clone().applyMatrix4(mm));
  return out;
}

export class HubMuseum {
  constructor(app) {
    this.app = app;
    this.sm = app.sm;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.sm.world.add(this.group);
    this.chunksGroup = new THREE.Group();
    this.group.add(this.chunksGroup);
    this.micro = null;
    this.residentsGroup = new THREE.Group();
    this.group.add(this.residentsGroup);
    this.walkers = [];
    this.residentIds = [...(app.economy.s.residents || [])];
    this.buildBuildings();
    this.sm.onUpdate((dt, tt) => this.update(dt, tt));
  }

  buildBuildings() {
    const mk = (geo, pos, label, ic, sign) => {
      const g = new THREE.Group();
      if (geo.solid) { const m = new THREE.Mesh(geo.solid, MONUMENT_SOLID); m.castShadow = true; m.receiveShadow = true; g.add(m); }
      if (geo.glow) g.add(new THREE.Mesh(geo.glow, MONUMENT_GLOW));
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.62), new THREE.MeshBasicMaterial({ map: signTexture(sign), toneMapped: false }));
      sg.position.set(0, 2.67, 2.02);
      g.add(sg);
      const lab = labelSprite(label, ic);
      lab.position.set(0, label === 'cinema' ? 7.3 : label === 'museum' ? 8.6 : 5.4, 0.6);
      g.add(lab);
      g.position.set(...pos);
      g.rotation.y = pos[0] < 0 ? 0.42 : -0.42; // פונים אל המצלמה, מעט פנימה
      g.userData.label = lab;
      this.group.add(g);
      return g;
    };
    this.cinema = mk(cinemaGeometry(), [-6.6, 0, -11.6], 'cinema', 'play', 'CINEMA');
    this.shop = mk(shopGeometry(), [6.6, 0, -11.6], 'shop', 'gem', 'SHOP');
    this.museumHall = mk(museumGeometry(), [0, 0, -13.4], 'museum', 'temple', 'TIME MUSEUM');
    this.museumHall.rotation.y = 0;
    const ms = this.museumHall.children.find((c) => c.geometry?.type === 'PlaneGeometry');
    if (ms) { ms.position.set(0, 3.71, 1.47); ms.scale.set(1.9, 0.62, 1); }
    this.museumHall.userData.label.position.set(0, 8.6, 0);
    this.relabel();
  }

  /** שלטים בשפה הנוכחית */
  relabel() {
    for (const [g, key, ic] of [[this.cinema, 'cinema', 'play'], [this.shop, 'shop', 'gem'], [this.museumHall, 'museum', 'temple']]) {
      const old = g.userData.label;
      const lab = labelSprite(t(key), ic);
      lab.position.copy(old.position);
      g.remove(old); old.material.map.dispose(); old.material.dispose();
      g.add(lab);
      g.userData.label = lab;
    }
  }

  setActive(on) {
    this.active = on;
    this.syncDragon();
    this.group.visible = on;
    if (on) { this.rebuild(); this.spawnResidents(); } else this.clearResidents();
  }

  // ---------- תושבים: בוטים שנקנו בחנות מסתובבים חופשי עם החיות שלהם ----------
  setResidents(ids) { this.residentIds = [...ids]; if (this.active) this.spawnResidents(); }
  clearResidents() {
    this.residentsGroup.clear();
    this.walkers = [];
  }
  randomSpot() {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * TAU, r = 9 + Math.random() * (HUB_BASE_R - 10.5);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 6.4 && Math.abs(z) < 8) continue;
      if (Math.hypot(Math.abs(x) - 6.6, z + 11.6) < 3.6) continue;
      if (Math.abs(x) < 4 && z < -10) continue;
      return new V3(x, 0, z);
    }
    return new V3(0, 0, 12);
  }
  spawnResidents() {
    this.clearResidents();
    // בכל כניסה לאי: 5–7 בוטים אחרים מתוך אלה שקנית (במכשירים חלשים — עד 4)
    const max = this.sm.quality?.level === 'low' ? 4 : 5 + Math.floor(Math.random() * 3);
    const ids = [...this.residentIds].sort(() => Math.random() - 0.5).slice(0, max);
    for (const id of ids) {
      const b = islandDef(id).bot;
      const ups = [];
      const av = new PlayerAvatar3D({ world: this.residentsGroup, onUpdate: (fn) => ups.push(fn), addShake() {} }, this.app.fx);
      av.throne.visible = false;
      av.setLoadout(b.loadout, { instant: true });
      av.setLook(b.look);
      av.pose.stand = 1; av.applyPose();
      av.group.scale.setScalar(1.15);
      const pet = buildPetRig(b.pet, { hue: b.petHue });
      pet.root.scale.multiplyScalar(0.95);
      pet.body.userData.y0 = pet.body.position.y;
      this.residentsGroup.add(pet.root);
      const pos = this.randomSpot();
      av.group.position.copy(pos);
      pet.root.position.copy(pos).add(new V3(1, 0, 0.4));
      this.walkers.push({ id, av, ups, pet, target: this.randomSpot(), wait: Math.random() * 2, speed: 1.1 + Math.random() * 0.5, phase: Math.random() * 10 });
    }
  }
  updateWalkers(dt, tt) {
    for (const w of this.walkers) {
      const g = w.av.group;
      const d = w.target.clone().sub(g.position).setY(0);
      const dist = d.length();
      let moving = false;
      if (w.wait > 0) w.wait -= dt;
      else if (dist < 0.3) { w.wait = 1.5 + Math.random() * 3; w.target = this.randomSpot(); }
      else {
        moving = true;
        d.divideScalar(dist);
        g.position.addScaledVector(d, Math.min(dist, w.speed * dt));
        const yaw = Math.atan2(d.x, d.z);
        let dy = yaw - g.rotation.y; while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU;
        g.rotation.y += dy * Math.min(1, dt * 6);
      }
      const ph = tt * 7.5 + w.phase;
      w.av.legs.forEach(({ thigh, knee }, i) => { const sn = Math.sin(ph + i * Math.PI); thigh.rotation.x = moving ? sn * 0.5 : thigh.rotation.x * 0.85; knee.rotation.x = moving ? Math.max(0, -sn) * 0.7 : knee.rotation.x * 0.85; });
      w.av.arms.forEach(({ sh }, i) => { sh.rotation.x = moving ? -Math.sin(ph + i * Math.PI) * 0.4 : sh.rotation.x * 0.9; });
      w.av.body.position.y = moving ? Math.abs(Math.sin(ph)) * 0.04 : 0;
      w.av.lookAt(moving ? w.target : new V3(0, 1, 0));
      w.ups.forEach((fn) => fn(dt, tt));
      // החיה הולכת אחרי הבוט
      const want = g.position.clone().add(new V3(Math.sin(g.rotation.y + 2.2) * 1.1, 0, Math.cos(g.rotation.y + 2.2) * 1.1));
      const pd = want.sub(w.pet.root.position).setY(0);
      const pdl = pd.length();
      const r = w.pet;
      const petMoving = pdl > 0.15;
      if (petMoving) { w.pet.root.position.addScaledVector(pd.normalize(), Math.min(pdl, (w.speed + 0.4) * dt)); w.pet.root.rotation.y = Math.atan2(pd.x, pd.z); }
      r.tails.forEach((chain, ci) => chain.forEach((seg, i) => { seg.rotation.y = Math.sin(tt * (3 + r.wag) + i * 0.6 + ci) * (0.25 + r.wag * 0.08); }));
      r.legs.forEach((leg, i) => { leg.rotation.x = petMoving ? Math.sin(tt * 12 + (i % 2 ? Math.PI : 0)) * 0.6 : leg.rotation.x * 0.85; });
      r.wings.forEach((wg) => { const sd = wg.userData.side || 1; wg.rotation.z = sd * (0.2 + Math.sin(tt * (r.hover ? 7 : 1.4)) * (r.hover ? 0.4 : 0.05)); });
      r.body.position.y = (r.body.userData.y0 ?? 0) + (r.hover ? 0.3 + Math.sin(tt * 1.6 + w.phase) * 0.1 : 0);
    }
  }

  /** בונה מחדש את הפסיפס מכל האיים שנכבשו (חוץ מאלה שמחכים לאנימציית ההצטרפות) */
  rebuild(skip = new Set(this.app.store.get('pendingDocks') || [])) {
    this.chunksGroup.children.forEach((m) => m.geometry.dispose());
    this.chunksGroup.clear();
    const solids = [], glows = [];
    this.pieces = [];
    let outer = HUB_BASE_R;
    for (const id of this.app.progression.conqueredList()) {
      if (id === HUB_ID || skip.has(id)) continue;
      const slot = this.slotOf(id);
      outer = Math.max(outer, slot.rOut);
      const g = chunkGeometry(id, slot);
      const m = new THREE.Matrix4().makeTranslation(slot.x, 0, slot.z);
      g.solid.forEach((x) => solids.push(x.applyMatrix4(m)));
      g.glow.forEach((x) => glows.push(x.applyMatrix4(m)));
      this.pieces.push({ id, slot, climate: islandDef(id).era.climate });
    }
    if (solids.length) { const mesh = new THREE.Mesh(mergeGeometries(solids, false), MONUMENT_SOLID); mesh.receiveShadow = true; this.chunksGroup.add(mesh); }
    if (glows.length) this.chunksGroup.add(new THREE.Mesh(mergeGeometries(glows, false), MONUMENT_GLOW));
    this.extent = outer;
    this.shape = this.shapePoints();
    if (this.active) this.sm.setIslandRadius(outer, HUB_BASE_R, this.shape);
    this.buildMicro();
  }

  /** קו החוף של האי כרגע: האי הבסיסי + הקצה החיצוני של כל אריח (למסגור המבט הרחב) */
  shapePoints(extra = null) {
    const pts = [];
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; pts.push(new V3(Math.cos(a) * HUB_BASE_R, 0, Math.sin(a) * HUB_BASE_R)); }
    for (const p of [...(this.pieces || []).map((x) => x.slot), ...(extra ? [extra] : [])]) {
      for (const k of [-0.5, 0, 0.5]) pts.push(new V3(Math.cos(p.a + k * p.span) * p.rOut, 0, Math.sin(p.a + k * p.span) * p.rOut));
    }
    return pts;
  }

  /** מקום האריח של אי — לפי הסדר שבו נכבש (כך המקומות לא זזים כשנכבשים איים חדשים) */
  slotOf(id) {
    const order = this.app.progression.conqueredList().filter((x) => x !== HUB_ID);
    const i = order.indexOf(id);
    return hubSlot(i < 0 ? order.length : i);
  }

  /** מיקרו-אקלים: שכבת חלקיקים אחת לכל סוג, מעל החלקים באותו אקלים */
  buildMicro() {
    if (this.micro) { this.micro.forEach((l) => { this.group.remove(l.pts); l.pts.geometry.dispose(); l.pts.material.dispose(); }); }
    this.micro = [];
    const byType = {};
    for (const p of this.pieces) if (MICRO[p.climate]) (byType[p.climate] ||= []).push(p);
    const tex = this.dot ||= dotTex();
    for (const [cl, list] of Object.entries(byType)) {
      const cfg = MICRO[cl];
      const per = 26, n = list.length * per;
      const pos = new Float32Array(n * 3), home = new Float32Array(n * 2), ph = new Float32Array(n);
      list.forEach((p, k) => { for (let i = 0; i < per; i++) { const j = k * per + i; const a = Math.random() * TAU, r = Math.random() * 3.4; home[j * 2] = p.slot.x + Math.cos(a) * r; home[j * 2 + 1] = p.slot.z + Math.sin(a) * r; pos[j * 3] = home[j * 2]; pos[j * 3 + 1] = Math.random() * 5; pos[j * 3 + 2] = home[j * 2 + 1]; ph[j] = Math.random() * TAU; } });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: cfg.color, size: cfg.vy < -3 ? 0.18 : 0.24, map: tex, transparent: true, depthWrite: false, opacity: 0.85, blending: cfg.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
      pts.frustumCulled = false;
      this.group.add(pts);
      this.micro.push({ pts, pos, home, ph, n, vy: cfg.vy });
    }
  }

  /** דרקון השעונים הזהוב מרחף מעל האי המרכזי — למי שפתח את איי הפרימיום */
  syncDragon() {
    const own = (this.app.economy.s.pets || []).includes('clockwork_dragon');
    if (own && !this.dragon) {
      const rig = buildPetRig('clockwork_dragon');
      rig.root.scale.setScalar(3.4);
      const g = new THREE.Group();
      g.add(rig.root);
      this.group.add(g);
      this.dragon = { rig, g };
    }
    if (this.dragon) this.dragon.g.visible = own;
  }

  updateDragon(dt, tt) {
    const d = this.dragon;
    if (!d || !d.g.visible) return;
    const a = tt * 0.2, R = 16;
    d.g.position.set(Math.cos(a) * R, 11.5 + Math.sin(tt * 0.9) * 0.8, Math.sin(a) * R);
    d.g.rotation.set(0, -a, Math.sin(tt * 0.5) * 0.08 - 0.12);
    const r = d.rig;
    r.wings.forEach((w) => { w.rotation.z = w.userData.side * (0.25 + Math.sin(tt * 6) * 0.6); });
    (r.spinners || []).forEach((s, i) => { s.rotation.z += dt * (i % 2 ? -2.4 : 2.4); });
    r.tails.forEach((chain) => chain.forEach((seg, i) => { seg.rotation.y = Math.sin(tt * 2 + i * 0.6) * 0.18; }));
  }

  update(dt, tt) {
    if (!this.active) return;
    this.updateDragon(dt, tt);
    this.updateWalkers(dt, tt);
    for (const l of this.micro || []) {
      const { pos, home, ph, n, vy } = l;
      for (let i = 0; i < n; i++) {
        const k = i * 3;
        pos[k + 1] += vy * dt * (0.7 + (ph[i] % 1) * 0.6);
        if (pos[k + 1] < 0) pos[k + 1] += 5; else if (pos[k + 1] > 5) pos[k + 1] -= 5;
        pos[k] = home[i * 2] + Math.sin(tt * 0.8 + ph[i]) * 0.3;
        pos[k + 2] = home[i * 2 + 1] + Math.cos(tt * 0.6 + ph[i]) * 0.3;
      }
      l.pts.geometry.attributes.position.needsUpdate = true;
    }
    const bob = Math.sin(tt * 2) * 0.12;
    if (this.cinema) this.cinema.userData.label.position.y = 7.3 + bob;
    if (this.shop) this.shop.userData.label.position.y = 5.4 + bob;
    if (this.museumHall) this.museumHall.userData.label.position.y = 8.6 + bob;
  }

  /** נגיעה בבניין: 'cinema' / 'shop' / null */
  pick(x, y) {
    if (!this.active) return null;
    const hit = this.sm.pick(x, y, [this.cinema, this.shop, this.museumHall])[0];
    if (!hit) return null;
    let o = hit.object;
    while (o && o !== this.cinema && o !== this.shop && o !== this.museumHall) o = o.parent;
    return o === this.cinema ? 'cinema' : o === this.shop ? 'shop' : o === this.museumHall ? 'museum' : null;
  }

  /** חלק של אי עף מעבר לים ונצמד לחוף של האי המרכזי (אנימציה עם מצלמה) */
  async dock(id) {
    const slot = this.slotOf(id);
    const g = chunkGeometry(id, slot);
    const piece = new THREE.Group();
    const solid = mergeGeometries(g.solid, false);
    piece.add(new THREE.Mesh(solid, MONUMENT_SOLID));
    if (g.glow.length) piece.add(new THREE.Mesh(mergeGeometries(g.glow, false), MONUMENT_GLOW));
    const dir = islandPos(id).setY(0);
    if (dir.lengthSq() < 1e-4) dir.set(slot.x, 0, slot.z);
    dir.normalize();
    const to = new V3(slot.x, 0, slot.z);
    const from = to.clone().addScaledVector(new V3(slot.x, 0, slot.z).normalize().lerp(dir, 0.4).normalize(), 46).setY(16);
    piece.position.copy(from);
    piece.rotation.set(0.4, 2, 0.2);
    this.group.add(piece);
    const target = to.clone().setY(1);
    // האי גדל לקראת האריח החדש, והמצלמה מסתכלת עליו מתוך האי
    this.sm.setIslandRadius(Math.max(this.extent || HUB_BASE_R, slot.rOut), HUB_BASE_R, this.shapePoints(slot));
    const camPos = to.clone().multiplyScalar(0.3).add(new V3(0, 12 + slot.ring * 2.5, 0)).addScaledVector(new V3(-slot.z, 0, slot.x).normalize(), 8);
    await this.sm.animateCamera(camPos, target, 1.3);
    this.app.sound.whoosh?.(2);
    await new Promise((resolve) => {
      const st = { k: 0 };
      gsap.to(st, { k: 1, duration: 2.2, ease: 'power2.inOut', onUpdate: () => {
        const k = st.k;
        piece.position.lerpVectors(from, to, k);
        piece.position.y = from.y * (1 - k) + Math.sin(k * Math.PI) * 6;
        piece.rotation.set(0.4 * (1 - k), 2 * (1 - k), 0.2 * (1 - k));
      }, onComplete: resolve });
    });
    this.app.sound.structureRise?.(true);
    this.app.fx?.dust([to.x, 0.3, to.z], 40, 0xd8c8a8, 2.2);
    this.app.fx?.sparkle([to.x, 2.5, to.z], 40);
    gsap.fromTo(piece.position, { y: -0.6 }, { y: 0, duration: 0.6, ease: 'bounce.out' });
    await new Promise((r) => setTimeout(r, 900));
    this.group.remove(piece);
    solid.dispose();
  }
}
