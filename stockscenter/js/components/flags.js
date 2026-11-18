// Flag and risk chips, shared by the expanded #1 row, the desktop table and the stock sheet.
import { h, ltr } from "../dom.js";
import { app } from "../state.js";
import { fmtPrice, fmtDM } from "../format.js";
import { hasRisk } from "../risk.js";
import { hasPlan, planStatus } from "../plan.js";
import { sectorRow } from "../markets.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);

/**
 * [{tone, text}] in display order. calc = {gate} from computeTotal (the gate follows the slider-independent scores).
 * plan: the buy-plan status chip first (SPEC §6.10); sector: "סקטור חזק" / "סקטור חלש" from the markets page.
 */
export function flagList(stock, calc = {}, { plan = true, sector = true } = {}) {
  const f = stock.flags || {};
  const out = [];
  const st = plan ? planStatus(stock) : null;
  if (st) out.push({ tone: st.tone, text: st.label });
  const row = sector && app.market ? sectorRow(app.market, stock.sector) : null;
  if (row && row.strength === "strong") out.push({ tone: "good", text: "סקטור חזק" });
  else if (row && row.strength === "weak") out.push({ tone: "muted", text: "סקטור חלש" });
  if (stock.insider && stock.insider.exec_open_market_buy) out.push({ tone: "brand", text: "קניית בכיר" });
  if (f.earnings_soon) out.push({ tone: "warn", text: f.earnings_date ? `דוחות ${fmtDM(f.earnings_date)}` : "דוחות בקרוב" });
  if (calc.gate ?? stock.gate) out.push({ tone: "danger", text: "רכיב חלש" });
  if (f.rr_low && !hasPlan(stock)) out.push({ tone: "warn", text: "R:R נמוך" }); // with a plan, its status says it
  if (f.few_analysts) out.push({ tone: "muted", text: "מעט אנליסטים" });
  if (f.missing_data || (stock.missing && stock.missing.length)) out.push({ tone: "muted", text: "חסרים נתונים" });
  return out;
}

export const tag = ({ tone, text }) => h("span", { class: `tag tag--${tone}` }, text);

/** "קנייה $170" · "סטופ $158.20" · "טייק פרופיט $205" (the plan) or the older stop / target / R:R chips, or one
 *  "אין נתוני סיכון" chip. */
export function riskChips(stock) {
  if (hasPlan(stock)) {
    const e = stock.entry;
    return [
      h("span", { class: "tag tag--plain" }, "קנייה ", ltr(fmtPrice(e.entry), "tag__v")),
      h("span", { class: "tag tag--plain" }, "סטופ ", ltr(fmtPrice(e.stop), "tag__v")),
      h("span", { class: "tag tag--plain" + (isNum(e.rr1) && e.rr1 < 2 ? " is-warn" : "") }, "טייק פרופיט ", ltr(fmtPrice(e.tp1), "tag__v")),
    ];
  }
  if (!hasRisk(stock)) return [h("span", { class: "tag tag--plain" }, "אין נתוני סיכון")];
  const r = stock.risk;
  const out = [];
  if (isNum(r.stop)) out.push(h("span", { class: "tag tag--plain" }, "סטופ ", ltr(fmtPrice(r.stop), "tag__v")));
  if (isNum(r.target)) out.push(h("span", { class: "tag tag--plain" }, "טייק פרופיט ", ltr(fmtPrice(r.target), "tag__v")));
  if (isNum(r.rr)) out.push(h("span", { class: "tag tag--plain" + (r.rr < 2 ? " is-warn" : "") }, "R:R ", ltr(r.rr.toFixed(2), "tag__v")));
  return out;
}

export const rrText = (stock) => (hasRisk(stock) && isNum(stock.risk.rr) ? stock.risk.rr.toFixed(2) : "—");

/** "ב-3 רשימות" / "ברשימה אחת". */
export const listsLabel = (stock) => {
  const n = (stock.lists || []).length;
  return n <= 1 ? "ברשימה אחת" : `ב-${n} רשימות`;
};

/** Name + lists/sub label as two boxes: the label never shrinks, the Latin name keeps its start and ends with "…". */
export function nameLine(cls, name, label) {
  return h(
    "span",
    { class: cls },
    name ? h("bdi", { class: "nameline__n", dir: "ltr" }, String(name)) : null,
    label ? h("span", { class: "nameline__l" }, (name ? "· " : "") + label) : null
  );
}
