// Settings: connection (PWA), position-size inputs, desktop-only configuration, version.
import { h, clear, icon, ltr, isWide } from "../dom.js";
import { app, saveSettings, refreshIndex, refreshStatus, refreshDesktopInfo, onLive } from "../state.js";
import { APP_VERSION } from "../../version.js";
import { callBridge, runTvLogin } from "../data/local.js";
import { DESKTOP_TOKEN_URL, DEFAULT_OWNER, DEFAULT_CODE_REPO, DEFAULT_DATA_REPO } from "../data/links.js";
import { extLink } from "../components/extLink.js";
import { phoneBlock } from "./phone.js";
import { decodePairing } from "../data/github.js";
import { topBar, masthead, metaLine } from "../components/chrome.js";
import { toast } from "../components/toast.js";
import { checkForUpdatesNow, swSupported } from "../pwa.js";

export const field = ({ label, help, control, id }) =>
  h("div", { class: "field" }, h("label", { class: "field__label", for: id }, label), control, help && h("p", { class: "field__help" }, help));

export const input = (attrs) => h("input", { class: "input", autocomplete: "off", autocapitalize: "off", spellcheck: "false", ...attrs });

/** Switch. onChange may be async: when it throws, the switch goes back and a toast shows e.message_he. */
export function toggle({ checked, label, onChange, id, errorMsg = "השמירה נכשלה" }) {
  const b = h("button", { class: "switch", type: "button", role: "switch", id, "aria-checked": String(!!checked), "aria-label": label, onClick: () => set(b.getAttribute("aria-checked") !== "true") }, h("span", { class: "switch__knob" }));
  const set = async (v) => {
    const prev = b.getAttribute("aria-checked") === "true";
    b.setAttribute("aria-checked", String(v));
    try {
      await onChange?.(v);
    } catch (e) {
      b.setAttribute("aria-checked", String(prev));
      toast((e && e.message_he) || errorMsg);
    }
  };
  return b;
}

/** Shared by settings and the wizard: how to create the DESKTOP token (both repos), with the repo names in use (QA R2-n3). */
export function desktopTokenGuide({ codeRepo = DEFAULT_CODE_REPO, dataRepo = DEFAULT_DATA_REPO } = {}) {
  const code = ltr(codeRepo || DEFAULT_CODE_REPO);
  const data = ltr(dataRepo || DEFAULT_DATA_REPO);
  const el = h(
    "ol",
    { class: "guide", "data-testid": "desktop-token-guide" },
    h("li", {}, extLink(DESKTOP_TOKEN_URL, "פתח ב-GitHub את יצירת המפתח לתוכנה", { "data-testid": "desktop-token-link" }), " (השם, ההרשאה ותוקף של שנה כבר ממולאים)."),
    h("li", {}, "תחת Repository access בחר Only select repositories, ואז סמן את ", code, " ו-", data, "."),
    h("li", {}, "לחץ Generate token, העתק את המפתח והדבק אותו בשדה כאן.")
  );
  /** Follow the repo fields while the user edits them. */
  el.setRepos = (c, d) => {
    code.textContent = c || DEFAULT_CODE_REPO;
    data.textContent = d || DEFAULT_DATA_REPO;
  };
  return el;
}

/**
 * Paint a testGitHub() result: the data connection's own message, plus the Bridge's warning when the desktop token
 * cannot see the code repo (ok true, code_repo_ok false: the data side works, self-update does not). Shared with the wizard.
 */
export function showGitHubResult(r, msg, warnBox) {
  msg.textContent = r.message_he || (r.ok ? "החיבור תקין" : "החיבור נכשל");
  msg.className = r.ok ? "field__help is-ok" : "field__error";
  const warn = r.ok && r.code_repo_ok === false;
  warnBox.hidden = !warn;
  warnBox.replaceChildren(...(warn ? [h("span", { class: "banner__text" }, r.warning_he || "המפתח לא רואה את מאגר הקוד, ולכן העדכונים האוטומטיים לא יעבדו.")] : []));
}

export const codeRepoWarning = () => h("div", { class: "banner banner--warn banner--inline", role: "status", "data-testid": "gh-code-warning", hidden: true });

/** A grouped white settings card with a section kicker. */
const card = (title, ...kids) => h("section", { class: "card block" }, h("h2", { class: "block__kicker" }, title), ...kids);

/* ---------- PWA connection ---------- */

function connectionBlock(rerender) {
  const ad = app.adapter;
  if (ad.kind !== "github") {
    return card("חיבור למחשב", h("div", { class: "conn" }, h("span", { class: "conn__dot is-on" }), h("span", { "data-testid": "demo-conn" }, "מצב הדגמה: מוצגים נתוני דוגמה, בלי חיבור אמיתי")), h("p", { class: "field__help" }, "באפליקציה האמיתית תדביק כאן את קוד החיבור מהתוכנה במחשב."));
  }
  const paired = ad.isPaired;
  const status = h("div", { class: "conn" }, h("span", { class: "conn__dot " + (paired ? "is-on" : "") }), paired ? h("span", {}, "מחובר ל-", ltr(`${ad.pair.o}/${ad.pair.r}`)) : "לא מחובר");
  const code = h("textarea", { class: "input input--code", id: "pair-code", rows: "3", dir: "ltr", placeholder: "הדבק כאן את קוד החיבור", "data-testid": "pair-input", spellcheck: "false" });
  const msg = h("p", { class: "field__error", role: "alert", hidden: true });
  const connect = h("button", { class: "btn btn--primary btn--pill", type: "button", "data-testid": "pair-connect" }, "חבר");
  connect.addEventListener("click", async () => {
    msg.hidden = true;
    let pair;
    try {
      pair = decodePairing(code.value);
    } catch (e) {
      msg.textContent = e.message_he;
      msg.hidden = false;
      return;
    }
    const prev = ad.pair;
    connect.disabled = true;
    connect.textContent = "מתחבר…";
    ad.setPairing(pair);
    try {
      await ad.verify();
      toast("הטלפון מחובר");
      await refreshStatus();
      await refreshIndex();
      rerender();
    } catch (e) {
      if (prev) ad.setPairing(prev);
      else ad.clearPairing();
      msg.textContent = e.message_he || "החיבור נכשל";
      msg.hidden = false;
      connect.disabled = false;
      connect.textContent = "חבר";
    }
  });

  let shown = false;
  const tokenVal = h("span", { class: "tokenrow__val num", dir: "ltr" }, "••••••••••••••••");
  const eye = h("button", { class: "btn btn--ghost btn--sm", type: "button", "aria-label": "הצג או הסתר את המפתח", "data-testid": "token-toggle" }, icon("eye", 18, 2), "הצג");
  eye.addEventListener("click", () => {
    shown = !shown;
    tokenVal.textContent = shown ? ad.pair.t : "••••••••••••••••";
    eye.replaceChildren(icon("eye", 18, 2), shown ? "הסתר" : "הצג");
  });
  const disconnect = h("button", { class: "btn btn--danger btn--pill", type: "button", "data-testid": "pair-disconnect" }, "נתק");
  disconnect.addEventListener("click", () => {
    if (!confirm("לנתק את הטלפון? המפתח יימחק מהטלפון הזה.")) return;
    ad.clearPairing();
    app.status = null;
    app.index = null;
    toast("הטלפון נותק");
    rerender();
  });

  return card(
    "חיבור למחשב",
    status,
    paired &&
      h("div", { class: "tokenrow" }, h("span", { class: "tokenrow__label" }, "מפתח"), tokenVal, eye),
    field({
      id: "pair-code",
      label: paired ? "קוד חיבור חדש" : "קוד חיבור",
      control: code,
      help: "בתוכנה במחשב: הגדרות › חיבור הטלפון. אפשר לסרוק את ה-QR או להדביק את הקוד. המפתח נשמר רק בטלפון הזה ואינו נשלח לשום מקום מלבד GitHub.",
    }),
    msg,
    h("div", { class: "block__actions" }, connect, paired && disconnect)
  );
}

/* ---------- account / position size ---------- */

function accountBlock() {
  const s = app.settings;
  const portfolio = input({ id: "set-portfolio", type: "text", inputmode: "decimal", dir: "ltr", value: s.portfolio ? String(s.portfolio) : "", placeholder: "לדוגמה 50000", "data-testid": "set-portfolio" });
  const risk = input({ id: "set-risk", type: "text", inputmode: "decimal", dir: "ltr", value: String(s.riskPct), "data-testid": "set-risk" });
  const def = h("output", { class: "num" }, String(s.defaultSlider));
  const defIn = h("input", { class: "range", id: "set-slider", type: "range", min: "0", max: "100", step: "1", value: String(s.defaultSlider), "aria-label": "ברירת מחדל לסליידר", "data-testid": "set-slider", style: `--v:${s.defaultSlider}` });
  const saved = (m = "נשמר") => toast(m, { ms: 1400 });
  portfolio.addEventListener("change", () => (saveSettings({ portfolio: portfolio.value.trim() === "" ? null : portfolio.value }), saved()));
  risk.addEventListener("change", async () => {
    await saveSettings({ riskPct: risk.value });
    risk.value = String(app.settings.riskPct);
    saved();
  });
  defIn.addEventListener("input", () => {
    def.textContent = defIn.value;
    defIn.style.setProperty("--v", defIn.value);
  });
  defIn.addEventListener("change", () => (saveSettings({ defaultSlider: Number(defIn.value) }), saved()));
  return card(
    "גודל פוזיציה וברירות מחדל",
    field({ id: "set-portfolio", label: "גודל התיק ($)", control: portfolio, help: "משמש רק לחישוב מספר המניות בכרטיס. השאר ריק כדי להסתיר את גודל הפוזיציה." }),
    field({ id: "set-risk", label: "סיכון לעסקה (% מהתיק)", control: risk, help: "ברירת מחדל 1%. מספר המניות = תיק × אחוז סיכון ÷ סיכון למניה (מחיר פחות סטופ)." }),
    field({ id: "set-slider", label: "ברירת מחדל לסליידר", control: h("div", { class: "slider-inline" }, h("span", {}, "מומנטום"), defIn, h("span", {}, "פונדמנטל"), def), help: "הערך שבו הסליידר מתחיל בכל פתיחה. 50 = איזון." })
  );
}

/* ---------- desktop-only ---------- */

async function desktopBlocks(rerender) {
  let cfg;
  try {
    cfg = await callBridge("getSettings");
  } catch (e) {
    return [card("הגדרות התוכנה", h("p", { class: "field__error" }, e.message_he))];
  }
  app.desktopInfo = cfg;
  app.bus.emit("desktop", cfg);
  const out = [];
  const localOnly = cfg.local_only === true || app.status?.local_only === true;
  if (localOnly)
    out.push(h("div", { class: "banner banner--info banner--inline", role: "status", "data-testid": "local-only-notice" }, h("span", { class: "banner__text" }, "התוכנה עובדת מקומית. הטלפון לא יקבל עדכונים עד שתחבר את GitHub")));

  // GitHub (desktop token + the two repos)
  const saved = { github_owner: cfg.github_owner || DEFAULT_OWNER, code_repo: cfg.code_repo || DEFAULT_CODE_REPO, data_repo: cfg.data_repo || DEFAULT_DATA_REPO };
  const owner = input({ id: "gh-owner", dir: "ltr", value: saved.github_owner, "data-testid": "gh-owner" });
  const codeRepo = input({ id: "gh-code-repo", dir: "ltr", value: saved.code_repo, "data-testid": "gh-code-repo" });
  const dataRepo = input({ id: "gh-data-repo", dir: "ltr", value: saved.data_repo, "data-testid": "gh-data-repo" });
  const token = input({ id: "gh-token", type: "password", dir: "ltr", placeholder: cfg.has_github_token ? "•••••••• (שמור)" : "github_pat_…", "data-testid": "gh-token" });
  const ghMsg = h("p", { class: "field__help", role: "status", "data-testid": "gh-result" });
  const ghWarn = codeRepoWarning();
  const guide = desktopTokenGuide({ codeRepo: saved.code_repo, dataRepo: saved.data_repo });
  const followRepos = () => guide.setRepos(codeRepo.value.trim(), dataRepo.value.trim());
  codeRepo.addEventListener("input", followRepos);
  dataRepo.addEventListener("input", followRepos);
  const test = h("button", { class: "btn btn--secondary btn--pill", type: "button", "data-testid": "gh-test" }, "שמור ובדוק חיבור");
  test.addEventListener("click", async () => {
    test.disabled = true;
    ghMsg.className = "field__help";
    ghMsg.textContent = "בודק…";
    try {
      const next = { github_owner: owner.value.trim(), code_repo: codeRepo.value.trim(), data_repo: dataRepo.value.trim() };
      await callBridge("saveSettings", next);
      Object.assign(saved, next);
      if (token.value.trim()) {
        await callBridge("setSecret", "github_token", token.value.trim());
        token.value = "";
        token.placeholder = "•••••••• (שמור)";
      }
      const r = await callBridge("testGitHub");
      showGitHubResult(r, ghMsg, ghWarn);
      refreshDesktopInfo();
    } catch (e) {
      owner.value = saved.github_owner;
      codeRepo.value = saved.code_repo;
      dataRepo.value = saved.data_repo;
      followRepos();
      token.value = "";
      ghMsg.textContent = e.message_he || "החיבור נכשל";
      ghMsg.className = "field__error";
      ghWarn.hidden = true;
      toast(e.message_he || "השמירה נכשלה");
    }
    test.disabled = false;
  });
  out.push(
    card(
      "חיבור GitHub",
      h("p", { class: "field__help" }, "מפתח התוכנה נותן גישה לשני המאגרים: הקוד (לעדכוני התוכנה) והנתונים. הוא נשמר רק במחשב הזה."),
      guide,
      field({ id: "gh-owner", label: "משתמש GitHub", control: owner }),
      h("div", { class: "grid2" }, field({ id: "gh-code-repo", label: "מאגר הקוד", control: codeRepo }), field({ id: "gh-data-repo", label: "מאגר הנתונים", control: dataRepo })),
      field({ id: "gh-token", label: "מפתח התוכנה (Fine-grained token)", control: token, help: "נשמר במנהל האישורים של Windows ולא בקובץ." }),
      h("div", { class: "block__actions" }, test),
      ghMsg,
      ghWarn
    )
  );

  // Claude
  const key = input({ id: "claude-key", type: "password", dir: "ltr", placeholder: cfg.has_anthropic_key ? "•••••••• (שמור)" : "sk-ant-…", "data-testid": "claude-key" });
  const rep = toggle({ checked: cfg.report_enabled !== false, label: "דוח Claude לכל קטגוריה", id: "report-on", onChange: (v) => callBridge("saveSettings", { report_enabled: v }) });
  const keyBtn = h("button", { class: "btn btn--secondary btn--pill", type: "button", "data-testid": "claude-key-save" }, "שמור מפתח");
  keyBtn.addEventListener("click", async () => {
    if (!key.value.trim()) return;
    keyBtn.disabled = true;
    try {
      await callBridge("setSecret", "anthropic_api_key", key.value.trim());
      key.value = "";
      key.placeholder = "•••••••• (שמור)";
      toast("המפתח נשמר");
      refreshDesktopInfo();
    } catch (e) {
      key.value = ""; // revert: a rejected secret is not kept on screen
      toast(e.message_he || "שמירת המפתח נכשלה");
    }
    keyBtn.disabled = false;
  });
  out.push(
    card(
      "Claude (דוח לכל קטגוריה)",
      field({ id: "claude-key", label: "מפתח API של Anthropic", control: key, help: "אופציונלי. בלי מפתח הסריקה עובדת כרגיל, בלי דוח. נשמר במנהל האישורים של Windows." }),
      h("div", { class: "block__actions" }, keyBtn),
      h("div", { class: "switchrow" }, h("label", { for: "report-on" }, "הפק דוח לכל קטגוריה"), rep)
    )
  );

  // TradingView
  const tvState = h("div", { class: "conn" }, h("span", { class: "conn__dot" }), h("span", {}, "בודק…"));
  const setTv = (ok) => tvState.replaceChildren(h("span", { class: "conn__dot " + (ok ? "is-on" : "") }), h("span", { "data-testid": "tv-state" }, ok ? "מחובר ל-TradingView" : "לא מחובר ל-TradingView"));
  callBridge("tvStatus").then((r) => (setTv(!!r.logged_in), r.login_in_progress && toast("חלון ההתחברות ל-TradingView פתוח")), () => setTv(false));
  const tvBtn = h("button", { class: "btn btn--secondary btn--pill", type: "button", "data-testid": "tv-login" }, "התחבר ל-TradingView");
  tvBtn.addEventListener("click", async () => {
    tvBtn.disabled = true;
    tvBtn.textContent = "ממתין להתחברות בחלון שנפתח…";
    try {
      const r = await runTvLogin();
      setTv(r.logged_in);
      if (!r.logged_in) toast(r.error_he);
    } catch (e) {
      toast(e.message_he);
    }
    tvBtn.disabled = false;
    tvBtn.textContent = "התחבר ל-TradingView";
  });
  out.push(card("TradingView", tvState, h("p", { class: "field__help" }, "התוכנה משתמשת בדפדפן נפרד משלה, לא בפרופיל שלך. ההתחברות נשמרת בין סריקות."), h("div", { class: "block__actions" }, tvBtn)));

  // Category URLs
  const cats = cfg.categories || [];
  const urlInputs = cats.map((c) => ({ c, el: input({ id: `url-${c.id}`, dir: "ltr", value: c.tv_url || "", "data-testid": `url-${c.id}` }) }));
  const saveUrls = h("button", { class: "btn btn--secondary btn--pill", type: "button", "data-testid": "save-urls" }, "שמור כתובות");
  saveUrls.addEventListener("click", async () => {
    saveUrls.disabled = true;
    try {
      await callBridge("saveSettings", { categories: urlInputs.map(({ c, el }) => ({ ...c, tv_url: el.value.trim() })) });
      urlInputs.forEach(({ c, el }) => (c.tv_url = el.value.trim()));
      toast("הכתובות נשמרו");
    } catch (e) {
      urlInputs.forEach(({ c, el }) => (el.value = c.tv_url || ""));
      toast(e.message_he || "שמירת הכתובות נכשלה");
    }
    saveUrls.disabled = false;
  });
  out.push(card("מסכי הסריקה", h("p", { class: "field__help" }, "כתובת כל מסך שמור ב-TradingView. שם המסך חייב להיות זהה לשם בכתובת."), urlInputs.map(({ c, el }) => field({ id: `url-${c.id}`, label: c.name_he, control: el })), h("div", { class: "block__actions" }, saveUrls)));

  // Behaviour
  let atrSaved = cfg.atr_mult ?? 1.5;
  const atr = input({ id: "atr", type: "text", inputmode: "decimal", dir: "ltr", value: String(atrSaved), "data-testid": "atr" });
  atr.addEventListener("change", async () => {
    const v = parseFloat(atr.value);
    if (!(Number.isFinite(v) && v > 0 && v < 10)) {
      atr.value = String(atrSaved);
      return;
    }
    try {
      await callBridge("saveSettings", { atr_mult: v });
      atrSaved = v;
      toast("נשמר", { ms: 1400 });
    } catch (e) {
      atr.value = String(atrSaved);
      toast(e.message_he || "השמירה נכשלה");
    }
  });
  out.push(
    card(
      "התנהגות",
      h("div", { class: "switchrow" }, h("label", { for: "autostart" }, "הפעלה עם Windows"), toggle({ id: "autostart", checked: !!cfg.autostart, label: "הפעלה עם Windows", onChange: (v) => callBridge("saveSettings", { autostart: v }) })),
      h("div", { class: "switchrow" }, h("label", { for: "auto-update" }, "עדכון אוטומטי של התוכנה"), toggle({ id: "auto-update", checked: cfg.auto_update !== false, label: "עדכון אוטומטי של התוכנה", onChange: (v) => callBridge("saveSettings", { auto_update: v }) })),
      field({ id: "atr", label: "מכפיל ATR לסטופ", control: atr, help: "סטופ = מחיר פחות מכפיל × ATR. ברירת מחדל 1.5. ישפיע מהסריקה הבאה." })
    )
  );

  // Phone: token + QR
  out.push(card("חיבור הטלפון", phoneBlock(cfg, { onUpdate: () => refreshDesktopInfo() })));

  out.push(
    card(
      "תחזוקה",
      h("div", { class: "block__actions" }, h("button", { class: "btn btn--secondary btn--pill", type: "button", onClick: () => callBridge("openLogs").catch((e) => toast(e.message_he)) }, "פתח תיקיית יומנים"), h("a", { class: "btn btn--ghost btn--pill", href: "#/setup", "data-testid": "open-setup" }, "הפעל את אשף ההתקנה שוב"))
    )
  );
  return out;
}

/* ---------- version ---------- */

function versionBlock() {
  // desktop: "גרסת התוכנה 1.0.1 · גרסת הממשק 1.1.1" (the program's version comes from the bridge: the row appears once it answered)
  const ver = h("span", { class: "num", dir: "ltr", "data-testid": "app-version" }, APP_VERSION);
  const uiVer = h("span", { class: "num", dir: "ltr", "data-testid": "ui-version" }, APP_VERSION);
  const verRow = h("div", { class: "kv", "data-testid": "version-row" }, h("span", {}, "גרסת הממשק"), uiVer);
  if (app.mode.desktop) {
    verRow.hidden = true;
    verRow.replaceChildren(h("span", {}, "גרסת התוכנה ", ver, " · גרסת הממשק ", uiVer));
    callBridge("getVersion").then(
      (v) => {
        const t = v && (typeof v === "string" ? v : v.version);
        if (t) ver.textContent = t;
        else verRow.replaceChildren(h("span", {}, "גרסת הממשק ", uiVer));
        verRow.hidden = false;
      },
      () => {
        verRow.replaceChildren(h("span", {}, "גרסת הממשק ", uiVer));
        verRow.hidden = false;
      }
    );
  } else verRow.replaceChildren(h("span", {}, "גרסת הממשק"), ver);
  const btn = h("button", { class: "btn btn--secondary btn--pill", type: "button", "data-testid": "check-updates" }, "בדוק עדכונים");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "בודק…";
    try {
      if (app.mode.desktop) {
        const r = await callBridge("checkForUpdates");
        toast(r?.message_he || (r?.available ? `נמצאה גרסה ${r.version || ""}`.trim() : "אתה משתמש בגרסה העדכנית"), { ms: 5000 });
      } else if (swSupported() && !app.mode.demo) {
        toast((await checkForUpdatesNow()) ? "נמצא עדכון, האפליקציה תתרענן בעוד רגע" : "אתה משתמש בגרסה העדכנית");
      } else toast("אתה משתמש בגרסה העדכנית");
    } catch (e) {
      toast(e.message_he || "הבדיקה נכשלה");
    }
    btn.disabled = false;
    btn.textContent = "בדוק עדכונים";
  });
  // desktop round 4: the updater cannot see the code repo (or another update problem) -> a warning card right here
  const updErr = h("div", { class: "banner banner--warn banner--inline", role: "status", "data-testid": "update-error-card", hidden: true });
  const paintUpd = () => {
    const t = app.mode.desktop ? app.status?.update_error : null;
    updErr.hidden = !t;
    updErr.replaceChildren(...(t ? [h("span", { class: "banner__icon", "aria-hidden": "true" }, icon("alert", 18, 2)), h("span", { class: "banner__text" }, t)] : []));
  };
  paintUpd();
  onLive(updErr, "status", paintUpd);
  return card("אפליקציה", verRow, updErr, h("div", { class: "block__actions" }, btn), h("p", { class: "field__help" }, "הנתונים והציונים מוצגים לצורכי מידע בלבד ואינם מהווים ייעוץ השקעות."));
}

export async function mount(root) {
  let alive = true;
  async function render() {
    clear(root);
    if (!isWide()) root.append(topBar({ kicker: "STOCKSCENTER · SETTINGS", back: "#/home", backLabel: "חזרה לבית" }));
    root.append(masthead({ kicker: isWide() ? "SETTINGS" : null, title: "הגדרות", meta: metaLine([app.mode.desktop ? "התוכנה, החיבורים והטלפון" : "החיבור למחשב, גודל פוזיציה וגרסה"]) }));
    if (app.bannerBox) root.append(app.bannerBox);
    const grid = h("div", { class: "settings" });
    root.append(grid);
    if (!app.mode.desktop) grid.append(connectionBlock(render));
    grid.append(accountBlock());
    if (app.mode.desktop) {
      const blocks = await desktopBlocks(render);
      if (!alive) return;
      const notice = blocks.find((b) => b.dataset?.testid === "local-only-notice");
      grid.append(...blocks.filter((b) => b !== notice));
      if (notice) grid.prepend(notice);
    }
    grid.append(versionBlock());
  }
  await render();
  return () => (alive = false);
}
