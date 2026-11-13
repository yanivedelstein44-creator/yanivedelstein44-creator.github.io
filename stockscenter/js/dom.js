// Tiny DOM helpers (no framework).

const SVG_NS = "http://www.w3.org/2000/svg";

/** h("div", {class:"x", onClick: fn, "data-testid": "y"}, child, "text", [children]). null / false children are skipped. */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v; // only ever called with trusted/static markup
    else if (k === "value" || k === "checked") el[k] = v;
    else if (k.length > 2 && k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  append(el, kids);
  return el;
}

/** Append children, skipping null / undefined / false (never let the DOM print "null"). */
export function append(el, kids) {
  for (const k of [kids].flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

/** replaceChildren that skips null / false (Element.replaceChildren(null) would print "null"). */
export function replace(el, ...kids) {
  el.replaceChildren();
  return append(el, kids);
}

export const clear = (el) => {
  el.replaceChildren();
  return el;
};

/** Latin / numeric run that must stay left-to-right inside RTL text. */
export function ltr(text, cls = "") {
  return h("bdi", { dir: "ltr", class: ("num " + cls).trim() }, text);
}

/** Build an SVG element from markup. */
export function svg(markup) {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

/* Icons: 24x24 viewBox, stroke 2-2.4, round caps and joins (design/DESIGN.md). Path data from the mockups. */
export const PATHS = {
  home: "M3 11l9-8 9 8v10h-6v-6H9v6H3z",
  layers: "M12 3l9 5-9 5-9-5z M3 13l9 5 9-5",
  scan: "M20 12a8 8 0 1 1-2.3-5.7 M20 4v5h-5",
  history: "M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16 M12 8v4l3 2",
  search: "M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14 M21 21l-5-5",
  settings: "M4 7h10 M18 7h2 M4 17h4 M12 17h8 M16 5v4 M10 15v4",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 20a2 2 0 0 0 4 0",
  back: "M9 6l6 6-6 6", // points right: "back" in RTL
  chevron: "M15 6l-6 6 6 6", // points left: "forward" in RTL
  plus: "M12 5v14 M5 12h14",
  close: "M6 6l12 12 M18 6L6 18",
  check: "M5 12.5l4.5 4.5L19 7.5",
  external: "M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6",
  expand: "M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 9.2a2.8 2.8 0 1 0 0 5.6a2.8 2.8 0 1 0 0-5.6",
  down: "M6 9l6 6 6-6",
  alert: "M12 4l9 16H3z M12 10v4 M12 17v.5",
  minus: "M5 12h14",
  // categories (SPEC §2 ids)
  momentum: "M3 17l6-6 4 4 8-8 M14 7h7v7",
  fundamental: "M3 21h18 M5 21V10 M19 21V10 M9.5 21V10 M14.5 21V10 M2 10l10-6 10 6",
  pullback: "M3 7l5 5 4-4 9 9 M21 12v5h-5",
  volume_breakout: "M5 20V11 M12 20V5 M19 20v-8",
  oversold: "M12 4v16 M6 14l6 6 6-6",
  analyst: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z",
  low_vol: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  rel_strength: "M13 2L4 14h7l-1 8 9-12h-7z",
  earnings_next: "M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5",
  earnings_recent: "M6 3h9l5 5v13H6z M14 3v6h6 M9 13h8 M9 17h8",
  calendar: "M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5",
};

export function icon(name, size = 22, stroke = 2) {
  return svg(
    `<svg xmlns="${SVG_NS}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${PATHS[name] || PATHS.layers}"/></svg>`
  );
}

/** The brand mark (design/icon.svg), inline. */
export function brandMark(size = 32) {
  return svg(`<svg xmlns="${SVG_NS}" width="${size}" height="${size}" viewBox="0 0 512 512" aria-hidden="true" focusable="false">
  <rect width="512" height="512" rx="112" fill="#1E4E9C"/>
  <rect x="20" y="20" width="472" height="472" rx="94" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="4"/>
  <circle cx="256" cy="256" r="152" fill="none" stroke="#DCE8FF" stroke-width="14"/>
  <circle cx="256" cy="256" r="126" fill="#173E80"/>
  <g fill="#FFFFFF"><rect x="182" y="266" width="38" height="74" rx="10"/><rect x="237" y="224" width="38" height="116" rx="10"/><rect x="292" y="180" width="38" height="160" rx="10"/></g>
  <circle cx="311" cy="158" r="10" fill="#6EE7B7"/></svg>`);
}

/** Debounce to the next animation frame. */
export function rafThrottle(fn) {
  let queued = false;
  let lastArgs;
  return (...args) => {
    lastArgs = args;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(...lastArgs);
    });
  };
}

/** Desktop-window layout (sidebar + wide content) is active. Mirrors the CSS breakpoint. */
export const wideMQ = typeof matchMedia === "function" ? matchMedia("(min-width: 1024px)") : { matches: false, addEventListener() {} };
export const isWide = () => wideMQ.matches;

export const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
