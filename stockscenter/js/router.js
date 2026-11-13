// Hash router: #/home #/cat/<id> #/combined #/history #/history/<date> #/history/<date>/combined #/history/<date>/<id> #/settings #/setup #/phone #/install
/** The 10 category ids of SPEC §2; anything else in a route goes home. */
export const CATEGORY_IDS = ["momentum", "fundamental", "pullback", "volume_breakout", "oversold", "analyst", "low_vol", "rel_strength", "earnings_next", "earnings_recent"];
const isDate = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x || "");
const isCat = (x) => CATEGORY_IDS.includes(x);
const HOME = { name: "home", hash: "#/home" };

export function parseHash(hash) {
  let parts;
  try {
    parts = String(hash || "")
      .replace(/^#\/?/, "")
      .split("?")[0]
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
  } catch {
    return HOME; // malformed %-escape
  }
  const [a, b, c, d] = parts;
  let r;
  if (!parts.length || (a === "home" && parts.length === 1)) r = { name: "home" };
  else if (a === "cat" && isCat(b) && parts.length === 2) r = { name: "cat", id: b };
  else if (a === "combined" && parts.length === 1) r = { name: "combined" };
  else if (a === "settings" && parts.length === 1) r = { name: "settings" };
  else if (a === "setup" && parts.length === 1) r = { name: "setup" };
  else if (a === "phone" && parts.length === 1) r = { name: "phone" };
  else if (a === "install" && parts.length === 1) r = { name: "install" };
  else if (a === "history" && parts.length === 1) r = { name: "history" };
  else if (a === "history" && isDate(b) && parts.length === 2) r = { name: "historyDay", date: b };
  else if (a === "history" && isDate(b) && c === "combined" && parts.length === 3) r = { name: "historyCombined", date: b };
  else if (a === "history" && isDate(b) && isCat(c) && parts.length === 3 && d === undefined) r = { name: "historyCat", date: b, id: c };
  else return HOME;
  return { ...r, hash: "#/" + parts.join("/") };
}

/** Mode-dependent guards (QA R2-n7): the setup wizard and the phone tab exist only inside the desktop program, and the
 *  phone install page only outside it. */
export function guardRoute(route, { desktop = false } = {}) {
  if ((route.name === "setup" || route.name === "phone") && !desktop) return HOME;
  if (route.name === "install" && desktop) return HOME;
  return route;
}

/** Routes that show the phone's bottom nav pill (the three top-level destinations). */
export const TOP_LEVEL = new Set(["home", "combined", "history"]);

/** The screen a "back" button leads to. */
export function parentOf(route) {
  switch (route.name) {
    case "historyDay":
      return "#/history";
    case "historyCat":
    case "historyCombined":
      return `#/history/${route.date}`;
    default:
      return "#/home";
  }
}

export const go = (hash) => {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = hash;
};

/* ---------- history stamps: lets a "back" button pop the real history entry instead of pushing a new one ---------- */

let current = 0;
const seen = new Map(); // entry index -> hash

/** Called on every route: give a new history entry the next index (history is linear), remember its hash. */
export function stampEntry() {
  if (typeof history === "undefined") return;
  const st = history.state && typeof history.state === "object" ? history.state : {};
  let idx = st.scIdx;
  if (typeof idx !== "number") {
    idx = current + 1;
    try {
      history.replaceState({ ...st, scIdx: idx }, "");
    } catch {
      /* ignore */
    }
  }
  current = idx;
  seen.set(idx, parseHash(location.hash).hash);
}

/**
 * Back to `parentHash`: when the previous entry IS the parent, go back (Android back then behaves as expected);
 * otherwise replace the current entry with the parent, so the screen we leave is not stacked twice.
 */
export function goBack(parentHash) {
  if (seen.get(current - 1) === parentHash) {
    history.back();
    return;
  }
  try {
    history.replaceState({ scIdx: current }, "", parentHash);
  } catch {
    location.hash = parentHash;
    return;
  }
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/** Which top-level nav item a route belongs to. */
export function sectionOf(route) {
  if (route.name === "cat") return "cat:" + route.id;
  if (route.name.startsWith("history")) return "history";
  return route.name;
}

export function startRouter(onRoute) {
  const fire = () => onRoute(parseHash(location.hash));
  window.addEventListener("hashchange", fire);
  fire();
}
