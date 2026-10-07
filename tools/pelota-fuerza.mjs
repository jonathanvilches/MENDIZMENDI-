// Pelota en el navegador: la fuerza se ve. Con el golpe y la cortada mantenidos poco, medio y casi a tope, la barra de
// carga sube y la marca de la cancha (dónde botará) se aleja. Capturas. Uso: node tools/pelota-fuerza.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/pelota-fuerza'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
await p.waitForFunction(() => window.__game.pelotaMatch?.game.phase === 'serveWait', null, { timeout: 120000 });
const res = {};
for (const [k, sx, sy, n, kind] of [['golpe-flojo', 0.3, 0, 3, 'hit'], ['golpe-medio', 0.3, 0, 10, 'hit'], ['golpe-tope', 0.3, 0, 19, 'hit'], ['cortada-floja', 0, 0, 3, 'cut'], ['cortada-tope', 0, 0, 19, 'cut']]) {
  res[k] = await p.evaluate(([sx, sy, n, kind]) => { const M = window.__game.pelotaMatch, g = M.game;
    g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 0, hits: 1 }; g.players.you.x = 1; g.players.you.z = 21; g.players.rival.z = 12;
    g.ball.set({ x: 0.5, y: 2.5, z: 1 }, { x: 0.1, y: 6, z: 17 }); g.pred = null; g._pv = null;
    M.input.charge = null; M.chargeStart(kind); M.input.stick.x = sx; M.input.stick.y = sy;
    for (let i = 0; i < n; i++) { g.players.rival.cool = 9; M.update(1 / 30); }
    const C = M.court; return { carga: +M.chargeLevel().toFixed(2), bote: C.aimLand.visible && +C.aimLand.position.z.toFixed(1), marca: C.aimMark?.visible ? +C.aimMark.position.y.toFixed(2) : null };
  }, [sx, sy, n, kind]);
  await p.screenshot({ path: `${out}/${k}.png` });
}
await p.evaluate(() => { const M = window.__game.pelotaMatch; M.input.charge = null; M.input.stick.x = M.input.stick.y = 0; });
console.log(JSON.stringify(res), errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
