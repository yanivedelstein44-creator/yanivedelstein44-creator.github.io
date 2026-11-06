/**
 * מעבר עננים: שכבת עננים רכה שמכסה את המסך לרגע (כדי להחליף סצנה בלי קפיצה) ונפתחת שוב.
 * DOM + CSS בלבד (gsap) — זול גם במכשירים חלשים.
 */
import gsap from 'gsap';

let el = null;
let puffs = [];

function build() {
  if (el) return;
  el = document.createElement('div');
  el.className = 'cloud-wipe';
  el.setAttribute('aria-hidden', 'true');
  const N = 14;
  for (let i = 0; i < N; i++) {
    const p = document.createElement('i');
    const a = (i / N) * Math.PI * 2;
    p.dataset.ax = String(Math.cos(a));
    p.dataset.ay = String(Math.sin(a));
    const s = 55 + ((i * 37) % 30);
    p.style.width = `${s}vmax`; p.style.height = `${s * 0.7}vmax`;
    el.appendChild(p);
    puffs.push(p);
  }
  document.body.appendChild(el);
}

/** מכסה את המסך בעננים (Promise כשהכיסוי מלא) */
export function cover(duration = 0.55) {
  build();
  el.style.display = 'block';
  gsap.killTweensOf([el, ...puffs]);
  gsap.set(el, { opacity: 1 });
  return new Promise((resolve) => {
    puffs.forEach((p, i) => {
      const ax = +p.dataset.ax, ay = +p.dataset.ay;
      gsap.fromTo(p, { xPercent: -50 + ax * 120, yPercent: -50 + ay * 120, scale: 0.6, opacity: 0 },
        { xPercent: -50 + ax * 18, yPercent: -50 + ay * 18, scale: 1.25, opacity: 1, duration, ease: 'power2.out', delay: i * 0.012 });
    });
    gsap.fromTo(el, { backgroundColor: 'rgba(235,242,255,0)' }, { backgroundColor: 'rgba(235,242,255,0.92)', duration: duration * 0.9, delay: duration * 0.35, onComplete: resolve });
  });
}

/** פותח את העננים החוצה */
export function reveal(duration = 0.8) {
  if (!el) return Promise.resolve();
  gsap.killTweensOf([el, ...puffs]);
  return new Promise((resolve) => {
    puffs.forEach((p) => {
      const ax = +p.dataset.ax, ay = +p.dataset.ay;
      gsap.to(p, { xPercent: -50 + ax * 140, yPercent: -50 + ay * 140, scale: 1.6, opacity: 0, duration, ease: 'power2.in' });
    });
    gsap.to(el, { backgroundColor: 'rgba(235,242,255,0)', duration: duration * 0.6, onComplete: () => { el.style.display = 'none'; resolve(); } });
  });
}
