/**
 * בונה הממלכה: מציג את מבני העידן, מגביה שלבים חדשים מהאדמה,
 * ומבצע "אבולוציית עידן" עם גל הלם זהוב שמחליף רצפות, חומרים ותאורה.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { ERAS, getEra } from '../config/Eras.js';
import { eraMaterials } from './Materials.js';
import { addRadialClip } from './kit.js';
import era01 from './eras/era01_stone.js';
import era02 from './eras/era02_classical.js';
import era03 from './eras/era03_medieval.js';
import era04 from './eras/era04_industrial.js';
import era05 from './eras/era05_cyber.js';
import era06 from './eras/era06_samurai.js';
import era07 from './eras/era07_egypt.js';
import era08 from './eras/era08_viking.js';
import era09 from './eras/era09_atlantis.js';
import era10 from './eras/era10_celestial.js';

const MODULES = [era01, era02, era03, era04, era05, era06, era07, era08, era09, era10];
const box = new THREE.Box3();
const v = new THREE.Vector3();
const ray = new THREE.Ray();
const hit = new THREE.Vector3();
const OCC_TARGETS = [[0, 0.6, 0], [-4.4, 0.6, 4.4], [4.4, 0.6, 4.4], [-4.4, 0.6, -4.4], [4.4, 0.6, -4.4]].map((a) => new THREE.Vector3(...a));

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry && !o.geometry.userData?.cached && !o.geometry.parameters?.__shared) o.geometry.dispose?.();
  });
}

export class KingdomBuilder {
  constructor(sceneMgr, fx, board, shockwave) {
    this.sm = sceneMgr;
    this.fx = fx;
    this.board = board;
    this.shock = shockwave;
    this.root = new THREE.Group();
    sceneMgr.world.add(this.root);
    this.eraId = 0;
    this.floor = null;
    this.sets = [];
    sceneMgr.onUpdate((dt, t) => this.update(dt, t));
  }

  ctx(eraId) {
    return { sm: this.sm, fx: this.fx, mats: eraMaterials(getEra(eraId).key), eraId };
  }

  owner(idx) { return `era${this.eraId}-${idx}`; }

  makeFloor(eraId) {
    const f = MODULES[eraId - 1].floor(this.ctx(eraId));
    if (!f) return null;
    f.traverse((o) => { if (o.isMesh) { const mats = Array.isArray(o.material) ? o.material : [o.material]; mats.forEach((m) => addRadialClip(m)); } });
    return f;
  }

  setClip(obj, mode, r) {
    if (!obj) return;
    obj.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { if (m.userData.clip) { m.userData.clip.uClipMode.value = mode; m.userData.clip.uClipR.value = r; } });
    });
  }

  buildSet(eraId, idx) {
    const set = MODULES[eraId - 1].stages[idx](this.ctx(eraId));
    set.idx = idx;
    return set;
  }

  claimLights(set) {
    set.lights.forEach((cfg) => this.sm.claimLight(this.owner(set.idx), cfg));
  }

  // ---------- תצוגה מיידית ----------
  show(eraId, built, { instantPalette = true } = {}) {
    this.clear();
    this.eraId = eraId;
    const era = getEra(eraId);
    this.floor = this.makeFloor(eraId);
    if (this.floor) this.root.add(this.floor);
    for (let i = 0; i < built; i++) {
      const set = this.buildSet(eraId, i);
      this.root.add(set.group);
      this.claimLights(set);
      this.sets.push(set);
    }
    this.sm.applyPalette(era.palette, instantPalette ? 0 : 1.2);
    this.sets.forEach((s) => s.onShow?.());
    this.board.setEra(era.key, { instant: true });
    this.onEraReady?.(eraId, built);
  }

  clear() {
    this.sets.forEach((s) => { s.onHide?.(); this.sm.releaseLights(this.owner(s.idx)); this.root.remove(s.group); disposeTree(s.group); });
    this.sets = [];
    if (this.floor) { this.root.remove(this.floor); disposeTree(this.floor); this.floor = null; }
  }

  // ---------- הנפשות ----------
  prepareParts(set) {
    for (const p of set.parts) {
      const o = p.obj;
      if (p.mode === 'rise') {
        box.setFromObject(o);
        const h = p.depth ?? Math.max(1, box.max.y - box.min.y);
        o.userData.baseY = o.position.y;
        o.userData.depth = h + 0.4;
        o.position.y = o.userData.baseY - o.userData.depth;
        o.userData.rising = true;
        o.visible = false;
      } else if (p.mode === 'scale') {
        o.userData.baseScale = o.scale.clone();
        o.scale.setScalar(0.001);
        o.userData.rising = true;
      } else if (p.mode === 'fade') {
        o.userData.fades = [];
        o.traverse((m) => {
          if (!m.material) return;
          const mt = m.material;
          if (mt.uniforms?.uOpacity) { o.userData.fades.push({ obj: mt.uniforms.uOpacity, key: 'value', to: mt.uniforms.uOpacity.value }); mt.uniforms.uOpacity.value = 0; }
          else { o.userData.fades.push({ obj: mt, key: 'opacity', to: mt.opacity }); mt.transparent = true; mt.opacity = 0; }
        });
      }
    }
  }

  /** מגביה את חלקי השלב. hooks.onLand(part) לכל חלק שנחת */
  riseSet(set, { speed = 1, hooks = {} } = {}) {
    this.prepareParts(set);
    const maxDelay = Math.max(0, ...set.parts.map((p) => p.delay));
    const durRise = 1.15 / speed;
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      set.parts.forEach((p) => {
        const o = p.obj;
        const at = p.delay / speed;
        if (p.mode === 'rise') {
          tl.add(() => {
            o.visible = true;
            box.setFromObject(o);
            box.getCenter(v);
            const size = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
            const wp = this.root.localToWorld(v.clone());
            this.fx.dust([wp.x, 0.2, wp.z], Math.min(40, 10 + size * 3), 0xb8a68a, Math.min(2.4, 0.6 + size * 0.15));
            this.sm.addShake(Math.min(0.18, 0.04 + size * 0.008));
          }, at);
          tl.to(o.position, {
            y: o.userData.baseY, duration: durRise, ease: 'back.out(1.15)',
            onComplete: () => {
              o.userData.rising = false;
              box.setFromObject(o);
              box.getCenter(v);
              this.fx.sparkle([v.x, box.max.y, v.z], 14);
              hooks.onLand?.(p);
            },
          }, at);
        } else if (p.mode === 'scale') {
          const bs = o.userData.baseScale;
          tl.to(o.scale, { x: bs.x, y: bs.y, z: bs.z, duration: 0.9 / speed, ease: 'elastic.out(1, 0.55)', onStart: () => { o.getWorldPosition(v); this.fx.sparkle([v.x, v.y + 0.5, v.z], 16); }, onComplete: () => { o.userData.rising = false; } }, at);
        } else if (p.mode === 'fade') {
          (o.userData.fades || []).forEach((f) => tl.to(f.obj, { [f.key]: f.to, duration: 1.4 / speed, ease: 'sine.inOut' }, at));
        }
      });
      if (!set.parts.length) tl.to({}, { duration: 0.1 });
      tl.to({}, { duration: 0.05 }, maxDelay / speed + durRise);
    });
  }

  sinkAll(speed = 1) {
    if (!this.sets.length) return Promise.resolve();
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      this.sets.forEach((set) => {
        set.parts.forEach((p, i) => {
          const o = p.obj;
          const at = (i * 0.03) / speed;
          if (p.mode === 'rise') {
            box.setFromObject(o);
            const h = Math.max(1, box.max.y - box.min.y) + 0.5;
            o.userData.rising = true;
            tl.to(o.position, { y: o.position.y - h, duration: 0.8 / speed, ease: 'power2.in', onStart: () => { box.getCenter(v); this.fx.dust([v.x, 0.2, v.z], 12, 0x9a8a70, 1.2); } }, at);
          } else {
            o.userData.rising = true;
            tl.to(o.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.6 / speed, ease: 'power2.in' }, at);
          }
        });
      });
      this.sm.addShake(0.12);
    });
  }

  /** שלב חדש בתוך העידן הנוכחי */
  async raiseStage(eraId, idx, { cinematic = true, hooks = {} } = {}) {
    if (eraId !== this.eraId) return this.evolve(eraId, idx + 1, { raiseFrom: idx, cinematic, hooks });
    const set = this.buildSet(eraId, idx);
    this.root.add(set.group);
    this.sets.push(set);
    const focus = MODULES[eraId - 1].focus[idx];
    hooks.onRiseStart?.();
    const cam = cinematic ? this.sm.cinematicOrbit({ target: focus.target, radius: focus.radius, polar: focus.polar, fromAz: focus.from, toAz: focus.to, duration: 4.6 }) : Promise.resolve();
    await new Promise((r) => setTimeout(r, cinematic ? 700 : 0));
    await this.riseSet(set, { hooks });
    this.claimLights(set);
    set.onShow?.();
    this.onEraReady?.(eraId, idx + 1);
    await cam;
  }

  /**
   * אבולוציית עידן: שקיעת הישן → גל הלם (רצפה/לוח/תאורה מתחלפים) → הגבהת שלבי העידן החדש.
   * raiseFrom: מאיזה אינדקס שלב להנפיש (קודמים מופיעים מהר); לסיור בעידנים — 0.
   */
  async evolve(eraId, built, { raiseFrom = 0, cinematic = true, hooks = {}, speed = 1 } = {}) {
    const era = getEra(eraId);
    const prevFloor = this.floor;
    if (cinematic) this.sm.cinematicOrbit({ target: [0, 1, -1], radius: this.sm.view.radius * 1.35, polar: 52, fromAz: this.sm.view.azimuth - 0.9, toAz: this.sm.view.azimuth + 0.7, duration: 5.4 / speed });
    hooks.onSink?.();
    this.onEraLeave?.();
    await this.sinkAll(speed);
    this.sets.forEach((s) => { s.onHide?.(); this.sm.releaseLights(this.owner(s.idx)); this.root.remove(s.group); disposeTree(s.group); });
    this.sets = [];
    this.eraId = eraId;
    // רצפה חדשה מתגלה בתוך גל ההלם, הישנה נשארת בחוץ
    const newFloor = this.makeFloor(eraId);
    if (newFloor) { this.root.add(newFloor); this.setClip(newFloor, 1, 0.01); }
    if (prevFloor) this.setClip(prevFloor, -1, 0.01);
    this.board.setEra(era.key, { instant: false });
    this.sm.applyPalette(era.palette, 1.9 / speed);
    hooks.onShock?.();
    await this.shock.play({
      duration: 1.9 / speed, maxR: 30,
      onRadius: (r) => {
        this.board.morphTo(r);
        if (newFloor) this.setClip(newFloor, 1, r);
        if (prevFloor) this.setClip(prevFloor, -1, r);
      },
    });
    if (prevFloor) { this.root.remove(prevFloor); disposeTree(prevFloor); }
    if (newFloor) this.setClip(newFloor, 0, 1e5);
    this.floor = newFloor;
    this.board.morphTo(99);
    hooks.onEraShown?.(era);
    // שלבים שנבנו קודם (מופיעים מהר) ואז השלב החדש
    for (let i = 0; i < built; i++) {
      const set = this.buildSet(eraId, i);
      this.root.add(set.group);
      this.sets.push(set);
      const fast = i < raiseFrom;
      if (i === raiseFrom) hooks.onRiseStart?.();
      await this.riseSet(set, { speed: fast ? 2.2 : speed, hooks: fast ? {} : hooks });
      this.claimLights(set);
      set.onShow?.();
    }
    this.onEraReady?.(eraId, built);
  }

  /** שקיפות למבנים שמסתירים את הלוח מהמצלמה (למשל במבט מצד השחור) */
  updateOcclusion(dt) {
    this.occT = (this.occT || 0) + dt;
    if (this.occT < 0.15) return;
    this.occT = 0;
    const cam = this.sm.camera.position;
    for (const set of this.sets) {
      for (const p of set.parts) {
        const o = p.obj;
        if (o.userData.rising || !o.visible || o.userData.noOcc) continue;
        if (!p.occBox || o.userData.dynamic) { p.occBox = new THREE.Box3().setFromObject(o); }
        let occ = false;
        const inside = p.occBox.containsPoint(cam);
        if (inside) occ = true;
        else {
          for (const tg of OCC_TARGETS) {
            const len = cam.distanceTo(tg);
            ray.origin.copy(cam); ray.direction.copy(tg).sub(cam).normalize();
            if (ray.intersectBox(p.occBox, hit) && hit.distanceTo(cam) < len - 0.5) { occ = true; break; }
          }
        }
        if (occ !== !!p.faded) { p.faded = occ; this.fade(o, occ); }
      }
    }
  }

  fade(obj, on) {
    obj.traverse((m) => {
      if (!m.isMesh && !m.isSprite && !m.isLine) return;
      if (on) {
        if (!m.userData.occOrig) {
          m.userData.occOrig = m.material;
          const c = m.material.clone();
          if (m.material.userData?.clip) c.userData.clip = m.material.userData.clip;
          c.transparent = true; c.depthWrite = false;
          m.userData.occBaseOpacity = m.material.opacity ?? 1;
          m.material = c;
        }
        gsap.to(m.material, { opacity: Math.min(0.18, m.userData.occBaseOpacity), duration: 0.35, overwrite: true });
      } else if (m.userData.occOrig) {
        gsap.to(m.material, { opacity: m.userData.occBaseOpacity, duration: 0.35, overwrite: true, onComplete: () => {
          if (!m.userData.occOrig) return;
          const tmp = m.material; m.material = m.userData.occOrig; m.userData.occOrig = null; tmp.dispose?.();
        } });
      }
    });
  }

  update(dt, t) {
    this.updateOcclusion(dt);
    if (this.floor?.userData?.update) this.floor.userData.update(dt, t);
    this.floor?.children?.forEach((c) => c.userData.update?.(dt, t));
    for (const s of this.sets) s.update(dt, t, this);
  }
}

export { ERAS };
