// Charts of "התיק שלי" (#/portfolio): the analysis card (sectors, the five scores, the momentum / quality map, the
// buy-plan statuses) and the small price range of one holding row. Pure render functions: data in, DOM out.
// Styles: css/charts.css (the .pfc-* and .pfr* rules and the --pfc-* tokens).
//
// Axis direction (decided once, for the map and the price range): a numeric axis runs low -> high from LEFT to RIGHT and
// from bottom to top, in Hebrew too, like every price chart the user reads. Both elements are dir="ltr" boxes, and the
// Hebrew captions inside them are their own right-to-left runs. The 0-100 meter bars are not an axis: like the app's
// other score bars (.hbars) they fill from the reading side, right to left.
//
// Sector colors: seven fixed slots in a fixed order (--pfc-cat-1..7, validated with the dataviz skill's validator for
// both themes, wrap-around pairs included) and a neutral gray for "אחר". A slot is given by the sector's place in
// stats.sectors (weight, high to low); the legend beside the donut always names each color.
import { h, svg } from "../dom.js";
import { fmtPct, fmtInt, fmtPrice, priceParts } from "../format.js";
import { totalBadge } from "./scoreRing.js";
import { barTone } from "./miniBars.js";
import { kicker } from "./chrome.js";
import { PLAN_STATUS } from "../plan.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pct = (w) => fmtPct(w, { digits: w < 0.1 ? 1 : 0 });

const part = (cls, testid, title, ...kids) =>
  h("section", { class: `pfc-part pfc-part--${cls}`, "data-testid": testid }, h("h3", { class: "pfc-h" }, title), ...kids);

/* ---------- a) sectors: donut + legend ---------- */

const CAT_SLOTS = 7;
const TAU = Math.PI * 2;

function donutSvg(items) {
  const R = 47; // mid radius in a 120 box, 18 thick
  const gap = 2.2 / R; // a 2 px surface gap between slices
  const pt = (a) => `${(60 + R * Math.sin(a)).toFixed(2)} ${(60 - R * Math.cos(a)).toFixed(2)}`;
  let a = 0;
  const marks = items
    .map((it, i) => {
      const span = it.share * TAU;
      const from = a;
      a += span;
      if (items.length === 1) return `<circle class="pfc-donut__seg" data-i="${i}" cx="60" cy="60" r="${R}" style="stroke:${it.color}"/>`;
      const g = Math.min(gap, span * 0.4);
      const s = from + g / 2;
      const e = from + span - g / 2;
      return `<path class="pfc-donut__seg" data-i="${i}" d="M ${pt(s)} A ${R} ${R} 0 ${e - s > Math.PI ? 1 : 0} 1 ${pt(e)}" style="stroke:${it.color}"/>`;
    })
    .join("");
  return svg(`<svg class="pfc-donut__svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${marks}</svg>`);
}

function sectorsPart(sectors) {
  const rows = (Array.isArray(sectors) ? sectors : []).filter((s) => s && (isNum(s.weight) ? s.weight > 0 : isNum(s.count) && s.count > 0));
  if (!rows.length) return null;
  // weights when the screenshot gave values; the number of holdings when it did not
  const byWeight = rows.every((s) => isNum(s.weight));
  const size = (s) => (byWeight ? s.weight : isNum(s.count) ? s.count : 0);
  const sum = rows.reduce((t, s) => t + size(s), 0);
  if (!(sum > 0)) return null;
  let slot = 0;
  const items = rows.map((s) => {
    const other = s.key === "other" || slot >= CAT_SLOTS;
    return { ...s, share: size(s) / sum, color: other ? "var(--pfc-cat-other)" : `var(--pfc-cat-${++slot})` };
  });
  const named = items.filter((s) => s.key !== "other").length;

  const donut = h(
    "div",
    { class: "pfc-donut" },
    donutSvg(items),
    h("div", { class: "pfc-donut__mid", "aria-hidden": "true" }, h("b", { class: "pfc-donut__n num" }, fmtInt(named)), h("span", { class: "pfc-donut__l" }, named === 1 ? "ענף" : "ענפים"))
  );
  const legend = h(
    "ul",
    { class: "pfc-legend" },
    items.map((s, i) => {
      const share = byWeight ? pct(s.weight) : `${fmtInt(s.count)}`;
      const li = h(
        "li",
        {
          class: "pfc-legend__i",
          "data-i": i,
          "data-key": s.key,
          "aria-label": `${s.label}: ${byWeight ? share + " מהתיק" : share + " אחזקות"}${isNum(s.score) ? `, ציון ${s.score}` : ""}`,
        },
        h("span", { class: "pfc-legend__sw", style: `background:${s.color}`, "aria-hidden": "true" }),
        h("span", { class: "pfc-legend__name", "aria-hidden": "true" }, String(s.label ?? s.key ?? "")),
        h("span", { class: "pfc-legend__w num", dir: "ltr", "aria-hidden": "true" }, share),
        totalBadge(isNum(s.score) ? Math.round(s.score) : null, { size: "sm", testid: null })
      );
      return li;
    })
  );
  const el = part("sectors", "pf-chart-sectors", "פיזור לפי ענפים", h("div", { class: "pfc-sectors" }, donut, legend));
  // pointing at a legend row or a slice lifts that sector and quiets the others
  const segs = [...donut.querySelectorAll(".pfc-donut__seg")];
  const lis = [...legend.children];
  const focus = (i) => {
    el.classList.toggle("has-active", i != null);
    segs.forEach((s, k) => s.classList.toggle("is-active", k === i));
    lis.forEach((s, k) => s.classList.toggle("is-active", k === i));
  };
  [...segs, ...lis].forEach((n) => {
    n.addEventListener("pointerenter", () => focus(Number(n.getAttribute("data-i"))));
    n.addEventListener("pointerleave", () => focus(null));
  });
  return el;
}

/* ---------- b) the five scores: 0-100 meters ---------- */

function profilePart(profile) {
  const rows = (Array.isArray(profile) ? profile : []).filter((p) => p && p.label);
  if (!rows.some((p) => isNum(p.value))) return null;
  return part(
    "profile",
    "pf-chart-profile",
    "ציוני התיק לפי תחום",
    h(
      "div",
      { class: "pfc-bars", role: "list" },
      rows.map((p, i) => {
        const v = isNum(p.value) ? Math.round(clamp(p.value, 0, 100)) : null;
        return h(
          "div",
          { class: "pfc-bars__row", role: "listitem", "data-key": p.key, "data-v": v == null ? "" : String(v), "aria-label": v == null ? `${p.label}: חסר` : `${p.label}: ${v} מתוך 100` },
          h("span", { class: "pfc-bars__label", "aria-hidden": "true" }, p.label),
          h(
            "span",
            { class: "pfc-bars__track", "aria-hidden": "true" },
            v == null ? null : h("span", { class: `pfc-bars__fill is-${barTone(v)}`, style: `width:${v}%;--i:${i}` })
          ),
          h("span", { class: "pfc-bars__num num" + (v == null ? " is-null" : ""), "aria-hidden": "true" }, v == null ? "—" : String(v))
        );
      })
    ),
    h("p", { class: "pfc-note" }, "ממוצע משוקלל לפי המשקל של כל מניה בתיק")
  );
}

/* ---------- c) the map: momentum (x) against quality (y) ---------- */

// The collision test runs on the smallest plot the card can have (a 360 px phone). On a larger plot the bubbles only
// move apart, so whatever fits here fits everywhere.
const REF = { w: 228, h: 190, pad: 22 }; // the inner 0-100 area, and the margin around it inside the plot
const LABEL_H = 15;
const tierOf = (t) => (!isNum(t) ? "none" : t >= 70 ? "good" : t >= 50 ? "mid" : "low");
const TIER_HE = { good: "70 ומעלה", mid: "50 עד 69", low: "מתחת ל-50", none: "בלי ציון" };
const QUADS = [
  { k: "tr", text: "חזקות בשניהם", w: 74 }, // w: the caption's width at 12 px, for the collision test
  { k: "tl", text: "איכות בלי מומנטום", w: 92 },
  { k: "br", text: "מומנטום בלי איכות", w: 92 },
  { k: "bl", text: "חלשות בשניהם", w: 76 },
];
const hit = (a, b) => Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));

/** Bubble sizes (area by weight) and label sides ("t" | "b" | "r" | "l" | null) for the points, on the reference plot. */
function layoutMap(points) {
  const maxW = Math.max(0, ...points.map((p) => (isNum(p.r) && p.r > 0 ? p.r : 0)));
  const pts = points.map((p) => {
    const rad = maxW > 0 && isNum(p.r) && p.r > 0 ? clamp(Math.sqrt(p.r / maxW) * 20, 7, 20) : maxW > 0 ? 7 : 10;
    const cx = REF.pad + (p.x / 100) * REF.w;
    const cy = REF.pad + (1 - p.y / 100) * REF.h;
    return { ...p, rad, cx, cy, box: { x1: cx - rad, x2: cx + rad, y1: cy - rad, y2: cy + rad }, side: null };
  });
  const W = REF.w + REF.pad * 2;
  const H = REF.h + REF.pad * 2;
  const placed = [];
  // small bubbles first: they have the least room to be told apart without a name
  for (const p of [...pts].sort((a, b) => b.rad - a.rad)) {
    const w = [...String(p.symbol)].reduce((t, ch) => t + (/[.\-: ]/.test(ch) ? 4 : 9.2), 0) + 3; // 12 px bold Rubik
    const g = 3;
    const cands = {
      t: { x1: p.cx - w / 2, x2: p.cx + w / 2, y1: p.cy - p.rad - g - LABEL_H, y2: p.cy - p.rad - g },
      b: { x1: p.cx - w / 2, x2: p.cx + w / 2, y1: p.cy + p.rad + g, y2: p.cy + p.rad + g + LABEL_H },
      r: { x1: p.cx + p.rad + g, x2: p.cx + p.rad + g + w, y1: p.cy - LABEL_H / 2, y2: p.cy + LABEL_H / 2 },
      l: { x1: p.cx - p.rad - g - w, x2: p.cx - p.rad - g, y1: p.cy - LABEL_H / 2, y2: p.cy + LABEL_H / 2 },
    };
    for (const side of p.y >= 50 ? ["t", "r", "l", "b"] : ["b", "r", "l", "t"]) {
      const c = cands[side];
      if (c.x1 < 2 || c.x2 > W - 2 || c.y1 < 2 || c.y2 > H - 2) continue;
      if (pts.some((o) => o !== p && hit(c, o.box) > 0) || placed.some((o) => hit(c, o) > 0)) continue;
      p.side = side;
      placed.push(c);
      break;
    }
  }
  // quadrant captions: the outer corner, or the place beside the middle lines; dropped when a mark sits on both
  const marks = [...pts.map((p) => p.box), ...placed];
  const quads = QUADS.map((q) => {
    const w = q.w;
    const right = q.k[1] === "r";
    const top = q.k[0] === "t";
    const corner = { x1: right ? W - 8 - w : 8, x2: right ? W - 8 : 8 + w, y1: top ? 5 : H - 5 - 16, y2: top ? 5 + 16 : H - 5 };
    const inner = { x1: right ? W - 8 - w : 8, x2: right ? W - 8 : 8 + w, y1: top ? H / 2 - 4 - 16 : H / 2 + 4, y2: top ? H / 2 - 4 : H / 2 + 4 + 16 };
    const free = (b) => !marks.some((m) => hit(b, m) > 0);
    return { ...q, pos: free(corner) ? "corner" : free(inner) ? "inner" : null };
  });
  return { pts, quads };
}

function mapPart(points, weightsKnown, onSelect) {
  const all = (Array.isArray(points) ? points : []).filter((p) => p && p.symbol);
  const usable = all.filter((p) => isNum(p.x) && isNum(p.y)).map((p) => ({ ...p, x: clamp(p.x, 0, 100), y: clamp(p.y, 0, 100) }));
  if (!usable.length) return null;
  const missing = all.filter((p) => !(isNum(p.x) && isNum(p.y)));
  const { pts, quads } = layoutMap(usable);

  const tip = h("div", { class: "pfc-tip", role: "presentation", hidden: true });
  const plot = h("div", { class: "pfc-map__plot" });
  const area = h("ul", { class: "pfc-map__area" });
  const showTip = (p, btn) => {
    tip.replaceChildren(
      h("span", { class: "pfc-tip__head" }, h("bdi", { dir: "ltr", class: "pfc-tip__sym" }, String(p.symbol)), h("span", { class: "pfc-tip__total" }, isNum(p.total) ? `ציון ${Math.round(p.total)}` : "בלי ציון כולל")),
      h("span", { class: "pfc-tip__row" }, "מומנטום ", h("b", { class: "num" }, String(Math.round(p.x))), " · איכות ", h("b", { class: "num" }, String(Math.round(p.y)))),
      isNum(p.r) ? h("span", { class: "pfc-tip__row" }, "משקל בתיק ", h("b", { class: "num", dir: "ltr" }, pct(p.r))) : null
    );
    tip.hidden = false;
    // above the bubble, or under it near the top edge; kept inside the plot
    const pr = plot.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const x = clamp(br.left + br.width / 2 - pr.left - tw / 2, 4, Math.max(4, pr.width - tw - 4));
    const above = br.top - pr.top - th - 8;
    const y = above >= 2 ? above : br.bottom - pr.top + 8;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };
  const hideTip = () => {
    tip.hidden = true;
  };

  // large bubbles first in the DOM, so a small one that overlaps a large one stays on top and reachable
  for (const p of [...pts].sort((a, b) => b.rad - a.rad)) {
    const tier = tierOf(p.total);
    const btn = h(
      "button",
      {
        class: `pfc-pt pfc-pt--${tier}`,
        type: "button",
        "data-symbol": p.symbol,
        "data-testid": `pf-map-pt-${p.symbol}`,
        style: `--d:${(p.rad * 2).toFixed(1)}px`,
        "aria-label": `${p.symbol}: מומנטום ${Math.round(p.x)}, איכות ${Math.round(p.y)}${isNum(p.total) ? `, ציון כולל ${Math.round(p.total)}` : ", בלי ציון כולל"}${isNum(p.r) ? `, משקל ${pct(p.r)}` : ""}`,
      },
      p.side ? h("span", { class: `pfc-pt__label pfc-pt__label--${p.side}`, "aria-hidden": "true" }, String(p.symbol)) : null
    );
    btn.addEventListener("click", () => {
      hideTip();
      if (typeof onSelect === "function") onSelect(p.symbol);
    });
    btn.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "touch") showTip(p, btn); // a tap goes straight to the stock
    });
    btn.addEventListener("pointerleave", hideTip);
    btn.addEventListener("focus", () => {
      if (btn.matches(":focus-visible")) showTip(p, btn);
    });
    btn.addEventListener("blur", hideTip);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideTip();
    });
    area.append(h("li", { class: "pfc-map__pt", style: `left:${p.x}%;top:${100 - p.y}%` }, btn));
  }

  plot.append(
    h("span", { class: "pfc-map__line pfc-map__line--v", "aria-hidden": "true" }),
    h("span", { class: "pfc-map__line pfc-map__line--h", "aria-hidden": "true" }),
    ...quads.filter((q) => q.pos).map((q) => h("span", { class: `pfc-map__q pfc-map__q--${q.k} is-${q.pos}`, dir: "rtl", "aria-hidden": "true" }, q.text)),
    area,
    tip
  );
  const ticks = (cls) => h("div", { class: `pfc-map__ticks ${cls}`, "aria-hidden": "true" }, ...[0, 50, 100].map((t) => h("span", { class: "num", style: `--t:${t}` }, String(t))));
  const tiers = ["good", "mid", "low", "none"].filter((t) => t !== "none" || pts.some((p) => tierOf(p.total) === "none"));

  return part(
    "map",
    "pf-chart-map",
    "מפת התיק: מומנטום מול פונדמנטלי",
    h(
      "div",
      { class: "pfc-map" },
      h("p", { class: "pfc-map__ytitle", "aria-hidden": "true" }, "איכות (פונדמנטלי)"),
      h(
        "div",
        { class: "pfc-map__frame", dir: "ltr", role: "group", "aria-label": "מפת התיק: מומנטום בציר האופקי, איכות (פונדמנטלי) בציר האנכי. כל עיגול הוא מניה, והגודל שלו לפי המשקל בתיק." },
        ticks("pfc-map__ticks--y"),
        plot,
        ticks("pfc-map__ticks--x")
      ),
      h("p", { class: "pfc-map__xtitle", "aria-hidden": "true" }, "מומנטום")
    ),
    h(
      "ul",
      { class: "pfc-keys", "aria-label": "צבע העיגול לפי הציון הכולל" },
      h("li", { class: "pfc-keys__t" }, "ציון כולל:"),
      ...tiers.map((t) => h("li", { class: "pfc-keys__i" }, h("span", { class: `pfc-keys__dot pfc-pt--${t}`, "aria-hidden": "true" }), TIER_HE[t]))
    ),
    h(
      "p",
      { class: "pfc-note" },
      weightsKnown ? "גודל העיגול לפי המשקל בתיק. לחיצה על עיגול פותחת את המניה." : "לחיצה על עיגול פותחת את המניה.",
      missing.length ? [" לא במפה (חסר ציון): ", h("bdi", { dir: "ltr" }, missing.map((p) => p.symbol).join(", ")), "."] : null
    )
  );
}

/* ---------- d) against the recommended buy price ---------- */

const BUY_ORDER = ["in_zone", "breakout", "wait", "extended", "no_room", "down", "none"];
const BUY_NONE = { label: "בלי תוכנית", tone: "plain" };

function buyPart(buy) {
  const rows = BUY_ORDER.map((k) => ({ k, n: buy && isNum(buy[k]) && buy[k] > 0 ? Math.round(buy[k]) : 0, ...(PLAN_STATUS[k] || BUY_NONE) })).filter((r) => r.n > 0);
  const total = rows.reduce((t, r) => t + r.n, 0);
  if (!total) return null;
  const inZone = rows.find((r) => r.k === "in_zone")?.n || 0;
  const summary = rows.map((r) => `${r.label} ${r.n}`).join(", ");
  return part(
    "buy",
    "pf-chart-buy",
    "מול מחיר הקנייה המומלץ",
    h("p", { class: "pfc-buy__lead" }, h("b", { class: "pfc-buy__n num" }, fmtInt(inZone)), ` מתוך ${fmtInt(total)} ${total === 1 ? "אחזקה" : "אחזקות"} בטווח הקנייה`),
    h(
      "div",
      { class: "pfc-seg", role: "img", "aria-label": `מצב האחזקות מול מחיר הקנייה המומלץ: ${summary}` },
      rows.map((r) => h("span", { class: `pfc-seg__s pfc-buy--${r.k}`, style: `flex-grow:${r.n}` }))
    ),
    h(
      "ul",
      { class: "pfc-buy__list" },
      rows.map((r) =>
        h(
          "li",
          { class: `tag tag--${r.tone} pfc-buy__i`, "data-status": r.k, title: PLAN_STATUS[r.k]?.text || null },
          h("span", { class: `pfc-buy__dot pfc-buy--${r.k}`, "aria-hidden": "true" }),
          r.label,
          h("b", { class: "pfc-buy__c num" }, fmtInt(r.n))
        )
      )
    )
  );
}

/* ---------- the card ---------- */

/**
 * The "ניתוח התיק" card. stats = { sectors, profile, points, buy, analyzed, count } (see notes/ui.md); a part with no
 * data is left out, and with no part at all the function returns null. onSelect(symbol) runs when a bubble of the map
 * is clicked, tapped or activated from the keyboard.
 */
export function portfolioAnalysisCard(stats, { onSelect } = {}) {
  const s = stats || {};
  const weightsKnown = (s.points || []).some((p) => p && isNum(p.r) && p.r > 0);
  const parts = [sectorsPart(s.sectors), profilePart(s.profile), mapPart(s.points, weightsKnown, onSelect), buyPart(s.buy)].filter(Boolean);
  if (!parts.length) return null;
  const partial = isNum(s.analyzed) && isNum(s.count) && s.analyzed !== s.count;
  return h(
    "section",
    { class: "card pf-charts", "data-testid": "portfolio-charts" },
    h("div", { class: "pfc-head" }, kicker("ניתוח התיק"), partial ? h("span", { class: "pfc-head__note" }, `לפי ${fmtInt(s.analyzed)} מתוך ${fmtInt(s.count)} אחזקות`) : null),
    h("div", { class: "pfc-grid" }, parts)
  );
}

/* ---------- the price range of one holding ---------- */

const RANGE_W = 232; // the narrowest line the labels are fitted for
const UNIT_W = { USD: 7.9, ILS: 11.2, ILA: 18.9 }; // 12 px semibold Rubik, tabular figures
const textW = (num, cur) => [...num].reduce((t, ch) => t + (/\d|−/.test(ch) ? 7.8 : 3.3), 0) + (UNIT_W[cur] ?? UNIT_W.USD);

/** A price in a box of its own direction: "$123.45", or "292.56 אג׳" (the number, then the unit) for agorot. */
function priceBox(parts, cls) {
  return h("bdi", { dir: parts.rtl ? "rtl" : "ltr", class: `num ${cls}` }, ...(parts.rtl ? [parts.num, "\u00A0", parts.unit] : [parts.unit, parts.num]));
}

/**
 * The plan of one holding on a line: the track runs from the stop (left) to the target (right), the buy zone
 * (entry..maxEntry) is filled, and the dot is today's price. plan = { price, stop, entry, maxEntry, target, currency,
 * status }. Returns null when the price, the stop, the entry or the target is missing, or the target is not above the stop.
 * 44 px high; fills its box between 232 and 280 px wide.
 */
export function priceRange(plan) {
  const p = plan || {};
  if (![p.price, p.stop, p.entry, p.target].every(isNum) || !(p.target > p.stop)) return null;
  const cur = p.currency || "USD";
  const at = (v) => clamp((v - p.stop) / (p.target - p.stop), 0, 1);
  const z1 = at(p.entry);
  const z2 = at(isNum(p.maxEntry) && p.maxEntry > p.entry ? p.maxEntry : p.entry);
  const now = at(p.price);
  const off = p.price < p.stop ? "below" : p.price > p.target ? "above" : null;
  // the buy label sits under its zone, as far as the stop and target labels leave it room (measured for a 220 px line)
  // Three prices that do not fit the line side by side (agorot in the thousands) drop their decimals; the exact
  // prices stay in the spoken label.
  let parts = [p.stop, p.entry, p.target].map((v) => priceParts(v, cur));
  const need = (ps) => ps.reduce((t, x) => t + textW(x.num, cur), 0) + 2 * 10;
  if (need(parts) > RANGE_W) parts = parts.map((x, i) => ({ ...x, num: fmtInt(Math.round([p.stop, p.entry, p.target][i])) }));
  const [wA, wM, wZ] = parts.map((x) => textW(x.num, cur));
  const half = Math.max(wM, 26) / 2 + 10;
  const lo = (Math.max(wA, 25) + half) / RANGE_W;
  const hi = 1 - (Math.max(wZ, 17) + half) / RANGE_W;
  const mid = lo < hi ? clamp((z1 + z2) / 2, lo, hi) : (lo + hi) / 2;
  const st = PLAN_STATUS[p.status];
  const label = `מחיר ${fmtPrice(p.price, cur)}${st ? `, ${st.label}` : ""}. סטופ ${fmtPrice(p.stop, cur)}, קנייה ${fmtPrice(p.entry, cur)}${
    isNum(p.maxEntry) && p.maxEntry > p.entry ? ` עד ${fmtPrice(p.maxEntry, cur)}` : ""
  }, יעד ${fmtPrice(p.target, cur)}.${off === "below" ? " המחיר מתחת לסטופ." : off === "above" ? " המחיר מעל היעד." : ""}`;
  return h(
    "div",
    {
      class: "pfr" + (off ? ` is-${off}` : "") + (p.status === "in_zone" ? " is-in" : ""),
      dir: "ltr",
      role: "img",
      "aria-label": label,
      title: `מחיר ${fmtPrice(p.price, cur)}`,
      "data-testid": "pf-range",
      "data-status": p.status || null,
      style: `--z1:${(z1 * 100).toFixed(2)}%;--zw:${((z2 - z1) * 100).toFixed(2)}%;--now:${(now * 100).toFixed(2)}%;--mid:${(mid * 100).toFixed(2)}%`,
    },
    h("div", { class: "pfr__row pfr__row--k", "aria-hidden": "true" }, h("span", { class: "pfr__a" }, "סטופ"), h("span", { class: "pfr__m" }, "קנייה"), h("span", { class: "pfr__z" }, "יעד")),
    h("div", { class: "pfr__track", "aria-hidden": "true" }, h("span", { class: "pfr__zone" }), h("span", { class: "pfr__now" })),
    h("div", { class: "pfr__row pfr__row--v", "aria-hidden": "true" }, priceBox(parts[0], "pfr__a"), priceBox(parts[1], "pfr__m"), priceBox(parts[2], "pfr__z"))
  );
}
