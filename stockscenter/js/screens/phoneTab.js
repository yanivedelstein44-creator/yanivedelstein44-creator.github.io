// "התקן בטלפון" (desktop window only, #/phone): one QR / link that opens the phone app already paired, where one
// "הורד" tap installs it (screens/install.js on the phone). The block itself is phoneBlock (shared with the wizard
// and settings). If an Android APK was ever published (Bridge.getInstallInfo), a small extra card offers it too.
import { h, clear, isWide } from "../dom.js";
import { app, refreshDesktopInfo } from "../state.js";
import { callBridge } from "../data/local.js";
import { topBar, masthead, metaLine } from "../components/chrome.js";
import { toast } from "../components/toast.js";
import { apkStatus } from "../data/install.js";
import { phoneBlock } from "./phone.js";

const card = (title, ...kids) => h("section", { class: "card block" }, h("h2", { class: "block__kicker" }, title), ...kids);

/** Only when an APK is really published: the version line and its download page. Nothing otherwise. */
async function apkCard() {
  let info;
  try {
    info = await callBridge("getInstallInfo");
  } catch {
    return null;
  }
  if (!info || !info.apk || info.apk.status !== "ok") return null;
  const st = apkStatus(info.apk);
  return card(
    "קובץ APK לאנדרואיד",
    h("div", { class: "conn", "data-testid": "apk-state" }, h("span", { class: "conn__dot is-on" }), h("span", { "data-testid": "apk-status" }, st.text)),
    h("p", { class: "field__help" }, "לא חובה: הקוד שלמעלה מתקין את האפליקציה גם בלי קובץ."),
    h(
      "div",
      { class: "block__actions" },
      h("button", { class: "btn btn--ghost btn--pill", type: "button", "data-testid": "open-install-page", onClick: () => callBridge("openUrl", info.page_url).catch((e) => toast(e.message_he || "הפתיחה נכשלה")) }, "פתח את דף ההורדה")
    )
  );
}

export async function mount(root) {
  let alive = true;
  clear(root);
  if (!isWide()) root.append(topBar({ kicker: "STOCKSCENTER · PHONE", back: "#/home", backLabel: "חזרה לבית" }));
  root.append(masthead({ kicker: isWide() ? "PHONE" : null, title: "התקן בטלפון", meta: metaLine(["קוד אחד מתקין את האפליקציה ומחבר אותה למחשב"]) }));
  if (app.bannerBox) root.append(app.bannerBox);
  const grid = h("div", { class: "settings phonetab" });
  root.append(grid);
  const cfg = (await refreshDesktopInfo()) || {};
  if (!alive) return;
  grid.append(card("התקנה וחיבור", phoneBlock(cfg, { onUpdate: () => refreshDesktopInfo() })));
  apkCard().then((c) => alive && c && grid.append(c));
  return () => (alive = false);
}
