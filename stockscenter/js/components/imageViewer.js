import { h, icon } from "../dom.js";
import { pushOverlay, registerCloser } from "./overlay.js";

/** Full-screen zoomable screenshot viewer: pinch / wheel / double-tap / drag, Esc or Android back to close. */
export function openImageViewer(src, caption = "") {
  const prevFocus = document.activeElement;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  const MIN = 1;
  const MAX = 6;
  const img = h("img", { class: "viewer__img", src, alt: caption || "צילום מסך של הסורק", draggable: "false" });
  const stage = h("div", { class: "viewer__stage", "data-testid": "viewer-stage" }, img);
  const apply = () => {
    const r = stage.getBoundingClientRect();
    const maxX = Math.max(0, (r.width * scale - r.width) / 2);
    const maxY = Math.max(0, (r.height * scale - r.height) / 2);
    tx = Math.max(-maxX, Math.min(maxX, tx));
    ty = Math.max(-maxY, Math.min(maxY, ty));
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    zoomLabel.textContent = Math.round(scale * 100) + "%";
  };
  const setScale = (s) => {
    scale = Math.max(MIN, Math.min(MAX, s));
    if (scale === 1) tx = ty = 0;
    apply();
  };

  const zoomLabel = h("span", { class: "viewer__zoom num", dir: "ltr" }, "100%");
  let closed = false;
  const hist = pushOverlay(() => close({ fromPop: true }));
  const unregister = registerCloser(() => close({ detach: true }));
  const close = ({ fromPop = false, detach = false } = {}) => {
    if (closed) return;
    closed = true;
    unregister();
    document.removeEventListener("keydown", onKey, true);
    root.classList.remove("is-in");
    setTimeout(() => root.remove(), 180);
    document.body.classList.remove("has-viewer");
    if (detach) hist.detach();
    else if (!fromPop) hist.release();
    if (!detach) prevFocus && prevFocus.focus && prevFocus.focus();
  };
  const closeBtn = h("button", { class: "viewer__btn", type: "button", "aria-label": "סגור", "data-testid": "viewer-close", onClick: () => close() }, icon("close", 22, 2.2));
  const bar = h(
    "div",
    { class: "viewer__bar" },
    closeBtn,
    h("span", { class: "viewer__caption" }, caption),
    h(
      "div",
      { class: "viewer__tools", dir: "ltr" },
      h("button", { class: "viewer__btn", type: "button", "aria-label": "הקטן", onClick: () => setScale(scale / 1.4) }, "−"),
      zoomLabel,
      h("button", { class: "viewer__btn", type: "button", "aria-label": "הגדל", onClick: () => setScale(scale * 1.4) }, "+")
    )
  );
  const root = h("div", { class: "viewer", role: "dialog", "aria-modal": "true", "aria-label": caption || "צילום מסך" }, bar, stage);

  // pointer gestures
  const pts = new Map();
  let startDist = 0;
  let startScale = 1;
  let lastTap = 0;
  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      startDist = Math.hypot(a.x - b.x, a.y - b.y);
      startScale = scale;
    }
    const now = Date.now();
    if (pts.size === 1 && now - lastTap < 280) setScale(scale > 1.2 ? 1 : 2.5);
    if (pts.size === 1) lastTap = now;
  });
  stage.addEventListener("pointermove", (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    if (pts.size === 2) {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...pts.values()];
      setScale((startScale * Math.hypot(a.x - b.x, a.y - b.y)) / (startDist || 1));
    } else if (scale > 1) {
      tx += e.clientX - p.x;
      ty += e.clientY - p.y;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      apply();
    }
  });
  const up = (e) => pts.delete(e.pointerId);
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    setScale(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
  }, { passive: false });
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    } else if (e.key === "+" || e.key === "=") setScale(scale * 1.25);
    else if (e.key === "-") setScale(scale / 1.25);
  };
  document.addEventListener("keydown", onKey, true);
  document.body.append(root);
  document.body.classList.add("has-viewer");
  requestAnimationFrame(() => root.classList.add("is-in"));
  closeBtn.focus();
  return close;
}
