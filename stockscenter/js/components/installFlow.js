// The "הורד" tap on the phone (install page and home card, SPEC §9): the browser's own one-tap install dialog when it
// is ready; otherwise a sheet with this browser's steps, which offers the one-tap install as soon as the browser allows it.
import { h, icon, copyText } from "../dom.js";
import { app } from "../state.js";
import { openSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { installSteps, pairingLink } from "../data/install.js";
import { encodePairing } from "../data/github.js";
import { installState, promptInstall, onInstallChange } from "../installPrompt.js";

/** Tap on "הורד". Resolves "accepted" | "dismissed" | "steps" (the steps sheet opened). */
export async function startInstall(opener = null) {
  if (installState().canPrompt) {
    const r = await promptInstall();
    if (r !== "unavailable") return r;
  }
  openInstallSteps(installState().kind, opener);
  return "steps";
}

/** The link to paste into Chrome when the page opened inside another app: the pairing link if paired, else the page. */
function linkForChrome() {
  const base = location.origin + location.pathname;
  const pair = app.adapter && app.adapter.pair;
  return pair ? pairingLink(base, encodePairing(pair)) : base;
}

export function openInstallSteps(kind, opener = null) {
  const g = installSteps(kind);
  const chromium = kind === "chrome" || kind === "edge";
  const wait = chromium ? h("p", { class: "field__help", "data-testid": "install-wait" }, "הדפדפן מאפשר התקנה בלחיצה אחת רק אחרי כמה שניות בדף. אפשר לחכות כאן, או להתקין עכשיו מהתפריט:") : null;
  const ready = h("p", { class: "install-steps__ready", role: "status", "data-testid": "install-ready", hidden: true }, icon("check", 18, 2.4), "הדפדפן מוכן: אפשר להתקין בלחיצה אחת.");
  const nowBtn = h("button", { class: "btn btn--primary btn--pill", type: "button", "data-testid": "install-now", hidden: true }, icon("download", 18, 2.2), "התקן עכשיו");
  const doneBtn = h("button", { class: "btn btn--ghost btn--pill", type: "button", "data-testid": "install-steps-done" }, "הבנתי");
  const copyBtn = g.copyLink
    ? h("button", { class: "btn btn--secondary btn--pill", type: "button", "data-testid": "install-copy-link", onClick: async () => toast((await copyText(linkForChrome())) ? "הקישור הועתק. הדבק אותו ב-Chrome" : "ההעתקה נכשלה") }, icon("copy", 18, 2), "העתק קישור")
    : null;
  const body = h(
    "div",
    { class: "install-steps" },
    h("h2", { class: "install-steps__title" }, kind === "desktop" ? "פותחים בטלפון" : "מתקינים בשלושה צעדים"),
    wait,
    h("ol", { class: "guide", "data-testid": "install-steps-list" }, g.steps.map((t) => h("li", {}, t))),
    g.note ? h("p", { class: "field__help" }, g.note) : null,
    copyBtn,
    ready
  );
  let unsub = () => {};
  const sheet = openSheet({ label: "איך מתקינים את האפליקציה", testid: "install-steps", body, footer: h("div", { class: "install-steps__bar" }, nowBtn, doneBtn), opener, onClose: () => unsub() });
  const paint = () => {
    const can = installState().canPrompt;
    nowBtn.hidden = !can;
    ready.hidden = !can;
    if (wait) wait.hidden = can;
  };
  unsub = onInstallChange(() => (installState().installedNow ? sheet.close() : paint()));
  nowBtn.addEventListener("click", async () => {
    const r = await promptInstall();
    if (r === "accepted") sheet.close();
    else paint();
  });
  doneBtn.addEventListener("click", () => sheet.close());
  paint();
  return sheet;
}
