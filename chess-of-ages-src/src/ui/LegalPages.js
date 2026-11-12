/**
 * The public legal pages (privacy, terms, accessibility statement, open-source licenses) shown inside
 * a modal in an iframe, so players never leave the game. The same files are the public URLs that
 * Google Play links to (privacy.html etc. next to index.html). Contact details live in public/legal-config.js.
 */
import { h } from './UI.js';
import { t, getLang } from './i18n.js';

/** [page file name (without .html), icon, i18n title key] in the order they appear in Settings */
export const LEGAL_PAGES = [
  ['privacy', 'shield', 'lgPrivacy'],
  ['terms', 'doc', 'lgTerms'],
  ['accessibility', 'eye', 'lgAccessibility'],
  ['licenses', 'puzzle', 'lgLicenses'],
];

const TITLE = Object.fromEntries(LEGAL_PAGES.map(([page, , key]) => [page, key]));

/**
 * Opens a legal page in the current language. `section` is an anchor without the language prefix,
 * e.g. openLegalPage(app, 'terms', 'pay') opens terms.html#en-pay (or #he-pay).
 */
export function openLegalPage(app, page = 'privacy', section = '') {
  const lang = getLang() === 'he' ? 'he' : 'en';
  const key = TITLE[page] || 'lgPrivacy';
  const frame = h('iframe', { src: `./${TITLE[page] ? page : 'privacy'}.html#${section ? `${lang}-${section}` : lang}`, title: t(key), class: 'policy-frame', loading: 'lazy' });
  return app.ui.modal({ title: t(key), titleIcon: 'doc', body: frame });
}
