/**
 * עזרי בנייה לתפאורות איי הפרימיום: חומרים, טקסטורות קנבס, גאומטריות ואביזרים נפוצים.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { drawnTexture, rand, TAU } from '../kit.js';

const V3 = THREE.Vector3;

// ---------- חומרים ----------
export const M = {
  std: (color, rough = 0.7, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }),
  phys: (o) => new THREE.MeshPhysicalMaterial(o),
  glow: (color, i = 1.6, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, roughness: 0.4, ...extra }),
  add: (color, o = 0.8, map = null) => new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  basic: (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra }),
};

// ---------- טקסטורות (קנבס, במטמון לפי מפתח) ----------
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
function seeded(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

export const T = {
  grid(key, base, line, n = 4, w = 4) {
    return drawnTexture(key, 256, (c, s) => {
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.strokeStyle = hex(line); c.lineWidth = w;
      for (let i = 0; i <= n; i++) { const p = (i / n) * s; c.beginPath(); c.moveTo(p, 0); c.lineTo(p, s); c.moveTo(0, p); c.lineTo(s, p); c.stroke(); }
    });
  },
  rivets(key, base, line) {
    return drawnTexture(key, 256, (c, s) => {
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.strokeStyle = hex(line); c.lineWidth = 5; c.strokeRect(2, 2, s - 4, s - 4);
      c.fillStyle = hex(line);
      for (const [x, y] of [[16, 16], [s - 16, 16], [16, s - 16], [s - 16, s - 16], [s / 2, 16], [s / 2, s - 16], [16, s / 2], [s - 16, s / 2]]) { c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill(); }
      const g = c.createLinearGradient(0, 0, s, s); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.18)'); c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
  },
  hexes(key, base, line, r = 22) {
    return drawnTexture(key, 256, (c, s) => {
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.strokeStyle = hex(line); c.lineWidth = 4;
      const h = r * Math.sqrt(3);
      for (let y = -1; y < s / h + 2; y++) for (let x = -1; x < s / (r * 1.5) + 2; x++) {
        const cx = x * r * 1.5, cy = y * h + (x % 2 ? h / 2 : 0);
        c.beginPath(); for (let i = 0; i <= 6; i++) { const a = (i / 6) * TAU; c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.stroke();
      }
    });
  },
  checker(key, a, b, n = 4) {
    return drawnTexture(key, 256, (c, s) => {
      const k = s / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { c.fillStyle = hex((i + j) % 2 ? a : b); c.fillRect(i * k, j * k, k, k); }
    });
  },
  rings(key, base, line, n = 22, center = null) {
    return drawnTexture(key, 512, (c, s) => {
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.strokeStyle = hex(line); c.lineWidth = 2;
      for (let i = 1; i <= n; i++) { c.globalAlpha = 0.35 + (i % 3) * 0.2; c.beginPath(); c.arc(s / 2, s / 2, (i / n) * s * 0.5, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
      if (center) { c.fillStyle = hex(center); c.beginPath(); c.arc(s / 2, s / 2, s * 0.08, 0, TAU); c.fill(); }
    });
  },
  planks(key, base, dark) {
    return drawnTexture(key, 256, (c, s) => {
      const rnd = seeded(7);
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      for (let i = 0; i < 8; i++) {
        const y = (i / 8) * s;
        c.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.12})`; c.fillRect(0, y, s, s / 8);
        c.strokeStyle = hex(dark); c.lineWidth = 3; c.beginPath(); c.moveTo(0, y); c.lineTo(s, y); c.stroke();
        const x = rnd() * s; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + s / 8); c.stroke();
        c.globalAlpha = 0.25; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(0, y + 4 + k * 7); c.bezierCurveTo(s * 0.3, y + rnd() * 20, s * 0.6, y + rnd() * 20, s, y + 4 + k * 7); c.stroke(); } c.globalAlpha = 1;
      }
    });
  },
  speckle(key, base, speck, density = 900, size = 2) {
    return drawnTexture(key, 256, (c, s) => {
      const rnd = seeded(key.length * 13);
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      for (let i = 0; i < density; i++) { c.fillStyle = `${hex(speck)}${Math.floor(60 + rnd() * 190).toString(16).padStart(2, '0')}`; c.fillRect(rnd() * s, rnd() * s, size, size); }
    });
  },
  ripples(key, base, line) {
    return drawnTexture(key, 256, (c, s) => {
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.strokeStyle = hex(line); c.lineWidth = 3; c.globalAlpha = 0.5;
      for (let i = 0; i < 9; i++) { const y = (i / 9) * s + 10; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= s; x += 16) c.lineTo(x, y + Math.sin(x * 0.05 + i) * 6); c.stroke(); }
      c.globalAlpha = 1;
    });
  },
  cracks(key, base, crack, n = 18, w = 3) {
    return drawnTexture(key, 256, (c, s) => {
      const rnd = seeded(key.length * 7 + n);
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.strokeStyle = hex(crack); c.lineWidth = w; c.lineCap = 'round';
      for (let i = 0; i < n; i++) { let x = rnd() * s, y = rnd() * s; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; c.lineTo(x, y); } c.stroke(); }
    });
  },
  circuit(key, base, line) {
    return drawnTexture(key, 256, (c, s) => {
      const rnd = seeded(11);
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.strokeStyle = hex(line); c.fillStyle = hex(line); c.lineWidth = 3;
      for (let i = 0; i < 22; i++) {
        let x = Math.round(rnd() * 8) * 32, y = Math.round(rnd() * 8) * 32;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 3; k++) { if (rnd() < 0.5) x += (rnd() < 0.5 ? -1 : 1) * 32; else y += (rnd() < 0.5 ? -1 : 1) * 32; c.lineTo(x, y); }
        c.stroke(); c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
      }
    });
  },
  clouds(key, base, puff) {
    return drawnTexture(key, 256, (c, s) => {
      const rnd = seeded(5);
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      for (let i = 0; i < 40; i++) {
        const x = rnd() * s, y = rnd() * s, r = 18 + rnd() * 40;
        const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `${hex(puff)}cc`); g.addColorStop(1, `${hex(puff)}00`);
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
    });
  },
  paper(key, base, ink) {
    return drawnTexture(key, 256, (c, s) => {
      const rnd = seeded(3);
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.globalAlpha = 0.08; c.fillStyle = '#000'; for (let i = 0; i < 400; i++) c.fillRect(rnd() * s, rnd() * s, 1, 6);
      c.globalAlpha = 0.85; c.strokeStyle = hex(ink); c.lineCap = 'round';
      for (let i = 0; i < 3; i++) { c.lineWidth = 6 + rnd() * 8; c.beginPath(); const x = rnd() * s, y = rnd() * s; c.moveTo(x, y); c.bezierCurveTo(x + 40, y - 30, x + 80, y + 30, x + 120, y - 10); c.stroke(); }
      c.globalAlpha = 1;
    });
  },
  stripes(key, a, b, n = 8, vertical = false) {
    return drawnTexture(key, 256, (c, s) => {
      const k = s / n;
      for (let i = 0; i < n; i++) { c.fillStyle = hex(i % 2 ? a : b); if (vertical) c.fillRect(i * k, 0, k, s); else c.fillRect(0, i * k, s, k); }
    });
  },
  cells(key, base, wall) {
    return drawnTexture(key, 256, (c, s) => {
      const rnd = seeded(17);
      c.fillStyle = hex(wall); c.fillRect(0, 0, s, s);
      for (let i = 0; i < 26; i++) {
        const x = rnd() * s, y = rnd() * s, r = 18 + rnd() * 26;
        c.fillStyle = hex(base); c.beginPath(); c.ellipse(x, y, r, r * (0.7 + rnd() * 0.3), rnd() * 3, 0, TAU); c.fill();
        c.fillStyle = 'rgba(140,40,160,0.45)'; c.beginPath(); c.arc(x + r * 0.2, y, r * 0.25, 0, TAU); c.fill();
      }
    });
  },
  web(key, base, line) {
    return drawnTexture(key, 512, (c, s) => {
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.strokeStyle = hex(line); c.lineWidth = 2; c.globalAlpha = 0.6;
      const cx = s / 2, cy = s / 2;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); c.stroke(); }
      for (let r = 20; r < s * 0.7; r += 22) { c.beginPath(); for (let i = 0; i <= 12; i++) { const a = (i / 12) * TAU; c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.stroke(); }
      c.globalAlpha = 1;
    });
  },
  runes(key, base, glow) {
    return drawnTexture(key, 256, (c, s) => {
      const rnd = seeded(23);
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.strokeStyle = hex(glow); c.lineWidth = 4; c.shadowColor = hex(glow); c.shadowBlur = 8; c.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const x = 20 + rnd() * (s - 40), y = 20 + rnd() * (s - 40);
        c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x, y + 14);
        c.moveTo(x, y - 6); c.lineTo(x + (rnd() < 0.5 ? 10 : -10), y - 14);
        c.moveTo(x, y + 4); c.lineTo(x + (rnd() < 0.5 ? 10 : -10), y + 12); c.stroke();
      }
    });
  },
  floral(key, base, ink) {
    return drawnTexture(key, 256, (c, s) => {
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.strokeStyle = hex(ink); c.fillStyle = hex(ink); c.lineWidth = 3;
      c.strokeRect(4, 4, s - 8, s - 8);
      for (const [x, y, r] of [[s / 2, s / 2, 34], [0, 0, 26], [s, 0, 26], [0, s, 26], [s, s, 26]]) {
        for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; c.beginPath(); c.ellipse(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.38, r * 0.16, a, 0, TAU); c.fill(); }
        c.beginPath(); c.arc(x, y, r * 0.18, 0, TAU); c.stroke();
      }
    });
  },
  stars(key, base) {
    return drawnTexture(key, 256, (c, s) => {
      const rnd = seeded(31);
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`; const r = rnd() * 1.6; c.beginPath(); c.arc(rnd() * s, rnd() * s, r, 0, TAU); c.fill(); }
      for (let i = 0; i < 8; i++) { c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 3; c.beginPath(); c.arc(rnd() * s, rnd() * s, 6 + rnd() * 16, 0, TAU); c.stroke(); }
    });
  },
  flow(key, base, foam) {
    return drawnTexture(key, 256, (c, s) => {
      const rnd = seeded(41);
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.strokeStyle = hex(foam); c.lineCap = 'round';
      for (let i = 0; i < 26; i++) { c.globalAlpha = 0.3 + rnd() * 0.5; c.lineWidth = 2 + rnd() * 4; const x = rnd() * s, y = rnd() * s; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30 + rnd() * 50, y + (rnd() - 0.5) * 6); c.stroke(); }
      c.globalAlpha = 1;
    });
  },
  sun(key, base, gold) {
    return drawnTexture(key, 512, (c, s) => {
      c.fillStyle = hex(base); c.fillRect(0, 0, s, s);
      c.strokeStyle = hex(gold); c.fillStyle = hex(gold); c.lineWidth = 6;
      const cx = s / 2;
      for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; c.beginPath(); c.moveTo(cx + Math.cos(a) * s * 0.12, cx + Math.sin(a) * s * 0.12); c.lineTo(cx + Math.cos(a) * s * 0.48, cx + Math.sin(a) * s * 0.48); c.globalAlpha = i % 2 ? 0.35 : 0.8; c.stroke(); }
      c.globalAlpha = 1; for (const r of [0.2, 0.32, 0.47]) { c.beginPath(); c.arc(cx, cx, s * r, 0, TAU); c.stroke(); }
    });
  },
  code(key, color) {
    return drawnTexture(key, 256, (c, s) => {
      const rnd = seeded(51);
      c.fillStyle = '#000'; c.fillRect(0, 0, s, s);
      c.fillStyle = hex(color);
      for (let y = 6; y < s; y += 14) { let x = 8; while (x < s - 10) { const w = 6 + rnd() * 34; c.globalAlpha = 0.4 + rnd() * 0.6; c.fillRect(x, y, w, 6); x += w + 8; } }
      c.globalAlpha = 1;
    });
  },
};

// ---------- גאומטריה ממוזגת (חיסכון בקריאות ציור) ----------
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new V3(), _s = new V3();
export function merge(parts) {
  const geos = parts.map(([g, pos = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1]]) => {
    const c = (g.index ? g : g).clone();
    c.applyMatrix4(_m4.compose(_p.set(...pos), _q.setFromEuler(_e.set(...rot)), _s.set(...(Array.isArray(sc) ? sc : [sc, sc, sc]))));
    return c.index ? c.toNonIndexed() : c;
  });
  geos.forEach((g) => { if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); });
  return mergeGeometries(geos, false);
}

export const GEO = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, seg = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open),
  cone: (r, h, seg = 10, open = false) => new THREE.ConeGeometry(r, h, seg, 1, open),
  sph: (r, ws = 14, hs = 10) => new THREE.SphereGeometry(r, ws, hs),
  hemi: (r, seg = 18) => new THREE.SphereGeometry(r, seg, 8, 0, TAU, 0, Math.PI / 2),
  tor: (r, t, seg = 32, arc = TAU) => new THREE.TorusGeometry(r, t, 8, seg, arc),
  oct: (r) => new THREE.OctahedronGeometry(r, 0),
  dod: (r) => new THREE.DodecahedronGeometry(r, 0),
  ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
  plane: (w, h) => new THREE.PlaneGeometry(w, h),
};

// ---------- אביזרים נפוצים ----------
export const PROPS = {
  tree(K, h = 4, leaf = 0x3a7a3a, trunk = 0x5a3a20) {
    return K.group(
      K.mesh(GEO.cyl(0.18 * h / 4, 0.28 * h / 4, h * 0.45, 8), M.std(trunk, 0.9), { pos: [0, h * 0.22, 0], cast: true }),
      K.mesh(GEO.ico(h * 0.32, 0), M.std(leaf, 0.8, 0, { flatShading: true }), { pos: [0, h * 0.6, 0], cast: true }),
      K.mesh(GEO.ico(h * 0.24, 0), M.std(leaf, 0.8, 0, { flatShading: true }), { pos: [h * 0.15, h * 0.82, 0.1], cast: true }),
    );
  },
  pine(K, h = 4, leaf = 0x2f6a3a, snow = null) {
    const g = K.group(K.mesh(GEO.cyl(0.12, 0.18, h * 0.3, 6), M.std(0x4a3020, 0.9), { pos: [0, h * 0.15, 0] }));
    for (let i = 0; i < 3; i++) g.add(K.mesh(GEO.cone(h * (0.3 - i * 0.07), h * 0.42, 8), M.std(leaf, 0.8, 0, { flatShading: true }), { pos: [0, h * (0.36 + i * 0.2), 0], cast: true }));
    if (snow) g.add(K.mesh(GEO.cone(h * 0.12, h * 0.16, 8), M.std(snow, 0.7), { pos: [0, h * 0.92, 0] }));
    return g;
  },
  palm(K, h = 4) {
    const g = K.group(K.mesh(GEO.cyl(0.1, 0.16, h, 7), M.std(0x8a6a40, 0.9), { pos: [0, h / 2, 0], rot: [0, 0, 0.12], cast: true }));
    const leaf = M.std(0x3a8a3a, 0.8, 0, { side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.add(K.mesh(GEO.box(h * 0.5, 0.04, h * 0.14), leaf, { pos: [Math.cos(a) * h * 0.2 + h * 0.12, h, Math.sin(a) * h * 0.2], rot: [0, -a, -0.45] })); }
    return g;
  },
  rock(K, r = 1, color = 0x8a8478) { return K.mesh(GEO.dod(r), M.std(color, 0.95, 0, { flatShading: true }), { rot: [rand(0, 3), rand(0, 3), 0], scale: [1, 0.7, 1], cast: true }); },
  crystal(K, h = 3, mat) { return K.mesh(GEO.cone(h * 0.22, h, 6), mat, { pos: [0, h / 2, 0], cast: true }); },
  lantern(K, color = 0xffc060, r = 0.28) {
    return K.group(K.mesh(GEO.sph(r, 12, 8), M.glow(color, 1.8)), K.mesh(GEO.cyl(r * 0.6, r * 0.6, r * 0.25, 10), M.std(0x3a2a1a, 0.6, 0.6), { pos: [0, r * 0.95, 0] }));
  },
  gear(K, r, teeth, thick, mat) {
    const parts = [[GEO.cyl(r, r, thick, 28), [0, 0, 0], [Math.PI / 2, 0, 0]], [GEO.cyl(r * 0.25, r * 0.25, thick * 1.4, 12), [0, 0, 0], [Math.PI / 2, 0, 0]]];
    for (let i = 0; i < teeth; i++) { const a = (i / teeth) * TAU; parts.push([GEO.box(r * 0.22, r * 0.24, thick), [Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08, 0], [0, 0, a]]); }
    return K.mesh(merge(parts), mat, { cast: true });
  },
};

