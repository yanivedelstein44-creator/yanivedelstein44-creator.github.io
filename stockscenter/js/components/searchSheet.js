// "חיפוש מניה": a simple search over the latest scan (every category file, merged by symbol).
import { h, icon, rafThrottle } from "../dom.js";
import { app, catName } from "../state.js";
import { sectorHe } from "../risk.js";
import { computeTotal } from "../scoring/total.js";
import { loadUniverse } from "../universe.js";
import { openSheet } from "./sheet.js";
import { stockLine } from "./rankList.js";
import { skeleton } from "./states.js";
import { openStockSheet, asOfLabel } from "./stockSheet.js";

const totalOf = (s) => computeTotal(s.scores, (s.lists || []).length, app.slider).total;

/** Symbol prefix first, then symbol / name / sector contains; ties by total. */
export function searchStocks(stocks, query, limit = 30) {
  const q = String(query || "").trim().toUpperCase();
  if (!q) return [];
  const scored = [];
  for (const s of stocks) {
    const sym = String(s.symbol || "").toUpperCase();
    const name = String(s.name || "").toUpperCase();
    let rank = -1;
    if (sym === q) rank = 0;
    else if (sym.startsWith(q)) rank = 1;
    else if (name.startsWith(q)) rank = 2;
    else if (sym.includes(q) || name.includes(q)) rank = 3;
    else if (String(s.sector || "").toUpperCase().includes(q) || sectorHe(s.sector).toUpperCase().includes(q) || (s.lists || []).some((id) => catName(id).toUpperCase().includes(q))) rank = 4;
    if (rank >= 0) scored.push([rank, s]);
  }
  scored.sort((a, b) => a[0] - b[0] || (totalOf(b[1]) ?? -1) - (totalOf(a[1]) ?? -1) || String(a[1].symbol).localeCompare(String(b[1].symbol)));
  return scored.slice(0, limit).map((x) => x[1]);
}

export function openSearch() {
  const input = h("input", {
    class: "input search__input",
    type: "search",
    placeholder: "סימול או שם חברה",
    "aria-label": "חיפוש מניה לפי סימול או שם",
    "data-testid": "search-input",
    autocomplete: "off",
    autocapitalize: "characters",
    spellcheck: "false",
    enterkeyhint: "search",
  });
  const results = h("div", { class: "search__results", "data-testid": "search-results", "aria-live": "polite" }, skeleton(4, "rows"));
  const body = h("div", { class: "search" }, h("h2", { class: "search__title" }, "חיפוש מניה"), h("label", { class: "search__field" }, icon("search", 20, 2.2), input));
  body.append(results);
  let data = null;
  let first = null;
  const handle = openSheet({ label: "חיפוש מניה", testid: "search-sheet", body, tall: true, initialFocus: input });

  const open = (s) => openStockSheet(s, { asOf: asOfLabel(s._trade) });
  const line = (s) => stockLine({ stock: s, total: totalOf(s), sub: (s.lists || []).map(catName).join(" · "), onOpen: () => open(s), testid: `search-hit-${s.symbol}` });

  function render() {
    if (!data) return;
    const q = input.value.trim();
    if (!data.stocks.length) {
      first = null;
      results.replaceChildren(h("p", { class: "search__empty" }, data.failed ? "לא הצלחנו לטעון את הרשימות. בדוק את החיבור ונסה שוב." : "עוד אין מניות. הן יופיעו כאן אחרי הסריקה הראשונה."));
      return;
    }
    if (!q) {
      const top = data.stocks.slice().sort((a, b) => (totalOf(b) ?? -1) - (totalOf(a) ?? -1)).slice(0, 8);
      first = null;
      results.replaceChildren(h("p", { class: "search__hint" }, `המובילות היום · ${data.stocks.length} מניות בכל הרשימות`), h("div", { class: "rank rank--lines" }, top.map(line)));
      return;
    }
    const hits = searchStocks(data.stocks, q);
    first = hits[0] || null;
    results.replaceChildren(
      hits.length
        ? h("div", { class: "rank rank--lines" }, hits.map(line))
        : h("p", { class: "search__empty", "data-testid": "search-none" }, h("bdi", { dir: "auto" }, q), " לא נמצאה ברשימות של הסריקה האחרונה")
    );
  }
  input.addEventListener("input", rafThrottle(render));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && first) {
      e.preventDefault();
      open(first);
    }
  });
  loadUniverse().then(
    (u) => {
      data = u;
      render();
    },
    () => {
      data = { stocks: [], failed: 1 };
      render();
    }
  );
  return handle;
}
