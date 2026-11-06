/**
 * ממשק מפת האיים: כותרת (כוכבים, כיבושים, יהלומים, סגירה), קיצורי דרך וכרטיס האי הנבחר
 * (דיוקן תלת-ממדי של הבוט או של קפטן הפיראטים, העידן של האי, דירוג, חיית המחמד, כוכבים, פרס וכפתור "טוס והילחם").
 * אין סדר חובה — כל אי פתוח (איים 6–99 עם המשחק המלא).
 */
import { h, withIcon } from './UI.js';
import { t, tn, islandLabel, shortName } from './i18n.js';
import { icon } from './icons.js';
import { formatGems } from '../config/EconomyConfig.js';
import { HUB_ID, ISLAND_COUNT, islandDef, tierOf, conquestGems, repeatGems, regionOf, PREMIUM_WORLDS } from '../config/Islands.js';
import { getEra } from '../config/Eras.js';
import { pirateCrew, pirateGems } from '../config/Pirates.js';

const fmtDur = (ms) => { const m = Math.max(1, Math.ceil(ms / 60000)); const hh = Math.floor(m / 60), mm = m % 60; return hh ? `${hh}${t('hShort')} ${mm}${t('mShort')}` : `${mm}${t('mShort')}`; };
const starRow = (n, size = 18) => h('span', { class: 'stars', 'aria-label': `${n} / 3` }, ...[1, 2, 3].map((i) => icon('star', { size, cls: i <= n ? '' : 'off' })));

export function buildMapUi(app, map) {
  const pr = app.progression;
  const closeBtn = h('button', { class: 'modal-close tap', 'aria-label': t('close'), onclick: () => map.close() }, icon('close', { size: 16 }));
  const head = h('header', { class: 'map-head glass' },
    h('h2', {}, icon('compass', { size: 24 }), h('span', {}, t('worldMap'))),
    h('div', { class: 'map-stats' },
      h('span', { class: 'chip', title: t('stars') }, icon('star', { size: 16 }), String(pr.totalStars())),
      h('span', { class: 'chip', title: t('conquered') }, icon('flag', { size: 16 }), `${pr.conqueredCount()}/${ISLAND_COUNT}`),
      h('span', { class: 'chip gem', title: t('gems') }, icon('gem', { size: 16 }), formatGems(app.economy.gems))),
    closeBtn);
  const quick = h('div', { class: 'map-quick' },
    h('button', { class: 'btn small tap', onclick: () => map.select(pr.currentIsland()) }, ...withIcon('pin', t('myIsland'), 16)),
    pr.frontier() ? h('button', { class: 'btn small tap', onclick: () => map.select(pr.frontier()) }, ...withIcon('target', t('nextIsland'), 16)) : null,
    h('button', { class: 'btn small tap', onclick: () => { map.close(); app.handlers().onAlbum(); } }, ...withIcon('doc', t('album'), 16)));
  const card = h('section', { class: 'island-card glass', hidden: true, 'aria-live': 'polite' });
  const root = h('div', { id: 'map-ui', role: 'dialog', 'aria-label': t('worldMap') }, head, quick, card);
  document.getElementById('app').appendChild(root);
  setTimeout(() => closeBtn.focus(), 80);

  map.onSelect = (id) => {
    const d = islandDef(id);
    const b = d.bot;
    const r = regionOf(id);
    const era = PREMIUM_WORLDS[r] ? { name: PREMIUM_WORLDS[r].he, en: PREMIUM_WORLDS[r].en } : getEra(r);
    const cur = pr.currentIsland();
    const paywall = pr.needsFullGame(id);
    const conquered = pr.isConquered(id);
    const pirates = conquered && id !== HUB_ID;
    const piratesNow = pirates && pr.hasPirates(id);
    const crew = pirates ? pirateCrew(id, pr.pirateCrewIndex(id)) : null;
    const who = crew || b;
    const tier = tierOf(who.rating);
    const portrait = h('div', { class: `portrait${pirates ? ' pirate' : ''}` }, icon('crown', { size: 40, cls: 'ph' }));
    app.thumbs.avatar(pirates ? `pirate${id}_${pr.pirateCrewIndex(id)}` : `bot${id}`, who.loadout, who.look, 220).then((url) => { if (url) portrait.replaceChildren(h('img', { src: url, alt: '' })); });
    const petImg = h('span', { class: 'pet-thumb' }, icon('paw', { size: 18 }));
    app.thumbs.pet(who.pet, 96, { hue: who.petHue }).then((url) => { if (url) petImg.replaceChildren(h('img', { src: url, alt: '' })); });
    let status = null;
    if (id === cur) status = h('span', { class: 'tag here' }, ...withIcon('pin', t('youAreHere'), 14));
    else if (piratesNow) status = h('span', { class: 'tag pirate' }, ...withIcon('swords', t('timePirates'), 14));
    else if (conquered) status = h('span', { class: 'tag done' }, ...withIcon('check', t('conqueredMark'), 14));
    else if (paywall) status = h('span', { class: 'tag lock' }, ...withIcon('crown', t('locked5'), 14));
    const reward = piratesNow ? pirateGems(id) : pirates ? 0 : conquered ? repeatGems(id) : conquestGems(id);
    const actions = h('div', { class: 'card-actions' });
    if (paywall) actions.append(h('button', { class: 'btn primary tap', onclick: () => app.travelTo(id) }, ...withIcon('crown', t('fullTitle'), 18)));
    else {
      const label = piratesNow ? t('fightPirates') : pirates ? t('practicePirates') : id === cur ? t('battle') : t('travelBattle');
      actions.append(h('button', { class: `btn primary go tap${piratesNow ? ' danger' : ''}`, onclick: () => app.travelTo(id) }, ...withIcon('swords', label, 20)));
      if (id === HUB_ID) actions.append(h('button', { class: 'btn tap', onclick: () => { map.close(); app.handlers().onFriend(); } }, ...withIcon('users', t('friend'), 18)));
    }
    const note = pirates && !piratesNow ? h('div', { class: 'muted small' }, t('piratesReturn').replace('{t}', fmtDur(pr.pirateReturnIn(id)))) : null;
    card.replaceChildren(...[
      h('div', { class: 'card-top' },
        portrait,
        h('div', { class: 'card-info' },
          h('div', { class: 'card-chips' }, h('span', { class: 'chip isl' }, `${t('island')} ${id}`), d.boss ? h('span', { class: 'chip boss' }, icon('crown', { size: 13 }), t('boss')) : null, status),
          h('h3', {}, id === HUB_ID ? t('hubName') : islandLabel(id)),
          h('div', { class: 'era-line' }, h('b', {}, tn(d.era.he, d.era.en)), h('span', { class: 'muted' }, ` · ${tn(era.name, era.en)}`)),
          h('div', { class: 'bot-line' }, h('b', {}, tn(who.name.he, who.name.en)), h('span', {}, ` · ${tn(who.title.he, who.title.en)}`)),
          h('div', { class: 'card-chips' },
            h('span', { class: 'chip', style: { color: tier.color, borderColor: tier.color } }, `${tn(tier.he, tier.en)} · ${b.rating}`),
            h('span', { class: 'chip' }, petImg, shortName(who.pet))))),
      h('div', { class: 'card-mid' },
        h('div', {}, h('small', {}, t('stars')), starRow(pr.starsOf(id))),
        reward ? h('div', {}, h('small', {}, piratesNow ? t('timePirates') : conquered ? t('replayReward') : t('firstTime')), h('span', { class: 'reward' }, icon('gem', { size: 18 }), `+${reward}`)) : null),
      note, actions].filter(Boolean));
    card.hidden = false;
  };
  return root;
}

export { starRow };
