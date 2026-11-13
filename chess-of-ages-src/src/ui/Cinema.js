/**
 * בית הקולנוע המרכזי: הסיפור וההסברים לא נכפים בכניסה — מי שרוצה נכנס לקולנוע באי המרכזי.
 * "הסיפור": סרט קצר שנבנה מהמשחק עצמו (המצלמה טסה מעל מפת העולם, האווטאר שלך רוכב על החיה,
 * פיראטי הזמן והמוזיאון) עם כתוביות — כמעט בלי משקל להורדה.
 * "הפרימיום": סרט קצר על טבעת איי הפרימיום, 3 העולמות, הבוסים, דרקון השעונים והיהלומים הכפולים,
 *   ובסופו כרטיס סיום עם כפתור סגירה בלבד (שום דבר לא נקנה ולא נפתח מהסרט עצמו).
 * "איך משחקים": משחק מודרך קצר ליד השולחן.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { h } from './UI.js';
import { t, tn, getLang } from './i18n.js';
import { MEDIA_URL } from '../config/AppConfig.js';
import { icon } from './icons.js';
import { fullLogoSVG } from './logo.js';
import * as CloudWipe from './CloudWipe.js';
import { HUB_ID, PREMIUM_FIRST, isBoss } from '../config/Islands.js';
import { islandPos, premiumPos } from '../scene/WorldMap.js';
import { buildPetRig, tickRig } from '../scene/PetCompanion3D.js';
import { makeMonument } from '../scene/Monuments.js';

const V3 = THREE.Vector3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const P = (id, dx = 0, dy = 0, dz = 0) => islandPos(id).add(new V3(dx, dy, dz));

function shots() {
  return [
    { he: 'באמצע אוקיינוס הזמן שוכן האי המרכזי — מוזיאון הזמן.', en: 'In the middle of the Ocean of Time lies the Central Island — the Time Museum.',
      from: new V3(0, 34, 58), to: new V3(0, 8.5, 15), lookFrom: new V3(0, 0, 0), lookTo: new V3(0, 0.6, 0), dur: 6 },
    { he: 'סביבו 99 איים, וכל אחד קפוא בעידן משלו — מעידן הקרח ועד הכוכבים.', en: 'Around it lie 99 islands, each frozen in its own era — from the Ice Age to the stars.',
      from: P(1, 7, 7, 10), to: P(19, 6, 6, 9), lookFrom: P(4), lookTo: P(21), dur: 7 },
    { he: 'בכל אי שולט רב-אמן בשחמט, עם לבוש וחיה משלו.', en: 'Each island is ruled by a chess master with their own outfit and pet.', orbit: [12, 33, 64], dur: 2.7 },
    { he: 'רוכבים על החיה שלכם מאי לאי ומאתגרים אותם.', en: 'Ride your companion from island to island and challenge them.', ride: [HUB_ID, 2] },
    { he: 'מנצחים — והשליט מצטרף למוזיאון. אבל פיראטי הזמן תופסים את האי שהתרוקן…', en: 'Win, and the ruler joins your museum — but the Time Pirates seize the empty island…',
      from: P(6, 5, 4.5, 7), to: P(9, -4, 3.5, 6), lookFrom: P(7), lookTo: P(9), dur: 6.5, pirates: true },
    { he: 'חוזרים מתי שרוצים, מגרשים אותם בשביל יהלומים — ובונים את מוזיאון כל העידנים.', en: 'Come back any time, drive them off for gems — and build the museum of all ages.',
      from: P(1, -8, 6, 10), to: P(1, 0, 3.4, 7.5), lookFrom: P(1), lookTo: P(1, 0, 0.8, 0), dur: 6 },
  ];
}

/** טבעת איי הפרימיום סביב העולם: k = מקום האי בטבעת (0–29, גם שבר), r רדיוס, y גובה */
const RING_R = premiumPos(PREMIUM_FIRST).setY(0).length();
const ring = (k, r = RING_R, y = 0) => { const th = -Math.PI / 2 + (k / 30) * Math.PI * 2; return new V3(Math.cos(th) * r, y, Math.sin(th) * r); };

function premiumShots() {
  const R = RING_R;
  return [
    { he: 'מעבר ל-99 האיים מחכה טבעת זהב של 30 איים חדשים: איי הפרימיום.', en: 'Beyond the 99 islands waits a golden ring of 30 new islands: the Premium Islands.',
      from: new V3(0, 30, 26), to: ring(0, R - 9, 6.5), lookFrom: new V3(0, 0, -4), lookTo: ring(0, R, 0.4), dur: 5.5, sfx: 'whoosh' },
    // כל עולם: סיבוב קרוב סביב שני איים שלו
    { he: 'ממלכות הפלא: אי השעונים, אי הממתקים ועוד שמונה איים.', en: 'Wonder Realms: Clockwork Isle, Candy Isle and eight more.', orbit: [106, 107], dur: 2, sfx: 'chime' },
    { he: 'ממלכות החלום: אי הספרייה, אי השונית ועוד שמונה איים.', en: 'Dream Realms: Library Isle, Reef Isle and eight more.', orbit: [111, 114], dur: 2, sfx: 'chime' },
    { he: 'ממלכות הזניט: אי הפורצלן, אי הצעצועים ועוד שמונה איים.', en: 'Zenith Realms: Porcelain Isle, Toy Isle and eight more.', orbit: [120, 121], dur: 2, sfx: 'chime' },
    { he: 'בוטים חזקים במיוחד ושלושה בוסים חדשים.', en: 'Extra-strong bots and three new bosses.', orbit: [109, 119, 129], dur: 2.3, sfx: 'hit' },
    { he: 'בונוס: דרקון השעונים הזהוב מצטרף אליך כחיית מחמד.', en: 'Bonus: the Golden Clockwork Dragon joins you as a pet.',
      from: P(HUB_ID, 5.5, 3.4, 7), to: P(HUB_ID, -5, 3.0, 6.5), lookFrom: P(HUB_ID, 0, 2.2, 0), lookTo: P(HUB_ID, 0, 2.3, 0), dur: 5.5, dragon: true, sfx: 'dragon' },
    { he: 'יהלומים כפולים לשבוע: x2 על כל ניצחון נגד בוטים ופיראטי הזמן.', en: 'Double gems for a week: x2 on every win against bots and the Time Pirates.',
      from: P(HUB_ID, 0, 7, 11), to: P(HUB_ID, 0, 13, 17), lookFrom: P(HUB_ID, 0, 0.6, 0), lookTo: P(HUB_ID, 0, 0.4, 0), dur: 4.5, x2: true, sfx: 'gems' },
  ];
}

/** דרקון השעונים הזהוב חג מעל האי המרכזי במפה (רק בזמן הסרט) */
function addDragon(map) {
  const rig = buildPetRig('clockwork_dragon');
  rig.root.scale.setScalar(1.5);
  const g = new THREE.Group();
  g.add(rig.root);
  map.scene.add(g);
  const hub = islandPos(HUB_ID);
  const tick = (time, dms) => {
    const a = time * 0.7;
    g.position.set(hub.x + Math.cos(a) * 2.6, 2.5 + Math.sin(time * 1.6) * 0.2, hub.z + Math.sin(a) * 2.6);
    g.rotation.set(0, -a, -0.12);
    tickRig(rig, Math.min(0.05, (dms || 16) / 1000), time, { flapPh: time * 6, flapAmp: 0.6 });
  };
  gsap.ticker.add(tick);
  return { remove() { gsap.ticker.remove(tick); map.scene?.remove(g); } };
}

/** הטריילר (30 שניות, בשפת המשחק): התמונה במשחק, הסרטון נטען מהאתר רק כשלוחצים */
const trailerLang = () => (getLang() === 'he' ? 'he' : 'en');
const trailerSrc = () => `${MEDIA_URL}trailer-${trailerLang()}-game.mp4`;
const trailerPoster = () => `./cinema/trailer-${trailerLang()}.jpg`;

/** נגן הטריילר על כל המסך. המוזיקה וצלילי הרקע של המשחק שותקים בינתיים; X / Esc / סוף הסרטון — חזרה לקולנוע */
export function playTrailer(app) {
  const snd = app.sound;
  const prevFocus = document.activeElement;
  const video = h('video', { src: trailerSrc(), poster: trailerPoster(), controls: true, playsinline: true, 'webkit-playsinline': true, preload: 'auto', controlslist: 'nodownload nofullscreen noremoteplayback', disablepictureinpicture: true });
  const msg = h('p', { class: 'trailer-msg', role: 'status', hidden: true }, t('trailerOffline'));
  const closeBtn = h('button', { class: 'trailer-close tap', type: 'button', 'aria-label': t('close') }, icon('close', { size: 20 }));
  const root = h('div', { class: 'trailer-player', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('trailerLabel') }, video, msg, closeBtn);
  const quiet = (on) => {
    if (!snd) return;
    snd.filmOn = on;
    if (snd.ctx && snd.ambBus) snd.ambBus.gain.setTargetAtTime(on ? 0 : snd.ambOn ? 0.55 : 0, snd.ctx.currentTime, 0.15);
  };
  let closed = false;
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const close = () => {
    if (closed) return;
    closed = true;
    try { video.pause(); video.removeAttribute('src'); video.load(); } catch { /* ok */ }
    root.remove();
    quiet(false);
    document.removeEventListener('keydown', onKey, true);
    if (prevFocus?.isConnected) prevFocus.focus?.({ preventScroll: true });
  };
  const offline = () => { msg.hidden = false; video.hidden = true; };
  closeBtn.onclick = close;
  video.addEventListener('ended', close);
  video.addEventListener('error', offline);
  document.addEventListener('keydown', onKey, true);
  document.getElementById('app').appendChild(root);
  quiet(true);
  if (navigator.onLine === false) offline();
  else video.play().catch(() => { /* אם ההפעלה האוטומטית נחסמה — כפתורי הנגן נשארים */ });
  setTimeout(() => closeBtn.focus(), 60);
}

/** בחירה: הטריילר (המסך הגדול) / הסיפור / הפרימיום / איך משחקים */
export function openCinema(app) {
  const card = (ic, title, desc, onClick) => h('button', { class: 'cinema-card tap', onclick: onClick }, h('span', { class: 'cc-ic' }, icon(ic, { size: 34 })), h('span', { class: 'cc-t' }, h('b', {}, title), h('small', {}, desc)));
  let ctl = null;
  const body = h('div', { class: 'cinema-pick' },
    // המסך הגדול של הקולנוע: הטריילר — נגיעה מפעילה אותו
    h('button', { class: 'cinema-screen trailer tap', type: 'button', 'aria-label': t('trailerPlay'), onclick: () => playTrailer(app) },
      h('img', { src: trailerPoster(), alt: '', draggable: 'false' }),
      h('span', { class: 'cs-play', 'aria-hidden': 'true' }, h('i')),
      h('b', { class: 'cs-label', 'aria-hidden': 'true' }, t('trailerLabel'))),
    card('play', t('storyFilm'), t('storyDesc'), () => { ctl?.close(); playStory(app); }),
    card('crown', t('premiumFilm'), t('premiumFilmDesc'), () => { ctl?.close(); playPremium(app); }),
    card('bulb', t('howToPlay'), t('howToDesc'), () => { ctl?.close(); app.startTutorial(); }));
  ctl = app.ui.modal({ title: t('cinemaTitle'), titleIcon: 'play', center: true, body, actions: [{ label: t('close'), onClick: (c) => c.close() }] });
}

function overlay(label = t('storyFilm')) {
  const cap = h('div', { class: 'film-cap', 'aria-live': 'polite' });
  const skip = h('button', { class: 'film-skip tap' }, t('skip'), icon('play', { size: 14 }));
  const titleBox = h('div', { class: 'film-title', hidden: true });
  const x2 = h('div', { class: 'film-x2', 'aria-hidden': 'true' }, icon('gem', { size: 36 }), h('b', {}, 'x2'));
  const root = h('div', { class: 'film', role: 'dialog', 'aria-label': label }, h('i', { class: 'bar top' }), h('i', { class: 'bar bottom' }), cap, x2, titleBox, skip);
  document.getElementById('app').appendChild(root);
  return {
    root, skip,
    caption(text) { cap.classList.remove('in'); void cap.offsetWidth; cap.textContent = text; cap.classList.add('in'); },
    title() { titleBox.innerHTML = fullLogoSVG({ width: 340 }); titleBox.hidden = false; cap.textContent = ''; },
    /** תג "x2" עם יהלום שקופץ למסך (סרט הפרימיום) */
    x2(on) { x2.classList.toggle('in', on); },
    /** כרטיס הסיום של סרט הפרימיום: מה זה, שזה בכסף אמיתי, שהמאיץ נפרד — וכפתור סגירה בלבד */
    end({ title, sub, paid, note, close }) {
      return new Promise((resolve) => {
        const logo = h('div', { class: 'fe-logo', 'aria-hidden': 'true' });
        logo.innerHTML = fullLogoSVG({ width: 300 });
        const no = h('button', { class: 'btn primary tap', onclick: () => resolve() }, close);
        titleBox.replaceChildren(h('div', { class: 'film-end' }, logo, h('b', { class: 'fe-t' }, title), h('p', { class: 'fe-s' }, sub),
          paid ? h('p', { class: 'fe-paid' }, paid) : null, note ? h('p', { class: 'fe-s fe-note' }, note) : null, h('div', { class: 'fe-btns' }, no)));
        titleBox.hidden = false; cap.textContent = ''; skip.hidden = true; x2.classList.remove('in');
        root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); resolve(); } }, true);
        setTimeout(() => no.focus(), 60);
      });
    },
    remove() { root.remove(); },
  };
}

/** תנועת מצלמה אחת בסרט */
function camShot(map, from, to, lookFrom, lookTo, dur, state) {
  return new Promise((resolve) => {
    const st = { k: 0 };
    const look = new V3();
    state.tween = gsap.to(st, {
      k: 1, duration: dur, ease: 'sine.inOut',
      onUpdate: () => { map.camera.position.lerpVectors(from, to, st.k); look.lerpVectors(lookFrom, lookTo, st.k); map.camera.lookAt(look); map.lookAt.copy(look); },
      onComplete: resolve,
    });
    state.done = resolve;
  });
}

/** הסרט: "הסיפור של מוזיאון הזמן" */
export async function playStory(app) {
  if (app.busy || app.map.isOpen) return;
  app.busy = true;
  const map = app.map;
  const state = { skipped: false };
  let ship = null;
  try {
    await CloudWipe.cover(0.5);
    map.open({ focus: HUB_ID, travel: true });
    map.filmMode = true;
    map.placeTraveler(HUB_ID);
    map.labels.forEach((l) => { l.visible = false; });
    map.nextRing.visible = false;
    map.fogPuffs.visible = false;
    const ov = overlay();
    ov.skip.onclick = () => { state.skipped = true; state.tween?.kill(); state.done?.(); if (map.flight) { map.flight.speed = 6; } };
    // [a11y] keyboard: focus starts on Skip and Esc skips too; the focus goes back when the film ends
    const prevFocus = document.activeElement;
    ov.root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !state.skipped) { e.preventDefault(); e.stopPropagation(); ov.skip.click(); } });
    setTimeout(() => ov.skip.focus(), 60);
    const removeOv = ov.remove;
    ov.remove = () => { removeOv(); if (prevFocus?.isConnected && prevFocus.focus) prevFocus.focus(); };
    app.sound.fanfare?.();
    await CloudWipe.reveal(0.6);
    for (const s of shots()) {
      if (state.skipped) break;
      ov.caption(tn(s.he, s.en));
      if (s.ride) {
        map.camera.position.copy(P(s.ride[0], 3, 3.5, 6));
        map.camera.lookAt(P(s.ride[0]));
        await map.travel(s.ride[0], s.ride[1], { hud: false });
        map.endTravel();
        continue;
      }
      if (s.pirates) {
        map.showDemoPirates([7, 9]);
        ship = makeMonument('pirateShip', 0.42);
        const a = P(7).lerp(P(8), 0.5).setY(-0.15);
        ship.position.copy(a);
        ship.rotation.y = 1.2;
        map.scene.add(ship);
        gsap.to(ship.position, { x: a.x + 1.6, z: a.z + 0.8, duration: s.dur, ease: 'none' });
      }
      if (s.orbit) {
        for (const id of s.orbit) {
          if (state.skipped) break;
          await camShot(map, P(id, 2.6, 1.6, 3.2), P(id, -2.4, 1.3, 3.0), P(id, 0, 0.6, -0.4), P(id, 0, 0.6, -0.4), s.dur, state);
        }
        continue;
      }
      await camShot(map, s.from, s.to, s.lookFrom, s.lookTo, s.dur, state);
    }
    ov.title();
    app.sound.victory?.();
    if (!state.skipped) await sleep(2800); else await sleep(600);
    await CloudWipe.cover(0.5);
    ov.remove();
  } finally {
    if (ship) map.scene?.remove(ship);
    map.filmMode = false;
    if (map.isOpen) map.close();
    app.busy = false;
    map.refresh?.();
    CloudWipe.reveal(0.6);
  }
}

/** הסרט: "הפרימיום" — טבעת איי הפרימיום, 3 העולמות, הבוסים, דרקון השעונים והיהלומים הכפולים */
export async function playPremium(app) {
  if (app.busy || app.map.isOpen) return;
  app.busy = true;
  const map = app.map;
  const state = { skipped: false };
  let dragon = null, score = null;
  const snd = app.sound;
  let chimeN = 0;
  // צליל לכל שוט: וּוּש במעבר, פעמון לכל אי, מכה לבוס, שאגת הדרקון, צלצול קצר ליהלומים הכפולים
  const sfx = (kind) => {
    if (kind === 'whoosh') snd.whoosh?.(2.6);
    else if (kind === 'chime') { snd.whoosh?.(0.8); snd.chime?.(chimeN++); }
    else if (kind === 'hit') snd.filmHit?.();
    else if (kind === 'dragon') { snd.whoosh?.(1.4); snd.petVoice?.('dragon'); }
    else if (kind === 'gems') { snd.chime?.(2); setTimeout(() => { if (!state.skipped) snd.chime?.(3); }, 170); }
  };
  try {
    await CloudWipe.cover(0.5);
    map.open({ focus: HUB_ID, travel: true });
    map.filmMode = true;
    map.labels.forEach((l) => { l.visible = false; });
    map.nextRing.visible = false;
    map.fogPuffs.visible = false;
    map.worldSigns?.forEach((w) => { w.visible = false; }); // השלטים חוזרים כשהמפה נסגרת
    if (map.goldSign) map.goldSign.visible = false;
    const ov = overlay(t('premiumFilm'));
    ov.skip.onclick = () => { state.skipped = true; state.tween?.kill(); state.done?.(); score?.stop(0.5); };
    // [a11y] כמו בסיפור: המיקוד מתחיל על "דלג", Esc מדלג, והמיקוד חוזר בסוף
    const prevFocus = document.activeElement;
    ov.root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !state.skipped && !ov.skip.hidden) { e.preventDefault(); e.stopPropagation(); ov.skip.click(); } });
    setTimeout(() => ov.skip.focus(), 60);
    const removeOv = ov.remove;
    ov.remove = () => { removeOv(); if (prevFocus?.isConnected && prevFocus.focus) prevFocus.focus(); };
    app.sound.fanfare?.();
    await CloudWipe.reveal(0.6);
    score = snd.filmScore?.(14) || null;
    for (const s of premiumShots()) {
      if (state.skipped) break;
      ov.caption(tn(s.he, s.en));
      if (s.dragon && !dragon) dragon = addDragon(map);
      if (s.orbit) {
        for (const id of s.orbit) {
          if (state.skipped) break;
          sfx(s.sfx);
          const b = isBoss(id) ? 1 : 0.84; // איי הפרימיום הרגילים קטנים מהבוסים — המצלמה קרובה יותר
          await camShot(map, P(id, 2.0 * b, 1.2 * b, 2.4 * b), P(id, -1.9 * b, 1.0 * b, 2.3 * b), P(id, 0, 0.45 * b, -0.2), P(id, 0, 0.45 * b, -0.2), s.dur, state);
        }
        continue;
      }
      if (s.x2) ov.x2(true);
      sfx(s.sfx);
      await camShot(map, s.from, s.to, s.lookFrom, s.lookTo, s.dur, state);
    }
    app.sound.victory?.();
    // דילוג מגיע ישר לכרטיס הסיום (סגירה בלבד — הסרט לא פותח חנות ולא מוכר)
    await ov.end({ title: t('fullTitle'), sub: t('premiumOneTime'), paid: t('premiumPaid'), note: t('premiumBoosterSep'), close: t('close') });
    score?.stop(0.6);
    await CloudWipe.cover(0.5);
    ov.remove();
  } finally {
    score?.stop(0.3);
    dragon?.remove();
    map.filmMode = false;
    if (map.isOpen) map.close();
    app.busy = false;
    map.refresh?.();
    CloudWipe.reveal(0.6);
  }
}
