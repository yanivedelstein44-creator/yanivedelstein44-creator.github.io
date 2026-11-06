/**
 * Vite config — שחמט העידנים.
 * תוסף build מותאם: מייצר Service Worker עם רשימת precache ומזהה בנייה ייחודי,
 * version.json לבדיקת עדכונים, וחבילת zip לעדכון OTA של אפליקציית ה-APK.
 */
import { defineConfig, loadEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import crypto from 'node:crypto';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const BUILD_TIME = Date.now();
const BUILD_ID = `${pkg.version}-${BUILD_TIME}`;

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}

function chessOfAgesBuild(env) {
  let outDir;
  return {
    name: 'chess-of-ages-pwa-updates',
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    transformIndexHtml(html) {
      const pub = (env.VITE_PUBLIC_URL || '').replace(/\/?$/, '/');
      return html
        .replace(/%PUBLIC_URL%/g, env.VITE_PUBLIC_URL ? pub : './')
        .replace(/%APP_VERSION%/g, pkg.version);
    },
    closeBundle() {
      if (!outDir || !fs.existsSync(outDir)) return;
      const skip = (f) => f === 'sw.js' || f === 'version.json' || f.startsWith('update/') || f.endsWith('.map') || f === '_headers';
      const files = walk(outDir).filter((f) => !skip(f));
      const precache = ['./', ...files.map((f) => `./${f}`)];
      const tpl = fs.readFileSync(path.resolve('src/sw-template.js'), 'utf8');
      fs.writeFileSync(path.join(outDir, 'sw.js'), tpl.replace('__BUILD_ID__', BUILD_ID).replace('__PRECACHE__', JSON.stringify(precache, null, 0)));
      // חבילת OTA ל-Capacitor (index.html בשורש ה-zip)
      const zipFiles = {};
      for (const f of walk(outDir)) if (!f.startsWith('update/')) zipFiles[f] = new Uint8Array(fs.readFileSync(path.join(outDir, f)));
      fs.mkdirSync(path.join(outDir, 'update'), { recursive: true });
      const bundleName = `update/bundle-${BUILD_ID}.zip`;
      const zipBytes = zipSync(zipFiles, { level: 6 });
      fs.writeFileSync(path.join(outDir, bundleName), zipBytes);
      // SHA-256 של ה-zip — חובה ב-@capgo/capacitor-updater 8.x (בלעדיו ההורדה נדחית)
      const checksum = crypto.createHash('sha256').update(zipBytes).digest('hex');
      const info = {
        name: 'Chess of Ages: Island Realms',
        version: pkg.version,
        build: BUILD_ID,
        buildTime: BUILD_TIME,
        date: new Date(BUILD_TIME).toISOString(),
        minNative: env.MIN_NATIVE || (pkg.palace && pkg.palace.minNativeVersion) || '1.0.0',
        bundle: bundleName,
        checksum,
        apk: env.VITE_APK_URL || '',
        notes: env.RELEASE_NOTES || '',
      };
      fs.writeFileSync(path.join(outDir, 'version.json'), JSON.stringify(info, null, 2));
      // eslint-disable-next-line no-console
      console.log(`\n✔ PWA: sw.js (${precache.length} files) · version.json · ${bundleName}\n`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_ID__: JSON.stringify(BUILD_ID),
      __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    },
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 2500,
      assetsInlineLimit: 0,
      sourcemap: false,
    },
    worker: { format: 'es' },
    server: { host: true },
    plugins: [chessOfAgesBuild(env)],
  };
});
