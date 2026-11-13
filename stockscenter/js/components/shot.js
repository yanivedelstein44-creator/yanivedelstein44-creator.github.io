// The TradingView screenshot: a dark rounded thumbnail ("צילום TradingView"); tap -> the zoomable viewer.
// No screenshot -> a quiet placeholder tile.
import { h, icon } from "../dom.js";
import { app } from "../state.js";
import { openImageViewer } from "./imageViewer.js";

/** size: "thumb" (phone, beside the slider), "wide" (phone, full width), "side" (desktop side column). */
export function screenshotTile(path, { caption, version, size = "thumb" } = {}) {
  if (!path) {
    return h(
      "div",
      { class: `shot shot--${size} shot--none`, "data-testid": "screenshot-none" },
      icon("expand", 20, 2),
      h("span", { class: "shot__none-text" }, "אין צילום מסך לסריקה הזו")
    );
  }
  const lines = h("span", { class: "shot__lines", "aria-hidden": "true" }, Array.from({ length: size === "side" ? 7 : 6 }, (_, i) => h("span", { class: "shot__line", style: `width:${[70, 92, 84, 88, 76, 90, 80][i]}%` })));
  const label = h("span", { class: "shot__label" }, size === "side" ? "צילום TradingView · הגדל" : "צילום TradingView");
  const btn = h("button", { class: `shot shot--${size}`, type: "button", "aria-label": "צילום TradingView, הגדל", "data-testid": "screenshot-open", disabled: true }, lines, label);
  const wrap = h("div", { class: "shot-wrap", "data-testid": "screenshot" }, btn);
  app.adapter
    .getImageUrl(path, version)
    .then((url) => {
      const img = h("img", { class: "shot__img", src: url, alt: "", loading: "lazy", decoding: "async" });
      img.addEventListener("load", () => btn.classList.add("has-img"));
      img.addEventListener("error", () => {
        img.remove();
        btn.disabled = true;
        label.textContent = "צילום המסך לא זמין";
      });
      btn.prepend(img);
      btn.disabled = false;
      btn.addEventListener("click", () => openImageViewer(url, caption || "צילום מסך"));
    })
    .catch(() => {
      label.textContent = "צילום המסך לא זמין";
    });
  return wrap;
}
