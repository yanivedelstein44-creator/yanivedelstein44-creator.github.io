/** Web Worker של ה-AI — החישוב רץ ברקע כדי שהמגע לעולם לא יקפא */
import { think, analyze } from './engine.js';

self.onmessage = (e) => {
  const { id, type, payload } = e.data || {};
  try {
    const result = type === 'analyze' ? analyze(payload) : think(payload);
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message ? err.message : err) });
  }
};
