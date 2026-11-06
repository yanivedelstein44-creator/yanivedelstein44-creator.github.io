/** עידן 1 — עידן האבן: מדורת השבט, אוהלי עור, מעגל מונוליתים וטוטמים */
import * as THREE from 'three';
import { StageSet, flame, std, mesh, G, rand, TAU, ringPositions } from './common.js';
import { stoneTex, woodTex, drawnTexture, glowTexture } from '../kit.js';

const rockMat = () => new THREE.MeshStandardMaterial({ map: stoneTex('menhir', 0x9a9488, 0x5a554c, { freq: 4, seed: 41, pits: 0.3 }), roughness: 1 });
const logMat = () => new THREE.MeshStandardMaterial({ map: woodTex('log', 0x6a4a30, 0x2c1c10, { rings: 5, seed: 42 }), roughness: 0.9 });

function totemTexture() {
  return drawnTexture('totem', 256, (ctx, w, h) => {
    const cols = ['#b8322a', '#1f1a16', '#e8d8b0', '#2a6a8a', '#c88a2a'];
    for (let i = 0; i < 4; i++) {
      const y0 = (i * h) / 4;
      ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(0, y0, w, h / 4);
      ctx.fillStyle = cols[(i + 2) % cols.length];
      ctx.beginPath(); ctx.ellipse(w * 0.3, y0 + h / 10, 22, 14, 0, 0, TAU); ctx.ellipse(w * 0.7, y0 + h / 10, 22, 14, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(w * 0.3, y0 + h / 10, 7, 0, TAU); ctx.arc(w * 0.7, y0 + h / 10, 7, 0, TAU); ctx.fill();
      ctx.fillRect(w * 0.3, y0 + h / 6, w * 0.4, 8);
    }
  }, { h: 512 });
}

export default {
  focus: [
    { target: [0, 1.5, -10], radius: 18, polar: 64, from: -0.9, to: 0.5 },
    { target: [0, 2.5, -2], radius: 34, polar: 58, from: 0.8, to: -0.6 },
  ],

  floor() {
    const tex = stoneTex('dirt', 0x7a5c3e, 0x4a3420, { freq: 6, seed: 40, pits: 0.1 });
    tex.repeat.set(5, 5);
    const alpha = drawnTexture('dirtAlpha', 256, (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s / 2);
      g.addColorStop(0, '#fff'); g.addColorStop(0.75, '#ccc'); g.addColorStop(1, '#000');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    }, { srgb: false });
    const mat = new THREE.MeshStandardMaterial({ map: tex, alphaMap: alpha, transparent: true, roughness: 1, depthWrite: false });
    const g = new THREE.Group();
    g.add(mesh(new THREE.CircleGeometry(10, 48), mat, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.025, 0], receive: true }));
    g.add(mesh(new THREE.CircleGeometry(4.5, 32), mat, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.03, -11.5], receive: true }));
    return g;
  },

  stages: [
    // שלב 1: מדורה שואגת
    (ctx) => {
      const set = new StageSet();
      const rm = rockMat(), lm = logMat();
      const C = [0, 0, -11.5];
      const ring = new THREE.Group();
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * TAU;
        const r = mesh(G.dodeca(0.38), rm, { pos: [Math.cos(a) * 1.25, 0.18, Math.sin(a) * 1.25], rot: [rand(0, 3), rand(0, 3), 0], scale: [1, 0.7, 1], cast: true });
        ring.add(r);
      }
      ring.position.set(...C);
      set.part(ring, { delay: 0 });
      const logs = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const l = mesh(G.cyl(0.11, 0.14, 1.9, 8), lm, { cast: true });
        l.position.set(Math.cos(a) * 0.45, 0.65, Math.sin(a) * 0.45);
        l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        l.rotation.order = 'YXZ';
        l.lookAt(0, 2.2, 0);
        l.rotateX(Math.PI / 2);
        logs.add(l);
      }
      const embersBed = mesh(new THREE.CircleGeometry(0.85, 24), new THREE.MeshBasicMaterial({ map: glowTexture('emberBed', 'rgba(255,140,40,1)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.06, 0] });
      logs.add(embersBed);
      logs.position.set(...C);
      set.part(logs, { delay: 0.25 });
      const fire = flame(set, ctx, [C[0], 0.25, C[2]], 2.1, { smoke: true });
      set.part(fire, { delay: 0.6, mode: 'scale' });
      set.light({ color: 0xff8a30, intensity: 46, distance: 28, pos: [C[0], 2.4, C[2]], flicker: 0.38 });
      // מושבי בולי עץ
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.9 + Math.PI;
        const seat = mesh(G.cyl(0.32, 0.32, 2.2, 10), lm, { cast: true, receive: true });
        seat.rotation.set(0, -a, Math.PI / 2);
        seat.position.set(C[0] + Math.cos(a) * 2.9, 0.3, C[2] + Math.sin(a) * 2.9);
        set.part(seat, { delay: 0.4 + i * 0.1 });
      }
      // אוהלי עור
      const hide = new THREE.MeshStandardMaterial({ map: drawnTexture('hide', 256, (c, s) => {
        c.fillStyle = '#b08a5a'; c.fillRect(0, 0, s, s);
        c.fillStyle = '#7a4a2a';
        for (let i = 0; i < 5; i++) { c.fillRect(0, i * 52 + 20, s, 7); for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(k * 32, i * 52 + 30); c.lineTo(k * 32 + 16, i * 52 + 44); c.lineTo(k * 32 + 32, i * 52 + 30); c.fill(); } }
      }), roughness: 0.9, side: THREE.DoubleSide });
      [[-9, -14, 0.3], [9.5, -13, -0.4], [-13, -6, 0.9]].forEach(([x, z, r], i) => {
        const tent = new THREE.Group();
        tent.add(mesh(G.cone(2, 4.2, 10), hide, { pos: [0, 2.1, 0], cast: true }));
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * TAU;
          tent.add(mesh(G.cyl(0.05, 0.05, 1.4, 5), lm, { pos: [Math.cos(a) * 0.16, 4.5, Math.sin(a) * 0.16], rot: [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3] }));
        }
        tent.position.set(x, 0, z); tent.rotation.y = r;
        set.part(tent, { delay: 0.7 + i * 0.15 });
      });
      // סלעים מפוזרים
      for (let i = 0; i < 8; i++) {
        const a = rand(0, TAU), r = rand(13, 22);
        const x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (z > 8 && Math.abs(x) < 8) continue;
        set.part(mesh(G.dodeca(rand(0.5, 1.2)), rm, { pos: [x, 0.3, z], rot: [rand(0, 3), rand(0, 3), 0], scale: [1, rand(0.5, 0.9), 1], cast: true }), { delay: 1 + i * 0.05 });
      }
      return set;
    },

    // שלב 2: מעגל מונוליתים וטוטמים
    (ctx) => {
      const set = new StageSet();
      const rm = rockMat();
      const positions = ringPositions(16, 14.2, { offset: TAU / 32 });
      let i = 0;
      for (const p of positions) {
        if (p.z > 10 && Math.abs(p.x) < 7) continue;
        const tri = new THREE.Group();
        const h = rand(4.2, 5.2);
        tri.add(mesh(G.box(1.15, h, 0.95), rm, { pos: [-0.85, h / 2, 0], rot: [0, 0, rand(-0.04, 0.04)], cast: true, receive: true }));
        tri.add(mesh(G.box(1.15, h, 0.95), rm, { pos: [0.85, h / 2, 0], rot: [0, 0, rand(-0.04, 0.04)], cast: true, receive: true }));
        if (i % 3 !== 2) tri.add(mesh(G.box(3.2, 0.75, 1.0), rm, { pos: [0, h + 0.36, 0], rot: [0, 0, rand(-0.05, 0.05)], cast: true }));
        tri.position.set(p.x, 0, p.z);
        tri.rotation.y = Math.atan2(p.x, p.z);
        set.part(tri, { delay: i * 0.12 });
        i++;
      }
      // אבן מזבח
      set.part(mesh(G.box(3.2, 0.9, 1.4), rm, { pos: [0, 0.45, -17], cast: true, receive: true }), { delay: 0.2 });
      // טוטמים מגולפים
      const tt = totemTexture();
      const totemMat = new THREE.MeshStandardMaterial({ map: tt, roughness: 0.75 });
      const wingMat = std(0x8a2a20, 0.8);
      [[-9.5, -6], [9.5, -6], [-11.5, 3.5], [11.5, 3.5]].forEach(([x, z], k) => {
        const t = new THREE.Group();
        t.add(mesh(G.cyl(0.55, 0.62, 5.4, 12), totemMat, { pos: [0, 2.7, 0], cast: true }));
        t.add(mesh(G.box(3.4, 0.35, 0.25), wingMat, { pos: [0, 5.0, 0], rot: [0, 0, 0.12], cast: true }));
        t.add(mesh(G.cone(0.22, 0.9, 8), std(0xe0c060, 0.6), { pos: [0, 4.6, 0.65], rot: [Math.PI / 2, 0, 0] }));
        t.add(mesh(G.sph(0.5, 12, 8), std(0x1f1a16, 0.7), { pos: [0, 5.55, 0], scale: [1, 0.7, 1] }));
        t.position.set(x, 0, z);
        t.lookAt(0, 0, 0);
        set.part(t, { delay: 0.6 + k * 0.15 });
      });
      return set;
    },
  ],
};
