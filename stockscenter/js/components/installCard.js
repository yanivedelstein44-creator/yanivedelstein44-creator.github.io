// Home card on the phone, in the browser only (SPEC §9): "התקן את האפליקציה" with the same "הורד" tap as the install
// page. Closing it hides it for HIDE_DAYS; an install in this browser hides it for good.
import { h, icon } from "../dom.js";
import { app } from "../state.js";
import { canOfferInstall } from "../data/install.js";
import { installState, onInstallChange, homeCardHidden, HIDE_KEY } from "../installPrompt.js";
import { startInstall } from "./installFlow.js";

/** The card, or null where it does not belong (desktop window, installed app, a PC browser, hidden by the user). */
export function installCard() {
  if (app.mode.desktop) return null;
  if (!canOfferInstall(installState().kind)) return null;
  if (homeCardHidden(localStorage)) return null;
  const btn = h("button", { class: "btn btn--primary btn--pill btn--sm", type: "button", "data-testid": "install-card-download" }, icon("download", 18, 2.2), "הורד");
  const close = h("button", { class: "iconbtn installcard__close", type: "button", "aria-label": "הסתר את ההצעה להתקנה", "data-testid": "install-card-close" }, icon("close", 18, 2.2));
  const text = h("div", { class: "installcard__txt" }, h("strong", {}, "התקן את האפליקציה"), h("span", {}, "סמל במסך הבית, ועדכון לבד"));
  const el = h("section", { class: "card installcard", "data-testid": "install-card", "aria-label": "התקנת האפליקציה" }, text, btn, close);
  const unsub = onInstallChange(() => {
    if (!installState().installedNow) return;
    text.replaceChildren(h("strong", {}, "הותקן"), h("span", {}, "הסמל נמצא עכשיו במסך הבית"));
    btn.remove();
    unsub();
  });
  btn.addEventListener("click", () => startInstall(btn));
  close.addEventListener("click", () => {
    try {
      localStorage.setItem(HIDE_KEY, String(Date.now()));
    } catch {
      /* storage may be off: hide for this visit only */
    }
    unsub();
    el.remove();
  });
  return el;
}
