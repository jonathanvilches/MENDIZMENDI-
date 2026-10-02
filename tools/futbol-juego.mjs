// Fútbol dentro del juego: en Pamplona se abre el fútbol de El Sadar (el reto de pases de la primera vez y luego el
// menú), se juega un rato con la IA por el jugador, se sacan capturas y se vuelve a la ciudad. Comprueba los errores.
// Uso: node tools/futbol-juego.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/claude-0/futbol-juego'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 620 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); localStorage.setItem('mendimendiz-futbol-v1', JSON.stringify({ v: 1, tutorial: true })); });
await p.goto((process.env.BASE || 'http://127.0.0.1:5173/') + '?town=pamplona&q=high&weather=clear&skipintro=1', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
const adv = (s) => p.evaluate((s) => { const m = window.__futbol; if (!m) return 'sin partido'; for (let i = 0; i < s * 30; i++) m.update(1 / 30); return { mode: m.o.mode, phase: m.game.phase, score: m.game.score.join('-') }; }, s);
// abre el fútbol como lo hace la entrenadora (sin la charla)
await p.evaluate(() => { const G = window.__game; const { Futbol } = window.__futbolMod || {}; window.__run = import('/src/game/futbol.js').then(M => new M.Futbol(G, G.sadar).run()).then(r => { window.__res = r; }); });
await p.waitForFunction(() => window.__futbol && window.__futbol.hud && window.__game.altScene, null, { timeout: 600000 });
console.log('reto', JSON.stringify(await adv(5))); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/1-reto.png` });
// sale del reto y en el menú elige un partido
await p.evaluate(() => window.__futbol.exit({ quit: true, reto: 'pases' }));
await p.waitForSelector('.fb-panel .fb-go', { timeout: 120000 });
await p.screenshot({ path: `${out}/2-menu.png` });
await p.evaluate(() => { document.querySelector('.fb-panel .fb-go').click(); });
await p.waitForFunction(() => window.__futbol && window.__futbol.o.mode === 'match' && window.__game.altScene, null, { timeout: 600000 });
await p.evaluate(() => { window.__futbol.game.autoplay = true; });
console.log('partido', JSON.stringify(await adv(8))); await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/3-partido.png` });
console.log('partido', JSON.stringify(await adv(10))); await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/4-partido.png` });
const info = await p.evaluate(() => { const r = window.__renderer.info.render; return { calls: r.calls, tris: r.triangles }; });
// abandona y vuelve a Pamplona
await p.evaluate(() => window.__futbol.exit({ quit: true }));
await p.waitForFunction(() => window.__res !== undefined, null, { timeout: 120000 });
const back = await p.evaluate(() => ({ mode: window.__game.mode, alt: !!window.__game.altScene, frozen: window.__game.player.frozen, res: window.__res, hud: document.querySelector('.fb-root') ? 'queda' : 'fuera' }));
await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/5-vuelta.png` });
console.log('vuelta', JSON.stringify(back), JSON.stringify(info), errs.length ? 'ERRORES ' + errs.slice(0, 4).join(' | ') : 'sin errores');
await b.close();
