/**
 * 30 התפאורות של איי הפרימיום. כל פונקציה מקבלת K (StageKit): קרקע, זירה, אביזרים ואנימציות.
 * אזור הרקע שנראה במבט המשחק (לרוחב הטלפון): מאחורי הלוח, זוויות ‎-125…-55 ברדיוס 12–22, ומעל (שמיים).
 * שאר האביזרים מסביב — לטיול חופשי ולמסכים רחבים.
 */
import * as THREE from 'three';
import { M, T, GEO, PROPS as P, merge } from './stagekit.js';
import { rand, TAU } from '../kit.js';

const DEG = Math.PI / 180;

/** אובייקט מרחף שמסתובב (נפוץ) */
function floater(K, o, x, y, z, { amp = 0.35, sp = 0.9, spin = 0.3 } = {}) {
  o.position.set(x, y, z);
  K.add(o); K.bob(o, amp, sp); if (spin) K.spin(o, spin);
  return o;
}

export const THEMES = {
  // ===================== 11 — ממלכות הפלא =====================
  100(K) { // מגנטים מרחפים
    K.ground(T.grid('x100g', 0x2e3644, 0x4aa8ff, 4, 3), { repeat: 9, rough: 0.45, metal: 0.7, emissive: 0x4aa8ff, ei: 0.35 });
    K.arena(T.rings('x100a', 0x8a96a8, 0x5a6678, 26), { metal: 0.9, rough: 0.28, rim: 0x4aa8ff });
    const red = M.std(0xc8282a, 0.35, 0.3), steel = M.std(0xdfe6ee, 0.2, 1), arcM = M.add(0x6ab8ff, 0.75);
    const magnet = () => {
      const g = K.group(K.mesh(GEO.tor(1.1, 0.34, 24, Math.PI), red, { cast: true }), K.mesh(GEO.cyl(0.34, 0.34, 1.1, 14), red, { pos: [-1.1, -0.55, 0] }), K.mesh(GEO.cyl(0.34, 0.34, 1.1, 14), red, { pos: [1.1, -0.55, 0] }),
        K.mesh(GEO.cyl(0.36, 0.36, 0.42, 14), steel, { pos: [-1.1, -1.3, 0] }), K.mesh(GEO.cyl(0.36, 0.36, 0.42, 14), steel, { pos: [1.1, -1.3, 0] }));
      const field = K.mesh(GEO.tor(1.1, 0.05, 24, Math.PI), arcM, { rot: [0, 0, Math.PI], pos: [0, -1.5, 0] });
      g.add(field); K.pulse(arcM, 0.45, 0.3, 4, 0, 'opacity');
      return g;
    };
    [[-7, 6.5, -14], [7.5, 7.5, -15], [0, 10.5, -22], [-13, 5.5, -6], [13, 6, -7], [-9, 5, 10], [9, 6, 12]].forEach(([x, y, z], i) => floater(K, magnet(), x, y, z, { amp: 0.5, sp: 0.6 + i * 0.07, spin: 0.25 * (i % 2 ? -1 : 1) }));
    // טבעת סלעים שמרחפת ומסתובבת סביב האי
    const rocks = new THREE.Group();
    const rm = M.std(0x4a4f5a, 0.9, 0.1, { flatShading: true });
    for (let i = 0; i < (K.low ? 14 : 24); i++) { const a = (i / (K.low ? 14 : 24)) * TAU; const m = K.mesh(GEO.dod(0.4 + rand(0, 0.45)), rm, { pos: [Math.cos(a) * 15.5, 2.6 + rand(-0.8, 1.6), Math.sin(a) * 15.5], rot: [rand(0, 3), rand(0, 3), 0] }); rocks.add(m); }
    K.add(rocks); K.spin(rocks, 0.06);
    K.onMove(() => { rocks.children.forEach((r, i) => { r.position.y += Math.sin(i) * 0.25; setTimeout(() => { r.position.y -= Math.sin(i) * 0.25; }, 260); }); });
    K.corners(() => { const m = magnet(); m.scale.setScalar(0.55); m.position.y = 2.4; const g = K.group(m); K.bob(m, 0.25, 1.2); K.spin(m, 0.4); return g; });
  },

  101(K) { // ארמון קרח הזכוכית
    K.ground(T.cracks('x101g', 0xd8f0fa, 0x9ad0ea, 22, 2), { repeat: 6, rough: 0.2, metal: 0.1 });
    K.arena(T.cracks('x101a', 0xeaf8ff, 0xb8e0f2, 14, 2), { phys: true, clearcoat: 1, rough: 0.08, rim: 0xbfe8ff });
    const ice = M.phys({ color: 0xcfeefa, roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.82, clearcoat: 1, emissive: 0x3a8ab8, emissiveIntensity: 0.18, flatShading: true });
    const core = M.glow(0x9ae8ff, 1.2);
    const cluster = (h) => {
      const g = K.group();
      [[0, 0, h], [0.9, 0.3, h * 0.65], [-0.8, 0.4, h * 0.55], [0.3, -0.8, h * 0.45]].forEach(([x, z, hh], i) => {
        g.add(K.mesh(GEO.cone(hh * 0.2, hh, 6), ice, { pos: [x, hh / 2, z], rot: [rand(-0.12, 0.12), 0, rand(-0.12, 0.12)], cast: true }));
        if (i === 0) g.add(K.mesh(GEO.cone(hh * 0.08, hh * 0.8, 6), core, { pos: [x, hh * 0.42, z] }));
      });
      return g;
    };
    K.pulse(core, 1.0, 0.5, 1.5);
    [[-6.5, -13, 7], [6.5, -14, 8.5], [-11, -9, 5], [11, -9, 5.5], [0, -24, 9]].forEach(([x, z, h]) => { const c = cluster(h); c.position.set(x, 0, z); K.add(c); });
    K.arc(4, () => cluster(rand(3.5, 6)), { from: -175, to: -150, r: 19 });
    // רסיסים מרחפים ומסתובבים
    for (let i = 0; i < (K.low ? 6 : 12); i++) floater(K, K.mesh(GEO.oct(rand(0.3, 0.6)), ice), rand(-9, 9), rand(5, 10), rand(-20, -8), { amp: 0.6, sp: rand(0.5, 1.1), spin: rand(-0.8, 0.8) });
    // קשת קפואה מעל
    K.add(K.mesh(GEO.tor(7, 0.35, 48, Math.PI), ice, { pos: [0, 0, -17] }));
    K.corners(() => cluster(3.2));
  },

  102(K) { // מצוקי הבזלת המותכת
    const g = K.ground(T.cracks('x102g', 0x2a2a2e, 0xff6a20, 26, 3), { repeat: 6, rough: 0.9, emissive: 0xff5a10, ei: 0.9 });
    const a = K.arena(T.hexes('x102a', 0x1e1e22, 0xff6a20, 20), { rough: 0.8, emissive: 0xff5a10, ei: 0.7, rim: 0xff6a20 });
    K.pulse(g.mat, 0.7, 0.35, 1.3); K.pulse(a.mat, 0.6, 0.3, 1.1, 1);
    const bas = M.std(0x2a2a2e, 0.85, 0.05, { flatShading: true }), top = M.glow(0xff5a10, 1.4);
    const columns = (n, h) => {
      const parts = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const r = i ? 0.9 : 0; const hh = h * (i ? rand(0.45, 0.85) : 1); parts.push([GEO.cyl(0.5, 0.5, hh, 6), [Math.cos(a) * r, hh / 2, Math.sin(a) * r]]); }
      return K.group(K.mesh(merge(parts), bas, { cast: true }), K.mesh(GEO.cyl(0.38, 0.38, 0.05, 6), top, { pos: [0, h + 0.03, 0] }));
    };
    [[-7, -13, 7], [7, -14, 8], [-11, -8, 5], [11, -9, 6], [-4, -22, 10], [5, -23, 9]].forEach(([x, z, h]) => { const c = columns(7, h); c.position.set(x, 0, z); K.add(c); });
    K.arc(5, () => columns(6, rand(3, 6)), { from: -178, to: -140, r: 20 });
    K.band(T.flow('x102lava', 0xff4a10, 0xffd060), 15.5, 17.5, -150, 120, { emissive: 0xff5a10, ei: 1.4, speed: 0.12 });
    // גייזרים של לבה
    const lavaM = M.glow(0xff7a20, 2.2);
    [[-9.5, -17], [9.5, -17.5], [0, -14.5]].forEach(([x, z], i) => {
      const c = K.mesh(GEO.cone(0.5, 3, 8), lavaM, { pos: [x, 1.5, z] });
      K.add(c);
      K.every((dt, t) => { const k = Math.max(0, Math.sin(t * 0.9 + i * 2.1)); c.scale.set(1, 0.15 + k * 1.1, 1); c.position.y = c.scale.y * 1.5; });
    });
    K.corners(() => columns(5, 2.6));
  },

  103(K) { // מועדון הוויניל
    K.ground(T.rings('x103g', 0x1a1220, 0x3a2a48, 30), { repeat: 5, rough: 0.35, metal: 0.4 });
    const a = K.arena(T.rings('x103a', 0x0e0c10, 0x3a3440, 40, 0xc8282a), { repeat: 1, rough: 0.2, metal: 0.5, rim: 0xff7ab8 });
    K.spin(a.mesh, 0.12, 'z');
    const wood = M.std(0x3a2418, 0.5), cone = M.std(0x1a1a1e, 0.6), ring = M.std(0xd8d8e0, 0.25, 1);
    const speakers = [];
    const speaker = () => {
      const g = K.group(K.mesh(GEO.box(3, 5, 2.2), wood, { pos: [0, 2.5, 0], cast: true }));
      [[0, 3.4, 1.0], [0, 1.3, 1.11]].forEach(([x, y, z], i) => {
        const w = K.group(K.mesh(GEO.cyl(i ? 1.0 : 0.6, i ? 0.6 : 0.4, 0.25, 24), cone, { rot: [Math.PI / 2, 0, 0] }), K.mesh(GEO.tor(i ? 1.0 : 0.6, 0.07, 32), ring));
        w.position.set(x, y, z); g.add(w); speakers.push(w);
      });
      return g;
    };
    const sl = speaker(), sr = speaker();
    sl.position.set(-7.5, 0, -12); sl.rotation.y = 0.35; sr.position.set(7.5, 0, -12); sr.rotation.y = -0.35;
    K.add(sl); K.add(sr);
    K.every((dt, t) => { const b = 1 + Math.max(0, Math.sin(t * 7.5)) * 0.07; speakers.forEach((w) => w.scale.setScalar(b)); });
    // כדור דיסקו וקרני אור
    const disco = K.mesh(GEO.sph(1.6, 14, 10), M.std(0xe8e8f0, 0.05, 1, { flatShading: true }), { pos: [0, 11, -16] });
    K.add(disco); K.spin(disco, 0.6);
    K.add(K.mesh(GEO.cyl(0.03, 0.03, 4, 6), M.std(0x888888, 0.4, 1), { pos: [0, 13.4, -16] }));
    const beamM = [M.add(0xff7ab8, 0.18), M.add(0x9ad8ff, 0.18), M.add(0xfff08a, 0.15)];
    beamM.forEach((m, i) => {
      const beam = K.mesh(GEO.cone(2.2, 12, 16, true), m, { pos: [0, -6, 0] });
      const piv = K.group(beam); piv.position.set(0, 11, -16); K.add(piv);
      K.every((dt, t) => { piv.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.6; piv.rotation.x = Math.cos(t * 0.5 + i) * 0.4; });
    });
    // זרוע הפטיפון
    const arm = K.group(K.mesh(GEO.cyl(0.6, 0.7, 0.8, 16), ring, { pos: [0, 0.4, 0] }), K.mesh(GEO.box(0.25, 0.25, 9), ring, { pos: [0, 1.0, -4.3] }), K.mesh(GEO.box(0.6, 0.35, 0.9), cone, { pos: [0, 0.85, -8.8] }));
    arm.position.set(13.5, 0, -2); arm.rotation.y = 0.5; K.add(arm);
    K.onMove(() => speakers.forEach((w) => { w.scale.setScalar(1.25); }));
    K.corners(() => { const sp = speaker(); sp.scale.setScalar(0.5); return K.group(sp); });
  },

  104(K) { // היער הלוחש
    K.ground(T.speckle('x104g', 0x3a6a2e, 0x8ac85a, 1400, 3), { repeat: 7 });
    K.arena(T.cracks('x104a', 0x6a7a5a, 0x3a4a2a, 30, 3), { rough: 0.9, rim: 0x8a6a3a });
    const eyes = [];
    const elder = (h) => {
      const bark = M.std(0x4a3420, 0.95), leaf = M.std(0x2e6a2e, 0.85, 0, { flatShading: true }), eye = M.glow(0xffc040, 1.8);
      const g = K.group(K.mesh(GEO.cyl(h * 0.12, h * 0.2, h * 0.6, 9), bark, { pos: [0, h * 0.3, 0], cast: true }));
      [[0, 0.78, 0, 0.36], [0.3, 0.68, 0.1, 0.26], [-0.32, 0.7, -0.05, 0.27], [0.05, 0.95, -0.1, 0.24]].forEach(([x, y, z, r]) => g.add(K.mesh(GEO.ico(h * r, 1), leaf, { pos: [x * h, y * h, z * h], cast: true })));
      const e1 = K.mesh(GEO.sph(h * 0.025, 8, 6), eye, { pos: [-h * 0.05, h * 0.42, h * 0.15] }), e2 = K.mesh(GEO.sph(h * 0.025, 8, 6), eye, { pos: [h * 0.05, h * 0.42, h * 0.15] });
      g.add(e1, e2); eyes.push(e1, e2);
      g.add(K.mesh(GEO.tor(h * 0.04, h * 0.008, 12, Math.PI), M.std(0x1a1008, 0.9), { pos: [0, h * 0.34, h * 0.16], rot: [0, 0, Math.PI] }));
      return g;
    };
    [[-7, -13, 8], [7.5, -14, 9], [0, -22, 10], [-12, -8, 7], [12, -8, 7.5]].forEach(([x, z, h]) => { const t = elder(h); t.position.set(x, 0, z); t.rotation.y = Math.atan2(-x, -z); K.add(t); K.sway(t, 0.025, 0.5); });
    K.arc(6, () => P.tree(K, rand(4, 7), 0x2e6a2e), { from: -178, to: -130, r: 21, jitter: 1 });
    // מצמוץ
    K.every((dt, t) => { const blink = (t % 4.2) < 0.15; eyes.forEach((e) => { e.scale.y = blink ? 0.1 : 1; }); });
    // פנסים תלויים
    for (let i = 0; i < 6; i++) floater(K, P.lantern(K, 0xd8ff8a, 0.22), rand(-8, 8), rand(3, 6), rand(-18, -9), { amp: 0.4, sp: rand(0.6, 1.2), spin: 0 });
    K.onMove(() => eyes.forEach((e) => { e.scale.y = 0.1; setTimeout(() => { e.scale.y = 1; }, 180); }));
    K.corners(() => K.group(K.mesh(GEO.cyl(0.08, 0.1, 2.2, 6), M.std(0x3a2a1a, 0.8), { pos: [0, 1.1, 0] }), P.lantern(K, 0xd8ff8a, 0.3).translateY(2.4)));
  },

  105(K) { // שער אטלנטיס
    K.ground(T.ripples('x105g', 0x9ad8c8, 0xd8f4ea), { repeat: 7 });
    K.arena(T.checker('x105a', 0x2ab8b0, 0xe8f4ee, 6), { repeat: 2, phys: true, clearcoat: 0.6, rough: 0.3, rim: 0xe8c860 });
    const marble = M.std(0xf2ece0, 0.4), turq = M.glow(0x3ad8c8, 1.2);
    const column = (h, broken) => K.group(K.mesh(GEO.cyl(0.55, 0.65, h, 12), marble, { pos: [0, h / 2, 0], cast: true }), K.mesh(GEO.box(1.6, 0.35, 1.6), marble, { pos: [0, h + 0.17, 0] }),
      broken ? K.mesh(GEO.cyl(0.55, 0.55, 1.6, 12), marble, { pos: [1.2, 0.5, 0.4], rot: [0, 0, Math.PI / 2 - 0.2] }) : null);
    [[-6.5, -12, 6, 0], [6.5, -12, 6.5, 0], [-10, -8, 4, 1], [10, -9, 5, 1], [-4, -20, 8, 0], [4, -20, 8, 0]].forEach(([x, z, h, b]) => { const c = column(h, b); c.position.set(x, 0, z); K.add(c); });
    // שער טבעת מאחור
    const gate = K.group(K.mesh(GEO.tor(6, 0.6, 48), marble, { cast: true }), K.mesh(GEO.tor(5.3, 0.15, 48), turq), K.mesh(new THREE.CircleGeometry(5.2, 48), M.add(0x2ab8c8, 0.18)));
    gate.position.set(0, 6.6, -21); K.add(gate);
    K.every((dt, t) => { gate.children[2].material.opacity = 0.14 + Math.sin(t * 1.2) * 0.06; });
    // אצות מתנועעות
    const kelpM = M.std(0x2a8a4a, 0.8, 0, { side: THREE.DoubleSide });
    for (let i = 0; i < (K.low ? 8 : 16); i++) {
      const a = (-170 + i * (160 / 15)) * DEG; const r = rand(13, 20);
      const k = K.mesh(GEO.box(0.35, rand(3, 6), 0.05), kelpM, { pos: [Math.cos(a) * r, 2, Math.sin(a) * r] });
      k.geometry.translate(0, k.geometry.parameters.height / 2 - 2, 0);
      K.add(k); K.sway(k, 0.18, rand(0.8, 1.4), 'z');
    }
    // צדפות עם פנינים זוהרות
    const pearl = M.glow(0xf4eee8, 1.6);
    [[-9, -15], [9, -15], [0, -13.5]].forEach(([x, z]) => {
      const sh = K.group(K.mesh(GEO.hemi(1.1), M.std(0xe8a8b8, 0.5), { rot: [Math.PI, 0, 0], scale: [1, 0.4, 1] }), K.mesh(GEO.sph(0.35, 12, 8), pearl, { pos: [0, 0.2, 0] }));
      sh.position.set(x, 0.45, z); K.add(sh);
    });
    K.pulse(pearl, 1.3, 0.6, 2);
    // להקת דגים
    const fishM = M.std(0xffb030, 0.4, 0.3);
    const school = K.group();
    for (let i = 0; i < 9; i++) school.add(K.mesh(GEO.cone(0.18, 0.6, 6), fishM, { pos: [rand(-1.2, 1.2), rand(-0.5, 0.5), rand(-1, 1)], rot: [Math.PI / 2, 0, 0] }));
    K.orbit(school, 15, 4.5, 0.25, 0, 0.6);
    K.corners(() => { const c = column(2.6, 0); return c; });
  },

  106(K) { // מגדל השעונים
    K.ground(T.rivets('x106g', 0x8a6a3a, 0x5a4020), { repeat: 10, rough: 0.5, metal: 0.6 });
    const face = K.arena(T.rings('x106a', 0xf2e6c8, 0x8a6a3a, 6), { repeat: 1, rough: 0.6, rim: 0xd0a040 });
    // סימוני שעות על הזירה
    const tick = M.std(0x3a2a1a, 0.6);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; K.add(K.mesh(GEO.box(0.35, 0.03, i % 3 ? 1.2 : 2.0), tick, { pos: [Math.cos(a) * 10.6, 0.05, Math.sin(a) * 10.6], rot: [0, -a + Math.PI / 2, 0] })); }
    const handM = M.std(0x2a1a0e, 0.4, 0.5);
    const minute = K.group(K.mesh(GEO.box(0.3, 0.04, 11.5), handM, { pos: [0, 0.07, -5.75] })), hour = K.group(K.mesh(GEO.box(0.45, 0.04, 8.8), handM, { pos: [0, 0.08, -4.4] }));
    K.add(minute); K.add(hour);
    K.every((dt) => { minute.rotation.y -= dt * 0.1; hour.rotation.y -= dt * 0.0083; });
    const brass = M.std(0xd0a040, 0.3, 1), copper = M.std(0xc87a40, 0.35, 1);
    const gears = [[-7, 6, -15, 3.2, 18, 0.35], [-2.2, 9, -18, 2.2, 13, -0.5], [6.5, 6.5, -15.5, 3.6, 20, -0.3], [11, 4, -10, 2, 12, 0.55]];
    const gearObjs = gears.map(([x, y, z, r, n, sp], i) => { const g = P.gear(K, r, n, 0.5, i % 2 ? copper : brass); g.position.set(x, y, z); K.add(g); K.spin(g, sp, 'z'); return g; });
    // מטוטלת
    const pend = K.group(K.mesh(GEO.cyl(0.08, 0.08, 6, 6), brass, { pos: [0, -3, 0] }), K.mesh(GEO.cyl(1.0, 1.0, 0.25, 24), brass, { pos: [0, -6.2, 0], rot: [Math.PI / 2, 0, 0] }));
    pend.position.set(0, 12, -21); K.add(pend);
    K.every((dt, t) => { pend.rotation.z = Math.sin(t * 1.6) * 0.35; });
    K.onMove(() => { gearObjs.forEach((g, i) => { g.rotation.z += (i % 2 ? -1 : 1) * 0.26; }); minute.rotation.y -= 0.52; });
    K.corners(() => { const g = P.gear(K, 1.1, 12, 0.3, brass); g.position.y = 1.4; K.spin(g, 0.7, 'z'); return K.group(g, K.mesh(GEO.cyl(0.12, 0.12, 1.4, 6), copper, { pos: [0, 0.7, 0] })); });
  },

  107(K) { // ממלכת הממתקים
    K.ground(T.checker('x107g', 0xffc8e0, 0xfff4f8, 4), { repeat: 9, rough: 0.5 });
    K.arena(T.rings('x107a', 0xff9ac8, 0xffe0ef, 10), { repeat: 1, phys: true, clearcoat: 1, rough: 0.35, rim: 0xffffff });
    const swirl = T.stripes('x107sw', 0xff4a8a, 0xffffff, 8, true);
    const lolly = (c) => {
      const disc = K.mesh(GEO.cyl(1.4, 1.4, 0.35, 32), M.std(c, 0.25, 0, { map: swirl }), { rot: [Math.PI / 2, 0, 0], pos: [0, 5.2, 0] });
      const g = K.group(K.mesh(GEO.cyl(0.12, 0.12, 5, 8), M.std(0xffffff, 0.4), { pos: [0, 2.5, 0] }), disc);
      K.spin(disc, 0.6, 'y');
      return g;
    };
    [[-7, -13, 0xff6ab8], [7, -13.5, 0x8ae8ff], [-11, -8, 0xfff04a], [11, -8.5, 0xb8ff8a]].forEach(([x, z, c]) => { const l = lolly(c); l.position.set(x, 0, z); K.add(l); });
    const caneR = M.std(0xffffff, 0.3, 0, { map: T.stripes('x107cane', 0xd81a2a, 0xffffff, 10) });
    const cane = () => K.group(K.mesh(GEO.cyl(0.3, 0.3, 6, 12), caneR, { pos: [0, 3, 0] }), K.mesh(GEO.tor(0.9, 0.3, 16, Math.PI), caneR, { pos: [0.9, 6, 0] }));
    K.arc(5, () => cane(), { from: -172, to: -128, r: 19 });
    const gum = [0xff4a6a, 0x4ad8ff, 0x6aff8a, 0xffd23a, 0xc84aff];
    for (let i = 0; i < 10; i++) { const a = (-160 + i * 15) * DEG; const r = rand(18, 23); K.add(K.mesh(GEO.hemi(rand(1.2, 2.2)), M.phys({ color: gum[i % 5], roughness: 0.2, clearcoat: 1 }), { pos: [Math.cos(a) * r, 0, Math.sin(a) * r] })); }
    // סופגניות מרחפות
    const sprinkle = T.speckle('x107spr', 0xff9ac8, 0xffffff, 500, 4);
    for (let i = 0; i < 5; i++) floater(K, K.mesh(GEO.tor(0.9, 0.42, 24), M.std(0xffffff, 0.5, 0, { map: sprinkle }), { rot: [Math.PI / 2.4, 0, 0] }), rand(-8, 8), rand(6, 10), rand(-20, -12), { amp: 0.5, sp: rand(0.5, 1), spin: rand(0.3, 0.8) });
    K.band(T.flow('x107choc', 0x5a2a12, 0x8a4a22), 21, 23, -160, 140, { speed: 0.08, rough: 0.25 });
    K.corners((sx) => { const l = lolly(sx > 0 ? 0x8ae8ff : 0xff6ab8); l.scale.setScalar(0.5); return K.group(l); });
  },

  108(K) { // ממד המראות
    K.ground(T.grid('x108g', 0xb8c0cc, 0xf0f4f8, 2, 3), { repeat: 10, rough: 0.08, metal: 1 });
    K.arena(T.rings('x108a', 0xdfe6ee, 0xb8a8ff, 12), { repeat: 1, rough: 0.05, metal: 1, rim: 0xb8a8ff });
    const mirror = M.std(0xffffff, 0.02, 1), frame = M.std(0xe8b84a, 0.25, 1);
    const panels = [];
    const panel = (h) => K.group(K.mesh(GEO.box(2.6, h, 0.12), frame, { cast: true }), K.mesh(GEO.box(2.3, h - 0.3, 0.14), mirror));
    [[-6.5, 4.5, -12, 5], [6.5, 5, -12.5, 5.5], [0, 7.5, -19, 7], [-11, 4, -7, 4.5], [11, 4.2, -7.5, 4.5], [-4, 9, -22, 4], [4, 9.5, -22, 4]].forEach(([x, y, z, h], i) => { const p = floater(K, panel(h), x, y, z, { amp: 0.4, sp: 0.5 + i * 0.05, spin: 0.15 * (i % 2 ? 1 : -1) }); panels.push(p); });
    const prism = M.phys({ color: 0xf4f0ff, roughness: 0.05, iridescence: 1, iridescenceIOR: 1.4, clearcoat: 1, flatShading: true });
    for (let i = 0; i < (K.low ? 5 : 10); i++) { const o = K.mesh(GEO.oct(rand(0.4, 0.8)), prism); K.orbit(o, rand(13, 17), rand(3, 7), 0.12 * (i % 2 ? 1 : -1), (i / 10) * TAU, 0.5); }
    const halo = K.mesh(GEO.tor(9, 0.12, 64), M.glow(0xc8b8ff, 1.4), { pos: [0, 13, -18], rot: [1.2, 0, 0] });
    K.add(halo); K.spin(halo, 0.2, 'z');
    K.onMove(() => panels.forEach((p) => { p.rotation.y += Math.PI / 2; }));
    K.corners(() => { const p = panel(2.6); p.position.y = 1.9; K.bob(p, 0.2, 0.9); K.spin(p, 0.3); return K.group(p); });
  },

  109(K) { // דיונות אור הכוכבים
    K.ground(T.ripples('x109g', 0x9a78c8, 0xc8a8f0), { repeat: 7, rough: 0.85 });
    K.arena(T.sun('x109a', 0x6c4a8f, 0xf2c94c), { repeat: 1, rough: 0.6, rim: 0xd8b8ff });
    const sand = M.std(0x8a68b8, 0.95);
    for (let i = 0; i < 9; i++) { const a = (-170 + i * 20) * DEG; const r = rand(17, 23); K.add(K.mesh(GEO.hemi(rand(3, 5.5)), sand, { pos: [Math.cos(a) * r, -0.3, Math.sin(a) * r], scale: [1.6, 0.4, 1] })); }
    const crystal = M.phys({ color: 0xe8dcff, roughness: 0.05, clearcoat: 1, flatShading: true }), tip = M.glow(0x8ffcff, 2);
    const obelisk = (h) => K.group(K.mesh(GEO.cyl(h * 0.06, h * 0.1, h, 4), crystal, { pos: [0, h / 2, 0], cast: true }), K.mesh(GEO.oct(h * 0.1), tip, { pos: [0, h + h * 0.08, 0], scale: [1, 1.6, 1] }));
    [[-7, -13, 6], [7, -13.5, 6.5], [-11, -8.5, 4], [11, -9, 4.5]].forEach(([x, z, h]) => { const o = obelisk(h); o.position.set(x, 0, z); K.add(o); });
    K.pulse(tip, 1.6, 0.8, 1.8);
    // ירח ענק באופק
    K.add(K.mesh(GEO.sph(9, 32, 20), M.glow(0xf0e6ff, 0.9, { fog: false }), { pos: [-14, 18, -60] }));
    for (let i = 0; i < 8; i++) floater(K, K.mesh(GEO.oct(0.25), M.glow(0xfff0a0, 2)), rand(-9, 9), rand(6, 11), rand(-20, -10), { amp: 0.4, sp: rand(0.6, 1.2), spin: 1 });
    K.corners(() => obelisk(3));
  },

  // ===================== 12 — ממלכות החלום =====================
  110(K) { // מעבדת הסייבר
    const g = K.ground(T.circuit('x110g', 0x0e141c, 0x33ff8a), { repeat: 7, rough: 0.4, metal: 0.6, emissive: 0x33ff8a, ei: 0.8 });
    K.arena(T.grid('x110a', 0x0a0f18, 0x33f0ff, 6, 3), { repeat: 2, rough: 0.2, metal: 0.7, emissive: 0x33f0ff, ei: 0.7, rim: 0x33ff8a });
    K.pulse(g.mat, 0.6, 0.3, 2.2);
    const glass = M.phys({ color: 0xc8f0ff, roughness: 0.05, transparent: true, opacity: 0.28, clearcoat: 1 }), cap = M.std(0x6a7488, 0.3, 1);
    const tube = (h, color) => {
      const liquid = M.glow(color, 1.6, { transparent: true, opacity: 0.85 });
      const t = K.group(K.mesh(GEO.cyl(0.8, 0.8, h, 20), glass, { pos: [0, h / 2 + 0.4, 0] }), K.mesh(GEO.cyl(0.62, 0.62, h * 0.82, 16), liquid, { pos: [0, h * 0.43 + 0.4, 0] }),
        K.mesh(GEO.cyl(1, 1, 0.4, 20), cap, { pos: [0, 0.2, 0] }), K.mesh(GEO.cyl(1, 1, 0.4, 20), cap, { pos: [0, h + 0.6, 0] }));
      // בועות עולות
      const bm = M.glow(0xffffff, 1.2);
      for (let i = 0; i < 4; i++) { const b = K.mesh(GEO.sph(0.12, 8, 6), bm); t.add(b); const ph = rand(0, 10); K.every((dt, tt) => { const k = ((tt * 0.35 + ph) % 1); b.position.set(Math.sin(ph) * 0.3, 0.6 + k * h * 0.8, Math.cos(ph) * 0.3); }); }
      return t;
    };
    [[-6.5, -12, 6, 0x33ff8a], [6.5, -12.5, 7, 0x33f0ff], [-10.5, -8, 4.5, 0xff3ad8], [10.5, -8.5, 5, 0x33ff8a]].forEach(([x, z, h, c]) => { const t = tube(h, c); t.position.set(x, 0, z); K.add(t); });
    // מסכי הולוגרמה
    const screens = [];
    const code = T.code('x110code', 0x33ff8a);
    [[-3.2, 6.5, -16], [3.2, 7.5, -17], [0, 10, -21]].forEach(([x, y, z], i) => {
      const t = code.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
      const m = M.add(i === 1 ? 0x33f0ff : 0x33ff8a, 0.7, t);
      const s = K.mesh(GEO.plane(4.4, 2.6), m, { pos: [x, y, z] });
      K.add(s); K.flow(t, 0, 0.25); K.bob(s, 0.25, 0.8);
      screens.push(m);
    });
    // מסדי שרתים מהבהבים
    const led = M.glow(0x33ff8a, 2);
    K.arc(4, () => K.group(K.mesh(GEO.box(2, 5, 1.4), M.std(0x161c26, 0.4, 0.8), { pos: [0, 2.5, 0], cast: true }), K.mesh(GEO.box(1.7, 0.1, 0.05), led, { pos: [0, 3.6, 0.72] }), K.mesh(GEO.box(1.7, 0.1, 0.05), led, { pos: [0, 2.4, 0.72] })), { from: -176, to: -140, r: 18 });
    K.pulse(led, 1.4, 1.2, 9);
    // סיבוב צבעי הלוח של האי בכל מהלך (ירוק ↔ ציאן)
    let flip = false;
    K.onMove(() => {
      screens.forEach((m) => { m.opacity = 1; setTimeout(() => { m.opacity = 0.7; }, 160); });
      const board = K.ctx.board;
      if (!board || board.matKey !== 'i110') return;
      flip = !flip;
      const mats = board.mats;
      mats.light.emissive.setHex(flip ? 0x33f0ff : 0x33ff8a);
      mats.dark.emissive.setHex(flip ? 0x33ff8a : 0x33f0ff);
      mats.frame.emissive.setHex(flip ? 0x33f0ff : 0x33ff8a);
    });
    K.corners((sx) => { const t = tube(2.4, sx > 0 ? 0x33f0ff : 0x33ff8a); t.scale.setScalar(0.8); return K.group(t); });
  },

  111(K) { // הספרייה המרחפת
    K.ground(T.planks('x111g', 0x4a2a18, 0x2a160a), { repeat: 9, rough: 0.6 });
    K.arena(T.rings('x111a', 0x8a1a1a, 0xe8b84a, 5), { repeat: 1, rough: 0.9, rim: 0xe8b84a });
    const wood = M.std(0x5a2a16, 0.5), cols = [0x8a1a1a, 0x1a3a8a, 0x2a6a3a, 0x6a2a8a, 0xb07a3a, 0x3a2a1a];
    const shelf = () => {
      const g = K.group(K.mesh(GEO.box(4, 7, 1.2), wood, { pos: [0, 3.5, 0], cast: true }));
      for (let row = 0; row < 4; row++) for (let i = 0; i < 9; i++) g.add(K.mesh(GEO.box(0.36, 1.1 + rand(-0.15, 0.2), 0.9), M.std(cols[(row * 3 + i) % cols.length], 0.7), { pos: [-1.6 + i * 0.4, 1.05 + row * 1.65, 0.2] }));
      return g;
    };
    [[-7, -12.5, 0.4], [7, -13, -0.4], [-3, -20, 0.1], [3, -20, -0.1], [-11, -7, 0.9], [11, -7.5, -0.9]].forEach(([x, z, ry]) => { const s = shelf(); s.position.set(x, 0, z); s.rotation.y = ry; K.add(s); });
    // ספרים מעופפים שמנפנפים
    const page = M.std(0xf2e8cc, 0.8, 0, { side: THREE.DoubleSide });
    for (let i = 0; i < (K.low ? 4 : 8); i++) {
      const cover = M.std(cols[i % cols.length], 0.6, 0, { side: THREE.DoubleSide });
      const l = K.group(K.mesh(GEO.box(1.0, 0.05, 1.4), cover, { pos: [-0.5, 0, 0] }), K.mesh(GEO.box(0.9, 0.06, 1.3), page, { pos: [-0.45, 0.04, 0] }));
      const r = K.group(K.mesh(GEO.box(1.0, 0.05, 1.4), cover, { pos: [0.5, 0, 0] }), K.mesh(GEO.box(0.9, 0.06, 1.3), page, { pos: [0.45, 0.04, 0] }));
      const book = K.group(l, r);
      K.orbit(book, rand(11, 16), rand(4, 8), 0.18 * (i % 2 ? 1 : -1), (i / 8) * TAU, 0.8);
      const ph = rand(0, 6);
      K.every((dt, t) => { const f = Math.sin(t * 5 + ph) * 0.5; l.rotation.z = 0.4 + f; r.rotation.z = -0.4 - f; });
    }
    // נרות מרחפים
    for (let i = 0; i < 8; i++) {
      const c = K.group(K.mesh(GEO.cyl(0.14, 0.16, 0.8, 8), M.std(0xf2e6c8, 0.6), { pos: [0, 0.4, 0] }), K.mesh(GEO.cone(0.1, 0.3, 8), M.glow(0xffc060, 2.5), { pos: [0, 0.98, 0] }));
      floater(K, c, rand(-8, 8), rand(5, 9), rand(-18, -9), { amp: 0.3, sp: rand(0.6, 1.1), spin: 0 });
    }
    K.corners(() => { const g = K.group(); for (let i = 0; i < 5; i++) g.add(K.mesh(GEO.box(1.3 - i * 0.12, 0.28, 0.9), M.std(cols[i % cols.length], 0.7), { pos: [0, 0.14 + i * 0.28, 0], rot: [0, rand(-0.3, 0.3), 0] })); g.add(K.mesh(GEO.cyl(0.1, 0.12, 0.5, 8), M.std(0xf2e6c8, 0.6), { pos: [0, 1.65, 0] }), K.mesh(GEO.cone(0.08, 0.22, 8), M.glow(0xffc060, 2.5), { pos: [0, 2.0, 0] })); return g; });
  },

  112(K) { // ענן הסערה
    K.ground(T.clouds('x112g', 0x8a94a8, 0xe8ecf4), { repeat: 5, rough: 1 });
    K.arena(T.cracks('x112a', 0x5a6474, 0x9ad0ff, 10, 4), { rough: 0.7, emissive: 0x6ab8ff, ei: 0.5, rim: 0x9ad0ff });
    const cloudM = M.std(0x5a6478, 0.95, 0, { flatShading: true });
    const cloud = (s) => { const g = K.group(); for (let i = 0; i < 6; i++) g.add(K.mesh(GEO.ico(s * rand(0.6, 1), 1), cloudM, { pos: [rand(-1.6, 1.6) * s, rand(-0.3, 0.4) * s, rand(-0.8, 0.8) * s], scale: [1.2, 0.75, 1] })); return g; };
    const clouds = [];
    [[-7, 9, -15, 2], [6, 10, -16, 2.3], [0, 12, -22, 2.8], [-12, 8, -8, 1.8], [12, 8.5, -9, 1.9]].forEach(([x, y, z, s]) => { const c = floater(K, cloud(s), x, y, z, { amp: 0.4, sp: 0.4, spin: 0.05 }); clouds.push(c); });
    // מוטות ברק
    const rodM = M.std(0x9aa2ac, 0.3, 1), tipM = M.glow(0xb8e0ff, 2);
    [[-9, -12], [9, -12.5]].forEach(([x, z]) => { K.add(K.mesh(GEO.cyl(0.12, 0.2, 7, 8), rodM, { pos: [x, 3.5, z] })); K.add(K.mesh(GEO.sph(0.3, 10, 8), tipM, { pos: [x, 7.2, z] })); });
    K.pulse(tipM, 1.6, 1, 6);
    // ברקים שמופיעים לרגע
    const boltM = M.basic(0xfff6c0, { toneMapped: false });
    const bolt = (x, z) => {
      const parts = []; let px = 0;
      for (let i = 0; i < 6; i++) { const nx = px + rand(-0.6, 0.6); parts.push([GEO.box(0.12, 1.25, 0.12), [(px + nx) / 2, -i * 1.15, 0], [0, 0, Math.atan2(nx - px, 1.15)]]); px = nx; }
      const b = K.mesh(merge(parts), boltM, { pos: [x, 8.5, z] }); b.visible = false; K.add(b); return b;
    };
    const bolts = [bolt(-7, -15), bolt(6, -16), bolt(0, -22), bolt(-9, -12), bolt(9, -12.5)];
    let next = 2;
    K.every((dt) => { next -= dt; if (next <= 0) { next = rand(1.5, 4.5); K.flash(bolts[Math.floor(rand(0, bolts.length))], 120); } });
    // הכאה של כלי → ברק + מסגרת הלוח מהבהבת
    K.onMove((mv) => {
      if (!mv?.captured) return;
      K.flash(bolts[Math.floor(rand(0, bolts.length))], 160);
      K.ctx.weather?.strike?.(1.8);
      const board = K.ctx.board;
      if (board && board.matKey === 'i112') { const f = board.mats.frame; f.emissiveIntensity = 2.4; setTimeout(() => { f.emissiveIntensity = 0.3; }, 220); }
    });
    K.corners(() => K.group(K.mesh(GEO.cyl(0.08, 0.14, 2.6, 8), rodM, { pos: [0, 1.3, 0] }), K.mesh(GEO.sph(0.22, 10, 8), tipM, { pos: [0, 2.7, 0] })));
  },

  113(K) { // דיו ומשי
    K.ground(T.paper('x113g', 0xf2efe6, 0x1a1a1a), { repeat: 5, rough: 0.95 });
    K.arena(T.rings('x113a', 0xf6f2e8, 0xc8282a, 4), { repeat: 1, rough: 0.9, rim: 0x2b2b2b });
    // הרי דיו
    const inkM = [M.std(0x2b2b2b, 0.95, 0, { flatShading: true }), M.std(0x5a5a5a, 0.95, 0, { flatShading: true }), M.std(0x8a8a8a, 0.95, 0, { flatShading: true })];
    [[-14, -40, 18, 0], [6, -46, 22, 1], [22, -38, 15, 2], [-28, -34, 14, 1], [-2, -30, 11, 2]].forEach(([x, z, h, k]) => K.add(K.mesh(GEO.cone(h * 0.6, h, 7), inkM[k], { pos: [x, h / 2 - 0.5, z] })));
    // דגלי משי מתנופפים
    const silk = [M.std(0xc8282a, 0.7, 0, { side: THREE.DoubleSide }), M.std(0xf6f2e8, 0.7, 0, { side: THREE.DoubleSide })];
    const pole = M.std(0x2b2b2b, 0.6);
    [[-6.5, -12], [6.5, -12.5], [-10.5, -8], [10.5, -8.5]].forEach(([x, z], i) => {
      const flag = K.mesh(GEO.plane(1.6, 4.5), silk[i % 2], { pos: [0.85, 4.2, 0] });
      const g = K.group(K.mesh(GEO.cyl(0.08, 0.1, 7, 8), pole, { pos: [0, 3.5, 0] }), flag);
      g.position.set(x, 0, z); K.add(g); K.sway(flag, 0.25, 1.4, 'y');
    });
    // פנסים אדומים
    for (let i = 0; i < 7; i++) floater(K, P.lantern(K, 0xff4a2a, 0.35), rand(-8, 8), rand(4, 8), rand(-18, -9), { amp: 0.3, sp: rand(0.5, 1), spin: 0 });
    // אדווה של דיו על הזירה בכל מהלך
    const ripM = M.basic(0x1a1a1a, { transparent: true, opacity: 0, depthWrite: false });
    const rip = K.mesh(new THREE.RingGeometry(0.9, 1.0, 64), ripM, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.06, 0] });
    K.add(rip);
    let rt = 1;
    K.every((dt) => { rt = Math.min(1, rt + dt * 0.8); rip.scale.setScalar(6 + rt * 6); ripM.opacity = (1 - rt) * 0.5; });
    K.onMove(() => { rt = 0; });
    K.corners(() => K.group(K.mesh(GEO.cyl(0.07, 0.09, 2.6, 8), pole, { pos: [0, 1.3, 0] }), K.mesh(GEO.box(1.2, 0.08, 0.08), pole, { pos: [0.4, 2.55, 0] }), P.lantern(K, 0xff4a2a, 0.32).translateX(0.85).translateY(2.1)));
  },

  114(K) { // שוניות הפיראטים
    K.ground(T.speckle('x114g', 0xe8d0a8, 0xb8986a, 1200, 2), { repeat: 7 });
    K.arena(T.planks('x114a', 0x7a5232, 0x3a2414), { repeat: 3, rough: 0.8, rim: 0xb07a3a });
    K.band(T.flow('x114w', 0x1a8ad8, 0xdff8ff), 22.5, 26.4, -180, 360, { speed: 0.05, rough: 0.15, opacity: 0.88 });
    [[-7, -13, 5.5], [7.5, -13.5, 6], [-11.5, -8, 5], [11.5, -8.5, 5.5], [0, -21, 6.5]].forEach(([x, z, h]) => { const p = P.palm(K, h); p.position.set(x, 0, z); K.add(p); K.sway(p, 0.04, 0.8); });
    // תורן של ספינה טרופה עם מפרש קרוע
    const mast = K.group(K.mesh(GEO.cyl(0.25, 0.32, 10, 8), M.std(0x5a3a22, 0.9), { pos: [0, 5, 0] }), K.mesh(GEO.plane(4, 3.5), M.std(0xeee6d0, 0.9, 0, { side: THREE.DoubleSide }), { pos: [0, 7, 0.3] }), K.mesh(GEO.box(5, 0.25, 0.25), M.std(0x5a3a22, 0.9), { pos: [0, 8.8, 0] }));
    mast.position.set(4, 0, -19); mast.rotation.z = 0.18; K.add(mast); K.sway(mast.children[1], 0.15, 1.1, 'y');
    // תיבת אוצר זוהרת
    const gold = M.glow(0xffd04a, 1.4);
    const chest = K.group(K.mesh(GEO.box(1.8, 1.1, 1.2), M.std(0x6a4426, 0.7), { pos: [0, 0.55, 0] }), K.mesh(GEO.box(1.6, 0.3, 1.0), gold, { pos: [0, 1.2, 0] }));
    for (let i = 0; i < 6; i++) chest.add(K.mesh(GEO.cyl(0.18, 0.18, 0.06, 12), gold, { pos: [rand(-0.7, 0.7), 1.38 + rand(0, 0.2), rand(-0.4, 0.4)], rot: [rand(-0.5, 0.5), 0, rand(-0.5, 0.5)] }));
    chest.position.set(-5, 0, -14); chest.rotation.y = 0.4; K.add(chest); K.pulse(gold, 1.2, 0.5, 2);
    // אלמוגים
    const corals = [0xff8a7a, 0xff6ab8, 0xffa040];
    K.arc(7, (i) => K.group(...[0, 1, 2].map((k) => K.mesh(GEO.cone(0.25, rand(1.2, 2.4), 6), M.std(corals[(i + k) % 3], 0.6), { pos: [rand(-0.6, 0.6), 0.8, rand(-0.6, 0.6)] }))), { from: -175, to: -125, r: 20.5, jitter: 0.8 });
    // שחפים
    const gull = M.std(0xffffff, 0.6, 0, { side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) { const b = K.group(K.mesh(GEO.box(0.9, 0.05, 0.25), gull, { pos: [-0.4, 0, 0], rot: [0, 0, 0.3] }), K.mesh(GEO.box(0.9, 0.05, 0.25), gull, { pos: [0.4, 0, 0], rot: [0, 0, -0.3] })); K.orbit(b, rand(14, 19), rand(8, 11), 0.2 * (i % 2 ? 1 : -1), i * 1.6, 0.6); }
    K.corners(() => P.palm(K, 3.2));
  },

  115(K) { // כוורת הזהב
    K.ground(T.hexes('x115g', 0xd8a83a, 0x8a5a10, 18), { repeat: 7, rough: 0.35 });
    K.arena(T.hexes('x115a', 0xf6c84a, 0xb5821c, 26), { repeat: 2, phys: true, clearcoat: 1, rough: 0.2, rim: 0xffd04a });
    const hiveM = M.std(0xe8b84a, 0.6);
    const hive = (s) => { const g = K.group(); [0.75, 0.86, 0.86, 0.78, 0.65, 0.46].forEach((r, i) => g.add(K.mesh(GEO.tor(r * s, 0.24 * s, 20), hiveM, { pos: [0, (0.3 + i * 0.36) * s, 0], rot: [Math.PI / 2, 0, 0], cast: true }))); g.add(K.mesh(GEO.cyl(0.7 * s, 0.72 * s, 2.1 * s, 14), M.std(0xd8a83a, 0.7), { pos: [0, 1.2 * s, 0] })); return g; };
    [[-7, -13, 2.6], [7.5, -13.5, 3], [0, -21, 3.6]].forEach(([x, z, s]) => { const h = hive(s); h.position.set(x, 0, z); K.add(h); });
    // טיפות דבש נופלות
    const honey = M.glow(0xffa020, 1.4);
    for (let i = 0; i < 6; i++) { const d = K.mesh(GEO.sph(0.18, 8, 6), honey, { scale: [1, 1.6, 1] }); K.add(d); const x = rand(-9, 9), z = rand(-16, -11), ph = rand(0, 1); K.every((dt, t) => { const k = (t * 0.4 + ph) % 1; d.position.set(x, 6 - k * 6, z); d.visible = k < 0.96; }); }
    // פרחי ענק
    const petal = [M.std(0xfff4e8, 0.6, 0, { side: THREE.DoubleSide }), M.std(0xff9ac8, 0.6, 0, { side: THREE.DoubleSide })];
    const flower = (k) => { const g = K.group(K.mesh(GEO.cyl(0.12, 0.16, 4, 8), M.std(0x3a8a3a, 0.8), { pos: [0, 2, 0] }), K.mesh(GEO.sph(0.5, 12, 8), M.std(0xffb020, 0.6), { pos: [0, 4.1, 0], scale: [1, 0.5, 1] })); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.add(K.mesh(GEO.sph(0.55, 10, 6), petal[k % 2], { pos: [Math.cos(a) * 0.85, 4.05, Math.sin(a) * 0.85], scale: [1.2, 0.2, 0.6], rot: [0, -a, 0] })); } return g; };
    K.arc(6, (i) => { const f = flower(i); K.sway(f, 0.06, 0.9); return f; }, { from: -172, to: -122, r: 18.5 });
    // דבורים
    const beeY = M.std(0xffd23a, 0.5), beeK = M.std(0x1a1a1a, 0.6), wing = M.std(0xffffff, 0.2, 0, { transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < (K.low ? 4 : 8); i++) {
      const w1 = K.mesh(GEO.plane(0.4, 0.25), wing, { pos: [-0.2, 0.18, 0] }), w2 = K.mesh(GEO.plane(0.4, 0.25), wing, { pos: [0.2, 0.18, 0] });
      const bee = K.group(K.mesh(GEO.sph(0.22, 10, 8), beeY, { scale: [0.8, 0.8, 1.3] }), K.mesh(GEO.tor(0.19, 0.04, 12), beeK, { pos: [0, 0, -0.05] }), w1, w2);
      K.orbit(bee, rand(9, 15), rand(3, 7), rand(0.3, 0.6) * (i % 2 ? 1 : -1), rand(0, 6), 1.2);
      K.every((dt, t) => { const f = Math.sin(t * 40 + i) * 0.7; w1.rotation.z = f; w2.rotation.z = -f; });
    }
    K.corners(() => hive(1.15));
  },

  116(K) { // גן הפסלים
    K.ground(T.grid('x116g', 0xe8e6de, 0xb8b4aa, 2, 3), { repeat: 10, rough: 0.35 });
    K.arena(T.rings('x116a', 0xf6f3ec, 0xe8b84a, 6), { repeat: 1, phys: true, clearcoat: 0.6, rough: 0.25, rim: 0xe8b84a });
    const marble = M.std(0xf2ece0, 0.35), hedge = M.std(0x3a7a3a, 0.9, 0, { flatShading: true });
    const statue = (pose) => {
      const g = K.group(K.mesh(GEO.box(1.6, 1.4, 1.6), marble, { pos: [0, 0.7, 0], cast: true }));
      g.add(K.mesh(GEO.cyl(0.18, 0.22, 1.4, 8), marble, { pos: [-0.22, 2.1, 0] }), K.mesh(GEO.cyl(0.18, 0.22, 1.4, 8), marble, { pos: [0.22, 2.1, 0] }));
      g.add(K.mesh(GEO.cyl(0.45, 0.35, 1.3, 10), marble, { pos: [0, 3.4, 0], cast: true }), K.mesh(GEO.sph(0.32, 12, 10), marble, { pos: [0, 4.35, 0] }));
      g.add(K.mesh(GEO.cyl(0.11, 0.11, 1.3, 8), marble, { pos: [0.65, pose ? 4.3 : 3.4, 0], rot: [0, 0, pose ? -0.5 : 0.25] }), K.mesh(GEO.cyl(0.11, 0.11, 1.2, 8), marble, { pos: [-0.62, 3.3, 0.05], rot: [0, 0, -0.25] }));
      if (pose) g.add(K.mesh(GEO.sph(0.26, 12, 8), M.glow(0xffd060, 1.5), { pos: [1.0, 5.0, 0] }));
      return g;
    };
    [[-6.5, -12.5, 1], [6.5, -13, 0], [-10.5, -8, 0], [10.5, -8.5, 1]].forEach(([x, z, p]) => { const s = statue(p); s.position.set(x, 0, z); s.rotation.y = Math.atan2(-x, -z); K.add(s); });
    // שורת עמודים ומשוכות
    for (let i = 0; i < 7; i++) { const x = -9 + i * 3; K.add(K.mesh(GEO.cyl(0.4, 0.45, 6, 12), marble, { pos: [x, 3, -21], cast: true })); }
    K.add(K.mesh(GEO.box(20, 0.7, 1.4), marble, { pos: [0, 6.3, -21] }));
    K.arc(8, () => K.mesh(GEO.box(3, 1.4, 1.2), hedge, { pos: [0, 0.7, 0] }), { from: -176, to: -128, r: 19.5 });
    // מזרקה
    const water = M.add(0xbfe8ff, 0.5);
    const ft = K.group(K.mesh(GEO.cyl(2.4, 2.6, 0.7, 24), marble, { pos: [0, 0.35, 0] }), K.mesh(new THREE.CircleGeometry(2.2, 24), M.std(0x6ab8e8, 0.1, 0.2), { pos: [0, 0.72, 0], rot: [-Math.PI / 2, 0, 0] }), K.mesh(GEO.cyl(0.25, 0.3, 2.2, 10), marble, { pos: [0, 1.6, 0] }));
    const jet = K.mesh(GEO.cone(0.9, 2.2, 16, true), water, { pos: [0, 3.2, 0], rot: [Math.PI, 0, 0] });
    ft.add(jet); ft.position.set(0, 0, -15.5); K.add(ft);
    K.every((dt, t) => { jet.scale.y = 1 + Math.sin(t * 3) * 0.08; water.opacity = 0.4 + Math.sin(t * 5) * 0.1; });
    K.corners(() => { const st = statue(0); st.scale.setScalar(0.55); return K.group(st); });
  },

  117(K) { // חגורת האסטרואידים
    K.ground(T.stars('x117g', 0x2a2a3a), { repeat: 6, rough: 0.95 });
    K.arena(T.rings('x117a', 0x3a4258, 0x33a8ff, 9), { repeat: 1, rough: 0.3, metal: 0.8, emissive: 0x33a8ff, ei: 0.5, rim: 0x33a8ff });
    // טבעת אסטרואידים (InstancedMesh אחד) שמסתובבת
    const n = K.low ? 40 : 90;
    const ast = new THREE.InstancedMesh(GEO.dod(1), M.std(0x6a6460, 0.95, 0.05, { flatShading: true }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rand(-0.05, 0.05), r = rand(17, 24), s = rand(0.3, 1.2); ast.setMatrixAt(i, m4.compose(v.set(Math.cos(a) * r, rand(3, 9), Math.sin(a) * r), q.setFromEuler(e.set(rand(0, 3), rand(0, 3), rand(0, 3))), sc.set(s, s * 0.8, s))); }
    const belt = K.group(ast); K.add(belt); K.spin(belt, 0.03);
    // כוכב לכת עם טבעת
    const planet = K.group(K.mesh(GEO.sph(6, 32, 20), M.std(0xc87a4a, 0.8, 0, { fog: false })), K.mesh(GEO.tor(9.5, 0.6, 64), M.std(0xe8d0a8, 0.6, 0, { fog: false }), { rot: [1.2, 0, 0.2], scale: [1, 1, 0.08] }));
    planet.position.set(16, 22, -60); K.add(planet); K.spin(planet.children[0], 0.05);
    // לווין מסתובב
    const sat = K.group(K.mesh(GEO.box(1, 1, 1.4), M.std(0xdfe4ee, 0.3, 1)), K.mesh(GEO.box(3.4, 0.05, 1.1), M.std(0x2a4ab8, 0.3, 0.6), { pos: [0, 0, 0] }), K.mesh(GEO.cyl(0.05, 0.05, 1.2, 6), M.std(0xdfe4ee, 0.3, 1), { pos: [0, 0.8, 0] }));
    K.orbit(sat, 14, 9, 0.15, 1);
    // תחנת חלל בטבעת
    const station = K.group(K.mesh(GEO.tor(3, 0.35, 48), M.std(0xdfe4ee, 0.35, 0.9)), K.mesh(GEO.sph(0.9, 16, 12), M.std(0xc8ccd8, 0.3, 1)), K.mesh(GEO.cyl(0.12, 0.12, 6, 8), M.std(0xc8ccd8, 0.3, 1), { rot: [0, 0, Math.PI / 2] }));
    station.position.set(-6, 13, -24); station.rotation.x = 1.0; K.add(station); K.spin(station, 0.25, 'z');
    station.add(K.mesh(GEO.tor(2.95, 0.08, 48), M.glow(0x33a8ff, 2)));
    K.corners(() => { const r = K.mesh(GEO.dod(0.7), M.std(0x6a6460, 0.95, 0.05, { flatShading: true }), { pos: [0, 2, 0] }); K.bob(r, 0.3, 0.9); K.spin(r, 0.5, 'x'); return K.group(r, K.mesh(GEO.cyl(0.5, 0.7, 0.3, 8), M.std(0x3a4258, 0.4, 0.8), { pos: [0, 0.15, 0] })); });
  },

  118(K) { // עמק הגייזרים
    K.ground(T.cracks('x118g', 0xc8885a, 0x8a5032, 30, 3), { repeat: 7 });
    K.arena(T.rings('x118a', 0xf2e6d0, 0xd8a87a, 12), { repeat: 1, rough: 0.8, rim: 0x5ad8c8 });
    const rock = M.std(0xb87a50, 0.95, 0, { flatShading: true }), pool = M.glow(0x5ad8c8, 0.8), steam = M.add(0xffffff, 0.5);
    const geysers = [];
    const geyser = (s) => {
      const plume = K.mesh(GEO.cyl(0.25 * s, 0.6 * s, 5 * s, 12, true), steam, { pos: [0, 2.5 * s + 0.6, 0] });
      const g = K.group(K.mesh(GEO.cone(2.2 * s, 1.2 * s, 9), rock, { pos: [0, 0.6 * s, 0] }), K.mesh(GEO.cyl(0.6 * s, 0.6 * s, 0.05, 12), pool, { pos: [0, 1.22 * s, 0] }), plume);
      geysers.push({ plume, s, t: rand(0, 6), boost: 0 });
      return g;
    };
    [[-7, -13, 1.2], [7.5, -13.5, 1.4], [0, -19, 1.6], [-11.5, -8, 1], [11.5, -8.5, 1.1]].forEach(([x, z, s]) => { const g = geyser(s); g.position.set(x, 0, z); K.add(g); });
    K.every((dt, t) => { geysers.forEach((gz, i) => { gz.boost = Math.max(0, gz.boost - dt); const k = Math.max(0, Math.sin(t * 0.7 + i * 1.7)) ** 3 + gz.boost; gz.plume.scale.set(1, 0.08 + k * 1.2, 1); gz.plume.position.y = (2.5 * gz.s) * gz.plume.scale.y + 0.6 * gz.s; }); steam.opacity = 0.45; });
    // בריכות חמות
    for (let i = 0; i < 6; i++) { const a = (-160 + i * 28) * DEG, r = rand(15, 21); K.add(K.mesh(new THREE.CircleGeometry(rand(1.2, 2.2), 20), pool, { pos: [Math.cos(a) * r, 0.05, Math.sin(a) * r], rot: [-Math.PI / 2, 0, 0] })); }
    K.pulse(pool, 0.7, 0.25, 1.5);
    K.arc(6, () => P.rock(K, rand(0.8, 1.6), 0xa86a40), { from: -178, to: -120, r: 21.5, jitter: 1 });
    K.onMove(() => { const g = geysers[Math.floor(rand(0, geysers.length))]; g.boost = 1.2; });
    K.corners(() => geyser(0.6));
  },

  119(K) { // יער הפטריות הזוהרות
    K.ground(T.speckle('x119g', 0x26402a, 0x9affd8, 700, 3), { repeat: 7, emissive: 0x9affd8, ei: 0.35 });
    K.arena(T.cracks('x119a', 0x3a4a3a, 0x9affd8, 16, 2), { rough: 0.9, emissive: 0x6affc0, ei: 0.4, rim: 0x9affd8 });
    const stem = M.std(0xf2ece0, 0.7);
    const shroom = (h, r, cap, glowC) => {
      const glowM = M.glow(glowC, 1.6);
      const g = K.group(K.mesh(GEO.cyl(r * 0.18, r * 0.26, h, 10), stem, { pos: [0, h / 2, 0], cast: true }), K.mesh(GEO.hemi(r), M.std(cap, 0.5, 0, { emissive: glowC, emissiveIntensity: 0.25 }), { pos: [0, h, 0], scale: [1, 0.55, 1], cast: true }), K.mesh(GEO.cyl(r * 0.95, r * 0.95, 0.06, 18), M.std(0xe8dcc8, 0.8), { pos: [0, h + 0.02, 0] }));
      for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; g.add(K.mesh(GEO.sph(r * 0.11, 8, 6), glowM, { pos: [Math.cos(a) * r * 0.6, h + r * 0.43, Math.sin(a) * r * 0.6], scale: [1, 0.45, 1] })); }
      K.pulse(glowM, 1.4, 0.8, rand(1, 2), rand(0, 6));
      return g;
    };
    [[-7, -13, 6, 2.6, 0x8a3a8a, 0x9affd8], [7.5, -13.5, 7, 3, 0x3a5aa8, 0xe8a8ff], [0, -21, 8, 3.4, 0x5a2a8a, 0x9affd8], [-11.5, -8, 4, 1.8, 0xc84a3a, 0xfff08a], [11.5, -8.5, 4.5, 2, 0x8a3a8a, 0x9affd8]]
      .forEach(([x, z, h, r, c, gc]) => { const m = shroom(h, r, c, gc); m.position.set(x, 0, z); K.add(m); });
    K.arc(8, (i) => shroom(rand(1, 2.4), rand(0.6, 1.1), [0x8a3a8a, 0x3a5aa8, 0xc84a3a][i % 3], [0x9affd8, 0xe8a8ff, 0xfff08a][i % 3]), { from: -176, to: -122, r: 18, jitter: 1.2 });
    K.corners((sx) => shroom(1.8, 0.9, sx > 0 ? 0x3a5aa8 : 0x8a3a8a, sx > 0 ? 0xe8a8ff : 0x9affd8));
  },

  // ===================== 13 — ממלכות הזניט =====================
  120(K) { // ארמון הפורצלן
    K.ground(T.floral('x120g', 0xf7f9fc, 0x2a58b8), { repeat: 8, rough: 0.2 });
    K.arena(T.rings('x120a', 0xf7f9fc, 0x2a58b8, 5), { repeat: 1, phys: true, clearcoat: 1, rough: 0.1, rim: 0x2a58b8 });
    const white = M.phys({ color: 0xf7f9fc, roughness: 0.12, clearcoat: 1 }), blue = M.phys({ color: 0x1f4fa0, roughness: 0.15, clearcoat: 1 });
    const vase = (h) => {
      const pts = [[0, 0], [0.55, 0], [0.62, 0.08], [0.5, 0.15], [0.75, 0.45], [0.82, 0.62], [0.6, 0.8], [0.32, 0.9], [0.36, 1.0], [0, 1.0]].map(([x, y]) => new THREE.Vector2(x * h * 0.45, y * h));
      const g = K.group(K.mesh(new THREE.LatheGeometry(pts, 28), white, { cast: true }));
      [0.3, 0.55, 0.75].forEach((y) => g.add(K.mesh(GEO.tor(h * 0.45 * (y === 0.55 ? 0.8 : y === 0.3 ? 0.68 : 0.62), h * 0.015, 32), blue, { pos: [0, y * h, 0], rot: [Math.PI / 2, 0, 0] })));
      return g;
    };
    [[-7, -13, 6], [7.5, -13.5, 6.5], [-11.5, -8, 4.5], [11.5, -8.5, 4.5], [0, -21, 8]].forEach(([x, z, h]) => { const v = vase(h); v.position.set(x, 0, z); K.add(v); });
    // ספלי תה מסתובבים (קרוסלה)
    const cup = (c) => K.group(K.mesh(GEO.cyl(1.0, 0.7, 1.0, 24, true), M.phys({ color: c, roughness: 0.15, clearcoat: 1, side: THREE.DoubleSide }), { pos: [0, 0.6, 0] }), K.mesh(GEO.cyl(1.3, 1.3, 0.12, 24), white, { pos: [0, 0.06, 0] }), K.mesh(GEO.tor(0.3, 0.07, 12), white, { pos: [1.05, 0.7, 0], rot: [0, 0, 0.3] }));
    const carousel = K.group();
    [0xffffff, 0xd8e8ff, 0xffffff, 0xd8e8ff].forEach((c, i) => { const cp = cup(c); const a = (i / 4) * TAU; cp.position.set(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6); carousel.add(cp); K.spin(cp, 1.2); });
    carousel.position.set(0, 0, -15); K.add(carousel); K.spin(carousel, 0.35);
    // עצי ערבה כחולים
    K.arc(6, () => P.tree(K, rand(4, 6), 0x5a8ad8, 0x2a3a5a), { from: -176, to: -128, r: 19.5, jitter: 1 });
    K.corners(() => vase(2.8));
  },

  121(K) { // חדר הצעצועים
    K.ground(T.checker('x121g', 0x7ac85a, 0x9ad87a, 2), { repeat: 10, rough: 0.8 });
    K.arena(T.checker('x121a', 0xffd23a, 0x3a7ae0, 4), { repeat: 2, rough: 0.6, rim: 0xe2664f });
    const cols = [0xe2664f, 0x3a7ae0, 0xffd23a, 0x5ab85a, 0xc84aff];
    const plastic = (c) => M.phys({ color: c, roughness: 0.35, clearcoat: 0.6 });
    const tower = (n) => { const g = K.group(); for (let i = 0; i < n; i++) g.add(K.mesh(GEO.box(1.6, 1.6, 1.6), plastic(cols[i % 5]), { pos: [rand(-0.15, 0.15), 0.8 + i * 1.6, rand(-0.15, 0.15)], rot: [0, rand(-0.4, 0.4), 0], cast: true })); return g; };
    [[-7, -13, 4], [7.5, -13.5, 5], [-11.5, -8, 3], [11.5, -8.5, 3]].forEach(([x, z, n]) => { const t = tower(n); t.position.set(x, 0, z); K.add(t); });
    // סביבונים
    [[-3.5, -16], [3.5, -16.5]].forEach(([x, z], i) => {
      const top = K.group(K.mesh(GEO.cone(1.1, 1.6, 16), plastic(cols[i + 2]), { pos: [0, 0.8, 0], rot: [Math.PI, 0, 0] }), K.mesh(GEO.cyl(1.1, 1.1, 0.3, 16), plastic(cols[i]), { pos: [0, 1.75, 0] }), K.mesh(GEO.cyl(0.12, 0.12, 0.9, 8), plastic(0x8a6a40), { pos: [0, 2.3, 0] }));
      top.position.set(x, 0, z); K.add(top); K.spin(top, 6);
      K.every((dt, t) => { top.rotation.x = Math.sin(t * 1.3 + i) * 0.12; top.rotation.z = Math.cos(t * 1.3 + i) * 0.12; });
    });
    // רכבת צעצוע על מסילה
    K.add(K.mesh(GEO.tor(16.5, 0.18, 96), M.std(0x6a6a6a, 0.4, 0.8), { rot: [Math.PI / 2, 0, 0], pos: [0, 0.18, 0] }));
    const train = K.group();
    for (let i = 0; i < 4; i++) { const car = K.group(K.mesh(GEO.box(1.3, 1.1, 2), plastic(cols[i % 5]), { pos: [0, 0.85, 0] }), ...[-0.7, 0.7].map((z) => K.mesh(GEO.cyl(0.32, 0.32, 1.5, 12), plastic(0x2a2a2a), { pos: [0, 0.32, z], rot: [0, 0, Math.PI / 2] }))); if (i === 0) car.add(K.mesh(GEO.cyl(0.25, 0.3, 0.8, 10), plastic(0x2a2a2a), { pos: [0, 1.7, 0.4] })); car.position.z = -i * 2.3; train.add(car); }
    const tr = K.group(train); K.add(tr);
    K.every((dt, t) => { tr.rotation.y = -t * 0.25; train.position.set(16.5, 0, 0); });
    // כדורים קופצים
    const balls = [];
    [[-5, -11], [5, -11.5], [0, -18]].forEach(([x, z], i) => { const b = K.mesh(GEO.sph(0.8, 16, 12), plastic(cols[(i + 1) % 5])); b.position.set(x, 0.8, z); K.add(b); balls.push({ b, h: 2.5, ph: i }); });
    K.every((dt, t) => balls.forEach((o) => { o.h = Math.max(2.5, o.h - dt * 2); o.b.position.y = 0.8 + Math.abs(Math.sin(t * 2.4 + o.ph)) * o.h; }));
    K.onMove(() => balls.forEach((o) => { o.h = 5; }));
    K.corners(() => tower(2));
  },

  122(K) { // שדות החיטה
    K.ground(T.stripes('x122g', 0xd8c070, 0xc8a85a, 10), { repeat: 7, rough: 0.95 });
    K.arena(T.speckle('x122a', 0x9a8a72, 0x6a5a44, 900, 4), { repeat: 3, rough: 0.95, rim: 0x8a6a40 });
    // טחנת רוח
    const blades = K.group();
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; blades.add(K.mesh(GEO.box(0.9, 5.5, 0.1), M.std(0xf2e6c8, 0.8), { pos: [Math.sin(a) * 2.8, Math.cos(a) * 2.8, 0], rot: [0, 0, -a] })); }
    blades.position.set(0, 9, 1.9);
    const mill = K.group(K.mesh(GEO.cyl(1.6, 2.4, 9, 12), M.std(0xf2e6c8, 0.8), { pos: [0, 4.5, 0], cast: true }), K.mesh(GEO.cone(2.1, 2.2, 12), M.std(0xb8282a, 0.6), { pos: [0, 10.1, 0] }), blades);
    mill.position.set(6, 0, -18); mill.rotation.y = -0.3; K.add(mill); K.spin(blades, 0.8, 'z');
    // רפת אדומה
    const barn = K.group(K.mesh(GEO.box(5, 3.6, 4), M.std(0xb8282a, 0.8), { pos: [0, 1.8, 0], cast: true }), K.mesh(GEO.cone(3.9, 2.2, 4), M.std(0x5a3a2a, 0.8), { pos: [0, 4.7, 0], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.8] }), K.mesh(GEO.box(1.8, 2.4, 0.1), M.std(0xf2e6c8, 0.8), { pos: [0, 1.2, 2.02] }));
    barn.position.set(-7.5, 0, -16); barn.rotation.y = 0.4; K.add(barn);
    // חבילות קש וגדרות
    const hay = M.std(0xe8c05a, 0.95);
    [[-9, -10], [9.5, -10.5], [-3.5, -12.5], [3.5, -12.8]].forEach(([x, z]) => K.add(K.mesh(GEO.cyl(0.9, 0.9, 1.4, 16), hay, { pos: [x, 0.9, z], rot: [0, rand(0, 3), Math.PI / 2] })));
    // שדות חיטה מתנועעים (InstancedMesh)
    const n = K.low ? 160 : 360;
    const stalk = new THREE.InstancedMesh(GEO.cone(0.08, 1.2, 4), M.std(0xe8c05a, 0.9), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < n; i++) { const a = rand(-178, -2) * DEG * (i % 2 ? 1 : -1), r = rand(14, 24); stalk.setMatrixAt(i, m4.compose(v.set(Math.cos(a) * r, 0.6, Math.sin(a) * r), q.identity(), one)); }
    const field = K.group(stalk); K.add(field);
    K.every((dt, t) => { field.rotation.z = Math.sin(t * 0.9) * 0.01; field.rotation.x = Math.cos(t * 0.7) * 0.01; });
    // דחליל
    const scare = K.group(K.mesh(GEO.cyl(0.1, 0.1, 4, 6), M.std(0x6a4a2a, 0.9), { pos: [0, 2, 0] }), K.mesh(GEO.box(2.6, 0.12, 0.12), M.std(0x6a4a2a, 0.9), { pos: [0, 3, 0] }), K.mesh(GEO.sph(0.45, 10, 8), M.std(0xe8c05a, 0.9), { pos: [0, 4.2, 0] }), K.mesh(GEO.cone(0.6, 0.6, 10), M.std(0x8a5a2a, 0.9), { pos: [0, 4.7, 0] }));
    scare.position.set(11, 0, -7); K.add(scare); K.sway(scare, 0.04, 1.1);
    K.corners(() => K.group(K.mesh(GEO.cyl(0.9, 0.9, 1.4, 16), hay, { pos: [0, 0.9, 0], rot: [0, 0, Math.PI / 2] })));
  },

  123(K) { // זיכרונות בספיה
    K.ground(T.planks('x123g', 0x8a7052, 0x4a3a28), { repeat: 9, rough: 0.8 });
    K.arena(T.rings('x123a', 0x7a4a2a, 0xd8b880, 7), { repeat: 1, rough: 0.95, rim: 0xc8a878 });
    const gold = M.std(0xc8a878, 0.4, 0.8), photo = (c) => M.std(c, 0.9);
    const frame = (w, h, c) => K.group(K.mesh(GEO.box(w, h, 0.2), gold, { cast: true }), K.mesh(GEO.box(w - 0.4, h - 0.4, 0.22), photo(c)));
    [[-7, 2.5, -13, 3, 4, 0xb89a74], [7, 3, -13.5, 4, 3, 0xa88a5a], [-3, 4, -20, 3.5, 4.5, 0xc8aa80], [3.5, 3.5, -20.5, 4, 3, 0x9a7a54]].forEach(([x, y, z, w, h, c]) => { const f = frame(w, h, c); f.position.set(x, y, z); f.rotation.set(-0.12, Math.atan2(-x, -z) * 0.5, 0); K.add(f); f.add(K.mesh(GEO.box(0.15, y * 1.1, 0.15), gold, { pos: [0, -y / 2 - 0.2, -0.3], rot: [0.2, 0, 0] })); });
    // גרמופון
    const record = K.mesh(GEO.cyl(1.5, 1.5, 0.08, 32), M.std(0x1a1410, 0.3), { pos: [0, 1.7, 0] });
    const horn = K.mesh(GEO.cone(1.6, 3.2, 24, true), M.std(0xc8a878, 0.35, 0.9, { side: THREE.DoubleSide }), { pos: [1.2, 3.6, 0.3], rot: [0, 0, -2.2] });
    const gram = K.group(K.mesh(GEO.box(3.4, 1.6, 3.4), M.std(0x5a3a22, 0.6), { pos: [0, 0.8, 0], cast: true }), record, horn);
    gram.position.set(-10.5, 0, -8); gram.rotation.y = 0.8; K.add(gram); K.spin(record, 2.2);
    // מצלמה עתיקה על חצובה
    const cam = K.group(K.mesh(GEO.box(1.6, 1.4, 1.4), M.std(0x3a2a1a, 0.6), { pos: [0, 4.2, 0] }), K.mesh(GEO.cyl(0.45, 0.55, 1.0, 16), gold, { pos: [0, 4.2, 1.1], rot: [Math.PI / 2, 0, 0] }));
    for (const a of [0, 2.1, 4.2]) cam.add(K.mesh(GEO.cyl(0.07, 0.09, 4, 6), M.std(0x5a3a22, 0.8), { pos: [Math.sin(a) * 0.8, 1.8, Math.cos(a) * 0.8], rot: [Math.cos(a) * 0.22, 0, -Math.sin(a) * 0.22] }));
    cam.position.set(10.5, 0, -8.5); cam.rotation.y = -0.9; K.add(cam);
    // תמונות ישנות שמרחפות
    for (let i = 0; i < 7; i++) { const p = K.mesh(GEO.box(1.2, 0.9, 0.04), photo([0xd8c4a0, 0xb89a74, 0xa88a5a][i % 3])); floater(K, p, rand(-9, 9), rand(5, 10), rand(-20, -10), { amp: 0.5, sp: rand(0.4, 0.8), spin: rand(-0.4, 0.4) }); }
    K.corners((sx) => { const f = frame(1.6, 2.0, sx > 0 ? 0xb89a74 : 0xa88a5a); f.position.y = 1.3; return K.group(f, K.mesh(GEO.box(0.1, 1.2, 0.1), gold, { pos: [0, 0.55, -0.2], rot: [0.25, 0, 0] })); });
  },

  124(K) { // טירת קורי העכביש
    K.ground(T.cracks('x124g', 0x2e2e34, 0x16161a, 24, 3), { repeat: 7, rough: 0.9 });
    const a = K.arena(T.web('x124a', 0x1e1e24, 0xdfe6ff), { repeat: 1, rough: 0.8, emissive: 0xb8c8ff, ei: 0.25, rim: 0x6a6a7a });
    K.pulse(a.mat, 0.2, 0.1, 1.2);
    const stone = M.std(0x3a3a42, 0.9, 0, { flatShading: true });
    const pillar = (h) => K.group(K.mesh(GEO.box(1.4, h, 1.4), stone, { pos: [0, h / 2, 0], cast: true }), K.mesh(GEO.cone(1.0, 2.2, 4), stone, { pos: [0, h + 1.1, 0], rot: [0, Math.PI / 4, 0] }));
    const spots = [[-7.5, -13, 9], [7.5, -13.5, 9], [-3.5, -20, 11], [3.5, -20, 11]];
    spots.forEach(([x, z, h]) => { const p = pillar(h); p.position.set(x, 0, z); K.add(p); });
    K.add(K.mesh(GEO.tor(3.5, 0.6, 24, Math.PI), stone, { pos: [0, 11, -20] }));
    // קורים בין העמודים
    const webM = new THREE.LineBasicMaterial({ color: 0xdfe6ff, transparent: true, opacity: 0.55 });
    const web = (cx, cy, cz, R) => {
      const pts = [];
      for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU; pts.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(an) * R, Math.sin(an) * R, 0)); }
      for (let r = R * 0.2; r <= R; r += R * 0.2) for (let i = 0; i < 10; i++) { const a1 = (i / 10) * TAU, a2 = ((i + 1) / 10) * TAU; pts.push(new THREE.Vector3(Math.cos(a1) * r, Math.sin(a1) * r, 0), new THREE.Vector3(Math.cos(a2) * r, Math.sin(a2) * r, 0)); }
      const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), webM); l.position.set(cx, cy, cz); K.add(l); return l;
    };
    web(0, 6, -13.2, 5.5); web(0, 7, -20.2, 3); web(-11, 5, -8, 3.5).rotation.y = 0.8; web(11, 5, -8.5, 3.5).rotation.y = -0.8;
    // עכבישים יורדים ועולים על חוטים
    const spiderM = M.std(0x0e0e10, 0.5), eyeM = M.glow(0xff2020, 2);
    [[-2.5, -13.1], [2.8, -13.1], [0, -20.1]].forEach(([x, z], i) => {
      const sp = K.group(K.mesh(GEO.sph(0.45, 10, 8), spiderM), K.mesh(GEO.sph(0.3, 10, 8), spiderM, { pos: [0, 0.5, 0] }), K.mesh(GEO.sph(0.06, 6, 4), eyeM, { pos: [-0.1, 0.55, 0.25] }), K.mesh(GEO.sph(0.06, 6, 4), eyeM, { pos: [0.1, 0.55, 0.25] }));
      for (let k = 0; k < 4; k++) for (const s of [-1, 1]) sp.add(K.mesh(GEO.box(0.9, 0.06, 0.06), spiderM, { pos: [s * 0.5, 0.1 - k * 0.12, 0], rot: [0, 0, s * (0.5 - k * 0.15)] }));
      const thread = K.mesh(GEO.cyl(0.015, 0.015, 1, 4), M.basic(0xdfe6ff), { pos: [0, 0.5, 0] });
      const g = K.group(sp, thread); g.position.set(x, 9, z); K.add(g);
      K.every((dt, t) => { const d = 2.5 + Math.sin(t * 0.6 + i * 2) * 2; sp.position.y = -d; thread.scale.y = d; thread.position.y = -d / 2; });
    });
    // נרות ועטלפים
    for (let i = 0; i < 6; i++) { const c = K.group(K.mesh(GEO.cyl(0.14, 0.16, 0.7, 8), M.std(0xe8e2d0, 0.7), { pos: [0, 0.35, 0] }), K.mesh(GEO.cone(0.1, 0.28, 8), M.glow(0xffc060, 2.4), { pos: [0, 0.85, 0] })); floater(K, c, rand(-8, 8), rand(4, 8), rand(-18, -9), { amp: 0.3, sp: rand(0.5, 1), spin: 0 }); }
    const batM = M.std(0x16141a, 0.8, 0, { side: THREE.DoubleSide });
    for (let i = 0; i < (K.low ? 3 : 6); i++) { const w1 = K.mesh(GEO.plane(0.9, 0.5), batM, { pos: [-0.45, 0, 0] }), w2 = K.mesh(GEO.plane(0.9, 0.5), batM, { pos: [0.45, 0, 0] }); const bat = K.group(K.mesh(GEO.sph(0.18, 8, 6), batM), w1, w2); bat.rotation.x = -Math.PI / 2; K.orbit(bat, rand(10, 16), rand(7, 11), rand(0.3, 0.5) * (i % 2 ? 1 : -1), rand(0, 6), 1); K.every((dt, t) => { const f = Math.sin(t * 14 + i) * 0.8; w1.rotation.y = f; w2.rotation.y = -f; }); }
    K.corners(() => K.group(K.mesh(GEO.box(0.8, 2.4, 0.8), stone, { pos: [0, 1.2, 0] }), K.mesh(GEO.cyl(0.12, 0.14, 0.5, 8), M.std(0xe8e2d0, 0.7), { pos: [0, 2.65, 0] }), K.mesh(GEO.cone(0.09, 0.26, 8), M.glow(0xffc060, 2.4), { pos: [0, 3.05, 0] })));
  },

  125(K) { // גשר הנהר הגועש
    K.ground(T.speckle('x125g', 0x4a7a4a, 0x6a9a5a, 1300, 3), { repeat: 7 });
    K.arena(T.cracks('x125a', 0x9a968a, 0x5a564e, 24, 3), { repeat: 3, rough: 0.95, rim: 0x6a6e76 });
    // נהר שזורם מאחורי הלוח (רצועה ישרה) + מפל
    const w = T.flow('x125w', 0x2a7ab8, 0xeaf8ff).clone(); w.needsUpdate = true; w.wrapS = w.wrapT = THREE.RepeatWrapping; w.repeat.set(8, 1);
    K.add(K.mesh(GEO.plane(54, 4.4), M.std(0xffffff, 0.15, 0.1, { map: w }), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.06, -15] }));
    K.flow(w, -0.9, 0);
    const wf = T.flow('x125wf', 0x6ab8e8, 0xffffff).clone(); wf.needsUpdate = true; wf.wrapS = wf.wrapT = THREE.RepeatWrapping; wf.repeat.set(2, 3); wf.rotation = Math.PI / 2; wf.center.set(0.5, 0.5);
    const fall = K.mesh(GEO.plane(8, 12), M.std(0xffffff, 0.2, 0, { map: wf, transparent: true, opacity: 0.92 }), { pos: [-13, 6, -15], rot: [0, Math.PI / 2, 0] });
    K.add(fall); K.flow(wf, 0, 1.2);
    K.add(K.mesh(GEO.box(6, 13, 9), M.std(0x6a6a66, 0.95, 0, { flatShading: true }), { pos: [-16.5, 6.5, -15] }));
    // גשר אבן מקושת מעל הנהר
    const stone = M.std(0x9a968a, 0.95, 0, { flatShading: true });
    const bridge = K.group(K.mesh(GEO.box(3.6, 0.6, 8), stone, { pos: [0, 2.6, 0], cast: true }), K.mesh(GEO.tor(2.4, 0.5, 24, Math.PI), stone, { pos: [0, 0, 0], rot: [0, Math.PI / 2, 0] }), K.mesh(GEO.box(0.3, 0.9, 8), stone, { pos: [1.65, 3.3, 0] }), K.mesh(GEO.box(0.3, 0.9, 8), stone, { pos: [-1.65, 3.3, 0] }));
    bridge.position.set(5, 0, -15); K.add(bridge);
    // סלעים בנהר עם קצף
    const foam = M.add(0xffffff, 0.55);
    for (let i = 0; i < 6; i++) { const x = -10 + i * 4 + rand(-1, 1), z = -15 + rand(-1.2, 1.2); K.add(P.rock(K, rand(0.5, 1), 0x5a5a56)).position.set(x, 0.2, z); const f = K.mesh(new THREE.RingGeometry(0.7, 1.4, 20), foam, { pos: [x, 0.09, z], rot: [-Math.PI / 2, 0, 0] }); K.add(f); K.pulse(foam, 0.45, 0.15, 6, 0, 'opacity'); }
    K.arc(6, () => P.pine(K, rand(4, 7), 0x2e6a3a), { from: -178, to: -130, r: 21, jitter: 1 });
    K.corners(() => K.group(P.pine(K, 3), P.rock(K, 0.6, 0x7a7a72).translateX(0.9).translateY(0.3)));
  },

  126(K) { // טונדרת השלג
    K.ground(T.speckle('x126g', 0xeef4fa, 0xc8d8e8, 900, 3), { repeat: 7, rough: 0.8 });
    K.arena(T.rings('x126a', 0xf4f8fc, 0x9cc8e0, 8), { repeat: 1, phys: true, clearcoat: 0.6, rough: 0.3, rim: 0x7affc8 });
    const snow = M.std(0xf4f8fc, 0.8), ice = M.phys({ color: 0x9cc8e0, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.9 }), glowIce = M.glow(0x7affc8, 1.3);
    const igloo = (r) => { const g = K.group(K.mesh(GEO.hemi(r), snow, { cast: true }), K.mesh(GEO.cyl(r * 0.38, r * 0.38, r * 0.8, 14), snow, { pos: [0, r * 0.3, r * 0.95], rot: [Math.PI / 2, 0, 0] }), K.mesh(new THREE.CircleGeometry(r * 0.28, 14), M.std(0x1a2230, 0.9), { pos: [0, r * 0.3, r * 1.36] })); [0.25, 0.5, 0.72].forEach((t) => g.add(K.mesh(GEO.tor(r * Math.sqrt(1 - t * t), 0.03, 32), M.std(0xc8d8e8, 0.8), { pos: [0, r * t, 0], rot: [Math.PI / 2, 0, 0] }))); return g; };
    [[-7, -14, 2.2], [7.5, -14.5, 2.6], [0, -21, 3]].forEach(([x, z, r]) => { const g = igloo(r); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); K.add(g); });
    [[-11, -8], [11, -8.5], [-4, -16], [4.5, -16.5]].forEach(([x, z], i) => { const sp = K.group(K.mesh(GEO.cone(0.6, 4, 6), ice, { pos: [0, 2, 0] }), K.mesh(GEO.cone(0.25, 3.2, 6), glowIce, { pos: [0, 1.6, 0] })); sp.position.set(x, 0, z); sp.rotation.z = rand(-0.15, 0.15); K.add(sp); });
    K.pulse(glowIce, 1.0, 0.5, 1.4);
    // אגם קפוא
    K.add(K.mesh(new THREE.CircleGeometry(4.5, 32), M.phys({ color: 0xb8e0f4, roughness: 0.02, clearcoat: 1, metalness: 0.1 }), { rot: [-Math.PI / 2, 0, 0], pos: [11, 0.05, -15] }));
    K.arc(8, () => P.pine(K, rand(4, 7), 0x2a5a3a, 0xffffff), { from: -178, to: -122, r: 20, jitter: 1.2 });
    K.corners(() => K.group(K.mesh(GEO.cone(0.45, 3, 6), ice, { pos: [0, 1.5, 0] }), K.mesh(GEO.cone(0.18, 2.4, 6), glowIce, { pos: [0, 1.2, 0] })));
  },

  127(K) { // עולם התאים
    K.ground(T.cells('x127g', 0xf2b8c8, 0xd88aa8), { repeat: 5, rough: 0.4 });
    K.arena(T.rings('x127a', 0xf8e0ea, 0xc8d4e0, 4), { repeat: 1, phys: true, clearcoat: 1, rough: 0.1, rim: 0xc8d4e0 });
    const cellM = M.phys({ color: 0xf2b8c8, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.6, emissive: 0xff6a9a, emissiveIntensity: 0.15 });
    const nucM = M.glow(0x8a2ac8, 1.2);
    for (let i = 0; i < (K.low ? 5 : 10); i++) {
      const r = rand(0.9, 2.2);
      const c = K.group(K.mesh(GEO.sph(r, 20, 14), cellM), K.mesh(GEO.sph(r * 0.35, 12, 8), nucM, { pos: [r * 0.2, 0.1, r * 0.1] }));
      floater(K, c, rand(-10, 10), rand(3, 10), rand(-22, -9), { amp: 0.6, sp: rand(0.3, 0.7), spin: rand(-0.3, 0.3) });
    }
    // סליל DNA מסתובב
    const dna = K.group();
    const a1 = M.glow(0x5ad8ff, 1.4), a2 = M.glow(0xff6aa8, 1.4), rung = M.std(0xffffff, 0.4);
    for (let i = 0; i < 26; i++) { const t = i / 25, an = t * TAU * 2.2, y = t * 11; dna.add(K.mesh(GEO.sph(0.3, 10, 8), a1, { pos: [Math.cos(an) * 1.2, y, Math.sin(an) * 1.2] }), K.mesh(GEO.sph(0.3, 10, 8), a2, { pos: [-Math.cos(an) * 1.2, y, -Math.sin(an) * 1.2] })); if (i % 2 === 0) dna.add(K.mesh(GEO.box(2.4, 0.08, 0.08), rung, { pos: [0, y, 0], rot: [0, -an, 0] })); }
    dna.position.set(7, 0.5, -16); K.add(dna); K.spin(dna, 0.6);
    // נגיפים קוצניים
    const virusM = M.std(0x6a2a8a, 0.4, 0, { emissive: 0xa84aff, emissiveIntensity: 0.3 });
    const virus = () => { const g = K.group(K.mesh(GEO.ico(0.8, 1), virusM)); for (let i = 0; i < 12; i++) { const v = new THREE.Vector3().randomDirection(); const sp = K.mesh(GEO.cyl(0.05, 0.05, 0.6, 5), virusM); sp.position.copy(v.clone().multiplyScalar(1.0)); sp.lookAt(v.clone().multiplyScalar(3)); sp.rotateX(Math.PI / 2); g.add(sp, K.mesh(GEO.sph(0.12, 6, 4), virusM, { pos: v.clone().multiplyScalar(1.3).toArray() })); } return g; };
    [[-7, 5, -14], [-3, 8, -19], [10.5, 4, -9]].forEach(([x, y, z]) => floater(K, virus(), x, y, z, { amp: 0.5, sp: 0.6, spin: 0.5 }));
    // חיידקים מתפתלים
    const bac = M.std(0x4ad8a8, 0.4);
    K.arc(6, () => { const b = K.mesh(new THREE.CapsuleGeometry(0.45, 1.6, 6, 12), bac, { rot: [0, 0, Math.PI / 2], pos: [0, 0.5, 0] }); K.sway(b, 0.3, 2.2, 'y'); return K.group(b); }, { from: -170, to: -130, r: 18 });
    K.corners(() => { const c = K.group(K.mesh(GEO.sph(0.8, 18, 12), cellM), K.mesh(GEO.sph(0.28, 10, 8), nucM, { pos: [0.15, 0.05, 0.1] })); c.position.y = 1.6; K.bob(c, 0.3, 0.8); return K.group(c); });
  },

  128(K) { // מעגל הרונות
    const g = K.ground(T.runes('x128g', 0x34342e, 0xff3a2a), { repeat: 7, rough: 0.9, emissive: 0xff3a2a, ei: 0.6 });
    K.arena(T.cracks('x128a', 0x4a4a44, 0x2a2a26, 20, 3), { repeat: 3, rough: 0.95, rim: 0xff4a2a });
    K.pulse(g.mat, 0.5, 0.3, 1.2);
    // מעגל קסם מסתובב על הזירה
    const circle = drawnTexture2('x128circle');
    const magic = K.mesh(new THREE.CircleGeometry(11.6, 64), M.add(0xff4a2a, 0.55, circle), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.07, 0] });
    K.add(magic); K.spin(magic, 0.15, 'z');
    // אבנים עומדות עם רונות זוהרות
    const stone = M.std(0x6a6a64, 0.95, 0, { flatShading: true }), runeM = M.glow(0xff4a2a, 1.6);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * TAU - Math.PI / 2, h = rand(4, 7);
      const st = K.group(K.mesh(GEO.box(1.6, h, 1.0), stone, { pos: [0, h / 2, 0], cast: true }), K.mesh(GEO.box(0.5, 1.2, 0.05), runeM, { pos: [0, h * 0.6, 0.53] }));
      st.position.set(Math.cos(a) * 15, 0, Math.sin(a) * 15); st.rotation.y = -a - Math.PI / 2; K.add(st);
    }
    K.pulse(runeM, 1.3, 0.7, 1.6);
    // אבני רונות מרחפות במסלול
    for (let i = 0; i < (K.low ? 4 : 8); i++) { const o = K.group(K.mesh(GEO.dod(0.5), stone), K.mesh(GEO.box(0.3, 0.5, 0.05), runeM, { pos: [0, 0, 0.42] })); K.orbit(o, rand(11, 13.5), rand(4, 7), 0.2, (i / 8) * TAU, 0.6); }
    K.onMove(() => { runeM.emissiveIntensity = 3.2; });
    K.corners(() => K.group(K.mesh(GEO.box(1.1, 2.8, 0.7), stone, { pos: [0, 1.4, 0] }), K.mesh(GEO.box(0.35, 0.8, 0.05), runeM, { pos: [0, 1.7, 0.37] })));
  },

  129(K) { // פסגת הזניט
    K.ground(T.clouds('x129g', 0xf0f4fa, 0xfff4d8), { repeat: 5, rough: 0.9 });
    K.arena(T.sun('x129a', 0xf6f3ec, 0xe8b84a), { repeat: 1, phys: true, clearcoat: 1, rough: 0.15, rim: 0xffe9a8 });
    const crystal = M.phys({ color: 0xf3fbff, roughness: 0.04, iridescence: 0.8, iridescenceIOR: 1.4, clearcoat: 1, flatShading: true }), gold = M.std(0xf2c14e, 0.2, 1);
    const spire = (h) => K.group(K.mesh(GEO.cyl(h * 0.05, h * 0.12, h, 6), crystal, { pos: [0, h / 2, 0], cast: true }), K.mesh(GEO.oct(h * 0.12), M.glow(0xfff0c8, 1.8), { pos: [0, h + h * 0.1, 0], scale: [1, 1.7, 1] }));
    [[-7, -13, 7], [7.5, -13.5, 8], [-11.5, -8, 5], [11.5, -8.5, 5.5]].forEach(([x, z, h]) => { const s = spire(h); s.position.set(x, 0, z); K.add(s); });
    // טבעות זהב מסתובבות מעל
    [[10, 0.18, 0.2, 14], [12.5, 0.14, -0.15, 15.5], [15, 0.12, 0.1, 17]].forEach(([r, t, sp, y], i) => { const ring = K.mesh(GEO.tor(r, t, 96), M.glow(0xffd36a, 1.4), { pos: [0, y, -6], rot: [Math.PI / 2 + i * 0.12, 0, 0] }); K.add(ring); K.spin(ring, sp, 'z'); });
    // איי קריסטל מרחפים
    for (let i = 0; i < 5; i++) { const isle = K.group(K.mesh(GEO.cone(1.6, 3, 7), M.std(0xd8dcf0, 0.8, 0, { flatShading: true }), { rot: [Math.PI, 0, 0], pos: [0, -1.5, 0] }), K.mesh(GEO.cyl(1.6, 1.6, 0.4, 7), M.std(0xffffff, 0.6), { pos: [0, 0.2, 0] }), K.mesh(GEO.oct(0.6), crystal, { pos: [0, 1.2, 0], scale: [1, 1.8, 1] })); floater(K, isle, rand(-11, 11), rand(7, 12), rand(-24, -12), { amp: 0.6, sp: rand(0.3, 0.6), spin: 0.1 }); }
    // עמודי אור
    const beam = M.add(0xfff0c8, 0.22);
    [[-4.5, -17], [4.5, -17.5]].forEach(([x, z]) => K.add(K.mesh(GEO.cyl(0.8, 1.4, 22, 16, true), beam, { pos: [x, 11, z] })));
    K.pulse(beam, 0.18, 0.07, 1.2, 0, 'opacity');
    K.add(K.mesh(GEO.tor(4, 0.15, 64), gold, { pos: [0, 15, -24] }));
    K.corners(() => spire(3.4));
  },
};

/** טקסטורת מעגל קסם (רונות על טבעות) */
function drawnTexture2(key) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 512, 512);
  x.strokeStyle = '#ffffff'; x.lineWidth = 6; x.shadowColor = '#ffffff'; x.shadowBlur = 10;
  for (const r of [240, 200, 120]) { x.beginPath(); x.arc(256, 256, r, 0, TAU); x.stroke(); }
  x.lineWidth = 4;
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; const cx = 256 + Math.cos(a) * 220, cy = 256 + Math.sin(a) * 220; x.beginPath(); x.moveTo(cx - 6, cy - 10); x.lineTo(cx + 6, cy); x.lineTo(cx - 6, cy + 10); x.stroke(); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, b = ((i + 2) / 6) * TAU; x.beginPath(); x.moveTo(256 + Math.cos(a) * 200, 256 + Math.sin(a) * 200); x.lineTo(256 + Math.cos(b) * 200, 256 + Math.sin(b) * 200); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.key = key;
  return t;
}
