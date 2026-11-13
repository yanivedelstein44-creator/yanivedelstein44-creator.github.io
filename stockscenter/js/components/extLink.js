// External links: inside the desktop window they go through the bridge's openUrl (system browser), elsewhere target=_blank.
import { h } from "../dom.js";
import { isHttpUrl } from "../format.js";

export const openExternal = (e, url) => {
  const api = window.pywebview && window.pywebview.api;
  if (api && typeof api.openUrl === "function" && isHttpUrl(url)) {
    e.preventDefault();
    Promise.resolve(api.openUrl(url)).catch(() => {});
  }
};

export const extLink = (url, label, attrs = {}) =>
  h("a", { class: "extlink", href: url, target: "_blank", rel: "noopener noreferrer", onClick: (e) => openExternal(e, url), ...attrs }, label);
