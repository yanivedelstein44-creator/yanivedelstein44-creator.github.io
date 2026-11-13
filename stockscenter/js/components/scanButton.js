// Scan controls: round buttons (category cards, slim top bar, sidebar rows), the nav pill's floating "סרוק הכל",
// the sidebar's white pill, and the progress block (home header / sidebar). Every control follows PC + scan state:
// offline or busy -> aria-disabled with a spoken reason, and a tap explains why in a toast.
import { h, icon, svg } from "../dom.js";
import { app, requestScan, isScanning, pcState, catName, scanSummary, onLive } from "../state.js";
import { timeAgo, clock, fmtInt } from "../format.js";

export const STEP_HE = {
  capturing: "מצלם את מסך הסורק",
  enriching: "מושך נתוני שוק",
  scoring: "מחשב ציונים",
  report: "מכין דוח",
  saving: "שומר",
  uploading: "מעלה לענן",
};

/** {off, busy, pending, cur, mine}: mine = this control's categories are being scanned right now. */
export function scanState(ids = ["all"]) {
  const off = pcState(app.status).kind === "offline";
  const busy = isScanning();
  const cur = app.status?.state === "scanning" ? app.status.current : null;
  const all = ids.includes("all");
  const mine = !!(busy && (all ? true : cur ? ids.includes(cur.category) : app.pendingScan && app.pendingScan.ids.some((i) => i === "all" || ids.includes(i))));
  return { off, busy, pending: !!app.pendingScan && !cur, cur, mine };
}

function explain(st) {
  if (st.off) app.toast("המחשב לא מחובר. סריקה חדשה תתאפשר כשהוא יתחבר.");
  else if (st.pending) app.toast("הבקשה כבר נשלחה. המחשב יתחיל בעוד כמה שניות.");
  else app.toast("סריקה כבר רצה. אפשר לסרוק שוב כשהיא תסתיים.");
}

/** Spoken label (visually hidden text, so it is also the button's text content). */
export const scanLabel = (label, st) => (st.off ? `${label}: לא זמין, המחשב לא מחובר` : st.busy ? `${label}: ${st.mine ? "סורק עכשיו" : "סריקה אחרת רצה"}` : label);

function wire(el, ids, label, paint) {
  const sr = el.querySelector(".sr-only");
  const sync = () => {
    const st = scanState(ids);
    const blocked = st.off || st.busy;
    el.setAttribute("aria-disabled", String(blocked));
    el.classList.toggle("is-off", st.off);
    el.classList.toggle("is-busy", st.busy && !st.off);
    el.classList.toggle("is-mine", st.mine && !st.off);
    if (sr) sr.textContent = scanLabel(label, st);
    paint?.(st);
  };
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    const st = scanState(ids);
    if (st.off || st.busy) return explain(st);
    requestScan(ids);
  });
  sync();
  onLive(el, ["status", "tick"], sync);
  return sync;
}

/** Round icon button. tone: "dark" (home cards), "brand" (slim top bar), "light" (an empty list), "side" (sidebar rows). */
export function roundScan({ ids, label, testid, tone = "dark", size = 42 }) {
  const el = h("button", { class: `rscan rscan--${tone}`, type: "button", "data-testid": testid, style: `--size:${size}px` }, icon("scan", Math.round(size * 0.45), 2.4), h("span", { class: "sr-only" }, label));
  const sync = wire(el, ids, label);
  return { el, sync };
}

/** The nav pill's floating center button, with a progress ring while a scan runs. */
export function navScan() {
  const C = 2 * Math.PI * 35;
  const ring = svg(`<svg class="navscan__ring" viewBox="0 0 76 76" aria-hidden="true" focusable="false"><circle cx="38" cy="38" r="35" fill="none" stroke-width="3"/></svg>`);
  const arc = ring.querySelector("circle");
  const el = h("button", { class: "navscan", type: "button", "data-testid": "scan-all" }, ring, icon("scan", 29, 2.4), h("span", { class: "sr-only" }, "סרוק הכל"));
  const sync = wire(el, ["all"], "סרוק הכל", (st) => {
    const c = st.cur;
    const p = c && c.total ? Math.min(1, (c.done + 0.5) / c.total) : st.pending ? 0.04 : 0;
    arc.setAttribute("stroke-dasharray", `${(C * p).toFixed(1)} ${C.toFixed(1)}`);
    ring.classList.toggle("is-on", !!(st.busy && !st.off));
  });
  return { el, sync };
}

/** The sidebar's white "סרוק הכל" pill (desktop). */
export function pillScan() {
  const text = h("span", {}, "סרוק הכל");
  const el = h("button", { class: "pillscan", type: "button", "data-testid": "scan-all" }, icon("scan", 19, 2.4), text);
  const sync = wire(el, ["all"], "סרוק הכל", (st) => {
    const c = st.cur;
    text.textContent = st.off ? "המחשב לא מחובר" : c ? `סורק · ${fmtInt(c.done)} מתוך ${fmtInt(c.total)}` : st.pending ? "ממתין למחשב…" : "סרוק הכל";
  });
  return { el, sync };
}

/**
 * Scan progress (home header panel and the sidebar): a bar plus one line. Idle: "נסרקו 10 מתוך 10 רשימות · לפני 4 דק'".
 * Scanning: "סורק עכשיו: מומנטום" + "3 מתוך 10" (data-testid scan-progress, hidden while idle).
 */
export function scanProgress({ variant = "hero" } = {}) {
  const fill = h("span", { class: "progress__fill" });
  const track = h("div", { class: "progress__track", "aria-hidden": "true" }, fill);
  const idleA = h("span", {});
  const idleB = h("span", { class: "num" });
  const idle = h("div", { class: "progress__row", "data-testid": "scan-summary" }, idleA, idleB);
  const busyA = h("span", { class: "progress__now" });
  const busyB = h("span", { class: "num" });
  const busy = h("div", { class: "progress__row", "data-testid": "scan-progress", role: "status", hidden: true }, busyA, busyB);
  const el = h("div", { class: `progress progress--${variant}` }, track, idle, busy);
  const sync = () => {
    const c = app.status?.state === "scanning" ? app.status.current : null;
    const waiting = !c && app.pendingScan;
    busy.hidden = !(c || waiting);
    idle.hidden = !busy.hidden;
    if (c) {
      const total = c.total || 1;
      busyA.textContent = c.category ? `סורק עכשיו: ${catName(c.category)}` : "סורק עכשיו";
      // the sidebar's pill already shows "סורק · 3 מתוך 10"
      busyB.textContent = variant === "side" ? "" : `${fmtInt(c.done)} מתוך ${fmtInt(c.total)}`;
      busy.title = STEP_HE[c.step] || "";
      fill.style.width = Math.max(4, Math.min(100, ((c.done + 0.5) / total) * 100)) + "%";
      return;
    }
    if (waiting) {
      busyA.textContent = app.status?.restoring ? "ממתין לסיום השחזור" : "הבקשה נשלחה למחשב";
      busyB.textContent = variant === "side" ? " · ממתין…" : "ממתין…";
      fill.style.width = "4%";
      return;
    }
    const s = scanSummary(app.index, app.status);
    if (s.never) {
      idleA.textContent = app.status?.restoring ? "משחזר נתונים מ-GitHub…" : app.index ? "עוד לא בוצעה סריקה" : app.error ? "אין נתונים להצגה" : "טוען…";
      idleB.textContent = "";
      fill.style.width = "0%";
      return;
    }
    const sep = variant === "side" ? " · " : "";
    idleA.textContent = variant === "side" ? `נסרקו ${fmtInt(s.done)} מתוך ${fmtInt(s.total)}` : `נסרקו ${fmtInt(s.done)} מתוך ${fmtInt(s.total)} רשימות`;
    idleB.textContent = (s.at ? sep + timeAgo(s.at, clock.now()) : "").replace(/^ · $/, "");
    fill.style.width = Math.round((s.done / (s.total || 10)) * 100) + "%";
  };
  sync();
  onLive(el, ["status", "index", "tick"], sync);
  return { el, sync };
}

/** A small "PC state" dot + text for meta lines: "המחשב מחובר" / "המחשב לא מחובר" ... (null inside the desktop window). */
export function pcMeta() {
  if (app.mode.desktop) return null;
  const pc = pcState(app.status, clock.now());
  if (pc.kind === "unknown") return null;
  return pc.kind === "offline" ? { on: false, text: "המחשב לא מחובר" } : pc.kind === "scanning" ? { on: true, text: "המחשב סורק" } : { on: true, text: "המחשב מחובר" };
}
