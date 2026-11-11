/**
 * ArenaLife — חיים ברקע של כל עידן: דמויות שמסתובבות, כלי טיס, דגים, ישויות אור,
 * אפקטים סביבתיים, צלילי אווירה ותגובות לאירועי המשחק (לכידה / שח / מט).
 *
 * ביצועים: כל דמות היא Low-Poly עם צבעי קודקודים, ממוזגת ל-3–5 קריאות ציור בלבד
 * (גוף, ידיים, רגליים), עם חומר משותף לכל העידן; הדגים ב-InstancedMesh אחד; צללי מגע
 * לכל הדמויות ב-InstancedMesh אחד; בלי צללים דינמיים. באיכות נמוכה — פחות דמויות.
 *
 * שדה ראייה נקי: המסלולים מחושבים אוטומטית מאחורי הלוח ובצדדים, תוך עקיפת המבנים של העידן,
 * הלוח ועמדות האווטארים/החיות. כלי הטיס עפים רק מאחורי הלוח, אף פעם לא מעליו.
 */
import * as THREE from 'three';
import { gsap } from 'gsap';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { G, rand, TAU, glowTexture, addCharacterRim } from './kit.js';

const V = THREE.Vector3;
const KEEP_OUT_BOARD = 5.6;
const STATIONS = [[-3, 6.4], [3, 6.3], [3, -6.5], [-3, -6.4]];

// ---------- בניית חלקים צבועים (צבעי קודקודים) וממוזגים ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V(), _p = new V();
function part(geo, color, { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1 } = {}) {
  let g = geo.clone();
  if (g.index) { const ni = g.toNonIndexed(); g.dispose(); g = ni; } // מיזוג דורש אחידות (חלק מהגיאומטריות בלי אינדקס)
  _m.compose(_p.set(...pos), _q.setFromEuler(_e.set(...rot)), Array.isArray(scale) ? _s.set(...scale) : _s.setScalar(scale));
  g.applyMatrix4(_m);
  const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}
function bake(parts) {
  const geo = mergeGeometries(parts.filter(Boolean), false);
  parts.forEach((p) => p && p.dispose());
  return geo;
}

// ---------- לבוש ואביזרים ----------
function hatParts(kind, P) {
  const y = 0.86;
  switch (kind) {
    case 'hair': return [part(G.dodeca(0.15), P.hair, { pos: [0, y + 0.07, -0.02], scale: [1.05, 0.7, 1.05] })];
    case 'galea': return [part(G.sph(0.18, 8, 5), P.metal, { pos: [0, y + 0.03, 0], scale: [1, 0.85, 1] }), part(G.box(0.05, 0.13, 0.34), P.red, { pos: [0, y + 0.2, 0] })];
    case 'helm': return [part(G.cyl(0.17, 0.17, 0.3, 7), P.metal, { pos: [0, y + 0.02, 0] }), part(G.box(0.22, 0.03, 0.02), 0x111111, { pos: [0, y + 0.03, 0.17] })];
    case 'hood': return [part(G.cone(0.2, 0.36, 6), P.hood, { pos: [0, y + 0.1, -0.02] })];
    case 'tophat': return [part(G.cyl(0.13, 0.13, 0.32, 8), P.hat, { pos: [0, y + 0.27, 0] }), part(G.cyl(0.24, 0.24, 0.025, 10), P.hat, { pos: [0, y + 0.12, 0] })];
    case 'cap': return [part(G.sph(0.17, 8, 4), P.cap, { pos: [0, y + 0.06, 0], scale: [1, 0.5, 1] }), part(G.box(0.2, 0.025, 0.12), P.cap, { pos: [0, y + 0.06, 0.15] })];
    case 'kabuto': return [part(G.sph(0.19, 8, 5), P.black, { pos: [0, y + 0.04, 0], scale: [1.1, 0.8, 1.1] }), part(G.box(0.03, 0.24, 0.02), P.gold, { pos: [-0.07, y + 0.2, 0.15], rot: [0, 0, 0.45] }), part(G.box(0.03, 0.24, 0.02), P.gold, { pos: [0.07, y + 0.2, 0.15], rot: [0, 0, -0.45] })];
    case 'nemes': return [part(G.box(0.38, 0.2, 0.3), P.blue, { pos: [0, y + 0.05, -0.02] }), part(G.box(0.4, 0.035, 0.31), P.gold, { pos: [0, y - 0.02, -0.02] }), part(G.box(0.36, 0.3, 0.06), P.blue, { pos: [0, y - 0.15, -0.14] })];
    case 'jar': return [part(G.lathe('lifeJar', [[0, 0], [0.12, 0.02], [0.16, 0.12], [0.12, 0.26], [0.07, 0.3], [0.09, 0.34], [0, 0.34]], 8), P.clay, { pos: [0, y + 0.12, 0] })];
    case 'horned': return [part(G.sph(0.18, 8, 5), P.metal, { pos: [0, y + 0.03, 0], scale: [1, 0.85, 1] }), part(G.cone(0.05, 0.26, 5), P.horn, { pos: [-0.2, y + 0.12, 0], rot: [0, 0, 1.0] }), part(G.cone(0.05, 0.26, 5), P.horn, { pos: [0.2, y + 0.12, 0], rot: [0, 0, -1.0] })];
    case 'finhelm': return [part(G.sph(0.18, 8, 5), P.scale, { pos: [0, y + 0.03, 0], scale: [1, 0.9, 1] }), part(G.box(0.03, 0.22, 0.3), P.gold, { pos: [0, y + 0.18, -0.02] })];
    default: return [];
  }
}

function propParts(kind, P) {
  // מיקום ביחס לכף היד (ראש הזרוע ב-0, כף היד ב-y=-0.57); חפצים ארוכים מוחזקים אנכית קדימה
  const h = -0.57;
  switch (kind) {
    case 'spear': return [part(G.cyl(0.025, 0.025, 1.9, 5), P.wood, { pos: [0, h + 0.55, 0.06] }), part(G.cone(0.06, 0.22, 5), P.tip, { pos: [0, h + 1.6, 0.06] })];
    case 'club': return [part(G.cyl(0.07, 0.035, 0.7, 6), P.wood, { pos: [0, h + 0.2, 0.08], rot: [0.5, 0, 0] })];
    case 'sword': return [part(G.box(0.06, 0.85, 0.02), P.steel, { pos: [0, h + 0.42, 0.08], rot: [0.25, 0, 0] }), part(G.box(0.22, 0.04, 0.05), P.gold, { pos: [0, h + 0.02, 0.06] })];
    case 'katana': return [part(G.box(0.035, 0.95, 0.015), P.steel, { pos: [0, h + 0.5, 0.08], rot: [0.2, 0, 0] }), part(G.cyl(0.05, 0.05, 0.03, 8), P.gold, { pos: [0, h + 0.04, 0.06] })];
    case 'axe': return [part(G.cyl(0.03, 0.03, 0.8, 5), P.wood, { pos: [0, h + 0.25, 0.06] }), part(G.box(0.05, 0.22, 0.26), P.steel, { pos: [0, h + 0.58, 0.16] })];
    case 'trident': return [part(G.cyl(0.025, 0.025, 1.9, 5), P.gold, { pos: [0, h + 0.55, 0.06] }), part(G.box(0.3, 0.035, 0.035), P.gold, { pos: [0, h + 1.5, 0.06] }),
      ...[-0.13, 0, 0.13].map((x) => part(G.cone(0.035, 0.2, 4), P.gold, { pos: [x, h + 1.62, 0.06] }))];
    case 'torch': return [part(G.cyl(0.03, 0.025, 0.55, 5), P.wood, { pos: [0, h + 0.2, 0.08] }), part(G.cyl(0.055, 0.04, 0.08, 6), 0x2a1a10, { pos: [0, h + 0.48, 0.08] })];
    case 'cane': return [part(G.cyl(0.018, 0.018, 0.85, 5), P.cane, { pos: [0, h - 0.3, 0.1] })];
    case 'hammer': return [part(G.cyl(0.025, 0.025, 0.5, 5), P.wood, { pos: [0, h + 0.1, 0.06] }), part(G.box(0.08, 0.08, 0.22), P.steel, { pos: [0, h + 0.36, 0.06] })];
    case 'basket': return [part(G.cyl(0.16, 0.12, 0.18, 7), P.wood, { pos: [0, h - 0.06, 0.12] })];
    default: return [];
  }
}

function shieldParts(kind, P) {
  switch (kind) {
    case 'scutum': return [part(G.box(0.46, 0.7, 0.06), P.red, { pos: [-0.04, -0.36, 0.16] }), part(G.sph(0.06, 6, 4), P.gold, { pos: [-0.04, -0.36, 0.2] })];
    case 'kite': return [part(G.cone(0.26, 0.75, 4), P.blue, { pos: [-0.04, -0.4, 0.16], rot: [Math.PI, Math.PI / 4, 0], scale: [1, 1, 0.2] })];
    case 'round': return [part(G.cyl(0.3, 0.3, 0.05, 10), P.wood, { pos: [-0.06, -0.34, 0.17], rot: [Math.PI / 2, 0, 0] }), part(G.torus(0.3, 0.025, 4, 12), P.metal, { pos: [-0.06, -0.34, 0.19] }), part(G.sph(0.06, 6, 4), P.metal, { pos: [-0.06, -0.34, 0.21] })];
    default: return [];
  }
}

/** דמות Low-Poly: גוף (גו+ראש+כובע), שתי ידיים (עם אביזר/מגן), שתי רגליים — 3–5 קריאות ציור */
function buildFigureGeos(style, P) {
  const body = P[style.body] ?? style.body, legs = P[style.legs] ?? style.legs, skin = P.skin;
  const torso = [
    part(G.cyl(0.19, 0.23, 0.62, 6), body, { pos: [0, 0.33, 0] }),
    part(G.cyl(0.09, 0.09, 0.1, 6), skin, { pos: [0, 0.68, 0] }),
    part(G.ico(0.16, 1), skin, { pos: [0, 0.86, 0] }),
    part(G.box(0.2, 0.03, 0.04), 0x1a1210, { pos: [0, 0.89, 0.14] }), // עיניים
    ...hatParts(style.hat, P),
  ];
  if (style.robe) torso.push(part(G.cone(0.36, 0.86, 7), P[style.robe] ?? style.robe, { pos: [0, -0.34, 0] }));
  if (style.cape) torso.push(part(G.box(0.44, 0.72, 0.04), P[style.cape] ?? style.cape, { pos: [0, 0.24, -0.22], rot: [0.14, 0, 0] }));
  if (style.belt) torso.push(part(G.cyl(0.235, 0.235, 0.06, 6), P[style.belt] ?? style.belt, { pos: [0, 0.06, 0] }));
  const arm = (side) => {
    const ps = [part(G.cyl(0.06, 0.05, 0.55, 5), body, { pos: [0, -0.28, 0] }), part(G.sph(0.06, 6, 4), skin, { pos: [0, -0.57, 0] })];
    if (side > 0) ps.push(...propParts(style.prop, P)); else ps.push(...shieldParts(style.shield, P), ...(style.prop2 ? propParts(style.prop2, P) : []));
    return bake(ps);
  };
  const leg = () => bake([part(G.cyl(0.075, 0.065, 0.8, 5), legs, { pos: [0, -0.4, 0] }), part(G.box(0.13, 0.07, 0.22), P.boot ?? 0x2a1c14, { pos: [0, -0.8, 0.04] })]);
  return { torso: bake(torso), armR: arm(1), armL: arm(-1), leg: style.robe ? null : leg() };
}

class Figure {
  constructor(geos, mat, style) {
    this.root = new THREE.Group();
    this.hips = new THREE.Group(); this.hips.position.y = 0.82; this.root.add(this.hips);
    this.hips.add(new THREE.Mesh(geos.torso, mat));
    const pivot = (geo, x, y) => { const g = new THREE.Group(); g.position.set(x, y, 0); if (geo) g.add(new THREE.Mesh(geo, mat)); this.hips.add(g); return g; };
    this.armL = pivot(geos.armL, -0.27, 0.6);
    this.armR = pivot(geos.armR, 0.27, 0.6);
    this.legL = pivot(geos.leg, -0.1, 0.02);
    this.legR = pivot(geos.leg, 0.1, 0.02);
    this.float = !!style.float;
    this.armRBase = style.prop && ['spear', 'trident', 'torch'].includes(style.prop) ? -0.35 : 0;
    this.root.scale.setScalar(style.scale || 1);
    this.phase = rand(0, TAU);
    if (style.glow) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: style.glow, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      s.scale.setScalar(style.glowSize || 0.6);
      s.position.set(0, style.glowY ?? -0.57 + 0.55, 0.08);
      (style.glowOn === 'body' ? this.hips : this.armR).add(s);
      this.glow = s;
    }
  }
}

// ---------- כלי טיס ויצורים ----------
function droneGeo(P) {
  const ps = [part(G.box(0.55, 0.14, 0.55), P.hull, {}), part(G.sph(0.12, 8, 5), P.neon, { pos: [0, -0.1, 0.2], scale: [1, 0.6, 1] })];
  for (const [x, z] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) {
    ps.push(part(G.box(0.36, 0.04, 0.05), P.hull, { pos: [x / 2, 0.02, z / 2], rot: [0, Math.atan2(x, z) + Math.PI / 2, 0] }));
    ps.push(part(G.cyl(0.2, 0.2, 0.012, 10), P.rotor, { pos: [x, 0.08, z] }));
  }
  return bake(ps);
}
function carGeo(P) {
  return bake([
    part(G.box(1.5, 0.32, 0.72), P.hull, { pos: [0, 0, 0] }),
    part(G.box(0.8, 0.26, 0.62), P.glass, { pos: [-0.1, 0.27, 0] }),
    part(G.box(0.08, 0.08, 0.6), P.neon, { pos: [0.76, 0.02, 0] }),
    part(G.box(0.06, 0.06, 0.66), P.neon2, { pos: [-0.76, 0.04, 0] }),
    part(G.box(1.3, 0.04, 0.74), P.neon2, { pos: [0, -0.18, 0] }),
  ]);
}
function shipGeo(P) {
  return bake([
    part(G.cone(0.32, 1.7, 6), P.hull, { rot: [0, 0, -Math.PI / 2] }),
    part(G.box(0.7, 0.05, 1.7), P.hull2, { pos: [-0.25, 0, 0] }),
    part(G.sph(0.18, 8, 5), P.glass, { pos: [0.2, 0.17, 0], scale: [1.6, 0.7, 1] }),
    part(G.box(0.12, 0.3, 0.05), P.neon, { pos: [-0.6, 0.18, 0] }),
  ]);
}
function fishGeo() {
  return bake([
    part(G.sph(0.22, 8, 6), 0xffffff, { scale: [1.7, 0.75, 0.5] }),
    part(G.cone(0.16, 0.28, 4), 0xffffff, { pos: [-0.46, 0, 0], rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.25] }),
  ]);
}
function turtleGeo(P) {
  return bake([
    part(G.sph(0.55, 10, 6), P.shell, { scale: [1.2, 0.42, 1] }),
    part(G.sph(0.5, 10, 6), P.belly, { pos: [0, -0.06, 0], scale: [1.1, 0.25, 0.9] }),
    part(G.sph(0.17, 8, 6), P.skin2, { pos: [0.72, 0.02, 0] }),
  ]);
}
function finGeo(P) { return bake([part(G.box(0.5, 0.04, 0.2), P.skin2, { pos: [0, 0, 0.25] })]); }
function wingGeo() { return new THREE.PlaneGeometry(0.9, 0.55).translate(0.42, 0.05, 0); }

// ---------- הגדרות לכל עידן ----------
const PAL = {
  1: { skin: 0xc8946a, fur: 0x7a5230, fur2: 0x5e3c22, hair: 0x2a1a10, wood: 0x6a4a30, tip: 0x9a9488, boot: 0x4a3420 },
  2: { skin: 0xd8a882, red: 0x9e1b1b, gold: 0xd4a83a, metal: 0xc0c4cc, toga: 0xeee6d6, leather: 0x6a4a2a, wood: 0x6a4a2a, tip: 0xc0c4cc, boot: 0x5a3a20 },
  3: { skin: 0xe0b090, steel: 0xb8bec8, metal: 0xa8aeb8, blue: 0x24357e, red: 0x8e1020, peasant: 0x8a6a42, hood: 0x5e4a30, wood: 0x6a4a2a, gold: 0xd4a83a, tip: 0xb8bec8, boot: 0x2a2018 },
  4: { skin: 0xe0b090, coat: 0x2a2a34, hat: 0x111114, overall: 0x34507a, cap: 0x4a3a2a, cane: 0x2a1a10, wood: 0x5a3a20, steel: 0x8a8e96, shirt: 0xd8d0c0, boot: 0x1a1412 },
  5: { hull: 0x1c2230, hull2: 0x2a3448, glass: 0x33f0ff, neon: 0xff3df2, neon2: 0x33f0ff, rotor: 0x6a7a90 },
  6: { skin: 0xe8c098, armor: 0x8e1a1a, black: 0x1a1416, gold: 0xd4a83a, steel: 0xd8dce4, hakama: 0x2a2440, boot: 0x1a1416 },
  7: { skin: 0xa86a3e, linen: 0xf0e6d0, gold: 0xd4a83a, blue: 0x1c3c9e, clay: 0xb5653a, wood: 0x7a5a30, tip: 0xd4a83a, boot: 0x8a6a42 },
  8: { skin: 0xe0b090, leather: 0x6a4a30, fur: 0x8a7a6a, metal: 0x9aa0a8, wood: 0x7a5232, horn: 0xf0e8d8, red: 0x8e2a1a, steel: 0xb8bec8, boot: 0x3a2a1c },
  9: { skin: 0x9ad8cc, scale: 0x1f8a8a, gold: 0xe0c060, pearl: 0xf4f0ff, shell: 0x5a7a3a, belly: 0xc8c08a, skin2: 0x7a9a6a, boot: 0x14605e },
  10: { skin: 0xf4ecff, robe: 0xf6f2ff, gold: 0xf2d77a, glowc: 0xfff2c8, tip: 0xfff2c8, boot: 0xf6f2ff },
};

// מגוון דמויות: lane = back (מאחורי הלוח) / back2 (רחוק יותר) / side (בצדדים) / circle (סביב נקודה) / spot (מקום קבוע)
const CAST = {
  1: (b) => [
    ...(b >= 1 ? [{ n: 3, lane: 'circle', center: [0, -11.5], radii: [4.1, 4.6, 3.8], speed: 0.7, style: { body: 'fur', legs: 'fur2', hat: 'hair', prop: 'spear', belt: 'wood' } }] : []),
    { n: b >= 1 ? 1 : 2, lane: 'back', speed: 0.85, style: { body: 'fur', legs: 'fur2', hat: 'hair', prop: 'club' } },
  ],
  2: () => [
    { n: 2, lane: 'back', speed: 0.9, march: true, style: { body: 'red', legs: 'skin', hat: 'galea', prop: 'spear', shield: 'scutum', belt: 'gold', cape: 'red' } },
    { n: 2, lane: 'back2', speed: 0.6, style: { body: 'toga', robe: 'toga', prop: 'torch', glow: 0xffa040, glowSize: 0.55 } },
  ],
  3: () => [
    { n: 2, lane: 'back', speed: 0.75, march: true, style: { body: 'steel', legs: 'steel', hat: 'helm', prop: 'sword', shield: 'kite', cape: 'blue' } },
    { n: 2, lane: 'side', speed: 0.65, style: { body: 'peasant', legs: 'hood', hat: 'hood', prop: 'basket' } },
  ],
  4: () => [
    { n: 2, lane: 'back', speed: 0.8, style: { body: 'coat', legs: 'coat', hat: 'tophat', prop: 'cane' } },
    { n: 2, lane: 'back2', speed: 0.95, style: { body: 'overall', legs: 'overall', hat: 'cap', prop: 'hammer' } },
  ],
  5: () => [],
  6: () => [
    { n: 2, lane: 'spot', style: { body: 'armor', legs: 'hakama', hat: 'kabuto', prop: 'katana', belt: 'gold' }, train: true },
    { n: 1, lane: 'back2', speed: 0.7, style: { body: 'armor', legs: 'hakama', hat: 'kabuto', prop: 'katana', belt: 'gold' } },
  ],
  7: () => [
    { n: 2, lane: 'back', speed: 0.7, march: true, style: { body: 'linen', legs: 'skin', hat: 'nemes', prop: 'spear', belt: 'gold' } },
    { n: 1, lane: 'back2', speed: 0.55, style: { body: 'linen', robe: 'linen', hat: 'jar' } },
  ],
  8: () => [
    { n: 3, lane: 'back', speed: 0.8, march: true, style: { body: 'leather', legs: 'fur', hat: 'horned', prop: 'axe', shield: 'round', belt: 'metal' } },
  ],
  9: () => [
    { n: 2, lane: 'back', speed: 0.6, march: true, style: { body: 'scale', legs: 'scale', hat: 'finhelm', prop: 'trident', belt: 'gold' } },
  ],
  10: () => [
    { n: 2, lane: 'back', speed: 0.45, style: { body: 'robe', robe: 'robe', prop: 'spear', float: true, glow: 0xfff2c8, glowSize: 1.4, glowOn: 'body', glowY: 0.9 } },
  ],
};

const FLY = {
  5: [{ kind: 'drone', n: 3 }, { kind: 'car', n: 2 }, { kind: 'ship', n: 1 }],
  9: [{ kind: 'fish', n: 12 }, { kind: 'turtle', n: 2 }],
  10: [{ kind: 'being', n: 3 }],
};

// צלילי אווירה מחזוריים לכל עידן: [אירוע, מינימום שניות, מקסימום]
const AMB_EVENTS = {
  1: [['howl', 16, 32], ['bird', 7, 14]], 2: [['clink', 5, 10]], 3: [['trumpet', 22, 40], ['clank', 7, 13]],
  4: [['whistle', 20, 38]], 5: [], 6: [['flute', 15, 28]], 7: [['oud', 13, 24]], 8: [['drums', 16, 30]], 9: [], 10: [['bells', 8, 16]],
};
const STEP_ERAS = new Set([2, 3, 6, 7, 8, 9]);
const FIREWORK_COLORS = {
  1: [0xffb050, 0xff7020, 0xffe0a0], 2: [0xffd34d, 0xffffff, 0xd4a83a], 3: [0xff5a5a, 0x5a8aff, 0xffd34d], 4: [0xffc070, 0xffffff, 0xb0b8c8],
  5: [0x33f0ff, 0xff3df2, 0x9a5cff], 6: [0xff6a8a, 0xffd34d, 0xffffff], 7: [0xffd34d, 0x5a8aff, 0xfff0c0], 8: [0x9adfff, 0xffffff, 0xff9a40],
  9: [0x40ffd0, 0x60a0ff, 0xffffff], 10: [0xfff2c8, 0xffd34d, 0xc8b0ff],
};

export class ArenaLife {
  constructor(sceneMgr, fx, sound) {
    this.sm = sceneMgr;
    this.fx = fx;
    this.sound = sound;
    this.group = new THREE.Group();
    this.group.name = 'arena-life';
    sceneMgr.world.add(this.group);
    this.walkers = [];
    this.flyers = [];
    this.disposables = [];
    this.eraId = 0;
    this.built = -1;
    this.mood = null;
    this.moodT = 0;
    this.speedBoost = 1;
    this.nextAmb = [];
    this.lastStep = 0;
    this.envT = 0;
    this.time = 0;
    sceneMgr.onUpdate((dt, t) => this.update(dt, t));
  }

  get low() { return this.sm.quality?.level === 'low'; }

  // ---------- בנייה לפי עידן ----------
  /** יציאה מהעידן (לפני אבולוציה / סיור): הדמויות מתכווצות, כלי הטיס נעלמים */
  leave() {
    this.left = true;
    this.walkers.forEach((w) => gsap.to(w.fig.root.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.35, ease: 'back.in(1.6)' }));
    this.flyers.forEach((f) => { f.obj.visible = false; });
    if (this.fish) this.fish.visible = false;
    if (this.shadows) this.shadows.visible = false;
  }

  setEra(eraId, built, kingdom) {
    if (!this.left && eraId === this.eraId && built === this.built && this.walkers.length + this.flyers.length > 0) return;
    this.left = false;
    this.clear();
    this.eraId = eraId;
    this.built = built;
    const P = PAL[eraId] || PAL[1];
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.72, metalness: 0.12 });
    const rimHolder = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), this.mat);
    addCharacterRim(rimHolder, { strength: 0.32, power: 2.8 });
    rimHolder.geometry.dispose();
    this.disposables.push(this.mat);
    this.obstacles = this.collectObstacles(kingdom);
    if (this.extraObstacles) this.obstacles.push(...this.extraObstacles()); // מבנים שמחוץ לערכת העידן (המבנים של האי המרכזי)
    this.lanes = this.resolveLanes();
    const low = this.low;
    // הולכי רגל
    const geoCache = new Map();
    for (const grp of (CAST[eraId] || (() => []))(built)) {
      const count = low ? Math.max(1, Math.ceil(grp.n / 2)) : grp.n;
      const key = JSON.stringify(grp.style);
      if (!geoCache.has(key)) { const gs = buildFigureGeos(grp.style, P); geoCache.set(key, gs); this.disposables.push(...Object.values(gs).filter(Boolean)); }
      for (let i = 0; i < count; i++) this.spawnWalker(geoCache.get(key), grp, i, count);
    }
    // צללי מגע — InstancedMesh אחד לכולם
    if (this.walkers.length) {
      const sm = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false });
      this.shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), sm, this.walkers.length);
      this.shadows.frustumCulled = false;
      this.shadows.renderOrder = -1;
      this.group.add(this.shadows);
      this.disposables.push(this.shadows.geometry, sm);
    }
    // כלי טיס / יצורים
    for (const f of FLY[eraId] || []) this.spawnFlyers(f.kind, low ? Math.max(1, Math.ceil(f.n / 2)) : f.n, P);
    // אפקטים סביבתיים נוספים
    this.neon = eraId === 5 ? this.collectNeon(kingdom) : [];
    // אירועי סאונד
    const now = performance.now() / 1000;
    this.nextAmb = (AMB_EVENTS[eraId] || []).map(([k, a, b]) => ({ k, a, b, at: now + rand(3, a) }));
    // כניסה רכה
    this.group.children.forEach((c) => { c.visible = true; });
    this.walkers.forEach((w, i) => { w.fig.root.scale.multiplyScalar(0.01); gsap.to(w.fig.root.scale, { x: w.scale, y: w.scale, z: w.scale, duration: 0.6, delay: 0.1 + i * 0.12, ease: 'back.out(1.8)' }); });
  }

  clear() {
    this.group.traverse((o) => { if (o.isSprite) o.material.dispose(); });
    this.walkers.forEach((w) => this.group.remove(w.fig.root));
    this.flyers.forEach((f) => this.group.remove(f.obj));
    if (this.shadows) { this.group.remove(this.shadows); this.shadows = null; }
    if (this.fish) { this.group.remove(this.fish); this.fish = null; }
    this.group.clear();
    this.disposables.forEach((d) => d.dispose?.());
    this.disposables = [];
    this.walkers = [];
    this.flyers = [];
    this.neon = [];
  }

  /** קופסאות של מבני העידן (בגובה דמות) — כדי שהמסלולים יעקפו אותם */
  collectObstacles(kingdom) {
    const boxes = [];
    const root = kingdom?.root;
    if (!root) return boxes;
    root.updateMatrixWorld(true);
    const b = new THREE.Box3(), size = new V();
    root.traverse((o) => {
      if (!o.isMesh || o === kingdom.floor || !o.visible) return;
      if (kingdom.floor && isDescendant(o, kingdom.floor)) return;
      const m = o.material;
      if (m && (m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.5))) return;
      b.setFromObject(o);
      if (b.isEmpty()) return;
      b.getSize(size);
      if (b.max.y < 0.3 || b.min.y > 2.4 || size.x > 26 || size.z > 26) return;
      if (size.y < 0.7 && (size.x > 5 || size.z > 5)) return; // רצפה מוגבהת רחבה — אפשר ללכת עליה
      boxes.push(b.clone());
    });
    return boxes;
  }

  free(x, z, r = 0.45) {
    if (Math.abs(x) < KEEP_OUT_BOARD + r && Math.abs(z) < KEEP_OUT_BOARD + r) return false;
    for (const [sx, sz] of STATIONS) if ((x - sx) ** 2 + (z - sz) ** 2 < (1.75 + r) ** 2) return false;
    if (x * x + z * z > 17.5 ** 2) return false;
    for (const b of this.obstacles) if (x > b.min.x - r && x < b.max.x + r && z > b.min.z - r && z < b.max.z + r) return false;
    return true;
  }

  run(axis, fixed, from, to, step = 0.35) {
    let best = null, cur = null;
    for (let v = from; v <= to + 1e-6; v += step) {
      const ok = axis === 'x' ? this.free(v, fixed) : this.free(fixed, v);
      if (ok) { if (cur) cur.b = v; else cur = { a: v, b: v }; } else { if (cur && (!best || cur.b - cur.a > best.b - best.a)) best = cur; cur = null; }
    }
    if (cur && (!best || cur.b - cur.a > best.b - best.a)) best = cur;
    return best;
  }

  resolveLanes() {
    const lanes = {};
    const backZ = [-8.5, -9.3, -10.2, -11.2, -12.3, -13.5, -14.6];
    for (const z of backZ) {
      const r = this.run('x', z, -9.5, 9.5);
      if (r && r.b - r.a >= 4.5) {
        if (!lanes.back) lanes.back = { axis: 'x', fixed: z, a: r.a, b: r.b };
        else if (!lanes.back2 && z <= lanes.back.fixed - 1.2) { lanes.back2 = { axis: 'x', fixed: z, a: r.a, b: r.b }; break; }
      }
    }
    for (const sx of [7.2, 8.0, 9.0, 10.2]) {
      const rr = this.run('z', sx, -11, 2.5), rl = this.run('z', -sx, -11, 2.5);
      const ok = (r) => r && r.b - r.a >= 3;
      if (ok(rr) || ok(rl)) { lanes.side = [ok(rr) ? { axis: 'z', fixed: sx, a: rr.a, b: rr.b } : null, ok(rl) ? { axis: 'z', fixed: -sx, a: rl.a, b: rl.b } : null].filter(Boolean); break; }
    }
    lanes.back2 = lanes.back2 || lanes.back;
    lanes.side = lanes.side || (lanes.back ? [lanes.back] : []);
    return lanes;
  }

  laneFor(name, i) {
    if (name === 'side') return this.lanes.side[i % Math.max(1, this.lanes.side.length)];
    return this.lanes[name] || this.lanes.back;
  }

  spawnWalker(geos, grp, i, count) {
    const fig = new Figure(geos, this.mat, grp.style);
    const scale = (grp.style.scale || 1) * 1.15 * rand(0.94, 1.06);
    const w = { fig, grp, scale, mode: 'walk', t: 0, speed: (grp.speed || 0.8) * rand(0.9, 1.1), dir: i % 2 ? -1 : 1, pause: 0, yaw: 0, jumpY: 0, x: 0, z: 0, react: 0, train: !!grp.train };
    if (grp.lane === 'circle') {
      const r = grp.radii.find((rad) => this.circleFree(grp.center, rad));
      if (r) { w.circle = { c: grp.center, r, ang: (i / count) * TAU + rand(-0.2, 0.2) }; w.dir = 1; }
    }
    if (!w.circle) {
      const laneName = grp.lane === 'circle' ? 'back' : grp.lane === 'spot' ? 'back' : grp.lane;
      const lane = this.laneFor(laneName, i);
      if (!lane) return;
      w.lane = lane;
      const span = lane.b - lane.a;
      if (grp.lane === 'spot') {
        w.pos = lane.a + span * (count === 1 ? 0.5 : 0.28 + 0.44 * (i / (count - 1)));
        w.mode = 'train';
      } else if (grp.march) w.pos = lane.a + span * 0.2 + i * 1.35;
      else w.pos = lane.a + span * ((i + 0.5) / count);
      w.pos = Math.min(lane.b, Math.max(lane.a, w.pos));
      if (grp.march) w.dir = 1;
    }
    this.place(w);
    this.group.add(fig.root);
    this.walkers.push(w);
  }

  circleFree(c, r) {
    let ok = 0;
    for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU; if (this.free(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, 0.35)) ok++; }
    return ok >= 22;
  }

  place(w) {
    if (w.circle) {
      const { c, r, ang } = w.circle;
      w.x = c[0] + Math.cos(ang) * r; w.z = c[1] + Math.sin(ang) * r;
      w.yaw = Math.atan2(-Math.sin(ang), Math.cos(ang)) + (w.dir > 0 ? 0 : Math.PI); // משיק למעגל
    } else if (w.lane) {
      if (w.lane.axis === 'x') { w.x = w.pos; w.z = w.lane.fixed; } else { w.x = w.lane.fixed; w.z = w.pos; }
      if (w.mode === 'train') w.yaw = Math.atan2(-w.x, -w.z); // פונים ללוח
      else w.yaw = w.lane.axis === 'x' ? (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (w.dir > 0 ? 0 : Math.PI);
    }
    w.fig.root.position.set(w.x, (w.fig.float ? 0.55 : 0) + w.jumpY, w.z);
    w.fig.root.rotation.y = w.yaw;
  }

  spawnFlyers(kind, n, P) {
    const mat = this.mat;
    if (kind === 'fish') {
      const geo = fishGeo();
      const fm = new THREE.MeshStandardMaterial({ vertexColors: false, flatShading: true, roughness: 0.4, metalness: 0.3 });
      const im = new THREE.InstancedMesh(geo, fm, n);
      im.frustumCulled = false;
      const cols = [0xff9a40, 0xffd34d, 0x40d0ff, 0xff6a8a, 0x9a7aff];
      for (let i = 0; i < n; i++) im.setColorAt(i, new THREE.Color(cols[i % cols.length]));
      this.group.add(im);
      this.fish = im;
      this.disposables.push(geo, fm);
      const schools = Math.max(1, Math.round(n / 6));
      this.fishState = Array.from({ length: n }, (_, i) => {
        const s = i % schools;
        return { s, off: new V(rand(-0.8, 0.8), rand(-0.5, 0.5), rand(-0.6, 0.6)), ph: rand(0, TAU), size: rand(0.7, 1.15) };
      });
      this.schools = Array.from({ length: schools }, (_, s) => ({ ang: rand(0, TAU), rx: rand(7, 9.5), rz: rand(2.2, 3.4), cz: rand(-12.5, -10.5), y: rand(2.6, 4.4), sp: rand(0.12, 0.18) * (s % 2 ? -1 : 1) }));
      return;
    }
    for (let i = 0; i < n; i++) {
      let obj, f;
      if (kind === 'drone') {
        const geo = droneGeo(P); obj = new THREE.Mesh(geo, mat); this.disposables.push(geo);
        const light = glowSpriteSmall(0x33f0ff, 0.5); light.position.set(0, -0.12, 0.25); obj.add(light);
        f = { kind, obj, light, path: 'loop', ang: (i / n) * TAU, rx: rand(5.5, 8.5), rz: rand(1.2, 2.4), cz: rand(-11.5, -9.5), y: rand(4.6, 6.4), sp: rand(0.25, 0.38) * (i % 2 ? -1 : 1), bob: rand(0, TAU) };
      } else if (kind === 'car') {
        const geo = carGeo(P); obj = new THREE.Mesh(geo, mat); this.disposables.push(geo);
        f = { kind, obj, path: 'pass', x: rand(-16, 16), y: rand(6.8, 8.8), z: rand(-15.5, -12), sp: rand(5, 8) * (i % 2 ? -1 : 1), passed: false };
      } else if (kind === 'ship') {
        const geo = shipGeo(P); obj = new THREE.Mesh(geo, mat); this.disposables.push(geo);
        const eng = glowSpriteSmall(0xff3df2, 0.9); eng.position.set(-0.95, 0, 0); obj.add(eng);
        f = { kind, obj, path: 'loop', ang: rand(0, TAU), rx: 12, rz: 3.5, cz: -15, y: 10, sp: 0.16, bob: 0 };
      } else if (kind === 'turtle') {
        const geo = turtleGeo(P); obj = new THREE.Group(); obj.add(new THREE.Mesh(geo, mat)); this.disposables.push(geo);
        const fg = finGeo(P); this.disposables.push(fg);
        const fins = [[0.35, 1], [0.35, -1], [-0.4, 1], [-0.4, -1]].map(([x, s]) => { const p = new THREE.Group(); p.position.set(x, -0.02, 0.32 * s); const m = new THREE.Mesh(fg, mat); m.scale.z = s; p.add(m); obj.add(p); return { p, s }; });
        f = { kind, obj, fins, path: 'loop', ang: rand(0, TAU), rx: rand(8.5, 10.5), rz: rand(2.5, 3.5), cz: rand(-13.5, -12), y: rand(4.6, 5.8), sp: rand(0.07, 0.1) * (i % 2 ? -1 : 1), bob: rand(0, TAU) };
      } else if (kind === 'being') {
        obj = new THREE.Group();
        const core = glowSpriteSmall(0xfff2c8, 1.5); obj.add(core);
        const wm = new THREE.MeshBasicMaterial({ map: glowTexture('wingGlow', 'rgba(255,248,220,0.9)', 'rgba(255,240,200,0)'), color: 0xfff2c8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
        const wg = wingGeo(); this.disposables.push(wg, wm);
        const wl = new THREE.Mesh(wg, wm), wr = new THREE.Mesh(wg, wm); wr.scale.x = -1; obj.add(wl, wr);
        const halo = new THREE.Mesh(G.torus(0.32, 0.03, 6, 20), new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false }));
        halo.rotation.x = Math.PI / 2; halo.position.y = 0.55; obj.add(halo); this.disposables.push(halo.material);
        f = { kind, obj, wl, wr, path: 'loop', ang: (i / n) * TAU, rx: rand(7.5, 9.5), rz: rand(2.2, 3.2), cz: rand(-12.5, -10.5), y: rand(3.6, 5.6), sp: rand(0.12, 0.18) * (i % 2 ? -1 : 1), bob: rand(0, TAU) };
      }
      if (!obj) continue;
      this.group.add(obj);
      this.flyers.push(f);
    }
  }

  collectNeon(kingdom) {
    const out = [];
    kingdom?.root?.traverse((o) => {
      const m = o.material;
      if (o.isMesh && m && m.emissive && m.emissiveIntensity > 0.6 && out.length < 8 && !out.some((x) => x.m === m)) out.push({ m, base: m.emissiveIntensity });
    });
    return out;
  }

  // ---------- תגובות לאירועי משחק ----------
  react(kind) {
    if (!this.walkers.length && !this.flyers.length) return;
    if (kind === 'capture') {
      this.walkers.forEach((w, i) => this.jump(w, 0.32, i * 0.05 + rand(0, 0.15)));
      this.boost(1.8, 1.2);
      this.sound?.crowd?.('ooh');
    } else if (kind === 'check') {
      this.setMood('alert', 2.8);
      this.boost(3, 2.6);
      this.flicker();
      this.sound?.crowd?.('gasp');
    } else if (kind === 'victory') {
      this.setMood('cheer', 5);
      this.boost(2.2, 4);
      this.fireworks();
      this.sound?.crowd?.('cheer');
    } else if (kind === 'defeat') {
      this.setMood('sad', 3.5);
      this.sound?.crowd?.('aww');
    }
  }

  setMood(m, dur) { this.mood = m; this.moodT = dur; }

  jump(w, h = 0.32, delay = 0) {
    gsap.timeline({ delay })
      .to(w, { jumpY: h, duration: 0.18, ease: 'power2.out' })
      .to(w, { jumpY: 0, duration: 0.24, ease: 'bounce.out' });
  }

  boost(v, dur) {
    gsap.killTweensOf(this, 'speedBoost');
    this.speedBoost = v;
    gsap.to(this, { speedBoost: 1, duration: dur, ease: 'power2.in' });
  }

  /** הבהוב תאורה דרמטי (שח) */
  flicker() {
    const key = this.sm.key, hemi = this.sm.hemi;
    if (!key || this.flickering) return;
    this.flickering = true;
    const k0 = key.intensity, h0 = hemi?.intensity ?? 1;
    const seq = [0.35, 1.25, 0.5, 1.15, 0.75, 1];
    const tl = gsap.timeline({ onComplete: () => { key.intensity = k0; if (hemi) hemi.intensity = h0; this.flickering = false; } });
    seq.forEach((f, i) => tl.to(key, { intensity: k0 * f, duration: i === seq.length - 1 ? 0.35 : 0.07, ease: 'none' }).to(hemi || {}, { intensity: h0 * (0.6 + f * 0.4), duration: 0.07 }, '<'));
  }

  /** זיקוקים / ברקים / התפרצות אור לפי העידן (ניצחון) */
  fireworks() {
    const cols = FIREWORK_COLORS[this.eraId] || FIREWORK_COLORS[2];
    const n = this.low ? 4 : 7;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const pos = [rand(-7, 7), rand(7.5, 11), rand(-13, -9)];
        const c = cols[i % cols.length];
        this.fx.add.emit({ count: this.low ? 50 : 90, pos, spread: [0.1, 0.1, 0.1], radial: [3.5, 6.5], color: [c, 0xffffff], size: [0.1, 0.22], life: [0.9, 1.6], gravity: 2.4, drag: 1.1 });
        this.fx.add.emit({ count: 12, pos, spread: [0.2, 0.2, 0.2], radial: [0.5, 1.5], color: [0xffffff], size: [0.3, 0.5], life: [0.25, 0.45], drag: 3 });
        if (this.sound?.ok) this.sound.noise(this.sound.now, 0.6, { type: 'lowpass', freq: 900, freqEnd: 120, gain: 0.12, dest: this.sound.out((pos[0] / 10), this.sound.sfxBus) });
      }, 250 + i * rand(260, 420));
    }
  }

  // ---------- לולאת עדכון ----------
  update(dt, t) {
    if (!this.walkers.length && !this.flyers.length && !this.fish) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) this.mood = null; }
    const sp = this.speedBoost;
    const m4 = new THREE.Matrix4();
    let si = 0;
    for (const w of this.walkers) {
      this.updateWalker(w, dt, sp);
      if (this.shadows) {
        m4.makeTranslation(w.x, 0.03, w.z);
        const s = (1 - Math.min(0.6, w.jumpY)) * w.scale * (w.fig.float ? 0.7 : 1);
        m4.scale(new V(s, 1, s));
        this.shadows.setMatrixAt(si++, m4);
      }
    }
    if (this.shadows) this.shadows.instanceMatrix.needsUpdate = true;
    for (const f of this.flyers) this.updateFlyer(f, dt, sp);
    if (this.fish) this.updateFish(dt, sp);
    this.updateEnvironment(dt);
    this.updateAmbientSound();
  }

  updateWalker(w, dt, sp) {
    const fig = w.fig;
    const mood = this.mood;
    let moving = false;
    if (mood === 'alert' || mood === 'cheer' || mood === 'sad') {
      // עוצרים ופונים ללוח
      const target = Math.atan2(-w.x, -w.z);
      w.yaw = lerpAngle(w.yaw, target, Math.min(1, dt * 6));
    } else if (w.mode === 'train') {
      w.yaw = lerpAngle(w.yaw, Math.atan2(-w.x, -w.z), Math.min(1, dt * 3));
    } else if (w.pause > 0) {
      w.pause -= dt;
      if (w.turning) w.yaw = lerpAngle(w.yaw, w.turnTo, Math.min(1, dt * 5));
      if (w.pause <= 0) w.turning = false;
    } else if (w.circle) {
      w.circle.ang += (w.speed * sp * dt * w.dir) / w.circle.r;
      const { c, r, ang } = w.circle;
      w.x = c[0] + Math.cos(ang) * r; w.z = c[1] + Math.sin(ang) * r;
      w.yaw = Math.atan2(-Math.sin(ang) * w.dir, Math.cos(ang) * w.dir);
      moving = true;
      if (Math.random() < dt * 0.04) { w.pause = rand(1.2, 2.4); w.turning = true; w.turnTo = Math.atan2(c[0] - w.x, c[1] - w.z); }
    } else if (w.lane) {
      w.pos += w.speed * sp * dt * w.dir;
      const { a, b } = w.lane;
      if (w.pos > b || w.pos < a) {
        w.pos = Math.min(b, Math.max(a, w.pos));
        w.dir *= -1;
        w.pause = rand(0.8, 2.2);
        w.turning = true;
        w.turnTo = w.lane.axis === 'x' ? (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (w.dir > 0 ? 0 : Math.PI);
      } else {
        const want = w.lane.axis === 'x' ? (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (w.dir > 0 ? 0 : Math.PI);
        w.yaw = lerpAngle(w.yaw, want, Math.min(1, dt * 6));
        moving = true;
      }
      if (w.lane.axis === 'x') { w.x = w.pos; w.z = w.lane.fixed; } else { w.x = w.lane.fixed; w.z = w.pos; }
    }
    // אנימציית גוף
    const prevPh = fig.phase;
    if (moving) fig.phase += dt * w.speed * sp * 5.2;
    const s = Math.sin(fig.phase);
    let armL = 0, armR = fig.armRBase, legSwing = 0, bob = 0, lean = 0, armZ = 0;
    if (moving && !fig.float) { legSwing = s * 0.55; armL = -s * 0.45; armR = fig.armRBase + s * (fig.armRBase ? 0.12 : 0.45); bob = Math.abs(Math.cos(fig.phase)) * 0.04; }
    if (fig.float) { bob = Math.sin(this.time * 1.6 + fig.phase) * 0.12; armL = -0.25 + Math.sin(this.time * 1.2) * 0.1; }
    if (w.mode === 'train' && !mood) {
      // אימון בחרב: הנפה והכאה
      const c = (this.time * 0.9 + fig.phase) % 1;
      armR = c < 0.55 ? -2.6 * (c / 0.55) : -2.6 + 2.2 * Math.min(1, (c - 0.55) / 0.12);
      armL = armR * 0.85;
      lean = c > 0.55 && c < 0.75 ? 0.12 : 0;
    }
    if (mood === 'alert') { armR = -2.55; armL = -0.4; lean = -0.05; }
    else if (mood === 'cheer') {
      const k = this.time * 11 + fig.phase;
      armR = -2.75 + Math.sin(k) * 0.3; armL = -2.75 - Math.sin(k) * 0.3; armZ = 0.25;
      if (w.jumpY === 0 && Math.random() < dt * 2.2) this.jump(w, rand(0.25, 0.45));
    } else if (mood === 'sad') { lean = 0.32; armL = 0.05; armR = 0.05; }
    fig.legL.rotation.x = legSwing; fig.legR.rotation.x = -legSwing;
    fig.armL.rotation.x = armL; fig.armR.rotation.x = armR;
    fig.armL.rotation.z = -armZ; fig.armR.rotation.z = armZ;
    fig.hips.position.y = 0.82 + bob;
    fig.hips.rotation.x = lean;
    if (fig.glow) fig.glow.material.opacity = 0.65 + Math.sin(this.time * 9 + fig.phase) * 0.15;
    fig.root.position.set(w.x, (fig.float ? 0.55 : 0) + w.jumpY, w.z);
    fig.root.rotation.y = w.yaw;
    // צעדים (צליל) — רק לחלק מהעידנים ובקצב מוגבל
    if (moving && !fig.float && STEP_ERAS.has(this.eraId) && Math.floor(prevPh / Math.PI) !== Math.floor(fig.phase / Math.PI)) {
      const now = this.time;
      if (now - this.lastStep > 0.22) { this.lastStep = now; this.sound?.ambientEvent?.('step', w.x / 11); }
    }
  }

  updateFlyer(f, dt, sp) {
    const o = f.obj;
    if (f.path === 'loop') {
      f.ang += f.sp * sp * dt;
      const x = Math.cos(f.ang) * f.rx, z = f.cz + Math.sin(f.ang) * f.rz;
      f.bob += dt * 1.7;
      const y = f.y + Math.sin(f.bob) * 0.25;
      const dx = -Math.sin(f.ang) * f.rx * Math.sign(f.sp), dz = Math.cos(f.ang) * f.rz * Math.sign(f.sp);
      o.position.set(x, y, z);
      o.rotation.y = Math.atan2(dz, dx) * -1;
      if (f.kind === 'drone') { o.rotation.z = Math.sin(f.bob * 0.7) * 0.08; f.light.material.opacity = (Math.sin(this.time * 7 + f.ang) > 0.3) ? 1 : 0.25; }
      if (f.kind === 'turtle') f.fins.forEach(({ p, s }, i) => { p.rotation.x = Math.sin(this.time * 3 + i) * 0.45 * s; });
      if (f.kind === 'being') { const flap = Math.sin(this.time * 6 + f.ang) * 0.55; f.wl.rotation.y = flap; f.wr.rotation.y = -flap; o.rotation.y = 0; o.lookAt(this.sm.camera.position.x, y, this.sm.camera.position.z); }
    } else if (f.path === 'pass') {
      f.x += f.sp * sp * dt;
      if (f.x > 20 || f.x < -20) { f.x = f.sp > 0 ? -20 : 20; f.y = rand(6.8, 8.8); f.z = rand(-15.5, -12); f.passed = false; }
      if (!f.passed && Math.abs(f.x) < 2) { f.passed = true; this.sound?.ambientEvent?.('hover', Math.sign(f.sp) * 0.5); }
      o.position.set(f.x, f.y + Math.sin(this.time * 2 + f.z) * 0.15, f.z);
      o.rotation.set(0, f.sp > 0 ? 0 : Math.PI, Math.sin(this.time * 1.5 + f.z) * 0.06);
    }
  }

  updateFish(dt, sp) {
    const im = this.fish, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new V(), sc = new V();
    for (const s of this.schools) s.ang += s.sp * sp * dt;
    this.fishState.forEach((fs, i) => {
      const s = this.schools[fs.s];
      const ang = s.ang + fs.off.x * 0.08;
      pos.set(Math.cos(ang) * (s.rx + fs.off.z), s.y + fs.off.y + Math.sin(this.time * 1.3 + fs.ph) * 0.2, s.cz + Math.sin(ang) * (s.rz + fs.off.z * 0.5));
      const dir = Math.sign(s.sp);
      const heading = Math.atan2(Math.cos(ang) * s.rz * dir, -Math.sin(ang) * s.rx * dir);
      e.set(0, -heading + Math.sin(this.time * 9 + fs.ph) * 0.18, 0);
      q.setFromEuler(e);
      sc.setScalar(fs.size);
      m4.compose(pos, q, sc);
      im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
  }

  updateEnvironment(dt) {
    this.envT += dt;
    if (this.envT < 0.12) return;
    const step = this.envT; this.envT = 0;
    const lo = this.low;
    if (this.eraId === 7 && Math.random() < step * (lo ? 4 : 9)) {
      // אבק זהב מרחף
      this.fx.add.emit({ count: 1, pos: [rand(-10, 10), rand(0.6, 4), rand(-14, -6.5)], spread: [0.1, 0.1, 0.1], vel: [rand(-0.15, 0.15), 0.05, 0], velSpread: [0.1, 0.06, 0.1], color: [0xffd34d, 0xfff0b0], size: [0.04, 0.09], life: [3.5, 6], drag: 0.2, gravity: -0.02 });
    } else if (this.eraId === 9 && Math.random() < step * (lo ? 5 : 11)) {
      // בועות עולות מהקרקעית
      this.fx.add.emit({ count: lo ? 2 : 3, pos: [rand(-10, 10), 0.3, rand(-15, -6.5)], spread: [0.15, 0.05, 0.15], vel: [0, rand(0.9, 1.5), 0], velSpread: [0.15, 0.2, 0.15], color: [0xbff6ff, 0xffffff, 0x80e0ff], size: [0.05, 0.13], life: [2.4, 4], drag: 0.15, gravity: -0.15 });
    }
    if (this.neon.length && Math.random() < step * 0.6) {
      // הבהוב ניאון "גליץ'"
      const n = this.neon[Math.floor(Math.random() * this.neon.length)];
      const tl = gsap.timeline();
      tl.to(n.m, { emissiveIntensity: n.base * 0.15, duration: 0.04 }).to(n.m, { emissiveIntensity: n.base, duration: 0.05 }).to(n.m, { emissiveIntensity: n.base * 0.3, duration: 0.03, delay: 0.06 }).to(n.m, { emissiveIntensity: n.base, duration: 0.08 });
    }
  }

  updateAmbientSound() {
    if (!this.nextAmb.length || !this.sound?.ok) return;
    const now = performance.now() / 1000;
    for (const ev of this.nextAmb) {
      if (now < ev.at) continue;
      ev.at = now + rand(ev.a, ev.b);
      this.sound.ambientEvent?.(ev.k, rand(-0.6, 0.6));
    }
  }
}

// ---------- עזרים ----------
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return a + d * t;
}
function isDescendant(o, ancestor) { for (let p = o.parent; p; p = p.parent) if (p === ancestor) return true; return false; }
function glowSpriteSmall(color, scale) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.setScalar(scale);
  return s;
}
let _shadowTex = null;
function shadowTexture() {
  if (_shadowTex) return _shadowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(0,0,0,0.9)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _shadowTex = new THREE.CanvasTexture(c);
  return _shadowTex;
}
