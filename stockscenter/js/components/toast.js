import { h } from "../dom.js";

let region;
export function initToasts(el) {
  region = el;
}

/** Quiet bottom toast. toast("..."), toast("...", {action: {label, onClick}, ms}). */
export function toast(text, { action, ms = 3600 } = {}) {
  if (!region) return;
  const el = h("div", { class: "toast", role: "status" }, h("span", { class: "toast__text" }, text));
  if (action) {
    el.append(
      h("button", { class: "toast__action", type: "button", onClick: () => (action.onClick(), close()) }, action.label)
    );
  }
  const close = () => {
    el.classList.remove("is-in");
    setTimeout(() => el.remove(), 200);
  };
  region.append(el);
  requestAnimationFrame(() => el.classList.add("is-in"));
  setTimeout(close, ms);
  return close;
}
