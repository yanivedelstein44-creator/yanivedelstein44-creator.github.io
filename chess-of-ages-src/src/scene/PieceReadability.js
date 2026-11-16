/**
 * קריאוּת הכלים: כל כלי בולט על כל לוח, בלי לשנות את החומרים עצמם.
 *  1. קו מתאר דק וכהה-קריר ("קליפה הפוכה": רשת אחת ממוזגת לכל כלי, גאומטריה במטמון לפי סוג) —
 *     מתעבה לבד לפי בהירות המשבצות של הלוח הנוכחי.
 *  2. צל מגע רך מתחת לכל כלי — InstancedMesh אחד לכל הכלים.
 *  3. כלים לבנים: גוון שמנת חם ופרטים כהים יותר כשהם נבלעים במשבצות הבהירות.
 *     כלים כהים: אור שוליים עדין כשהם נבלעים במשבצות הכהות.
 * מצבים: 'off' (המראה המקורי), 'normal' (A), 'plus' (A+ — ברירת המחדל לכולם: קצת יותר חזק מ-A), 'high' (B, נגישות).
 * חומרי הערכה המקוריים לא משתנים: הכלים מקבלים עותקים, כך שתצוגות החנות והממלכה נשארות כמו שהן.
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { addRim } from './kit.js';

const MODES = {
  off: null,
  // px: עובי הקו (לוח כהה → לוח בהיר) | back: דחיקת הקליפה לאחור — משאירה רק את הצללית החיצונית, בלי קווים פנימיים "מצוירים"
  // ink: בהירות הדיו | edge: הכהיית שוליים לכלים לבנים | rim: אור שוליים לכלים כהים (בסיס, תוספת כשנבלעים) | boost: כלים שכבר זוהרים
  normal: { px: [0.9, 1.5], world: 0.026, back: 0.16, ink: 1.5, shadow: 0.6, select: 1.3, cream: 0.8, dim: 0.89, accent: 0.3, edge: [0.1, 0.34], rim: [0.14, 0.5], power: 2.5, glowCut: 0.6, boost: [1.0, 0.35] },
  // A+ (ברירת המחדל): בערך שליש מהדרך מ-A ל-B — קו מעט עבה יותר, צל ושוליים מעט חזקים יותר
  plus: { px: [1.3, 2.0], world: 0.035, back: 0.12, ink: 1.2, shadow: 0.68, select: 1.2, cream: 0.88, dim: 0.865, accent: 0.38, edge: [0.14, 0.36], rim: [0.27, 0.59], power: 2.28, glowCut: 0.73, boost: [1.16, 0.37] },
  high: { px: [2.0, 2.8], world: 0.05, back: 0.05, ink: 0.7, shadow: 0.82, select: 1.0, cream: 1.0, dim: 0.82, accent: 0.5, edge: [0.2, 0.4], rim: [0.5, 0.75], power: 1.9, glowCut: 0.95, boost: [1.45, 0.4] },
};
const CREAM = new THREE.Color(0xf2dfc0);
const INK = new THREE.Color(0x141a2b);
const HSL = { h: 0, s: 0, l: 0 };
const RIM_PALE = new THREE.Color(0xd6e2f5);
const MAX_SHADOWS = 48;
const BASE_R = { p: 0.36, r: 0.4, n: 0.4, b: 0.38, q: 0.42, k: 0.43 };
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------- בהירות נתפסת של חומר (צבע × ממוצע הטקסטורה + זוהר) ----------
const texAvg = new WeakMap();
const tmpC = new THREE.Color();
function mapAverage(tex) {
  if (!tex || !tex.image) return null;
  if (texAvg.has(tex)) return texAvg.get(tex);
  let out = null;
  try {
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(tex.image, 0, 0, 8, 8);
    const d = ctx.getImageData(0, 0, 8, 8).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    out = new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
  } catch { out = null; }
  texAvg.set(tex, out);
  return out;
}
/** צבע ממוצע (ליניארי) של חומר, כולל הטקסטורה והזוהר */
function materialColor(mat, target) {
  target.copy(mat.color || INK);
  const a = mapAverage(mat.map);
  if (a) target.multiply(a);
  if (mat.emissive && mat.emissiveIntensity) {
    const k = mat.emissiveIntensity * (mat.emissiveMap ? 0.22 : 0.6);
    target.r += mat.emissive.r * k; target.g += mat.emissive.g * k; target.b += mat.emissive.b * k;
  }
  return target;
}
function luma(mat) {
  const c = materialColor(mat, tmpC);
  return Math.pow(clamp01(0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b), 1 / 2.2);
}

// ---------- גאומטריית קו המתאר: כל חלקי הכלי ברשת אחת עם נורמלים מוחלקים ----------
const outlineGeos = new Map();
function outlineGeometry(piece) {
  const { type, color } = piece.userData;
  const key = type === 'n' ? type + color : type; // ראש הפרש פונה לכיוון אחר בכל צד
  if (outlineGeos.has(key)) return outlineGeos.get(key);
  piece.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(piece.matrixWorld).invert(), m = new THREE.Matrix4();
  const parts = [];
  piece.traverse((o) => {
    if (!o.isMesh || o.userData.role === 'outline') return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    g.applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld));
    parts.push(g);
  });
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  // נורמל ממוצע לכל מיקום: בלי זה הקליפה נפתחת בפינות חדות (שיני הצריח, הצלב)
  const p = merged.attributes.position, n = merged.attributes.normal, acc = new Map();
  const k = (i) => `${Math.round(p.getX(i) * 2000)}|${Math.round(p.getY(i) * 2000)}|${Math.round(p.getZ(i) * 2000)}`;
  for (let i = 0; i < p.count; i++) {
    const id = k(i);
    let a = acc.get(id);
    if (!a) acc.set(id, a = [0, 0, 0]);
    a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i);
  }
  for (let i = 0; i < p.count; i++) {
    const a = acc.get(k(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
    n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
  }
  const geo = mergeVertices(merged, 1e-4);
  merged.dispose();
  geo.computeBoundingSphere();
  outlineGeos.set(key, geo);
  return geo;
}

// ---------- שוליים בשיידר: אור שוליים (כלים כהים) והכהיית שוליים (כלים לבנים) ----------
// קוד זהה לכל החומרים → תוכנית GPU משותפת; הערכים ביוניפורמים בלבד
function edgeChunk(shader, u) {
  Object.assign(shader.uniforms, u);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uPrRimColor;\nuniform float uPrRimPower;\nuniform float uPrRimStrength;\nuniform vec3 uPrEdgeColor;\nuniform float uPrEdgeStrength;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float prRimF = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), uPrRimPower);
      totalEmissiveRadiance += uPrRimColor * prRimF * uPrRimStrength;`)
    .replace('#include <opaque_fragment>', `outgoingLight = mix(outgoingLight, uPrEdgeColor, prRimF * uPrEdgeStrength);
      #include <opaque_fragment>`);
}
function edgeHook(shader) { edgeChunk(shader, this.userData.prRim); }
const edgeKey = () => 'piece-readability-edge';

/** עותק של חומר גוף/פרט, כולל זוהר השוליים של addRim אם היה (clone לא מעתיק onBeforeCompile) */
function cloneMaterial(src, edge = false) {
  const rim = src.userData.rim;
  const m = src.clone();
  m.userData = {};
  if (rim) addRim(m, rim.uRimColor.value, rim.uRimPower.value, rim.uRimStrength.value);
  if (edge && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) {
    const u = m.userData.prRim = {
      uPrRimColor: { value: new THREE.Color() }, uPrRimPower: { value: 2.5 }, uPrRimStrength: { value: 0 },
      uPrEdgeColor: { value: new THREE.Color() }, uPrEdgeStrength: { value: 0 },
    };
    if (rim) { // שרשור אחרי addRim (שם יש תוכנית נפרדת לכל חומר)
      const prev = m.onBeforeCompile, id = m.uuid;
      m.onBeforeCompile = (shader, r) => { prev(shader, r); edgeChunk(shader, u); };
      m.customProgramCacheKey = () => `rim-${id}-pr`;
    } else { m.onBeforeCompile = edgeHook; m.customProgramCacheKey = edgeKey; }
  }
  return m;
}

export class PieceReadability {
  /**
   * @param {THREE.Group} group קבוצת הלוח (הכלים הם ילדים ישירים שלה)
   * @param {{renderer:THREE.WebGLRenderer}} sm
   * @param {number} boardTop גובה פני המשבצות
   */
  constructor(group, sm, boardTop) {
    this.group = group;
    this.sm = sm;
    this.boardTop = boardTop;
    this.mode = 'plus';
    this.tracked = [];
    this.selected = null;
    this.selBoost = 1;
    this.looks = new Map(); // ערכת חומרים → { src, white, black } (עותקים לכלים)
    this.boardSet = null;
    this.res = new THREE.Vector2(1, 1);
    this.dummy = new THREE.Object3D();

    // קו מתאר: חומר אחד לכל הכלים
    this.outlineU = { uPrRes: { value: this.res }, uPrWidth: { value: 2 }, uPrWorld: { value: 0.03 }, uPrBack: { value: 0.1 } };
    this.outlineMat = new THREE.MeshBasicMaterial({ color: INK.clone(), side: THREE.BackSide });
    const U = this.outlineU;
    this.outlineMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, U);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform vec2 uPrRes;\nuniform float uPrWidth;\nuniform float uPrWorld;\nuniform float uPrBack;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec3 prN = normalize(normalMatrix * normal);
          // הקליפה נדחקת מעט לאחור: נשארת הצללית החיצונית, והקווים הפנימיים (צווארון, בסיס) נעלמים
          mvPosition.xyz += normalize(mvPosition.xyz) * uPrBack;
          gl_Position = projectionMatrix * mvPosition;
          // עובי קבוע בפיקסלים מקרוב, ולא יותר מעובי עולם מרחוק (במבט-על הכלים לא הופכים לכתם)
          float prPx = min(uPrWidth, uPrWorld * projectionMatrix[1][1] * uPrRes.y * 0.5 / max(gl_Position.w, 0.001));
          // כלי שמתכווץ (נאכל, מוכתר) מאבד את הקו יחד איתו
          prPx *= clamp(length(modelMatrix[1].xyz) * 1.2, 0.0, 1.0);
          gl_Position.xy += prN.xy * prPx * 2.0 / uPrRes * gl_Position.w;`);
    };
    this.outlineMat.customProgramCacheKey = () => 'piece-readability-outline';

    // צל מגע: רשת אחת לכל הכלים, הדעיכה מחושבת בשיידר (בלי טקסטורה)
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.fade = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SHADOWS), 1);
    this.fade.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aFade', this.fade);
    this.shadowU = { uColor: { value: new THREE.Color(0x0d1020) }, uStrength: { value: 0.5 } };
    this.shadowMat = new THREE.ShaderMaterial({
      uniforms: this.shadowU, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      vertexShader: `attribute float aFade; varying vec2 vUv; varying float vFade;
        void main() { vUv = uv; vFade = aFade; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uStrength; varying vec2 vUv; varying float vFade;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.5, d);
          gl_FragColor = vec4(uColor, min(0.94, a * a * uStrength * vFade));
          #include <colorspace_fragment>
        }`,
    });
    this.shadows = new THREE.InstancedMesh(geo, this.shadowMat, MAX_SHADOWS);
    this.shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.shadows.count = 0;
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = 1; // אחרי משבצות שקופות (קריסטל, סייבר)
    this.shadows.raycast = () => {};
    this.shadows.userData.role = 'pieceShadows';
    group.add(this.shadows);
  }

  /** מצרף קו מתאר וצל לכלי חדש (נקרא מ-spawnPiece) */
  attach(piece) {
    const o = new THREE.Mesh(outlineGeometry(piece), this.outlineMat);
    o.userData.role = 'outline';
    o.raycast = () => {}; // לא משתתף בבחירת משבצת
    o.visible = this.mode !== 'off';
    piece.add(o);
    piece.userData.outline = o;
    this.tracked.push(piece);
  }

  /** חומרי הכלים לערכה נתונה, לפי המצב הנוכחי */
  look(set) {
    if (this.mode === 'off' || !set) return set;
    let L = this.looks.get(set);
    if (!L) {
      L = {
        src: set,
        white: { body: cloneMaterial(set.white.body, true), accent: cloneMaterial(set.white.accent) },
        black: { body: cloneMaterial(set.black.body, true), accent: set.black.accent },
        // "נבלע" = גוף הכלי קרוב בבהירות למשבצת שלו; לבנים רק על לוח בהיר, כהים רק על לוח כהה (לוחות ניאון זוהרים נשארים כמו שהם)
        needW: clamp01(1 - Math.abs(luma(set.white.body) - luma(set.light)) / 0.3) * smooth(0.4, 0.7, luma(set.light)),
        needB: clamp01(1 - Math.abs(luma(set.black.body) - luma(set.dark)) / 0.3) * (1 - smooth(0.5, 0.8, luma(set.dark))),
      };
      this.looks.set(set, L);
      this.style(L);
    }
    return L;
  }

  /** מעדכן את העותקים לפי המצב (יוניפורמים וצבעים בלבד, בלי קומפילציה מחדש) */
  style(L) {
    const M = MODES[this.mode];
    if (!M) return;
    const s = L.src;
    // לבנים: שמנת חמה, פרטים כהים והכהיית שוליים — רק כשהגוף נבלע במשבצות הבהירות
    const wb = L.white.body, wa = L.white.accent, nw = L.needW, nb = L.needB;
    tmpC.setRGB(1, 1, 1).lerp(CREAM, clamp01(nw * M.cream)).multiplyScalar(1 - (1 - M.dim) * nw);
    wb.color.copy(s.white.body.color).multiply(tmpC);
    wa.color.copy(s.white.accent.color).multiplyScalar(1 - M.accent * nw);
    if (wa.emissive) wa.emissiveIntensity = s.white.accent.emissiveIntensity * (1 - M.accent * 0.8 * nw);
    const wu = wb.userData.prRim;
    if (wu) {
      wu.uPrRimStrength.value = 0;
      wu.uPrRimPower.value = M.power;
      wu.uPrEdgeColor.value.copy(this.inkFor(s, tmpC)).multiplyScalar(2.2);
      wu.uPrEdgeStrength.value = (M.edge[0] + M.edge[1]) * nw;
    }
    // זוהר שוליים לבן על כלי לבן רק מבליע אותו במשבצת בהירה — מחלישים אותו שם
    if (wb.userData.rim) wb.userData.rim.uRimStrength.value = s.white.body.userData.rim.uRimStrength.value * (1 - M.glowCut * nw);
    // כהים: אור שוליים
    const bb = L.black.body, bu = bb.userData.prRim;
    if (bb.userData.rim) {
      bb.userData.rim.uRimStrength.value = s.black.body.userData.rim.uRimStrength.value * (M.boost[0] + M.boost[1] * nb);
    } else if (bu) {
      bu.uPrRimColor.value.copy(RIM_PALE).lerp(tmpC.set(s.glow ?? 0xffffff), 0.3);
      bu.uPrRimPower.value = M.power;
      bu.uPrRimStrength.value = M.rim[0] + M.rim[1] * nb;
    }
  }

  /** דיו כהה-קריר עם נגיעה מגוון המשבצות הכהות של הערכה */
  inkFor(set, target) {
    materialColor(set.dark, target).getHSL(HSL);
    return target.setHSL(HSL.h, Math.min(HSL.s, 0.5), 0.07).lerp(INK, 0.65);
  }

  /** הלוח הנוכחי: עובי וצבע הקו והצל לפי בהירות המשבצות */
  setBoard(set = this.boardSet) {
    this.boardSet = set;
    const M = MODES[this.mode];
    if (!M || !set) return;
    const light = luma(set.light), dark = luma(set.dark);
    const bright = smooth(0.45, 0.85, light);
    this.cssWidth = M.px[0] + (M.px[1] - M.px[0]) * bright;
    this.outlineU.uPrWorld.value = M.world * (0.75 + 0.25 * bright);
    this.outlineU.uPrBack.value = M.back;
    this.selBoost = M.select;
    this.inkFor(set, this.outlineMat.color).multiplyScalar(M.ink * (1 - 0.3 * bright)); // לוח בהיר → דיו כהה יותר
    this.inkFor(set, this.shadowU.uColor.value).multiplyScalar(0.8);
    this.shadowU.uStrength.value = M.shadow * (0.8 + 0.2 * smooth(0.3, 0.8, (light + dark) / 2));
  }

  setMode(mode) {
    this.mode = MODES[mode] === undefined ? 'plus' : mode;
    const on = this.mode !== 'off';
    for (const p of this.tracked) if (p.userData.outline) p.userData.outline.visible = on;
    this.shadows.visible = on;
    for (const L of this.looks.values()) this.style(L);
    this.setBoard();
  }

  /** הכלי הנבחר: הצל שלו מתחזק (כהה וגדול יותר) בהנפשה רכה, וחוזר כשהבחירה מתבטלת או כשהכלי זז */
  setSelected(piece) { this.selected = piece || null; }

  /** כל פריים: הצללים עוקבים אחרי הכלים (תנועה, קפיצה, אכילה, נפילת המלך). בלי הקצאות */
  update(dt = 0.016) {
    if (this.mode === 'off') return;
    const ease = Math.min(1, dt / 0.07); // ~0.2 שניות עד לעוצמה המלאה
    const r = this.sm.renderer;
    r.getDrawingBufferSize(this.res);
    this.outlineU.uPrWidth.value = this.cssWidth * r.getPixelRatio();
    const T = this.tracked, d = this.dummy, fade = this.fade.array;
    let n = 0;
    for (let i = 0; i < T.length; i++) {
      const p = T[i];
      if (p.parent !== this.group) { T[i] = T[T.length - 1]; T.pop(); i--; continue; } // הכלי הוסר מהלוח
      if (n >= MAX_SHADOWS || !p.visible) continue;
      const u = p.userData, sel = u.prSel = (u.prSel || 0) + ((p === this.selected ? 1 : 0) - (u.prSel || 0)) * ease;
      const h = Math.max(0, p.position.y - this.boardTop) * (1 - sel), sc = Math.min(1.3, Math.abs(p.scale.x)); // כלי נבחר מורם, והצל שלו לא נחלש
      const size = (BASE_R[u.type] || 0.4) * 3.1 * sc * (1 + h * 0.35) * (1 + sel * 0.3);
      d.position.set(p.position.x, this.boardTop + 0.004, p.position.z + 0.02);
      d.scale.set(size, 1, size);
      d.updateMatrix();
      this.shadows.setMatrixAt(n, d.matrix);
      fade[n] = Math.min(1, sc) / (1 + h * 1.6) * (1 + sel * this.selBoost);
      n++;
    }
    this.shadows.count = n;
    this.shadows.instanceMatrix.needsUpdate = true;
    this.fade.needsUpdate = true;
  }
}
