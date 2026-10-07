// Pelota: un golpe al aire (pulsar sin la pelota a tu alcance) y un golpe de verdad hacen el gesto una sola vez; antes,
// tras un golpe al aire el pelotari repetía el gesto cada 0,4 s sin parar. Uso: node tools/pelota-golpe-repite.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
await p.goto('http://127.0.0.1:5173/?town=lumbier&q=low&weather=clear&skipintro=1&noflora', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
await p.waitForFunction(() => window.__game.pelotaMatch?.game.phase === 'serveWait', null, { timeout: 120000 });
const r = await p.evaluate(() => {
  const G = window.__game, M = G.pelotaMatch, g = M.game, rig = G.pelotaRig; let n = 0; const da = rig.doAct.bind(rig); rig.doAct = (...a) => { if (a[0] === 'hit') n++; return da(...a); };
  // golpe al aire: en pleno peloteo, la pelota lejos
  g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: false, bounces: 0, hits: 1 }; g.players.you.x = 2; g.players.you.z = 22; g.players.rival.z = 10;
  g.ball.set({ x: 0, y: 3, z: 25 }, { x: 0, y: 0, z: -20 }); g.pred = null;
  M.chargeStart('hit'); M.update(1 / 30); M.chargeEnd('hit');
  for (let i = 0; i < 150; i++) { g.players.rival.cool = 9; g.ball.set({ x: 0, y: 3, z: 25 }, { x: 0, y: 0, z: -20 }); M.update(1 / 30); }
  return { gestosAlAire: n, act: g.players.you.act };
});
console.log(JSON.stringify(r), r.gestosAlAire === 1 && r.act !== 'swing' ? 'OK: un solo gesto' : 'FALLO: el gesto se repite', errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
