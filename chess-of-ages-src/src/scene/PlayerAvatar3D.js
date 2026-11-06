/**
 * אווטאר "מפקד מלכותי" תלת-ממדי על כס מלכות בסגנון העידן.
 * חריצי הצמדה: headSlot, bodyArmorSlot (גו + ירכיים), weaponHandSlot, auraSlot — החלפת פריט מחליפה רשתות בזמן אמת.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { mesh, G, glowTexture, flameTexture, drawnTexture, rand, TAU, addCharacterRim, contactShadow } from './kit.js';

const std = (color, rough = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const SKIN = std(0xd9a77a, 0.75);

function stripedTex(key, a, b, n = 8, vertical = false) {
  return drawnTexture(key, 128, (c, s) => {
    for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? b : a; if (vertical) c.fillRect((i * s) / n, 0, s / n + 1, s); else c.fillRect(0, (i * s) / n, s, s / n + 1); }
  });
}

/** בונה פריט לבוש → { head, torso, hips, hand, aura } */
export function buildWearable(id, ctx) {
  const out = {};
  switch (id) {
    // ---- כתרים וקסדות ----
    case 'crown_starter': {
      const g = new THREE.Group();
      const wood = std(0x7a5232, 0.8);
      g.add(mesh(G.torus(0.15, 0.025, 8, 24), wood, { rot: [Math.PI / 2, 0, 0] }));
      for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; g.add(mesh(G.cone(0.03, 0.08, 4), std(0x4a7a2a, 0.8), { pos: [Math.cos(a) * 0.15, 0.04, Math.sin(a) * 0.15], rot: [0, 0, Math.cos(a) * 0.3] })); }
      g.position.y = 0.08;
      out.head = g; break;
    }
    case 'crown_gold': {
      const g = new THREE.Group();
      const gold = std(0xf2c14e, 0.2, 1), ruby = std(0xd0102a, 0.1, 0.2, { emissive: 0x900010, emissiveIntensity: 0.8 });
      g.add(mesh(G.cyl(0.16, 0.15, 0.08, 24, true), new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.2, metalness: 1, side: THREE.DoubleSide })));
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.add(mesh(G.cone(0.035, 0.12, 4), gold, { pos: [Math.cos(a) * 0.155, 0.09, Math.sin(a) * 0.155] })); g.add(mesh(G.sph(0.022, 8, 6), ruby, { pos: [Math.cos(a) * 0.162, 0.0, Math.sin(a) * 0.162] })); }
      g.add(mesh(G.sph(0.04, 10, 8), ruby, { pos: [0, 0.03, 0.16] }));
      g.position.y = 0.1;
      out.head = g; break;
    }
    case 'helm_spartan': {
      const g = new THREE.Group();
      const bronze = std(0xb8833c, 0.3, 1), plume = std(0xb0121a, 0.8);
      g.add(mesh(new THREE.SphereGeometry(0.18, 20, 14, 0, TAU, 0, Math.PI * 0.62), bronze, { pos: [0, -0.01, 0] }));
      for (const s of [-1, 1]) g.add(mesh(G.box(0.05, 0.14, 0.12), bronze, { pos: [s * 0.14, -0.1, 0.06], rot: [0, s * 0.3, 0] }));
      g.add(mesh(G.box(0.03, 0.12, 0.03), bronze, { pos: [0, -0.07, 0.17] }));
      for (let i = 0; i < 12; i++) { const a = -0.3 + (i / 11) * Math.PI * 0.9; g.add(mesh(G.box(0.04, 0.14, 0.05), plume, { pos: [0, 0.16 + Math.sin(a) * 0.08, Math.cos(a) * 0.16], rot: [-a + Math.PI / 2, 0, 0] })); }
      g.position.y = 0.04;
      out.head = g; break;
    }
    case 'helm_samurai': {
      const g = new THREE.Group();
      const lac = std(0x141012, 0.3, 0.3), gold = std(0xf2c14e, 0.2, 1);
      g.add(mesh(new THREE.SphereGeometry(0.18, 20, 12, 0, TAU, 0, Math.PI / 2), lac));
      for (let k = 0; k < 3; k++) g.add(mesh(new THREE.CylinderGeometry(0.2 + k * 0.025, 0.22 + k * 0.03, 0.05, 20, 1, true, Math.PI * 0.25, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: k % 2 ? 0x8a1a1a : 0x141012, roughness: 0.4, side: THREE.DoubleSide }), { pos: [0, -0.02 - k * 0.045, 0] }));
      const horn = new THREE.Shape(); horn.moveTo(0, 0); horn.quadraticCurveTo(0.12, 0.08, 0.16, 0.3); horn.lineTo(0.13, 0.3); horn.quadraticCurveTo(0.08, 0.1, 0, 0.04);
      const hg = new THREE.ExtrudeGeometry(horn, { depth: 0.01, bevelEnabled: false });
      for (const s of [-1, 1]) { const h = mesh(hg, gold, { pos: [s * 0.02, 0.06, 0.15] }); h.scale.x = s; g.add(h); }
      g.add(mesh(G.sph(0.035, 10, 8), gold, { pos: [0, 0.08, 0.17] }));
      g.position.y = 0.03;
      out.head = g; break;
    }
    case 'crown_pharaoh': {
      const g = new THREE.Group();
      const stripes = new THREE.MeshStandardMaterial({ map: stripedTex('nemes', '#1c3c9e', '#f2c14e', 14), roughness: 0.5, side: THREE.DoubleSide });
      const gold = std(0xf2c14e, 0.2, 1);
      g.add(mesh(new THREE.SphereGeometry(0.19, 20, 12, 0, TAU, 0, Math.PI * 0.55), stripes));
      for (const s of [-1, 1]) g.add(mesh(G.box(0.07, 0.34, 0.14), stripes, { pos: [s * 0.17, -0.2, 0.03], rot: [0.1, 0, s * 0.12] }));
      g.add(mesh(G.box(0.3, 0.26, 0.05), stripes, { pos: [0, -0.16, -0.16], rot: [0.3, 0, 0] }));
      g.add(mesh(G.cyl(0.192, 0.192, 0.035, 24, true), new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.2, side: THREE.DoubleSide }), { pos: [0, -0.02, 0] }));
      const cobra = new THREE.Group();
      cobra.add(mesh(G.cyl(0.015, 0.02, 0.1, 6), gold, { pos: [0, 0.03, 0] }));
      cobra.add(mesh(G.sph(0.03, 8, 6), gold, { pos: [0, 0.09, 0.01], scale: [1.4, 1, 0.6] }));
      cobra.position.set(0, 0.02, 0.19);
      g.add(cobra);
      g.position.y = 0.04;
      out.head = g; break;
    }
    case 'visor_cyber': {
      const g = new THREE.Group();
      const visor = new THREE.MeshStandardMaterial({ color: 0x33f0ff, emissive: 0x33f0ff, emissiveIntensity: 2.2, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
      g.add(mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.06, 24, 1, true, -Math.PI * 0.35, Math.PI * 0.7), visor, { pos: [0, -0.03, 0], rot: [0, 0, 0] }));
      g.add(mesh(G.box(0.03, 0.08, 0.06), std(0x1a1c22, 0.3, 0.9), { pos: [0.18, -0.03, 0] }));
      g.add(mesh(G.cyl(0.006, 0.006, 0.16, 4), std(0x1a1c22, 0.3, 0.9), { pos: [0.19, 0.06, -0.02] }));
      g.add(mesh(G.sph(0.015, 8, 6), visor, { pos: [0.19, 0.14, -0.02] }));
      out.head = g;
      out.update = (dt, t) => { visor.emissiveIntensity = 1.8 + Math.sin(t * 6) * 0.5; };
      break;
    }
    // ---- גלימות ושריונות ----
    case 'tunic_starter': {
      const cloth = std(0xb8a07a, 0.95);
      out.torso = mesh(G.capsule(0.17, 0.3, 4, 12), cloth, { pos: [0, 0.22, 0], cast: true });
      out.hips = mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.42, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xa88e68, roughness: 0.95, side: THREE.DoubleSide }), { pos: [0, -0.16, 0], cast: true });
      break;
    }
    case 'cape_royal_velvet': {
      const velvet = new THREE.MeshPhysicalMaterial({ color: 0x8e0f1e, roughness: 0.85, side: THREE.DoubleSide, sheen: 1, sheenColor: 0xff6070 });
      const t = new THREE.Group();
      t.add(mesh(G.capsule(0.17, 0.3, 4, 12), std(0x5a0a14, 0.8), { pos: [0, 0.22, 0], cast: true }));
      const cape = mesh(new THREE.CylinderGeometry(0.24, 0.5, 1.15, 16, 4, true, Math.PI * 0.62, Math.PI * 0.76), velvet, { pos: [0, -0.08, -0.02], cast: true });
      t.add(cape);
      const ermine = new THREE.MeshStandardMaterial({ map: drawnTexture('ermine', 128, (c, s) => { c.fillStyle = '#f6f2ea'; c.fillRect(0, 0, s, s); c.fillStyle = '#111'; for (let i = 0; i < 18; i++) { c.beginPath(); c.ellipse(Math.random() * s, Math.random() * s, 3, 6, 0, 0, TAU); c.fill(); } }), roughness: 1 });
      t.add(mesh(G.torus(0.19, 0.06, 8, 20), ermine, { pos: [0, 0.48, 0], rot: [Math.PI / 2, 0, 0] }));
      out.torso = t;
      out.hips = mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.42, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a0a14, roughness: 0.85, side: THREE.DoubleSide }), { pos: [0, -0.16, 0] });
      break;
    }
    case 'armor_paladin': {
      const silver = std(0xd4dae4, 0.25, 1), gold = std(0xe8b84a, 0.25, 1), blue = std(0x1a3a8a, 0.7);
      const t = new THREE.Group();
      t.add(mesh(G.capsule(0.185, 0.3, 4, 14), silver, { pos: [0, 0.22, 0], cast: true }));
      t.add(mesh(G.box(0.2, 0.36, 0.02), blue, { pos: [0, 0.18, 0.18] }));
      t.add(mesh(G.box(0.05, 0.22, 0.025), gold, { pos: [0, 0.2, 0.195] }));
      t.add(mesh(G.box(0.15, 0.05, 0.025), gold, { pos: [0, 0.25, 0.196] }));
      for (const s of [-1, 1]) t.add(mesh(G.sph(0.1, 12, 10), silver, { pos: [s * 0.2, 0.42, 0], scale: [1.2, 0.8, 1.1], cast: true }));
      t.add(mesh(G.torus(0.18, 0.02, 6, 20), gold, { pos: [0, 0.02, 0], rot: [Math.PI / 2, 0, 0] }));
      out.torso = t;
      const h = new THREE.Group();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; h.add(mesh(G.box(0.14, 0.26, 0.02), silver, { pos: [Math.sin(a) * 0.2, -0.12, Math.cos(a) * 0.2], rot: [-0.15 * Math.cos(a), a, 0] })); }
      out.hips = h;
      break;
    }
    case 'armor_shogun': {
      const lac = std(0x141012, 0.35, 0.4), gold = std(0xe8b84a, 0.25, 1), red = std(0x8a1a1a, 0.6);
      const t = new THREE.Group();
      for (let k = 0; k < 5; k++) { t.add(mesh(G.cyl(0.19 - k * 0.005, 0.2 - k * 0.005, 0.08, 16), lac, { pos: [0, 0.05 + k * 0.085, 0], cast: true })); t.add(mesh(G.torus(0.198 - k * 0.005, 0.006, 4, 24), gold, { pos: [0, 0.09 + k * 0.085, 0], rot: [Math.PI / 2, 0, 0] })); }
      for (const s of [-1, 1]) { const sode = new THREE.Group(); for (let k = 0; k < 3; k++) sode.add(mesh(G.box(0.16, 0.05, 0.18), k % 2 ? red : lac, { pos: [0, -k * 0.055, 0] })); sode.position.set(s * 0.25, 0.4, 0); sode.rotation.z = s * 0.35; t.add(sode); }
      out.torso = t;
      const h = new THREE.Group();
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3; for (let k = 0; k < 3; k++) h.add(mesh(G.box(0.15, 0.06, 0.02), k % 2 ? red : lac, { pos: [Math.sin(a) * 0.22, -0.06 - k * 0.07, Math.cos(a) * 0.22], rot: [0, a, 0] })); }
      out.hips = h;
      break;
    }
    case 'robe_celestial': {
      const starTex = drawnTexture('starRobe', 256, (c, s) => { c.fillStyle = '#0e0a36'; c.fillRect(0, 0, s, s); for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(255,${220 + Math.random() * 35},${180 + Math.random() * 75},${0.4 + Math.random() * 0.6})`; c.beginPath(); c.arc(Math.random() * s, Math.random() * s, Math.random() * 1.8 + 0.4, 0, TAU); c.fill(); } });
      const robe = new THREE.MeshStandardMaterial({ map: starTex, emissive: 0xffffff, emissiveMap: starTex, emissiveIntensity: 0.7, roughness: 0.6, side: THREE.DoubleSide });
      const t = new THREE.Group();
      t.add(mesh(G.capsule(0.18, 0.3, 4, 12), robe, { pos: [0, 0.22, 0], cast: true }));
      t.add(mesh(G.torus(0.18, 0.03, 6, 20), std(0xf2c14e, 0.2, 1), { pos: [0, 0.47, 0], rot: [Math.PI / 2, 0, 0] }));
      out.torso = t;
      out.hips = mesh(new THREE.CylinderGeometry(0.18, 0.4, 0.8, 18, 1, true), robe, { pos: [0, -0.34, 0], cast: true });
      out.particles = { color: [0xffffff, 0xffe8b0, 0xb8a8ff], rate: 8 };
      break;
    }
    // ---- שרביטים ונשקים ----
    case 'staff_wood': {
      const g = new THREE.Group();
      const wood = std(0x6a4a2c, 0.85);
      g.add(mesh(G.cyl(0.022, 0.028, 1.5, 8), wood, { pos: [0, 0.2, 0], cast: true }));
      g.add(mesh(G.sph(0.05, 8, 6), wood, { pos: [0, 0.95, 0] }));
      out.hand = g; break;
    }
    case 'scepter_diamond': {
      const g = new THREE.Group();
      const gold = std(0xf2c14e, 0.18, 1);
      const diamond = new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: 0.02, metalness: 0, iridescence: 1, clearcoat: 1, emissive: 0x6ab8ff, emissiveIntensity: 0.4, flatShading: true });
      g.add(mesh(G.cyl(0.016, 0.02, 0.62, 8), gold, { pos: [0, 0.18, 0], cast: true }));
      g.add(mesh(G.torus(0.035, 0.01, 6, 14), gold, { pos: [0, 0.5, 0], rot: [Math.PI / 2, 0, 0] }));
      const d = mesh(G.octa(0.07), diamond, { pos: [0, 0.6, 0], scale: [1, 1.4, 1] });
      g.add(d);
      out.hand = g;
      out.update = (dt) => { d.rotation.y += dt * 1.6; };
      out.sparkleAt = d;
      break;
    }
    case 'sword_excalibur': {
      const g = new THREE.Group();
      const blade = std(0xe8f4ff, 0.1, 1, { emissive: 0x6ab8ff, emissiveIntensity: 0.9 });
      const gold = std(0xf2c14e, 0.2, 1);
      const bg = new THREE.BoxGeometry(0.05, 0.75, 0.012); const p = bg.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.3) p.setX(i, p.getX(i) * 0.25);
      bg.computeVertexNormals();
      g.add(mesh(bg, blade, { pos: [0, 0.5, 0], cast: true }));
      g.add(mesh(G.box(0.2, 0.025, 0.04), gold, { pos: [0, 0.12, 0] }));
      g.add(mesh(G.cyl(0.018, 0.018, 0.14, 8), std(0x3a2414, 0.7), { pos: [0, 0.04, 0] }));
      g.add(mesh(G.sph(0.028, 8, 6), gold, { pos: [0, -0.04, 0] }));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x8ac8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(0.3, 1.0, 1); glow.position.y = 0.5;
      g.add(glow);
      out.hand = g;
      out.update = (dt, t) => { glow.material.opacity = 0.35 + Math.sin(t * 4) * 0.15; };
      break;
    }
    case 'trident_atlantis': {
      const g = new THREE.Group();
      const shaft = std(0x3a8a80, 0.3, 0.9), gold = std(0xf2c14e, 0.2, 1, { emissive: 0x33f0ff, emissiveIntensity: 0.4 });
      g.add(mesh(G.cyl(0.018, 0.022, 1.4, 8), shaft, { pos: [0, 0.2, 0], cast: true }));
      g.add(mesh(G.box(0.22, 0.03, 0.03), gold, { pos: [0, 0.9, 0] }));
      for (const x of [-0.1, 0, 0.1]) { g.add(mesh(G.cyl(0.012, 0.014, x === 0 ? 0.3 : 0.22, 6), gold, { pos: [x, x === 0 ? 1.05 : 1.01, 0] })); g.add(mesh(G.cone(0.025, 0.07, 6), gold, { pos: [x, x === 0 ? 1.23 : 1.15, 0] })); }
      out.hand = g;
      out.sparkleAt = g.children[1];
      out.electric = true;
      break;
    }
    // ---- הילות ----
    case 'aura_golden_sparks':
      out.particles = { color: [0xffd36a, 0xffe9a8, 0xffffff], rate: 18, ring: 0.6 };
      break;
    case 'aura_fire_ring': {
      const g = new THREE.Group();
      const mat = new THREE.SpriteMaterial({ map: flameTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(mat); const a = (i / 12) * TAU; s.position.set(Math.cos(a) * 0.75, 0.25, Math.sin(a) * 0.75); s.scale.set(0.35, 0.55, 1); s.userData.a = a; g.add(s); }
      out.aura = g;
      out.update = (dt, t) => { g.rotation.y += dt * 0.8; g.children.forEach((s, i) => { s.scale.set(0.3 + Math.sin(t * 9 + i) * 0.06, 0.5 + Math.sin(t * 11 + i * 2) * 0.12, 1); }); };
      out.particles = { color: [0xff9a40, 0xffd060, 0xff5a20], rate: 10, ring: 0.75 };
      break;
    }
    case 'aura_cosmic_lightning': {
      const g = new THREE.Group();
      const mat = new THREE.LineBasicMaterial({ color: 0xb08aff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
      const bolts = [];
      for (let i = 0; i < 4; i++) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(10 * 3), 3)); const l = new THREE.Line(geo, mat); g.add(l); bolts.push(l); }
      const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x8a5aff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      orb.scale.setScalar(2.4); orb.position.y = 0.9;
      g.add(orb);
      let acc = 0;
      out.aura = g;
      out.update = (dt, t) => {
        acc += dt;
        orb.material.opacity = 0.28 + Math.sin(t * 5) * 0.1;
        if (acc < 0.09) return;
        acc = 0;
        bolts.forEach((b) => {
          const p = b.geometry.attributes.position;
          const a = rand(0, TAU), r = rand(0.5, 0.8);
          let x = Math.cos(a) * r, z = Math.sin(a) * r, y = rand(1.4, 2.0);
          for (let k = 0; k < 10; k++) { p.setXYZ(k, x, y, z); x += rand(-0.12, 0.12); z += rand(-0.12, 0.12); y -= rand(0.12, 0.22); }
          p.needsUpdate = true;
          b.visible = Math.random() > 0.3;
        });
      };
      break;
    }
    // ---- פיראטי הזמן (לבוש של אויבים, לא נמכר בחנות) ----
    case 'hat_tricorn': {
      const g = new THREE.Group();
      const felt = std(0x1a1620, 0.8);
      const gold = std(0xf2c14e, 0.25, 1);
      g.add(mesh(G.cyl(0.22, 0.24, 0.035, 3), felt, { pos: [0, 0.02, 0], rot: [0, Math.PI / 6, 0], cast: true }));
      g.add(mesh(G.cone(0.14, 0.16, 12), felt, { pos: [0, 0.1, 0], cast: true }));
      g.add(mesh(G.torus(0.14, 0.012, 6, 20), gold, { pos: [0, 0.04, 0], rot: [Math.PI / 2, 0, 0] }));
      // סמל שעון החול של פיראטי הזמן
      g.add(mesh(G.cone(0.03, 0.05, 6), std(0x9ff6ff, 0.2, 0, { emissive: 0x33e8ff, emissiveIntensity: 1.4 }), { pos: [0, 0.1, 0.14], rot: [Math.PI, 0, 0] }));
      g.add(mesh(G.cone(0.03, 0.05, 6), std(0x9ff6ff, 0.2, 0, { emissive: 0x33e8ff, emissiveIntensity: 1.4 }), { pos: [0, 0.05, 0.14] }));
      g.position.y = 0.06;
      out.head = g; break;
    }
    case 'coat_pirate': {
      const coat = new THREE.MeshStandardMaterial({ color: 0x5a1a2a, roughness: 0.8, side: THREE.DoubleSide });
      const t = new THREE.Group();
      t.add(mesh(G.capsule(0.175, 0.3, 4, 12), std(0x5a1a2a, 0.8), { pos: [0, 0.22, 0], cast: true }));
      for (let i = 0; i < 3; i++) t.add(mesh(G.sph(0.018, 6, 4), std(0xf2c14e, 0.25, 1), { pos: [0.05, 0.12 + i * 0.1, 0.17] }));
      t.add(mesh(G.box(0.36, 0.05, 0.36), std(0x2a1a14, 0.7), { pos: [0, 0.02, 0] }));
      out.torso = t;
      out.hips = mesh(new THREE.CylinderGeometry(0.19, 0.34, 0.5, 14, 1, true), coat, { pos: [0, -0.2, 0], cast: true });
      break;
    }
    case 'cutlass': {
      const g = new THREE.Group();
      const bg = new THREE.BoxGeometry(0.05, 0.62, 0.012); const pp = bg.attributes.position;
      for (let i = 0; i < pp.count; i++) { const y = pp.getY(i); pp.setX(i, pp.getX(i) + Math.pow(Math.max(0, y + 0.31), 2) * 0.12); }
      bg.computeVertexNormals();
      g.add(mesh(bg, std(0xd8e0ea, 0.15, 1, { emissive: 0x33e8ff, emissiveIntensity: 0.35 }), { pos: [0, 0.42, 0], cast: true }));
      g.add(mesh(G.torus(0.05, 0.012, 6, 12, Math.PI), std(0xf2c14e, 0.25, 1), { pos: [0, 0.08, 0.0], rot: [0, Math.PI / 2, 0] }));
      g.add(mesh(G.cyl(0.018, 0.018, 0.14, 8), std(0x2a1a14, 0.7), { pos: [0, 0.03, 0] }));
      out.hand = g; break;
    }
    default:
  }
  return out;
}

export class PlayerAvatar3D {
  constructor(sceneMgr, fx) {
    this.sm = sceneMgr;
    this.fx = fx;
    this.group = new THREE.Group();
    sceneMgr.world.add(this.group);
    this.throne = new THREE.Group();
    this.group.add(this.throne);
    this.buildThrone();
    this.buildBody();
    addCharacterRim(this.body);
    this.group.add(contactShadow(1.35, 0.6));
    this.items = {};
    this.lookTarget = new THREE.Vector3();
    this.pose = { stand: 0 };
    this.state = 'idle';
    this.time = rand(0, 10);
    this.applyPose();
    sceneMgr.onUpdate((dt, t) => this.update(dt, t));
  }

  buildThrone() {
    const t = this.throne;
    this.thMats = { base: std(0x3a3040, 0.6), body: std(0x5a1a24, 0.7), trim: std(0xe8b84a, 0.25, 1) };
    t.add(mesh(G.box(1.5, 0.18, 1.4), this.thMats.base, { pos: [0, 0.09, 0], cast: true, receive: true }));
    t.add(mesh(G.box(0.95, 0.36, 0.8), this.thMats.body, { pos: [0, 0.36, -0.05], cast: true }));
    t.add(mesh(G.box(0.95, 1.5, 0.14), this.thMats.body, { pos: [0, 1.0, -0.45], cast: true }));
    for (const s of [-1, 1]) {
      t.add(mesh(G.box(0.12, 0.3, 0.75), this.thMats.trim, { pos: [s * 0.52, 0.66, -0.05], cast: true }));
      t.add(mesh(G.cyl(0.05, 0.05, 1.7, 8), this.thMats.trim, { pos: [s * 0.5, 0.95, -0.47] }));
      t.add(mesh(G.sph(0.08, 10, 8), this.thMats.trim, { pos: [s * 0.5, 1.85, -0.47] }));
    }
    t.add(mesh(G.cone(0.16, 0.3, 4), this.thMats.trim, { pos: [0, 1.9, -0.45] }));
    t.add(mesh(G.torus(0.16, 0.03, 8, 20), this.thMats.trim, { pos: [0, 1.45, -0.37] }));
  }

  setEraMaterials(mats) {
    this.throne.children.forEach((m, i) => {
      if (!m.isMesh) return;
      if (i === 0) m.material = mats.dais; else if (i <= 2) m.material = mats.frame; else m.material = mats.trim;
    });
  }

  buildBody() {
    const b = new THREE.Group();
    this.body = b;
    this.group.add(b);
    const cloth = std(0x3a3448, 0.85);
    // חומרים פרטיים לכל דמות — כדי שלכל בוט יהיה גוון עור, שיער ובגד משלו
    this.skinMat = SKIN.clone(); this.hairMat = std(0x3a2418, 0.9); this.clothMat = cloth;
    const skin = this.skinMat;
    this.hips = new THREE.Group(); b.add(this.hips);
    this.hips.add(mesh(G.sph(0.17, 12, 10), cloth, { scale: [1, 0.6, 0.9] }));
    this.legs = [-1, 1].map((s) => {
      const thigh = new THREE.Group(); thigh.position.set(s * 0.1, -0.02, 0);
      thigh.add(mesh(G.cyl(0.07, 0.065, 0.45, 8), cloth, { pos: [0, -0.225, 0], cast: true }));
      const knee = new THREE.Group(); knee.position.y = -0.45; thigh.add(knee);
      knee.add(mesh(G.cyl(0.06, 0.05, 0.42, 8), cloth, { pos: [0, -0.21, 0], cast: true }));
      knee.add(mesh(G.box(0.1, 0.07, 0.2), std(0x2a1a10, 0.6), { pos: [0, -0.43, 0.04] }));
      this.hips.add(thigh);
      return { thigh, knee };
    });
    this.torso = new THREE.Group(); this.torso.position.y = 0.05; this.hips.add(this.torso);
    this.torsoBase = mesh(G.capsule(0.16, 0.28, 4, 12), cloth, { pos: [0, 0.22, 0], cast: true });
    this.torso.add(this.torsoBase);
    this.neck = new THREE.Group(); this.neck.position.y = 0.5; this.torso.add(this.neck);
    this.neck.add(mesh(G.cyl(0.05, 0.06, 0.08, 8), skin, {}));
    this.head = new THREE.Group(); this.head.position.y = 0.17; this.neck.add(this.head);
    this.head.add(mesh(G.sph(0.15, 18, 14), skin, { scale: [0.95, 1.08, 1], cast: true }));
    for (const s of [-1, 1]) this.head.add(mesh(G.sph(0.02, 8, 6), std(0x1a1210, 0.3), { pos: [s * 0.05, 0.02, 0.135] }));
    this.head.add(mesh(G.box(0.02, 0.04, 0.03), skin, { pos: [0, -0.02, 0.15] }));
    this.head.add(mesh(G.sph(0.12, 12, 10), this.hairMat, { pos: [0, 0.04, -0.04], scale: [1.05, 1, 1.05] }));
    this.headSlot = new THREE.Group(); this.headSlot.position.y = 0.07; this.head.add(this.headSlot);
    this.arms = [-1, 1].map((s) => {
      const sh = new THREE.Group(); sh.position.set(s * 0.21, 0.42, 0);
      sh.add(mesh(G.cyl(0.05, 0.045, 0.3, 8), cloth, { pos: [0, -0.15, 0], cast: true }));
      const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
      el.add(mesh(G.cyl(0.045, 0.04, 0.28, 8), cloth, { pos: [0, -0.14, 0], cast: true }));
      const hand = new THREE.Group(); hand.position.y = -0.3; el.add(hand);
      hand.add(mesh(G.sph(0.045, 8, 6), skin, {}));
      this.torso.add(sh);
      return { sh, el, hand, s };
    });
    this.weaponHandSlot = new THREE.Group();
    this.weaponHandSlot.rotation.x = Math.PI / 2;
    this.arms[1].hand.add(this.weaponHandSlot);
    this.bodyArmorSlot = new THREE.Group(); this.torso.add(this.bodyArmorSlot);
    this.hipArmorSlot = new THREE.Group(); this.hips.add(this.hipArmorSlot);
    this.auraSlot = new THREE.Group(); this.group.add(this.auraSlot);
    this.auraPulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd36a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.auraPulse.position.y = 1.0; this.auraPulse.scale.setScalar(2.6);
    this.group.add(this.auraPulse);
  }

  /** מראה: { skin, hair, cloth } (צבעים hex) — null = ברירת מחדל */
  setLook(look = {}) {
    this.skinMat.color.setHex(look.skin ?? 0xd9a77a);
    this.hairMat.color.setHex(look.hair ?? 0x3a2418);
    this.clothMat.color.setHex(look.cloth ?? 0x3a3448);
  }

  /** loadout: {head, armor, weapon, aura}; instant = בלי אנימציה (לתמונות ממוזערות) */
  setLoadout(loadout, { instant = false } = {}) {
    for (const slot of ['head', 'armor', 'weapon', 'aura']) {
      const id = loadout[slot];
      if (this.items[slot]?.id === id) continue;
      this.equip(slot, id, instant);
    }
  }

  equip(slot, id, instant = false) {
    const prev = this.items[slot];
    if (prev) prev.objects.forEach((o) => o.parent?.remove(o));
    const w = buildWearable(id);
    const objects = [];
    const attach = (obj, parent) => { if (!obj) return; addCharacterRim(obj); parent.add(obj); objects.push(obj); if (instant) return; obj.scale.setScalar(0.01); gsap.to(obj.scale, { x: 1, y: 1, z: 1, duration: 0.45, ease: 'back.out(2)' }); };
    if (slot === 'head') attach(w.head, this.headSlot);
    if (slot === 'armor') { attach(w.torso, this.bodyArmorSlot); attach(w.hips, this.hipArmorSlot); this.torsoBase.visible = !w.torso; }
    if (slot === 'weapon') attach(w.hand, this.weaponHandSlot);
    if (slot === 'aura') attach(w.aura, this.auraSlot);
    this.items[slot] = { id, objects, w };
    if (instant) return;
    const p = this.group.getWorldPosition(new THREE.Vector3());
    this.fx?.sparkle([p.x, p.y + 1.2, p.z], 16);
  }

  place(x, z, facing) {
    this.group.position.set(x, 0, z);
    this.group.rotation.set(0, facing, 0);
    this.group.userData.facing = facing;
  }

  lookAt(world) { if (world) this.lookTarget.copy(world); }

  applyPose() {
    const s = this.pose.stand;
    // ישיבה → עמידה
    this.hips.position.set(0, 0.6 + s * 0.38, 0.02 - s * 0.05);
    this.legs.forEach(({ thigh, knee }) => { thigh.rotation.x = -Math.PI / 2 * (1 - s); knee.rotation.x = Math.PI / 2 * (1 - s); });
    this.arms.forEach(({ sh, el, s: side }) => {
      if (this.armOverride) return;
      sh.rotation.set(-0.35 * (1 - s) - 0.1, 0, side * 0.12);
      el.rotation.set(-0.9 * (1 - s) - 0.3, 0, 0);
    });
  }

  setPose(stand, dur = 0.6) { gsap.to(this.pose, { stand, duration: dur, ease: 'power2.inOut', onUpdate: () => this.applyPose() }); }

  command() {
    const arm = this.arms[1];
    this.armOverride = true;
    gsap.killTweensOf([arm.sh.rotation, arm.el.rotation]);
    const tl = gsap.timeline({ onComplete: () => { this.armOverride = false; this.applyPose(); } });
    tl.to(arm.sh.rotation, { x: -1.7, z: 0.1, duration: 0.25, ease: 'power2.out' });
    tl.to(arm.el.rotation, { x: -0.1, duration: 0.25 }, 0);
    tl.to(arm.sh.rotation, { x: -0.45, duration: 0.5, ease: 'power2.inOut' }, 0.7);
    tl.to(arm.el.rotation, { x: -1.2, duration: 0.5 }, 0.7);
  }

  check() {
    this.setPose(1, 0.45);
    this.auraPulse.material.color.set(0xffd36a);
    gsap.fromTo(this.auraPulse.material, { opacity: 0.9 }, { opacity: 0, duration: 1.2, ease: 'power2.out' });
    gsap.fromTo(this.auraPulse.scale, { x: 1, y: 1, z: 1 }, { x: 3.4, y: 3.4, z: 3.4, duration: 1.2, ease: 'power2.out' });
    this.command();
    clearTimeout(this._sitT);
    this._sitT = setTimeout(() => { if (this.state === 'idle') this.setPose(0, 0.7); }, 1800);
  }

  victory() {
    this.state = 'victory';
    this.setPose(1, 0.5);
    const arm = this.arms[1], arm2 = this.arms[0];
    this.armOverride = true;
    gsap.killTweensOf([arm.sh.rotation, arm.el.rotation, arm2.sh.rotation]);
    gsap.to(arm.sh.rotation, { x: -2.9, duration: 0.4, ease: 'back.out(2)' });
    gsap.to(arm.el.rotation, { x: 0, duration: 0.4 });
    gsap.to(arm2.sh.rotation, { x: -2.4, z: -0.4, duration: 0.5, delay: 0.2 });
    this.danceTl = gsap.timeline({ repeat: -1, delay: 0.5 });
    this.danceTl.to(this.body.position, { y: 0.12, duration: 0.25, ease: 'power2.out' });
    this.danceTl.to(this.body.position, { y: 0, duration: 0.25, ease: 'power2.in' });
    const p = this.group.getWorldPosition(new THREE.Vector3());
    this.fx?.sparkle([p.x, p.y + 2, p.z], 40);
  }

  defeat() {
    this.state = 'defeat';
    gsap.to(this.head.rotation, { x: 0.6, duration: 0.9 });
    gsap.to(this.torso.rotation, { x: 0.3, duration: 0.9 });
  }

  emote(kind) {
    if (kind === 'crown' || kind === 'thumb') this.command();
    else if (kind === 'laugh') gsap.to(this.body.position, { y: 0.1, duration: 0.12, yoyo: true, repeat: 5 });
    else if (kind === 'angry') gsap.fromTo(this.head.rotation, { y: -0.3 }, { y: 0.3, duration: 0.1, yoyo: true, repeat: 5, onComplete: () => { this.head.rotation.y = 0; } });
    else if (kind === 'handshake') this.check();
    else gsap.to(this.head.rotation, { x: -0.25, duration: 0.2, yoyo: true, repeat: 1 });
  }

  reset() {
    this.state = 'idle';
    if (this.danceTl) { this.danceTl.kill(); this.danceTl = null; }
    this.armOverride = false;
    gsap.to(this.body.position, { y: 0, duration: 0.3 });
    gsap.to(this.head.rotation, { x: 0, y: 0, duration: 0.4 });
    gsap.to(this.torso.rotation, { x: 0, duration: 0.4 });
    this.setPose(0, 0.6);
  }

  update(dt, t) {
    this.time += dt;
    const tt = this.time;
    if (this.state !== 'defeat') this.torso.scale.y = 1 + Math.sin(tt * 1.8) * 0.015;
    const local = this.group.worldToLocal(this.lookTarget.clone());
    const yaw = Math.max(-0.8, Math.min(0.8, Math.atan2(local.x, local.z)));
    if (!gsap.isTweening(this.head.rotation) && this.state !== 'defeat') this.head.rotation.y += (yaw * 0.7 - this.head.rotation.y) * Math.min(1, dt * 2.5);
    if (!this.armOverride) this.arms[1].sh.rotation.z = 0.12 + Math.sin(tt * 1.3) * 0.04;
    Object.values(this.items).forEach((it) => {
      it.w.update?.(dt, tt);
      const P = it.w.particles;
      if (P && Math.random() < dt * P.rate) {
        const p = this.group.getWorldPosition(new THREE.Vector3());
        this.fx.add.emit({ count: 1, pos: [p.x, p.y + (P.ring ? 0.3 : 0.6), p.z], ring: P.ring ? [P.ring * 0.8, P.ring * 1.1] : undefined, spread: P.ring ? [0, 0.1, 0] : [0.35, 0.5, 0.35], vel: [0, 0.9, 0], velSpread: [0.15, 0.3, 0.15], color: P.color, size: [0.05, 0.12], life: [0.8, 1.6] });
      }
      if (it.w.electric && Math.random() < dt * 3) {
        const p = it.w.sparkleAt.getWorldPosition(new THREE.Vector3());
        this.fx.energy([p.x, p.y, p.z], 6, [0x9ffcff, 0xffffff, 0x33f0ff]);
      }
      if (it.w.sparkleAt && !it.w.electric && Math.random() < dt * 1.5) {
        const p = it.w.sparkleAt.getWorldPosition(new THREE.Vector3());
        this.fx.sparkle([p.x, p.y, p.z], 3, [0xffffff, 0x9ad8ff], 0.05);
      }
    });
  }
}
