/**
 * מדריך אינטראקטיבי למתחילים: 6 שלבים, שניים מהם ממתינים לפעולה אמיתית על הלוח.
 */
import { h } from './UI.js';
import { t } from './i18n.js';

export class Tutorial {
  constructor(app) {
    this.app = app;
    this.step = -1;
    this.el = null;
  }

  start() {
    this.step = 0;
    this.show();
  }

  show() {
    this.el?.remove();
    const steps = ['tut1', 'tut2', 'tut3', 'tut4', 'tut5', 'tut6'];
    if (this.step >= steps.length) { this.finish(); return; }
    const waits = this.step === 1 || this.step === 2;
    const last = this.step === steps.length - 1;
    const pos = this.step >= 1 && this.step <= 3 ? { top: 'calc(var(--safe-top) + 175px)' } : { top: '38%' };
    this.el = h('div', { class: 'tut glass', role: 'dialog', 'aria-label': t('tutorial'), 'aria-live': 'polite', style: pos },
      h('p', {}, t(steps[this.step])),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn small ghost', onclick: () => this.finish() }, t('skip')),
        waits ? null : h('button', { class: 'btn small primary', onclick: () => { this.step++; this.show(); } }, last ? t('finish') : t('nextStep'))));
    document.getElementById('app').appendChild(this.el);
    if (this.step === 1) this.app.board.setCursor(null);
  }

  onSelect() { if (this.step === 1) { this.step = 2; this.show(); } }
  onMove() { if (this.step === 2 || this.step === 1) { this.step = 3; this.show(); } }

  finish() {
    this.el?.remove();
    this.el = null;
    this.step = -1;
    this.app.store.set({ seenTutorial: true });
  }

  get active() { return this.step >= 0; }
}
