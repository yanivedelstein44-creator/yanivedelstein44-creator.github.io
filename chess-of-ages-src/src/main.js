/**
 * שחמט העידנים: בוני הממלכה — נקודת כניסה.
 */
import '@fontsource/rubik/hebrew-400.css';
import '@fontsource/rubik/hebrew-500.css';
import '@fontsource/rubik/hebrew-700.css';
import '@fontsource/rubik/hebrew-800.css';
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-700.css';
import '@fontsource/rubik/latin-800.css';
import './styles/main.css';
import { GameApp } from './app/GameApp.js';
import { Capacitor } from '@capacitor/core';
import { installResilience, attachApp, showRecovery, logError } from './app/Resilience.js';

// [qa] errors are logged locally and a stuck game offers a Reload (see Resilience.js)
installResilience();

// APK: מאשרים מיד שהגרסה עלתה תקין (אחרת עדכון OTA חוזר אחורה אוטומטית)
if (Capacitor?.isNativePlatform?.()) import('@capgo/capacitor-updater').then(({ CapacitorUpdater }) => CapacitorUpdater.notifyAppReady()).catch(() => {});

function showFatal(err) {
  const sp = document.getElementById('splash');
  const msg = sp?.querySelector('.splash-msg');
  if (msg) msg.textContent = /^(he|iw)\b/i.test(document.documentElement.lang || '') ? 'אירעה שגיאה בטעינה. נסה לרענן את הדף.' : 'Something went wrong while loading. Please refresh the page.';
  // eslint-disable-next-line no-console
  console.error(err);
  logError('boot', err);
  // [qa] a failed start offers Reload (a device without WebGL can't be fixed by reloading, so it gets only the message)
  if (!/WebGL not supported/.test(String(err?.message || err))) showRecovery('boot');
}

try {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) throw new Error('WebGL not supported');
  const app = new GameApp();
  attachApp(app);
  app.start().catch(showFatal);
} catch (err) {
  showFatal(err);
}
