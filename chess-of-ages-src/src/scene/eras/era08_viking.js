/** עידן 8 — מצודת ולהאלה: אולם ויקינגים, אבני רונות זוהרות, שלג, כס אודין, ראשי דרקון וזוהר צפוני */
import * as THREE from 'three';
import { StageSet, flame, std, mesh, G, rand, TAU, ringPositions } from './common.js';
import { drawnTexture, stoneTex, woodTex } from '../kit.js';

function runeTex() {
  return drawnTexture('runes', 128, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#6ad8ff'; c.lineWidth = 5; c.shadowColor = '#2aa8ff'; c.shadowBlur = 10; c.lineCap = 'round';
    const runes = [[[0, -1], [0, 1], [0, -0.3], [0.6, -0.9]], [[0, -1], [0, 1], [0, -1], [0.6, -0.4], [0, 0.2]], [[-0.5, -1], [0, 1], [0.5, -1]], [[0, -1], [0, 1], [-0.5, -0.4], [0.5, 0.4]], [[-0.5, 1], [0, -1], [0.5, 1], [-0.3, 0.2], [0.3, 0.2]]];
    runes.forEach((r, i) => {
      c.save(); c.translate(w / 2, 50 + i * 90); c.scale(26, 32);
      c.lineWidth = 5 / 28;
      c.beginPath(); c.moveTo(r[0][0], r[0][1]); for (let k = 1; k < r.length; k++) c.lineTo(r[k][0], r[k][1]); c.stroke();
      c.restore();
    });
  }, { h: 512 });
}

const AURORA_VERT = `uniform float uTime; varying vec2 vUv;
void main(){ vUv = uv; vec3 p = position; p.y += sin(p.x * 0.05 + uTime * 0.4) * 6.0; p.z += sin(p.x * 0.03 + uTime * 0.25) * 10.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;
const AURORA_FRAG = `uniform float uTime; uniform float uOpacity; varying vec2 vUv;
float h(float n){ return fract(sin(n) * 43758.5453); }
float n1(float x){ float i = floor(x); float f = fract(x); return mix(h(i), h(i + 1.0), f * f * (3.0 - 2.0 * f)); }
void main(){
  float curtain = n1(vUv.x * 40.0 + uTime * 0.6) * 0.6 + n1(vUv.x * 13.0 - uTime * 0.3) * 0.4;
  float v = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
  vec3 col = mix(vec3(0.1, 1.0, 0.55), vec3(0.6, 0.2, 1.0), smoothstep(0.3, 0.9, vUv.y));
  float edge = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.92, 1.0, vUv.x));
  gl_FragColor = vec4(col, curtain * v * edge * uOpacity);
}`;

function dragonProw(wood, eye) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3(0, t * 5.5, Math.sin(t * 2.6) * 1.8 - t * 0.5)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const neck = new THREE.TubeGeometry(curve, 30, 0.42, 10, false);
  const pos = neck.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); const k = 1 - (y / 5.5) * 0.45; const c = curve.getPoint(Math.min(1, Math.max(0, y / 5.5))); pos.setX(i, c.x + (pos.getX(i) - c.x) * k); pos.setZ(i, c.z + (pos.getZ(i) - c.z) * k); }
  neck.computeVertexNormals();
  g.add(mesh(neck, wood, { cast: true }));
  const head = new THREE.Group();
  head.add(mesh(G.box(0.7, 0.75, 1.5), wood, { cast: true }));
  head.add(mesh(G.box(0.55, 0.3, 0.9), wood, { pos: [0, -0.3, 0.9], cast: true }));
  for (const s of [-1, 1]) { head.add(mesh(G.cone(0.12, 0.9, 6), wood, { pos: [s * 0.25, 0.7, -0.3], rot: [-0.6, 0, 0] })); head.add(mesh(G.sph(0.1, 8, 6), eye, { pos: [s * 0.36, 0.15, 0.35] })); }
  const end = curve.getPoint(1);
  head.position.set(end.x, end.y + 0.2, end.z + 0.4);
  g.add(head);
  return g;
}

export default {
  focus: [
    { target: [0, 3, -12], radius: 32, polar: 62, from: -0.7, to: 0.7 },
    { target: [0, 6, -14], radius: 36, polar: 66, from: 0.7, to: -0.6 },
  ],

  floor() {
    const tex = drawnTexture('snowSlab', 256, (c, s) => {
      c.fillStyle = '#7a8088'; c.fillRect(0, 0, s, s);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { const v = 120 + Math.random() * 30; c.fillStyle = `rgb(${v},${v + 5},${v + 12})`; c.fillRect(k * 64 + 3, r * 64 + 3, 58, 58); }
      for (let i = 0; i < 70; i++) { c.fillStyle = 'rgba(245,250,255,0.85)'; c.beginPath(); c.ellipse(Math.random() * s, Math.random() * s, 10 + Math.random() * 30, 6 + Math.random() * 14, Math.random() * 3, 0, TAU); c.fill(); }
    });
    tex.repeat.set(6, 6);
    return mesh(new THREE.PlaneGeometry(25, 25), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.03, 0], receive: true });
  },

  stages: [
    // שלב 15: אולם ארוך, אבני רונות זוהרות ושלג
    (ctx) => {
      const set = new StageSet();
      const wood = new THREE.MeshStandardMaterial({ map: woodTex('longhouse', 0x5a3e28, 0x2a1a10, { rings: 16, seed: 81 }), roughness: 0.85 });
      const roofM = new THREE.MeshStandardMaterial({ map: drawnTexture('thatchSnow', 256, (c, s) => { c.fillStyle = '#5a4a32'; c.fillRect(0, 0, s, s); for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(${200 + Math.random() * 55},${200 + Math.random() * 55},255,${0.3 + Math.random() * 0.5})`; c.fillRect(Math.random() * s, Math.random() * s * 0.6, 20, 3); } }), roughness: 0.9 });
      const hall = new THREE.Group();
      hall.add(mesh(G.box(15, 3.2, 7), wood, { pos: [0, 1.6, 0], cast: true, receive: true }));
      const roofShape = new THREE.Shape(); roofShape.moveTo(-4.4, 0); roofShape.lineTo(0, 4.6); roofShape.lineTo(4.4, 0); roofShape.lineTo(-4.4, 0);
      const roof = new THREE.ExtrudeGeometry(roofShape, { depth: 16, bevelEnabled: false }).translate(0, 0, -8);
      roof.rotateY(Math.PI / 2);
      hall.add(mesh(roof, roofM, { pos: [0, 3.2, 0], cast: true }));
      for (const s of [-1, 1]) {
        const p = dragonProw(wood, std(0x6ad8ff, 0.3, 0, { emissive: 0x2aa8ff, emissiveIntensity: 2 }));
        p.scale.setScalar(0.45); p.position.set(s * 8.0, 6.2, 0); p.rotation.y = s * Math.PI / 2;
        hall.add(p);
      }
      const shieldCols = [0xa82a20, 0x2a4a8a, 0xd8b040, 0x2a6a3a];
      for (let i = 0; i < 6; i++) hall.add(mesh(G.cyl(0.6, 0.6, 0.12, 16), std(shieldCols[i % 4], 0.6), { pos: [-5.5 + i * 2.2, 1.8, 3.56], rot: [Math.PI / 2, 0, 0] }));
      hall.add(mesh(G.box(1.8, 2.4, 0.2), std(0x3a2414, 0.8), { pos: [0, 1.2, 3.6] }));
      hall.position.set(0, 0, -21);
      set.part(hall, { delay: 0, depth: 9 });
      // אבני רונות
      const rs = new THREE.MeshStandardMaterial({ map: stoneTex('runeStone', 0x6a6e74, 0x2a2c30, { freq: 5, seed: 82 }), roughness: 0.9, emissive: 0x4ac8ff, emissiveMap: runeTex(), emissiveIntensity: 1.6 });
      ringPositions(9, 11.8, { offset: 0.2 }).filter((p) => !(p.z > 8 && Math.abs(p.x) < 8)).forEach((p, i) => {
        const st = mesh(G.box(1.1, 3.0, 0.5), rs, { pos: [p.x, 1.5, p.z], cast: true });
        st.lookAt(0, 1.5, 0);
        set.part(st, { delay: 0.6 + i * 0.12 });
      });
      set.onUpdate((dt, t) => { rs.emissiveIntensity = 1.2 + Math.sin(t * 1.8) * 0.6; });
      // מדורה באמצע החצר האחורית
      const fire = flame(set, ctx, [0, 0.2, -13], 1.4, { smoke: true });
      set.part(fire, { delay: 1.2, mode: 'scale' });
      set.light({ color: 0xff9a40, intensity: 26, distance: 20, pos: [0, 2, -13], flicker: 0.4 });
      set.light({ color: 0x4ac8ff, intensity: 12, distance: 18, pos: [0, 2.5, -9], flicker: 0.1 });
      let acc = 0;
      set.onUpdate((dt) => {
        acc += dt;
        if (acc > 0.03) {
          acc = 0;
          ctx.fx.norm.emit({ count: 3, pos: [rand(-22, 22), rand(10, 16), rand(-24, 16)], vel: [0.2, -1.1, 0], velSpread: [0.4, 0.2, 0.4], color: 0xffffff, size: [0.07, 0.15], life: [8, 12], alpha: 0.95 });
        }
      });
      return set;
    },

    // שלב 16: כס אודין, ראשי ספינות דרקון וזוהר צפוני
    (ctx) => {
      const set = new StageSet();
      const iron = std(0x3a3e46, 0.45, 0.9);
      const gold = std(0xe8b84a, 0.25, 1);
      const stone = new THREE.MeshStandardMaterial({ map: stoneTex('throneStone', 0x7a7e86, 0x3a3c42, { freq: 4, seed: 83 }), roughness: 0.85 });
      const throne = new THREE.Group();
      throne.add(mesh(G.box(6, 1, 4), stone, { pos: [0, 0.5, 0], cast: true, receive: true }));
      throne.add(mesh(G.box(4.4, 1.2, 3), stone, { pos: [0, 1.6, 0], cast: true }));
      throne.add(mesh(G.box(4.4, 5.6, 0.8), stone, { pos: [0, 4.6, -1.2], cast: true }));
      for (const s of [-1, 1]) {
        throne.add(mesh(G.box(0.6, 1.6, 3), iron, { pos: [s * 2.4, 2.6, 0], cast: true }));
        throne.add(mesh(G.cone(0.35, 1.6, 6), gold, { pos: [s * 2.0, 8.0, -1.2], cast: true }));
        // עורבים
        const raven = new THREE.Group();
        raven.add(mesh(G.sph(0.35, 10, 8), std(0x0c0c10, 0.5), { scale: [1, 0.8, 1.5] }));
        raven.add(mesh(G.sph(0.2, 10, 8), std(0x0c0c10, 0.5), { pos: [0, 0.25, 0.4] }));
        raven.add(mesh(G.cone(0.07, 0.3, 6), std(0x2a2a2a, 0.4), { pos: [0, 0.22, 0.68], rot: [Math.PI / 2, 0, 0] }));
        raven.position.set(s * 2.4, 3.65, 0.6);
        throne.add(raven);
      }
      throne.add(mesh(G.torus(1.1, 0.12, 8, 24), gold, { pos: [0, 6.4, -0.75] }));
      throne.add(mesh(G.box(0.2, 1.8, 0.2), gold, { pos: [0, 6.4, -0.7] }));
      throne.add(mesh(G.box(1.8, 0.2, 0.2), gold, { pos: [0, 6.4, -0.7] }));
      throne.position.set(0, 0, -15.5);
      throne.scale.setScalar(1.1);
      set.part(throne, { delay: 0, depth: 10 });
      const wood = new THREE.MeshStandardMaterial({ map: woodTex('prowWood', 0x6a4a30, 0x2a1a10, { rings: 10, seed: 84 }), roughness: 0.8 });
      const eye = std(0xff4a20, 0.3, 0, { emissive: 0xff3a10, emissiveIntensity: 2 });
      [[-12, -8, 0.5], [12, -8, -0.5], [-13.5, 2, 0.9], [13.5, 2, -0.9]].forEach(([x, z, r], i) => { const p = dragonProw(wood, eye); p.position.set(x, 0, z); p.rotation.y = r + (x > 0 ? -Math.PI / 2 : Math.PI / 2); set.part(p, { delay: 0.5 + i * 0.15 }); });
      // זוהר צפוני בשמיים
      const aurora = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.85 } }, vertexShader: AURORA_VERT, fragmentShader: AURORA_FRAG, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const ribbons = new THREE.Group();
      [[0, 60, -150, 0.0], [-40, 75, -130, 0.4], [50, 55, -140, -0.3]].forEach(([x, y, z, r]) => {
        const m = mesh(new THREE.PlaneGeometry(260, 46, 80, 6), aurora, { pos: [x, y, z], rot: [0.15, r, 0] });
        m.frustumCulled = false;
        ribbons.add(m);
      });
      ribbons.userData.noOcc = true;
      set.part(ribbons, { delay: 0.8, mode: 'fade' });
      set.onUpdate((dt, t) => { aurora.uniforms.uTime.value = t; });
      return set;
    },
  ],
};
