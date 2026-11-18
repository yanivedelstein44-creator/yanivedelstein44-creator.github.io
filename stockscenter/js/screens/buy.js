// "מחיר מומלץ" (#/buy, 1.0.9, SPEC §6.13): stocks of the latest scan that reached the plan's buy zone or are close to
// it. Phone: two sections of rows. Desktop: masthead + two tables, and the "איך זה עובד" card on the side.
import { h, clear, isWide } from "../dom.js";
import { app } from "../state.js";
import { loadUniverse } from "../universe.js";
import { buyLists, BUY_KIND, gapLineHe, gapShortHe, BUY_ABOUT, NEAR_ATR } from "../buy.js";
import { computeTotal } from "../scoring/total.js";
import { fmtPrice, fmtDM, timeAgo, clock, fmtInt } from "../format.js";
import { skeleton, emptyState, errorState } from "../components/states.js";
import { topBar, masthead, metaLine, sectionHead, kicker } from "../components/chrome.js";
import { totalBadge } from "../components/scoreRing.js";
import { tag, nameLine, listsLabel } from "../components/flags.js";
import { openStockSheet, asOfLabel } from "../components/stockSheet.js";
import { marketBar } from "../components/marketBar.js";
import { disclaimer } from "../components/report.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const totalOf = (s) => computeTotal(s.scores, (s.lists || []).length, app.slider).total;
const rrHe = (e) => (isNum(e.rr1) ? e.rr1.toFixed(1) : "—");
const countHe = (n, one, many) => (n === 1 ? one : `${fmtInt(n)} ${many}`);

/** The newest trade date among the rows (rows from an older scan carry their own date). */
const newestTrade = (rows) => rows.reduce((m, r) => (r.stock._trade && (!m || r.stock._trade > m) ? r.stock._trade : m), null);

function open(stock, opener) {
  openStockSheet(stock, { asOf: asOfLabel(stock._trade), opener });
}

/* ---------- phone: one row per stock ---------- */

function buyRow({ stock, state }, latest) {
  const e = stock.entry;
  const k = BUY_KIND[state.kind];
  const old = stock._trade && latest && stock._trade < latest ? h("span", { class: "buyrow__old" }, `מחיר מ-${fmtDM(stock._trade)}`) : null;
  const hit = h(
    "button",
    { class: "rrow__hit buyrow__hit", type: "button", "aria-label": `${stock.symbol}${stock.name ? ", " + stock.name : ""}. ${k.label}. ${gapLineHe(state)}. מחיר ${fmtPrice(stock.price)}, מחיר מומלץ ${fmtPrice(e.entry)}` },
    h(
      "span",
      { class: "rrow__id" },
      h("span", { class: "rrow__symline" }, h("bdi", { class: "rrow__sym", dir: "ltr" }, String(stock.symbol)), tag({ tone: k.tone, text: k.label })),
      nameLine("rrow__name", stock.name, listsLabel(stock)),
      h("span", { class: `buyrow__gap is-${state.kind}` }, gapLineHe(state), old ? " · " : "", old),
      h(
        "span",
        { class: "buyrow__nums" },
        h("span", {}, "מחיר ", h("b", { class: "num", dir: "ltr" }, fmtPrice(stock.price))),
        h("span", {}, state.kind === "breakout" ? "קנייה מעל " : "מומלץ ", h("b", { class: "num", dir: "ltr" }, fmtPrice(e.entry))),
        h("span", {}, "סטופ ", h("b", { class: "num", dir: "ltr" }, fmtPrice(e.stop))),
        h("span", {}, "יעד 1 ", h("b", { class: "num", dir: "ltr" }, fmtPrice(e.tp1))),
        h("span", {}, "R:R ", h("b", { class: "num", dir: "ltr" }, rrHe(e)))
      )
    ),
    totalBadge(totalOf(stock), { testid: null })
  );
  const el = h("article", { class: "rrow rrow--line buyrow", "data-testid": `buy-row-${stock.symbol}`, "data-symbol": stock.symbol, "data-kind": state.kind }, hit);
  hit.addEventListener("click", () => open(stock, hit));
  return el;
}

/* ---------- desktop: one table per section ---------- */

const COLS = [
  ["stock", "מניה"],
  ["state", "מצב"],
  ["price", "מחיר"],
  ["entry", "מחיר מומלץ"],
  ["gap", "מרחק"],
  ["max", "מקסימום"],
  ["stop", "סטופ"],
  ["tp1", "יעד 1"],
  ["rr", "R:R"],
  ["total", "כולל"],
];

function buyTable(rows, latest, label) {
  const body = h("tbody");
  for (const { stock, state } of rows) {
    const e = stock.entry;
    const k = BUY_KIND[state.kind];
    const openBtn = h("button", { class: "rt-open", type: "button", title: [stock.name, listsLabel(stock)].filter(Boolean).join(" · ") }, h("bdi", { class: "rt-sym", dir: "ltr" }, String(stock.symbol)), nameLine("rt-name", stock.name, listsLabel(stock)));
    const old = stock._trade && latest && stock._trade < latest ? h("span", { class: "buyrow__old" }, `מ-${fmtDM(stock._trade)}`) : null;
    const num = (v) => h("td", { class: "num bt-num", dir: "ltr" }, v);
    const tr = h(
      "tr",
      { class: "rt-row", "data-testid": `buy-row-${stock.symbol}`, "data-symbol": stock.symbol, "data-kind": state.kind },
      h("td", { class: "rt-stock" }, openBtn),
      h("td", {}, tag({ tone: k.tone, text: k.label })),
      h("td", { class: "num bt-num", dir: "ltr" }, fmtPrice(stock.price), old ? h("div", {}, old) : null),
      num(fmtPrice(e.entry)),
      h("td", { class: `bt-gap is-${state.kind}`, title: gapLineHe(state) }, gapShortHe(state)),
      h("td", { class: "num bt-num bt-c-max", dir: "ltr" }, fmtPrice(e.max_entry)),
      num(fmtPrice(e.stop)),
      num(fmtPrice(e.tp1)),
      num(rrHe(e)),
      h("td", { class: "rt-total" }, totalBadge(totalOf(stock), { size: "sm", testid: null }))
    );
    tr.addEventListener("click", () => open(stock, openBtn));
    body.append(tr);
  }
  return h(
    "div",
    { class: "card rt-card bt-card" },
    h("table", { class: "rtable btable", "aria-label": label }, h("thead", {}, h("tr", {}, COLS.map(([k, t]) => h("th", { scope: "col", class: `bt-c-${k}` }, t)))), body)
  );
}

function about() {
  return h(
    "article",
    { class: "card report report--compact", "data-testid": "buy-about" },
    kicker("איך זה עובד"),
    h("h2", { class: "report__head" }, "המחיר המומלץ של התוכנית"),
    ...BUY_ABOUT.map((t) => h("p", { class: "report__body" }, t)),
    h("p", { class: "report__foot" }, "חישוב לפי כללים קבועים, לא ייעוץ השקעות")
  );
}

export async function mount(root) {
  let alive = true;
  const wide = isWide();
  const bar = () => (wide ? null : topBar({ kicker: "STOCKSCENTER · BUY PRICE", back: "#/home", backLabel: "חזרה לבית" }));

  async function load() {
    clear(root);
    root.append(...[bar(), skeleton(4, wide ? "page" : "rows")].filter(Boolean));
    if (!app.index) {
      clear(root);
      root.append(...[bar(), masthead({ kicker: wide ? "BUY PRICE" : null, title: "מחיר מומלץ" })].filter(Boolean));
      root.append(h("div", { class: "pad-x" }, emptyState({ testid: "empty-buy", title: "אין עדיין נתונים", text: "אחרי סריקה יופיעו כאן מניות שהגיעו למחיר הקנייה המומלץ או קרובות אליו.", action: { href: "#/home", label: "חזרה לבית" } })));
      return;
    }
    let u;
    try {
      u = await loadUniverse();
    } catch (e) {
      if (!alive) return;
      clear(root);
      root.append(...[bar(), masthead({ title: "מחיר מומלץ" })].filter(Boolean), h("div", { class: "pad-x" }, errorState(e, load)));
      return;
    }
    if (!alive) return;
    clear(root);
    const { reached, near } = buyLists(u.stocks);
    const latest = newestTrade([...reached, ...near]);
    const newestAt = u.stocks.reduce((m, s) => (s._at && (!m || s._at > m) ? s._at : m), null);
    const parts = [countHe(reached.length, "מניה אחת הגיעה", "הגיעו"), countHe(near.length, "מניה אחת קרובה", "קרובות")];
    if (newestAt) parts.push(`מחירים מהסריקה, ${timeAgo(newestAt, clock.now())}`);
    const meta = metaLine(parts, { testid: "buy-meta" });
    const partial = u.failed ? h("div", { class: "banner banner--warn banner--inline", role: "status", "data-testid": "buy-partial" }, h("span", { class: "banner__text" }, "חלק מהרשימות לא נטענו, ולכן ייתכן שחסרות כאן מניות.")) : null;

    const empty = (testid, title, text) => h("div", { class: "card state state--left", "data-testid": testid }, h("p", { class: "state__title" }, title), h("p", { class: "state__text" }, text));
    const reachedEmpty = () => empty("buy-none-reached", "אין כרגע מניה בטווח הקנייה", "כשמחיר של מניה ייכנס לטווח של התוכנית שלה, היא תופיע כאן.");
    const nearEmpty = () => empty("buy-none-near", "אין כרגע מניה קרובה", `מניות שנמצאות עד ${NEAR_ATR === 1 ? "ATR אחד" : `${NEAR_ATR} ATR`} מהטווח יופיעו כאן.`);
    const secReached = (body) => h("section", { class: "buy-sec", "data-testid": "buy-reached", "aria-labelledby": "buy-r-h" }, sectionHead("הגיעו למחיר", "בטווח הקנייה של התוכנית", { id: "buy-r-h" }), body);
    const secNear = (body) => h("section", { class: "buy-sec", "data-testid": "buy-near", "aria-labelledby": "buy-n-h" }, sectionHead("קרובות למחיר", "עד ATR אחד מהטווח", { id: "buy-n-h" }), body);

    if (wide) {
      root.append(masthead({ kicker: "BUY PRICE", title: "מחיר מומלץ", meta }));
      if (app.bannerBox) root.append(app.bannerBox);
      if (partial) root.append(partial);
      root.append(
        h(
          "div",
          { class: "cat-grid" },
          h(
            "div",
            { class: "cat-main buy-main" },
            marketBar(),
            secReached(reached.length ? buyTable(reached, latest, "מניות בטווח הקנייה") : reachedEmpty()),
            secNear(near.length ? buyTable(near, latest, "מניות קרובות לטווח הקנייה") : nearEmpty())
          ),
          h("div", { class: "cat-side" }, about())
        )
      );
      return;
    }
    const rows = (list) => h("div", { class: "card rank rank--lines buy-card" }, list.map((r) => buyRow(r, latest)));
    root.append(bar(), masthead({ title: "מחיר מומלץ", meta }));
    if (app.bannerBox) root.append(app.bannerBox);
    root.append(
      h(
        "div",
        { class: "pad-x buy-phone" },
        partial,
        marketBar(),
        secReached(reached.length ? rows(reached) : reachedEmpty()),
        secNear(near.length ? rows(near) : nearEmpty()),
        about()
      ),
      h("div", { class: "pad-x report-row" }, disclaimer())
    );
  }
  const off = app.bus.on("refresh", () => alive && load());
  await load();
  return () => {
    alive = false;
    off();
  };
}
