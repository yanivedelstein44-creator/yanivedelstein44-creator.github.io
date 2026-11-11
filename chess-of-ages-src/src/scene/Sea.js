/**
 * הים שמסביב לאי — במקום אי שמרחף בשמיים, כל אי עומד על הים (רק איי השמיים מרחפים).
 * - מישור מים גדול עד האופק: גלים, נצנוץ שמש, השתקפות שמיים, מים רדודים וקצף ליד החוף, ערפל.
 * - סוג הים לפי האקלים: מים / קרח צף / לבה זוהרת / ים לילה עם כוכבים / קרקעית חול (באיים שמתחת למים).
 * - חוף חול (או שלג / בזלת) סביב שפת האי.
 * הכול shader אחד על מישור אחד — זול גם בטלפון.
 */
import * as THREE from 'three';

/** גובה פני הים (פני האי ב-0) */
export const SEA_Y = -0.42;

const KIND = {
  embers: 'lava', basalt: 'lava', rune: 'lava',
  underwater: 'bed', abyssal: 'bed', cell: 'bed',
  stars: 'night', space: 'night', starDune: 'night',
  snow: 'ice', snowNight: 'ice', glassIce: 'ice', tundra: 'ice', porcelain: 'ice',
};
const MODE = { water: 0, lava: 1, bed: 2, night: 3, ice: 4 };
// deep / shallow / foam לים, sand לחוף; tint — כמה צבע השמיים נכנס לים (0 = בלי)
const LOOK = {
  water: { deep: 0x0d3c63, shallow: 0x29b0c6, foam: 0xf4fdff, sand: 0xe6d3a3, tint: 0.2 },
  ice: { deep: 0x1d3a52, shallow: 0x86c2d8, foam: 0xffffff, sand: 0xf0f5fa, tint: 0.18 },
  lava: { deep: 0x1c0905, shallow: 0xff5a14, foam: 0xffd060, sand: 0x2c2522, tint: 0 },
  night: { deep: 0x04061a, shallow: 0x1c2c64, foam: 0xc8d8ff, sand: 0x7a7498, tint: 0.12 },
  bed: { deep: 0xa89a70, shallow: 0xe6d8aa, foam: 0xffffff, sand: 0xd8c898, tint: 0.25 },
};
export const seaKind = (climate) => KIND[climate] || 'water';
/** צבע החוף של אי באקלים הזה (חול / שלג / בזלת…) */
export const beachColor = (climate) => LOOK[seaKind(climate)].sand;

const VERT = /* glsl */`
#include <common>
#include <fog_pars_vertex>
varying vec2 vXZ;
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vXZ = w.xz; vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */`
#include <common>
#include <fog_pars_fragment>
uniform float uTime, uR, uMode;
uniform vec3 uDeep, uShallow, uFoam, uSky, uSunDir, uSunGlow;
varying vec2 vXZ;
varying vec3 vW;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vXZ;
  float t = uTime, r = length(p), a = atan(p.y, p.x);
  float w1 = n2(p * 0.16 + vec2(t * 0.05, t * 0.035));
  float w2 = n2(p * 0.45 - vec2(t * 0.09, -t * 0.04));
  float w = w1 * 0.6 + w2 * 0.4;
  vec3 V = normalize(cameraPosition - vW);
  float sh = 1.0 - smoothstep(uR + 0.5, uR + 9.0, r); // מים רדודים ליד החוף
  vec3 col;
  if (uMode > 0.5 && uMode < 1.5) {
    // לבה: קרום כהה עם סדקים זוהרים שזורמים לאט ופועמים
    float c = n2(p * 0.32 + vec2(t * 0.02, 0.0)) * 0.55 + n2(p * 1.05 - vec2(0.0, t * 0.03)) * 0.45;
    float crack = smoothstep(0.44, 0.495, c) * (1.0 - smoothstep(0.505, 0.56, c));
    float pulse = 0.7 + 0.3 * sin(t * 1.3 + w * 6.28);
    col = mix(uDeep, uShallow, clamp(crack * pulse * 0.85 + sh * 0.5, 0.0, 1.0));
    col += uFoam * (1.0 - smoothstep(0.0, 0.018, abs(c - 0.5))) * 0.55 * pulse;
  } else if (uMode > 1.5 && uMode < 2.5) {
    // קרקעית הים: חול עם ריצוד אור (caustics)
    float ca = abs(sin(p.x * 0.8 + n2(p * 0.35 + t * 0.12) * 5.0) * sin(p.y * 0.8 + n2(p * 0.35 - t * 0.1) * 5.0));
    col = mix(uDeep, uShallow, clamp(w * 0.55 + sh * 0.35, 0.0, 1.0));
    col += uFoam * pow(1.0 - ca, 10.0) * 0.25;
  } else {
    col = mix(uDeep, uShallow, clamp(sh * 0.8 + (w - 0.5) * 0.25, 0.0, 1.0));
    float fr = pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);
    col = mix(col, uSky, clamp(0.1 + fr * 0.7, 0.0, 0.85));
    // נצנוץ שמש על הגלים
    // נצנוצים קטנים (גלים בתדר גבוה) — לא כתמי אור גדולים
    float g1 = n2(p * 1.3 + vec2(t * 0.3, t * 0.2)), g2 = n2(p * 2.1 - vec2(t * 0.25, -t * 0.15));
    vec3 N = normalize(vec3((g1 - 0.5) * 0.36 + (w1 - 0.5) * 0.16, 1.0, (g2 - 0.5) * 0.36 + (w2 - 0.5) * 0.16));
    vec3 H = normalize(V + normalize(uSunDir));
    col += uSunGlow * pow(max(dot(N, H), 0.0), 260.0) * 0.8;
    // קצף: שורה גלית לאורך החוף + קצות גלים פזורים
    float edge = r - uR - 0.8 - sin(a * 11.0 + t * 0.7) * 0.22 - sin(a * 5.0 - t * 0.4) * 0.28;
    float foam = (1.0 - smoothstep(0.0, 0.85, abs(edge))) * (0.55 + 0.45 * sin(t * 1.5 + a * 3.0));
    foam += smoothstep(0.93, 0.99, n2(p * 2.3 + t * 0.32)) * 0.16 * (1.0 - sh * 0.5);
    if (uMode > 3.5) foam += smoothstep(0.68, 0.73, n2(p * 0.2 + vec2(13.0, 7.0))) * 0.8; // קרח: גושי קרח צפים
    if (uMode > 2.5 && uMode < 3.5) { // ים לילה: כוכבים מנצנצים על המים
      vec2 cell = floor(p * 2.5);
      col += uFoam * step(0.993, h2(cell)) * (0.5 + 0.5 * sin(t * 2.0 + h2(cell + 7.0) * 6.28)) * 0.9;
    }
    col = mix(col, uFoam, clamp(foam, 0.0, 1.0) * 0.85);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export class Sea {
  constructor(scene) {
    this.u = {
      uTime: { value: 0 }, uR: { value: 27.6 }, uMode: { value: 0 },
      uDeep: { value: new THREE.Color(LOOK.water.deep) }, uShallow: { value: new THREE.Color(LOOK.water.shallow) },
      uFoam: { value: new THREE.Color(LOOK.water.foam) }, uSky: { value: new THREE.Color(0xa8d8ff) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.55, -0.7) }, uSunGlow: { value: new THREE.Color(0xfff2c8) },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), vertexShader: VERT, fragmentShader: FRAG, fog: true });
    Object.assign(mat.uniforms, this.u);
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(700, 96), mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = SEA_Y;
    this.mesh.renderOrder = -5;
    this.mesh.receiveShadow = false;
    scene.add(this.mesh);
    this.kind = 'water';
    this.sandMat = new THREE.MeshStandardMaterial({ color: LOOK.water.sand, roughness: 0.95 });
  }

  /** חוף שמשתפל מתחת למים סביב אי בגודל 27 (מתווסף לקבוצת האי, כך שהוא גדל ומתכווץ איתה) */
  beach(radius = 27) {
    const k = radius / 27;
    const pts = [[26.4, 0.03], [27.35, -0.05], [28.3, -0.34], [29.4, -0.78], [30.6, -1.3]].map(([x, y]) => new THREE.Vector2(x * k, y));
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 96), this.sandMat);
    m.receiveShadow = true;
    return m;
  }

  /** קו החוף (בשביל המים הרדודים והקצף) */
  setRadius(r) { this.u.uR.value = r; }

  /** סוג הים וצבעיו לפי האקלים והפלטה של האי (נצבע מחדש עם מעבר הפלטה) */
  target(climate, p) {
    const kind = seaKind(climate);
    const L = LOOK[kind], C = (h) => new THREE.Color(h);
    return {
      kind,
      deep: C(L.deep).lerp(C(p.skyMid ?? L.deep), L.tint),
      shallow: C(L.shallow).lerp(C(p.skyHorizon ?? L.shallow), L.tint * 0.6),
      foam: C(L.foam),
      sky: kind === 'lava' ? C(L.deep) : C(p.skyHorizon ?? 0xa8d8ff).lerp(C(p.skyMid ?? 0x6aa8ec), 0.35),
      sand: C(L.sand),
      sunDir: new THREE.Vector3(...(p.sunDir || [0.4, 0.55, -0.7])).normalize(),
      sun: C(p.sunGlow ?? 0xfff2c8),
    };
  }

  /** מתחילים מעבר: מחזיר פונקציה (t: 0..1) שצובעת בין המצב הנוכחי למטרה */
  blend(to) {
    const u = this.u;
    const from = { deep: u.uDeep.value.clone(), shallow: u.uShallow.value.clone(), foam: u.uFoam.value.clone(), sky: u.uSky.value.clone(), sand: this.sandMat.color.clone(), sunDir: u.uSunDir.value.clone(), sun: u.uSunGlow.value.clone() };
    // סוג הים מתחלף מיד (לבה ↔ מים לא מתערבבים יפה)
    if (to.kind !== this.kind) { this.kind = to.kind; u.uMode.value = MODE[to.kind]; Object.assign(from, { deep: to.deep, shallow: to.shallow, foam: to.foam, sky: to.sky, sand: to.sand }); }
    return (t) => {
      u.uDeep.value.lerpColors(from.deep, to.deep, t);
      u.uShallow.value.lerpColors(from.shallow, to.shallow, t);
      u.uFoam.value.lerpColors(from.foam, to.foam, t);
      u.uSky.value.lerpColors(from.sky, to.sky, t);
      u.uSunDir.value.lerpVectors(from.sunDir, to.sunDir, t).normalize();
      u.uSunGlow.value.lerpColors(from.sun, to.sun, t);
      this.sandMat.color.lerpColors(from.sand, to.sand, t);
    };
  }

  update(time) { this.u.uTime.value = time; }
}
