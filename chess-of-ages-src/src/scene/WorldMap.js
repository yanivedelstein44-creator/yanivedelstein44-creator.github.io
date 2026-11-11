/**
 * מפת העולם והמסע בין האיים.
 * 99 איים בספירלה סביב האי המרכזי (אי 1). האווטאר והחיה שלך עומדים על האי שבו אתה נמצא.
 * כל מסע נעשה ברכיבה על החיה: המעופפות עפות, החד-קרן דוהר על קשת, והזאב/הסוס/השועל רצים על אבנים זוהרות.
 * לכל אי דרך כניסה משלו — שער · טבעות אור · ריחוף נמוך · ספירלה · צלילה · גשר אור — בעיצוב של העולם שלו.
 * נבנית בעצלות ומרונדרת עם ה-renderer הראשי; הסצנה הראשית מושהית כשהמפה פתוחה.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ISLAND_COUNT, HUB_ID, PREMIUM_FIRST, isPremium, regionOf, isBoss, islandDef, tierOf } from '../config/Islands.js';
import { getEra } from '../config/Eras.js';
import { drawIcon } from '../ui/icons.js';
import { t, islandLabel } from '../ui/i18n.js';
import { PlayerAvatar3D } from './PlayerAvatar3D.js';
import { buildPetRig } from './PetCompanion3D.js';
import { isFlyer } from '../config/Pets.js';
import { FX } from './Particles.js';
import { monumentGeometry, MONUMENT_SOLID, MONUMENT_GLOW } from './Monuments.js';
import { GROUND } from '../config/IslandEras.js';

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;
const REGION_COLORS = {
  1: [0xd8c08a, 0x6f9a3a], 2: [0xe8dcc0, 0x8fae5a], 3: [0xc8b88a, 0x4f8a3a], 4: [0xa89070, 0x6a6a4a], 5: [0x6a7a8a, 0x2a3a5a],
  6: [0xe0c8b0, 0xd88aa8], 7: [0xe8cc8a, 0xd8b060], 8: [0xb8c4cc, 0xe8f0f6], 9: [0xd8e0c8, 0x3aa8a0], 10: [0xc8c0e8, 0x8a7ad8],
  // איי הפרימיום: חוף זהוב
  11: [0xf2d68a, 0x9a7ae0], 12: [0xf0d080, 0x5ac8c8], 13: [0xffe2a0, 0xf2c94c],
};
// חיות שעפות ברכיבה (כולל כל החיות של קן השמיים) — ראה isFlyer ב-Pets.js
const GATE_SCALE = 1.6;
const GATE_CENTER = { 1: 0.75, 2: 0.75, 3: 0.75, 4: 1.05, 5: 1.1, 6: 0.85, 7: 0.8, 8: 0.5, 9: 0.5, 10: 1.15 };
const HOOP_K = [3.9, 3.0, 2.15];
const HOOP_Y = [1.75, 1.5, 1.25];
const BRIDGE = { 2: [0xf2ece0, 0x5a5040], 3: [0x8a5a30, 0x000000], 4: [0xb07a3a, 0x3a2008], 5: [0x33e8ff, 0x2299cc], 7: [0xe8cc8a, 0x6a5020] };

/** דרכי הכניסה — לכל אי אחת, מתחלפות בין איים סמוכים */
export const APPROACHES = ['gate', 'rings', 'skim', 'spiral', 'dive', 'bridge'];
export const approachOf = (id) => (id === HUB_ID ? 'spiral' : isPremium(id) ? 'hop' : APPROACHES[(id * 5 + regionOf(id) * 3) % 6]);

/** איי הפרימיום: טבעת זהב חיצונית סביב כל העולם — לא צמודים לאי המרכזי */
const PREM_RING_R = 44;
export function premiumPos(id) {
  const k = id - PREMIUM_FIRST;
  const th = -Math.PI / 2 + (k / 30) * TAU;
  return new V3(Math.cos(th) * PREM_RING_R, 0, Math.sin(th) * PREM_RING_R);
}

/** מיקום אי במפה: האי המרכזי באמצע, טבעות הפרימיום סביבו, 2–99 על ספירלה ארכימדית במרווחים שווים */
export function islandPos(id) {
  if (id === HUB_ID) return new V3(0, 0, 0);
  if (id >= PREMIUM_FIRST) return premiumPos(id);
  const a = 8.0, b = 1.06, d = 4.3;
  const s = (id - 2) * d;
  const th = (-a + Math.sqrt(a * a + 2 * b * s)) / b;
  const r = a + b * th;
  const j = Math.sin(id * 12.9898) * 0.5;
  return new V3(Math.cos(th + 0.6) * (r + j), 0, Math.sin(th + 0.6) * (r + j));
}
/** צבעי האי במפה: בסיס לפי העולם, צמחייה/קרקע לפי האקלים של העידן */
function islandColors(id) { const [sand, grass] = REGION_COLORS[regionOf(id)]; const cl = islandDef(id)?.era?.climate; return [sand, id === HUB_ID ? grass : (GROUND[cl] ?? grass)]; }
const islandScale = (id) => (id === HUB_ID ? 2.3 : isPremium(id) ? (isBoss(id) ? 0.78 : 0.64) : isBoss(id) ? 1.3 : 0.95 + ((id * 37) % 7) * 0.025);
/** נקודת העמידה על האי (באי המרכזי — מול הטירה) */
function standOf(id) { const p = islandPos(id).setY(id === HUB_ID ? 0.42 : isPremium(id) ? 0.22 : 0.3); p.z += id === HUB_ID ? 2.4 : isPremium(id) ? 0.25 : 0.38; return p; }
/** כיוון הכניסה לאי (מהאי הקודם בספירלה) — לשערים, לטבעות ולגשרים */
function inDir(id) { const d = isPremium(id) ? islandPos(id).setY(0) : islandPos(id).sub(islandPos(Math.max(1, id - 1))).setY(0); return d.lengthSq() < 1e-6 ? new V3(0, 0, -1) : d.normalize(); }
const wrapAngle = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };

function islandGeo() {
  const base = new THREE.CylinderGeometry(1.25, 1.55, 0.6, 9, 1);
  base.translate(0, -0.1, 0);
  const p = base.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const n = Math.sin(x * 3.1) * 0.08 + Math.cos(z * 2.7) * 0.08; p.setX(i, x * (1 + n)); p.setZ(i, z * (1 - n)); }
  base.computeVertexNormals();
  const top = new THREE.SphereGeometry(1.08, 9, 5, 0, TAU, 0, Math.PI / 2.4);
  top.scale(1, 0.32, 1);
  top.translate(0, 0.18, 0);
  return { base, top };
}

function waterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDeep: { value: new THREE.Color(0x0a2a4c) }, uShallow: { value: new THREE.Color(0x2b95c0) }, uFoam: { value: new THREE.Color(0xe6fbff) }, uSky: { value: new THREE.Color(0xa8d8ff) } },
    vertexShader: 'varying vec2 vXZ; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vXZ = w.xz; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec2 vXZ; varying vec3 vW; uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFoam; uniform vec3 uSky;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        float r = length(vXZ);
        float w = n(vXZ*0.35 + vec2(uTime*0.12, uTime*0.08)) * 0.6 + n(vXZ*0.9 - vec2(uTime*0.2, 0.0)) * 0.4;
        vec3 c = mix(uShallow, uDeep, smoothstep(6.0, 48.0, r) * 0.75 + w * 0.25);
        vec3 V = normalize(cameraPosition - vW);
        float fr = pow(1.0 - max(V.y, 0.0), 3.0);
        c = mix(c, uSky, fr * 0.6);
        c += uFoam * smoothstep(0.84, 0.97, n(vXZ*2.4 + uTime*0.7)) * 0.4;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

function skyDome() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTop: { value: new THREE.Color(0x2a5ea8) }, uHor: { value: new THREE.Color(0xc4e4ff) }, uSun: { value: new THREE.Color(0xfff2d0) } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun;
      void main(){ float y = max(vD.y, 0.0); vec3 c = mix(uHor, uTop, pow(y, 0.55));
        float s = max(dot(vD, normalize(vec3(0.5, 0.35, -0.8))), 0.0); c += uSun * (pow(s, 24.0) * 0.6 + pow(s, 4.0) * 0.12);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(180, 24, 12), mat);
  m.renderOrder = -10;
  return m;
}

function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const cx = 40 + Math.random() * 176, cy = 50 + Math.random() * 40, r = 22 + Math.random() * 30;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(250,252,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function labelTexture(text, { bg = 'rgba(12,8,24,0.78)', fg = '#fff3c8', w = 96, h = 48, font = 800, ic = null } = {}) {
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2;
  const x = c.getContext('2d');
  x.scale(2, 2);
  const r = h / 2 - 4;
  x.fillStyle = bg;
  x.beginPath(); x.moveTo(4 + r, 4); x.arcTo(w - 4, 4, w - 4, h - 4, r); x.arcTo(w - 4, h - 4, 4, h - 4, r); x.arcTo(4, h - 4, 4, 4, r); x.arcTo(4, 4, w - 4, 4, r); x.fill();
  x.lineWidth = 2; x.strokeStyle = 'rgba(242,201,76,0.85)'; x.stroke();
  x.fillStyle = fg; x.font = `${font} ${Math.round(h * 0.52)}px Rubik, Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (ic && text) { const tw = x.measureText(text).width; const isz = h * 0.62; const sx = w / 2 - (tw + isz + 4) / 2; drawIcon(x, ic, sx + isz / 2, h / 2, isz); x.textAlign = 'left'; x.fillText(text, sx + isz + 4, h / 2 + 1); }
  else if (ic) drawIcon(x, ic, w / 2, h / 2, h * 0.7);
  else x.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- שערים בסגנון כל עולם (גאומטריה אחת עם צבעי קודקודים) ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new V3(), _s = new V3();
function part(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1]) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  g.applyMatrix4(_m.compose(_p.set(...pos), _q.setFromEuler(_e.set(...rot)), _s.set(...sc)));
  const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);
function gateGeometry(region) {
  const P = [];
  switch (region) {
    case 1: P.push(part(box(0.32, 1.5, 0.3), 0x8a8478, [-0.62, 0.75, 0]), part(box(0.32, 1.5, 0.3), 0x8a8478, [0.62, 0.75, 0]), part(box(1.7, 0.3, 0.34), 0x7a7468, [0, 1.62, 0])); break;
    case 2: P.push(part(cyl(0.12, 0.14, 1.5, 10), 0xf2ece0, [-0.62, 0.75, 0]), part(cyl(0.12, 0.14, 1.5, 10), 0xf2ece0, [0.62, 0.75, 0]), part(box(1.65, 0.16, 0.34), 0xe6dfd0, [0, 1.58, 0]), part(new THREE.ConeGeometry(0.95, 0.4, 3), 0xe6dfd0, [0, 1.85, 0], [0, 0, 0], [1, 1, 0.3])); break;
    case 3: P.push(part(cyl(0.26, 0.3, 1.8, 8), 0xa8a4a0, [-0.75, 0.9, 0]), part(cyl(0.26, 0.3, 1.8, 8), 0xa8a4a0, [0.75, 0.9, 0]), part(new THREE.ConeGeometry(0.34, 0.5, 8), 0x8a2a2a, [-0.75, 2.05, 0]), part(new THREE.ConeGeometry(0.34, 0.5, 8), 0x8a2a2a, [0.75, 2.05, 0]), part(box(1.3, 0.28, 0.4), 0x9a968e, [0, 1.62, 0]), part(box(0.3, 0.45, 0.04), 0xc8202a, [0, 1.25, 0.2])); break;
    case 4: P.push(part(new THREE.TorusGeometry(0.85, 0.12, 6, 16), 0xb07a3a, [0, 1.05, 0]), part(box(0.2, 1.0, 0.2), 0x4a3a30, [-0.85, 0.5, 0]), part(box(0.2, 1.0, 0.2), 0x4a3a30, [0.85, 0.5, 0]));
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; P.push(part(box(0.16, 0.2, 0.14), 0xb07a3a, [Math.cos(a) * 0.98, 1.05 + Math.sin(a) * 0.98, 0], [0, 0, a])); } break;
    case 5: P.push(part(new THREE.TorusGeometry(0.9, 0.08, 6, 24), 0x33e8ff, [0, 1.1, 0]), part(box(0.18, 0.5, 0.18), 0x1a2236, [-0.9, 0.25, 0]), part(box(0.18, 0.5, 0.18), 0x1a2236, [0.9, 0.25, 0])); break;
    case 6: P.push(part(cyl(0.09, 0.11, 1.7, 8), 0xc8282a, [-0.62, 0.85, 0]), part(cyl(0.09, 0.11, 1.7, 8), 0xc8282a, [0.62, 0.85, 0]), part(box(1.9, 0.14, 0.18), 0x1a1214, [0, 1.75, 0]), part(box(1.5, 0.1, 0.14), 0xc8282a, [0, 1.45, 0])); break;
    case 7: P.push(part(box(0.26, 1.6, 0.26), 0xe0c080, [-0.66, 0.8, 0]), part(new THREE.ConeGeometry(0.2, 0.32, 4), 0xf2c14e, [-0.66, 1.76, 0], [0, Math.PI / 4, 0]), part(box(0.26, 1.6, 0.26), 0xe0c080, [0.66, 0.8, 0]), part(new THREE.ConeGeometry(0.2, 0.32, 4), 0xf2c14e, [0.66, 1.76, 0], [0, Math.PI / 4, 0])); break;
    case 8: P.push(part(new THREE.TorusGeometry(0.85, 0.16, 6, 14, Math.PI), 0xcfeaff, [0, 0.15, 0])); break;
    case 9: P.push(part(new THREE.TorusGeometry(0.85, 0.14, 6, 14, Math.PI), 0xff8a7a, [0, 0.15, 0]));
      for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI; P.push(part(new THREE.ConeGeometry(0.07, 0.3, 5), 0x3ad8c8, [Math.cos(a) * 0.95, 0.15 + Math.sin(a) * 0.95, 0], [0, 0, a - Math.PI / 2])); } break;
    default: P.push(part(new THREE.TorusGeometry(0.85, 0.07, 6, 28), 0xf2c14e, [0, 1.15, 0]));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; P.push(part(new THREE.ConeGeometry(0.06, 0.32, 4), 0xfff0c0, [Math.cos(a) * 1.02, 1.15 + Math.sin(a) * 1.02, 0], [0, 0, a - Math.PI / 2])); }
  }
  return mergeGeometries(P, false);
}

export class WorldMap {
  constructor(app) {
    this.app = app;
    this.isOpen = false;
    this.selected = null;
    this.flight = null;
    this.maxDt = 0.05;
  }

  // ================= בנייה =================
  build() {
    if (this.scene) return;
    const scene = (this.scene = new THREE.Scene());
    scene.fog = new THREE.Fog(0xc4e4ff, 45, 130);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.2, 420);
    this.lookAt = new V3();
    scene.add(skyDome());
    scene.add(new THREE.HemisphereLight(0xe6f4ff, 0x1a3a4a, 1.3));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.3); sun.position.set(20, 30, -14); scene.add(sun);
    this.water = new THREE.Mesh(new THREE.CircleGeometry(170, 72), waterMaterial());
    this.water.rotation.x = -Math.PI / 2; this.water.position.y = -0.25;
    scene.add(this.water);

    const { base, top } = islandGeo();
    const N = ISLAND_COUNT;
    this.baseMesh = new THREE.InstancedMesh(base, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), N);
    this.topMesh = new THREE.InstancedMesh(top, new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), N);
    this.positions = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new V3(), c = new THREE.Color();
    for (let id = 1; id <= N; id++) {
      const pos = islandPos(id);
      this.positions[id] = pos;
      const sc = islandScale(id);
      q.setFromAxisAngle(new V3(0, 1, 0), id * 1.7);
      m4.compose(pos, q, s.set(sc, sc * (id === HUB_ID ? 0.8 : 1), sc));
      this.baseMesh.setMatrixAt(id - 1, m4);
      this.topMesh.setMatrixAt(id - 1, m4);
      const [sand, grass] = islandColors(id);
      this.baseMesh.setColorAt(id - 1, c.setHex(sand));
      this.topMesh.setColorAt(id - 1, c.setHex(grass));
    }
    scene.add(this.baseMesh, this.topMesh);
    this.buildFoam();
    this.buildProps();
    this.buildLandmarks();
    this.buildPath();
    this.buildMarkers();
    this.buildLabels();
    this.buildWorldSigns();
    this.buildClouds();
    this.buildTraveler();
  }

  /** קצף גלים סביב כל אי */
  buildFoam() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 34, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.35, 'rgba(255,255,255,0.75)'); g.addColorStop(0.6, 'rgba(220,250,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    this.foam = new THREE.InstancedMesh(new THREE.PlaneGeometry(4.6, 4.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9 }), ISLAND_COUNT);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new V3();
    for (let id = 1; id <= ISLAND_COUNT; id++) { const sc = islandScale(id); this.foam.setMatrixAt(id - 1, m4.compose(this.positions[id].clone().setY(-0.22), q, s.set(sc, 1, sc))); }
    this.scene.add(this.foam);
  }

  /** קישוטים לפי עולם — InstancedMesh לכל סוג */
  buildProps() {
    const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true, ...extra });
    const P = {
      rock: [new THREE.DodecahedronGeometry(0.28, 0), std(0x8a8478)],
      hut: [new THREE.ConeGeometry(0.32, 0.5, 6).translate(0, 0.25, 0), std(0x9a7a4a)],
      tree: [new THREE.ConeGeometry(0.26, 0.75, 6).translate(0, 0.42, 0), std(0x3a7a3a)],
      column: [new THREE.CylinderGeometry(0.09, 0.1, 0.8, 8).translate(0, 0.4, 0), std(0xf2ece0)],
      tower: [new THREE.CylinderGeometry(0.2, 0.24, 0.9, 8).translate(0, 0.45, 0), std(0xa8a4a0)],
      roof: [new THREE.ConeGeometry(0.28, 0.4, 8).translate(0, 1.1, 0), std(0x8a2a2a)],
      chimney: [new THREE.CylinderGeometry(0.1, 0.13, 1.0, 8).translate(0, 0.5, 0), std(0x5a4a40)],
      neon: [new THREE.BoxGeometry(0.22, 1.1, 0.22).translate(0, 0.55, 0), std(0x1a2a4a, { emissive: 0x33e0ff, emissiveIntensity: 0.9 })],
      pagoda: [new THREE.ConeGeometry(0.36, 0.3, 4).translate(0, 0.55, 0), std(0xb8282a)],
      pyramid: [new THREE.ConeGeometry(0.5, 0.75, 4).translate(0, 0.37, 0), std(0xe0c080)],
      longhouse: [new THREE.ConeGeometry(0.3, 0.5, 3).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 0.25, 0), std(0x7a5a3a)],
      coral: [new THREE.ConeGeometry(0.12, 0.6, 5).translate(0, 0.3, 0), std(0xff8a7a, { emissive: 0x6a1a10, emissiveIntensity: 0.4 })],
      dome: [new THREE.SphereGeometry(0.34, 10, 6, 0, TAU, 0, Math.PI / 2), std(0x9af0ff, { emissive: 0x2a8a9a, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 })],
      crystal: [new THREE.OctahedronGeometry(0.26, 0).translate(0, 0.65, 0), std(0xe8dcff, { emissive: 0xb89aff, emissiveIntensity: 1.1 })],
    };
    // המונומנט של כל אי (בקטן, בחלק האחורי) — כל אי במפה נראה אחרת; הכול מאוחד ל-2 רשתות
    const solids = [], glows = [];
    const mm = new THREE.Matrix4(), qq = new THREE.Quaternion(), vv = new V3(), ss = new V3();
    for (let id = 2; id <= ISLAND_COUNT; id++) {
      const type = islandDef(id).era.monument;
      if (!type) continue;
      const { solid, glow } = monumentGeometry(type);
      const p = this.positions[id];
      const prem = isPremium(id);
      const sc = (prem ? 0.24 : 0.34) * (isBoss(id) ? 1.2 : 1);
      mm.compose(vv.set(p.x, prem ? 0.16 : 0.22, p.z - (prem ? 0.28 : 0.42)), qq.identity(), ss.set(sc, sc, sc));
      if (solid) solids.push(solid.clone().applyMatrix4(mm));
      if (glow) glows.push(glow.clone().applyMatrix4(mm));
    }
    if (solids.length) this.scene.add(new THREE.Mesh(mergeGeometries(solids, false), MONUMENT_SOLID));
    if (glows.length) this.scene.add(new THREE.Mesh(mergeGeometries(glows, false), MONUMENT_GLOW));
    // מעט עצים וסלעים לגיוון
    const items = { tree: [], rock: [] };
    for (let id = 2; id <= ISLAND_COUNT; id++) {
      if (isPremium(id)) continue;
      const base = this.positions[id];
      const a = id * 2.3;
      items[id % 3 ? 'tree' : 'rock'].push([base.x + Math.cos(a) * 0.85, 0.18, base.z + Math.sin(a) * 0.35 - 0.1, 0.7, a]);
    }
    const P2 = { tree: P.tree, rock: P.rock };
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new V3(), s = new V3();
    for (const [k, list] of Object.entries(items)) {
      const im = new THREE.InstancedMesh(P2[k][0], P2[k][1], list.length);
      list.forEach(([x, y, z, sc, a], i) => { q.setFromAxisAngle(new V3(0, 1, 0), a); im.setMatrixAt(i, m4.compose(v.set(x, y, z), q, s.set(sc, sc, sc))); });
      this.scene.add(im);
    }
    // האי המרכזי: טירה קטנה, שולחן שחמט ודגל
    const hub = new THREE.Group();
    const stone = std(0xd8d0c0), gold = std(0xf2c14e, { metalness: 0.8, roughness: 0.3 });
    hub.add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.25, 24), stone));
    for (let i = 0; i < 4; i++) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 1.4, 10), stone); const a = (i / 4) * TAU + Math.PI / 4; tw.position.set(Math.cos(a) * 1.25, 0.7, Math.sin(a) * 1.25); hub.add(tw); const rf = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.55, 10), gold); rf.position.set(tw.position.x, 1.65, tw.position.z); hub.add(rf); }
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 1.1), new THREE.MeshStandardMaterial({ map: this.checkerTex(), roughness: 0.5 }));
    table.position.set(0, 0.42, -0.35); hub.add(table);
    const keep = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), stone); keep.position.set(0, 0.68, -1.15); hub.add(keep);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), std(0xf2c14e, { side: THREE.DoubleSide, emissive: 0x6a4a10, emissiveIntensity: 0.4 })); flag.position.set(0.25, 1.75, -1.15); hub.add(flag);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), gold); pole.position.set(0, 1.6, -1.15); hub.add(pole);
    hub.position.set(0, 0.35, 0);
    hub.scale.setScalar(1.25);
    this.hubFlag = flag;
    this.scene.add(hub);
  }

  checkerTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#3a2a1a' : '#f2e6c8'; x.fillRect(i * 8, j * 8, 8, 8); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
    return tex;
  }

  /** ציוני הדרך של דרכי הכניסה: שער בסגנון העולם / שלוש טבעות אור */
  buildLandmarks() {
    const plain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, flatShading: true });
    const glow = { 5: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: 0x0a7a8a, emissiveIntensity: 0.9 }), 10: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: 0x7a5a10, emissiveIntensity: 0.8 }) };
    const geos = {};
    this.gates = {};
    const hoops = [];
    for (let id = 2; id <= ISLAND_COUNT; id++) {
      const ap = approachOf(id);
      const d = inDir(id);
      const p = this.positions[id];
      if (ap === 'gate') {
        const r = regionOf(id);
        geos[r] ||= gateGeometry(r);
        const gm = new THREE.Mesh(geos[r], glow[r] || plain);
        const at = p.clone().addScaledVector(d, -2.6);
        gm.position.set(at.x, -0.2, at.z);
        gm.rotation.y = Math.atan2(d.x, d.z);
        gm.scale.setScalar(GATE_SCALE);
        this.gates[id] = gm;
        this.scene.add(gm);
      } else if (ap === 'rings') {
        HOOP_K.forEach((k, i) => { const at = p.clone().addScaledVector(d, -k); hoops.push({ id, pos: new V3(at.x, HOOP_Y[i], at.z), yaw: Math.atan2(d.x, d.z) }); });
      }
    }
    this.hoops = new THREE.InstancedMesh(new THREE.TorusGeometry(0.8, 0.07, 8, 32), new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0xffa020, emissiveIntensity: 1.1, roughness: 0.3 }), Math.max(1, hoops.length));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new V3(1, 1, 1);
    hoops.forEach((hp, i) => { q.setFromEuler(new THREE.Euler(0, hp.yaw, 0)); this.hoops.setMatrixAt(i, m4.compose(hp.pos, q, one)); });
    this.hoops.count = hoops.length;
    this.hoopList = hoops;
    this.scene.add(this.hoops);
  }

  /** שביל אבני דריכה בין האיים (זהב = נכבש) */
  buildPath() {
    // שביל רציף 1→99 על המים: זהב עד האי האחרון שנכבש, קטע "הבא" מהבהב, ואחריו מקווקו
    const pts = [];
    for (let id = 1; id < PREMIUM_FIRST; id++) pts.push(this.positions[id].clone().setY(-0.12));
    this.pathCurve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    this.pathSamples = this.pathCurve.getSpacedPoints((PREMIUM_FIRST - 2) * 16);
    this.islandSample = [];
    for (let id = 1; id < PREMIUM_FIRST; id++) {
      let best = 0, bd = 1e9;
      const p = this.positions[id];
      this.pathSamples.forEach((q, i) => { const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < bd) { bd = d; best = i; } });
      this.islandSample[id] = best;
    }
    // הילות צבע על המים — כל עולם בצבע משלו
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.55, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const tint = { 1: 0xffa94a, 2: 0xfff0c8, 3: 0x7dff4f, 4: 0xe0805a, 5: 0x3fe0ff, 6: 0xff6f9a, 7: 0xffd02a, 8: 0xd8ecff, 9: 0x2fe0b6, 10: 0xb48aff };
    this.halos = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.85, toneMapped: false }), PREMIUM_FIRST - 1);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), col = new THREE.Color();
    for (let id = 1; id < PREMIUM_FIRST; id++) {
      const p = this.positions[id];
      m4.compose(new V3(p.x, -0.2, p.z), q, sc.setScalar(id === HUB_ID ? 9 : 7.2));
      this.halos.setMatrixAt(id - 1, m4);
      this.halos.setColorAt(id - 1, col.setHex(id === HUB_ID ? 0xffffff : tint[regionOf(id)]));
    }
    this.halos.renderOrder = -1;
    this.scene.add(this.halos);
    // קווי השביל (נבנים מחדש ב-refresh לפי ההתקדמות)
    const dash = document.createElement('canvas'); dash.width = 64; dash.height = 8;
    const dx = dash.getContext('2d'); dx.fillStyle = '#ffffff'; dx.fillRect(0, 0, 30, 8);
    const dashTex = new THREE.CanvasTexture(dash); dashTex.wrapS = THREE.RepeatWrapping;
    this.ribbonMats = {
      shadow: new THREE.MeshBasicMaterial({ color: 0x0b2a4a, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
      done: new THREE.MeshBasicMaterial({ color: 0xffd25a, transparent: true, opacity: 0.98, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
      next: new THREE.MeshBasicMaterial({ color: 0x5dffb0, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
      todo: new THREE.MeshBasicMaterial({ color: 0xffffff, map: dashTex, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
    };
    this.ribbons = new THREE.Group();
    this.scene.add(this.ribbons);
    // חיצים על קטע "הבא"
    const sh = new THREE.Shape(); sh.moveTo(-0.32, -0.26); sh.lineTo(0.12, 0); sh.lineTo(-0.32, 0.26); sh.lineTo(-0.18, 0); sh.closePath();
    this.arrowGeo = new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2);
    this.arrows = [];
    for (let i = 0; i < 6; i++) { const a = new THREE.Mesh(this.arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false })); a.visible = false; a.scale.setScalar(2.1); this.scene.add(a); this.arrows.push(a); }
    // אבני זהב לאורך טבעת הפרימיום
    if (ISLAND_COUNT >= PREMIUM_FIRST) {
      const ring = [];
      for (let id = PREMIUM_FIRST; id <= ISLAND_COUNT; id++) {
        const a = this.positions[id], b = this.positions[id === ISLAND_COUNT ? PREMIUM_FIRST : id + 1];
        for (let k = 1; k < 4; k++) ring.push(a.clone().lerp(b, k / 4));
      }
      this.ringStones = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.22, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0xf2c94c, emissive: 0x7a5410, emissiveIntensity: 0.5, roughness: 0.5 }), ring.length);
      ring.forEach((pt, i) => { m4.makeTranslation(pt.x, -0.12, pt.z); this.ringStones.setMatrixAt(i, m4); });
      this.scene.add(this.ringStones);
    }
    this.pathMesh = null;
    this.pathOwners = [];
  }

  ribbonGeo(i0, i1, width, uvScale = 1) {
    const S = this.pathSamples, n = Math.max(2, i1 - i0 + 1);
    const pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
    let len = 0;
    for (let k = 0; k < n; k++) {
      const i = Math.min(S.length - 1, i0 + k);
      const p = S[i], a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)];
      const tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz) || 1;
      const sx = (-tz / tl) * width / 2, sz = (tx / tl) * width / 2;
      if (k > 0) len += p.distanceTo(S[Math.min(S.length - 1, i0 + k - 1)]);
      pos.set([p.x + sx, p.y, p.z + sz, p.x - sx, p.y, p.z - sz], k * 6);
      uv.set([len * uvScale, 0, len * uvScale, 1], k * 4);
      if (k < n - 1) { const v = k * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  updateRibbon() {
    if (!this.ribbons) return;
    this.ribbons.children.forEach((m) => m.geometry.dispose());
    this.ribbons.clear();
    const pr = this.app.progression;
    const nxt = Math.min(PREMIUM_FIRST - 1, pr.frontier() || 2);
    const last = Math.max(1, nxt - 1);
    const sDone = this.islandSample[last], sNext = this.islandSample[nxt], end = this.pathSamples.length - 1;
    const add = (i0, i1, w, mat, y = 0, uv = 1) => { if (i1 > i0) { const m = new THREE.Mesh(this.ribbonGeo(i0, i1, w, uv), mat); m.position.y = y; m.renderOrder = 2; this.ribbons.add(m); } };
    add(0, end, 0.62, this.ribbonMats.shadow, -0.005);
    add(0, sDone, 0.4, this.ribbonMats.done, 0.004);
    add(sDone, sNext, 0.4, this.ribbonMats.next, 0.006);
    add(sNext, end, 0.26, this.ribbonMats.todo, 0.004, 1 / 0.9);
    // חיצים: על הקטע אל האי הבא ועל הקטע שאחריו
    const legs = [[sDone, sNext, 0x5dffb0], [sNext, this.islandSample[Math.min(PREMIUM_FIRST - 1, nxt + 1)], 0xffffff]];
    let ai = 0;
    for (const [a, b, colr] of legs) {
      for (const f of [0.3, 0.5, 0.7]) {
        const arrow = this.arrows[ai++]; if (!arrow) break;
        const i = Math.round(a + (b - a) * f);
        const p = this.pathSamples[i], q2 = this.pathSamples[Math.min(end, i + 2)];
        arrow.position.set(p.x, 0.02, p.z);
        arrow.rotation.set(0, -Math.atan2(q2.z - p.z, q2.x - p.x), 0);
        arrow.material.color.setHex(colr);
        arrow.visible = b > a;
        arrow.userData.f = f;
      }
    }
  }

  buildMarkers() {
    const flagGeo = () => {
      const pole = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5).translate(0, 0.45, 0);
      const cloth = new THREE.PlaneGeometry(0.42, 0.26).translate(0.21, 0.76, 0);
      for (const g of [pole, cloth]) for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      return mergeGeometries([pole.toNonIndexed(), cloth.toNonIndexed()], false);
    };
    this.flags = new THREE.InstancedMesh(flagGeo(), new THREE.MeshStandardMaterial({ color: 0xf2c94c, emissive: 0x7a5410, emissiveIntensity: 0.45, side: THREE.DoubleSide, roughness: 0.4 }), ISLAND_COUNT);
    this.flags.count = 0;
    this.scene.add(this.flags);
    // דגל פיראטי הזמן: שחור עם שוליים אדומים
    this.pirateFlags = new THREE.InstancedMesh(flagGeo(), new THREE.MeshStandardMaterial({ color: 0x15121c, emissive: 0x5a0a14, emissiveIntensity: 0.6, side: THREE.DoubleSide, roughness: 0.5 }), ISLAND_COUNT);
    this.pirateFlags.count = 0;
    this.scene.add(this.pirateFlags);
    // ערפל מעל איים שעוד לא נפתחו
    this.fogPuffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xc8d4e2, emissiveIntensity: 0.6, transparent: true, opacity: 0.78, depthWrite: false }), ISLAND_COUNT * 3);
    this.fogPuffs.count = 0;
    this.scene.add(this.fogPuffs);
    this.buildBotAura();
    this.nextRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.08, 8, 48), new THREE.MeshBasicMaterial({ color: 0x2ee59d, transparent: true, opacity: 0.85 }));
    this.nextRing.rotation.x = Math.PI / 2;
    this.scene.add(this.nextRing);
    this.selRing = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.07, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    this.selRing.rotation.x = Math.PI / 2;
    this.selRing.visible = false;
    this.scene.add(this.selRing);
  }

  buildLabels() {
    this.labels = [];
    for (let id = 1; id <= ISLAND_COUNT; id++) {
      const boss = isBoss(id);
      const tex = labelTexture(String(id), { bg: boss ? 'rgba(90,40,10,0.85)' : 'rgba(12,8,24,0.78)', w: id === HUB_ID || boss ? 112 : 84, ic: id === HUB_ID ? 'home' : boss ? 'crown' : null });
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
      const p = this.positions[id];
      const prem = isPremium(id);
      sp.position.set(p.x, id === HUB_ID ? 1.6 : prem ? 1.05 : 1.4, p.z + (id === HUB_ID ? 3.9 : prem ? 1.05 : 1.6));
      sp.scale.set((id === HUB_ID || boss ? 2.1 : 1.6) * (prem ? 0.78 : 1), (id === HUB_ID || boss ? 1.05 : 0.95) * (prem ? 0.78 : 1), 1);
      sp.userData.id = id;
      this.labels.push(sp);
      this.scene.add(sp);
    }
  }

  /** שלט לכל עולם, בתחילת הקטע שלו בספירלה */
  buildWorldSigns() {
    const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    this.worldSigns = [];
    for (let w = 1; w <= 10; w++) {
      const first = Math.max(2, (w - 1) * 10 + 1);
      const p = this.positions[first];
      const out = p.clone().setY(0).normalize();
      const era = getEra(w);
      const tex = labelTexture(`עולם ${ROMAN[w - 1]} · ${era.name}`, { w: 300, h: 56, bg: 'rgba(40,26,80,0.9)', fg: '#ffe9a8' });
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
      sp.position.set(p.x + out.x * 3.2, 2.6, p.z + out.z * 3.2);
      sp.scale.set(5.4, 1.0, 1);
      sp.userData.world = w;
      this.scene.add(sp);
      this.worldSigns.push(sp);
    }
    const gold = labelTexture('איי הזהב · פרימיום', { w: 260, h: 56, bg: 'rgba(80,52,6,0.92)', fg: '#ffe08a' });
    const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: gold, depthWrite: false, transparent: true }));
    gs.position.set(0, 3, -44 - 3.6); gs.scale.set(5, 1.05, 1);
    this.scene.add(gs);
    this.goldSign = gs;
  }

  buildClouds() {
    this.cloudTex = cloudTexture();
    this.clouds = [];
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * TAU, r = 6 + Math.random() * 46;
      const s = 6 + Math.random() * 8;
      this.clouds.push(this.addCloud(new V3(Math.cos(a) * r, 12 + Math.random() * 5, Math.sin(a) * r), s, 0.7 + Math.random() * 0.25, 6, 13));
    }
  }

  addCloud(pos, size, opacity, near, far) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.cloudTex, transparent: true, depthWrite: false, opacity }));
    sp.position.copy(pos);
    sp.scale.set(size, size * 0.5, 1);
    sp.userData = { v: 0.15 + Math.random() * 0.35, o: opacity, near, far };
    this.scene.add(sp);
    return sp;
  }

  // ================= המטייל: האווטאר שלך על החיה שלך =================
  buildTraveler() {
    this.updaters = new Set();
    const onUpdate = (fn) => { this.updaters.add(fn); return () => this.updaters.delete(fn); };
    this.fx = new FX({ world: this.scene, camera: this.camera, renderer: this.app.sm.renderer, onUpdate });
    this.traveler = new THREE.Group();
    this.traveler.rotation.order = 'YXZ';
    this.traveler.scale.setScalar(0.42);
    this.scene.add(this.traveler);
    this.avatar = new PlayerAvatar3D({ world: this.traveler, onUpdate, addShake() {} }, this.fx);
    this.avatar.throne.visible = false;
    this.avatar.group.children.forEach((ch) => { if (ch.isMesh) ch.visible = false; }); // צל המגע של הכס
    this.petHolder = new THREE.Group();
    this.traveler.add(this.petHolder);
    const disc = new THREE.CircleGeometry(0.34, 20).rotateX(-Math.PI / 2);
    this.stones = Array.from({ length: 18 }, () => {
      const m = new THREE.Mesh(disc, new THREE.MeshBasicMaterial({ color: 0x9ff6ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.visible = false; this.scene.add(m); return m;
    });
    this.stoneIdx = 0;
    this.stoneT = 0;
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x001424, transparent: true, opacity: 0, depthWrite: false }));
    this.scene.add(this.blob);
  }

  /** מלביש את המטייל לפי השחקן: הבגדים והחיה */
  dressTraveler() {
    const e = this.app.economy;
    this.avatar.setLoadout(e.loadout, { instant: true });
    const petKey = `${e.pet}:${e.petHue}`;
    if (this.petId !== petKey) {
      this.petId = petKey;
      this.petHolder.clear();
      const rig = buildPetRig(e.pet, { hue: e.petHue });
      rig.root.updateMatrixWorld(true);
      // כל חיה בגודל אחר — מנרמלים: ברכיבה החיה ארוכה פי ~2 מהאווטאר היושב
      const sz = new THREE.Box3().setFromObject(rig.body).getSize(new V3());
      const size = Math.max(sz.x, sz.y, sz.z) || 1;
      this.rideScale = THREE.MathUtils.clamp(2.5 / size, 0.9, 3.2);
      this.standScale = THREE.MathUtils.clamp(1.15 / size, 0.55, 1.4);
      const bodyMesh = rig.body.children.find((ch) => ch.isMesh) || rig.body;
      const b = new THREE.Box3().setFromObject(bodyMesh);
      this.backTop = b.max.y;
      this.backZ = (b.min.z + b.max.z) / 2;
      const hb = new THREE.Box3().setFromObject(rig.head);
      if (!hb.isEmpty()) this.backZ = Math.min(this.backZ, hb.min.z - 0.12);
      rig.body.userData.y0 = rig.body.position.y;
      this.rig = rig;
      this.petHolder.add(rig.root);
      this.flyer = isFlyer(e.pet);
      this.unicorn = e.pet === 'crystal_unicorn';
      this.ground = !this.flyer && !this.unicorn;
    }
    this.setRiding(false, true);
  }

  /** רכיבה: החיה גדלה והאווטאר קופץ על גבה. ירידה: זה לצד זה */
  setRiding(on, instant = false) {
    this.riding = on;
    const s = on ? this.rideScale : this.standScale;
    const petP = on ? [0, 0, 0] : [0.95, 0, -0.15];
    const avP = on ? [0, this.backTop * this.rideScale - 0.5, this.backZ * this.rideScale] : [-0.55, 0, 0.2];
    const ph = this.petHolder, g = this.avatar.group.position;
    gsap.killTweensOf([ph.scale, ph.position, g]);
    if (instant) { ph.scale.setScalar(s); ph.position.set(...petP); g.set(...avP); }
    else {
      const d = 0.5;
      gsap.to(ph.scale, { x: s, y: s, z: s, duration: d, ease: on ? 'back.out(1.7)' : 'power2.out' });
      gsap.to(ph.position, { x: petP[0], y: petP[1], z: petP[2], duration: d, ease: 'power2.out' });
      gsap.to(g, { x: avP[0], z: avP[2], duration: d, ease: 'power1.inOut' });
      gsap.to(g, { keyframes: [{ y: Math.max(g.y, avP[1]) + 0.9, duration: d * 0.45, ease: 'power2.out' }, { y: avP[1], duration: d * 0.55, ease: 'power2.in' }] });
    }
    this.avatar.pose.stand = on ? 0 : 1;
    this.avatar.applyPose();
    this.avatar.legs.forEach(({ thigh }, i) => { thigh.rotation.z = on ? (i ? 1 : -1) * 0.55 : 0; });
  }

  placeTraveler(id) {
    this.traveler.position.copy(standOf(id));
    this.traveler.rotation.set(0, 0, 0);
  }

  animatePet(dt, tt, moving) {
    const r = this.rig;
    if (!r) return;
    r.tails.forEach((chain, ci) => chain.forEach((seg, i) => { seg.rotation.y = Math.sin(tt * (3 + r.wag) + i * 0.6 + ci) * (0.25 + r.wag * 0.08); }));
    const fly = moving && this.flyer;
    r.wings.forEach((w) => { const sd = w.userData.side || 1; const fl = fly ? Math.sin(tt * 9) * 0.8 : Math.sin(tt * 1.4) * 0.06; w.rotation.z = sd * (0.2 + fl * (fly ? 0.9 : (r.flap || 0.3))); });
    const run = moving && !this.flyer;
    r.legs.forEach((leg, i) => { leg.rotation.x = run ? Math.sin(tt * 14 + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.7 : 0)) * 0.7 : leg.rotation.x * 0.85; });
    r.body.position.y = (r.body.userData.y0 ?? 0) + (run ? Math.abs(Math.sin(tt * 7)) * 0.04 : fly ? Math.sin(tt * 9) * 0.02 : 0);
    if (r.aura) r.aura.rotation.z += dt * 0.8;
  }

  /** מצב: צבעי איים, דגלי כיבוש, פיראטים, ערפל על איים נעולים, שביל זהב */
  refresh() {
    const pr = this.app.progression;
    const c = new THREE.Color(), dim = new THREE.Color(0x2a3442);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new V3(), v = new V3();
    let f = 0, pf = 0, fog = 0;
    const goldFog = new THREE.Color(0xffd36a), whiteFog = new THREE.Color(0xffffff);
    const front = pr.frontier() || ISLAND_COUNT + 1;
    this.fogIdx = {};
    for (let id = 1; id <= ISLAND_COUNT; id++) {
      const [sand, grass] = islandColors(id);
      const locked = pr.needsFullGame(id) || (pr.isUnlocked ? !pr.isUnlocked(id) : false);
      this.baseMesh.setColorAt(id - 1, c.setHex(sand).lerp(dim, locked ? 0.45 : 0));
      this.topMesh.setColorAt(id - 1, c.setHex(grass).lerp(dim, locked ? 0.5 : 0));
      const p = this.positions[id];
      if (id !== HUB_ID && pr.isConquered(id)) {
        m4.makeTranslation(p.x + 0.5, 0.2, p.z - 0.72);
        if (pr.hasPirates?.(id)) this.pirateFlags.setMatrixAt(pf++, m4); else this.flags.setMatrixAt(f++, m4);
      }
      const prem = isPremium(id);
      const foggy = id !== HUB_ID && !pr.isConquered(id) && !pr.isVisited?.(id) && (prem ? locked : id > front || id === this.fogPending);
      if (foggy) {
        // איי פרימיום שעוד לא נפתחו: ערפל זהוב קטן; איים רגילים אחרי האי הבא: ערפל לבן
        const k0 = prem ? 0.62 : 1;
        const fog0 = fog;
        for (let k = 0; k < 3; k++) {
          const a = id * 1.3 + k * 2.1;
          this.fogPuffs.setColorAt(fog, prem ? goldFog : whiteFog);
          this.fogPuffs.setMatrixAt(fog++, m4.compose(v.set(p.x + Math.cos(a) * 0.6 * k0, (0.72 + k * 0.12) * k0, p.z + Math.sin(a) * 0.42 * k0), q, s.set((1.0 - k * 0.14) * k0, 0.42 * k0, 0.8 * k0)));
        }
        this.fogIdx[id] = [fog0, fog];
      }
    }
    this.flags.count = f; this.flags.instanceMatrix.needsUpdate = true;
    this.pirateFlags.count = pf; this.pirateFlags.instanceMatrix.needsUpdate = true;
    this.fogPuffs.count = fog; this.fogPuffs.instanceMatrix.needsUpdate = true;
    if (this.fogPuffs.instanceColor) this.fogPuffs.instanceColor.needsUpdate = true;
    this.baseMesh.instanceColor.needsUpdate = true;
    this.topMesh.instanceColor.needsUpdate = true;
    const gold = new THREE.Color(0xffd36a), grey = new THREE.Color(0x6a7486);
    this.updateRibbon();
    const nxL = pr.frontier() || 2;
    this.labels?.forEach((l) => { const id = l.userData.id; l.visible = id === HUB_ID || isBoss(id) || isPremium(id) || Math.abs(id - nxL) <= 5; });
    const cur = pr.currentIsland();
    const nx = pr.frontier();
    this.nextRing.visible = !!nx && nx !== cur;
    if (nx) this.nextRing.position.copy(this.positions[nx]).setY(0.12);
    // הילת הבוט: איים שביקרת בהם ועוד לא כבשת (חוץ מהאי שאתה עליו, מהאי הבא ומיעד הטיסה)
    this.auraIds = [];
    for (let id = 1; id <= ISLAND_COUNT; id++) if (pr.botRules?.(id) && id !== cur && id !== nx && id !== this.auraSkip) this.auraIds.push(id);
    this.auraIds.forEach((id, i) => {
      const sc = islandScale(id), p = this.positions[id];
      this.auraWall.setMatrixAt(i, m4.compose(v.set(p.x, -0.2, p.z), q.identity(), s.set(1.68 * sc, 1.25 * sc, 1.68 * sc)));
    });
    for (const a of [this.auraWall, this.auraRing, this.auraCrown]) a.count = this.auraIds.length;
    this.auraWall.instanceMatrix.needsUpdate = true;
    this.updateAuras(0, this.time || 0);
    if (this.flight) { this.labels?.forEach((l) => { l.visible = false; }); this.nextRing.visible = false; }
  }

  /** הילת השליטה של הבוט: טבעת זוהרת על המים, קיר אור שקוף סביב האי וכתר אדום שמרחף מעליו */
  buildBotAura() {
    const N = ISLAND_COUNT;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 18, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,30,80,0)'); g.addColorStop(0.5, 'rgba(255,30,80,0.28)'); g.addColorStop(0.7, 'rgba(255,60,110,0.95)');
    g.addColorStop(0.8, 'rgba(255,30,80,0.42)'); g.addColorStop(1, 'rgba(255,30,80,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const ringTex = new THREE.CanvasTexture(c); ringTex.colorSpace = THREE.SRGBColorSpace;
    this.auraRing = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, toneMapped: false }), N);
    const w = document.createElement('canvas'); w.width = 256; w.height = 64;
    const y = w.getContext('2d');
    for (let i = 0; i < 256; i++) {
      const a = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.11) * Math.sin(i * 0.037 + 1));
      const gr = y.createLinearGradient(0, 64, 0, 0); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.45, `rgba(255,255,255,${a * 0.35})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      y.fillStyle = gr; y.fillRect(i, 0, 1, 64);
    }
    const wallTex = new THREE.CanvasTexture(w); wallTex.wrapS = THREE.RepeatWrapping; wallTex.repeat.x = 2;
    this.auraWall = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 40, 1, true).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ map: wallTex, color: 0xff2a5a, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), N);
    const parts = [new THREE.CylinderGeometry(0.3, 0.26, 0.2, 10, 1).translate(0, 0.1, 0)];
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; parts.push(new THREE.ConeGeometry(0.075, 0.24, 4).translate(Math.sin(a) * 0.27, 0.32, Math.cos(a) * 0.27)); }
    this.auraCrown = new THREE.InstancedMesh(mergeGeometries(parts, false), new THREE.MeshStandardMaterial({ color: 0xd8283a, emissive: 0x8a0a1c, emissiveIntensity: 0.9, metalness: 0.35, roughness: 0.35, flatShading: true }), N);
    for (const m of [this.auraRing, this.auraWall, this.auraCrown]) { m.count = 0; m.frustumCulled = false; this.scene.add(m); }
    this.auraIds = [];
  }

  /** פעימת ההילה, קיר האור מסתובב והכתר מרחף */
  updateAuras(dt, tt) {
    if (this.filmMode && this.auraCrown?.count) for (const a of [this.auraWall, this.auraRing, this.auraCrown]) a.count = 0; // הסרט: בלי הילות (כמו בלי ערפל)
    if (!this.auraIds?.length || this.filmMode) return;
    const pulse = 0.5 + 0.5 * Math.sin(tt * 2.4);
    this.auraRing.material.opacity = 0.62 + 0.33 * pulse;
    this.auraWall.material.opacity = 0.42 + 0.28 * pulse;
    this.auraWall.material.map.offset.x = (tt * 0.05) % 1;
    // גצים אדומים שעולים משפת האי
    this.auraAcc = (this.auraAcc || 0) + dt;
    while (this.auraAcc > 0.11) {
      this.auraAcc -= 0.11;
      const id = this.auraIds[(this.auraTurn = ((this.auraTurn || 0) + 1) % this.auraIds.length)], p = this.positions[id], sc = islandScale(id);
      this.fx.add.emit({ count: 1, pos: [p.x, 0.05, p.z], ring: [1.45 * sc, 1.7 * sc], vel: [0, 1.1, 0], velSpread: [0.12, 0.35, 0.12], color: [0xff3a6a, 0xff8ab0, 0xffc8d6], size: [0.07, 0.15], life: [0.9, 1.5] });
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new V3(), v = new V3(), up = new V3(0, 1, 0);
    this.auraIds.forEach((id, i) => {
      const sc = islandScale(id), p = this.positions[id], k = 4.9 * sc * (1 + pulse * 0.07);
      this.auraRing.setMatrixAt(i, m4.compose(v.set(p.x, -0.17, p.z), q.identity(), s.set(k, 1, k)));
      this.auraCrown.setMatrixAt(i, m4.compose(v.set(p.x, 1.3 * sc + 0.42 + Math.sin(tt * 1.7 + id) * 0.09, p.z), q.setFromAxisAngle(up, tt * 0.9 + id), s.setScalar(1.35 * Math.max(0.8, sc))));
    });
    this.auraRing.instanceMatrix.needsUpdate = true;
    this.auraCrown.instanceMatrix.needsUpdate = true;
  }

  // ================= פתיחה / סגירה =================
  /** travel: נפתחת לטיסה (בלי כרטיס ובלי כפתורים) */
  open({ focus, travel = false } = {}) {
    if (this.isOpen) return;
    this.build();
    const front = this.app.progression.frontier();
    const lifted = this.app.store.get('mapFogLifted') ?? (front ? front - 1 : 0);
    this.fogPending = front && front < PREMIUM_FIRST && lifted < front ? front : null;
    this.refresh();
    if (this.fogPending && !travel) setTimeout(() => this.liftFog(this.fogPending), 1100);
    this.dressTraveler();
    const cur = this.app.progression.currentIsland();
    this.placeTraveler(cur);
    this.isOpen = true;
    const sm = this.app.sm;
    sm.paused = true;
    this.prevControls = sm.controls.enabled;
    sm.controls.enabled = false;
    document.getElementById('app').classList.add('map-open');
    this.ui = this.buildUi();
    if (travel) this.ui?.classList.add('flying');
    let target = this.positions[focus || cur] || new V3();
    const nxt = this.app.progression.frontier();
    if (!focus && nxt && this.positions[nxt]) target = target.clone().lerp(this.positions[nxt], 0.5);
    this.view = { x: target.x, z: target.z, h: 15, vx: 0, vz: 0 };
    this.applyView();
    this.bindInput();
    this.last = performance.now();
    this.time = 0;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    if (!travel) setTimeout(() => this.select(focus || this.app.progression.frontier() || cur, { fly: false }), 250);
  }

  /**
   * הערפל מעל אי מתפזר: הענן עולה, מתנפח ונעלם בנצנוצים. בלי reveal — האי הבא אחרי ניצחון;
   * עם reveal — אי מכוסה שטסים אליו (הערפל נחשף בדרך, והאי נשמר כאי שביקרת בו)
   */
  liftFog(id, reveal = false) {
    if (!this.isOpen || (!reveal && this.fogPending !== id)) return;
    if (reveal) this.app.progression.visit(id);
    else this.app.store.set({ mapFogLifted: id });
    const range = this.fogIdx?.[id];
    if (!range) { if (!reveal) this.fogPending = null; return; }
    const [i0, i1] = range;
    const base = [], m4 = new THREE.Matrix4();
    for (let i = i0; i < i1; i++) { this.fogPuffs.getMatrixAt(i, m4); base.push(m4.clone()); }
    const p = this.positions[id];
    this.app.sound.whoosh?.(1.2);
    this.fx.sparkle([p.x, 1.1, p.z], 46);
    const pos = new V3(), q = new THREE.Quaternion(), sc = new V3();
    let t = 0;
    const up = (dt) => {
      t += dt;
      const k = Math.min(1, t / 1.7), e = k * k * (3 - 2 * k);
      base.forEach((b, j) => {
        b.decompose(pos, q, sc);
        const a = (j / base.length) * TAU + id;
        pos.x += Math.cos(a) * e * 1.7; pos.z += Math.sin(a) * e * 1.3; pos.y += e * 1.6;
        sc.multiplyScalar(Math.max(0.001, 1 + e * 0.7 - e * e * 1.7));
        this.fogPuffs.setMatrixAt(i0 + j, m4.compose(pos, q, sc));
      });
      this.fogPuffs.instanceMatrix.needsUpdate = true;
      if (k >= 1) {
        this.updaters.delete(up);
        if (!reveal) this.fogPending = null;
        this.fx.sparkle([p.x, 0.8, p.z], 24, [0xffe08a, 0xffffff]);
        this.app.sound.chime?.(2);
        this.refresh();
      }
    };
    this.updaters.add(up);
  }

  close() {
    if (!this.isOpen) return;
    this.fogPending = null;
    this.auraSkip = null;
    this.isOpen = false;
    this.endFlightExtras();
    this.flight = null;
    this.labels?.forEach((l) => { l.visible = true; });
    this.worldSigns?.forEach((w) => { w.visible = true; });
    if (this.goldSign) this.goldSign.visible = true;
    if (this.fogPuffs) this.fogPuffs.visible = true;
    this.unbind?.();
    this.ui?.remove();
    this.ui = null;
    document.getElementById('app').classList.remove('map-open');
    const sm = this.app.sm;
    sm.controls.enabled = this.prevControls !== false;
    sm.paused = false;
    sm.resize?.();
    this.app.ui.setActiveTab?.(null);
  }

  loop(now) {
    if (!this.isOpen) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.maxDt, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    const tt = this.time;
    if (this.flight) this.stepFlight(dt);
    else if (this.filmMode) this.animatePet(dt, tt, false);
    else {
      const v = this.view;
      if (!this.dragging) { v.x += v.vx * dt; v.z += v.vz * dt; v.vx *= Math.pow(0.04, dt); v.vz *= Math.pow(0.04, dt); }
      this.applyView();
      this.animatePet(dt, tt, false);
    }
    this.avatar.lookAt(this.camera.position);
    this.updaters.forEach((fn) => fn(dt, tt));
    this.water.material.uniforms.uTime.value = tt;
    const pulse = 0.5 + 0.5 * Math.sin(tt * 4);
    this.nextRing.scale.setScalar(1 + pulse * 0.08);
    this.nextRing.material.opacity = 0.5 + pulse * 0.45;
    this.updateAuras(dt, tt);
    if (this.selRing.visible) this.selRing.rotation.z += dt * 0.8;
    this.hubFlag.rotation.y = Math.sin(tt * 2.4) * 0.25;
    if (this.ribbonMats) this.ribbonMats.next.opacity = 0.55 + 0.45 * pulse;
    this.arrows?.forEach((a) => { if (a.visible) a.material.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(tt * 5 - (a.userData.f || 0) * 9)); });
    const cam = this.camera.position;
    for (const cl of this.clouds) {
      cl.position.x += cl.userData.v * dt;
      if (cl.position.x > 60) cl.position.x = -60;
      cl.material.opacity = cl.userData.o * THREE.MathUtils.smoothstep(cl.position.distanceTo(cam), cl.userData.near, cl.userData.far);
    }
    for (const st of this.stones) if (st.visible) { st.material.opacity -= dt * 1.1; st.scale.multiplyScalar(1 + dt * 0.7); if (st.material.opacity <= 0) st.visible = false; }
    const r = this.app.sm.renderer;
    const canvas = r.domElement;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w && h && Math.abs(this.camera.aspect - w / h) > 0.001) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    r.render(this.scene, this.camera);
  }

  /** מצלמת סיור: זום-אין משטיח את הזווית ומראה אופק ושמיים; זום-אאוט מלמעלה */
  applyView() {
    const v = this.view;
    const lim = 50;
    const d = Math.hypot(v.x, v.z);
    if (d > lim) { v.x *= lim / d; v.z *= lim / d; }
    v.h = Math.max(5, Math.min(58, v.h));
    if (this.scene.fog) { this.scene.fog.near = 45 + Math.max(0, v.h - 20) * 1.2; this.scene.fog.far = 130 + Math.max(0, v.h - 20) * 2.4; }
    const k = THREE.MathUtils.clamp((v.h - 5) / 35, 0, 1);
    const pitch = THREE.MathUtils.degToRad(24 + k * 30);
    this.camera.position.set(v.x, v.h, v.z + v.h / Math.tan(pitch));
    this.lookAt.set(v.x, 0, v.z);
    this.camera.lookAt(this.lookAt);
  }

  ray(cx, cy) {
    const r = this.app.sm.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    return ray;
  }
  groundAt(cx, cy) {
    const ray = this.ray(cx, cy).ray;
    const tt = -ray.origin.y / Math.min(-0.01, ray.direction.y);
    return ray.origin.clone().addScaledVector(ray.direction, Math.min(tt, 300));
  }

  pickIsland(cx, cy) {
    const hit = this.ray(cx, cy).intersectObjects([this.baseMesh, this.topMesh, ...this.labels], false)[0];
    if (hit) return hit.object.isSprite ? hit.object.userData.id : hit.instanceId + 1;
    const g = this.groundAt(cx, cy);
    let best = null, bd = 2.8;
    for (let id = 1; id <= ISLAND_COUNT; id++) { const dd = this.positions[id].distanceTo(g); if (dd < bd) { bd = dd; best = id; } }
    return best;
  }

  bindInput() {
    const el = this.app.sm.renderer.domElement;
    const pts = new Map();
    let start = null, pinch = null;
    const down = (e) => {
      if (!this.isOpen) return;
      e.preventDefault(); e.stopPropagation();
      if (this.filmMode) return;
      if (this.flight) { this.flight.speed = 3.2; this.flightHud?.classList.add('fast'); return; } // נגיעה בזמן מסע = מהר יותר
      el.setPointerCapture?.(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, t: performance.now(), g: this.groundAt(e.clientX, e.clientY) }; this.dragging = true; this.view.vx = this.view.vz = 0; }
      else if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), h: this.view.h }; start = null; }
    };
    const move = (e) => {
      if (!this.isOpen || !pts.has(e.pointerId) || this.flight) return;
      e.preventDefault(); e.stopPropagation();
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.view.h = pinch.h * (pinch.d / Math.max(20, d)); return; }
      if (start) {
        const g = this.groundAt(e.clientX, e.clientY);
        const px = this.view.x, pz = this.view.z;
        this.view.x -= g.x - start.g.x; this.view.z -= g.z - start.g.z;
        this.applyView();
        start.g = this.groundAt(e.clientX, e.clientY);
        const dt = Math.max(0.008, (performance.now() - (start.lt || start.t)) / 1000);
        this.view.vx = ((this.view.x - px) / dt) * 0.5; this.view.vz = ((this.view.z - pz) / dt) * 0.5;
        start.lt = performance.now();
      }
    };
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      e.preventDefault(); e.stopPropagation();
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (start && pts.size === 0 && !this.flight) {
        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        if (moved < 10 && performance.now() - start.t < 500) {
          this.view.vx = this.view.vz = 0;
          // נגיעה כפולה באי = נכנסים אליו ישר. לפי מקום הנגיעה הראשונה (המפה כבר זזה אל האי שנבחר)
          const now = performance.now(), lt = this.lastTap;
          if (lt && now - lt.t < 420 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 45) { this.lastTap = null; this.onEnter?.(lt.id); }
          else {
            const id = this.pickIsland(e.clientX, e.clientY);
            if (id) { this.select(id); this.lastTap = { id, t: now, x: e.clientX, y: e.clientY }; } else this.lastTap = null;
          }
        }
      }
      if (pts.size === 0) { start = null; this.dragging = false; }
    };
    const wheel = (e) => { if (!this.isOpen || this.flight) return; e.preventDefault(); this.view.h *= Math.exp(e.deltaY * 0.0012); };
    const key = (e) => {
      if (!this.isOpen) return;
      if (this.flight) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.flight.speed = 3.2; } return; }
      if (e.key === 'Escape') { e.stopPropagation(); this.close(); }
      const cur = this.selected || this.app.progression.currentIsland();
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); this.select(Math.min(ISLAND_COUNT, cur + 1)); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); this.select(Math.max(1, cur - 1)); }
    };
    el.addEventListener('pointerdown', down, true);
    el.addEventListener('pointermove', move, true);
    el.addEventListener('pointerup', up, true);
    el.addEventListener('pointercancel', up, true);
    el.addEventListener('wheel', wheel, { passive: false });
    document.addEventListener('keydown', key, true);
    this.unbind = () => {
      el.removeEventListener('pointerdown', down, true);
      el.removeEventListener('pointermove', move, true);
      el.removeEventListener('pointerup', up, true);
      el.removeEventListener('pointercancel', up, true);
      el.removeEventListener('wheel', wheel);
      document.removeEventListener('keydown', key, true);
    };
  }

  /** בחירת אי: המצלמה עפה אליו + כרטיס */
  select(id, { fly = true } = {}) {
    if (!id || this.flight) return;
    this.selected = id;
    const p = this.positions[id];
    this.selRing.visible = true;
    this.selRing.position.copy(p).setY(0.14);
    this.selRing.scale.setScalar(id === HUB_ID ? 1.9 : isBoss(id) ? 1.25 : 1);
    if (fly) gsap.to(this.view, { x: p.x, z: p.z, h: Math.min(this.view.h, 11), duration: 0.6, ease: 'power2.out' });
    else { this.view.x = p.x; this.view.z = p.z; }
    this.app.sound.ui?.();
    this.onSelect?.(id, islandDef(id), tierOf(islandDef(id).bot.rating), getEra(regionOf(id)));
  }

  buildUi() { return this.app.buildMapUi(this); }

  // ================= המסע =================
  /** נקודות המסלול: המראה, שיוט, ואז דרך הכניסה של אי היעד */
  routePoints(fromId, toId) {
    const A = standOf(fromId);
    const land = standOf(toId);
    const B = islandPos(toId).setY(land.y);
    const ap = approachOf(toId);
    const dir = inDir(toId);
    const flat = B.clone().sub(A).setY(0);
    const dist = Math.max(0.001, flat.length());
    const fd = flat.clone().divideScalar(dist);
    const side = new V3(-fd.z, 0, fd.x);
    const cruise = this.ground ? 0.05 : (this.unicorn ? 1.9 : 2.5) + Math.min(3.5, dist * 0.06);
    const S = (k, y) => B.clone().addScaledVector(dir, -k).setY(y);
    const pts = [A.clone(), A.clone().addScaledVector(fd, 0.7).setY(A.y + (this.ground ? 0.5 : 0.9))];
    if (ap === 'hop') {
      // איי הפרימיום בטבעת הזהב החיצונית: קשת גבוהה ומהירה
      const mid = A.clone().lerp(B, 0.55); mid.y = (this.ground ? 0.6 : Math.max(1.6, cruise * 0.8)) + Math.min(5, dist * 0.12);
      pts.push(mid, B.clone().addScaledVector(fd, -0.9).setY(this.ground ? 0.3 : 0.9), land);
      return { pts, ap, B, land, dir };
    }
    const entry = S(4.6, cruise);
    if (dist > 8) { const mid = A.clone().lerp(entry, 0.5).addScaledVector(side, Math.min(4, dist * 0.1)); mid.y = cruise + (this.ground ? 0.1 : 1.2); pts.push(mid); }
    const gy = -0.2 + (GATE_CENTER[regionOf(toId)] || 0.8) * GATE_SCALE - 0.45;
    switch (ap) {
      case 'gate': pts.push(entry, S(3.6, gy + 0.35), S(2.6, gy), S(1.7, Math.max(0.4, gy * 0.6))); break;
      case 'rings': pts.push(entry, ...HOOP_K.map((k, i) => S(k, HOOP_Y[i] - 0.42)), S(1.3, 0.6)); break;
      case 'skim': pts.push(entry, S(3.6, 0.45), S(2.7, -0.08), S(1.8, -0.08), S(1.15, 0.45)); break;
      case 'spiral': {
        const R = toId === HUB_ID ? 4.4 : 2.8;
        const a0 = Math.atan2(-dir.z, -dir.x);
        pts.push(entry);
        for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * TAU * 0.9; pts.push(new V3(B.x + Math.cos(a) * R, Math.max(0.6, Math.max(cruise, 1.6) * 0.85 - i * 0.2), B.z + Math.sin(a) * R)); }
        break;
      }
      case 'dive': pts.push(entry, S(2.4, cruise + 2.4), B.clone().setY(cruise + 3.4), B.clone().setY(1.6)); break;
      default: pts.push(entry, S(3.8, 0.6), S(3.1, 0.04), S(2.1, 0.04), S(1.3, 0.3));
    }
    pts.push(land);
    return { pts, ap, B, land, dir };
  }

  /** מסע מאי לאי. מחזיר Promise כשהמצלמה צללה אל אי היעד */
  travel(fromId, toId, { hud = true } = {}) {
    this.build();
    if (!this.isOpen) this.open({ focus: fromId, travel: true });
    const { pts, ap, B, land, dir } = this.routePoints(fromId, toId);
    // טסים אל אי: ההילה שלו נעלמת (באים להילחם), ואם הוא מכוסה בערפל — הערפל נחשף בדרך
    const reveal = !this.filmMode && !!this.fogIdx?.[toId];
    if (!this.filmMode) { this.auraSkip = toId; this.refresh(); }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    const len = curve.getLength();
    this.selRing.visible = false;
    this.nextRing.visible = false;
    this.labels.forEach((l) => { l.visible = false; });
    this.worldSigns?.forEach((w) => { w.visible = false; });
    if (this.goldSign) this.goldSign.visible = false;
    this.ui?.classList.add('flying');
    this.placeTraveler(fromId);
    this.traveler.rotation.y = Math.atan2(pts[1].x - pts[0].x, pts[1].z - pts[0].z);
    this.setRiding(true);
    this.app.sound.petVoice?.(this.rig?.voice || 'wolf');
    this.endFlightExtras();
    const premTrip = isPremium(toId) || isPremium(fromId);
    const f = { reveal, curve, len, t: -0.75, dur: premTrip ? THREE.MathUtils.clamp(len / 12, 2.2, 3.6) : THREE.MathUtils.clamp(len / 6.2, 2.6, 6.4), speed: 1, phase: 'fly', ap, B, land, dir, toId,
      camPos: this.camera.position.clone(), camLook: this.lookAt.clone(), prevYaw: null, yawRate: 0, clouds: [], hoops: [], gate: null, whoosh: false };
    if (ap === 'bridge') this.buildBridge(B, dir, toId);
    if (ap === 'rings') f.hoops = this.hoopList.filter((hp) => hp.id === toId).map((hp) => ({ pos: hp.pos, passed: false }));
    if (ap === 'gate' && this.gates[toId]) f.gate = { pos: this.gates[toId].position.clone(), passed: false };
    if (!this.ground) {
      // עננים לאורך המסלול שעוברים דרכם
      for (let i = 0; i < 2; i++) {
        const p = curve.getPointAt(0.35 + i * 0.22);
        const sd = (i ? 1 : -1) * (1.6 + Math.random() * 0.8);
        const tg = curve.getTangentAt(0.35 + i * 0.22);
        const off = new V3(-tg.z, 0, tg.x).normalize().multiplyScalar(sd).add(new V3(0, (Math.random() - 0.5) * 0.5, 0));
        f.clouds.push(this.addCloud(p.add(off), 3 + Math.random() * 1.6, 0.72, 0.8, 2.8));
      }
    }
    if (hud) this.showFlightHud(toId);
    return new Promise((resolve) => { f.resolve = resolve; this.flight = f; });
  }

  /** סיום מסע בלי לסגור את המפה (לסרט): המטייל נשאר באי היעד */
  endTravel() {
    const f = this.flight;
    if (!f) return;
    this.endFlightExtras();
    this.flight = null;
    this.placeTraveler(f.toId);
  }

  /** לסרט: דגלי פיראטים לדוגמה וספינת פיראטים שמשייטת בין האיים */
  showDemoPirates(ids = []) {
    const m4 = new THREE.Matrix4();
    let n = this.pirateFlags.count;
    for (const id of ids) { const p = this.positions[id]; m4.makeTranslation(p.x + 0.5, 0.2, p.z - 0.72); this.pirateFlags.setMatrixAt(n++, m4); }
    this.pirateFlags.count = n;
    this.pirateFlags.instanceMatrix.needsUpdate = true;
  }

  buildBridge(B, dir, toId) {
    const g = new THREE.Group();
    const region = regionOf(toId);
    const plank = new THREE.BoxGeometry(0.85, 0.06, 0.24);
    const n = 12;
    const base = BRIDGE[region];
    for (let i = 0; i < n; i++) {
      const k = 3.9 - (i / (n - 1)) * 2.7;
      const p = B.clone().addScaledVector(dir, -k); p.y = 0.0;
      const col = region === 8 ? new THREE.Color().setHSL(i / n, 0.85, 0.6) : new THREE.Color(base ? base[0] : 0xfff0c0);
      const em = region === 8 ? col : new THREE.Color(base ? base[1] : 0xffc860);
      const m = new THREE.Mesh(plank, new THREE.MeshStandardMaterial({ color: col, emissive: em, emissiveIntensity: region === 3 ? 0 : 0.9, roughness: 0.5 }));
      m.position.copy(p);
      m.rotation.y = Math.atan2(dir.x, dir.z);
      m.scale.setScalar(0.001);
      m.userData.shown = false;
      g.add(m);
    }
    this.bridge = g;
    this.scene.add(g);
  }

  showFlightHud(toId) {
    this.flightHud?.remove();
    const el = document.createElement('div');
    el.className = 'travel-hud';
    const dest = document.createElement('div');
    dest.className = 'travel-dest';
    dest.textContent = toId === HUB_ID ? t('hubName') : islandLabel(toId);
    const hint = document.createElement('div');
    hint.className = 'travel-hint';
    hint.textContent = t('tapToSpeed');
    el.append(dest, hint);
    document.getElementById('app').appendChild(el);
    this.flightHud = el;
  }

  endFlightExtras() {
    this.flightHud?.remove();
    this.flightHud = null;
    if (this.bridge) { this.scene.remove(this.bridge); this.bridge.traverse((o) => o.material?.dispose?.()); this.bridge = null; }
    if (this.flight?.clouds) for (const cl of this.flight.clouds) { this.scene.remove(cl); cl.material.dispose(); }
    if (this.blob) this.blob.material.opacity = 0;
  }

  stepFlight(dt) {
    const f = this.flight;
    const tt = this.time;
    const wp = this.traveler.position;
    const sp = f.speed;
    let tan = f.curve.getTangentAt(0.001);
    if (f.phase === 'fly') {
      f.t += dt * sp;
      const u = THREE.MathUtils.clamp(f.t / f.dur, 0, 1);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      if (f.t > 0) {
        if (!f.whoosh) { f.whoosh = true; this.app.sound.whoosh?.(Math.min(2.5, f.dur / sp)); }
        wp.copy(f.curve.getPointAt(e));
        tan = f.curve.getTangentAt(THREE.MathUtils.clamp(e, 0.001, 0.999));
        const yaw = Math.atan2(tan.x, tan.z);
        if (f.prevYaw === null) f.prevYaw = yaw;
        const dy = wrapAngle(yaw - f.prevYaw);
        f.prevYaw = yaw;
        const kk = 1 - Math.exp(-dt * 5);
        f.yawRate += (dy / Math.max(dt, 1e-3) - f.yawRate) * kk;
        this.traveler.rotation.y = yaw;
        this.traveler.rotation.x += (-Math.asin(THREE.MathUtils.clamp(tan.y, -1, 1)) * 0.6 - this.traveler.rotation.x) * kk;
        this.traveler.rotation.z += (THREE.MathUtils.clamp(-f.yawRate * 0.25, -0.6, 0.6) - this.traveler.rotation.z) * kk;
        this.flightTrails(dt, f, wp);
      }
      this.animatePet(dt, tt, f.t > 0);
      if (f.reveal && u > 0.4) { f.reveal = false; this.liftFog(f.toId, true); }
      if (u >= 1) {
        f.phase = 'land'; f.pt = 0;
        this.setRiding(false);
        this.app.sound.land?.();
        this.fx.sparkle([wp.x, wp.y + 0.35, wp.z], 26);
        const toCam = Math.atan2(this.camera.position.x - wp.x, this.camera.position.z - wp.z);
        gsap.to(this.traveler.rotation, { x: 0, z: 0, y: this.traveler.rotation.y + wrapAngle(toCam - this.traveler.rotation.y), duration: 0.55, ease: 'power2.out' });
        this.blob.material.opacity = 0;
      }
    } else {
      f.pt += dt * sp;
      this.animatePet(dt, tt, false);
    }
    // מצלמה: רודפת מאחור → מבט נחיתה מלפנים → דחיפה פנימה מתחת לענני המעבר
    const flatT = new V3(tan.x, 0, tan.z);
    if (flatT.length() > 0.2) { flatT.normalize(); f.lastFlat = flatT.clone(); } else flatT.copy(f.lastFlat || new V3(0, 0, 1));
    let desired, look, rate;
    if (f.phase === 'fly') {
      const takeoff = f.t < 0.3;
      desired = wp.clone().addScaledVector(flatT, takeoff ? -3.2 : -3.6).add(new V3(0, takeoff ? 2.9 : 1.9, 0));
      look = wp.clone().addScaledVector(flatT, 2.2).add(new V3(0, 0.35, 0));
      rate = 3;
    } else {
      look = f.land.clone().add(new V3(0, 0.35, 0));
      if (f.phase === 'land') { desired = f.land.clone().add(new V3(0.4, 1.3, 2.8)); rate = 3; }
      else { desired = f.land.clone().add(new V3(0.2, 0.95, 1.8)); rate = 1.5 + f.pt * 3; }
      if (f.phase === 'land' && f.pt > 0.85) { f.phase = 'dive'; f.pt = 0; }
      else if (f.phase === 'dive' && f.pt > 0.3 && !f.resolved) {
        // המשחק מכסה בעננים ואז סוגר את המפה (close) — עד אז המצלמה ממשיכה להתקרב
        f.resolved = true;
        this.view.x = f.B.x; this.view.z = f.B.z;
        f.resolve();
      }
    }
    const k = 1 - Math.exp(-dt * rate * sp);
    f.camPos.lerp(desired, k);
    f.camLook.lerp(look, k);
    if (f.phase === 'fly') {
      // לא נכנסים לתוך החיה, לא מתחת למים ולא לתוך מגדלי הטירה במרכז
      const off = f.camPos.clone().sub(wp);
      if (off.length() < 2.5) f.camPos.copy(wp).addScaledVector(off.normalize(), 2.5);
      f.camPos.y = Math.max(f.camPos.y, 0.55, wp.y + 0.9);
      const hubD = Math.hypot(f.camPos.x, f.camPos.z);
      if (hubD < 5) f.camPos.y = Math.max(f.camPos.y, 5.2 - Math.max(0, hubD - 3.5));
    }
    this.camera.position.copy(f.camPos);
    this.camera.lookAt(f.camLook);
    this.lookAt.copy(f.camLook);
  }

  /** שובלים ואפקטים בזמן המסע, לפי החיה ודרך הכניסה */
  flightTrails(dt, f, wp) {
    const r = this.rig || {};
    const mid = [wp.x, wp.y + 0.22, wp.z];
    if (this.unicorn) this.fx.add.emit({ count: 2, pos: mid, spread: [0.06, 0.04, 0.06], vel: [0, 0.03, 0], velSpread: [0.03, 0.03, 0.03], color: [0xff4a6a, 0xffb04a, 0xfff04a, 0x4aff8a, 0x4ad8ff, 0xa04aff], size: [0.16, 0.28], life: [0.7, 1.1], drag: 2 });
    else if (this.flyer) { if (r.trail) this.fx.embers(mid, 1, r.trail); else if (Math.random() < 0.6) this.fx.sparkle(mid, 1, [0xffe08a, 0xffffff], 0.08); }
    if (this.ground) {
      this.stoneT += dt * f.speed;
      if (this.stoneT > 0.085) {
        this.stoneT = 0;
        const st = this.stones[this.stoneIdx++ % this.stones.length];
        st.position.set(wp.x, Math.max(-0.17, wp.y + 0.01), wp.z);
        st.scale.setScalar(1);
        st.material.opacity = 0.9;
        st.visible = true;
      }
    }
    // צל על המים
    this.blob.position.set(wp.x, -0.2, wp.z);
    this.blob.material.opacity = THREE.MathUtils.clamp(0.4 - wp.y * 0.06, 0.08, 0.4);
    this.blob.scale.setScalar(1 + wp.y * 0.12);
    // רסס בריחוף נמוך
    if (wp.y < 0.25 && (f.ap === 'skim' || this.ground)) this.fx.norm.emit({ count: 2, pos: [wp.x, -0.12, wp.z], spread: [0.15, 0, 0.15], vel: [0, 1.4, 0], velSpread: [0.6, 0.4, 0.6], color: 0xe6fbff, size: [0.1, 0.22], life: [0.4, 0.8], gravity: 3, alpha: 0.8 });
    // טבעות: צלצול וניצוצות בכל מעבר
    f.hoops.forEach((hp, i) => {
      if (hp.passed || wp.distanceTo(hp.pos) > 0.95) return;
      hp.passed = true;
      this.fx.sparkle([hp.pos.x, hp.pos.y, hp.pos.z], 22, [0xffe08a, 0xffffff, 0xffb040], 0.5);
      this.app.sound.chime?.(i);
    });
    if (f.gate && !f.gate.passed && Math.hypot(wp.x - f.gate.pos.x, wp.z - f.gate.pos.z) < 0.6) {
      f.gate.passed = true;
      this.fx.sparkle([f.gate.pos.x, 1.2, f.gate.pos.z], 30, [0xffffff, 0xffe08a], 0.8);
      this.app.sound.chime?.(3);
    }
    // הגשר נבנה קרש אחרי קרש מול החיה
    if (this.bridge) for (const m of this.bridge.children) {
      if (m.userData.shown || m.position.distanceTo(wp) > 2.3) continue;
      m.userData.shown = true;
      gsap.to(m.scale, { x: 1, y: 1, z: 1, duration: 0.28, ease: 'back.out(2.2)' });
      this.fx.sparkle([m.position.x, m.position.y + 0.06, m.position.z], 3, [0xfff0c0, 0xffffff], 0.2);
    }
  }
}
