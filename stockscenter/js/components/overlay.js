// History entries for overlays (bottom sheet, drawer, screenshot viewer), so Android's back button closes the overlay
// instead of leaving the screen. Each open overlay owns one history entry (same URL, state {scOverlay: id}).

const stack = []; // [{id, onPop}]
let seq = 0;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", (e) => {
    const top = stack[stack.length - 1];
    if (!top) return;
    if (e.state && e.state.scOverlay === top.id) return; // landed ON the overlay's entry (forward): nothing to close
    stack.pop();
    top.onPop();
  });
}

/**
 * Push a history entry for an overlay. onPop runs when the user goes back while it is open.
 * @returns {{release(): Promise<void>, detach(): void, retarget(fn): void}}
 *   release(): the overlay closed by itself -> drop its entry (history.back) and resolve once that happened;
 *   detach(): forget it without touching history (the route changed anyway);
 *   retarget(fn): hand the same entry to the next overlay (a sheet that replaces another one).
 */
export function pushOverlay(onPop) {
  const entry = { id: `o${++seq}-${Date.now().toString(36)}`, onPop };
  try {
    history.pushState({ ...(history.state && typeof history.state === "object" ? history.state : {}), scOverlay: entry.id }, "");
  } catch {
    /* ignore: the overlay still works, only Android back won't close it */
  }
  stack.push(entry);
  return {
    retarget(fn) {
      entry.onPop = fn;
    },
    detach() {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
    },
    release() {
      const i = stack.indexOf(entry);
      if (i < 0) return Promise.resolve();
      stack.splice(i, 1);
      if (!(history.state && history.state.scOverlay === entry.id)) return Promise.resolve();
      return new Promise((resolve) => {
        let done = false;
        const fin = () => {
          if (done) return;
          done = true;
          window.removeEventListener("popstate", fin);
          resolve();
        };
        window.addEventListener("popstate", fin);
        setTimeout(fin, 500);
        history.back();
      });
    },
  };
}

/** Overlays register a closer here so a route change can close them all without touching history. */
const closers = new Set();
export const registerCloser = (fn) => (closers.add(fn), () => closers.delete(fn));
export const closeAllOverlays = () => [...closers].forEach((fn) => fn());
