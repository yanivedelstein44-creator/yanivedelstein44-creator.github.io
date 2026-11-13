// GitHubAdapter: the PWA's data source. Reads the private repo's `data` branch through the GitHub contents API
// with the user's fine-grained token (stored only in localStorage "sc.pair"). SPEC §5.
// Everything that touches the network goes through this file; the token never leaves api.github.com.

export const API = "https://api.github.com";
export const PAIR_KEY = "sc.pair";
const CACHE_PREFIX = "sc.cache.";

export const MSG = {
  401: "המפתח לא תקין או שפג תוקפו",
  403: "אין הרשאה, או שמגבלת הבקשות של GitHub נגמרה",
  404: "לא נמצא, או שלמפתח אין גישה למאגר",
  offline: "אין חיבור לאינטרנט, ננסה שוב",
  unpaired: "הטלפון עדיין לא מחובר. הדבק בהגדרות את קוד החיבור מהתוכנה במחשב.",
  generic: "שגיאה בגישה ל-GitHub",
};

export class AdapterError extends Error {
  /** code: auth | forbidden | notfound | offline | unpaired | http | bad_pairing */
  constructor(code, message_he, status = 0) {
    super(message_he);
    this.name = "AdapterError";
    this.code = code;
    this.message_he = message_he;
    this.status = status;
  }
  /** Errors whose remedy lives in the settings screen. */
  get needsSettings() {
    return this.code === "auth" || this.code === "notfound" || this.code === "unpaired" || this.code === "forbidden";
  }
}

export function mapHttpError(status) {
  if (status === 401) return new AdapterError("auth", MSG[401], 401);
  if (status === 403 || status === 429) return new AdapterError("forbidden", MSG[403], status);
  if (status === 404) return new AdapterError("notfound", MSG[404], 404);
  return new AdapterError("http", `${MSG.generic} (קוד ${status})`, status);
}

/* ---------- pairing ---------- */

const b64uToBytes = (s) => {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b + "=".repeat((4 - (b.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const bytesToB64 = (bytes) => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

/** Accepts the bare base64url string, "pair=..." / "#pair=...", or a whole URL containing #pair=. */
export function decodePairing(input) {
  let s = String(input || "").trim();
  const at = s.indexOf("pair=");
  if (at >= 0) s = s.slice(at + 5);
  s = s.replace(/^#/, "").split(/[&\s]/)[0];
  const bad = () => new AdapterError("bad_pairing", "קוד החיבור לא תקין. העתק אותו שוב מהתוכנה במחשב.");
  if (!s) throw bad();
  let obj;
  try {
    obj = JSON.parse(new TextDecoder().decode(b64uToBytes(s)));
  } catch {
    throw bad();
  }
  const ok = (v) => typeof v === "string" && /^[\w.\-]+$/.test(v);
  if (!obj || !ok(obj.o) || !ok(obj.r) || typeof obj.t !== "string" || obj.t.length < 8 || /\s/.test(obj.t)) throw bad();
  return { o: obj.o, r: obj.r, t: obj.t };
}

export function encodePairing({ o, r, t }) {
  const b64 = bytesToB64(new TextEncoder().encode(JSON.stringify({ o, r, t })));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Read "#pair=..." once, store it and strip it from the address bar. Returns the pairing or null. */
export function consumePairingFromHash(loc, hist, storage) {
  const hash = loc.hash || "";
  if (!hash.includes("pair=")) return null;
  let pair = null;
  try {
    pair = decodePairing(hash);
    storage.setItem(PAIR_KEY, JSON.stringify(pair));
  } catch {
    pair = null;
  }
  hist.replaceState(null, "", loc.pathname + (loc.search || ""));
  return pair;
}

export function loadPairing(storage) {
  try {
    const p = JSON.parse(storage.getItem(PAIR_KEY) || "null");
    return p && p.o && p.r && p.t ? p : null;
  } catch {
    return null;
  }
}

/* ---------- adapter ---------- */

export class GitHubAdapter {
  kind = "github";

  /**
   * @param {{pair?:{o:string,r:string,t:string}, storage?:Storage, fetchImpl?:Function, now?:()=>number, uuid?:()=>string}} opts
   */
  constructor(opts = {}) {
    this.storage = opts.storage || globalThis.localStorage;
    this.fetch = opts.fetchImpl || ((...a) => globalThis.fetch(...a));
    this.now = opts.now || (() => Date.now());
    this.uuid = opts.uuid || (() => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : fallbackUuid()));
    this.pair = opts.pair || loadPairing(this.storage);
    this.imageCache = new Map();
    /** Set when the last JSON read had to be served from the offline cache: {at: ISO} or null. */
    this.stale = null;
  }

  get isPaired() {
    return !!this.pair;
  }
  setPairing(pair) {
    this.pair = pair;
    this.storage.setItem(PAIR_KEY, JSON.stringify(pair));
    this.stale = null;
  }
  clearPairing() {
    this.pair = null;
    this.storage.removeItem(PAIR_KEY);
    this.dropImages();
    for (const k of this._keys(CACHE_PREFIX)) this.storage.removeItem(k);
  }

  /** Build a fetch request (url + init) for a repo path. Exposed for tests. */
  buildRequest(path, { ref = "data", accept = "raw", method = "GET", body, headers } = {}) {
    if (!this.pair) throw new AdapterError("unpaired", MSG.unpaired);
    const { o, r, t } = this.pair;
    const encPath = path.split("/").map(encodeURIComponent).join("/");
    const url = `${API}/repos/${encodeURIComponent(o)}/${encodeURIComponent(r)}/contents/${encPath}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
    const init = {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${t}`,
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: accept === "raw" ? "application/vnd.github.raw" : "application/vnd.github+json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
    };
    if (body !== undefined) init.body = typeof body === "string" ? body : JSON.stringify(body);
    return { url, init };
  }

  async _send(req) {
    let res;
    try {
      res = await this.fetch(req.url, req.init);
    } catch {
      throw new AdapterError("offline", MSG.offline);
    }
    return res;
  }

  async _readText(path, opts) {
    const res = await this._send(this.buildRequest(path, opts));
    if (!res.ok) throw mapHttpError(res.status);
    return res;
  }

  _keys(prefix) {
    const out = [];
    for (let i = 0; i < this.storage.length; i++) {
      const k = this.storage.key(i);
      if (k && k.startsWith(prefix)) out.push(k);
    }
    return out;
  }
  _cacheKey(path) {
    return CACHE_PREFIX + path;
  }
  _cacheGet(path) {
    try {
      return JSON.parse(this.storage.getItem(this._cacheKey(path)) || "null");
    } catch {
      return null;
    }
  }
  _cachePut(path, data) {
    const rec = JSON.stringify({ at: new Date(this.now()).toISOString(), d: data });
    try {
      this.storage.setItem(this._cacheKey(path), rec);
    } catch {
      // Quota: drop history entries first (latest/ matters most offline), then retry once.
      for (const k of this._keys(CACHE_PREFIX + "history/")) this.storage.removeItem(k);
      try {
        this.storage.setItem(this._cacheKey(path), rec);
      } catch {
        /* give up silently */
      }
    }
  }

  /** Read + parse a JSON file from the data branch; falls back to the last good copy when offline / 5xx. */
  async readJson(path) {
    try {
      const res = await this._readText(path, { ref: "data", accept: "raw" });
      const data = JSON.parse(await res.text());
      this._cachePut(path, data);
      this.stale = null;
      return data;
    } catch (e) {
      const transient = e instanceof AdapterError ? e.code === "offline" || (e.code === "http" && e.status >= 500) : false;
      if (transient) {
        const c = this._cacheGet(path);
        if (c) {
          this.stale = { at: c.at };
          return c.d;
        }
      }
      if (e instanceof SyntaxError) throw new AdapterError("http", "הקובץ שהתקבל אינו תקין");
      throw e;
    }
  }

  getStatus() {
    return this.readJson("status.json");
  }
  getIndex() {
    return this.readJson("latest/index.json");
  }
  getCategory(id) {
    return this.readJson(`latest/${id}.json`);
  }
  getCombined() {
    return this.readJson("latest/combined.json");
  }
  getHistoryIndex() {
    return this.readJson("history/index.json");
  }
  getHistoryIndexFor(date) {
    return this.readJson(`history/${date}/index.json`);
  }
  getHistoryCategory(date, id) {
    return this.readJson(`history/${date}/${id}.json`);
  }
  getHistoryCombined(date) {
    return this.readJson(`history/${date}/combined.json`);
  }

  /** Revoke every cached image object URL (called when a new scan lands, and on disconnect). */
  dropImages() {
    this.imageCache.forEach((u) => URL.revokeObjectURL?.(u));
    this.imageCache.clear();
  }

  /**
   * Image bytes -> object URL (the API needs the Authorization header, so <img src> can't be used).
   * Cached per path + version (the category's `scanned_at`): a re-scan rewrites the same path with new bytes,
   * so a new version revokes the old URL of that path and fetches again.
   */
  async getImageUrl(path, version = "") {
    const key = `${path}|${version ?? ""}`;
    if (this.imageCache.has(key)) return this.imageCache.get(key);
    const res = await this._readText(path, { ref: "data", accept: "raw" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    for (const [k, u] of [...this.imageCache]) {
      if (k.startsWith(path + "|")) {
        URL.revokeObjectURL?.(u);
        this.imageCache.delete(k);
      }
    }
    this.imageCache.set(key, url);
    return url;
  }

  /** Write commands/pending.json on the `commands` branch (SPEC §4.7 / §5). */
  async requestScan(ids) {
    const cmd = {
      schema: 1,
      id: this.uuid(),
      action: "scan",
      categories: ids && ids.length ? ids : ["all"],
      requested_at: new Date(this.now()).toISOString(),
      source: "pwa",
    };
    const content = bytesToB64(new TextEncoder().encode(JSON.stringify(cmd, null, 1)));
    for (let attempt = 0; attempt < 2; attempt++) {
      let sha;
      const get = await this._send(this.buildRequest("commands/pending.json", { ref: "commands", accept: "json" }));
      if (get.ok) sha = (await get.json()).sha;
      else if (get.status !== 404) throw mapHttpError(get.status);
      const put = await this._send(
        this.buildRequest("commands/pending.json", {
          ref: null,
          accept: "json",
          method: "PUT",
          body: { message: "scan request", content, branch: "commands", ...(sha ? { sha } : {}) },
        })
      );
      if (put.ok) return { ok: true, id: cmd.id };
      if ((put.status === 409 || put.status === 422) && attempt === 0) continue; // sha moved: refetch once
      throw mapHttpError(put.status);
    }
    throw new AdapterError("http", MSG.generic);
  }

  /** Cheap connectivity/authorization check used by "חבר". */
  async verify() {
    const res = await this._readText("status.json", { ref: "data", accept: "raw" });
    return JSON.parse(await res.text());
  }
}

function fallbackUuid() {
  const r = () => Math.floor(Math.random() * 16).toString(16);
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => (c === "x" ? r() : ((Math.random() * 4) | 8).toString(16)));
}
