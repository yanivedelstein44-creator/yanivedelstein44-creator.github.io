import { h } from "../dom.js";
import { app, pcState, onLive } from "../state.js";
import { timeAgo, clock, fmtInt } from "../format.js";

/** {kind, label} for the PC status. variant "side" (wide layouts) has room for the last update time. */
export function statusInfo(variant = "hero") {
  const st = app.status;
  const pc = pcState(st, clock.now());
  if (app.mode.desktop) {
    // Inside the desktop program the PC IS this machine: show the program's own state (MergedDesktop sidebar).
    if (!st) return { kind: "unknown", label: app.error ? "אין קשר עם התוכנה" : "מתחבר…" };
    const scanning = pc.kind === "scanning" || !!app.pendingScan;
    const gh = st.local_only ? "GitHub לא מחובר" : st.sync_error ? "שגיאת סנכרון" : st.restoring ? "משחזר מ-GitHub" : "GitHub מסונכרן";
    const info = app.desktopInfo;
    const phone = !info ? null : !info.has_phone_token ? "הטלפון לא מחובר" : info.phone_token_ok === false ? "בעיה במפתח הטלפון" : "הטלפון מחובר";
    const warn = pc.kind === "error" || st.local_only || !!st.sync_error;
    const head = scanning ? "סורק" : pc.kind === "error" ? "פועל · שגיאה בסריקה" : "פועל";
    return { kind: scanning ? "scanning" : warn ? "error" : "online", label: [head, gh, phone].filter(Boolean).join(" · ") };
  }
  if (app.pendingScan && pc.kind !== "offline") return { kind: "scanning", label: "הבקשה נשלחה · ממתין למחשב" };
  if (pc.phoneOffline) return { kind: "unknown", label: "אין חיבור לאינטרנט" };
  if (pc.kind === "unknown") return { kind: app.error ? "offline" : "unknown", label: app.error ? "אין קשר עם המחשב" : "בודק חיבור…" };
  if (pc.kind === "offline") return { kind: "offline", label: "המחשב לא מחובר" + (variant === "side" && st?.heartbeat_at ? ` · נראה ${timeAgo(st.heartbeat_at, clock.now())}` : "") };
  if (pc.kind === "scanning") {
    const c = st.current;
    return { kind: "scanning", label: c ? `המחשב סורק · ${fmtInt(c.done)} מתוך ${fmtInt(c.total)}` : "המחשב סורק" };
  }
  if (pc.kind === "error") return { kind: "error", label: "המחשב מחובר · שגיאה בסריקה" };
  const when = st.last_scan_at ? timeAgo(st.last_scan_at, clock.now()) : "";
  const q = st.queued > 0 ? ` · ${fmtInt(st.queued)} בתור` : "";
  return { kind: "online", label: variant === "side" ? "המחשב מחובר" + (when ? ` · עודכן ${when}` : "") + q : "המחשב מחובר" + q };
}

/** The PC status (mint dot on blue). data-testid="status-pill". Keeps itself fresh. */
export function statusPill({ variant = "hero" } = {}) {
  const dot = h("span", { class: "status__dot", "aria-hidden": "true" });
  const text = h("span", { class: "status__text" });
  const el = h("div", { class: `status status--${variant}`, "data-testid": "status-pill", role: "status" }, dot, text);
  function update() {
    const { kind, label } = statusInfo(variant);
    el.dataset.kind = kind;
    text.textContent = label;
  }
  update();
  onLive(el, ["status", "error", "tick", "desktop"], update);
  return { el, update };
}
