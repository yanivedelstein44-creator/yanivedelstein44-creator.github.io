/**
 * תיבת האוצר היומית (רצף 7 ימים) + גלגל המזל המלכותי (סיבוב GSAP חלק, קונפטי, סיכויים שקופים).
 */
import gsap from 'gsap';
import { h, withIcon } from './UI.js';
import { icon, drawIcon } from './icons.js';
import { t, tn, ITEM_EN, PET_EN } from './i18n.js';
import { DAILY_STREAK, WHEEL_SEGMENTS, ROYAL_CHEST, ECONOMY } from '../config/EconomyConfig.js';

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

function drawWheel(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = canvas.clientWidth || 280;
  canvas.width = size * dpr; canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const R = size / 2, n = WHEEL_SEGMENTS.length, a = (Math.PI * 2) / n;
  ctx.translate(R, R);
  WHEEL_SEGMENTS.forEach((s, i) => {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R - 6, i * a - Math.PI / 2, (i + 1) * a - Math.PI / 2); ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
    g.addColorStop(0, s.color); g.addColorStop(1, s.jackpot ? '#f2c94c' : '#120c22');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(242,201,76,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.rotate(i * a + a / 2 - Math.PI / 2);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(size * 0.05)}px Rubik, sans-serif`; ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 3;
    const label = tn(s.label, s.labelEn);
    ctx.fillText(label, R - 16, 0);
    const tw = ctx.measureText(label).width;
    ctx.shadowBlur = 0;
    drawIcon(ctx, s.icon, R - 16 - tw - size * 0.045, 0, size * 0.07);
    ctx.restore();
  });
  ctx.beginPath(); ctx.arc(0, 0, R - 4, 0, Math.PI * 2); ctx.lineWidth = 6; ctx.strokeStyle = '#f2c94c'; ctx.stroke();
  for (let i = 0; i < n * 2; i++) { const aa = (i / (n * 2)) * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(aa) * (R - 4), Math.sin(aa) * (R - 4), 3, 0, Math.PI * 2); ctx.fillStyle = i % 2 ? '#fff6c8' : '#b8862a'; ctx.fill(); }
}

const rewardText = (r) => {
  if (r.type === 'gems') return `‎+${r.amount} ${t('gems')}`;
  if (r.type === 'trial') return `${tn(r.name, ITEM_EN[r.id])} (${t('trial24')})`;
  if (r.type === 'item') return tn(r.name, ITEM_EN[r.id]);
  if (r.type === 'petTrial') return `${tn(r.name, PET_EN[r.id])} (${t('trial24')})`;
  return '';
};

export function openDailyRewards(app) {
  const { economy, ui, sound } = app;
  const st = economy.dailyStatus();
  const streakEl = h('div', { class: 'streak' });
  const claimBtn = h('button', { class: 'btn primary shimmer tap' }, t('claim'));
  const msg = h('p', {});
  function renderStreak() {
    const s = economy.dailyStatus();
    const todayDay = s.ready ? s.day : s.day;
    streakEl.replaceChildren(...DAILY_STREAK.map((d) => {
      const done = s.ready ? d.day < s.day : d.day <= s.day;
      const today = s.ready && d.day === s.day;
      return h('div', { class: `d ${done ? 'done' : ''} ${today ? 'today' : ''} ${d.chest ? 'chest' : ''}`, 'aria-label': `${t('day')} ${d.day}` },
        h('span', {}, `${t('day')} ${d.day}`), h('span', { class: 'r' }, icon(d.chest ? 'chest' : d.trial ? 'gift' : 'gem', { size: 22 })), h('span', { class: 'amt' }, d.chest ? tn('תיבה', 'Chest') : `${d.gems}`));
    }));
    claimBtn.disabled = !s.ready;
    claimBtn.replaceChildren(...withIcon(s.ready ? 'gift' : 'check', s.ready ? `${t('claim')} — ${t('day')} ${todayDay}` : t('claimed'), 20));
    msg.textContent = s.ready ? (s.broken ? t('streakBroken') : '') : t('comeBack');
  }
  claimBtn.addEventListener('click', () => {
    const res = economy.claimDaily();
    if (!res) return;
    sound.jackpot();
    confettiBurst();
    ui.toast(res.rewards.map(rewardText).join(' · '), { kind: 'gold', duration: 4000, icon: 'gift' });
    if (res.day === 7) app.achievements.unlock('streak7');
    renderStreak();
    app.refreshBadges();
  });

  // גלגל
  const wheelCanvas = h('canvas', { 'aria-label': t('wheelTitle') });
  const wheelInner = h('div', { style: { position: 'absolute', inset: 0 } }, wheelCanvas);
  const wheel = h('div', { class: 'wheel-wrap' }, h('div', { class: 'wheel-pointer' }), wheelInner, h('div', { class: 'wheel-hub' }, icon('crown', { size: 30 })));
  const spinBtn = h('button', { class: 'btn primary tap' });
  const spinInfo = h('p', {});
  let rot = 0, spinning = false;
  function renderSpin() {
    const free = economy.canFreeSpin();
    spinBtn.replaceChildren(...(free ? withIcon('wheel', t('spinFree'), 20) : [icon('wheel', { size: 20 }), h('span', {}, t('spinFor')), icon('gem', { size: 16 })]));
    spinBtn.disabled = spinning;
    const ms = economy.freeSpinReadyIn();
    spinInfo.textContent = free ? '' : `${t('nextFreeSpin')} ${Math.floor(ms / 3600000)}:${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}`;
  }
  spinBtn.addEventListener('click', () => {
    if (spinning) return;
    const res = economy.spinWheel();
    if (!res) { ui.toast(t('notEnoughGems'), { kind: 'bad' }); return; }
    spinning = true; renderSpin();
    app.achievements.count('spins');
    const n = WHEEL_SEGMENTS.length, seg = 360 / n;
    const target = 360 - (res.index * seg + seg / 2) + (Math.random() - 0.5) * seg * 0.6;
    const base = Math.ceil(rot / 360) * 360 + 360 * 5;
    const to = base + target;
    let lastTick = rot;
    gsap.to({ v: rot }, {
      v: to, duration: 4.6, ease: 'power4.out',
      onUpdate() { const v = this.targets()[0].v; wheelInner.style.transform = `rotate(${v}deg)`; if (Math.floor(v / seg) !== Math.floor(lastTick / seg)) sound.tick(); lastTick = v; },
      onComplete: () => {
        rot = to;
        spinning = false;
        const prize = economy.applyWheelPrize(res.segment);
        if (prize.jackpot) { sound.jackpot(); confettiBurst(3200); } else sound.coin();
        ui.toast(prize.text, { kind: prize.jackpot ? 'gold' : 'good', duration: 3500, icon: prize.icon });
        if (prize.itemId) app.applyLoadout();
        renderSpin();
        app.refreshBadges();
      },
    });
  });

  const oddsBody = h('table', { class: 'odds-table', hidden: true }, h('tbody', {}, ...WHEEL_SEGMENTS.map((s) => h('tr', {}, h('td', {}, icon(s.icon, { size: 16 }), ` ${s.type === 'gems' ? `${s.label} ${t('gems')}` : tn(s.label, s.labelEn)}`), h('td', {}, `${s.weight}%`)))));
  const chestOdds = h('table', { class: 'odds-table', hidden: true }, h('tbody', {}, ...ROYAL_CHEST.map((c) => h('tr', {}, h('td', {}, `${t('royalChest')}: ${tn(c.label, c.labelEn)}`), h('td', {}, `${c.weight}%`)))));
  const oddsBtn = h('button', { class: 'btn small ghost tap', onclick: () => { oddsBody.hidden = !oddsBody.hidden; chestOdds.hidden = oddsBody.hidden; } }, ...withIcon('info', t('odds'), 16));

  const body = h('div', {},
    h('h3', {}, ...withIcon('calendar', tn('רצף התחברות יומי', 'Daily login streak'), 18)), streakEl, h('div', { class: 'btn-row' }, claimBtn), msg,
    h('h3', {}, ...withIcon('wheel', t('wheelTitle'), 18)), wheel, h('div', { class: 'btn-row' }, spinBtn, oddsBtn), spinInfo, oddsBody, chestOdds,
    h('p', { style: { fontSize: '11px' } }, tn(`סיבוב נוסף עולה ${ECONOMY.extraSpinCost} יהלומים. הסיכויים מוצגים לפני כל סיבוב.`, `Extra spins cost ${ECONOMY.extraSpinCost} gems. Odds are shown before every spin.`)));
  const m = ui.modal({ title: t('dailyTitle'), titleIcon: 'gift', body });
  requestAnimationFrame(() => drawWheel(wheelCanvas));
  renderStreak();
  renderSpin();
  if (st.ready) gsap.fromTo(claimBtn, { scale: 0.9 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)', repeat: 2, repeatDelay: 0.8 });
  return m;
}
