// The stock sheet (MergedStock): a bottom sheet on the phone, a 440 px drawer in the desktop window.
// Ticker, name · sector, price and change, list chips, the total ring; five labeled bars; the 2×2 risk panel; insider
// and earnings cards; the Claude note; news (http/https links only, opened outside the app). Sticky action bar:
// "פתח ב-TradingView" and the watchlist toggle.
import { h, icon, ltr } from "../dom.js";
import { app, catName, watched, toggleWatch, onLive } from "../state.js";
import { fmtPrice, fmtMoney, fmtPct, fmtInt, fmtDM, fmtDMY, fmtCompact, timeAgo, clock, isHttpUrl, nyToday } from "../format.js";
import { computeTotal } from "../scoring/total.js";
import { positionSize, hasRisk, daysUntil, inDaysHe, buysHe, sellsHe, execBuyText, sectorHe } from "../risk.js";
import { tradingViewUrl } from "../data/links.js";
import { scoreRing } from "./scoreRing.js";
import { scoreBars } from "./miniBars.js";
import { flagList, tag } from "./flags.js";
import { openExternal } from "./extLink.js";
import { openSheet } from "./sheet.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);

/** "היום" when the data is from today's New York session, else "ב-11.11". */
export function asOfLabel(tradeDate) {
  if (!tradeDate) return null;
  return tradeDate === nyToday(clock.now()) ? "היום" : `ב-${fmtDM(tradeDate)}`;
}

function head(stock, total, ctx, sheet) {
  const chg = stock.change_pct;
  const hasChg = isNum(chg);
  const lists = (stock.lists || []).filter(Boolean);
  const listChip = (id) => {
    const href = ctx.date ? `#/history/${ctx.date}/${id}` : `#/cat/${id}`;
    const a = h("a", { class: "lchip", href }, catName(id));
    a.addEventListener("click", (e) => {
      e.preventDefault();
      sheet().nav(href);
    });
    return a;
  };
  const sector = sectorHe(stock.sector);
  return h(
    "div",
    { class: "sh-head" },
    h(
      "div",
      { class: "sh-id" },
      h("h2", { class: "sh-ticker" }, h("bdi", { dir: "ltr" }, String(stock.symbol ?? "—"))),
      stock.name || sector ? h("p", { class: "sh-name" }, stock.name ? h("bdi", {}, stock.name) : null, stock.name && sector ? " · " : null, sector || null) : null,
      h(
        "p",
        { class: "sh-px" },
        ltr(fmtPrice(stock.price), "sh-px__v"),
        hasChg ? " " : null,
        hasChg ? ltr(fmtPct(chg, { signed: true }), "sh-px__chg " + (chg > 0 ? "is-up" : chg < 0 ? "is-down" : "")) : null,
        ctx.asOf ? ` · ${ctx.asOf}` : null
      ),
      lists.length ? h("div", { class: "sh-lists", "aria-label": "מופיעה ברשימות" }, lists.map(listChip)) : null
    ),
    scoreRing(total)
  );
}

function riskPanel(stock, settings, sheet) {
  if (!hasRisk(stock)) return h("div", { class: "sh-risk sh-risk--none", "data-testid": "risk-none" }, "אין מספיק נתונים לחישוב סיכון");
  const r = stock.risk;
  const cell = (k, v, note, { cls = "", testid = null, unit = null } = {}) =>
    h(
      "div",
      { class: "sh-risk__c " + cls, "data-testid": testid },
      h("span", { class: "sh-risk__k" }, k),
      h("span", { class: "sh-risk__v" }, h("bdi", { dir: "ltr", class: "num" }, v), unit ? h("span", { class: "sh-risk__unit" }, " " + unit) : null),
      note ? h("span", { class: "sh-risk__n" }, note) : null
    );
  const mult = isNum(r.atr_mult) ? r.atr_mult : 1.5;
  const basis = r.target_basis === "resistance" ? "התנגדות של 60 יום" : r.target_basis === "atr" ? "3 × ATR מעל המחיר" : null;
  const rrOk = isNum(r.rr) && r.rr >= 2;
  const pos = positionSize(stock, settings);
  let posCell;
  if (pos) {
    posCell = cell("גודל פוזיציה", fmtInt(pos.shares), `≈ ${fmtMoney(pos.value)} · סיכון ${fmtPct(settings.riskPct / 100)} מתיק ${fmtCompact(settings.portfolio)}`, { testid: "position-size", unit: pos.shares === 1 ? "מניה" : "מניות" });
  } else {
    const link = h("a", { class: "sh-risk__link", href: "#/settings", "data-testid": "set-portfolio-link" }, settings.portfolio ? "לא ניתן לחשב" : "הגדר גודל תיק בהגדרות");
    link.addEventListener("click", (e) => {
      e.preventDefault();
      sheet().nav("#/settings");
    });
    posCell = h("div", { class: "sh-risk__c" }, h("span", { class: "sh-risk__k" }, "גודל פוזיציה"), h("span", { class: "sh-risk__v" }, "—"), link);
  }
  return h(
    "div",
    { class: "sh-risk", "data-testid": "risk-row" },
    cell("סטופ", fmtPrice(r.stop), `${mult.toLocaleString("he-IL")} × ATR מתחת למחיר`),
    cell("יעד", fmtPrice(r.target), basis),
    cell("סיכוי מול סיכון", isNum(r.rr) ? r.rr.toFixed(2) : "—", isNum(r.rr) ? (rrOk ? "2 ומעלה, תקין" : "מתחת ל-2, נמוך") : null, { cls: isNum(r.rr) && !rrOk ? "is-warn" : "" }),
    posCell
  );
}

function sideCards(stock) {
  const i = stock.insider;
  const f = stock.flags || {};
  const cards = [];
  if (i) {
    const exec = execBuyText(i);
    cards.push(
      h(
        "div",
        { class: "sh-card", "data-testid": "insider-row" },
        h("span", { class: "sh-card__k" }, `מנהלים · ${fmtInt(i.window_days || 90)} יום`),
        h("span", { class: "sh-card__v" }, `${buysHe(i.buys || 0)} · ${sellsHe(i.sells || 0)}`),
        exec ? h("span", { class: "tag tag--brand sh-card__chip" }, exec) : null
      )
    );
  }
  const date = f.earnings_date;
  const days = date ? daysUntil(date, clock.now()) : null;
  if (date && days != null && days >= 0) {
    const soon = !!f.earnings_soon;
    const otherYear = date.slice(0, 4) !== nyToday(clock.now()).slice(0, 4);
    cards.push(
      h(
        "div",
        { class: "sh-card" + (soon ? " sh-card--warn" : ""), "data-testid": "earnings-card" },
        h("span", { class: "sh-card__k" }, soon ? "שימו לב" : "הדוחות הבאים"),
        h("span", { class: "sh-card__v" }, days === 0 ? "דוחות היום" : `דוחות ב-${otherYear ? fmtDMY(date) : fmtDM(date)}`),
        h("span", { class: "sh-card__n" }, soon ? `${inDaysHe(days)}, תנודתיות צפויה` : inDaysHe(days))
      )
    );
  }
  return cards.length ? h("div", { class: "sh-cards" + (cards.length === 1 ? " sh-cards--one" : "") }, cards) : null;
}

function newsBlock(stock) {
  const news = (stock.news || []).filter((n) => n && n.title);
  const kick = h("span", { class: "kicker sh-kicker" }, "חדשות");
  if (!news.length) return h("section", { class: "sh-news", "data-testid": "news" }, kick, h("p", { class: "sh-quiet", "data-testid": "news-empty" }, "אין כותרות מהימים האחרונים"));
  return h(
    "section",
    { class: "sh-news", "data-testid": "news" },
    kick,
    news.map((n) => {
      const meta = h("span", { class: "news__meta" }, [n.publisher, timeAgo(n.published_at, clock.now())].filter(Boolean).join(" · "));
      const title = h("span", { class: "news__title", dir: "auto" }, n.title);
      return isHttpUrl(n.url)
        ? h("a", { class: "news__link", href: n.url, target: "_blank", rel: "noopener noreferrer", onClick: (e) => openExternal(e, n.url) }, h("span", { class: "news__text" }, title, meta), icon("chevron", 18, 2))
        : h("div", { class: "news__link news__link--plain", "data-testid": "news-plain" }, h("span", { class: "news__text" }, title, meta));
    })
  );
}

function actions(stock) {
  const url = tradingViewUrl(stock.symbol, stock.exchange);
  const tv = url
    ? h("a", { class: "btn btn--outline btn--pill", href: url, target: "_blank", rel: "noopener noreferrer", "data-testid": "open-tv", onClick: (e) => openExternal(e, url) }, "פתח ב-TradingView")
    : h("button", { class: "btn btn--outline btn--pill", type: "button", disabled: true, "data-testid": "open-tv" }, "פתח ב-TradingView");
  const label = h("span", {});
  const mark = h("span", { class: "watch__mark", "aria-hidden": "true" });
  const watch = h("button", { class: "btn btn--primary btn--pill watch", type: "button", "data-testid": "watch-toggle" }, mark, label);
  const paint = () => {
    const on = watched(stock.symbol);
    watch.setAttribute("aria-pressed", String(on));
    watch.classList.toggle("is-on", on);
    label.textContent = on ? "במעקב" : "הוסף למעקב";
    mark.replaceChildren(icon(on ? "check" : "plus", 18, 2.4));
  };
  watch.addEventListener("click", async () => {
    try {
      const on = await toggleWatch(stock);
      app.toast(on ? `${stock.symbol} נוספה למעקב` : `${stock.symbol} הוסרה מהמעקב`, { ms: 1800 });
    } catch (e) {
      app.toast(e?.message_he || "השמירה נכשלה");
    }
    paint();
  });
  paint();
  onLive(watch, "watch", paint);
  return h("div", { class: "sh-actions" }, tv, watch);
}

/**
 * Open the sheet for a stock.
 * @param stock <Stock> (SPEC §4.2)
 * @param ctx {note?: string, asOf?: string, date?: string (history day), notInLists?: boolean, opener?: HTMLElement}
 */
export function openStockSheet(stock, ctx = {}) {
  const calc = computeTotal(stock.scores, (stock.lists || []).length, app.slider);
  let handle = null;
  const sheet = () => handle;
  const flags = flagList(stock, calc);
  const body = h(
    "div",
    { class: "sh" },
    head(stock, calc.total, ctx, sheet),
    ctx.notInLists ? h("p", { class: "sh-note-line", "data-testid": "not-in-lists" }, "המניה לא מופיעה היום באף רשימה. מוצגים הנתונים האחרונים ששמרת.") : null,
    h("div", { class: "sh-sec" }, scoreBars(stock.scores)),
    flags.length ? h("div", { class: "sh-flags" }, flags.map(tag)) : null,
    riskPanel(stock, app.settings, sheet),
    sideCards(stock),
    ctx.note ? h("section", { class: "sh-claude" }, h("span", { class: "kicker sh-kicker" }, "הערת Claude"), h("p", { class: "sh-quote" }, `״${ctx.note}״`)) : null,
    newsBlock(stock)
  );
  handle = openSheet({ label: `כרטיס המניה ${stock.symbol}`, testid: "stock-sheet", body, footer: actions(stock), opener: ctx.opener || null });
  handle.el.dataset.symbol = String(stock.symbol);
  return handle;
}

/** A watched stock that is in no list today: a small sheet with what we stored, TradingView and "remove". */
export function openWatchOnlySheet(entry) {
  const stock = { symbol: entry.symbol, name: entry.name, exchange: entry.exchange };
  const body = h(
    "div",
    { class: "sh" },
    h("div", { class: "sh-head" }, h("div", { class: "sh-id" }, h("h2", { class: "sh-ticker" }, h("bdi", { dir: "ltr" }, entry.symbol)), entry.name ? h("p", { class: "sh-name" }, h("bdi", {}, entry.name)) : null)),
    h("p", { class: "sh-note-line", "data-testid": "not-in-lists" }, "המניה לא מופיעה היום באף רשימה, ולכן אין לה ציונים עדכניים. היא תחזור לכאן כשתופיע שוב באחת הרשימות.")
  );
  const handle = openSheet({ label: `כרטיס המניה ${entry.symbol}`, testid: "stock-sheet", body, footer: actions(stock) });
  handle.el.dataset.symbol = entry.symbol;
  return handle;
}
