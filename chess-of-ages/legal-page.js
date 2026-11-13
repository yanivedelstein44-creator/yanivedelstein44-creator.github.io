/**
 * Shared behavior of the public legal pages (privacy, terms, licenses, accessibility):
 *  - "embedded" mode when the page is shown inside the game (iframe): hides the back link and page nav.
 *  - One language at a time: English by default (a page can set <html data-default-lang="he">),
 *    the other language with #he / #en (or ?lang=he). Anchors such as #he-rights
 *    open the Hebrew version at that section. Without JavaScript both languages stay visible.
 * Each language lives in <article data-lang="en|he" data-title="…">. Language links: <a data-set-lang="en|he">.
 * External file on purpose — no inline script, so it works with a strict Content-Security-Policy.
 */
(function () {
  var root = document.documentElement;
  try { if (window.top !== window.self) root.classList.add('embedded'); } catch (e) { root.classList.add('embedded'); }

  function wanted() {
    var q = null;
    try { q = new URLSearchParams(location.search).get('lang'); } catch (e) { /* old browser */ }
    if (q === 'he' || q === 'en') return q;
    var h = decodeURIComponent((location.hash || '').slice(1));
    if (h === 'he' || h.indexOf('he-') === 0) return 'he';
    if (h === 'en' || h.indexOf('en-') === 0) return 'en';
    return null;
  }

  var current = null;
  function apply(lang) {
    var arts = document.querySelectorAll('article[data-lang]');
    if (!arts.length) return;
    lang = lang || current || root.getAttribute('data-default-lang') || 'en';
    current = lang;
    root.classList.add('one-lang');
    for (var i = 0; i < arts.length; i++) arts[i].hidden = arts[i].getAttribute('data-lang') !== lang;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    var links = document.querySelectorAll('[data-set-lang]');
    for (var j = 0; j < links.length; j++) links[j].setAttribute('aria-current', links[j].getAttribute('data-set-lang') === lang ? 'true' : 'false');
    var art = document.querySelector('article[data-lang="' + lang + '"]');
    if (art && art.getAttribute('data-title')) document.title = art.getAttribute('data-title');
    // keep links to the other legal pages in the same language
    var pageLinks = document.querySelectorAll('a[data-keep-lang]');
    for (var k = 0; k < pageLinks.length; k++) {
      var base = pageLinks[k].getAttribute('href').split('#')[0];
      pageLinks[k].setAttribute('href', base + '#' + lang);
    }
  }

  function init() {
    apply(wanted());
    window.addEventListener('hashchange', function () {
      var w = wanted();
      if (w && w !== current) apply(w);
    });
    var links = document.querySelectorAll('[data-set-lang]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (ev) {
        var l = this.getAttribute('data-set-lang');
        ev.preventDefault();
        if (history.replaceState) history.replaceState(null, '', '#' + l);
        apply(l);
        var h1 = document.querySelector('article[data-lang="' + l + '"] h1');
        if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: false }); }
        window.scrollTo(0, 0);
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
