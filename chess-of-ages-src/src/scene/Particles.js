/**
 * מערכת חלקיקים קלה (Points + שיידר) — אבק, ניצוצות, גחלים, מים, קיטור, שלג, עלי דובדבן ועוד.
 * מאגר קבוע, עדכון ב-CPU, קריאת ציור אחת לכל מערכת.
 */
import * as THREE from 'three';
import { glowTexture } from './kit.js';

const VERT = `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
uniform float uScale; varying vec4 vC;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
  vC = vec4(aColor, aAlpha);
}`;
const FRAG = `
uniform sampler2D uMap; varying vec4 vC;
void main(){
  vec4 t = texture2D(uMap, gl_PointCoord);
  gl_FragColor = vec4(vC.rgb * t.rgb, vC.a * t.a);
  if (gl_FragColor.a < 0.004) discard;
  #include <colorspace_fragment>
}`;

const tmpC = new THREE.Color();
const R = (v) => (Array.isArray(v) ? v[0] + Math.random() * (v[1] - v[0]) : v);

export class ParticleSystem {
  constructor(parent, { max = 2000, additive = true, texture = glowTexture() } = {}) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.base = new Float32Array(max);
    this.baseA = new Float32Array(max);
    this.swirl = new Float32Array(max);
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = { uScale: { value: 600 }, uMap: { value: texture } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 5 : 4;
    parent.add(this.points);
    this.geo = geo;
    this.active = 0;
  }

  /**
   * @param {object} o count,pos,spread,vel,velSpread,color(hex|hex[]),size,life,gravity,drag,grow,alpha,swirl
   */
  emit(o) {
    const n = Math.max(1, Math.round(o.count || 1));
    const p = o.pos || [0, 0, 0], s = o.spread || [0, 0, 0], v = o.vel || [0, 0, 0], vs = o.velSpread || [0, 0, 0];
    const colors = Array.isArray(o.color) ? o.color : [o.color ?? 0xffffff];
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      let ox = (Math.random() * 2 - 1) * s[0], oy = (Math.random() * 2 - 1) * s[1], oz = (Math.random() * 2 - 1) * s[2];
      if (o.ring) { const a = Math.random() * Math.PI * 2; const r = R(o.ring); ox = Math.cos(a) * r; oz = Math.sin(a) * r; }
      this.pos[i * 3] = p[0] + ox; this.pos[i * 3 + 1] = p[1] + oy; this.pos[i * 3 + 2] = p[2] + oz;
      let vx = v[0] + (Math.random() * 2 - 1) * vs[0], vy = v[1] + (Math.random() * 2 - 1) * vs[1], vz = v[2] + (Math.random() * 2 - 1) * vs[2];
      if (o.radial) { const len = Math.hypot(ox, oy, oz) || 1; const sp = R(o.radial); vx += (ox / len) * sp; vy += (oy / len) * sp; vz += (oz / len) * sp; }
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      tmpC.set(colors[Math.floor(Math.random() * colors.length)]);
      this.col[i * 3] = tmpC.r; this.col[i * 3 + 1] = tmpC.g; this.col[i * 3 + 2] = tmpC.b;
      this.base[i] = R(o.size ?? 0.3);
      this.size[i] = this.base[i];
      this.maxLife[i] = R(o.life ?? 1);
      this.life[i] = this.maxLife[i];
      this.grav[i] = o.gravity ?? 0;
      this.drag[i] = o.drag ?? 0;
      this.grow[i] = o.grow ?? 0;
      this.baseA[i] = o.alpha ?? 1;
      this.swirl[i] = o.swirl ?? 0;
      this.alpha[i] = 0;
    }
    this.active = this.max;
  }

  update(dt) {
    if (!this.active) return;
    let alive = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) this.alpha[i] = 0; continue; }
      alive++;
      this.life[i] -= dt;
      const t = 1 - this.life[i] / this.maxLife[i];
      const d = 1 - this.drag[i] * dt;
      const j = i * 3;
      this.vel[j] *= d; this.vel[j + 1] = this.vel[j + 1] * d - this.grav[i] * dt; this.vel[j + 2] *= d;
      if (this.swirl[i]) {
        const x = this.pos[j], z = this.pos[j + 2];
        this.vel[j] += -z * this.swirl[i] * dt; this.vel[j + 2] += x * this.swirl[i] * dt;
      }
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      this.size[i] = this.base[i] * (1 + this.grow[i] * t);
      const fadeIn = Math.min(1, t * 8);
      this.alpha[i] = this.baseA[i] * fadeIn * (1 - t) * (1 - t * 0.2);
      if (this.life[i] <= 0) this.alpha[i] = 0;
    }
    if (!alive) this.active = 0;
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  setScale(px) { this.uniforms.uScale.value = px; }
}

/** מנהל אפקטים: מערכת אדיטיבית + רגילה ופרסטים מוכנים */
export class FX {
  constructor(sceneMgr) {
    this.sm = sceneMgr;
    this.add = new ParticleSystem(sceneMgr.world, { max: 3000, additive: true });
    this.norm = new ParticleSystem(sceneMgr.world, { max: 2200, additive: false, texture: glowTexture('soft', 'rgba(255,255,255,0.85)') });
    const rescale = () => {
      const h = sceneMgr.renderer.domElement.height;
      const px = h / (2 * Math.tan(THREE.MathUtils.degToRad(sceneMgr.camera.fov) / 2));
      this.add.setScale(px); this.norm.setScale(px);
    };
    rescale();
    window.addEventListener('resize', () => setTimeout(rescale, 50));
    sceneMgr.onUpdate((dt) => { this.add.update(dt); this.norm.update(dt); });
  }

  dust(pos, n = 18, color = 0xb8a68a, scale = 1) {
    this.norm.emit({ count: n, pos, spread: [0.3 * scale, 0.05, 0.3 * scale], radial: [0.6 * scale, 1.6 * scale], vel: [0, 0.5, 0], velSpread: [0.3, 0.3, 0.3], color, size: [0.35 * scale, 0.7 * scale], life: [0.7, 1.4], drag: 2.2, grow: 2.2, alpha: 0.55, gravity: -0.2 });
  }

  sparkle(pos, n = 24, color = [0xffe08a, 0xfff6cf, 0xffc040], spread = 0.4) {
    this.add.emit({ count: n, pos, spread: [spread, spread * 0.5, spread], radial: [0.5, 2.2], vel: [0, 1.6, 0], velSpread: [0.6, 0.8, 0.6], color, size: [0.08, 0.2], life: [0.6, 1.3], gravity: 1.2, drag: 1.2 });
  }

  confetti(pos, n = 120) {
    this.add.emit({ count: n, pos, spread: [1, 0.2, 1], radial: [2, 6], vel: [0, 6, 0], velSpread: [2, 2, 2], color: [0xffd34d, 0xff5a7a, 0x5ad1ff, 0x8aff7a, 0xc77dff, 0xffffff], size: [0.12, 0.26], life: [1.4, 2.6], gravity: 4.2, drag: 0.9 });
  }

  embers(pos, n = 3, color = [0xff9a40, 0xffd060, 0xff5a20]) {
    this.add.emit({ count: n, pos, spread: [0.25, 0.1, 0.25], vel: [0, 1.6, 0], velSpread: [0.4, 0.6, 0.4], color, size: [0.05, 0.12], life: [0.9, 2.0], gravity: -0.3, drag: 0.6 });
  }

  smoke(pos, n = 1, color = 0x5a5550, alpha = 0.35) {
    this.norm.emit({ count: n, pos, spread: [0.2, 0.1, 0.2], vel: [0.2, 1.1, 0], velSpread: [0.2, 0.3, 0.2], color, size: [0.5, 0.9], life: [2.2, 3.6], grow: 3, alpha, drag: 0.3 });
  }

  energy(pos, n = 30, color = [0x33f0ff, 0x9a5cff, 0xffffff]) {
    this.add.emit({ count: n, pos, spread: [0.2, 0.2, 0.2], radial: [1, 3.2], color, size: [0.06, 0.16], life: [0.4, 0.9], drag: 2.5 });
  }

  flame(pos, n = 10, dir = [0, 0, 1], color = [0xffd060, 0xff8a20, 0xff4010]) {
    this.add.emit({ count: n, pos, spread: [0.05, 0.05, 0.05], vel: [dir[0] * 4, dir[1] * 4 + 0.5, dir[2] * 4], velSpread: [0.6, 0.5, 0.6], color, size: [0.18, 0.4], life: [0.35, 0.7], grow: 1.5, drag: 1.5, gravity: -1.2 });
  }
}
