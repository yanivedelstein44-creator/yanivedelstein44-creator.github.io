// Category screen (live: #/cat/<id>, history: #/history/<date>/<id>).
// Phone (MergedListLite): slim sticky top bar, masthead, screenshot + weight slider, sort chips, "הדירוג" with the #1
// row expanded, and the Claude report. Desktop (MergedDesktop): masthead with the slider and a 2 px rule, the ranking
// table, and a 300 px side column with the screenshot and the report.
import { h, clear, isWide } from "../dom.js";
import { app, onLive, requestScan } from "../state.js";
import { clock, fmtDMY, fmtClock, weekdayHe, whenHe, stocksHe } from "../format.js";
import { skeleton, emptyState, errorState } from "../components/states.js";
import { topBar, masthead, metaLine, sectionHead } from "../components/chrome.js";
import { roundScan, pcMeta, scanState } from "../components/scanButton.js";
import { screenshotTile } from "../components/shot.js";
import { reportCard, disclaimer } from "../components/report.js";
import { ranking } from "../components/ranking.js";
import { asOfLabel } from "../components/stockSheet.js";

export { DISCLAIMER } from "../components/report.js";

const ERROR_HINT = {
  tv_not_logged_in: "התוכנה במחשב צריכה התחברות מחדש ל-TradingView (בהגדרות התוכנה).",
  screen_not_found: "בדוק שכתובת המסך השמור ב-TradingView נכונה (בהגדרות התוכנה).",
};

export async function mount(root, route) {
  let alive = true;
  let child = null;
  const hist = route.name === "historyCat";
  const wide = isWide();
  const back = hist ? `#/history/${route.date}` : "#/home";
  const unsub = [];

  const scanBtn = () => (hist ? null : roundScan({ ids: [route.id], label: "סרוק את הרשימה", testid: `scan-${route.id}`, tone: "brand", size: 44 }).el);

  function chrome(cat) {
    const nameEn = (cat?.name_en || route.id).toUpperCase();
    const out = [];
    if (!wide) out.push(topBar({ kicker: `STOCKSCENTER · ${nameEn}`, back, action: scanBtn(), backLabel: hist ? "חזרה ליום" : "חזרה לבית" }));
    return out;
  }

  function meta(cat, n) {
    const el = h("p", { class: "meta", "data-testid": "category-meta" });
    const fill = () => {
      const parts = [];
      if (!cat.error) parts.push(stocksHe(n));
      if (hist) parts.push(`${weekdayHe(route.date)}, ${fmtDMY(route.date)}`, cat.scanned_at ? `נשמר ב-${fmtClock(cat.scanned_at)}` : null, "לקריאה בלבד");
      else parts.push(cat.scanned_at ? `נסרק ${whenHe(cat.scanned_at, clock.now())}` : "טרם נסרק");
      const pc = hist ? null : pcMeta();
      if (pc) parts.push(pc.text);
      el.replaceChildren(...metaLine(parts, { dot: hist ? null : pc ? (pc.on ? "on" : "off") : null }).childNodes);
    };
    fill();
    if (!hist) onLive(el, ["status", "tick"], fill);
    return el;
  }

  function errorCard(cat) {
    const btn = hist ? null : h("button", { class: "btn btn--primary btn--sm btn--pill", type: "button", "data-testid": "retry-scan" }, "נסה שוב");
    if (btn) {
      const sync = () => {
        const st = scanState([cat.id]);
        btn.setAttribute("aria-disabled", String(st.off || st.busy));
        btn.textContent = st.off ? "המחשב לא מחובר" : st.busy ? "סורק…" : "נסה שוב";
      };
      btn.addEventListener("click", () => {
        const st = scanState([cat.id]);
        if (st.off) return app.toast("המחשב לא מחובר. סריקה חדשה תתאפשר כשהוא יתחבר.");
        if (st.busy) return app.toast("סריקה כבר רצה. אפשר לנסות שוב כשהיא תסתיים.");
        requestScan([cat.id]);
      });
      sync();
      onLive(btn, "status", sync);
    }
    const hint = ERROR_HINT[cat.error.code];
    return h(
      "div",
      { class: "card state state--warn state--left", role: "alert", "data-testid": "category-error" },
      h("p", { class: "state__title" }, "הסריקה של הרשימה נכשלה"),
      h("p", { class: "state__text" }, cat.error.message_he || "שגיאה לא ידועה", hint ? h("span", { class: "state__hint" }, " " + hint) : null),
      cat.screenshot ? h("p", { class: "state__text state__text--quiet" }, "מוצג צילום המסך האחרון שנשמר.") : null,
      btn ? h("div", { class: "state__actions" }, btn) : null
    );
  }

  function emptyCard(cat) {
    const scan = hist ? null : roundScan({ ids: [cat.id], label: "סרוק את הרשימה עכשיו", testid: "empty-scan", tone: "dark", size: 44 }).el;
    return emptyState({
      testid: "empty-category",
      title: "אין מניות שעונות על התנאים היום",
      text: cat.scanned_at ? `הסריקה האחרונה ${whenHe(cat.scanned_at, clock.now())} לא מצאה מניות במסך הזה. זה תקין, ונסה שוב אחרי הסריקה הבאה.` : "הרשימה עוד לא נסרקה.",
      extra: scan ? h("div", { class: "state__scan" }, scan, h("span", { class: "state__scan-label" }, "סרוק שוב")) : null,
    });
  }

  async function load() {
    child?.destroy?.();
    child = null;
    clear(root);
    root.append(...chrome(null), skeleton(5, wide ? "page" : "rows"));
    let cat;
    try {
      cat = await (hist ? app.adapter.getHistoryCategory(route.date, route.id) : app.adapter.getCategory(route.id));
    } catch (e) {
      if (!alive) return;
      clear(root);
      root.append(...chrome(null), masthead({ title: app.index?.categories.find((c) => c.id === route.id)?.name_he || "רשימה" }));
      if (app.bannerBox) root.append(app.bannerBox);
      root.append(h("div", { class: "pad-x" }, errorState(e, load)));
      return;
    }
    if (!alive) return;
    clear(root);
    const stocks = cat.stocks || [];
    const ctx = { asOf: asOfLabel(cat.trade_date), date: hist ? route.date : null };
    const notes = cat.report?.notes || {};
    if (stocks.length) child = ranking({ stocks, notes, ctx, label: `הדירוג של ${cat.name_he || route.id}` });
    const shotArgs = { caption: `${cat.name_he || ""} · צילום מסך`, version: cat.scanned_at };
    const histNote = null; // the meta line carries the day and "לקריאה בלבד"

    if (wide) {
      root.append(
        masthead({
          kicker: (cat.name_en || route.id).toUpperCase(),
          title: cat.name_he || route.id,
          meta: meta(cat, stocks.length),
          aside: child ? child.slider : null,
        })
      );
      if (app.bannerBox) root.append(app.bannerBox);
      if (histNote) root.append(histNote);
      if (cat.error) root.append(errorCard(cat));
      const main = child ? child.list : !cat.error ? emptyCard(cat) : null;
      const side = h("div", { class: "cat-side" }, screenshotTile(cat.screenshot, { ...shotArgs, size: "side" }), reportCard(cat.report, { compact: true }) || disclaimer());
      root.append(h("div", { class: "cat-grid" }, h("div", { class: "cat-main" }, child ? child.sort : null, main), side));
      return;
    }

    root.append(...chrome(cat), masthead({ title: cat.name_he || route.id, meta: meta(cat, stocks.length) }));
    if (app.bannerBox) root.append(app.bannerBox);
    if (histNote) root.append(histNote);
    if (cat.error) root.append(h("div", { class: "pad-x" }, errorCard(cat)));
    if (child) {
      root.append(
        h("div", { class: "shotbar" }, screenshotTile(cat.screenshot, { ...shotArgs, size: "thumb" }), h("div", { class: "card weights-card" }, child.slider)),
        child.sort,
        h("section", { class: "ranking", "aria-labelledby": "rank-h" }, sectionHead("הדירוג", "מהגבוה לנמוך", { id: "rank-h" }), h("div", { class: "card rank-card" }, child.list))
      );
    } else {
      if (!cat.error) root.append(h("div", { class: "pad-x" }, emptyCard(cat)));
      root.append(h("div", { class: "pad-x shot-row" }, screenshotTile(cat.screenshot, { ...shotArgs, size: "wide" })));
    }
    const rep = reportCard(cat.report);
    root.append(h("div", { class: "pad-x report-row" }, rep || disclaimer()));
  }

  unsub.push(app.bus.on("refresh", () => alive && !hist && load()));
  await load();
  return () => {
    alive = false;
    unsub.forEach((u) => u());
    child?.destroy?.();
  };
}
