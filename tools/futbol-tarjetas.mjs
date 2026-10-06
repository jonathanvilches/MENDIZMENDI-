// Fútbol en el navegador (móvil horizontal): el aro de fuerza en el botón de PASE mantenido, una tarjeta amarilla y una
// roja con su mensaje, en el marcador y en la mano del árbitro, y la tabla final con faltas y tarjetas.
// Uso: node tools/futbol-tarjetas.mjs [carpeta]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/futbol-tarjetas'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); localStorage.setItem('mendimendiz-futbol-v1', JSON.stringify({ v: 1, tutorial: true })); });
await p.goto('http://127.0.0.1:5173/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
await p.evaluate(() => document.querySelector('[data-sport="futbol"]').click());
await p.waitForFunction(() => document.querySelector('.lg-root .lg-rv'), null, { timeout: 120000 }); await p.evaluate(() => document.querySelector('.lg-root .lg-rv').click());
await p.waitForFunction(() => document.querySelector('.lg-root [data-a="sadar"]'), null, { timeout: 60000 }); await p.evaluate(() => document.querySelector('.lg-root [data-a="sadar"]').click());
await p.waitForFunction(() => window.__futbol && window.__futbol.game && document.body.classList.contains('futbol'), null, { timeout: 600000 });
// al juego: el balón para tu jugador y mantener PASE (el aro se va llenando)
await p.waitForFunction(() => { const m = window.__futbol; for (let i = 0; i < 30; i++) m.update(1 / 30); return m.live && !(m.intro > 0) && !m.replay; }, null, { timeout: 300000, polling: 500 });
await p.evaluate(() => { const m = window.__futbol, g = m.game; for (let i = 0; i < 30 * 2; i++) m.update(1 / 30); g.restart = null; g.phase = 'play'; g.ball.set(g.me.x + 0.5, g.me.z); g.owner = g.me; g.press('pass'); for (let i = 0; i < 18; i++) m.update(1 / 30); });
await p.waitForTimeout(400); await p.screenshot({ path: `${out}/1-fuerza-pase.png` });
const ring = await p.evaluate(() => { const b = document.querySelector('.fb-pass'); return { chg: b?.classList.contains('chg'), v: b?.style.getPropertyValue('--chg') }; });
await p.evaluate(() => { const m = window.__futbol, g = m.game; g.release('pass'); for (let i = 0; i < 10; i++) m.update(1 / 30); });
// tarjeta amarilla y, después, roja a un rival
await p.evaluate(() => { const m = window.__futbol, g = m.game, d = g.team(1).find(q => q.line === 1); g.book(d, 'yellow'); for (let i = 0; i < 12; i++) m.update(1 / 30); });
await p.waitForTimeout(500); await p.screenshot({ path: `${out}/2-amarilla.png` });
await p.evaluate(() => { const m = window.__futbol, g = m.game, d = g.team(1).find(q => q.line === 2); g.book(d, 'red'); for (let i = 0; i < 12; i++) m.update(1 / 30); });
await p.waitForTimeout(500); await p.screenshot({ path: `${out}/3-roja.png` });
const hud = await p.evaluate(() => ({ cards: [...document.querySelectorAll('.fb-cd u')].map(u => u.className), msg: document.querySelector('.fb-msg h2')?.textContent, team1: window.__futbol.game.team(1).length }));
// final con la tabla
await p.evaluate(() => { const m = window.__futbol, g = m.game; g.autoplay = true; g.clock = g.halfLen - 0.5; g.half = 2; for (let i = 0; i < 30 * 12; i++) m.update(1 / 30); });
await p.waitForSelector('.fb-stats', { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(600); await p.screenshot({ path: `${out}/4-final.png` });
const rows = await p.evaluate(() => [...document.querySelectorAll('.fb-stats tr')].map(tr => tr.textContent));
console.log(JSON.stringify({ ring, hud, rows }), errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
