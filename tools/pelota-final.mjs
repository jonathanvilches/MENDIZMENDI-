// El último tanto de un partido de pelota: «tanto de partido» antes de sacar, y al decidirse, el rótulo dorado, la
// ovación y la grada en pie más rato antes del final. Uso: node tools/pelota-final.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/pelota-final'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click()); await p.waitForTimeout(2500);
// 4 a 3: el siguiente tanto es de partido
const ev = await p.evaluate(() => { const M = window.__game.pelotaMatch, g = M.game, seen = []; const em = g.emit.bind(g); g.emit = (e) => { seen.push(e.type + (e.matchPoint ? ':matchPoint' : '') + (e.final ? ':final' : '')); em(e); }; window.__seen = seen;
  g.score.you = g.target - 1; g.score.rival = g.target - 2; g.phase = 'point'; g.phaseT = 5; return g.target; });
await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/tanto-de-partido.png` });
await p.evaluate(() => { const g = window.__game.pelotaMatch.game, u = g.update.bind(g); g.update = (dt, inp) => { u(dt, inp); if (!window.__pt) { window.__pt = 1; g.point('you', 'tanto'); } return g.events; }; });
await p.waitForSelector('.pel-root.final .pel-call.on', { timeout: 60000 }); await p.waitForTimeout(600); await p.screenshot({ path: `${out}/ultimo-tanto.png` });
const mid = await p.evaluate(() => window.__game.pelotaMatch.game.phase);
for (let i = 0; i < 6; i++) { await p.waitForTimeout(5000); console.log(await p.evaluate(() => { const g = window.__game.pelotaMatch?.game; return g ? g.phase + ' ' + g.phaseT.toFixed(2) + ' final=' + g.finalPoint : 'sin partido'; })); }
let tp = 0; await p.waitForFunction(() => { const g = window.__game.pelotaMatch?.game; if (g?.phase === 'point') window.__tp = g.phaseT; return !g || g.phase === 'end'; }, null, { timeout: 120000, polling: 50 }); tp = await p.evaluate(() => window.__tp);
console.log('el último tanto dura', tp.toFixed(1), 's de juego antes del final');
const fin = await p.evaluate(() => ({ fase: window.__game.pelotaMatch?.game.phase, panel: !!document.querySelector('.pel-panel'), eventos: window.__seen.filter(e => !/floor|wall|front|hit/.test(e)) }));
console.log('a', ev, 'tantos · a 1,5 s:', mid, '· después:', JSON.stringify(fin)); await p.screenshot({ path: `${out}/final.png` });
console.log(errs.length ? errs.slice(0, 3) : 'sin errores'); await b.close();
