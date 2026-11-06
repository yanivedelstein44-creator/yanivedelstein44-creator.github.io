/**
 * מונומנטים פרוצדורליים — אחד לכל עידן (98).
 * כל מונומנט נבנה מצורות פשוטות עם צבעי קודקודים ומאוחד לשתי גאומטריות בלבד:
 * חלקים מוצקים (מוארים) וחלקים זוהרים (אש, ניאון, קריסטלים) — כלומר 2 קריאות ציור למונומנט.
 * יחידות: טביעת רגל ברדיוס ~1.5, גובה עד ~3.5 (מוגדלים לפי השימוש: אי, אי מרכזי, מפה).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const C = {
  stone: 0x8a8478, dstone: 0x5a564e, lstone: 0xb8b2a6, sand: 0xe0c48a, marble: 0xf2ece0, gold: 0xf2c14e, wood: 0x7a5a3a, dwood: 0x4a3424,
  straw: 0xd8b45a, red: 0xc8282a, bronze: 0xb07a3a, iron: 0x4a4a52, steel: 0x9aa2ac, copper: 0xb86a3a, brick: 0xa85a3a, terra: 0xc8784a,
  cyan: 0x33e8ff, magenta: 0xff3ad8, ice: 0xcfeaff, snow: 0xf4f8fc, grass: 0x5a8a3a, leaf: 0x3a7a3a, pink: 0xf4a8c8, blue: 0x2a5aa8,
  lapis: 0x2a4ab8, turq: 0x3ad8c8, coral: 0xff8a7a, pearl: 0xf4eee8, lava: 0xff5a1a, fire: 0xffa020, flame: 0xffe060, crystal: 0xd8c8ff,
  violet: 0x8a5ad8, black: 0x1a1a22, white: 0xffffff, bone: 0xeee6d0, fur: 0x7a5030, cream: 0xf2e6c8, jade: 0x3aa87a, slate: 0x4a5260,
  rose: 0xd08a70, green: 0x2e8a4a, purple: 0x6a2a8a, navy: 0x1a2a4a, silver: 0xc8ccd4, dark: 0x23262e, sky: 0x8ad8ff, mars: 0xc8603a,
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const UNIT = { box: new THREE.BoxGeometry(1, 1, 1) };
function prismGeo() {
  const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.lineTo(-0.5, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); return g;
}

class Builder {
  constructor() { this.solid = []; this.glow = []; }
  add(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1], glow = false) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.applyMatrix4(_m.compose(_p.set(pos[0], pos[1], pos[2]), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), _s.set(sc[0], sc[1], sc[2])));
    _c.set(color);
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    (glow ? this.glow : this.solid).push(g);
    return this;
  }
  box(w, h, d, c, pos, rot, glow) { return this.add(UNIT.box, c, pos, rot, [w, h, d], glow); }
  cyl(rt, rb, h, c, pos, seg = 10, rot, glow) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), c, pos, rot, undefined, glow); }
  cone(r, h, c, pos, seg = 10, rot, glow) { return this.add(new THREE.ConeGeometry(r, h, seg), c, pos, rot, undefined, glow); }
  sph(r, c, pos, sc = [1, 1, 1], seg = 10, glow) { return this.add(new THREE.SphereGeometry(r, seg, Math.max(5, seg * 0.6 | 0)), c, pos, undefined, sc, glow); }
  hemi(r, c, pos, sc = [1, 1, 1], seg = 14) { return this.add(new THREE.SphereGeometry(r, seg, 7, 0, TAU, 0, Math.PI / 2), c, pos, undefined, sc); }
  tor(r, t, c, pos, rot, arc = TAU, glow, seg = 24) { return this.add(new THREE.TorusGeometry(r, t, 6, seg, arc), c, pos, rot, undefined, glow); }
  oct(r, c, pos, sc = [1, 1, 1], glow) { return this.add(new THREE.OctahedronGeometry(r, 0), c, pos, undefined, sc, glow); }
  dod(r, c, pos, sc = [1, 1, 1], rot) { return this.add(new THREE.DodecahedronGeometry(r, 0), c, pos, rot, sc); }
  prism(w, h, d, c, pos, rot) { return this.add(UNIT.prism ||= prismGeo(), c, pos, rot, [w, h, d]); }
  // ---------- צורות מורכבות ----------
  columns(n, r, h, rad, c, y = 0, cx = 0, cz = 0, a0 = 0) { for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU; this.cyl(r, r * 1.1, h, c, [cx + Math.cos(a) * rad, y + h / 2, cz + Math.sin(a) * rad], 8); } return this; }
  row(n, x0, x1, z, r, h, c, y = 0) { for (let i = 0; i < n; i++) { const x = x0 + ((x1 - x0) * i) / Math.max(1, n - 1); this.cyl(r, r * 1.1, h, c, [x, y + h / 2, z], 8); } return this; }
  tree(x, z, h = 1, c = C.leaf, trunk = C.wood) { this.cyl(0.06 * h, 0.08 * h, 0.5 * h, trunk, [x, 0.25 * h, z], 6); this.cone(0.32 * h, 0.9 * h, c, [x, 0.85 * h, z], 7); return this; }
  palm(x, z, h = 1) { this.cyl(0.05 * h, 0.07 * h, 1.2 * h, C.wood, [x, 0.6 * h, z], 6, [0, 0, 0.08]); for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; this.box(0.6 * h, 0.04, 0.16 * h, C.leaf, [x + Math.cos(a) * 0.25 * h, 1.2 * h, z + Math.sin(a) * 0.25 * h], [0, -a, -0.35]); } return this; }
  plinth(r = 1.3, h = 0.18, c = C.lstone) { this.cyl(r, r * 1.05, h, c, [0, h / 2, 0], 16); return this; }
  roof4(w, h, c, y, x = 0, z = 0) { this.cone(w * 0.72, h, c, [x, y + h / 2, z], 4, [0, Math.PI / 4, 0]); return this; }
  flag(x, y, z, c = C.red, pole = C.dwood) { this.cyl(0.02, 0.02, 0.8, pole, [x, y + 0.4, z], 5); this.box(0.34, 0.2, 0.02, c, [x + 0.17, y + 0.68, z]); return this; }
  ship(len, hull, sail, x = 0, z = 0, sails = 1, tilt = 0) {
    this.box(len * 0.32, 0.32, len, hull, [x, 0.26, z], [tilt, 0, tilt * 0.4]);
    this.box(len * 0.22, 0.16, len * 0.86, hull, [x, 0.08, z], [tilt, 0, 0]);
    this.cone(len * 0.17, len * 0.3, hull, [x, 0.3, z + len * 0.6], 4, [Math.PI / 2, 0, Math.PI / 4]);
    for (let i = 0; i < sails; i++) { const zz = z + (i - (sails - 1) / 2) * len * 0.38; this.cyl(0.03, 0.035, len * 0.85, C.dwood, [x, 0.42 + len * 0.42, zz], 6); this.box(len * 0.5, len * 0.42, 0.03, sail, [x, 0.55 + len * 0.45, zz]); }
    return this;
  }
  build() {
    const solid = this.solid.length ? mergeGeometries(this.solid, false) : null;
    const glow = this.glow.length ? mergeGeometries(this.glow, false) : null;
    return { solid, glow };
  }
}

// ======================= 98 המונומנטים =======================
const M = {
  // ---------- פרה-היסטוריה ----------
  fireRing(b) {
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; b.dod(0.24, C.stone, [Math.cos(a) * 1.05, 0.14, Math.sin(a) * 1.05], [1, 0.7, 1], [i, i * 2, 0]); }
    for (let i = 0; i < 3; i++) b.cyl(0.05, 0.05, 1.3, C.dwood, [0, 0.22, 0], 6, [0, (i * TAU) / 3, 1.2]);
    b.cone(0.42, 1.1, C.fire, [0, 0.75, 0], 7, [0, 0, 0], true).cone(0.26, 0.8, C.flame, [0.08, 0.75, 0.05], 7, [0, 0.5, 0], true);
    b.cyl(0.07, 0.08, 2, C.wood, [-1.3, 1, -0.6], 6).box(0.5, 0.35, 0.05, C.fur, [-1.3, 1.85, -0.58]);
  },
  mammoth(b) {
    b.dod(1.2, C.snow, [0, 0.2, 0], [1.2, 0.3, 1]);
    b.sph(0.75, C.fur, [0, 1.45, -0.1], [1, 0.85, 1.25]).sph(0.45, C.fur, [0, 1.75, 0.95]);
    [[-0.35, -0.55], [0.35, -0.55], [-0.35, 0.45], [0.35, 0.45]].forEach(([x, z]) => b.cyl(0.17, 0.15, 0.95, C.fur, [x, 0.75, z], 7));
    b.cyl(0.12, 0.06, 1.0, C.fur, [0, 1.25, 1.35], 7, [0.45, 0, 0]);
    b.tor(0.42, 0.05, C.bone, [-0.25, 1.35, 1.2], [0, Math.PI / 2, 0], Math.PI).tor(0.42, 0.05, C.bone, [0.25, 1.35, 1.2], [0, Math.PI / 2, 0], Math.PI);
    b.sph(0.28, C.fur, [-0.42, 1.8, 0.75], [0.3, 1, 1]).sph(0.28, C.fur, [0.42, 1.8, 0.75], [0.3, 1, 1]);
  },
  caveArch(b) {
    b.dod(0.9, C.stone, [-1.0, 0.8, 0], [0.8, 1.2, 0.9]).dod(0.9, C.stone, [1.0, 0.8, 0], [0.8, 1.2, 0.9]);
    b.dod(1.0, C.dstone, [0, 2.0, 0], [1.7, 0.6, 1.0]);
    b.box(0.3, 0.2, 0.02, C.red, [-0.6, 1.1, 0.55]).box(0.2, 0.3, 0.02, C.terra, [-0.35, 1.4, 0.6]).box(0.25, 0.15, 0.02, C.black, [0.5, 1.2, 0.6]);
    b.cone(0.18, 0.5, C.fire, [0, 0.25, 0.7], 6, undefined, true);
  },
  dinoSkeleton(b) {
    for (let i = 0; i < 9; i++) { const t = i / 8; b.box(0.18, 0.18, 0.24, C.bone, [0, 1.3 + Math.sin(t * Math.PI) * 0.4, -1.2 + t * 2.4]); }
    for (let i = 0; i < 5; i++) b.tor(0.38 - i * 0.03, 0.035, C.bone, [0, 1.25, -0.5 + i * 0.25], [0, Math.PI / 2, 0], Math.PI, false, 12);
    b.box(0.4, 0.35, 0.6, C.bone, [0, 1.55, 1.45]).box(0.32, 0.1, 0.5, C.bone, [0, 1.35, 1.5]);
    [[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.5], [0.3, 0.5]].forEach(([x, z]) => b.cyl(0.07, 0.06, 1.2, C.bone, [x, 0.6, z], 6));
    b.tree(-1.3, -0.8, 1.6, C.green).tree(1.3, 0.6, 1.3, C.green);
  },
  volcano(b) {
    b.cone(1.5, 2.4, C.dstone, [0, 1.2, 0], 9).cyl(0.42, 0.42, 0.12, C.lava, [0, 2.2, 0], 9, undefined, true);
    b.box(0.14, 1.3, 0.05, C.lava, [0.35, 1.4, 0.78], [-0.55, 0, 0.12], true).box(0.12, 1.0, 0.05, C.fire, [-0.5, 1.5, 0.62], [-0.5, 0, -0.3], true);
    b.sph(0.35, C.slate, [0.2, 2.75, 0], [1.2, 0.8, 1]).sph(0.3, C.slate, [-0.1, 3.15, 0.1]);
  },
  stiltHut(b) {
    [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].forEach(([x, z]) => b.cyl(0.06, 0.07, 1.4, C.dwood, [x, 0.7, z], 6));
    b.box(1.6, 0.1, 1.6, C.wood, [0, 1.4, 0]).cyl(0.6, 0.65, 0.7, C.straw, [0, 1.8, 0], 9).cone(0.95, 0.9, C.straw, [0, 2.6, 0], 9);
    for (let i = 0; i < 5; i++) b.box(0.4, 0.04, 0.06, C.wood, [0.95, 0.25 + i * 0.27, 0.3], [0, 0, 0.15]);
    b.box(0.25, 0.4, 0.02, C.dwood, [0, 1.75, 0.62]);
  },
  totem(b) {
    const cols = [C.red, C.wood, C.blue, C.wood, C.gold];
    cols.forEach((c, i) => b.cyl(0.36, 0.38, 0.55, c, [0, 0.28 + i * 0.55, 0], 10));
    b.box(2.2, 0.22, 0.2, C.red, [0, 2.5, 0], [0, 0, 0.08]).cone(0.3, 0.4, C.gold, [0, 2.95, 0], 4);
    for (let i = 0; i < 4; i++) b.box(0.18, 0.08, 0.05, C.black, [0, 0.4 + i * 0.55, 0.37]);
    b.tree(-1.2, -0.5, 1.4).tree(1.1, -0.7, 1.2);
  },
  forge(b) {
    b.plinth(1.2, 0.15, C.stone);
    b.cyl(0.55, 0.65, 1.3, C.brick, [-0.5, 0.8, -0.2], 10).cyl(0.2, 0.25, 0.8, C.dstone, [-0.5, 1.85, -0.2], 8).box(0.35, 0.3, 0.1, C.fire, [-0.5, 0.6, 0.38], undefined, true);
    b.box(0.6, 0.25, 0.3, C.bronze, [0.6, 0.75, 0.2]).box(0.3, 0.45, 0.22, C.iron, [0.6, 0.4, 0.2]).box(0.25, 0.08, 0.25, C.bronze, [0.95, 0.85, 0.2]);
    for (let i = 0; i < 3; i++) b.box(0.3, 0.1, 0.14, C.gold, [0.3 + i * 0.2, 0.22, 0.75]);
  },
  stonehenge(b) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU, x = Math.cos(a) * 1.15, z = Math.sin(a) * 1.15;
      b.box(0.28, 1.4, 0.32, C.stone, [x + Math.cos(a + Math.PI / 2) * 0.28, 0.7, z + Math.sin(a + Math.PI / 2) * 0.28], [0, -a, 0]);
      b.box(0.28, 1.4, 0.32, C.stone, [x - Math.cos(a + Math.PI / 2) * 0.28, 0.7, z - Math.sin(a + Math.PI / 2) * 0.28], [0, -a, 0]);
      if (i % 2 === 0) b.box(0.32, 0.22, 0.95, C.dstone, [x, 1.5, z], [0, -a, 0]);
    }
    b.box(0.9, 0.25, 0.5, C.lstone, [0, 0.13, 0]);
  },
  // ---------- העולם הקלאסי ----------
  bullHorns(b) {
    b.box(1.8, 0.3, 1.2, C.cream, [0, 0.15, 0]).box(1.5, 0.3, 1.0, C.cream, [0, 0.45, 0]);
    [-0.5, 0.5].forEach((x) => { b.cyl(0.14, 0.09, 1.3, C.red, [x, 1.25, 0], 8).cyl(0.2, 0.2, 0.12, C.black, [x, 1.95, 0], 8); });
    b.box(1.4, 0.18, 0.5, C.terra, [0, 2.1, 0]);
    b.tor(0.32, 0.07, C.gold, [-0.3, 2.45, 0], [0, 0, 0], Math.PI).tor(0.32, 0.07, C.gold, [0.3, 2.45, 0], [0, 0, 0], Math.PI);
  },
  parthenon(b) {
    b.box(2.6, 0.15, 1.8, C.marble, [0, 0.08, 0]).box(2.4, 0.15, 1.6, C.marble, [0, 0.22, 0]);
    b.row(6, -1.05, 1.05, 0.68, 0.09, 1.3, C.marble, 0.3).row(6, -1.05, 1.05, -0.68, 0.09, 1.3, C.marble, 0.3);
    b.box(2.4, 0.2, 1.6, C.marble, [0, 1.7, 0]).prism(2.5, 0.45, 1.7, C.cream, [0, 1.8, 0]);
    b.box(1.6, 1.1, 1.0, C.cream, [0, 0.85, 0]);
  },
  helmetStatue(b) {
    b.box(1.0, 0.9, 1.0, C.lstone, [0, 0.45, 0]);
    b.sph(0.62, C.bronze, [0, 1.55, 0], [1, 1.1, 1.1]).box(0.9, 0.35, 0.1, C.dark, [0, 1.45, 0.58]).box(0.12, 0.5, 0.08, C.bronze, [0, 1.3, 0.62]);
    b.box(0.16, 0.5, 1.3, C.red, [0, 2.25, 0]).box(0.12, 0.25, 1.0, C.red, [0, 2.55, -0.1]);
    b.cyl(0.6, 0.6, 0.08, C.bronze, [0.85, 0.95, 0.3], 14, [Math.PI / 2, 0, 0.3]).box(0.12, 0.45, 0.04, C.dark, [0.86, 0.95, 0.36], [0, 0, 0.3]);
  },
  torch(b) {
    b.plinth(0.9, 0.2, C.marble);
    b.cyl(0.22, 0.26, 2.0, C.marble, [0, 1.2, 0], 12).cyl(0.5, 0.3, 0.35, C.bronze, [0, 2.35, 0], 12);
    b.cone(0.4, 0.9, C.fire, [0, 2.95, 0], 8, undefined, true).cone(0.22, 0.65, C.flame, [0, 3.0, 0], 8, undefined, true);
    b.tor(0.55, 0.06, C.leaf, [0, 1.1, 0], [Math.PI / 2, 0, 0]).tor(0.55, 0.06, C.gold, [0, 0.6, 0], [Math.PI / 2, 0, 0]);
  },
  trojanHorse(b) {
    b.box(1.5, 0.15, 2.2, C.dwood, [0, 0.2, 0]);
    [[-0.6, -0.9], [0.6, -0.9], [-0.6, 0.9], [0.6, 0.9]].forEach(([x, z]) => b.cyl(0.18, 0.18, 0.12, C.dwood, [x, 0.18, z], 10, [0, 0, Math.PI / 2]));
    [[-0.35, -0.6], [0.35, -0.6], [-0.35, 0.6], [0.35, 0.6]].forEach(([x, z]) => b.box(0.18, 0.9, 0.18, C.wood, [x, 0.75, z]));
    b.box(0.9, 0.75, 1.8, C.wood, [0, 1.55, 0]).box(0.4, 1.0, 0.45, C.wood, [0, 2.2, 1.0], [-0.45, 0, 0]).box(0.38, 0.38, 0.7, C.wood, [0, 2.7, 1.35]);
    b.box(0.08, 0.5, 0.6, C.dwood, [0, 2.6, 0.9]).box(0.1, 0.15, 0.6, C.dwood, [0, 1.6, -1.05], [0.6, 0, 0]);
  },
  lighthouse(b) {
    b.box(1.6, 1.0, 1.6, C.marble, [0, 0.5, 0]).cyl(0.6, 0.7, 1.1, C.marble, [0, 1.55, 0], 8).cyl(0.38, 0.45, 0.7, C.cream, [0, 2.45, 0], 12);
    b.cyl(0.42, 0.42, 0.08, C.gold, [0, 2.85, 0], 12).cone(0.3, 0.7, C.fire, [0, 3.2, 0], 8, undefined, true).cyl(0.06, 0.06, 0.5, C.gold, [0, 3.45, 0], 6);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; b.box(0.2, 0.3, 0.2, C.gold, [Math.cos(a) * 0.72, 1.1, Math.sin(a) * 0.72]); }
  },
  elephant(b) {
    b.sph(0.8, C.slate, [0, 1.3, 0], [0.9, 0.85, 1.3]).sph(0.45, C.slate, [0, 1.55, 1.1]);
    [[-0.35, -0.5], [0.35, -0.5], [-0.35, 0.5], [0.35, 0.5]].forEach(([x, z]) => b.cyl(0.18, 0.16, 0.9, C.slate, [x, 0.45, z], 8));
    b.cyl(0.1, 0.05, 1.0, C.slate, [0, 1.05, 1.45], 7, [0.25, 0, 0]).sph(0.35, C.slate, [-0.45, 1.6, 0.95], [0.25, 1, 1]).sph(0.35, C.slate, [0.45, 1.6, 0.95], [0.25, 1, 1]);
    b.box(0.85, 0.55, 0.85, C.red, [0, 2.25, -0.1]).box(0.95, 0.12, 0.95, C.gold, [0, 2.55, -0.1]);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; b.box(0.14, 0.2, 0.14, C.gold, [Math.cos(a) * 0.38, 2.7, -0.1 + Math.sin(a) * 0.38]); }
  },
  vesuvius(b) {
    b.cone(1.2, 2.0, C.dstone, [0.3, 1.0, -0.4], 9).cyl(0.3, 0.3, 0.1, C.lava, [0.3, 1.95, -0.4], 9, undefined, true).sph(0.3, C.slate, [0.3, 2.5, -0.4], [1.3, 0.8, 1]);
    [[-0.9, 0.7, 1.2], [-0.4, 0.9, 0.7], [0.4, 1.0, 1.4], [0.9, 0.6, 0.5]].forEach(([x, z, h]) => b.cyl(0.1, 0.11, h, C.marble, [x, h / 2, z], 8));
    b.box(1.2, 0.12, 0.3, C.marble, [-0.65, 1.25, 0.8], [0, 0, -0.15]);
  },
  byzDome(b) {
    b.box(2.0, 1.0, 2.0, C.cream, [0, 0.5, 0]).cyl(0.75, 0.8, 0.35, C.cream, [0, 1.17, 0], 16);
    b.hemi(0.78, C.gold, [0, 1.35, 0], [1, 0.95, 1]).cyl(0.04, 0.04, 0.5, C.gold, [0, 2.35, 0], 6);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; b.hemi(0.42, C.cream, [Math.cos(a) * 0.85, 1.0, Math.sin(a) * 0.85], [1, 0.9, 1]); }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; b.cyl(0.16, 0.18, 1.5, C.terra, [Math.cos(a) * 1.25, 0.75, Math.sin(a) * 1.25], 8).cone(0.2, 0.35, C.gold, [Math.cos(a) * 1.25, 1.68, Math.sin(a) * 1.25], 8); }
  },
  colosseum(b) {
    b.add(new THREE.CylinderGeometry(1.4, 1.45, 1.1, 24, 1, true), C.sand, [0, 0.55, 0], undefined, [1, 1, 0.82]);
    b.add(new THREE.CylinderGeometry(1.1, 1.1, 0.9, 24, 1, true), C.lstone, [0, 0.45, 0], undefined, [1, 1, 0.8]);
    b.add(new THREE.CylinderGeometry(1.4, 1.4, 0.45, 24, 1, true, 0, Math.PI * 1.25), C.sand, [0, 1.32, 0], undefined, [1, 1, 0.82]);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; b.box(0.16, 0.32, 0.04, C.dark, [Math.cos(a) * 1.43, 0.5, Math.sin(a) * 1.43 * 0.82], [0, -a + Math.PI / 2, 0]); b.box(0.16, 0.28, 0.04, C.dark, [Math.cos(a) * 1.43, 0.95, Math.sin(a) * 1.43 * 0.82], [0, -a + Math.PI / 2, 0]); }
    b.cyl(1.05, 1.05, 0.05, C.sand, [0, 0.03, 0], 20, undefined).add(UNIT.box, C.red, [0, 1.75, -1.0], undefined, [0.3, 0.2, 0.02]);
  },
  // ---------- ימי הביניים והרנסנס ----------
  swordStone(b) {
    b.dod(0.75, C.stone, [0, 0.45, 0], [1.3, 0.7, 1.1]);
    b.box(0.1, 1.2, 0.03, C.silver, [0, 1.35, 0], undefined, true).box(0.5, 0.07, 0.07, C.gold, [0, 1.95, 0]).box(0.06, 0.32, 0.06, C.dwood, [0, 2.14, 0]).sph(0.06, C.gold, [0, 2.32, 0]);
    b.tree(-1.2, -0.6, 1.5).tree(1.2, -0.4, 1.3);
  },
  keep(b) {
    b.box(1.5, 2.0, 1.5, C.lstone, [0, 1.0, 0]);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; const x = Math.cos(a) * 1.0, z = Math.sin(a) * 1.0; b.cyl(0.3, 0.32, 2.4, C.stone, [x, 1.2, z], 10).cone(0.38, 0.6, C.red, [x, 2.7, z], 10); }
    for (let i = 0; i < 4; i++) b.box(0.25, 0.22, 0.2, C.lstone, [-0.55 + i * 0.37, 2.1, 0.68]);
    b.box(0.4, 0.6, 0.05, C.dwood, [0, 0.3, 0.76]).flag(0, 2.0, 0, C.red);
  },
  moorishArch(b) {
    b.box(2.6, 0.12, 1.4, C.cream, [0, 0.06, 0]);
    for (let i = 0; i < 3; i++) { const x = -0.8 + i * 0.8; b.cyl(0.07, 0.08, 1.0, C.marble, [x - 0.33, 0.6, 0.3], 8).cyl(0.07, 0.08, 1.0, C.marble, [x + 0.33, 0.6, 0.3], 8); b.tor(0.33, 0.07, C.terra, [x, 1.15, 0.3], [0, 0, -0.35], Math.PI * 1.22); }
    b.box(2.4, 1.6, 0.3, C.cream, [0, 0.85, -0.25]).box(2.5, 0.12, 0.9, C.terra, [0, 1.62, 0.05]).box(0.5, 0.06, 0.5, C.turq, [0, 0.16, 0.65], undefined, true);
    b.cyl(0.18, 0.2, 2.4, C.cream, [1.25, 1.2, -0.3], 8).cone(0.22, 0.4, C.turq, [1.25, 2.6, -0.3], 8);
  },
  highlandTower(b) {
    b.cyl(0.6, 0.7, 2.4, C.stone, [0, 1.2, 0], 12).cone(0.75, 1.0, C.slate, [0, 2.9, 0], 12);
    b.box(1.1, 0.8, 0.8, C.lstone, [1.0, 0.4, 0.2]).prism(1.2, 0.5, 0.9, C.slate, [1.0, 0.8, 0.2]);
    b.box(0.5, 0.3, 0.02, C.red, [0, 2.0, 0.7]).box(0.5, 0.06, 0.03, C.green, [0, 2.0, 0.72]).box(0.06, 0.3, 0.03, C.green, [0, 2.0, 0.72]);
    b.dod(0.35, C.dstone, [-0.9, 0.2, 0.5]).dod(0.25, C.dstone, [-1.2, 0.15, -0.3]);
  },
  gothicSpire(b) {
    b.box(1.0, 1.6, 2.0, C.lstone, [0, 0.8, 0.1]).prism(1.05, 0.8, 2.05, C.slate, [0, 1.6, 0.1]);
    [-0.4, 0.4].forEach((x) => { b.box(0.45, 2.4, 0.45, C.lstone, [x, 1.2, 1.1]).cone(0.32, 1.5, C.slate, [x, 3.15, 1.1], 8); });
    b.cyl(0.28, 0.28, 0.04, C.violet, [0, 1.5, 1.34], 14, [Math.PI / 2, 0, 0], true).box(0.35, 0.6, 0.05, C.dwood, [0, 0.3, 1.34]);
  },
  rialto(b) {
    b.box(2.8, 0.1, 1.4, C.turq, [0, 0.02, 0]);
    b.tor(1.1, 0.2, C.marble, [0, 0.0, 0], [0, 0, 0], Math.PI, false, 20).box(2.2, 0.12, 0.9, C.marble, [0, 1.05, 0], [0, 0, 0]);
    b.box(0.8, 0.55, 0.85, C.cream, [0, 1.38, 0]).prism(0.85, 0.3, 0.9, C.terra, [0, 1.65, 0]);
    b.box(0.25, 0.08, 1.2, C.black, [1.0, 0.14, 0.95], [0, 0.2, 0]).cone(0.04, 0.3, C.black, [1.0, 0.3, 1.55], 4, [0.5, 0, 0]);
    b.cyl(0.04, 0.04, 1.2, C.red, [-1.2, 0.6, 0.8], 6).cyl(0.045, 0.045, 0.2, C.white, [-1.2, 0.8, 0.8], 6);
  },
  duomo(b) {
    b.cyl(0.95, 1.0, 1.0, C.cream, [0, 0.5, 0], 8).cyl(0.75, 0.78, 0.45, C.cream, [0, 1.22, 0], 8);
    b.sph(0.78, C.terra, [0, 1.45, 0], [1, 1.25, 1], 12);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.box(0.05, 0.9, 0.05, C.white, [Math.cos(a) * 0.62, 2.0, Math.sin(a) * 0.62], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]); }
    b.cyl(0.14, 0.16, 0.35, C.white, [0, 2.55, 0], 8).sph(0.08, C.gold, [0, 2.8, 0]);
    b.box(0.5, 2.6, 0.5, C.cream, [1.3, 1.3, -0.4]).box(0.56, 0.2, 0.56, C.terra, [1.3, 2.65, -0.4]);
  },
  ornithopter(b) {
    b.box(0.25, 0.25, 1.6, C.wood, [0, 1.2, 0]).cyl(0.04, 0.04, 1.2, C.dwood, [0, 0.6, 0], 6);
    b.box(0.9, 0.1, 0.8, C.dwood, [0, 0.05, 0]);
    [-1, 1].forEach((s) => { b.box(1.6, 0.03, 0.7, C.cream, [s * 0.9, 1.35, 0], [0, 0, s * 0.25]); for (let i = 0; i < 4; i++) b.box(0.03, 0.04, 0.7, C.dwood, [s * (0.3 + i * 0.4), 1.36 + i * 0.1, 0], [0, 0, s * 0.25]); });
    b.tor(0.35, 0.05, C.bronze, [0, 1.2, -0.9], [0, 0, 0]).box(0.05, 0.7, 0.05, C.dwood, [0, 1.2, -0.9]).box(0.7, 0.05, 0.05, C.dwood, [0, 1.2, -0.9]);
  },
  leaningTower(b) {
    const tilt = 0.09;
    for (let i = 0; i < 7; i++) { const y = 0.25 + i * 0.42; b.cyl(0.52, 0.55, 0.4, C.marble, [Math.sin(tilt) * y, y, 0], 14, [0, 0, -tilt]); b.tor(0.58, 0.03, C.cream, [Math.sin(tilt) * (y + 0.2), y + 0.2, 0], [Math.PI / 2, tilt, 0]); }
    b.cyl(0.38, 0.42, 0.35, C.marble, [Math.sin(tilt) * 3.2, 3.2, 0], 12, [0, 0, -tilt]);
    b.box(1.6, 0.1, 1.6, C.grass, [0, 0.03, 0]);
  },
  grandCastle(b) {
    b.box(2.6, 0.9, 2.0, C.lstone, [0, 0.45, 0]);
    for (let i = 0; i < 6; i++) { const x = -1.15 + (i % 3) * 1.15, z = i < 3 ? -0.85 : 0.85; b.cyl(0.3, 0.32, 1.8, C.stone, [x, 0.9, z], 10).cone(0.38, 0.7, C.blue, [x, 2.15, z], 10); }
    b.box(1.0, 2.4, 1.0, C.lstone, [0, 1.2, 0]).cone(0.7, 1.0, C.blue, [0, 2.9, 0], 4, [0, Math.PI / 4, 0]);
    b.tor(0.28, 0.06, C.gold, [0, 3.55, 0], [Math.PI / 2, 0, 0]); for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; b.cone(0.05, 0.2, C.gold, [Math.cos(a) * 0.28, 3.68, Math.sin(a) * 0.28], 4); }
    b.flag(-1.15, 2.4, -0.85, C.gold).flag(1.15, 2.4, -0.85, C.gold);
  },
  // ---------- עידן התעשייה ----------
  clockTower(b) {
    b.box(1.0, 2.8, 1.0, C.sand, [0, 1.4, 0]).box(1.15, 0.8, 1.15, C.sand, [0, 3.0, 0]);
    [[0, 0.59, 0], [0, -0.59, Math.PI], [0.59, 0, Math.PI / 2], [-0.59, 0, -Math.PI / 2]].forEach(([x, z, r]) => { b.cyl(0.32, 0.32, 0.04, C.cream, [x, 3.0, z], 16, [Math.PI / 2, 0, r], true); });
    b.box(0.02, 0.24, 0.02, C.black, [0, 3.08, 0.62]).box(0.16, 0.02, 0.02, C.black, [0.06, 3.0, 0.62]);
    b.cone(0.62, 1.1, C.slate, [0, 3.95, 0], 4, [0, Math.PI / 4, 0]).cyl(0.03, 0.03, 0.4, C.gold, [0, 4.6, 0], 6);
  },
  waterTower(b) {
    [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].forEach(([x, z]) => b.cyl(0.05, 0.06, 1.6, C.dwood, [x, 0.8, z], 6));
    b.cyl(0.62, 0.62, 0.9, C.wood, [0, 2.05, 0], 12).cone(0.7, 0.4, C.dwood, [0, 2.7, 0], 12).tor(0.63, 0.03, C.iron, [0, 1.8, 0], [Math.PI / 2, 0, 0]);
    b.box(1.2, 1.0, 0.7, C.wood, [1.2, 0.5, 0.4]).box(1.3, 0.35, 0.05, C.dwood, [1.2, 1.15, 0.76]).box(0.9, 0.18, 0.03, C.cream, [1.2, 1.15, 0.79]);
    b.cyl(0.12, 0.14, 0.9, C.green, [-1.1, 0.45, 0.6], 8).cyl(0.07, 0.08, 0.4, C.green, [-1.0, 0.6, 0.72], 6, [0.9, 0, 0]);
  },
  latticeTower(b) {
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; b.box(0.12, 2.0, 0.12, C.copper, [Math.cos(a) * 0.55, 0.95, Math.sin(a) * 0.55], [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]); }
    b.box(0.95, 0.1, 0.95, C.copper, [0, 0.95, 0]).box(0.55, 0.08, 0.55, C.copper, [0, 1.9, 0]);
    b.cyl(0.1, 0.22, 1.5, C.copper, [0, 2.65, 0], 4, [0, Math.PI / 4, 0]).cyl(0.02, 0.04, 0.6, C.copper, [0, 3.65, 0], 6);
    b.tor(0.35, 0.03, C.copper, [0, 0.55, 0.42], [0, 0, 0], Math.PI);
  },
  locomotive(b) {
    b.box(0.5, 0.06, 2.8, C.dwood, [-0.25, 0.03, 0]).box(0.5, 0.06, 2.8, C.dwood, [0.25, 0.03, 0]);
    b.cyl(0.42, 0.42, 1.5, C.dark, [0, 0.85, 0.35], 14, [Math.PI / 2, 0, 0]).box(0.95, 0.95, 0.7, C.red, [0, 0.95, -0.7]).box(1.05, 0.08, 0.8, C.dark, [0, 1.45, -0.7]);
    b.cyl(0.12, 0.17, 0.6, C.dark, [0, 1.55, 0.85], 10).cyl(0.18, 0.18, 0.08, C.gold, [0, 1.25, 0.6], 10);
    [-0.6, 0, 0.6].forEach((z) => { b.cyl(0.26, 0.26, 0.08, C.red, [-0.48, 0.32, z], 12, [0, 0, Math.PI / 2]).cyl(0.26, 0.26, 0.08, C.red, [0.48, 0.32, z], 12, [0, 0, Math.PI / 2]); });
    b.sph(0.18, C.flame, [0, 0.85, 1.1], [1, 1, 0.3], 10, true).sph(0.25, C.lstone, [0, 2.05, 0.85]).sph(0.32, C.lstone, [0.2, 2.45, 0.7]);
  },
  gearTower(b) {
    b.cyl(0.12, 0.12, 3.0, C.bronze, [0, 1.5, 0], 8);
    [[0.75, 0.6, 0], [0.55, 1.4, 0.3], [0.45, 2.1, -0.2], [0.32, 2.7, 0.1]].forEach(([r, y, rz]) => {
      b.cyl(r, r, 0.12, C.gold, [0, y, 0], 16, [0, rz, 0]);
      const n = Math.round(r * 14); for (let i = 0; i < n; i++) { const a = (i / n) * TAU; b.box(0.1, 0.12, 0.12, C.bronze, [Math.cos(a) * (r + 0.05), y, Math.sin(a) * (r + 0.05)], [0, -a, 0]); }
    });
    b.cyl(0.25, 0.25, 0.05, C.cream, [0, 3.0, 0.15], 14, [Math.PI / 2, 0, 0], true).box(0.6, 0.12, 0.6, C.bronze, [0, 0.06, 0]);
  },
  zeppelin(b) {
    b.cyl(0.08, 0.12, 2.8, C.iron, [-1.0, 1.4, 0], 6).box(0.3, 0.06, 0.3, C.iron, [-1.0, 2.8, 0]);
    b.sph(0.55, C.silver, [0.3, 2.6, 0], [3.2, 1, 1], 14).box(0.6, 0.25, 0.25, C.dwood, [0.3, 1.95, 0]);
    b.box(0.05, 0.5, 0.5, C.red, [1.95, 2.6, 0]).box(0.05, 0.5, 0.5, C.red, [1.95, 2.6, 0], [Math.PI / 2, 0, 0]);
    b.cyl(0.015, 0.015, 0.7, C.iron, [-0.6, 2.8, 0], 4, [0, 0, Math.PI / 2]);
  },
  mineCart(b) {
    b.box(0.15, 1.6, 0.15, C.wood, [-0.7, 0.8, -0.3]).box(0.15, 1.6, 0.15, C.wood, [0.7, 0.8, -0.3]).box(1.6, 0.18, 0.2, C.wood, [0, 1.6, -0.3]);
    b.dod(1.0, C.dstone, [0, 0.8, -0.95], [1.4, 0.9, 0.6]).box(1.1, 1.3, 0.1, C.black, [0, 0.65, -0.4]);
    b.box(0.25, 0.04, 2.0, C.iron, [-0.22, 0.02, 0.6]).box(0.25, 0.04, 2.0, C.iron, [0.22, 0.02, 0.6]);
    b.box(0.7, 0.45, 0.55, C.iron, [0, 0.4, 0.9]).sph(0.14, C.gold, [-0.12, 0.7, 0.9], [1, 0.8, 1], 6, true).sph(0.12, C.gold, [0.12, 0.72, 0.85], [1, 0.8, 1], 6, true);
  },
  teslaCoil(b) {
    b.box(1.2, 0.9, 1.0, C.brick, [-0.8, 0.45, -0.3]).prism(1.3, 0.5, 1.1, C.slate, [-0.8, 0.9, -0.3]);
    b.cyl(0.35, 0.45, 0.4, C.dark, [0.5, 0.2, 0.2], 10).cyl(0.18, 0.18, 1.8, C.copper, [0.5, 1.3, 0.2], 10);
    b.tor(0.42, 0.14, C.silver, [0.5, 2.3, 0.2], [Math.PI / 2, 0, 0]);
    b.box(0.05, 0.9, 0.05, C.sky, [0.95, 2.6, 0.2], [0, 0, -0.7], true).box(0.05, 0.7, 0.05, C.sky, [0.1, 2.7, 0.3], [0.3, 0, 0.8], true).box(0.04, 0.6, 0.04, C.white, [0.5, 2.85, 0.6], [0.7, 0, 0], true);
  },
  decoSkyscraper(b) {
    b.box(1.2, 1.6, 1.2, C.lstone, [0, 0.8, 0]).box(0.95, 1.2, 0.95, C.lstone, [0, 2.2, 0]).box(0.7, 0.7, 0.7, C.silver, [0, 3.15, 0]);
    b.cone(0.35, 0.6, C.silver, [0, 3.8, 0], 8).cyl(0.02, 0.03, 0.6, C.silver, [0, 4.35, 0], 6);
    for (let y = 0; y < 6; y++) for (let x = 0; x < 3; x++) b.box(0.15, 0.18, 0.02, C.flame, [-0.32 + x * 0.32, 0.35 + y * 0.5, 0.61 - (y > 2 ? 0.13 : 0)], undefined, true);
    b.box(1.25, 0.08, 1.25, C.gold, [0, 1.62, 0]).box(1.0, 0.08, 1.0, C.gold, [0, 2.82, 0]);
  },
  factory(b) {
    b.box(2.4, 1.1, 1.4, C.brick, [0, 0.55, 0]);
    for (let i = 0; i < 4; i++) b.prism(0.6, 0.4, 1.4, C.slate, [-0.9 + i * 0.6, 1.1, 0]);
    [-0.8, 0, 0.8].forEach((x, i) => { b.cyl(0.14, 0.2, 1.8 + i * 0.3, C.dark, [x, 1.9 + i * 0.15, -0.5], 10).sph(0.25, C.dstone, [x, 3.0 + i * 0.3, -0.5]); });
    for (let i = 0; i < 6; i++) b.box(0.22, 0.3, 0.02, C.fire, [-1.0 + i * 0.4, 0.55, 0.71], undefined, true);
    b.tor(0.4, 0.07, C.iron, [1.4, 0.6, 0.4], [0, Math.PI / 2, 0]);
  },
  // ---------- העתיד ----------
  neonTower(b) {
    b.box(0.9, 3.4, 0.9, C.navy, [0, 1.7, 0]).box(0.6, 0.6, 0.6, C.dark, [0, 3.7, 0]).cyl(0.02, 0.02, 0.8, C.silver, [0, 4.4, 0], 4);
    for (let i = 0; i < 5; i++) { b.box(0.94, 0.05, 0.94, i % 2 ? C.magenta : C.cyan, [0, 0.5 + i * 0.7, 0], undefined, true); }
    b.box(0.05, 1.4, 0.7, C.magenta, [0.5, 2.2, 0], undefined, true).box(0.7, 0.45, 0.05, C.cyan, [0, 2.8, 0.5], undefined, true);
    b.box(0.6, 1.4, 0.6, C.dark, [-0.95, 0.7, 0.4]).box(0.62, 0.05, 0.62, C.cyan, [-0.95, 1.2, 0.4], undefined, true);
  },
  marsDome(b) {
    b.hemi(1.0, C.sky, [-0.4, 0, 0], [1, 0.75, 1]).cyl(1.02, 1.02, 0.12, C.silver, [-0.4, 0.06, 0], 18);
    b.box(0.5, 0.35, 0.4, C.silver, [-0.4, 0.17, 0.0]).tree(-0.6, 0.2, 0.7, C.green);
    b.cyl(0.18, 0.2, 1.6, C.white, [1.0, 1.0, 0], 10).cone(0.18, 0.5, C.red, [1.0, 2.05, 0], 10);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; b.box(0.04, 0.4, 0.3, C.red, [1.0 + Math.cos(a) * 0.22, 0.35, Math.sin(a) * 0.22], [0, -a, 0]); }
    b.cone(0.12, 0.3, C.fire, [1.0, 0.05, 0], 8, [Math.PI, 0, 0], true);
  },
  orbitalRing(b) {
    b.cyl(0.08, 0.12, 1.6, C.silver, [0, 0.8, 0], 8);
    b.sph(0.35, C.white, [0, 2.0, 0]).tor(1.0, 0.12, C.silver, [0, 2.0, 0], [Math.PI / 2 - 0.35, 0, 0]);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; b.box(0.04, 0.04, 0.9, C.silver, [Math.cos(a) * 0.5, 2.0 + Math.sin(a) * 0.17, Math.sin(a) * 0.45], [0.35, a, 0]); }
    b.box(0.9, 0.03, 0.4, C.blue, [-0.9, 1.35, 0], [0, 0, 0.2]).box(0.9, 0.03, 0.4, C.blue, [0.9, 1.35, 0], [0, 0, -0.2]);
    b.sph(0.12, C.cyan, [0, 2.0, 0.36], [1, 1, 0.5], 8, true);
  },
  giantRobot(b) {
    b.box(0.35, 1.2, 0.4, C.steel, [-0.35, 0.6, 0]).box(0.35, 1.2, 0.4, C.steel, [0.35, 0.6, 0]);
    b.box(1.2, 1.1, 0.7, C.silver, [0, 1.75, 0]).box(0.5, 0.3, 0.05, C.cyan, [0, 1.8, 0.36], undefined, true);
    b.box(0.6, 0.5, 0.55, C.steel, [0, 2.6, 0]).box(0.45, 0.12, 0.05, C.red, [0, 2.65, 0.28], undefined, true).cyl(0.02, 0.02, 0.4, C.steel, [0.2, 3.0, 0], 4);
    [-1, 1].forEach((s) => { b.box(0.3, 0.9, 0.3, C.steel, [s * 0.78, 1.65, 0], [0, 0, s * 0.15]).box(0.35, 0.3, 0.35, C.dark, [s * 0.85, 1.1, 0]); });
  },
  holoTree(b) {
    b.cyl(0.12, 0.18, 1.6, C.dark, [0, 0.8, 0], 8);
    b.sph(0.8, C.cyan, [0, 2.2, 0], [1, 0.75, 1], 10, true).sph(0.45, C.magenta, [0.45, 2.55, 0.2], [1, 0.8, 1], 8, true);
    [-1.1, 1.1].forEach((x) => { b.box(0.7, 0.6, 0.6, C.navy, [x, 0.3, 0.5]).box(0.75, 0.06, 0.65, x < 0 ? C.magenta : C.cyan, [x, 0.65, 0.5], undefined, true); });
  },
  radarDish(b) {
    b.box(1.2, 0.8, 0.9, C.white, [-0.7, 0.4, 0.2]).box(1.25, 0.12, 0.95, C.snow, [-0.7, 0.86, 0.2]);
    b.cyl(0.08, 0.12, 1.4, C.steel, [0.6, 0.7, -0.2], 8);
    b.add(new THREE.SphereGeometry(0.85, 16, 8, 0, TAU, 0, Math.PI / 3.2), C.white, [0.6, 1.25, -0.2], [-0.9, 0, 0], [1, 0.5, 1]);
    b.cyl(0.02, 0.02, 0.7, C.steel, [0.6, 1.6, 0.2], 4, [-0.9, 0, 0]).sph(0.06, C.red, [0.6, 1.85, 0.5], undefined, 6, true);
  },
  solarTower(b) {
    b.cyl(0.2, 0.3, 3.0, C.lstone, [0, 1.5, 0], 10).cyl(0.35, 0.35, 0.4, C.flame, [0, 3.1, 0], 10, undefined, true);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; b.box(0.45, 0.03, 0.3, C.sky, [Math.cos(a) * 1.25, 0.35, Math.sin(a) * 1.25], [0.6, -a, 0]); b.cyl(0.02, 0.02, 0.3, C.steel, [Math.cos(a) * 1.25, 0.15, Math.sin(a) * 1.25], 4); }
  },
  floatingCity(b) {
    b.cone(1.1, 1.4, C.dstone, [0, 1.0, 0], 8, [Math.PI, 0, 0]).cyl(1.1, 1.1, 0.15, C.grass, [0, 1.75, 0], 12);
    b.box(0.4, 1.0, 0.4, C.white, [-0.4, 2.3, 0.1]).box(0.35, 0.7, 0.35, C.sky, [0.35, 2.2, -0.2]).cyl(0.2, 0.2, 1.3, C.white, [0.1, 2.45, 0.5], 10).sph(0.22, C.cyan, [0.1, 3.15, 0.5], undefined, 8, true);
    b.cone(0.2, 0.6, C.cyan, [0, 0.0, 0], 8, [Math.PI, 0, 0], true);
  },
  dataCube(b) {
    b.cyl(0.9, 1.0, 0.15, C.navy, [0, 0.08, 0], 4, [0, Math.PI / 4, 0]);
    const y = 1.6, s = 0.7;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.05, s * 2, 0.05, C.cyan, [dx * s, y, dz * s], undefined, true);
    for (const dy of [-1, 1]) { b.box(s * 2, 0.05, 0.05, C.cyan, [0, y + dy * s, s], undefined, true).box(s * 2, 0.05, 0.05, C.cyan, [0, y + dy * s, -s], undefined, true).box(0.05, 0.05, s * 2, C.cyan, [s, y + dy * s, 0], undefined, true).box(0.05, 0.05, s * 2, C.cyan, [-s, y + dy * s, 0], undefined, true); }
    b.box(0.6, 0.6, 0.6, C.magenta, [0, y, 0], [0.6, 0.6, 0], true);
  },
  aiCore(b) {
    b.cyl(1.1, 1.2, 0.3, C.dark, [0, 0.15, 0], 12);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; b.box(0.2, 2.4, 0.2, C.steel, [Math.cos(a) * 0.95, 1.4, Math.sin(a) * 0.95]); }
    b.sph(0.6, C.cyan, [0, 1.7, 0], undefined, 14, true).tor(0.85, 0.06, C.magenta, [0, 1.7, 0], [Math.PI / 2, 0, 0], TAU, true).tor(0.95, 0.05, C.silver, [0, 1.7, 0], [0.5, 0, 0.3]);
  },
  // ---------- המזרח הרחוק ----------
  torii(b) {
    [-0.75, 0.75].forEach((x) => b.cyl(0.1, 0.12, 2.2, C.red, [x, 1.1, 0], 10));
    b.box(2.3, 0.16, 0.24, C.black, [0, 2.25, 0], [0, 0, 0]).box(1.9, 0.12, 0.18, C.red, [0, 1.85, 0]).box(0.12, 0.4, 0.12, C.red, [0, 2.05, 0]);
    [-1.3, 1.3].forEach((x) => { b.cyl(0.08, 0.1, 0.5, C.lstone, [x, 0.25, 0.8], 6).box(0.3, 0.25, 0.3, C.lstone, [x, 0.6, 0.8]).box(0.18, 0.12, 0.18, C.flame, [x, 0.6, 0.8], undefined, true).roof4(0.38, 0.2, C.lstone, 0.72, x, 0.8); });
    b.cyl(0.08, 0.12, 0.9, C.dwood, [1.2, 0.45, -0.7], 6).sph(0.6, C.pink, [1.2, 1.25, -0.7], [1, 0.75, 1]);
  },
  pagoda(b) {
    for (let i = 0; i < 5; i++) { const w = 1.1 - i * 0.16, y = 0.15 + i * 0.62; b.box(w * 0.7, 0.42, w * 0.7, C.red, [0, y + 0.21, 0]).roof4(w * 1.25, 0.3, C.dark, y + 0.4); }
    b.cyl(0.03, 0.05, 0.9, C.gold, [0, 3.65, 0], 6); for (let i = 0; i < 4; i++) b.tor(0.08, 0.02, C.gold, [0, 3.4 + i * 0.15, 0], [Math.PI / 2, 0, 0]);
  },
  greatWall(b) {
    for (let i = 0; i < 4; i++) { const x = -1.3 + i * 0.85, z = i % 2 ? 0.25 : -0.25; b.box(0.9, 0.6 + i * 0.12, 0.45, C.stone, [x, 0.3 + i * 0.06, z], [0, i % 2 ? 0.4 : -0.4, 0]); for (let k = 0; k < 3; k++) b.box(0.14, 0.14, 0.12, C.stone, [x - 0.28 + k * 0.28, 0.68 + i * 0.12, z + 0.18], [0, i % 2 ? 0.4 : -0.4, 0]); }
    b.box(0.8, 1.4, 0.8, C.lstone, [0.9, 0.7, -0.4]).roof4(0.95, 0.5, C.dark, 1.4, 0.9, -0.4);
  },
  chineseGate(b) {
    b.box(2.6, 1.2, 0.8, C.red, [0, 0.6, 0]).box(0.7, 0.8, 0.1, C.dark, [0, 0.4, 0.42]);
    b.box(2.9, 0.12, 1.1, C.gold, [0, 1.25, 0]).prism(2.4, 0.6, 1.0, C.gold, [0, 1.3, 0]);
    b.box(1.6, 0.5, 0.6, C.red, [0, 2.15, 0]).box(2.0, 0.1, 0.9, C.gold, [0, 2.45, 0]).prism(1.6, 0.45, 0.8, C.gold, [0, 2.5, 0]);
    for (let i = 0; i < 6; i++) b.cyl(0.07, 0.07, 1.1, C.red, [-1.1 + i * 0.44, 0.55, 0.48], 6);
  },
  yurt(b) {
    b.cyl(0.9, 0.95, 0.8, C.cream, [0, 0.4, 0], 14).cone(1.05, 0.6, C.white, [0, 1.1, 0], 14).cyl(0.15, 0.15, 0.08, C.wood, [0, 1.42, 0], 10);
    b.box(0.4, 0.55, 0.05, C.red, [0, 0.3, 0.93]).tor(0.92, 0.03, C.red, [0, 0.62, 0], [Math.PI / 2, 0, 0]);
    b.cyl(0.03, 0.03, 2.2, C.dwood, [1.3, 1.1, 0.2], 6).box(0.06, 0.6, 0.06, C.straw, [1.3, 2.0, 0.2]);
    b.box(0.3, 0.35, 0.8, C.fur, [-1.3, 0.55, 0.3]).box(0.15, 0.35, 0.3, C.fur, [-1.3, 0.85, 0.75], [-0.5, 0, 0]);
    [[-1.42, 0], [-1.18, 0], [-1.42, 0.6], [-1.18, 0.6]].forEach(([x, z]) => b.cyl(0.04, 0.04, 0.4, C.fur, [x, 0.2, z], 5));
  },
  bellPavilion(b) {
    b.box(1.8, 0.2, 1.8, C.lstone, [0, 0.1, 0]);
    [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach(([x, z]) => b.cyl(0.08, 0.09, 1.5, C.red, [x, 0.95, z], 8));
    b.roof4(2.2, 0.7, C.green, 1.7).box(1.6, 0.12, 1.6, C.jade, [0, 1.72, 0]);
    b.cyl(0.32, 0.42, 0.75, C.bronze, [0, 1.1, 0], 12).cyl(0.03, 0.03, 0.3, C.dwood, [0, 1.6, 0], 4);
  },
  camel(b) {
    b.sph(0.6, C.sand, [0, 1.25, 0], [0.75, 0.6, 1.2]).sph(0.32, C.sand, [0, 1.65, -0.2]).sph(0.28, C.sand, [0, 1.6, 0.35]);
    [[-0.22, -0.45], [0.22, -0.45], [-0.22, 0.45], [0.22, 0.45]].forEach(([x, z]) => b.cyl(0.07, 0.06, 1.0, C.sand, [x, 0.5, z], 6));
    b.cyl(0.1, 0.12, 0.7, C.sand, [0, 1.5, 0.85], 6, [0.6, 0, 0]).box(0.2, 0.2, 0.4, C.sand, [0, 1.8, 1.15]);
    b.box(0.3, 0.3, 0.3, C.red, [-0.45, 1.15, 0]).box(0.3, 0.3, 0.3, C.blue, [0.45, 1.15, 0]);
    b.palm(1.2, -0.6, 1.1);
  },
  khmerTemple(b) {
    b.box(2.4, 0.3, 2.4, C.stone, [0, 0.15, 0]).box(1.8, 0.3, 1.8, C.stone, [0, 0.45, 0]).box(1.2, 0.3, 1.2, C.stone, [0, 0.75, 0]);
    const tower = (x, z, h) => { for (let i = 0; i < 4; i++) b.sph(0.32 - i * 0.06, C.stone, [x, 0.9 + h * 0.2 + i * 0.32 * h, z], [1, 0.8, 1], 8); b.cone(0.1, 0.35, C.stone, [x, 0.9 + h * 1.5, z], 6); };
    tower(0, 0, 1.4); tower(-0.7, -0.7, 0.9); tower(0.7, -0.7, 0.9); tower(-0.7, 0.7, 0.9); tower(0.7, 0.7, 0.9);
    b.tree(-1.4, 0.9, 1.3, C.green).tree(1.4, -1.0, 1.4, C.green);
  },
  stupa(b) {
    b.box(1.8, 0.35, 1.8, C.white, [0, 0.18, 0]).box(1.4, 0.2, 1.4, C.white, [0, 0.45, 0]);
    b.hemi(0.75, C.white, [0, 0.55, 0], [1, 0.9, 1]).box(0.4, 0.3, 0.4, C.gold, [0, 1.35, 0]);
    for (let i = 0; i < 6; i++) b.cyl(0.18 - i * 0.025, 0.2 - i * 0.025, 0.1, C.gold, [0, 1.58 + i * 0.13, 0], 10);
    b.box(0.25, 0.08, 0.02, C.blue, [0, 1.35, 0.21]).sph(0.05, C.black, [0, 1.36, 0.22], undefined, 6);
    const fl = [C.blue, C.white, C.red, C.green, C.gold];
    for (let i = 0; i < 10; i++) b.box(0.12, 0.08, 0.01, fl[i % 5], [-1.2 + i * 0.26, 1.2 - Math.abs(i - 4.5) * 0.06, 0.95]);
  },
  japaneseCastle(b) {
    b.box(2.2, 0.8, 1.8, C.stone, [0, 0.4, 0]);
    [[1.7, 0.6, 1.4], [1.3, 0.55, 1.05], [0.9, 0.5, 0.75]].forEach(([w, h, d], i) => { const y = 0.8 + i * 0.85; b.box(w, h, d, C.white, [0, y + h / 2, 0]).roof4(w * 1.3, 0.35, C.dark, y + h); });
    b.box(0.08, 0.2, 0.25, C.gold, [-0.45, 3.4, 0]).box(0.08, 0.2, 0.25, C.gold, [0.45, 3.4, 0]);
    b.cyl(0.08, 0.12, 0.9, C.dwood, [-1.3, 0.45, 1.0], 6).sph(0.5, C.pink, [-1.3, 1.15, 1.0], [1, 0.75, 1]);
  },
  // ---------- המזרח הקדום ומצרים ----------
  ziggurat(b) {
    [[2.6, 0.5], [2.0, 0.5], [1.4, 0.5], [0.8, 0.45]].forEach(([w, h], i) => b.box(w, h, w, i % 2 ? C.terra : C.sand, [0, i * 0.5 + h / 2, 0]));
    b.box(0.5, 1.2, 1.4, C.sand, [0, 0.55, 1.1], [-0.6, 0, 0]).box(0.5, 0.4, 0.5, C.blue, [0, 2.15, 0]);
  },
  ishtarGate(b) {
    b.box(2.6, 2.0, 0.8, C.lapis, [0, 1.0, 0]).box(0.8, 1.3, 0.85, C.dark, [0, 0.65, 0]).tor(0.4, 0.08, C.gold, [0, 1.3, 0.42], [0, 0, 0], Math.PI);
    [-1.1, 1.1].forEach((x) => b.box(0.6, 2.5, 0.9, C.lapis, [x, 1.25, 0]));
    for (let i = 0; i < 9; i++) b.box(0.18, 0.18, 0.18, C.lapis, [-1.25 + i * 0.31, i % 2 ? 2.6 : 2.1, 0]);
    for (let i = 0; i < 4; i++) b.box(0.28, 0.14, 0.02, C.gold, [i < 2 ? -1.15 + i * 0.2 : 0.95 + (i - 2) * 0.2, 1.4 - (i % 2) * 0.45, 0.46]);
  },
  obelisk(b) {
    b.box(0.9, 0.3, 0.9, C.sand, [0, 0.15, 0]).cyl(0.18, 0.32, 3.0, C.rose, [0, 1.8, 0], 4, [0, Math.PI / 4, 0]).cone(0.2, 0.35, C.gold, [0, 3.45, 0], 4, [0, Math.PI / 4, 0]);
    for (let i = 0; i < 5; i++) b.box(0.08, 0.12, 0.02, C.dark, [0, 0.8 + i * 0.45, 0.2]);
    b.palm(-1.2, 0.4, 1.2).palm(1.2, -0.5, 1.0);
  },
  sphinx(b) {
    b.box(2.4, 0.3, 1.4, C.sand, [0, 0.15, 0]);
    b.box(0.9, 0.7, 1.8, C.sand, [0, 0.65, -0.1]).box(0.25, 0.2, 0.9, C.sand, [-0.3, 0.4, 0.95]).box(0.25, 0.2, 0.9, C.sand, [0.3, 0.4, 0.95]);
    b.box(0.6, 0.9, 0.55, C.sand, [0, 1.35, 0.7]).box(0.85, 0.75, 0.3, C.gold, [0, 1.35, 0.5]);
    for (let i = 0; i < 4; i++) b.box(0.86, 0.06, 0.32, C.blue, [0, 1.1 + i * 0.18, 0.5]);
    b.box(0.4, 0.45, 0.1, C.sand, [0, 1.4, 0.98]).box(0.1, 0.3, 0.1, C.sand, [0, 0.95, 0.98]);
  },
  rockTemple(b) {
    b.box(2.8, 2.0, 0.8, C.sand, [0, 1.0, -0.3]);
    for (let i = 0; i < 4; i++) { const x = -1.05 + i * 0.7; b.box(0.45, 0.8, 0.5, C.sand, [x, 0.4, 0.3]).box(0.4, 0.5, 0.4, C.sand, [x, 1.05, 0.25]).box(0.3, 0.35, 0.3, C.gold, [x, 1.45, 0.25]); }
    b.box(0.5, 0.9, 0.1, C.black, [0, 0.45, 0.12]).box(2.8, 0.15, 0.85, C.terra, [0, 2.05, -0.3]);
    b.cone(0.12, 0.35, C.fire, [-1.4, 0.2, 0.7], 6, undefined, true).cone(0.12, 0.35, C.fire, [1.4, 0.2, 0.7], 6, undefined, true);
  },
  persianColumns(b) {
    b.box(2.6, 0.3, 1.6, C.lstone, [0, 0.15, 0]).box(1.0, 0.25, 0.6, C.lstone, [0, 0.05, 1.0]);
    for (let i = 0; i < 4; i++) { const x = -0.95 + i * 0.63, h = i === 2 ? 1.4 : 2.4; b.cyl(0.12, 0.15, h, C.lstone, [x, 0.3 + h / 2, 0], 10); if (h > 2) b.box(0.55, 0.3, 0.25, C.dstone, [x, 2.85, 0]).box(0.12, 0.2, 0.25, C.dstone, [x - 0.25, 3.05, 0]).box(0.12, 0.2, 0.25, C.dstone, [x + 0.25, 3.05, 0]); }
    b.box(1.6, 0.18, 0.4, C.lstone, [-0.65, 3.05, 0]);
  },
  petraFacade(b) {
    b.box(3.0, 3.2, 0.9, C.rose, [0, 1.6, -0.4]);
    b.row(4, -0.9, 0.9, 0.15, 0.08, 1.2, C.rose, 0.1).box(2.2, 0.15, 0.3, C.rose, [0, 1.38, 0.15]).prism(2.2, 0.4, 0.3, C.rose, [0, 1.45, 0.15]);
    b.row(2, -0.55, 0.55, 0.15, 0.07, 0.9, C.rose, 1.9).cyl(0.3, 0.3, 0.9, C.rose, [0, 2.35, 0.15], 10).cone(0.3, 0.3, C.rose, [0, 2.95, 0.15], 10);
    b.box(0.45, 0.9, 0.05, C.black, [0, 0.55, 0.06]);
  },
  nubianPyramids(b) {
    [[-0.75, 0.2, 1.0, 2.4], [0.3, -0.4, 0.85, 2.0], [1.0, 0.6, 0.6, 1.5]].forEach(([x, z, w, h]) => { b.cone(w * 0.6, h, C.terra, [x, h / 2, z], 4, [0, Math.PI / 4, 0]); b.box(0.3, 0.45, 0.25, C.sand, [x, 0.22, z + w * 0.45]); });
  },
  tradeShip(b) {
    b.ship(2.4, C.wood, C.purple, 0, 0, 1);
    for (let i = 0; i < 5; i++) { b.box(0.7, 0.03, 0.04, C.dwood, [-0.55, 0.2, -0.6 + i * 0.3], [0, 0, 0.5]); b.box(0.7, 0.03, 0.04, C.dwood, [0.55, 0.2, -0.6 + i * 0.3], [0, 0, -0.5]); }
    b.box(0.5, 0.25, 0.4, C.terra, [0, 0.55, -0.6]).cyl(0.12, 0.15, 0.3, C.terra, [0.2, 0.55, 0.3], 8);
  },
  pyramid(b) {
    b.cone(1.6, 2.6, C.sand, [0, 1.3, -0.2], 4, [0, Math.PI / 4, 0]).cone(0.32, 0.5, C.gold, [0, 2.38, -0.2], 4, [0, Math.PI / 4, 0]);
    b.cone(0.6, 1.0, C.sand, [1.4, 0.5, 0.9], 4, [0, Math.PI / 4, 0]).cone(0.45, 0.75, C.sand, [-1.4, 0.37, 1.0], 4, [0, Math.PI / 4, 0]);
  },
  // ---------- הצפון ----------
  runeStone(b) {
    b.box(0.8, 2.6, 0.35, C.stone, [0, 1.3, 0], [0, 0, 0.04]);
    for (let i = 0; i < 6; i++) b.box(0.06, 0.3, 0.02, C.cyan, [-0.2 + (i % 3) * 0.2, 0.7 + Math.floor(i / 3) * 0.9, 0.19], [0, 0, (i % 2 ? 0.4 : -0.4)], true);
    b.dod(0.35, C.dstone, [-0.9, 0.25, 0.4]).box(0.45, 1.2, 0.25, C.stone, [0.95, 0.6, -0.3], [0, 0.3, -0.06]);
  },
  longhouse(b) {
    b.box(1.3, 0.8, 2.4, C.wood, [0, 0.4, 0]).prism(1.6, 0.9, 2.6, C.dwood, [0, 0.8, 0]).prism(1.4, 0.15, 2.5, C.snow, [0, 1.62, 0]);
    b.box(0.08, 0.5, 0.08, C.dwood, [0, 1.85, 1.28], [0.4, 0, 0]).box(0.08, 0.5, 0.08, C.dwood, [0, 1.85, -1.28], [-0.4, 0, 0]);
    b.box(0.4, 0.55, 0.05, C.dwood, [0, 0.28, 1.21]).cyl(0.05, 0.06, 0.5, C.dstone, [0.4, 1.6, -0.6], 6).sph(0.15, C.lstone, [0.4, 2.0, -0.6]);
  },
  longship(b) {
    b.ship(2.6, C.dwood, C.red, 0, 0, 1);
    for (let i = 0; i < 4; i++) b.box(0.42, 0.06, 0.02, C.white, [0, 1.35 + i * 0.25, 0.02]);
    for (let i = 0; i < 5; i++) { const z = -0.8 + i * 0.4; b.cyl(0.15, 0.15, 0.04, i % 2 ? C.gold : C.blue, [0.43, 0.35, z], 10, [0, 0, Math.PI / 2]).cyl(0.15, 0.15, 0.04, i % 2 ? C.blue : C.gold, [-0.43, 0.35, z], 10, [0, 0, Math.PI / 2]); }
    b.box(0.12, 0.6, 0.12, C.dwood, [0, 0.75, 1.5], [0.5, 0, 0]).box(0.2, 0.2, 0.35, C.dwood, [0, 1.05, 1.68]);
  },
  druidOak(b) {
    b.cyl(0.25, 0.4, 1.6, C.dwood, [0, 0.8, 0], 8).sph(1.0, C.leaf, [0, 2.1, 0], [1.2, 0.85, 1.2]).sph(0.6, C.green, [0.6, 2.5, 0.3]).sph(0.6, C.green, [-0.6, 2.4, -0.3]);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; b.box(0.22, 0.6, 0.2, C.stone, [Math.cos(a) * 1.35, 0.3, Math.sin(a) * 1.35], [0, -a, 0]); }
    b.sph(0.12, C.flame, [0.3, 1.7, 0.75], undefined, 6, true).sph(0.1, C.flame, [-0.5, 1.9, 0.6], undefined, 6, true);
  },
  ravenTotem(b) {
    b.cyl(0.25, 0.3, 2.4, C.dwood, [0, 1.2, 0], 8).box(0.5, 0.45, 0.5, C.black, [0, 2.6, 0]).cone(0.12, 0.4, C.dstone, [0, 2.55, 0.42], 4, [Math.PI / 2, 0, 0]);
    b.box(1.6, 0.12, 0.35, C.black, [0, 2.3, -0.1], [0, 0, 0.18]).box(1.6, 0.12, 0.35, C.black, [0, 2.3, -0.1], [0, 0, -0.18]);
    b.sph(0.05, C.flame, [-0.15, 2.7, 0.26], undefined, 6, true).sph(0.05, C.flame, [0.15, 2.7, 0.26], undefined, 6, true);
    b.tree(-1.2, -0.6, 1.6, C.dark).tree(1.2, -0.4, 1.4, C.dark);
  },
  meadHall(b) {
    b.box(1.8, 1.0, 2.6, C.wood, [0, 0.5, 0]).prism(2.2, 1.1, 2.8, C.dwood, [0, 1.0, 0]).prism(1.9, 0.18, 2.7, C.snow, [0, 2.0, 0]);
    [-0.5, 0.5].forEach((x) => b.cyl(0.08, 0.1, 1.2, C.gold, [x, 0.6, 1.4], 8));
    b.box(0.6, 0.75, 0.05, C.fire, [0, 0.38, 1.31], undefined, true).box(0.1, 0.6, 0.1, C.dwood, [0, 2.25, 1.4], [0.4, 0, 0]).box(0.1, 0.6, 0.1, C.dwood, [0, 2.25, -1.4], [-0.4, 0, 0]);
  },
  iceSpires(b) {
    [[0, 0, 3.2, 0.42], [-0.6, 0.3, 2.2, 0.32], [0.65, -0.2, 2.5, 0.35], [0.3, 0.7, 1.5, 0.25], [-0.4, -0.6, 1.8, 0.28]].forEach(([x, z, h, r], i) => b.oct(r, i ? C.ice : C.sky, [x, h / 2, z], [1, h / (r * 2), 1], i === 0));
    b.dod(0.9, C.snow, [0, 0.1, 0], [1.6, 0.3, 1.4]);
  },
  geyser(b) {
    b.dod(1.1, C.dstone, [0, 0.2, 0], [1.3, 0.45, 1.2]).cyl(0.35, 0.35, 0.1, C.turq, [0, 0.62, 0], 12, undefined, true);
    b.cyl(0.18, 0.28, 2.4, C.white, [0, 1.85, 0], 10, undefined, true).sph(0.5, C.white, [0, 3.2, 0], [1.3, 0.8, 1.3], 10, true);
    b.sph(0.4, C.lstone, [0.6, 2.6, 0.2]).sph(0.35, C.lstone, [-0.5, 2.9, -0.2]);
  },
  hammer(b) {
    b.dod(0.9, C.stone, [0, 0.4, 0], [1.3, 0.6, 1.2]);
    b.cyl(0.1, 0.1, 1.4, C.dwood, [0, 1.6, 0], 8).box(1.2, 0.6, 0.6, C.silver, [0, 0.95, 0]).box(0.2, 0.62, 0.62, C.gold, [0, 0.95, 0]);
    b.box(0.06, 0.8, 0.04, C.sky, [0.4, 2.6, 0], [0, 0, 0.5], true).box(0.06, 0.6, 0.04, C.sky, [0.6, 2.1, 0], [0, 0, -0.4], true).box(0.05, 0.7, 0.04, C.white, [-0.4, 2.5, 0.1], [0, 0, -0.5], true);
  },
  valhallaGate(b) {
    [-1.0, 1.0].forEach((x) => b.box(0.4, 2.8, 0.4, C.dwood, [x, 1.4, 0]));
    for (let i = 0; i < 7; i++) b.cyl(0.32, 0.32, 0.06, C.gold, [-1.05 + i * 0.35, 2.95, 0], 12, [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 6; i++) b.cyl(0.025, 0.025, 2.4, C.silver, [-1.0 + i * 0.4, 3.3, -0.1], 5, [0, 0, Math.PI / 2 + (i % 2 ? 0.3 : -0.3)]);
    b.prism(2.8, 0.7, 0.6, C.gold, [0, 3.1, 0]).box(1.5, 0.3, 0.1, C.cyan, [0, 2.4, 0.15], undefined, true);
  },
  // ---------- הים והאגדות ----------
  coralPalace(b) {
    b.dod(1.0, C.sand, [0, 0.1, 0], [1.4, 0.3, 1.3]).hemi(0.7, C.pearl, [0, 0.35, -0.2], [1, 1.2, 1]).cone(0.12, 0.6, C.gold, [0, 1.45, -0.2], 6);
    [[-0.9, 0.4, C.coral, 1.4], [0.9, 0.3, C.pink, 1.2], [-0.5, 0.9, C.violet, 1.0], [0.6, 0.85, C.coral, 0.9], [1.1, -0.5, C.turq, 1.3]].forEach(([x, z, c, h]) => { b.cone(0.12, h, c, [x, h / 2, z], 6); b.cone(0.08, h * 0.6, c, [x + 0.15, h * 0.55, z], 6, [0, 0, -0.5]); });
    b.sph(0.08, C.cyan, [0.2, 1.0, 0.5], undefined, 6, true);
  },
  giantShell(b) {
    b.add(new THREE.SphereGeometry(1.0, 16, 6, 0, Math.PI, 0, Math.PI / 2), C.pink, [0, 0.15, 0], [-Math.PI / 2 + 0.3, 0, 0], [1, 1, 0.3]);
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.1 + (i / 6) * 0.8); b.box(0.05, 0.9, 0.06, C.coral, [Math.cos(a) * 0.45, 0.2 + Math.sin(a) * 0.45, -0.1], [0, 0, a - Math.PI / 2]); }
    b.sph(0.35, C.pearl, [0, 0.45, 0.45], undefined, 14, true).dod(0.8, C.sand, [0, 0.05, 0.2], [1.4, 0.2, 1.1]);
  },
  pirateShip(b) {
    b.ship(2.6, C.dwood, C.black, 0, 0, 2);
    b.box(0.95, 0.4, 0.6, C.dwood, [0, 0.62, -1.1]).box(0.2, 0.15, 0.02, C.white, [0.1, 2.25, -0.49]);
    for (let i = 0; i < 3; i++) { b.cyl(0.05, 0.05, 0.3, C.dark, [0.5, 0.42, -0.5 + i * 0.5], 6, [0, 0, Math.PI / 2]).cyl(0.05, 0.05, 0.3, C.dark, [-0.5, 0.42, -0.5 + i * 0.5], 6, [0, 0, Math.PI / 2]); }
    b.flag(0, 2.6, -0.49, C.black, C.dwood);
  },
  sunkenTemple(b) {
    b.box(2.2, 0.4, 2.2, C.lstone, [0, 0.2, 0], [0.08, 0, 0.05]).box(1.6, 0.4, 1.6, C.lstone, [0, 0.6, 0], [0.08, 0, 0.05]).box(1.0, 0.8, 1.0, C.lstone, [0, 1.2, 0], [0.08, 0, 0.05]);
    b.box(0.4, 0.5, 0.05, C.dark, [0, 1.1, 0.53], [0.08, 0, 0.05]).cone(0.5, 0.5, C.jade, [0, 1.85, 0.05], 4, [0, Math.PI / 4, 0]);
    for (let i = 0; i < 5; i++) b.box(0.05, 0.8, 0.05, C.green, [-0.9 + i * 0.45, 0.6, 1.1], [0.3, 0, (i - 2) * 0.1]);
    b.tree(1.4, 0.6, 1.3, C.green);
  },
  submarine(b) {
    b.sph(0.55, C.bronze, [0, 1.0, 0], [0.9, 0.9, 2.6], 14).box(0.45, 0.55, 0.9, C.bronze, [0, 1.6, -0.2]);
    for (let i = 0; i < 4; i++) b.cyl(0.1, 0.1, 0.04, C.cyan, [0.5, 1.05, -0.8 + i * 0.5], 10, [0, 0, Math.PI / 2], true);
    b.box(0.04, 0.6, 0.3, C.copper, [0, 1.0, -1.5]).box(1.2, 0.04, 0.3, C.copper, [0, 1.0, -1.25]).cyl(0.04, 0.04, 0.3, C.copper, [0, 2.0, -0.1], 6);
    b.box(1.2, 0.2, 0.4, C.dstone, [0, 0.1, 0.6]).box(1.2, 0.2, 0.4, C.dstone, [0, 0.1, -0.6]).box(0.08, 0.5, 0.08, C.iron, [0, 0.4, 0.6]).box(0.08, 0.5, 0.08, C.iron, [0, 0.4, -0.6]);
  },
  kraken(b) {
    b.dod(0.9, C.dstone, [0, 0.1, 0], [1.5, 0.4, 1.4]).sph(0.55, C.purple, [0, 0.9, -0.3], [1, 1.2, 1]);
    b.sph(0.12, C.flame, [-0.2, 1.05, 0.15], undefined, 8, true).sph(0.12, C.flame, [0.2, 1.05, 0.15], undefined, 8, true);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; for (let i = 0; i < 6; i++) { const t = i / 5; b.sph(0.16 - t * 0.1, C.purple, [Math.cos(a) * (0.6 + t * 0.6), 0.3 + Math.sin(t * Math.PI) * 1.4 + t * 0.4, Math.sin(a) * (0.6 + t * 0.6)], undefined, 7); } }
  },
  sirenRock(b) {
    b.dod(1.0, C.stone, [0, 0.4, 0], [1.3, 0.8, 1.1]).dod(0.5, C.dstone, [0.6, 1.1, -0.2]);
    b.tor(0.4, 0.06, C.gold, [-0.3, 1.45, 0.3], [0, 0, 0.2], Math.PI * 1.4);
    for (let i = 0; i < 4; i++) b.box(0.015, 0.55, 0.015, C.white, [-0.5 + i * 0.13, 1.45, 0.3]);
    b.add(new THREE.SphereGeometry(0.25, 10, 5, 0, Math.PI, 0, Math.PI / 2), C.pink, [0.8, 0.15, 0.8], [-Math.PI / 2, 0, 0], [1, 1, 0.3]).sph(0.06, C.pearl, [0.8, 0.25, 0.85], undefined, 6, true);
  },
  shipwreck(b) {
    b.box(0.8, 0.5, 2.2, C.dwood, [0.1, 0.3, 0], [0.15, 0.3, 0.45]).box(0.6, 0.15, 1.6, C.dwood, [0.1, 0.62, 0], [0.15, 0.3, 0.45]);
    b.cyl(0.04, 0.05, 1.5, C.dwood, [0.3, 1.2, 0.2], 6, [0.2, 0, 0.7]).box(0.6, 0.45, 0.02, C.cream, [0.75, 1.5, 0.2], [0, 0, 0.7]);
    b.cyl(0.18, 0.18, 0.35, C.wood, [-0.9, 0.18, 0.7], 10).cyl(0.16, 0.16, 0.3, C.wood, [-1.2, 0.15, 0.2], 10, [Math.PI / 2, 0, 0]).dod(0.4, C.stone, [1.2, 0.15, -0.8]);
  },
  tridentStatue(b) {
    b.cyl(0.7, 0.8, 0.5, C.marble, [0, 0.25, 0], 10).cyl(0.5, 0.6, 0.3, C.turq, [0, 0.65, 0], 10);
    b.cyl(0.06, 0.06, 2.4, C.gold, [0, 2.0, 0], 8).box(0.9, 0.12, 0.12, C.gold, [0, 3.1, 0]);
    [-0.4, 0, 0.4].forEach((x) => { b.cyl(0.05, 0.05, 0.5, C.gold, [x, 3.4, 0], 6).cone(0.09, 0.25, C.gold, [x, 3.75, 0], 6); });
    b.sph(0.12, C.cyan, [0, 3.1, 0.08], undefined, 8, true);
  },
  atlantisDome(b) {
    b.cyl(1.4, 1.5, 0.25, C.pearl, [0, 0.12, 0], 18).tor(1.25, 0.05, C.turq, [0, 0.28, 0], [Math.PI / 2, 0, 0], TAU, true);
    b.cyl(0.25, 0.3, 1.8, C.marble, [0, 1.15, 0], 10).cone(0.3, 0.7, C.gold, [0, 2.4, 0], 10);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; b.cyl(0.14, 0.16, 1.0, C.marble, [Math.cos(a) * 0.7, 0.75, Math.sin(a) * 0.7], 8).cone(0.17, 0.35, C.turq, [Math.cos(a) * 0.7, 1.4, Math.sin(a) * 0.7], 8); }
    b.hemi(1.15, C.sky, [0, 0.25, 0], [1, 0.95, 1], 16);
  },
  // ---------- השמיים ----------
  crystalTree(b) {
    b.cyl(0.12, 0.2, 1.4, C.slate, [0, 0.7, 0], 8);
    [[0, 2.0, 0, 0.45], [0.55, 1.6, 0.2, 0.3], [-0.5, 1.7, -0.2, 0.32], [0.2, 2.5, -0.3, 0.28], [-0.25, 2.35, 0.35, 0.26]].forEach(([x, y, z, r], i) => b.oct(r, i % 2 ? C.crystal : C.violet, [x, y, z], [1, 1.5, 1], true));
    b.dod(0.7, C.slate, [0, 0.05, 0], [1.6, 0.25, 1.4]);
  },
  comet(b) {
    b.cyl(0.6, 0.7, 0.2, C.slate, [0, 0.1, 0], 10).cyl(0.06, 0.08, 1.4, C.silver, [0, 0.8, 0], 6);
    b.dod(0.55, C.dstone, [0, 2.0, 0]).cone(0.45, 1.6, C.sky, [-0.9, 2.3, 0], 10, [0, 0, Math.PI / 2 + 0.25], true).cone(0.3, 1.2, C.white, [-0.75, 2.2, 0.1], 8, [0, 0, Math.PI / 2 + 0.25], true);
  },
  crystalPalace(b) {
    b.cyl(1.2, 1.3, 0.25, C.lstone, [0, 0.12, 0], 12);
    [[0, 0, 3.0, 0.4], [-0.75, 0.3, 2.0, 0.3], [0.75, 0.3, 2.0, 0.3], [-0.4, -0.6, 1.6, 0.25], [0.45, -0.6, 1.7, 0.25]].forEach(([x, z, h, r]) => { b.cyl(r * 0.9, r, h * 0.7, C.ice, [x, 0.25 + h * 0.35, z], 6); b.oct(r, C.crystal, [x, 0.25 + h * 0.8, z], [1, 1.6, 1], true); });
    b.tor(0.4, 0.05, C.cyan, [0, 1.2, 0.6], [0, 0, 0], Math.PI, true);
  },
  haloTemple(b) {
    b.cyl(1.2, 1.3, 0.25, C.marble, [0, 0.12, 0], 16).columns(8, 0.08, 1.4, 0.95, C.marble, 0.25);
    b.cyl(1.05, 1.05, 0.15, C.marble, [0, 1.72, 0], 16).hemi(0.9, C.cream, [0, 1.78, 0], [1, 0.6, 1]);
    b.tor(0.6, 0.06, C.gold, [0, 2.9, 0], [Math.PI / 2, 0, 0], TAU, true);
  },
  moonShrine(b) {
    b.box(1.0, 0.8, 1.0, C.lstone, [0, 0.4, 0]).cyl(0.45, 0.5, 0.2, C.slate, [0, 0.9, 0], 10);
    b.tor(0.85, 0.22, C.pearl, [0, 2.0, 0], [0, 0, 0.6], Math.PI * 1.3, true);
    [[-1.0, 2.8], [0.9, 3.1], [1.2, 1.5], [-1.3, 1.6]].forEach(([x, y]) => b.oct(0.1, C.flame, [x, y, 0], undefined, true));
  },
  sunDisc(b) {
    b.box(1.6, 0.3, 1.2, C.sand, [0, 0.15, 0]).box(1.2, 0.3, 0.9, C.sand, [0, 0.45, 0]).cyl(0.12, 0.15, 1.0, C.gold, [0, 1.1, 0], 8);
    b.cyl(0.75, 0.75, 0.12, C.gold, [0, 2.2, 0], 18, [Math.PI / 2, 0, 0], true);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.cone(0.1, 0.45, C.flame, [Math.cos(a) * 1.0, 2.2 + Math.sin(a) * 1.0, 0], 4, [0, 0, a - Math.PI / 2], true); }
  },
  orrery(b) {
    b.cyl(0.9, 1.0, 1.0, C.lstone, [0, 0.5, 0], 14).hemi(0.9, C.slate, [0, 1.0, 0], [1, 0.8, 1]).box(0.2, 0.6, 1.0, C.dark, [0.3, 1.3, 0.3], [0, 0, -0.4]);
    b.sph(0.25, C.flame, [-1.0, 2.6, 0], undefined, 10, true).tor(0.7, 0.02, C.gold, [-1.0, 2.6, 0], [1.2, 0, 0]).tor(1.0, 0.02, C.gold, [-1.0, 2.6, 0], [1.4, 0.3, 0]);
    b.sph(0.1, C.blue, [-0.3, 2.6, 0.1]).sph(0.13, C.mars, [-1.0, 2.2, 0.9]).cyl(0.03, 0.03, 1.3, C.gold, [-1.0, 1.8, 0], 6);
  },
  rainbowArch(b) {
    const rb = [0xff4a6a, 0xffa04a, 0xfff04a, 0x4aff8a, 0x4ad8ff, 0xa04aff];
    rb.forEach((c, i) => b.tor(1.6 - i * 0.14, 0.07, c, [0, 0, 0], [0, 0, 0], Math.PI, true, 28));
    b.dod(0.45, C.white, [-1.3, 0.15, 0], [1.3, 0.5, 1]).dod(0.45, C.white, [1.3, 0.15, 0], [1.3, 0.5, 1]);
  },
  olympusTemple(b) {
    [[0, 0.2, 0, 1.0], [-0.9, 0.15, 0.3, 0.6], [0.9, 0.15, 0.2, 0.65], [0.3, 0.2, 0.8, 0.55]].forEach(([x, y, z, r]) => b.sph(r, C.white, [x, y, z], [1.2, 0.5, 1]));
    b.box(1.8, 0.15, 1.2, C.marble, [0, 0.6, 0]).row(5, -0.7, 0.7, 0.45, 0.07, 1.1, C.marble, 0.68).row(5, -0.7, 0.7, -0.45, 0.07, 1.1, C.marble, 0.68);
    b.box(1.75, 0.15, 1.15, C.marble, [0, 1.85, 0]).prism(1.85, 0.4, 1.2, C.gold, [0, 1.92, 0]);
    b.box(0.08, 0.5, 0.04, C.flame, [0, 2.75, 0], [0, 0, 0.4], true).box(0.08, 0.5, 0.04, C.flame, [0.12, 2.4, 0], [0, 0, -0.4], true).box(0.08, 0.45, 0.04, C.flame, [0.04, 2.05, 0], [0, 0, 0.4], true);
  },
};

export const MONUMENT_TYPES = Object.keys(M);
export { Builder, C as MON_COLORS };

// ---------- מטמון וחומרים משותפים ----------
const cache = new Map();
/** הגאומטריה של מונומנט (מוצק + זוהר), נבנית פעם אחת */
export function monumentGeometry(type) {
  if (!cache.has(type)) { const b = new Builder(); (M[type] || M.fireRing)(b); cache.set(type, b.build()); }
  return cache.get(type);
}
export const MONUMENT_SOLID = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.72, metalness: 0.06 });
export const MONUMENT_GLOW = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

/** אובייקט מונומנט מוכן להצבה */
export function makeMonument(type, scale = 1) {
  const g = new THREE.Group();
  const { solid, glow } = monumentGeometry(type);
  if (solid) { const m = new THREE.Mesh(solid, MONUMENT_SOLID); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  if (glow) g.add(new THREE.Mesh(glow, MONUMENT_GLOW));
  g.scale.setScalar(scale);
  g.userData.monument = type;
  return g;
}
