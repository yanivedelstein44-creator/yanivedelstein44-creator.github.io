// "התיק שלי" (#/portfolio, 1.0.12, SPEC §6.14): upload a broker screenshot of the holdings; the PC program reads it
// with Claude and analyses every holding with the scan's own scores, stop and target. Phone: a summary card, then one
// row per holding. Desktop: the same in the main column, with the upload and "איך זה עובד" cards on the side.
import { h, clear, isWide, icon, ltr } from "../dom.js";
import { app, submitPortfolio, pcTooOldForPortfolio, PORTFOLIO_MIN_PC } from "../state.js";
import { fmtPct, fmtInt, priceParts, timeAgo, clock, nyToday } from "../format.js";
import { skeleton, errorState } from "../components/states.js";
import { topBar, masthead, metaLine, sectionHead, kicker } from "../components/chrome.js";
import { totalBadge } from "../components/scoreRing.js";
import { tag } from "../components/flags.js";
import { openStockSheet, asOfLabel } from "../components/stockSheet.js";
import { disclaimer } from "../components/report.js";
import { computeTotal } from "../scoring/total.js";
import { TREND_HE } from "../plan.js";
import { sectorHe } from "../risk.js";
import { shrinkImage } from "../imageShrink.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);

export const STEP_HE = {
  queued: "נשלח למחשב",
  waiting: "ממתין לסיום הסריקה",
  downloading: "המחשב מקבל את הצילום",
  reading: "Claude קורא את הצילום",
  scoring: "מחשב ציונים לכל מניה",
  writing: "כותב ניתוח קצר",
};
const STEP_ORDER = ["queued", "downloading", "reading", "scoring", "writing"];
const KIND_HE = { fund: "קרן נאמנות", bond: "אג״ח", option: "אופציה", cash: "מזומן", other: "נייר אחר", etf: "קרן סל", stock: "מניה" };
const TREND_TONE = { up: "good", mixed: "muted", down: "danger" };
export const ABOUT = [
  "מצלמים את מסך האחזקות בברוקר (אקסלנס, IBKR או כל ברוקר אחר) ומעלים אותו כאן.",
  "התוכנה במחשב שולחת את הצילום ל-Claude עם המפתח שלך ומזהה את המניות. לכל מניה מחושבים הציונים של StocksCenter, סטופ מגן ויעד מהמחיר של היום, והתוכנית.",
  "מניות ישראליות מנותחות לפי הנתונים של Yahoo, והמחירים שלהן באגורות. קרנות, אג״ח ומזומן מוצגים בלי ניתוח.",
  "הצילום נמחק אחרי הקריאה. נשמרים רק האחזקות והניתוח.",
];

const nyDate = (iso) => (iso && Number.isFinite(Date.parse(iso)) ? nyToday(Date.parse(iso)) : null);
const money = (v, cur) => (isNum(v) ? (cur === "USD" ? "$" : "₪") + Math.round(v).toLocaleString("he-IL") : "—");
const totalOf = (st) => (st ? computeTotal(st.scores, Math.max(1, (st.lists || []).length), app.slider).total : null);

/** The analysis in progress (status.portfolio of a request still running), or null. */
export function activeRun(status = app.status, pending = app.pendingPortfolio) {
  const st = status && status.portfolio;
  const fresh = st && (!st.at || clock.now() - Date.parse(st.at) < 15 * 60 * 1000); // a run the PC never finished
  if (st && STEP_HE[st.state] && fresh) return st;
  if (pending) return { id: pending.id, state: "queued" };
  return null;
}

/* ---------- upload, progress, error ---------- */

function uploadCard({ hasDoc, busy, error, oldPc }) {
  const input = h("input", { type: "file", accept: "image/*", class: "sr-only", tabindex: "-1", "aria-hidden": "true", "data-testid": "portfolio-file" });
  const btn = h(
    "button",
    { class: "btn btn--primary btn--pill pf-upload__btn", type: "button", "data-testid": "portfolio-upload", disabled: busy || oldPc ? "" : null },
    icon("plus", 18, 2.4),
    hasDoc ? "ניתוח של צילום חדש" : "בחר צילום של התיק"
  );
  btn.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    btn.disabled = true;
    try {
      const image = await shrinkImage(file);
      const ok = await submitPortfolio(image);
      if (!ok) btn.disabled = false;
    } catch (e) {
      app.toast(e?.message_he || "לא הצלחתי לשלוח את התמונה");
      btn.disabled = false;
    }
  });
  return h(
    "section",
    { class: "card pf-upload", "data-testid": "portfolio-upload-card" },
    kicker(hasDoc ? "ניתוח חדש" : "ניתוח תיק"),
    h("h2", { class: "pf-upload__title" }, hasDoc ? "יש לך צילום חדש של התיק?" : "העלה צילום מסך של התיק"),
    hasDoc ? null : h("p", { class: "pf-upload__text" }, "צלם את מסך האחזקות באקסלנס או בכל ברוקר אחר, כך שהשמות, הכמויות והשווי ייראו. התוכנה במחשב תקרא את הצילום ותנתח כל מניה."),
    error ? h("p", { class: "pf-upload__error", role: "alert", "data-testid": "portfolio-error" }, icon("alert", 16, 2), error) : null,
    oldPc
      ? h(
          "p",
          { class: "pf-upload__old", role: "status", "data-testid": "portfolio-old-pc" },
          icon("alert", 16, 2),
          h("span", {}, "ניתוח מהטלפון עובד מגרסה ", h("bdi", { dir: "ltr" }, PORTFOLIO_MIN_PC), " של התוכנה במחשב, ובמחשב מותקנת ", h("bdi", { dir: "ltr" }, oldPc), ". ", h("a", { href: "#/settings" }, "עדכן אותה בהגדרות"), ".")
        )
      : null,
    btn,
    input,
    h("p", { class: "pf-upload__note" }, "הצילום עובר רק למחשב שלך ול-Claude, ונמחק אחרי הקריאה.")
  );
}

function progressCard(run) {
  const order = run.state === "waiting" ? ["waiting", ...STEP_ORDER.slice(1)] : STEP_ORDER;
  const at = Math.max(0, order.indexOf(run.state));
  return h(
    "section",
    { class: "card pf-progress", role: "status", "aria-live": "polite", "data-testid": "portfolio-progress", "data-state": run.state },
    kicker("מנתח את התיק"),
    h("p", { class: "pf-progress__now" }, STEP_HE[run.state] || STEP_HE.queued),
    // fills by step (one sixth per step, never full until the results replace the card), with a soft pulse
    h("div", { class: "pf-progress__bar", "aria-hidden": "true" }, h("span", { style: `--p:${((at + 1) / (order.length + 1)).toFixed(3)}` })),
    h(
      "ol",
      { class: "pf-steps" },
      order.map((s, i) => h("li", { class: "pf-steps__i" + (i < at ? " is-done" : i === at ? " is-now" : "") }, h("span", { class: "pf-steps__dot", "aria-hidden": "true" }, i < at ? icon("check", 12, 3) : null), STEP_HE[s]))
    ),
    h("p", { class: "pf-progress__note" }, "זה לוקח בדרך כלל דקה עד שתיים. אפשר לצאת מהמסך, הניתוח ממשיך במחשב.")
  );
}

/* ---------- the results ---------- */

function stat(label, value, testid, { cls = "", sub = null } = {}) {
  return h(
    "div",
    { class: ("pf-stat " + cls).trim(), "data-testid": testid },
    h("span", { class: "pf-stat__k" }, label),
    h("span", { class: "pf-stat__v" }, value),
    sub ? h("span", { class: "pf-stat__sub" }, sub) : null
  );
}

function summaryCard(doc) {
  const s = doc.summary || {};
  const tr = s.trend || {};
  const trendLine = [["up", "עולה"], ["mixed", "מעורבת"], ["down", "יורדת"]].filter(([k]) => tr[k]).map(([k, he]) => h("span", { class: `pf-trend pf-trend--${k}` }, `${fmtInt(tr[k])} ${he}`));
  const sectors = (s.sectors || []).slice(0, 3).map((x) => `${sectorHe(x.sector)} ${fmtPct(x.weight, { digits: 0 })}`);
  const rep = doc.report || {};
  const partial = s.analyzed != null && s.analyzed !== s.count;
  // the value is the hero tile; holdings, weighted score and trends share one row of three under it
  return h(
    "section",
    { class: "card pf-summary", "data-testid": "portfolio-summary" },
    kicker("סיכום התיק"),
    h(
      "div",
      { class: "pf-stats" },
      isNum(doc.total_value) ? stat("שווי התיק", ltr(money(doc.total_value, doc.currency)), "portfolio-value", { cls: "pf-stat--hero" }) : null,
      stat("אחזקות", fmtInt(s.count), "portfolio-count", { sub: partial ? `${fmtInt(s.analyzed)} נותחו` : null }),
      stat("ציון משוקלל", isNum(s.weighted_total) ? totalBadge(s.weighted_total, { size: "sm", testid: "portfolio-weighted" }) : "—", "portfolio-weighted-cell"),
      stat("מגמות", trendLine.length ? h("span", { class: "pf-trends" }, trendLine) : "—", "portfolio-trends")
    ),
    s.top || sectors.length
      ? h(
          "p",
          { class: "pf-summary__facts" },
          s.top ? ["המשקל הגדול: ", h("bdi", { dir: "ltr", class: "pf-sym" }, String(s.top.symbol)), ` ${fmtPct(s.top.weight, { digits: 0 })}`] : null,
          s.top && sectors.length ? " · " : null,
          sectors.length ? `ענפים: ${sectors.join(", ")}` : null
        )
      : null,
    (s.earnings_soon || []).length ? h("p", { class: "pf-summary__warn" }, tag({ tone: "warn", text: "דוחות בקרוב" }), " ", h("bdi", { dir: "ltr" }, s.earnings_soon.join(", "))) : null,
    rep.summary_he ? h("p", { class: "pf-summary__text", "data-testid": "portfolio-report" }, rep.summary_he) : rep.error ? h("p", { class: "pf-summary__muted" }, rep.error) : null,
    h("p", { class: "pf-summary__foot" }, "תיאור עובדתי של הנתונים, לא ייעוץ השקעות")
  );
}

/** "סטופ 279.48 אג׳" as a label and a price box whose unit is smaller and lighter than the number. */
function pricePair(label, n, cur) {
  const p = priceParts(n, cur);
  const unit = h("span", { class: "pfrow__unit" }, p.unit);
  return h(
    "span",
    { class: "pfrow__pair" },
    h("span", { class: "pfrow__k" }, label),
    // agorot read "number, unit" right to left; dollars and shekels keep "$123.45" in a left-to-right box
    h("bdi", { dir: p.rtl ? "rtl" : "ltr", class: "num pfrow__px" }, ...(p.rtl ? [p.num, "\u00A0", unit] : [unit, p.num]))
  );
}

function holdingRow(hd, asOf) {
  const st = hd.stock;
  const total = totalOf(st);
  const trend = st?.entry?.trend;
  const cur = st?.currency || "USD";
  const r = st?.risk;
  const name = hd.name && hd.name !== hd.symbol ? hd.name : st?.name && st.name !== hd.symbol ? st.name : null;
  const pnl = isNum(hd.pnl_pct) ? hd.pnl_pct / 100 : null;
  const nums = [];
  if (isNum(hd.weight)) nums.push(h("span", { class: "pfrow__w" }, "משקל ", h("b", { class: "num" }, fmtPct(hd.weight, { digits: hd.weight < 0.1 ? 1 : 0 }))));
  if (isNum(pnl)) nums.push(h("span", { class: "pfrow__g" }, pnl >= 0 ? "רווח " : "הפסד ", h("b", { class: "num " + (pnl > 0 ? "is-up" : pnl < 0 ? "is-down" : ""), dir: "ltr" }, fmtPct(pnl, { signed: true }))));
  const n = (hd.lists || []).length;
  if (n) nums.push(h("span", { class: "pfrow__l" }, n === 1 ? "ברשימה אחת היום" : `ב-${n} רשימות היום`));
  const risk = r && isNum(r.stop) ? h("span", { class: "pfrow__risk" }, pricePair("סטופ", r.stop, cur), isNum(r.target) ? pricePair("יעד", r.target, cur) : null) : null;
  const hit = h(
    "button",
    {
      class: "rrow__hit pfrow__hit",
      type: "button",
      "aria-label": `${hd.symbol}${name ? ", " + name : ""}${isNum(hd.weight) ? `, משקל ${fmtPct(hd.weight, { digits: 0 })}` : ""}${isNum(total) ? `, ציון כולל ${total}` : ""}${trend ? ", " + TREND_HE[trend] : ""}`,
    },
    h(
      "span",
      { class: "rrow__id" },
      // symbol, then the name (cut with "…" in its own direction), and the trend chip at the end of the line
      h(
        "span",
        { class: "rrow__symline pfrow__symline" },
        h("bdi", { class: "rrow__sym", dir: "ltr" }, String(hd.symbol)),
        name ? h("span", { class: "pfrow__name", dir: "auto" }, name) : null,
        trend ? tag({ tone: TREND_TONE[trend] || "muted", text: TREND_HE[trend] }) : null
      ),
      nums.length ? h("span", { class: "pfrow__nums" }, nums) : null,
      risk
    ),
    totalBadge(total, { testid: null })
  );
  const note = hd.note_he ? h("p", { class: "pfrow__note" }, hd.note_he) : null;
  const el = h("article", { class: "rrow rrow--line pfrow", "data-testid": `portfolio-row-${hd.symbol}`, "data-symbol": hd.symbol }, hit, note);
  hit.addEventListener("click", () => openStockSheet(st, { asOf, opener: hit, note: hd.note_he || null }));
  if (note) note.addEventListener("click", () => hit.click()); // the whole row opens the sheet, the note too
  return el;
}

function otherRow(hd) {
  const why = hd.status === "no_data" ? `לא נמצאו נתונים לסימול ${hd.symbol}` : !hd.symbol ? KIND_HE[hd.kind] || "לא זוהה סימול" : KIND_HE[hd.kind] || "נייר שאינו מניה";
  return h(
    "li",
    { class: "pfother__i", "data-testid": "portfolio-other" },
    h("span", { class: "pfother__n" }, h("bdi", {}, hd.name || hd.symbol || "—")),
    h("span", { class: "pfother__why" }, why),
    isNum(hd.weight) ? h("span", { class: "pfother__w num" }, fmtPct(hd.weight, { digits: hd.weight < 0.1 ? 1 : 0 })) : null
  );
}

function holdingsSection(doc) {
  const asOf = asOfLabel(nyDate(doc.analyzed_at));
  const analysed = doc.holdings.filter((x) => x.stock).sort((a, b) => (b.weight ?? -1) - (a.weight ?? -1));
  const others = doc.holdings.filter((x) => !x.stock);
  return [
    h(
      "section",
      { class: "pf-sec", "data-testid": "portfolio-holdings", "aria-labelledby": "pf-h" },
      sectionHead("האחזקות", analysed.length ? "לפי משקל בתיק" : null, { id: "pf-h" }),
      analysed.length
        ? h("div", { class: "card rank rank--lines pf-card" }, analysed.map((x) => holdingRow(x, asOf)))
        : h("div", { class: "card state state--left" }, h("p", { class: "state__title" }, "אין מניה שאפשר לנתח"), h("p", { class: "state__text" }, "בצילום לא נמצאו מניות או קרנות סל עם סימול מוכר."))
    ),
    others.length
      ? h("section", { class: "pf-sec", "aria-labelledby": "pf-o" }, sectionHead("לא נותחו", null, { id: "pf-o" }), h("ul", { class: "card pfother" }, others.map(otherRow)))
      : null,
  ];
}

function about() {
  return h(
    "article",
    { class: "card report report--compact", "data-testid": "portfolio-about" },
    kicker("איך זה עובד"),
    h("h2", { class: "report__head" }, "ניתוח תיק מצילום מסך"),
    ...ABOUT.map((t) => h("p", { class: "report__body" }, t)),
    h("p", { class: "report__foot" }, "תיאור עובדתי, לא ייעוץ השקעות")
  );
}

/* ---------- the screen ---------- */

export async function mount(root) {
  let alive = true;
  const wide = isWide();
  let doc = null;
  let lastError = null; // the Hebrew message of a failed run, shown on the upload card until the next run
  const bar = () => (wide ? null : topBar({ kicker: "STOCKSCENTER · PORTFOLIO", back: "#/home", backLabel: "חזרה לבית" }));
  const slot = h("div", { class: "pf-slot" });

  let oldPc = pcTooOldForPortfolio();
  function drawSlot() {
    const run = activeRun();
    oldPc = pcTooOldForPortfolio();
    slot.replaceChildren(run ? progressCard(run) : uploadCard({ hasDoc: !!(doc && doc.holdings && doc.holdings.length), busy: false, error: lastError, oldPc }));
  }

  function meta() {
    if (!doc || !doc.analyzed_at) return metaLine(["עוד לא נותח צילום"], { testid: "portfolio-meta" });
    const s = doc.summary || {};
    const parts = [`נותח ${timeAgo(doc.analyzed_at, clock.now())}`];
    if (isNum(s.count)) parts.push(s.count === 1 ? "אחזקה אחת" : `${fmtInt(s.count)} אחזקות`);
    if (doc.broker) parts.push(doc.broker);
    return metaLine(parts, { testid: "portfolio-meta" });
  }

  function render() {
    clear(root);
    drawSlot();
    const has = !!(doc && doc.holdings && doc.holdings.length);
    const results = has ? [summaryCard(doc), ...holdingsSection(doc)].filter(Boolean) : [];
    if (wide) {
      root.append(masthead({ kicker: "PORTFOLIO", title: "התיק שלי", meta: meta() }));
      if (app.bannerBox) root.append(app.bannerBox);
      root.append(
        h(
          "div",
          { class: "cat-grid" },
          h("div", { class: "cat-main pf-main" }, ...(has ? results : [slot])),
          h("div", { class: "cat-side" }, has ? slot : null, about())
        )
      );
      return;
    }
    root.append(bar(), masthead({ title: "התיק שלי", meta: meta() }));
    if (app.bannerBox) root.append(app.bannerBox);
    // after an analysis the results come first and the upload card waits at the end (unless a run is in progress)
    const slotFirst = !has || !!activeRun();
    root.append(
      h("div", { class: "pad-x pf-phone" }, slotFirst ? slot : null, ...results, slotFirst ? null : slot, has ? null : about()),
      h("div", { class: "pad-x report-row" }, disclaimer())
    );
  }

  async function load() {
    clear(root);
    root.append(...[bar(), skeleton(3, wide ? "page" : "rows")].filter(Boolean));
    try {
      doc = typeof app.adapter?.getPortfolio === "function" ? await app.adapter.getPortfolio() : null;
    } catch (e) {
      if (!alive) return;
      clear(root);
      root.append(...[bar(), masthead({ title: "התיק שלי" })].filter(Boolean), h("div", { class: "pad-x" }, errorState(e, load)));
      return;
    }
    if (!alive) return;
    if (doc && !Array.isArray(doc.holdings)) doc = null;
    const st0 = app.status?.portfolio;
    if (lastError == null && st0 && st0.state === "error" && (!doc || !doc.analyzed_at || String(st0.at) > String(doc.analyzed_at))) lastError = st0.message_he || "ניתוח התיק נכשל";
    render();
  }

  let lastState = app.status?.portfolio?.state || null;
  const off = app.bus.on("portfolio", (st) => {
    if (!alive) return;
    const state = st ? st.state : null;
    if (state === "error") lastError = st.message_he || "ניתוח התיק נכשל";
    else if (state && state !== "done") lastError = null;
    if (state === "done" && lastState !== "done") {
      lastError = null;
      lastState = state;
      load();
      return;
    }
    lastState = state;
    drawSlot();
  });
  const offTick = app.bus.on("tick", () => alive && doc && root.querySelector("[data-testid=portfolio-meta]")?.replaceWith(meta()));
  // the PC's version arrives with the status: redraw the upload card when "too old for this" changes (e.g. after an update)
  const offStatus = app.bus.on("status", () => alive && !activeRun() && pcTooOldForPortfolio() !== oldPc && drawSlot());
  await load();
  return () => {
    alive = false;
    off();
    offTick();
    offStatus();
  };
}
