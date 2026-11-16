/**
 * הדולפין של האי המרכזי — שוחה במים שמול האי (החזית, מול המצלמה במבט הרחב) וקופץ מדי פעם.
 * נגיעה בו: אם אפשר לצפות בפרסומת מתגמלת — חלון הסבר (core/RewardedAds.js); אחרת רק קפיצה שמחה.
 *
 * ממשק (HubMuseum ו-RewardedAds קוראים רק לזה):
 *  new HubDolphin(hub)   hub = HubMuseum: hub.group, hub.sm, hub.app (fx, sound), hub.shoreRadius(angle), hub.extent
 *  setActive(on)         האי המרכזי מוצג / לא
 *  update(dt, tt)        כל פריים (רק כשהאי פעיל)
 *  setOffer(o)           { state: 'off' | 'ready' | 'wait' | 'done', secs } — התג שמעל הדולפין
 *  pickTargets()         אובייקטים לנגיעה, עם userData.bid = 'ad_dolphin'
 *  celebrate()           קפיצה גדולה + נצנוצים (קיבלת יהלומים)
 *  wave()                קפיצה קטנה (נגיעה בלי פרסומת)
 *  relabel()             השפה התחלפה
 *  worldPos(out)         מיקום הדולפין בעולם (לתווית "+20" על המסך)
 *
 * מבנה:
 *  ==== ART ====   הדגם (15 חלקים מפוסלים שמתמזגים ל-2 רשתות), החומרים, גלי הגוף (בשיידר), מרקמי המים והתג.
 *  ==== /ART ====
 *  HubDolphin      מסלול השחייה, הקפיצות, ההתזות, התג והנגיעה. בלי הקצאות זיכרון בתוך update.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SEA_Y } from './Sea.js';
import { addCharacterRim, glowTexture } from './kit.js';
import { drawIcon } from '../ui/icons.js';

const TAU = Math.PI * 2;
const BID = 'ad_dolphin';
const GEM_COLORS = [0x5fd3ff, 0xd9fbff, 0x7b4dff];
const FOAM_COLORS = [0xffffff, 0xd9f4ff, 0x9fdcf2];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
const backOut = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ==== ART ====
// פלטה: גב כחול-אפור קריר, צד תכלת, בטן שמנת חמימה, סומק קטן בלחי
const COL = {
  back: new THREE.Color(0x1f4c7c), side: new THREE.Color(0x3d7fb8), belly: new THREE.Color(0xf4e8d4),
  fin: new THREE.Color(0x1b4573), finTip: new THREE.Color(0x3572a8), blush: new THREE.Color(0xef9a8e),
  sclera: new THREE.Color(0xf3f7fa), pupil: new THREE.Color(0x182236), line: new THREE.Color(0x173456),
};
const _c = new THREE.Color();

/** חלק של הדגם: בלי אינדקס ובלי UV (כדי שאפשר יהיה למזג), צבע לכל קודקוד לפי fn(x, y, z, out) */
function part(geo, fn) {
  if (geo.index) geo = geo.toNonIndexed();
  geo.deleteAttribute('uv');
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), _c); col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const flat = (color) => (x, y, z, out) => out.copy(color);
/** צביעת הגוף: בטן בהירה, צד, גב כהה — עם קו מעבר גלי, וסומק בלחיים */
function skinColor(x, y, z, out) {
  const w = Math.sin(z * 4.2) * 0.035 - (z > 1.25 ? 0.07 : 0);
  out.copy(COL.belly).lerp(COL.side, sstep(-0.25 + w, -0.05 + w, y)).lerp(COL.back, sstep(0.0, 0.36, y));
  const d = Math.hypot(Math.abs(x) - 0.36, y + 0.1, z - 0.8);
  if (d < 0.2) out.lerp(COL.blush, (1 - d / 0.2) * 0.55);
}
const finColor = (x, y, z, out) => out.copy(COL.fin).lerp(COL.finTip, sstep(0.45, 1.0, y) * 0.8);

function latheZ(pts, seg) {
  // פרופיל (z, רדיוס) → גוף סיבוב שהציר שלו לאורך z (האף ב-+z)
  return new THREE.LatheGeometry(pts.map(([z, r]) => new THREE.Vector2(r, z)), seg).rotateX(Math.PI / 2);
}
function extrudeFlat(shape, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  return g.translate(0, 0, -depth / 2);
}

/** הדגם: 15 חלקים. מחזיר { skin, shine } — שתי גאומטריות ממוזגות (לפי חומר) */
function buildDolphinGeometry() {
  const skin = [], shine = [];

  // 1. גוף: פרופיל סיבובי שעבר פיסול — מצח עגול, גבנון גב, בטן שטוחה יותר, גזע זנב צר וגבוה
  const body = latheZ([[-1.8, 0.001], [-1.77, 0.06], [-1.6, 0.09], [-1.35, 0.13], [-1.05, 0.2], [-0.7, 0.3], [-0.3, 0.41], [0.1, 0.48], [0.45, 0.5], [0.75, 0.48], [1.0, 0.43], [1.2, 0.36], [1.36, 0.26], [1.46, 0.14], [1.5, 0.001]], 18);
  const bp = body.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    let x = bp.getX(i), y = bp.getY(i);
    const z = bp.getZ(i), tail = sstep(-0.5, -1.7, z);
    x *= 0.92 * (1 - 0.5 * tail);
    y *= 1 + 0.45 * tail;
    if (y < 0) y *= 0.88;
    else y += 0.09 * Math.exp(-(((z - 1.02) / 0.3) ** 2)) * (y / 0.4);
    y += 0.05 * Math.exp(-(((z - 0.1) / 0.9) ** 2));
    bp.setXY(i, x, y);
  }
  body.computeVertexNormals();
  skin.push(part(body, skinColor));

  // 2. חרטום
  const beak = latheZ([[1.28, 0.175], [1.5, 0.155], [1.72, 0.125], [1.88, 0.095], [1.96, 0.055], [1.985, 0.001]], 12).scale(1, 0.84, 1).translate(0, -0.1, 0);
  skin.push(part(beak, skinColor));

  // 3. סנפיר גב: משוך לאחור, עם שיפוע בקצוות
  const ds = new THREE.Shape();
  ds.moveTo(0.42, 0); ds.quadraticCurveTo(0.12, 0.5, -0.4, 0.72); ds.quadraticCurveTo(-0.16, 0.3, -0.36, 0); ds.lineTo(0.42, 0);
  skin.push(part(extrudeFlat(ds, 0.05, 0.03).rotateY(-Math.PI / 2).translate(0, 0.44, 0.02), finColor));

  // 4–5. סנפירי חזה
  for (const s of [-1, 1]) {
    const fs = new THREE.Shape();
    fs.moveTo(0, -0.16); fs.quadraticCurveTo(s * 0.5, -0.08, s * 0.78, 0.5); fs.quadraticCurveTo(s * 0.34, 0.3, 0, 0.2); fs.lineTo(0, -0.16);
    const g = extrudeFlat(fs, 0.04, 0.025).rotateX(-Math.PI / 2).rotateZ(-s * 0.62).translate(s * 0.3, -0.2, 0.62);
    skin.push(part(g, flat(COL.fin)));
  }

  // 6. סנפיר הזנב: חצי סהר אופקי עם מפרץ באמצע
  const ts = new THREE.Shape();
  ts.moveTo(0, -0.3); ts.quadraticCurveTo(0.42, -0.2, 0.86, 0.34); ts.quadraticCurveTo(0.4, 0.16, 0, 0.12);
  ts.quadraticCurveTo(-0.4, 0.16, -0.86, 0.34); ts.quadraticCurveTo(-0.42, -0.2, 0, -0.3);
  skin.push(part(extrudeFlat(ts, 0.035, 0.025).rotateX(-Math.PI / 2).translate(0, 0, -1.7), flat(COL.fin)));

  // 7–12. עיניים: לובן, אישון, ברק   13–14. קו חיוך
  for (const s of [-1, 1]) {
    skin.push(part(new THREE.SphereGeometry(0.1, 12, 10).scale(0.45, 1, 1).translate(s * 0.372, 0.1, 0.98), flat(COL.sclera)));
    skin.push(part(new THREE.SphereGeometry(0.074, 12, 10).scale(0.45, 1, 1).translate(s * 0.392, 0.095, 0.995), flat(COL.pupil)));
    shine.push(part(new THREE.SphereGeometry(0.027, 8, 6).translate(s * 0.418, 0.132, 1.022), flat(COL.sclera)));
    const curve = new THREE.CatmullRomCurve3([[0.05, -0.13, 1.94], [0.135, -0.13, 1.62], [0.215, -0.115, 1.36], [0.315, -0.075, 1.17], [0.36, -0.01, 1.06]].map(([x, y, z]) => new THREE.Vector3(s * x, y, z)));
    skin.push(part(new THREE.TubeGeometry(curve, 14, 0.014, 5), flat(COL.line)));
  }
  // 15. נחיר נשימה
  skin.push(part(new THREE.SphereGeometry(0.05, 8, 6).scale(1, 0.3, 1.3).translate(0, 0.585, 0.72), flat(COL.line)));

  const out = { skin: mergeGeometries(skin, false), shine: mergeGeometries(shine, false), parts: skin.length + shine.length };
  [...skin, ...shine].forEach((g) => g.dispose());
  return out;
}

/** גלי גוף וזנב בשיידר (בלי עצמות): גל שנע מהראש לזנב ומתחזק לכיוון הזנב + קשת של כל הגוף בקפיצה */
function addBend(mat, U) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDolPh = U.ph; sh.uniforms.uDolAmp = U.amp; sh.uniforms.uDolCurve = U.curve;
    sh.vertexShader = `uniform float uDolPh, uDolAmp, uDolCurve;\n${sh.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
      float dolT = clamp((1.0 - position.z) / 2.9, 0.0, 1.0);
      transformed.y += uDolAmp * sin(uDolPh + position.z * 1.5) * (0.1 + dolT * dolT) + uDolCurve * position.z * position.z;`);
  };
  mat.customProgramCacheKey = () => 'dolphinBend1';
  return mat;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}
/** אדווה: טבעת קצף רכה ולא אחידה, ועוד טבעת חלשה בפנים */
function rippleTexture() {
  return canvasTex(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    g.addColorStop(0.58, 'rgba(255,255,255,0)'); g.addColorStop(0.74, 'rgba(255,255,255,0.05)'); g.addColorStop(0.86, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3; x.beginPath(); x.arc(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54, 5 + (i % 3) * 3, 0, TAU); x.fillStyle = 'rgba(0,0,0,0.55)'; x.fill(); }
  });
}
/** הצללית של הדולפין על פני המים (מתחת למים) / הצל שלו (באוויר) */
function shadeTexture() {
  return canvasTex(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  });
}

/** בועה עגולה עם מסגרת זהב וחוד קטן למטה (מצביעה על הדולפין) + אייקון; badge — אייקון קטן בפינה */
function drawRoundTag(x, ic, { badge = null, dim = false } = {}) {
  x.clearRect(0, 0, 256, 256);
  const cx = 128, cy = 112, r = 92;
  const shape = () => { x.beginPath(); x.arc(cx, cy, r, Math.PI * 0.62, Math.PI * 0.38, false); x.lineTo(cx, 238); x.closePath(); };
  x.save();
  x.shadowColor = dim ? 'rgba(10,6,24,0.5)' : 'rgba(255,205,90,0.75)'; x.shadowBlur = 14;
  const bg = x.createLinearGradient(0, cy - r, 0, 238);
  bg.addColorStop(0, dim ? 'rgba(40,30,66,0.9)' : 'rgba(58,36,104,0.96)'); bg.addColorStop(1, 'rgba(16,10,32,0.94)');
  shape(); x.fillStyle = bg; x.fill();
  x.restore();
  const gold = x.createLinearGradient(0, cy - r, 0, 238);
  gold.addColorStop(0, '#fff6c2'); gold.addColorStop(0.45, '#f5cd55'); gold.addColorStop(1, '#b5832a');
  shape(); x.lineWidth = 8; x.lineJoin = 'round'; x.strokeStyle = dim ? 'rgba(242,201,76,0.8)' : gold; x.stroke();
  x.beginPath(); x.arc(cx, cy, r - 12, Math.PI * 1.15, Math.PI * 1.75); x.lineWidth = 5; x.lineCap = 'round'; x.strokeStyle = 'rgba(255,255,255,0.28)'; x.stroke();
  drawIcon(x, ic, cx, cy, dim ? 104 : 128);
  if (badge) {
    x.beginPath(); x.arc(196, 170, 36, 0, TAU); x.fillStyle = 'rgba(22,14,44,0.97)'; x.fill();
    x.lineWidth = 5; x.strokeStyle = gold; x.stroke();
    drawIcon(x, badge, 196, 171, 48);
  }
}
/** בועת המתנה: שעון חול + m:ss, באותה מסגרת זהב של תוויות הבניינים */
function drawWaitTag(x, text) {
  x.clearRect(0, 0, 320, 112);
  const r = 46;
  x.fillStyle = 'rgba(16,10,32,0.88)'; x.beginPath(); x.moveTo(8 + r, 8); x.arcTo(312, 8, 312, 104, r); x.arcTo(312, 104, 8, 104, r); x.arcTo(8, 104, 8, 8, r); x.arcTo(8, 8, 312, 8, r); x.fill();
  x.lineWidth = 5; x.strokeStyle = 'rgba(242,201,76,0.95)'; x.stroke();
  drawIcon(x, 'hourglass', 66, 56, 62);
  x.fillStyle = '#fff3c8'; x.font = `800 ${text.length > 5 ? 44 : 56}px Rubik, Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 200, 59);
}
const fmtTime = (secs) => {
  const s = Math.max(0, Math.ceil(secs)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};
// ==== /ART ====

const RIPPLES = 10;
const ARC = 0.52;          // חצי קשת השחייה ברדיאנים (≈ 60°–120°) — כך הדולפין והתג נשארים במסך גם בטלפון לאורך
const CRUISE = 0.27;       // מהירות הפאזה לאורך המסלול
// גודל התג במבט הרחב, בפיקסלים של המסך: [רוחב, גובה]
const TAG_PX = { ready: [58, 58], wait: [74, 26], done: [34, 34] };

export class HubDolphin {
  constructor(hub) {
    this.hub = hub;
    this.active = false;
    this.offer = { state: 'off', secs: 0 };

    // ----- הדגם -----
    const geo = buildDolphinGeometry();
    this.U = { ph: { value: 0 }, amp: { value: 0.16 }, curve: { value: 0 } };
    this.skinMat = addBend(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0, envMapIntensity: 0.45 }), this.U);
    this.shineMat = addBend(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, emissive: 0xffffff, emissiveIntensity: 0.85 }), this.U);
    this.g = new THREE.Group();          // מיקום + כיוון השחייה
    this.pitchNode = new THREE.Group();  // אף למעלה / למטה
    this.rollNode = new THREE.Group();   // גלגול (סיבוב החגיגה, הטיה בפנייה) + מתיחה
    const skin = new THREE.Mesh(geo.skin, this.skinMat), shine = new THREE.Mesh(geo.shine, this.shineMat);
    skin.frustumCulled = shine.frustumCulled = false; // הגוף מתעקם בשיידר — תיבת הגבול לא מדויקת
    this.rollNode.add(skin, shine);
    this.pitchNode.add(this.rollNode);
    this.g.add(this.pitchNode);
    this.g.userData.parts = geo.parts;
    this.g.userData.bid = BID;
    addCharacterRim(this.g, { color: 0xbfe6ff, power: 3, strength: 0.16 });

    // ----- מים: צללית, אדוות -----
    this.shade = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadeTexture(), color: 0x08263f, transparent: true, opacity: 0.4, depthWrite: false, fog: false }));
    this.shade.renderOrder = -1;
    this.ripMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: rippleTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), RIPPLES);
    this.ripMesh.frustumCulled = false;
    this.ripMesh.renderOrder = 1;
    this.rip = { t: new Float32Array(RIPPLES), life: new Float32Array(RIPPLES).fill(1), x: new Float32Array(RIPPLES), z: new Float32Array(RIPPLES), r0: new Float32Array(RIPPLES), r1: new Float32Array(RIPPLES), a: new Float32Array(RIPPLES), on: new Uint8Array(RIPPLES), next: 0 };
    this._m = new THREE.Matrix4();
    this._col = new THREE.Color();
    for (let i = 0; i < RIPPLES; i++) { this.ripMesh.setMatrixAt(i, this._m.makeScale(0, 0, 0)); this.ripMesh.setColorAt(i, this._col.setScalar(0)); }

    // ----- נגיעה -----
    this.hit = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.userData.bid = BID;

    // ----- התג -----
    this.tagTex = {
      ready: canvasTex(256, 256, (x) => drawRoundTag(x, 'video', { badge: 'gem' })),
      done: canvasTex(256, 256, (x) => drawRoundTag(x, 'moon', { dim: true })),
      wait: canvasTex(320, 112, (x) => drawWaitTag(x, '0:00')),
    };
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tagTex.ready, transparent: true, depthWrite: false, fog: false }));
    this.tag.renderOrder = 11;
    this.tag.visible = false;
    this.tag.userData.bid = BID;
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd36a, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.halo.renderOrder = 10;
    this.halo.visible = false;
    this.waitText = '';
    this.waitShown = -1;
    this.offerAt = 0;
    this.pop = 1;

    this.nodes = [this.g, this.shade, this.ripMesh, this.hit, this.tag, this.halo];
    this.nodes.forEach((n) => hub.group.add(n));
    this.targets = [this.hit, this.tag];
    this.noTargets = [];

    // ----- מצב התנועה -----
    this.phi = Math.random() * TAU;
    this.s = 1.7;
    this.shoreR = 0; this.shoreT = 0; this.shoreIn = 0;
    this.x = 0; this.y = SEA_Y - 1; this.z = 0;
    this.px = 0; this.pz = 0; this.py = this.y;
    this.yaw = 0; this.pitch = 0; this.vy = 0; this.bank = 0;
    this.boost = 1;
    this.first = true;
    this.jump = { on: false, t: 0, T: 1, H: 1, spin: 0, from: 0, gem: false, loud: false, apex: false };
    this.above = false;
    this.nextJump = 3 + Math.random() * 3;
    this.wakeT = 0;
    this.tagY = SEA_Y + 2;
    this.tt = 0;

    // אפשרויות חלקיקים שמוקצות פעם אחת (update לא יוצר אובייקטים)
    this._pos = [0, 0, 0];
    this._drops = { count: 16, pos: this._pos, spread: [0.5, 0.05, 0.5], radial: [1, 3], vel: [0, 4, 0], velSpread: [0.8, 1.4, 0.8], color: FOAM_COLORS, size: [0.12, 0.3], life: [0.5, 1.0], gravity: 10, drag: 0.5, alpha: 0.9 };
    this._mist = { count: 5, pos: this._pos, spread: [0.5, 0.1, 0.5], radial: [0.4, 1.2], vel: [0, 1.2, 0], velSpread: [0.4, 0.4, 0.4], color: 0xeafaff, size: [0.6, 1.1], life: [0.5, 0.9], drag: 2, grow: 1.6, alpha: 0.4 };
    this._gems = { count: 40, pos: this._pos, spread: [0.6, 0.6, 0.6], radial: [1.5, 5], vel: [0, 2, 0], velSpread: [1, 1.5, 1], color: GEM_COLORS, size: [0.12, 0.3], life: [0.8, 1.6], gravity: 2.4, drag: 1.1 };
    this._trail = { count: 2, pos: this._pos, spread: [0.3, 0.3, 0.3], vel: [0, 0.4, 0], velSpread: [0.5, 0.5, 0.5], color: GEM_COLORS, size: [0.1, 0.22], life: [0.5, 1.0], gravity: 1.5, drag: 1 };
    this._v = new THREE.Vector3();

    this.setActive(false);
  }

  // ---------- ממשק ----------
  setActive(on) {
    this.active = !!on;
    this.first = true;
    this.g.visible = this.shade.visible = this.ripMesh.visible = this.active;
    this.syncTag();
  }

  setOffer(o) {
    const prev = this.offer.state;
    this.offer = { state: 'off', secs: 0, ...o };
    if (!TAG_PX[this.offer.state]) this.offer.state = 'off';
    this.offerAt = this.tt;
    if (this.offer.state !== prev) { this.pop = 0; this.waitShown = -1; }
    this.syncTag();
    if (this.offer.state === 'wait') this.drawWait(this.offer.secs);
  }

  pickTargets() { return this.active ? this.targets : this.noTargets; }

  /** קיבלת יהלומים: קפיצה גבוהה עם סיבוב, נצנוצי יהלום, ציוץ והתזה */
  celebrate() {
    this.startJump(3.5, 1.9, 1, true, true);
    this.hub.app.sound?.dolphinChirp?.();
    this.sparkle(46);
  }

  /** נגיעה בלי פרסומת: קפיצה קטנה וציוץ */
  wave() {
    this.startJump(1.5, 1.1, 0, false, true);
    this.hub.app.sound?.dolphinChirp?.();
  }

  relabel() {
    drawRoundTag(this.tagTex.ready.image.getContext('2d'), 'video', { badge: 'gem' }); this.tagTex.ready.needsUpdate = true;
    drawRoundTag(this.tagTex.done.image.getContext('2d'), 'moon', { dim: true }); this.tagTex.done.needsUpdate = true;
    this.waitShown = -1;
    if (this.offer.state === 'wait') this.drawWait(this.offer.secs - (this.tt - this.offerAt));
  }

  worldPos(out = new THREE.Vector3()) {
    out.set(this.x, Math.max(this.y, SEA_Y + 0.4), this.z);
    this.hub.group.updateWorldMatrix(true, false);
    return out.applyMatrix4(this.hub.group.matrixWorld);
  }

  // ---------- התג ----------
  syncTag() {
    const st = this.offer.state, show = this.active && st !== 'off';
    this.tag.visible = show;
    this.halo.visible = show && st === 'ready';
    if (st !== 'off' && this.tag.material.map !== this.tagTex[st]) { this.tag.material.map = this.tagTex[st]; this.tag.material.needsUpdate = true; }
  }

  drawWait(secs) {
    const whole = Math.max(0, Math.ceil(secs));
    if (whole === this.waitShown) return;
    this.waitShown = whole;
    const text = fmtTime(whole);
    if (text === this.waitText && this.waitDrawn) return;
    this.waitText = text; this.waitDrawn = true;
    drawWaitTag(this.tagTex.wait.image.getContext('2d'), text);
    this.tagTex.wait.needsUpdate = true;
  }

  // ---------- קפיצות, התזות ----------
  startJump(h, T, spin, gem, loud) {
    const j = this.jump;
    j.from = j.on ? this.jumpY(j) : 0;
    j.on = true; j.t = 0; j.T = T; j.H = h * this.s; j.spin = spin; j.gem = gem; j.loud = loud; j.apex = false;
    this.nextJump = 6 + Math.random() * 4;
  }

  /** גובה הקפיצה מעל עומק השיוט: צלילת הכנה → קשת → כניסה למים וחזרה לשיוט */
  jumpY(j) {
    const k = j.t / j.T, dip = -0.5 * this.s;
    if (k < 0.14) return j.from + (dip - j.from) * easeInOut(k / 0.14);
    if (k < 0.86) { const u = (k - 0.14) / 0.72; return dip + (j.H - dip) * 4 * u * (1 - u); }
    return dip * (1 - easeInOut((k - 0.86) / 0.14));
  }

  ripple(x, z, r0, r1, life, alpha) {
    const R = this.rip, i = R.next;
    R.next = (i + 1) % RIPPLES;
    R.on[i] = 1; R.t[i] = 0; R.life[i] = life; R.x[i] = x; R.z[i] = z; R.r0[i] = r0; R.r1[i] = r1; R.a[i] = alpha;
  }

  /** מיקום בעולם (לחלקיקים) לתוך this._pos */
  toWorld(x, y, z) {
    const v = this._v.set(x, y, z).applyMatrix4(this.hub.group.matrixWorld);
    this._pos[0] = v.x; this._pos[1] = v.y; this._pos[2] = v.z;
  }

  splash(size, loud) {
    const s = this.s, fx = this.hub.app.fx, low = this.hub.sm.quality?.level === 'low';
    this.ripple(this.x, this.z, 0.5 * s, (2.2 + size * 1.6) * s, 1.3 + size * 0.4, 0.9);
    this.ripple(this.x, this.z, 0.2 * s, (1.2 + size) * s, 0.9 + size * 0.3, 0.6);
    if (fx) {
      this.toWorld(this.x, SEA_Y + 0.1, this.z);
      const d = this._drops, m = this._mist;
      d.count = (low ? 8 : 16) * size; d.spread[0] = d.spread[2] = 0.45 * s;
      d.radial[0] = 0.9 * s; d.radial[1] = (2 + size) * s; d.vel[1] = (2.6 + size * 1.6) * s; d.velSpread[1] = 1.5 * s;
      d.size[0] = 0.1 * s; d.size[1] = 0.26 * s; d.gravity = 9 * s;
      fx.norm.emit(d);
      m.count = low ? 2 : 5; m.spread[0] = m.spread[2] = 0.5 * s; m.size[0] = 0.5 * s; m.size[1] = 1.0 * s; m.vel[1] = 1.1 * s;
      fx.norm.emit(m);
    }
    // קפיצות הסרק נשמעות רק במבט הרחב (שם רואים את הדולפין), ובשקט
    if (loud) this.hub.app.sound?.splash?.(size);
    else if (this.hub.sm.overviewOn) this.hub.app.sound?.splash?.(size * 0.4);
  }

  sparkle(n) {
    const fx = this.hub.app.fx;
    if (!fx) return;
    const s = this.s, g = this._gems;
    this.toWorld(this.x, Math.max(this.y, SEA_Y) + 0.5 * s, this.z);
    g.count = n; g.spread[0] = g.spread[1] = g.spread[2] = 0.6 * s; g.radial[0] = 1.4 * s; g.radial[1] = 4.2 * s; g.vel[1] = 2 * s; g.size[0] = 0.16 * s; g.size[1] = 0.4 * s;
    fx.add.emit(g);
  }

  // ---------- כל פריים ----------
  update(dt, tt) {
    if (!this.active) return;
    dt = Math.min(dt, 0.1);
    this.tt = tt;
    const hub = this.hub, j = this.jump;
    // גודל: נקרא היטב במבט הרחב וגדל עם האי
    const ext = hub.extent || 17;
    const s = this.s = 1.7 * Math.pow(ext / 17, 0.8);

    // --- המסלול: לולאה מוארכת לאורך החוף הקדמי; בקצוות הוא צולל ומסתובב מתחת למים ---
    this.boost += ((j.on ? 1.55 : 1) - this.boost) * Math.min(1, dt * 4);
    this.phi = (this.phi + dt * CRUISE * this.boost) % TAU;
    const sn = Math.sin(this.phi), cs = Math.cos(this.phi);
    const a = Math.PI / 2 + ARC * sn;
    this.shoreT -= dt;
    if (this.shoreT <= 0 || this.first) {
      // רדיוס החוף קופץ בקצה של אריח — לוקחים את הרחוק ביותר בסביבה ומחליקים
      this.shoreT = 0.2;
      let r = 0;
      for (let k = -2; k <= 2; k++) r = Math.max(r, hub.shoreRadius(a + k * 0.09));
      this.shoreIn = r;
      if (this.first) this.shoreR = r;
    }
    this.shoreR += (this.shoreIn - this.shoreR) * Math.min(1, dt * 2.5);
    const rad = this.shoreR + 4.25 + 0.75 * cs + (s - 1.7) * 0.5;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad;

    // --- גובה: שיוט עם גב שעולה ויורד, צלילה בקצוות, קפיצה ---
    let jy = 0;
    if (j.on) {
      j.t += dt;
      if (j.t >= j.T) j.on = false; else jy = this.jumpY(j);
    } else {
      this.nextJump -= dt;
      if (this.nextJump <= 0 && Math.abs(Math.sin(this.phi + 0.25)) < 0.82) this.startJump(2.2, 1.45, 0, false, false);
    }
    const ends = j.on ? 0 : sstep(0.88, 0.995, Math.abs(sn));
    const y = SEA_Y + (-0.3 + 0.17 * Math.sin(tt * 1.5) - 1.15 * ends) * s + jy;

    if (this.first) { this.first = false; this.px = x; this.pz = z; this.py = y; this.yaw = a + (cs > 0 ? -Math.PI : 0); this.above = false; this.tagY = SEA_Y + 2 * s; }
    const vx = (x - this.px) / dt, vz = (z - this.pz) / dt, vyNow = (y - this.py) / dt;
    this.px = x; this.pz = z; this.py = y;
    this.x = x; this.y = y; this.z = z;
    const sp = Math.hypot(vx, vz);
    let yawRate = 0;
    if (sp > 0.05) {
      const d = angDiff(Math.atan2(vx, vz), this.yaw), step = d * Math.min(1, dt * (j.on ? 2.5 : 6));
      this.yaw += step; yawRate = step / dt;
    }
    this.vy += (vyNow - this.vy) * Math.min(1, dt * 14);
    const pitchT = clamp(Math.atan2(this.vy, Math.max(sp, 1.6 * s)), -1.2, 1.2);
    const pitchStep = (pitchT - this.pitch) * Math.min(1, dt * 10);
    this.pitch += pitchStep;
    this.bank += (clamp(-yawRate * 0.35, -0.5, 0.5) - this.bank) * Math.min(1, dt * 4);

    // --- הדגם ---
    this.g.position.set(x, y, z);
    this.g.rotation.y = this.yaw;
    this.g.scale.setScalar(s);
    this.pitchNode.rotation.x = -this.pitch;
    let roll = this.bank;
    if (j.on && j.spin) roll += j.spin * TAU * easeInOut(sstep(0.16, 0.8, j.t / j.T));
    this.rollNode.rotation.z = roll;
    const st = 1 + 0.07 * clamp(Math.abs(this.vy) / (9 * s), 0, 1); // מתיחה במהירות אנכית גבוהה
    this.rollNode.scale.set(1 / Math.sqrt(st), 1 / Math.sqrt(st), st);
    this.U.ph.value = (this.U.ph.value + dt * (5 + 5 * this.boost)) % TAU;
    this.U.amp.value = 0.13 + 0.09 * (this.boost - 1) / 0.55 + 0.03 * Math.sin(tt * 0.7);
    this.U.curve.value += (clamp((pitchStep / dt) * 0.045, -0.085, 0.085) - this.U.curve.value) * Math.min(1, dt * 8);

    // --- יציאה מהמים / כניסה למים ---
    const above = y > SEA_Y + 0.12 * s;
    if (above !== this.above) {
      this.above = above;
      if (j.on || !above) {
        if (j.on || this.vy < -2 * s) this.splash(above ? (j.gem ? 1.3 : 0.8) : (j.gem ? 1.7 : 1.1) * (j.H > 2 * s ? 1 : 0.6), j.loud);
      }
      if (above && j.gem) this.sparkle(30);
    }
    if (j.on && j.gem) {
      if (!j.apex && j.t / j.T > 0.5) { j.apex = true; this.sparkle(70); }
      const fx = hub.app.fx;
      if (fx && y > SEA_Y + 0.5 * s) { this.toWorld(x, y, z); this._trail.size[0] = 0.1 * s; this._trail.size[1] = 0.22 * s; fx.add.emit(this._trail); }
    }
    // שובל קטן מאחורי סנפיר הגב כשהוא חותך את המים
    this.wakeT -= dt;
    if (this.wakeT <= 0 && !j.on && ends < 0.3) {
      this.wakeT = 0.5;
      this.ripple(x - Math.sin(this.yaw) * 0.4 * s, z - Math.cos(this.yaw) * 0.4 * s, 0.25 * s, 1.15 * s, 1.5, 0.3);
    }

    // --- אדוות ---
    const R = this.rip, m = this._m;
    let any = false;
    for (let i = 0; i < RIPPLES; i++) {
      if (!R.on[i]) continue;
      any = true;
      R.t[i] += dt;
      const k = R.t[i] / R.life[i];
      if (k >= 1) { R.on[i] = 0; this.ripMesh.setMatrixAt(i, m.makeScale(0, 0, 0)); continue; }
      const r = R.r0[i] + (R.r1[i] - R.r0[i]) * easeOut(k);
      m.makeScale(r, 1, r).setPosition(R.x[i], SEA_Y + 0.03 + i * 0.002, R.z[i]);
      this.ripMesh.setMatrixAt(i, m);
      this.ripMesh.setColorAt(i, this._col.setScalar(R.a[i] * (1 - k) * (1 - k)));
    }
    if (any || this.ripDirty) { this.ripMesh.instanceMatrix.needsUpdate = true; this.ripMesh.instanceColor.needsUpdate = true; }
    this.ripDirty = any;

    // --- צללית על פני המים ---
    const air = clamp((y - SEA_Y) / (3 * s), 0, 1), deep = clamp((SEA_Y - y) / (1.6 * s) - 0.4, 0, 1);
    this.shade.position.set(x, SEA_Y + 0.02, z);
    this.shade.rotation.y = this.yaw;
    this.shade.scale.set(1.5 * s * (1 - air * 0.35), 1, 4.2 * s * (1 - air * 0.35) * Math.max(0.35, Math.cos(this.pitch)));
    this.shade.material.opacity = 0.42 * (1 - air * 0.45) * (1 - deep * 0.75);

    // --- נגיעה ותג: עוקבים אחרי הדולפין; כשהוא מתחת למים — מעל פני המים במקום שבו הוא ---
    const cam = hub.sm.camera, surf = Math.max(y, SEA_Y);
    const v = this._v.set(x, surf, z).applyMatrix4(hub.group.matrixWorld);
    const perPx = (2 * cam.position.distanceTo(v) * Math.tan((cam.fov * Math.PI) / 360)) / (hub.sm.height || window.innerHeight || 800);
    const k17 = ext / 17;
    this.hit.position.set(x, surf + 0.5 * s, z);
    this.hit.scale.setScalar(clamp(34 * perPx, 2.1 * s, 3.4 * k17));
    const state = this.offer.state, px = TAG_PX[state];
    if (px && this.tag.visible) {
      if (state === 'wait') this.drawWait(this.offer.secs - (tt - this.offerAt));
      this.pop = Math.min(1, this.pop + dt / 0.4);
      const ready = state === 'ready';
      const breathe = ready ? 1 + 0.06 * Math.sin(tt * 3.2) : 1;
      const h = clamp(px[1] * perPx, 0.45 * px[1] * 0.062 * k17, 1.2 * px[1] * 0.062 * k17) * backOut(this.pop) * breathe;
      const w = h * (px[0] / px[1]);
      this.tagY += (surf + 1.85 * s + h * 0.62 - this.tagY) * Math.min(1, dt * 9);
      const ty = this.tagY + Math.sin(tt * 2) * 0.1 * s;
      this.tag.position.set(x, ty, z);
      this.tag.scale.set(w, h, 1);
      if (ready) {
        this.halo.position.set(x, ty + h * 0.05, z);
        this.halo.scale.setScalar(h * (2.0 + 0.25 * Math.sin(tt * 3.2)));
        this.halo.material.opacity = 0.34 + 0.16 * Math.sin(tt * 3.2);
      }
    }
  }
}
