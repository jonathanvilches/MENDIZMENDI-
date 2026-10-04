// Comprueba que el encierro arranca desde la misión de Pamplona (el código del encierro se carga aparte, al entrar):
// habla con el anfitrión, espera a que la escena del encierro esté en marcha y mide el tiempo y los errores.
// Uso: node tools/encierro-arranque.mjs [url]
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://127.0.0.1:5173/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } }); const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
p.on('requestfailed', r => errs.push('FALLA ' + r.url().slice(-80))); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().slice(-90)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); localStorage.setItem('mendimendiz-lang', 'es'); });
await p.goto(base + '?town=pamplona&q=low&weather=clear&skipintro=1', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
await p.evaluate(() => { const G = window.__game; G.ui.dialog = async () => 0;   // (sin __autoWin: con él el encierro se da por ganado sin abrirse)
  const M = G.missions.find(M => M.type === 'race' && M.m.kind === 'encierro'); window.__M = M; window.__r = G.talk(M.host).then(() => 'fin', e => 'ERROR ' + e.message); });
const t0 = Date.now();
const ok = await p.waitForFunction(() => window.__game.altScene || window.__game.mode === 'encierro', null, { timeout: 300000, polling: 1000 }).then(() => true, e => e.message.slice(0, 100));
console.log('encierro en marcha:', ok, ((Date.now() - t0) / 1000).toFixed(0) + ' s');
console.log('modo', await p.evaluate(() => window.__game.mode + ' · paso ' + window.__M.step));
console.log([...new Set(errs)].slice(0, 8).join('\n') || 'sin errores');
await b.close();
