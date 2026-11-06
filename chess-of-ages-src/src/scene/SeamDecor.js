/**
 * קישוטי "קו התפר": סלעים אורגניים קטנים, חלוקי נחל וגושי דשא נמוכים לאורך הגבול בין משטח הממלכה לקרקע,
 * כדי לשבור את המשטח השטוח וליצור עומק טבעי. הכול InstancedMesh — 2–3 קריאות ציור לכל עידן.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// לפי עידן: צורת התפר + צבעי סלע / חלוק / דשא (null = בלי דשא). glow = חלוקים זוהרים
const CFG = {
  1: { rings: [[0, 0, 10], [0, -11.5, 4.5]], rock: 0x857a6a, pebble: 0x9c8e78, grass: 0x5f8a32 },
  2: { half: 12.5, rock: 0xe6e0d2, pebble: 0xd2cabb, grass: 0x6f9a3a },
  3: { half: 12.5, rock: 0x77746c, pebble: 0x8c877c, grass: 0x4f7a2f },
  4: { half: 12.5, rock: 0x6a5a4a, pebble: 0x574839, grass: 0x6a7a3a },
  5: { half: 12.5, rock: 0x2a3446, pebble: 0x33e0ff, grass: null, glow: true },
  6: { half: 12.5, rock: 0x7a7a72, pebble: 0xbdb5a5, grass: 0x4a7a3a },
  7: { half: 12.5, rock: 0xc49c66, pebble: 0xd8b880, grass: 0x8a9a4a, sparse: true },
  8: { half: 12.5, rock: 0x6a7480, pebble: 0xeef4fa, grass: 0xa8b4a6 },
  9: { half: 12.5, rock: 0x3a6a6a, pebble: 0xf2e6d8, grass: 0x2a9a8a },
  10: { half: 12.5, rock: 0x3a2a6a, pebble: 0xe8dcff, grass: null, glow: true },
};

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

let geos = null;
function buildGeos() {
  const r = rng(77);
  const rock = new THREE.DodecahedronGeometry(0.34, 0);
  const p = rock.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.82 + r() * 0.36; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); }
  rock.computeVertexNormals();
  const pebble = new THREE.SphereGeometry(0.11, 7, 5);
  const blades = [];
  for (let i = 0; i < 7; i++) {
    const b = new THREE.ConeGeometry(0.035, 0.28 + r() * 0.2, 3, 1);
    b.translate(0, 0.16, 0);
    b.rotateZ((r() - 0.5) * 0.9);
    b.rotateY(r() * Math.PI * 2);
    b.translate((r() - 0.5) * 0.16, 0, (r() - 0.5) * 0.16);
    blades.push(b.toNonIndexed());
  }
  geos = { rock, pebble, tuft: mergeGeometries(blades, false) };
}

/** נקודות לאורך התפר: [x, z, זווית] */
function seamPoints(cfg, count, r, spread) {
  const pts = [];
  if (cfg.rings) {
    const total = cfg.rings.reduce((s, [, , R]) => s + R, 0);
    for (const [cx, cz, R] of cfg.rings) {
      const n = Math.round((count * R) / total);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.25;
        const rr = R + (r() - 0.35) * spread;
        pts.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr, a]);
      }
    }
  } else {
    const H = cfg.half;
    for (let i = 0; i < count; i++) {
      const side = i % 4, tt = (r() * 2 - 1) * H;
      const off = H + (r() - 0.35) * spread;
      const [x, z] = side === 0 ? [tt, off] : side === 1 ? [tt, -off] : side === 2 ? [off, tt] : [-off, tt];
      pts.push([x, z, r() * Math.PI * 2]);
    }
  }
  return pts;
}

function instanced(geo, mat, pts, scaleFn, yFn, r) {
  const im = new THREE.InstancedMesh(geo, mat, pts.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  pts.forEach(([x, z, a], i) => {
    const sc = scaleFn();
    e.set((r() - 0.5) * 0.4, a + r() * 2, (r() - 0.5) * 0.4);
    im.setMatrixAt(i, m4.compose(v.set(x, yFn(sc), z), q.setFromEuler(e), s.set(sc * (0.8 + r() * 0.5), sc, sc * (0.8 + r() * 0.5))));
  });
  im.receiveShadow = true;
  return im;
}

/** קבוצת קישוטים לעידן (או null) */
export function seamDecor(eraId) {
  const cfg = CFG[eraId];
  if (!cfg) return null;
  if (!geos) buildGeos();
  const r = rng(eraId * 131 + 7);
  const g = new THREE.Group();
  g.name = 'seamDecor';
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, flatShading: true, ...extra });
  const dens = cfg.sparse ? 0.6 : 1;
  const rocks = seamPoints(cfg, Math.round(54 * dens), r, 1.0);
  g.add(instanced(geos.rock, std(cfg.rock), rocks, () => 0.45 + r() * r() * 1.1, (sc) => 0.05 + sc * 0.08, r));
  const pebbleMat = cfg.glow ? std(cfg.pebble, { emissive: cfg.pebble, emissiveIntensity: 0.9, roughness: 0.4 }) : std(cfg.pebble, { roughness: 0.7 });
  const pebbles = seamPoints(cfg, Math.round(120 * dens), r, 1.6);
  g.add(instanced(geos.pebble, pebbleMat, pebbles, () => 0.5 + r() * 0.9, (sc) => 0.035 * sc, r));
  if (cfg.grass) {
    const tufts = seamPoints(cfg, Math.round(110 * dens), r, 2.0).map(([x, z, a]) => {
      // הדשא בעיקר בצד החיצוני של התפר
      const k = cfg.rings ? 1 : 1;
      return [x * k, z * k, a];
    });
    g.add(instanced(geos.tuft, std(cfg.grass, { side: THREE.DoubleSide }), tufts, () => 0.7 + r() * 0.8, () => 0.01, r));
  }
  return g;
}
