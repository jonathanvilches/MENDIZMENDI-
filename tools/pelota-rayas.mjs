// Foto de la cancha en un partido, para ver las rayas del suelo de cerca y de lejos (móvil tumbado, calidad baja).
// Uso: node tools/pelota-rayas.mjs [pueblo] [salida.png] [ancho] [alto] [calidad]
import { chromium } from 'playwright-core';
const [,, town = 'lumbier', out = 'rayas.png', W = '844', H = '390', q = 'low'] = process.argv;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const movil = +W < 1000;
const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: movil, hasTouch: movil, deviceScaleFactor: movil ? 3 : 1 }); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=${q}&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
await p.waitForFunction(() => ['serveWait', 'servePrep', 'rally'].includes(window.__game.pelotaMatch?.game?.phase), null, { timeout: 240000 });
await p.waitForTimeout(2500);
await p.screenshot({ path: out });
// (y unos tantos en piloto automático, con el motor solo, sin dibujar: para ver que se juega sin errores con la carga nueva)
if (process.env.JUEGA) {
  console.log(JSON.stringify(await p.evaluate((seg) => {
    const M = window.__game.pelotaMatch, g = M.game, golpes = [], tantos = []; g.autoplay = true; let err = null, paradas = 0, estelas = new Set();
    const em = g.emit.bind(g); let ev = []; g.emit = (e) => { ev.push(e); em(e); };
    for (let i = 0; i < seg * 30; i++) { ev = []; try { M.update(1 / 30); } catch (e) { err = e.message + ' ' + (e.stack || '').split('\n')[1]; break; } if (M.parada > 0) paradas++; estelas.add(+(M.court.trailMat?.opacity ?? -1).toFixed(2));
      for (const e of ev) { if (e.type === 'hit') golpes.push([e.who === 'you' ? 'tú' : 'rival', +(e.pow ?? 0).toFixed(2), Math.round((e.vel ?? 0) * 3.6), e.shot]); if (e.type === 'point') tantos.push(e.winner || e.who); } }
    return { err, marcador: g.score, golpes: golpes.length, paradas, estelas: [...estelas].slice(0, 12), muestra: golpes.slice(0, 10) };
  }, +process.env.JUEGA)));
}
console.log(errs.length ? errs.slice(0, 3) : 'sin errores'); await b.close();
