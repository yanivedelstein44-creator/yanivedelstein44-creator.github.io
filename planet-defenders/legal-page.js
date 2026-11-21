/**
 * Shared behavior of the public legal pages of Orbit Defenders (privacy.html, terms.html, accessibility.html,
 * licenses.html), in the pattern of Chess of Ages' legal-page.js:
 *  - "embedded" mode when a page is shown inside an iframe: hides the back link and the page links.
 *  - One language at a time. Hebrew by default (<html data-default-lang="he">; "auto" would follow the browser).
 *    ?lang=he or ?lang=en picks the language (the game's links pass it). A hash such as #he, #en or #he-refunds opens
 *    that language (at that section). Without JavaScript both languages stay visible, Hebrew first.
 * Each language lives in <article data-lang="he|en" data-title="…">. Language links: <a data-set-lang="he|en">.
 * Links to the other legal pages (<a data-keep-lang>) keep the language shown.
 * External file on purpose: no inline script, so it works with a strict Content-Security-Policy.
 */
(function () {
  var root = document.documentElement;
  try { if (window.top !== window.self) root.classList.add('embedded'); } catch (e) { root.classList.add('embedded'); }

  function fromHash() {
    var h = '';
    try { h = decodeURIComponent((location.hash || '').slice(1)); } catch (e) { h = ''; }
    if (h === 'he' || h.indexOf('he-') === 0) return 'he';
    if (h === 'en' || h.indexOf('en-') === 0) return 'en';
    return null;
  }
  function fromQuery() {
    var q = null;
    try { q = new URLSearchParams(location.search).get('lang'); } catch (e) { /* old browser */ }
    return q === 'he' || q === 'en' ? q : null;
  }
  // a section link (#he-refunds) is the most specific wish, then ?lang=, then the page's default
  function wanted() { return fromHash() || fromQuery(); }

  function fallback() {
    var d = root.getAttribute('data-default-lang') || 'he';
    if (d !== 'auto') return d === 'en' ? 'en' : 'he';
    var l = '';
    try { l = String((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase(); } catch (e) { /* old browser */ }
    return (l.indexOf('he') === 0 || l.indexOf('iw') === 0) ? 'he' : 'en';
  }

  var current = null;
  function apply(lang) {
    var arts = document.querySelectorAll('article[data-lang]');
    if (!arts.length) return;
    lang = lang || current || fallback();
    current = lang;
    root.classList.add('one-lang');
    for (var i = 0; i < arts.length; i++) arts[i].hidden = arts[i].getAttribute('data-lang') !== lang;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    var links = document.querySelectorAll('[data-set-lang]');
    for (var j = 0; j < links.length; j++) links[j].setAttribute('aria-current', links[j].getAttribute('data-set-lang') === lang ? 'true' : 'false');
    var art = document.querySelector('article[data-lang="' + lang + '"]');
    if (art && art.getAttribute('data-title')) document.title = art.getAttribute('data-title');
    // keep the links to the other legal pages in the same language
    var pageLinks = document.querySelectorAll('a[data-keep-lang]');
    for (var k = 0; k < pageLinks.length; k++) {
      var base = pageLinks[k].getAttribute('href').split('#')[0].split('?')[0];
      pageLinks[k].setAttribute('href', base + '?lang=' + lang);
    }
  }

  function remember(lang) {
    try { if (history.replaceState) history.replaceState(null, '', location.pathname + '?lang=' + lang); } catch (e) { /* file:// or an old browser */ }
  }

  function init() {
    apply(wanted());
    window.addEventListener('hashchange', function () {
      var w = fromHash();
      if (w && w !== current) apply(w);
    });
    var links = document.querySelectorAll('[data-set-lang]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (ev) {
        var l = this.getAttribute('data-set-lang');
        ev.preventDefault();
        remember(l);
        apply(l);
        var h1 = document.querySelector('article[data-lang="' + l + '"] h1');
        if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
        window.scrollTo(0, 0);
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
