// 1.0.12 "התיק שלי": prepare a picked screenshot for Claude. Claude reads at most about 1568 px on the long side (it
// scales larger pictures down itself), so the picture is redrawn as a JPEG of that size: a phone screenshot of a few
// MB becomes a few hundred KB, which uploads fast over GitHub and stays far under Claude's 5 MB limit.
export const MAX_SIDE = 1568;
export const MAX_BYTES = 4.5 * 1024 * 1024;

const readAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error || new Error("read failed"));
    r.readAsDataURL(blob);
  });

function loadImage(blob) {
  if (typeof createImageBitmap === "function") return createImageBitmap(blob);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => (URL.revokeObjectURL(url), resolve(img));
    img.onerror = () => (URL.revokeObjectURL(url), reject(new Error("not an image")));
    img.src = url;
  });
}

/** Longest side ≤ maxSide, keeping the aspect ratio (never enlarged). */
export function fitSize(w, h, maxSide = MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(w, h || 1));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/**
 * File (from <input type=file>) -> {b64, mime, width, height, bytes}. Throws {message_he} for a non-image or a picture
 * that stays too big.
 */
export async function shrinkImage(file, { maxSide = MAX_SIDE, quality = 0.9 } = {}) {
  const bad = (m) => Object.assign(new Error(m), { message_he: m });
  if (!file || !/^image\//.test(file.type || "")) throw bad("הקובץ שנבחר אינו תמונה");
  let img;
  try {
    img = await loadImage(file);
  } catch {
    throw bad("לא הצלחתי לפתוח את התמונה");
  }
  const w = img.width || img.naturalWidth;
  const h = img.height || img.naturalHeight;
  const size = fitSize(w, h, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // a transparent PNG gets a white ground, as on the broker's screen
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.drawImage(img, 0, 0, size.width, size.height);
  img.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw bad("לא הצלחתי להכין את התמונה");
  if (blob.size > MAX_BYTES) throw bad("התמונה גדולה מדי");
  const url = await readAsDataUrl(blob);
  return { b64: url.slice(url.indexOf(",") + 1), mime: "image/jpeg", width: size.width, height: size.height, bytes: blob.size };
}
