/**
 * מוזיאון הזמן — האי המרכזי.
 * - בית הקולנוע המרכזי (נוגעים בו → סרט הסיפור / סרט ההדרכה) ובית הלוחות (סקינים ללוח).
 * - חמש חנויות מקיפות את הלוח, כל אחת בעיצוב משלה: בית הכתרים, אוהל הגלימות, נפחיית הנשקים, מקדש ההילות
 *   ובית החיות. מעל מוזיאון הזמן מרחפת טבעת זהב שכתוב עליה "פרימיום" (חנות הפרימיום).
 *   הבוטים — בכפתור החנות שבסרגל התחתון.
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
function signTexture(text, { w = 512, h = 128, bg = '#5a0a14', fg = '#ffe9a8', border = '#f2c14e', bulbs = true, bulb = '#fff6c8', glow = 'rgba(255,200,80,0.9)' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.lineWidth = 10; x.strokeStyle = border; x.strokeRect(8, 8, w - 16, h - 16);
  if (bulbs) { x.fillStyle = bulb; for (let i = 0; i < 18; i++) { const px = 24 + (i * (w - 48)) / 17; x.beginPath(); x.arc(px, 18, 5, 0, TAU); x.arc(px, h - 18, 5, 0, TAU); x.fill(); } }
  x.fillStyle = fg; x.font = `900 ${Math.round(h * 0.46)}px Rubik, Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = glow; x.shadowBlur = 18;
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

// ---------- ארבע חנויות הלבוש סביב הלוח — לכל אחת עיצוב משלה ----------
// כל בונה מחזיר { solid, glow, parts }: parts הם חלקים נעים (כתר מסתובב, דגל, אש, עשן, גביש וטבעות אור)
let _puff = null;
const puffTex = () => (_puff ||= dotTex());
const OCT_FLAT = [0, Math.PI / 8, 0]; // מתומן עם פאה שטוחה בחזית

/** בית הכתרים: מגדל קטיפה סגול עם עמודי זהב וחלונות ראווה, ועל הגג כתר זהב ענק שמסתובב לאט */
function crownHouseGeometry() {
  const b = new Builder();
  b.cyl(2.0, 2.12, 0.22, C.lstone, [0, 0.11, 0], 16).cyl(1.82, 1.86, 0.14, C.marble, [0, 0.29, 0], 16);
  b.box(1.3, 0.14, 0.55, C.marble, [0, 0.07, 2.12]);
  b.cyl(1.36, 1.46, 2.5, C.purple, [0, 1.61, 0], 8, OCT_FLAT);
  b.cyl(1.5, 1.5, 0.16, C.gold, [0, 0.44, 0], 8, OCT_FLAT).cyl(1.41, 1.41, 0.14, C.gold, [0, 2.8, 0], 8, OCT_FLAT);
  b.cyl(1.6, 1.44, 0.28, C.cream, [0, 3.0, 0], 8, OCT_FLAT);
  for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i / 8) * TAU; b.box(0.1, 2.3, 0.1, C.gold, [Math.sin(a) * 1.43, 1.62, Math.cos(a) * 1.43], [0, a, 0]); }
  // דלת מקושתת
  b.box(0.62, 1.05, 0.08, C.dark, [0, 0.89, 1.33]).cyl(0.31, 0.31, 0.08, C.dark, [0, 1.41, 1.32], 14, [Math.PI / 2, 0, 0]);
  b.tor(0.33, 0.05, C.gold, [0, 1.41, 1.37], undefined, Math.PI).box(0.05, 1.0, 0.1, C.gold, [0, 0.89, 1.38]);
  // חלונות ראווה זוהרים בפאות האלכסוניות, וכרזות אדומות בצדדים
  for (const a of [-Math.PI / 4, Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4]) {
    b.box(0.5, 0.8, 0.04, C.gold, [Math.sin(a) * 1.34, 1.85, Math.cos(a) * 1.34], [0, a, 0]);
    b.box(0.4, 0.68, 0.05, 0xa8e4ff, [Math.sin(a) * 1.36, 1.85, Math.cos(a) * 1.36], [0, a, 0], true);
  }
  for (const s of [-1, 1]) b.box(0.44, 1.05, 0.04, C.red, [s * 1.34, 1.9, 0], [0, s * Math.PI / 2, 0]).box(0.5, 0.07, 0.07, C.gold, [s * 1.36, 2.44, 0], [0, s * Math.PI / 2, 0]);
  // כן עם קסדת אביר (משמאל) וכן עם כתר על כרית (מימין)
  for (const s of [-1, 1]) b.box(0.38, 0.7, 0.38, C.marble, [s * 1.1, 0.71, 1.38]).box(0.46, 0.08, 0.46, C.gold, [s * 1.1, 1.1, 1.38]);
  b.sph(0.2, C.silver, [-1.1, 1.34, 1.38], [0.92, 1.1, 1]).box(0.24, 0.05, 0.06, C.dark, [-1.1, 1.32, 1.57]).box(0.05, 0.16, 0.4, C.red, [-1.1, 1.57, 1.35]);
  b.box(0.36, 0.1, 0.36, C.red, [1.1, 1.19, 1.38]).cyl(0.13, 0.12, 0.13, C.gold, [1.1, 1.3, 1.38], 10);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; b.cone(0.035, 0.11, C.gold, [1.1 + Math.sin(a) * 0.12, 1.42, 1.38 + Math.cos(a) * 0.12], 4); }
  // הכתר הענק על הגג
  const cr = new Builder();
  cr.cyl(1.24, 1.16, 0.5, C.gold, [0, 0.25, 0], 16).tor(1.2, 0.07, C.gold, [0, 0.04, 0], [Math.PI / 2, 0, 0], TAU, false, 32);
  cr.hemi(1.06, C.purple, [0, 0.42, 0], [1, 0.72, 1]);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, x = Math.sin(a) * 1.17, z = Math.cos(a) * 1.17, a2 = a + TAU / 16;
    cr.cone(0.2, 0.72, C.gold, [x, 0.84, z], 4).sph(0.1, i % 2 ? 0xff4a6a : 0x6ad8ff, [x, 1.24, z], undefined, 8, true);
    cr.oct(0.12, i % 2 ? C.red : C.lapis, [Math.sin(a2) * 1.24, 0.26, Math.cos(a2) * 1.24], [1, 1.25, 1]);
  }
  cr.sph(0.2, C.gold, [0, 1.3, 0]).box(0.08, 0.4, 0.08, C.gold, [0, 1.62, 0]).box(0.26, 0.08, 0.08, C.gold, [0, 1.66, 0]);
  return { ...b.build(), parts: [{ ...cr.build(), pos: [0, 3.14, 0], tick: (o, tt) => { o.rotation.y = tt * 0.35; } }] };
}

/** אוהל הגלימות: ביתן טורנירים עגול בפסים אדום־שמנת, בובות תצוגה עם גלימות, מתלה בגדים ושריון על מעמד */
function robeTentGeometry() {
  const b = new Builder();
  const SEG = TAU / 12, RW = 1.52, pw = 2 * RW * Math.sin(SEG / 2) + 0.03, pd = RW * Math.cos(SEG / 2);
  b.cyl(2.1, 2.2, 0.2, C.wood, [0, 0.1, 0], 16).tor(2.12, 0.05, C.dwood, [0, 0.2, 0], [Math.PI / 2, 0, 0], TAU, false, 32);
  // דפנות בפסים, עם פתח בחזית ועמודי זהב בצדי הפתח
  for (let i = 1; i < 11; i++) { const a = (i + 0.5) * SEG; b.box(pw, 1.85, 0.05, i % 2 ? C.cream : C.red, [Math.sin(a) * pd, 1.12, Math.cos(a) * pd], [0, a, 0]); }
  for (const s of [-1, 1]) b.cyl(0.045, 0.045, 1.95, C.gold, [s * RW * Math.sin(SEG), 1.15, RW * Math.cos(SEG)], 6);
  // גג חרוטי בפסים, שפת זהב ושוליים משולשים
  b.cyl(1.98, 1.98, 0.05, C.cream, [0, 2.06, 0], 24);
  for (let i = 0; i < 12; i++) b.add(new THREE.ConeGeometry(2.05, 1.75, 2, 1, true, i * SEG, SEG), i % 2 ? C.cream : C.red, [0, 2.06 + 0.875, 0]);
  b.tor(2.04, 0.05, C.gold, [0, 2.07, 0], [Math.PI / 2, 0, 0], TAU, false, 36);
  for (let i = 0; i < 24; i++) { const a = (i + 0.5) * (TAU / 24); b.cone(0.14, 0.28, i % 2 ? C.gold : C.red, [Math.sin(a) * 2.0, 1.92, Math.cos(a) * 2.0], 3, [Math.PI, 0, 0]); }
  b.sph(0.12, C.gold, [0, 3.84, 0]).cyl(0.035, 0.035, 0.85, C.gold, [0, 4.2, 0], 6);
  // לוח השלט מעל הפתח
  b.box(1.62, 0.52, 0.06, C.dwood, [0, 2.32, 1.95]).box(1.7, 0.06, 0.08, C.gold, [0, 2.6, 1.95]);
  // בובות תצוגה עם גלימות
  const mannequin = (x, z, robe, trim) => {
    b.cyl(0.2, 0.22, 0.05, C.dwood, [x, 0.23, z], 10).cyl(0.025, 0.025, 0.4, C.iron, [x, 0.45, z], 5);
    b.cone(0.36, 1.12, robe, [x, 0.96, z], 12).tor(0.11, 0.035, trim, [x, 1.45, z], [Math.PI / 2, 0, 0], TAU, false, 12).sph(0.1, C.bone, [x, 1.6, z]);
  };
  mannequin(-0.42, 0.72, C.purple, C.gold);
  mannequin(0.42, 0.72, C.lapis, C.silver);
  mannequin(0, -0.1, C.green, C.gold);
  // מתלה גלימות (משמאל)
  const rx = -1.5, rz = 1.3, ry = -0.856, tx = Math.cos(ry), tz = -Math.sin(ry);
  for (const s of [-1, 1]) b.cyl(0.03, 0.03, 1.3, C.dwood, [rx + s * 0.45 * tx, 0.85, rz + s * 0.45 * tz], 5);
  b.box(1.0, 0.05, 0.05, C.gold, [rx, 1.5, rz], [0, ry, 0]);
  [C.red, C.navy, C.jade].forEach((c, k) => { const u = (k - 1) * 0.3; b.cone(0.16, 0.7, c, [rx + u * tx, 1.12, rz + u * tz], 8).sph(0.05, C.gold, [rx + u * tx, 1.48, rz + u * tz]); });
  // שריון אבירים על מעמד (מימין)
  const ax = 1.5, az = 1.3, ay = 0.6, ox = Math.cos(ay) * 0.27, oz = -Math.sin(ay) * 0.27;
  b.cyl(0.2, 0.22, 0.05, C.dwood, [ax, 0.23, az], 10).cyl(0.03, 0.03, 0.55, C.iron, [ax, 0.5, az], 5);
  b.box(0.44, 0.52, 0.28, C.silver, [ax, 1.02, az], [0, ay, 0]).box(0.46, 0.08, 0.3, C.gold, [ax, 0.8, az], [0, ay, 0]);
  b.sph(0.13, C.silver, [ax + ox, 1.25, az + oz]).sph(0.13, C.silver, [ax - ox, 1.25, az - oz]);
  b.sph(0.14, C.silver, [ax, 1.45, az]).box(0.05, 0.14, 0.3, C.red, [ax, 1.62, az], [0, ay, 0]);
  // דגל מתנופף על הצריח
  const fl = new Builder();
  fl.box(0.64, 0.26, 0.02, C.red, [0.34, 0, 0]).box(0.08, 0.3, 0.03, C.gold, [0.03, 0, 0]);
  return { ...b.build(), parts: [{ ...fl.build(), pos: [0, 4.45, 0], tick: (o, tt) => { o.rotation.y = 0.5 + Math.sin(tt * 1.7) * 0.55; } }] };
}

/** נפחיית הנשקים: בית אבן עם קורות עץ וגג צפחה, ארובה מעשנת, כבשן בוער, סדן ומתקן נשקים; על הרכס מגן עם שתי חרבות */
function forgeGeometry() {
  const b = new Builder();
  const WALL = 0x5e5850, BASE = 0x45413b, BLOCK = 0x7a7368, SLATE = 0x3a404c;
  b.box(4.1, 0.25, 3.5, BASE, [0, 0.125, 0.15]);
  b.box(3.4, 2.4, 2.3, WALL, [0, 1.45, -0.4]).box(3.5, 0.4, 2.4, BASE, [0, 0.45, -0.4]);
  // אבני בנייה בולטות בחזית ובצדדים
  for (const [x, y] of [[-1.25, 1.0], [-1.0, 1.55], [-1.3, 2.05], [1.2, 0.95], [1.0, 1.6], [1.3, 2.1], [-0.55, 2.42], [0.6, 2.45]]) b.box(0.42, 0.2, 0.04, BLOCK, [x, y, 0.77]);
  for (const sx of [-1, 1]) for (const [z, y] of [[-1.0, 0.95], [0.1, 1.45], [-0.5, 2.0], [-1.2, 2.3]]) b.box(0.04, 0.2, 0.42, BLOCK, [sx * 1.71, y, z]);
  for (const x of [-1.66, 1.66]) b.box(0.2, 2.4, 0.2, C.dwood, [x, 1.45, 0.77]);
  b.box(3.6, 0.2, 0.22, C.dwood, [0, 2.62, 0.78]);
  b.prism(2.9, 1.15, 3.9, SLATE, [0, 2.65, -0.4], [0, Math.PI / 2, 0]).box(4.0, 0.12, 0.16, C.dwood, [0, 3.8, -0.4]);
  // ארובה עם גחלים
  b.box(0.7, 2.5, 0.7, BASE, [1.05, 3.0, -1.0]).box(0.86, 0.16, 0.86, BLOCK, [1.05, 4.3, -1.0]).box(0.5, 0.05, 0.5, C.lava, [1.05, 4.39, -1.0], undefined, true);
  // הכבשן: פתח מקושת, אבני קשת וגחלים
  b.box(1.24, 1.0, 0.06, C.black, [0, 0.75, 0.77]).cyl(0.62, 0.62, 0.06, C.black, [0, 1.25, 0.77], 14, [Math.PI / 2, 0, 0]);
  b.tor(0.68, 0.1, C.lstone, [0, 1.25, 0.8], undefined, Math.PI, false, 12);
  for (const x of [-0.68, 0.68]) b.box(0.18, 1.0, 0.16, C.lstone, [x, 0.75, 0.8]);
  b.box(1.0, 0.3, 0.05, C.lava, [0, 0.42, 0.8], undefined, true);
  // מגן וחרבות מוצלבות על רכס הגג
  const cy = 4.42, cz = -0.4;
  const sword = (phi) => {
    const at = (d) => [-d * Math.sin(phi), cy + d * Math.cos(phi)];
    let [x, y] = at(0.3); b.box(0.11, 1.35, 0.04, C.steel, [x, y, cz], [0, 0, phi]);
    [x, y] = at(1.02); b.cone(0.055, 0.12, C.steel, [x, y, cz], 4, [0, 0, phi]);
    [x, y] = at(-0.42); b.box(0.46, 0.08, 0.08, C.gold, [x, y, cz], [0, 0, phi]);
    [x, y] = at(-0.6); b.box(0.07, 0.3, 0.07, C.dwood, [x, y, cz], [0, 0, phi]);
    [x, y] = at(-0.78); b.sph(0.07, C.gold, [x, y, cz]);
  };
  sword(0.72); sword(-0.72);
  b.box(0.12, 0.3, 0.12, C.iron, [0, 3.88, cz]);
  b.cyl(0.5, 0.5, 0.12, C.red, [0, cy, cz + 0.08], 6, [Math.PI / 2, 0, 0]).tor(0.5, 0.05, C.gold, [0, cy, cz + 0.15], [0, 0, Math.PI / 6], TAU, false, 6);
  b.oct(0.16, C.gold, [0, cy, cz + 0.17], [1, 1.3, 0.5]);
  // סדן על גדם עץ ופטיש (משמאל)
  b.cyl(0.22, 0.25, 0.42, C.dwood, [-1.3, 0.46, 1.45], 8);
  b.box(0.24, 0.16, 0.2, C.iron, [-1.3, 0.75, 1.45]).box(0.6, 0.12, 0.26, C.iron, [-1.3, 0.88, 1.45]).cone(0.085, 0.3, C.iron, [-0.88, 0.88, 1.45], 6, [0, 0, -Math.PI / 2]);
  b.cyl(0.025, 0.025, 0.55, C.wood, [-1.72, 0.55, 1.62], 5, [0, 0, 0.35]).box(0.2, 0.1, 0.1, C.steel, [-1.82, 0.8, 1.62], [0, 0, 0.35]);
  // מתקן נשקים (מימין): חרבות, חנית וגרזן
  const wx = 1.25, wz = 1.5;
  for (const d of [-0.5, 0.5]) b.cyl(0.035, 0.035, 1.25, C.dwood, [wx + d, 0.87, wz], 5);
  b.box(1.1, 0.07, 0.08, C.dwood, [wx, 1.42, wz]).box(1.1, 0.07, 0.08, C.dwood, [wx, 0.55, wz]);
  for (const d of [-0.3, -0.1]) b.box(0.07, 0.8, 0.025, C.steel, [wx + d, 0.78, wz + 0.06]).box(0.22, 0.05, 0.06, C.gold, [wx + d, 1.2, wz + 0.06]).box(0.05, 0.2, 0.05, C.dwood, [wx + d, 1.33, wz + 0.06]).sph(0.04, C.gold, [wx + d, 1.45, wz + 0.06]);
  b.cyl(0.022, 0.022, 1.5, C.wood, [wx + 0.12, 1.0, wz + 0.08], 5).cone(0.06, 0.22, C.steel, [wx + 0.12, 1.86, wz + 0.08], 4);
  b.cyl(0.026, 0.026, 1.0, C.wood, [wx + 0.33, 0.78, wz + 0.08], 5).box(0.26, 0.22, 0.03, C.steel, [wx + 0.44, 1.18, wz + 0.08]);
  // אש מהבהבת בכבשן ועשן מהארובה
  const fire = new Builder();
  fire.cone(0.26, 0.7, C.fire, [-0.25, 0.35, 0], 6, undefined, true).cone(0.3, 0.9, C.lava, [0.15, 0.45, 0], 6, undefined, true).cone(0.16, 0.55, C.flame, [0, 0.28, 0.05], 6, undefined, true);
  const smoke = Array.from({ length: 4 }, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: 0x8a847c, transparent: true, depthWrite: false, opacity: 0 })));
  return {
    ...b.build(),
    parts: [
      { ...fire.build(), pos: [0, 0.45, 0.8], tick: (o, tt) => { o.scale.set(1 + Math.sin(tt * 7.3) * 0.06, 0.85 + Math.sin(tt * 9) * 0.1 + Math.sin(tt * 13.7) * 0.08, 1); } },
      { sprites: smoke, pos: [1.05, 4.45, -1.0], tick: (o, tt) => o.children.forEach((s, k) => { const u = (tt * 0.3 + k / 4) % 1; s.position.set(u * 0.5 + Math.sin(u * 5 + k) * 0.12, u * 2.3, 0); s.scale.setScalar(0.45 + u * 1.2); s.material.opacity = 0.6 * (1 - u) * Math.min(1, u * 6); }) },
    ],
  };
}

/** מקדש ההילות: מקדש עגול ופתוח — עמודי שיש עם פסי אור, טבעת וקשתות זהב; במרכז גביש מרחף עם טבעות אור ומעל הכיפה הילה */
function auraSanctumGeometry() {
  const b = new Builder();
  const R = 1.38, top = 3.0;
  b.cyl(2.0, 2.12, 0.22, C.marble, [0, 0.11, 0], 20).cyl(1.75, 1.8, 0.18, C.lstone, [0, 0.31, 0], 20);
  b.box(1.2, 0.14, 0.55, C.marble, [0, 0.07, 2.12]);
  b.tor(1.6, 0.035, C.turq, [0, 0.41, 0], [Math.PI / 2, 0, 0], TAU, true, 40);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * TAU) / 6, x = Math.sin(a) * R, z = Math.cos(a) * R;
    b.box(0.34, 0.12, 0.34, C.gold, [x, 0.46, z], [0, a, 0]).cyl(0.12, 0.14, 2.3, C.marble, [x, 1.67, z], 10).box(0.34, 0.14, 0.34, C.gold, [x, 2.86, z], [0, a, 0]);
    b.box(0.05, 1.9, 0.03, C.cyan, [Math.sin(a) * (R + 0.13), 1.67, Math.cos(a) * (R + 0.13)], [0, a, 0], true);
  }
  b.tor(R, 0.14, C.gold, [0, top, 0], [Math.PI / 2, 0, 0], TAU, false, 36);
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * TAU) / 6; b.tor(R, 0.05, C.gold, [0, top, 0], [0, a - Math.PI / 2, 0], Math.PI / 2, false, 12); }
  b.sph(0.13, C.gold, [0, top + R + 0.02, 0]).cone(0.06, 0.32, C.gold, [0, top + R + 0.24, 0], 6);
  // כן לגביש ואשכולות קריסטל סביב המקדש
  b.cyl(0.28, 0.4, 0.5, C.marble, [0, 0.65, 0], 8).tor(0.3, 0.035, C.turq, [0, 0.92, 0], [Math.PI / 2, 0, 0], TAU, true, 20);
  for (const [a, s, c] of [[2.3, 1, C.violet], [2.6, 0.7, 0x7ae8ff], [3.5, 0.9, 0x7ae8ff], [3.8, 0.65, C.violet], [4.6, 1, C.crystal], [4.0, 0.6, C.crystal]]) {
    b.oct(0.2 * s, c, [Math.sin(a) * 1.64, 0.4 + 0.3 * s, Math.cos(a) * 1.64], [1, 1.8, 1], true);
  }
  // החלקים הנעים
  const core = new Builder();
  core.oct(0.4, 0xb592ff, [0, 0, 0], [1, 1.7, 1], true).add(new THREE.OctahedronGeometry(0.33, 0), 0x8af2ff, [0, 0, 0], [0, Math.PI / 4, 0], [1, 1.95, 1], true);
  const ringA = new Builder().tor(0.74, 0.03, 0x7af0ff, [0, 0, 0], [Math.PI / 2, 0, 0], TAU, true, 40);
  const ringB = new Builder().tor(0.95, 0.025, 0xffd36a, [0, 0, 0], [Math.PI / 2, 0, 0], TAU, true, 44);
  const halo = new Builder().tor(0.55, 0.06, 0xfff0a0, [0, 0, 0], [Math.PI / 2, 0, 0], TAU, true, 36);
  const orbit = new Builder();
  [[0, 1.3, 0x7af0ff], [TAU / 3, 2.3, 0xff9ae8], [(2 * TAU) / 3, 3.2, 0xfff0a0]].forEach(([a, y, c]) => orbit.oct(0.13, c, [Math.sin(a) * 2.1, y, Math.cos(a) * 2.1], [1, 1.6, 1], true));
  return {
    ...b.build(),
    parts: [
      { ...core.build(), pos: [0, 1.85, 0], tick: (o, tt, dt, y0) => { o.rotation.y = tt * 0.8; o.position.y = y0 + Math.sin(tt * 1.5) * 0.1; } },
      { ...ringA.build(), pos: [0, 1.85, 0], tick: (o, tt) => { o.rotation.set(Math.sin(tt * 0.9) * 0.65, 0, Math.cos(tt * 0.9) * 0.65); } },
      { ...ringB.build(), pos: [0, 1.85, 0], tick: (o, tt) => { o.rotation.set(Math.cos(tt * 0.7) * 0.5, 0, -Math.sin(tt * 0.7) * 0.5); } },
      { ...halo.build(), pos: [0, top + R + 0.75, 0], tick: (o, tt, dt, y0) => { o.position.y = y0 + Math.sin(tt * 1.3) * 0.08; o.rotation.x = Math.sin(tt * 0.8) * 0.12; } },
      { ...orbit.build(), pos: [0, 0, 0], tick: (o, tt) => { o.rotation.y = tt * 0.45; } },
    ],
  };
}

/** בית הלוחות: גלריית שיש עם גג־לוח שחמט, מלך לבן ענק שמסתובב ומלכה שחורה; בחלונות ובכניסה לוחות לדוגמה */
function boardHouseGeometry() {
  const b = new Builder();
  b.box(4.2, 0.24, 3.4, C.lstone, [0, 0.12, 0.1]).box(3.9, 0.12, 3.1, C.marble, [0, 0.3, 0.05]).box(1.5, 0.12, 0.5, C.marble, [0, 0.06, 1.95]);
  // גוף הגלריה: שיש לבן עם עמודים וכותרות זהב
  b.box(3.4, 2.2, 2.4, C.marble, [0, 1.46, -0.35]);
  for (const x of [-1.62, -0.78, 0.78, 1.62]) b.box(0.22, 2.2, 0.16, C.cream, [x, 1.46, 0.88]).box(0.3, 0.12, 0.22, C.gold, [x, 2.5, 0.9]).box(0.3, 0.12, 0.22, C.gold, [x, 0.42, 0.9]);
  // כניסה מקושתת
  b.box(0.86, 1.25, 0.06, C.dark, [0, 0.98, 0.86]).cyl(0.43, 0.43, 0.06, C.dark, [0, 1.6, 0.86], 14, [Math.PI / 2, 0, 0]);
  b.tor(0.46, 0.05, C.gold, [0, 1.6, 0.9], undefined, Math.PI);
  // לוח 4×4 (במישור החזית או נטוי לאחור על כן)
  const mini = (cx, cy, cz, c1, c2, tilt = 0, s = 0.14) => {
    const up = [Math.cos(tilt), -Math.sin(tilt)], nrm = [Math.sin(tilt), Math.cos(tilt)];
    b.box(s * 4 + 0.1, s * 4 + 0.1, 0.03, C.gold, [cx, cy, cz], [-tilt, 0, 0]);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const u = (i - 1.5) * s, v = (j - 1.5) * s;
      b.box(s, s, 0.03, (i + j) % 2 ? c2 : c1, [cx + u, cy + v * up[0] + 0.025 * nrm[0], cz + v * up[1] + 0.025 * nrm[1]], [-tilt, 0, 0]);
    }
  };
  mini(-1.2, 1.5, 0.87, 0xf2f0ea, 0x1f7a5a); // שיש אמרלד
  mini(1.2, 1.5, 0.87, 0xdfe6f2, 0x1d3a8a); // ספיר מלכותי
  // לוחות לדוגמה על כנים ליד הכניסה
  for (const [x, c1, c2] of [[-1.55, 0xf6e6c8, 0x9a1428], [1.55, 0x2a2630, 0xd8a83a]]) {
    b.box(0.08, 0.75, 0.08, C.dwood, [x, 0.66, 1.62]).box(0.5, 0.05, 0.3, C.dwood, [x, 0.66, 1.66]);
    mini(x, 0.98, 1.58, c1, c2, 0.38, 0.13);
  }
  // הגג: לוח שחמט 8×8 בתוך מסגרת זהב, ועליו מלכה שחורה
  b.box(3.7, 0.16, 2.8, C.gold, [0, 2.64, -0.35]);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) b.box(0.3, 0.04, 0.3, (i + j) % 2 ? C.dwood : C.cream, [-1.05 + i * 0.3, 2.74, -1.4 + j * 0.3]);
  const qx = 0.6, qz = -0.85, y0 = 2.76;
  b.cyl(0.36, 0.42, 0.16, C.black, [qx, y0 + 0.08, qz], 16).cyl(0.17, 0.3, 0.9, C.black, [qx, y0 + 0.61, qz], 14).cyl(0.29, 0.21, 0.12, C.black, [qx, y0 + 1.12, qz], 14);
  b.cyl(0.26, 0.15, 0.32, C.black, [qx, y0 + 1.34, qz], 14).tor(0.24, 0.035, C.gold, [qx, y0 + 1.5, qz], [Math.PI / 2, 0, 0], TAU, false, 20);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.sph(0.05, C.gold, [qx + Math.sin(a) * 0.23, y0 + 1.56, qz + Math.cos(a) * 0.23], undefined, 6); }
  b.sph(0.1, C.gold, [qx, y0 + 1.66, qz]);
  // מלך לבן ענק שמסתובב לאט
  const king = new Builder();
  king.cyl(0.4, 0.46, 0.16, C.marble, [0, 0.08, 0], 16).tor(0.36, 0.05, C.gold, [0, 0.18, 0], [Math.PI / 2, 0, 0], TAU, false, 20);
  king.cyl(0.2, 0.33, 0.95, C.marble, [0, 0.7, 0], 14).cyl(0.31, 0.24, 0.12, C.marble, [0, 1.22, 0], 14).tor(0.27, 0.04, C.gold, [0, 1.28, 0], [Math.PI / 2, 0, 0], TAU, false, 20);
  king.cyl(0.25, 0.17, 0.34, C.marble, [0, 1.47, 0], 14).cyl(0.27, 0.27, 0.06, C.gold, [0, 1.66, 0], 14);
  king.box(0.08, 0.36, 0.08, C.gold, [0, 1.88, 0]).box(0.24, 0.08, 0.08, C.gold, [0, 1.92, 0]);
  return { ...b.build(), parts: [{ ...king.build(), pos: [-0.5, y0, -0.4], tick: (o, tt) => { o.rotation.y = tt * 0.5; } }] };
}

/** בית החיות: אסם אדום עם גג גמברל, כפה ענקית מזהב בגמלון, ומכלאה עם בית כלב, קערה, עצם, שבשבת וכדור קופץ */
function petBarnGeometry() {
  const b = new Builder();
  const RED = 0xb02a24, DOOR = 0x7a1a16;
  b.box(3.9, 0.22, 3.5, C.lstone, [0, 0.11, 0.1]).box(3.6, 0.06, 1.45, C.grass, [0, 0.25, 1.05]);
  // האסם
  b.box(2.8, 1.75, 2.0, RED, [0, 1.1, -0.55]);
  for (const x of [-1.42, 1.42]) b.box(0.12, 1.8, 0.12, C.cream, [x, 1.1, 0.46]);
  b.box(2.96, 0.12, 0.14, C.cream, [0, 1.98, 0.46]);
  const gam = (w, h, k) => { const sh = new THREE.Shape(); sh.moveTo(-w, 0); sh.lineTo(-w * 0.79, h * 0.61); sh.lineTo(0, h); sh.lineTo(w * 0.79, h * 0.61); sh.lineTo(w, 0); sh.lineTo(-w, 0); return k ? new THREE.ExtrudeGeometry(sh, { depth: k, bevelEnabled: false }).translate(0, 0, -k / 2) : new THREE.ShapeGeometry(sh); };
  b.add(gam(1.62, 1.28, 2.3), 0x5a2a22, [0, 1.98, -0.55]); // גג גמברל
  b.add(gam(1.5, 1.16, 0), RED, [0, 2.0, 0.61]); // קיר הגמלון האדום
  // כפה ענקית מזהב בגמלון
  b.sph(0.24, C.gold, [0, 2.42, 0.63], [1.15, 0.9, 0.3]);
  for (const [x, y] of [[-0.3, 2.62], [-0.11, 2.75], [0.11, 2.75], [0.3, 2.62]]) b.sph(0.085, C.gold, [x, y, 0.63], [1, 1.15, 0.35]);
  // דלתות אסם עם איקס לבן
  b.box(1.3, 1.3, 0.05, DOOR, [0, 0.87, 0.47]).box(1.42, 0.08, 0.08, C.cream, [0, 1.53, 0.49]).box(0.06, 1.3, 0.08, C.cream, [0, 0.87, 0.5]);
  for (const sx of [-1, 1]) {
    b.box(0.08, 1.3, 0.08, C.cream, [sx * 0.67, 0.87, 0.49]);
    for (const r of [0.92, -0.92]) b.box(0.07, 0.85, 0.04, C.cream, [sx * 0.33, 0.87, 0.51], [0, 0, r]);
  }
  // גדר המכלאה (עם פתח בחזית)
  for (const x of [-1.75, -1.25, -0.75, 0.75, 1.25, 1.75]) b.cyl(0.04, 0.045, 0.52, C.dwood, [x, 0.48, 1.78], 6);
  for (const z of [0.9, 1.35]) for (const x of [-1.75, 1.75]) b.cyl(0.04, 0.045, 0.52, C.dwood, [x, 0.48, z], 6);
  for (const y of [0.4, 0.6]) {
    for (const sx of [-1, 1]) { b.box(1.05, 0.05, 0.05, C.wood, [sx * 1.25, y, 1.78]); b.box(0.05, 0.05, 1.36, C.wood, [sx * 1.75, y, 1.12]); }
  }
  // בית כלב, קערה ועצם
  b.box(0.52, 0.4, 0.46, C.wood, [-1.12, 0.48, 1.12]).prism(0.62, 0.3, 0.54, RED, [-1.12, 0.68, 1.12]).box(0.2, 0.24, 0.03, C.dark, [-1.12, 0.42, 1.36]);
  b.cyl(0.15, 0.11, 0.08, C.red, [0.78, 0.32, 1.0], 12).cyl(0.12, 0.12, 0.02, 0x8a5a2a, [0.78, 0.36, 1.0], 12);
  b.cyl(0.03, 0.03, 0.3, C.bone, [1.12, 0.32, 1.42], 6, [0, 0, Math.PI / 2]);
  for (const [dx, dz] of [[-0.15, -0.04], [-0.15, 0.04], [0.15, -0.04], [0.15, 0.04]]) b.sph(0.045, C.bone, [1.12 + dx, 0.32, 1.42 + dz], undefined, 6);
  // שבשבת על הגג וכדור קופץ במכלאה
  const vane = new Builder();
  vane.cyl(0.025, 0.025, 0.5, C.iron, [0, 0.25, 0], 5).box(0.62, 0.04, 0.03, C.gold, [0, 0.5, 0]).cone(0.06, 0.14, C.gold, [0.36, 0.5, 0], 4, [0, 0, -Math.PI / 2]).box(0.14, 0.16, 0.02, C.gold, [-0.28, 0.52, 0]);
  const ball = new Builder();
  ball.sph(0.12, C.pink, [0, 0, 0], undefined, 12).tor(0.12, 0.025, C.white, [0, 0, 0], [Math.PI / 2, 0, 0], TAU, false, 16);
  return {
    ...b.build(),
    parts: [
      { ...vane.build(), pos: [0, 3.26, -0.55], tick: (o, tt) => { o.rotation.y = Math.sin(tt * 0.6) * 1.3; } },
      { ...ball.build(), pos: [0.15, 0.4, 1.2], tick: (o, tt, dt, y0) => { const h = Math.abs(Math.sin(tt * 3.2)); o.position.y = y0 + h * 0.5; o.scale.set(1 + (1 - h) * 0.12, 1 - (1 - h) * 0.12, 1 + (1 - h) * 0.12); } },
    ],
  };
}

/**
 * החנויות סביב הלוח (פונות אל הלוח ואל המצלמה): כל אחת פותחת את החנות של הקטגוריה שלה —
 * ארבע חנויות לבוש ובית החיות. r — רדיוס טביעת הרגל (לתושבים המטיילים).
 * הפרימיום: טבעת זהב מרחפת מעל מוזיאון הזמן (buildPremiumRing).
 */
const SHOP_SCALE = 1.12;
const SLOT_SHOPS = [
  { slot: 'head', key: 'shopCrowns', icon: 'crown', sign: 'CROWNS', geo: crownHouseGeometry, pos: [-10.2, 0, -6.0], r: 2.3, labelY: 5.75,
    signAt: [0, 2.3, 1.36], signSize: [1.5, 0.4], style: { bg: '#3a1458', fg: '#ffe9a8' } },
  { slot: 'weapon', key: 'shopWeapons', icon: 'swords', sign: 'WEAPONS', geo: forgeGeometry, pos: [-10.2, 0, 7.2], r: 2.7, labelY: 5.9,
    signAt: [0, 2.27, 0.82], signSize: [1.7, 0.42], style: { bg: '#23262e', fg: '#ffb35a', border: '#9aa2ac', bulbs: false, glow: 'rgba(255,130,40,0.95)' } },
  { slot: 'aura', key: 'shopAuras', icon: 'sparkle', sign: 'AURAS', geo: auraSanctumGeometry, pos: [10.2, 0, -6.0], r: 2.3, labelY: 5.95,
    signAt: [0, 3.0, 1.56], signSize: [1.5, 0.4], style: { bg: '#141a4a', fg: '#c8f6ff', border: '#7ae8ff', bulb: '#c8f6ff', glow: 'rgba(120,230,255,0.95)' } },
  { slot: 'armor', key: 'shopRobes', icon: 'shirt', sign: 'ROBES', geo: robeTentGeometry, pos: [10.2, 0, 7.2], r: 2.4, labelY: 5.3,
    signAt: [0, 2.32, 1.99], signSize: [1.5, 0.42], style: { bg: '#7a1020', fg: '#fff3d6', bulbs: false } },
  // באמצע הצד השמאלי: בית החיות
  { slot: 'pets', key: 'shopPets', icon: 'paw', sign: 'PETS', geo: petBarnGeometry, pos: [-13.4, 0, 0.6], r: 2.3, labelY: 4.6,
    signAt: [0, 1.74, 0.5], signSize: [1.2, 0.34], style: { bg: '#24502a', fg: '#fff3d6' } },
];

/** גובה טבעת הזהב: מרחפת מעל מוזיאון הזמן (מעל השלט שלו) */
const RING_Y = 10.2;

/** הטקסט על טבעת הזהב: המילה שלוש פעמים מסביב, עם כוכבים ביניהן (פס זהב בגרדיאנט) */
function premiumRingTexture(word) {
  const W = 2048, H = 128;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#fff3b0'); g.addColorStop(0.45, '#f2c14e'); g.addColorStop(1, '#9a6a14');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(110,64,8,0.55)'; x.fillRect(0, 9, W, 4); x.fillRect(0, H - 13, W, 4);
  const star = (cx, cy, r) => {
    x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, rr = i % 2 ? r * 0.42 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    x.closePath(); x.fillStyle = '#c8282a'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#fff6cf'; x.stroke();
  };
  x.font = '900 86px Rubik, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let k = 0; k < 3; k++) {
    const cx = W / 6 + (k * W) / 3;
    x.lineWidth = 7; x.strokeStyle = 'rgba(255,248,214,0.95)'; x.strokeText(word, cx, H / 2 + 4);
    x.fillStyle = '#5a2a06'; x.fillText(word, cx, H / 2 + 4);
    star(cx + W / 6, H / 2, 30);
  }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  return tx;
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
    this.buildings = [];
    this.anims = [];
    const mk = (geo, pos, id, key, ic, sign, { labelY = 5.4, signAt = [0, 2.67, 2.02], signSize = [2.6, 0.62], style = {}, yaw = pos[0] < 0 ? 0.42 : -0.42, scale = 1 } = {}) => {
      const g = new THREE.Group();
      if (geo.solid) { const m = new THREE.Mesh(geo.solid, MONUMENT_SOLID); m.castShadow = true; m.receiveShadow = true; g.add(m); }
      if (geo.glow) g.add(new THREE.Mesh(geo.glow, MONUMENT_GLOW));
      for (const p of geo.parts || []) {
        const o = new THREE.Group();
        if (p.solid) { const m = new THREE.Mesh(p.solid, MONUMENT_SOLID); m.castShadow = true; o.add(m); }
        if (p.glow) o.add(new THREE.Mesh(p.glow, MONUMENT_GLOW));
        for (const s of p.sprites || []) o.add(s);
        o.position.set(...p.pos);
        g.add(o);
        this.anims.push({ o, tick: p.tick, y0: p.pos[1] });
      }
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(...signSize), new THREE.MeshBasicMaterial({ map: signTexture(sign, style), toneMapped: false }));
      sg.position.set(...signAt);
      g.add(sg);
      const lab = labelSprite(t(key), ic);
      lab.position.set(0, labelY, 0.6);
      lab.scale.divideScalar(scale); // השלטים הצפים באותו גודל בכל המבנים
      g.add(lab);
      g.position.set(...pos);
      g.rotation.y = yaw; // פונים אל המצלמה, מעט פנימה
      g.scale.setScalar(scale);
      Object.assign(g.userData, { bid: id, key, icon: ic, label: lab, labelY });
      this.group.add(g);
      this.buildings.push(g);
      return g;
    };
    this.cinema = mk(cinemaGeometry(), [-6.6, 0, -11.6], 'cinema', 'cinema', 'play', 'CINEMA', { labelY: 7.3 });
    // בית הלוחות — במקום החנות הכללית (שהתפצלה לחנויות לפי קטגוריה)
    this.boardHouse = mk(boardHouseGeometry(), [6.6, 0, -11.6], 'shop_boards', 'shopBoards', 'checker', 'BOARDS', {
      labelY: 5.55, signAt: [0, 2.31, 0.92], signSize: [1.3, 0.36], style: { bg: '#15151c', fg: '#f6f0e2' },
    });
    this.museumHall = mk(museumGeometry(), [0, 0, -13.4], 'museum', 'museum', 'temple', 'TIME MUSEUM', { labelY: 8.6, yaw: 0, signAt: [0, 3.71, 1.47], signSize: [2.6 * 1.9, 0.62 * 0.62] });
    this.museumHall.userData.label.position.z = 0;
    // ארבע חנויות הלבוש מקיפות את הלוח
    this.slotShops = SLOT_SHOPS.map((s) => mk(s.geo(), s.pos, `shop_${s.slot}`, s.key, s.icon, s.sign, {
      labelY: s.labelY, signAt: s.signAt, signSize: s.signSize, style: s.style, yaw: Math.atan2(-s.pos[0], 9), scale: SHOP_SCALE,
    }));
    this.buildPremiumRing();
    // מכשולים (מעגלים) לתושבים המטיילים: המבנים מאחור והחנויות מסביב
    this.blockers = [
      { x: -6.6, z: -11.6, r: 2.8 }, { x: 6.6, z: -11.6, r: 2.6 },
      { x: -2.3, z: -13.4, r: 2.3 }, { x: 0, z: -13.6, r: 2.3 }, { x: 2.3, z: -13.4, r: 2.3 },
      ...SLOT_SHOPS.map((s) => ({ x: s.pos[0], z: s.pos[2], r: s.r * SHOP_SCALE })),
    ];
  }

  /** טבעת הזהב המעופפת מעל מוזיאון הזמן — "פרימיום" כתוב עליה מסביב; נגיעה בה פותחת את חנות הפרימיום */
  buildPremiumRing() {
    const R = 2.4, H = 0.85;
    const ring = new THREE.Group(); // נוטה מעט אל המצלמה
    const spin = new THREE.Group(); // מסתובב סביב הציר שלו
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 72, 1, true), new THREE.MeshStandardMaterial({ map: premiumRingTexture(t('shopPremium')), metalness: 0.5, roughness: 0.32, emissive: 0x6a4a10, emissiveIntensity: 0.35 }));
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.02, R - 0.02, H, 72, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: 0.6, roughness: 0.35, side: THREE.BackSide }));
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 0.7, roughness: 0.25, emissive: 0x5a3a08, emissiveIntensity: 0.3 });
    spin.add(band, inner);
    for (const y of [-H / 2, H / 2]) { const r = new THREE.Mesh(new THREE.TorusGeometry(R, 0.075, 8, 72), rimMat); r.rotation.x = Math.PI / 2; r.position.y = y; spin.add(r); }
    const gemMat = new THREE.MeshBasicMaterial({ color: 0xff4a6a, toneMapped: false });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; const gm = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), gemMat); gm.position.set(Math.sin(a) * (R + 0.06), H / 2, Math.cos(a) * (R + 0.06)); spin.add(gm); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dot ||= dotTex(), color: 0xffd36a, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(6.5, 3.2, 1);
    glow.material.opacity = 0.3;
    ring.add(spin, glow);
    ring.position.set(0, RING_Y, -13.6);
    ring.rotation.x = 0.12;
    ring.userData.bid = 'shop_premium';
    band.castShadow = true;
    this.group.add(ring);
    this.premiumRing = ring;
    this.premiumSpin = spin;
    this.premiumBand = band;
  }

  /** שלטים בשפה הנוכחית */
  relabel() {
    if (this.premiumBand) { const old = this.premiumBand.material.map; this.premiumBand.material.map = premiumRingTexture(t('shopPremium')); this.premiumBand.material.needsUpdate = true; old?.dispose(); }
    for (const g of this.buildings) {
      const old = g.userData.label;
      const lab = labelSprite(t(g.userData.key), g.userData.icon);
      lab.position.copy(old.position);
      lab.scale.copy(old.scale);
      g.remove(old); old.material.map.dispose(); old.material.dispose();
      g.add(lab);
      g.userData.label = lab;
    }
  }

  /** קופסאות המבנים — כדי שדמויות הרקע של העידן יעקפו אותם */
  obstacleBoxes() {
    this.group.updateMatrixWorld(true);
    return this.buildings.map((g) => new THREE.Box3().setFromObject(g.children[0], true));
  }

  setActive(on) {
    this.active = on;
    this.syncDragon();
    this.group.visible = on;
    if (on) { this.rebuild(); this.spawnResidents(); } else this.clearResidents();
    this.placeSeason(on);
  }

  /**
   * קישוטי העונה שעל הקרקע (עץ החג, הדלעות) עומדים באותו מקום בכל האיים. באי המרכזי — אם קישוט
   * נופל בתוך אחד המבנים, מזיזים אותו למקום פנוי קרוב (ומחזירים כשיוצאים מהאי).
   */
  placeSeason(on = this.active) {
    const items = (this.app.season?.group?.children || []).filter((c) => c.userData.ground);
    const box = new THREE.Box3(), size = new V3();
    for (const c of items) {
      c.userData.home ||= c.position.clone();
      c.position.copy(c.userData.home);
      if (c.userData.rad == null) { box.setFromObject(c); box.getSize(size); c.userData.rad = Math.max(size.x, size.z) / 2; }
    }
    if (!on) return;
    const placed = [];
    const ok = (x, z, rad) => Math.hypot(x, z) < HUB_BASE_R - 1.5 && !(Math.abs(x) < 5.4 + rad * 0.7 && Math.abs(z) < 5.4 + rad * 0.7)
      && !(z > 6.3 && Math.abs(x) < 7)
      && ![[-3, 6.4], [3, 6.3], [3, -6.5], [-3, -6.4]].some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 1.75 + rad)
      && this.blockers.every((o) => Math.hypot(x - o.x, z - o.z) > o.r + rad + 0.2)
      && placed.every((o) => Math.hypot(x - o.x, z - o.z) > o.rad + rad + 0.25);
    // קודם מה שכבר במקום טוב, ואז מזיזים את השאר למקומות פנויים (גם זה מזה)
    const move = [];
    for (const c of items) { const { x, z } = c.userData.home; if (ok(x, z, c.userData.rad)) placed.push({ x, z, rad: c.userData.rad }); else move.push(c); }
    for (const c of move) {
      const { x, z } = c.userData.home, rad = c.userData.rad;
      // המקום הפנוי הקרוב ביותר למקום המקורי (טבעות סביב הלוח)
      const cand = [];
      for (let r = 7; r <= HUB_BASE_R - 1.5; r += 0.5) for (let k = 0; k < 80; k++) { const a = (k / 80) * TAU; cand.push([Math.cos(a) * r, Math.sin(a) * r]); }
      cand.sort((p, q) => Math.hypot(p[0] - x, p[1] - z) - Math.hypot(q[0] - x, q[1] - z));
      const hit = cand.find(([px, pz]) => ok(px, pz, rad));
      if (hit) { c.position.set(hit[0], c.position.y, hit[1]); placed.push({ x: hit[0], z: hit[1], rad }); }
    }
  }

  // ---------- תושבים: בוטים שנקנו בחנות מסתובבים חופשי עם החיות שלהם ----------
  setResidents(ids) { this.residentIds = [...ids]; if (this.active) this.spawnResidents(); }
  clearResidents() {
    this.residentsGroup.clear();
    this.walkers = [];
  }
  /** נקודה פנויה על האי הבסיסי: לא על הלוח ועמדות השחקנים ולא בתוך מבנה */
  spotFree(x, z, m = 0.5) {
    if (Math.hypot(x, z) > HUB_BASE_R - 1.5) return false;
    if (Math.abs(x) < 6.4 + m && Math.abs(z) < 8 + m) return false;
    for (const o of this.blockers) if (Math.hypot(x - o.x, z - o.z) < o.r + m) return false;
    return true;
  }
  /** הקו הישר בין שתי נקודות לא עובר דרך מבנה או דרך הלוח */
  pathFree(a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5);
    for (let i = 1; i <= n; i++) { const k = i / n; if (!this.spotFree(a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k, 0.35)) return false; }
    return true;
  }
  /** יעד אקראי; עם from — רק יעד שאפשר להגיע אליו בקו ישר (אחרת null: מחכים ומנסים שוב) */
  randomSpot(from = null) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * TAU, r = 7 + Math.random() * (HUB_BASE_R - 8.5);
      const p = new V3(Math.cos(a) * r, 0, Math.sin(a) * r);
      if (!this.spotFree(p.x, p.z)) continue;
      if (from && !this.pathFree(from, p)) continue;
      return p;
    }
    return from ? null : new V3(0, 0, 12);
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
      this.walkers.push({ id, av, ups, pet, target: this.randomSpot(pos) || pos.clone(), wait: Math.random() * 2, speed: 1.1 + Math.random() * 0.5, phase: Math.random() * 10 });
    }
  }
  updateWalkers(dt, tt) {
    for (const w of this.walkers) {
      const g = w.av.group;
      const d = w.target.clone().sub(g.position).setY(0);
      const dist = d.length();
      let moving = false;
      if (w.wait > 0) w.wait -= dt;
      else if (dist < 0.3) { w.wait = 1.5 + Math.random() * 3; w.target = this.randomSpot(g.position) || g.position.clone(); }
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
    const pts = [new V3(0, RING_Y + 0.9, -13.6)]; // טבעת הפרימיום המרחפת — גם היא בתוך מבט־העל
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
    for (const g of this.buildings) g.userData.label.position.y = g.userData.labelY + bob;
    for (const a of this.anims) a.tick(a.o, tt, dt, a.y0);
    if (this.premiumRing) {
      this.premiumSpin.rotation.y = tt * 0.35;
      this.premiumRing.position.y = RING_Y + Math.sin(tt * 1.2) * 0.12;
      this.ringAcc = (this.ringAcc || 0) + dt;
      if (this.ringAcc > 0.22) {
        this.ringAcc = 0;
        const a = Math.random() * TAU, p = this.premiumRing.position;
        this.app.fx?.add?.emit({ count: 1, pos: [p.x + Math.sin(a) * 2.45, p.y + (Math.random() - 0.5) * 0.75, p.z + Math.cos(a) * 2.45], vel: [0, -0.5, 0], velSpread: [0.25, 0.2, 0.25], color: [0xffe08a, 0xfff6cf, 0xffc040], size: [0.12, 0.24], life: [0.8, 1.5] });
      }
    }
  }

  /** נגיעה בבניין: 'cinema' / 'museum' / 'shop_head' / 'shop_armor' / 'shop_weapon' / 'shop_aura' / 'shop_boards' / 'shop_pets' / 'shop_premium' / null */
  pick(x, y) {
    if (!this.active) return null;
    const hit = this.sm.pick(x, y, this.premiumRing ? [...this.buildings, this.premiumRing] : this.buildings)[0];
    if (!hit) return null;
    let o = hit.object;
    while (o && !o.userData.bid) o = o.parent;
    return o?.userData.bid ?? null;
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
