// History: #/history (date cards) and #/history/<date> (that day's lists; read-only category screens).
import { h, icon, clear, isWide } from "../dom.js";
import { app } from "../state.js";
import { fmtDMY, weekdayHe, nyToday, clock, fmtInt } from "../format.js";
import { skeleton, emptyState, errorState } from "../components/states.js";
import { topBar, masthead, metaLine, sectionHead, kicker } from "../components/chrome.js";
import { catCard } from "./home.js";

const dayLabel = (d) => {
  const today = nyToday(clock.now());
  const yest = nyToday(clock.now() - 86400000);
  return d === today ? "היום" : d === yest ? "אתמול" : weekdayHe(d);
};

function frame(root, { kicker: k, title, meta, back }) {
  const wide = isWide();
  if (!wide) root.append(topBar({ kicker: k, back, backLabel: back === "#/home" ? "חזרה לבית" : "חזרה להיסטוריה" }));
  root.append(masthead({ kicker: wide ? k.replace("STOCKSCENTER · ", "") : null, title, meta }));
  if (app.bannerBox) root.append(app.bannerBox);
}

export async function mountList(root) {
  let alive = true;
  async function load() {
    clear(root);
    frame(root, { kicker: "STOCKSCENTER · HISTORY", title: "היסטוריה", meta: metaLine(["סריקות קודמות", "לקריאה בלבד"]), back: "#/home" });
    root.append(skeleton(4, "rows"));
    let data;
    try {
      data = await app.adapter.getHistoryIndex();
    } catch (e) {
      if (!alive) return;
      root.lastChild.replaceWith(h("div", { class: "pad-x" }, errorState(e, load)));
      return;
    }
    if (!alive) return;
    const dates = data.dates || [];
    if (!dates.length) {
      root.lastChild.replaceWith(h("div", { class: "pad-x" }, emptyState({ testid: "empty-history", title: "עוד אין היסטוריה", text: "אחרי הסריקה הראשונה, כל יום יישמר כאן למשך 60 יום (צילומי המסך ל-30 יום).", action: { href: "#/home", label: "חזרה לבית" } })));
      return;
    }
    root.querySelector('[data-testid="masthead"] .meta')?.replaceWith(metaLine([`${fmtInt(dates.length)} ימים שמורים`, "לקריאה בלבד"]));
    root.lastChild.replaceWith(
      h(
        "div",
        { class: "days", "data-testid": "history-list" },
        dates.map((d) =>
          h(
            "a",
            { class: "card daycard", href: `#/history/${d}`, "data-testid": `history-day-${d}` },
            h("span", { class: "tile", "aria-hidden": "true" }, icon("calendar", 22, 2)),
            h("span", { class: "daycard__names" }, h("span", { class: "daycard__title" }, dayLabel(d)), h("span", { class: "daycard__sub num" }, fmtDMY(d))),
            h("span", { class: "daycard__chev", "aria-hidden": "true" }, icon("chevron", 20, 2))
          )
        )
      )
    );
  }
  await load();
  return () => (alive = false);
}

export async function mountDay(root, route) {
  let alive = true;
  const wide = isWide();
  async function load() {
    clear(root);
    const title = `${weekdayHe(route.date)}, ${fmtDMY(route.date).slice(0, 5)}`;
    frame(root, { kicker: "STOCKSCENTER · HISTORY", title, meta: metaLine([fmtDMY(route.date), "צפייה בלבד", "הנתונים כפי שנשמרו באותו יום"]), back: "#/history" });
    root.append(skeleton(5, "rows"));
    let idx;
    try {
      idx = await app.adapter.getHistoryIndexFor(route.date);
    } catch (e) {
      if (!alive) return;
      root.lastChild.replaceWith(h("div", { class: "pad-x" }, errorState(e, load)));
      return;
    }
    if (!alive) return;
    const combined = h(
      "a",
      { class: "card daycombo", href: `#/history/${route.date}/combined`, "data-testid": "history-combined" },
      h("span", { class: "tile tile--brand", "aria-hidden": "true" }, icon("layers", 22, 2)),
      h("span", { class: "daycard__names" }, kicker("דירוג משולב"), h("span", { class: "daycard__title" }, "מניות שהופיעו ביותר מרשימה אחת")),
      h("span", { class: "daycard__chev", "aria-hidden": "true" }, icon("chevron", 20, 2))
    );
    const list = h(
      "div",
      { class: wide ? "catgrid" : "catlist" },
      (idx.categories || []).map((c) => catCard(c, { testid: `history-cat-${c.id}`, href: `#/history/${route.date}/${c.id}`, scan: false }))
    );
    root.lastChild.replaceWith(h("div", { class: "home" + (wide ? " home--wide" : "") }, combined, h("section", { class: "lists", "aria-labelledby": "day-lists-h" }, sectionHead("הרשימות באותו יום", `${fmtInt((idx.categories || []).length)} רשימות`, { id: "day-lists-h" }), list)));
  }
  await load();
  return () => (alive = false);
}
