// LocalAdapter: the desktop program's data source. Thin wrapper over window.pywebview.api (SPEC §8 Bridge).
// Bridge methods return data, or {"ok": false, "message_he": "..."} on failure.
import { AdapterError } from "./github.js";

/** The bridge counts as ready only once its functions exist (QA R2-M2). */
const readyApi = () => {
  const api = window.pywebview && window.pywebview.api;
  return api && typeof api.getStatus === "function" ? api : null;
};

/**
 * Resolve with window.pywebview.api once the bridge is READY: the `pywebviewready` event, or a 100 ms poll that sees
 * `api.getStatus` as a function (the event can be missed). pywebview 6 injects in two steps: api.js first creates
 * `window.pywebview = {api: {}}`, and only later finish.js fills in the functions and fires the event, so a bare
 * `api` object is NOT ready (QA R2-M2). null after timeoutMs.
 */
export function waitForPywebview(timeoutMs = 8000, { pollMs = 100 } = {}) {
  return new Promise((resolve) => {
    if (readyApi()) return resolve(readyApi());
    let poll = null;
    let timer = null;
    const finish = (v) => {
      clearInterval(poll);
      clearTimeout(timer);
      window.removeEventListener("pywebviewready", onEvent);
      resolve(v);
    };
    const onEvent = () => {
      const api = window.pywebview && window.pywebview.api;
      if (api) finish(api);
    };
    window.addEventListener("pywebviewready", onEvent);
    poll = setInterval(() => readyApi() && finish(readyApi()), pollMs);
    timer = setTimeout(() => finish(readyApi()), timeoutMs);
  });
}

export const desktopApi = () => (window.pywebview && window.pywebview.api) || null;

/** Call a bridge method and unwrap {ok:false} into an AdapterError. */
export async function callBridge(name, ...args) {
  const api = desktopApi();
  if (!api || typeof api[name] !== "function") throw new AdapterError("http", "הפעולה אינה זמינה בחלון הזה");
  let res;
  try {
    res = await api[name](...args);
  } catch (e) {
    throw new AdapterError("http", "שגיאה בתקשורת עם התוכנה: " + (e && e.message ? e.message : e));
  }
  if (res && typeof res === "object" && res.ok === false) {
    const code = /אין נתונים/.test(res.message_he || "") ? "nodata" : /מפתח|תוקף/.test(res.message_he || "") ? "auth" : "http";
    throw new AdapterError(code, res.message_he || "שגיאה לא ידועה");
  }
  return res;
}

export class LocalAdapter {
  kind = "local";
  stale = null;
  get isPaired() {
    return true;
  }
  getStatus() {
    return callBridge("getStatus");
  }
  getIndex() {
    return callBridge("getIndex");
  }
  getCategory(id) {
    return callBridge("getCategory", id);
  }
  getCombined() {
    return callBridge("getCombined");
  }
  getHistoryIndex() {
    return callBridge("getHistoryIndex");
  }
  getHistoryIndexFor(date) {
    return callBridge("getHistoryIndexFor", date);
  }
  getHistoryCategory(date, id) {
    return callBridge("getHistoryCategory", date, id);
  }
  getHistoryCombined(date) {
    return callBridge("getHistoryCombined", date);
  }
  /** Bridge returns a data: URL, which <img> can use directly. */
  async getImageUrl(path) {
    const res = await callBridge("getImage", path);
    if (typeof res === "string") return res;
    throw new AdapterError("notfound", "התמונה לא נמצאה");
  }
  async requestScan(ids) {
    const r = await callBridge("requestScan", ids && ids.length ? ids : ["all"]);
    return { ok: true, ...(r && typeof r === "object" ? r : {}) };
  }
}

/**
 * Sign in to TradingView through the bridge. Works with a blocking tvLogin() or one that returns {ok, started}
 * at once: afterwards tvStatus() is polled until login_in_progress is false (max 10 min).
 * @returns {Promise<{logged_in:boolean, error_he?:string}>}
 */
export async function runTvLogin({ intervalMs = 1500, timeoutMs = 600000 } = {}) {
  const first = await callBridge("tvLogin");
  const t0 = Date.now();
  let st = await callBridge("tvStatus");
  while (st && st.login_in_progress && Date.now() - t0 < timeoutMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    st = await callBridge("tvStatus");
  }
  if (st && st.logged_in) return { logged_in: true };
  if (first === true || (first && first.logged_in)) return { logged_in: true };
  return { logged_in: false, error_he: (st && st.error_he) || "לא זוהתה התחברות. אפשר לנסות שוב." };
}
