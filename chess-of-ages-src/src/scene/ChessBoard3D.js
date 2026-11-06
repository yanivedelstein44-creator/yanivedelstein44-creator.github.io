/**
 * הלוח התלת-ממדי: במה, מסגרת, משבצות, קואורדינטות, כלים, סימונים פועמים,
 * בחירה במגע/מקלדת, קפיצות פרבוליות (GSAP), החלפת חומרים בגל הלם ומט קולנועי.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { createPiece, applyPieceMaterials, PIECE_HEIGHT } from './PieceFactory.js';
import { eraMaterials } from './Materials.js';
import { drawnTexture, glowTexture, mesh, G } from './kit.js';

export const BOARD_TOP = 0.36;
const FILES = 'abcdefgh';

export function squareToXZ(sq) {
  const f = sq.charCodeAt(0) - 97, r = sq.charCodeAt(1) - 49;
  return [f - 3.5, 3.5 - r];
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export class ChessBoard3D {
  constructor(sceneMgr, fx) {
    this.sm = sceneMgr;
    this.fx = fx;
    this.group = new THREE.Group();
    sceneMgr.world.add(this.group);
    this.pieces = new Map(); // square → piece group
    this.squares = [];
    this.eraKey = 'stone';
    this.mats = eraMaterials('stone');
    this.markers = [];
    this.time = 0;
    this.buildBoard();
    this.buildHighlights();
    sceneMgr.onUpdate((dt, t) => this.update(dt, t));
  }

  // ---------- בנייה ----------
  buildBoard() {
    const m = this.mats;
    const dais = new THREE.ExtrudeGeometry(roundedRect(11.2, 11.2, 0.9), { depth: 0.2, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.1, bevelSegments: 3 });
    dais.rotateX(-Math.PI / 2);
    this.dais = mesh(dais, m.dais, { pos: [0, 0.02, 0], receive: true, cast: true });
    const frameShape = roundedRect(9.6, 9.6, 0.35);
    const hole = new THREE.Path();
    hole.moveTo(-4, -4); hole.lineTo(4, -4); hole.lineTo(4, 4); hole.lineTo(-4, 4); hole.lineTo(-4, -4);
    frameShape.holes.push(hole);
    const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 });
    frameGeo.rotateX(-Math.PI / 2);
    this.frame = mesh(frameGeo, m.frame, { pos: [0, 0.2, 0], receive: true, cast: true });
    const trimShape = roundedRect(8.24, 8.24, 0.05);
    const th = new THREE.Path();
    th.moveTo(-4, -4); th.lineTo(4, -4); th.lineTo(4, 4); th.lineTo(-4, 4); th.lineTo(-4, -4);
    trimShape.holes.push(th);
    const trimGeo = new THREE.ExtrudeGeometry(trimShape, { depth: 0.03, bevelEnabled: false });
    trimGeo.rotateX(-Math.PI / 2);
    this.trim = mesh(trimGeo, m.trim, { pos: [0, BOARD_TOP + 0.005, 0] });
    this.group.add(this.dais, this.frame, this.trim);

    const sqGeo = new THREE.BoxGeometry(1, 0.1, 1);
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const light = (r + f) % 2 === 1;
        const sq = FILES[f] + (r + 1);
        const s = mesh(sqGeo, light ? m.light : m.dark, { pos: [f - 3.5, BOARD_TOP - 0.05, 3.5 - r], receive: true });
        s.userData = { square: sq, light };
        // גיוון טקסטורה בין משבצות (סיבוב 90°)
        s.rotation.y = ((f * 7 + r * 3) % 4) * (Math.PI / 2);
        this.squares.push(s);
        this.group.add(s);
      }
    }
    this.buildLabels();
  }

  buildLabels() {
    const tex = (txtArr, key) => drawnTexture(key, 512, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = '700 40px Rubik, Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,240,200,0.95)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
      txtArr.forEach((t, i) => ctx.fillText(t, ((i + 0.5) / 8) * w, h / 2));
    }, { h: 64 });
    const files = tex(FILES.split(''), 'lblFiles');
    const ranks = tex(['1', '2', '3', '4', '5', '6', '7', '8'], 'lblRanks');
    const mat = (t) => new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.8 });
    const fm = mat(files), rm = mat(ranks);
    const geo = new THREE.PlaneGeometry(8, 1);
    const y = 0.385;
    const mk = (m, pos, rotZ) => { const p = new THREE.Mesh(geo, m); p.rotation.set(-Math.PI / 2, 0, rotZ); p.position.set(...pos); p.scale.set(1, 0.4, 1); this.group.add(p); return p; };
    this.labels = [
      mk(fm, [0, y, 4.42], 0), mk(fm, [0, y, -4.42], Math.PI),
      mk(rm, [-4.42, y, 0], -Math.PI / 2), mk(rm, [4.42, y, 0], Math.PI / 2),
    ];
  }

  buildHighlights() {
    const ringTex = glowTexture('ringGlow', 'rgba(255,255,255,1)');
    this.selRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 10, 48), new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0xffb020, emissiveIntensity: 2.2, metalness: 1, roughness: 0.2 }));
    this.selRing.rotation.x = Math.PI / 2;
    this.selRing.visible = false;
    this.selGlow = new THREE.Mesh(G.plane(1.4, 1.4), new THREE.MeshBasicMaterial({ map: ringTex, color: 0xffc040, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.selGlow.rotation.x = -Math.PI / 2;
    this.selGlow.visible = false;
    this.group.add(this.selRing, this.selGlow);

    this.moveMat = new THREE.MeshStandardMaterial({ color: 0x2ee59d, emissive: 0x10c070, emissiveIntensity: 1.6, transparent: true, opacity: 0.9, roughness: 0.3 });
    this.capMat = new THREE.MeshStandardMaterial({ color: 0xff3b4e, emissive: 0xe0102a, emissiveIntensity: 1.8, transparent: true, opacity: 0.95, roughness: 0.3 });
    this.moveGeo = new THREE.TorusGeometry(0.17, 0.05, 8, 32);
    this.moveDot = new THREE.CircleGeometry(0.11, 24);
    this.capGeo = new THREE.TorusGeometry(0.44, 0.045, 8, 48);

    const tint = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending });
    this.lastFrom = mesh(G.plane(0.98, 0.98), tint(0xffc848, 0.22), { rot: [-Math.PI / 2, 0, 0] });
    this.lastTo = mesh(G.plane(0.98, 0.98), tint(0xffc848, 0.32), { rot: [-Math.PI / 2, 0, 0] });
    this.lastFrom.visible = this.lastTo.visible = false;
    this.checkGlow = mesh(G.plane(1.8, 1.8), new THREE.MeshBasicMaterial({ map: ringTex, color: 0xff2030, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), { rot: [-Math.PI / 2, 0, 0] });
    this.checkGlow.visible = false;
    this.cursor = mesh(new THREE.RingGeometry(0.42, 0.49, 4, 1), new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.95, depthWrite: false }), { rot: [-Math.PI / 2, 0, Math.PI / 4] });
    this.cursor.visible = false;
    this.hintFrom = mesh(G.plane(1, 1), tint(0x5ab8ff, 0.5), { rot: [-Math.PI / 2, 0, 0] });
    this.hintTo = mesh(G.plane(1, 1), tint(0x5ab8ff, 0.7), { rot: [-Math.PI / 2, 0, 0] });
    this.hintFrom.visible = this.hintTo.visible = false;
    this.group.add(this.lastFrom, this.lastTo, this.checkGlow, this.cursor, this.hintFrom, this.hintTo);
  }

  // ---------- כלים ----------
  matsFor(color) { return color === 'w' ? this.mats.white : this.mats.black; }

  setPosition(boardArray) {
    for (const p of this.pieces.values()) this.group.remove(p);
    this.pieces.clear();
    for (const row of boardArray) {
      for (const cell of row) {
        if (!cell) continue;
        this.spawnPiece(cell.type, cell.color, cell.square);
      }
    }
  }

  /** מחליף מראה של כלי קיים לפי ערכת חומרים */
  applyPieceLook(p, set) {
    applyPieceMaterials(p, p.userData.color === 'w' ? set.white : set.black);
  }

  spawnPiece(type, color, square, mats = this.matsFor(color)) {
    const p = createPiece(type, color, mats);
    const [x, z] = squareToXZ(square);
    p.position.set(x, BOARD_TOP, z);
    p.userData.square = square;
    this.group.add(p);
    this.pieces.set(square, p);
    return p;
  }

  pieceAt(sq) { return this.pieces.get(sq); }

  // ---------- בחירה וסימונים ----------
  select(square, moves) {
    this.clearSelection();
    const p = this.pieces.get(square);
    if (!p) return;
    this.selected = square;
    const [x, z] = squareToXZ(square);
    gsap.to(p.position, { y: BOARD_TOP + 0.28, duration: 0.22, ease: 'back.out(2)' });
    this.selRing.position.set(x, BOARD_TOP + 0.03, z);
    this.selGlow.position.set(x, BOARD_TOP + 0.02, z);
    this.selRing.visible = this.selGlow.visible = true;
    this.selRing.scale.setScalar(0.4);
    gsap.to(this.selRing.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(2)' });
    for (const mv of moves) {
      const [mx, mz] = squareToXZ(mv.to);
      const isCap = !!mv.captured;
      const g = new THREE.Group();
      if (isCap) {
        g.add(mesh(this.capGeo, this.capMat, { rot: [Math.PI / 2, 0, 0] }));
      } else {
        g.add(mesh(this.moveGeo, this.moveMat, { rot: [Math.PI / 2, 0, 0] }));
        g.add(mesh(this.moveDot, this.moveMat, { rot: [-Math.PI / 2, 0, 0] }));
      }
      g.position.set(mx, BOARD_TOP + 0.03, mz);
      g.userData = { square: mv.to, cap: isCap, phase: Math.random() * 0.5 };
      g.scale.setScalar(0.01);
      gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.25, delay: 0.02 * this.markers.length, ease: 'back.out(2.5)' });
      this.group.add(g);
      this.markers.push(g);
    }
  }

  clearSelection() {
    if (this.selected) {
      const p = this.pieces.get(this.selected);
      if (p) gsap.to(p.position, { y: BOARD_TOP, duration: 0.18, ease: 'power2.out' });
    }
    this.selected = null;
    this.selRing.visible = this.selGlow.visible = false;
    this.clearMarkers();
  }

  clearMarkers() {
    this.markers.forEach((m) => this.group.remove(m));
    this.markers = [];
  }

  /** משוב "מהלך לא חוקי" — ניעור הכלי הנבחר */
  shakeSelected() {
    const p = this.selected && this.pieces.get(this.selected);
    if (!p) return;
    const x0 = squareToXZ(this.selected)[0];
    gsap.fromTo(p.position, { x: x0 - 0.06 }, { x: x0, duration: 0.35, ease: 'elastic.out(1.4, 0.25)' });
  }

  setLastMove(from, to) {
    if (!from) { this.lastFrom.visible = this.lastTo.visible = false; return; }
    const [fx, fz] = squareToXZ(from), [tx, tz] = squareToXZ(to);
    this.lastFrom.position.set(fx, BOARD_TOP + 0.012, fz);
    this.lastTo.position.set(tx, BOARD_TOP + 0.012, tz);
    this.lastFrom.visible = this.lastTo.visible = true;
  }

  setCheck(square) {
    if (!square) { this.checkGlow.visible = false; return; }
    const [x, z] = squareToXZ(square);
    this.checkGlow.position.set(x, BOARD_TOP + 0.02, z);
    this.checkGlow.visible = true;
  }

  setCursor(square) {
    if (!square) { this.cursor.visible = false; return; }
    const [x, z] = squareToXZ(square);
    this.cursor.position.set(x, BOARD_TOP + 0.02, z);
    this.cursor.visible = true;
  }

  showHint(from, to) {
    const [fx, fz] = squareToXZ(from), [tx, tz] = squareToXZ(to);
    this.hintFrom.position.set(fx, BOARD_TOP + 0.015, fz);
    this.hintTo.position.set(tx, BOARD_TOP + 0.015, tz);
    this.hintFrom.visible = this.hintTo.visible = true;
    this.fx.sparkle([tx, BOARD_TOP + 0.3, tz], 20, [0x9ad8ff, 0xffffff, 0x5ab8ff], 0.3);
    clearTimeout(this._hintT);
    this._hintT = setTimeout(() => { this.hintFrom.visible = this.hintTo.visible = false; }, 6000);
  }
  clearHint() { this.hintFrom.visible = this.hintTo.visible = false; }

  /** בחירת משבצת לפי נקודת מגע */
  pickSquare(clientX, clientY, prefer = null) {
    const objs = [...this.squares, ...this.pieces.values(), ...this.markers];
    const hits = this.sm.pick(clientX, clientY, objs);
    let first = null;
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.square) o = o.parent;
      if (!o || !o.userData.square) continue;
      const sq = o.userData.square;
      if (!first) first = sq;
      // עדיפות למשבצות רלוונטיות (יעדים חוקיים / כלים שאפשר להזיז) גם אם כלי גבוה מסתיר אותן
      if (prefer && prefer.has(sq)) return sq;
    }
    return first;
  }

  /** האם נקודת מגע על הלוח (כדי לא לסובב מצלמה) */
  hitsBoard(clientX, clientY) {
    const hits = this.sm.pick(clientX, clientY, [this.frame, ...this.squares, ...this.pieces.values()]);
    return hits.length > 0;
  }

  // ---------- תנועה ----------
  /**
   * מנפיש מהלך chess.js (verbose). מחזיר Promise כשהכלי נחת.
   * hooks: onLift, onLand(capture), onCapture(square)
   */
  animateMove(mv, hooks = {}, speed = 1) {
    const piece = this.pieces.get(mv.from);
    this.clearSelection();
    if (!piece) return Promise.resolve();
    const [fx, fz] = squareToXZ(mv.from), [tx, tz] = squareToXZ(mv.to);
    const dist = Math.hypot(tx - fx, tz - fz);
    const isKnight = mv.piece === 'n';
    const h = (isKnight ? 1.2 : 0.55) + dist * 0.1;
    const dur = (0.36 + dist * 0.035) / speed;
    let capSq = null;
    if (mv.captured) capSq = mv.flags.includes('e') ? mv.to[0] + mv.from[1] : mv.to;
    const victim = capSq ? this.pieces.get(capSq) : null;
    this.pieces.delete(mv.from);
    if (capSq) this.pieces.delete(capSq);
    this.pieces.set(mv.to, piece);
    piece.userData.square = mv.to;

    const startY = piece.position.y;
    const st = { t: 0 };
    hooks.onLift?.();
    const tl = gsap.timeline();
    tl.to(st, {
      t: 1, duration: dur, ease: 'power2.inOut',
      onUpdate: () => {
        const t = st.t;
        piece.position.x = fx + (tx - fx) * t;
        piece.position.z = fz + (tz - fz) * t;
        piece.position.y = startY + (BOARD_TOP - startY) * t + 4 * h * t * (1 - t);
        piece.rotation.z = Math.sin(t * Math.PI) * (isKnight ? 0.25 : 0.06) * (tx > fx ? -1 : 1);
      },
    });
    // מכה בכלי הנאכל ממש לפני הנחיתה
    if (victim) {
      tl.add(() => {
        hooks.onCapture?.(capSq);
        const [vx, vz] = squareToXZ(capSq);
        this.fx.dust([vx, BOARD_TOP + 0.1, vz], 22, 0xb8a68a, 1);
        this.fx.sparkle([vx, BOARD_TOP + 0.5, vz], 18, [0xffffff, this.mats.glow, 0xffd060]);
        const away = new THREE.Vector3(vx - fx, 0, vz - fz).normalize();
        gsap.to(victim.position, { x: vx + away.x * 1.6, z: vz + away.z * 1.6, y: BOARD_TOP + 1.4, duration: 0.42, ease: 'power2.out' });
        gsap.to(victim.rotation, { x: away.z * 2.4, z: -away.x * 2.4, duration: 0.5 });
        gsap.to(victim.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.5, delay: 0.12, ease: 'power2.in', onComplete: () => this.group.remove(victim) });
      }, dur * 0.82);
    }
    tl.add(() => {
      piece.rotation.z = 0;
      hooks.onLand?.(!!victim);
      this.fx.dust([tx, BOARD_TOP + 0.05, tz], 8, 0xc8b89a, 0.6);
    });
    tl.to(piece.scale, { y: 0.88, x: 1.06, z: 1.06, duration: 0.07, ease: 'power1.out' });
    tl.to(piece.scale, { y: 1, x: 1, z: 1, duration: 0.25, ease: 'elastic.out(1.2, 0.4)' });

    // הצרחה: הזזת הצריח
    if (mv.flags.includes('k') || mv.flags.includes('q')) {
      const rank = mv.from[1];
      const rf = (mv.flags.includes('k') ? 'h' : 'a') + rank;
      const rt = (mv.flags.includes('k') ? 'f' : 'd') + rank;
      const rook = this.pieces.get(rf);
      if (rook) {
        this.pieces.delete(rf); this.pieces.set(rt, rook); rook.userData.square = rt;
        const [rx, rz] = squareToXZ(rt);
        tl.to(rook.position, { x: rx, z: rz, duration: 0.35, ease: 'power2.inOut' }, dur * 0.4);
        tl.to(rook.position, { y: BOARD_TOP + 0.5, duration: 0.18, yoyo: true, repeat: 1, ease: 'sine.inOut' }, dur * 0.4);
      }
    }
    return new Promise((resolve) => {
      tl.add(() => {
        if (mv.promotion) this.promote(mv.to, mv.promotion, mv.color);
        resolve();
      });
    });
  }

  promote(square, type, color) {
    const old = this.pieces.get(square);
    if (old) this.group.remove(old);
    const p = this.spawnPiece(type, color, square);
    p.scale.setScalar(0.01);
    gsap.to(p.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    const [x, z] = squareToXZ(square);
    this.fx.sparkle([x, BOARD_TOP + 0.6, z], 60, [0xffffff, 0xffe08a, 0x9ad8ff], 0.5);
  }

  // ---------- עידנים וסקינים ----------
  /** סדר עדיפות: סקין שהשחקן הלביש > לוח ייחודי של אי פרימיום > ערכת העידן */
  get matKey() { return this.skinKey || this.islandBoardKey || this.eraKey || 'stone'; }

  /** החלפת חומרים מיידית או בגל רדיאלי (radius מגיע מגל ההלם) */
  setEra(key, { instant = true } = {}) {
    this.eraKey = key;
    this.pendingMats = eraMaterials(this.matKey);
    if (instant) { this.mats = this.pendingMats; this.pendingMats = null; this.applyAll(); return; }
    this.morphDone = new Set();
  }

  /** לוח ייחודי של האי (איי פרימיום); מוחל בקריאת setEra הבאה או מיד */
  setIslandBoard(key, { apply = false } = {}) {
    this.islandBoardKey = key || '';
    if (apply) this.reapply();
  }

  /** סקין לוח וכלים שהשחקן בחר ('' = לוח האי) — מוחל מיד עם ניצוץ קטן */
  setSkin(id, { flash = false } = {}) {
    const next = id || '';
    if (next === (this.skinKey || '')) return;
    this.skinKey = next;
    this.reapply();
    if (flash) this.fx?.sparkle?.([0, BOARD_TOP + 0.4, 0], 40, [0xffffff, 0xffe08a, 0x9ad8ff], 1.6);
  }

  reapply() {
    this.pendingMats = null;
    this.morphDone = null;
    this.mats = eraMaterials(this.matKey);
    this.applyAll();
  }

  applyAll() {
    const m = this.mats;
    this.dais.material = m.dais; this.frame.material = m.frame; this.trim.material = m.trim;
    this.squares.forEach((s) => { s.material = s.userData.light ? m.light : m.dark; });
    for (const p of this.pieces.values()) this.applyPieceLook(p, m);
  }

  /** נקרא כשגל ההלם מתרחב: כל מה שבתוך הרדיוס מקבל את חומרי העידן החדש */
  morphTo(radius) {
    if (!this.pendingMats || !this.morphDone) return;
    const m = this.pendingMats;
    this.squares.forEach((s) => {
      if (this.morphDone.has(s)) return;
      if (Math.hypot(s.position.x, s.position.z) <= radius) {
        s.material = s.userData.light ? m.light : m.dark;
        this.morphDone.add(s);
      }
    });
    for (const p of this.pieces.values()) {
      if (this.morphDone.has(p)) continue;
      if (Math.hypot(p.position.x, p.position.z) <= radius) {
        this.applyPieceLook(p, m);
        this.morphDone.add(p);
        gsap.fromTo(p.scale, { x: 1.25, y: 1.25, z: 1.25 }, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
        this.fx.sparkle([p.position.x, BOARD_TOP + 0.5, p.position.z], 6);
      }
    }
    if (radius >= 4.8 && !this.morphDone.has('frame')) {
      this.morphDone.add('frame');
      this.frame.material = m.frame; this.trim.material = m.trim;
    }
    if (radius >= 6.5 && !this.morphDone.has('dais')) {
      this.morphDone.add('dais');
      this.dais.material = m.dais;
      this.mats = m;
      this.pendingMats = null;
    }
  }

  // ---------- מט קולנועי ----------
  async toppleKing(square) {
    const k = this.pieces.get(square);
    if (!k) return;
    const [x, z] = squareToXZ(square);
    await new Promise((res) => {
      const tl = gsap.timeline({ onComplete: res });
      tl.to(k.rotation, { z: 0.12, duration: 0.25, ease: 'sine.inOut', yoyo: true, repeat: 3 });
      tl.to(k.rotation, { z: Math.PI / 2 * 0.96, duration: 0.9, ease: 'bounce.out' });
      tl.to(k.position, { x: x - 0.45, y: BOARD_TOP + 0.28, duration: 0.9, ease: 'bounce.out' }, '<');
      tl.add(() => { this.fx.dust([x - 0.6, BOARD_TOP + 0.1, z], 30, 0xc8b89a, 1.2); }, '-=0.6');
    });
  }

  resetKing(square) {
    const k = this.pieces.get(square);
    if (!k) return;
    const [x, z] = squareToXZ(square);
    k.rotation.set(0, 0, 0);
    k.position.set(x, BOARD_TOP, z);
  }

  // ---------- לולאה ----------
  update(dt, t) {
    this.time = t;
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    this.markers.forEach((m) => {
      const s = m.userData.cap ? 1 + pulse * 0.08 : 0.9 + pulse * 0.25;
      if (!gsap.isTweening(m.scale)) m.scale.setScalar(s);
      m.position.y = BOARD_TOP + 0.03 + (m.userData.cap ? 0 : pulse * 0.04);
    });
    this.moveMat.emissiveIntensity = 1.2 + pulse * 1.2;
    this.capMat.emissiveIntensity = 1.3 + pulse * 1.4;
    if (this.selRing.visible) {
      this.selRing.rotation.z += dt * 1.5;
      this.selGlow.material.opacity = 0.35 + pulse * 0.35;
    }
    if (this.checkGlow.visible) this.checkGlow.material.opacity = 0.45 + pulse * 0.55;
    if (this.cursor.visible) this.cursor.material.opacity = 0.55 + pulse * 0.45;
  }

  squareWorld(sq) {
    const [x, z] = squareToXZ(sq);
    return new THREE.Vector3(x, BOARD_TOP + 0.6, z);
  }

  pieceHeight(type) { return PIECE_HEIGHT[type] || 1; }
}
