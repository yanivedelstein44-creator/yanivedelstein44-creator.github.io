import { h, icon, clear } from "../dom.js";
import { app, pcState, phoneOffline } from "../state.js";
import { timeAgo, clock } from "../format.js";

/**
 * Global banners in one persistent container (#banners) that each screen places under its own header:
 * API errors (-> settings), the desktop's restore progress, sync_error, update_error (home) and non-persistent keys,
 * the offline cache, PC offline (home, PWA only).
 */
export function mountBanners(container, getRoute) {
  function render() {
    clear(container);
    const route = getRoute();
    const add = (kind, text, action, testid) => {
      const el = h(
        "div",
        { class: `banner banner--${kind}`, role: kind === "bad" ? "alert" : "status", "data-testid": testid || "banner-" + kind },
        h("span", { class: "banner__icon", "aria-hidden": "true" }, icon(kind === "info" ? "bell" : "alert", 18, 2)),
        h("span", { class: "banner__text" }, text),
        action && h("a", { class: "banner__action", href: action.href }, action.label)
      );
      container.append(el);
      return el;
    };
    // home without data shows the same message as its own card: no duplicate banner there
    if (app.error && route?.name !== "settings" && route?.name !== "setup" && !(route?.name === "home" && !app.index)) {
      add("bad", app.error.message_he, app.error.needsSettings ? { href: "#/settings", label: "להגדרות" } : null);
    }
    if (app.status?.restoring) {
      // desktop round 4: the remote history is restored before the first scan
      add("info", `${app.status.restore_message_he || "משחזר נתונים מ-GitHub…"} הסריקות ימתינו עד שהשחזור יסתיים.`, null, "banner-restore").classList.add("banner--progress");
    }
    if (app.mode.desktop && app.status?.sync_error) add("warn", `הסנכרון עם GitHub נכשל: ${app.status.sync_error}`);
    if (app.mode.desktop && route?.name === "home" && app.status?.update_error) add("warn", app.status.update_error, { href: "#/settings", label: "להגדרות" }, "banner-update");
    if (app.mode.desktop && app.desktopInfo && app.desktopInfo.secrets_persistent === false)
      add("warn", "המפתחות לא נשמרים באופן קבוע במחשב הזה, ולכן יימחקו כשהתוכנה תיסגר. תצטרך להזין אותם שוב בהפעלה הבאה.");
    if (app.adapter?.stale) add("info", `אין חיבור לאינטרנט · מוצגים הנתונים האחרונים שנשמרו (${timeAgo(app.adapter.stale.at, clock.now())})`);
    else if (phoneOffline()) add("info", "אין חיבור לאינטרנט · מוצגים הנתונים האחרונים שנטענו", null, "banner-offline");
    if (route?.name === "home" && !app.mode.desktop && pcState(app.status).kind === "offline" && !app.error) {
      const seen = app.status?.heartbeat_at ? ` · עודכן ${timeAgo(app.status.heartbeat_at, clock.now())}` : "";
      add("warn", `המחשב לא מחובר${seen}. מוצגים נתוני הסריקה האחרונה, וסריקה חדשה תתאפשר כשהוא יתחבר.`);
    }
  }
  for (const ev of ["status", "error", "route", "index", "desktop", "tick"]) app.bus.on(ev, render);
  render();
}
