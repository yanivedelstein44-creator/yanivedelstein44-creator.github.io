/**
 * ערכת כלים פרוצדורלית: רעש, טקסטורות קנבס, עזרי גאומטריה ושיידרים קטנים.
 * הכול נוצר בקוד — אפס קבצים חיצוניים.
 */
import * as THREE from 'three';

// ---------- רעש ערכים מחזורי (ל-טקסטורות שחוזרות על עצמן) ----------
const PERM = new Uint8Array(512);
(() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = 1337;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

const hash2 = (x, y, seed) => PERM[(PERM[(x + seed) & 255] + y) & 255] / 255;

export function vnoise(x, y, period = 256, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period;
  const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
  const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed), c = hash2(x0, y1, seed), d = hash2(x1, y1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** fbm מחזורי: u,v ב-[0,1), freq = מספר תאים בציר */
export function fbm(u, v, freq = 4, oct = 4, seed = 0) {
  let sum = 0, amp = 0.5, f = freq, norm = 0;
  for (let o = 0; o < oct; o++) {
    sum += amp * vnoise(u * f, v * f, f, seed + o * 17);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

// ---------- טקסטורות קנבס ----------
const texCache = new Map();

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** יוצר טקסטורה פיקסל-פיקסל: fn(u,v) → [r,g,b] (0-255) */
export function pixelTexture(key, size, fn, { srgb = true, repeat = 1 } = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const out = [0, 0, 0];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      fn(x / size, y / size, out);
      const i = (y * size + x) * 4;
      d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2]; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

/** טקסטורה מצוירת עם Canvas2D: draw(ctx, size) */
export function drawnTexture(key, size, draw, { srgb = true, repeat = 1, h } = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = makeCanvas(size, h || size);
  draw(c.getContext('2d'), size, h || size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

const hexRGB = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function marbleTex(key, base, vein, { freq = 3, turb = 5, sharp = 6, seed = 0, size = 256 } = {}) {
  const A = hexRGB(base), B = hexRGB(vein);
  return pixelTexture(key, size, (u, v, o) => {
    const n = fbm(u, v, freq, 5, seed);
    const s = Math.abs(Math.sin((u * 2 + v * 3 + n * turb) * Math.PI));
    const t = Math.pow(1 - s, sharp) * 0.85 + fbm(u, v, 8, 2, seed + 5) * 0.12;
    const k = clamp01(t);
    o[0] = mix(A[0], B[0], k); o[1] = mix(A[1], B[1], k); o[2] = mix(A[2], B[2], k);
  });
}

export function woodTex(key, light, dark, { rings = 9, seed = 0, size = 256 } = {}) {
  const A = hexRGB(light), B = hexRGB(dark);
  return pixelTexture(key, size, (u, v, o) => {
    const n = fbm(u, v, 3, 4, seed);
    const r = Math.sin((u * rings + n * 3 + fbm(u * 0.5, v, 2, 2, seed + 3) * 2) * Math.PI * 2) * 0.5 + 0.5;
    const grain = fbm(u, v * 0.1, 32, 2, seed + 9) * 0.25;
    const k = clamp01(r * 0.7 + grain);
    o[0] = mix(A[0], B[0], k); o[1] = mix(A[1], B[1], k); o[2] = mix(A[2], B[2], k);
  });
}

export function stoneTex(key, base, dark, { freq = 6, seed = 0, size = 256, pits = 0.25 } = {}) {
  const A = hexRGB(base), B = hexRGB(dark);
  return pixelTexture(key, size, (u, v, o) => {
    const n = fbm(u, v, freq, 5, seed);
    const p = fbm(u, v, freq * 6, 2, seed + 4);
    let k = n * 0.75 + (p > 0.72 ? pits : 0);
    k = clamp01(k);
    o[0] = mix(A[0], B[0], k); o[1] = mix(A[1], B[1], k); o[2] = mix(A[2], B[2], k);
  });
}

export function brushedTex(key, base, { streak = 0.18, seed = 0, size = 256 } = {}) {
  const A = hexRGB(base);
  return pixelTexture(key, size, (u, v, o) => {
    const s = fbm(u * 0.02, v, 64, 3, seed) - 0.5;
    const k = 1 + s * streak * 2;
    o[0] = Math.min(255, A[0] * k); o[1] = Math.min(255, A[1] * k); o[2] = Math.min(255, A[2] * k);
  });
}

export function hammeredTex(key, base, { seed = 0, size = 256 } = {}) {
  const A = hexRGB(base);
  const cells = 10;
  const pts = [];
  for (let i = 0; i < cells * cells; i++) pts.push([(i % cells + hash2(i, 3, seed)) / cells, (Math.floor(i / cells) + hash2(i, 7, seed)) / cells]);
  return pixelTexture(key, size, (u, v, o) => {
    let d1 = 9;
    const cx = Math.floor(u * cells), cy = Math.floor(v * cells);
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const gx = (cx + ox + cells) % cells, gy = (cy + oy + cells) % cells;
        const p = pts[gy * cells + gx];
        let dx = Math.abs(u - (p[0] + (cx + ox - gx) / cells)), dy = Math.abs(v - (p[1] + (cy + oy - gy) / cells));
        const d = dx * dx + dy * dy;
        if (d < d1) d1 = d;
      }
    }
    const k = 0.8 + Math.sqrt(d1) * cells * 0.35;
    o[0] = Math.min(255, A[0] * k); o[1] = Math.min(255, A[1] * k); o[2] = Math.min(255, A[2] * k);
  });
}

export function speckleTex(key, base, speck, { density = 0.985, seed = 0, size = 256, glow = false } = {}) {
  const A = hexRGB(base), B = hexRGB(speck);
  return pixelTexture(key, size, (u, v, o) => {
    const n = fbm(u, v, 5, 3, seed);
    const h = hash2(Math.floor(u * size), Math.floor(v * size), seed + 11);
    const k = h > density ? 1 : 0;
    const shade = 0.75 + n * 0.5;
    o[0] = k ? B[0] : A[0] * shade; o[1] = k ? B[1] : A[1] * shade; o[2] = k ? B[2] : A[2] * shade;
    if (glow && !k) { o[0] *= 0.6; o[1] *= 0.6; o[2] *= 0.6; }
  });
}

export function grassTex() {
  return pixelTexture('grass', 256, (u, v, o) => {
    const n = fbm(u, v, 6, 5, 3);
    const b = fbm(u, v, 48, 2, 8);
    const k = 0.62 + n * 0.45 + (b - 0.5) * 0.25;
    o[0] = 200 * k; o[1] = 215 * k; o[2] = 190 * k;
  }, { repeat: 9 });
}

/** ספרייט רך עגול לחלקיקים/זוהר */
export function glowTexture(key = 'glow', inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return drawnTexture(key, 128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.65)'));
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }, { srgb: true });
}

export function flameTexture() {
  return drawnTexture('flame', 128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s * 0.62, 2, s / 2, s * 0.55, s * 0.48);
    g.addColorStop(0, 'rgba(255,255,220,1)');
    g.addColorStop(0.25, 'rgba(255,200,80,0.95)');
    g.addColorStop(0.55, 'rgba(255,110,20,0.6)');
    g.addColorStop(1, 'rgba(120,20,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(s / 2, 4);
    ctx.bezierCurveTo(s * 0.9, s * 0.45, s * 0.85, s * 0.95, s / 2, s * 0.98);
    ctx.bezierCurveTo(s * 0.15, s * 0.95, s * 0.1, s * 0.45, s / 2, 4);
    ctx.fill();
  });
}

// ---------- עזרי גאומטריה ----------
export function mesh(geo, mat, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (opts.pos) m.position.set(...opts.pos);
  if (opts.rot) m.rotation.set(...opts.rot);
  if (opts.scale !== undefined) {
    if (Array.isArray(opts.scale)) m.scale.set(...opts.scale); else m.scale.setScalar(opts.scale);
  }
  m.castShadow = opts.cast ?? false;
  m.receiveShadow = opts.receive ?? false;
  if (opts.name) m.name = opts.name;
  return m;
}

export function group(children = [], opts = {}) {
  const g = new THREE.Group();
  children.forEach((c) => c && g.add(c));
  if (opts.pos) g.position.set(...opts.pos);
  if (opts.rot) g.rotation.set(...opts.rot);
  if (opts.scale !== undefined) {
    if (Array.isArray(opts.scale)) g.scale.set(...opts.scale); else g.scale.setScalar(opts.scale);
  }
  if (opts.name) g.name = opts.name;
  return g;
}

const geoCache = new Map();
const cached = (key, make) => {
  if (!geoCache.has(key)) { const g = make(); g.userData.cached = true; geoCache.set(key, g); }
  return geoCache.get(key);
};
export const G = {
  box: (w, h, d) => cached(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  cyl: (rt, rb, h, s = 16, open = false) => cached(`c${rt},${rb},${h},${s},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open)),
  sph: (r, w = 16, h = 12) => cached(`s${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h)),
  cone: (r, h, s = 16) => cached(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s)),
  torus: (r, t, rs = 8, ts = 24, arc = Math.PI * 2) => cached(`t${r},${t},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc)),
  ico: (r, d = 0) => cached(`i${r},${d}`, () => new THREE.IcosahedronGeometry(r, d)),
  dodeca: (r) => cached(`d${r}`, () => new THREE.DodecahedronGeometry(r, 0)),
  octa: (r) => cached(`o${r}`, () => new THREE.OctahedronGeometry(r, 0)),
  plane: (w, h, sw = 1, sh = 1) => cached(`p${w},${h},${sw},${sh}`, () => new THREE.PlaneGeometry(w, h, sw, sh)),
  ring: (ri, ro, s = 48) => cached(`r${ri},${ro},${s}`, () => new THREE.RingGeometry(ri, ro, s)),
  capsule: (r, l, cs = 6, rs = 12) => cached(`cap${r},${l},${cs},${rs}`, () => new THREE.CapsuleGeometry(r, l, cs, rs)),
  lathe: (key, pts, segs = 32) => cached(`l${key}`, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segs)),
};

/** קשת (שער) כצורה עם חור קשתי — להוצאה תלת-ממדית */
export function archShape(w, h, openW, openH, count = 1, gap = 0, sill = 0.22) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  const total = count * openW + (count - 1) * gap;
  for (let i = 0; i < count; i++) {
    const cx = -total / 2 + openW / 2 + i * (openW + gap);
    const r = openW / 2;
    const hole = new THREE.Path();
    hole.moveTo(cx - r, sill);
    hole.lineTo(cx + r, sill);
    hole.lineTo(cx + r, openH - r);
    hole.absarc(cx, openH - r, r, 0, Math.PI, false);
    hole.lineTo(cx - r, sill);
    s.holes.push(hole);
  }
  return s;
}

export function extrude(shape, depth, bevel = 0.04) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 16 });
  g.translate(0, 0, -depth / 2);
  return g;
}

// ---------- שיידרים קטנים ----------
/** חיתוך רדיאלי לחומר (לגל ההלם שמחליף רצפות): mode 1=רק בפנים, -1=רק בחוץ, 0=כבוי */
export function addRadialClip(material) {
  if (material.userData.clip) return material.userData.clip;
  const uniforms = { uClipR: { value: 1e5 }, uClipMode: { value: 0 } };
  material.userData.clip = uniforms;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, r) => {
    if (prev) prev(shader, r);
    shader.uniforms.uClipR = uniforms.uClipR;
    shader.uniforms.uClipMode = uniforms.uClipMode;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vClipW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 cpw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          cpw = instanceMatrix * cpw;
        #endif
        vClipW = (modelMatrix * cpw).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vClipW;\nuniform float uClipR;\nuniform float uClipMode;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float cd = length(vClipW.xz);
        if (uClipMode > 0.5 && cd > uClipR) discard;
        if (uClipMode < -0.5 && cd < uClipR) discard;`);
  };
  material.customProgramCacheKey = () => `clip-${material.uuid}`;
  material.needsUpdate = true;
  return uniforms;
}

/** זוהר שוליים (Fresnel) — לכלי אנרגיה/קריסטל */
export function addRim(material, color = 0x66ffff, power = 2.2, strength = 1.2) {
  const uniforms = { uRimColor: { value: new THREE.Color(color) }, uRimPower: { value: power }, uRimStrength: { value: strength } };
  material.userData.rim = uniforms;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, r) => {
    if (prev) prev(shader, r);
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimPower;\nuniform float uRimStrength;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimF = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), uRimPower);
        totalEmissiveRadiance += uRimColor * rimF * uRimStrength;`);
  };
  material.customProgramCacheKey = () => `rim-${material.uuid}`;
  material.needsUpdate = true;
  return material;
}

/**
 * תאורת שוליים עדינה לדמויות (אווטארים וחיות) כדי שיבלטו על רקע הקרקע.
 * קוד שיידר זהה לכל החומרים → תוכנית GPU משותפת; הצבע והעוצמה נשמרים לכל חומר בנפרד.
 */
export function addCharacterRim(root, { color = 0xfff0c8, power = 2.6, strength = 0.55 } = {}) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || !(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) continue;
      if (m.userData.rim || m.userData.charRim || m.userData.noCharRim || m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.9)) continue;
      const u = { uCharRimColor: { value: new THREE.Color(color) }, uCharRimPower: { value: power }, uCharRimStrength: { value: strength } };
      m.userData.charRim = u;
      const prev = m.onBeforeCompile;
      const prevKey = m.customProgramCacheKey?.bind(m);
      m.onBeforeCompile = (shader, r) => {
        if (prev) prev(shader, r);
        Object.assign(shader.uniforms, u);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uCharRimColor;\nuniform float uCharRimPower;\nuniform float uCharRimStrength;')
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
            float charRim = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), uCharRimPower);
            totalEmissiveRadiance += uCharRimColor * charRim * uCharRimStrength;`);
      };
      m.customProgramCacheKey = () => `charRim1|${prevKey ? prevKey() : ''}`;
      m.needsUpdate = true;
    }
  });
}

let shadowTex = null;
/** צל מגע רך מתחת לדמות — מחבר אותה לקרקע */
export function contactShadow(radius = 1.2, opacity = 0.55) {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.025;
  m.renderOrder = -1;
  m.userData.noOcc = true;
  m.userData.contact = true;
  return m;
}

/** חומר אדיטיבי שקוף (זוהר/הולוגרמה) */
export function glowMaterial(color, opacity = 1, map = null) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, map, side: THREE.DoubleSide, fog: false });
}

/** ספרייט זוהר */
export function glowSprite(color, scale = 1, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.setScalar(scale);
  return s;
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const TAU = Math.PI * 2;
