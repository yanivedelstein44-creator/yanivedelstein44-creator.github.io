/**
 * המתנה היומית: פעם ביום מופיעה בועת מתנה מעל בית המתנות באי המרכזי — נגיעה אוספת אותה.
 * רצף של 7 ימים מגדיל את המתנה. בלי גלגל מזל ובלי הגרלות: לכל יום סכום קבוע וידוע מראש.
 */
import { h } from './UI.js';
import { t } from './i18n.js';

function confettiBurst(durationMs = 2600) {
  const c = h('canvas', { class: 'confetti-canvas', 'aria-hidden': 'true' });
  document.body.appendChild(c);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const ctx = c.getContext('2d');
  const cols = ['#ffd34d', '#ff5a7a', '#5ad1ff', '#8aff7a', '#c77dff', '#ffffff'];
  const parts = Array.from({ length: 170 }, () => ({ x: c.width / 2, y: c.height * 0.45, vx: (Math.random() - 0.5) * 22 * dpr, vy: (-Math.random() * 18 - 6) * dpr, s: (4 + Math.random() * 6) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now();
  const step = (now) => {
    const k = (now - t0) / durationMs;
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of parts) {
      p.vy += 0.55 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); ctx.restore();
    }
    if (k < 1) requestAnimationFrame(step); else c.remove();
  };
  requestAnimationFrame(step);
}

/** הזמן עד המתנה הבאה (חצות לפי השעון המקומי) */
function untilTomorrow() {
  const now = new Date(), next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const ms = Math.max(0, next - now);
  return `${Math.floor(ms / 3600000)}:${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}`;
}

/** איסוף המתנה היומית (מהבועה / מבית המתנות / מכפתור המתנה). אם כבר נאסף היום — כמה זמן עד הבאה */
export function claimDailyGift(app) {
  const { economy, ui, sound } = app;
  const st = economy.dailyStatus();
  if (!st.ready) {
    ui.toast(t('nextGiftIn').replace('{t}', untilTomorrow()).replace('{d}', String(st.nextDay)), { icon: 'gift', duration: 3600 });
    return null;
  }
  const res = economy.claimDaily();
  if (!res) return null;
  sound.jackpot?.();
  confettiBurst();
  app.museum?.popGiftBubble?.();
  ui.toast(t('giftCollected').replace('{n}', String(res.gems)).replace('{d}', String(res.day)), { kind: 'gold', duration: 4200, icon: 'gift' });
  app.achievements.count('gifts');
  if (res.day === 7) app.achievements.unlock('streak7');
  app.refreshBadges();
  return res;
}

/** תאימות לשם הישן */
export const openDailyRewards = claimDailyGift;
