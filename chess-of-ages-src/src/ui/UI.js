/**
 * UI — HUD עליון, דוק תחתון, פעולות במשחק, הודעות, תוויות צפות, מערכת מודלים נגישה.
 * כל טקסט דינמי נכנס דרך textContent (שמות לעולם לא כ-HTML). אייקונים: SVG וקטוריים (icons.js) — בלי אימוג'ים.
 */
import gsap from 'gsap';
import { t } from './i18n.js';
import { formatGems } from '../config/EconomyConfig.js';
import { compactLogoSVG } from './logo.js';
import { icon, emblemIcon, decorate, stripEmoji } from './icons.js';
import { langButton } from './LangButton.js';

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

/** אייקון + טקסט (לכפתורים, כותרות ותוויות) */
export const withIcon = (name, text, size = 18) => [icon(name, { size }), text ? h('span', { class: 'lbl' }, text) : null];

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
    // תפריט נפתח: צלילים, אווירה, איים, פנורמה, הישגים והגדרות — כדי שהסרגל העליון יישאר נקי
    const menuItem = (ic, label, fn, checkable = false) => h('button', { class: 'menu-item', role: checkable ? 'menuitemcheckbox' : 'menuitem', 'aria-checked': checkable ? 'true' : null, onclick: () => { fn(); if (!checkable) this.toggleMenu(false); } },
      h('span', { class: 'ic', 'aria-hidden': 'true' }, icon(ic, { size: 22 })), h('span', { class: 'lb' }, label), checkable ? h('span', { class: 'sw', 'aria-hidden': 'true' }) : null);
    this.sfxBtn = menuItem('sound', t('sfx'), () => H.onSfx(), true);
    this.ambBtn = menuItem('music', t('ambience'), () => H.onAmb(), true);
    this.panoBtn = menuItem('panorama', t('panorama'), () => { H.onPanorama(); this.toggleMenu(false); }, true);
    this.panoBtn.setAttribute('aria-checked', 'false');
    this.menu = h('div', { class: 'hud-menu glass', id: 'hud-menu', role: 'menu', 'aria-label': t('settings'), hidden: true },
      this.sfxBtn, this.ambBtn, this.panoBtn,
      menuItem('trophy', t('achievements'), () => H.onAchievements?.()),
      menuItem('play', t('a11yCinema'), () => H.onCinema?.()),
      menuItem('cap', t('tutorial'), () => H.onTutorial?.()),
      menuItem('gear', t('settings'), () => H.onSettings()));
    this.muteIc = h('span', { class: 'ic', 'aria-hidden': 'true' }, icon('sound', { size: 22 }));
    this.muteBtn = h('button', { class: 'menu-btn mute-btn tap', 'aria-label': t('muteAll'), 'aria-pressed': 'false', onclick: () => H.onMuteAll() }, this.muteIc);
    this.menuBtn = h('button', { class: 'menu-btn tap', 'aria-label': t('settings'), 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': 'hud-menu', onclick: (e) => { e.stopPropagation(); this.toggleMenu(); } },
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
      h('h1', { class: 'sr-only' }, t('a11yGame')),
      h('div', { class: 'hud-row top' },
        (() => { const el = h('div', { class: 'logo-wrap' }); el.innerHTML = compactLogoSVG({ height: 34, title: t('appSubtitle') }); return el; })(),
        h('div', { class: 'hud-icons' },
          h('div', { class: 'gems-pill', role: 'group', 'aria-label': t('gems') }, icon('gem', { size: 20 }), this.gemsVal),
          this.langBtn = langButton((where) => H.onLanguage?.(where), 'hud'),
          this.muteBtn, this.menuBtn)),
      this.menu,
      h('div', { class: 'era-row' }, this.eraBadge, h('div', { class: 'era-info' }, this.eraTitleEl, this.progressEl, this.nextLabel)),
      h('div', { class: 'players' }, this.cards.me.el, this.cards.opp.el),
      this.statusEl,
    );

    this.dock = h('nav', { id: 'dock', class: 'glass', 'aria-label': t('actions') });
    this.shopBadge = h('span', { class: 'badge-dot', hidden: true }, h('span', { 'aria-hidden': 'true' }, '!'), h('span', { class: 'sr-only' }, t('dailyGift')));
    this.setDock(this.dockHub ?? true);

    const act = (ic, label, fn) => h('button', { class: 'icon-btn round tap', 'aria-label': label, title: label, onclick: fn }, icon(ic, { size: 24 }));
    this.actBtns = {
      center: act('target', t('center'), () => H.onCenter()),
      share: act('camera', t('share'), () => H.onShare()),
      hint: act('bulb', t('hintCost'), () => H.onHint()),
      draw: act('handshake', t('offerDraw'), () => H.onDraw()),
      resign: act('flag', t('resign'), () => H.onResign()),
      emote: act('smile', t('emotes'), () => H.onEmote?.()),
      leave: act('close', t('leaveRoom'), () => H.onLeave?.()),
    };
    this.actions = h('div', { id: 'actions' }, ...Object.values(this.actBtns));
    // בוסט יהלומים כפולים: שעון קטן מתחת לסרגל העליון (מופיע רק כשהבוסט פעיל)
    this.boostPill = h('div', { class: 'boost-pill', role: 'status', hidden: true }, icon('gem', { size: 16 }), h('b', {}, 'x2'), this.boostLeftEl = h('span', {}));
    this.root.append(this.hud, this.actions, this.dock, this.boostPill);
    this.toasts = this.root.querySelector('#toasts');
    // [a11y] the visual toasts sit in a labelled region (axe "region"); their text is announced through #sr-status
    this.toasts.setAttribute('role', 'region');
    this.toasts.setAttribute('aria-label', t('a11yToasts'));
    this.sr = this.root.querySelector('#sr-status');
    // [a11y] polite live region for moves and selections (the assertive #sr-status stays for cursor feedback and toasts)
    this.srPolite = this.root.querySelector('#sr-polite') || this.root.appendChild(h('div', { id: 'sr-polite', class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' }));
  }

  /** [a11y] Polite screen-reader announcement (moves, selections): waits for the reader to finish what it is saying */
  say(text) {
    if (!this.srPolite || !text) return;
    this.srPolite.textContent = '';
    setTimeout(() => { this.srPolite.textContent = text; }, 40);
  }

  card() {
    const el = h('div', { class: 'pcard', role: 'group' });
    const av = h('div', { class: 'av', 'aria-hidden': 'true' });
    const em = h('span', { class: 'em' });
    const pet = h('span', { class: 'pet' });
    av.append(em, pet);
    const nm = h('div', { class: 'nm' });
    const sub = h('div', { class: 'sub' });
    const cap = h('div', { class: 'cap', 'aria-hidden': 'true' });
    const clock = h('div', { class: 'clock', hidden: true });
    el.append(av, h('div', { class: 'meta' }, nm, sub, cap), clock);
    return { el, av, em, pet, nm, sub, cap, clock };
  }

  /**
   * הסרגל התחתון לפי המקום: באי המרכזי (הבית) — מפה · חנות · פרימיום · חבר · קרב; בשאר האיים — מפה · הביתה · קרב
   */
  setDock(hub) {
    const H = this.hd;
    this.dockHub = hub;
    const dockBtn = (key, ic, label, fn, cls = '') => h('button', { class: `dock-btn tap ${cls}`, 'data-tab': key, onclick: fn, 'aria-label': label }, h('span', { class: 'ic', 'aria-hidden': 'true' }, icon(ic, { size: 26 })), h('span', { class: 'dl' }, label));
    const btns = [dockBtn('map', 'compass', t('map'), () => { this.setActiveTab('map'); H.onMap(); })];
    if (hub) {
      const shop = dockBtn('shop', 'chest', t('shop'), () => { this.setActiveTab('shop'); H.onShop(); });
      shop.appendChild(this.shopBadge);
      const prem = dockBtn('premium', 'crown', t('tabPremium'), () => { this.setActiveTab('premium'); H.onPremium(); }, 'prem');
      btns.push(shop, prem, dockBtn('friend', 'users', t('friend'), () => { this.setActiveTab('friend'); H.onFriend(); }));
    } else btns.push(dockBtn('home', 'home', t('home'), () => H.onHome()));
    btns.push(dockBtn('battle', 'swords', t('battle'), () => H.onBattle(), 'build'));
    this.dock.replaceChildren(...btns);
    this.dock.style.gridTemplateColumns = `repeat(${btns.length}, 1fr)`;
    this.setActiveTab(this.activeTab || null);
  }

  // ---------- עדכונים ----------
  /** שורת האי ב-HUD: מספר האי, שמו, פס כיבוש 99 האיים (10 אזורים) והיעד הבא */
  setIsland({ id, name, regionName, boss, region, conquered, total, frontier, next, lock }) {
    this.eraBadge.replaceChildren(...[boss ? icon('crown', { size: 13 }) : null, document.createTextNode(`${t('island')} ${id}`)].filter(Boolean));
    this.eraBadge.classList.toggle('premium', region >= 11);
    this.eraTitleEl.replaceChildren(document.createTextNode(`${name} · `), h('span', { class: 'st' }, regionName));
    this.eraFill.style.width = `${(conquered / total) * 100}%`;
    this.progressEl.classList.toggle('premium', region >= 11);
    this.eraNext.hidden = !frontier;
    if (frontier) this.eraNext.style.insetInlineStart = `calc(${((frontier - 0.5) / total) * 100}% - 4px)`;
    this.progressEl.setAttribute('aria-valuemax', String(total));
    this.progressEl.setAttribute('aria-valuenow', String(conquered));
    this.progressEl.setAttribute('aria-label', `${t('conquered')}: ${conquered} / ${total}`);
    if (lock === 'fullGame') this.nextLabel.replaceChildren(...withIcon('lock', t('unlockFullShort'), 12));
    else if (lock === 'complete') this.nextLabel.textContent = t('allConquered');
    else this.nextLabel.textContent = next || '';
  }

  setPlayer(which, p) {
    const c = this.cards[which];
    c.em.replaceChildren(icon(emblemIcon(p.avatar || 'crown'), { size: 22 }));
    if (p.petImg) {
      if (c.pet.dataset.src !== p.petImg) { c.pet.replaceChildren(h('img', { src: p.petImg, alt: '' })); c.pet.dataset.src = p.petImg; }
    } else if (c.pet.dataset.src !== 'paw') { c.pet.replaceChildren(icon('paw', { size: 12 })); c.pet.dataset.src = 'paw'; }
    c.nm.replaceChildren(document.createTextNode(p.name || ''));
    if (p.isBot) c.nm.appendChild(h('span', { class: 'bot-tag', title: t('bot') }, icon('robot', { size: 11 }), ' BOT'));
    c.sub.textContent = p.active && p.status ? p.status : (p.sub || '');
    c.sub.style.color = p.active && p.status ? (p.check ? '#ff8a96' : 'var(--gold-2)') : '';
    if (typeof p.capCount === 'number') {
      c.cap.replaceChildren();
      if (p.capCount > 0) c.cap.append(icon(p.capColor === 'w' ? 'dotLight' : 'dotDark', { size: 12 }), h('span', { class: 'cnum' }, `×${p.capCount}`));
    } else c.cap.replaceChildren(document.createTextNode(p.captured || ''));
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

  /** בוסט יהלומים כפולים: שעון ספירה לאחור ליד היהלומים (מוסתר כשאין בוסט) */
  setBoost(ms) {
    if (!this.boostPill) return;
    const on = ms > 0;
    this.boostPill.hidden = !on;
    if (!on) return;
    const hTot = Math.floor(ms / 3600000), d = Math.floor(hTot / 24), hh = hTot % 24, mm = Math.floor((ms % 3600000) / 60000);
    this.boostLeftEl.textContent = d > 0 ? `${d}${t('daysShort')} ${hh}${t('hShort')}` : `${hh}:${String(mm).padStart(2, '0')}`;
    this.boostPill.style.top = `${(this.hud?.offsetHeight || 150) + 8}px`;
    this.boostPill.setAttribute('aria-label', `${t('boostActive')} · ${t('boostLeft').replace('{t}', this.boostLeftEl.textContent)}`);
  }

  setAudio(sfx, amb) {
    this.sfxBtn.setAttribute('aria-checked', String(sfx));
    this.ambBtn.setAttribute('aria-checked', String(amb));
    this.sfxBtn.querySelector('.ic').replaceChildren(icon(sfx ? 'sound' : 'mute', { size: 22 }));
    this.ambBtn.querySelector('.ic').replaceChildren(icon('music', { size: 22, cls: amb ? '' : 'off' }));
    const muted = !sfx && !amb;
    this.menuBtn?.classList.toggle('muted', muted);
    if (this.muteBtn) { this.muteBtn.setAttribute('aria-pressed', String(muted)); this.muteIc.replaceChildren(icon(muted ? 'mute' : 'sound', { size: 22 })); }
  }

  setPanorama(on) { this.panoBtn.setAttribute('aria-checked', String(on)); }
  setShopBadge(on) { this.shopBadge.hidden = !on; }

  /** תפריט ההגדרות הנפתח בסרגל העליון */
  toggleMenu(open = this.menu.hidden) {
    this.menu.hidden = !open;
    this.menuBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      gsap.fromTo(this.menu, { opacity: 0, y: -8, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: 'power2.out' });
      setTimeout(() => this.menu.querySelector('.menu-item:not([disabled])')?.focus(), 30);
    }
  }

  /** הלשונית הפעילה בסרגל התחתון זוהרת בזמן שהמסך שלה פתוח (מפה / חנות / חבר) */
  setActiveTab(tab) {
    this.activeTab = tab;
    this.dock?.querySelectorAll('.dock-btn[data-tab]').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  /** mode: 'ai' | 'local' | null */
  setActions(mode) {
    const net = mode === 'online' || mode === 'watch';
    const show = { center: true, share: !net, hint: mode === 'ai' || mode === 'local', draw: mode === 'local' || mode === 'online', resign: mode === 'ai' || mode === 'online', emote: net, leave: net };
    Object.entries(this.actBtns).forEach(([k, b]) => { b.hidden = !show[k]; });
    this.actions.hidden = !Object.values(show).some(Boolean);
  }

  // ---------- הודעות ----------
  toast(text, { kind = '', duration = 2600, icon: ic = null } = {}) {
    const el = h('div', { class: `toast glass ${kind}` }, ic ? icon(ic, { size: 20 }) : null, h('span', {}, decorate(text, { size: 16 })));
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => gsap.to(el, { opacity: 0, y: -8, duration: 0.35, onComplete: () => el.remove() }), duration);
    this.announce(stripEmoji(text), { queue: true });
  }

  announce(text, { queue = false } = {}) {
    // [a11y] הודעות קופצות שמגיעות ברצף (למשל "נרכש!" ומיד "הדרקון הצטרף") מוקראות יחד, כדי שקורא מסך לא יפספס את הראשונה.
    // משוב סמן ומהלכים (queue=false) מחליף תמיד את ההודעה הקודמת.
    const now = Date.now();
    this.srQueue = queue && this.srQueued && now - this.srAt < 1200 ? `${this.srQueue} ${text}` : text;
    this.srQueued = queue;
    this.srAt = now;
    this.sr.textContent = '';
    clearTimeout(this.srTimer);
    this.srTimer = setTimeout(() => { this.sr.textContent = this.srQueue; }, 30);
  }

  floatLabel(text, pos, kind = '', duration = 1.6, ic = null) {
    if (!pos) return;
    const el = h('div', { class: `float-label ${kind}` }, ic ? icon(ic, { size: kind === 'emote' ? 40 : 18 }) : null, text ? h('span', {}, text) : null);
    el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`;
    this.root.appendChild(el);
    gsap.fromTo(el, { opacity: 0, y: 10, scale: 0.7 }, { opacity: 1, y: -10, scale: 1, duration: 0.35, ease: 'back.out(2)' });
    gsap.to(el, { opacity: 0, y: -40, duration: 0.5, delay: duration, onComplete: () => el.remove() });
  }

  /** בועת דיבור מעל דמות (הבוט). pos = מיקום מסך */
  speech(text, pos, name = '') {
    if (!pos) return;
    this.bubble?.remove();
    const el = h('div', { class: 'speech', role: 'status' }, name ? h('b', {}, name) : null, h('span', {}, text));
    el.style.left = `${Math.max(90, Math.min(window.innerWidth - 90, pos.x))}px`;
    el.style.top = `${Math.max(140, pos.y)}px`;
    this.root.appendChild(el);
    this.bubble = el;
    gsap.fromTo(el, { opacity: 0, y: 8, scale: 0.85 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(2)' });
    gsap.to(el, { opacity: 0, y: -10, duration: 0.4, delay: 2.8, onComplete: () => { el.remove(); if (this.bubble === el) this.bubble = null; } });
  }

  eraTitle(kicker, title, sub = '', { top = false } = {}) {
    const el = h('div', { class: `era-title-card${top ? ' top' : ''}`, role: 'status' }, h('div', { class: 'inner glass' }, h('div', { class: 'kicker' }, kicker), h('div', { class: 'title' }, title), sub ? h('div', { class: 'sub' }, sub) : null));
    document.body.appendChild(el);
    gsap.fromTo(el.firstChild, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.8)' });
    gsap.to(el, { opacity: 0, duration: 0.6, delay: 2.4, onComplete: () => el.remove() });
    this.announce(`${kicker} ${title}`);
  }

  // ---------- מודלים ----------
  /**
   * title: מחרוזת או אלמנט; titleIcon: אייקון לצד הכותרת; actions: [{label, icon, primary, danger, cls, onClick}]
   * @returns {{el:HTMLElement, close:Function}}
   */
  modal({ title, titleIcon, label, body, actions = [], center = false, full = false, dismissable = true, onClose, className = '', closeButton = true } = {}) {
    const prevFocus = document.activeElement;
    const titleId = `m${Math.random().toString(36).slice(2, 8)}`;
    // [a11y] a dialog without a title (confirm boxes) is named by its text; a titled one is described by it
    // a custom title element (the shop header with gems and buttons) plus a label → the short label names the dialog
    const bodyId = typeof body === 'string' ? `${titleId}b` : null;
    const elTitle = !!title && typeof title !== 'string';
    const dlg = h('div', { class: `modal glass ${full ? 'full' : ''} ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': title && !(elTitle && label) ? titleId : (!title && !label && bodyId ? bodyId : null), 'aria-label': label && (!title || elTitle) ? label : null, 'aria-describedby': title && bodyId ? bodyId : null });
    const head = h('div', { class: `modal-head ${title ? 'has-title' : ''}` });
    if (title) head.appendChild(typeof title === 'string' ? h('h2', { id: titleId }, titleIcon ? icon(titleIcon, { size: 24 }) : null, h('span', {}, title)) : (title.id = titleId, title));
    if (dismissable && closeButton) head.appendChild(h('button', { class: 'modal-close tap', 'aria-label': t('close'), onclick: () => ctl.close() }, icon('close', { size: 16 })));
    dlg.appendChild(head);
    if (body) dlg.appendChild(typeof body === 'string' ? h('p', { id: bodyId }, body) : body);
    if (actions.length) {
      const row = h('div', { class: 'btn-row' });
      actions.forEach((a) => row.appendChild(h('button', { class: `btn tap ${a.primary ? 'primary' : ''} ${a.danger ? 'danger' : ''} ${a.cls || ''}`, onclick: () => a.onClick?.(ctl), disabled: a.disabled }, a.icon ? icon(a.icon, { size: 20 }) : null, h('span', {}, a.label))));
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
        if (!this.modals.length && this.activeTab && this.activeTab !== 'map') this.setActiveTab(null);
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
