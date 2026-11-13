// The bell on the home header: "עדכונים" built from data the app already has (PC state, list errors, empty lists,
// watched stocks with earnings soon or missing from today's lists). No new backend.
import { h, icon } from "../dom.js";
import { app, pcState, catName, scanSummary } from "../state.js";
import { timeAgo, clock, fmtDM } from "../format.js";
import { daysUntil, inDaysHe } from "../risk.js";
import { loadUniverse } from "../universe.js";
import { openSheet } from "./sheet.js";
import { skeleton } from "./states.js";

/** Synchronous items (PC + lists). tone: "warn" | "danger" | "info" | "ok". */
export function baseAlerts() {
  const out = [];
  const pc = pcState(app.status, clock.now());
  if (pc.kind === "offline") out.push({ tone: "warn", title: "המחשב לא מחובר", text: app.status?.heartbeat_at ? `נראה לאחרונה ${timeAgo(app.status.heartbeat_at, clock.now())}. סריקה חדשה תתאפשר כשהוא יתחבר.` : "סריקה חדשה תתאפשר כשהוא יתחבר." });
  else if (pc.kind === "scanning") out.push({ tone: "info", title: "סריקה רצה עכשיו", text: pc.current?.category ? `סורק את ${catName(pc.current.category)}` : "" });
  else if (pc.kind === "error") out.push({ tone: "danger", title: "הסריקה האחרונה נכשלה", text: app.status?.last_error || "" });
  else if (pc.kind === "online") {
    const s = scanSummary(app.index, app.status);
    out.push({ tone: "ok", title: app.mode.desktop ? "התוכנה פועלת" : "המחשב מחובר", text: s.never ? "עוד לא בוצעה סריקה" : `הסריקה האחרונה ${s.at ? timeAgo(s.at, clock.now()) : ""} · ${s.done} מתוך ${s.total} רשימות`.replace("  ", " ") });
  }
  for (const c of app.index?.categories || []) if (c.error) out.push({ tone: "danger", title: `${c.name_he}: הסריקה נכשלה`, text: c.error.message_he || "" });
  const empty = (app.index?.categories || []).filter((c) => !c.error && c.count === 0).map((c) => c.name_he);
  if (empty.length) out.push({ tone: "info", title: empty.length === 1 ? "רשימה אחת ריקה היום" : `${empty.length} רשימות ריקות היום`, text: empty.join(" · ") });
  return out;
}

/** Items about the watchlist (needs the merged latest data). */
export function watchAlerts(universe) {
  const out = [];
  for (const w of app.watch) {
    const s = universe.bySymbol.get(w.symbol);
    if (!s) {
      out.push({ tone: "info", title: `${w.symbol} לא מופיעה היום באף רשימה`, text: w.name || "" });
      continue;
    }
    const f = s.flags || {};
    const d = f.earnings_date ? daysUntil(f.earnings_date, clock.now()) : null;
    if (f.earnings_soon && d != null && d >= 0) out.push({ tone: "warn", title: `${s.symbol} מדווחת ב-${fmtDM(f.earnings_date)}`, text: `${inDaysHe(d)}, תנודתיות צפויה` });
  }
  return out;
}

/** Badge dot on the bell: something that needs attention. */
export const needsAttention = () => baseAlerts().some((a) => a.tone === "warn" || a.tone === "danger");

const item = (a) =>
  h(
    "li",
    { class: `alert alert--${a.tone}` },
    h("span", { class: "alert__icon", "aria-hidden": "true" }, icon(a.tone === "danger" || a.tone === "warn" ? "alert" : a.tone === "ok" ? "check" : "bell", 18, 2)),
    h("span", { class: "alert__body" }, h("span", { class: "alert__title" }, h("bdi", {}, a.title)), a.text ? h("span", { class: "alert__text" }, a.text) : null)
  );

export function openAlerts() {
  const list = h("ul", { class: "alerts", "data-testid": "alerts-list" });
  const more = h("div", {}, app.watch.length ? skeleton(1, "rows") : null);
  const body = h("div", { class: "alerts-sheet" }, h("h2", { class: "search__title" }, "עדכונים"), list, more);
  const paint = (extra = []) => {
    const all = [...baseAlerts(), ...extra];
    list.replaceChildren(...(all.length ? all.map(item) : [item({ tone: "ok", title: "אין עדכונים חדשים", text: "" })]));
  };
  paint();
  if (app.watch.length)
    loadUniverse().then(
      (u) => {
        more.replaceChildren();
        paint(watchAlerts(u));
      },
      () => more.replaceChildren()
    );
  return openSheet({ label: "עדכונים", testid: "alerts-sheet", body });
}
