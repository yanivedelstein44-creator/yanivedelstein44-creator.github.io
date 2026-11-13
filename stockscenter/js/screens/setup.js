// First-run wizard (desktop only): GitHub -> Claude key (optional) -> TradingView -> pair the phone -> done.
import { h, clear, brandMark } from "../dom.js";
import { app, refreshIndex, refreshStatus, refreshDesktopInfo } from "../state.js";
import { callBridge, runTvLogin } from "../data/local.js";
import { field, input, toggle, desktopTokenGuide, showGitHubResult, codeRepoWarning } from "./settings.js";
import { phoneBlock } from "./phone.js";
import { DEFAULT_OWNER, DEFAULT_CODE_REPO, DEFAULT_DATA_REPO } from "../data/links.js";
import { toast } from "../components/toast.js";
import { masthead, metaLine } from "../components/chrome.js";

const STEPS = [
  { key: "github", label: "GitHub" },
  { key: "claude", label: "Claude" },
  { key: "tv", label: "TradingView" },
  { key: "phone", label: "התקנה בטלפון" },
  { key: "done", label: "סיום" },
];

export async function mount(root) {
  let alive = true;
  let step = app.keepWizardStep ? Math.max(0, app.wizardStep || 0) : 0;
  app.keepWizardStep = false;
  let cfg = {};
  try {
    cfg = await callBridge("getSettings");
  } catch {
    /* shown per step */
  }
  const state = { githubOk: !!cfg.has_github_token, tvOk: false };

  const stepper = () =>
    h(
      "ol",
      { class: "stepper", "data-testid": "wizard-steps" },
      STEPS.map((s, i) => h("li", { class: "stepper__item" + (i === step ? " is-current" : i < step ? " is-done" : ""), "aria-current": i === step ? "step" : null }, h("span", { class: "stepper__n num" }, String(i + 1)), h("span", { class: "stepper__label" }, s.label)))
    );

  const nav = ({ next = "המשך", nextDisabled = false, onNext, skip, back = step > 0 }) =>
    h(
      "div",
      { class: "wizard__nav" },
      h("button", { class: "btn btn--primary btn--pill", type: "button", disabled: nextDisabled, "data-testid": "wizard-next", onClick: onNext || (() => go(step + 1)) }, next),
      skip && h("button", { class: "btn btn--secondary btn--pill", type: "button", "data-testid": "wizard-skip", onClick: () => go(step + 1) }, skip),
      back && h("button", { class: "btn btn--ghost btn--pill", type: "button", onClick: () => go(step - 1) }, "חזרה")
    );

  function body() {
    const k = STEPS[step].key;
    if (k === "github") {
      const owner = input({ id: "w-owner", dir: "ltr", value: cfg.github_owner || DEFAULT_OWNER });
      const codeRepo = input({ id: "w-code-repo", dir: "ltr", value: cfg.code_repo || DEFAULT_CODE_REPO, "data-testid": "wizard-code-repo" });
      const dataRepo = input({ id: "w-data-repo", dir: "ltr", value: cfg.data_repo || DEFAULT_DATA_REPO, "data-testid": "wizard-data-repo" });
      const token = input({ id: "w-token", type: "password", dir: "ltr", placeholder: cfg.has_github_token ? "•••••••• (שמור)" : "github_pat_…", "data-testid": "wizard-token" });
      const msg = h("p", { class: "field__help", role: "status" }, state.githubOk ? "יש כבר מפתח שמור. אפשר לבדוק אותו או להמשיך." : "");
      const warnBox = codeRepoWarning();
      const test = h("button", { class: "btn btn--secondary btn--pill", type: "button", "data-testid": "wizard-test" }, "בדוק חיבור");
      const guide = desktopTokenGuide({ codeRepo: codeRepo.value, dataRepo: dataRepo.value });
      const follow = () => guide.setRepos(codeRepo.value.trim(), dataRepo.value.trim());
      codeRepo.addEventListener("input", follow);
      dataRepo.addEventListener("input", follow);
      const nextBtn = nav({ nextDisabled: !state.githubOk });
      const setNext = (ok) => {
        state.githubOk = ok;
        nextBtn.querySelector('[data-testid="wizard-next"]').disabled = !ok;
      };
      test.addEventListener("click", async () => {
        test.disabled = true;
        msg.className = "field__help";
        msg.textContent = "בודק…";
        try {
          await callBridge("saveSettings", { github_owner: owner.value.trim(), code_repo: codeRepo.value.trim(), data_repo: dataRepo.value.trim() });
          if (token.value.trim()) await callBridge("setSecret", "github_token", token.value.trim());
          const r = await callBridge("testGitHub");
          showGitHubResult(r, msg, warnBox); // ok + code_repo_ok false: success plus the warning, and the user may continue
          setNext(!!r.ok);
        } catch (e) {
          msg.textContent = e.message_he;
          msg.className = "field__error";
          warnBox.hidden = true;
          setNext(false);
        }
        test.disabled = false;
      });
      return h(
        "div",
        { class: "wizard__body" },
        h("h2", { class: "wizard__title" }, "חיבור ל-GitHub"),
        h("p", { class: "wizard__lead" }, "התוכנה שומרת את הקוד והנתונים בשני מאגרים פרטיים משלך. צור מפתח אחד לתוכנה, עם הרשאת Contents: קריאה וכתיבה, שמוגבל לשני המאגרים."),
        guide,
        field({ id: "w-owner", label: "משתמש GitHub", control: owner }),
        h("div", { class: "grid2" }, field({ id: "w-code-repo", label: "מאגר הקוד", control: codeRepo }), field({ id: "w-data-repo", label: "מאגר הנתונים", control: dataRepo })),
        field({ id: "w-token", label: "מפתח התוכנה", control: token, help: "נשמר במנהל האישורים של Windows ולא בקובץ." }),
        h("div", { class: "block__actions" }, test),
        msg,
        warnBox,
        nextBtn
      );
    }
    if (k === "claude") {
      const key = input({ id: "w-claude", type: "password", dir: "ltr", placeholder: "sk-ant-…", "data-testid": "wizard-claude" });
      return h(
        "div",
        { class: "wizard__body" },
        h("h2", { class: "wizard__title" }, "דוח Claude (אופציונלי)"),
        h("p", { class: "wizard__lead" }, "עם מפתח API, כל קטגוריה תקבל סיכום קצר בעברית והערה על המובילות. בלי מפתח הכול עובד, פשוט בלי דוח. אפשר להוסיף אחר כך בהגדרות."),
        field({ id: "w-claude", label: "מפתח API של Anthropic", control: key }),
        nav({
          next: "שמור והמשך",
          skip: "דלג",
          onNext: async () => {
            if (key.value.trim()) {
              try {
                await callBridge("setSecret", "anthropic_api_key", key.value.trim());
              } catch (e) {
                return toast(e.message_he);
              }
            }
            go(step + 1);
          },
        })
      );
    }
    if (k === "tv") {
      const msg = h("p", { class: "field__help", role: "status" }, state.tvOk ? "מחובר ל-TradingView." : "");
      const btn = h("button", { class: "btn btn--secondary btn--pill", type: "button", "data-testid": "wizard-tv" }, "פתח חלון התחברות");
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        msg.className = "field__help";
        msg.textContent = "ממתין להתחברות בחלון שנפתח. החלון ייסגר לבד.";
        try {
          const r = await runTvLogin();
          state.tvOk = r.logged_in;
          msg.textContent = state.tvOk ? "מחובר ל-TradingView." : r.error_he;
          msg.className = state.tvOk ? "field__help is-ok" : "field__error";
        } catch (e) {
          msg.textContent = e.message_he;
          msg.className = "field__error";
        }
        btn.disabled = false;
      });
      return h(
        "div",
        { class: "wizard__body" },
        h("h2", { class: "wizard__title" }, "התחברות ל-TradingView"),
        h("p", { class: "wizard__lead" }, "התוכנה פותחת דפדפן נפרד משלה, לא את הפרופיל האישי שלך, ושומרת בו את ההתחברות. התחבר פעם אחת לחשבון שבו שמורים מסכי הסריקה."),
        h("div", { class: "block__actions" }, btn),
        msg,
        nav({ skip: "דלג, אתחבר אחר כך" })
      );
    }
    if (k === "phone") {
      return h(
        "div",
        { class: "wizard__body" },
        h("h2", { class: "wizard__title" }, "התקנה בטלפון"),
        h("p", { class: "wizard__lead" }, "לטלפון יש מפתח נפרד משלו, שרואה רק את מאגר הנתונים. הדבק אותו כאן, סרוק את הקוד במצלמת הטלפון, ובדף שנפתח לחץ ״הורד״. את הקוד תמצא תמיד גם בכפתור ״התקן בטלפון״."),
        phoneBlock(cfg, {
          onUpdate: (c) => {
            Object.assign(cfg, c);
            app.desktopInfo = c; // the sidebar's "הטלפון מחובר" follows at once
            app.bus.emit("desktop", c);
          },
        }),
        nav({ skip: "דלג" })
      );
    }
    return h(
      "div",
      { class: "wizard__body wizard__body--done" },
      h("div", { class: "wizard__done-mark" }, brandMark(64)),
      h("h2", { class: "wizard__title" }, "הכול מוכן"),
      h("p", { class: "wizard__lead" }, "אפשר להתחיל בסריקה הראשונה. היא לוקחת כמה דקות, ובסיומה הנתונים יופיעו כאן ובטלפון."),
      h(
        "div",
        { class: "wizard__switch" },
        h(
          "div",
          { class: "switchrow" },
          h("label", { for: "wiz-autostart" }, "הפעלה עם הדלקת המחשב"),
          toggle({ id: "wiz-autostart", checked: !!cfg.autostart, label: "הפעלה עם הדלקת המחשב", onChange: async (v) => { await callBridge("saveSettings", { autostart: v }); cfg.autostart = v; } })
        ),
        h("p", { class: "field__help", "data-testid": "wizard-tray-note" }, "התוכנה עולה ישר לסמל ליד השעון. גם X רק מסתיר את החלון, והסריקות ממשיכות ברקע.")
      ),
      h(
        "div",
        { class: "wizard__nav" },
        h("button", { class: "btn btn--primary btn--pill", type: "button", "data-testid": "wizard-finish", onClick: finish }, "לעמוד הראשי"),
      )
    );
  }

  async function finish() {
    await Promise.allSettled([refreshStatus(), refreshIndex(), refreshDesktopInfo()]);
    app.nav("#/home");
  }

  function go(i) {
    step = Math.max(0, Math.min(STEPS.length - 1, i));
    app.wizardStep = step;
    draw();
  }
  function draw() {
    if (!alive) return;
    clear(root);
    root.append(
      h(
        "div",
        { class: "wizard", "data-testid": "wizard" },
        masthead({ kicker: "STOCKSCENTER", title: "הגדרה ראשונית", meta: metaLine([`שלב ${step + 1} מתוך ${STEPS.length}`, STEPS[step].label]), testid: "wizard-masthead" }),
        stepper(),
        h("div", { class: "card wizard__card" }, body())
      )
    );
  }
  draw();
  return () => (alive = false);
}
