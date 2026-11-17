// Los highlights del final del partido: un partido corto jugado solo (los dos pelotaris con la máquina), y al acabar,
// los tres mejores tantos repetidos con su rótulo, el toque que pasa al siguiente y el panel del final con «Ver highlights».
// Uso: node tools/pelota-highlights.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/pelota-highlights'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); window.__hl = true; });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click()); await p.waitForTimeout(2500);
// a 3 tantos y los dos con la máquina; cada tanto se da por ganado cuando lleva unos segundos de peloteo grabados
// (con el navegador de pruebas el juego va a cámara lenta y un partido entero tardaría demasiado)
await p.evaluate(() => { const M = window.__game.pelotaMatch, g = M.game; g.autoplay = true; g.target = 3; let n = 0;
  const u = g.update.bind(g); g.update = (dt, inp) => { u(dt, inp);
    if (g.phase === 'rally' && (M.rec?.length || 0) > 70 && g.phaseT > 1.5) { n++; g.point(n === 2 ? 'rival' : 'you', 'tanto'); }
    return g.events; }; });
const t0 = Date.now(); let n = 0;
while (Date.now() - t0 < 900000) {
  const s = await p.evaluate(() => { const M = window.__game.pelotaMatch, g = M?.game; return g ? { f: g.phase, sc: `${g.score.you}-${g.score.rival}`, hl: (M.hl || []).length, cola: M.hlCola ? M.hlCola.length : -1, rep: !!M.replay, rot: !!document.querySelector('.pel-hlts'), panel: !!document.querySelector('.pel-panel [data-pel-hl]') } : null; });
  if (n++ % 6 === 0) console.log(Math.round((Date.now() - t0) / 1000) + ' s', JSON.stringify(s));
  // (cada highlight: una foto del rótulo grande y otra de la repetición, y un toque para pasar al siguiente: en el navegador de
  // pruebas cada repetición tarda más de un minuto)
  if (s?.rep && !(await p.evaluate((c) => (window.__vistos ||= {})[c], s.cola))) {
    await p.screenshot({ path: `${out}/highlight-${3 - s.cola}-rotulo.png` }); await p.waitForTimeout(2600); await p.screenshot({ path: `${out}/highlight-${3 - s.cola}-repe.png` });
    await p.evaluate((c) => { window.__vistos[c] = 1; }, s.cola); await p.mouse.click(420, 200); console.log('toque: pasa al siguiente', s.cola); await p.waitForTimeout(800); continue; }
  if (s?.panel) break;
  await p.waitForTimeout(1500);
}
await p.waitForTimeout(800); await p.screenshot({ path: `${out}/panel-final.png` });
console.log(JSON.stringify(await p.evaluate(() => ({ boton: document.querySelector('[data-pel-hl]')?.textContent, hl: window.__game.pelotaMatch.hlTodos?.map(h => ({ nota: +h.nota.toFixed(1), nm: h.nm, quien: h.quien, m: h.marcador })) }))));
console.log(errs.length ? errs.slice(0, 3) : 'sin errores'); await b.close();
