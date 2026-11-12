/**
 * [qa] Runtime resilience: keeps the game recoverable when something goes wrong while it runs.
 *
 * - Every uncaught error / unhandled promise rejection goes to a small local log (localStorage, last 20, no network).
 * - A single error never interrupts play. A recovery card (Reload) appears only when the game is really stuck:
 *   errors repeating fast, the render loop not drawing for 20 s while visible, or the GPU context lost and not back.
 * - When the WebGL context is lost and restored, the scene's environment map is rebuilt.
 * The card carries data-recovery so automated tests can see it.
 */
import { t } from '../ui/i18n.js';

const LOG_KEY = 'chess_ages_errlog';
const LOG_MAX = 20;
const BURST_N = 8; // errors…
const BURST_MS = 10000; // …within this window = the game is in a broken state
const STALL_MS = 20000; // visible, not paused, and no frame drawn for this long
const GFX_WAIT_MS = 6000; // context lost and not restored after this long

let installed = false;
let card = null;
let cardKind = null;
const dismissed = new Set();
const recent = [];

const IGNORE = /ResizeObserver loop|Script error\.?$|chrome-extension:|moz-extension:|safari-extension:/i;

function describe(err) {
  if (!err) return { message: 'unknown' };
  if (typeof err === 'string') return { message: err.slice(0, 300) };
  return { message: String(err.message || err).slice(0, 300), stack: err.stack ? String(err.stack).slice(0, 1200) : undefined };
}

/** Appends one entry to the local error log (oldest dropped). Never throws. */
export function logError(kind, err, extra = {}) {
  try {
    const list = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    const arr = Array.isArray(list) ? list : [];
    arr.push({ at: new Date().toISOString(), kind, ver: window.__appVersion || '', ...describe(err), ...extra });
    localStorage.setItem(LOG_KEY, JSON.stringify(arr.slice(-LOG_MAX)));
  } catch { /* storage unavailable or full: the log is best-effort */ }
}

export function readErrorLog() {
  try { const v = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

function noteError(kind, err) {
  const { message } = describe(err);
  if (IGNORE.test(message)) return;
  logError(kind, err);
  const now = Date.now();
  recent.push(now);
  while (recent.length && now - recent[0] > BURST_MS) recent.shift();
  if (recent.length >= BURST_N) showRecovery('errors');
}

const TEXT = {
  errors: ['qaRecTitle', 'qaRecErrors'],
  stall: ['qaRecTitle', 'qaRecStall'],
  gfx: ['qaRecGfxTitle', 'qaRecGfx'],
  boot: ['qaRecTitle', 'qaRecBoot'],
};

/** Shows the recovery card (one at a time). kind: 'errors' | 'stall' | 'gfx' | 'boot'. */
export function showRecovery(kind) {
  if (dismissed.has(kind) && kind !== 'boot') return;
  if (card) { if (cardKind === kind) return; hideRecovery(); }
  const [titleKey, bodyKey] = TEXT[kind] || TEXT.errors;
  const id = `rec-${Date.now()}`;
  const el = document.createElement('div');
  el.className = 'recovery-layer';
  el.setAttribute('data-recovery', kind);
  const box = document.createElement('div');
  box.className = 'recovery-card';
  box.setAttribute('role', 'alertdialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', `${id}-t`);
  box.setAttribute('aria-describedby', `${id}-b`);
  const h = document.createElement('h2');
  h.id = `${id}-t`;
  h.textContent = t(titleKey);
  const p = document.createElement('p');
  p.id = `${id}-b`;
  p.textContent = t(bodyKey);
  const row = document.createElement('div');
  row.className = 'recovery-actions';
  const reload = document.createElement('button');
  reload.type = 'button';
  reload.className = 'btn primary';
  reload.textContent = t('qaRecReload');
  reload.addEventListener('click', () => { try { location.reload(); } catch { /* ignore */ } });
  row.append(reload);
  if (kind !== 'boot') {
    const keep = document.createElement('button');
    keep.type = 'button';
    keep.className = 'btn';
    keep.textContent = t('qaRecClose');
    keep.addEventListener('click', () => { dismissed.add(kind); recent.length = 0; hideRecovery(); });
    row.append(keep);
  }
  box.append(h, p, row);
  el.append(box);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { // keep focus inside the card
      const f = [...box.querySelectorAll('button')];
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length]?.focus();
    }
  });
  (document.body || document.documentElement).append(el);
  card = el;
  cardKind = kind;
  setTimeout(() => reload.focus({ preventScroll: true }), 0);
  logError('recovery-shown', kind);
}

export function hideRecovery(kind) {
  if (!card || (kind && cardKind !== kind)) return;
  card.remove();
  card = null;
  cardKind = null;
}

/** Global listeners — call once, as early as possible. */
export function installResilience() {
  if (installed) return;
  installed = true;
  window.addEventListener('error', (e) => {
    // resource load errors don't bubble to window; this is a runtime error
    noteError('error', e.error || e.message);
  });
  window.addEventListener('unhandledrejection', (e) => noteError('rejection', e.reason));
  window.addEventListener('coa:soft-error', (e) => logError(e.detail?.kind || 'soft', e.detail));
}

/** Watches the running game: render stalls and GPU context loss. */
export function attachApp(app) {
  const sm = app?.sm;
  const canvas = sm?.renderer?.domElement;
  if (!sm || !canvas) return;
  let gfxTimer = 0;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // allow the browser to restore the context
    sm.contextLost = true;
    logError('webgl', 'context lost');
    clearTimeout(gfxTimer);
    gfxTimer = setTimeout(() => { if (sm.contextLost) showRecovery('gfx'); }, GFX_WAIT_MS);
  }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    sm.contextLost = false;
    clearTimeout(gfxTimer);
    try { sm.restoreAfterContextLoss?.(); } catch (err) { logError('webgl-restore', err); }
    logError('webgl', 'context restored');
    hideRecovery('gfx');
  }, false);

  let lastFrame = -1;
  let lastChange = Date.now();
  setInterval(() => {
    const now = Date.now();
    if (document.hidden || sm.paused || sm.contextLost || card) { lastChange = now; lastFrame = -1; return; }
    const f = sm.renderer?.info?.render?.frame ?? -1;
    if (f !== lastFrame) { lastFrame = f; lastChange = now; return; }
    if (now - lastChange >= STALL_MS) { lastChange = now; showRecovery('stall'); }
  }, 2000);
}
