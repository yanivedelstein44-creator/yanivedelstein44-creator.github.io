/**
 * ThumbRenderer — תמונות ממוזערות תלת-ממדיות (פריטי לבוש, חיות מחמד, דיוקנאות בוטים) לכרטיסי החנות, המפה וה-HUD.
 * משתמש ב-renderer הראשי (בלי הקשר WebGL נוסף): מרנדר לסצנה נפרדת לתוך RenderTarget,
 * קורא את הפיקסלים ושומר כ-dataURL במטמון בזיכרון. העבודה רצה בתור — פריט אחד בכל פריים — כדי שהממשק לא יקפא.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildWearable, PlayerAvatar3D } from './PlayerAvatar3D.js';
import { buildPetRig } from './PetCompanion3D.js';
import { addCharacterRim } from './kit.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

export class ThumbRenderer {
  constructor(renderer) {
    this.r = renderer;
    this.cache = new Map();
    this.pending = new Map();
    this.chain = Promise.resolve();
  }

  has(key) { return this.cache.has(key); }
  get(key) { return this.cache.get(key) || null; }

  setup() {
    if (this.scene) return;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(this.r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pm.dispose();
    this.scene.add(new THREE.HemisphereLight(0xfff4e6, 0x2a2240, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(2.5, 4, 5); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xa8d4ff, 1.5); rim.position.set(-4, 2.5, -3); this.scene.add(rim);
    const warm = new THREE.DirectionalLight(0xffd2a0, 0.6); warm.position.set(-3, 1, 3); this.scene.add(warm);
    this.cam = new THREE.PerspectiveCamera(26, 1, 0.01, 60);
    this.holder = new THREE.Group();
    this.scene.add(this.holder);
  }

  /** תור: מרנדר פריט אחד בכל פריים */
  enqueue(key, size, build, frame) {
    if (this.cache.has(key)) return Promise.resolve(this.cache.get(key));
    if (this.pending.has(key)) return this.pending.get(key);
    const p = (this.chain = this.chain.then(async () => {
      await nextFrame();
      try {
        const url = this.renderNow(size, build, frame);
        this.cache.set(key, url);
        return url;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('thumb failed', key, err);
        return null;
      } finally { this.pending.delete(key); }
    }));
    this.pending.set(key, p);
    return p;
  }

  renderNow(size, build, frame = {}) {
    this.setup();
    const r = this.r;
    const S = Math.round(size);
    if (!this.rt || this.rt.width !== S) {
      this.rt?.dispose();
      this.rt = new THREE.WebGLRenderTarget(S, S, { samples: 4, colorSpace: THREE.SRGBColorSpace });
      this.buf = new Uint8Array(S * S * 4);
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.canvas.height = S;
      this.ctx2d = this.canvas.getContext('2d');
      this.img = this.ctx2d.createImageData(S, S);
    }
    const obj = build();
    this.holder.add(obj);
    obj.updateMatrixWorld(true);
    // מסגור: תיבה תוחמת בלי ספרייטים / שכבות זוהר שקופות
    const box = new THREE.Box3();
    obj.traverse((o) => {
      if (!o.isMesh || !o.visible || o.isSprite) return;
      const m = o.material;
      if (m && (m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.5))) return;
      o.geometry.computeBoundingBox();
      box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
    });
    if (box.isEmpty()) box.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1, 0.5));
    const center = frame.target ? new THREE.Vector3(...frame.target) : box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());
    // רדיוס הכדור התוחם (חצי האלכסון) — כך שום פינה לא נחתכת
    const radius = frame.radius || sz.length() * 0.5 * 1.04;
    const dir = new THREE.Vector3(...(frame.dir || [0.55, 0.32, 1])).normalize();
    const dist = radius / Math.sin(THREE.MathUtils.degToRad(this.cam.fov / 2));
    this.cam.position.copy(center).addScaledVector(dir, dist);
    this.cam.near = Math.max(0.01, dist - radius * 3); this.cam.far = dist + radius * 4;
    this.cam.lookAt(center);
    this.cam.updateProjectionMatrix();

    const prevRT = r.getRenderTarget();
    const prevColor = r.getClearColor(new THREE.Color());
    const prevAlpha = r.getClearAlpha();
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    r.render(this.scene, this.cam);
    r.readRenderTargetPixels(this.rt, 0, 0, S, S, this.buf);
    r.setRenderTarget(prevRT);
    r.setClearColor(prevColor, prevAlpha);
    this.holder.remove(obj);
    // היפוך אנכי (WebGL קורא מלמטה למעלה)
    const row = S * 4, d = this.img.data;
    for (let y = 0; y < S; y++) d.set(this.buf.subarray((S - 1 - y) * row, (S - y) * row), y * row);
    this.ctx2d.putImageData(this.img, 0, 0);
    return this.canvas.toDataURL('image/png');
  }

  // ---------- סוגי תמונות ----------
  /** פריט לבוש בודד */
  item(id, size = 256) {
    return this.enqueue(`item:${id}`, size, () => {
      const w = buildWearable(id);
      const g = new THREE.Group();
      if (w.head) g.add(w.head);
      if (w.torso || w.hips) {
        // שריון: גו + מותניים באותו יחס כמו על הדמות
        if (w.hips) g.add(w.hips);
        if (w.torso) { const t = new THREE.Group(); t.position.y = 0.05; t.add(w.torso); g.add(t); }
      }
      if (w.hand) { w.hand.rotation.z = -0.72; g.add(w.hand); }
      if (w.aura) g.add(w.aura);
      w.update?.(0.016, 1);
      addCharacterRim(g);
      return g;
    }, { dir: [0.5, 0.28, 1] });
  }

  /** חיית מחמד (עם גוון אופציונלי) */
  pet(id, size = 256, variant = {}) {
    const hue = Math.round((variant.hue || 0) * 100) / 100;
    return this.enqueue(`pet:${id}${hue ? `:${hue}` : ''}`, size, () => buildPetRig(id, { hue }).root, { dir: [0.75, 0.35, 1] });
  }

  /** דיוקן דמות (פלג גוף עליון) עם לבוש ומראה */
  avatar(key, loadout, look, size = 256) {
    return this.enqueue(`avatar:${key}`, size, () => {
      const g = new THREE.Group();
      const fakeSm = { world: g, onUpdate: () => {} };
      const a = new PlayerAvatar3D(fakeSm, null);
      a.setLook(look || {});
      a.setLoadout(loadout, { instant: true });
      gsap.killTweensOf(a.pose);
      a.applyPose();
      a.head.rotation.y = -0.22;
      return g;
    }, { target: [0, 1.2, 0], radius: 0.6, dir: [-0.5, 0.16, 1] });
  }
}
