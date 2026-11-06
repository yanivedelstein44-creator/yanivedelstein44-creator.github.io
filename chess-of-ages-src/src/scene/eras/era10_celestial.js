/** עידן 10 — מקדש האלים השמימי: איי שיש אסטרליים, גשרי אור, שמשות מסתובבות, טבעות גאומטריה מקודשת ונבולה */
import * as THREE from 'three';
import { StageSet, std, mesh, G, rand, TAU } from './common.js';
import { drawnTexture, marbleTex, glowTexture } from '../kit.js';
import { dashTexture } from './era05_cyber.js';

function sacredTex() {
  return drawnTexture('sacredGeo', 512, (c, s) => {
    c.clearRect(0, 0, s, s);
    c.strokeStyle = 'rgba(255,220,140,1)'; c.lineWidth = 3; c.shadowColor = '#ffcf6a'; c.shadowBlur = 8;
    const R = s * 0.12, cx = s / 2, cy = s / 2;
    const centers = [[0, 0]];
    for (let k = 0; k < 6; k++) centers.push([Math.cos((k / 6) * TAU) * R, Math.sin((k / 6) * TAU) * R]);
    for (let k = 0; k < 6; k++) centers.push([Math.cos((k / 6) * TAU + Math.PI / 6) * R * 1.732, Math.sin((k / 6) * TAU + Math.PI / 6) * R * 1.732]);
    centers.forEach(([x, y]) => { c.beginPath(); c.arc(cx + x, cy + y, R, 0, TAU); c.stroke(); });
    c.beginPath(); c.arc(cx, cy, R * 3.05, 0, TAU); c.stroke();
    c.beginPath(); c.arc(cx, cy, R * 3.3, 0, TAU); c.stroke();
  });
}

function miniTemple(marbleM, gold) {
  const g = new THREE.Group();
  g.add(mesh(G.cyl(1.8, 1.8, 0.3, 16), marbleM, { pos: [0, 0.15, 0], cast: true }));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.add(mesh(G.cyl(0.12, 0.14, 2, 10), marbleM, { pos: [Math.cos(a) * 1.3, 1.3, Math.sin(a) * 1.3], cast: true })); }
  g.add(mesh(G.cyl(1.6, 1.6, 0.2, 16), marbleM, { pos: [0, 2.4, 0] }));
  g.add(mesh(new THREE.SphereGeometry(1.2, 20, 12, 0, TAU, 0, Math.PI / 2), gold, { pos: [0, 2.5, 0], cast: true }));
  g.add(mesh(G.sph(0.3, 12, 10), std(0xffffff, 0.2, 0, { emissive: 0xffe8b0, emissiveIntensity: 2.5 }), { pos: [0, 1.3, 0] }));
  return g;
}

export default {
  focus: [
    { target: [0, 5, -6], radius: 38, polar: 60, from: -0.8, to: 0.8 },
    { target: [0, 9, -10], radius: 44, polar: 64, from: 0.7, to: -0.7 },
  ],

  floor() {
    const stars = drawnTexture('cosmicFloor', 512, (c, s) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, s, s);
      for (let i = 0; i < 500; i++) { const a = Math.random(); c.fillStyle = `rgba(255,${230 + Math.random() * 25},${200 + Math.random() * 55},${a})`; c.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5); }
      c.strokeStyle = 'rgba(255,210,120,0.8)'; c.lineWidth = 2;
      for (let k = 1; k <= 3; k++) { c.beginPath(); c.arc(s / 2, s / 2, k * s * 0.15, 0, TAU); c.stroke(); }
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; c.beginPath(); c.moveTo(s / 2, s / 2); c.lineTo(s / 2 + Math.cos(a) * s * 0.45, s / 2 + Math.sin(a) * s * 0.45); c.stroke(); }
    });
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x1a1236, roughness: 0.06, metalness: 0.3, clearcoat: 1, emissive: 0xffe0b0, emissiveMap: stars, emissiveIntensity: 0.7 });
    const m = mesh(new THREE.PlaneGeometry(25, 25), mat, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.03, 0], receive: true });
    m.userData.update = (dt, t) => { mat.emissiveIntensity = 0.55 + Math.sin(t * 0.8) * 0.18; };
    return m;
  },

  stages: [
    // שלב 19: איי שיש אסטרליים וגשרי אור
    (ctx) => {
      const set = new StageSet();
      const marbleM = new THREE.MeshPhysicalMaterial({ map: marbleTex('astralMarble', 0xf8f4ff, 0xb8a8e0, { freq: 2, turb: 5, sharp: 6, seed: 101 }), roughness: 0.2, clearcoat: 0.7 });
      const gold = std(0xf2c14e, 0.18, 1, { emissive: 0x6a4a10, emissiveIntensity: 0.4 });
      const rock = std(0x3a3060, 0.7, 0.2);
      const isles = [];
      [[-15, 6, -12], [15, 7.5, -12], [-19, 4.5, -1], [19, 5, -1], [0, 10, -27]].forEach(([x, y, z], i) => {
        const g = new THREE.Group();
        g.add(mesh(G.cyl(3, 3, 0.6, 18), marbleM, { cast: true, receive: true }));
        g.add(mesh(G.cone(3, 4.5, 18), rock, { pos: [0, -2.55, 0], rot: [Math.PI, 0, 0] }));
        g.add(miniTemple(marbleM, gold));
        g.position.set(x, y, z);
        g.userData = { base: y, ph: rand(0, 6), dynamic: true };
        set.part(g, { delay: i * 0.2, mode: 'scale' });
        isles.push(g);
      });
      const dash = dashTexture('dashGold', 'rgba(255,220,140,1)'); dash.repeat.set(5, 1);
      const lightMat = new THREE.MeshBasicMaterial({ map: dash, color: 0xffe0a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      isles.forEach((g, i) => {
        const a = g.position.clone();
        const edge = new THREE.Vector3(a.x, 0, a.z).setLength(13);
        const mid = a.clone().add(edge).multiplyScalar(0.5); mid.y += 2;
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(edge.x, 0.6, edge.z), mid, new THREE.Vector3(a.x, a.y + 0.3, a.z));
        set.part(mesh(new THREE.TubeGeometry(curve, 30, 0.14, 6, false), lightMat), { delay: 1 + i * 0.1, mode: 'scale' });
      });
      set.onUpdate((dt, t) => {
        dash.offset.x -= dt * 0.9;
        isles.forEach((g) => { if (!g.userData.rising) g.position.y = g.userData.base + Math.sin(t * 0.6 + g.userData.ph) * 0.3; });
      });
      set.light({ color: 0xffe0b0, intensity: 18, distance: 30, pos: [0, 8, -14], flicker: 0.05 });
      return set;
    },

    // שלב 20: שמשות מסתובבות, טבעות גאומטריה מקודשת ונבולה עמוקה
    (ctx) => {
      const set = new StageSet();
      const suns = [];
      [[0xffd36a, 19, 9, 0.18, 1.6], [0x8ac8ff, 23, 13, -0.12, 1.2], [0xff8ad8, 16, 15, 0.25, 1.0]].forEach(([col, r, y, sp, size], i) => {
        const g = new THREE.Group();
        g.add(mesh(G.sph(size, 24, 18), new THREE.MeshBasicMaterial({ color: col })));
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        halo.scale.setScalar(size * 7);
        g.add(halo);
        g.userData = { r, y, sp, a: (i / 3) * TAU, noOcc: true };
        set.part(g, { delay: i * 0.25, mode: 'scale' });
        suns.push(g);
      });
      const sTex = sacredTex();
      const ringMat = new THREE.MeshBasicMaterial({ map: sTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: 0xffe0a0, fog: false });
      const geo = new THREE.Group();
      const flower = mesh(G.plane(22, 22), ringMat, { rot: [-Math.PI / 2, 0, 0] });
      geo.add(flower);
      const goldRing = std(0xf2c14e, 0.15, 1, { emissive: 0x8a6010, emissiveIntensity: 0.7 });
      const tori = [];
      [[11, 0.07], [9, 0.06], [7.4, 0.05]].forEach(([r, t], i) => { const m = mesh(G.torus(r, t, 8, 128), goldRing); m.rotation.x = Math.PI / 2 + i * 0.5; geo.add(m); tori.push(m); });
      geo.position.set(0, 11, -17);
      geo.scale.setScalar(0.85);
      geo.rotation.x = 0.5;
      set.part(geo, { delay: 0.8, mode: 'scale' });
      const nebula = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('nebulaPuff', 'rgba(255,255,255,0.7)'), color: [0x8a3aff, 0x3a6aff, 0xff4ad8][i % 3], transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        s.position.set(rand(-120, 120), rand(40, 110), rand(-220, -150)); s.scale.setScalar(rand(70, 130));
        nebula.add(s);
      }
      nebula.userData.noOcc = true;
      set.part(nebula, { delay: 0.4, mode: 'fade' });
      set.onShow = () => { ctx.sm.skyUniforms.uNebula.value = 1.8; };
      set.onHide = () => { ctx.sm.skyUniforms.uNebula.value = 1; };
      set.onUpdate((dt, t) => {
        suns.forEach((g) => { if (g.userData.rising) return; g.userData.a += dt * g.userData.sp; g.position.set(Math.cos(g.userData.a) * g.userData.r, g.userData.y + Math.sin(t * 0.5) * 0.6, Math.sin(g.userData.a) * g.userData.r - 4); });
        flower.rotation.z += dt * 0.05;
        tori.forEach((m, i) => { m.rotation.y += dt * (0.1 + i * 0.05); m.rotation.z += dt * 0.04; });
        if (Math.random() < dt * 4) ctx.fx.add.emit({ count: 1, pos: [rand(-16, 16), rand(1, 8), rand(-18, 10)], vel: [0, 0.3, 0], velSpread: [0.2, 0.2, 0.2], color: [0xffffff, 0xffe0b0, 0xd8c8ff], size: [0.1, 0.22], life: [3, 5] });
      });
      return set;
    },
  ],
};
