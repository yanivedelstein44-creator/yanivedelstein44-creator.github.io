// Desktop sidebar (MergedDesktop): a blue rounded card on the right with the wordmark and status line, the white
// "סרוק הכל" and the progress bar, the nav, and "הרשימות" (10 compact rows: name, count, small scan button).
import { h, icon } from "../dom.js";
import { app, onLive } from "../state.js";
import { fmtInt } from "../format.js";
import { statusPill } from "./statusPill.js";
import { pillScan, roundScan, scanProgress } from "./scanButton.js";
import { openSearch } from "./searchSheet.js";

const NAV = [
  ["home", "#/home", "בית", "home"],
  ["combined", "#/combined", "דירוג משולב", "layers"],
  ["history", "#/history", "היסטוריה", "history"],
  ["settings", "#/settings", "הגדרות", "settings"],
];

function catRow(c) {
  const never = c.count == null && !c.scanned_at;
  const count = h("span", { class: "sidecat__count num" + (c.error ? " is-error" : ""), title: c.error ? c.error.message_he || "שגיאה" : never ? "טרם נסרק" : null }, c.error ? "!" : never ? "—" : fmtInt(c.count));
  const link = h(
    "a",
    { class: "sidecat__main", href: `#/cat/${c.id}`, "aria-label": `${c.name_he} ${c.error ? "!, הסריקה נכשלה" : never ? "—, טרם נסרק" : `${fmtInt(c.count)} מניות`}` },
    h("span", { class: "sidecat__name" }, c.name_he),
    " ", // a space between the two flex items (not rendered) so the accessible name matches the visible text
    count
  );
  const scan = roundScan({ ids: [c.id], label: `סרוק את ${c.name_he}`, testid: `scan-${c.id}`, tone: "side", size: 30 });
  return h("div", { class: "sidecat", "data-testid": `category-row-${c.id}`, "data-cat": c.id }, link, scan.el);
}

export function sidebar() {
  const pill = statusPill({ variant: "side" });
  const scan = pillScan();
  const prog = scanProgress({ variant: "side" });
  const nav = h(
    "nav",
    { class: "sidenav", "aria-label": "מסכים" },
    NAV.map(([key, href, label, ic]) => h("a", { class: "sidenav__a", href, "data-nav": key }, icon(ic, 19, 2), h("span", {}, label)))
  );
  const search = h("button", { class: "iconbtn iconbtn--onblue sidebar__search", type: "button", "aria-label": "חיפוש מניה", title: "חיפוש מניה (/)", "data-testid": "side-search", onClick: () => openSearch() }, icon("search", 19, 2.2));
  const cats = h("div", { class: "sidecats", "data-testid": "category-list" });
  const fillCats = () => cats.replaceChildren(...(app.index?.categories || []).map(catRow));
  fillCats();
  const el = h(
    "aside",
    { class: "sidebar", "aria-label": "תפריט" },
    h("div", { class: "sidebar__brand" }, h("div", { class: "sidebar__brandrow" }, h("a", { class: "wordmark wordmark--side", href: "#/home", dir: "ltr", "aria-label": "StocksCenter, לעמוד הראשי" }, "StocksCenter"), search), pill.el),
    scan.el,
    prog.el,
    nav,
    h("span", { class: "sidebar__label" }, "הרשימות"),
    cats
  );
  let section = "";
  const setActive = (sec) => {
    section = sec;
    nav.querySelectorAll("[data-nav]").forEach((a) => (a.dataset.nav === sec ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    cats.querySelectorAll(".sidecat").forEach((r) => {
      const on = sec === "cat:" + r.dataset.cat;
      r.classList.toggle("is-current", on);
      const a = r.querySelector(".sidecat__main");
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  };
  onLive(el, "index", () => {
    fillCats();
    setActive(section);
  });
  return { el, setActive };
}
