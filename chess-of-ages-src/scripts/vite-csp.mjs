/**
 * Content-Security-Policy for the web build (GitHub Pages / PWA).
 *
 * GitHub Pages can't send response headers, so the policy goes in a <meta http-equiv> tag. That also means
 * frame-ancestors, report-uri and X-Frame-Options are impossible here (browsers ignore them in <meta>).
 *
 * index.html: the first script in <head> installs the policy at runtime:
 *   • only on *.github.io and *.pages.dev (plus hostnames in VITE_CSP_HOSTS), or anywhere with ?csp=1 (tests);
 *   • never inside the Android app: on WebViews without DOCUMENT_START_SCRIPT, Capacitor injects its bridge as an
 *     inline <script> right after <head>, and a strict policy would block it and break plugins and OTA updates;
 *   • not on other hosts (local dev, the Claude artifact preview), which may add scripts of their own.
 * Inline scripts are allowed by SHA-256 hash, computed here at build time, so editing them needs no manual step.
 *
 * Static pages copied from public/ (privacy, terms, licenses, accessibility …) get a static <meta> policy, with
 * the same hash treatment for any inline script, in writeBundle — before the OTA zip is made in closeBundle.
 *
 * Known trade-offs (documented): style-src allows 'unsafe-inline' (GSAP and the UI set inline styles);
 * the Realtime Database long-polling fallback (hidden iframes + javascript: URLs) is blocked, so
 * a browser without WebSockets can't play online on the web build.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const INLINE_SCRIPT = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
const sha256 = (text) => `'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`;
export const inlineScriptHashes = (html) => [...new Set([...html.matchAll(INLINE_SCRIPT)].map((m) => sha256(m[1])))];

/** Firebase (anonymous Auth + Realtime Database over WebSocket) — the only third-party hosts the game talks to */
const FIREBASE = [
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://*.firebasedatabase.app',
  'wss://*.firebasedatabase.app',
  'https://*.firebaseio.com',
  'wss://*.firebaseio.com',
];

const common = [
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  'upgrade-insecure-requests',
];

/** The game page. extraConnect: origins of a cross-origin update host (VITE_UPDATE_BASE etc.), if any */
export function gamePolicy(hashes = [], extraConnect = []) {
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    `connect-src 'self' ${[...FIREBASE, ...extraConnect].join(' ')}`,
    // the chess AI runs in an inlined worker (Vite ?worker&inline: blob: URL, data: URL as fallback)
    "worker-src 'self' blob: data:",
    "manifest-src 'self'",
    ...common,
  ].join('; ');
}

/** Static pages (legal, statements) */
export function pagePolicy(hashes = []) {
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    ...common,
  ].join('; ');
}

const REFERRER = '<meta name="referrer" content="strict-origin-when-cross-origin" />';
const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** Inserts tags right after <head> (or after <meta charset> when it comes first) */
function injectIntoHead(html, tags) {
  const charset = html.match(/<head[^>]*>\s*<meta\s+charset[^>]*>/i);
  if (charset) return html.replace(charset[0], `${charset[0]}\n    ${tags}`);
  return html.replace(/<head[^>]*>/i, (m) => `${m}\n    ${tags}`);
}

/**
 * Hosts where the policy is installed: GitHub Pages and Cloudflare Pages by default, plus any hostnames listed in
 * VITE_CSP_HOSTS (comma-separated) at build time — e.g. a custom domain later.
 */
export function hostPattern(extra = '') {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hosts = ['github.io', 'pages.dev', ...String(extra).split(',').map((h) => h.trim().toLowerCase()).filter((h) => /^[a-z0-9.-]+$/.test(h))];
  return `(^|\\.)(${hosts.map(esc).join('|')})$`;
}

/** Origins (scheme://host) of absolute http(s) URLs that differ from the site itself */
export function originsOf(...urls) {
  const out = new Set();
  for (const u of urls) {
    try { const x = new URL(u); if (x.protocol === 'https:') out.add(x.origin); } catch { /* relative or empty — same origin */ }
  }
  return [...out];
}

function installerScript(policy, hostSrc = hostPattern()) {
  // ES5 on purpose: runs before anything else, in every browser that can open the page
  return `<script>/* CSP (web build only) - see scripts/vite-csp.mjs */(function(){try{var l=location,h=new RegExp(${JSON.stringify(hostSrc)});`
    + `if(window.Capacitor||!(h.test(l.hostname)||/[?&]csp=1(&|$)/.test(l.search)))return;`
    + `var m=document.createElement('meta');m.httpEquiv='Content-Security-Policy';m.content=${JSON.stringify(policy)};`
    + `document.head.appendChild(m);document.documentElement.setAttribute('data-csp','on');`
    + `document.addEventListener('securitypolicyviolation',function(e){try{console.warn('[CSP] blocked',e.violatedDirective,e.blockedURI||'inline')}catch(_){}});`
    + `}catch(e){}})();</script>`;
}

export function cspPlugin() {
  let outDir, extraConnect = [], hostSrc = hostPattern();
  return {
    name: 'chess-of-ages-csp',
    enforce: 'post',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
      const env = c.env || {};
      // the Play channel may fetch updates from another host later (e.g. Cloudflare Pages) — allow that origin
      extraConnect = originsOf(env.VITE_UPDATE_BASE, env.VITE_UPDATE_URL, env.VITE_PUBLIC_URL);
      hostSrc = hostPattern(env.VITE_CSP_HOSTS);
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (/http-equiv=["']Content-Security-Policy/i.test(html) || html.includes('data-csp')) return html;
        const policy = gamePolicy(inlineScriptHashes(html), extraConnect);
        const tags = [installerScript(policy, hostSrc), html.includes('name="referrer"') ? '' : REFERRER].filter(Boolean).join('\n    ');
        return injectIntoHead(html, tags);
      },
    },
    writeBundle() {
      if (!outDir || !fs.existsSync(outDir)) return;
      const pages = fs.readdirSync(outDir, { recursive: true })
        .map((f) => String(f).split(path.sep).join('/'))
        .filter((f) => f.endsWith('.html') && f !== 'index.html' && !f.startsWith('update/'));
      for (const f of pages) {
        const file = path.join(outDir, f);
        const html = fs.readFileSync(file, 'utf8');
        if (/http-equiv=["']Content-Security-Policy/i.test(html) || !/<head[^>]*>/i.test(html)) continue;
        const meta = `<meta http-equiv="Content-Security-Policy" content="${attr(pagePolicy(inlineScriptHashes(html)))}" />`;
        fs.writeFileSync(file, injectIntoHead(html, [meta, html.includes('name="referrer"') ? '' : REFERRER].filter(Boolean).join('\n    ')));
      }
    },
  };
}
