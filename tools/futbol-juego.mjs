// Fútbol dentro del juego: en Pamplona se abre el fútbol de El Sadar (el partido directamente), se juega con la IA por
// el jugador hasta el final, revancha, se abandona y se vuelve a la ciudad. Saca capturas y comprueba los errores.
// Uso: node tools/futbol-juego.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/claude-0/futbol-juego'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 620 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); localStorage.setItem('herrizherri-futbol-v1', JSON.stringify({ v: 1, tutorial: true })); });
await p.goto((process.env.BASE || 'http://127.0.0.1:5173/') + '?town=pamplona&q=high&weather=clear&skipintro=1', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
const adv = (s) => p.evaluate((s) => { const m = window.__futbol; if (!m) return 'sin partido'; for (let i = 0; i < s * 30; i++) m.update(1 / 30); return { mode: m.o.mode, phase: m.game.phase, score: m.game.score.join('-') }; }, s);
// abre el fútbol como lo hace la entrenadora (sin la charla): el partido empieza directamente, sin reto ni menú previo
await p.evaluate(() => { const G = window.__game; window.__run = import('/src/game/futbol.js').then(M => new M.Futbol(G, G.sadar).run()).then(r => { window.__res = r; }); });
await p.waitForFunction(() => window.__futbol && window.__futbol.hud && window.__futbol.o.mode === 'match' && window.__game.altScene, null, { timeout: 600000 });
await p.evaluate(() => { window.__futbol.game.autoplay = true; });
console.log('partido', JSON.stringify(await adv(8))); await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/1-partido.png`, timeout: 120000 });
console.log('partido', JSON.stringify(await adv(10))); await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/2-partido.png`, timeout: 120000 });
const info = await p.evaluate(() => { const r = window.__renderer.info.render; return { calls: r.calls, tris: r.triangles }; });
// hasta el final (dos partes de 2 minutos y el descanso): la pantalla final con Revancha y Salir
for (let i = 0; i < 12 && (await p.evaluate(() => window.__futbol.game.phase)) !== 'end'; i++) await adv(30);
await p.waitForSelector('.fb-panel .fb-go', { timeout: 120000 });
const fin = await p.evaluate(() => ({ titulo: document.querySelector('.fb-panel h2')?.textContent, marcador: document.querySelector('.fb-panel .fb-big')?.textContent, botones: [...document.querySelectorAll('.fb-panel button')].map(b => b.textContent) }));
console.log('final', JSON.stringify(fin)); await p.screenshot({ path: `${out}/3-final.png`, timeout: 120000 });
// revancha: el mismo partido otra vez, desde 0-0
await p.click('.fb-panel .fb-go');
await p.waitForFunction(() => window.__futbol && window.__futbol.game.phase !== 'end' && window.__futbol.game.score.join('-') === '0-0' && !document.querySelector('.fb-panel'), null, { timeout: 120000 });
await p.evaluate(() => { window.__futbol.game.autoplay = true; });
console.log('revancha', JSON.stringify(await adv(6)));
// abandona y vuelve a Pamplona
await p.evaluate(() => window.__futbol.exit({ quit: true }));
await p.waitForFunction(() => window.__res !== undefined, null, { timeout: 120000 });
const back = await p.evaluate(() => ({ mode: window.__game.mode, alt: !!window.__game.altScene, frozen: window.__game.player.frozen, res: window.__res, hud: document.querySelector('.fb-root') ? 'queda' : 'fuera' }));
await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/4-vuelta.png`, timeout: 120000 });
const ok = back.mode === 'play' && !back.alt && !back.frozen && back.hud === 'fuera' && back.res?.quit && fin.botones.length === 2;
console.log('vuelta', JSON.stringify(back), JSON.stringify(info), errs.length ? 'ERRORES ' + errs.slice(0, 4).join(' | ') : 'sin errores', ok ? 'TODO BIEN' : 'FALLO');
if (!ok || errs.length) process.exitCode = 1;
await b.close();
