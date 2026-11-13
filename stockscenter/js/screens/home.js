// Home. Phone (MergedHome): the blue header panel (dateline, PC status, wordmark, bell + settings, scan progress),
// the lead story, "במעקב", and "הרשימות שלי" (10 category cards). Desktop: the masthead "היום", the lead story,
// a grid of category cards and a combined preview.
import { h, icon, clear, isWide, ltr } from "../dom.js";
import { app, refreshIndex, catName, onLive } from "../state.js";
import { clock, fmtInt, datelineHe, editionHe, firstSentences, stocksHe, nyToday, timeAgo } from "../format.js";
import { rankStocks, computeTotal } from "../scoring/total.js";
import { skeleton, emptyState, errorState } from "../components/states.js";
import { installCard } from "../components/installCard.js";
import { statusPill } from "../components/statusPill.js";
import { scanProgress, roundScan, scanState } from "../components/scanButton.js";
import { masthead, sectionHead, metaLine, kicker } from "../components/chrome.js";
import { openAlerts, needsAttention } from "../components/alertsSheet.js";
import { openStockSheet, openWatchOnlySheet, asOfLabel } from "../components/stockSheet.js";
import { stockLine } from "../components/rankList.js";
import { rankTable } from "../components/rankTable.js";
import { listsLabel } from "../components/flags.js";
import { loadUniverse } from "../universe.js";

/** "<SYMBOL> מובילה את <the list>": definite Hebrew forms for the 10 SPEC lists. */
const LEAD_OF = {
  momentum: "המומנטום",
  fundamental: "הרשימה הפונדמנטלית",
  pullback: "התיקון במומנטום",
  volume_breakout: "פריצות הנפח",
  oversold: "מכירת היתר",
  analyst: "דירוג האנליסטים",
  low_vol: "התנודתיות הנמוכה",
  rel_strength: "הכוח היחסי",
  earnings_next: "הדוחות הקרובים",
  earnings_recent: "הדוחות האחרונים",
};
const leadOf = (id) => LEAD_OF[id] || `רשימת ${catName(id)}`;

/* ---------- small per-index cache, so coming back home renders at once (and keeps the scroll position) ---------- */
const cache = { key: "", combined: undefined, cats: new Map() };
const idxKey = () => (app.index ? [app.index.updated_at, ...app.index.categories.map((c) => c.scanned_at)].join("|") : "");
function fresh() {
  const k = idxKey();
  if (cache.key !== k) {
    cache.key = k;
    cache.combined = undefined;
    cache.cats = new Map();
  }
}
async function combinedData() {
  fresh();
  if (cache.combined === undefined) cache.combined = await app.adapter.getCombined().catch(() => null);
  return cache.combined;
}
async function categoryData(id) {
  fresh();
  if (!cache.cats.has(id)) cache.cats.set(id, await app.adapter.getCategory(id).catch(() => null));
  return cache.cats.get(id);
}

/** Lead = combined #1 at the current slider, or the best top total of any list when combined is empty. */
function pickLead(combined, index) {
  const ranked = rankStocks(combined?.stocks || [], "total", app.slider).filter((r) => r.total != null);
  if (ranked.length) {
    const s = ranked[0].stock;
    const lists = s.lists || [];
    const top = index.categories.find((c) => lists.includes(c.id) && c.top?.[0]?.symbol === s.symbol) || index.categories.find((c) => lists.includes(c.id));
    return { symbol: s.symbol, stock: s, total: ranked[0].total, catId: top ? top.id : lists[0], top3: ranked.slice(0, 3) };
  }
  let best = null;
  for (const c of index.categories) {
    const t = c.top && c.top[0];
    if (!c.error && t && typeof t.total === "number" && (!best || t.total > best.t.total)) best = { t, c };
  }
  return best ? { symbol: best.t.symbol, stock: null, total: best.t.total, catId: best.c.id, top3: [] } : null;
}

const factLine = (s) => {
  const sc = s.scores || {};
  const bits = [`מופיעה ${listsLabel(s)} היום`];
  if (typeof sc.technical === "number") bits.push(`טכני ${sc.technical}`);
  if (typeof sc.momentum === "number") bits.push(`מומנטום ${sc.momentum}`);
  if (s.risk && typeof s.risk.rr === "number") bits.push(`R:R ${s.risk.rr.toFixed(2)}`);
  return bits.join(" · ");
};

function fillLead(card, { combined, lead, cat, wide }) {
  card.removeAttribute("aria-busy");
  card.classList.toggle("lead--wide", wide);
  const foot = h("div", { class: "lead__foot", "data-testid": "combined-card" });
  if (lead && lead.top3.length) {
    foot.append(
      h(
        "div",
        { class: "lead__chips" },
        lead.top3.slice(0, window.innerWidth < 390 ? 2 : 3).map((r) => // 360-384 px: 2 chips keep the footer on one row

          h(
            "button",
            { class: "topchip", type: "button", "aria-label": `${r.stock.symbol} ${r.total ?? "—"}, ציון כולל`, onClick: () => openStockSheet(r.stock, { asOf: asOfLabel(nyDate(combined?.updated_at)) }) },
            h("bdi", { dir: "ltr", class: "topchip__sym" }, r.stock.symbol),
            " ",
            h("span", { class: "topchip__num num" }, r.total == null ? "—" : String(r.total))
          )
        )
      ),
      h("a", { class: "lead__more", href: "#/combined" }, "דירוג משולב", icon("chevron", 16, 2.4))
    );
  } else {
    // QA R2-n6: never print a literal null; say it calmly instead
    foot.append(h("p", { class: "lead__calm", "data-testid": "combined-empty" }, "היום אין מניות שמופיעות ביותר מרשימה אחת"));
  }
  if (!lead) {
    card.replaceChildren(kicker("הכותרת של היום"), h("h1", { class: "lead__headline" }, "אין היום מניות ברשימות"), h("p", { class: "lead__deck" }, "הסריקה האחרונה לא מצאה מניות שעונות על התנאים. נסה שוב אחרי הסריקה הבאה."), foot);
    return;
  }
  const stock = lead.stock || (cat?.stocks || []).find((s) => s.symbol === lead.symbol) || null;
  const summary = cat?.report && !cat.report.error ? cat.report.summary_he : "";
  const deck = summary ? firstSentences(summary, 2) : stock ? factLine(stock) : "";
  const headline = h("span", { class: "lead__headline-text" }, ltr(lead.symbol), ` מובילה את ${leadOf(lead.catId)} עם ציון ${lead.total}`);
  const open = () => stock && openStockSheet(stock, { asOf: asOfLabel(cat?.trade_date || nyDate(combined?.updated_at)), note: cat?.report?.notes?.[stock.symbol] });
  card.replaceChildren(
    kicker("הכותרת של היום"),
    h("h1", { class: "lead__headline" }, stock ? h("button", { class: "lead__open", type: "button", "data-testid": "lead-open", onClick: open }, headline) : headline),
    deck ? h("p", { class: "lead__deck" }, deck) : null,
    foot
  );
}

function leadStory(index, { wide }) {
  const card = h("article", { class: "card lead", "data-testid": "lead-story", "aria-busy": "true" }, kicker("הכותרת של היום"), h("div", { class: "skel__b skel__b--headline" }), h("div", { class: "skel__b skel__b--line" }), h("div", { class: "skel__b skel__b--line skel__b--short" }));
  fresh();
  // warm cache: fill synchronously (no layout jump when coming back home)
  if (cache.combined !== undefined) {
    const lead = pickLead(cache.combined, index);
    if (!lead || !lead.catId || cache.cats.has(lead.catId)) {
      fillLead(card, { combined: cache.combined, lead, cat: lead?.catId ? cache.cats.get(lead.catId) : null, wide });
      return card;
    }
  }
  (async () => {
    const combined = await combinedData();
    const lead = pickLead(combined, index);
    const cat = lead?.catId ? await categoryData(lead.catId) : null;
    fillLead(card, { combined, lead, cat, wide });
  })();
  return card;
}

const nyDate = (iso) => (iso && Number.isFinite(Date.parse(iso)) ? nyToday(Date.parse(iso)) : null);

/* ---------- category cards ---------- */

/**
 * The card's sub line as DOM parts. The leader / state comes first, so a narrow card cuts the English name, not the
 * symbol; the symbol and the English name are isolated (<bdi>) so "·" stays between them in RTL.
 */
function catSub(c) {
  const SEP = "\u00a0·\u00a0"; // flex items trim plain spaces
  const en = () => h("bdi", { class: "catcard__en", dir: "ltr" }, c.name_en || "");
  const lead = (...kids) => h("span", { class: "catcard__state" }, ...kids, SEP);
  if (c.error) return { parts: [h("span", { class: "catcard__en" }, `שגיאה: ${c.error.message_he || "הסריקה נכשלה"}`)], tone: "error" };
  if (c.count == null && !c.scanned_at) return { parts: [lead("טרם נסרק"), en()] };
  if (!c.count) return { parts: [lead(nyDate(c.scanned_at) === nyToday(clock.now()) ? "אין מניות היום" : "אין מניות בסריקה האחרונה"), en()] };
  const top = c.top && c.top[0];
  return { parts: top ? [lead("מובילה ", h("bdi", { dir: "ltr" }, top.symbol)), en()] : [en()] };
}

export function catCard(c, { testid = `category-row-${c.id}`, scanTestid = `scan-${c.id}`, href = `#/cat/${c.id}`, scan = true } = {}) {
  const never = c.count == null && !c.scanned_at;
  const top = c.top && c.top[0];
  const sub = catSub(c);
  const subEl = h("span", { class: "catcard__sub" + (sub.tone === "error" ? " is-error" : "") }, ...sub.parts);
  const lead = h(
    "span",
    { class: "catcard__lead" },
    h("span", { class: "catcard__top num" + (top && typeof top.total === "number" ? "" : " is-none") }, top && typeof top.total === "number" ? String(top.total) : "—"),
    h("span", { class: "catcard__count badge" }, never || c.error ? "" : stocksHe(c.count || 0))
  );
  const main = h(
    "a",
    { class: "catcard__main", href },
    h("span", { class: "tile", "aria-hidden": "true" }, icon(c.id, 23, 2)),
    h("span", { class: "catcard__names" }, h("span", { class: "catcard__he" }, c.name_he), subEl),
    lead
  );
  const el = h("div", { class: "catcard", "data-testid": testid, "data-cat": c.id }, main);
  if (scan) {
    const btn = roundScan({ ids: [c.id], label: `סרוק את ${c.name_he}`, testid: scanTestid, tone: c.count ? "dark" : "light", size: 42 });
    el.append(btn.el);
    let live = null;
    const sync = () => {
      const st = scanState([c.id]);
      const now = !!(st.mine && st.cur && st.cur.category === c.id);
      if (now === live) return;
      live = now;
      if (now) subEl.replaceChildren(h("span", { class: "catcard__en" }, "סורק עכשיו…"));
      else subEl.replaceChildren(...catSub(c).parts);
      subEl.classList.toggle("is-live", now);
    };
    sync();
    onLive(el, "status", sync);
  } else el.append(h("span", { class: "catcard__chev", "aria-hidden": "true" }, icon("chevron", 20, 2)));
  return el;
}

/* ---------- watchlist ("במעקב") ---------- */

function watchSection() {
  const box = h("section", { class: "watch", "data-testid": "watch-section", "aria-labelledby": "watch-h" });
  const draw = () => {
    if (!app.watch.length) {
      box.hidden = true;
      box.replaceChildren();
      return;
    }
    box.hidden = false;
    const list = h("div", { class: "card rank rank--lines" }, skeleton(Math.min(3, app.watch.length), "rows"));
    box.replaceChildren(sectionHead("במעקב", stocksHe(app.watch.length), { id: "watch-h" }), list);
    loadUniverse().then(
      (u) => {
        list.replaceChildren(
          ...app.watch.map((w) => {
            const s = u.bySymbol.get(w.symbol);
            if (!s)
              return stockLine({ stock: { symbol: w.symbol, name: w.name }, total: null, sub: "לא ברשימות היום", onOpen: () => openWatchOnlySheet(w), testid: `watch-${w.symbol}` });
            const t = computeTotal(s.scores, (s.lists || []).length, app.slider).total;
            return stockLine({ stock: s, total: t, sub: (s.lists || []).map(catName).join(" · "), onOpen: () => openStockSheet(s, { asOf: asOfLabel(s._trade) }), testid: `watch-${w.symbol}` });
          })
        );
      },
      () => list.replaceChildren(h("p", { class: "muted pad" }, "לא הצלחנו לטעון את המניות שבמעקב."))
    );
  };
  draw();
  onLive(box, "watch", draw);
  return box;
}

/* ---------- phone header panel ---------- */

function hero() {
  const pill = statusPill({ variant: "hero" });
  const badge = h("span", { class: "iconbtn__badge", "aria-hidden": "true", hidden: true });
  const bell = h("button", { class: "iconbtn iconbtn--onblue", type: "button", "aria-label": "עדכונים", "data-testid": "alerts-button", onClick: () => openAlerts() }, icon("bell", 21, 2), badge);
  const gear = h("a", { class: "iconbtn iconbtn--onblue", href: "#/settings", "aria-label": "הגדרות", "data-testid": "open-settings" }, icon("settings", 21, 2));
  const date = h("span", { class: "hero__date" });
  const el = h(
    "header",
    { class: "hero" },
    h("div", { class: "hero__dateline" }, date, pill.el),
    h("div", { class: "hero__brand" }, h("p", { class: "wordmark", dir: "ltr" }, "StocksCenter"), h("div", { class: "hero__tools" }, bell, gear)),
    scanProgress({ variant: "hero" }).el
  );
  // the status bar is blue while the header panel is on screen, paper once it scrolled away
  if (typeof IntersectionObserver === "function") {
    const meta = document.querySelector('meta[name="theme-color"]');
    const css = getComputedStyle(document.documentElement);
    const io = new IntersectionObserver(([e]) => {
      if (!el.isConnected) return io.disconnect();
      meta?.setAttribute("content", (e.isIntersecting ? css.getPropertyValue("--sc-primary") : css.getPropertyValue("--sc-bg")).trim());
    }, { rootMargin: "-24px 0px 0px 0px" });
    requestAnimationFrame(() => io.observe(el));
  }
  const sync = () => {
    date.textContent = `${datelineHe(clock.now())} · ${editionHe(clock.now())}`;
    const on = needsAttention();
    badge.hidden = !on;
    bell.setAttribute("aria-label", on ? "עדכונים: יש משהו שדורש תשומת לב" : "עדכונים");
  };
  sync();
  onLive(el, ["status", "index", "tick"], sync);
  return el;
}

/* ---------- mount ---------- */

export async function mount(root) {
  let alive = true;
  const unsub = [];
  const wide = isWide();

  function placeBanners(after) {
    if (app.bannerBox) after.after(app.bannerBox);
  }

  async function load() {
    const keepY = root.childElementCount ? window.scrollY : null; // a re-render (new scan) keeps the scroll position
    clear(root);
    const top = wide
      ? masthead({ kicker: `${datelineHe(clock.now())} · ${editionHe(clock.now())}`, title: "היום", meta: metaLine([scanLine()]), testid: "masthead" })
      : hero();
    root.append(top);
    placeBanners(top);
    if (!wide) {
      const ic = installCard(); // phone browser only: "התקן את האפליקציה"
      if (ic) root.append(h("div", { class: "pad-x install-slot" }, ic));
    }
    if (!app.index) {
      root.append(skeleton(4, "cards"));
      await refreshIndex();
      if (!alive) return;
      root.lastChild.remove();
    }
    if (!app.index) {
      const err = app.error || {};
      if (err.code === "unpaired") {
        // not an error: a phone that was never paired gets a calm "connect me" card
        root.append(
          h(
            "div",
            { class: "pad-x" },
            h(
              "section",
              { class: "card state state--left onboard", "data-testid": "error-state", "data-kind": "unpaired" },
              kicker("חיבור ראשון"),
              h("p", { class: "state__title" }, "בוא נחבר את הטלפון למחשב"),
              h("p", { class: "state__text" }, "בתוכנה במחשב לחץ ״התקן בטלפון״ וסרוק את הקוד במצלמה. אפשר גם להעתיק משם את הקישור ולהדביק אותו כאן בהגדרות. המפתח נשמר רק בטלפון הזה."),
              h("div", { class: "state__actions" }, h("a", { class: "btn btn--primary btn--pill", href: "#/settings" }, "להגדרות"), h("button", { class: "btn btn--ghost btn--pill", type: "button", onClick: load }, "נסה שוב"))
            )
          )
        );
        return;
      }
      root.append(h("div", { class: "pad-x" }, errorState({ message_he: err.message_he, needsSettings: err.needsSettings }, load)));
      if (app.mode.desktop && !app.mode.demo)
        root.append(h("div", { class: "pad-x" }, emptyState({ title: "עוד לא התחברת", text: "פתח את אשף ההתקנה כדי לחבר את GitHub ואת TradingView.", action: { href: "#/setup", label: "לאשף ההתקנה" } })));
      return;
    }
    const idx = app.index;
    const never = idx.categories.every((c) => c.count == null && !c.scanned_at);
    const body = h("div", { class: "home" + (wide ? " home--wide" : "") });
    root.append(body);
    if (never && app.status?.restoring)
      body.append(
        h(
          "section",
          { class: "card lead lead--first", "data-testid": "restore-hint", role: "status" },
          kicker("משחזר"),
          h("h1", { class: "lead__headline" }, "משחזר את ההיסטוריה מ-GitHub"),
          h("p", { class: "lead__deck" }, app.status.restore_message_he || "הנתונים והדירוגים יופיעו כאן כשהשחזור יסתיים. אין צורך לסרוק מחדש.")
        )
      );
    else if (never)
      body.append(
        h(
          "section",
          { class: "card lead lead--first", "data-testid": "first-scan-hint" },
          kicker("ברוך הבא"),
          h("h1", { class: "lead__headline" }, "עוד לא בוצעה סריקה"),
          h("p", { class: "lead__deck" }, wide ? "לחץ על \"סרוק הכל\" בתפריט. הסריקה הראשונה לוקחת כמה דקות, ובסיומה הדירוגים יופיעו כאן." : "לחץ על כפתור הסריקה הכחול למטה. הסריקה הראשונה לוקחת כמה דקות, ובסיומה הדירוגים יופיעו כאן.")
        )
      );
    else body.append(leadStory(idx, { wide }));
    body.append(watchSection());
    const list = h("div", { class: wide ? "catgrid" : "catlist", "data-testid": wide ? "category-grid" : "category-list" });
    for (const c of idx.categories) list.append(wide ? catCard(c, { testid: `category-card-${c.id}`, scanTestid: `card-scan-${c.id}` }) : catCard(c));
    body.append(h("section", { class: "lists", "aria-labelledby": "lists-h" }, sectionHead("הרשימות שלי", `${fmtInt(idx.categories.length)} רשימות`, { id: "lists-h" }), list));
    if (wide && !never) body.append(combinedPreview());
    if (keepY != null) window.scrollTo(0, keepY);
  }

  function scanLine() {
    const st = app.status;
    if (!st?.last_scan_at) return "עוד לא בוצעה סריקה";
    return `הסריקה האחרונה ${timeAgo(st.last_scan_at, clock.now())}`;
  }

  function combinedPreview() {
    const sec = h("section", { class: "combo-preview", "aria-labelledby": "combo-h" }, sectionHead("הדירוג המשולב", "מניות שמופיעות בשתי רשימות או יותר", { id: "combo-h" }), skeleton(1, "rows"));
    combinedData().then((c) => {
      const stocks = c?.stocks || [];
      if (!stocks.length) return sec.lastChild.replaceWith(h("p", { class: "muted" }, "היום אין מניות שמופיעות ביותר מרשימה אחת."));
      const t = rankTable({ onOpen: (row) => openStockSheet(row.stock, { asOf: asOfLabel(nyDate(c.updated_at)) }), onSort: null, limit: 5, label: "חמש המובילות בדירוג המשולב" });
      t.update(rankStocks(stocks, "total", app.slider), "total");
      sec.lastChild.replaceWith(t.el, h("a", { class: "more-link", href: "#/combined" }, `לדירוג המלא · ${stocksHe(stocks.length)}`, icon("chevron", 16, 2.4)));
    });
    return sec;
  }

  await load();
  unsub.push(app.bus.on("index", () => alive && load()));
  // restore started / finished while the home is open: the first-run hint and the restore card swap
  let wasRestoring = !!app.status?.restoring;
  unsub.push(
    app.bus.on("status", (st) => {
      const now = !!st?.restoring;
      if (alive && now !== wasRestoring) {
        wasRestoring = now;
        if (app.index && app.index.categories.every((c) => c.count == null && !c.scanned_at)) load();
      }
    })
  );
  return () => {
    alive = false;
    unsub.forEach((u) => u());
  };
}
