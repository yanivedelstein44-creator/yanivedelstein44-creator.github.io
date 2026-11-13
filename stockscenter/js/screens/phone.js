// Phone pairing block (desktop only), shared by the setup wizard and settings:
// create the PHONE token (data repo only) -> paste it -> setSecret('phone_token') -> QR from getPairing().
// The guide and the warning use the repo names actually configured, and the Bridge's own warning text (QA R2-n3).
import { h, ltr } from "../dom.js";
import { callBridge } from "../data/local.js";
import { PHONE_TOKEN_URL, DEFAULT_DATA_REPO, DEFAULT_CODE_REPO } from "../data/links.js";
import { extLink } from "../components/extLink.js";
import { toast } from "../components/toast.js";
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

/**
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
  const qr = h("div", { class: "qr", "data-testid": "pairing-qr", hidden: true });
  const urlTxt = h("div", { class: "qr__url num", dir: "ltr" });
  const codeRow = h("div", { class: "block__actions" });
  const qrMsg = h("p", { class: "field__error", role: "alert", hidden: true });
  const guideBox = h("div", {});

  function paintState() {
    const has = !!cur.has_phone_token;
    const ok = cur.phone_token_ok;
    const text = !has ? "עדיין לא הוגדר מפתח לטלפון" : ok === false ? "מפתח הטלפון שמור, אך לא עבר בדיקה" : ok === true ? "מפתח הטלפון שמור ותקין" : "מפתח הטלפון שמור";
    stateEl.replaceChildren(h("span", { class: "conn__dot " + (has && ok !== false ? "is-on" : "") }), h("span", {}, text));
    warn.hidden = !(has && ok === false);
    warn.replaceChildren(h("span", { class: "banner__text" }, phoneWarningText(cur)));
    tokenIn.placeholder = has ? "•••••••• (שמור). הדבק מפתח חדש כדי להחליף" : "github_pat_…";
    guideBox.replaceChildren(phoneTokenGuide({ dataRepo: repos(cur).data }));
  }

  async function loadQr() {
    qr.hidden = true;
    qrMsg.hidden = true;
    codeRow.replaceChildren();
    urlTxt.textContent = "";
    if (!cur.has_phone_token) return;
    qr.hidden = false;
    qr.replaceChildren(h("div", { class: "skel__b qr__skeleton" }));
    try {
      const p = await callBridge("getPairing");
      qr.replaceChildren(h("div", { class: "qr__img", html: p.qr_svg }));
      urlTxt.textContent = (p.url || "").replace(/#pair=.*/, "#pair=…");
      if (p.code)
        codeRow.append(
          h("button", { class: "btn btn--ghost btn--sm", type: "button", "data-testid": "copy-code", onClick: () => navigator.clipboard?.writeText(p.code).then(() => toast("הקוד הועתק"), () => toast("ההעתקה נכשלה")) }, "העתק קוד חיבור")
        );
    } catch (e) {
      qr.hidden = true;
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
    h("p", { class: "field__help", "data-testid": "phone-scope-note" }, "מפתח הטלפון פותח רק את תוצאות הסריקה, לא את התוכנה."),
    guideBox,
    field({ id: "phone-token", label: "מפתח לטלפון", control: tokenIn, help: "נשמר במנהל האישורים של Windows. משמש רק ליצירת קוד החיבור לטלפון." }),
    h("div", { class: "block__actions" }, saveBtn),
    qrMsg,
    qr,
    urlTxt,
    codeRow,
    h("p", { class: "field__help" }, "בטלפון: פתח את כתובת האפליקציה ואז סרוק את הקוד. המפתח מועבר ישירות ואינו נשלח לשום שרת אחר.")
  );
  loadQr();
  return root;
}
