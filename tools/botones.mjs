// Botones del partido en móviles y tabletas (horizontal y vertical): fotos con y sin balón, y comprobación automática
// de que ningún botón se sale de la pantalla ni se solapa con otro botón, el marcador, la pausa, la cámara o las barras.
// Uso: node tools/botones.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/botones'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const SIZES = [['se1', 568, 320], ['iphone8', 667, 375], ['iphone14', 844, 390], ['promax', 932, 430], ['ipad', 1180, 820], ['vertical', 390, 844]];
let bad = 0;
for (const [n, w, h] of SIZES) {
  const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
  p.on('pageerror', e => { console.log('PE', e.message); bad++; });
  await p.goto('http://127.0.0.1:5173/lab/futbol-demo.html?go=match&notuto&quality=low&chars=simple', { timeout: 300000 });
  await p.waitForFunction(() => window.__futbol?.live, null, { timeout: 300000 });
  await p.evaluate(() => window.__futbol.skipIntro());
  await p.waitForFunction(() => window.__futbol.intro <= 0, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  for (const mode of ['atk', 'def']) {
    const res = await p.evaluate((mode) => {
      const H = window.__futbol.hud; window.__futbol.paused = true; H.mode = null; H.setMode(mode); H.bars(0.7, 0.5);
      const vis = (el) => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
      const els = [...document.querySelectorAll('.fb-b')].filter(vis).map(e => ({ n: e.getAttribute('aria-label'), r: e.getBoundingClientRect(), round: true }));
      for (const [sel, nm] of [['.fb-pause', 'pausa'], ['.fb-cam', 'cámara'], ['.fb-score', 'marcador'], ['.fb-bars', 'barras'], ['.fb-stickhint', 'joystick']]) { const e = document.querySelector(sel); if (vis(e)) els.push({ n: nm, r: e.getBoundingClientRect() }); }
      const W = innerWidth, Hh = innerHeight, probs = [];
      for (const a of els) { const r = a.r; if (r.left < 0 || r.top < 0 || r.right > W + 0.5 || r.bottom > Hh + 0.5) probs.push(`${a.n} se sale`); }
      const hit = (a, b) => {
        if (a.round && b.round) { const ca = [(a.r.left + a.r.right) / 2, (a.r.top + a.r.bottom) / 2], cb = [(b.r.left + b.r.right) / 2, (b.r.top + b.r.bottom) / 2]; return Math.hypot(ca[0] - cb[0], ca[1] - cb[1]) < a.r.width / 2 + b.r.width / 2 + 6; }
        return !(a.r.right <= b.r.left || b.r.right <= a.r.left || a.r.bottom <= b.r.top || b.r.bottom <= a.r.top);
      };
      for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) if (hit(els[i], els[j])) probs.push(`${els[i].n} toca ${els[j].n}`);
      // texto que no cabe en su botón
      for (const e of document.querySelectorAll('.fb-b')) { if (!vis(e)) continue; const sp = e.querySelector('span'); if (sp && sp.getBoundingClientRect().width > e.getBoundingClientRect().width - 6) probs.push(`${e.getAttribute('aria-label')}: el nombre no cabe`); }
      return { n: els.length, probs };
    }, mode);
    await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${n}-${mode}.png` });
    console.log(n, w + '×' + h, mode, res.n, 'elementos', res.probs.length ? 'PROBLEMAS: ' + res.probs.join(' · ') : 'sin solapes');
    bad += res.probs.length;
  }
  await p.close();
}
console.log(bad ? `${bad} problemas` : 'Todo correcto');
await b.close();
