// "שווקים" (SPEC §6.11): the market regime, CPI / rate dates, indices, crypto, commodities, bonds and currencies with
// their day / week / month / YTD changes and trend, and the 11 sectors ranked by strength. Phone: cards with one period
// at a time (chips). Desktop: tables with every period, and a side column with the regime, the dates and the sectors.
import { h, clear, isWide, ltr, svg } from "../dom.js";
import { app, loadMarket } from "../state.js";
import { clock, timeAgo, fmtDMY, weekdayHe, fmtNum } from "../format.js";
import { skeleton, emptyState } from "../components/states.js";
import { topBar, masthead, metaLine, sectionHead, kicker } from "../components/chrome.js";
import { REGIME, TREND, STRENGTH, PERIODS, hasMarket, fmtChange, fmtLevel, toneOf, rankedSectors, upcomingEvents, eventLocalTime, isStale } from "../markets.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const PERIOD_KEY = "sc.marketsPeriod";

function readPeriod() {
  try {
    const v = localStorage.getItem(PERIOD_KEY);
    return PERIODS.some(([k]) => k === v) ? v : "day";
  } catch {
    return "day";
  }
}

function savePeriod(v) {
  try {
    localStorage.setItem(PERIOD_KEY, v);
  } catch {
    /* private mode */
  }
}

/** A small line of the last month's closes (decorative; the numbers are in the row). */
function spark(values, tone) {
  const v = (values || []).filter(isNum);
  if (v.length < 2) return h("span", { class: "spark spark--none", "aria-hidden": "true" });
  const W = 64;
  const H = 20;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const span = hi - lo || 1;
  const pts = v.map((x, i) => `${((i / (v.length - 1)) * W).toFixed(1)},${(H - 2 - ((x - lo) / span) * (H - 4)).toFixed(1)}`).join(" ");
  return svg(`<svg class="spark is-${tone}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`);
}

/** A rising VIX is bad news: its colors are the other way round (the words stay the same). */
const flip = (tone, invert) => (!invert ? tone : tone === "up" ? "down" : tone === "down" ? "up" : tone);

/** A change chip: the number stays left-to-right, the "נ״ב" unit of a yield stays outside the LTR run. */
function chg(v, unit, { invert = false } = {}) {
  const tone = flip(toneOf(v), invert);
  if (unit !== "bp" || !isNum(v)) return ltr(fmtChange(v, unit), `mk-chg is-${tone}`);
  const n = Math.round(v);
  return h("span", { class: `mk-chg is-${tone}` }, ltr((n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n)), " נ״ב");
}

function trendChip(t, invert = false) {
  const tr = TREND[t];
  return tr ? h("span", { class: `mk-trend is-${flip(tr.tone, invert)}` }, tr.label) : h("span", { class: "mk-trend is-flat" }, "—");
}

const inverted = (i) => i.kind === "volatility";

/* ---------- regime and dates ---------- */

function regimeCard(doc) {
  const r = doc.regime;
  const reg = r && REGIME[r.state];
  if (!reg)
    return h("section", { class: "card mk-regime", "data-testid": "markets-regime" }, kicker("מצב השוק"), h("p", { class: "mk-regime__text" }, "אין מספיק נתונים על S&P 500 כדי לקבוע את מצב השוק."));
  return h(
    "section",
    { class: "card mk-regime", "data-testid": "markets-regime", "data-state": r.state },
    kicker("מצב השוק"),
    h("div", { class: "mk-regime__row" }, h("span", { class: `tag tag--${reg.tone} mk-regime__tag` }, reg.label), h("span", { class: "mk-regime__size" }, reg.size)),
    h("ul", { class: "mk-regime__list" }, (r.reasons_he || []).map((t) => h("li", {}, t))),
    h("p", { class: "mk-regime__note" }, "הכלל: מתחת לממוצע של 200 יום או VIX מעל 30, שוק חלש. מעל שני הממוצעים, VIX מתחת ל-25 ולפחות 6 סקטורים מעל הממוצע של 50, שוק תומך. כלל אצבע לגודל הפוזיציה, לא ייעוץ השקעות.")
  );
}

function eventsCard(doc) {
  const list = upcomingEvents(doc, clock.now(), 45);
  if (!list.length) return null;
  return h(
    "section",
    { class: "card mk-events", "data-testid": "markets-events" },
    kicker("תאריכים חשובים"),
    h(
      "ul",
      { class: "mk-events__list" },
      list.map((e) => {
        const local = eventLocalTime(e.date, e.time_et);
        return h(
          "li",
          { class: "mk-event" + (e.days <= 7 ? " is-soon" : "") },
          h("span", { class: "mk-event__name" }, e.name_he),
          h("span", { class: "mk-event__when" }, `${weekdayHe(e.date)}, ${fmtDMY(e.date)}`, local ? [" · ", ltr(local.hm), " שעון ישראל"] : null, e.days <= 7 ? ` · ${e.when_he === "היום" || e.when_he === "מחר" ? e.when_he : "השבוע"}` : "")
        );
      })
    )
  );
}

function curveLine(doc) {
  const c = doc.curve;
  if (!c || !isNum(c.spread_10y_2y)) return null;
  return h("p", { class: "mk-curve", "data-testid": "markets-curve" }, "פער התשואות 10 שנים פחות 2 שנים: ", ltr(fmtNum(c.spread_10y_2y, 2) + "%"), c.inverted ? ". העקום הפוך, סימן שהשוק מצפה להאטה." : ".");
}

/* ---------- groups ---------- */

function phoneGroup(g, period) {
  const label = PERIODS.find(([k]) => k === period)?.[1] || "";
  return h(
    "section",
    { class: "mk-group", "data-testid": `markets-group-${g.id}` },
    sectionHead(g.name_he, label),
    h(
      "div",
      { class: "card mk-list" },
      g.items.map((i) =>
        h(
          "div",
          { class: "mk-row", "data-testid": `market-${i.id}` },
          h("span", { class: "mk-row__name" }, h("span", { class: "mk-row__he" }, i.name_he), h("span", { class: "mk-row__lvl" }, ltr(fmtLevel(i)))),
          spark(i.spark, flip(toneOf(i.chg?.month), inverted(i))),
          h("span", { class: "mk-row__end" }, chg(i.chg?.[period], i.unit, { invert: inverted(i) }), trendChip(i.trend, inverted(i)))
        )
      )
    )
  );
}

function deskGroup(g) {
  return h(
    "section",
    { class: "mk-group", "data-testid": `markets-group-${g.id}` },
    sectionHead(g.name_he),
    h(
      "div",
      { class: "card mk-tablecard" },
      h(
        "table",
        { class: "mk-table" },
        h("caption", { class: "sr-only" }, g.name_he),
        h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "נכס"), h("th", { scope: "col" }, "שער"), PERIODS.map(([, t]) => h("th", { scope: "col" }, t)), h("th", { scope: "col" }, "מגמה"), h("th", { scope: "col" }, h("span", { class: "sr-only" }, "חודש אחרון")))),
        h(
          "tbody",
          {},
          g.items.map((i) =>
            h(
              "tr",
              { "data-testid": `market-${i.id}` },
              h("th", { scope: "row", class: "mk-table__name" }, i.name_he),
              h("td", {}, ltr(fmtLevel(i))),
              PERIODS.map(([k]) => h("td", {}, chg(i.chg?.[k], i.unit, { invert: inverted(i) }))),
              h("td", {}, trendChip(i.trend, inverted(i))),
              h("td", {}, spark(i.spark, flip(toneOf(i.chg?.month), inverted(i))))
            )
          )
        )
      )
    )
  );
}

function sectorsCard(doc) {
  const rows = rankedSectors(doc);
  if (!rows.some((r) => isNum(r.price))) return null;
  return h(
    "section",
    { class: "mk-group mk-sectors", "data-testid": "markets-sectors" },
    sectionHead("סקטורים", "חוזק בחודש האחרון מול S&P 500"),
    h(
      "div",
      { class: "card mk-list" },
      rows.map((r) => {
        const st = r.strength && STRENGTH[r.strength];
        return h(
          "div",
          { class: "mk-row mk-row--sector", "data-testid": `sector-${r.etf}` },
          h("span", { class: "mk-rank num", "aria-label": isNum(r.rank) ? `מקום ${r.rank}` : null }, isNum(r.rank) ? String(r.rank) : "—"),
          h("span", { class: "mk-row__name" }, h("span", { class: "mk-row__he" }, r.name_he), h("span", { class: "mk-row__lvl" }, ltr(r.etf), r.above_sma50 == null ? null : r.above_sma50 ? " · מעל ממוצע 50" : " · מתחת לממוצע 50")),
          h("span", { class: "mk-row__end" }, chg(r.chg?.month, "pct"), isNum(r.rs_1m) ? h("span", { class: "mk-rs" }, "מול השוק ", ltr(fmtChange(r.rs_1m), `is-${toneOf(r.rs_1m)}`)) : null, st ? h("span", { class: `tag tag--${st.tone} mk-strength` }, st.label) : null)
        );
      })
    )
  );
}

function sourceNote(doc) {
  const stale = isStale(doc, clock.now());
  return h(
    "p",
    { class: "mk-source" + (stale ? " is-stale" : ""), "data-testid": "markets-source" },
    stale ? "הנתונים לא התעדכנו יותר מיומיים. הם מתעדכנים בכל סריקה, וכל שעה כשהתוכנה במחשב פועלת. " : "",
    "מחירים מ-Yahoo Finance בעיכוב של כ-15 דקות. תשואות האג״ח מ-FRED, יום מסחר אחד אחורה. לא ייעוץ השקעות."
  );
}

/* ---------- mount ---------- */

export async function mount(root) {
  let alive = true;
  const wide = isWide();
  let period = readPeriod();
  const bar = () => (wide ? null : topBar({ kicker: "STOCKSCENTER · MARKETS", back: "#/home", backLabel: "חזרה לבית" }));

  function periodChips(onPick) {
    const box = h("div", { class: "sortbar mk-periods", role: "group", "aria-label": "השינוי לפי תקופה" });
    for (const [k, t] of PERIODS) {
      const b = h("button", { class: "chip", type: "button", "aria-pressed": String(k === period), "data-testid": `period-${k}`, "data-period": k }, t);
      b.addEventListener("click", () => {
        period = k;
        savePeriod(k);
        onPick();
      });
      box.append(b);
    }
    return box;
  }

  function draw(doc) {
    if (!alive) return;
    clear(root);
    const meta = hasMarket(doc)
      ? metaLine([doc.as_of ? `נתונים מ-${fmtDMY(doc.as_of)}` : null, doc.updated_at ? `עודכן ${timeAgo(doc.updated_at, clock.now())}` : null], { testid: "markets-meta" })
      : null;
    const parts = [bar(), masthead({ kicker: wide ? "MARKETS" : null, title: "שווקים", meta })];
    root.append(...parts.filter(Boolean));
    if (app.bannerBox) root.append(app.bannerBox);
    if (!hasMarket(doc)) {
      root.append(
        h(
          "div",
          { class: "pad-x" },
          emptyState({
            testid: "markets-empty",
            title: "עוד אין נתוני שווקים",
            text: "הם יופיעו אחרי הסריקה הבאה, ומאז יתעדכנו כל שעה כשהתוכנה במחשב פועלת.",
            action: { href: "#/home", label: "חזרה לבית" },
          })
        )
      );
      return;
    }
    if (wide) {
      root.append(
        h(
          "div",
          { class: "cat-grid mk-grid" },
          h("div", { class: "cat-main" }, doc.groups.map((g) => [deskGroup(g), g.id === "bonds" ? curveLine(doc) : null]), sourceNote(doc)),
          h("div", { class: "cat-side" }, regimeCard(doc), eventsCard(doc), sectorsCard(doc))
        )
      );
      return;
    }
    const groups = h("div", { class: "mk-groups" });
    const fillGroups = () => groups.replaceChildren(...doc.groups.map((g) => [phoneGroup(g, period), g.id === "bonds" ? curveLine(doc) : null]).flat().filter(Boolean));
    const chips = periodChips(() => {
      chips.querySelectorAll("[data-period]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.period === period)));
      fillGroups();
    });
    fillGroups();
    root.append(...[h("div", { class: "pad-x mk-top" }, regimeCard(doc), eventsCard(doc)), h("div", { class: "pad-x" }, chips), groups, sectorsCard(doc), h("div", { class: "pad-x" }, sourceNote(doc))].filter(Boolean));
  }

  clear(root);
  root.append(...[bar(), masthead({ title: "שווקים" }), skeleton(5, wide ? "page" : "rows")].filter(Boolean));
  if (app.market) draw(app.market);
  const doc = await loadMarket();
  if (!alive) return () => {};
  draw(doc);
  const off = app.bus.on("market", (d) => alive && draw(d));
  return () => {
    alive = false;
    off();
  };
}
