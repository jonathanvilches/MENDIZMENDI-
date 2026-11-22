// La entrega de la txapela al acabar la final (pelota/ceremonia.js): se abre un partido en el frontón del pueblo, se da
// por acabada la final ganada y se fotografía cada momento: el podio con el frontis detrás, la txapela que baja, la copa
// en alto con el confeti y el rótulo del campeón. Al final, «Continuar» lleva al panel del partido.
// Uso: node tools/pelota-ceremonia.mjs [pueblo] [carpeta] [ancho] [alto]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/pelota-ceremonia', W = '844', H = '390'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const movil = +W < 1000;
const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: movil, hasTouch: movil }); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'warning' && /ceremonia/.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); window.__ceremonia = true; });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host, { camp: { titulo: 'Campeonato Manomanista', donde: 'Navarra' } }); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
// (cuando ya se juega: el sorteo del saque, acabado; si no, al acabar volvía a sacar los botones del partido)
await p.waitForFunction(() => ['serveWait', 'servePrep', 'rally'].includes(window.__game.pelotaMatch?.game?.phase), null, { timeout: 240000 });
// la final, ganada 9 a 6: directamente a la entrega (sin highlights)
await p.evaluate(() => { const M = window.__game.pelotaMatch; M.o.camp = { titulo: 'Campeonato Manomanista', donde: 'Navarra' }; M.game.score.you = 9; M.game.score.rival = 6; M.cerePend = { win: true, score: { you: 9, rival: 6 } }; M.ceremonia(); });
const momentos = [[2.4, 'podio'], [3.4, 'txapela-baja'], [4.6, 'txapela-puesta'], [7.2, 'copa-arriba'], [10.2, 'rotulo'], [13, 'plano-abierto']];
// (primero, a que empiece la entrega: si no, la primera foto salía del partido, antes de que hubiera ceremonia)
await p.waitForFunction(() => (window.__game.pelotaMatch?.cere?.t ?? -1) >= 0, null, { timeout: 240000 });
const t0 = Date.now();
for (const [ts, nombre] of momentos) {
  while (Date.now() - t0 < 600000) { const t = await p.evaluate(() => window.__game.pelotaMatch?.cere?.t ?? -1); if (t >= ts || t < 0) break; await p.waitForTimeout(250); }
  await p.screenshot({ path: `${out}/ceremonia-${nombre}.png` }); console.log(nombre, Math.round((Date.now() - t0) / 1000) + ' s');
}
await p.evaluate(() => document.querySelector('.cer-go')?.click()); await p.waitForTimeout(3000);
console.log(JSON.stringify(await p.evaluate(() => ({ panel: !!document.querySelector('.pel-panel'), cere: !!window.__game.pelotaMatch?.cere, restos: !!window.__game.scene.getObjectByName('ceremonia') }))));
await p.screenshot({ path: `${out}/ceremonia-panel.png` });
console.log(errs.length ? errs.slice(0, 4) : 'sin errores'); await b.close();
