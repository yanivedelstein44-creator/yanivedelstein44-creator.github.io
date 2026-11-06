/**
 * כרטיס שיתוף של הממלכה: צילום הסצנה + לוגו מוזהב + האי ומספר הכיבושים → Web Share / שמירה / וואטסאפ.
 */
import { h } from './UI.js';
import { t, tn } from './i18n.js';
import { PUBLIC_URL } from '../config/AppConfig.js';
import { drawIcon } from './icons.js';

export async function makeShareCard(app) {
  const src = app.sm.renderer.domElement;
  app.sm.renderer.render(app.sm.scene, app.sm.camera);
  const shot = new Image();
  shot.src = src.toDataURL('image/jpeg', 0.92);
  await new Promise((r) => { shot.onload = r; shot.onerror = r; });
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b0912'; ctx.fillRect(0, 0, W, H);
  const scale = Math.max(W / shot.width, (H - 300) / shot.height);
  const sw = shot.width * scale, sh = shot.height * scale;
  ctx.drawImage(shot, (W - sw) / 2, 150 + (H - 300 - sh) / 2, sw, sh);
  const g1 = ctx.createLinearGradient(0, 0, 0, 330); g1.addColorStop(0, 'rgba(11,9,18,1)'); g1.addColorStop(1, 'rgba(11,9,18,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, 330);
  const g2 = ctx.createLinearGradient(0, H - 380, 0, H); g2.addColorStop(0, 'rgba(11,9,18,0)'); g2.addColorStop(1, 'rgba(11,9,18,1)');
  ctx.fillStyle = g2; ctx.fillRect(0, H - 380, W, 380);
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  const gold = ctx.createLinearGradient(0, 40, 0, 150); gold.addColorStop(0, '#fff6d6'); gold.addColorStop(0.45, '#f2c94c'); gold.addColorStop(0.65, '#b8862a'); gold.addColorStop(1, '#ffe7a3');
  ctx.font = '800 96px Rubik, Arial, sans-serif';
  ctx.shadowColor = '#4a2a0a'; ctx.shadowOffsetY = 5;
  ctx.fillStyle = gold; ctx.fillText(t('appTitle'), W / 2, 130);
  ctx.shadowOffsetY = 0;
  ctx.font = '600 30px Rubik, Arial, sans-serif'; ctx.fillStyle = '#ffe7a3';
  ctx.fillText('C H E S S   O F   A G E S', W / 2, 180);
  const era = app.kingdom.eraId;
  const e = app.eraDef(era);
  ctx.font = '800 54px Rubik, Arial, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText(`${t('island')} ${app.islandId} · ${tn(e.name, e.en)}`, W / 2, H - 190);
  ctx.font = '500 36px Rubik, Arial, sans-serif'; ctx.fillStyle = '#cfc6dc';
  const stats = `${app.store.get('profile').name} · ${app.progression.conqueredCount()}/99 ${t('conquered')} · ${app.progression.totalStars()}`;
  ctx.fillText(stats, W / 2, H - 125);
  const stw = ctx.measureText(stats).width;
  drawIcon(ctx, 'star', W / 2 + stw / 2 + 28, H - 137, 40);
  ctx.font = '600 32px Rubik, Arial, sans-serif'; ctx.fillStyle = '#f2c94c';
  const tag = tn('בוא לשחק נגדי בממלכה שלי!', 'Come play me in my kingdom!');
  ctx.fillText(tag, W / 2, H - 65);
  const tw = ctx.measureText(tag).width;
  drawIcon(ctx, 'crown', W / 2 - tw / 2 - 34, H - 76, 44);
  drawIcon(ctx, 'crown', W / 2 + tw / 2 + 34, H - 76, 44);
  return new Promise((r) => c.toBlob((b) => r({ blob: b, url: c.toDataURL('image/jpeg', 0.9) }), 'image/jpeg', 0.9));
}

export async function shareKingdom(app) {
  const { blob, url } = await makeShareCard(app);
  const text = `${t('shareText')} ${PUBLIC_URL || ''}`.trim();
  try {
    const file = new File([blob], 'chess-of-ages-kingdom.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text, title: t('appSubtitle') });
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }
  const img = h('img', { src: url, alt: t('share'), style: { width: '100%', borderRadius: '14px', userSelect: 'auto', WebkitUserSelect: 'auto' } });
  app.ui.modal({
    title: t('share'), titleIcon: 'camera',
    body: h('div', {}, img, h('p', {}, tn('לחיצה ארוכה על התמונה כדי לשמור', 'Long-press the image to save'))),
    actions: [
      { label: t('saveImage'), icon: 'download', onClick: () => { const a = document.createElement('a'); a.href = url; a.download = 'chess-of-ages-kingdom.jpg'; a.click(); } },
      { label: 'WhatsApp', icon: 'chat', cls: 'whatsapp', onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener') },
    ],
  });
}
