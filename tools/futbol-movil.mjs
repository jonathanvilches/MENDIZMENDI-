// Fútbol dentro del juego como en un iPhone en horizontal: en Pamplona se abre el fútbol de El Sadar (directo al
// menú), se elige Partido, se ve la presentación y se juega CON LOS DEDOS (joystick y botones de la pantalla, sin IA
// por el jugador): se comprueba que el jugador se mueve, que pasa y tira, que cambia de jugador y que no hay errores.
// Uso: node tools/futbol-movil.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/claude-0/futbol-movil'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); localStorage.setItem('mendimendiz-futbol-v1', JSON.stringify({ v: 1, tutorial: true })); localStorage.setItem('mendimendiz-lang', 'es'); });
await p.goto((process.env.BASE || 'http://127.0.0.1:5173/') + '?town=pamplona&q=low&weather=clear&skipintro=1', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
await p.evaluate(() => { const G = window.__game; window.__run = import('/src/game/futbol.js').then(M => new M.Futbol(G, G.sadar).run()).then(r => { window.__res = r; }); });
await p.waitForSelector('.fb-panel .fb-go', { timeout: 120000 });
await p.screenshot({ path: `${out}/1-menu.png` });
await p.tap('.fb-panel .fb-go');
await p.waitForFunction(() => window.__futbol && window.__futbol.o.mode === 'match' && window.__futbol.live, null, { timeout: 600000 });
await p.waitForFunction(() => { const m = window.__futbol; return m.introLen - m.intro > 4; }, null, { timeout: 300000 });
await p.screenshot({ path: `${out}/2-presentacion.png` });
await p.waitForFunction(() => window.__futbol.intro <= 0, null, { timeout: 300000 });
const st = () => p.evaluate(() => { const g = window.__futbol.game; return { phase: g.phase, me: g.me.role, x: +g.me.x.toFixed(1), z: +g.me.z.toFixed(1), ball: [+g.ball.p.x.toFixed(1), +g.ball.p.z.toFixed(1)], owner: g.owner ? g.owner.team + g.owner.role : null, score: g.score.join('-'), n: g.players.length }; });
await p.evaluate(() => { const g = window.__futbol.game; window.__sw = []; const e = g.emit.bind(g); g.emit = (x) => { if (['switch', 'kick', 'pass', 'shot', 'goal', 'restart'].includes(x.t)) window.__sw.push(x.t + (x.why ? ':' + x.why : '')); return e(x); }; });
console.log('saque', JSON.stringify(await st()));
await p.screenshot({ path: `${out}/3-saque.png` });
// saque: pase (toque al botón)
const btn = async (a, ms = 120) => { const r = await p.evaluate((a) => { const e = document.querySelector(`.fb-b[data-a="${a}"]`); const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }, a); await p.mouse.move(r[0], r[1]); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); };
await btn('pass'); await p.waitForTimeout(2500);
console.log('tras el pase', JSON.stringify(await st()));
// joystick: arrastrar hacia la derecha (hacia la portería rival) un rato
const stick = async (dx, dy, ms) => { await p.mouse.move(150, 260); await p.mouse.down(); await p.mouse.move(150 + dx, 260 + dy, { steps: 4 }); await p.waitForTimeout(ms); await p.mouse.up(); };
for (let k = 0; k < 4; k++) { await stick(50, -10, 1500); await btn('pass'); await p.waitForTimeout(800); console.log('juego', JSON.stringify(await st())); }
await stick(50, 0, 1200); await btn('shoot', 500); await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/4-juego.png` });
console.log('tras tiro', JSON.stringify(await st()));
console.log('eventos', JSON.stringify(await p.evaluate(() => window.__sw)));
await p.evaluate(() => window.__futbol.exit({ quit: true }));
await p.waitForFunction(() => window.__res !== undefined, null, { timeout: 120000 });
console.log('vuelta', JSON.stringify(await p.evaluate(() => ({ mode: window.__game.mode, alt: !!window.__game.altScene, frozen: window.__game.player.frozen }))), errs.length ? 'ERRORES ' + errs.slice(0, 5).join(' | ') : 'sin errores');
await b.close();
