/** עידן 4 — עידן התעשייה: חממות ברזל וזכוכית, ארובות, פנסי רחוב ומגדל שעון עם גלגלי שיניים */
import * as THREE from 'three';
import { StageSet, std, glowMat, mesh, G, rand } from './common.js';
import { drawnTexture, glowTexture } from '../kit.js';

const brickTex = (key = 'brick', rep = [2, 4]) => {
  const t = drawnTexture(key, 256, (c, s) => {
    c.fillStyle = '#6a5a4c'; c.fillRect(0, 0, s, s);
    for (let r = 0; r < 16; r++) {
      for (let k = 0; k < 5; k++) {
        const v = 120 + Math.random() * 50;
        c.fillStyle = `rgb(${v + 40},${v * 0.55},${v * 0.4})`;
        c.fillRect(((k * 56 + (r % 2) * 28) % s) - 2, r * 16 + 2, 52, 12);
      }
    }
  });
  t.repeat.set(...rep);
  return t;
};

function gearShape(teeth, r, depthTooth = 0.18) {
  const s = new THREE.Shape();
  const n = teeth * 2;
  for (let i = 0; i <= n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const rr = i % 2 ? r : r + depthTooth;
    const x0 = Math.cos(a0) * rr, y0 = Math.sin(a0) * rr, x1 = Math.cos(a1) * rr, y1 = Math.sin(a1) * rr;
    if (i === 0) s.moveTo(x0, y0); else s.lineTo(x0, y0);
    s.lineTo(x1, y1);
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true);
  s.holes.push(hole);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const h = new THREE.Path(); h.absarc(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.17, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  return s;
}
const gearGeo = (teeth, r) => new THREE.ExtrudeGeometry(gearShape(teeth, r, r * 0.16), { depth: 0.22, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1, curveSegments: 6 }).translate(0, 0, -0.11);

function clockFaceTex() {
  return drawnTexture('clockFace', 512, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 10, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#e8d8b0');
    c.fillStyle = g; c.beginPath(); c.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#b8862a'; c.lineWidth = 14; c.stroke();
    c.fillStyle = '#2a2018'; c.font = '700 52px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    R.forEach((t, i) => { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; c.fillText(t, s / 2 + Math.cos(a) * s * 0.38, s / 2 + Math.sin(a) * s * 0.38); });
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; c.fillRect(s / 2 + Math.cos(a) * s * 0.46 - 2, s / 2 + Math.sin(a) * s * 0.46 - 2, 4, 4); }
  });
}

function streetLamp(set, mat) {
  const g = new THREE.Group();
  g.add(mesh(G.cyl(0.32, 0.4, 0.35, 10), mat, { pos: [0, 0.18, 0], cast: true }));
  g.add(mesh(G.cyl(0.08, 0.11, 3.6, 8), mat, { pos: [0, 2.1, 0], cast: true }));
  g.add(mesh(G.torus(0.14, 0.04, 6, 12), mat, { pos: [0, 1.2, 0], rot: [Math.PI / 2, 0, 0] }));
  g.add(mesh(G.cyl(0.32, 0.18, 0.12, 8), mat, { pos: [0, 3.95, 0] }));
  const glass = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffb050, emissiveIntensity: 2.2, transparent: true, opacity: 0.9 });
  g.add(mesh(G.cyl(0.24, 0.18, 0.55, 8), glass, { pos: [0, 4.3, 0] }));
  g.add(mesh(G.cone(0.36, 0.35, 8), mat, { pos: [0, 4.75, 0] }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffb050, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(2.4); halo.position.y = 4.3;
  g.add(halo);
  set.onUpdate((dt, t) => { halo.material.opacity = 0.5 + Math.sin(t * 7 + g.id) * 0.04; });
  return g;
}

export default {
  focus: [
    { target: [0, 3, -4], radius: 32, polar: 58, from: -0.8, to: 0.7 },
    { target: [0, 8, -18], radius: 30, polar: 70, from: 0.5, to: -0.5 },
  ],

  floor() {
    const tex = drawnTexture('herring', 256, (c, s) => {
      c.fillStyle = '#4a3a30'; c.fillRect(0, 0, s, s);
      const w = 32, h = 16;
      for (let y = -s; y < s * 2; y += h) {
        for (let x = -s; x < s * 2; x += w * 2) {
          const v = 100 + Math.random() * 50;
          c.fillStyle = `rgb(${v + 50},${v * 0.6},${v * 0.42})`;
          c.save(); c.translate(x + (y / h) * h, y); c.rotate(Math.PI / 4); c.fillRect(0, 0, w - 2, h - 2); c.restore();
          c.save(); c.translate(x + w + (y / h) * h, y); c.rotate(-Math.PI / 4); c.fillRect(0, 0, w - 2, h - 2); c.restore();
        }
      }
    });
    tex.repeat.set(8, 8);
    return mesh(new THREE.PlaneGeometry(25, 25), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.03, 0], receive: true });
  },

  stages: [
    // שלב 7: חממות ברזל-זכוכית, ארובות ופנסים
    (ctx) => {
      const set = new StageSet();
      const iron = std(0x2a2e34, 0.45, 0.85);
      const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfe8e0, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
      [-1, 1].forEach((s, si) => {
        const hall = new THREE.Group();
        const L = 13, W = 5, H = 5.6;
        const arch = new THREE.TorusGeometry(W / 2, 0.08, 6, 24, Math.PI);
        for (let i = 0; i <= 7; i++) {
          const z = -L / 2 + (i * L) / 7;
          hall.add(mesh(arch, iron, { pos: [0, H - W / 2, z], cast: true }));
          hall.add(mesh(G.box(0.12, H - W / 2, 0.12), iron, { pos: [-W / 2, (H - W / 2) / 2, z] }));
          hall.add(mesh(G.box(0.12, H - W / 2, 0.12), iron, { pos: [W / 2, (H - W / 2) / 2, z] }));
        }
        const vault = new THREE.CylinderGeometry(W / 2, W / 2, L, 24, 1, true, -Math.PI / 2, Math.PI);
        hall.add(mesh(vault, glass, { pos: [0, H - W / 2, 0], rot: [Math.PI / 2, 0, Math.PI / 2] }));
        hall.add(mesh(G.box(0.04, H - W / 2, L), glass, { pos: [-W / 2, (H - W / 2) / 2, 0] }));
        hall.add(mesh(G.box(0.04, H - W / 2, L), glass, { pos: [W / 2, (H - W / 2) / 2, 0] }));
        hall.add(mesh(G.box(W + 0.4, 0.3, L + 0.4), std(0x5a4a3c, 0.9), { pos: [0, 0.15, 0], receive: true }));
        // צמחים בתוך החממה
        for (let k = 0; k < 6; k++) hall.add(mesh(G.sph(0.6, 10, 8), std(0x2f6a34, 0.9), { pos: [rand(-1.4, 1.4), 0.7, -L / 2 + 1 + k * 2.2] }));
        hall.position.set(s * 12.8, 0, -5);
        set.part(hall, { delay: si * 0.3 });
      });
      // ארובות לבנים עם עשן
      const bm = new THREE.MeshStandardMaterial({ map: brickTex('chimBrick', [2, 6]), roughness: 0.95 });
      [[-15, -15, 13], [15, -14, 11.5], [-10, -19, 10], [11, -19.5, 12.5]].forEach(([x, z, h], i) => {
        const c = new THREE.Group();
        c.add(mesh(G.cyl(0.85, 1.15, h, 14), bm, { pos: [0, h / 2, 0], cast: true }));
        c.add(mesh(G.cyl(1.1, 1.0, 0.6, 14), std(0x3a2a22, 0.8), { pos: [0, h + 0.2, 0] }));
        c.position.set(x, 0, z);
        set.part(c, { delay: 0.5 + i * 0.15 });
        let acc = rand(0, 1);
        set.onUpdate((dt) => {
          acc += dt;
          if (acc > 0.28) { acc = 0; ctx.fx.smoke([x, h + 0.8, z], 1, 0x3a3634, 0.4); }
        });
      });
      // פנסי רחוב
      const lampMat = std(0x1a1c20, 0.4, 0.8);
      [[-6.9, -6.9], [6.9, -6.9], [-6.9, 6.9], [6.9, 6.9], [-6.9, 0], [6.9, 0]].forEach(([x, z], i) => {
        const l = streetLamp(set, lampMat);
        l.position.set(x, 0, z);
        set.part(l, { delay: 1.0 + i * 0.12 });
      });
      set.light({ color: 0xffb050, intensity: 14, distance: 12, pos: [-6.9, 4.3, -6.9], flicker: 0.05 });
      set.light({ color: 0xffb050, intensity: 14, distance: 12, pos: [6.9, 4.3, -6.9], flicker: 0.05 });
      set.light({ color: 0xffb050, intensity: 12, distance: 12, pos: [0, 4.3, 6.9], flicker: 0.05 });
      return set;
    },

    // שלב 8: מגדל שעון עם גלגלי שיניים מוזהבים וקיטור
    (ctx) => {
      const set = new StageSet();
      const bm = new THREE.MeshStandardMaterial({ map: brickTex('towerBrick', [3, 10]), roughness: 0.92 });
      const stone = std(0xc8bca8, 0.8);
      const slate = std(0x2a2e3a, 0.6, 0.2);
      const gold = std(0xe8b84a, 0.25, 1);
      const tower = new THREE.Group();
      tower.add(mesh(G.box(6, 1.2, 6), stone, { pos: [0, 0.6, 0], cast: true, receive: true }));
      tower.add(mesh(G.box(4.8, 6.2, 4.8), bm, { pos: [0, 4.3, 0], cast: true, receive: true }));
      tower.add(mesh(G.box(5.4, 0.5, 5.4), stone, { pos: [0, 7.6, 0], cast: true }));
      tower.add(mesh(G.box(4.6, 3.6, 4.6), stone, { pos: [0, 9.6, 0], cast: true }));
      tower.add(mesh(G.box(5.0, 0.4, 5.0), stone, { pos: [0, 11.6, 0], cast: true }));
      const roof = new THREE.ConeGeometry(3.6, 4.6, 4); roof.rotateY(Math.PI / 4);
      tower.add(mesh(roof, slate, { pos: [0, 14.1, 0], cast: true }));
      tower.add(mesh(G.cyl(0.06, 0.06, 2.0, 6), gold, { pos: [0, 17.2, 0] }));
      tower.add(mesh(G.sph(0.3, 12, 10), gold, { pos: [0, 16.5, 0] }));
      const faceMat = new THREE.MeshStandardMaterial({ map: clockFaceTex(), roughness: 0.4, emissive: 0xffe8b0, emissiveMap: clockFaceTex(), emissiveIntensity: 0.35 });
      const hands = [];
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        const face = new THREE.Group();
        face.add(mesh(new THREE.CircleGeometry(1.75, 40), faceMat));
        face.add(mesh(G.torus(1.78, 0.1, 8, 40), gold));
        const hh = mesh(G.box(0.14, 0.95, 0.04), std(0x1a1410, 0.4, 0.6), { pos: [0, 0.4, 0.05] });
        const mh = mesh(G.box(0.09, 1.4, 0.04), std(0x1a1410, 0.4, 0.6), { pos: [0, 0.62, 0.08] });
        const hp = new THREE.Group(); hp.add(hh); hp.position.z = 0.04;
        const mp = new THREE.Group(); mp.add(mh); mp.position.z = 0.06;
        face.add(hp, mp);
        hands.push({ hp, mp });
        face.position.set(Math.sin(a) * 2.32, 9.6, Math.cos(a) * 2.32);
        face.rotation.y = a;
        tower.add(face);
      }
      // גלגלי שיניים מוזהבים בחזית
      const gears = [
        { g: gearGeo(18, 1.5), pos: [-1.0, 4.6, 2.55], speed: 0.5 },
        { g: gearGeo(12, 1.0), pos: [1.45, 5.6, 2.62], speed: -0.5 * (18 / 12) },
        { g: gearGeo(10, 0.8), pos: [1.0, 2.9, 2.7], speed: -0.5 * (18 / 10) },
        { g: gearGeo(24, 2.0), pos: [2.55, 4.4, 0], speed: 0.25, side: true },
        { g: gearGeo(24, 2.0), pos: [-2.55, 4.4, 0], speed: -0.25, side: true },
      ];
      const gearMeshes = gears.map((d) => {
        const m = mesh(d.g, gold, { pos: d.pos, cast: true });
        if (d.side) m.rotation.y = Math.PI / 2;
        tower.add(m);
        return { m, speed: d.speed };
      });
      tower.position.set(0, 0, -17.5);
      set.part(tower, { delay: 0, depth: 19 });
      set.onUpdate((dt) => {
        gearMeshes.forEach(({ m, speed }) => { m.rotation.z += dt * speed; });
        const now = new Date();
        const hrs = (now.getHours() % 12) + now.getMinutes() / 60, mins = now.getMinutes() + now.getSeconds() / 60;
        hands.forEach(({ hp, mp }) => { hp.rotation.z = -(hrs / 12) * Math.PI * 2; mp.rotation.z = -(mins / 60) * Math.PI * 2; });
      });
      // צינורות קיטור
      const pipe = std(0x6a6e74, 0.4, 0.9);
      [[-4.2, -14.2], [4.2, -14.2], [-4.2, -20.8], [4.2, -20.8]].forEach(([x, z], i) => {
        const p = new THREE.Group();
        p.add(mesh(G.cyl(0.28, 0.28, 3.2, 10), pipe, { pos: [0, 1.6, 0], cast: true }));
        p.add(mesh(G.torus(0.3, 0.08, 6, 12), gold, { pos: [0, 3.0, 0], rot: [Math.PI / 2, 0, 0] }));
        p.position.set(x, 0, z);
        set.part(p, { delay: 0.6 + i * 0.1 });
        let acc = rand(0, 2);
        set.onUpdate((dt) => {
          acc += dt;
          if (acc > 1.4 + i * 0.3) {
            acc = 0;
            ctx.fx.norm.emit({ count: 10, pos: [x, 3.4, z], spread: [0.1, 0.05, 0.1], vel: [0, 2.6, 0], velSpread: [0.5, 0.6, 0.5], color: 0xf0f0f0, size: [0.4, 0.8], life: [1.2, 2.2], grow: 3.5, alpha: 0.55, drag: 1.2 });
          }
        });
      });
      // גלגלי שיניים קטנים בפינות הבמה
      [[-5.25, -5.25], [5.25, -5.25], [-5.25, 5.25], [5.25, 5.25]].forEach(([x, z], i) => {
        const g = mesh(gearGeo(12, 0.42), gold, { pos: [x, 0.36, z], rot: [-Math.PI / 2, 0, 0], cast: true });
        set.part(g, { delay: 1.2 + i * 0.1, mode: 'scale' });
        set.onUpdate((dt) => { g.rotation.z += dt * (i % 2 ? 0.6 : -0.6); });
      });
      return set;
    },
  ],
};

export { glowMat };
