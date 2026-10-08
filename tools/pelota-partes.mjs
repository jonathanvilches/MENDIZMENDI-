// Pelota en el navegador: las partes del frontón. Desde la presentación del partido, el botón «Partes del frontón» lleva
// la cámara a cada parte (frontis, chapa, pared izquierda, cancha, falta, pasa, contracancha y rebote), resaltada y con su
// ficha. También mira el rebote: la pared alta del fondo, que se ve a través cuando la cámara queda detrás.
// Uso: node tools/pelota-partes.mjs [pueblo] [carpeta] [es|eu]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'elizondo', out = 'entrega/pelota-partes', lang = 'es'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript((lang) => { localStorage.setItem('mendimendiz-lang', lang); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); }, lang);
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(2000);
const click = async (sel, ms = 120000) => { await p.waitForSelector(sel, { timeout: ms }); await p.evaluate((s) => document.querySelector(s).click(), sel); };
// el frontón visto desde el pueblo, con su rebote
await p.evaluate(() => { const G = window.__game, F = G.fronton, e = F.toWorld(14, 44), c = F.toWorld(0, 14); G.player.place(e.x, e.z, Math.atan2(c.x - e.x, c.z - e.z)); G.follow.snap(G.player); });
await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${lang}-desde-el-pueblo.png` });
await p.evaluate(() => { const G = window.__game, a = G.pelotari; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); window.__fp = G.talk(a); });
for (let i = 0; i < 12; i++) { await p.waitForTimeout(800); const d = await p.evaluate(() => window.__game.ui.dialogOpen); if (!d) break; await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); }
await click('[data-a="libre"]');
await click('.pel-panel [data-pel-tour]', 240000);
const res = [];
for (let i = 0; i < 8; i++) {
  // (la cámara llega a su sitio: se avanza a mano, el navegador sin tarjeta gráfica pinta muy despacio)
  res.push(await p.evaluate(() => { const m = window.__game.pelotaMatch; for (let k = 0; k < 90; k++) m.update(1 / 30);
    const el = document.querySelector('.pel-tour'), r = el.getBoundingClientRect(); return { ficha: el.querySelector('b').textContent, dentro: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, resaltada: m.tourHi.filter(x => x.visible).length, rebote: +m.court.rebFade.toFixed(2) }; }));
  await p.screenshot({ path: `${out}/${lang}-parte-${i + 1}.png` });
  if (i < 7) await click('.pel-tour [data-t="next"]');
}
await click('.pel-tour [data-t="end"]');
const back = await p.evaluate(() => !!document.querySelector('.pel-panel [data-pel-go]') && !document.querySelector('.pel-tour'));
// jugando al fondo: la cámara detrás del rebote, que se ve a través
await click('.pel-panel [data-pel-go]');
const deep = await p.evaluate(() => { const m = window.__game.pelotaMatch, g = m.game; g.autoplay = true; g.players.you.z = 30; for (let k = 0; k < 60; k++) { g.players.you.z = 30; m.update(1 / 30); } return { rebote: +m.court.rebFade.toFixed(2) }; });
await p.screenshot({ path: `${out}/${lang}-jugando-al-fondo.png` });
console.log(JSON.stringify({ res, vuelveAlPanel: back, deep }), errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
