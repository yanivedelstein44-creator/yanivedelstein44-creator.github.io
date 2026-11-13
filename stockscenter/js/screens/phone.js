// Phone install + pairing block (desktop only), shared by the phone tab, the setup wizard and settings:
// create the PHONE token once (data repo only) -> paste it -> setSecret('phone_token') -> one QR / link from getPairing()
// that opens the phone app already paired; the phone page then installs it with one "הורד" tap (screens/install.js).
// The guide and the warning use the repo names actually configured, and the Bridge's own warning text (QA R2-n3).
import { h, ltr, icon, copyText } from "../dom.js";
import { callBridge } from "../data/local.js";
import { PHONE_TOKEN_URL, DEFAULT_DATA_REPO, DEFAULT_CODE_REPO } from "../data/links.js";
import { extLink } from "../components/extLink.js";
import { toast } from "../components/toast.js";
import { whatsappUrl } from "../data/install.js";
import { field, input } from "./settings.js";

const repos = (cfg) => ({ data: (cfg && cfg.data_repo) || DEFAULT_DATA_REPO, code: (cfg && cfg.code_repo) || DEFAULT_CODE_REPO });

export function phoneTokenGuide({ dataRepo = DEFAULT_DATA_REPO } = {}) {
  return h(
    "ol",
    { class: "guide", "data-testid": "phone-token-guide" },
    h("li", {}, extLink(PHONE_TOKEN_URL, "פתח ב-GitHub את יצירת המפתח לטלפון", { "data-testid": "phone-token-link" }), " (השם, ההרשאה ותוקף של שנה כבר ממולאים)."),
    h("li", {}, "תחת Repository access בחר Only select repositories, ואז סמן ", h("b", {}, "רק"), " את ", ltr(dataRepo || DEFAULT_DATA_REPO), "."),
    h("li", {}, "לחץ Generate token, העתק את המפתח והדבק אותו בשדה כאן.")
  );
}

/** The warning shown when phone_token_ok is false: the Bridge's own text when it sends one. */
export function phoneWarningText(cfg) {
  if (cfg && typeof cfg.phone_token_warning_he === "string" && cfg.phone_token_warning_he.trim()) return cfg.phone_token_warning_he.trim();
  const { data, code } = repos(cfg);
  return `המפתח לטלפון צריך לקרוא את מאגר הנתונים ${data} ולא להיות מסוגל לגעת במאגר הקוד ${code}. צור מפתח חדש לפי ההוראות, עם ${data} בלבד, והדבק אותו כאן.`;
}

/** The three install steps shown next to the QR (desktop window). */
export function installGuide() {
  return h(
    "ol",
    { class: "guide", "data-testid": "install-guide" },
    h("li", {}, "סרוק את הקוד במצלמת הטלפון, או שלח לעצמך את הקישור."),
    h("li", {}, "בדף שנפתח בטלפון לחץ ", h("b", {}, "״הורד״"), ", ואז ״התקן״."),
    h("li", {}, "זהו. האפליקציה מופיעה במסך הבית, כבר מחוברת למחשב.")
  );
}

/**
 * Install + pair block (desktop only): the phone token (created once), then ONE QR / link that opens the phone app
 * already paired, with "העתק קישור" and "שלח בוואטסאפ". Shared by the phone tab, the setup wizard and settings.
 * @param cfg  the last getSettings() result (has_phone_token, phone_token_ok, phone_token_warning_he, code_repo, data_repo)
 * @param opts {onUpdate?: (cfg) => void}
 */
export function phoneBlock(cfg, { onUpdate } = {}) {
  let cur = cfg || {};
  const root = h("div", { class: "phone", "data-testid": "phone-block" });
  const stateEl = h("div", { class: "conn", "data-testid": "phone-token-state" });
  const warn = h("div", { class: "banner banner--warn banner--inline", role: "status", "data-testid": "phone-token-warning", hidden: true });
  const tokenIn = input({ id: "phone-token", type: "password", dir: "ltr", placeholder: "github_pat_…", "data-testid": "phone-token" });
  const saveBtn = h("button", { class: "btn btn--secondary btn--pill", type: "button", "data-testid": "phone-token-save" }, "שמור מפתח לטלפון");
  const qr = h("div", { class: "qr", "data-testid": "pairing-qr" });
  const urlTxt = h("div", { class: "qr__url num", dir: "ltr", "data-testid": "pairing-url" });
  const actions = h("div", { class: "block__actions", "data-testid": "pairing-actions" });
  const qrMsg = h("p", { class: "field__error", role: "alert", hidden: true });
  const install = h(
    "div",
    { class: "pair-install", "data-testid": "pair-install", hidden: true },
    h("div", { class: "pair-install__qr" }, qr, urlTxt),
    h(
      "div",
      { class: "pair-install__main" },
      installGuide(),
      actions,
      h("p", { class: "field__help", "data-testid": "pairing-key-note" }, "הקישור כולל את מפתח הטלפון, אז שלח אותו רק לעצמך. נשלח בטעות למישהו? צור מפתח טלפון חדש והדבק אותו כאן למטה.")
    )
  );
  const guideBox = h("div", {});
  const tokenHead = h("h3", { class: "pair-token__head" });

  function paintState() {
    const has = !!cur.has_phone_token;
    const ok = cur.phone_token_ok;
    const text = !has ? "עדיין לא הוגדר מפתח לטלפון" : ok === false ? "מפתח הטלפון שמור, אך לא עבר בדיקה" : ok === true ? "מפתח הטלפון שמור ותקין" : "מפתח הטלפון שמור";
    stateEl.replaceChildren(h("span", { class: "conn__dot " + (has && ok !== false ? "is-on" : "") }), h("span", {}, text));
    warn.hidden = !(has && ok === false);
    warn.replaceChildren(h("span", { class: "banner__text" }, phoneWarningText(cur)));
    tokenIn.placeholder = has ? "•••••••• (שמור). הדבק מפתח חדש כדי להחליף" : "github_pat_…";
    tokenHead.textContent = has ? "מפתח הטלפון" : "פעם אחת: מפתח לטלפון";
    const guide = phoneTokenGuide({ dataRepo: repos(cur).data });
    // with a key saved the guide folds away (it is needed again only to replace the key)
    guideBox.replaceChildren(has ? h("details", { class: "pair-token__more" }, h("summary", {}, "איך יוצרים מפתח חדש לטלפון"), guide) : guide);
  }

  async function loadQr() {
    install.hidden = true;
    qrMsg.hidden = true;
    actions.replaceChildren();
    urlTxt.textContent = "";
    if (!cur.has_phone_token) return;
    install.hidden = false;
    qr.replaceChildren(h("div", { class: "skel__b qr__skeleton" }));
    try {
      const p = await callBridge("getPairing");
      qr.replaceChildren(h("div", { class: "qr__img", html: p.qr_svg }));
      urlTxt.textContent = (p.url || "").replace(/#pair=.*/, "#pair=…"); // the token never shows on screen
      if (p.url)
        actions.append(
          h("button", { class: "btn btn--primary btn--pill", type: "button", "data-testid": "copy-link", onClick: async () => toast((await copyText(p.url)) ? "הקישור הועתק. שלח אותו רק לעצמך" : "ההעתקה נכשלה") }, icon("copy", 18, 2), "העתק קישור"),
          h("button", { class: "btn btn--secondary btn--pill", type: "button", "data-testid": "whatsapp-link", onClick: () => callBridge("openUrl", whatsappUrl(p.url)).catch((e) => toast(e.message_he || "הפתיחה נכשלה")) }, "שלח בוואטסאפ")
        );
    } catch (e) {
      install.hidden = true;
      qrMsg.textContent = e.message_he || "לא ניתן ליצור קוד חיבור";
      qrMsg.hidden = false;
    }
  }

  saveBtn.addEventListener("click", async () => {
    const v = tokenIn.value.trim();
    if (!v) return;
    saveBtn.disabled = true;
    try {
      const res = await callBridge("setSecret", "phone_token", v);
      tokenIn.value = "";
      cur = (await callBridge("getSettings")) || cur;
      if (res && typeof res.warning_he === "string" && res.warning_he && !cur.phone_token_warning_he) cur = { ...cur, phone_token_warning_he: res.warning_he };
      onUpdate?.(cur);
      toast("מפתח הטלפון נשמר");
      paintState();
      await loadQr();
    } catch (e) {
      tokenIn.value = ""; // revert the control, never keep a rejected secret on screen
      toast(e?.message_he || "שמירת המפתח נכשלה");
    }
    saveBtn.disabled = false;
  });

  paintState();
  root.append(
    stateEl,
    warn,
    qrMsg,
    install,
    h(
      "div",
      { class: "pair-token" },
      tokenHead,
      h("p", { class: "field__help", "data-testid": "phone-scope-note" }, "מפתח הטלפון פותח רק את תוצאות הסריקה, לא את התוכנה."),
      guideBox,
      field({ id: "phone-token", label: "מפתח לטלפון", control: tokenIn, help: "נשמר במנהל האישורים של Windows. משמש רק ליצירת הקוד והקישור לטלפון." }),
      h("div", { class: "block__actions" }, saveBtn)
    )
  );
  loadQr();
  return root;
}
