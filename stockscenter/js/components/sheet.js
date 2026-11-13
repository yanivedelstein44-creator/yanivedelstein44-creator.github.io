// Generic overlay panel: a bottom sheet on the phone (radius 28, drag handle, swipe down to close) and a 440 px drawer
// on the end side (left in RTL) in the desktop window. Closes on a scrim tap, Escape, Android back (history entry,
// overlay.js) or a swipe down. One panel at a time: opening another one replaces it and reuses its history entry.
import { h, icon, isWide, reducedMotion } from "../dom.js";
import { pushOverlay, registerCloser } from "./overlay.js";

let current = null;
export const sheetIsOpen = () => !!current;
export const currentSheet = () => current;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

/**
 * @param {{label:string, testid:string, body:Node, footer?:Node|null, tall?:boolean, initialFocus?:HTMLElement|null, onClose?:Function}} o
 * @returns {{el:HTMLElement, close(opts?):Promise<void>, nav(hash:string):void}}
 */
export function openSheet({ label, testid, body, footer = null, tall = false, initialFocus = null, onClose = null, opener: from = null }) {
  const drawer = isWide();
  const opener = current ? current._opener : from || document.activeElement;
  let hist;
  if (current) {
    hist = current._hist;
    current._close({ silent: true });
  } else hist = pushOverlay(() => close({ fromPop: true }));
  hist.retarget(() => close({ fromPop: true }));

  const closeBtn = h(
    "button",
    { class: drawer ? "iconbtn iconbtn--soft sheet__close" : "sheet__close sheet__close--sr", type: "button", "aria-label": "סגור", "data-testid": "sheet-close", onClick: () => close() },
    icon("close", 20, 2.2)
  );
  const scroller = h("div", { class: "sheet__scroll" }, body);
  const panel = h(
    "section",
    { class: "sheet" + (drawer ? " sheet--drawer" : "") + (tall ? " sheet--tall" : ""), role: "dialog", "aria-modal": "true", "aria-label": label, "data-testid": testid, tabindex: "-1" },
    drawer ? h("div", { class: "sheet__top" }, closeBtn) : h("div", { class: "sheet__grab" }, h("span", { class: "sheet__handle", "aria-hidden": "true" }), closeBtn),
    scroller,
    footer ? h("div", { class: "sheet__bar" }, footer) : null
  );
  const scrim = h("div", { class: "layer__scrim", "aria-hidden": "true", "data-testid": "sheet-scrim" });
  const layer = h("div", { class: "layer" + (drawer ? " layer--drawer" : "") }, scrim, panel);
  scrim.addEventListener("click", () => close());

  const onKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      const f = [...panel.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === closeBtn);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener("keydown", onKey, true);
  document.body.append(layer);
  document.documentElement.classList.add("has-sheet");
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add("is-in")));
  (initialFocus || panel).focus({ preventScroll: true });

  let closed = false;
  const unregister = registerCloser(() => close({ detach: true }));
  if (!drawer) enableSwipe(panel, scroller, () => close());

  function teardown(immediate) {
    document.removeEventListener("keydown", onKey, true);
    unregister();
    panel.style.transform = ""; // after a swipe: animate on from where the finger left it
    layer.classList.remove("is-in");
    if (immediate || reducedMotion()) layer.remove();
    else setTimeout(() => layer.remove(), 240);
    if (current === handle) {
      current = null;
      document.documentElement.classList.remove("has-sheet");
    }
  }

  /** opts: fromPop (Android back), silent (replaced by another sheet), detach (route changed), then (run after). */
  function close({ fromPop = false, silent = false, detach = false, then = null } = {}) {
    if (closed) return Promise.resolve();
    closed = true;
    teardown(silent);
    onClose?.();
    if (silent) return Promise.resolve();
    if (!detach && opener && opener.isConnected && typeof opener.focus === "function") opener.focus({ preventScroll: true });
    let p = Promise.resolve();
    if (detach) hist.detach();
    else if (!fromPop) p = hist.release();
    return p.then(() => then?.());
  }

  const handle = {
    el: panel,
    close,
    /** Leave the sheet for another screen: drop the sheet's history entry first, then navigate. */
    nav(hash) {
      close({ then: () => (location.hash = hash) });
    },
    _hist: hist,
    _opener: opener,
    _close: close,
  };
  current = handle;
  return handle;
}

/** Swipe down to close (touch). Starts on the handle area, or anywhere while the content is scrolled to the top. */
function enableSwipe(panel, scroller, onClose) {
  let y0 = 0;
  let x0 = 0;
  let t0 = 0;
  let dy = 0;
  let state = "idle"; // idle | armed | drag
  let fromGrab = false;
  panel.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return (state = "idle");
      const t = e.touches[0];
      fromGrab = !!e.target.closest(".sheet__grab");
      if (!fromGrab && scroller.scrollTop > 0) return (state = "idle");
      if (e.target.closest("input, textarea, [data-noswipe]")) return (state = "idle");
      y0 = t.clientY;
      x0 = t.clientX;
      t0 = performance.now();
      dy = 0;
      state = "armed";
    },
    { passive: true }
  );
  panel.addEventListener(
    "touchmove",
    (e) => {
      if (state === "idle") return;
      const t = e.touches[0];
      const d = t.clientY - y0;
      if (state === "armed") {
        if (Math.abs(t.clientX - x0) > Math.abs(d) || d < -6) return (state = "idle");
        if (d < 8) return;
        if (!fromGrab && scroller.scrollTop > 0) return (state = "idle");
        state = "drag";
        panel.classList.add("is-dragging");
      }
      e.preventDefault();
      dy = Math.max(0, d);
      panel.style.transform = `translateY(${dy}px)`;
    },
    { passive: false }
  );
  const end = () => {
    if (state !== "drag") return (state = "idle");
    state = "idle";
    panel.classList.remove("is-dragging");
    const v = dy / Math.max(1, performance.now() - t0);
    if (dy > 110 || (dy > 40 && v > 0.55)) onClose();
    else panel.style.transform = "";
  };
  panel.addEventListener("touchend", end);
  panel.addEventListener("touchcancel", end);
}
