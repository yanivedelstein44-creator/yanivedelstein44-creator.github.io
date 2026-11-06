/**
 * UI — HUD עליון, דוק תחתון, פעולות במשחק, הודעות, תוויות צפות, מערכת מודלים נגישה.
 * כל טקסט דינמי נכנס דרך textContent (שמות מהרשת לעולם לא כ-HTML).
 */
import gsap from 'gsap';
import { t } from './i18n.js';
import { formatGems } from '../config/EconomyConfig.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v; // רק לתוכן סטטי שלנו
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const fmtClock = (ms) => {
  if (ms === null || ms === undefined) return '';
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export class UI {
  constructor(root, handlers) {
    this.root = root;
    this.hd = handlers;
    this.modals = [];
    this.gemsShown = 0;
    this.render();
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modals.length) {
        const top = this.modals[this.modals.length - 1];
        if (top.dismissable !== false) top.close();
      }
    });
  }

  render() {
    const H = this.hd;
    this.root.querySelector('#hud')?.remove();
    this.root.querySelector('#dock')?.remove();
    this.root.querySelector('#actions')?.remove();

    this.gemsVal = h('span', { class: 'gv' }, '0');
    // תפריט נפתח: צלילים, אווירה, סיור בעידנים, פנורמה, הישגים והגדרות — כדי שהסרגל העליון יישאר נקי
    const menuItem = (ic, label, fn, checkable = false) => h('button', { class: 'menu-item', role: checkable ? 'menuitemcheckbox' : 'menuitem', 'aria-checked': checkable ? 'true' : null, onclick: () => { fn(); if (!checkable) this.toggleMenu(false); } },
      h('span', { class: 'ic', 'aria-hidden': 'true' }, ic), h('span', { class: 'lb' }, label), checkable ? h('span', { class: 'sw', 'aria-hidden': 'true' }) : null);
    this.sfxBtn = menuItem('🔊', t('sfx'), () => H.onSfx(), true);
    this.ambBtn = menuItem('🎵', t('ambience'), () => H.onAmb(), true);
    this.eraBtn = menuItem('🧭', t('eraTour'), () => H.onEraTour());
    this.panoBtn = menuItem('🔭', t('panorama'), () => { H.onPanorama(); this.toggleMenu(false); }, true);
    this.panoBtn.setAttribute('aria-checked', 'false');
    this.menu = h('div', { class: 'hud-menu glass', id: 'hud-menu', role: 'menu', 'aria-label': t('settings'), hidden: true },
      this.sfxBtn, this.ambBtn, this.eraBtn, this.panoBtn,
      menuItem('🏆', t('achievements'), () => H.onAchievements?.()),
      menuItem('⚙️', t('settings'), () => H.onSettings()));
    this.muteBtn = h('button', { class: 'menu-btn mute-btn', 'aria-label': t('muteAll'), 'aria-pressed': 'false', onclick: () => H.onMuteAll() }, h('span', { class: 'ic', 'aria-hidden': 'true' }, '🔊'));
    this.menuBtn = h('button', { class: 'menu-btn', 'aria-label': t('settings'), 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': 'hud-menu', onclick: (e) => { e.stopPropagation(); this.toggleMenu(); } },
      h('span', { 'aria-hidden': 'true' }, h('i'), h('i'), h('i')));
    document.addEventListener('pointerdown', (e) => { if (!this.menu.hidden && !this.menu.contains(e.target) && !this.menuBtn.contains(e.target)) this.toggleMenu(false); }, true);
    this.menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); this.toggleMenu(false); this.menuBtn.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...this.menu.querySelectorAll('.menu-item:not([disabled])')];
        const i = items.indexOf(document.activeElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      }
    });
    this.eraBadge = h('span', { class: 'era-badge' }, '');
    this.eraTitleEl = h('div', { class: 'era-title' });
    this.eraFill = h('div', { class: 'fill' });
    this.eraNext = h('div', { class: 'next-dot', 'aria-hidden': 'true' });
    this.progressEl = h('div', { class: 'era-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '20' }, this.eraFill, this.eraNext);
    this.nextLabel = h('div', { class: 'next-label' });
    this.cards = { me: this.card(), opp: this.card() };
    this.statusEl = h('div', { class: 'status-line sr-only', role: 'status' });

    this.hud = h('header', { id: 'hud', class: 'glass' },
      h('div', { class: 'hud-row top' },
        h('div', { class: 'logo small', role: 'img', 'aria-label': `${t('appTitle')} — Chess of Ages` }, h('span', { class: 'he' }, t('appTitle')), h('span', { class: 'en' }, t('logoEn'))),
        h('div', { class: 'hud-icons' },
          h('div', { class: 'gems-pill', role: 'group', 'aria-label': t('gems') }, '💎', this.gemsVal, h('button', { class: 'plus', 'aria-label': t('tabGems'), onclick: () => H.onGemsPlus() }, '+')),
          this.muteBtn, this.menuBtn)),
      this.menu,
      h('div', { class: 'era-row' }, this.eraBadge, h('div', { class: 'era-info' }, this.eraTitleEl, this.progressEl, this.nextLabel)),
      h('div', { class: 'players' }, this.cards.me.el, this.cards.opp.el),
      this.statusEl,
    );

    const dockBtn = (key, ic, label, fn, cls = '') => h('button', { class: `dock-btn ${cls}`, 'data-tab': key, onclick: fn, 'aria-label': label.replace(/[^\p{L}\p{N}\s]/gu, '').trim() || label }, h('span', { class: 'ic', 'aria-hidden': 'true' }, ic), h('span', {}, label.replace(/ ?[👑⚡]/u, '')));
    this.shopBtn = dockBtn('shop', '👑', t('shop'), () => { this.setActiveTab('shop'); H.onShop(); });
    this.shopBadge = h('span', { class: 'badge-dot', hidden: true }, h('span', { 'aria-hidden': 'true' }, '!'), h('span', { class: 'sr-only' }, t('dailyGift')));
    this.shopBtn.appendChild(this.shopBadge);
    this.dock = h('nav', { id: 'dock', class: 'glass', 'aria-label': t('actions') },
      dockBtn('center', '🎯', t('center'), () => { this.setActiveTab('center'); H.onCenter(); }),
      this.shopBtn,
      dockBtn('modes', '♟️', t('modes'), () => { this.setActiveTab('modes'); H.onModes(); }),
      dockBtn('build', '⚡', t('buildNext'), () => H.onBuild(), 'build'));
    this.setActiveTab('center');

    const act = (ic, label, fn) => h('button', { class: 'icon-btn glass', 'aria-label': label, title: label, onclick: fn }, h('span', { 'aria-hidden': 'true' }, ic));
    this.actBtns = {
      share: act('📸', t('share'), () => H.onShare()),
      hint: act('💡', t('hintCost'), () => H.onHint()),
      emote: act('😀', t('emotes'), () => this.toggleEmotes()),
      draw: act('🤝', t('offerDraw'), () => H.onDraw()),
      resign: act('🏳️', t('resign'), () => H.onResign()),
    };
    this.emotePicker = h('div', { class: 'emote-picker glass', hidden: true }, ...['👍', '😮', '😂', '😡', '👑', '🤝'].map((e) => h('button', { 'aria-label': e, onclick: () => { this.emotePicker.hidden = true; H.onEmote(e); } }, e)));
    this.actions = h('div', { id: 'actions' }, ...Object.values(this.actBtns), this.emotePicker);
    this.root.append(this.hud, this.actions, this.dock);
    this.toasts = this.root.querySelector('#toasts');
    this.sr = this.root.querySelector('#sr-status');
  }

  card() {
    const el = h('div', { class: 'pcard' });
    const av = h('div', { class: 'av', 'aria-hidden': 'true' });
    const pet = h('span', { class: 'pet' });
    av.append(h('span', { class: 'em' }), pet);
    const nm = h('div', { class: 'nm' });
    const sub = h('div', { class: 'sub' });
    const cap = h('div', { class: 'cap', 'aria-hidden': 'true' });
    const clock = h('div', { class: 'clock', hidden: true });
    el.append(av, h('div', { class: 'meta' }, nm, sub, cap), clock);
    return { el, av, pet, nm, sub, cap, clock };
  }

  // ---------- עדכונים ----------
  setEra({ eraId, eraName, premium, stageNum, progress, ownedEras, next, lock }) {
    this.eraBadge.textContent = `${t('era')} ${eraId}`;
    this.eraBadge.classList.toggle('premium', !!premium);
    this.eraTitleEl.replaceChildren(document.createTextNode(`${eraName} · `), h('span', { class: 'st' }, `${t('stage')} ${stageNum}/20`));
    let done = 0;
    for (let e = 1; e <= 10; e++) done += Math.min(2, progress[e - 1] || 0);
    const pct = (done / 20) * 100;
    this.eraFill.style.width = `${pct}%`;
    this.progressEl.classList.toggle('premium', !!premium);
    this.eraNext.hidden = !next;
    if (next) this.eraNext.style.insetInlineStart = `calc(${((next.eraId - 1) * 2 + next.idx + 0.5) / 20 * 100}% - 4px)`;
    this.progressEl.setAttribute('aria-valuenow', String(done));
    this.progressEl.setAttribute('aria-label', `${t('stagesBuilt')}: ${done} / 20`);
    this.nextLabel.textContent = next ? `${t('next')}: ${next.name}` : lock === 'complete' ? t('kingdomComplete') : `🔒 ${t('premiumLocked')}`;
  }

  setPlayer(which, p) {
    const c = this.cards[which];
    c.av.querySelector('.em').textContent = p.avatar || '♔';
    c.pet.textContent = p.petIcon || '';
    c.nm.replaceChildren(document.createTextNode(p.name || ''));
    if (p.isBot) c.nm.appendChild(h('span', { class: 'bot-tag', title: t('bot') }, '🤖 BOT'));
    c.sub.textContent = p.active && p.status ? p.status : (p.sub || '');
    c.sub.style.color = p.active && p.status ? (p.check ? '#ff8a96' : 'var(--gold-2)') : '';
    c.cap.replaceChildren(document.createTextNode(p.captured || ''));
    if (p.adv) c.cap.appendChild(h('span', { class: 'adv' }, `+${p.adv}`));
    c.el.classList.toggle('active', !!p.active);
    c.el.classList.toggle('check', !!p.check);
    c.el.setAttribute('aria-label', `${p.name}${p.active ? ` — ${t('yourTurn')}` : ''}`);
  }

  setClock(which, ms, show) {
    const c = this.cards[which].clock;
    c.hidden = !show;
    if (!show) return;
    c.textContent = fmtClock(ms);
    c.classList.toggle('low', ms < 20000);
  }

  setStatus(text, check = false) {
    this.statusEl.textContent = text || '';
    this.statusEl.classList.toggle('check', check);
  }

  setGems(n, animate = true) {
    if (!animate) { this.gemsShown = n; this.gemsVal.textContent = formatGems(n); return; }
    const o = { v: this.gemsShown };
    gsap.to(o, { v: n, duration: 0.9, ease: 'power2.out', onUpdate: () => { this.gemsVal.textContent = formatGems(Math.round(o.v)); } });
    if (n > this.gemsShown) gsap.fromTo(this.gemsVal.parentElement, { scale: 1.18 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    this.gemsShown = n;
  }

  setAudio(sfx, amb) {
    this.sfxBtn.setAttribute('aria-checked', String(sfx));
    this.ambBtn.setAttribute('aria-checked', String(amb));
    this.sfxBtn.querySelector('.ic').textContent = sfx ? '🔊' : '🔇';
    this.ambBtn.querySelector('.ic').textContent = amb ? '🎵' : '🔕';
    const muted = !sfx && !amb;
    this.menuBtn?.classList.toggle('muted', muted);
    if (this.muteBtn) { this.muteBtn.setAttribute('aria-pressed', String(muted)); this.muteBtn.querySelector('.ic').textContent = muted ? '🔇' : '🔊'; }
  }

  setPanorama(on) { this.panoBtn.setAttribute('aria-checked', String(on)); }
  setShopBadge(on) { this.shopBadge.hidden = !on; }
  setEraTourEnabled(on) { this.eraBtn.disabled = !on; }

  /** תפריט ההגדרות הנפתח בסרגל העליון */
  toggleMenu(open = this.menu.hidden) {
    this.menu.hidden = !open;
    this.menuBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      gsap.fromTo(this.menu, { opacity: 0, y: -8, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: 'power2.out' });
      setTimeout(() => this.menu.querySelector('.menu-item:not([disabled])')?.focus(), 30);
    }
  }

  /** הלשונית הפעילה בסרגל התחתון זוהרת: המשחק (מרכז) כברירת מחדל, חנות / מצבי משחק כשהם פתוחים */
  setActiveTab(tab) {
    this.activeTab = tab;
    this.dock?.querySelectorAll('.dock-btn[data-tab]').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  setActions(mode) {
    const show = { share: true, hint: mode === 'ai' || mode === 'local', emote: mode === 'friend' || mode === 'quick', draw: mode === 'friend' || mode === 'quick', resign: mode !== 'local' && mode !== null };
    Object.entries(this.actBtns).forEach(([k, b]) => { b.hidden = !show[k]; });
    this.emotePicker.hidden = true;
  }

  toggleEmotes() { this.emotePicker.hidden = !this.emotePicker.hidden; }

  // ---------- הודעות ----------
  toast(text, { kind = '', duration = 2600 } = {}) {
    const el = h('div', { class: `toast glass ${kind}` }, text);
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => gsap.to(el, { opacity: 0, y: -8, duration: 0.35, onComplete: () => el.remove() }), duration);
    this.announce(text);
  }

  announce(text) {
    this.sr.textContent = '';
    setTimeout(() => { this.sr.textContent = text; }, 30);
  }

  floatLabel(text, pos, kind = '', duration = 1.6) {
    if (!pos) return;
    const el = h('div', { class: `float-label ${kind}` }, text);
    el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`;
    this.root.appendChild(el);
    gsap.fromTo(el, { opacity: 0, y: 10, scale: 0.7 }, { opacity: 1, y: -10, scale: 1, duration: 0.35, ease: 'back.out(2)' });
    gsap.to(el, { opacity: 0, y: -40, duration: 0.5, delay: duration, onComplete: () => el.remove() });
  }

  eraTitle(kicker, title, sub = '') {
    const el = h('div', { class: 'era-title-card', role: 'status' }, h('div', { class: 'inner glass' }, h('div', { class: 'kicker' }, kicker), h('div', { class: 'title' }, title), sub ? h('div', { class: 'sub' }, sub) : null));
    document.body.appendChild(el);
    gsap.fromTo(el.firstChild, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.8)' });
    gsap.to(el, { opacity: 0, duration: 0.6, delay: 2.4, onComplete: () => el.remove() });
    this.announce(`${kicker} ${title}`);
  }

  // ---------- מודלים ----------
  /** @returns {{el:HTMLElement, close:Function}} */
  modal({ title, label, body, actions = [], center = false, full = false, dismissable = true, onClose, className = '', closeButton = true } = {}) {
    const prevFocus = document.activeElement;
    const titleId = `m${Math.random().toString(36).slice(2, 8)}`;
    const dlg = h('div', { class: `modal glass ${full ? 'full' : ''} ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': title ? titleId : null, 'aria-label': !title && label ? label : null });
    const head = h('div', { class: 'modal-head' });
    if (title) head.appendChild(typeof title === 'string' ? h('h2', { id: titleId }, title) : (title.id = titleId, title));
    if (dismissable && closeButton) head.appendChild(h('button', { class: 'modal-close', 'aria-label': t('close'), onclick: () => ctl.close() }, '✕'));
    dlg.appendChild(head);
    if (body) dlg.appendChild(typeof body === 'string' ? h('p', {}, body) : body);
    if (actions.length) {
      const row = h('div', { class: 'btn-row' });
      actions.forEach((a) => row.appendChild(h('button', { class: `btn ${a.primary ? 'primary' : ''} ${a.danger ? 'danger' : ''} ${a.cls || ''}`, onclick: () => a.onClick?.(ctl), disabled: a.disabled }, a.label)));
      dlg.appendChild(row);
    }
    const back = h('div', { class: `modal-back ${center ? 'center' : ''}` }, dlg);
    back.addEventListener('pointerdown', (e) => { if (e.target === back && dismissable) ctl.close(); });
    // מלכודת פוקוס
    dlg.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = [...dlg.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    this.root.querySelector('#modal-root').appendChild(back);
    const ctl = {
      el: dlg, back, dismissable,
      close: () => {
        if (ctl.closed) return;
        ctl.closed = true;
        this.modals = this.modals.filter((m) => m !== ctl);
        if (!this.modals.length && this.activeTab !== 'center') this.setActiveTab('center');
        gsap.to(back, { opacity: 0, duration: 0.18, onComplete: () => back.remove() });
        onClose?.();
        if (prevFocus && prevFocus.focus) setTimeout(() => prevFocus.focus(), 50);
      },
    };
    this.modals.push(ctl);
    setTimeout(() => (dlg.querySelector('[autofocus]') || dlg.querySelector('.btn.primary') || dlg.querySelector('button'))?.focus(), 60);
    return ctl;
  }

  confirm(text, okLabel = t('ok'), { danger = false } = {}) {
    return new Promise((resolve) => {
      let done = false;
      const m = this.modal({
        body: text, center: true,
        actions: [
          { label: t('cancel'), onClick: (c) => { done = true; c.close(); resolve(false); } },
          { label: okLabel, primary: !danger, danger, onClick: (c) => { done = true; c.close(); resolve(true); } },
        ],
        onClose: () => { if (!done) resolve(false); },
      });
      return m;
    });
  }

  closeAll() { [...this.modals].forEach((m) => m.close()); }
  get modalOpen() { return this.modals.length > 0; }
}
