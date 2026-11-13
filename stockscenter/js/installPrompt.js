// Phone install of the PWA (SPEC §9): the browser's own install dialog behind our "הורד" button.
// main.js calls initInstallPrompt() before anything else, because Chrome may fire beforeinstallprompt right after load.
// Chrome fires it only once the page is installable AND the user has tapped it and spent some seconds on it, so the
// button falls back to the manual steps (data/install.js installSteps) until then, and switches to one tap when it comes.
import { browserKind } from "./data/install.js";

export const INSTALLED_KEY = "sc.installed"; // appinstalled seen in this browser (hides the home card)
export const HIDE_KEY = "sc.installHide"; // the home card was closed: timestamp, hidden for HIDE_DAYS
export const HIDE_DAYS = 14;

let deferred = null; // the stashed BeforeInstallPromptEvent
let installedNow = false;
const subs = new Set();

function notify() {
  for (const f of [...subs]) {
    try {
      f();
    } catch (e) {
      console.warn("install listener failed", e);
    }
  }
}

export function initInstallPrompt(win = window) {
  if (win.__scInstallInit) return;
  win.__scInstallInit = true;
  win.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // our own "הורד" button instead of the browser's mini bar
    deferred = e;
    notify();
  });
  win.addEventListener("appinstalled", () => {
    deferred = null;
    installedNow = true;
    try {
      win.localStorage.setItem(INSTALLED_KEY, String(Date.now()));
    } catch {
      /* storage may be off */
    }
    notify();
  });
}

/** Subscribe to "the one-tap install became (un)available / the app was installed". Returns the unsubscribe. */
export function onInstallChange(f) {
  subs.add(f);
  return () => subs.delete(f);
}

export function isStandalone(win = window) {
  try {
    if (win.navigator.standalone === true) return true; // iOS home-screen app
    return ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"].some((m) => win.matchMedia(`(display-mode: ${m})`).matches);
  } catch {
    return false;
  }
}

/** {kind, canPrompt, installedNow}: kind is browserKind() of this page. */
export function installState(win = window) {
  const nav = win.navigator || {};
  return { kind: browserKind(nav.userAgent, { standalone: isStandalone(win), touch: (nav.maxTouchPoints || 0) > 1 }), canPrompt: !!deferred, installedNow };
}

/** Show the browser's install dialog. Resolves "accepted" | "dismissed" | "unavailable" (no dialog to show). */
export async function promptInstall() {
  const e = deferred;
  if (!e) return "unavailable";
  deferred = null; // one prompt per event; Chrome sends a new event if the user says no
  try {
    await e.prompt();
    const choice = await e.userChoice;
    return choice && choice.outcome === "accepted" ? "accepted" : "dismissed";
  } catch (err) {
    console.warn("install prompt failed", err);
    return "unavailable";
  } finally {
    notify();
  }
}

/** Best effort: is this app already installed on the phone? (appinstalled here, or Chrome's getInstalledRelatedApps.) */
export async function alreadyInstalled(win = window) {
  if (installedNow) return true;
  try {
    const apps = win.navigator.getInstalledRelatedApps ? await win.navigator.getInstalledRelatedApps() : [];
    return Array.isArray(apps) && apps.some((a) => a && a.platform === "webapp");
  } catch {
    return false;
  }
}

/** The home card: hidden after an install in this browser, or for HIDE_DAYS after the user closed it. */
export function homeCardHidden(storage, now = Date.now()) {
  try {
    if (storage.getItem(INSTALLED_KEY)) return true;
    const t = Number(storage.getItem(HIDE_KEY) || 0);
    return t > 0 && now - t < HIDE_DAYS * 86400000;
  } catch {
    return false;
  }
}
