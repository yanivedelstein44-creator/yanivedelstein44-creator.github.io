/** עידן 3 — ימי הביניים: חומות עם צינים, גשר נפתח, מגדלי שמירה, דגלי משי ולפידים */
import * as THREE from 'three';
import { StageSet, flame, banner, bannerTexture, std, mesh, G } from './common.js';
import { stoneTex, woodTex, drawnTexture, archShape, extrude } from '../kit.js';

const wallMat = () => { const m = new THREE.MeshStandardMaterial({ map: stoneTex('castleStone', 0x9c9488, 0x5c564c, { freq: 5, seed: 61, pits: 0.2 }), roughness: 0.95 }); return m; };
const blockTex = () => drawnTexture('blocks', 256, (c, s) => {
  c.fillStyle = '#8f877b'; c.fillRect(0, 0, s, s);
  c.strokeStyle = 'rgba(40,36,30,0.55)'; c.lineWidth = 3;
  for (let r = 0; r < 8; r++) {
    const y = r * 32; c.beginPath(); c.moveTo(0, y); c.lineTo(s, y); c.stroke();
    for (let k = 0; k < 5; k++) { const x = (k * 64 + (r % 2) * 32) % s; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 32); c.stroke(); }
  }
  for (let i = 0; i < 600; i++) { c.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0.05)`; c.fillRect(Math.random() * s, Math.random() * s, 3, 3); }
});

function wallSegment(len, h, mat) {
  const g = new THREE.Group();
  g.add(mesh(G.box(len, h, 1.3), mat, { pos: [0, h / 2, 0], cast: true, receive: true }));
  const n = Math.max(2, Math.floor(len / 1.25));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    g.add(mesh(G.box(0.7, 0.6, 0.35), mat, { pos: [x, h + 0.3, 0.48], cast: true }));
    g.add(mesh(G.box(0.7, 0.45, 0.25), mat, { pos: [x, h + 0.22, -0.52] }));
  }
  return g;
}

export default {
  focus: [
    { target: [0, 2, -6], radius: 33, polar: 57, from: -0.7, to: 0.7 },
    { target: [0, 4, -6], radius: 36, polar: 60, from: 0.9, to: -0.5 },
  ],

  floor() {
    const tex = drawnTexture('cobble', 256, (c, s) => {
      c.fillStyle = '#5a554e'; c.fillRect(0, 0, s, s);
      for (let i = 0; i < 90; i++) {
        const x = Math.random() * s, y = Math.random() * s, r = 10 + Math.random() * 12;
        const v = 110 + Math.random() * 60;
        c.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
        for (const [dx, dy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) { c.beginPath(); c.ellipse(x + dx, y + dy, r, r * 0.8, Math.random() * 3, 0, Math.PI * 2); c.fill(); }
      }
    });
    tex.repeat.set(7, 7);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    return mesh(new THREE.PlaneGeometry(25, 25), mat, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.03, 0], receive: true });
  },

  stages: [
    // שלב 5: חומות מבצר + שער עם גשר נפתח
    (ctx) => {
      const set = new StageSet();
      const bt = blockTex(); bt.repeat.set(4, 1);
      const mat = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.95 });
      const H = 3.2, R = 12.5;
      const segs = [
        // צד שמאל וימין (4 קטעים כל אחד)
        ...[-1, 1].flatMap((s) => [-9.4, -3.1, 3.1, 9.4].map((z) => ({ pos: [s * R, 0, z], rot: Math.PI / 2, len: 6.3 }))),
        // אחורה (משני צדי השער)
        { pos: [-8.3, 0, -R], rot: 0, len: 8.4 }, { pos: [8.3, 0, -R], rot: 0, len: 8.4 },
        // קדימה (פתח רחב במרכז לשדה הראייה)
        { pos: [-9.6, 0, R], rot: 0, len: 5.8 }, { pos: [9.6, 0, R], rot: 0, len: 5.8 },
      ];
      segs.forEach((sg, i) => {
        const w = wallSegment(sg.len, H, mat);
        w.position.set(...sg.pos); w.rotation.y = sg.rot;
        if (sg.pos[2] > 0 && sg.rot === 0) w.rotation.y = Math.PI;
        if (sg.pos[0] > 0 && sg.rot !== 0) w.rotation.y = -Math.PI / 2;
        set.part(w, { delay: i * 0.08 });
      });
      // שער
      const gate = new THREE.Group();
      const gh = extrude(archShape(8.2, 5.4, 2.8, 4.0, 1, 0, 0.01), 2.2, 0.05);
      gate.add(mesh(gh, mat, { cast: true, receive: true }));
      for (let i = 0; i < 7; i++) gate.add(mesh(G.box(0.75, 0.6, 0.4), mat, { pos: [-3.6 + i * 1.2, 5.7, 0.95], cast: true }));
      for (const s of [-1, 1]) {
        gate.add(mesh(G.cyl(1.15, 1.25, 7.0, 16), wallMat(), { pos: [s * 4.3, 3.5, 0], cast: true, receive: true }));
        gate.add(mesh(G.cone(1.45, 2.4, 16), std(0x2c3550, 0.7), { pos: [s * 4.3, 8.2, 0], cast: true }));
        gate.add(mesh(G.sph(0.18, 10, 8), std(0xe0b048, 0.3, 1), { pos: [s * 4.3, 9.5, 0] }));
      }
      // שבכת ברזל (פורטקוליס)
      const iron = std(0x2a2c30, 0.5, 0.9);
      const port = new THREE.Group();
      for (let i = 0; i < 6; i++) port.add(mesh(G.box(0.08, 3.6, 0.08), iron, { pos: [-1.25 + i * 0.5, 1.8, 0] }));
      for (let j = 0; j < 6; j++) port.add(mesh(G.box(2.7, 0.07, 0.07), iron, { pos: [0, 0.3 + j * 0.62, 0] }));
      port.position.set(0, 0, -0.6);
      gate.add(port);
      // גשר נפתח מעץ עם חיזוקי ברזל
      const bridgePivot = new THREE.Group();
      bridgePivot.position.set(0, 0.15, -1.15);
      const plank = new THREE.MeshStandardMaterial({ map: woodTex('bridgeWood', 0x6a4a30, 0x3a2414, { rings: 14, seed: 62 }), roughness: 0.85 });
      const bridge = new THREE.Group();
      bridge.add(mesh(G.box(2.8, 4.2, 0.22), plank, { pos: [0, 2.1, 0], cast: true }));
      for (let k = 0; k < 3; k++) bridge.add(mesh(G.box(2.9, 0.12, 0.26), iron, { pos: [0, 0.6 + k * 1.5, 0] }));
      bridgePivot.add(bridge);
      gate.add(bridgePivot);
      const chainMat = std(0x3a3c40, 0.4, 1);
      const chains = [-1, 1].map((s) => { const c = mesh(G.cyl(0.035, 0.035, 1, 6), chainMat); gate.add(c); return { c, s }; });
      gate.position.set(0, 0, -R);
      set.part(gate, { delay: 0.5, depth: 10 });
      let open = 0;
      set.onUpdate((dt) => {
        // פורטקוליס עולה והגשר יורד בהדרגה אחרי ההופעה
        open = Math.min(1, open + dt * 0.25);
        const e = open * open * (3 - 2 * open);
        port.position.y = e * 3.4;
        bridgePivot.rotation.x = -e * (Math.PI / 2) * 0.98;
        for (const { c, s } of chains) {
          const top = new THREE.Vector3(s * 1.3, 4.6, -1.2);
          const end = new THREE.Vector3(s * 1.3, 0.15 + Math.cos(e * Math.PI / 2) * 4.1, -1.15 - Math.sin(e * Math.PI / 2) * 4.1);
          const mid = top.clone().add(end).multiplyScalar(0.5);
          c.position.copy(mid);
          c.scale.y = top.distanceTo(end);
          c.lookAt(end); c.rotateX(Math.PI / 2);
        }
      });
      return set;
    },

    // שלב 6: מגדלי פינה, דגלי משי ולפידים
    (ctx) => {
      const set = new StageSet();
      const tower = wallMat();
      const roof = std(0x26304e, 0.6, 0.1);
      const goldM = std(0xe0b048, 0.3, 1);
      const silkTex = bannerTexture('silkRed', '#8e1020', '#f2c94c', 'crown');
      const silkTex2 = bannerTexture('silkBlue', '#1a2a6e', '#f2c94c', 'crown');
      const silk = new THREE.MeshStandardMaterial({ map: silkTex, side: THREE.DoubleSide, roughness: 0.55 });
      const silk2 = new THREE.MeshStandardMaterial({ map: silkTex2, side: THREE.DoubleSide, roughness: 0.55 });
      const R = 12.5;
      [[-R, -R], [R, -R], [-R, R], [R, R]].forEach(([x, z], i) => {
        const t = new THREE.Group();
        t.add(mesh(G.cyl(2.0, 2.2, 9.5, 20), tower, { pos: [0, 4.75, 0], cast: true, receive: true }));
        for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; t.add(mesh(G.box(0.6, 0.6, 0.45), tower, { pos: [Math.cos(a) * 2.05, 9.8, Math.sin(a) * 2.05], rot: [0, -a, 0], cast: true })); }
        t.add(mesh(G.cone(2.5, 5.2, 20), roof, { pos: [0, 12.6, 0], cast: true }));
        t.add(mesh(G.cyl(0.05, 0.05, 1.6, 6), goldM, { pos: [0, 15.9, 0] }));
        const flag = banner(set, 1.4, 0.8, i % 2 ? silk : silk2, { hangTop: false, amp: 0.15, speed: 5 });
        flag.position.set(0.7, 16.3, 0);
        t.add(flag);
        // חלונות זוהרים
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + 0.5;
          t.add(mesh(G.box(0.4, 0.8, 0.12), new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xff9a30, emissiveIntensity: 1.5 }), { pos: [Math.cos(a) * 2.02, 6 + k * 0.4, Math.sin(a) * 2.02], rot: [0, -a + Math.PI / 2, 0] }));
        }
        t.position.set(x, 0, z);
        set.part(t, { delay: i * 0.25 });
      });
      // כרזות תלויות על החומות הפנימיות
      [[-6, -R + 0.72, 0], [6, -R + 0.72, 0], [-R + 0.72, -5, Math.PI / 2], [R - 0.72, -5, -Math.PI / 2], [-R + 0.72, 4, Math.PI / 2], [R - 0.72, 4, -Math.PI / 2]].forEach(([x, z, r], i) => {
        const b = banner(set, 1.5, 3.0, i % 2 ? silk : silk2, { amp: 0.12, speed: 2.2 });
        b.position.set(x, 3.4, z); b.rotation.y = r;
        set.part(b, { delay: 1.0 + i * 0.08, mode: 'scale' });
      });
      // לפידים
      const torchMat = std(0x2a2420, 0.6, 0.6);
      const torches = [[-3, -R + 0.8, 0], [3, -R + 0.8, 0], [-R + 0.8, -8, Math.PI / 2], [R - 0.8, -8, -Math.PI / 2], [-R + 0.8, 1, Math.PI / 2], [R - 0.8, 1, -Math.PI / 2]];
      torches.forEach(([x, z, r], i) => {
        const tg = new THREE.Group();
        tg.add(mesh(G.cyl(0.07, 0.05, 0.9, 6), torchMat, { pos: [0, 0, 0.18], rot: [0.5, 0, 0] }));
        tg.add(mesh(G.cyl(0.16, 0.08, 0.25, 8), torchMat, { pos: [0, 0.4, 0.38] }));
        tg.add(flame(set, ctx, [0, 0.45, 0.38], 0.75));
        tg.position.set(x, 2.3, z); tg.rotation.y = r;
        set.part(tg, { delay: 1.5 + i * 0.1, mode: 'scale' });
      });
      set.light({ color: 0xff8a30, intensity: 22, distance: 16, pos: [0, 3, -R + 1.5], flicker: 0.4 });
      set.light({ color: 0xff8a30, intensity: 16, distance: 14, pos: [-R + 1.5, 3, -4], flicker: 0.4 });
      set.light({ color: 0xff8a30, intensity: 16, distance: 14, pos: [R - 1.5, 3, -4], flicker: 0.4 });
      return set;
    },
  ],
};
