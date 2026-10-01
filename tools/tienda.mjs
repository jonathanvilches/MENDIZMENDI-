// Prueba de la tienda: el puesto en la plaza, el interior (producto estrella, comprar, trueque) y una compra.
// Uso: node tools/tienda.mjs [pueblos] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, towns = 'lumbier,tudela', out = 'entrega/tienda'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of towns.split(',')) {
  const p = await b.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, coins: 12, bag: { agua: 0, food: {}, goods: { leche: 2, lana: 1 } } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=mid&weather=clear`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  const info = await p.evaluate(() => { const G = window.__game, T = G.tienda, Th = window.__THREE, gh = window.__hf.groundHeight; if (!T) return null;
    const ox = Math.sin(T.ry), oz = Math.cos(T.ry); G.player.place(T.pos.x + ox * 3, T.pos.z + oz * 3, T.ry + Math.PI); G.follow.snap(G.player);
    const pos = new Th.Vector3(T.pos.x + ox * 6 + oz * 2, T.y + 2.6, T.pos.z + oz * 6 - ox * 2), look = new Th.Vector3(T.pos.x, T.y + 1.2, T.pos.z);
    G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; return { star: T.star.name, keeper: T.keeper.name }; });
  console.log(town, JSON.stringify(info));
  await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/${town}-puesto.png` });
  await p.evaluate(() => { window.__game.follow.cinematic = null; window.__game.tienda.open(); });
  await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${town}-estrella.png` });
  await p.evaluate(() => document.querySelector('[data-tab="trade"]').click()); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('[data-sell]')?.click()); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${town}-trueque.png` });
  await p.evaluate(() => document.querySelector('.shop-item[data-buy]:not([disabled])')?.click()); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${town}-compra.png` });
  console.log('perfil', await p.evaluate(() => JSON.stringify({ coins: window.__game.P.coins, bag: window.__game.P.bag })));
  await p.evaluate(() => document.querySelector('[data-close]').click()); await p.waitForTimeout(300);
  console.log('modo', await p.evaluate(() => window.__game.mode), 'errores', JSON.stringify(errs));
  await p.close();
}
await b.close();
