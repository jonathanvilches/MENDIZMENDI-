// Prueba del avatar GLB (Beñat): selector de personajes, portada y partida en un pueblo, con capturas.
// Uso: node tools/benat-test.mjs [url base] [pueblo]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, base = 'http://127.0.0.1:5173/', town = 'lesaka'] = process.argv;
const out = 'entrega/chars/juego'; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
async function page(w, h) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text().slice(0, 200)); });
  await p.addInitScript(() => localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', avatar: 'benat' })));
  return p;
}
const only = process.env.ONLY;
if (!only || only === 'hub') {
  for (const [w, h, tag] of [[1280, 720, 'escritorio'], [390, 844, 'movil']]) {
    const p = await page(w, h);
    await p.goto(base + '?screen=avatars', { timeout: 300000 });
    await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
    await p.waitForTimeout(12000);
    await p.screenshot({ path: `${out}/selector-${tag}.png` });
    await p.goto(base + '?screen=home', { timeout: 300000 });
    await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
    await p.waitForTimeout(12000);
    await p.screenshot({ path: `${out}/portada-${tag}.png` });
    await p.close();
    console.log('hub', tag);
  }
}
if (!only || only === 'game') {
  const p = await page(960, 540);
  await p.goto(base + '?town=' + town, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
  const info = await p.evaluate(() => {
    const r = window.__game.player.rig;
    return { tipo: r.constructor.name, clips: r.char?.clips, altura: new (r.obj.constructor)().constructor.name && null };
  });
  console.log(JSON.stringify(info));
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${out}/juego-quieto.png` });
  // anda y corre hacia delante (simula la tecla W y mayúsculas)
  await p.keyboard.down('KeyW'); await p.waitForTimeout(4000);
  await p.screenshot({ path: `${out}/juego-andando.png` });
  console.log('clip', await p.evaluate(() => window.__game.player.rig.char?.currentName));
  await p.keyboard.down('ShiftLeft'); await p.waitForTimeout(4000);
  await p.screenshot({ path: `${out}/juego-corriendo.png` });
  console.log('clip', await p.evaluate(() => window.__game.player.rig.char?.currentName));
  await p.keyboard.up('ShiftLeft'); await p.keyboard.up('KeyW');
  await p.keyboard.press('Space'); await p.waitForTimeout(400);
  console.log('clip salto', await p.evaluate(() => window.__game.player.rig.char?.currentName));
  await p.evaluate(() => window.__game.player.rig.doCheer()); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/juego-celebra.png` });
  console.log('clip', await p.evaluate(() => window.__game.player.rig.char?.currentName));
  const perf = await p.evaluate(() => { const r = window.__game.rt?.renderer || window.__game.renderer; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles } : null; });
  console.log('render', JSON.stringify(perf));
  await p.close();
}
console.log([...new Set(errs)].slice(0, 20).join('\n'));
await browser.close();
