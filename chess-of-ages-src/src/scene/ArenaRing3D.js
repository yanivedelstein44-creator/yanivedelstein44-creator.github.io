/**
 * טבעת הזירה — הטבעת המשובצת שסביב הלוח באי המרכזי. נגיעה בה פותחת את זירת העידנים (ui/ArenaModal.js).
 * היא מכסה את פס הזהב הפשוט של רצפת השיש (eras/era02_classical.js: RingGeometry 7.1–7.35, y 0.065).
 *
 * ממשק (HubMuseum ו-GameApp קוראים רק לזה):
 *  new HubArenaRing(hub)  hub = HubMuseum: hub.group, hub.sm, hub.app (fx, sound), hub.makeLabel(text, icon)
 *  setActive(on)          האי המרכזי מוצג / לא
 *  update(dt, tt)         כל פריים (רק כשהאי פעיל)
 *  pickTargets()          אובייקטים לנגיעה, עם userData.bid = 'arena_ring'
 *  tap()                  משוב לנגיעה (גל אור סביב הטבעת, נצנוצים, צליל)
 *  relabel()              השפה התחלפה
 *
 * גיאומטריה של המקום (כדי שהקישוט לא ייכנס מתחת לדברים):
 *  הלוח יושב על במה מרובעת (חצי צלע ≈ 5.72, פינות מעוגלות) — היא מכסה את הטבעת סביב האלכסונים (≈37°–53°).
 *  על הטבעת עומדים כס השחקן (-3, 6.4), כן החיה (3, 6.3), כס הבוט (3, -6.5) וכן החיה שלו (-3, -6.4).
 *  במבט המשחק (לאורך) רואים בעיקר את הקשת שמאחורי הלוח (z < 0) ואת תחתית הקשת הקדמית.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { t } from '../ui/i18n.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const BID = 'arena_ring';
export const RING = { r0: 6.95, r1: 7.55, y: 0.07 };
const RM = (RING.r0 + RING.r1) / 2;          // קו האמצע של הטבעת (7.25)
const LAP_PERIOD = 7;                         // שניות לסיבוב של האור הרץ
const WAVE_TIME = 0.8;                        // שניות לגל האור של נגיעה

// ==== ART ====
// כרטיס סגנון: שיש שמנת, זהב חם #E8B84A, אמייל לאפיס #1D4F6E, טורקיז זוהר #4FE3FF, אבני חן אדומות כמו בטבעת הפרימיום.
// 4 קריאות ציור: פס האמייל (מאנדר), כל הזהב, כל המדליונים והאבנים (אטלס אחד), שכבת האור. + השלט הצף.
const PAL = { gold: '#E8B84A', goldHi: '#FBE08A', goldLo: '#9A6A1E', lapis: '#1D4F6E', lapisHi: '#2A6C92', lapisLo: '#102F46', cyan: '#4FE3FF', ruby: '#C8324A', ink: '#0B2233' };
const MEANDER_PERIODS = 108;                  // 27 חזרות של אריח בן 4 יחידות
const BIG_R = 0.62, SMALL_R = 0.45, EMB_R = 0.25;
// זוויות: 0 = מאחורי הלוח (0,-R), 90 = ימין, 180 = מלפנים. המיקום: (R sin a, y, -R cos a)
const BIG_AT = [0, 180], SMALL_AT = [90, 270];
const ERA_AT = [-12.5, 12.5, 66, 78, 102, 114, 246, 258, 282, 294];   // 10 עידנים, הרחק מהכיסאות ומכני החיות (±25°)
const ROSETTE_AT = [167.5, 192.5];
const ARC_HALF = 38.5;                        // כל קשת גלויה: ±37° סביב הציר (מעבר לזה הבמה מכסה)

const rng = (a) => () => { let k = (a = (a + 0x6D2B79F5) | 0); k = Math.imul(k ^ (k >>> 15), k | 1); k ^= k + Math.imul(k ^ (k >>> 7), k | 61); return ((k ^ (k >>> 14)) >>> 0) / 4294967296; };
const polar = (deg, r = RM) => [Math.sin(deg * DEG) * r, -Math.cos(deg * DEG) * r];

function goldGrad(x, y0, y1) {
  const g = x.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, PAL.goldHi); g.addColorStop(0.45, PAL.gold); g.addColorStop(1, PAL.goldLo);
  return g;
}

/** פס האמייל: מאנדר זהב על לאפיס, שורות פנינים ושיבוץ טורקיז. mask=true מצייר את מפת החומר (R שיבוץ זוהר, G חספוס, B מתכתיות) */
function bandCanvas(mask) {
  const W = 1024, H = 256, U = 256, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const GOLD = mask ? 'rgb(0,72,255)' : null, INLAY = mask ? 'rgb(255,64,0)' : PAL.cyan;
  if (mask) { x.fillStyle = 'rgb(0,140,0)'; x.fillRect(0, 0, W, H); }
  else {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0B2538'); g.addColorStop(0.3, '#143E59'); g.addColorStop(0.5, PAL.lapis); g.addColorStop(0.7, '#143E59'); g.addColorStop(1, '#0B2538');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const r = rng(11);                         // גרגר אמייל: כתמים רכים ונקודות פיריט, כמו לאפיס אמיתי
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '52,120,160' : '6,24,44'},${0.05 + r() * 0.08})`; x.beginPath(); x.ellipse(r() * W, r() * H, 6 + r() * 26, 3 + r() * 9, r() * 3, 0, TAU); x.fill(); }
    for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(240,205,120,${0.25 + r() * 0.4})`; x.fillRect(r() * W, r() * H, 1.6, 1.6); }
  }
  const gx = U / 6, gy = 30, y0 = H / 2 - 2 * gy;      // רשת המאנדר: 6 משבצות ליחידה, 4 לגובה
  for (let u = -1; u < 5; u++) {
    x.save(); x.translate(u * U, y0); x.scale(gx, gy);
    x.lineWidth = 0.56; x.lineJoin = 'miter'; x.lineCap = 'butt';
    const key = new Path2D('M-1 4H6 M5 4.28V0H1V2.7H3.5V1.3');
    if (!mask) { x.save(); x.translate(0.1, 0.16); x.strokeStyle = 'rgba(5,18,32,0.55)'; x.stroke(key); x.restore(); }
    x.strokeStyle = GOLD || PAL.gold; x.stroke(key);
    if (!mask) { x.lineWidth = 0.16; x.strokeStyle = 'rgba(255,244,200,0.75)'; x.translate(-0.1, -0.13); x.stroke(key); x.translate(0.1, 0.13); }
    // שיבוץ טורקיז קטן בין מפתח למפתח
    x.fillStyle = INLAY; x.beginPath(); x.moveTo(6, 1.05); x.lineTo(6.42, 1.9); x.lineTo(6, 2.75); x.lineTo(5.58, 1.9); x.closePath(); x.fill();
    if (!mask) { x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.moveTo(6, 1.3); x.lineTo(6.16, 1.8); x.lineTo(5.84, 1.8); x.closePath(); x.fill(); }
    x.restore();
  }
  for (const py of [37, H - 37]) {
    for (let i = 0; i < 16; i++) {                      // שורת פנינים
      const px = (i + 0.5) * (W / 16);
      x.save(); x.translate(px, py); x.scale(1, 0.72);
      if (mask) x.fillStyle = GOLD;
      else { const g = x.createRadialGradient(-2, -3, 0.5, 0, 0, 8.5); g.addColorStop(0, PAL.goldHi); g.addColorStop(0.5, PAL.gold); g.addColorStop(1, PAL.goldLo); x.fillStyle = g; }
      x.beginPath(); x.arc(0, 0, 8, 0, TAU); x.fill(); x.restore();
    }
  }
  x.fillStyle = GOLD || goldGrad(x, 0, 22); x.fillRect(0, 0, W, 22);
  x.fillStyle = GOLD || goldGrad(x, H - 22, H); x.fillRect(0, H - 22, W, 22);
  return c;
}

// ----- אטלס המדליונים: גלובוס, חרבות, 10 סמלי עידנים, אבני חן -----
const ATLAS = { W: 1024, H: 512, globe: [0, 0, 384, 384], swords: [384, 0, 256, 256], ruby: [640, 0, 64, 64], aqua: [704, 0, 64, 64], rosette: [768, 0, 128, 128] };
const eraRect = (i) => (i < 8 ? [i * 128, 384, 128, 128] : [640 + (i - 8) * 128, 256, 128, 128]);
const star = (cx, cy, r1, r2, n) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU - Math.PI / 2, r = i % 2 ? r2 : r1; d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`; } return d + 'Z'; };
const gearPath = (cx, cy, ro, ri, n) => { let d = ''; for (let i = 0; i < n; i++) { const a = (i / n) * TAU, w = TAU / n; [[a - w * 0.3, ri], [a - w * 0.2, ro], [a + w * 0.2, ro], [a + w * 0.3, ri]].forEach(([b, r], j) => { d += `${i || j ? 'L' : 'M'}${(cx + Math.cos(b) * r).toFixed(2)} ${(cy + Math.sin(b) * r).toFixed(2)}`; }); } return d + 'Z'; };
// סמלי העידנים בתיבת 24×24: [זהב, קווי חריטה כהים]
const ERA_GLYPHS = [
  ['M3.6 7.2h16.8v3.6H3.6z M5.6 10.8h3.8V20H5.6z M14.6 10.8h3.8V20h-3.8z', 'M5 9h3M12 9h6'],                                                    // אבן: דולמן
  ['M5.6 3.8h12.8v2.4H5.6z M7.4 6.2h9.2v1.7H7.4z M8.6 7.9h6.8v9.5H8.6z M7 17.4h10v1.7H7z M5.4 19.1h13.2V21H5.4z', 'M10.6 8.6v8.2M12 8.6v8.2M13.4 8.6v8.2'],   // קלאסי: עמוד
  ['M6 3.8h2.6V6h2.1V3.8h2.6V6h2.1V3.8H18v5.4l-1.4 1.2V20.4H7.4v-10L6 9.2z', 'M10.5 20.4v-4.2a1.5 1.5 0 0 1 3 0v4.2M11.2 11h1.6v2.2h-1.6z'],          // ימי הביניים: מגדל
  [gearPath(12, 12, 9.4, 7, 8) + ' M12 8.8a3.2 3.2 0 1 0 .01 0z', ''],                                                                          // תעשייה: גלגל שיניים
  ['M12 2.6 20.2 7.3v9.4L12 21.4 3.8 16.7V7.3z M12 5.4 6.2 8.7v6.6l5.8 3.3 5.8-3.3V8.7z M13.3 7 8.6 12.8h3l-.9 4.4 4.9-6.2h-3.1z', ''],            // סייבר: משושה וברק
  ['M2.6 4.6c3.4 1.3 15.4 1.3 18.8 0l-.9 2.9H3.5z M5 9.5h14v1.9H5z M6.9 7.5h2.2v13.1H6.9z M14.9 7.5h2.2v13.1h-2.2z M11.1 7.5h1.8v2h-1.8z', ''],   // סמוראי: שער טורי
  ['M11 7 20.6 20.4H1.6z M18.6 3.2a2.5 2.5 0 1 0 .01 0z', 'M11 7l2.6 13.4M6.4 14.2h7.4'],                                                        // מצרים: פירמידה ושמש
  ['M5.6 19.4v-3.6a6.4 6.6 0 0 1 12.8 0v3.6z M6.2 11.6C3.2 10.6 2.4 7 3.4 3.8c1 2.6 2.4 4 4.6 4.8z M17.8 11.6c3-1 3.8-4.6 2.8-7.8-1 2.6-2.4 4-4.6 4.8z', 'M12 12.4v7M5.8 15.6h12.4'],   // ויקינגים: קסדה
  ['M11 9h2v12.4h-2z M12 2.4 14 7h-4z M5.2 4.4 7.2 8c0 2.6 1.6 3.9 3.8 4v2.2c-3.8-.2-6.2-2.4-6.2-6z M18.8 4.4 16.8 8c0 2.6-1.6 3.9-3.8 4v2.2c3.8-.2 6.2-2.4 6.2-6z M8.6 16.4h6.8v1.8H8.6z', ''],   // אטלנטיס: קלשון
  [star(11, 12.6, 8.8, 3.3, 8) + ' M19.6 2.6a2.3 2.3 0 1 0 .01 0z', ''],                                                                        // שמימי: כוכב
];

function cameo(x, cx, cy, R, glow, rim = true) {      // רקע מדליון: אמייל לאפיס עם אור במרכז ושולי זהב חרוטים
  const g = x.createRadialGradient(cx, cy - R * 0.15, R * 0.05, cx, cy, R);
  if (glow) { g.addColorStop(0, 'rgba(79,227,255,0.3)'); g.addColorStop(0.55, 'rgba(79,227,255,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)'); }
  else { g.addColorStop(0, '#1D4F6E'); g.addColorStop(0.6, '#123A54'); g.addColorStop(1, '#0A2030'); }
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
  if (rim && !glow) { x.lineWidth = R * 0.07; x.strokeStyle = goldGrad(x, cy - R, cy + R); x.beginPath(); x.arc(cx, cy, R * 0.9, 0, TAU); x.stroke(); }
}
function glyph(x, d, lines, cx, cy, size, glow) {
  x.save(); x.translate(cx - size / 2, cy - size / 2); x.scale(size / 24, size / 24); x.lineJoin = 'round'; x.lineCap = 'round';
  const p = new Path2D(d);
  if (glow) { x.fillStyle = 'rgba(255,214,120,0.16)'; x.fill(p, 'evenodd'); x.restore(); return; }
  x.save(); x.translate(0.35, 0.6); x.fillStyle = 'rgba(4,16,30,0.6)'; x.fill(p, 'evenodd'); x.restore();
  x.lineWidth = 1.3; x.strokeStyle = PAL.ink; x.stroke(p);
  x.fillStyle = goldGrad(x, 2, 22); x.fill(p, 'evenodd');
  if (lines) { x.lineWidth = 0.75; x.strokeStyle = 'rgba(90,56,10,0.85)'; x.stroke(new Path2D(lines)); }
  x.restore();
}
function drawGlobe(x, cx, cy, R, glow) {
  cameo(x, cx, cy, R, glow, false);
  // קרני שמש עדינות וטבעת פנינים
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * TAU, r0 = R * 0.6, r1 = R * (i % 2 ? 0.74 : 0.8);
    x.strokeStyle = glow ? 'rgba(79,227,255,0.22)' : (i % 2 ? 'rgba(232,184,74,0.55)' : PAL.gold); x.lineWidth = R * (i % 2 ? 0.014 : 0.022);
    x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); x.stroke();
  }
  if (!glow) for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU, px = cx + Math.cos(a) * R * 0.89, py = cy + Math.sin(a) * R * 0.89;
    const g = x.createRadialGradient(px - 1, py - 1.5, 0.3, px, py, R * 0.034); g.addColorStop(0, PAL.goldHi); g.addColorStop(0.55, PAL.gold); g.addColorStop(1, PAL.goldLo);
    x.fillStyle = g; x.beginPath(); x.arc(px, py, R * 0.032, 0, TAU); x.fill();
  }
  // הגלובוס: ים טורקיז מואר, קווי אורך ורוחב בזהב
  const gr = R * 0.52;
  const sea = x.createRadialGradient(cx - gr * 0.3, cy - gr * 0.35, gr * 0.05, cx, cy, gr);
  if (glow) { sea.addColorStop(0, '#DFFBFF'); sea.addColorStop(0.5, PAL.cyan); sea.addColorStop(1, '#1B7FA6'); }
  else { sea.addColorStop(0, '#6FDDF5'); sea.addColorStop(0.45, '#1E9CC8'); sea.addColorStop(1, '#0E4E72'); }
  if (!glow) { x.fillStyle = 'rgba(4,16,30,0.55)'; x.beginPath(); x.arc(cx + gr * 0.05, cy + gr * 0.09, gr * 1.05, 0, TAU); x.fill(); }
  x.fillStyle = sea; x.beginPath(); x.arc(cx, cy, gr, 0, TAU); x.fill();
  x.save(); x.beginPath(); x.arc(cx, cy, gr, 0, TAU); x.clip();
  x.strokeStyle = glow ? 'rgba(255,240,190,0.5)' : goldGrad(x, cy - gr, cy + gr); x.lineWidth = gr * 0.07;
  for (const k of [0.36, 0.76]) { x.beginPath(); x.ellipse(cx, cy, gr * k, gr, 0, 0, TAU); x.stroke(); }
  x.beginPath(); x.moveTo(cx, cy - gr); x.lineTo(cx, cy + gr); x.moveTo(cx - gr, cy); x.lineTo(cx + gr, cy); x.stroke();
  for (const k of [-0.52, 0.52]) { x.beginPath(); x.ellipse(cx, cy + gr * k * 2.6, gr * 1.5, gr * 1.9, 0, 0, TAU); x.stroke(); }
  x.restore();
  x.lineWidth = gr * 0.11; x.strokeStyle = glow ? 'rgba(255,240,190,0.55)' : goldGrad(x, cy - gr, cy + gr); x.beginPath(); x.arc(cx, cy, gr, 0, TAU); x.stroke();
  if (!glow) { x.lineWidth = gr * 0.03; x.strokeStyle = PAL.ink; x.beginPath(); x.arc(cx, cy, gr * 1.06, 0, TAU); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.ellipse(cx - gr * 0.36, cy - gr * 0.5, gr * 0.2, gr * 0.09, -0.6, 0, TAU); x.fill(); }
}
function drawGem(x, [rx, ry, w], c0, c1, c2, glow) {
  const cx = rx + w / 2, cy = ry + w / 2, g = x.createRadialGradient(cx - w * 0.14, cy - w * 0.16, 1, cx, cy, w * 0.72);
  g.addColorStop(0, c0); g.addColorStop(0.4, c1); g.addColorStop(1, c2);
  x.fillStyle = g; x.fillRect(rx, ry, w, w);
  if (!glow) { x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.ellipse(cx - w * 0.13, cy - w * 0.15, w * 0.1, w * 0.06, -0.6, 0, TAU); x.fill(); }
}
function atlasCanvas(glow) {
  const c = document.createElement('canvas'); c.width = ATLAS.W; c.height = ATLAS.H;
  const x = c.getContext('2d');
  x.fillStyle = glow ? '#000000' : PAL.lapisLo; x.fillRect(0, 0, c.width, c.height);
  drawGlobe(x, 192, 192, 190, glow);
  // חרבות מוצלבות
  { const [sx, sy, s] = ATLAS.swords, cx = sx + s / 2, cy = sy + s / 2; cameo(x, cx, cy, s / 2 - 2, glow);
    const blade = 'M3.5 3.5h3l11 11-3 3-11-11z', hilt = 'M13.2 19.6l6.4-6.4 1.3 1.3-6.4 6.4z M18.8 18.8a1.9 1.9 0 1 0 2.7 2.7 1.9 1.9 0 1 0-2.7-2.7z';
    for (const flip of [1, -1]) { x.save(); x.translate(cx, cy); x.scale(flip, 1); x.translate(-cx, -cy); glyph(x, blade + ' ' + hilt, 'M5 5l10.4 10.4', cx, cy + 2, s * 0.6, glow); x.restore(); } }
  ERA_GLYPHS.forEach(([d, lines], i) => { const [ex, ey, s] = eraRect(i); cameo(x, ex + s / 2, ey + s / 2, s / 2 - 1, glow); glyph(x, d, lines, ex + s / 2, ey + s / 2, s * 0.56, glow); });
  // רוזטה (שושנת זהב) לקשת הקדמית
  { const [rx, ry, s] = ATLAS.rosette, cx = rx + s / 2, cy = ry + s / 2; cameo(x, cx, cy, s / 2 - 1, glow);
    if (!glow) for (let i = 0; i < 8; i++) { x.save(); x.translate(cx, cy); x.rotate((i / 8) * TAU); x.fillStyle = goldGrad(x, -s * 0.36, 0); x.strokeStyle = PAL.ink; x.lineWidth = 1.5; x.beginPath(); x.ellipse(0, -s * 0.22, s * 0.075, s * 0.15, 0, 0, TAU); x.fill(); x.stroke(); x.restore(); } }
  if (glow) { drawGem(x, ATLAS.ruby, '#70101E', '#30040C', '#100106', true); drawGem(x, ATLAS.aqua, '#E6FDFF', PAL.cyan, '#1B7FA6', true); }
  else { drawGem(x, ATLAS.ruby, '#C22840', '#7A0F22', '#2E0410'); drawGem(x, ATLAS.aqua, '#8FE8F8', '#1E9CC8', '#0E4E72'); }
  return c;
}
function canvasTex(c, { srgb = true, repeatX = 1 } = {}) {
  const tx = new THREE.CanvasTexture(c);
  if (srgb) tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 8;
  if (repeatX !== 1) { tx.wrapS = THREE.RepeatWrapping; tx.repeat.set(repeatX, 1); }
  return tx;
}

// ----- גיאומטריה -----
/** רצועה שטוחה על הרצפה בין r0 ל-r1. uv = (חלק מהסיבוב, 0 בפנים … 1 בחוץ), aAng = חלק מהסיבוב */
function stripGeometry(r0, r1, y, seg = 256) {
  const pos = [], uv = [], ang = [], nor = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const f = i / seg, a = f * TAU, s = Math.sin(a), c = -Math.cos(a);
    pos.push(s * r0, y, c * r0, s * r1, y, c * r1); uv.push(f, 0, f, 1); ang.push(f, f); nor.push(0, 1, 0, 0, 1, 0);
    if (i < seg) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aAng', new THREE.Float32BufferAttribute(ang, 1));
  g.setIndex(idx);
  return g;
}
const bare = (geo, keepUv) => { const g = geo.index ? geo.toNonIndexed() : geo; if (!keepUv) g.deleteAttribute('uv'); return g; };
const place = (geo, deg, r = RM, y = RING.y) => { const [px, pz] = polar(deg, r); return geo.rotateY(-deg * DEG).translate(px, y, pz); };
/** שולית זהב מעוגלת לאורך קשת (Lathe סביב מרכז הלוח), בין הזוויות a0..a1 במעלות */
function rimArc(r, a0, a1) {
  const pts = [[-0.05, 0], [-0.04, 0.02], [-0.02, 0.032], [0, 0.036], [0.02, 0.032], [0.04, 0.02], [0.05, 0]].map(([dx, dy]) => new THREE.Vector2(r - dx, RING.y + dy));
  return bare(new THREE.LatheGeometry(pts, Math.max(6, Math.round((a1 - a0) * 0.8)), Math.PI - a1 * DEG, (a1 - a0) * DEG));
}
/** מסגרת מדליון: טבעת Lathe מדורגת */
function bezel(R, w, h) {
  const pts = [[R - w, 0.004], [R - w * 0.82, h * 0.8], [R - w * 0.5, h], [R - w * 0.3, h * 0.72], [R - w * 0.12, h * 0.78], [R, 0]].map(([r, y]) => new THREE.Vector2(r, y));
  return bare(new THREE.LatheGeometry(pts.reverse(), R > 0.4 ? 40 : 20));
}
/** חץ זהב קטן (Extrude עם שיפוע) לצד מדליון, מצביע לאורך הטבעת */
function chevron(len = 0.24, half = 0.15) {
  const s = new THREE.Shape();
  s.moveTo(0, -half); s.quadraticCurveTo(len * 0.5, -half * 0.5, len, 0); s.quadraticCurveTo(len * 0.5, half * 0.5, 0, half); s.quadraticCurveTo(len * 0.34, 0, 0, -half);
  return bare(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 2, curveSegments: 6 }).rotateX(-Math.PI / 2).translate(0, 0.01, 0));
}
/** דיסקה שטוחה עם uv לתוך מלבן באטלס; החלק העליון של הציור פונה החוצה מהלוח */
function face(R, [ax, ay, aw, ah], seg = 40) {
  const g = new THREE.CircleGeometry(R, seg), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (ax + uv.getX(i) * aw) / ATLAS.W, 1 - (ay + (1 - uv.getY(i)) * ah) / ATLAS.H);
  return bare(g.rotateX(-Math.PI / 2), true);
}
/** אבן קבושון נמוכה */
function cabochon(r, h, [ax, ay, aw]) {
  const g = new THREE.SphereGeometry(r, 10, 4, 0, TAU, 0, Math.PI / 2).scale(1, h / r, 1), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (ax + (0.5 + (p.getX(i) / r) * 0.42) * aw) / ATLAS.W, 1 - (ay + (0.5 + (p.getZ(i) / r) * 0.42) * aw) / ATLAS.H);
  return bare(g, true);
}

const LIGHT_GLSL = /* glsl */`
  uniform float uHead, uWave, uWaveAmp, uOrigin;
  float ringIdle(float ang) {                       // שני "שביטים" של אור שרצים זה מול זה
    float d = fract(uHead - ang), d2 = fract(d + 0.5);
    return exp(-d * 13.0) + exp(-(1.0 - d) * 90.0) + exp(-d2 * 13.0) + exp(-(1.0 - d2) * 90.0);
  }
  float ringWave(float ang) {                       // גל הנגיעה: יוצא מהמדליון הרחוק ונסגר מול המצלמה
    float da = abs(fract(ang - uOrigin + 0.5) - 0.5) * 2.0, fr = uWave * 1.12 - 0.06, k = (da - fr) / 0.075;
    return (exp(-k * k) + step(da, fr) * exp(-(fr - da) * 3.2) * 0.55) * uWaveAmp;
  }
`;

function buildArt(owner) {
  const g = new THREE.Group();
  const U = { uHead: { value: 0 }, uWave: { value: 0 }, uWaveAmp: { value: 0 }, uOrigin: { value: 0 }, uPulse: { value: 0 }, uFlash: { value: 0 } };

  // 1) פס האמייל
  const bandMat = new THREE.MeshStandardMaterial({
    map: canvasTex(bandCanvas(false), { repeatX: MEANDER_PERIODS / 4 }), metalnessMap: canvasTex(bandCanvas(true), { srgb: false, repeatX: MEANDER_PERIODS / 4 }),
    metalness: 1, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  bandMat.roughnessMap = bandMat.metalnessMap;
  bandMat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = 'attribute float aAng;\nvarying float vAng;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvAng = aAng;');
    s.fragmentShader = 'varying float vAng;\n' + LIGHT_GLSL + s.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        float inlay = texture2D( metalnessMap, vMetalnessMapUv ).r, idle = ringIdle( vAng ), wave = ringWave( vAng ), gm = metalnessFactor;
        vec3 cy = vec3( 0.31, 0.89, 1.0 );
        totalEmissiveRadiance += ( 1.0 - gm ) * ( 1.0 - inlay ) * ( diffuseColor.rgb * 0.05 + cy * ( idle * 0.2 + wave * 0.75 ) );
        totalEmissiveRadiance += inlay * cy * ( 0.45 + idle * 1.1 + wave * 1.6 );
        totalEmissiveRadiance += gm * vec3( 1.0, 0.82, 0.45 ) * ( idle * 0.22 + wave * 0.8 );
      }`);
  };
  const band = new THREE.Mesh(stripGeometry(RING.r0, RING.r1, RING.y), bandMat);
  band.receiveShadow = true;

  // 2) כל הזהב: שוליות (חתוכות מתחת למדליונים ומתחת לבמה), מסגרות, חיצים
  const gold = [];
  const gaps = [...BIG_AT.map((a) => [a, 4.0]), ...SMALL_AT.map((a) => [a, 2.3])];
  for (const [c, gap] of gaps) for (const r of [RING.r0, RING.r1]) gold.push(rimArc(r, c - ARC_HALF, c - gap), rimArc(r, c + gap, c + ARC_HALF));
  for (const a of BIG_AT) {
    gold.push(place(bezel(BIG_R + 0.025, 0.15, 0.032), a));
    for (const sg of [1, -1]) gold.push(place(chevron().rotateY(sg > 0 ? 0 : Math.PI).translate(sg * 0.74, 0, 0), a));
  }
  for (const a of SMALL_AT) {
    gold.push(place(bezel(SMALL_R + 0.02, 0.11, 0.036), a));
    for (const sg of [1, -1]) gold.push(place(chevron(0.2, 0.13).rotateY(sg > 0 ? 0 : Math.PI).translate(sg * 0.55, 0, 0), a));
  }
  for (const a of [...ERA_AT, ...ROSETTE_AT]) gold.push(place(bezel(EMB_R, 0.06, 0.03), a));
  const goldMesh = new THREE.Mesh(mergeGeometries(gold, false), new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 1, roughness: 0.24 }));
  goldMesh.receiveShadow = true;

  // 3) פני המדליונים ואבני החן (אטלס אחד)
  const faces = [];
  for (const a of BIG_AT) {
    faces.push(place(face(BIG_R - 0.1, ATLAS.globe, 48), a, RM, RING.y + 0.014));
    for (let i = 0; i < 4; i++) { const b = (i / 4) * TAU + Math.PI / 4; faces.push(place(cabochon(0.056, 0.02, ATLAS.ruby).translate(Math.cos(b) * (BIG_R - 0.05), 0.02, Math.sin(b) * (BIG_R - 0.045)), a)); }
  }
  for (const a of SMALL_AT) {
    faces.push(place(face(SMALL_R - 0.075, ATLAS.swords, 32), a, RM, RING.y + 0.012));
    for (const sg of [1, -1]) faces.push(place(cabochon(0.034, 0.016, ATLAS.aqua).translate(0, 0.02, sg * (SMALL_R - 0.03)), a));
  }
  ERA_AT.forEach((a, i) => faces.push(place(face(EMB_R - 0.045, eraRect(i), 24), a, RM, RING.y + 0.01)));
  for (const a of ROSETTE_AT) { faces.push(place(face(EMB_R - 0.045, ATLAS.rosette, 24), a, RM, RING.y + 0.01)); faces.push(place(cabochon(0.05, 0.02, ATLAS.aqua).translate(0, 0.012, 0), a)); }
  const faceMat = new THREE.MeshStandardMaterial({ map: canvasTex(atlasCanvas(false)), emissiveMap: canvasTex(atlasCanvas(true)), emissive: 0xffffff, emissiveIntensity: 0.3, metalness: 0, roughness: 0.5 });
  const faceMesh = new THREE.Mesh(mergeGeometries(faces, false), faceMat);
  faceMesh.receiveShadow = true;

  // 4) שכבת האור: הילה רכה לאורך הטבעת (האור הרץ + גל הנגיעה) והילות למדליונים
  const glowParts = [];
  const ringGlow = stripGeometry(RING.r0 - 0.42, RING.r1 + 0.42, RING.y + 0.045, 192).toNonIndexed();
  ringGlow.deleteAttribute('normal');
  { const n = ringGlow.attributes.position.count; ringGlow.setAttribute('aKind', new THREE.Float32BufferAttribute(new Float32Array(n), 1)); }
  glowParts.push(ringGlow);
  const halo = (deg, size, kind) => {
    const q = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2).toNonIndexed(), n = q.attributes.position.count;
    q.deleteAttribute('normal');
    q.setAttribute('aAng', new THREE.Float32BufferAttribute(new Float32Array(n).fill(((deg % 360) + 360) % 360 / 360), 1));
    q.setAttribute('aKind', new THREE.Float32BufferAttribute(new Float32Array(n).fill(kind), 1));
    const [px, pz] = polar(deg); return q.translate(px, RING.y + 0.046, pz);
  };
  for (const a of BIG_AT) glowParts.push(halo(a, 3.3, 1));
  for (const a of SMALL_AT) glowParts.push(halo(a, 2.1, 0.55));
  const glowMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, toneMapped: false,
    vertexShader: /* glsl */`attribute float aAng, aKind; varying float vAng, vKind; varying vec2 vUv;
      void main() { vAng = aAng; vKind = aKind; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
    fragmentShader: /* glsl */`varying float vAng, vKind; varying vec2 vUv; uniform float uPulse, uFlash;` + LIGHT_GLSL + /* glsl */`
      void main() {
        float wave = ringWave( vAng ), a, hot;
        if ( vKind < 0.01 ) {
          float p = sin( 3.14159 * vUv.y ); p *= p;
          a = p * ( ringIdle( vAng ) * 0.22 + wave * 0.8 ); hot = wave * 0.6;
        } else {
          float h = max( 0.0, 1.0 - length( vUv - 0.5 ) * 2.0 ); h = h * h * ( 3.0 - 2.0 * h );
          float far = 1.0 - abs( fract( vAng - uOrigin + 0.5 ) - 0.5 ) * 2.0;     // 1 במדליון הרחוק (זה שמול המצלמה)
          a = h * vKind * ( 0.26 + uPulse * 0.2 + wave * 0.4 + uFlash * far * 0.8 ); hot = uFlash * far * 0.5 * h;
        }
        gl_FragColor = vec4( mix( vec3( 0.31, 0.89, 1.0 ), vec3( 1.0 ), clamp( hot, 0.0, 0.8 ) ), clamp( a, 0.0, 0.92 ) );
        #include <colorspace_fragment>
      }`,
  });
  const glowMesh = new THREE.Mesh(mergeGeometries(glowParts, false), glowMat);
  glowMesh.renderOrder = 2;

  g.add(band, goldMesh, faceMesh, glowMesh);
  g.userData.parts = 3 + gold.length + faces.length;

  // ----- תנועה ומשוב -----
  const st = { wave: -1, flash: 0, spark: 1.5 };
  const sparkP = { count: 1, pos: [0, 0, 0], vel: [0, 0.55, 0], velSpread: [0.18, 0.25, 0.18], color: [0x4fe3ff, 0xd9fbff, 0xffe08a], size: [0.06, 0.13], life: [0.7, 1.3], drag: 0.8 };
  const tapPos = [0, 0.3, 0], TAP_COLORS = [0x4fe3ff, 0xffffff, 0xffe08a];
  return {
    group: g, uniforms: U,
    tick(dt, tt) {
      const head = (tt / LAP_PERIOD) % 1;
      U.uHead.value = head;
      U.uPulse.value = 0.5 + 0.5 * Math.sin(tt * 2.1);
      U.uOrigin.value = owner.farSign() > 0 ? 0 : 0.5;
      faceMat.emissiveIntensity = 0.28 + U.uPulse.value * 0.34 + st.flash * 1.4;
      if (st.wave >= 0) {
        st.wave += dt / WAVE_TIME;
        U.uWave.value = Math.min(st.wave, 1.3);
        U.uWaveAmp.value = st.wave < 1 ? 1 : Math.max(0, 1 - (st.wave - 1) / 0.6);
        if (st.wave > 1.6) { st.wave = -1; U.uWaveAmp.value = 0; }
      }
      if (st.flash > 0) st.flash = Math.max(0, st.flash - dt * 1.6);
      U.uFlash.value = st.flash;
      // ניצוץ קטן מדי פעם, בראש האור הרץ (לא באיכות נמוכה)
      const q = owner.sm.quality?.level, fx = owner.app.fx;
      if (q !== 'low' && fx?.add?.emit && (st.spark -= dt) <= 0) {
        st.spark = (q === 'medium' ? 1.5 : 0.75) * (0.7 + Math.random() * 0.6);
        const a = (head + (Math.random() < 0.5 ? 0 : 0.5)) * TAU, deg = ((a / DEG) % 90 + 90) % 90;
        if (deg < 36 || deg > 54) {             // לא מתחת לבמה
          const r = RING.r0 + Math.random() * (RING.r1 - RING.r0);
          sparkP.pos[0] = Math.sin(a) * r; sparkP.pos[1] = RING.y + 0.08; sparkP.pos[2] = -Math.cos(a) * r;
          fx.add.emit(sparkP);
        }
      }
    },
    pulse() {
      st.wave = 0; st.flash = 1;
      U.uWave.value = 0; U.uWaveAmp.value = 1;
      tapPos[2] = -RM * owner.farSign();
      owner.app.fx?.sparkle?.(tapPos, owner.sm.quality?.level === 'low' ? 10 : 22, TAP_COLORS);
      owner.app.sound?.arenaChime?.();
    },
  };
}
// ==== /ART ====

const LABEL_Y = 2.15;
const smooth = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };

export class HubArenaRing {
  constructor(hub) {
    this.hub = hub;
    this.app = hub.app;
    this.sm = hub.sm;
    this.active = false;
    this.root = new THREE.Group();
    this.art = buildArt(this);
    this.root.add(this.art.group);
    // אזור הנגיעה: פס שקוף מעט רחב מהטבעת (על הרצפה)
    this.hit = new THREE.Mesh(new THREE.RingGeometry(RING.r0 - 0.25, RING.r1 + 0.35, 96, 1), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.rotation.x = -Math.PI / 2;
    this.hit.position.y = RING.y + 0.05;
    this.hit.userData.bid = BID;
    this.root.add(this.hit);
    this.targets = [this.hit];
    this.targetsWithLabel = [this.hit];
    this.noTargets = [];
    this.label = null;
    this.labelK = 0;
    this.makeLabel();
    hub.group.add(this.root);
  }

  /** 1 כשהמצלמה בצד z חיובי (המדליון "הרחוק" ב-z שלילי), ‎-1 כשמשחקים מהצד השני */
  farSign() { return this.hub.viewSign?.() ?? 1; }

  makeLabel() {
    const old = this.label;
    if (old) { this.root.remove(old); old.material.map?.dispose(); old.material.dispose(); }
    const lab = this.hub.makeLabel(t('arenaTab'), 'globe');
    lab.userData.bid = BID;
    lab.userData.sx = lab.scale.x; lab.userData.sy = lab.scale.y;
    lab.material.opacity = this.labelK;
    lab.visible = this.labelK > 0.02;
    lab.position.set(0, LABEL_Y, -RM * this.farSign());
    this.root.add(lab);
    this.label = lab;
    this.targetsWithLabel[1] = lab;
  }

  setActive(on) { this.active = on; this.root.visible = on; }

  update(dt, tt) {
    if (!this.active) return;
    this.art.tick(dt, tt);
    // השלט: רק כשהמצלמה רחוקה (מבט רחב); במבט המשחק הוא היה מכסה את הלוח
    const lab = this.label, sm = this.sm;
    const dist = sm.camera.position.distanceTo(sm.controls.target);
    const want = sm.overviewOn ? smooth(21, 27, dist) : 0;
    this.labelK += (want - this.labelK) * Math.min(1, dt * 5);
    const k = this.labelK;
    lab.visible = k > 0.02;
    if (lab.visible) {
      const pop = 0.82 + 0.18 * k;
      lab.material.opacity = k;
      lab.scale.set(lab.userData.sx * pop, lab.userData.sy * pop, 1);
      lab.position.set(0, LABEL_Y + Math.sin(tt * 1.6) * 0.07, -RM * this.farSign());
    }
  }

  pickTargets() { return !this.active ? this.noTargets : this.label.visible && this.labelK > 0.5 ? this.targetsWithLabel : this.targets; }
  tap() { this.art.pulse(); }
  relabel() { this.makeLabel(); }
}
