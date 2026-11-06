/**
 * מודלים: משחק נגד חבר, המשחק המלא, הכתרה, סיכום משחק, אלבום הבוטים, הישגים, הגדרות ופרטיות.
 * בלי לוגו בכותרות המשנה — כותרת נקייה + אייקון.
 */
import { h, withIcon } from './UI.js';
import { t, tn, getLang } from './i18n.js';
import { icon, EMBLEMS, emblemIcon } from './icons.js';
import { starRow } from './MapPanel.js';
import { TIME_CONTROLS, APP_VERSION, APP } from '../config/AppConfig.js';
import { FULL_GAME, formatPrice } from '../config/EconomyConfig.js';
import { PaymentProvider } from '../core/Economy.js';
import { ACHIEVEMENTS } from '../core/Achievements.js';
import { GLYPH } from '../game/GameController.js';
import { ISLAND_COUNT, HUB_ID, islandDef, regionIslands, tierOf } from '../config/Islands.js';
import { getEra } from '../config/Eras.js';

const TXT = '︎';

/** בחירה מתוך קבוצה (aria-pressed) */
function segment(options, current, onPick) {
  const seg = h('div', { class: 'seg' }, ...options.map(([v, label, sub]) => h('button', { class: 'tap', 'aria-pressed': String(current === v), onclick: (e) => { seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); onPick(v); } }, h('b', {}, label), sub ? h('small', {}, sub) : null)));
  return seg;
}

/** משחק נגד חבר על אותו מכשיר (באי המרכזי) */
export function openFriend(app) {
  let tc = app.store.get('timeControl') ?? 0;
  const body = h('div', { class: 'friend' },
    h('div', { class: 'hero-ic' }, icon('users', { size: 56 })),
    h('p', {}, t('friendDesc')),
    h('h3', {}, t('timeControl')),
    segment([[0, t('noClock')], ...TIME_CONTROLS.map((x) => [x.id, tn(x.label, x.labelEn)])], tc, (v) => { tc = v; }),
    h('p', { class: 'soon' }, ...withIcon('globe', t('friendSoon'), 14)));
  return app.ui.modal({
    title: t('friendTitle'), titleIcon: 'users', body,
    actions: [{ label: t('startGame'), icon: 'play', primary: true, onClick: async (c) => { if (await app.confirmLeave()) { c.close(); app.startFriendGame(tc); } } }],
  });
}

/** פתיחת המשחק המלא (איים 6–99) — רכישה חד-פעמית */
export function openFullGame(app, onUnlocked) {
  const { economy, ui, sound } = app;
  const priceLabel = (typeof PaymentProvider.priceLabel === 'function' && PaymentProvider.priceLabel(FULL_GAME)) || (FULL_GAME.price ? formatPrice(FULL_GAME.price) : t('priceSoon'));
  const body = h('div', { class: 'fullgame' },
    h('div', { class: 'hero-ic' }, icon('castle', { size: 64 })),
    h('p', {}, t('fullBody')),
    h('div', { class: 'price-tag' }, priceLabel),
    economy.sandbox ? h('p', { class: 'soon' }, ...withIcon('info', t('sandboxNote'), 14)) : null);
  return ui.modal({
    title: t('fullTitle'), titleIcon: 'crown', center: true, body,
    actions: [
      { label: t('later'), onClick: (c) => c.close() },
      { label: economy.sandbox ? t('unlockTest') : t('unlock'), icon: 'lock', primary: true, onClick: async (c) => {
        const res = await economy.purchaseFullGame(() => Promise.resolve(true));
        if (res.ok) { c.close(); sound.jackpot(); ui.toast(`${t('fullOwned')}!`, { kind: 'gold', icon: 'crown' }); onUnlocked?.(); }
        else if (!res.cancelled) ui.toast(res.reason, { kind: 'bad' });
      } },
    ],
  });
}

export function openPromotion(app, color) {
  return new Promise((resolve) => {
    let chosen = null;
    const pieces = [['q', t('queen')], ['r', t('rook')], ['b', t('bishop')], ['n', t('knight')]];
    const grid = h('div', { class: 'promo-grid' }, ...pieces.map(([p, name]) => h('button', { class: 'tap', 'aria-label': name, onclick: () => { chosen = p; m.close(); } }, h('div', { 'aria-hidden': 'true', class: 'glyph' }, GLYPH[color][p] + TXT), h('span', {}, name))));
    const m = app.ui.modal({ title: t('promoTitle'), titleIcon: 'crown', body: grid, center: true, dismissable: false, onClose: () => resolve(chosen || 'q') });
  });
}

/** סיכום משחק: תוצאה, כוכבים וכיבוש, יהלומים, דיוק ורגעי מפתח + המשך (האי הבא / שוב / מפה) */
export function openSummary(app, data) {
  const { title, icon: ic, reason, gems, stageMsg, acc, keyMoments, canReplay, vsBot, won, island, nextId } = data;
  const accBlock = (label, v) => h('div', {}, h('div', { class: 'acc-row' }, h('span', {}, label), h('b', {}, v === null ? '—' : `${v.toFixed(1)}%`)), h('div', { class: 'acc-bar' }, h('i', { style: { width: `${v || 0}%` } })));
  const conquestBlock = vsBot && island ? h('div', { class: 'conquest' },
    won ? h('div', { class: 'stars-big' }, starRow(island.stars, 34)) : null,
    won && island.first ? h('div', { class: 'conq-title' }, ...withIcon('flag', `${t('islandConquered')}!`, 20)) : null,
    won && island.stars > island.prevStars && !island.first ? h('div', { class: 'muted' }, `${t('stars')}: ${island.prevStars} → ${island.stars}`) : null,
    h('p', { class: 'muted small' }, t('starsRule'))) : null;
  const body = h('div', { class: 'summary' },
    h('div', { class: 'result-big', 'aria-hidden': 'true' }, icon(ic || 'trophy', { size: 64 })),
    h('h2', {}, title), h('p', {}, reason),
    conquestBlock,
    stageMsg ? h('p', { class: 'gold-line' }, stageMsg) : null,
    h('div', { class: 'stat-grid' },
      h('div', { class: 'stat' }, h('b', {}, `+${gems}`), h('span', {}, ...withIcon('gem', t('gemsEarned'), 14))),
      h('div', { class: 'stat' }, h('b', {}, String(app.store.get('wins'))), h('span', {}, ...withIcon('trophy', tn('ניצחונות', 'Wins'), 14))),
      h('div', { class: 'stat' }, h('b', {}, String(app.store.get('rating'))), h('span', {}, ...withIcon('chart', t('rating'), 14)))),
    h('h3', {}, ...withIcon('target', t('accuracy'), 16)), accBlock(t('yourAccuracy'), acc.me), accBlock(t('oppAccuracy'), acc.opp),
    keyMoments.length ? h('h3', {}, ...withIcon('star', t('keyMoments'), 16)) : null,
    ...keyMoments.map((k) => h('div', { class: 'moment' }, h('span', {}, `${k.moveNo}. ${k.san}`), h('span', { class: 'mlab' }, icon(k.color === 'w' ? 'dotLight' : 'dotDark', { size: 12 }), k.label))));
  const actions = [];
  if (canReplay) actions.push({ label: t('replay'), icon: 'play', onClick: (c) => { c.close(); app.replayFinale(); } });
  if (vsBot) {
    actions.push({ label: t('toMap'), icon: 'compass', onClick: (c) => { c.close(); app.openMap(won && nextId ? nextId : undefined); } });
    if (won && nextId) actions.push({ label: `${t('nextIsland')} · ${nextId}`, icon: 'swords', primary: true, onClick: (c) => { c.close(); app.travelTo(nextId); } });
    else actions.push({ label: won ? t('rematch') : t('tryAgain'), icon: 'refresh', primary: true, onClick: (c) => { c.close(); app.rematch(); } });
  } else {
    actions.push({ label: t('share'), icon: 'camera', onClick: () => app.shareKingdom() });
    actions.push({ label: t('rematch'), icon: 'refresh', primary: true, onClick: (c) => { c.close(); app.rematch(); } });
  }
  return app.ui.modal({ title: t('summary'), titleIcon: 'chart', body, actions });
}

/** אלבום הבוטים: לשונית לכל אזור, דיוקן תלת-ממדי, כוכבים וחותמת "הובס" */
export function openAlbum(app) {
  const pr = app.progression;
  let region = Math.max(1, Math.min(10, Math.ceil((pr.frontier() || ISLAND_COUNT) / 10)));
  const tabs = h('div', { class: 'region-tabs', role: 'tablist' });
  const grid = h('div', { class: 'album-grid' });
  const note = h('p', { class: 'muted small' }, t('albumNote'));
  function render() {
    tabs.replaceChildren(...Array.from({ length: 10 }, (_, i) => i + 1).map((r) => {
      const ids = regionIslands(r);
      const done = ids.filter((id) => pr.isConquered(id)).length;
      return h('button', { class: 'tap', role: 'tab', 'aria-selected': String(r === region), onclick: () => { region = r; render(); } }, h('b', {}, String(r)), h('small', {}, `${done}/${ids.length}`));
    }));
    const era = getEra(region);
    grid.replaceChildren(h('div', { class: 'album-head' }, h('b', {}, tn(era.name, era.en))), ...regionIslands(region).map((id) => {
      const d = islandDef(id);
      const met = pr.isUnlocked(id);
      const won = pr.isConquered(id);
      const pic = h('div', { class: 'portrait' }, icon(met ? 'crown' : 'lock', { size: 30, cls: 'ph' }));
      if (met) app.thumbs.avatar(`bot${id}`, d.bot.loadout, d.bot.look, 200).then((url) => { if (url) pic.replaceChildren(h('img', { src: url, alt: '' }), won ? h('span', { class: 'stamp' }, t('defeated')) : null); });
      const tier = tierOf(d.bot.rating);
      return h('button', { class: `album-card tap ${won ? 'won' : ''} ${met ? '' : 'unmet'}`, onclick: () => { m.close(); app.openMap(id); } },
        pic,
        h('b', {}, met ? tn(d.bot.name.he, d.bot.name.en) : '???'),
        h('small', {}, met ? tn(d.bot.title.he, d.bot.title.en) : t('notMet')),
        h('div', { class: 'album-meta' }, h('span', { style: { color: tier.color } }, `#${id} · ${d.bot.rating}`), starRow(pr.starsOf(id), 12)));
    }));
  }
  render();
  const m = app.ui.modal({ title: t('albumTitle'), titleIcon: 'doc', body: h('div', {}, tabs, grid, note), full: true });
  return m;
}

export function openAchievements(app) {
  const grid = h('div', { class: 'ach-grid' }, ...ACHIEVEMENTS.map((a) => {
    const on = app.achievements.has(a.id);
    return h('div', { class: `ach ${on ? 'on' : ''}` }, h('div', { class: 'i', 'aria-hidden': 'true' }, icon(on ? a.icon : 'lock', { size: 30 })), h('b', {}, tn(a.he, a.en)), h('small', {}, tn(a.desc, a.descEn)), h('span', { class: 'ach-gems' }, icon('gem', { size: 13 }), `+${a.gems}`));
  }));
  return app.ui.modal({ title: t('achievements'), titleIcon: 'trophy', body: grid });
}

export function openSettings(app) {
  const { store, ui, economy } = app;
  const s = store.get('settings');
  const prof = store.get('profile');
  const nameIn = h('input', { id: 'pname', value: prof.name, maxlength: 18, autocomplete: 'nickname', onchange: (e) => { store.set({ profile: { ...store.get('profile'), name: e.target.value.trim().slice(0, 18) || prof.name } }); app.refreshHud(); } });
  const cur = emblemIcon(prof.avatar);
  const emRow = h('div', { class: 'emblems', role: 'radiogroup', 'aria-label': t('avatar') }, ...EMBLEMS.map((e) => h('button', { class: 'tap', role: 'radio', 'aria-checked': String(cur === e), 'aria-label': e, onclick: (ev) => { store.set({ profile: { ...store.get('profile'), avatar: e } }); emRow.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', 'false')); ev.currentTarget.setAttribute('aria-checked', 'true'); app.refreshHud(); } }, icon(e, { size: 26 }))));
  const langSeg = segment([['he', 'עברית'], ['en', 'English']], s.lang || getLang(), (v) => { store.setSetting('lang', v); m.close(); app.setLanguage(v); });
  langSeg.querySelectorAll('button').forEach((b, i) => b.setAttribute('lang', i ? 'en' : 'he'));
  const qSeg = segment([['auto', t('auto')], ['high', t('high')], ['low', t('low')]], s.quality || 'auto', (v) => { store.setSetting('quality', v); app.applyQuality(); });
  const fullRow = economy.ownsFullGame()
    ? h('p', { class: 'ok-line' }, ...withIcon('check', t('fullOwned'), 16))
    : h('div', { class: 'btn-row' }, h('button', { class: 'btn small tap', onclick: () => { m.close(); openFullGame(app); } }, ...withIcon('crown', t('fullTitle'), 16)));
  const body = h('div', { class: 'settings' },
    h('h3', {}, ...withIcon('crown', t('profile'), 16)),
    h('div', { class: 'field' }, h('label', { for: 'pname' }, t('name')), nameIn),
    emRow,
    h('h3', {}, ...withIcon('castle', t('fullGame'), 16)), fullRow,
    h('h3', {}, ...withIcon('globe', t('language'), 16)), langSeg,
    h('h3', {}, ...withIcon('palette', t('quality'), 16)), qSeg,
    h('h3', {}, ...withIcon('lock', t('privacy'), 16)), h('p', { style: { textAlign: 'start' } }, t('privacyText')),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn small tap', onclick: () => openPrivacyPolicy(app) }, ...withIcon('doc', t('privacyPolicy'), 16))),
    h('p', { style: { textAlign: 'start', fontSize: '12px' } }, t('keyboardHelp')),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn small tap', onclick: async (e) => {
      const btn = e.currentTarget; btn.disabled = true; ui.toast(t('checkingUpdates'), { icon: 'refresh' });
      const r = await app.updater.checkForUpdates();
      btn.disabled = false;
      if (r === 'none' || r === 'unsupported') ui.toast(t('upToDate'), { kind: 'good', icon: 'check' });
      else if (r === 'error') ui.toast(`${t('updateError')}${app.updater.lastError ? ` (${String(app.updater.lastError).slice(0, 90)})` : ''}`, { kind: 'bad', duration: 6000 });
      else m.close();
    } }, ...withIcon('refresh', t('checkUpdates'), 16))),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn danger tap', onclick: async () => { if (await ui.confirm(t('confirmDelete'), t('deleteData'), { danger: true })) app.wipeData(); } }, ...withIcon('trash', t('deleteData'), 18))),
    h('p', { class: 'version', style: { textAlign: 'center' } }, `${APP.titleEn} · v${APP_VERSION}`));
  const m = ui.modal({ title: t('settings'), titleIcon: 'gear', body });
  return m;
}

/** מדיניות הפרטיות והנגישות — אותו עמוד ציבורי (privacy.html) בתוך מודל, בלי לעזוב את המשחק */
export function openPrivacyPolicy(app) {
  const frame = h('iframe', { src: `./privacy.html#${getLang()}`, title: t('privacyPolicy'), class: 'policy-frame', loading: 'lazy' });
  return app.ui.modal({ title: t('privacyPolicy'), titleIcon: 'doc', body: frame });
}

export { getLang, HUB_ID };
