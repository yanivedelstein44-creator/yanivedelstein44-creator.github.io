// Combined ranking: live (#/combined) and history (#/history/<date>/combined). Same language as a category:
// slim top bar, masthead, slider, sort, ranking card (phone) or masthead + table (desktop).
import { h, clear, isWide } from "../dom.js";
import { app } from "../state.js";
import { clock, fmtDMY, weekdayHe, timeAgo, stocksHe, nyToday } from "../format.js";
import { skeleton, emptyState, errorState } from "../components/states.js";
import { topBar, masthead, metaLine, sectionHead, kicker } from "../components/chrome.js";
import { ranking } from "../components/ranking.js";
import { disclaimer } from "../components/report.js";
import { asOfLabel } from "../components/stockSheet.js";

const nyDate = (iso) => (iso && Number.isFinite(Date.parse(iso)) ? nyToday(Date.parse(iso)) : null);

function howItWorks() {
  return h(
    "article",
    { class: "card report report--compact", "data-testid": "combined-about" },
    kicker("איך נבנה הדירוג"),
    h("h2", { class: "report__head" }, "מניות שחוזרות בכמה רשימות"),
    h("p", { class: "report__body" }, "כל מניה שמופיעה בשתי רשימות או יותר נכנסת לכאן, עם בונוס של 3 נקודות לכל רשימה נוספת (עד 6). הציון הכולל מחושב מחדש לפי הסליידר."),
    h("p", { class: "report__foot" }, "לא ייעוץ השקעות")
  );
}

export async function mount(root, route) {
  let alive = true;
  let child = null;
  const hist = route.name === "historyCombined";
  const wide = isWide();
  const back = hist ? `#/history/${route.date}` : "#/home";
  const bar = () => (wide ? null : topBar({ kicker: "STOCKSCENTER · COMBINED", back, backLabel: hist ? "חזרה ליום" : "חזרה לבית" }));

  async function load() {
    child?.destroy?.();
    child = null;
    clear(root);
    root.append(...[bar(), skeleton(5, wide ? "page" : "rows")].filter(Boolean));
    let data;
    try {
      data = await (hist ? app.adapter.getHistoryCombined(route.date) : app.adapter.getCombined());
    } catch (e) {
      if (!alive) return;
      clear(root);
      root.append(...[bar(), masthead({ title: "דירוג משולב" })].filter(Boolean));
      if (app.bannerBox) root.append(app.bannerBox);
      root.append(h("div", { class: "pad-x" }, errorState(e, load)));
      return;
    }
    if (!alive) return;
    clear(root);
    const stocks = data.stocks || [];
    const parts = [stocksHe(stocks.length), "בשתי רשימות או יותר"];
    if (hist) parts.push(`${weekdayHe(route.date)}, ${fmtDMY(route.date)}`, "לקריאה בלבד");
    else if (data.updated_at) parts.push(`עודכן ${timeAgo(data.updated_at, clock.now())}`);
    const meta = metaLine(parts, { testid: "combined-meta" });
    if (stocks.length) child = ranking({ stocks, ctx: { asOf: asOfLabel(hist ? route.date : nyDate(data.updated_at)), date: hist ? route.date : null }, label: "הדירוג המשולב" });
    const empty = () =>
      emptyState({
        testid: "empty-combined",
        title: "עדיין אין מניות שמופיעות ביותר מרשימה אחת",
        text: "אחרי סריקה של כמה רשימות, מניות שחוזרות בכמה מהן יופיעו כאן עם בונוס בציון.",
        action: { href: "#/home", label: "חזרה לבית" },
      });
    const histNote = null; // the meta line carries the day and "לקריאה בלבד"

    if (wide) {
      root.append(masthead({ kicker: "COMBINED", title: "דירוג משולב", meta, aside: child ? child.slider : null }));
      if (app.bannerBox) root.append(app.bannerBox);
      if (histNote) root.append(histNote);
      root.append(h("div", { class: "cat-grid" }, h("div", { class: "cat-main" }, child ? [child.sort, child.list] : empty()), h("div", { class: "cat-side" }, howItWorks())));
      return;
    }
    root.append(bar(), masthead({ title: "דירוג משולב", meta }));
    if (app.bannerBox) root.append(app.bannerBox);
    if (histNote) root.append(histNote);
    if (child) {
      root.append(
        h("div", { class: "pad-x" }, h("div", { class: "card weights-card weights-card--full" }, child.slider)),
        child.sort,
        h("section", { class: "ranking", "aria-labelledby": "rank-h" }, sectionHead("הדירוג", "מהגבוה לנמוך", { id: "rank-h" }), h("div", { class: "card rank-card" }, child.list))
      );
    } else root.append(h("div", { class: "pad-x" }, empty()));
    root.append(h("div", { class: "pad-x report-row" }, disclaimer()));
  }
  const off = app.bus.on("refresh", () => alive && !hist && load());
  await load();
  return () => {
    alive = false;
    off();
    child?.destroy?.();
  };
}
