/**
 * חיות מחמד תלת-ממדיות על כן מעוטר: 9 יצורים פרוצדורליים + 12 החיות המעופפות של קן השמיים, עם שלד פשוט,
 * אנימציית מנוחה (נשימה, ריחוף, מבט לכלי הפעיל, זנב/כנפיים) ותגובות למשחק.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { mesh, G, glowTexture, drawnTexture, addRim, rand, TAU, addCharacterRim, contactShadow } from './kit.js';

const std = (color, rough = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const eyeMat = (color = 0xffc040) => std(color, 0.2, 0, { emissive: color, emissiveIntensity: 0.6 });

function newRig() {
  return { root: new THREE.Group(), body: new THREE.Group(), head: new THREE.Group(), tails: [], wings: [], legs: [], eyes: [], mouth: new THREE.Object3D(), hover: false, flap: 0, wag: 1 };
}

function tailChain(parent, mat, segs, r0, len, { up = 0.5, taper = 0.75, fluff = false } = {}) {
  const chain = [];
  let p = parent;
  let r = r0;
  for (let i = 0; i < segs; i++) {
    const g = new THREE.Group();
    g.rotation.x = i === 0 ? -up : -0.12;
    const m = fluff ? mesh(G.sph(r * 1.6, 10, 8), mat, { pos: [0, 0, -len / 2], scale: [1, 1, 1.6], cast: true }) : mesh(G.cyl(r * taper, r, len, 8), mat, { pos: [0, 0, -len / 2], rot: [Math.PI / 2, 0, 0], cast: true });
    g.add(m);
    p.add(g);
    if (i > 0) g.position.z = -len;
    chain.push(g);
    p = g;
    r *= taper;
  }
  return chain;
}

function wingShape(span = 1, feather = false) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  if (feather) {
    s.bezierCurveTo(span * 0.3, span * 0.35, span * 0.75, span * 0.45, span, span * 0.25);
    for (let i = 0; i < 5; i++) { const x = span * (1 - i * 0.2), y = span * (0.25 - i * 0.1); s.lineTo(x - span * 0.08, y - span * 0.2); s.lineTo(x - span * 0.2, y - span * 0.08); }
    s.lineTo(0, -span * 0.12);
  } else {
    s.lineTo(span * 0.35, span * 0.45); s.lineTo(span, span * 0.4);
    s.quadraticCurveTo(span * 0.82, span * 0.1, span * 0.95, -span * 0.15);
    s.quadraticCurveTo(span * 0.62, -span * 0.02, span * 0.6, -span * 0.3);
    s.quadraticCurveTo(span * 0.38, -span * 0.1, span * 0.25, -span * 0.32);
    s.quadraticCurveTo(span * 0.12, -span * 0.1, 0, -span * 0.12);
  }
  s.lineTo(0, 0);
  return new THREE.ShapeGeometry(s, 8);
}

/** UV לפי תיבת הגבול של הצורה (0..1) — כך שמעבר צבעים במרקם הכנף נמתח מהגוף ועד הקצה */
function fitUV(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox, p = geo.attributes.position, uv = geo.attributes.uv;
  const w = b.max.x - b.min.x || 1, h = b.max.y - b.min.y || 1;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / w, (p.getY(i) - b.min.y) / h);
  uv.needsUpdate = true;
  return geo;
}

function addWings(rig, mat, span, y, z, feather = false, { fit = false } = {}) {
  const geo = wingShape(span, feather);
  // כנפי קן השמיים: בלי תאורת שוליים — במבט מהצד היא מלבינה את כל הכנף הדקה
  if (fit) { fitUV(geo); mat.userData.noCharRim = true; }
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.12, y, z);
    const w = new THREE.Mesh(geo, mat);
    w.castShadow = true;
    w.rotation.set(-Math.PI / 2 + 0.25, 0, 0);
    w.scale.x = s;
    pivot.add(w);
    pivot.userData.side = s;
    rig.body.add(pivot);
    rig.wings.push(pivot);
  }
}

/** בונה בעל-חיים בעל ארבע רגליים */
function quadruped(rig, o) {
  const legLen = o.legLen ?? 0.3, bodyR = o.bodyR ?? 0.2, bodyLen = o.bodyLen ?? 0.45;
  const by = legLen + bodyR;
  rig.body.position.y = by;
  rig.body.add(mesh(G.capsule(bodyR, bodyLen, 6, 14), o.bodyMat, { rot: [Math.PI / 2, 0, 0], cast: true, receive: true }));
  if (o.bellyMat) rig.body.add(mesh(G.capsule(bodyR * 0.82, bodyLen * 0.8, 6, 12), o.bellyMat, { pos: [0, -bodyR * 0.25, 0], rot: [Math.PI / 2, 0, 0] }));
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Group();
    leg.position.set(x * bodyR * 0.6, -bodyR * 0.3, z * bodyLen * 0.42);
    leg.add(mesh(G.cyl(o.legR ?? 0.05, (o.legR ?? 0.05) * 1.2, legLen + 0.06, 8), o.legMat || o.bodyMat, { pos: [0, -(legLen + 0.06) / 2, 0], cast: true }));
    if (o.hoofMat) leg.add(mesh(G.cyl((o.legR ?? 0.05) * 1.3, (o.legR ?? 0.05) * 1.4, 0.07, 8), o.hoofMat, { pos: [0, -legLen + 0.02, 0] }));
    else leg.add(mesh(G.sph((o.legR ?? 0.05) * 1.5, 8, 6), o.legMat || o.bodyMat, { pos: [0, -legLen + 0.03, 0.02], scale: [1, 0.6, 1.3] }));
    rig.body.add(leg);
    rig.legs.push(leg);
  }
  // ראש (עם צוואר לסוסים)
  if (o.neck) {
    const neck = new THREE.Group();
    neck.position.set(0, bodyR * 0.5, bodyLen * 0.45);
    neck.rotation.x = -0.75;
    neck.add(mesh(G.cyl(0.09, 0.13, 0.42, 10), o.bodyMat, { pos: [0, 0.2, 0], cast: true }));
    rig.body.add(neck);
    rig.head.position.set(0, 0.42, 0);
    rig.head.rotation.x = 0.75;
    neck.add(rig.head);
  } else {
    rig.head.position.set(0, bodyR * 0.85, bodyLen / 2 + 0.12);
    rig.body.add(rig.head);
  }
  const hr = o.headR ?? 0.17;
  rig.head.add(mesh(G.sph(hr, 16, 12), o.headMat || o.bodyMat, { scale: o.headScale || [1, 0.95, 1.05], cast: true }));
  if (o.snout) {
    const [sw, sh, sl] = o.snout;
    rig.head.add(mesh(G.box(sw, sh, sl), o.snoutMat || o.headMat || o.bodyMat, { pos: [0, -hr * 0.25, hr * 0.75 + sl * 0.35], cast: true }));
    rig.head.add(mesh(G.sph(sw * 0.32, 8, 6), std(0x111111, 0.4), { pos: [0, -hr * 0.12, hr * 0.75 + sl * 0.85] }));
    rig.mouth.position.set(0, -hr * 0.3, hr * 0.75 + sl);
  } else {
    rig.mouth.position.set(0, -hr * 0.2, hr * 1.1);
  }
  rig.head.add(rig.mouth);
  if (o.ears) {
    for (const s of [-1, 1]) rig.head.add(mesh(G.cone(o.ears[0], o.ears[1], 6), o.earMat || o.bodyMat, { pos: [s * hr * 0.55, hr * 0.85, -hr * 0.1], rot: [-0.2, 0, -s * 0.25], cast: true }));
  }
  for (const s of [-1, 1]) {
    const e = mesh(G.sph(hr * 0.16, 10, 8), o.eyeMat, { pos: [s * hr * 0.45, hr * 0.2, hr * 0.82] });
    rig.head.add(e);
    rig.eyes.push(e);
  }
  // זנב
  const tailBase = new THREE.Group();
  tailBase.position.set(0, bodyR * 0.45, -bodyLen / 2 - bodyR * 0.5);
  rig.body.add(tailBase);
  const tails = o.twinTails ? [-0.35, 0.35] : [0];
  tails.forEach((yaw) => {
    const tb = new THREE.Group(); tb.rotation.y = yaw; tailBase.add(tb);
    rig.tails.push(tailChain(tb, o.tailMat || o.bodyMat, o.tailSegs ?? 4, o.tailR ?? 0.06, o.tailLen ?? 0.12, { up: o.tailUp ?? 0.6, fluff: o.fluffyTail }));
  });
  return rig;
}

function bird(rig, o) {
  rig.body.position.y = 0.42;
  rig.body.add(mesh(G.sph(0.3, 18, 14), o.bodyMat, { scale: [1, 1.25, 0.95], cast: true }));
  if (o.bellyMat) rig.body.add(mesh(G.sph(0.24, 14, 10), o.bellyMat, { pos: [0, -0.05, 0.12], scale: [1, 1.2, 0.8] }));
  rig.head.position.set(0, 0.42, 0.04);
  rig.body.add(rig.head);
  rig.head.add(mesh(G.sph(0.24, 18, 14), o.headMat || o.bodyMat, { cast: true }));
  if (o.faceDisc) for (const s of [-1, 1]) rig.head.add(mesh(new THREE.CircleGeometry(0.1, 20), o.faceDisc, { pos: [s * 0.09, 0.02, 0.215], rot: [0, s * 0.3, 0] }));
  for (const s of [-1, 1]) {
    const e = mesh(G.sph(o.eyeR ?? 0.055, 12, 10), o.eyeMat, { pos: [s * 0.09, 0.03, 0.22] });
    rig.head.add(e);
    rig.eyes.push(e);
    rig.head.add(mesh(G.sph((o.eyeR ?? 0.055) * 0.45, 8, 6), std(0x050505, 0.2), { pos: [s * 0.09, 0.03, 0.27] }));
  }
  rig.head.add(mesh(G.cone(0.045, 0.14, 8), o.beakMat, { pos: [0, -0.06, 0.25], rot: [Math.PI / 2 + 0.4, 0, 0] }));
  rig.mouth.position.set(0, -0.06, 0.32);
  rig.head.add(rig.mouth);
  if (o.tufts) for (const s of [-1, 1]) rig.head.add(mesh(G.cone(0.05, 0.16, 6), o.bodyMat, { pos: [s * 0.13, 0.22, 0], rot: [0, 0, -s * 0.4] }));
  if (o.crest) for (let i = 0; i < 5; i++) rig.head.add(mesh(G.cone(0.03, 0.26, 6), o.crest, { pos: [0, 0.22, -0.05 - i * 0.03], rot: [-0.5 - i * 0.18, 0, 0] }));
  addWings(rig, o.wingMat, o.wingSpan ?? 0.55, 0.12, -0.02, true, { fit: o.wingFit });
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.1, -0.33, 0.05);
    leg.add(mesh(G.cyl(0.025, 0.025, 0.14, 6), o.beakMat, { pos: [0, -0.04, 0] }));
    rig.body.add(leg);
    rig.legs.push(leg);
  }
  if (o.tailFeathers) {
    const tb = new THREE.Group(); tb.position.set(0, -0.15, -0.25); rig.body.add(tb);
    const chain = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group(); g.rotation.set(0.9, (i - 2) * 0.22, 0);
      g.add(mesh(G.box(0.06, 0.01, 0.75), o.tailFeathers, { pos: [0, 0, -0.38] }));
      tb.add(g); chain.push(g);
    }
    rig.tails.push(chain);
  }
  return rig;
}

// ---------- עזרים לחיות המעופפות ----------
/** מרקם כנף: מעבר צבעים מהגוף (שמאל) לקצה (ימין) + עורקים / נקודות אופציונליים */
function wingTex(key, stops, { veins = null, dots = null } = {}) {
  return drawnTexture(key, 128, (c, sz) => {
    const g = c.createLinearGradient(0, 0, sz, 0);
    stops.forEach((col, i) => g.addColorStop(i / (stops.length - 1), col));
    c.fillStyle = g; c.fillRect(0, 0, sz, sz);
    if (veins) { c.strokeStyle = veins; c.lineWidth = 2.5; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, sz * 0.5); c.quadraticCurveTo(sz * 0.5, sz * (0.5 + (i - 2.5) * 0.08), sz, (i / 5) * sz); c.stroke(); } }
    if (dots) { c.fillStyle = dots; for (let i = 0; i < 44; i++) { c.beginPath(); c.arc(((i * 37) % 97) / 97 * sz, ((i * 61) % 89) / 89 * sz, 0.6 + (i % 3) * 0.7, 0, TAU); c.fill(); } }
  });
}
const featherMat = (key, stops, { metal = 0, glow = 0, ...o } = {}) => {
  const map = wingTex(key, stops, o);
  // מחזירות סביבה חלשה: כנף דקה במבט מהצד אחרת משקפת את כל השמיים ונראית לבנה
  return new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.72, metalness: metal * 0.6, envMapIntensity: 0.3, ...(glow ? { emissive: 0xffffff, emissiveMap: map, emissiveIntensity: glow } : {}) });
};
/** כנף בצורה חופשית (פרפר, סנפיר) — מונחת אופקית; ‎+y של הצורה פונה אחורה */
function flatWing(shape, mat, side) {
  const geo = fitUV(new THREE.ShapeGeometry(shape, 12));
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.scale.x = side;
  m.castShadow = true;
  mat.userData.noCharRim = true;
  return m;
}
/** טבעת קטנה של חלקיקים שחגה סביב החיה (מסתובבת בתוך spinners) */
function orbitRing(rig, mat, n, r, { y = 0.05, scale = [1, 1, 1], tilt = 0 } = {}) {
  const g = new THREE.Group();
  g.rotation.x = Math.PI / 2 + tilt;
  g.position.y = y;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; g.add(mesh(G.octa(0.035), mat, { pos: [Math.cos(a) * r, Math.sin(a) * r, Math.sin(a * 2) * 0.05], rot: [0, 0, a], scale })); }
  rig.body.add(g);
  (rig.spinners ||= []).push(g);
  return g;
}

// ---------- 8 החיות ----------
const BUILDERS = {
  wolf_cub(rig) {
    const fur = std(0x8a8f96, 0.9), light = std(0xd6d6d2, 0.9);
    quadruped(rig, { bodyMat: fur, bellyMat: light, headMat: fur, snoutMat: light, eyeMat: eyeMat(0xffb020), snout: [0.12, 0.1, 0.18], ears: [0.06, 0.16], tailMat: fur, fluffyTail: true, tailR: 0.05, tailLen: 0.1, tailSegs: 4, tailUp: 0.8 });
    rig.wag = 2.2;
    rig.voice = 'wolf'; rig.fxColor = [0xffffff, 0xc8d8ff, 0xffe08a];
  },
  royal_owl(rig) {
    const bronze = std(0xa8743c, 0.45, 0.65);
    bird(rig, { bodyMat: bronze, bellyMat: std(0xe8d0a8, 0.8), faceDisc: std(0xf2e6cc, 0.7, 0, { side: THREE.DoubleSide }), eyeMat: eyeMat(0xffc020), eyeR: 0.06, beakMat: std(0xe0b048, 0.3, 1), wingMat: std(0x8a5a2a, 0.5, 0.5, { side: THREE.DoubleSide }), tufts: true, wingSpan: 0.5 });
    rig.voice = 'owl'; rig.fxColor = [0xffd36a, 0xffffff, 0xc8a060];
  },
  armor_steed(rig) {
    const coat = std(0x6a4630, 0.75), steel = std(0xc8ced8, 0.3, 1), red = std(0xa01a20, 0.6);
    quadruped(rig, { bodyMat: coat, headMat: coat, eyeMat: eyeMat(0x88ccff), neck: true, headR: 0.13, headScale: [0.85, 0.9, 1.4], snout: [0.12, 0.12, 0.14], ears: [0.04, 0.12], legLen: 0.4, legR: 0.045, hoofMat: std(0x1a1410, 0.5), bodyR: 0.19, bodyLen: 0.55, tailMat: std(0x2a1a10, 0.8), tailR: 0.04, tailLen: 0.14, tailSegs: 4, tailUp: 0.2 });
    rig.body.add(mesh(G.box(0.36, 0.22, 0.12), steel, { pos: [0, 0.02, 0.4], cast: true }));
    rig.body.add(mesh(G.box(0.42, 0.06, 0.42), red, { pos: [0, 0.2, -0.02] }));
    rig.body.add(mesh(G.box(0.3, 0.08, 0.28), std(0x3a2414, 0.6), { pos: [0, 0.25, -0.02] }));
    rig.head.add(mesh(G.box(0.2, 0.1, 0.3), steel, { pos: [0, 0.07, 0.1], cast: true }));
    rig.head.add(mesh(G.cone(0.03, 0.14, 6), steel, { pos: [0, 0.16, 0.12], rot: [0.5, 0, 0] }));
    for (let i = 0; i < 5; i++) rig.head.parent.add(mesh(G.box(0.03, 0.12, 0.06), std(0x1a120a, 0.8), { pos: [0, 0.08 + i * 0.07, -0.06] }));
    rig.voice = 'horse'; rig.fxColor = [0xffffff, 0xc8ced8, 0xffd36a];
  },
  fire_dragon(rig) {
    const scale = std(0xa3161a, 0.4, 0.2), gold = std(0xe8b84a, 0.3, 1);
    const wingTex = drawnTexture('dragonWing', 128, (c, s) => { const g = c.createLinearGradient(0, 0, s, s); g.addColorStop(0, '#5a0a0e'); g.addColorStop(1, '#e8a030'); c.fillStyle = g; c.fillRect(0, 0, s, s); });
    quadruped(rig, { bodyMat: scale, bellyMat: gold, headMat: scale, snoutMat: scale, eyeMat: eyeMat(0xffd020), snout: [0.13, 0.09, 0.22], ears: [0.03, 0.2], earMat: gold, bodyR: 0.19, bodyLen: 0.5, legLen: 0.22, tailMat: scale, tailSegs: 6, tailR: 0.07, tailLen: 0.13, tailUp: 0.3 });
    addWings(rig, new THREE.MeshStandardMaterial({ map: wingTex, side: THREE.DoubleSide, roughness: 0.6 }), 0.85, 0.16, 0.08);
    const lastTail = rig.tails[0][rig.tails[0].length - 1];
    lastTail.add(mesh(G.cone(0.07, 0.16, 4), gold, { pos: [0, 0, -0.2], rot: [-Math.PI / 2, 0, 0] }));
    for (let i = 0; i < 5; i++) rig.body.add(mesh(G.cone(0.035, 0.1, 4), gold, { pos: [0, 0.2, 0.2 - i * 0.12] }));
    rig.hover = true; rig.flap = 1;
    rig.voice = 'dragon'; rig.fxColor = [0xffd060, 0xff8a20, 0xff3010];
  },
  clockwork_dragon(rig) {
    // דרקון שעונים מזהב ופליז: גלגלי שיניים מסתובבים, עיניים זוהרות בטורקיז, כנפי מתכת
    const brass = std(0xd0a040, 0.3, 1), gold = std(0xf2c14e, 0.22, 1), dark = std(0x5a3a1a, 0.4, 0.8), copper = std(0xc87a40, 0.32, 1);
    const wingTex = drawnTexture('clockWing', 128, (c, s) => {
      const g = c.createLinearGradient(0, 0, s, s); g.addColorStop(0, '#8a5a1a'); g.addColorStop(1, '#f2c14e'); c.fillStyle = g; c.fillRect(0, 0, s, s);
      c.strokeStyle = '#fff0b8'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, s); c.lineTo(s * (i / 5), 0); c.stroke(); }
      c.strokeStyle = 'rgba(80,230,255,0.9)'; c.lineWidth = 2; c.strokeRect(4, 4, s - 8, s - 8);
    });
    quadruped(rig, { bodyMat: brass, bellyMat: copper, headMat: brass, snoutMat: gold, eyeMat: eyeMat(0x33e8ff), snout: [0.13, 0.09, 0.22], ears: [0.03, 0.2], earMat: gold, bodyR: 0.19, bodyLen: 0.5, legLen: 0.22, legMat: copper, tailMat: brass, tailSegs: 6, tailR: 0.07, tailLen: 0.13, tailUp: 0.3 });
    addWings(rig, new THREE.MeshStandardMaterial({ map: wingTex, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.75 }), 0.85, 0.16, 0.08);
    rig.spinners = [];
    const gear = (r, x, y, z, ry) => {
      const g = new THREE.Group();
      g.position.set(x, y, z); g.rotation.y = ry;
      g.add(mesh(G.torus(r, r * 0.22, 6, 18), gold, { cast: true }));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.add(mesh(G.box(r * 0.3, r * 0.3, r * 0.22), gold, { pos: [Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15, 0], rot: [0, 0, a] })); }
      g.add(mesh(G.cyl(r * 0.3, r * 0.3, r * 0.3, 8), dark, { rot: [Math.PI / 2, 0, 0] }));
      rig.body.add(g);
      rig.spinners.push(g);
    };
    gear(0.09, 0.2, 0.04, 0.05, Math.PI / 2); gear(0.09, -0.2, 0.04, 0.05, Math.PI / 2); gear(0.07, 0, 0.21, -0.12, 0); gear(0.06, 0, 0.21, 0.12, 0);
    const lastTail = rig.tails[0][rig.tails[0].length - 1];
    lastTail.add(mesh(G.cone(0.07, 0.16, 4), gold, { pos: [0, 0, -0.2], rot: [-Math.PI / 2, 0, 0] }));
    for (let i = 0; i < 4; i++) rig.body.add(mesh(G.cone(0.03, 0.09, 4), copper, { pos: [0, 0.2, 0.26 - i * 0.16] }));
    rig.hover = true; rig.flap = 1;
    rig.voice = 'dragon'; rig.fxColor = [0xffd36a, 0x33e8ff, 0xffffff];
  },
  golden_phoenix(rig) {
    const gold = std(0xffb830, 0.3, 0.6, { emissive: 0xff8a10, emissiveIntensity: 0.55 });
    const flameM = std(0xffd060, 0.3, 0, { emissive: 0xff6a10, emissiveIntensity: 1.2, side: THREE.DoubleSide });
    bird(rig, { bodyMat: gold, headMat: gold, eyeMat: eyeMat(0xfff6c0), beakMat: std(0xfff0c0, 0.3, 1), wingMat: flameM, crest: flameM, tailFeathers: flameM, wingSpan: 0.7 });
    rig.body.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff9a30, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })));
    rig.body.children[rig.body.children.length - 1].scale.setScalar(1.6);
    rig.hover = true; rig.flap = 1.2; rig.trail = [0xffd060, 0xff8a20, 0xfff0c0];
    rig.voice = 'phoenix'; rig.fxColor = [0xffd060, 0xffffff, 0xff8a20];
  },
  cyber_fox(rig) {
    const holo = addRim(std(0x0a4a5a, 0.2, 0.2, { transparent: true, opacity: 0.62, emissive: 0x00d8ff, emissiveIntensity: 0.7 }), 0x9ffcff, 1.8, 1.8);
    const neon = std(0x33f0ff, 0.2, 0, { emissive: 0x33f0ff, emissiveIntensity: 2 });
    quadruped(rig, { bodyMat: holo, headMat: holo, snoutMat: holo, eyeMat: eyeMat(0xff3ad8), snout: [0.09, 0.08, 0.2], ears: [0.07, 0.22], earMat: neon, bodyR: 0.16, bodyLen: 0.48, legLen: 0.28, legR: 0.04, tailMat: holo, fluffyTail: true, twinTails: true, tailR: 0.045, tailLen: 0.1, tailSegs: 5, tailUp: 0.7 });
    const wire = new THREE.LineBasicMaterial({ color: 0x66f8ff, transparent: true, opacity: 0.5 });
    rig.body.add(new THREE.LineSegments(new THREE.EdgesGeometry(G.capsule(0.165, 0.48, 3, 8)), wire).rotateX(Math.PI / 2));
    rig.wag = 3; rig.voice = 'fox'; rig.fxColor = [0x33f0ff, 0xff3ad8, 0xffffff]; rig.ringFx = true;
  },
  mythic_griffin(rig) {
    const lion = std(0xc89a50, 0.75), white = std(0xf2eee4, 0.8), gold = std(0xf2c14e, 0.3, 1);
    quadruped(rig, { bodyMat: lion, headMat: white, eyeMat: eyeMat(0xffa020), headR: 0.17, ears: [0.04, 0.13], earMat: white, bodyR: 0.2, bodyLen: 0.5, legLen: 0.28, tailMat: lion, tailSegs: 5, tailR: 0.035, tailLen: 0.13, tailUp: 0.3 });
    rig.head.add(mesh(G.cone(0.07, 0.2, 8), gold, { pos: [0, -0.05, 0.22], rot: [Math.PI / 2 + 0.5, 0, 0] }));
    rig.mouth.position.set(0, -0.08, 0.32);
    const lt = rig.tails[0][rig.tails[0].length - 1];
    lt.add(mesh(G.sph(0.06, 8, 6), std(0x6a4a20, 0.8), { pos: [0, 0, -0.16] }));
    addWings(rig, std(0xf2c14e, 0.35, 0.8, { side: THREE.DoubleSide }), 0.8, 0.16, 0.1, true);
    rig.flap = 0.5; rig.voice = 'griffin'; rig.fxColor = [0xfff6a0, 0xffffff, 0x9ad8ff]; rig.thunder = true;
  },
  crystal_unicorn(rig) {
    const crystal = new THREE.MeshPhysicalMaterial({ color: 0xf4f0ff, roughness: 0.08, metalness: 0.1, iridescence: 1, iridescenceIOR: 1.4, clearcoat: 1, flatShading: true });
    const horn = std(0xfff0ff, 0.2, 0.3, { emissive: 0xff9af0, emissiveIntensity: 1.4 });
    quadruped(rig, { bodyMat: crystal, headMat: crystal, eyeMat: eyeMat(0x9ad8ff), neck: true, headR: 0.13, headScale: [0.85, 0.9, 1.35], snout: [0.11, 0.11, 0.12], ears: [0.04, 0.11], legLen: 0.4, legR: 0.045, hoofMat: std(0xd8c8ff, 0.2, 1), bodyR: 0.18, bodyLen: 0.52, tailMat: std(0xffb8e8, 0.4, 0, { emissive: 0x8a4aff, emissiveIntensity: 0.4 }), fluffyTail: true, tailR: 0.04, tailLen: 0.1, tailSegs: 4, tailUp: 0.3 });
    const hg = new THREE.ConeGeometry(0.035, 0.32, 12, 8);
    const p = hg.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.16; const a = y * 25; const x = p.getX(i), z = p.getZ(i); p.setX(i, x * Math.cos(a) - z * Math.sin(a)); p.setZ(i, x * Math.sin(a) + z * Math.cos(a)); }
    hg.computeVertexNormals();
    rig.head.add(mesh(hg, horn, { pos: [0, 0.16, 0.08], rot: [0.45, 0, 0] }));
    const rainbow = drawnTexture('rainbowAura', 256, (c, s) => {
      const cols = ['#ff4a6a', '#ffb04a', '#fff04a', '#4aff8a', '#4ad8ff', '#a04aff'];
      cols.forEach((col, i) => { c.strokeStyle = col; c.globalAlpha = 0.55; c.lineWidth = 10; c.beginPath(); c.arc(s / 2, s / 2, s * 0.3 + i * 10, 0, TAU); c.stroke(); });
    });
    const aura = mesh(G.plane(1.6, 1.6), new THREE.MeshBasicMaterial({ map: rainbow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.02, 0] });
    rig.root.add(aura);
    rig.aura = aura;
    for (let i = 0; i < 6; i++) rig.head.parent?.add(mesh(G.box(0.04, 0.1, 0.06), std(['#ff6a8a', '#ffd06a', '#6ad8ff', '#b06aff'][i % 4], 0.5), { pos: [0, 0.08 + i * 0.06, -0.06] }));
    rig.voice = 'unicorn'; rig.fxColor = [0xff8ad8, 0x8ad8ff, 0xfff08a, 0xffffff];
  },
  // ---------- קן השמיים: 12 החיות המעופפות ----------
  sky_parrot(rig) {
    const red = std(0xe3262e, 0.45, 0.05), ivory = std(0xf4ead8, 0.35);
    bird(rig, {
      bodyMat: red, headMat: red, bellyMat: std(0xf2502a, 0.5), faceDisc: std(0xfff8ee, 0.85, 0, { side: THREE.DoubleSide }), eyeMat: eyeMat(0xffe060), eyeR: 0.045,
      beakMat: ivory, wingMat: featherMat('parrotWing', ['#ffd23a', '#38c46a', '#1f5fd0', '#16348a']), tailFeathers: std(0x1f5fd0, 0.45, 0.1), wingSpan: 0.62, wingFit: true,
    });
    // מקור מעוקל: כיפה בהירה למעלה ולסת כהה למטה
    rig.head.add(mesh(G.sph(0.075, 12, 10), ivory, { pos: [0, -0.03, 0.235], scale: [0.85, 1, 1.15], cast: true }));
    rig.head.add(mesh(G.cone(0.035, 0.11, 8), ivory, { pos: [0, -0.1, 0.285], rot: [Math.PI - 0.3, 0, 0] }));
    rig.head.add(mesh(G.sph(0.045, 10, 8), std(0x2a2420, 0.5), { pos: [0, -0.1, 0.2] }));
    rig.hover = true; rig.flap = 1.1; rig.sky = true;
    rig.voice = 'parrot'; rig.fxColor = [0xff3a3a, 0xffd23a, 0x3a8aff];
  },
  sky_raven(rig) {
    const ink = addRim(std(0x17161f, 0.3, 0.45), 0x8a6aff, 2.6, 0.7);
    bird(rig, {
      bodyMat: ink, headMat: ink, eyeMat: eyeMat(0x5ad8ff), eyeR: 0.05, beakMat: std(0x2a2a33, 0.3, 0.6), crest: ink, tailFeathers: ink,
      wingMat: featherMat('ravenWing', ['#0e0e16', '#1c1a2e', '#3a2a6a', '#5a8aff'], { veins: 'rgba(160,140,255,0.35)' }), wingSpan: 0.68, wingFit: true,
    });
    // ניצוצות ברק שחגים סביב
    const bolt = std(0x9ad8ff, 0.3, 0, { emissive: 0x6ab8ff, emissiveIntensity: 2.2 });
    orbitRing(rig, bolt, 3, 0.44, { y: 0.1, scale: [0.6, 2.4, 0.6], tilt: 0.4 });
    orbitRing(rig, bolt, 3, 0.4, { y: 0.02, scale: [0.6, 2.2, 0.6], tilt: -0.4 });
    rig.hover = true; rig.flap = 1; rig.sky = true; rig.thunder = true;
    rig.voice = 'raven'; rig.fxColor = [0x9ad8ff, 0xffffff, 0x9a6aff];
  },
  sky_eagle(rig) {
    const brown = std(0x7a4a22, 0.6, 0.15), white = std(0xf6f0e2, 0.75), gold = std(0xffc21a, 0.3, 0.3);
    bird(rig, {
      bodyMat: brown, headMat: white, eyeMat: eyeMat(0xffb000), eyeR: 0.045, beakMat: gold, tailFeathers: white,
      wingMat: featherMat('eagleWing', ['#5a3216', '#8a5a26', '#c8962a', '#ffe08a'], { metal: 0.45 }), wingSpan: 0.86, wingFit: true,
    });
    rig.head.add(mesh(G.cone(0.04, 0.1, 8), gold, { pos: [0, -0.11, 0.3], rot: [Math.PI - 0.5, 0, 0] })); // קצה מקור מעוקל
    for (const s of [-1, 1]) rig.head.add(mesh(G.box(0.11, 0.03, 0.07), white, { pos: [s * 0.085, 0.085, 0.2], rot: [0.2, 0, s * 0.35] })); // גבות — מבט חד
    rig.hover = true; rig.flap = 0.8; rig.sky = true;
    rig.voice = 'eagle'; rig.fxColor = [0xffd36a, 0xffffff, 0xc8a060];
  },
  sky_bat(rig) {
    const fur = std(0x3b2c4e, 0.85), light = std(0x6e5c84, 0.85), pink = std(0xd88aa8, 0.6);
    rig.body.position.y = 0.46;
    rig.body.add(mesh(G.sph(0.2, 16, 12), fur, { scale: [1, 1.15, 0.95], cast: true }));
    rig.body.add(mesh(G.sph(0.16, 12, 10), light, { pos: [0, -0.04, 0.08], scale: [1, 1.1, 0.8] }));
    rig.head.position.set(0, 0.26, 0.05);
    rig.body.add(rig.head);
    rig.head.add(mesh(G.sph(0.16, 16, 12), fur, { cast: true }));
    rig.head.add(mesh(G.sph(0.07, 10, 8), light, { pos: [0, -0.04, 0.13], scale: [1.1, 0.8, 0.9] }));
    rig.head.add(mesh(G.sph(0.02, 6, 4), std(0x111111, 0.4), { pos: [0, -0.01, 0.2] }));
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.09, 0.12, -0.01); ear.rotation.set(-0.15, 0, -s * 0.32);
      ear.add(mesh(G.cone(0.065, 0.24, 8), fur, { pos: [0, 0.11, 0], cast: true }));
      ear.add(mesh(G.cone(0.04, 0.17, 8), pink, { pos: [0, 0.1, 0.03] }));
      rig.head.add(ear);
      const e = mesh(G.sph(0.035, 10, 8), eyeMat(0xd8f0ff), { pos: [s * 0.065, 0.03, 0.135] });
      rig.head.add(e); rig.eyes.push(e);
      rig.head.add(mesh(G.cone(0.012, 0.04, 5), std(0xffffff, 0.3), { pos: [s * 0.025, -0.1, 0.16], rot: [Math.PI, 0, 0] })); // ניבים
      const leg = new THREE.Group(); leg.position.set(s * 0.07, -0.22, 0);
      leg.add(mesh(G.cyl(0.018, 0.018, 0.12, 6), fur, { pos: [0, -0.04, 0] }));
      rig.body.add(leg); rig.legs.push(leg);
    }
    rig.mouth.position.set(0, -0.08, 0.17); rig.head.add(rig.mouth);
    addWings(rig, featherMat('batWing', ['#2a1a3a', '#4a2a6a', '#8a5ab8'], { veins: 'rgba(16,8,26,0.75)' }), 0.72, 0.08, 0, false, { fit: true });
    // ירח קטן זוהר מעל הראש
    const moon = new THREE.Shape();
    moon.absarc(0, 0, 0.11, 1.038, 5.245, false);
    moon.absarc(0.05, 0, 0.095, 4.774, 1.51, true);
    const mg = new THREE.Group(); mg.position.set(0.14, 0.62, -0.04); mg.rotation.z = 0.5;
    mg.add(new THREE.Mesh(new THREE.ShapeGeometry(moon, 12), new THREE.MeshBasicMaterial({ color: 0xfff2b0, side: THREE.DoubleSide, toneMapped: false })));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff2b0, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(0.5); mg.add(halo);
    rig.body.add(mg);
    rig.hover = true; rig.flap = 1.4; rig.sky = true; rig.trail = [0xd8e8ff, 0xb08aff, 0xffffff];
    rig.voice = 'bat'; rig.fxColor = [0xd8f0ff, 0xb08aff, 0xffffff];
  },
  sky_pegasus(rig) {
    const coat = std(0xf8f6f2, 0.45, 0.05), gold = std(0xf2c14e, 0.25, 1), mane = std(0x9ad8ff, 0.4, 0, { emissive: 0x4a8aff, emissiveIntensity: 0.45 });
    quadruped(rig, {
      bodyMat: coat, headMat: coat, eyeMat: eyeMat(0x6ab8ff), neck: true, headR: 0.13, headScale: [0.85, 0.9, 1.35], snout: [0.11, 0.11, 0.12], ears: [0.04, 0.11],
      legLen: 0.4, legR: 0.045, hoofMat: gold, bodyR: 0.18, bodyLen: 0.52, tailMat: mane, fluffyTail: true, tailR: 0.045, tailLen: 0.11, tailSegs: 4, tailUp: 0.3,
    });
    const white = std(0xffffff, 0.5, 0, { emissive: 0x9ad8ff, emissiveIntensity: 0.3 });
    for (let i = 0; i < 6; i++) rig.head.parent?.add(mesh(G.box(0.045, 0.1, 0.07), i % 2 ? mane : white, { pos: [0, 0.08 + i * 0.06, -0.06] }));
    addWings(rig, featherMat('pegasusWing', ['#ffffff', '#f6f0e2', '#ffe9a8', '#f2c14e'], { metal: 0.2 }), 0.82, 0.2, 0.12, true, { fit: true });
    rig.hover = true; rig.flap = 0.9; rig.sky = true;
    rig.voice = 'pegasus'; rig.fxColor = [0xffffff, 0x9ad8ff, 0xffd36a];
  },
  sky_ice_dragon(rig) {
    const ice = std(0x8ecfea, 0.22, 0.35), frost = std(0xeaf8ff, 0.3, 0.1);
    const crystal = new THREE.MeshPhysicalMaterial({ color: 0xdff6ff, roughness: 0.05, metalness: 0.1, clearcoat: 1, iridescence: 0.6, emissive: 0x4ac8ff, emissiveIntensity: 0.35, flatShading: true });
    quadruped(rig, { bodyMat: ice, bellyMat: frost, headMat: ice, snoutMat: ice, eyeMat: eyeMat(0x7af0ff), snout: [0.13, 0.09, 0.22], ears: [0.03, 0.22], earMat: crystal, bodyR: 0.19, bodyLen: 0.5, legLen: 0.22, tailMat: ice, tailSegs: 6, tailR: 0.07, tailLen: 0.13, tailUp: 0.3 });
    addWings(rig, featherMat('frostWing', ['#1a4a7a', '#4a9ad0', '#bfeaff', '#ffffff'], { veins: 'rgba(255,255,255,0.6)', metal: 0.2, glow: 0.25 }), 0.86, 0.16, 0.08, false, { fit: true });
    for (let i = 0; i < 5; i++) rig.body.add(mesh(G.octa(0.06), crystal, { pos: [0, 0.21, 0.22 - i * 0.12], scale: [0.55, 1.5, 0.8] }));
    const lastTail = rig.tails[0][rig.tails[0].length - 1];
    lastTail.add(mesh(G.octa(0.08), crystal, { pos: [0, 0, -0.2], scale: [0.6, 0.6, 1.8] }));
    rig.hover = true; rig.flap = 1; rig.sky = true;
    rig.voice = 'dragon'; rig.fxColor = [0xdff6ff, 0x9ad8ff, 0xffffff]; rig.breath = [0xffffff, 0xbfefff, 0x6fb8e8];
  },
  sky_wyvern(rig) {
    const jade = std(0x1f8a5e, 0.35, 0.3), pale = std(0xbfe8c8, 0.5), gold = std(0xf2c14e, 0.25, 1);
    quadruped(rig, { bodyMat: jade, bellyMat: pale, headMat: jade, snoutMat: jade, eyeMat: eyeMat(0xffe040), snout: [0.12, 0.08, 0.24], ears: [0.03, 0.24], earMat: gold, bodyR: 0.17, bodyLen: 0.48, legLen: 0.24, tailMat: jade, tailSegs: 7, tailR: 0.065, tailLen: 0.13, tailUp: 0.25 });
    rig.legs.splice(0, 2).forEach((l) => rig.body.remove(l)); // ווירן: רק רגליים אחוריות — הכנפיים הן הידיים
    addWings(rig, featherMat('jadeWing', ['#0e4a32', '#1f8a5e', '#7ad8a0', '#f2c14e'], { veins: 'rgba(242,193,78,0.6)', metal: 0.35 }), 1.0, 0.15, 0.12, false, { fit: true });
    for (let i = 0; i < 6; i++) rig.body.add(mesh(G.cone(0.03, 0.09, 4), gold, { pos: [0, 0.19, 0.24 - i * 0.1] }));
    const lastTail = rig.tails[0][rig.tails[0].length - 1];
    lastTail.add(mesh(G.octa(0.09), gold, { pos: [0, 0, -0.18], scale: [1.3, 0.25, 1.4] })); // סנפיר בקצה הזנב
    rig.head.add(mesh(G.torus(0.15, 0.022, 6, 18, Math.PI), gold, { pos: [0, 0.02, -0.08] })); // צווארון זהב מאחורי הראש
    rig.hover = true; rig.flap = 0.85; rig.sky = true;
    rig.voice = 'dragon'; rig.fxColor = [0x8affc0, 0xf2c14e, 0xffffff]; rig.breath = [0xd8ffe8, 0x6ae8a0, 0x1a9a62];
  },
  sky_butterfly(rig) {
    const velvet = std(0x2a1a3a, 0.5, 0.1);
    rig.body.position.y = 0.5;
    rig.body.add(mesh(G.capsule(0.045, 0.3, 4, 10), velvet, { rot: [Math.PI / 2, 0, 0], cast: true }));
    rig.head.position.set(0, 0.02, 0.21);
    rig.body.add(rig.head);
    rig.head.add(mesh(G.sph(0.06, 12, 10), velvet, { cast: true }));
    const tip = std(0xffd06a, 0.3, 0, { emissive: 0xff9a30, emissiveIntensity: 0.8 });
    for (const s of [-1, 1]) {
      const e = mesh(G.sph(0.028, 8, 6), eyeMat(0xffe0ff), { pos: [s * 0.04, 0.01, 0.04] });
      rig.head.add(e); rig.eyes.push(e);
      const ant = new THREE.Group(); ant.position.set(s * 0.025, 0.04, 0.02); ant.rotation.set(-0.7, 0, -s * 0.35);
      ant.add(mesh(G.cyl(0.006, 0.006, 0.2, 4), velvet, { pos: [0, 0.1, 0] }));
      ant.add(mesh(G.sph(0.018, 8, 6), tip, { pos: [0, 0.2, 0] }));
      rig.head.add(ant);
    }
    rig.mouth.position.set(0, -0.02, 0.06); rig.head.add(rig.mouth);
    const tex = drawnTexture('rainbowWing', 256, (c, sz) => {
      const g = c.createRadialGradient(0, sz / 2, sz * 0.04, 0, sz / 2, sz * 1.02);
      ['#fff4a8', '#ffb04a', '#ff4a8a', '#a04aff', '#4ad8ff', '#1a2a6a'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
      c.fillStyle = g; c.fillRect(0, 0, sz, sz);
      c.fillStyle = 'rgba(255,255,255,0.92)';
      for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(sz * (0.8 + 0.08 * Math.sin(i * 1.7)), sz * (0.12 + i * 0.125), sz * 0.028, 0, TAU); c.fill(); }
    });
    const wm = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.4, transparent: true, opacity: 0.96 });
    const fore = new THREE.Shape();
    fore.moveTo(0, 0.02);
    fore.bezierCurveTo(0.12, -0.06, 0.36, -0.34, 0.5, -0.3);
    fore.bezierCurveTo(0.57, -0.2, 0.5, -0.04, 0.42, 0.02);
    fore.bezierCurveTo(0.3, 0.06, 0.12, 0.06, 0, 0.02);
    const hind = new THREE.Shape();
    hind.moveTo(0, 0);
    hind.bezierCurveTo(0.15, 0.02, 0.36, 0.06, 0.38, 0.2);
    hind.bezierCurveTo(0.4, 0.32, 0.24, 0.37, 0.14, 0.3);
    hind.bezierCurveTo(0.06, 0.24, 0.02, 0.12, 0, 0);
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.03, 0.02, 0.03);
      pivot.add(flatWing(fore, wm, s), flatWing(hind, wm, s));
      pivot.userData.side = s;
      rig.body.add(pivot); rig.wings.push(pivot);
    }
    rig.hover = true; rig.flap = 1.7; rig.sky = true; rig.restWing = 0.95; rig.trail = [0xff6a8a, 0xffd06a, 0x6ad8ff, 0xb06aff];
    rig.voice = 'butterfly'; rig.fxColor = [0xff8ad8, 0x8ad8ff, 0xfff08a, 0xb08aff];
  },
  sky_star_phoenix(rig) {
    const cosmos = std(0x2a2a9a, 0.3, 0.4, { emissive: 0x3a2aff, emissiveIntensity: 0.55 });
    const starM = featherMat('starFlame', ['#1a1a6a', '#4a2ad0', '#9a5aff', '#ff8ad8'], { dots: 'rgba(255,255,255,0.95)', glow: 0.9 });
    bird(rig, { bodyMat: cosmos, headMat: cosmos, eyeMat: eyeMat(0xffffff), beakMat: std(0xe8f0ff, 0.25, 1), wingMat: starM, crest: starM, tailFeathers: starM, wingSpan: 0.72, wingFit: true });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x8a6aff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(1.7); rig.body.add(glow);
    orbitRing(rig, new THREE.MeshBasicMaterial({ color: 0xfff6c0, toneMapped: false }), 5, 0.5);
    rig.hover = true; rig.flap = 1.2; rig.sky = true; rig.trail = [0x9ad8ff, 0xffffff, 0xb08aff];
    rig.voice = 'phoenix'; rig.fxColor = [0xb08aff, 0xffffff, 0x9ad8ff];
  },
  sky_thunder_dragon(rig) {
    const navy = addRim(std(0x16224a, 0.28, 0.55), 0x5ae0ff, 2.2, 1.0), volt = std(0x9af6ff, 0.2, 0, { emissive: 0x3ad8ff, emissiveIntensity: 2.2 });
    const belly = std(0x2a4aa8, 0.3, 0.4, { emissive: 0x1a3aff, emissiveIntensity: 0.5 });
    quadruped(rig, { bodyMat: navy, bellyMat: belly, headMat: navy, snoutMat: navy, eyeMat: eyeMat(0xbffcff), snout: [0.14, 0.09, 0.24], ears: [0.035, 0.26], earMat: volt, bodyR: 0.21, bodyLen: 0.56, legLen: 0.23, tailMat: navy, tailSegs: 7, tailR: 0.075, tailLen: 0.13, tailUp: 0.3 });
    const wt = drawnTexture('voltWing', 128, (c, sz) => {
      const g = c.createLinearGradient(0, 0, sz, 0); g.addColorStop(0, '#0a1030'); g.addColorStop(1, '#1f3f9a'); c.fillStyle = g; c.fillRect(0, 0, sz, sz);
      c.strokeStyle = '#7af6ff'; c.lineWidth = 3; c.shadowColor = '#7af6ff'; c.shadowBlur = 8;
      for (let k = 0; k < 4; k++) { c.beginPath(); let x = 4, y = sz * (0.2 + k * 0.2); c.moveTo(x, y); for (let j = 0; x < sz; j++) { x += 12 + ((j * 7 + k * 5) % 9); y += (((j * 13 + k * 3) % 7) - 3) * 4; c.lineTo(x, y); } c.stroke(); }
    });
    addWings(rig, new THREE.MeshStandardMaterial({ map: wt, emissiveMap: wt, emissive: 0xffffff, emissiveIntensity: 0.6, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.15, envMapIntensity: 0.3 }), 0.95, 0.18, 0.08, false, { fit: true });
    for (let i = 0; i < 5; i++) rig.body.add(mesh(G.octa(0.06), volt, { pos: [0, 0.23, 0.24 - i * 0.12], scale: [0.4, 1.6, 0.7] }));
    const lastTail = rig.tails[0][rig.tails[0].length - 1];
    lastTail.add(mesh(G.octa(0.07), volt, { pos: [0, 0, -0.2], scale: [0.5, 0.5, 2] }));
    orbitRing(rig, volt, 4, 0.52, { y: 0.04, scale: [0.5, 3, 0.5] });
    rig.hover = true; rig.flap = 1; rig.sky = true; rig.thunder = true;
    rig.voice = 'dragon'; rig.fxColor = [0x9af6ff, 0xffffff, 0x5a8aff];
  },
  sky_crystal_griffin(rig) {
    const crystal = new THREE.MeshPhysicalMaterial({ color: 0x9fb8ff, roughness: 0.08, metalness: 0.25, iridescence: 1, iridescenceIOR: 1.35, clearcoat: 1, flatShading: true, emissive: 0x3a4aa8, emissiveIntensity: 0.25 });
    const head = new THREE.MeshPhysicalMaterial({ color: 0xe6eeff, roughness: 0.08, metalness: 0.1, iridescence: 1, clearcoat: 1, flatShading: true });
    const rose = std(0xff8ad8, 0.2, 0.4, { emissive: 0xff4ac8, emissiveIntensity: 0.9 });
    quadruped(rig, { bodyMat: crystal, headMat: head, eyeMat: eyeMat(0xff9af0), headR: 0.17, ears: [0.04, 0.16], earMat: rose, bodyR: 0.2, bodyLen: 0.5, legLen: 0.28, legMat: crystal, tailMat: crystal, tailSegs: 5, tailR: 0.035, tailLen: 0.13, tailUp: 0.3 });
    rig.head.add(mesh(G.cone(0.075, 0.22, 6), std(0xf2c14e, 0.2, 1, { emissive: 0xff8a3a, emissiveIntensity: 0.25 }), { pos: [0, -0.05, 0.22], rot: [Math.PI / 2 + 0.5, 0, 0] }));
    for (let i = 0; i < 4; i++) rig.body.add(mesh(G.octa(0.05), rose, { pos: [0, 0.21, 0.18 - i * 0.12], scale: [0.5, 1.4, 0.7] })); // קוצי קריסטל על הגב
    rig.mouth.position.set(0, -0.08, 0.32);
    rig.tails[0][rig.tails[0].length - 1].add(mesh(G.octa(0.07), rose, { pos: [0, 0, -0.16] }));
    rig.body.add(mesh(G.octa(0.08), rose, { pos: [0, 0.02, 0.29], scale: [1, 1.3, 0.6] })); // אבן חן על החזה
    const wt = wingTex('crystalWing', ['#9fd0ff', '#a08aff', '#e07ae8', '#fff0ff'], { veins: 'rgba(255,255,255,0.9)' });
    addWings(rig, new THREE.MeshPhysicalMaterial({ map: wt, emissiveMap: wt, emissive: 0xffffff, emissiveIntensity: 0.4, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.1, iridescence: 1, envMapIntensity: 0.35, transparent: true, opacity: 0.9 }), 0.9, 0.16, 0.1, true, { fit: true });
    rig.hover = true; rig.flap = 0.7; rig.sky = true;
    rig.voice = 'griffin'; rig.fxColor = [0xbfe8ff, 0xff9af0, 0xffffff];
  },
  sky_whale(rig) {
    const deep = addRim(std(0x2a4aa0, 0.45, 0.15), 0x9ad8ff, 2.4, 0.8), finMat = std(0x2a4aa0, 0.45, 0.15, { side: THREE.DoubleSide });
    rig.body.position.y = 0.55;
    rig.body.add(mesh(G.sph(0.3, 24, 16), deep, { scale: [0.95, 0.85, 1.6], cast: true }));
    const stripes = drawnTexture('whaleBelly', 64, (c, sz) => { c.fillStyle = '#eef4fb'; c.fillRect(0, 0, sz, sz); c.fillStyle = '#b8c8e0'; for (let i = 0; i < 8; i++) c.fillRect(0, i * 8, sz, 2); });
    rig.body.add(mesh(G.sph(0.27, 20, 14), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6 }), { pos: [0, -0.07, 0.05], scale: [0.85, 0.7, 1.55] }));
    // הראש לא מסתובב (העיניים על הגוף); rig.head נשאר ריק
    rig.head.position.set(0, 0.04, 0.4); rig.body.add(rig.head);
    for (const s of [-1, 1]) {
      const e = mesh(G.sph(0.032, 10, 8), eyeMat(0xbfe8ff), { pos: [s * 0.215, 0.04, 0.3] });
      rig.body.add(e); rig.eyes.push(e);
    }
    rig.mouth.position.set(0, -0.06, 0.46); rig.body.add(rig.mouth);
    const star = new THREE.MeshBasicMaterial({ color: 0xfff6c0, toneMapped: false });
    [[0, 0.3], [0.09, 0.12], [-0.1, 0.05], [0.05, -0.12], [-0.06, -0.24], [0.12, -0.3], [-0.12, 0.22]].forEach(([x, z]) => {
      const y = 0.255 * Math.sqrt(Math.max(0, 1 - (x / 0.285) ** 2 - (z / 0.48) ** 2));
      rig.body.add(mesh(G.octa(0.022), star, { pos: [x, y + 0.008, z] }));
    });
    // סנפירים (מתנופפים לאט במקום כנפיים)
    const fin = new THREE.Shape();
    fin.moveTo(0, 0.05); fin.bezierCurveTo(0.12, 0.08, 0.3, 0.04, 0.34, -0.04); fin.bezierCurveTo(0.3, -0.1, 0.12, -0.08, 0, -0.05); fin.lineTo(0, 0.05);
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(s * 0.22, -0.1, 0.12);
      const m = flatWing(fin, finMat, s); m.rotation.y = s * -0.55; pivot.add(m);
      pivot.userData.side = s; rig.body.add(pivot); rig.wings.push(pivot);
    }
    // זנב עבה שעולה מעט למעלה: 3 חוליות שמתנופפות למעלה-למטה (הבסיס מגולגל ב-90° כך שהנפנוף הצידי הופך לאנכי), וסנפיר זנב רחב
    const tilt = new THREE.Group(); tilt.position.set(0, 0.03, -0.36); tilt.rotation.x = 0.28; rig.body.add(tilt);
    const tb = new THREE.Group(); tb.rotation.z = Math.PI / 2; tilt.add(tb);
    const chain = [];
    let parent = tb, r = 0.17;
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group(); if (i) g.position.z = -0.16;
      g.add(mesh(G.sph(r, 12, 10), deep, { pos: [0, 0, -0.06], scale: [1, 1, 1.5], cast: true }));
      parent.add(g); chain.push(g); parent = g; r *= 0.68;
    }
    const fl = new THREE.Shape();
    fl.moveTo(0, -0.02); fl.bezierCurveTo(0.1, 0, 0.28, 0.04, 0.36, 0.22); fl.bezierCurveTo(0.24, 0.2, 0.1, 0.14, 0, 0.16);
    fl.bezierCurveTo(-0.1, 0.14, -0.24, 0.2, -0.36, 0.22); fl.bezierCurveTo(-0.28, 0.04, -0.1, 0, 0, -0.02);
    const flukes = flatWing(fl, finMat, 1); flukes.position.z = -0.1; flukes.rotation.z = -Math.PI / 2;
    parent.add(flukes);
    rig.tails.push(chain);
    rig.hover = true; rig.flap = 0.45; rig.wag = -1.6; rig.wagAmp = 0.16; rig.sky = true;
    rig.voice = 'whale'; rig.fxColor = [0xbfe8ff, 0xffffff, 0xfff6c0];
  },
};

export class PetCompanion3D {
  constructor(sceneMgr, fx, sound) {
    this.sm = sceneMgr;
    this.fx = fx;
    this.sound = sound;
    this.group = new THREE.Group();
    sceneMgr.world.add(this.group);
    this.pedestal = this.buildPedestal();
    this.group.add(this.pedestal, contactShadow(1.25, 0.55));
    this.holder = new THREE.Group();
    this.holder.position.y = 0.95;
    this.group.add(this.holder);
    this.lookTarget = new THREE.Vector3(0, 0.5, 0);
    this.state = 'idle';
    this.time = rand(0, 10);
    sceneMgr.onUpdate((dt, t) => this.update(dt, t));
  }

  buildPedestal() {
    const g = new THREE.Group();
    this.pedBody = std(0x2a2430, 0.4, 0.3);
    this.pedTrim = std(0xe8b84a, 0.25, 1);
    g.add(mesh(G.lathe('pedestal', [[0, 0], [0.78, 0], [0.8, 0.08], [0.68, 0.14], [0.6, 0.2], [0.42, 0.28], [0.36, 0.7], [0.5, 0.78], [0.66, 0.84], [0.68, 0.92], [0, 0.92]], 32), this.pedBody, { cast: true, receive: true }));
    g.add(mesh(G.torus(0.7, 0.03, 8, 40), this.pedTrim, { pos: [0, 0.9, 0], rot: [Math.PI / 2, 0, 0] }));
    g.add(mesh(G.torus(0.39, 0.025, 8, 30), this.pedTrim, { pos: [0, 0.3, 0], rot: [Math.PI / 2, 0, 0] }));
    g.add(mesh(G.torus(0.79, 0.025, 8, 40), this.pedTrim, { pos: [0, 0.06, 0], rot: [Math.PI / 2, 0, 0] }));
    return g;
  }

  setEraMaterials(mats) {
    this.pedestal.children[0].material = mats.dais;
    this.pedestal.children.slice(1).forEach((m) => { m.material = mats.trim; });
  }

  /** variant: { hue (0..1 הסטת גוון), scale } — כך לכל בוט יש חיה בגוון ובגודל משלה */
  setPet(id, variant = {}) {
    const key = `${id}|${variant.hue || 0}|${variant.scale || 1}`;
    if (this.key === key && this.rig) return;
    this.key = key;
    this.id = id;
    if (this.rig) { this.holder.remove(this.rig.root); }
    const rig = buildPetRig(id, variant);
    const sc = 1.15 * (variant.scale || 1);
    this.holder.add(rig.root);
    this.rig = rig;
    this.state = 'idle';
    if (this.danceTl) { this.danceTl.kill(); this.danceTl = null; }
    rig.root.scale.setScalar(0.01);
    gsap.to(rig.root.scale, { x: sc, y: sc, z: sc, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
  }

  place(x, z, facing) {
    this.group.position.set(x, 0, z);
    this.group.rotation.set(0, facing, 0);
    this.group.userData.facing = facing;
  }

  lookAt(world) { if (world) this.lookTarget.copy(world); }

  glowEyes(intensity, dur = 1.2) {
    if (!this.rig) return;
    this.rig.eyes.forEach((e) => { gsap.killTweensOf(e.material); e.material.emissiveIntensity = intensity; gsap.to(e.material, { emissiveIntensity: 0.6, duration: dur, delay: 0.4 }); });
  }

  worldOf(obj) { return obj.getWorldPosition(new THREE.Vector3()); }

  /** תגובות: capture | lost | checkAttack | checkDefend | victory | defeat | emote */
  react(type) {
    const r = this.rig;
    if (!r) return;
    const root = r.root, body = r.body, head = r.head;
    gsap.killTweensOf([root.position, root.rotation, body.scale, head.rotation]);
    if (this.danceTl && type !== 'victory') { this.danceTl.kill(); this.danceTl = null; }
    root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); body.scale.set(1, 1, 1);
    const wp = () => this.worldOf(body);
    switch (type) {
      case 'capture': {
        this.sound?.petVoice(r.voice, this.pan());
        const tl = gsap.timeline();
        tl.to(root.position, { y: 0.9, duration: 0.32, ease: 'power2.out' });
        tl.to(r.hover ? root.rotation : root.rotation, { [r.hover ? 'y' : 'x']: -TAU, duration: 0.6, ease: 'power1.inOut' }, 0.05);
        tl.to(root.position, { y: 0, duration: 0.35, ease: 'bounce.out' });
        tl.add(() => { root.rotation.set(0, 0, 0); });
        const p = wp();
        this.fx.sparkle([p.x, p.y + 0.4, p.z], 34, r.fxColor, 0.4);
        if (r.thunder) this.thunder();
        if (r.ringFx) this.laserRings();
        break;
      }
      case 'lost': {
        const tl = gsap.timeline();
        tl.to(body.scale, { y: 0.74, x: 1.08, z: 1.08, duration: 0.18 });
        tl.to(head.rotation, { y: 0.45, duration: 0.1, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0.1);
        tl.to(body.scale, { y: 1, x: 1, z: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }, 0.8);
        tl.add(() => { head.rotation.y = 0; });
        break;
      }
      case 'checkAttack': {
        this.sound?.petVoice(r.voice, this.pan(), true);
        gsap.to(root.rotation, { x: 0.35, duration: 0.25, yoyo: true, repeat: 1, repeatDelay: 0.9, ease: 'power2.out' });
        gsap.to(root.position, { z: 0.18, duration: 0.25, yoyo: true, repeat: 1, repeatDelay: 0.9 });
        this.glowEyes(6, 1.6);
        this.attackBurst();
        break;
      }
      case 'checkDefend': {
        gsap.fromTo(root.position, { x: -0.04 }, { x: 0.04, duration: 0.05, repeat: 15, yoyo: true, ease: 'none', onComplete: () => { root.position.x = 0; } });
        gsap.to(body.scale, { y: 0.9, duration: 0.2, yoyo: true, repeat: 1 });
        break;
      }
      case 'victory': {
        this.state = 'victory';
        this.sound?.petVoice(r.voice, this.pan());
        const tl = gsap.timeline({ repeat: -1 });
        tl.to(root.position, { y: 0.5, duration: 0.28, ease: 'power2.out' });
        tl.to(root.rotation, { y: '+=' + Math.PI, duration: 0.5, ease: 'sine.inOut' }, 0);
        tl.to(root.position, { y: 0, duration: 0.28, ease: 'power2.in' });
        tl.add(() => { const p = wp(); this.fx.sparkle([p.x, p.y + 0.5, p.z], 10, r.fxColor, 0.3); });
        tl.to(body.scale, { y: 0.85, duration: 0.1, yoyo: true, repeat: 1 });
        this.danceTl = tl;
        break;
      }
      case 'defeat': {
        this.state = 'defeat';
        gsap.to(body.scale, { y: 0.8, duration: 0.8 });
        gsap.to(head.rotation, { x: 0.6, duration: 0.8 });
        gsap.to(root.position, { y: -0.08, duration: 0.8 });
        break;
      }
      case 'emote': {
        this.sound?.petVoice(r.voice, this.pan());
        gsap.to(root.position, { y: 0.4, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' });
        break;
      }
      default:
    }
  }

  reset() {
    if (!this.rig) return;
    this.state = 'idle';
    if (this.danceTl) { this.danceTl.kill(); this.danceTl = null; }
    const r = this.rig;
    gsap.killTweensOf([r.root.position, r.root.rotation, r.body.scale, r.head.rotation]);
    gsap.to(r.root.position, { x: 0, y: 0, z: 0, duration: 0.4 });
    gsap.to(r.root.rotation, { x: 0, y: 0, z: 0, duration: 0.4 });
    gsap.to(r.body.scale, { x: 1, y: 1, z: 1, duration: 0.4 });
    gsap.to(r.head.rotation, { x: 0, duration: 0.4 });
  }

  pan() { return Math.max(-1, Math.min(1, this.group.position.x / 8)); }

  attackBurst() {
    const r = this.rig;
    const m = this.worldOf(r.mouth);
    const toBoard = new THREE.Vector3(-this.group.position.x, 0, -this.group.position.z).normalize();
    if (this.id === 'fire_dragon' || r.breath) {
      let n = 0;
      const iv = setInterval(() => { this.fx.flame([m.x, m.y, m.z], 12, [toBoard.x, -0.15, toBoard.z], r.breath); if (++n > 14) clearInterval(iv); }, 45);
    } else if (this.id === 'golden_phoenix') {
      this.fx.flame([m.x, m.y, m.z], 30, [toBoard.x, 0.2, toBoard.z], [0xfff0a0, 0xffd060, 0xffa020]);
    } else if (r.thunder) this.thunder();
    else if (r.ringFx) this.laserRings();
    else this.fx.energy([m.x, m.y, m.z], 26, r.fxColor);
  }

  thunder() {
    const p = this.worldOf(this.group);
    const ring = mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), { rot: [-Math.PI / 2, 0, 0], pos: [p.x, 1.0, p.z] });
    this.sm.world.add(ring);
    gsap.to(ring.scale, { x: 4, y: 4, z: 4, duration: 0.6, ease: 'power2.out' });
    gsap.to(ring.material, { opacity: 0, duration: 0.6, onComplete: () => { this.sm.world.remove(ring); ring.geometry.dispose(); } });
    this.fx.energy([p.x, 1.6, p.z], 40, [0xbfe8ff, 0xffffff, 0x8ac8ff]);
    this.sm.addShake(0.08);
  }

  laserRings() {
    const p = this.worldOf(this.group);
    for (let i = 0; i < 3; i++) {
      const ring = mesh(new THREE.TorusGeometry(0.5, 0.02, 6, 48), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff3ad8 : 0x33f0ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }), { rot: [Math.PI / 2, 0, 0], pos: [p.x, 1.3 + i * 0.2, p.z] });
      this.sm.world.add(ring);
      gsap.to(ring.scale, { x: 3.5, y: 3.5, z: 3.5, duration: 0.8, delay: i * 0.12, ease: 'power2.out' });
      gsap.to(ring.material, { opacity: 0, duration: 0.8, delay: i * 0.12, onComplete: () => { this.sm.world.remove(ring); ring.geometry.dispose(); } });
    }
  }

  update(dt, t) {
    const r = this.rig;
    if (!r) return;
    this.time += dt;
    const tt = this.time;
    if (this.state === 'idle') {
      r.body.scale.y = 1 + Math.sin(tt * 2.2) * 0.03;
      if (r.hover && !gsap.isTweening(r.root.position)) r.root.position.y = 0.25 + Math.sin(tt * 1.6) * 0.12;
    }
    // הראש פונה לעבר הכלי הפעיל
    const local = this.holder.worldToLocal(this.lookTarget.clone());
    const yaw = Math.atan2(local.x, local.z);
    const targetYaw = Math.max(-0.9, Math.min(0.9, yaw)) + Math.sin(tt * 0.7) * 0.08;
    if (!gsap.isTweening(r.head.rotation)) r.head.rotation.y += (targetYaw - r.head.rotation.y) * Math.min(1, dt * 3);
    r.tails.forEach((chain, ci) => chain.forEach((seg, i) => { seg.rotation.y = Math.sin(tt * (3 + r.wag) + i * 0.6 + ci) * (r.wagAmp ?? (0.25 + r.wag * 0.08)); }));
    r.wings.forEach((w) => {
      const s = w.userData.side;
      const flap = r.hover ? Math.sin(tt * 7) * 0.55 : Math.sin(tt * 1.4) * 0.06;
      w.rotation.z = s * (0.2 + flap * (r.flap || 0.3));
    });
    if (r.aura) { r.aura.rotation.z += dt * 0.8; r.aura.material.opacity = 0.6 + Math.sin(tt * 2) * 0.25; }
    if (r.spinners) r.spinners.forEach((g, i) => { g.rotation.z += dt * (i % 2 ? -2.6 : 2.6); });
    if (r.trail && Math.random() < dt * 14) {
      const p = this.worldOf(r.body);
      this.fx.embers([p.x, p.y - 0.1, p.z], 1, r.trail);
    }
  }
}

export const PET_BUILDERS = BUILDERS;

/**
 * אנימציית שלד לחיה שמחוץ לכן (החיות המעופפות שמעל העיר): זנב, כנפיים, טבעות שחגות, הילה.
 * flapPh — שלב הנפנוף (מצטבר, כדי ששינוי מהירות לא יקפיץ את הכנפיים); flapAmp — עוצמת הנפנוף
 */
export function tickRig(r, dt, tt, { flapPh = tt * 7, flapAmp = 0.55, sweep = 0 } = {}) {
  r.tails.forEach((chain, ci) => chain.forEach((seg, i) => { seg.rotation.y = Math.sin(tt * (3 + r.wag) + i * 0.6 + ci) * (r.wagAmp ?? (0.25 + r.wag * 0.08)) * 0.8; }));
  r.wings.forEach((w) => { w.rotation.z = w.userData.side * (0.2 + sweep + Math.sin(flapPh) * flapAmp * Math.max(0.6, r.flap || 0.3)); });
  (r.spinners || []).forEach((g, i) => { g.rotation.z += dt * (i % 2 ? -2.6 : 2.6); });
  if (r.aura) r.aura.rotation.z += dt * 0.8;
}

const _hsl = { h: 0, s: 0, l: 0 };
/** בונה חיה עצמאית (גם לתמונות ממוזערות). hue מסיט את גוון החומרים (העיניים והזוהר נשארים) */
export function buildPetRig(id, { hue = 0 } = {}) {
  const rig = newRig();
  rig.root.add(rig.body);
  (BUILDERS[id] || BUILDERS.wolf_cub)(rig);
  if (hue) {
    const eyes = new Set(rig.eyes.map((e) => e.material));
    const done = new Map();
    rig.root.traverse((o) => {
      if (!o.isMesh || !o.material || eyes.has(o.material) || o.material.blending === THREE.AdditiveBlending) return;
      if (!done.has(o.material)) {
        const m = o.material.clone();
        if (m.color) { m.color.getHSL(_hsl); if (_hsl.s > 0.08) m.color.setHSL((_hsl.h + hue) % 1, _hsl.s, _hsl.l); }
        if (m.emissive && m.emissiveIntensity > 0) { m.emissive.getHSL(_hsl); m.emissive.setHSL((_hsl.h + hue) % 1, _hsl.s, _hsl.l); }
        done.set(o.material, m);
      }
      o.material = done.get(o.material);
    });
  }
  // חיות קן השמיים: כנפיים מורמות במנוחה — רואים אותן גם בתמונות הממוזערות (האנימציה דורסת את זה במשחק)
  if (rig.sky) rig.wings.forEach((w) => { w.rotation.z = w.userData.side * (rig.restWing ?? 0.42); });
  addCharacterRim(rig.root);
  rig.root.scale.setScalar(1.15);
  return rig;
}
