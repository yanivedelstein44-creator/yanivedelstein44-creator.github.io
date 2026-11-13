// Phone bottom nav pill (MergedHome): בית, משולב, the floating "סרוק הכל", היסטוריה, חיפוש מניה.
// Shown on the three top-level screens; it hides on scroll down, shows on scroll up and respects the safe area.
import { h, icon } from "../dom.js";
import { navScan } from "./scanButton.js";
import { openSearch } from "./searchSheet.js";

export function navPill() {
  const link = (key, href, label, ic) => h("a", { class: "navpill__btn", href, "aria-label": label, "data-tab": key, "data-testid": `tab-${key}` }, icon(ic, key === "home" ? 25 : 24, 2), h("span", { class: "navpill__dot", "aria-hidden": "true" }));
  const scan = navScan();
  const el = h(
    "nav",
    { class: "navpill", "aria-label": "ניווט ראשי", "data-testid": "nav-pill" },
    link("home", "#/home", "בית", "home"),
    link("combined", "#/combined", "דירוג משולב", "layers"),
    scan.el,
    link("history", "#/history", "היסטוריה", "history"),
    h("button", { class: "navpill__btn", type: "button", "aria-label": "חיפוש מניה", "data-testid": "nav-search", onClick: () => openSearch() }, icon("search", 24, 2), h("span", { class: "navpill__dot", "aria-hidden": "true" }))
  );
  // Tab always reveals the pill first, so keyboard users can reach it even after it hid on scroll
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && el.isConnected && !document.documentElement.classList.contains("has-sheet")) {
      el.classList.remove("is-hidden");
      el.removeAttribute("inert");
    }
  });
  return {
    el,
    setActive(section) {
      el.querySelectorAll("a[data-tab]").forEach((a) => {
        if (a.dataset.tab === section) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    },
    show(on) {
      el.classList.toggle("is-hidden", !on);
      // a hidden pill must not take focus (its buttons are off screen): inert while hidden
      if (on) el.removeAttribute("inert");
      else if (!el.matches(":focus-within")) el.setAttribute("inert", "");
    },
  };
}

/** Hide on scroll down, show on scroll up (and near the top or bottom of the page). */
export function autoHide(getNav) {
  let lastY = window.scrollY;
  let acc = 0;
  let ticking = false;
  const update = () => {
    ticking = false;
    const nav = getNav();
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    document.body.classList.toggle("is-scrolled", y > 6);
    if (!nav) return;
    const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 8;
    if (y < 40) {
      acc = 0;
      return nav.show(true);
    }
    if (Math.sign(dy) !== Math.sign(acc)) acc = 0;
    acc += dy;
    if (acc > 24 && !nearBottom && !nav.el.matches(":focus-within")) nav.show(false);
    else if (acc < -16 || nearBottom) nav.show(true);
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  return () => {
    lastY = window.scrollY;
    acc = 0;
  };
}
