/**
 * אירועים עונתיים גלובליים (למשחק בינלאומי):
 * ראש השנה האזרחית, ראש השנה הירחי (לוח סיני דרך Intl), יום האהבה, ליל כל הקדושים וחגי החורף.
 */
import * as THREE from 'three';
import { mesh, G, glowTexture, drawnTexture, rand, TAU } from './kit.js';

function lunarNewYear(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-chinese', { month: 'numeric', day: 'numeric' }).formatToParts(date);
    const m = parts.find((p) => p.type === 'month')?.value, d = parseInt(parts.find((p) => p.type === 'day')?.value, 10);
    return m === '1' && d >= 1 && d <= 3;
  } catch { return false; }
}

export function detectSeason(date = new Date()) {
  const m = date.getMonth() + 1, d = date.getDate();
  if ((m === 12 && d === 31) || (m === 1 && d <= 2)) return { id: 'newyear', he: 'שנה טובה! 🎆', en: 'Happy New Year! 🎆' };
  if (lunarNewYear(date)) return { id: 'lunar', he: 'שנה ירחית חדשה שמחה! 🏮', en: 'Happy Lunar New Year! 🏮' };
  if (m === 2 && d >= 12 && d <= 15) return { id: 'valentine', he: 'יום אהבה שמח! 💖', en: "Happy Valentine's Day! 💖" };
  if ((m === 10 && d >= 28) || (m === 11 && d === 1)) return { id: 'halloween', he: 'ליל כל הקדושים מפחיד! 🎃', en: 'Happy Halloween! 🎃' };
  if (m === 12 && d >= 18 && d <= 30) return { id: 'winter', he: 'חגים שמחים! ❄️', en: 'Happy Holidays! ❄️' };
  return null;
}

function heartGeo() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.9, 0.1, -0.5, 0.75, 0, 0.35);
  s.bezierCurveTo(0.5, 0.75, 0.9, 0.1, 0, -0.5);
  return new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 }).translate(0, 0, -0.09);
}

function fireworks(updaters, fx, cols, every = 1.6) {
  let acc = 0;
  updaters.push((dt) => {
    acc += dt;
    if (acc < every) return;
    acc = 0;
    fx.add.emit({ count: 90, pos: [rand(-18, 18), rand(15, 22), rand(-30, -14)], radial: [4, 8], color: [cols[Math.floor(Math.random() * cols.length)], 0xffffff], size: [0.25, 0.5], life: [1.2, 1.8], gravity: 3, drag: 1.4 });
  });
}

export function buildSeason(season, sm, fx) {
  if (!season) return null;
  const g = new THREE.Group();
  const updaters = [];
  const ringSpots = (n, r, skipFront = true) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.2;
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (skipFront && z > r * 0.55 && Math.abs(x) < 7) continue;
      out.push([x, z]);
    }
    return out;
  };

  if (season.id === 'newyear') {
    fireworks(updaters, fx, [0xffd34d, 0xff5a7a, 0x5ad1ff, 0x8aff7a, 0xc77dff]);
  } else if (season.id === 'lunar') {
    const red = new THREE.MeshStandardMaterial({ color: 0xd8101a, emissive: 0xff2010, emissiveIntensity: 0.9, roughness: 0.5 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.25 });
    ringSpots(10, 14).forEach(([x, z], i) => {
      const l = new THREE.Group();
      l.add(mesh(G.sph(0.55, 16, 12), red, { scale: [1, 0.85, 1] }));
      l.add(mesh(G.cyl(0.25, 0.25, 0.12, 12), gold, { pos: [0, 0.5, 0] }));
      l.add(mesh(G.cyl(0.25, 0.25, 0.12, 12), gold, { pos: [0, -0.5, 0] }));
      l.add(mesh(G.cyl(0.02, 0.02, 0.5, 4), gold, { pos: [0, -0.8, 0] }));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff4020, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.setScalar(2.4); l.add(glow);
      l.position.set(x, 5 + (i % 3) * 0.8, z);
      l.userData.ph = rand(0, 6);
      g.add(l);
    });
    updaters.push((dt, t) => g.children.forEach((l) => { l.rotation.z = Math.sin(t * 1.2 + l.userData.ph) * 0.12; }));
    fireworks(updaters, fx, [0xff2a2a, 0xffd34d, 0xff8a20], 2.2);
  } else if (season.id === 'valentine') {
    const hg = heartGeo();
    const mats = [0xff4a7a, 0xff8ab0, 0xd8102a].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.2 }));
    for (let i = 0; i < 16; i++) {
      const h = mesh(hg, mats[i % 3], { scale: rand(0.5, 1.0) });
      const a = rand(0, TAU), r = rand(9, 17);
      h.position.set(Math.cos(a) * r, rand(2, 8), Math.sin(a) * r - 4);
      h.userData = { ph: rand(0, 6), y: h.position.y };
      g.add(h);
    }
    updaters.push((dt, t) => g.children.forEach((h) => { h.position.y = h.userData.y + Math.sin(t * 0.8 + h.userData.ph) * 0.5; h.rotation.y += dt * 0.6; }));
    let acc = 0;
    updaters.push((dt) => { acc += dt; if (acc > 0.15) { acc = 0; fx.add.emit({ count: 1, pos: [rand(-14, 14), rand(1, 6), rand(-16, 8)], vel: [0, 0.4, 0], color: [0xff8ab0, 0xffffff], size: [0.08, 0.16], life: [2, 3] }); } });
  } else if (season.id === 'halloween') {
    const face = drawnTexture('pumpkinFace', 256, (c, s) => {
      c.fillStyle = '#e06a10'; c.fillRect(0, 0, s, s);
      c.fillStyle = '#ffd040';
      c.beginPath(); c.moveTo(70, 100); c.lineTo(100, 60); c.lineTo(120, 105); c.fill();
      c.beginPath(); c.moveTo(136, 105); c.lineTo(156, 60); c.lineTo(186, 100); c.fill();
      c.beginPath(); c.moveTo(60, 150); c.lineTo(90, 170); c.lineTo(110, 150); c.lineTo(128, 172); c.lineTo(146, 150); c.lineTo(166, 170); c.lineTo(196, 150); c.lineTo(170, 200); c.lineTo(86, 200); c.closePath(); c.fill();
    });
    face.wrapS = THREE.ClampToEdgeWrapping;
    const pm = new THREE.MeshStandardMaterial({ map: face, emissive: 0xffa020, emissiveMap: face, emissiveIntensity: 0.35, roughness: 0.6 });
    const stem = new THREE.MeshStandardMaterial({ color: 0x3a5a1a, roughness: 0.8 });
    ringSpots(9, 11.5).forEach(([x, z]) => {
      const p = new THREE.Group();
      p.add(mesh(G.sph(0.7, 20, 14), pm, { scale: [1.2, 0.95, 1.2], cast: true, rot: [0, Math.atan2(-x, -z) + Math.PI, 0] }));
      p.add(mesh(G.cyl(0.08, 0.12, 0.35, 6), stem, { pos: [0, 0.75, 0] }));
      p.position.set(x, 0.65, z);
      g.add(p);
    });
    const bats = [];
    const batMat = new THREE.MeshBasicMaterial({ color: 0x120a18, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Group();
      for (const s of [-1, 1]) { const w = mesh(G.plane(0.7, 0.3), batMat, { pos: [s * 0.35, 0, 0] }); b.add(w); }
      b.add(mesh(G.sph(0.14, 8, 6), batMat));
      b.userData = { r: rand(8, 15), y: rand(6, 11), sp: rand(0.4, 0.8) * (i % 2 ? 1 : -1), a: rand(0, TAU) };
      g.add(b); bats.push(b);
    }
    updaters.push((dt, t) => bats.forEach((b, i) => {
      const u = b.userData; u.a += dt * u.sp;
      b.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 2 + i) * 0.6, Math.sin(u.a) * u.r - 4);
      b.rotation.y = -u.a;
      const f = Math.sin(t * 14 + i) * 0.7;
      b.children[0].rotation.z = f; b.children[1].rotation.z = -f;
    }));
    let acc = 0;
    updaters.push((dt) => { acc += dt; if (acc > 0.2) { acc = 0; fx.norm.emit({ count: 1, pos: [rand(-16, 16), 0.3, rand(-18, 10)], vel: [0.2, 0.15, 0], color: 0x6a3a8a, size: [1.2, 2.2], life: [3, 5], grow: 1.5, alpha: 0.25 }); } });
  } else if (season.id === 'winter') {
    const tree = new THREE.Group();
    const green = new THREE.MeshStandardMaterial({ color: 0x1f5a2e, roughness: 0.8 });
    tree.add(mesh(G.cyl(0.18, 0.25, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x4a2e1a }), { pos: [0, 0.4, 0] }));
    [[1.6, 1.6, 1.3], [1.25, 1.4, 2.2], [0.9, 1.2, 3.0]].forEach(([r, hh, y]) => tree.add(mesh(G.cone(r, hh, 12), green, { pos: [0, y, 0], cast: true })));
    const cols = [0xff3a3a, 0xffd34d, 0x3ab0ff, 0xff8af0, 0x8aff7a];
    const lights = [];
    for (let i = 0; i < 26; i++) {
      const y = 1.0 + Math.random() * 2.5, r = (3.8 - y) * 0.45 + 0.1, a = rand(0, TAU);
      const bmat = new THREE.MeshStandardMaterial({ color: cols[i % cols.length], emissive: cols[i % cols.length], emissiveIntensity: 1.5 });
      const b = mesh(G.sph(0.07, 8, 6), bmat, { pos: [Math.cos(a) * r, y, Math.sin(a) * r] });
      tree.add(b); lights.push(b);
    }
    const star = mesh(G.octa(0.22), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffc040, emissiveIntensity: 2 }), { pos: [0, 3.85, 0] });
    tree.add(star);
    for (let i = 0; i < 4; i++) tree.add(mesh(G.box(0.45, 0.4, 0.45), new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.4 }), { pos: [Math.cos(i * 1.6) * 1.4, 0.2, Math.sin(i * 1.6) * 1.4], rot: [0, i, 0] }));
    tree.position.set(-7.6, 0, -4.4);
    tree.scale.setScalar(1.1);
    g.add(tree);
    updaters.push((dt, t) => { lights.forEach((b, i) => { b.material.emissiveIntensity = 0.8 + Math.sin(t * 3 + i) * 0.8; }); star.rotation.y += dt; });
    let acc = 0;
    updaters.push((dt) => { acc += dt; if (acc > 0.04) { acc = 0; fx.norm.emit({ count: 3, pos: [rand(-22, 22), rand(10, 16), rand(-24, 16)], vel: [0.2, -1.0, 0], velSpread: [0.4, 0.2, 0.4], color: 0xffffff, size: [0.07, 0.15], life: [8, 12], alpha: 0.95 }); } });
  }
  return { group: g, update: (dt, t) => updaters.forEach((fn) => fn(dt, t)) };
}
