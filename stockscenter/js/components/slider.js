import { h } from "../dom.js";
import { weightsFor } from "../scoring/total.js";

/** Weight share text for slider value v: "טכני ומומנטום 50% · איכות ושווי 35%". */
export function weightsText(v) {
  const w = weightsFor(v);
  const sum = w.reduce((x, y) => x + y, 0);
  const share = (a, b) => Math.round(((w[a] + w[b]) / sum) * 100);
  return `טכני ומומנטום ${share(0, 1)}% · איכות ושווי ${share(2, 3)}%`;
}

/**
 * Momentum <-> Fundamental slider (0..100). In RTL the native range puts 0 on the right, next to "מומנטום";
 * the filled part of the track runs from the right edge to the thumb (--v).
 */
export function slider({ value, onInput }) {
  const out = h("output", { class: "weights__val num", "aria-hidden": "true" }, String(value));
  const input = h("input", {
    class: "range",
    type: "range",
    min: "0",
    max: "100",
    step: "1",
    value: String(value),
    "data-testid": "slider",
    "aria-label": "משקל מומנטום מול פונדמנטל",
  });
  const hint = h("span", { class: "weights__hint" });
  const sync = () => {
    const v = Number(input.value);
    out.textContent = String(v);
    input.style.setProperty("--v", String(v));
    input.setAttribute("aria-valuetext", `${v} מתוך 100. ${weightsText(v)}`);
    hint.textContent = weightsText(v);
  };
  input.addEventListener("input", () => {
    sync();
    onInput(Number(input.value));
  });
  sync();
  const el = h(
    "div",
    { class: "weights" },
    h("div", { class: "weights__head", "aria-hidden": "true" }, h("span", {}, "מומנטום"), out, h("span", {}, "פונדמנטל")),
    h("div", { class: "weights__range" }, input),
    hint
  );
  return {
    el,
    set(v) {
      input.value = String(v);
      sync();
    },
  };
}
