/** עידן 9 — אטלנטיס השקועה: עמודי אלמוגים זוהרים, גבישי ים, בועות, קלשון פוסידון וכיפת אור קאוסטית */
import * as THREE from 'three';
import { StageSet, std, mesh, G, rand, TAU, ringPositions } from './common.js';
import { drawnTexture, stoneTex } from '../kit.js';
import { HOLO_VERT } from './era05_cyber.js';

const CAUSTIC_FRAG = `uniform float uTime; uniform float uOpacity; uniform vec3 uColor;
varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vP;
vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float voro(vec2 x){ vec2 n = floor(x); vec2 f = fract(x); float m = 8.0;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g = vec2(float(i), float(j)); vec2 o = hash2(n + g); o = 0.5 + 0.5 * sin(uTime * 0.8 + 6.2831 * o); vec2 r = g + o - f; m = min(m, dot(r, r)); }
  return sqrt(m); }
void main(){
  vec2 uv = vec2(atan(vP.z, vP.x) * 5.0, vP.y * 0.45);
  float c = pow(1.0 - voro(uv * 1.3), 6.0) + pow(1.0 - voro(uv * 2.1 + 3.0), 8.0) * 0.6;
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  gl_FragColor = vec4(uColor * (c * 1.4 + f * 0.6), (c * 0.55 + f * 0.35) * uOpacity * smoothstep(-0.5, 3.0, vP.y));
}`;

function causticFloorTex() {
  return drawnTexture('causticFloor', 256, (c, s) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, s, s);
    c.strokeStyle = 'rgba(160,255,250,0.9)'; c.lineWidth = 2.5; c.shadowColor = '#8ffff0'; c.shadowBlur = 6;
    for (let i = 0; i < 26; i++) {
      c.beginPath();
      let x = Math.random() * s, y = Math.random() * s;
      c.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 70; y += (Math.random() - 0.5) * 70; c.quadraticCurveTo(x + 20, y - 20, x, y); }
      c.stroke();
    }
  });
}

function coralPillar(stoneM, glow) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.9) * 0.4, i * 0.75, Math.cos(i * 0.7) * 0.4));
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.55, 10, false), stoneM, { cast: true }));
  for (let b = 0; b < 6; b++) {
    const y0 = 2 + b * 0.9, a = b * 1.7;
    const bp = [new THREE.Vector3(0, y0, 0), new THREE.Vector3(Math.cos(a) * 0.9, y0 + 0.6, Math.sin(a) * 0.9), new THREE.Vector3(Math.cos(a) * 1.4, y0 + 1.5, Math.sin(a) * 1.4)];
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp), 12, 0.16, 6, false), stoneM));
    g.add(mesh(G.sph(0.22, 10, 8), glow, { pos: [bp[2].x, bp[2].y, bp[2].z] }));
  }
  g.add(mesh(G.sph(0.4, 12, 10), glow, { pos: [pts[10].x, pts[10].y + 0.3, pts[10].z] }));
  return g;
}

export default {
  focus: [
    { target: [0, 3, -4], radius: 32, polar: 60, from: -0.8, to: 0.7 },
    { target: [0, 8, -14], radius: 40, polar: 64, from: 0.6, to: -0.6 },
  ],

  floor() {
    const base = stoneTex('seaTiles', 0x5a8a86, 0x2a4a4a, { freq: 6, seed: 91 });
    base.repeat.set(6, 6);
    const caust = causticFloorTex(); caust.repeat.set(3, 3);
    const mat = new THREE.MeshStandardMaterial({ map: base, roughness: 0.75, emissive: 0x6ffff0, emissiveMap: caust, emissiveIntensity: 0.5 });
    const m = mesh(new THREE.PlaneGeometry(25, 25), mat, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.03, 0], receive: true });
    m.userData.update = (dt, t) => { caust.offset.set(Math.sin(t * 0.15) * 0.2, t * 0.03); mat.emissiveIntensity = 0.4 + Math.sin(t * 0.9) * 0.15; };
    return m;
  },

  stages: [
    // שלב 17: עמודי אלמוגים, גבישי ים ובועות
    (ctx) => {
      const set = new StageSet();
      const coral = std(0xd86a7a, 0.6, 0, { emissive: 0x5a1a3a, emissiveIntensity: 0.35 });
      const glow = std(0x7ffff0, 0.3, 0, { emissive: 0x3affe0, emissiveIntensity: 2.4 });
      const glowP = std(0xd08aff, 0.3, 0, { emissive: 0xa04aff, emissiveIntensity: 2.4 });
      ringPositions(10, 12.5, { offset: 0.3 }).filter((p) => !(p.z > 8 && Math.abs(p.x) < 8)).forEach((p, i) => {
        const c = coralPillar(coral, i % 2 ? glow : glowP);
        c.position.set(p.x, 0, p.z); c.scale.setScalar(rand(0.9, 1.2));
        set.part(c, { delay: i * 0.12 });
      });
      const crystal = new THREE.MeshPhysicalMaterial({ color: 0x6ff0ff, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.85, emissive: 0x2aa8c8, emissiveIntensity: 0.9, clearcoat: 1 });
      const crystals = [];
      for (let i = 0; i < 12; i++) {
        const a = rand(0, TAU), r = rand(7.5, 17);
        const x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (z > 6 && Math.abs(x) < 7) continue;
        const cl = new THREE.Group();
        for (let k = 0; k < 4; k++) { const h = rand(0.8, 2.2); const geo = new THREE.OctahedronGeometry(0.4, 0); geo.scale(0.6, h, 0.6); cl.add(mesh(geo, crystal, { pos: [rand(-0.4, 0.4), h * 0.35, rand(-0.4, 0.4)], rot: [rand(-0.4, 0.4), rand(0, 3), rand(-0.4, 0.4)] })); }
        cl.position.set(x, 0, z);
        set.part(cl, { delay: 0.8 + i * 0.05, mode: 'scale' });
        crystals.push(cl);
      }
      set.light({ color: 0x3affe0, intensity: 16, distance: 22, pos: [-9, 4, -9], flicker: 0.1 });
      set.light({ color: 0xa04aff, intensity: 14, distance: 22, pos: [9, 4, -9], flicker: 0.1 });
      let acc = 0;
      set.onUpdate((dt, t) => {
        crystal.emissiveIntensity = 0.7 + Math.sin(t * 2) * 0.3;
        acc += dt;
        if (acc > 0.05) {
          acc = 0;
          ctx.fx.add.emit({ count: 2, pos: [rand(-18, 18), 0.2, rand(-20, 12)], vel: [0, 1.4, 0], velSpread: [0.25, 0.4, 0.25], color: [0xcffcff, 0x9ff0ff], size: [0.08, 0.22], life: [4, 7], gravity: -0.15, alpha: 0.6 });
        }
      });
      return set;
    },

    // שלב 18: קלשון פוסידון וכיפת אור קאוסטית
    (ctx) => {
      const set = new StageSet();
      const gold = std(0xf2c14e, 0.2, 1, { emissive: 0x6a4a10, emissiveIntensity: 0.4 });
      const marble = new THREE.MeshPhysicalMaterial({ color: 0xe8f4f2, roughness: 0.25, clearcoat: 0.6 });
      const mon = new THREE.Group();
      mon.add(mesh(G.cyl(3.2, 3.8, 1.4, 24), marble, { pos: [0, 0.7, 0], cast: true, receive: true }));
      mon.add(mesh(G.cyl(2.2, 2.6, 2.2, 24), marble, { pos: [0, 2.5, 0], cast: true }));
      mon.add(mesh(G.cyl(0.32, 0.32, 13, 12), gold, { pos: [0, 10, 0], cast: true }));
      mon.add(mesh(G.box(4.6, 0.5, 0.5), gold, { pos: [0, 16.2, 0], cast: true }));
      for (const x of [-2.1, 0, 2.1]) {
        mon.add(mesh(G.cyl(0.22, 0.26, x === 0 ? 4.4 : 3.4, 8), gold, { pos: [x, x === 0 ? 18.6 : 18.1, 0], cast: true }));
        mon.add(mesh(G.cone(0.42, 1.3, 8), gold, { pos: [x, x === 0 ? 21.4 : 20.4, 0], cast: true }));
      }
      const orb = mesh(G.sph(0.9, 20, 16), std(0x9ffff0, 0.2, 0, { emissive: 0x3affe0, emissiveIntensity: 3 }), { pos: [0, 16.2, 0.6] });
      mon.add(orb);
      mon.position.set(0, 0, -19);
      mon.scale.setScalar(0.72);
      set.part(mon, { delay: 0, depth: 18 });
      const domeMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.7 }, uColor: { value: new THREE.Color(0x6ffff0) } }, vertexShader: HOLO_VERT, fragmentShader: CAUSTIC_FRAG, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const dome = mesh(new THREE.SphereGeometry(27, 64, 32, 0, TAU, 0, Math.PI / 2), domeMat);
      dome.renderOrder = 3;
      dome.userData.noOcc = true;
      set.part(dome, { delay: 0.8, mode: 'scale' });
      set.onUpdate((dt, t) => {
        domeMat.uniforms.uTime.value = t;
        orb.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
        if (Math.random() < dt * 1.5) ctx.fx.energy([0, 11.7, -18.6], 10, [0x9ffff0, 0xffffff, 0x3affe0]);
      });
      return set;
    },
  ],
};
