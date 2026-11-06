/**
 * כלי שחמט פרוצדורליים: LatheGeometry לגוף + גאומטריות משולבות (כתר, צלב, ראש פרש).
 * כל רשת מסומנת role='body'|'accent' כדי שאפשר יהיה להחליף חומרים בין עידנים.
 */
import * as THREE from 'three';

const V2 = (x, y) => new THREE.Vector2(x, y);
const base = (r) => [[0, 0], [r, 0], [r, 0.05], [r * 0.93, 0.075], [r * 0.95, 0.1], [r * 0.82, 0.14], [r * 0.7, 0.17]];

const PROFILES = {
  p: [...base(0.36), [0.2, 0.2], [0.15, 0.3], [0.12, 0.45], [0.18, 0.48], [0.18, 0.52], [0.1, 0.55], [0, 0.56]],
  r: [...base(0.4), [0.26, 0.22], [0.24, 0.32], [0.23, 0.62], [0.29, 0.66], [0.3, 0.7], [0.3, 0.86], [0.235, 0.86], [0.235, 0.8], [0, 0.8]],
  n: [...base(0.4), [0.27, 0.22], [0.25, 0.3], [0, 0.3]],
  b: [...base(0.38), [0.22, 0.2], [0.15, 0.3], [0.12, 0.5], [0.19, 0.53], [0.19, 0.57], [0.11, 0.6], [0.14, 0.66], [0.18, 0.74], [0.17, 0.84], [0.12, 0.92], [0.06, 0.97], [0, 0.98]],
  q: [...base(0.42), [0.27, 0.22], [0.18, 0.34], [0.13, 0.65], [0.21, 0.69], [0.21, 0.73], [0.14, 0.76], [0.17, 0.86], [0.24, 1.0], [0.25, 1.04], [0.2, 1.05], [0.16, 1.0], [0, 1.02]],
  k: [...base(0.43), [0.28, 0.22], [0.19, 0.35], [0.14, 0.7], [0.22, 0.74], [0.22, 0.78], [0.15, 0.81], [0.17, 0.9], [0.23, 1.04], [0.21, 1.1], [0.12, 1.12], [0, 1.13]],
};
const COLLAR = { p: [0.155, 0.5], r: [0.245, 0.64], n: [0.27, 0.24], b: [0.165, 0.55], q: [0.185, 0.71], k: [0.195, 0.76] };

let geos = null;

function knightHead() {
  const s = new THREE.Shape();
  s.moveTo(-0.22, 0);
  s.lineTo(0.2, 0);
  s.bezierCurveTo(0.25, 0.12, 0.2, 0.22, 0.25, 0.33);
  s.lineTo(0.38, 0.39);
  s.bezierCurveTo(0.45, 0.42, 0.43, 0.51, 0.36, 0.53);
  s.lineTo(0.13, 0.66);
  s.lineTo(0.09, 0.77);
  s.lineTo(0.0, 0.7);
  s.bezierCurveTo(-0.15, 0.66, -0.25, 0.5, -0.24, 0.3);
  s.lineTo(-0.22, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 12 });
  g.translate(-0.02, 0, -0.1);
  g.computeVertexNormals();
  return g;
}

function maneGeo() {
  const s = new THREE.Shape();
  s.moveTo(-0.23, 0.08);
  s.bezierCurveTo(-0.27, 0.35, -0.2, 0.58, 0.02, 0.7);
  s.lineTo(-0.02, 0.62);
  s.bezierCurveTo(-0.17, 0.52, -0.2, 0.35, -0.17, 0.08);
  s.lineTo(-0.23, 0.08);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.02, bevelSegments: 2 });
  g.translate(-0.02, 0, -0.04);
  return g;
}

function buildGeos() {
  const lathe = (pts) => new THREE.LatheGeometry(pts.map(([x, y]) => V2(x, y)), 40);
  geos = {
    bodies: Object.fromEntries(Object.entries(PROFILES).map(([k, v]) => [k, lathe(v)])),
    collar: Object.fromEntries(Object.entries(COLLAR).map(([k, [r]]) => [k, new THREE.TorusGeometry(r, 0.022, 8, 36)])),
    head: new THREE.SphereGeometry(0.15, 24, 18),
    ball: new THREE.SphereGeometry(0.05, 14, 10),
    queenBall: new THREE.SphereGeometry(0.075, 16, 12),
    pearl: new THREE.SphereGeometry(0.036, 10, 8),
    merlon: new THREE.BoxGeometry(0.09, 0.1, 0.075),
    crossV: new THREE.BoxGeometry(0.055, 0.26, 0.055),
    crossH: new THREE.BoxGeometry(0.18, 0.055, 0.055),
    slit: new THREE.BoxGeometry(0.03, 0.2, 0.32),
    knight: knightHead(),
    mane: maneGeo(),
    eye: new THREE.SphereGeometry(0.03, 8, 6),
  };
}

/**
 * @param {'p'|'n'|'b'|'r'|'q'|'k'} type
 * @param {'w'|'b'} color
 * @param {{body:THREE.Material, accent:THREE.Material}} mats
 */
export function createPiece(type, color, mats) {
  if (!geos) buildGeos();
  const g = new THREE.Group();
  const add = (geo, role, pos = [0, 0, 0], rot = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, role === 'body' ? mats.body : mats.accent);
    m.position.set(...pos); m.rotation.set(...rot);
    m.castShadow = true; m.receiveShadow = true;
    m.userData.role = role;
    g.add(m);
    return m;
  };
  add(geos.bodies[type], 'body');
  const [, cy] = COLLAR[type];
  add(geos.collar[type], 'accent', [0, cy, 0], [Math.PI / 2, 0, 0]);

  switch (type) {
    case 'p':
      add(geos.head, 'body', [0, 0.69, 0]);
      break;
    case 'r':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        add(geos.merlon, 'body', [Math.cos(a) * 0.265, 0.91, Math.sin(a) * 0.265], [0, -a, 0]);
      }
      break;
    case 'n': {
      const head = new THREE.Group();
      head.position.y = 0.27;
      head.rotation.y = color === 'w' ? Math.PI / 2 : -Math.PI / 2;
      const h = new THREE.Mesh(geos.knight, mats.body); h.castShadow = true; h.receiveShadow = true; h.userData.role = 'body';
      const mn = new THREE.Mesh(geos.mane, mats.accent); mn.castShadow = true; mn.userData.role = 'accent';
      const e1 = new THREE.Mesh(geos.eye, mats.accent); e1.position.set(0.22, 0.52, 0.13); e1.userData.role = 'accent';
      const e2 = e1.clone(); e2.position.z = -0.13;
      head.add(h, mn, e1, e2);
      g.add(head);
      break;
    }
    case 'b':
      add(geos.ball, 'accent', [0, 1.01, 0]);
      add(geos.slit, 'accent', [0.05, 0.84, 0], [0, 0, 0.6]);
      break;
    case 'q':
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        add(geos.pearl, 'accent', [Math.cos(a) * 0.225, 1.065, Math.sin(a) * 0.225]);
      }
      add(geos.queenBall, 'accent', [0, 1.1, 0]);
      break;
    case 'k':
      add(geos.crossV, 'accent', [0, 1.25, 0]);
      add(geos.crossH, 'accent', [0, 1.28, 0]);
      break;
    default:
  }
  g.userData = { type, color };
  return g;
}

/** החלפת חומרים בכלי קיים */
export function applyPieceMaterials(piece, mats) {
  piece.traverse((o) => {
    if (o.isMesh) o.material = o.userData.role === 'body' ? mats.body : mats.accent;
  });
}

export const PIECE_HEIGHT = { p: 0.84, r: 0.96, n: 1.04, b: 1.06, q: 1.17, k: 1.38 };

