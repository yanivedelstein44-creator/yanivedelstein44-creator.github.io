// Phone install page (#/install, never in the desktop window; SPEC §9). The QR / link from the PC lands here already
// paired: one big "הורד" button over the browser's own install dialog, with this browser's steps when one tap is not
// possible yet. The installed app itself (and the Android shell) only says that it is installed.
import { h, clear, brandMark, icon } from "../dom.js";
import { app } from "../state.js";
import { topBar } from "../components/chrome.js";
import { canOfferInstall, installSteps } from "../data/install.js";
import { installState, onInstallChange, alreadyInstalled } from "../installPrompt.js";
import { startInstall } from "../components/installFlow.js";

const POINTS = ["סמל משלה במסך הבית, בלי דפדפן מסביב", "מתעדכנת לבד בכל פתיחה", "מפתח החיבור נשמר רק בטלפון הזה"];

export async function mount(root) {
  let alive = true;
  let installedBefore = false;
  clear(root);
  root.append(topBar({ kicker: "STOCKSCENTER · התקנה", back: "#/home", backLabel: "חזרה לבית" }));
  if (app.bannerBox) root.append(app.bannerBox);

  const paired = !!(app.adapter && (app.adapter.kind !== "github" || app.adapter.isPaired));
  const conn = h(
    "div",
    { class: "conn install-hero__conn", "data-testid": "install-conn" },
    h("span", { class: "conn__dot " + (paired ? "is-on" : "") }),
    h("span", {}, paired ? "מחובר למחשב" : "עוד לא מחובר למחשב")
  );
  const title = h("h1", { class: "install-hero__title" });
  const lead = h("p", { class: "install-hero__lead" });
  const btn = h("button", { class: "btn btn--primary btn--pill install-hero__btn", type: "button", "data-testid": "install-download" }, icon("download", 22, 2.2), h("span", {}, "הורד"));
  const status = h("p", { class: "install-hero__status", role: "status", "data-testid": "install-status" });
  const steps = h("ol", { class: "guide install-hero__steps", "data-testid": "install-inline-steps", hidden: true });
  const more = h("a", { class: "more-link", href: "#/home", "data-testid": "install-skip" }, "המשך בלי להתקין", icon("chevron", 16, 2.4));
  const pairHint = paired ? null : h("p", { class: "field__help install-hero__hint", "data-testid": "install-pair-hint" }, "אחרי ההתקנה: בתוכנה במחשב לחץ ״התקן בטלפון״, וסרוק את הקוד שמופיע שם.");

  function paint() {
    if (!alive) return;
    const st = installState();
    steps.hidden = true;
    btn.hidden = false;
    more.hidden = false;
    if (!canOfferInstall(st.kind) && st.kind !== "desktop") {
      // already inside the installed app (or the Android shell)
      title.textContent = "האפליקציה מותקנת";
      lead.textContent = "אתה כבר בתוך האפליקציה. היא מתעדכנת לבד.";
      btn.hidden = true;
      more.replaceChildren("לעמוד הראשי", icon("chevron", 16, 2.4));
      status.textContent = "";
      return;
    }
    title.textContent = "StocksCenter בטלפון";
    if (st.kind === "desktop") {
      lead.textContent = "הדף הזה מיועד לטלפון.";
      btn.hidden = true;
      steps.hidden = false;
      steps.replaceChildren(...installSteps("desktop").steps.map((t) => h("li", {}, t)));
      status.textContent = "";
      return;
    }
    if (st.installedNow) {
      lead.textContent = "הותקן. הסמל של StocksCenter נמצא עכשיו במסך הבית.";
      btn.hidden = true;
      status.textContent = "אפשר לסגור את הדפדפן ולפתוח את האפליקציה מהסמל.";
      more.replaceChildren("המשך כאן", icon("chevron", 16, 2.4));
      return;
    }
    if (installedBefore) {
      lead.textContent = "האפליקציה כבר מותקנת בטלפון. פתח אותה מהסמל במסך הבית.";
      btn.hidden = true;
      status.textContent = "";
      return;
    }
    lead.textContent = "סורק המניות שלך כאפליקציה בטלפון. לוחצים ״הורד״, מאשרים ״התקן״, וזהו.";
    btn.classList.toggle("is-ready", st.canPrompt);
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      const r = await startInstall(btn);
      if (r === "accepted") status.textContent = "מתקין… הסמל יופיע במסך הבית בעוד כמה שניות.";
      else if (r === "dismissed") status.textContent = "ההתקנה בוטלה. אפשר ללחוץ ״הורד״ שוב בכל רגע.";
    } finally {
      btn.disabled = false;
    }
  });

  root.append(
    h(
      "div",
      { class: "pad-x" },
      h(
        "section",
        { class: "card install-hero", "data-testid": "install-page" },
        h("div", { class: "install-hero__mark" }, brandMark(76)),
        title,
        lead,
        conn,
        btn,
        status,
        steps,
        h("ul", { class: "install-hero__points" }, POINTS.map((t) => h("li", {}, icon("check", 16, 2.4), h("span", {}, t)))),
        pairHint,
        more
      )
    )
  );
  paint();
  const unsub = onInstallChange(paint);
  alreadyInstalled().then((yes) => {
    installedBefore = yes;
    paint();
  });
  return () => {
    alive = false;
    unsub();
  };
}
