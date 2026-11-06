/**
 * מודלים: מצבי משחק, הכתרה, סיכום משחק, סיור בעידנים, הגדרות ופרטיות, חדרים, חיפוש, הודעת בוט.
 */
import { h } from './UI.js';
import { t, tn, getLang, DIFF_PERSONA } from './i18n.js';
import { ERAS } from '../config/Eras.js';
import { TIME_CONTROLS, APP_VERSION, APP } from '../config/AppConfig.js';
import { ACHIEVEMENTS } from '../core/Achievements.js';
import { inviteLink, inviteText, shareWhatsApp } from '../network/MultiplayerManager.js';
import { GLYPH } from '../game/GameController.js';

const logo = (size = 'mid') => h('div', { class: `logo ${size}` }, h('span', { class: 'he' }, t('appTitle')), h('span', { class: 'en' }, t('logoEn')));

export function openModes(app) {
  const { ui, store } = app;
  let diff = store.get('difficulty') || 'easy';
  let tc = store.get('timeControl') ?? 10;
  const body = h('div', {});
  body.appendChild(logo('mid'));
  body.appendChild(h('div', { style: { height: '8px' } }));
  body.appendChild(h('button', { class: 'banner-gift shimmer', onclick: () => app.openDaily() }, h('span', {}, t('dailyGift')), h('span', {}, app.economy.hasDailyBadge() ? '✨ !' : '›')));
  const prof = store.get('profile');
  const nameIn = h('input', { id: 'pname', value: prof.name, maxlength: 18, autocomplete: 'nickname', onchange: (e) => store.set({ profile: { ...store.get('profile'), name: e.target.value.trim().slice(0, 18) || prof.name } }) });
  const emblems = ['♔', '🦁', '🦅', '🐉', '🛡️', '⚔️', '🌟', '🔥'];
  const emRow = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': t('avatar') }, ...emblems.map((e) => h('button', { role: 'radio', 'aria-checked': String(prof.avatar === e), 'aria-label': e, style: { minWidth: '40px', minHeight: '40px', fontSize: '20px' }, onclick: (ev) => { store.set({ profile: { ...store.get('profile'), avatar: e } }); emRow.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', 'false')); ev.currentTarget.setAttribute('aria-checked', 'true'); app.refreshHud(); } }, e)));
  body.appendChild(h('div', { class: 'field' }, h('label', { for: 'pname' }, t('name')), nameIn));
  body.appendChild(emRow);
  body.appendChild(h('div', { style: { height: '10px' } }));

  const card = (id, ic, title, desc, buildBody) => {
    const bodyEl = h('div', { class: 'mode-body', hidden: true });
    const btn = h('button', { class: 'mode-card', 'aria-expanded': 'false', onclick: () => {
      const open = bodyEl.hidden;
      body.querySelectorAll('.mode-body').forEach((b) => { b.hidden = true; });
      body.querySelectorAll('.mode-card').forEach((b) => { b.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); });
      bodyEl.hidden = !open;
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open && !bodyEl.childNodes.length) buildBody(bodyEl);
    } }, h('span', { class: 'ic', 'aria-hidden': 'true' }, ic), h('div', {}, h('b', {}, title), h('span', {}, desc)));
    body.append(btn, bodyEl);
  };

  const tcSeg = () => {
    const seg = h('div', { class: 'seg' }, h('button', { 'aria-pressed': String(!tc), onclick: (e) => pick(e, 0) }, h('b', {}, t('noClock'))), ...TIME_CONTROLS.map((x) => h('button', { 'aria-pressed': String(tc === x.id), onclick: (e) => pick(e, x.id) }, h('b', {}, tn(x.label, x.labelEn)))));
    function pick(e, v) { tc = v; store.set({ timeControl: v }); seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); }
    return h('div', {}, h('h3', {}, t('timeControl')), seg);
  };

  card('ai', '🏰', t('mode_ai'), t('mode_ai_d'), (el) => {
    const seg = h('div', { class: 'seg' }, ...['easy', 'medium', 'hard'].map((d) => h('button', { 'aria-pressed': String(diff === d), onclick: (e) => { diff = d; store.set({ difficulty: d }); seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); app.refreshHud(); } }, h('b', {}, `${DIFF_PERSONA[d].icon} ${t(d)}`), h('small', {}, tn(DIFF_PERSONA[d].he, DIFF_PERSONA[d].en)))));
    el.append(h('h3', {}, t('difficulty')), seg, h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: async () => { if (await app.confirmLeave()) { m.close(); app.startAI(diff); } } }, t('start'))));
  });
  card('friend', '🤝', t('mode_friend'), t('mode_friend_d'), (el) => {
    const code = h('input', { class: 'code-input', inputmode: 'numeric', pattern: '[0-9]*', maxlength: 4, placeholder: '••••', 'aria-label': t('enterCode'), id: 'roomcode' });
    el.append(tcSeg(),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: async () => { if (await app.confirmLeave()) { m.close(); app.hostRoom(tc); } } }, `➕ ${t('createRoom')}`)),
      h('h3', {}, t('joinRoom')), h('div', { class: 'field' }, h('label', { for: 'roomcode' }, t('enterCode')), code),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: async () => { const v = code.value.replace(/\D/g, ''); if (v.length !== 4) { ui.toast(t('enterCode'), { kind: 'bad' }); return; } if (await app.confirmLeave()) { m.close(); app.joinRoom(v); } } }, t('join'))));
  });
  card('quick', '⚡', t('mode_quick'), t('mode_quick_d'), (el) => {
    el.append(tcSeg(), h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: async () => { if (await app.confirmLeave()) { m.close(); app.quickMatch(tc); } } }, `🔎 ${t('start')}`)));
  });
  card('local', '📱', t('mode_local'), t('mode_local_d'), (el) => {
    el.append(tcSeg(), h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: async () => { if (await app.confirmLeave()) { m.close(); app.startLocal(tc); } } }, t('start'))));
  });
  body.appendChild(h('div', { class: 'btn-row' },
    h('button', { class: 'btn small', onclick: () => { m.close(); openAchievements(app); } }, `🏆 ${t('achievements')}`),
    h('button', { class: 'btn small', onclick: () => { m.close(); app.startTutorial(); } }, `🎓 ${t('tutorial')}`),
    h('button', { class: 'btn small', onclick: () => { m.close(); openSettings(app); } }, `⚙️ ${t('settings')}`)));
  const m = ui.modal({ title: t('modes'), body });
  return m;
}

export function openPromotion(app, color) {
  return new Promise((resolve) => {
    let chosen = null;
    const pieces = [['q', t('queen')], ['r', t('rook')], ['b', t('bishop')], ['n', t('knight')]];
    const grid = h('div', { class: 'promo-grid' }, ...pieces.map(([p, name]) => h('button', { 'aria-label': name, onclick: () => { chosen = p; m.close(); } }, h('div', { 'aria-hidden': 'true' }, GLYPH[color][p]), h('span', {}, name))));
    const m = app.ui.modal({ title: t('promoTitle'), body: grid, center: true, dismissable: false, onClose: () => resolve(chosen || 'q') });
  });
}

export function openBotNotice(app, profile) {
  return new Promise((resolve) => {
    const bar = h('div', { class: 'acc-bar' }, h('i', { style: { width: '0%', transition: 'width 3.5s linear' } }));
    const body = h('div', {}, h('div', { class: 'result-big' }, '🤖'), h('p', { style: { fontSize: '16px', color: 'var(--text)', fontWeight: 700 } }, t('botNotice')), h('p', {}, t('botNotice2')),
      h('p', {}, `${profile.avatar} ${profile.name} · ${profile.rating}`), bar);
    const m = app.ui.modal({ body, center: true, actions: [{ label: t('letsPlay'), primary: true, onClick: (c) => c.close() }], onClose: () => resolve() });
    requestAnimationFrame(() => { bar.firstChild.style.width = '100%'; });
    setTimeout(() => m.close(), 3600);
  });
}

export function openOnlineNotice(app) {
  if (app.store.get('seenOnlineNotice')) return Promise.resolve(true);
  return new Promise((resolve) => {
    let ok = false;
    app.ui.modal({
      title: `🌐 ${t('privacy')}`, center: true, body: t('onlineNotice'),
      actions: [{ label: t('cancel'), onClick: (c) => c.close() }, { label: t('understood'), primary: true, onClick: (c) => { ok = true; app.store.set({ seenOnlineNotice: true }); c.close(); } }],
      onClose: () => resolve(ok),
    });
  });
}

export function openHostRoom(app, code, onCancel) {
  const link = inviteLink(code);
  const body = h('div', {}, logo('small'),
    h('p', {}, t('roomCode')), h('div', { class: 'code-big', 'aria-label': `${t('roomCode')} ${code.split('').join(' ')}` }, code),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn whatsapp', onclick: () => shareWhatsApp(code) }, `💬 ${t('shareWhatsapp')}`),
      h('button', { class: 'btn', onclick: async () => { try { await navigator.clipboard.writeText(link ? inviteText(code) : code); app.ui.toast(t('copied')); } catch { app.ui.toast(code); } } }, `🔗 ${t('copyLink')}`)),
    h('div', { class: 'radar', 'aria-hidden': 'true' }), h('p', { class: 'countdown' }, t('waitingFriend')));
  return app.ui.modal({ title: t('mode_friend'), body, onClose: onCancel });
}

export function openSearching(app, onCancel) {
  const cd = h('p', { class: 'countdown' }, '6');
  const radar = h('div', { class: 'radar', 'aria-hidden': 'true' });
  for (let i = 0; i < 3; i++) radar.appendChild(h('span', { class: 'blip', style: { left: `${20 + Math.random() * 60}%`, top: `${20 + Math.random() * 60}%`, animationDelay: `${i * 0.4}s` } }));
  const body = h('div', {}, radar, h('p', { style: { fontWeight: 700, color: 'var(--text)' } }, t('searching')), cd);
  const m = app.ui.modal({ title: t('mode_quick'), body, center: true, onClose: onCancel });
  const t0 = performance.now();
  const iv = setInterval(() => { const left = Math.max(0, 6 - (performance.now() - t0) / 1000); cd.textContent = left.toFixed(0); if (left <= 0 || m.closed) clearInterval(iv); }, 200);
  return m;
}

export function openSummary(app, data) {
  const { title, emoji, reason, gems, stageMsg, acc, keyMoments, canReplay, isOnline } = data;
  const accBlock = (label, v) => h('div', {}, h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px' } }, h('span', {}, label), h('b', {}, v === null ? '—' : `${v.toFixed(1)}%`)), h('div', { class: 'acc-bar' }, h('i', { style: { width: `${v || 0}%` } })));
  const body = h('div', {},
    h('div', { class: 'result-big', 'aria-hidden': 'true' }, emoji),
    h('h2', {}, title), h('p', {}, reason),
    stageMsg ? h('p', { style: { color: 'var(--gold-2)', fontWeight: 700 } }, stageMsg) : null,
    h('div', { class: 'stat-grid' },
      h('div', { class: 'stat' }, h('b', {}, `+${gems}`), h('span', {}, `💎 ${t('gemsEarned')}`)),
      h('div', { class: 'stat' }, h('b', {}, String(app.store.get('wins'))), h('span', {}, `🏆 ${tn('ניצחונות', 'Wins')}`)),
      h('div', { class: 'stat' }, h('b', {}, String(app.store.get('rating'))), h('span', {}, `📈 ${tn('דירוג', 'Rating')}`))),
    h('h3', {}, `🎯 ${t('accuracy')}`), accBlock(t('yourAccuracy'), acc.me), accBlock(t('oppAccuracy'), acc.opp),
    keyMoments.length ? h('h3', {}, `⭐ ${t('keyMoments')}`) : null,
    ...keyMoments.map((k) => h('div', { class: 'moment' }, h('span', {}, `${k.moveNo}. ${k.san}`), h('span', {}, k.label))));
  const actions = [];
  if (canReplay) actions.push({ label: `🎬 ${t('replay')}`, onClick: (c) => { c.close(); app.replayFinale(); } });
  actions.push({ label: `📸 ${t('share')}`, onClick: () => app.shareKingdom() });
  actions.push({ label: isOnline ? `🔁 ${t('rematch')}` : `♟️ ${t('newGame')}`, primary: true, onClick: (c) => { c.close(); app.rematch(); } });
  return app.ui.modal({ title: t('summary'), body, actions });
}

export function openEraTour(app) {
  const { progression, ui } = app;
  const current = app.kingdom.eraId;
  const list = h('div', { class: 'era-list' });
  for (const e of ERAS) {
    const ok = progression.visitable(e.id);
    const built = progression.progressOf(e.id);
    const p = e.palette;
    const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
    const item = h('button', { class: `era-item ${e.id === current ? 'current' : ''}`, 'aria-disabled': String(!ok), onclick: () => {
      if (!ok) { ui.toast(e.premium ? t('buyEraFirst') : t('locked'), { kind: 'bad' }); return; }
      m.close();
      if (e.id !== current) app.visitEra(e.id);
    } },
    h('div', { class: 'sw', style: { background: `linear-gradient(180deg, ${hex(p.skyTop)}, ${hex(p.skyMid)} 55%, ${hex(p.skyHorizon)})` }, 'aria-hidden': 'true' }),
    h('div', {}, h('b', {}, `${t('era')} ${e.id}: ${tn(e.name, e.en)}${e.premium ? ' 💎' : ''}`), h('span', {}, `${t('stagesBuilt')}: ${built}/2 · ${tn(e.materials, e.materialsEn)}`)),
    h('span', { 'aria-hidden': 'true' }, ok ? (e.id === current ? '📍' : '›') : '🔒'));
    list.appendChild(item);
  }
  const m = ui.modal({ title: `🧭 ${t('eraTour')}`, body: list });
  return m;
}

export function openAchievements(app) {
  const grid = h('div', { class: 'ach-grid' }, ...ACHIEVEMENTS.map((a) => h('div', { class: `ach ${app.achievements.has(a.id) ? 'on' : ''}` }, h('div', { class: 'i', 'aria-hidden': 'true' }, app.achievements.has(a.id) ? a.icon : '🔒'), h('b', {}, tn(a.he, a.en)), h('small', {}, `${tn(a.desc, a.descEn)} · +${a.gems}💎`))));
  return app.ui.modal({ title: `🏆 ${t('achievements')}`, body: grid });
}

export function openSettings(app) {
  const { store, ui } = app;
  const s = store.get('settings');
  const langSeg = h('div', { class: 'seg' }, ...[['he', 'עברית'], ['en', 'English']].map(([v, l]) => h('button', { 'aria-pressed': String((s.lang || getLang()) === v), lang: v, onclick: () => { store.setSetting('lang', v); m.close(); app.setLanguage(v); } }, h('b', {}, l))));
  const qSeg = h('div', { class: 'seg' }, ...[['auto', t('auto')], ['high', t('high')], ['low', t('low')]].map(([v, l]) => h('button', { 'aria-pressed': String((s.quality || 'auto') === v), onclick: (e) => { store.setSetting('quality', v); app.applyQuality(); qSeg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); } }, h('b', {}, l))));
  const body = h('div', {}, logo('mid'),
    h('h3', {}, `🌐 ${t('language')}`), langSeg,
    h('h3', {}, `🎨 ${t('quality')}`), qSeg,
    h('h3', {}, `🔒 ${t('privacy')}`), h('p', { style: { textAlign: 'start' } }, t('privacyText')),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onclick: () => openPrivacyPolicy(app) }, `📄 ${t('privacyPolicy')}`)),
    h('p', { style: { textAlign: 'start', fontSize: '12px' } }, t('keyboardHelp')),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn danger', onclick: async () => { if (await ui.confirm(t('confirmDelete'), t('deleteData'), { danger: true })) app.wipeData(); } }, `🗑️ ${t('deleteData')}`)),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onclick: async (e) => {
      const btn = e.currentTarget; btn.disabled = true; ui.toast(`🔄 ${t('checkingUpdates')}`);
      const r = await app.updater.checkForUpdates();
      btn.disabled = false;
      if (r === 'none') ui.toast(`✅ ${t('upToDate')}`, { kind: 'good' });
      else if (r === 'error') ui.toast(t('connError'), { kind: 'bad' });
      else if (r === 'unsupported') ui.toast(`✅ ${t('upToDate')}`);
      else m.close();
    } }, `🔄 ${t('checkUpdates')}`)),
    h('p', { class: 'version', style: { textAlign: 'center' } }, `${APP.titleEn} · v${APP_VERSION}`));
  const m = ui.modal({ title: `⚙️ ${t('settings')}`, body });
  return m;
}

/** מדיניות הפרטיות והנגישות — אותו עמוד ציבורי (privacy.html) בתוך מודל, בלי לעזוב את המשחק */
export function openPrivacyPolicy(app) {
  const frame = h('iframe', { src: `./privacy.html#${getLang()}`, title: t('privacyPolicy'), class: 'policy-frame', loading: 'lazy' });
  return app.ui.modal({ title: `📄 ${t('privacyPolicy')}`, body: frame });
}

export { logo, getLang };
