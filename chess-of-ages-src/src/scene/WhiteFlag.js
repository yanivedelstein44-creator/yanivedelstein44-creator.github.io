/**
 * דגל לבן מתנוסס ברוח באי שכבר ניצחת — הבוט של האי נכנע.
 * עמוד מאחורי הכס של הבוט; בד עם גלים שזזים (קודקודים מונפשים), ובכיבוש ראשון הדגל עולה במעלה העמוד.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { mesh, G } from './kit.js';

const W = 1.15, H = 0.74, POLE = 2.7;

export class WhiteFlag {
  constructor(sm) {
    this.g = new THREE.Group();
    const pole = mesh(G.cyl(0.035, 0.05, POLE, 8), new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.4, metalness: 0.6 }), { pos: [0, POLE / 2, 0], cast: true });
    const knob = mesh(G.sph(0.085, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.9 }), { pos: [0, POLE + 0.05, 0] });
    const foot = mesh(G.cyl(0.22, 0.3, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0x8a8274, roughness: 0.9 }), { pos: [0, 0.08, 0], receive: true });
    this.geo = new THREE.PlaneGeometry(W, H, 16, 8);
    this.geo.translate(W / 2, 0, 0);
    this.base = this.geo.attributes.position.array.slice();
    this.cloth = new THREE.Mesh(this.geo, new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.85, side: THREE.DoubleSide }));
    this.cloth.castShadow = true;
    this.topY = POLE - H / 2 - 0.05;
    this.cloth.position.set(0.04, this.topY, 0);
    this.g.add(pole, knob, foot, this.cloth);
    this.g.visible = false;
    this.frame = 0;
    sm.world.add(this.g);
    sm.onUpdate((dt, tt) => this.update(tt));
  }

  /** מאחורי הלוח בצד של הבוט (בין הבוט לחיה שלו), כך שרואים אותו גם במבט המשחק בטלפון */
  place(x, z) { this.g.position.set(x, 0, z); }

  /** raise — הדגל עולה לאט במעלה העמוד (ברגע הכיבוש) */
  show(on, { raise = false } = {}) {
    gsap.killTweensOf(this.cloth.position);
    this.g.visible = on;
    if (!on) return;
    if (raise) {
      this.cloth.position.y = 0.55;
      gsap.to(this.cloth.position, { y: this.topY, duration: 2.4, ease: 'power1.inOut', delay: 0.8 });
    } else this.cloth.position.y = this.topY;
  }

  update(tt) {
    if (!this.g.visible) return;
    const p = this.geo.attributes.position, b = this.base;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3], y = b[i * 3 + 1];
      const k = x / W; // 0 ליד העמוד, 1 בקצה החופשי
      p.setZ(i, (Math.sin(x * 4.2 - tt * 5.5) * 0.13 + Math.sin(x * 7 + y * 3 - tt * 8) * 0.04) * k);
      p.setY(i, y - k * k * 0.07 + Math.sin(x * 3 - tt * 4) * 0.025 * k);
    }
    p.needsUpdate = true;
    if (++this.frame % 3 === 0) this.geo.computeVertexNormals();
  }
}
