/**
 * תפאורה מונפשת לאיי הפרימיום (100–129): קרקע ייחודית לכל אי, רצפת זירה, ואביזרים חיים
 * (מסלולים, סיבובים, ריחוף, זרימה, פעימות) — וגם תגובות למהלכים (onMove).
 * כל אי מוגדר בקובץ expansion/themes.js כפונקציה שמקבלת את עזרי הבמה.
 */
import * as THREE from 'three';
import { glowTexture, rand, TAU } from './kit.js';
import { M, GEO } from './expansion/stagekit.js';
import { THEMES } from './expansion/themes.js';

const V3 = THREE.Vector3;
const DEG = Math.PI / 180;

/** עזרי הבמה שכל אי מקבל */
class StageKit {
  constructor(root, ctx) {
    this.root = root;
    this.ctx = ctx;
    this.ups = [];
    this.moves = [];
    this.low = ctx.low;
  }
  mesh(geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, cast = false } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos); m.rotation.set(...rot);
    if (Array.isArray(scale)) m.scale.set(...scale); else m.scale.setScalar(scale);
    m.castShadow = cast;
    return m;
  }
  add(o) { this.root.add(o); return o; }
  group(...kids) { const g = new THREE.Group(); kids.forEach((k) => k && g.add(k)); return g; }
  /** מיקום בזווית (מעלות; ‎-90 = מאחורי הלוח) וברדיוס; האובייקט פונה אל מרכז הזירה */
  at(o, deg, r, y = 0, face = true) {
    const a = deg * DEG;
    o.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    if (face) o.rotation.y = -a - Math.PI / 2;
    return this.add(o);
  }
  /** n עותקים על קשת (ברירת מחדל: מאחורי הלוח ובצדדים, ובמראה גם מאחורי הצד השני) */
  arc(n, make, { from = -165, to = -15, r = 17, y = 0, jitter = 0, mirror = true } = {}) {
    const out = [];
    const put = (deg, i, k) => { const o = make(i, k); const rr = r + (jitter ? rand(-jitter, jitter) : 0); this.at(o, deg + (jitter ? rand(-jitter, jitter) * 2 : 0), rr, y); out.push(o); };
    for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); put(from + (to - from) * t, i, 0); }
    if (mirror && !this.low) for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); put(-(from + (to - from) * t), i + n, 1); }
    return out;
  }
  /** אביזרים בפינות שמאחורי העמדות — נראים במבט המשחק (שני זוגות: לכל צד מבט) */
  corners(make, { x = 5.8, z = 9.4, y = 0, scale = 1 } = {}) {
    const out = [];
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
      const o = make(sx, sz);
      if (!o) continue;
      o.position.set(sx * x, y, sz * z);
      o.rotation.y = Math.atan2(-sx * x, -sz * z);
      o.scale.multiplyScalar(scale);
      this.add(o);
      out.push(o);
    }
    return out;
  }
  every(fn) { this.ups.push(fn); }
  spin(o, s = 1, axis = 'y') { this.ups.push((dt) => { o.rotation[axis] += dt * s; }); return o; }
  bob(o, amp = 0.3, sp = 1, ph = rand(0, 6)) { const y0 = o.position.y; this.ups.push((dt, t) => { o.position.y = y0 + Math.sin(t * sp + ph) * amp; }); return o; }
  sway(o, amp = 0.08, sp = 1, axis = 'z', ph = rand(0, 6)) { const r0 = o.rotation[axis]; this.ups.push((dt, t) => { o.rotation[axis] = r0 + Math.sin(t * sp + ph) * amp; }); return o; }
  orbit(o, r, y, sp, ph = 0, wob = 0) {
    this.add(o);
    this.ups.push((dt, t) => { const a = t * sp + ph; o.position.set(Math.cos(a) * r, y + Math.sin(a * 3 + ph) * wob, Math.sin(a) * r); o.rotation.y = -a + (sp < 0 ? Math.PI : 0); });
    return o;
  }
  pulse(mat, base, amp, sp = 2, ph = 0, key = 'emissiveIntensity') { this.ups.push((dt, t) => { mat[key] = base + Math.sin(t * sp + ph) * amp; }); return mat; }
  flow(tex, du = 0, dv = 0) { this.ups.push((dt) => { tex.offset.x += du * dt; tex.offset.y += dv * dt; }); return tex; }
  onMove(fn) { this.moves.push(fn); }

  /** קרקע לכל האי (מעל הדשא) */
  ground(tex, { repeat = 7, rough = 0.85, metal = 0, emissive = null, ei = 0.6, color = 0xffffff } = {}) {
    const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
    const mat = M.std(color, rough, metal, { map: t, ...(emissive != null ? { emissive, emissiveMap: t, emissiveIntensity: ei } : {}) });
    const m = this.mesh(new THREE.CircleGeometry(26.6, 72), mat, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.012, 0] });
    m.receiveShadow = true;
    m.renderOrder = -2;
    this.add(m);
    return { mesh: m, mat, tex: t };
  }
  /** רצפת הזירה סביב הלוח (עיגול + שפה) */
  arena(tex, { repeat = 3, rough = 0.5, metal = 0, emissive = null, ei = 0.6, rim = 0xe8b84a, phys = false, clearcoat = 0, color = 0xffffff } = {}) {
    const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
    const o = { color, map: t, roughness: rough, metalness: metal, ...(emissive != null ? { emissive, emissiveMap: t, emissiveIntensity: ei } : {}) };
    const mat = phys ? M.phys({ ...o, clearcoat }) : M.std(color, rough, metal, o);
    const m = this.mesh(new THREE.CircleGeometry(12.4, 64), mat, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.03, 0] });
    m.receiveShadow = true;
    this.add(m);
    if (rim != null) this.add(this.mesh(GEO.tor(12.4, 0.16, 96), M.std(rim, 0.3, 0.8), { rot: [Math.PI / 2, 0, 0], pos: [0, 0.06, 0] }));
    return { mesh: m, mat, tex: t };
  }
  /** טבעת/קשת על הקרקע (נהר, לבה, מסילה) עם טקסטורה זורמת */
  band(tex, r0, r1, from, len, { y = 0.05, speed = 0.15, emissive = null, ei = 1, opacity = 1, color = 0xffffff, rough = 0.35, repeat = [6, 1] } = {}) {
    const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
    // הטבעת נבנית במישור XY ומושכבת — לכן הזווית מתהפכת
    const ts = -(from + len) * DEG, tl = len * DEG;
    const g = new THREE.RingGeometry(r0, r1, 72, 1, ts, tl);
    // UV לאורך הקשת (כדי שהזרימה תלך לאורך הנהר)
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      let a = Math.atan2(y, x); while (a < ts - 1e-4) a += TAU; while (a > ts + TAU) a -= TAU;
      uv.setXY(i, (a - ts) / tl, (Math.hypot(x, y) - r0) / (r1 - r0));
    }
    const mat = M.std(color, rough, 0, { map: t, transparent: opacity < 1, opacity, ...(emissive != null ? { emissive, emissiveMap: t, emissiveIntensity: ei } : {}) });
    const m = this.mesh(g, mat, { rot: [-Math.PI / 2, 0, 0], pos: [0, y, 0] });
    this.add(m);
    this.flow(t, -speed, 0);
    return { mesh: m, mat, tex: t };
  }
  /** הבהוב: מציג אובייקט לרגע (ברק, ניצוץ) */
  flash(o, ms = 140) { o.visible = true; clearTimeout(o.userData.flashT); o.userData.flashT = setTimeout(() => { o.visible = false; }, ms); }
}

// ---------- הבמה ----------
export class ExpansionStage {
  constructor(sm, ctx = {}) {
    this.sm = sm;
    this.ctx = ctx; // { board, weather, fx, sound }
    this.root = new THREE.Group();
    this.root.visible = false;
    sm.world.add(this.root);
    this.kit = null;
    sm.onUpdate((dt, t) => this.update(dt, t));
  }

  get active() { return !!this.kit; }

  /** מציג את התפאורה של אי פרימיום (או מנקה כש-id לא פרימיום) */
  show(id) {
    if (this.id === id && this.kit) return;
    this.clear();
    const theme = THEMES[id];
    if (!theme) return;
    this.id = id;
    const kit = new StageKit(this.root, { ...this.ctx, low: this.sm.quality?.level === 'low', id });
    try { theme(kit); } catch (e) { console.warn('expansion stage failed', id, e); }
    this.kit = kit;
    this.root.visible = true;
  }

  clear() {
    this.root.traverse((o) => {
      if (o.isMesh || o.isPoints || o.isLine) {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { if (!m) return; m.map?.dispose?.(); m.emissiveMap?.dispose?.(); m.dispose?.(); });
      }
      clearTimeout(o.userData?.flashT);
    });
    this.root.clear();
    this.root.visible = false;
    this.kit = null;
    this.id = 0;
  }

  update(dt, t) {
    const k = this.kit;
    if (!k || !this.root.visible) return;
    for (const fn of k.ups) fn(dt, t);
  }

  /** מהלך שבוצע על הלוח (mv של chess.js) */
  onMove(mv) {
    const k = this.kit;
    if (!k) return;
    for (const fn of k.moves) { try { fn(mv); } catch { /* תפאורה בלבד */ } }
  }
}

export { DEG, glowTexture };
export { M, T, GEO, merge, PROPS } from './expansion/stagekit.js';
