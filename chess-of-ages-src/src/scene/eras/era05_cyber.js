/** עידן 5 — עיר הסייבר: מגדלי ניאון מרחפים, גשרי לייזר, כוכב הולוגרפי, טבעות וכיפת אנרגיה */
import * as THREE from 'three';
import { StageSet, std, mesh, G, rand, TAU, ringPositions } from './common.js';
import { drawnTexture, glowTexture } from '../kit.js';

export const HOLO_VERT = `varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vP;
void main(){ vUv = uv; vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
export const HOLO_FRAG = `uniform vec3 uColor; uniform float uTime; uniform float uOpacity; uniform float uGrid;
varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vP;
void main(){
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  float lat = smoothstep(0.92, 1.0, abs(sin(vUv.y * 3.14159 * uGrid)));
  float lon = smoothstep(0.94, 1.0, abs(sin(vUv.x * 3.14159 * uGrid * 2.0)));
  float scan = 0.5 + 0.5 * sin(vP.y * 8.0 - uTime * 3.0);
  float a = (f * 0.9 + (lat + lon) * 0.55 + scan * 0.08) * uOpacity;
  gl_FragColor = vec4(uColor * (0.6 + f), a);
}`;

const DOME_FRAG = `uniform vec3 uColor; uniform float uTime; uniform float uOpacity;
varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vP;
float hexDist(vec2 p){ p = abs(p); return max(dot(p, normalize(vec2(1.0,1.73))), p.x); }
void main(){
  vec2 uv = vec2(atan(vP.z, vP.x) * 4.0, vP.y * 0.7);
  vec2 r = vec2(1.0, 1.73); vec2 h = r * 0.5;
  vec2 a = mod(uv, r) - h; vec2 b = mod(uv - h, r) - h;
  vec2 g = dot(a,a) < dot(b,b) ? a : b;
  float edge = smoothstep(0.42, 0.5, hexDist(g));
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5);
  float pulse = 0.5 + 0.5 * sin(uTime * 1.5 - vP.y * 0.4);
  float alpha = (edge * (0.25 + pulse * 0.25) + f * 0.5) * uOpacity * smoothstep(-0.5, 2.0, vP.y);
  gl_FragColor = vec4(uColor, alpha);
}`;

export function holoMaterial(color, opacity = 1, grid = 10) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uOpacity: { value: opacity }, uGrid: { value: grid } },
    vertexShader: HOLO_VERT, fragmentShader: HOLO_FRAG, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}
export function domeMaterial(color, opacity = 0.6) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uOpacity: { value: opacity } },
    vertexShader: HOLO_VERT, fragmentShader: DOME_FRAG, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}

export function dashTexture(key, color) {
  return drawnTexture(key, 256, (c, s) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, s, 32);
    for (let i = 0; i < 4; i++) { const g = c.createLinearGradient(i * 64, 0, i * 64 + 48, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, color); c.fillStyle = g; c.fillRect(i * 64, 0, 48, 32); }
  }, { h: 32 });
}

export default {
  focus: [
    { target: [0, 4, -2], radius: 36, polar: 60, from: -0.8, to: 0.8 },
    { target: [0, 10, -12], radius: 42, polar: 66, from: 0.7, to: -0.7 },
  ],

  floor() {
    const tex = drawnTexture('hexFloor', 512, (c, s) => {
      c.fillStyle = '#070a12'; c.fillRect(0, 0, s, s);
      const R = 32, w = R * Math.sqrt(3);
      c.strokeStyle = '#2bd8ff'; c.lineWidth = 2.5; c.shadowColor = '#2bd8ff'; c.shadowBlur = 6;
      for (let row = -1; row < s / (R * 1.5) + 1; row++) {
        for (let col = -1; col < s / w + 1; col++) {
          const cx = col * w + (row % 2 ? w / 2 : 0), cy = row * R * 1.5;
          c.beginPath();
          for (let k = 0; k <= 6; k++) { const a = (k / 6) * TAU + Math.PI / 6; const x = cx + Math.cos(a) * (R - 3), y = cy + Math.sin(a) * (R - 3); if (k) c.lineTo(x, y); else c.moveTo(x, y); }
          c.stroke();
        }
      }
    });
    tex.repeat.set(4, 4);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0c1220, metalness: 0.7, roughness: 0.25, emissive: 0x2bd8ff, emissiveMap: tex, emissiveIntensity: 0.6 });
    const m = mesh(new THREE.PlaneGeometry(25, 25), mat, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.03, 0], receive: true });
    m.userData.update = (dt, t) => { mat.emissiveIntensity = 0.45 + Math.sin(t * 1.4) * 0.2; };
    return m;
  },

  stages: [
    // שלב 9: מגדלי ניאון מרחפים וגשרי לייזר
    (ctx) => {
      const set = new StageSet();
      const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a1020, roughness: 0.08, metalness: 0.6, clearcoat: 1 });
      const neonC = std(0x33f0ff, 0.3, 0, { emissive: 0x33f0ff, emissiveIntensity: 2.2 });
      const neonM = std(0xff3ad8, 0.3, 0, { emissive: 0xff3ad8, emissiveIntensity: 2.2 });
      const towers = [];
      const pos = ringPositions(8, 15.5, { offset: TAU / 16 }).filter((p) => !(p.z > 9 && Math.abs(p.x) < 9));
      pos.forEach((p, i) => {
        const h = rand(8, 12);
        const t = new THREE.Group();
        t.add(mesh(G.box(2, h, 2), glass, { pos: [0, h / 2, 0], cast: true }));
        const neon = i % 2 ? neonM : neonC;
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) t.add(mesh(G.box(0.08, h, 0.08), neon, { pos: [x, h / 2, z] }));
        for (let k = 0; k < 4; k++) t.add(mesh(G.box(2.1, 0.06, 2.1), neon, { pos: [0, 1 + k * (h / 4), 0] }));
        t.add(mesh(G.octa(0.6), neon, { pos: [0, h + 1, 0] }));
        const base = 2.2 + rand(0, 1.5);
        t.position.set(p.x, base, p.z);
        t.userData = { base, ph: rand(0, 6), top: h + 1 };
        set.part(t, { delay: i * 0.18 });
        towers.push(t);
      });
      set.onUpdate((dt, time) => {
        towers.forEach((t) => {
          if (!gsapBusy(t)) t.position.y = t.userData.base + Math.sin(time * 0.8 + t.userData.ph) * 0.35;
          t.children[t.children.length - 1].rotation.y += dt * 1.5;
        });
      });
      // גשרי אנרגיה
      const dashC = dashTexture('dashCyan', 'rgba(80,240,255,1)');
      dashC.repeat.set(6, 1);
      const bridgeMat = new THREE.MeshBasicMaterial({ map: dashC, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x66f4ff, side: THREE.DoubleSide });
      for (let i = 0; i < towers.length - 1; i++) {
        const a = towers[i].position, b = towers[i + 1].position;
        const mid = a.clone().add(b).multiplyScalar(0.5);
        mid.y += 6.5;
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a.x, a.y + 6, a.z), mid, new THREE.Vector3(b.x, b.y + 6, b.z));
        const tube = mesh(new THREE.TubeGeometry(curve, 40, 0.12, 6, false), bridgeMat);
        set.part(tube, { delay: 1.2 + i * 0.1, mode: 'scale' });
      }
      set.onUpdate((dt) => { dashC.offset.x -= dt * 1.4; });
      set.light({ color: 0x33f0ff, intensity: 22, distance: 26, pos: [-10, 6, -10], flicker: 0.05 });
      set.light({ color: 0xff3ad8, intensity: 20, distance: 26, pos: [10, 6, -10], flicker: 0.05 });
      return set;
    },

    // שלב 10: כוכב הולוגרפי עם טבעות + כיפת אנרגיה + חלקיקי אור
    (ctx) => {
      const set = new StageSet();
      const planet = new THREE.Group();
      const holo = holoMaterial(0x4af6ff, 1, 9);
      planet.add(mesh(new THREE.SphereGeometry(3.6, 48, 32), holo));
      planet.add(mesh(new THREE.SphereGeometry(2.4, 24, 16), new THREE.MeshBasicMaterial({ color: 0x0a3a5a, transparent: true, opacity: 0.35 })));
      const ringTex = drawnTexture('holoRing', 256, (c, s) => {
        const g = c.createLinearGradient(0, 0, s, 0);
        g.addColorStop(0, 'rgba(80,240,255,0)'); g.addColorStop(0.3, 'rgba(80,240,255,0.9)'); g.addColorStop(0.5, 'rgba(255,120,240,0.5)'); g.addColorStop(0.75, 'rgba(80,240,255,0.9)'); g.addColorStop(1, 'rgba(80,240,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, s, s);
        for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(Math.random() * s, 0, 2, s); }
      });
      const rings = [];
      [[5.2, 6.6, 0.35, 0.2], [7.2, 7.9, -0.5, -0.12], [8.6, 9.0, 1.2, 0.08]].forEach(([ri, ro, tilt, speed]) => {
        const geo = new THREE.RingGeometry(ri, ro, 96, 1);
        const uv = geo.attributes.uv, p = geo.attributes.position;
        for (let i = 0; i < uv.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)); uv.setXY(i, (r - ri) / (ro - ri), 0.5); }
        const m = mesh(geo, new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        const pivot = new THREE.Group(); pivot.rotation.x = Math.PI / 2 + tilt; pivot.add(m);
        planet.add(pivot);
        rings.push({ m, speed });
      });
      planet.position.set(0, 11.5, -21);
      planet.scale.setScalar(0.8);
      planet.userData.noOcc = true;
      set.part(planet, { delay: 0, mode: 'scale' });
      const dome = mesh(new THREE.SphereGeometry(27, 64, 32, 0, TAU, 0, Math.PI / 2), domeMaterial(0x3ae0ff, 0.55));
      dome.renderOrder = 3;
      dome.userData.noOcc = true;
      set.part(dome, { delay: 0.8, mode: 'scale' });
      let acc = 0;
      set.onUpdate((dt, t) => {
        holo.uniforms.uTime.value = t;
        dome.material.uniforms.uTime.value = t;
        planet.rotation.y += dt * 0.15;
        rings.forEach(({ m, speed }) => { m.rotation.z += dt * speed; });
        acc += dt;
        if (acc > 0.08) {
          acc = 0;
          ctx.fx.add.emit({ count: 2, pos: [rand(-20, 20), rand(0.5, 3), rand(-20, 14)], spread: [0, 0, 0], vel: [0, 0.6, 0], velSpread: [0.3, 0.3, 0.3], color: [0x7ff8ff, 0xffffff, 0xff8af0], size: [0.08, 0.2], life: [3, 5], gravity: -0.05 });
        }
      });
      return set;
    },
  ],
};

function gsapBusy(o) { return o.userData.rising; }
