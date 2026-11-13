import { h, icon } from "../dom.js";

/** Loading skeleton: rounded --sc-surface-3 blocks (no spinners over content). kind: "rows" | "cards" | "page". */
export function skeleton(n = 3, kind = "cards") {
  return h(
    "div",
    { class: `skel skel--${kind}`, "aria-busy": "true", "aria-label": "טוען", role: "status" },
    Array.from({ length: n }, () => h("div", { class: "skel__b" }))
  );
}

export function emptyState({ title, text, action, testid, extra = null, tone = "" }) {
  return h(
    "div",
    { class: "state card" + (tone ? ` state--${tone}` : ""), "data-testid": testid || "empty-state" },
    h("p", { class: "state__title" }, title),
    text && h("p", { class: "state__text" }, text),
    extra,
    action && (action.href ? h("a", { class: "btn btn--secondary", href: action.href }, action.label) : action.el ? action.el : h("button", { class: "btn btn--secondary", type: "button", onClick: action.onClick }, action.label))
  );
}

/** Error with Hebrew copy + retry; auth-ish problems get a link to settings. */
export function errorState(err, retry) {
  if (err && err.code === "nodata")
    return emptyState({ testid: "nodata-state", title: "עדיין אין נתונים", text: "הנתונים יופיעו כאן אחרי הסריקה הראשונה. לחץ על \"סרוק הכל\" במסך הבית.", action: { href: "#/home", label: "לבית" } });
  return h(
    "div",
    { class: "state card state--warn", role: "alert", "data-testid": "error-state" },
    h("p", { class: "state__title" }, "לא הצלחנו לטעון את הנתונים"),
    h("p", { class: "state__text" }, err?.message_he || err?.message || "שגיאה לא צפויה"),
    h(
      "div",
      { class: "state__actions" },
      retry && h("button", { class: "btn btn--primary btn--sm btn--pill", type: "button", onClick: retry }, icon("scan", 18, 2.2), "נסה שוב"),
      err?.needsSettings && h("a", { class: "btn btn--secondary btn--sm btn--pill", href: "#/settings" }, "להגדרות")
    )
  );
}

/** A screen's code could not be loaded (offline after an update, QA R2-m3): calm text and "נסה שוב" (reload). */
export function loadErrorState() {
  return h(
    "div",
    { class: "state card state--warn state--page", role: "alert", "data-testid": "screen-load-error" },
    h("p", { class: "state__title" }, "המסך לא נטען"),
    h("p", { class: "state__text" }, "נראה שאין כרגע חיבור לאינטרנט, או שהאפליקציה מתעדכנת. הנתונים שלך שמורים."),
    h("div", { class: "state__actions" }, h("button", { class: "btn btn--primary btn--sm btn--pill", type: "button", "data-testid": "screen-retry", onClick: () => location.reload() }, icon("scan", 18, 2.2), "נסה שוב"))
  );
}
