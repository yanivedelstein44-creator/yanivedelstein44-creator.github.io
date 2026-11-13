import { h, svg } from "../dom.js";
import { tierOf } from "../scoring/total.js";

const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const aria = (t) => (isNum(t) ? `ציון כולל ${t}` : "אין ציון כולל");

/**
 * The total badge: a rounded square in the tier colors (≥70 blue, 50–69 tint, <50 warm), serif number.
 * size: "md" (44, list rows), "lg" (50, the expanded #1 row), "sm" (44×32, desktop table).
 */
export function totalBadge(total, { size = "md", testid = "stock-total" } = {}) {
  const el = h("span", { class: `tbadge tbadge--${size}`, role: "img", "data-testid": testid });
  setBadge(el, total);
  return el;
}

/** Update a badge in place (slider drags). */
export function setBadge(el, total) {
  const tier = tierOf(total);
  el.classList.remove("tbadge--good", "tbadge--warn", "tbadge--bad", "tbadge--none");
  el.classList.add(`tbadge--${tier}`);
  el.textContent = isNum(total) ? String(total) : "—";
  el.setAttribute("aria-label", aria(total));
}

/** The stock sheet's total ring (SVG, 104 px): arc length = total %, color by tier. */
export function scoreRing(total, size = 104) {
  const tier = tierOf(total);
  const c = 2 * Math.PI * 42;
  const pct = isNum(total) ? Math.max(0, Math.min(100, total)) / 100 : 0;
  const el = svg(`<svg class="ring ring--${tier}" role="img" viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${isNum(total) ? `ציון כולל ${total} מתוך 100` : "אין ציון כולל"}">
    <circle class="ring__track" cx="50" cy="50" r="42" fill="none" stroke-width="9"/>
    <circle class="ring__arc" cx="50" cy="50" r="42" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(c * pct).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/>
    <text class="ring__num" x="50" y="49" text-anchor="middle" dominant-baseline="central" data-testid="sheet-total"></text>
    <text class="ring__label" x="50" y="72" text-anchor="middle">ציון כולל</text></svg>`);
  el.querySelector(".ring__num").textContent = isNum(total) ? String(total) : "—";
  if (pct === 0) el.querySelector(".ring__arc").remove(); // a round cap would still draw a dot
  return el;
}
