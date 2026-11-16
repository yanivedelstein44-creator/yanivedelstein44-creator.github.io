/**
 * הלגונה של האי המרכזי: בריכת מים קטנה וסגורה (חצי אליפסה) בתוך רצועת הדשא שמול רחבת השחמט,
 * עם שפת חול ושורת אבנים בהירות. אין תעלה: כשיש פרסומת מתגמלת זמינה, הדולפין צולל בים, "שוחה מתחת לאי"
 * ועולה בלגונה; אחרי הצפייה הוא צולל בה וחוזר לים (Dolphin3D.js). כך האריחים שמרחיבים את האי לא משנים כלום.
 *
 * איך זה בנוי:
 *  - באי המרכזי מסתירים את פני הדשא של האי הכללי (SceneManager.islandParts.top) ומציגים במקומם אותם פני
 *    דשא (אותו חומר, אותו UV) עם חור בצורת הלגונה. מבעד לחור רואים את הים עצמו (המישור של Sea.js
 *    בגובה SEA_Y): אותם צבעים, אותם גלים, אותו נצנוץ — כמו מים שמחוברים לים מתחת לאי.
 *  - קירות גדה (אבן בהירה למעלה, חול רטוב למטה), פס חול גלי ושורת אבנים בהירות על שפת הדשא,
 *    וקצף ומים רדודים לאורך הגדה (שכבה שקופה שנושמת לאט).
 *
 * ממשק: new HubLagoon(hub, R)  setActive(on)  update(dt, tt)  contains(x, z, m)   LAGOON.spot — מקום הדולפין
 * הכול בקואורדינטות העולם של האי המרכזי (החזית = ‎+z, מול המצלמה). 5 קריאות ציור.
 */
import * as THREE from 'three';
import { SEA_Y } from './Sea.js';

const TAU = Math.PI * 2;

/** מידות הלגונה (יחידות עולם). רחבת השחמט נגמרת ב-z = 12.5; האי הבסיסי ברדיוס 17 */
export const LAGOON = {
  zf: 12.95,        // הצלע הישרה של חצי האליפסה (צמודה לרחבה)
  rx: 4.3,          // חצי הרוחב
  rz: 2.4,          // העומק (לכיוון הים)
  spot: [0, 14.15], // איפה הדולפין "עומד" בלגונה
};

// ==== ART ====
const COL = {
  wallTop: new THREE.Color(0xeee5cf), wallLow: new THREE.Color(0x8f7d5c),
  band: new THREE.Color(0xeadbb1), bandEdge: new THREE.Color(0xcfbb8c),
  stones: [0xe6dfcf, 0xd8cdb5, 0xcabd9f, 0xbdae90],
  foam: [0.97, 0.99, 1.0], shallow: [0.66, 0.92, 0.86], deep: [0.24, 0.66, 0.74], middle: [0.06, 0.36, 0.52],
};

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** קו הגדה הסגור: חצי אליפסה עם פינות מעוגלות בקצות הצלע הישרה. נקודות במרווחים שווים (בלי לחזור לנקודה הראשונה) */
function shoreLoop() {
  const { zf, rx, rz } = LAGOON;
  const f = 0.9;                                  // רדיוס בערך של הפינות
  const thC = f / rz;                             // כמה מהאליפסה "נאכל" בכל פינה
  const p = new THREE.Path();
  p.moveTo(rx - f, zf);
  p.lineTo(-rx + f, zf);
  const e0 = [rx * Math.cos(Math.PI - thC), zf + rz * Math.sin(Math.PI - thC)];
  p.quadraticCurveTo(-rx, zf, e0[0], e0[1]);
  p.absellipse(0, zf, rx, rz, Math.PI - thC, thC, true);
  p.quadraticCurveTo(rx, zf, rx - f, zf);
  const pts = p.getSpacedPoints(132).map((v) => [v.x, v.y]);
  pts.pop(); // הנקודה האחרונה = הראשונה
  return pts;
}

/** נורמל לצד היבשה בכל נקודה של לולאה סגורה (המים בצד השני) */
function landNormals(pts) {
  const n = pts.length;
  return pts.map((_, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
    return [-tz / l, tx / l];
  });
}

/** רצועה סגורה משתי שורות נקודות (a, b) באותו אורך; צבע RGB או RGBA לכל נקודה */
function ringStrip(rowA, rowB, colA, colB, itemSize = 3) {
  const n = rowA.length, pos = new Float32Array(n * 6), col = new Float32Array(n * 2 * itemSize), idx = [];
  for (let i = 0; i < n; i++) {
    pos.set(rowA[i], i * 6); pos.set(rowB[i], i * 6 + 3);
    col.set(colA[i], i * 2 * itemSize); col.set(colB[i], i * 2 * itemSize + itemSize);
    const a = i * 2, b = ((i + 1) % n) * 2;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, itemSize));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** פני הדשא של האי המרכזי עם חור בצורת הלגונה, עם UV כמו ה-CircleGeometry המקורי (רדיוס R בעולם) */
function topGeometry(R, loop) {
  const s = new THREE.Shape();
  s.absarc(0, 0, R, 0, TAU, false);
  const hole = new THREE.Path();
  hole.moveTo(loop[0][0], loop[0][1]);
  for (let i = loop.length - 1; i > 0; i--) hole.lineTo(loop[i][0], loop[i][1]);
  s.holes.push(hole);
  const g = new THREE.ShapeGeometry(s, 96);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getY(i);
    p.setXYZ(i, x, 0, z);
    uv.setXY(i, x / (2 * R) + 0.5, -z / (2 * R) + 0.5);
  }
  // אחרי ההעברה למישור XZ הפאות פונות למטה — הופכים את סדר הקודקודים
  const ix = g.index.array;
  for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  g.computeVertexNormals();
  return g;
}
// ==== /ART ====

export class HubLagoon {
  constructor(hub, R = 17) {
    this.hub = hub;
    this.R = R;
    const sm = hub.sm;
    this.parts = sm.islandParts || null;
    this.group = new THREE.Group();
    hub.group.add(this.group);
    const loop = shoreLoop();
    this.loop = loop;
    const nrm = landNormals(loop);

    // ----- פני הדשא עם החור -----
    if (this.parts) {
      const top = new THREE.Mesh(topGeometry(R, loop), sm.groundMat);
      top.receiveShadow = true;
      this.group.add(top);
    }

    // ----- קירות הגדה: מהדשא עד מתחת למים -----
    {
      const A = [], B = [], cA = [], cB = [];
      for (const [x, z] of loop) { A.push([x, 0.02, z]); B.push([x, SEA_Y - 0.45, z]); cA.push(COL.wallTop.toArray()); cB.push(COL.wallLow.toArray()); }
      const wall = new THREE.Mesh(ringStrip(A, B, cA, cB), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }));
      wall.receiveShadow = true;
      this.group.add(wall);
    }

    // ----- פס חול גלי על הדשא סביב הגדה -----
    {
      const r = rng(11), A = [], B = [], cA = [], cB = [];
      loop.forEach(([x, z], i) => {
        const n = nrm[i], w = 0.48 + 0.14 * Math.sin(i * 0.5) + 0.08 * (r() - 0.5);
        A.push([x, 0.018, z]); B.push([x + n[0] * w, 0.018, z + n[1] * w]);
        cA.push(COL.band.toArray()); cB.push(COL.bandEdge.toArray());
      });
      const band = new THREE.Mesh(ringStrip(A, B, cA, cB), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      band.receiveShadow = true;
      this.group.add(band);
    }

    // ----- שורת אבנים בהירות חצי שקועות על שפת המים -----
    {
      const r = rng(29);
      // חלוקי נחל מעוגלים: איקוסהדרון מעודן, משוטח ועם רעש קטן
      const rock = new THREE.IcosahedronGeometry(0.3, 1);
      const p = rock.attributes.position;
      for (let i = 0; i < p.count; i++) { const s = 0.9 + r() * 0.18; p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.58, p.getZ(i) * s); }
      rock.computeVertexNormals();
      const list = [];
      for (let i = 0; i < loop.length; i += 2) {
        if (r() < 0.1) continue;
        const [x, z] = loop[i], n = nrm[i], off = 0.08 + r() * 0.18;
        list.push([x + n[0] * off, z + n[1] * off, 0.55 + r() * 0.5, r() * TAU]);
      }
      // שתי אבנים גדולות בפינות הצלע הישרה
      for (const sx of [1, -1]) list.push([sx * (LAGOON.rx + 0.05), LAGOON.zf + 0.25, 1.45, r() * TAU]);
      const stones = new THREE.InstancedMesh(rock, new THREE.MeshStandardMaterial({ roughness: 0.85 }), list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
      list.forEach(([x, z, s, rot], i) => {
        q.setFromEuler(e.set(0, rot, 0));
        m.compose(v.set(x, 0.04 + 0.04 * s, z), q, sc.set(s, s, s));
        stones.setMatrixAt(i, m);
        stones.setColorAt(i, c.setHex(COL.stones[i % COL.stones.length]));
      });
      stones.castShadow = true;
      stones.receiveShadow = true;
      this.group.add(stones);
    }

    // ----- קצף ומים רדודים לאורך הגדה: לבן בקו המים → חול-טורקיז → שקוף -----
    {
      const A = [], B = [], C = [], cA = [], cB = [], cC = [];
      const y = SEA_Y + 0.008;
      loop.forEach(([x, z], i) => {
        const n = nrm[i];
        A.push([x, y, z]); B.push([x - n[0] * 0.22, y, z - n[1] * 0.22]); C.push([x - n[0] * 1.0, y, z - n[1] * 1.0]);
        cA.push([...COL.foam, 0.72]); cB.push([...COL.shallow, 0.42]); cC.push([...COL.deep, 0]);
      });
      this.shallowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
      const m1 = new THREE.Mesh(ringStrip(A, B, cA, cB, 4), this.shallowMat), m2 = new THREE.Mesh(ringStrip(B, C, cB, cC, 4), this.shallowMat);
      // עומק: האמצע כהה יותר (מניפה מהטבעת הפנימית אל מרכז הלגונה)
      const [mx, mz] = LAGOON.spot, n = C.length, pos = new Float32Array((n + 1) * 3), col = new Float32Array((n + 1) * 4), idx = [];
      C.forEach((q, i) => { pos.set(q, i * 3); col.set([...COL.deep, 0], i * 4); idx.push(i, (i + 1) % n, n); });
      pos.set([mx, y, mz], n * 3); col.set([...COL.middle, 0.34], n * 4);
      const fan = new THREE.BufferGeometry();
      fan.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      fan.setAttribute('color', new THREE.BufferAttribute(col, 4));
      fan.setIndex(idx);
      const m3 = new THREE.Mesh(fan, this.shallowMat);
      m3.material.side = THREE.DoubleSide;
      m1.renderOrder = m2.renderOrder = m3.renderOrder = -4;
      this.group.add(m1, m2, m3);
    }
    this.setActive(false);
  }

  setActive(on) {
    this.group.visible = !!on;
    if (this.parts) this.parts.top.visible = !on;
    if (on) this.clearSeamDecor();
  }

  /**
   * קישוטי קו התפר של רחבת השיש (SeamDecor: סלעים, חלוקים, גבעולי דשא) נזרקים גם מעבר לקצה הקדמי של הרחבה —
   * באי המרכזי מעלימים את אלה שנופלים בתוך הלגונה או על השפה שלה (רצפת האי נבנית מחדש בכל כניסה לאי)
   */
  clearSeamDecor() {
    const floor = this.hub.app.kingdom?.floor;
    if (!floor) return;
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    floor.traverse((o) => {
      if (!o.isInstancedMesh || o.parent?.name !== 'seamDecor') return;
      let dirty = false;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        m.decompose(p, q, s);
        if (this.contains(p.x, p.z, 0.5)) { o.setMatrixAt(i, m.makeScale(0, 0, 0)); dirty = true; }
      }
      if (dirty) o.instanceMatrix.needsUpdate = true;
    });
  }

  update(dt, tt) {
    if (this.shallowMat) this.shallowMat.opacity = 0.86 + 0.14 * Math.sin(tt * 1.3);
  }

  /** נקודה בתוך הלגונה, עם שוליים m — לתושבים ולקישוטים שלא יעמדו במים */
  contains(x, z, m = 0) {
    const { zf, rx, rz } = LAGOON;
    if (z < zf - m) return false;
    const ex = x / (rx + m), ez = Math.max(0, z - zf) / (rz + m);
    return ex * ex + ez * ez <= 1;
  }
}
