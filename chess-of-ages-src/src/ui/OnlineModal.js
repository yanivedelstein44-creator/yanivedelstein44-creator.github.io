/**
 * "משחק נגד חבר": על אותו מכשיר, או אונליין — הזמנה עם קישור/קוד פרטי, הצטרפות וצפייה.
 * חדר ההמתנה (שיתוף מערכת / וואטסאפ / העתקה) ובחירת אימוג'י בזמן משחק.
 * אין שידוך עם זרים ואין צ'אט חופשי — רק מי שקיבל את הקוד נכנס.
 */
import { Capacitor } from '@capacitor/core';
import { h, withIcon } from './UI.js';
import { t, tn } from './i18n.js';
import { icon } from './icons.js';
import { segment } from './Modals.js';
import { TIME_CONTROLS, ONLINE } from '../config/AppConfig.js';
import { normCode, validCode, prettyCode, inviteUrl } from '../net/OnlineRoom.js';
import { openLegalPage } from './LegalPages.js';

const native = () => Capacitor?.isNativePlatform?.() || false;

function errText(e) {
  if (e?.code === 'notFound') return t('roomGone');
  if (e?.code === 'full') return t('roomFullWatch');
  if (e?.code === 'needUpdate') return t('playRoomNeedUpdate'); // החדר נוצר בגרסה חדשה יותר
  if (e?.code === 'friendOld') return t('playRoomFriendOld'); // החדר נוצר בגרסה ישנה מדי
  return t('onlineError');
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* גיבוי למטה */ }
  try {
    const ta = h('textarea', { style: { position: 'fixed', top: '0', opacity: '0' }, 'aria-hidden': 'true' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

function openExternal(url) {
  if (native()) location.href = url; // באפליקציה: Capacitor פותח אפליקציה חיצונית (וואטסאפ)
  else window.open(url, '_blank', 'noopener');
}

async function shareInvite(room, watch = false) {
  const url = inviteUrl(room.code, watch);
  const text = t(watch ? 'watchText' : 'inviteText').replace('{code}', prettyCode(room.code));
  if (navigator.share && !native()) {
    try { await navigator.share({ title: 'Chess of Ages', text, url }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  openExternal(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`);
}

/** הודעת פרטיות קצרה — פעם אחת, לפני המשחק האונליין הראשון */
function ensureNotice(app) {
  if (app.store.get('seenOnlineNotice2')) return Promise.resolve(true);
  return new Promise((resolve) => {
    let answered = false;
    app.ui.modal({
      title: t('onlineFriend'), titleIcon: 'globe', center: true,
      // [legal] חובת היידוע (סעיף 11): הפרטים המלאים — מי אחראי, למי מגיע המידע, מחיקה — בסעיף האונליין של מדיניות הפרטיות
      body: h('div', {}, h('p', {}, t('onlineNotice2')),
        h('p', {}, h('button', { class: 'link-btn tap', type: 'button', onclick: () => openLegalPage(app, 'privacy', 'online') }, t('lgPrivacy')))),
      actions: [
        { label: t('cancelRoom'), onClick: (c) => { answered = true; c.close(); resolve(false); } },
        { label: t('understood'), icon: 'check', primary: true, onClick: (c) => { answered = true; app.store.set({ seenOnlineNotice2: true }); c.close(); resolve(true); } },
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

/** המסך הראשי של "חבר" */
export function openFriendHub(app) {
  // כבר מחכים לחבר בחדר שפתחת — מציגים שוב את ההזמנה
  const cur = app.online.room;
  if (cur && cur.isPlayer && !cur.hasGuest) return openWaitingRoom(app, cur);
  let tc = app.store.get('timeControl') ?? 0;
  let color = app.store.get('onlineColor') || 'w';
  const codeIn = h('input', {
    class: 'code-in', type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
    maxlength: '7', placeholder: 'ABC-234', dir: 'ltr', 'aria-label': t('codeLabel'),
  });
  codeIn.addEventListener('input', () => { const c = normCode(codeIn.value); codeIn.value = c.length > 3 ? `${c.slice(0, 3)}-${c.slice(3)}` : c; });
  codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinCode(); });
  const body = h('div', { class: 'friend' },
    h('section', { class: 'fr-card online' },
      h('h3', {}, ...withIcon('globe', t('onlineFriend'), 18)),
      h('p', { class: 'muted small' }, t('onlineDesc')),
      h('div', { class: 'fr-label' }, t('yourPieces')),
      segment([['w', t('white')], ['b', t('black')], ['random', t('randomColor')]], color, (v) => { color = v; }),
      h('button', { class: 'btn primary tap wide', onclick: () => create() }, icon('link', { size: 20 }), h('span', {}, t('createInvite'))),
      h('div', { class: 'fr-label' }, t('joinWithCode')),
      h('div', { class: 'code-row' }, codeIn, h('button', { class: 'btn tap', onclick: () => joinCode() }, icon('play', { size: 18 }), h('span', {}, t('join'))))),
    h('section', { class: 'fr-card' },
      h('h3', {}, ...withIcon('device', t('onDevice'), 18)),
      h('p', { class: 'muted small' }, t('friendDesc')),
      h('div', { class: 'fr-label' }, t('timeControl')),
      segment([[0, t('noClock')], ...TIME_CONTROLS.map((x) => [x.id, tn(x.label, x.labelEn)])], tc, (v) => { tc = v; }),
      h('button', { class: 'btn tap wide', onclick: async () => { if (await app.confirmLeave()) { m.close(); app.startFriendGame(tc); } } }, icon('play', { size: 20 }), h('span', {}, t('startGame')))));
  const m = app.ui.modal({ title: t('friendTitle'), titleIcon: 'users', body });

  async function create() {
    if (!(await ensureNotice(app))) return;
    if (!(await app.confirmLeave())) return;
    app.store.set({ onlineColor: color });
    m.close();
    app.ui.toast(t('connecting'), { icon: 'globe' });
    try {
      const room = await app.online.host(color);
      openWaitingRoom(app, room);
    } catch (e) {
      console.warn('online host failed', e);
      app.ui.toast(errText(e), { kind: 'bad', duration: 4500 });
    }
  }

  async function joinCode() {
    const code = normCode(codeIn.value);
    if (!validCode(code)) { app.ui.toast(t('badCode'), { kind: 'bad' }); codeIn.focus(); return; }
    m.close();
    await joinFlow(app, code, false);
  }
  return m;
}

/** הצטרפות לחדר (מקוד או מקישור). אם החדר מלא — מציעים לצפות */
export async function joinFlow(app, code, watch = false) {
  if (app.online.room?.code === code) return;
  if (!(await ensureNotice(app))) return;
  if (!(await app.confirmLeave())) return;
  app.ui.toast(t('connecting'), { icon: 'globe' });
  try {
    await app.online.join(code, { watch });
    if (app.mode === 'watch') app.ui.toast(t('watching'), { icon: 'eye' });
  } catch (e) {
    if (e?.code === 'full' && !watch) {
      if (await app.ui.confirm(t('roomFullWatch'), t('watchGame'))) await joinFlow(app, code, true);
      return;
    }
    console.warn('online join failed', e);
    app.ui.toast(errText(e), { kind: 'bad', duration: 4500 });
  }
}

export function joinFromLink(app, raw, watch = false) {
  const code = normCode(raw);
  if (!validCode(code)) { app.ui.toast(t('badCode'), { kind: 'bad' }); return null; }
  return joinFlow(app, code, watch);
}

/** חדר ההמתנה: קוד גדול, שיתוף, קישור לצופים. נסגר לבד כשהחבר נכנס */
export function openWaitingRoom(app, room) {
  const url = inviteUrl(room.code);
  const codeBtn = h('button', {
    class: 'room-code tap', dir: 'ltr', 'aria-label': `${t('codeLabel')}: ${room.code.split('').join(' ')}`,
    onclick: async () => { if (await copyText(room.code)) app.ui.toast(t('codeCopied'), { icon: 'check' }); },
  }, prettyCode(room.code));
  const body = h('div', { class: 'waiting' },
    h('div', { class: 'hero-ic pulse', 'aria-hidden': 'true' }, icon('users', { size: 50 })),
    h('p', {}, t('waitingHint')),
    h('div', { class: 'fr-label' }, t('codeLabel')),
    codeBtn,
    h('div', { class: 'link-box', dir: 'ltr' }, url),
    h('button', { class: 'btn primary tap wide', onclick: () => shareInvite(room) }, icon('share', { size: 20 }), h('span', {}, t('shareInvite'))),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn tap', onclick: async () => { if (await copyText(`${t('inviteText').replace('{code}', prettyCode(room.code))}\n${url}`)) app.ui.toast(t('linkCopied'), { icon: 'check' }); } }, icon('link', { size: 18 }), h('span', {}, t('copyLink'))),
      h('button', { class: 'btn tap', onclick: async () => { if (await copyText(inviteUrl(room.code, true))) app.ui.toast(t('watchLinkCopied'), { icon: 'eye' }); } }, icon('eye', { size: 18 }), h('span', {}, t('inviteWatchers')))));
  return app.ui.modal({
    title: t('waitingFriend'), titleIcon: 'globe', body, center: true, className: 'waiting-modal',
    actions: [{ label: t('cancelRoom'), icon: 'close', onClick: async (c) => { c.close(); await app.online.detach({ remove: true }); app.exitOnline(); } }],
  });
}

/** אימוג'י בזמן משחק (גם לצופים) — סט קבוע, בלי טקסט חופשי */
export function openEmotePicker(app) {
  if (!app.online.active) return null;
  const row = h('div', { class: 'emote-row' }, ...ONLINE.emotes.map(([id, ic]) => h('button', {
    class: 'emote-btn tap', 'aria-label': id, onclick: () => { m.close(); app.online.sendEmote(id); },
  }, icon(ic, { size: 40 }))));
  const m = app.ui.modal({ title: t('emotes'), titleIcon: 'smile', body: row, center: true });
  return m;
}
