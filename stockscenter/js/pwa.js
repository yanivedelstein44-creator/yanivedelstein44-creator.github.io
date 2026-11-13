// Service-worker registration and the "updated to X" flow (SPEC §9 PWA).
import { app, isScanning } from "./state.js";
import { toast } from "./components/toast.js";

const FLAG = "sc.updated";

export const swSupported = () => "serviceWorker" in navigator && /^https?:$/.test(location.protocol);

/** Show the toast left by the reload that applied an update. */
export function announceUpdateIfAny() {
  try {
    const v = sessionStorage.getItem(FLAG);
    if (v) {
      sessionStorage.removeItem(FLAG);
      toast(`עודכן ל-${v}`);
    }
  } catch {
    /* ignore */
  }
}

const idle = () => !isScanning() && !document.body.classList.contains("has-viewer") && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");

let registration = null;

export async function registerServiceWorker() {
  if (!swSupported() || app.mode.demo || app.mode.desktop || app.mode.shell === "desktop") return null;
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type !== "sw-version" || !e.data.requested) return;
    const v = e.data.version;
    const tryReload = () => {
      if (!idle()) return setTimeout(tryReload, 2000);
      try {
        sessionStorage.setItem(FLAG, v);
      } catch {
        /* ignore */
      }
      location.reload();
    };
    tryReload();
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) {
      hadController = true; // first install claiming the page: nothing to reload
      return;
    }
    navigator.serviceWorker.controller?.postMessage({ type: "get-version" });
  });
  try {
    registration = await navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" });
    registration.update().catch(() => {});
    document.addEventListener("visibilitychange", () => !document.hidden && registration.update().catch(() => {}));
  } catch (e) {
    console.warn("sw register failed", e);
  }
  return registration;
}

/** "בדוק עדכונים" in the PWA. Resolves true when a new worker was found (the page then reloads by itself). */
export async function checkForUpdatesNow() {
  if (!registration) return false;
  await registration.update();
  await new Promise((r) => setTimeout(r, 1200));
  return !!(registration.installing || registration.waiting);
}
