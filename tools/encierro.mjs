// Encierro: entra en la Estafeta, corre, capturas con los toros y llegada a la plaza.
// Uso: node tools/encierro.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/encierro'; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: false })); });
await p.goto('http://127.0.0.1:5173/?town=pamplona&q=mid', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
let k = 0; const shot = async (n) => { await p.screenshot({ path: `${out}/${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.m.kind === 'encierro'); document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); G.ui.busy = false; G.say = async () => {}; G.dialog(M, M.host); });
await p.waitForFunction(() => window.__game.mode === 'encierro', null, { timeout: 120000 });
await p.waitForTimeout(1500); await shot('salida');
// tiempo simulado: avanzar la escena a pasos fijos (el navegador de pruebas dibuja muy despacio)
// el corredor de la prueba se pega a la pared derecha cuando llega la manada
const adv = (secs, wall = true) => p.evaluate(([secs, wall]) => { const G = window.__game; for (let i = 0; i < secs * 30 && G.altUpdate; i++) { const E = G.encierro; if (E && wall) E.me.x = 2.4; G.altUpdate(1 / 30); } }, [secs, wall]);
await p.evaluate(() => { const G = window.__game; G.__enc = null; });
await adv(3.2, false); await p.waitForTimeout(800); await shot('cohete');
await adv(6); await p.waitForTimeout(800); await shot('toros-llegan');
const st = await p.evaluate(() => { const G = window.__game; const e = G.altUpdate && G.altScene; return { mode: G.mode, errores: window.__errors || [] }; });
console.log(JSON.stringify(st));
await adv(4); await p.waitForTimeout(800); await shot('estafeta');
await adv(30); await p.waitForTimeout(800); await shot('plaza');
await p.evaluate(() => { const E = window.__game.encierro; if (E) E.me.z = -263.5; }); await adv(1);
await p.waitForFunction(() => document.querySelector('.mg-overlay button'), null, { timeout: 60000 }).catch(() => {});
await p.waitForTimeout(800); await shot('final');
for (let i = 0; i < 8; i++) { const b = await p.evaluate(() => { const b = document.querySelector('.mg-overlay:not(.out) button'); if (b) { b.click(); return true; } return false; }); await p.waitForTimeout(1500); if (!b && await p.evaluate(() => window.__game.mode === 'play')) break; }
await p.waitForTimeout(2000); await shot('vuelta');
console.log('hecha', await p.evaluate(() => window.__game.missions.find(M => M.m.kind === 'encierro').done), 'errores', await p.evaluate(() => JSON.stringify(window.__errors || [])));
console.log('modo', await p.evaluate(() => window.__game.mode));
await browser.close();
