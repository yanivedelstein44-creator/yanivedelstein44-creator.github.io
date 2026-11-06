/** עידן 7 — ממלכת הפרעונים: אובליסקים עם הירוגליפים זוהרים, כלי אש, פירמידות זהב ופסלי אנוביס */
import * as THREE from 'three';
import { StageSet, flame, std, mesh, G, rand, TAU } from './common.js';
import { drawnTexture, stoneTex } from '../kit.js';

const sandstone = () => new THREE.MeshStandardMaterial({ map: stoneTex('egSand', 0xe0c08a, 0xa8804c, { freq: 5, seed: 71 }), roughness: 0.85 });
const gold = () => std(0xf2c14e, 0.18, 1);

function hieroTex() {
  return drawnTexture('hiero', 128, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffd36a'; c.fillStyle = '#ffd36a'; c.lineWidth = 3; c.shadowColor = '#ffb020'; c.shadowBlur = 6;
    for (let r = 0; r < 14; r++) {
      const y = 20 + r * 34, t = r % 6;
      c.save(); c.translate(w / 2, y);
      if (t === 0) { c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.stroke(); c.fillRect(-2, -2, 4, 4); }
      else if (t === 1) { c.beginPath(); c.moveTo(-12, 8); c.lineTo(0, -10); c.lineTo(12, 8); c.closePath(); c.stroke(); }
      else if (t === 2) { c.beginPath(); c.ellipse(0, -4, 10, 6, 0, 0, TAU); c.stroke(); c.fillRect(-1, 2, 2, 10); c.fillRect(-6, 6, 12, 2); }
      else if (t === 3) { c.beginPath(); c.moveTo(-12, 0); c.quadraticCurveTo(0, -14, 12, 0); c.stroke(); c.beginPath(); c.arc(0, 2, 3, 0, TAU); c.fill(); }
      else if (t === 4) { for (let k = -1; k <= 1; k++) c.fillRect(k * 7 - 1, -10, 3, 20); }
      else { c.beginPath(); c.moveTo(-10, 6); c.lineTo(-4, -8); c.lineTo(4, 6); c.lineTo(10, -8); c.stroke(); }
      c.restore();
    }
  }, { h: 512 });
}

function obelisk(mat, emissiveTex) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.55, 0.85, 8, 4, 1);
  geo.rotateY(Math.PI / 4);
  const m = new THREE.MeshStandardMaterial({ map: mat.map, roughness: 0.8, emissive: 0xffc040, emissiveMap: emissiveTex, emissiveIntensity: 1.2 });
  g.add(mesh(G.box(2.1, 0.6, 2.1), mat, { pos: [0, 0.3, 0], cast: true, receive: true }));
  g.add(mesh(geo, m, { pos: [0, 4.6, 0], cast: true }));
  const tip = new THREE.ConeGeometry(0.78, 1.0, 4); tip.rotateY(Math.PI / 4);
  g.add(mesh(tip, gold(), { pos: [0, 9.1, 0], cast: true }));
  g.userData.mat = m;
  return g;
}

function anubis(black, goldM) {
  const g = new THREE.Group();
  g.add(mesh(G.box(2.6, 1.4, 3.2), std(0xcaa868, 0.85), { pos: [0, 0.7, 0], cast: true, receive: true }));
  // גוף יושב
  g.add(mesh(G.box(1.4, 2.4, 1.2), black, { pos: [0, 2.6, -0.2], cast: true }));
  g.add(mesh(G.box(1.5, 0.9, 1.8), black, { pos: [0, 1.85, 0.3], cast: true }));
  g.add(mesh(G.box(0.5, 1.5, 0.5), black, { pos: [-0.45, 2.0, 1.0] }));
  g.add(mesh(G.box(0.5, 1.5, 0.5), black, { pos: [0.45, 2.0, 1.0] }));
  g.add(mesh(G.torus(0.62, 0.16, 8, 20), goldM, { pos: [0, 3.75, -0.15], rot: [Math.PI / 2, 0, 0] }));
  // ראש תן
  const head = new THREE.Group();
  head.add(mesh(G.box(0.8, 0.8, 0.9), black, { cast: true }));
  head.add(mesh(G.box(0.38, 0.38, 0.95), black, { pos: [0, -0.15, 0.75], cast: true }));
  for (const s of [-1, 1]) head.add(mesh(G.cone(0.2, 1.1, 4), black, { pos: [s * 0.27, 0.85, -0.1], cast: true }));
  for (const s of [-1, 1]) head.add(mesh(G.sph(0.07, 8, 6), std(0xffd36a, 0.2, 0, { emissive: 0xffb020, emissiveIntensity: 2 }), { pos: [s * 0.22, 0.12, 0.46] }));
  head.position.set(0, 4.35, -0.1);
  g.add(head);
  // מטה וואס
  g.add(mesh(G.cyl(0.06, 0.06, 4.6, 8), goldM, { pos: [0.95, 2.6, 0.7] }));
  g.add(mesh(G.box(0.4, 0.12, 0.12), goldM, { pos: [0.95, 4.9, 0.78] }));
  g.scale.setScalar(1.35);
  return g;
}

export default {
  focus: [
    { target: [0, 3, -6], radius: 30, polar: 60, from: -0.7, to: 0.7 },
    { target: [0, 6, -18], radius: 40, polar: 66, from: 0.6, to: -0.6 },
  ],

  floor() {
    const tex = drawnTexture('egTiles', 256, (c, s) => {
      c.fillStyle = '#c8a874'; c.fillRect(0, 0, s, s);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { const v = 190 + Math.random() * 40; c.fillStyle = `rgb(${v + 20},${v - 10},${v - 60})`; c.fillRect(k * 64 + 2, r * 64 + 2, 60, 60); }
      c.strokeStyle = 'rgba(120,80,30,0.5)'; c.lineWidth = 3; c.strokeRect(20, 20, s - 40, s - 40);
    });
    tex.repeat.set(6, 6);
    return mesh(new THREE.PlaneGeometry(25, 25), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.03, 0], receive: true });
  },

  stages: [
    // שלב 13: אובליסקים זוהרים וכלי אש
    (ctx) => {
      const set = new StageSet();
      const ss = sandstone();
      const ht = hieroTex();
      const obs = [];
      [[-8, -9.5], [8, -9.5], [-12.5, -2], [12.5, -2]].forEach(([x, z], i) => { const o = obelisk(ss, ht); o.position.set(x, 0, z); set.part(o, { delay: i * 0.2 }); obs.push(o); });
      set.onUpdate((dt, t) => { obs.forEach((o, i) => { o.userData.mat.emissiveIntensity = 0.9 + Math.sin(t * 2 + i) * 0.5; }); });
      const bronze = std(0x8a6a3a, 0.4, 0.9);
      [[-6.9, -6.9], [6.9, -6.9], [-6.9, 6.9], [6.9, 6.9]].forEach(([x, z], i) => {
        const b = new THREE.Group();
        for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; b.add(mesh(G.cyl(0.06, 0.06, 1.8, 6), bronze, { pos: [Math.cos(a) * 0.35, 0.85, Math.sin(a) * 0.35], rot: [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25] })); }
        b.add(mesh(G.lathe('brazier', [[0, 0], [0.3, 0], [0.75, 0.45], [0.8, 0.5], [0, 0.5]], 20), bronze, { pos: [0, 1.6, 0], cast: true }));
        b.add(flame(set, ctx, [0, 2.05, 0], 1.0, { smoke: true }));
        b.position.set(x, 0, z);
        set.part(b, { delay: 0.9 + i * 0.12 });
      });
      set.light({ color: 0xffa040, intensity: 14, distance: 12, pos: [-6.9, 2.6, -6.9], flicker: 0.35 });
      set.light({ color: 0xffa040, intensity: 14, distance: 12, pos: [6.9, 2.6, -6.9], flicker: 0.35 });
      // ספינקס קטן
      const sph = new THREE.Group();
      sph.add(mesh(G.box(1.6, 1.0, 3.4), ss, { pos: [0, 0.5, 0], cast: true }));
      sph.add(mesh(G.box(1.3, 1.6, 1.2), ss, { pos: [0, 1.6, 1.0], cast: true }));
      sph.add(mesh(G.box(1.1, 1.0, 0.9), ss, { pos: [0, 2.7, 1.3], cast: true }));
      sph.add(mesh(G.box(1.6, 0.9, 0.3), std(0x2a4aa8, 0.4), { pos: [0, 2.5, 1.0] }));
      sph.position.set(-12, 0, -11); sph.rotation.y = 0.6; sph.scale.setScalar(1.4);
      set.part(sph, { delay: 1.4 });
      return set;
    },

    // שלב 14: פירמידות זהב, פסלי אנוביס וחול זהוב מסתחרר
    (ctx) => {
      const set = new StageSet();
      const ss = sandstone();
      const goldM = gold();
      [[-11.5, -22, 9, 8.5], [11, -23.5, 11, 10]].forEach(([x, z, b, h], i) => {
        const p = new THREE.Group();
        const body = new THREE.ConeGeometry(b * 0.71, h, 4); body.rotateY(Math.PI / 4);
        p.add(mesh(body, ss, { pos: [0, h / 2, 0], cast: true, receive: true }));
        const cap = new THREE.ConeGeometry(b * 0.71 * 0.2, h * 0.2, 4); cap.rotateY(Math.PI / 4);
        p.add(mesh(cap, goldM, { pos: [0, h * 0.9, 0], cast: true }));
        p.position.set(x, 0, z);
        set.part(p, { delay: i * 0.3, depth: h + 1 });
      });
      const black = std(0x15141a, 0.35, 0.3);
      [[-5.2, -15.5], [5.2, -15.5]].forEach(([x, z], i) => { const a = anubis(black, goldM); a.position.set(x, 0, z); set.part(a, { delay: 0.7 + i * 0.25 }); });
      let acc = 0;
      set.onUpdate((dt) => {
        acc += dt;
        if (acc > 0.04) {
          acc = 0;
          const a = rand(0, TAU), r = rand(9, 20);
          ctx.fx.add.emit({ count: 2, pos: [Math.cos(a) * r, rand(0.2, 2.5), Math.sin(a) * r], vel: [0, 0.4, 0], velSpread: [0.3, 0.2, 0.3], color: [0xffd36a, 0xffe9a8, 0xd8a040], size: [0.05, 0.12], life: [3, 5], swirl: 0.12, drag: 0.9, alpha: 0.85 });
        }
      });
      return set;
    },
  ],
};
