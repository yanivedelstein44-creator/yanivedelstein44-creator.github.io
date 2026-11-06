/**
 * אפקטים מיוחדים: גל הלם זהוב (אבולוציית עידן), הבזק וכדורי אור.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { drawnTexture } from './kit.js';

export class Shockwave {
  constructor(sceneMgr, fx) {
    this.sm = sceneMgr;
    this.fx = fx;
    const ringTex = drawnTexture('shockRing', 512, (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,220,120,0)');
      g.addColorStop(0.72, 'rgba(255,220,120,0)');
      g.addColorStop(0.9, 'rgba(255,240,190,0.95)');
      g.addColorStop(0.96, 'rgba(255,200,90,0.6)');
      g.addColorStop(1, 'rgba(255,180,60,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    });
    const wallTex = drawnTexture('shockWall', 64, (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, 'rgba(255,230,150,0)');
      g.addColorStop(0.7, 'rgba(255,210,110,0.35)');
      g.addColorStop(1, 'rgba(255,250,220,0.95)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    });
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: 0xffd36a }));
    this.ring.rotation.x = -Math.PI / 2;
    this.wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 96, 1, true), new THREE.MeshBasicMaterial({ map: wallTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, color: 0xffd36a }));
    this.ring.visible = this.wall.visible = false;
    this.ring.renderOrder = this.wall.renderOrder = 6;
    sceneMgr.world.add(this.ring, this.wall);
  }

  play({ duration = 1.9, maxR = 30, color = 0xffd36a, onRadius } = {}) {
    this.ring.material.color.set(color);
    this.wall.material.color.set(color);
    this.ring.visible = this.wall.visible = true;
    const st = { r: 0.2 };
    let lastBurst = 0;
    return new Promise((resolve) => {
      gsap.to(st, {
        r: maxR, duration, ease: 'power1.out',
        onUpdate: () => {
          const r = st.r;
          const fade = 1 - Math.max(0, (r - maxR * 0.6) / (maxR * 0.4));
          this.ring.scale.setScalar(r);
          this.ring.position.y = 0.45;
          this.ring.material.opacity = fade;
          this.wall.scale.set(r, 2.6 * (0.4 + fade * 0.6), r);
          this.wall.position.y = 1.3 * (0.4 + fade * 0.6);
          this.wall.material.opacity = fade * 0.9;
          if (r - lastBurst > 1.6) {
            lastBurst = r;
            const a = Math.random() * Math.PI * 2;
            for (let k = 0; k < 4; k++) {
              const aa = a + (k * Math.PI) / 2;
              this.fx.sparkle([Math.cos(aa) * r, 0.6, Math.sin(aa) * r], 6, [0xffe9a8, 0xffffff, color], 0.3);
            }
          }
          onRadius?.(r);
        },
        onComplete: () => { this.ring.visible = this.wall.visible = false; onRadius?.(maxR + 1); resolve(); },
      });
    });
  }
}

/** הבזק מסך (DOM) */
export function screenFlash(color = 'rgba(255,236,170,0.85)', duration = 0.9) {
  const el = document.createElement('div');
  el.className = 'screen-flash';
  el.style.background = `radial-gradient(circle at 50% 55%, ${color}, rgba(255,255,255,0) 70%)`;
  document.body.appendChild(el);
  gsap.fromTo(el, { opacity: 1 }, { opacity: 0, duration, ease: 'power2.out', onComplete: () => el.remove() });
}
