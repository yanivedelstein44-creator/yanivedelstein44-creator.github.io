// FixtureAdapter (?demo=1): reads ../fixtures/demo/ (serve the repo root), simulates an online PC and a fake scan.
// With ?demo=1&desktop=1 it also installs a mock window.pywebview.api so the desktop-only screens can be viewed.
import { clock } from "../format.js";

const BASE = new URL("../../../fixtures/demo/", import.meta.url);
const DEMO_NOW = Date.parse("2026-11-12T17:40:00Z"); // just after the fixture's last heartbeat -> stable screenshots
const SCAN_MS = 6000;
const STEPS = ["capturing", "enriching", "scoring", "report", "saving", "uploading"];
const iso = (t) => new Date(t).toISOString().replace(/\.\d+Z$/, "Z");

export class FixtureAdapter {
  kind = "fixture";
  stale = null;
  isPaired = true;

  constructor() {
    clock.offset = DEMO_NOW - Date.now();
    this.scan = null;
    this.lastScanAt = null;
    this.scannedAt = {}; // category id -> ISO, bumped by fake scans
    this.cmdSeq = 1;
  }

  async _json(path) {
    const res = await fetch(new URL(path, BASE), { cache: "no-store" });
    if (!res.ok) throw Object.assign(new Error(`fixture ${path}: ${res.status}`), { code: "notfound", message_he: "לא נמצא (נתוני דמו)" });
    return res.json();
  }

  _tick() {
    if (this.scan && Date.now() - this.scan.t0 >= SCAN_MS) {
      const done = clock.now();
      this.lastScanAt = iso(done);
      for (const id of this.scan.ids) this.scannedAt[id] = iso(done);
      this.scan = null;
    }
  }

  async getStatus() {
    const base = await this._json("status.json");
    this._tick();
    // ?pcoffline=1: the PC's last heartbeat was two hours ago (the phone shows it offline)
    const offline = new URLSearchParams(location.search).get("pcoffline") === "1";
    const out = { ...base, heartbeat_at: iso(clock.now() - (offline ? 2 * 3600 * 1000 : 0)), local_only: new URLSearchParams(location.search).get("localonly") === "1", queued: 0 };
    if (this.lastScanAt) out.last_scan_at = this.lastScanAt;
    if (this.scan) {
      const { ids, t0, id } = this.scan;
      const total = ids.length;
      const p = Math.min(0.999, (Date.now() - t0) / SCAN_MS) * total;
      const done = Math.floor(p);
      out.state = "scanning";
      out.current = {
        command_id: id,
        categories: ids,
        done,
        total,
        step: STEPS[Math.min(STEPS.length - 1, Math.floor((p - done) * STEPS.length))],
        category: ids[Math.min(done, total - 1)],
        started_at: iso(clock.now() - (Date.now() - t0)),
      };
    }
    return out;
  }

  async getIndex() {
    const idx = await this._json("latest/index.json");
    this._tick();
    idx.categories = idx.categories.map((c) => (this.scannedAt[c.id] ? { ...c, scanned_at: this.scannedAt[c.id] } : c));
    if (this.lastScanAt) idx.updated_at = this.lastScanAt;
    return idx;
  }
  async getCategory(id) {
    const c = await this._json(`latest/${id}.json`);
    if (this.scannedAt[id]) c.scanned_at = this.scannedAt[id];
    return c;
  }
  getCombined() {
    return this._json("latest/combined.json");
  }
  getHistoryIndex() {
    return this._json("history/index.json");
  }
  getHistoryIndexFor(date) {
    return this._json(`history/${date}/index.json`);
  }
  getHistoryCategory(date, id) {
    return this._json(`history/${date}/${id}.json`);
  }
  getHistoryCombined(date) {
    return this._json(`history/${date}/combined.json`);
  }
  async getImageUrl(path) {
    return new URL(path, BASE).href;
  }
  async requestScan(ids) {
    const all = (await this.getIndex()).categories.map((c) => c.id);
    const list = !ids || !ids.length || ids.includes("all") ? all : ids;
    const id = `demo-cmd-${++this.cmdSeq}`;
    this.scan = { t0: Date.now(), ids: list, id };
    return { ok: true, id };
  }
}

/* ---------- desktop bridge mock (?demo=1&desktop=1) ---------- */

function fakeQr(seed = 7) {
  const N = 29;
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const finder = (r, c) => {
    const f = (r0, c0) => {
      const dr = r - r0;
      const dc = c - c0;
      if (dr < 0 || dc < 0 || dr > 6 || dc > 6) return null;
      const ring = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
      return ring === 3 || ring <= 1;
    };
    return f(0, 0) ?? f(0, N - 7) ?? f(N - 7, 0);
  };
  let cells = "";
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const fin = finder(r, c);
      const on = fin ?? rnd() > 0.52;
      const quiet = (r < 8 && c < 8) || (r < 8 && c > N - 9) || (r > N - 9 && c < 8);
      if (on && (fin === true || (!quiet && fin === null))) cells += `<rect x="${c}" y="${r}" width="1" height="1"/>`;
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${N + 4} ${N + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/><g fill="#0F1E36">${cells}</g></svg>`;
}

/**
 * Mock of desktop/stockscenter/app/bridge.py for ?demo=1&desktop=1. Test hooks (query or window):
 *   ?token=0 (no desktop token: wizard opens) · ?phonetoken=0 (no phone token) · ?phoneok=0 (phone_token_ok false) · ?persist=0 (secrets_persistent false)
 *   ?syncerror=<text> or window.__mockSyncError (status.sync_error) · window.__mockFail = ["saveSettings", ...] (those methods answer {ok:false})
 *   ?restoring=1 or window.__mockRestoring (status.restoring) · ?updateerror=<text> or window.__mockUpdateError (status.update_error)
 *   ?coderepo=0 (testGitHub: ok, but code_repo_ok false + warning_he) · window.__openedUrls (what openUrl was asked to open).
 */
export function installDesktopMock(adapter) {
  const q = new URLSearchParams(location.search);
  const state = {
    has_github_token: q.get("token") !== "0",
    has_anthropic_key: false,
    has_phone_token: q.get("phonetoken") !== "0",
    phone_token_ok: q.get("phonetoken") === "0" ? null : q.get("phoneok") === "0" ? false : true,
    tv: true,
    settings: {
      github_owner: "yanivedelstein44-creator",
      code_repo: "stockscenter",
      data_repo: "stockscenter-data",
      pwa_url: "https://yanivedelstein44-creator.github.io/stockscenter/",
      atr_mult: 1.5,
      report_enabled: true,
      autostart: true,
      auto_update: true,
      ui_prefs: {},
      categories: [],
    },
  };
  const wait = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
  let tvLoginUntil = 0;
  // the desktop's getStatus() is the §4.6 object plus local_only, queued and sync_error (null or Hebrew text)
  const baseStatus = adapter.getStatus.bind(adapter);
  const restoring = () => (window.__mockRestoring ?? q.get("restoring") === "1") === true;
  adapter.getStatus = async () => ({
    ...(await baseStatus()),
    local_only: q.get("localonly") === "1",
    queued: 0,
    sync_error: window.__mockSyncError ?? q.get("syncerror") ?? null,
    // desktop round 4 (notes/contract-requests.md): restore before the first scan, and the updater's repo problem
    restoring: restoring(),
    restore_message_he: restoring() ? "משחזר נתונים מ-GitHub…" : null,
    update_error: window.__mockUpdateError ?? q.get("updateerror") ?? null,
  });
  // Shapes follow desktop/stockscenter/app/bridge.py.
  const api = {
    getStatus: () => adapter.getStatus(),
    getIndex: () => adapter.getIndex(),
    getCategory: (id) => adapter.getCategory(id).catch(() => ({ ok: false, message_he: "אין נתונים עדיין. הרץ סריקה כדי להתחיל" })),
    getCombined: () => adapter.getCombined(),
    getHistoryIndex: () => adapter.getHistoryIndex(),
    getHistoryIndexFor: (d) => adapter.getHistoryIndexFor(d).catch(() => ({ ok: false, message_he: "אין נתונים עדיין. הרץ סריקה כדי להתחיל" })),
    getHistoryCategory: (d, id) => adapter.getHistoryCategory(d, id).catch(() => ({ ok: false, message_he: "אין נתונים עדיין. הרץ סריקה כדי להתחיל" })),
    getHistoryCombined: (d) => adapter.getHistoryCombined(d).catch(() => ({ ok: false, message_he: "אין נתונים עדיין. הרץ סריקה כדי להתחיל" })),
    getImage: (p) => adapter.getImageUrl(p),
    requestScan: async (ids) => (await adapter.requestScan(ids), { ok: true }),
    async getSettings() {
      if (!state.settings.categories.length) {
        const idx = await adapter.getIndex();
        state.settings.categories = idx.categories.map((c) => ({
          id: c.id,
          name_he: c.name_he,
          name_en: c.name_en,
          tv_url: `https://www.tradingview.com/screener/${c.id.slice(0, 4).toUpperCase()}demo/`,
          screen_name: c.name_en,
        }));
      }
      const warning = state.phone_token_ok === false ? `המפתח הזה רואה גם את מאגר הקוד ${state.settings.code_repo}. צור מפתח לטלפון עם ${state.settings.data_repo} בלבד (בדיקת התוכנה).` : null;
      return { ...state.settings, ui_prefs: { ...state.settings.ui_prefs }, has_github_token: state.has_github_token, has_anthropic_key: state.has_anthropic_key, has_phone_token: state.has_phone_token, phone_token_ok: state.phone_token_ok, phone_token_warning_he: warning, local_only: q.get("localonly") === "1", app_version: "1.0.1", secrets_persistent: q.get("persist") !== "0" };
    },
    async saveSettings(partial) {
      // like the real bridge: ui_prefs is shallow-merged, everything else replaces
      const { ui_prefs, ...rest } = partial || {};
      Object.assign(state.settings, rest);
      if (ui_prefs) state.settings.ui_prefs = { ...state.settings.ui_prefs, ...ui_prefs };
      return { ok: true, settings: await api.getSettings() };
    },
    async setSecret(name, value) {
      if (name === "github_token") state.has_github_token = !!value;
      if (name === "anthropic_api_key") state.has_anthropic_key = !!value;
      if (name === "phone_token") {
        state.has_phone_token = !!value;
        state.phone_token_ok = value ? true : null;
      }
      return { ok: true, has_value: !!value };
    },
    testGitHub: () =>
      wait(
        600,
        q.get("coderepo") === "0"
          ? { ok: true, message_he: "החיבור תקין. נמצא מאגר פרטי ושני הענפים.", code_repo_ok: false, warning_he: `המפתח של המחשב לא רואה את מאגר הקוד ${state.settings.code_repo}, ולכן העדכונים האוטומטיים לא יעבדו. צור מפתח שכולל את שני המאגרים` }
          : { ok: true, message_he: "החיבור תקין. נמצא מאגר פרטי ושני הענפים.", code_repo_ok: true, warning_he: null }
      ),
    // returns at once; the UI polls tvStatus
    async tvLogin() {
      tvLoginUntil = Date.now() + 1800;
      return { ok: true, started: true };
    },
    async tvStatus() {
      const busy = Date.now() < tvLoginUntil;
      if (!busy && tvLoginUntil) state.tv = true;
      return { ok: true, logged_in: state.tv, checked_at: iso(clock.now()), login_in_progress: busy, last_login: state.tv ? iso(clock.now()) : null };
    },
    getPairing: () => {
      if (!state.has_phone_token) return { ok: false, message_he: "כדי לחבר את הטלפון צריך קודם להגדיר מפתח לטלפון" };
      const code = "eyJvIjoiZGVtbyIsInIiOiJkZW1vIiwidCI6IkRFTU8tTk9ULUEtUkVBTC1UT0tFTiJ9";
      const url = state.settings.pwa_url + "#pair=" + code;
      return wait(120, { ok: true, url, qr_svg: fakeQr(), code });
    },
    getInstallInfo: () =>
      wait(150, {
        ok: true,
        page_url: "https://demo.example.github.io/stockscenter-app/",
        pwa_url: state.settings.pwa_url,
        qr_svg: fakeQr(),
        // test hook: window.__mockApk replaces the published-app info ({status: "missing" | "offline" | "bad" | "ok", ...})
        apk: window.__mockApk || { status: "missing" }, // like the real site today: no APK published
      }),
    openUrl: async (u) => ((window.__openedUrls = window.__openedUrls || []).push(u), { ok: true }), // test hook
    openLogs: async () => ({ ok: true }),
    getVersion: async () => ({ ok: true, version: "1.0.4" }),
    checkForUpdates: () => wait(700, { ok: true, available: false, version: "1.0.1", message_he: "אתה משתמש בגרסה העדכנית" }),
  };
  // test hook: methods listed in window.__mockFail answer like a failing bridge call
  for (const name of Object.keys(api)) {
    const fn = api[name];
    api[name] = (...args) => ((window.__mockFail || []).includes(name) ? { ok: false, message_he: "שגיאת בדיקה: " + name } : fn(...args));
  }
  window.pywebview = { api };
  return api;
}
