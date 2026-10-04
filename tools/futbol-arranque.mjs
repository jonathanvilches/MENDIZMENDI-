// Comprueba que el fútbol sala del pueblo arranca (el motor se carga aparte, al entrar): pueblo con pista → hablar
// con el entrenador → partido en marcha; muestra el tiempo, la memoria y los errores. Uso: node tools/futbol-arranque.mjs [pueblo]
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } }); const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
p.on('crash', () => console.log('CRASH de la página'));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); localStorage.setItem('mendimendiz-futbol-v1', JSON.stringify({ v: 1, tutorial: true })); localStorage.setItem('mendimendiz-lang', 'es'); });
await p.goto(`http://127.0.0.1:5173/?town=${process.argv[2] || 'etxalar'}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
console.log('cargado; memoria', await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) + ' MB' : '?'));
await p.evaluate(() => { const G = window.__game; G.ui.dialog = async () => 0; window.__clk = setInterval(() => document.querySelector('[data-a="sala"]')?.click(), 600); window.__r = G.playFutsal().then(() => 'fin', e => 'ERROR ' + e.message); });
const t0 = Date.now();
const ok = await p.waitForFunction(() => window.__futbol && window.__futbol.live, null, { timeout: 600000, polling: 1000 }).then(() => true, e => e.message.slice(0, 120));
console.log('partido en marcha:', ok, ((Date.now() - t0) / 1000).toFixed(0) + ' s', '· memoria', await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) + ' MB' : '?').catch(() => '?'));
console.log(await p.evaluate(() => { const m = window.__futbol; return m ? m.o.mode + ' ' + m.o.format + ' ' + m.home.name + ' - ' + m.away.name : 'nada'; }).catch(e => e.message));
console.log(errs.join('\n') || 'sin errores');
await b.close();
