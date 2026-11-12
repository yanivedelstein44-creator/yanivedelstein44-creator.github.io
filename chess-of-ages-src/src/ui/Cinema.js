/**
 * בית הקולנוע המרכזי: הסיפור וההסברים לא נכפים בכניסה — מי שרוצה נכנס לקולנוע באי המרכזי.
 * "הסיפור": סרט קצר שנבנה מהמשחק עצמו (המצלמה טסה מעל מפת העולם, האווטאר שלך רוכב על החיה,
 * פיראטי הזמן והמוזיאון) עם כתוביות — כמעט בלי משקל להורדה.
 * "איך משחקים": משחק מודרך קצר ליד השולחן.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { h } from './UI.js';
import { t, tn } from './i18n.js';
import { icon } from './icons.js';
import { fullLogoSVG } from './logo.js';
import * as CloudWipe from './CloudWipe.js';
import { HUB_ID } from '../config/Islands.js';
import { islandPos } from '../scene/WorldMap.js';
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

/** בחירה: הסיפור / איך משחקים */
export function openCinema(app) {
  const card = (ic, title, desc, onClick) => h('button', { class: 'cinema-card tap', onclick: onClick }, h('span', { class: 'cc-ic' }, icon(ic, { size: 34 })), h('span', { class: 'cc-t' }, h('b', {}, title), h('small', {}, desc)));
  let ctl = null;
  const body = h('div', { class: 'cinema-pick' },
    h('div', { class: 'cinema-screen', 'aria-hidden': 'true' }, (() => { const el = h('div', { class: 'cs-logo' }); el.innerHTML = fullLogoSVG({ width: 220 }); return el; })()),
    card('play', t('storyFilm'), t('storyDesc'), () => { ctl?.close(); playStory(app); }),
    card('bulb', t('howToPlay'), t('howToDesc'), () => { ctl?.close(); app.startTutorial(); }));
  ctl = app.ui.modal({ title: t('cinemaTitle'), titleIcon: 'play', center: true, body, actions: [{ label: t('close'), onClick: (c) => c.close() }] });
}

function overlay() {
  const cap = h('div', { class: 'film-cap', 'aria-live': 'polite' });
  const skip = h('button', { class: 'film-skip tap' }, t('skip'), icon('play', { size: 14 }));
  const titleBox = h('div', { class: 'film-title', hidden: true });
  const root = h('div', { class: 'film', role: 'dialog', 'aria-label': t('storyFilm') }, h('i', { class: 'bar top' }), h('i', { class: 'bar bottom' }), cap, titleBox, skip);
  document.getElementById('app').appendChild(root);
  return {
    root, skip,
    caption(text) { cap.classList.remove('in'); void cap.offsetWidth; cap.textContent = text; cap.classList.add('in'); },
    title() { titleBox.innerHTML = fullLogoSVG({ width: 340 }); titleBox.hidden = false; cap.textContent = ''; },
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
