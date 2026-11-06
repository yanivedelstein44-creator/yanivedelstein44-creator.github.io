/** עידן 2 — האימפריה הקלאסית: חצר שיש, עמודים יוניים, אמת מים ומזרקות */
import * as THREE from 'three';
import { StageSet, fountain, std, mesh, G } from './common.js';
import { marbleTex, drawnTexture, archShape, extrude } from '../kit.js';
import { COMMON } from '../Materials.js';

const marble = () => new THREE.MeshPhysicalMaterial({ map: marbleTex('pillarMarble', 0xf3efe6, 0x9a9da4, { freq: 2, turb: 4, sharp: 6, seed: 51 }), roughness: 0.22, clearcoat: 0.4 });
const travertine = () => new THREE.MeshStandardMaterial({ map: marbleTex('travertine', 0xe6d8bc, 0xb39e78, { freq: 3, turb: 2, sharp: 2, seed: 52 }), roughness: 0.75 });

function flutedShaft(h, r) {
  const g = new THREE.CylinderGeometry(r * 0.9, r, h, 48, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const rr = Math.hypot(x, z);
    if (rr < 0.01) continue;
    const k = 1 - 0.07 * Math.pow(Math.abs(Math.cos(a * 12)), 0.6);
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}

function ionicPillar(mat, gold, h = 6.2) {
  const g = new THREE.Group();
  g.add(mesh(G.box(1.5, 0.35, 1.5), mat, { pos: [0, 0.175, 0], cast: true, receive: true }));
  g.add(mesh(G.lathe('ionicBase', [[0, 0], [0.68, 0], [0.68, 0.12], [0.6, 0.18], [0.64, 0.28], [0.55, 0.36], [0, 0.36]], 32), mat, { pos: [0, 0.35, 0], cast: true }));
  g.add(mesh(flutedShaft(h - 1.6, 0.48), mat, { pos: [0, 0.71 + (h - 1.6) / 2, 0], cast: true, receive: true }));
  const capY = 0.71 + (h - 1.6);
  g.add(mesh(G.lathe('echinus', [[0, 0], [0.48, 0], [0.62, 0.12], [0.6, 0.24], [0, 0.24]], 32), gold, { pos: [0, capY, 0], cast: true }));
  for (const s of [-1, 1]) {
    const vol = mesh(G.torus(0.2, 0.09, 10, 24), gold, { pos: [s * 0.62, capY + 0.2, 0], cast: true });
    g.add(vol);
    g.add(mesh(G.cyl(0.16, 0.16, 1.0, 16), gold, { pos: [s * 0.62, capY + 0.2, 0], rot: [Math.PI / 2, 0, 0] }));
  }
  g.add(mesh(G.box(1.55, 0.18, 1.55), gold, { pos: [0, capY + 0.42, 0], cast: true }));
  g.add(mesh(G.lathe('urn', [[0, 0], [0.28, 0], [0.18, 0.12], [0.34, 0.4], [0.2, 0.62], [0.26, 0.7], [0, 0.72]], 24), gold, { pos: [0, capY + 0.51, 0], cast: true }));
  return g;
}

export default {
  focus: [
    { target: [0, 2.5, 0], radius: 28, polar: 55, from: -0.8, to: 0.7 },
    { target: [0, 4, -12], radius: 30, polar: 66, from: 0.6, to: -0.6 },
  ],

  floor() {
    const map = marbleTex('courtTile', 0xf2ede2, 0xb8b2a6, { freq: 2, turb: 4, sharp: 6, seed: 53 });
    const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.3, metalness: 0 });
    const N = 25;
    const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.98, 0.06, 0.98), mat, N * N);
    tiles.receiveShadow = true;
    const m4 = new THREE.Matrix4(), c = new THREE.Color();
    let k = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = i - (N - 1) / 2, z = j - (N - 1) / 2;
        m4.makeTranslation(x, 0.03, z);
        tiles.setMatrixAt(k, m4);
        const edge = i === 0 || j === 0 || i === N - 1 || j === N - 1;
        const band = i === 1 || j === 1 || i === N - 2 || j === N - 2;
        if (edge) c.set(0x8a7a62); else if (band) c.set(0xc9a24e); else c.set((i + j) % 2 ? 0xffffff : 0xe2dccd);
        tiles.setColorAt(k, c);
        k++;
      }
    }
    const inlay = mesh(new THREE.RingGeometry(7.1, 7.35, 64), COMMON.gold, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.065, 0] });
    const g = new THREE.Group();
    g.add(tiles, inlay);
    return g;
  },

  stages: [
    // שלב 3: עמודים יוניים, ספסלים וברושים
    (ctx) => {
      const set = new StageSet();
      const mat = marble();
      const gold = COMMON.gold;
      [[-6.9, -6.9], [6.9, -6.9], [-6.9, 6.9], [6.9, 6.9]].forEach(([x, z], i) => {
        const p = ionicPillar(mat, gold);
        p.position.set(x, 0, z);
        set.part(p, { delay: i * 0.22 });
      });
      const pot = std(0xb5643a, 0.8);
      const cypress = std(0x2f5a2e, 0.9);
      [[-10.5, -10.5], [10.5, -10.5], [-12, -3], [12, -3], [-4.8, -14], [4.8, -14]].forEach(([x, z], i) => {
        const t = new THREE.Group();
        t.add(mesh(G.lathe('pot', [[0, 0], [0.5, 0], [0.62, 0.7], [0.7, 0.8], [0, 0.8]], 20), pot, { cast: true }));
        t.add(mesh(G.cone(0.75, 3.8, 10), cypress, { pos: [0, 2.6, 0], cast: true }));
        t.position.set(x, 0, z);
        set.part(t, { delay: 0.9 + i * 0.08 });
      });
      const bench = travertine();
      [[-10, 0], [10, 0]].forEach(([x, z], i) => {
        const b = new THREE.Group();
        b.add(mesh(G.box(0.9, 0.18, 3), bench, { pos: [0, 0.6, 0], cast: true }));
        b.add(mesh(G.box(0.7, 0.55, 0.4), bench, { pos: [0, 0.28, -1.1] }));
        b.add(mesh(G.box(0.7, 0.55, 0.4), bench, { pos: [0, 0.28, 1.1] }));
        b.position.set(x, 0, z);
        set.part(b, { delay: 1.3 + i * 0.1 });
      });
      return set;
    },

    // שלב 4: אמת מים רומית ומזרקות באגפים
    (ctx) => {
      const set = new StageSet();
      const tr = travertine();
      const lower = extrude(archShape(32, 6.4, 3.1, 4.9, 7, 1.35), 1.6, 0.05);
      const upper = extrude(archShape(32, 3.4, 1.55, 2.5, 13, 0.85), 1.2, 0.04);
      const aq = new THREE.Group();
      aq.add(mesh(lower, tr, { cast: true, receive: true }));
      aq.add(mesh(upper, tr, { pos: [0, 6.4, 0], cast: true, receive: true }));
      aq.add(mesh(G.box(32.4, 0.5, 1.8), tr, { pos: [0, 10.05, 0], cast: true }));
      const flow = drawnTexture('waterFlow', 256, (c, s) => {
        c.fillStyle = '#2f8fc8'; c.fillRect(0, 0, s, s);
        for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(220,245,255,${0.2 + Math.random() * 0.4})`; c.lineWidth = 2; c.beginPath(); const y = Math.random() * s; c.moveTo(0, y); c.bezierCurveTo(s * 0.3, y + 8, s * 0.6, y - 8, s, y); c.stroke(); }
      });
      flow.repeat.set(10, 1);
      const waterMat = new THREE.MeshStandardMaterial({ map: flow, roughness: 0.1, metalness: 0.1, emissive: 0x1a5a8a, emissiveIntensity: 0.4 });
      aq.add(mesh(G.box(32, 0.12, 1.1), waterMat, { pos: [0, 10.36, 0] }));
      aq.add(mesh(G.box(32.4, 0.5, 0.15), tr, { pos: [0, 10.5, 0.75] }));
      aq.add(mesh(G.box(32.4, 0.5, 0.15), tr, { pos: [0, 10.5, -0.75] }));
      aq.position.set(0, 0, -21.5);
      set.part(aq, { delay: 0, depth: 11 });
      set.onUpdate((dt) => { flow.offset.x -= dt * 0.35; });
      // מפלים בקצוות
      for (const s of [-1, 1]) {
        const fall = mesh(G.plane(1.0, 10.2, 1, 1), new THREE.MeshBasicMaterial({ map: flow, transparent: true, opacity: 0.75, side: THREE.DoubleSide }), { pos: [s * 16.25, 5.2, -21.5], rot: [0, Math.PI / 2, 0] });
        set.part(fall, { delay: 0.6, mode: 'scale' });
      }
      // מזרקות באגפים
      const stone = marble();
      [[-10.2, -9.5], [10.2, -9.5]].forEach(([x, z], i) => {
        const f = fountain(set, ctx, [x, 0, z], stone, { scale: 1.05, trimMat: COMMON.gold });
        set.part(f, { delay: 0.8 + i * 0.25 });
      });
      return set;
    },
  ],
};
