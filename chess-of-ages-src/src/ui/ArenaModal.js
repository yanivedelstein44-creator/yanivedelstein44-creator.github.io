/**
 * זירת העידנים — משחק אונליין מול שחקנים שמחכים עכשיו (הלוגיקה: app/OnlineController.js, הלובי: net/*Backend.js).
 *  • "משחק מהיר": נכנסים לחדר שמחכה הכי הרבה זמן, ואם אין — פותחים חדר ומחכים.
 *  • "חדרים פנויים": רשימה חיה של מי שמחכה (שם מהרשימה הקבועה, סמל, האי, כמה זמן מחכה) — נכנסים בלחיצה.
 *  • "פתח חדר וחכה ליריב": החדר שלך מופיע ברשימה עד שמישהו נכנס.
 * כל משחק באי אקראי (1–99). אין צ'אט וטקסט חופשי, אין צופים בחדרי זירה, ואפשר לחסום שחקן (באימוג'י בזמן משחק).
 * לפני הכניסה הראשונה — הודעת פרטיות (חובת היידוע), ורק אחריה נטען Firebase ונקראת רשימת החדרים.
 */
import { h, withIcon } from './UI.js';
import { t, getLang, islandLabel } from './i18n.js';
import { icon, emblemIcon } from './icons.js';
import { localizeIncomingName } from '../core/PlayerName.js';
import { openLegalPage } from './LegalPages.js';
import { withServerWait } from './ServerWait.js';

const errText = (e) => {
  if (e?.code === 'needUpdate') return t('playRoomNeedUpdate');
  if (e?.code === 'timeout' && navigator.onLine !== false) return t('onlineBusy'); // יש אינטרנט אבל השרת לא עונה (למשל מלא)
  return t('onlineError');
};
const ago = (ms) => { const m = Math.floor(Math.max(0, Date.now() - ms) / 60000); return m < 1 ? t('arenaJustNow') : `${m} ${t('mShort')}`; };

/** הודעת פרטיות — פעם אחת, לפני הכניסה הראשונה לזירה */
function ensureArenaNotice(app) {
  if (app.store.get('seenArenaNotice')) return Promise.resolve(true);
  return new Promise((resolve) => {
    let answered = false;
    app.ui.modal({
      title: t('arenaTitle'), titleIcon: 'globe', center: true, className: 'arena-notice',
      // [legal] חובת היידוע (סעיף 11): מה עובר, למי, ולמה — הפרטים המלאים בסעיף האונליין של מדיניות הפרטיות
      body: h('div', {}, h('p', {}, t('arenaNotice')),
        h('p', {}, h('button', { class: 'link-btn tap', type: 'button', onclick: () => openLegalPage(app, 'privacy', 'online') }, t('lgPrivacy')))),
      actions: [
        { label: t('cancelRoom'), onClick: (c) => { answered = true; c.close(); resolve(false); } },
        { label: t('understood'), icon: 'check', primary: true, onClick: (c) => { answered = true; app.store.set({ seenArenaNotice: true }); c.close(); resolve(true); } },
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

/** החלון הראשי של הזירה (כפתור "אונליין" בסרגל התחתון, או הטבעת שסביב הלוח באי המרכזי) */
export async function openArena(app) {
  const cur = app.online.room;
  // כבר מחכים ליריב בחדר שפתחת בזירה — מציגים שוב את חלון ההמתנה
  if (cur && cur.isArena && cur.isPlayer && !cur.hasGuest) return openArenaWaiting(app, cur);
  if (!(await ensureArenaNotice(app))) { app.ui.setActiveTab(null); return null; }
  const list = h('div', { class: 'ar-list', role: 'list', 'aria-live': 'polite' }, h('p', { class: 'ar-empty' }, t('arenaLoading')));
  const count = h('span', { class: 'ar-count' });
  const body = h('div', { class: 'arena' },
    h('div', { class: 'ar-hero' }, h('div', { class: 'hero-ic', 'aria-hidden': 'true' }, icon('globe', { size: 46 })), h('p', {}, t('arenaDesc'))),
    h('p', { class: 'ar-safe' }, ...withIcon('shield', t('arenaSafe'), 16)),
    h('button', { class: 'btn primary tap wide', onclick: () => quick() }, icon('swords', { size: 20 }), h('span', {}, t('arenaQuick'))),
    h('h3', { class: 'ar-h' }, ...withIcon('users', t('arenaRooms'), 16), count),
    list,
    h('button', { class: 'btn tap wide', onclick: () => host() }, icon('plus', { size: 18 }), h('span', {}, t('arenaOpen'))));
  let stop = null;
  const m = app.ui.modal({ title: t('arenaTitle'), titleIcon: 'globe', body, className: 'arena-modal', onClose: () => { try { stop?.(); } catch { /* */ } app.ui.setActiveTab(null); } });

  let got = false;
  const render = (rooms) => {
    if (m.closed) return;
    if (rooms !== undefined) got = got || rooms !== null;
    if (rooms === null) { list.replaceChildren(h('p', { class: 'ar-empty bad' }, t(navigator.onLine === false ? 'arenaListError' : 'arenaListBusy'))); count.textContent = ''; return; }
    count.textContent = rooms.length ? `(${rooms.length})` : '';
    if (!rooms.length) { list.replaceChildren(h('p', { class: 'ar-empty' }, t('arenaEmpty'))); return; }
    list.replaceChildren(...rooms.map((e) => {
      const name = localizeIncomingName(e.name, getLang()) || t('arenaRival');
      return h('div', { class: 'ar-row', role: 'listitem' },
        h('span', { class: 'ar-em', 'aria-hidden': 'true' }, icon(emblemIcon(e.emblem), { size: 30 })),
        h('div', { class: 'ar-who' }, h('b', {}, name), h('span', {}, `${islandLabel(e.island)} · ${t('arenaWaitingFor').replace('{t}', ago(e.t))}`)),
        h('button', { class: 'btn small tap', 'aria-label': `${t('arenaJoin')}: ${name}`, onclick: () => join(e) }, icon('play', { size: 16 }), h('span', {}, t('arenaJoin'))));
    }));
  };
  app.online.watchArena(render).then((un) => { if (m.closed) un?.(); else stop = un; }).catch(() => render(null));
  // בלי חיבור לשרת (או כשהוא מלא) הרשימה לא מגיעה — אחרי 12 שניות מציגים הודעה, וממשיכים להאזין (אם תגיע — תוצג)
  setTimeout(() => { if (!got && !m.closed) render(null); }, 12000);

  async function quick() {
    if (!(await app.confirmLeave())) return;
    m.close();
    app.ui.toast(t('arenaSearching'), { icon: 'globe' });
    try {
      const res = await withServerWait(app, () => app.online.arenaQuick());
      if (res.joined) app.ui.toast(t('arenaFound').replace('{name}', res.room.opponent()?.name || t('arenaRival')), { kind: 'gold', icon: 'swords', duration: 3600 });
      else openArenaWaiting(app, res.room);
    } catch (e) {
      if (e?.code === 'cancel') return;
      console.warn('arena quick failed', e);
      app.ui.toast(errText(e), { kind: 'bad', duration: 4500 });
    }
  }

  async function join(entry) {
    if (!(await app.confirmLeave())) return;
    m.close();
    app.ui.toast(t('connecting'), { icon: 'globe' });
    try {
      const room = await withServerWait(app, () => app.online.arenaJoin(entry));
      app.ui.toast(t('arenaFound').replace('{name}', room.opponent()?.name || t('arenaRival')), { kind: 'gold', icon: 'swords', duration: 3600 });
    } catch (e) {
      if (e?.code === 'cancel') return;
      if (['full', 'notFound'].includes(e?.code)) { app.ui.toast(t('arenaTaken'), { icon: 'info', duration: 3800 }); openArena(app); return; }
      console.warn('arena join failed', e);
      app.ui.toast(errText(e), { kind: 'bad', duration: 4500 });
    }
  }

  async function host() {
    if (!(await app.confirmLeave())) return;
    m.close();
    app.ui.toast(t('connecting'), { icon: 'globe' });
    try {
      openArenaWaiting(app, await withServerWait(app, () => app.online.arenaHost()));
    } catch (e) {
      if (e?.code === 'cancel') return;
      console.warn('arena host failed', e);
      app.ui.toast(errText(e), { kind: 'bad', duration: 4500 });
    }
  }
  return m;
}

/** מחכים ליריב: האי של החדר, ביטול, או הסתרה (ממשיכים להסתובב — נודיע כשמישהו נכנס). נסגר לבד כשיריב נכנס */
export function openArenaWaiting(app, room) {
  if (app.online.room !== room || room.hasGuest) return null; // היריב כבר נכנס (או שעזבת) — אין למה לחכות
  const body = h('div', { class: 'waiting arena-wait' },
    h('div', { class: 'hero-ic pulse', 'aria-hidden': 'true' }, icon('globe', { size: 50 })),
    h('p', {}, t('arenaWaitHint').replace('{isl}', islandLabel(room.island))),
    h('p', { class: 'muted small' }, t('arenaWaitTip')));
  return app.ui.modal({
    title: t('arenaWaitTitle'), titleIcon: 'globe', body, center: true, className: 'waiting-modal',
    actions: [
      { label: t('cancelRoom'), icon: 'close', onClick: async (c) => { c.close(); await app.online.detach({ remove: true }); app.exitOnline(); } },
      { label: t('arenaHide'), primary: true, onClick: (c) => c.close() },
    ],
  });
}
