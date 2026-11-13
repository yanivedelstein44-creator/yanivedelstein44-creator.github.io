import { h } from "../dom.js";
import { COMPONENTS } from "../scoring/total.js";

export const COMPONENT_LABELS = { technical: "טכני", momentum: "מומנטום", quality: "איכות", value: "שווי", analysts: "אנליסטים" };

const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const val = (scores, k) => (scores && isNum(scores[k]) ? Math.max(0, Math.min(100, scores[k])) : null);

/** Bar tone: below 40 = the weak component that caps the total (gate), below 60 = soft, else brand blue. */
export const barTone = (v) => (v == null ? "null" : v < 40 ? "weak" : v < 60 ? "soft" : "strong");

/** Five tiny vertical bars for a ranking row (decorative; the row's button carries the text). */
export function miniBars(scores, activeKey = null) {
  return h(
    "span",
    { class: "mbars" + (activeKey && activeKey !== "total" ? " has-active" : ""), "aria-hidden": "true" },
    COMPONENTS.map((k) => {
      const v = val(scores, k);
      return h("span", {
        class: `mbars__b is-${v == null ? "null" : v < 40 ? "weak" : "strong"}` + (activeKey === k ? " is-active" : ""),
        "data-key": k,
        "data-v": v == null ? "" : String(v),
        style: `height:${v == null ? 3 : Math.max(3, Math.round(v * 0.18))}px`,
      });
    })
  );
}

/** Spoken summary of the five scores ("טכני 90, מומנטום 92, ... שווי חסר"). */
export const scoresText = (scores) => COMPONENTS.map((k) => (val(scores, k) == null ? `${COMPONENT_LABELS[k]} חסר` : `${COMPONENT_LABELS[k]} ${val(scores, k)}`)).join(", ");

/** The stock sheet: five horizontal labeled bars. */
export function scoreBars(scores) {
  return h(
    "div",
    { class: "hbars", role: "list", "aria-label": "ציוני רכיבים" },
    COMPONENTS.map((k) => {
      const v = val(scores, k);
      return h(
        "div",
        { class: "hbars__row", role: "listitem", "data-key": k, "data-v": v == null ? "" : String(v), "aria-label": v == null ? `${COMPONENT_LABELS[k]}: חסר` : `${COMPONENT_LABELS[k]}: ${v}` },
        h("span", { class: "hbars__label", "aria-hidden": "true" }, COMPONENT_LABELS[k]),
        h("span", { class: "hbars__track", "aria-hidden": "true" }, h("span", { class: `hbars__fill is-${barTone(v)}`, style: `width:${v ?? 0}%` })),
        h("span", { class: "hbars__num num" + (v == null ? " is-null" : ""), "aria-hidden": "true" }, v == null ? "—" : String(v))
      );
    })
  );
}

/** The expanded #1 row: five sub-score tiles (serif number, short bar, label). */
export function scoreTiles(scores) {
  return h(
    "div",
    { class: "tiles", role: "list", "aria-label": "ציוני רכיבים" },
    COMPONENTS.map((k) => {
      const v = val(scores, k);
      return h(
        "div",
        { class: "tiles__t", role: "listitem", "data-key": k, "data-v": v == null ? "" : String(v), "aria-label": v == null ? `${COMPONENT_LABELS[k]}: חסר` : `${COMPONENT_LABELS[k]}: ${v}` },
        h("span", { class: "tiles__v num" + (v == null ? " is-null" : ""), "aria-hidden": "true" }, v == null ? "—" : String(v)),
        h("span", { class: "tiles__track", "aria-hidden": "true" }, h("span", { class: `tiles__fill is-${barTone(v)}`, style: `width:${v ?? 0}%` })),
        h("span", { class: "tiles__l", "aria-hidden": "true" }, COMPONENT_LABELS[k])
      );
    })
  );
}
