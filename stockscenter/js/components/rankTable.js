// Desktop ranking table (MergedDesktop): #, מניה, five sub-scores, כולל, R:R, סימונים. Click a sortable header to sort
// high -> low; click a row to open the stock drawer. Rows are re-ordered (not rebuilt) while the slider moves.
import { h } from "../dom.js";
import { COMPONENTS } from "../scoring/total.js";
import { COMPONENT_LABELS, barTone } from "./miniBars.js";
import { totalBadge, setBadge } from "./scoreRing.js";
import { flagList, tag, listsLabel, rrText, nameLine } from "./flags.js";
import { hasRisk } from "../risk.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const SORTABLE = [...COMPONENTS.map((k) => [k, COMPONENT_LABELS[k]]), ["total", "כולל"]];

function scoreCell(scores, k) {
  const v = scores && isNum(scores[k]) ? scores[k] : null;
  return h(
    "td",
    { class: "rt-score rt-x-score", "data-key": k, "data-v": v == null ? "" : String(v) },
    h("span", { class: "rt-score__v num" + (v == null ? " is-null" : "") }, v == null ? "—" : String(v)),
    h("span", { class: "rt-score__track", "aria-hidden": "true" }, h("span", { class: `rt-score__fill is-${barTone(v)}`, style: `width:${v ?? 0}%` }))
  );
}

function tableRow(first, { onOpen }) {
  const s = first.stock;
  const n = h("td", { class: "rt-n num" });
  const open = h("button", { class: "rt-open", type: "button", title: [s.name, listsLabel(s)].filter(Boolean).join(" · ") }, h("bdi", { class: "rt-sym", dir: "ltr" }, String(s.symbol)), nameLine("rt-name", s.name, listsLabel(s)));
  // narrow card: the flags column is hidden by CSS (container query) and the same flags show under the name
  const flagsUnder = h("div", { class: "rt-flags__in rt-flags__under" });
  const badge = totalBadge(first.total, { size: "sm" });
  const flags = h("td", { class: "rt-flags rt-x-flags" });
  const rr = h("td", { class: "rt-rr num", dir: "ltr" }, rrText(s));
  if (hasRisk(s) && isNum(s.risk.rr) && s.risk.rr < 2) rr.classList.add("is-low");
  const el = h(
    "tr",
    { class: "stock rt-row", "data-testid": `stock-card-${s.symbol}`, "data-symbol": s.symbol },
    n,
    h("td", { class: "rt-stock" }, open, flagsUnder),
    COMPONENTS.map((k) => scoreCell(s.scores, k)),
    h("td", { class: "rt-total" }, badge),
    rr,
    flags
  );
  let cur = first;
  el.addEventListener("click", () => onOpen(cur, open));
  function update(r, i) {
    cur = r;
    n.textContent = String(i + 1);
    setBadge(badge, r.total);
    el.dataset.total = isNum(r.total) ? String(r.total) : "";
    el.classList.toggle("is-lead", i === 0);
    // R:R low is already the red R:R number in its own column
    const fl = flagList(s, r).filter((f) => f.text !== "R:R נמוך");
    flags.replaceChildren(h("div", { class: "rt-flags__in" }, ...fl.map(tag)));
    flagsUnder.replaceChildren(...fl.map(tag));
    open.setAttribute("aria-label", `מקום ${i + 1}: ${s.symbol}${s.name ? ", " + s.name : ""}. ${isNum(r.total) ? "ציון כולל " + r.total : "אין ציון כולל"}. פתח פרטים`);
  }
  return { el, update };
}

/** @returns {{el:HTMLElement, update(ranked, sortKey):void}} */
export function rankTable({ onOpen, onSort, label = "טבלת הדירוג", limit = 0 }) {
  const heads = new Map();
  const th = (key, text, cls) => {
    if (!key) return h("th", { scope: "col", class: cls || null }, text);
    const b = h("button", { class: "rt-sort", type: "button", "data-testid": `sort-${key}`, "aria-pressed": "false", onClick: () => onSort?.(key) }, text);
    const cell = h("th", { scope: "col", class: "rt-h-sort" + (key === "total" ? " rt-h-total" : " rt-x-score") }, b);
    heads.set(key, { cell, b });
    return cell;
  };
  const tbody = h("tbody");
  const table = h(
    "table",
    { class: "rtable" },
    h("caption", { class: "sr-only" }, label + ". לחיצה על כותרת עמודה ממיינת מהגבוה לנמוך."),
    h(
      "colgroup",
      {},
      h("col", { class: "rt-c-n" }),
      h("col", { class: "rt-c-stock" }),
      COMPONENTS.map(() => h("col", { class: "rt-c-score rt-x-score" })),
      h("col", { class: "rt-c-total" }),
      h("col", { class: "rt-c-rr" }),
      h("col", { class: "rt-c-flags rt-x-flags" })
    ),
    h("thead", {}, h("tr", {}, th(null, "#"), th(null, "מניה"), SORTABLE.map(([k, t]) => th(k, t)), th(null, "R:R"), th(null, "סימונים", "rt-x-flags"))),
    tbody
  );
  if (!onSort) heads.forEach(({ b }) => b.setAttribute("disabled", ""));
  const el = h("section", { class: "card rt-card", "aria-label": label, "data-testid": "stock-list" }, table);
  const rows = new Map();
  function update(ranked, sortKey) {
    const list = limit ? ranked.slice(0, limit) : ranked;
    list.forEach((r, i) => {
      let row = rows.get(r.stock.symbol);
      if (!row) rows.set(r.stock.symbol, (row = tableRow(r, { onOpen })));
      row.update(r, i);
    });
    tbody.replaceChildren(...list.map((r) => rows.get(r.stock.symbol).el));
    heads.forEach(({ cell, b }, k) => {
      const on = k === sortKey;
      b.setAttribute("aria-pressed", String(on));
      if (on) cell.setAttribute("aria-sort", "descending");
      else cell.removeAttribute("aria-sort");
    });
  }
  return { el, update };
}
