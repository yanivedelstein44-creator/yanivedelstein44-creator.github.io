// Screen chrome: the slim sticky top bar, the editorial masthead, section headers and meta lines.
import { h, icon } from "../dom.js";
import { goBack } from "../router.js";

/** Slim sticky top bar (MergedListLite): white back button, letter-spaced kicker, an optional round action. */
export function topBar({ kicker, back = "#/home", action = null, backLabel = "חזרה" }) {
  const backBtn = h("a", { class: "iconbtn iconbtn--paper", href: back, "aria-label": backLabel, "data-testid": "back" }, icon("back", 22, 2.2));
  backBtn.addEventListener("click", (e) => {
    e.preventDefault();
    goBack(back);
  });
  return h(
    "div",
    { class: "topbar" },
    backBtn,
    h("span", { class: "topbar__kicker", dir: "ltr" }, kicker),
    action || h("span", { class: "topbar__spacer", "aria-hidden": "true" })
  );
}

/** "● 18 מניות · נסרק היום 17:05 · המחשב מחובר". dot: "on" | "off" | null. */
export function metaLine(parts, { dot = null, testid = null } = {}) {
  const list = parts.filter((p) => p != null && p !== "" && p !== false);
  const kids = [];
  list.forEach((p, i) => {
    if (i) kids.push(" · ");
    kids.push(p);
  });
  return h("p", { class: "meta", "data-testid": testid }, dot ? h("span", { class: `meta__dot is-${dot}`, "aria-hidden": "true" }) : null, ...kids);
}

/** Serif masthead with a meta line. Desktop: kicker above, an aside on the left (the slider), a 2 px rule under. */
export function masthead({ title, meta = null, kicker = null, aside = null, testid = "masthead" }) {
  return h(
    "header",
    { class: "masthead", "data-testid": testid },
    h("div", { class: "masthead__main" }, kicker ? h("span", { class: "masthead__kicker", dir: /[A-Za-z]/.test(kicker) ? "ltr" : null }, kicker) : null, h("h1", { class: "masthead__title" }, title), meta),
    aside ? h("div", { class: "masthead__aside" }, aside) : null
  );
}

/** Section header: serif title on the right, a small note on the left. */
export const sectionHead = (title, note = null, { level = "h2", id = null } = {}) =>
  h("div", { class: "sechead" }, h(level, { class: "sechead__title", id }, title), note != null && note !== "" ? h("span", { class: "sechead__note" }, note) : null);

export const kicker = (text, cls = "") => h("span", { class: ("kicker " + cls).trim() }, text);
