// The market bar on the home screen (SPEC §6.11): the regime with its position-size rule, S&P 500, Nasdaq 100, VIX,
// sectors above their 50-day average, the 10-year yield and this week's CPI / rate decision. Opens "שווקים".
// Hidden until the markets page exists (an older PC version, or before the first refresh).
import { h, icon, ltr, replace } from "../dom.js";
import { app, loadMarket, onLive } from "../state.js";
import { clock } from "../format.js";
import { REGIME, hasMarket, itemById, fmtChange, fmtLevel, toneOf, upcomingEvents, EVENT_SHORT } from "../markets.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);

function stat(label, value, tone = "", testid = null) {
  return h("span", { class: "mbar__stat", "data-testid": testid }, h("span", { class: "mbar__sk" }, label), " ", ltr(value, "mbar__sv " + (tone ? "is-" + tone : "")));
}

function fill(el, doc) {
  if (!hasMarket(doc)) {
    el.hidden = true;
    el.replaceChildren();
    return;
  }
  el.hidden = false;
  const reg = doc.regime && REGIME[doc.regime.state] ? REGIME[doc.regime.state] : null;
  const spx = itemById(doc, "spx");
  const ndx = itemById(doc, "ndx");
  const vix = itemById(doc, "vix");
  const y10 = itemById(doc, "us10y");
  const stats = [];
  if (spx && isNum(spx.price)) stats.push(stat("S&P 500", fmtChange(spx.chg?.day), toneOf(spx.chg?.day), "mbar-spx"));
  if (ndx && isNum(ndx.price)) stats.push(stat("נאסד״ק", fmtChange(ndx.chg?.day), toneOf(ndx.chg?.day)));
  if (vix && isNum(vix.price)) stats.push(stat("VIX", fmtLevel(vix), vix.price >= 25 ? "down" : "", "mbar-vix")); // high VIX = red
  if (doc.regime && isNum(doc.regime.breadth)) stats.push(stat("סקטורים מעל ממוצע 50", `${doc.regime.breadth}/${doc.regime.breadth_total}`, "", "mbar-breadth"));
  if (y10 && isNum(y10.price)) stats.push(stat("אג״ח 10 שנים", fmtLevel(y10), "", "mbar-10y"));
  const events = upcomingEvents(doc, clock.now(), 7);
  replace( // skips the missing parts (Element.replaceChildren would print "null")
    el,
    h(
      "span",
      { class: "mbar__top" },
      h("span", { class: "mbar__k" }, "מצב השוק"),
      reg ? h("span", { class: `tag tag--${reg.tone}`, "data-testid": "market-regime" }, reg.label) : null,
      reg ? h("span", { class: "mbar__size" }, reg.size) : null,
      h("span", { class: "mbar__chev", "aria-hidden": "true" }, icon("chevron", 18, 2.4))
    ),
    stats.length ? h("span", { class: "mbar__stats" }, stats) : null,
    events.length ? h("span", { class: "mbar__events", "data-testid": "mbar-events" }, "השבוע: ", events.map((e) => `${EVENT_SHORT[e.type] || e.name_he} ${e.when_he}`).join(" · ")) : null
  );
}

export function marketBar() {
  const el = h("a", { class: "card mbar", href: "#/markets", "data-testid": "market-bar", hidden: true });
  fill(el, app.market);
  onLive(el, "market", (doc) => fill(el, doc));
  loadMarket();
  return el;
}
