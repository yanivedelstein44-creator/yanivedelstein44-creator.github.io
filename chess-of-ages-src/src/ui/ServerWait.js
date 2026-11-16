/**
 * "השרת מלא" — כשיש אינטרנט אבל שרת האונליין לא עונה (בתוכנית החינמית של Firebase: עד 100 חיבורים בו-זמנית).
 * במקום הודעת שגיאה: חלון "ברגע שיתפנה מקום תיכנס", ו-Firebase ממשיך לנסות להתחבר ברקע. ברגע שיש חיבור
 * (‎.info/connected) — הפעולה (משחק מהיר, פתיחת חדר, הצטרפות) רצה שוב לבד. השחקן יכול לבטל בכל רגע.
 */
import { h } from './UI.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { getBackend } from '../net/backend.js';

/** הפעולה נכשלה כי השרת לא ענה בזמן — ויש אינטרנט (כלומר כנראה השרת מלא) */
export const isServerBusy = (e) => e?.code === 'timeout' && navigator.onLine !== false;

/** מחכה עד שיש חיבור לשרת. true = אפשר לנסות שוב, false = השחקן ביטל */
export function waitForServer(app) {
  return new Promise((resolve) => {
    let done = false, un = null, timer = null;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try { un?.(); } catch { /* */ }
      clearInterval(timer);
      if (ok) m.close();
      resolve(ok);
    };
    const m = app.ui.modal({
      title: t('serverFullTitle'), titleIcon: 'globe', center: true, className: 'waiting-modal server-wait',
      body: h('div', { class: 'waiting' },
        h('div', { class: 'hero-ic pulse', 'aria-hidden': 'true' }, icon('globe', { size: 50 })),
        h('p', { role: 'status' }, t('serverFullBody')),
        h('p', { class: 'muted small' }, t('serverFullTip'))),
      actions: [{ label: t('cancelRoom'), icon: 'close', onClick: (c) => c.close() }],
      onClose: () => finish(false),
    });
    const listen = async () => {
      try {
        const be = await getBackend();
        if (done || un) return;
        // רגע אחרי שהחיבור חוזר — כדי שהבקשות שחיכו בתור יגיעו לשרת לפני שמנסים שוב
        un = be.onConnection((ok) => { if (ok) setTimeout(() => finish(true), 800); });
      } catch { /* גם ההתחברות לא עברה — ננסה שוב עוד מעט */ }
    };
    listen();
    timer = setInterval(() => { if (!un && !done) listen(); }, 15000);
  });
}

/** מריץ פעולה אונליין; אם השרת מלא — מחכה שיתפנה מקום ומנסה שוב, עד שזה מצליח או שהשחקן מבטל ('cancel') */
export async function withServerWait(app, fn) {
  for (let i = 0; i < 30; i++) {
    try { return await fn(); } catch (e) {
      if (!isServerBusy(e)) throw e;
      if (!(await waitForServer(app))) throw Object.assign(new Error('cancel'), { code: 'cancel' });
    }
  }
  throw Object.assign(new Error('timeout'), { code: 'timeout' });
}
