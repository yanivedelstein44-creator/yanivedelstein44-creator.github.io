/**
 * מנהל הסצנה: רנדרר מותאם מובייל, מצלמה ופוקוס לפורטרט, OrbitControls למגע,
 * שמיים פרוצדורליים, האי המרחף, תאורה לפי עידן ולולאת רינדור.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { grassTex, stoneTex, glowTexture, mesh, G, rand, TAU } from './kit.js';
import { Sea, SEA_Y } from './Sea.js';

const V3 = THREE.Vector3;
/** זווית מבט המשחק (מעלות מהאנך). 55 = לוח גדול יותר; 60 = יותר אדריכלות בחלק העליון */
export const GAMEPLAY_POLAR = 38; // לוח ברוחב מלא; מעליו האי, הכס והחיות
/** טיול חופשי באצבע: המצלמה נוטה למטה עד שרואים שמיים ואיים באופק */
const ROAM_POLAR = 76;
const ROAM_MAX_POLAR = 1.4; // ‎~80°
const GAME_MAX_POLAR = 1.32;
const ROAM_RADIUS = 19;
const SKY_VERT = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`;
const SKY_FRAG = `
uniform vec3 uTop, uMid, uHorizon, uBottom, uSunGlow, uSunDir;
uniform float uStars, uNebula, uTime;
varying vec3 vDir;
float hash3(vec3 p){ p = fract(p*0.3183099+vec3(0.1,0.2,0.3)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*noise3(p); p*=2.03; a*=0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.32, h));
  col = mix(col, uTop, smoothstep(0.32, 0.95, h));
  col = mix(col, uBottom, smoothstep(0.0, -0.35, h));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunGlow * (pow(sd, 90.0) * 1.4 + pow(sd, 9.0) * 0.32);
  if (uNebula > 0.0) {
    float n = fbm3(d * 2.6 + vec3(uTime * 0.004));
    float m = fbm3(d * 5.0 - vec3(3.1));
    col += uNebula * (vec3(0.45, 0.08, 0.65) * smoothstep(0.45, 0.9, n) + vec3(0.08, 0.25, 0.75) * smoothstep(0.55, 0.95, m) * 0.8) * smoothstep(-0.25, 0.4, h);
  }
  if (uStars > 0.0) {
    vec3 q = d * 620.0; vec3 id = floor(q); vec3 f = fract(q) - 0.5;
    float s = hash3(id);
    float tw = 0.55 + 0.45 * sin(uTime * 1.7 + s * 60.0);
    col += vec3(step(0.9972, s) * smoothstep(0.5, 0.05, length(f)) * tw * uStars * smoothstep(-0.05, 0.2, h)) * 1.6;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class SceneManager {
  constructor(canvas, { getSafeArea } = {}) {
    this.canvas = canvas;
    this.getSafeArea = getSafeArea || (() => ({ top: 0, bottom: 0 }));
    this.dprCap = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.setPixelRatio(this.dprCap);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.world = new THREE.Group();
    this.scene.add(this.world);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1200);
    this.camera.position.set(0, 14, 18);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.7;
    pmrem.dispose();

    this.fog = new THREE.Fog(0x9d6553, 55, 170);
    this.scene.fog = this.fog;

    this.updaters = new Set();
    this.shake = { amp: 0, decay: 6, offset: new V3() };
    // נגישות: מכבדים את "הפחתת תנועה" של המכשיר — בלי רעידות מצלמה ובלי סיבובים קולנועיים רחבים
    const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    this.reducedMotion = !!mq?.matches;
    mq?.addEventListener?.('change', (e) => { this.reducedMotion = e.matches; });
    this.view = { side: 'w', target: new V3(), position: new V3(), radius: 20, polar: THREE.MathUtils.degToRad(55), azimuth: 0 };
    this.panoramaOn = false;
    this.steadyCamera = true;
    this.animatingCamera = false;
    this.quality = { level: 'high', samples: [], checked: false };

    this.buildSky();
    this.buildLights();
    this.buildIsland();
    this.buildControls();

    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.clockLast = performance.now();
    this.time = 0;

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // ---------- שמיים ----------
  buildSky() {
    this.skyUniforms = {
      uTop: { value: new THREE.Color(0x1d1838) }, uMid: { value: new THREE.Color(0x7a4766) },
      uHorizon: { value: new THREE.Color(0xf4a259) }, uBottom: { value: new THREE.Color(0x3b2418) },
      uSunGlow: { value: new THREE.Color(0xffb36b) }, uSunDir: { value: new V3(-0.5, 0.2, -0.8) },
      uStars: { value: 0.3 }, uNebula: { value: 0 }, uTime: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.skyUniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), mat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
  }

  // ---------- תאורה ----------
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xffd8b0, 0x40301e, 0.85);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffc48a, 2.3);
    this.key.position.set(12, 22, 10);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const sc = this.key.shadow.camera;
    sc.left = -13; sc.right = 13; sc.top = 13; sc.bottom = -13; sc.near = 1; sc.far = 70;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.025;
    this.scene.add(this.key);
    this.scene.add(this.key.target);
    // מאגר קבוע של אורות נקודתיים (כמות קבועה = אין קומפילציה מחדש של שיידרים בין עידנים)
    this.pointPool = [];
    for (let i = 0; i < 4; i++) {
      const p = new THREE.PointLight(0xff9a40, 0, 22, 1.6);
      p.position.set(0, -50, 0);
      this.scene.add(p);
      this.pointPool.push({ light: p, owner: null, base: 0, flicker: 0, phase: Math.random() * 10 });
    }
  }

  /** תפיסת אור נקודתי מהמאגר */
  claimLight(owner, { color = 0xff9a40, intensity = 20, distance = 22, pos = [0, 2, 0], flicker = 0.3 } = {}) {
    const slot = this.pointPool.find((s) => !s.owner);
    if (!slot) return null;
    slot.owner = owner; slot.base = intensity; slot.flicker = flicker;
    slot.light.color.set(color); slot.light.distance = distance;
    slot.light.position.set(...pos);
    slot.light.intensity = 0;
    return slot;
  }

  releaseLights(owner) {
    this.pointPool.forEach((s) => {
      if (s.owner === owner) { s.owner = null; s.base = 0; s.light.intensity = 0; s.light.position.set(0, -50, 0); }
    });
  }

  // ---------- האי שעל הים ----------
  buildIsland() {
    const island = new THREE.Group();
    this.groundMat = new THREE.MeshStandardMaterial({ map: grassTex(), color: 0x5d8a3a, roughness: 0.95 });
    const top = mesh(new THREE.CircleGeometry(27, 72), this.groundMat, { rot: [-Math.PI / 2, 0, 0], receive: true });
    island.add(top);

    // צלע סלעית מתחת לאי
    const pts = [];
    const N = 14;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const r = 27 * (1 - Math.pow(t, 1.35)) + 0.01;
      pts.push(new THREE.Vector2(Math.max(0.01, r + Math.sin(t * 9) * 0.6), -t * 19));
    }
    const lathe = new THREE.LatheGeometry(pts, 64);
    const pos = lathe.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y < -0.3) {
        const a = Math.atan2(z, x);
        const n = Math.sin(a * 7 + y * 0.6) * 0.9 + Math.sin(a * 13 - y * 1.3) * 0.5 + Math.sin(a * 3 + y) * 1.1;
        const k = 1 + n * 0.05;
        pos.setX(i, x * k); pos.setZ(i, z * k);
      }
    }
    lathe.computeVertexNormals();
    this.rockMat = new THREE.MeshStandardMaterial({ map: stoneTex('islandRock', 0x6a5848, 0x2e241c, { freq: 4, seed: 30 }), roughness: 1 });
    this.rockMat.map.repeat.set(6, 3);
    island.add(mesh(lathe, this.rockMat, { receive: true }));

    // דשא על השפה
    const rim = mesh(new THREE.TorusGeometry(27, 0.45, 6, 96), this.groundMat, { rot: [Math.PI / 2, 0, 0], pos: [0, -0.25, 0] });
    island.add(rim);
    // הים מסביב (במקום שמיים מתחת לאי) + חוף שמשתפל אל המים
    this.sea = new Sea(this.world);
    island.add(this.sea.beach(27));
    this.world.add(island);
    this.island = island;

    // איונים קטנים בים: דשא, חוף חול ועץ או סלע
    this.islets = [];
    const trunk = new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 0.9 }), leaves = new THREE.MeshStandardMaterial({ color: 0x3f7a30, roughness: 0.85 });
    this.isletLeaves = leaves;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + rand(-0.3, 0.3);
      const r = rand(44, 72);
      const s = rand(1.6, 4.2);
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(s * 1.3, s * 1.55, 0.9, 9), this.sea.sandMat, { pos: [0, -0.3, 0], receive: true }));
      g.add(mesh(new THREE.CylinderGeometry(s, s * 1.12, 0.34, 9), this.groundMat, { pos: [0, 0.2, 0], receive: true }));
      const trees = s > 2.6 ? 2 : 1;
      for (let k = 0; k < trees; k++) {
        const ta = rand(0, TAU), tr = rand(0, s * 0.5), th = rand(1.1, 1.8);
        g.add(mesh(new THREE.CylinderGeometry(0.1 * th, 0.14 * th, 0.8 * th, 6), trunk, { pos: [Math.cos(ta) * tr, 0.37 + 0.4 * th, Math.sin(ta) * tr], cast: true }));
        g.add(mesh(new THREE.ConeGeometry(0.6 * th, 1.4 * th, 7), leaves, { pos: [Math.cos(ta) * tr, 0.37 + 1.4 * th, Math.sin(ta) * tr], cast: true }));
      }
      g.position.set(Math.cos(a) * r, SEA_Y, Math.sin(a) * r);
      g.rotation.y = rand(0, TAU);
      this.world.add(g);
      this.islets.push(g);
    }
    // עננים גבוה בשמיים, מעל הים ועד האופק
    this.clouds = [];
    const cloudMat = new THREE.SpriteMaterial({ map: glowTexture('cloud', 'rgba(255,255,255,0.9)'), color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(cloudMat);
      const a = rand(0, TAU), r = rand(95, 230);
      s.position.set(Math.cos(a) * r, rand(26, 52), Math.sin(a) * r);
      s.scale.set(rand(40, 70), rand(12, 20), 1);
      s.userData.speed = rand(0.2, 0.6);
      this.world.add(s);
      this.clouds.push(s);
    }
    this.cloudMat = cloudMat;
  }

  /**
   * גודל האי: base — רדיוס האי הבסיסי (האי המרכזי מתחיל קטן), extent — עד איפה הוא הגיע
   * עם האריחים שהצטרפו. משפיע על מסגור המבט הרחב, על טווח הטיול ועל האיונים מסביב.
   */
  setIslandRadius(extent = 27, base = extent, shape = null) {
    this.islandR = extent;
    this.sea.setRadius(base * (28.3 / 27)); // קו המים על החוף של האי הבסיסי
    this.islandShape = shape; // נקודות קו החוף (אי לא עגול — האי המרכזי עם האריחים)
    this.island.scale.setScalar(base / 27);
    this.roamRadius = Math.max(ROAM_RADIUS, extent * 0.72);
    for (const g of this.islets) {
      const r0 = (g.userData.r0 ??= Math.hypot(g.position.x, g.position.z));
      const r = r0 + Math.max(0, extent - 27) * 1.15;
      const k = r / Math.hypot(g.position.x, g.position.z);
      g.position.x *= k; g.position.z *= k;
    }
  }

  // ---------- פלטת עידן ----------
  applyPalette(p, duration = 1.6) {
    const from = {
      top: this.skyUniforms.uTop.value.clone(), mid: this.skyUniforms.uMid.value.clone(),
      hor: this.skyUniforms.uHorizon.value.clone(), bot: this.skyUniforms.uBottom.value.clone(),
      glow: this.skyUniforms.uSunGlow.value.clone(), sun: this.skyUniforms.uSunDir.value.clone(),
      stars: this.skyUniforms.uStars.value, neb: this.skyUniforms.uNebula.value,
      key: this.key.color.clone(), keyI: this.key.intensity, hs: this.hemi.color.clone(), hg: this.hemi.groundColor.clone(),
      hI: this.hemi.intensity, fog: this.fog.color.clone(), fn: this.fog.near, ff: this.fog.far,
      exp: this.renderer.toneMappingExposure, env: this.scene.environmentIntensity, ground: this.groundMat.color.clone(),
      kd: this.key.position.clone(),
    };
    const C = (h) => new THREE.Color(h);
    const to = {
      top: C(p.skyTop), mid: C(p.skyMid), hor: C(p.skyHorizon), bot: C(p.skyBottom), glow: C(p.sunGlow),
      sun: new V3(...p.sunDir).normalize(), key: C(p.key), hs: C(p.hemiSky), hg: C(p.hemiGround), fog: C(p.fog), ground: C(p.ground),
      kd: new V3(...p.keyDir).normalize().multiplyScalar(30),
    };
    if (p.climate) this.seaClimate = p.climate;
    const seaTarget = this.sea.target(this.seaClimate || 'day', p);
    const seaTo = this.sea.blend(seaTarget);
    // האיונים: מתחת למים (קרקעית) אין איונים; עצים מושלגים בים של קרח, חרוכים בים של לבה
    this.islets.forEach((g) => { g.visible = seaTarget.kind !== 'bed'; });
    this.isletLeaves.color.setHex({ ice: 0xe6eef4, lava: 0x3a302c, night: 0x2a4a5a }[seaTarget.kind] ?? 0x3f7a30);
    const s = { t: 0 };
    gsap.killTweensOf(this._paletteTween || {});
    this._paletteTween = s;
    const apply = () => {
      const t = s.t;
      seaTo(t);
      this.skyUniforms.uTop.value.lerpColors(from.top, to.top, t);
      this.skyUniforms.uMid.value.lerpColors(from.mid, to.mid, t);
      this.skyUniforms.uHorizon.value.lerpColors(from.hor, to.hor, t);
      this.skyUniforms.uBottom.value.lerpColors(from.bot, to.bot, t);
      this.skyUniforms.uSunGlow.value.lerpColors(from.glow, to.glow, t);
      this.skyUniforms.uSunDir.value.lerpVectors(from.sun, to.sun, t);
      this.skyUniforms.uStars.value = from.stars + (p.stars - from.stars) * t;
      this.skyUniforms.uNebula.value = from.neb + (p.nebula - from.neb) * t;
      this.key.color.lerpColors(from.key, to.key, t);
      this.key.intensity = from.keyI + (p.keyIntensity - from.keyI) * t;
      this.key.position.lerpVectors(from.kd, to.kd, t);
      this.hemi.color.lerpColors(from.hs, to.hs, t);
      this.hemi.groundColor.lerpColors(from.hg, to.hg, t);
      this.hemi.intensity = from.hI + (p.hemiIntensity - from.hI) * t;
      this.fog.color.lerpColors(from.fog, to.fog, t);
      this.fog.near = from.fn + (p.fogNear - from.fn) * t;
      this.fog.far = from.ff + (p.fogFar - from.ff) * t;
      this.renderer.toneMappingExposure = from.exp + (p.exposure - from.exp) * t;
      this.scene.environmentIntensity = from.env + (p.env - from.env) * t;
      this.groundMat.color.lerpColors(from.ground, to.ground, t);
      this.cloudMat.color.copy(this.fog.color).lerp(new THREE.Color(0xffffff), 0.55);
    };
    if (duration <= 0) { s.t = 1; apply(); return; }
    gsap.to(s, { t: 1, duration, ease: 'sine.inOut', onUpdate: apply });
  }

  // ---------- שליטה במצלמה ----------
  buildControls() {
    const c = new OrbitControls(this.camera, this.canvas);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    // אצבע אחת = הזזת הלוח (קדימה/אחורה/לצדדים), שתי אצבעות = צביטה לזום + סיבוב
    c.enablePan = true;
    c.screenSpacePanning = false; // הזזה על מישור הקרקע
    c.panSpeed = 1.1;
    c.rotateSpeed = 0.6;
    c.zoomSpeed = 1.0;
    c.minPolarAngle = 0.22;
    c.maxPolarAngle = 1.32; // לעולם לא מתחת לאי
    c.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    c.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    c.autoRotateSpeed = 0.55;
    c.addEventListener('change', () => this.clampPan());
    c.addEventListener('start', () => this.beginFreeLook());
    this.controls = c;
  }

  /** זווית מבט המשחק (מעלות מהאנך) */
  get gameplayPolarDeg() { return this.gameplayPolar || GAMEPLAY_POLAR; }

  /**
   * אצבע אחת על הלוח = בלי הזזת מצלמה (רק בחירת כלים); מחוץ ללוח = טיול חופשי.
   * שתי אצבעות = צביטה לזום (וסיבוב) בכל מקום — גם מעל הלוח
   */
  setGestureBlocked(b) {
    this.gestureBlocked = b;
    this.controls.enablePan = !b && !this.panoramaOn;
    this.controls.enabled = !this.animatingCamera;
  }

  /** התחלת גרירה מחוץ ללוח: מרחיבים את גבולות המצלמה (אופק, שמיים, כל האי) */
  beginFreeLook() {
    if (this.panoramaOn || this.animatingCamera || this.freeLook) return;
    this.freeLook = true;
    this.controls.maxPolarAngle = ROAM_MAX_POLAR;
    // צביטה החוצה: אפשר להתרחק עד מבט על כל האי
    this.controls.maxDistance = Math.max(this.controls.maxDistance, this.zoomOutRadius());
  }

  /**
   * המצלמה רחוקה ממבט המשחק (אחרי צביטה החוצה/פנימה, סיבוב גדול או הזזה הרחק מהלוח) —
   * אז נגיעה בלוח רק מחזירה אותו לגודל הכי טוב לשחק
   */
  isFarFromGameplay() {
    if (!this.freeLook || this.panoramaOn || this.animatingCamera) return false;
    const t = this.controls.target, r = this.view.radius;
    const off = this._farOff || (this._farOff = new V3());
    off.copy(this.camera.position).sub(t);
    const d = off.length();
    if (d > r * 1.3 || d < r * 0.7) return true;
    if (Math.hypot(t.x - this.view.target.x, t.z - this.view.target.z) > 3.5) return true;
    let da = Math.atan2(off.x, off.z) - this.view.azimuth;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    return Math.abs(da) > 0.6;
  }

  /** המרחק שממנו רואים את כל האי (בערך כמו מבט־העל) */
  zoomOutRadius() {
    try { return this.overviewFrame(this.view.azimuth).radius * 1.15; } catch { return this.view.radius * 2.6; }
  }

  endFreeLook() {
    this.freeLook = false;
    this.controls.maxPolarAngle = GAME_MAX_POLAR;
  }

  /** גבולות הזזה: נקודת המבט תמיד נשארת על הלוח — הלוח אף פעם לא בורח מהמסך */
  clampPan() {
    const b = this.panBounds;
    if (!b || this.panoramaOn || this.animatingCamera) return;
    const t = this.controls.target;
    if (this.freeLook) {
      // טיול: נשארים מעל האי; ככל שמתרחקים מהלוח המצלמה נוטה לאופק
      const r = Math.hypot(t.x, t.z);
      const RR = this.roamRadius ?? ROAM_RADIUS;
      if (r > RR) { const k = RR / r; const dx = t.x * k - t.x, dz = t.z * k - t.z; t.x += dx; t.z += dz; this.camera.position.x += dx; this.camera.position.z += dz; }
      const st = this.controls.state;
      const off = this._off || (this._off = new V3());
      const sph = this._sph || (this._sph = new THREE.Spherical());
      off.copy(this.camera.position).sub(t);
      sph.setFromVector3(off);
      if (st === 2 || st === 4) {
        const d = Math.hypot(t.x - this.view.target.x, t.z - this.view.target.z);
        const k = THREE.MathUtils.smoothstep(d, 1.2, 9);
        const gp = this.gameplayPolarDeg;
        const want = THREE.MathUtils.degToRad(gp + (ROAM_POLAR - gp) * k);
        sph.phi += (want - sph.phi) * 0.25;
      }
      // אף פעם לא מתחת לגובה 1.8 (בתוך דמויות / מתחת לשפת האי)
      const maxPhi = Math.acos(Math.min(1, 1.8 / Math.max(1.8, sph.radius)));
      sph.phi = Math.min(sph.phi, maxPhi, ROAM_MAX_POLAR);
      off.setFromSpherical(sph);
      this.camera.position.copy(t).add(off);
      this.camera.lookAt(t);
      return;
    }
    const x = THREE.MathUtils.clamp(t.x, b.minX, b.maxX), z = THREE.MathUtils.clamp(t.z, b.minZ, b.maxZ);
    if (x === t.x && z === t.z) return;
    this.camera.position.x += x - t.x;
    this.camera.position.z += z - t.z;
    t.x = x; t.z = z;
  }

  /** מחשב את מבט המשחק (38° מהאנך) כך שהלוח ימלא את רוחב המסך, ומעליו נשאר מקום לאי, לכס ולחיות */
  fitGameplay(side = this.view.side) {
    // חישוב על עותק — לא נוגעים במצלמה האמיתית (אחרת אנימציות מתחילות מהמקום הלא נכון)
    const cam = this.camera.clone();
    cam.updateProjectionMatrix();
    const sgn = side === 'w' ? 1 : -1;
    const az = side === 'w' ? 0 : Math.PI;
    const polar = THREE.MathUtils.degToRad(this.gameplayPolarDeg);
    const safe = this.getSafeArea();
    const H = this.height, W = this.width;
    const yTop = 1 - (2 * (safe.top + 6)) / H;
    const yBot = -1 + (2 * (safe.bottom + 4)) / H;
    // הקו שהלוח לא יורד מתחתיו (שורת הפעולות מעל הסרגל התחתון)
    const yClear = -1 + (2 * (Math.max(safe.bottom, safe.clear || 0) + 4)) / H;
    const P = (x, y, z) => new V3(x * sgn, y, z * sgn);
    // tight: המשבצות ממלאות את רוחב המסך קצה לקצה (המסגרת כמעט נחתכת) והדמויות לא מקטינות את הלוח
    const tight = this.fitTight !== false;
    const B = tight ? 4.32 : 4.85;
    const board = [P(-B, 0.3, B), P(B, 0.3, B), P(-B, 0.3, -B), P(B, 0.3, -B)];
    const front = [P(-3.0, 0, 7.0), P(3.0, 0, 7.0)];
    // ראשי הכלים בשורה הרחוקה — שלא ייחתכו מתחת ללוח המידע (חשוב במסך לרוחב)
    const pieceTops = [P(-3.6, 1.75, -3.9), P(3.6, 1.75, -3.9)];
    const back = [P(3.0, 3.0, -6.6), P(-3.0, 2.4, -6.6)];
    let dist = 20, off = 0;
    const target = new V3(), offset = new V3(), sph = new THREE.Spherical();
    const v = new V3();
    const avail = yTop - yBot;
    for (let it = 0; it < 80; it++) {
      target.set(0, 0, off * sgn);
      sph.set(dist, polar, az);
      offset.setFromSpherical(sph);
      cam.position.copy(target).add(offset);
      cam.lookAt(target);
      cam.updateMatrixWorld(true);
      let maxX = 0, bMin = 9, bMax = -9, fMin = 9, kMax = -9;
      for (const p of board) { v.copy(p).project(cam); maxX = Math.max(maxX, Math.abs(v.x)); bMin = Math.min(bMin, v.y); bMax = Math.max(bMax, v.y); }
      for (const p of front) { v.copy(p).project(cam); fMin = Math.min(fMin, v.y); }
      for (const p of back) { v.copy(p).project(cam); kMax = Math.max(kMax, v.y); }
      if (tight) for (const p of pieceTops) { v.copy(p).project(cam); bMax = Math.max(bMax, v.y); }
      const sx = maxX / (tight ? 1.0 : 0.985);
      const sy = (bMax - bMin) / ((yTop - yClear) * (tight ? 0.97 : 0.9));
      dist *= Math.pow(Math.max(sx, sy), 0.7);
      dist = Math.min(60, Math.max(8, dist));
      // אנכית: כל התמונה (עמדות + לוח) במרכז אם נכנסת; אחרת הלוח והעמדות הקדמיות מעוגנים לתחתית
      const lo = Math.min(fMin, bMin), hi = Math.max(kMax, bMax);
      let dy;
      if (tight) dy = (bMin + bMax) / 2 - (yTop + yBot) / 2 - avail * (this.fitBias ?? 0.04); // הלוח במרכז הרצועה הפנויה (קצת למעלה — לדמויות הקרובות יותר מקום)
      if (tight) dy = Math.min(dy, bMin - yClear); // אבל אף פעם לא מתחת לשורת הפעולות
      else if (hi - lo <= avail * 0.98) dy = (lo + hi) / 2 - (yTop + yBot) / 2;
      else dy = Math.max(lo - (yBot + 0.01), bMax - (yTop - 0.02));
      off -= dy * dist * 0.3;
      off = Math.min(6, Math.max(-8, off));
    }
    this.view.side = side;
    this.view.target.set(0, 0, off * sgn);
    this.view.radius = dist;
    this.view.polar = polar;
    this.view.azimuth = az;
    this.view.position.copy(this.view.target).add(offset.setFromSpherical(sph.set(dist, polar, az)));
    this.controls.minDistance = dist * 0.45;
    this.controls.maxDistance = dist * 1.7;
    this.panBounds = { minX: -3.6, maxX: 3.6, minZ: Math.min(-4.2, off * sgn), maxZ: Math.max(4.2, off * sgn) };
    return this.view;
  }

  /** קפיצה/אנימציה למבט המשחק */
  toGameplay(duration = 1.1, side = this.view.side) {
    this.overviewOn = false;
    this.endFreeLook();
    this.fitGameplay(side);
    return this.animateCamera(this.view.position, this.view.target, duration);
  }

  animateCamera(toPos, toTarget, duration = 1.2, ease = 'power2.inOut') {
    this.controls.enabled = false;
    this.controls.autoRotate = false;
    this.animatingCamera = true;
    const fromPos = this.camera.position.clone();
    const fromTarget = this.controls.target.clone();
    // אינטרפולציה כדורית סביב המטרה (קשת חלקה, לא קו ישר)
    const s0 = new THREE.Spherical().setFromVector3(fromPos.clone().sub(fromTarget));
    const s1 = new THREE.Spherical().setFromVector3(toPos.clone().sub(toTarget));
    let dTheta = s1.theta - s0.theta;
    while (dTheta > Math.PI) dTheta -= TAU;
    while (dTheta < -Math.PI) dTheta += TAU;
    const st = { t: 0 };
    return new Promise((resolve) => {
      if (duration <= 0) st.t = 1;
      const apply = () => {
        const t = st.t;
        const tg = fromTarget.clone().lerp(toTarget, t);
        const sp = new THREE.Spherical(s0.radius + (s1.radius - s0.radius) * t, s0.phi + (s1.phi - s0.phi) * t, s0.theta + dTheta * t);
        this.camera.position.copy(tg).add(new V3().setFromSpherical(sp));
        this.camera.lookAt(tg);
        this.controls.target.copy(tg);
      };
      const done = () => { apply(); this.animatingCamera = false; this.controls.enabled = true; this.controls.update(); resolve(); };
      if (duration <= 0) { done(); return; }
      const tw = gsap.to(st, { t: 1, duration, ease, onUpdate: apply, onComplete: () => { if (this._camTween === tw) this._camTween = null; done(); } });
      this._camTween = tw;
    });
  }

  /**
   * מבט רחב שבו כל האי נכנס למסך. ברירת מחדל: כל המסך (לפתיחה הקולנועית);
   * עם yTop/yBot — בין הסרגל העליון לתחתון (מבט־על באי המרכזי).
   */
  fitIslandWide(az = this.view.azimuth, { polarDeg = 48, rimR = 25, xMax = 0.94, yTop = 0.78, yBot = -0.78, pts = null } = {}) {
    const cam = this.camera.clone();
    cam.updateProjectionMatrix();
    const polar = THREE.MathUtils.degToRad(polarDeg);
    const rim = pts || [];
    if (!pts) for (let i = 0; i < 32; i++) { const a = (i / 32) * TAU; rim.push(new V3(Math.cos(a) * rimR, 0, Math.sin(a) * rimR)); }
    const dir = new V3(Math.sin(az), 0, Math.cos(az)); // מהמרכז לכיוון המצלמה
    const tg = new V3(), v = new V3(), off = new V3();
    let r = 80, o = 0;
    for (let it = 0; it < 60; it++) {
      tg.copy(dir).multiplyScalar(o);
      cam.position.copy(tg).add(off.setFromSpherical(new THREE.Spherical(r, polar, az)));
      cam.lookAt(tg);
      cam.updateMatrixWorld(true);
      let mx = 0, lo = 9, hi = -9;
      for (const p of rim) { v.copy(p).project(cam); mx = Math.max(mx, Math.abs(v.x)); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); }
      r *= Math.pow(Math.max(mx / xMax, (hi - lo) / (yTop - yBot)), 0.8);
      r = Math.min(170, Math.max(35, r));
      o -= ((lo + hi) / 2 - (yTop + yBot) / 2) * r * 0.3; // האי במרכז הרצועה הפנויה
      o = Math.min(18, Math.max(-18, o));
    }
    return { target: tg.clone(), radius: r, polar };
  }

  /** מבט־על על כל האי בין הסרגלים (האי המרכזי: רואים את כל המבנים) */
  overviewFrame(az = this.view.azimuth) {
    const safe = this.getSafeArea();
    const H = this.height;
    const yTop = 1 - (2 * (safe.top + 10)) / H;
    const yBot = -1 + (2 * (Math.max(safe.bottom, safe.clear || 0) + 8)) / H;
    return this.fitIslandWide(az, { polarDeg: 48, rimR: this.islandR ?? 27, xMax: 0.97, yTop, yBot, pts: this.islandShape });
  }

  /** מצב מבט־על: טיול חופשי מסביב לאי, עם טווח זום שמתאים למרחק */
  enterOverview(O) {
    this.overviewOn = true;
    this.freeLook = true;
    this.controls.maxPolarAngle = ROAM_MAX_POLAR;
    this.controls.minDistance = 6;
    this.controls.maxDistance = O.radius * 1.25;
  }

  /** מעבר מצלמה למבט־על על כל האי */
  async toOverview(duration = 1.4, side = this.view.side) {
    this.endFreeLook();
    this.fitGameplay(side);
    const O = this.overviewFrame(this.view.azimuth);
    this.enterOverview(O); // גבולות הזום לפני שהאנימציה נגמרת (אחרת המצלמה "קופצת" פנימה)
    const pos = O.target.clone().add(new V3().setFromSpherical(new THREE.Spherical(O.radius, O.polar, this.view.azimuth)));
    await this.animateCamera(pos, O.target, duration);
    this.enterOverview(O);
  }

  /**
   * פתיחה קולנועית של אי: מתחילים במבט רחב על כל האי (סיבוב והתקרבות איטיים),
   * ואז צוללים אל מבט המשחק — או, עם overview, נשארים במבט־על על כל האי.
   * skipIntro() מקצר (נגיעה במסך).
   */
  async islandIntro(side = this.view.side, { hold = 2.6, dive = 2.3, onDive, overview = false } = {}) {
    this.endFreeLook();
    this.fitGameplay(side);
    const az0 = this.view.azimuth;
    const W = this.fitIslandWide(az0 - 0.3, { rimR: (this.islandR ?? 27) * 0.93, pts: this.islandShape });
    const O = overview ? this.overviewFrame(az0) : null;
    const from = W.target.clone();
    const st = { az: az0 - 0.7, r: W.radius * 1.06, k: 0 };
    const tg = new V3();
    const apply = () => {
      tg.lerpVectors(from, O ? O.target : from, st.k);
      this.camera.position.copy(tg).add(new V3().setFromSpherical(new THREE.Spherical(st.r, W.polar + ((O ? O.polar : W.polar) - W.polar) * st.k, st.az)));
      this.camera.lookAt(tg);
      this.controls.target.copy(tg);
    };
    this.controls.enabled = false;
    this.controls.autoRotate = false;
    this.animatingCamera = true;
    this.introFog = true;
    this._introSkip = false;
    apply();
    if (O) {
      // מבט־על: מסתובבים לאט אל צד השחקן ונעצרים כשכל האי בין הסרגלים
      let shown = false;
      const reveal = () => { if (!shown) { shown = true; onDive?.(); } };
      await new Promise((resolve) => {
        this._introTween = gsap.to(st, {
          az: az0, r: O.radius, k: 1, duration: this.reducedMotion ? 0.6 : hold + 0.4, ease: 'sine.inOut',
          onUpdate: () => { apply(); if (this._introTween && this._introTween.progress() > 0.6) reveal(); },
          onComplete: resolve,
        });
      });
      this._introTween = null;
      reveal();
      this.enterOverview(O);
      this.animatingCamera = false;
      this.controls.enabled = true;
      this.controls.update();
      this.introFog = false;
      return;
    }
    if (!this.reducedMotion && hold > 0) {
      await new Promise((resolve) => {
        this._introTween = gsap.to(st, { az: az0 - 0.2, r: W.radius * 0.8, duration: hold, ease: 'sine.inOut', onUpdate: apply, onComplete: resolve });
      });
    }
    this._introTween = null;
    onDive?.();
    try {
      await this.toGameplay(this._introSkip || this.reducedMotion ? 0.8 : dive, side);
    } finally {
      this.introFog = false;
    }
  }

  skipIntro() {
    this._introSkip = true;
    if (this._introTween) this._introTween.progress(1);
    else this._camTween?.timeScale(3);
  }

  /** מסלול קולנועי סביב נקודה: מסובב azimuth בזמן */
  cinematicOrbit({ target = [0, 2, -4], radius = 30, polar = 62, fromAz = -0.6, toAz = 0.6, duration = 4, ease = 'sine.inOut' } = {}) {
    this.controls.enabled = false;
    this.animatingCamera = true;
    const tg = new V3(...target);
    if (this.reducedMotion) { const mid = (fromAz + toAz) / 2; fromAz = mid - 0.08; toAz = mid + 0.08; }
    const st = { az: fromAz };
    const ph = THREE.MathUtils.degToRad(polar);
    const apply = () => {
      this.camera.position.copy(tg).add(new V3().setFromSpherical(new THREE.Spherical(radius, ph, st.az)));
      this.camera.lookAt(tg);
      this.controls.target.copy(tg);
    };
    return new Promise((resolve) => {
      gsap.to(st, { az: toAz, duration, ease, onUpdate: apply, onComplete: resolve });
    });
  }

  /** מעבר מצלמה של 180° מעל הממלכה (מצב שני שחקנים) */
  async flipTo(side) {
    this.fitGameplay(side);
    const tg = this.view.target.clone();
    const start = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    const endTheta = side === 'w' ? 0 : Math.PI;
    let dTheta = endTheta - start.theta;
    while (dTheta > Math.PI) dTheta -= TAU;
    while (dTheta <= -Math.PI) dTheta += TAU;
    if (Math.abs(dTheta) < 0.01) dTheta = Math.PI;
    this.controls.enabled = false;
    this.animatingCamera = true;
    const fromTarget = this.controls.target.clone();
    const st = { t: 0 };
    await new Promise((resolve) => {
      gsap.to(st, {
        t: 1, duration: 1.7, ease: 'power2.inOut',
        onUpdate: () => {
          const t = st.t;
          const lift = Math.sin(t * Math.PI);
          const phi = start.phi + (this.view.polar - start.phi) * t - lift * 0.45;
          const r = start.radius + (this.view.radius - start.radius) * t + lift * 6;
          const cur = fromTarget.clone().lerp(tg, t);
          this.camera.position.copy(cur).add(new V3().setFromSpherical(new THREE.Spherical(r, Math.max(0.15, phi), start.theta + dTheta * t)));
          this.camera.lookAt(cur);
          this.controls.target.copy(cur);
        },
        onComplete: resolve,
      });
    });
    this.animatingCamera = false;
    this.controls.enabled = true;
    this.controls.update();
  }

  setPanorama(on) {
    this.panoramaOn = on;
    this.controls.enablePan = !on;
    if (on) {
      const tg = new V3(0, 3.5, -2);
      const pos = tg.clone().add(new V3().setFromSpherical(new THREE.Spherical(this.view.radius * 1.6, THREE.MathUtils.degToRad(72), this.view.azimuth + 0.4)));
      return this.animateCamera(pos, tg, 1.4).then(() => {
        if (!this.panoramaOn) return;
        this.controls.autoRotate = true;
        this.controls.maxDistance = this.view.radius * 2.6;
      });
    }
    this.controls.autoRotate = false;
    return this.toGameplay(1.2);
  }

  /** רעידות מצלמה כבויות כברירת מחדל: הלוח לא זז בזמן משחק (steadyCamera) */
  addShake(amp = 0.25) { if (!this.reducedMotion && !this.steadyCamera) this.shake.amp = Math.max(this.shake.amp, amp); }

  // ---------- עזרים ----------
  pick(clientX, clientY, objects) {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  projectToScreen(v3) {
    const v = v3.clone().project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  onUpdate(fn) { this.updaters.add(fn); return () => this.updaters.delete(fn); }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.width = w; this.height = h;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.75 ? 52 : aspect < 1.2 ? 46 : 40;
    this.camera.updateProjectionMatrix();
    if (!this.animatingCamera && !this.panoramaOn && !this.freeLook && this._fitted) {
      this.fitGameplay();
      this.camera.position.copy(this.view.position);
      this.controls.target.copy(this.view.target);
      this.controls.update();
    }
  }

  /** מיקום ראשוני מיידי */
  initView(side = 'w') {
    this.endFreeLook();
    this.fitGameplay(side);
    this.camera.position.copy(this.view.position);
    this.controls.target.copy(this.view.target);
    this.controls.update();
    this._fitted = true;
  }

  setQuality(level) {
    this.quality.level = level;
    const dpr = level === 'low' ? Math.min(1.25, this.dprCap) : level === 'medium' ? Math.min(1.6, this.dprCap) : this.dprCap;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    const ms = level === 'low' ? 1024 : 2048;
    if (this.key.shadow.mapSize.x !== ms) {
      this.key.shadow.mapSize.set(ms, ms);
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
    }
  }

  /** איכות אוטומטית: אם הקצב נמוך — מורידים רזולוציה */
  autoQuality(dt) {
    const q = this.quality;
    if (q.mode !== 'auto' || q.checked) return;
    q.samples.push(dt);
    if (q.samples.length < 150) return;
    const avg = q.samples.slice(30).reduce((a, b) => a + b, 0) / (q.samples.length - 30);
    const fps = 1 / avg;
    q.samples = [];
    if (fps < 40 && q.level === 'high') this.setQuality('medium');
    else if (fps < 40 && q.level === 'medium') { this.setQuality('low'); q.checked = true; }
    else q.checked = true;
  }

  loop(now) {
    requestAnimationFrame(this.loop);
    if (document.hidden || this.paused) { this.clockLast = now; return; }
    const dt = Math.min(0.05, Math.max(0.001, (now - this.clockLast) / 1000));
    this.clockLast = now;
    this.time += dt;
    this.skyUniforms.uTime.value = this.time;
    for (const s of this.pointPool) {
      if (!s.owner) continue;
      const f = s.flicker;
      const n = Math.sin(this.time * 11 + s.phase) * 0.5 + Math.sin(this.time * 23.7 + s.phase * 2) * 0.3 + Math.sin(this.time * 5.3) * 0.2;
      s.light.intensity += ((s.base * (1 + n * f)) - s.light.intensity) * Math.min(1, dt * 12);
    }
    this.sea.update(this.time);
    this.clouds.forEach((c) => {
      const a = Math.atan2(c.position.z, c.position.x) + dt * 0.006 * c.userData.speed;
      const r = Math.hypot(c.position.x, c.position.z);
      c.position.x = Math.cos(a) * r; c.position.z = Math.sin(a) * r;
    });
    this.updaters.forEach((fn) => fn(dt, this.time));
    if (this.controls.enabled) this.controls.update();
    // רעידת מצלמה
    const sh = this.shake;
    if (sh.amp > 0.001) {
      sh.offset.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(sh.amp);
      sh.amp *= Math.exp(-sh.decay * dt);
    } else sh.offset.set(0, 0, 0);
    this.camera.position.add(sh.offset);
    const fb = (this.introFog || this.overviewOn || this.freeLook) ? Math.max(0, this.camera.position.distanceTo(this.controls.target) - this.view.radius * 1.2) : 0;
    if (fb) { this.fog.near += fb; this.fog.far += fb; }
    this.renderer.render(this.scene, this.camera);
    if (fb) { this.fog.near -= fb; this.fog.far -= fb; }
    this.camera.position.sub(sh.offset);
    this.autoQuality(dt);
  }
}
