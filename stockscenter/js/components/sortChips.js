import { h } from "../dom.js";

export const SORT_LABELS = { total: "כולל", technical: "טכני", momentum: "מומנטום", quality: "איכות", value: "שווי", analysts: "אנליסטים" };

/** Sort chips (always high -> low). A horizontal row that scrolls when it does not fit. */
export function sortChips({ value, onChange, testPrefix = "sort", cls = "" }) {
  const keys = Object.keys(SORT_LABELS);
  const btns = keys.map((key) => h("button", { class: "chip", type: "button", "data-testid": `${testPrefix}-${key}`, "aria-pressed": String(key === value), onClick: () => select(key) }, SORT_LABELS[key]));
  const el = h("div", { class: "sortbar" + (cls ? " " + cls : ""), role: "group", "aria-label": "מיון, מהגבוה לנמוך" }, btns);
  const set = (key) => btns.forEach((b, i) => b.setAttribute("aria-pressed", String(keys[i] === key)));
  function select(key) {
    set(key);
    onChange(key);
  }
  return { el, set };
}
