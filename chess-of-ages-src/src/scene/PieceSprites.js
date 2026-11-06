/**
 * כלי שחמט דו-ממדיים: ספרייטים שטוחים שמצוירים ב-Canvas לפי ערכת החומרים של העידן / הסקין / האי.
 * הצורות מקוריות (ציור וקטורי פשוט), והמילוי לוקח מהחומר את הצבע, הטקסטורה (שיש, עץ, אבן),
 * את הברק (מתכת / לכה) ואת הזוהר (ניאון) — כך שכל עידן מקבל סט כלים משלו.
 */
import * as THREE from 'three';

const SIZE = 256;
const S = SIZE / 100; // הצורות מוגדרות בקופסה של 100×100

// ---------- צורות (y כלפי מטה, הבסיס בתחתית) ----------
const BASE_BAND = 'M26 78 L74 78 Q78 80 78 84 L22 84 Q22 80 26 78 Z';
const BASE_SLAB = 'M16 94 L16 89 Q16 84 24 84 L76 84 Q84 84 84 89 L84 94 Z';
const SHAPES = {
  p: [
    ['body', 'M41 46 Q44 60 34 78 L66 78 Q56 60 59 46 Z'],
    ['accent', 'M37 42 Q50 37 63 42 L61 47 Q50 43 39 47 Z'],
    ['body', 'circle', 50, 27, 12.5],
  ],
  r: [
    ['body', 'M34 40 L66 40 L67 78 L33 78 Z'],
    ['body', 'M27 17 L38 17 L38 24 L45 24 L45 17 L55 17 L55 24 L62 24 L62 17 L73 17 L73 34 L66 41 L34 41 L27 34 Z'],
    ['accent', 'M30 31 L70 31 L70 35 L30 35 Z'],
  ],
  n: [
    ['body', 'M30 79 C29 68 33 61 40 55 C33 56 25 58 19 54 C14 50 15 44 21 41 C28 36 31 29 36 22 L39 11 L45 19 C60 19 74 32 75 50 C76 63 72 71 71 79 Z'],
  ],
  b: [
    ['body', 'M42 70 Q44 74 34 78 L66 78 Q56 74 58 70 Z'],
    ['body', 'M50 17 C62 27 66 41 62 55 C60 61 56 65 50 65 C44 65 40 61 38 55 C34 41 38 27 50 17 Z'],
    ['accent', 'M37 64 Q50 59 63 64 L61 71 Q50 67 39 71 Z'],
    ['accent', 'circle', 50, 13, 5],
  ],
  q: [
    ['body', 'M36 66 Q40 72 30 78 L70 78 Q60 72 64 66 Z'],
    ['body', 'M25 30 L34 52 L38 27 L46 50 L50 22 L54 50 L62 27 L66 52 L75 30 L68 61 L32 61 Z'],
    ['accent', 'M31 59 Q50 54 69 59 L67 67 Q50 62 33 67 Z'],
    ['accent', 'circle', 25, 27, 4.6], ['accent', 'circle', 38, 23, 4.6], ['accent', 'circle', 50, 18, 5.2], ['accent', 'circle', 62, 23, 4.6], ['accent', 'circle', 75, 27, 4.6],
  ],
  k: [
    ['body', 'M36 64 Q40 72 30 78 L70 78 Q60 72 64 64 Z'],
    ['body', 'M28 37 C27 27 40 24 46 31 C48 27 52 27 54 31 C60 24 73 27 72 37 L66 59 L34 59 Z'],
    ['accent', 'M31 57 Q50 52 69 57 L67 65 Q50 60 33 65 Z'],
    ['accent', 'M47 4 L53 4 L53 10 L59 10 L59 16 L53 16 L53 25 L47 25 L47 16 L41 16 L41 10 L47 10 Z'],
  ],
};

// ---------- קריאת חומר ----------
const _avgCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
function averageOf(image) {
  if (!_avgCanvas || !image) return null;
  try {
    _avgCanvas.width = _avgCanvas.height = 8;
    const x = _avgCanvas.getContext('2d', { willReadFrequently: true });
    x.drawImage(image, 0, 0, 8, 8);
    const d = x.getImageData(0, 0, 8, 8).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    return [r / n, g / n, b / n];
  } catch { return null; }
}
const hexToRgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const rgbStr = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** תיאור "צבעי" של חומר: צבע בסיס, טקסטורה, ברק, זוהר */
function describe(mat) {
  if (!mat) return { base: [200, 200, 200], image: null, metal: 0, gloss: 0, glow: null, glass: false };
  const tint = hexToRgb(mat.color ? mat.color.getHex() : 0xffffff);
  const img = mat.map?.image || null;
  const avg = averageOf(img);
  const base = avg ? [avg[0] * tint[0] / 255, avg[1] * tint[1] / 255, avg[2] * tint[2] / 255] : tint;
  let glow = null;
  if (mat.emissive && (mat.emissiveIntensity || 0) > 0.25) {
    const e = hexToRgb(mat.emissive.getHex());
    if (e[0] + e[1] + e[2] > 60) glow = e;
  }
  return {
    base, image: img, tint, metal: mat.metalness || 0, gloss: Math.max(mat.clearcoat || 0, 1 - (mat.roughness ?? 1)),
    glow, glass: !!(mat.transparent && mat.opacity < 0.97) || (mat.iridescence || 0) > 0.5,
  };
}

// ---------- ציור ----------
function partPath(part) {
  if (part[1] === 'circle') { const p = new Path2D(); p.arc(part[2], part[3], part[4], 0, Math.PI * 2); return p; }
  return new Path2D(part[1]);
}

function fillPart(ctx, path, d, color) {
  ctx.save();
  ctx.clip(path);
  // בסיס: צבע ממוצע, ואז הטקסטורה עצמה (שיש / עץ / אבן) בעדינות
  ctx.fillStyle = rgbStr(d.base);
  ctx.fillRect(0, 0, 100, 100);
  if (d.image) {
    try {
      const pat = ctx.createPattern(d.image, 'repeat');
      if (pat) {
        pat.setTransform?.(new DOMMatrix().scale(0.16));
        ctx.globalAlpha = d.glass ? 0.45 : 0.8;
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, 100, 100);
        if (d.tint[0] + d.tint[1] + d.tint[2] < 740) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 1; ctx.fillStyle = rgbStr(d.tint); ctx.fillRect(0, 0, 100, 100); }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    } catch { /* טקסטורה לא זמינה — נשארים עם הצבע */ }
  }
  // הצללה: אור מלמעלה-שמאל, צל למטה-ימין
  const dark = color === 'b';
  const g = ctx.createLinearGradient(20, 8, 82, 92);
  g.addColorStop(0, `rgba(255,255,255,${dark ? 0.22 : 0.38})`);
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, `rgba(0,0,0,${dark ? 0.34 : 0.26})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 100, 100);
  // מתכת: פס ברק אנכי; לכה/זכוכית: ברק רך
  if (d.metal > 0.6) {
    const m = ctx.createLinearGradient(30, 0, 70, 0);
    m.addColorStop(0, 'rgba(255,255,255,0)'); m.addColorStop(0.42, 'rgba(255,255,255,0.0)'); m.addColorStop(0.5, 'rgba(255,255,255,0.55)'); m.addColorStop(0.58, 'rgba(255,255,255,0)');
    ctx.fillStyle = m; ctx.fillRect(0, 0, 100, 100);
  } else if (d.gloss > 0.75) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(40, 30, 14, 26, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  if (d.glass) {
    const ir = ctx.createLinearGradient(0, 0, 100, 100);
    ir.addColorStop(0, 'rgba(255,170,230,0.18)'); ir.addColorStop(0.5, 'rgba(160,230,255,0.18)'); ir.addColorStop(1, 'rgba(200,255,190,0.18)');
    ctx.fillStyle = ir; ctx.fillRect(0, 0, 100, 100);
  }
  ctx.restore();
}

function drawPiece(type, color, set) {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d');
  ctx.scale(S, S);
  const side = color === 'w' ? set?.white : set?.black;
  const body = describe(side?.body), accent = describe(side?.accent);
  const dark = color === 'b';
  // קו מתאר: לבנים — כהה; שחורים — כהה עם הילה בהירה (כדי שיבלטו גם על משבצת כהה)
  const outline = dark ? 'rgba(14,10,8,0.95)' : 'rgba(30,22,14,0.92)';
  const halo = dark ? mixRgb(lum(accent.base) > 0.45 ? accent.base : [255, 236, 200], [255, 255, 255], 0.25) : [0, 0, 0];
  const parts = SHAPES[type].map((p) => ({ role: p[0], path: partPath(p) }));
  const baseParts = [{ role: 'accent', path: new Path2D(BASE_BAND) }, { role: 'body', path: new Path2D(BASE_SLAB), slab: true }];
  const all = [...parts, ...baseParts];

  // 1) הילה וצל רך מתחת לכל הצורה
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const glow = body.glow || accent.glow;
  for (const p of all) {
    ctx.shadowColor = glow ? rgbStr(glow, 0.95) : 'rgba(0,0,0,0)';
    ctx.shadowBlur = glow ? 7 : 0;
    ctx.strokeStyle = rgbStr(halo, dark ? 0.8 : 0.32);
    ctx.lineWidth = dark ? 6.2 : 6.6;
    ctx.stroke(p.path);
  }
  ctx.restore();

  // 2) מילוי ומתאר לכל חלק, מאחור לפנים (קווי החפיפה נשארים כקווי פרט)
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const p of all) {
    const d = p.role === 'accent' ? accent : body;
    const dd = p.slab ? { ...d, base: mixRgb(d.base, [0, 0, 0], 0.18) } : d;
    fillPart(ctx, p.path, dd, color);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.6;
    ctx.stroke(p.path);
  }

  // 3) פרטים
  const detail = dark ? rgbStr(mixRgb(accent.base, [255, 255, 255], 0.35), 0.95) : 'rgba(30,22,14,0.9)';
  ctx.strokeStyle = detail; ctx.fillStyle = detail; ctx.lineWidth = 2.4;
  if (type === 'n') {
    // רעמה, עין, נחיר ורסן
    ctx.save();
    ctx.strokeStyle = rgbStr(accent.base, 1); ctx.lineWidth = 3.6;
    ctx.stroke(new Path2D('M47 21 C59 23 70 34 71 50 C72 61 68 70 67 78'));
    ctx.strokeStyle = outline; ctx.lineWidth = 1.2;
    ctx.stroke(new Path2D('M47 21 C59 23 70 34 71 50 C72 61 68 70 67 78'));
    ctx.restore();
    ctx.beginPath(); ctx.arc(36.5, 31, 2.8, 0, Math.PI * 2); ctx.fillStyle = dark ? '#fff4d8' : '#1e160e'; ctx.fill();
    ctx.beginPath(); ctx.arc(21.5, 47, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgbStr(accent.base, 0.95); ctx.lineWidth = 1.8;
    ctx.stroke(new Path2D('M26 50 C33 47 40 41 44 34'));
  } else if (type === 'b') {
    ctx.lineWidth = 3; ctx.stroke(new Path2D('M56 29 L46 45'));
  } else if (type === 'r') {
    ctx.lineWidth = 1.6; ctx.stroke(new Path2D('M40 50 L60 50 M38 62 L62 62'));
  } else if (type === 'k' || type === 'q') {
    // אבני חן בפס הכתר
    const y = type === 'k' ? 60.5 : 62.5;
    for (const x of [40, 50, 60]) { ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fillStyle = dark ? '#ffe9a8' : '#b8282a'; ctx.fill(); }
  }
  // זוהר פנימי לחומרים זוהרים (ניאון / לבה / קריסטל)
  if (glow) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgbStr(glow, 0.55); ctx.lineWidth = 1.2;
    for (const p of parts) ctx.stroke(p.path);
    ctx.restore();
  }
  return c;
}

// ---------- מטמון טקסטורות (סט לכל ערכת חומרים) ----------
const SETS = new Map(); // key → { tex: {wp:..}, used }
const MAX_SETS = 4;

/** טקסטורה של כלי: key = מפתח ערכת החומרים (עידן / סקין / אי) */
export function pieceTexture(key, mats, type, color) {
  let entry = SETS.get(key);
  if (!entry) {
    entry = { tex: {}, used: 0 };
    SETS.set(key, entry);
    if (SETS.size > MAX_SETS) {
      // מפנים את הסט שלא היה בשימוש הכי הרבה זמן
      let oldK = null, oldT = Infinity;
      for (const [k, e] of SETS) if (k !== key && e.used < oldT) { oldT = e.used; oldK = k; }
      if (oldK) { Object.values(SETS.get(oldK).tex).forEach((t) => t.dispose()); SETS.delete(oldK); }
    }
  }
  entry.used = performance.now();
  const id = color + type;
  if (!entry.tex[id]) {
    const t = new THREE.CanvasTexture(drawPiece(type, color, mats));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    entry.tex[id] = t;
  }
  return entry.tex[id];
}

/** צל רך מתחת לכלי שטוח */
let shadowTex = null;
export function pieceShadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

/** תמונה של כלי (dataURL) — לממשק (למשל תצוגה מקדימה של סקין בחנות) */
export function pieceImage(mats, type, color, size = 96) {
  const src = drawPiece(type, color, mats);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  c.getContext('2d').drawImage(src, 0, 0, size, size);
  return c.toDataURL('image/png');
}

/** תמונת תצוגה של סקין: קטע לוח (משבצות מהטקסטורות) + מלכה לבנה ומלך שחור */
export function skinPreview(set, size = 220) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const sq = size / 4;
  const fillOf = (mat) => {
    const d = describe(mat);
    if (d.image) { try { const p = x.createPattern(d.image, 'repeat'); if (p) { p.setTransform?.(new DOMMatrix().scale(0.45)); return { p, base: d.base }; } } catch { /* צבע */ } }
    return { p: null, base: d.base };
  };
  const light = fillOf(set.light), dark = fillOf(set.dark), frame = describe(set.frame);
  x.fillStyle = rgbStr(frame.base); x.fillRect(0, 0, size, size);
  for (let r = 0; r < 4; r++) for (let f = 0; f < 4; f++) {
    const v = (r + f) % 2 ? dark : light;
    const px = f * sq, py = r * sq + sq * 0.5;
    x.fillStyle = rgbStr(v.base); x.fillRect(px, py, sq, sq);
    if (v.p) { x.globalAlpha = 0.85; x.fillStyle = v.p; x.fillRect(px, py, sq, sq); x.globalAlpha = 1; }
  }
  const g = x.createLinearGradient(0, 0, size, size); g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  x.drawImage(drawPiece('q', 'w', set), size * 0.04, size * 0.18, size * 0.5, size * 0.5);
  x.drawImage(drawPiece('k', 'b', set), size * 0.46, size * 0.12, size * 0.5, size * 0.5);
  return c.toDataURL('image/png');
}
