/**
 * Public contact details for the legal pages: privacy.html, terms.html, licenses.html and accessibility.html.
 * This file is the ONLY place to set them. Until a value is filled in it stays a "[PLACEHOLDER]"
 * and the pages highlight it.
 *
 * Usage in a page (no inline script needed, so it works with a strict CSP):
 *   <script src="./legal-config.js" defer></script>
 *   <span data-legal="developer"></span>                     → the developer's name
 *   <span data-legal="email"></span>                         → a mailto: link to the contact email
 *   <time data-legal="updated"></time>                       → the "last updated" date, in the language of the element
 */
window.LEGAL = {
  developer: 'Yaniv Edelstein',
  email: 'yanivedelstein33@gmail.com',
  updated: '2026-11-13',
};

(function () {
  function isPlaceholder(v) {
    return !v || /^\s*\[[^\]]*\]\s*$/.test(String(v));
  }
  function langOf(el) {
    var n = el.closest('[lang]');
    return (n && n.getAttribute('lang')) || document.documentElement.getAttribute('lang') || 'en';
  }
  function formatDate(iso, lang) {
    try {
      var d = new Date(String(iso) + 'T12:00:00');
      if (isNaN(d.getTime())) return String(iso);
      return new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
    } catch (e) {
      return String(iso);
    }
  }
  function fill(root) {
    var L = window.LEGAL || {};
    var nodes = (root || document).querySelectorAll('[data-legal]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-legal');
      var val = L[key];
      var ph = isPlaceholder(val);
      el.classList.toggle('ph', ph);
      if (key === 'email') {
        var text = val || '[CONTACT EMAIL]';
        if (ph) {
          el.textContent = text;
        } else if (el.tagName === 'A') {
          el.setAttribute('href', 'mailto:' + text);
          el.textContent = text;
        } else {
          var a = document.createElement('a');
          a.setAttribute('href', 'mailto:' + text);
          a.textContent = text;
          el.textContent = '';
          el.appendChild(a);
        }
      } else if (key === 'updated') {
        el.textContent = ph ? String(val || '') : formatDate(val, langOf(el));
        if (!ph && el.tagName === 'TIME') el.setAttribute('datetime', String(val));
      } else {
        el.textContent = val == null ? '' : String(val);
      }
    }
  }
  window.LEGAL_FILL = fill;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { fill(); });
  else fill();
})();
