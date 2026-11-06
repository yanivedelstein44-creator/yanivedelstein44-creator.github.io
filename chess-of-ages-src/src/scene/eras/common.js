/**
 * עזרים משותפים לבוני העידנים: StageSet, להבות, מזרקות, דגלים מתנופפים ורצפות.
 */
import * as THREE from 'three';
import { mesh, G, flameTexture, glowTexture, drawnTexture, rand, TAU } from '../kit.js';

export const std = (color, roughness = 0.7, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
export const glowMat = (color, intensity = 1.5, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, ...extra });
export const additive = (color, opacity = 0.8, map = null) => new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });

/** אוסף מבנים של שלב אחד */
export class StageSet {
  constructor() {
    this.group = new THREE.Group();
    this.parts = [];
    this.updaters = [];
    this.lights = [];
  }
  /** mode: 'rise' (עולה מהאדמה) | 'scale' (גדל) | 'fade' */
  part(obj, { delay = 0, mode = 'rise', depth = null } = {}) {
    this.group.add(obj);
    this.parts.push({ obj, delay, mode, depth });
    return obj;
  }
  add(obj) { this.group.add(obj); return obj; }
  onUpdate(fn) { this.updaters.push(fn); }
  light(cfg) { this.lights.push(cfg); }
  update(dt, t, ctx) { for (const fn of this.updaters) fn(dt, t, ctx); }
}

/** להבה מונפשת (ספרייטים + גחלים) */
export function flame(set, ctx, pos, scale = 1, { embers = true, color = 0xffffff, smoke = false } = {}) {
  const g = new THREE.Group();
  g.position.set(...pos);
  const mat = new THREE.SpriteMaterial({ map: flameTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const sprites = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Sprite(mat.clone());
    s.scale.set(0.7 * scale, 1.1 * scale, 1);
    s.position.y = 0.45 * scale;
    s.userData.ph = rand(0, 10);
    g.add(s);
    sprites.push(s);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff8a30, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.scale.setScalar(2.6 * scale);
  glow.position.y = 0.4 * scale;
  g.add(glow);
  let acc = 0;
  set.onUpdate((dt, t) => {
    sprites.forEach((s, i) => {
      const k = 1 + Math.sin(t * 13 + s.userData.ph) * 0.12 + Math.sin(t * 29 + i) * 0.07;
      s.scale.set((0.62 + i * 0.08) * scale * k, (1.05 - i * 0.12) * scale * (2 - k), 1);
      s.material.rotation = Math.sin(t * 3 + i) * 0.12;
    });
    glow.material.opacity = 0.45 + Math.sin(t * 17) * 0.08;
    if (!g.visible || !set.group.visible) return;
    acc += dt;
    const wp = g.getWorldPosition(new THREE.Vector3());
    if (embers && acc > 0.12) {
      acc = 0;
      ctx.fx.embers([wp.x, wp.y + 0.6 * scale, wp.z], 1);
      if (smoke && Math.random() < 0.4) ctx.fx.smoke([wp.x, wp.y + 1.2 * scale, wp.z], 1, 0x4a4440, 0.22);
    }
  });
  return g;
}

/** מזרקה עם סילון חלקיקים ומשטח מים מונפש */
export function fountain(set, ctx, pos, stoneMat, { scale = 1, waterColor = 0x7fd8ff, trimMat = null } = {}) {
  const g = new THREE.Group();
  g.position.set(...pos);
  const basin = mesh(G.lathe('basin', [[0, 0], [1.6, 0], [1.7, 0.1], [1.7, 0.55], [1.5, 0.6], [1.45, 0.25], [0, 0.25]], 40), stoneMat, { cast: true, receive: true });
  const col = mesh(G.lathe('fcol', [[0, 0], [0.32, 0], [0.22, 0.2], [0.18, 1.0], [0.6, 1.15], [0.7, 1.3], [0.2, 1.3], [0.14, 1.6], [0.32, 1.75], [0.36, 1.85], [0, 1.88]], 28), trimMat || stoneMat, { cast: true });
  const waterMat = new THREE.MeshStandardMaterial({ color: waterColor, transparent: true, opacity: 0.75, roughness: 0.05, metalness: 0.2, emissive: waterColor, emissiveIntensity: 0.25 });
  const water = mesh(new THREE.CircleGeometry(1.48, 40), waterMat, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.48, 0] });
  const water2 = mesh(new THREE.CircleGeometry(0.6, 24), waterMat, { rot: [-Math.PI / 2, 0, 0], pos: [0, 1.26, 0] });
  g.add(basin, col, water, water2);
  g.scale.setScalar(scale);
  let acc = 0;
  set.onUpdate((dt, t) => {
    water.position.y = 0.48 + Math.sin(t * 2) * 0.01;
    waterMat.emissiveIntensity = 0.2 + Math.sin(t * 3) * 0.08;
    if (!set.group.visible) return;
    acc += dt;
    if (acc > 0.035) {
      acc = 0;
      const wp = g.getWorldPosition(new THREE.Vector3());
      ctx.fx.add.emit({ count: 3, pos: [wp.x, wp.y + 1.9 * scale, wp.z], spread: [0.04, 0.02, 0.04], vel: [0, 3.2 * scale, 0], velSpread: [0.9, 0.4, 0.9], color: [0xcff4ff, 0x8fdcff, 0xffffff], size: [0.07, 0.14], life: [0.8, 1.1], gravity: 7 * scale, alpha: 0.7 });
    }
  });
  return g;
}

/** דגל/כרזה מתנופפת (עדכון קודקודים ב-CPU) */
export function banner(set, w, h, mat, { segX = 8, segY = 14, amp = 0.18, speed = 2.6, hangTop = true } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, segX, segY);
  geo.translate(0, hangTop ? -h / 2 : 0, 0);
  const pos = geo.attributes.position;
  const orig = Float32Array.from(pos.array);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  const ph = rand(0, 10);
  set.onUpdate((dt, t) => {
    for (let i = 0; i < pos.count; i++) {
      const x = orig[i * 3], y = orig[i * 3 + 1];
      const k = hangTop ? Math.min(1, (-y) / h + 0.15) : (x + w / 2) / w;
      pos.array[i * 3 + 2] = Math.sin(t * speed + ph + (hangTop ? y * 2.2 + x * 1.5 : x * 2.4 + y)) * amp * k;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return m;
}

export function bannerTexture(key, bg, fg, emblem = 'crown') {
  return drawnTexture(key, 256, (ctx, w, hh) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, hh);
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, w, 18); ctx.fillRect(0, hh - 30, w, 12);
    ctx.fillRect(10, 0, 8, hh); ctx.fillRect(w - 18, 0, 8, hh);
    ctx.save(); ctx.translate(w / 2, hh * 0.42);
    ctx.fillStyle = fg;
    if (emblem === 'crown') {
      ctx.beginPath(); ctx.moveTo(-60, 30); ctx.lineTo(-60, -20); ctx.lineTo(-30, 10); ctx.lineTo(0, -40); ctx.lineTo(30, 10); ctx.lineTo(60, -20); ctx.lineTo(60, 30); ctx.closePath(); ctx.fill();
      ctx.fillRect(-62, 34, 124, 14);
    } else if (emblem === 'sun') {
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillRect(-4, -70, 8, 30); }
      ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.fill();
    } else if (emblem === 'raven') {
      ctx.beginPath(); ctx.ellipse(0, 0, 50, 22, -0.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(30, -14); ctx.lineTo(70, -20); ctx.lineTo(40, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(-70, -60); ctx.lineTo(-10, 0); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = fg;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(i * (w / 6), hh - 18); ctx.lineTo((i + 0.5) * (w / 6), hh); ctx.lineTo((i + 1) * (w / 6), hh - 18); ctx.fill(); }
  }, { h: 512 });
}

/** רצפת חצר ריבועית */
export function floorPlane(size, material, y = 0.03) {
  const m = mesh(new THREE.PlaneGeometry(size, size), material, { rot: [-Math.PI / 2, 0, 0], pos: [0, y, 0], receive: true });
  return m;
}

/** מיקומים על טבעת, תוך דילוג על אזור האווטארים מקדימה/מאחור */
export function ringPositions(n, r, { skipFront = true, offset = 0 } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = offset + (i / n) * TAU;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (skipFront && Math.abs(x) < 5 && Math.abs(z) > r * 0.8) continue;
    out.push({ x, z, a });
  }
  return out;
}

export { mesh, G, rand, TAU };
