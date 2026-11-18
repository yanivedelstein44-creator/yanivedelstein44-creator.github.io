// "מחיר קנייה" in the stock sheet (SPEC §6.10): status, recommended / highest / current price, stop, take profit 1 and
// 2, position size at the plan, the market regime and sector lines, and the "הסבר" toggle with how it is computed.
import { h, ltr } from "../dom.js";
import { app, loadMarket, onLive } from "../state.js";
import { fmtPrice, fmtMoney, fmtPct, fmtInt, fmtCompact } from "../format.js";
import { planStatus, planPositionSize, ratioFromTo, tp1BasisHe, tp2BasisHe, whyLine, explainSections, PLAN_NOTE, TREND_HE } from "../plan.js";
import { REGIME, sectorRow, rankedSectors, sectorRankHe } from "../markets.js";
import { sectorHe } from "../risk.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);
let seq = 0;

const pctHe = (r) => (isNum(r) ? fmtPct(r, { signed: true }) : "");

function cell(k, v, note, { cls = "", testid = null, unit = null } = {}) {
  return h(
    "div",
    { class: "sh-risk__c " + cls, "data-testid": testid },
    h("span", { class: "sh-risk__k" }, k),
    h("span", { class: "sh-risk__v" }, h("bdi", { dir: "ltr", class: "num" }, v), unit ? h("span", { class: "sh-risk__unit" }, " " + unit) : null),
    note ? h("span", { class: "sh-risk__n" }, note) : null
  );
}

function sizeCell(stock, settings, sheet) {
  const pos = planPositionSize(stock, settings);
  if (pos)
    return cell("גודל פוזיציה", fmtInt(pos.shares), `≈ ${fmtMoney(pos.value)} · סיכון ${fmtPct(settings.riskPct / 100)} מתיק ${fmtCompact(settings.portfolio)}`, { testid: "position-size", unit: pos.shares === 1 ? "מניה" : "מניות" });
  const link = h("a", { class: "sh-risk__link", href: "#/settings", "data-testid": "set-portfolio-link" }, settings && settings.portfolio ? "לא ניתן לחשב" : "הגדר גודל תיק בהגדרות");
  link.addEventListener("click", (e) => {
    e.preventDefault();
    sheet().nav("#/settings");
  });
  return h("div", { class: "sh-risk__c" }, h("span", { class: "sh-risk__k" }, "גודל פוזיציה"), h("span", { class: "sh-risk__v" }, "—"), link);
}

/** Regime and sector lines; filled when the markets page arrives (it may load after the sheet opened). */
function contextLines(stock, settings, box) {
  const draw = (doc) => {
    const lines = [];
    const reg = doc && doc.regime && REGIME[doc.regime.state] ? doc.regime : null;
    if (reg) {
      const r = REGIME[reg.state];
      let text = `מצב השוק: ${r.label}. ${r.size}.`;
      if (reg.size_mult < 1) {
        const pos = planPositionSize(stock, settings, reg.size_mult);
        if (pos) text += ` לפי הכלל: ${fmtInt(pos.shares)} ${pos.shares === 1 ? "מניה" : "מניות"}.`;
      }
      lines.push(h("p", { class: "plan__line plan__line--" + r.tone, "data-testid": "plan-regime" }, text));
    }
    const row = doc ? sectorRow({ sectors: rankedSectors(doc) }, stock.sector) : null; // ranked rows carry `_of`
    if (row && isNum(row.rank)) lines.push(h("p", { class: "plan__line", "data-testid": "plan-sector" }, `סקטור ${sectorHe(stock.sector) || stock.sector}: ${sectorRankHe(row)} בחודש האחרון, מול S&P 500.`));
    box.replaceChildren(...lines);
    box.hidden = !lines.length;
  };
  draw(app.market);
  onLive(box, "market", draw);
  loadMarket();
}

/**
 * The plan card. Requires hasPlan(stock). `sheet` returns the sheet handle (for in-sheet navigation).
 * @returns HTMLElement
 */
export function planCard(stock, settings, sheet) {
  const e = stock.entry;
  const st = planStatus(stock);
  const id = `plan-explain-${++seq}`;
  const price = isNum(stock.price) ? stock.price : null;
  const vsEntry = ratioFromTo(e.entry, price);

  const explain = h(
    "div",
    { class: "plan__explain", id, hidden: true, "data-testid": "plan-explain" },
    h("dl", { class: "plan__dl" }, explainSections(e).map((s) => [h("dt", {}, s.k), h("dd", {}, s.t)])),
    h("p", { class: "plan__note" }, PLAN_NOTE)
  );
  const toggle = h("button", { class: "plan__more", type: "button", "aria-expanded": "false", "aria-controls": id, "data-testid": "plan-explain-toggle" }, "הסבר");
  toggle.addEventListener("click", () => {
    const open = explain.hidden;
    explain.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "הסתר הסבר" : "הסבר";
    if (open && typeof explain.scrollIntoView === "function") requestAnimationFrame(() => explain.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  });

  const p = (k, v, note, cls = "") =>
    h("div", { class: "plan__p " + cls }, h("span", { class: "plan__pk" }, k), ltr(v, "plan__pv"), note ? h("span", { class: "plan__pn" }, note) : null);
  const ctx = h("div", { class: "plan__ctx", hidden: true });
  const trend = TREND_HE[e.trend] || "";
  const isBreakout = st.key === "breakout";
  const breakout = isNum(e.breakout) && !isBreakout ? h("p", { class: "plan__line", "data-testid": "plan-breakout" }, "כניסה בפריצה: סגירה יומית מעל ", ltr(fmtPrice(e.breakout)), ", עם סטופ ב-", ltr(fmtPrice(e.breakout - e.risk_per_share)), ".") : null;

  const el = h(
    "section",
    { class: "plan", "data-testid": "plan-card", "data-status": st.key, "aria-label": "מחיר קנייה, סטופ וטייק פרופיט" },
    h("div", { class: "plan__head" }, h("span", { class: "kicker sh-kicker" }, "מחיר קנייה"), h("span", { class: `tag tag--${st.tone}`, "data-testid": "plan-status" }, st.label), toggle),
    h(
      "div",
      { class: "plan__prices" },
      p(isBreakout ? "קנייה מעל" : "מומלץ", fmtPrice(e.entry), null, "plan__p--main"),
      p("מקסימום", fmtPrice(e.max_entry)),
      p("עכשיו", fmtPrice(price), isNum(vsEntry) && Math.abs(vsEntry) >= 0.0005 ? `${pctHe(vsEntry)} ${isBreakout ? "ממחיר הקנייה" : "מהמומלץ"}` : null)
    ),
    h("p", { class: "plan__why", "data-testid": "plan-why" }, [st.text, whyLine(e), trend ? `${trend}.` : ""].filter(Boolean).join(" ")),
    h(
      "div",
      { class: "sh-risk plan__grid", "data-testid": "risk-row" },
      cell("סטופ", fmtPrice(e.stop), `${pctHe(ratioFromTo(e.entry, e.stop))} מהמומלץ · ${isNum(e.atr_mult) ? e.atr_mult.toLocaleString("he-IL") : "2"} × ATR`, { testid: "plan-stop" }),
      cell("טייק פרופיט 1", fmtPrice(e.tp1), `${pctHe(ratioFromTo(e.entry, e.tp1))} · R:R ${isNum(e.rr1) ? e.rr1.toFixed(2) : "—"} · ${tp1BasisHe(e.tp1_basis)}`, { testid: "plan-tp1", cls: isNum(e.rr1) && e.rr1 < 2 ? "is-warn" : "" }),
      cell("טייק פרופיט 2", fmtPrice(e.tp2), `${pctHe(ratioFromTo(e.entry, e.tp2))} · R:R ${isNum(e.rr2) ? e.rr2.toFixed(2) : "—"} · ${tp2BasisHe(e.tp2_basis)}`, { testid: "plan-tp2" }),
      sizeCell(stock, settings, sheet)
    ),
    breakout,
    ctx,
    explain
  );
  contextLines(stock, settings, ctx);
  return el;
}
