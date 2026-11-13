// Phone ranking card ("הדירוג", MergedListLite): rank numeral, symbol + name, 5 mini bars, total badge.
// The #1 row is expanded inline (MergedList): 5 sub-score tiles, risk chips and flags. Tapping a row opens the sheet.
// Rows are created once and re-ordered (not rebuilt) while the slider moves.
import { h } from "../dom.js";
import { totalBadge, setBadge } from "./scoreRing.js";
import { miniBars, scoreTiles, scoresText, COMPONENT_LABELS } from "./miniBars.js";
import { flagList, riskChips, tag, listsLabel, nameLine } from "./flags.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);

function rankRow(first, { onOpen }) {
  const stock = first.stock;
  const n = h("span", { class: "rrow__n num", "aria-hidden": "true" });
  const sym = h("bdi", { class: "rrow__sym", dir: "ltr" }, String(stock.symbol));
  const name = nameLine("rrow__name", stock.name, listsLabel(stock));
  const keyVal = h("span", { class: "rrow__key num", "aria-hidden": "true", hidden: true });
  const barsBox = h("span", { class: "rrow__bars" });
  const badge = totalBadge(first.total);
  const hit = h("button", { class: "rrow__hit", type: "button" }, n, h("span", { class: "rrow__id" }, sym, name), keyVal, barsBox, badge);
  const more = h("div", { class: "rrow__more", hidden: true });
  const el = h("article", { class: "stock rrow", "data-testid": `stock-card-${stock.symbol}`, "data-symbol": stock.symbol }, hit, more);
  let cur = first;
  let lead = null;
  let leadSig = "";
  el.addEventListener("click", () => onOpen(cur, hit));

  function update(r, i, sortKey) {
    cur = r;
    n.textContent = String(i + 1);
    setBadge(badge, r.total);
    el.dataset.total = isNum(r.total) ? String(r.total) : "";
    barsBox.replaceChildren(miniBars(stock.scores, sortKey));
    const k = sortKey && sortKey !== "total" ? sortKey : null;
    const kv = k && stock.scores && isNum(stock.scores[k]) ? stock.scores[k] : null;
    keyVal.hidden = !k;
    keyVal.textContent = k ? (kv == null ? "—" : String(kv)) : "";
    hit.setAttribute(
      "aria-label",
      `מקום ${i + 1}: ${stock.symbol}${stock.name ? ", " + stock.name : ""}. ${isNum(r.total) ? "ציון כולל " + r.total : "אין ציון כולל"}${k ? `. ${COMPONENT_LABELS[k]} ${kv ?? "חסר"}` : ""}. ${scoresText(stock.scores)}`
    );
    const isLead = i === 0;
    const sig = `${r.total}|${r.gate}`;
    if (isLead !== lead || (isLead && sig !== leadSig)) {
      lead = isLead;
      leadSig = sig;
      el.classList.toggle("is-lead", isLead);
      badge.classList.toggle("tbadge--lg", isLead);
      badge.classList.toggle("tbadge--md", !isLead);
      more.hidden = !isLead;
      more.replaceChildren(...(isLead ? [scoreTiles(stock.scores), h("div", { class: "rrow__chips" }, ...riskChips(stock), ...flagList(stock, r).map(tag))] : []));
    }
  }
  return { el, update };
}

/** @returns {{el:HTMLElement, update(ranked, sortKey):void}} */
export function rankCard({ onOpen, label = "הדירוג" }) {
  const el = h("div", { class: "rank", role: "region", "aria-label": label, "data-testid": "stock-list" });
  const rows = new Map();
  function update(ranked, sortKey) {
    ranked.forEach((r, i) => {
      const sym = r.stock.symbol;
      let row = rows.get(sym);
      if (!row) rows.set(sym, (row = rankRow(r, { onOpen })));
      row.update(r, i, sortKey);
    });
    el.replaceChildren(...ranked.map((r) => rows.get(r.stock.symbol).el));
  }
  return { el, update };
}

/** A compact row for the watchlist and search results (no rank numeral, no expansion). */
export function stockLine({ stock, total, sub, onOpen, testid }) {
  const badge = totalBadge(total, { testid: null });
  const hit = h(
    "button",
    { class: "rrow__hit", type: "button", "aria-label": `${stock.symbol}${stock.name ? ", " + stock.name : ""}. ${isNum(total) ? "ציון כולל " + total : "אין ציון כולל היום"}. ${sub || ""}` },
    h("span", { class: "rrow__id" }, h("bdi", { class: "rrow__sym", dir: "ltr" }, String(stock.symbol)), nameLine("rrow__name", stock.name, sub)),
    stock.scores ? h("span", { class: "rrow__bars" }, miniBars(stock.scores)) : null,
    badge
  );
  const el = h("article", { class: "rrow rrow--line", "data-testid": testid, "data-symbol": stock.symbol }, hit);
  hit.addEventListener("click", () => onOpen(hit));
  return el;
}
