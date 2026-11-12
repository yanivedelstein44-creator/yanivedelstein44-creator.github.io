/**
 * Language button for the top bar (HUD and the map header): globe + the current language code.
 * One tap switches English ↔ Hebrew; the choice is saved by GameApp.toggleLanguage.
 */
import { h } from './UI.js';
import { t, getLang } from './i18n.js';
import { icon } from './icons.js';

export function langButton(onToggle, where = 'hud') {
  const he = getLang() === 'he';
  const code = he ? 'עב' : 'EN';
  // The label names "Language" in both languages, so it is understood whichever language is on screen.
  // It starts with the visible code (EN / עב) so the accessible name contains the visible text (WCAG 2.5.3).
  const label = `${code} · ${t('lngButtonLabel')}`;
  return h('button', {
    class: 'menu-btn lang-btn tap', type: 'button', 'data-where': where,
    'aria-label': label, title: label,
    onclick: (e) => { e.stopPropagation(); onToggle(where); },
  },
  h('span', { class: 'lang-ic', 'aria-hidden': 'true' }, icon('globe', { size: 17 })),
  h('span', { class: 'lang-code', 'aria-hidden': 'true', lang: he ? 'he' : 'en' }, code));
}
