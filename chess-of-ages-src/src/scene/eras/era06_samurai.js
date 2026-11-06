/** עידן 6 — אימפריית הסמוראים: שערי טוריי, גשר עץ, פנסי אבן, טירת פגודה ועלי דובדבן נושרים */
import * as THREE from 'three';
import { StageSet, flame, std, mesh, G, rand, TAU } from './common.js';
import { drawnTexture, stoneTex, glowTexture } from '../kit.js';

const red = () => new THREE.MeshPhysicalMaterial({ color: 0xc0201e, roughness: 0.25, clearcoat: 0.8 });
const black = () => new THREE.MeshPhysicalMaterial({ color: 0x141012, roughness: 0.3, clearcoat: 0.6 });

function torii(scale = 1) {
  const g = new THREE.Group();
  const R = red(), B = black();
  for (const s of [-1, 1]) {
    g.add(mesh(G.cyl(0.26, 0.32, 5.4, 14), R, { pos: [s * 2.4, 2.7, 0], cast: true }));
    g.add(mesh(G.cyl(0.4, 0.4, 0.4, 14), B, { pos: [s * 2.4, 0.2, 0] }));
  }
  g.add(mesh(G.box(5.6, 0.36, 0.42), R, { pos: [0, 4.3, 0], cast: true }));
  const top = new THREE.Shape();
  top.moveTo(-3.8, 0.25); top.quadraticCurveTo(0, -0.15, 3.8, 0.25); top.lineTo(3.7, 0.65); top.quadraticCurveTo(0, 0.3, -3.7, 0.65); top.lineTo(-3.8, 0.25);
  const kasagi = new THREE.ExtrudeGeometry(top, { depth: 0.55, bevelEnabled: false }).translate(0, 0, -0.27);
  g.add(mesh(kasagi, B, { pos: [0, 5.05, 0], cast: true }));
  g.add(mesh(G.box(0.3, 0.7, 0.3), R, { pos: [0, 4.75, 0] }));
  g.scale.setScalar(scale);
  return g;
}

function stoneLantern(set, ctx, mat) {
  const g = new THREE.Group();
  g.add(mesh(G.cyl(0.55, 0.65, 0.3, 6), mat, { pos: [0, 0.15, 0], cast: true }));
  g.add(mesh(G.cyl(0.18, 0.22, 1.3, 8), mat, { pos: [0, 0.95, 0], cast: true }));
  g.add(mesh(G.cyl(0.6, 0.45, 0.25, 6), mat, { pos: [0, 1.7, 0] }));
  g.add(mesh(G.box(0.7, 0.6, 0.7), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffa040, emissiveIntensity: 1.8 }), { pos: [0, 2.12, 0] }));
  g.add(mesh(G.cone(0.85, 0.6, 6), mat, { pos: [0, 2.72, 0], cast: true }));
  g.add(mesh(G.sph(0.14, 8, 6), mat, { pos: [0, 3.08, 0] }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffa040, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(2); halo.position.y = 2.1;
  g.add(halo);
  return g;
}

function curvedRoof(w, d, h, mat) {
  // גג פגודה מעוקל עם קצוות מורמים
  const geo = new THREE.CylinderGeometry(0.2, 1, h, 4, 4, false);
  geo.rotateY(Math.PI / 4);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + h / 2) / h;
    const corner = Math.pow(Math.abs(x * z) * 2, 1.5);
    p.setX(i, x * w * 0.75); p.setZ(i, z * d * 0.75);
    p.setY(i, y + (1 - t) * corner * 0.5 - (1 - t) * (1 - t) * 0.3 * h);
  }
  geo.computeVertexNormals();
  return mesh(geo, mat, { cast: true });
}

function sakuraTree(petalMat, trunkMat) {
  const g = new THREE.Group();
  g.add(mesh(G.cyl(0.18, 0.32, 3.2, 8), trunkMat, { pos: [0, 1.6, 0], rot: [0, 0, 0.12], cast: true }));
  for (let i = 0; i < 7; i++) g.add(mesh(G.ico(rand(1, 1.6), 1), petalMat, { pos: [rand(-1.6, 1.6), 3.4 + rand(0, 1.3), rand(-1.6, 1.6)], cast: true }));
  return g;
}

export default {
  focus: [
    { target: [0, 3, -10], radius: 30, polar: 62, from: -0.7, to: 0.7 },
    { target: [0, 9, -18], radius: 34, polar: 68, from: 0.6, to: -0.6 },
  ],

  floor() {
    const tex = drawnTexture('zenGravel', 256, (c, s) => {
      c.fillStyle = '#cfc8b8'; c.fillRect(0, 0, s, s);
      for (let i = 0; i < 3000; i++) { const v = 170 + Math.random() * 60; c.fillStyle = `rgb(${v},${v - 6},${v - 18})`; c.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
      c.strokeStyle = 'rgba(120,110,90,0.35)'; c.lineWidth = 2;
      for (let y = 0; y < s; y += 10) { c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= s; x += 16) c.lineTo(x, y + Math.sin(x * 0.05) * 2); c.stroke(); }
    });
    tex.repeat.set(6, 6);
    const g = new THREE.Group();
    g.add(mesh(new THREE.PlaneGeometry(25, 25), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.03, 0], receive: true }));
    const st = new THREE.MeshStandardMaterial({ map: stoneTex('stepStone', 0x8a8a84, 0x4a4a44, { freq: 4, seed: 66 }), roughness: 0.9 });
    for (let i = 0; i < 7; i++) g.add(mesh(G.cyl(0.6, 0.65, 0.12, 9), st, { pos: [Math.sin(i) * 0.8, 0.06, -7 - i * 1.4], rot: [0, i, 0], receive: true }));
    return g;
  },

  stages: [
    // שלב 11: שערי טוריי, גשר עץ ופנסי אבן
    (ctx) => {
      const set = new StageSet();
      const t1 = torii(1.1); t1.position.set(0, 0, -16.5);
      set.part(t1, { delay: 0 });
      [[-11, -11, 0.8], [11, -11, -0.8]].forEach(([x, z, r], i) => { const t = torii(0.85); t.position.set(x, 0, z); t.rotation.y = r; set.part(t, { delay: 0.3 + i * 0.2 }); });
      // בריכת קוי + גשר מקושת
      const water = new THREE.MeshStandardMaterial({ color: 0x2a6a7a, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.85 });
      const pond = new THREE.Group();
      pond.add(mesh(new THREE.CircleGeometry(3.4, 40), water, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.06, 0] }));
      const rim = new THREE.MeshStandardMaterial({ map: stoneTex('pondRim', 0x7a7a72, 0x3a3a34, { freq: 5, seed: 67 }), roughness: 0.9 });
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; pond.add(mesh(G.dodeca(0.45), rim, { pos: [Math.cos(a) * 3.5, 0.15, Math.sin(a) * 3.5], scale: [1, 0.55, 1], rot: [i, i, 0] })); }
      const koi = [];
      for (let i = 0; i < 4; i++) { const k = mesh(G.capsule(0.08, 0.35, 4, 8), std(i % 2 ? 0xff6a20 : 0xffffff, 0.4), { rot: [0, 0, Math.PI / 2] }); pond.add(k); koi.push(k); }
      const bridge = new THREE.Group();
      const R = red();
      const curve = (u) => new THREE.Vector3((u - 0.5) * 8.2, Math.sin(u * Math.PI) * 1.3 + 0.2, 0);
      for (let i = 0; i < 16; i++) { const p = curve(i / 15); bridge.add(mesh(G.box(0.5, 0.1, 1.6), std(0x6a4a30, 0.8), { pos: [p.x, p.y, 0], rot: [0, 0, Math.cos((i / 15) * Math.PI) * 0.4], cast: true })); }
      for (const z of [-0.8, 0.8]) for (let i = 0; i <= 8; i++) { const p = curve(i / 8); bridge.add(mesh(G.cyl(0.05, 0.05, 0.8, 6), R, { pos: [p.x, p.y + 0.4, z] })); }
      for (const z of [-0.8, 0.8]) { const pts = []; for (let i = 0; i <= 20; i++) { const p = curve(i / 20); pts.push(new THREE.Vector3(p.x, p.y + 0.8, z)); } bridge.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.05, 6), R)); }
      pond.add(bridge);
      pond.position.set(10.5, 0, -14);
      set.part(pond, { delay: 0.6 });
      set.onUpdate((dt, t) => { koi.forEach((k, i) => { const a = t * (0.4 + i * 0.1) + i * 1.6; k.position.set(Math.cos(a) * (1.6 + i * 0.35), 0.1, Math.sin(a) * (1.6 + i * 0.35)); k.rotation.y = -a; }); });
      // פנסי אבן
      const lm = new THREE.MeshStandardMaterial({ map: stoneTex('lanternStone', 0x9a9890, 0x56544e, { freq: 4, seed: 68 }), roughness: 0.9 });
      [[-6.9, -6.9], [6.9, -6.9], [-6.9, 6.9], [6.9, 6.9]].forEach(([x, z], i) => { const l = stoneLantern(set, ctx, lm); l.position.set(x, 0, z); set.part(l, { delay: 1 + i * 0.12 }); });
      set.light({ color: 0xffa040, intensity: 10, distance: 10, pos: [-6.9, 2.2, -6.9], flicker: 0.15 });
      set.light({ color: 0xffa040, intensity: 10, distance: 10, pos: [6.9, 2.2, -6.9], flicker: 0.15 });
      return set;
    },

    // שלב 12: טירת פגודה רב-קומתית ופריחת דובדבן
    (ctx) => {
      const set = new StageSet();
      const wall = std(0xf2ece0, 0.8);
      const roof = std(0x2a3036, 0.5, 0.3);
      const R = red();
      const gold = std(0xe8b84a, 0.25, 1);
      const pagoda = new THREE.Group();
      pagoda.add(mesh(G.box(10, 2.4, 10), new THREE.MeshStandardMaterial({ map: stoneTex('castleBase', 0x8a867c, 0x4a4840, { freq: 4, seed: 69 }), roughness: 0.95 }), { pos: [0, 1.2, 0], cast: true, receive: true }));
      let y = 2.4;
      for (let i = 0; i < 5; i++) {
        const w = 7 - i * 1.15, h = 2.3 - i * 0.12;
        pagoda.add(mesh(G.box(w, h, w), wall, { pos: [0, y + h / 2, 0], cast: true, receive: true }));
        for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) pagoda.add(mesh(G.box(0.14, h, 0.14), R, { pos: [s * w / 2, y + h / 2, k * w / 3] }));
        const r = curvedRoof(w + 2.4, w + 2.4, 1.4, roof);
        r.position.y = y + h + 0.55;
        pagoda.add(r);
        y += h + 1.0;
      }
      pagoda.add(mesh(G.cyl(0.1, 0.1, 3.4, 8), gold, { pos: [0, y + 1.6, 0] }));
      for (let k = 0; k < 6; k++) pagoda.add(mesh(G.torus(0.3 - k * 0.03, 0.05, 6, 16), gold, { pos: [0, y + 0.6 + k * 0.42, 0], rot: [Math.PI / 2, 0, 0] }));
      // דגי זהב (שאצ'יהוקו) על הגג העליון
      pagoda.position.set(0, 0, -19.5);
      pagoda.scale.setScalar(0.78);
      set.part(pagoda, { delay: 0, depth: (y + 4) * 0.78 });
      // עצי דובדבן
      const petal = std(0xffb7cf, 0.8, 0, { emissive: 0x6a2a3a, emissiveIntensity: 0.15 });
      const trunk = std(0x4a2e22, 0.9);
      [[-13, -15], [13, -15], [-15, -5], [15, -5], [-9, -19], [9, -19]].forEach(([x, z], i) => { const t = sakuraTree(petal, trunk); t.position.set(x, 0, z); set.part(t, { delay: 0.6 + i * 0.12, mode: 'scale' }); });
      let acc = 0;
      set.onUpdate((dt) => {
        acc += dt;
        if (acc > 0.05) {
          acc = 0;
          ctx.fx.norm.emit({ count: 2, pos: [rand(-18, 18), rand(9, 14), rand(-22, 12)], vel: [0.6, -0.9, 0.2], velSpread: [0.5, 0.2, 0.5], color: [0xffc0d4, 0xffd8e6, 0xff9ab8], size: [0.12, 0.22], life: [7, 10], alpha: 0.95, swirl: 0.02 });
        }
      });
      return set;
    },
  ],
};

export { flame };
