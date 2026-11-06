/**
 * איים באופק: כשמטיילים עם האצבע והמצלמה יורדת, רואים מסביב איים מרחפים — השכנים של האי הנוכחי
 * בעולם, כל אחד עם האדמה והמונומנט של העידן שלו. הכול מאוחד ל-3 רשתות בלבד (קל לטלפון).
 * ערפל "מקוצר" (fogScale) — האיים רחוקים אבל לא נבלעים לגמרי בערפל, כמו אובך של אופק.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder, monumentGeometry, MONUMENT_SOLID, MONUMENT_GLOW } from './Monuments.js';
import { eraOf, GROUND } from '../config/IslandEras.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

function fogScaled(mat, k) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <fog_vertex>', `#ifdef USE_FOG\n\tvFogDepth = - mvPosition.z * ${k.toFixed(3)};\n#endif`);
  };
  mat.customProgramCacheKey = () => `horizon-fog-${k}`;
  return mat;
}

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export class HorizonIslands {
  constructor(sm) {
    this.sm = sm;
    this.group = new THREE.Group();
    this.group.name = 'horizon-islands';
    sm.world.add(this.group);
    this.matTerrain = fogScaled(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 0.6);
    this.matSolid = fogScaled(MONUMENT_SOLID.clone(), 0.6);
    this.matGlow = fogScaled(MONUMENT_GLOW.clone(), 0.6);
    this.meshes = [];
    this.key = '';
    sm.onUpdate((dt) => { this.group.rotation.y += dt * 0.004; });
  }

  /** האיים השכנים של centerId (בלי האי עצמו), מסודרים סביב — יותר מהם מול מבט המשחק */
  setAround(centerId, { count = 12 } = {}) {
    const key = `${centerId}:${count}`;
    if (key === this.key) return;
    this.key = key;
    const ids = [];
    for (let d = 1; ids.length < count && d < 99; d++) {
      for (const id of [centerId + d, centerId - d]) if (id >= 2 && id <= 99 && id !== centerId && ids.length < count && !ids.includes(id)) ids.push(id);
    }
    this.build(ids, centerId);
  }

  build(ids, seed) {
    this.clear();
    const rand = rng(seed * 7919 + 13);
    const terrain = new Builder();
    const solids = [], glows = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const n = ids.length;
    ids.forEach((id, i) => {
      const era = eraOf(id);
      // זווית: מתחילים מול המצלמה (‎-z) ומתפזרים סביב
      const az = -Math.PI / 2 + ((i + 0.5) / n) * TAU + (rand() - 0.5) * (TAU / n) * 0.5;
      const dist = 105 + rand() * 55;
      const y = -13 + rand() * 17;
      const R = 7 + rand() * 5;
      const cx = Math.cos(az) * dist, cz = Math.sin(az) * dist;
      const ground = GROUND[era.climate] ?? 0x5d8a3a;
      terrain.cyl(R, R * 0.96, 1.4, ground, [cx, y - 0.7, cz], 18);
      terrain.cone(R * 0.96, R * 2.3, rand() < 0.5 ? 0x6a5848 : 0x5a4a3c, [cx, y - 1.4 - R * 1.15, cz], 11, [Math.PI, rand() * TAU, 0]);
      // כמה עצים / סלעים על השפה
      const trees = 2 + Math.floor(rand() * 3);
      for (let k = 0; k < trees; k++) {
        const a = rand() * TAU, rr = R * (0.55 + rand() * 0.35), hh = 1.4 + rand() * 1.4;
        const tx = cx + Math.cos(a) * rr, tz = cz + Math.sin(a) * rr;
        if (era.climate === 'desert' || era.climate === 'marsDust') terrain.dod(0.5 * hh, 0x9a7a52, [tx, y + 0.3 * hh, tz], [1, 0.7, 1]);
        else {
          terrain.cyl(0.1 * hh, 0.14 * hh, 0.6 * hh, 0x5a3c22, [tx, y + 0.3 * hh, tz], 6);
          terrain.cone(0.55 * hh, 1.3 * hh, era.climate === 'snow' || era.climate === 'snowNight' ? 0xe8f0f4 : 0x3f6e2c, [tx, y + 1.2 * hh, tz], 7);
        }
      }
      if (era.monument) {
        const g = monumentGeometry(era.monument);
        const sc = R * 0.3;
        m.compose(p.set(cx, y, cz), q.setFromAxisAngle(UP, Math.atan2(-cx, -cz)), s.set(sc, sc, sc));
        if (g.solid) solids.push(g.solid.clone().applyMatrix4(m));
        if (g.glow) glows.push(g.glow.clone().applyMatrix4(m));
      }
    });
    const add = (geo, mat) => {
      if (!geo) return;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.group.add(mesh);
      this.meshes.push(mesh);
    };
    add(terrain.build().solid, this.matTerrain);
    add(solids.length ? mergeGeometries(solids, false) : null, this.matSolid);
    add(glows.length ? mergeGeometries(glows, false) : null, this.matGlow);
    solids.forEach((g) => g.dispose());
    glows.forEach((g) => g.dispose());
  }

  clear() {
    this.meshes.forEach((mesh) => { this.group.remove(mesh); mesh.geometry.dispose(); });
    this.meshes = [];
  }
}
