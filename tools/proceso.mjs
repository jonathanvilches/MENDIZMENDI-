// Misión de producto con explicaciones: ¿qué es?, cómo se hace, ordenar pasos, antes y ahora.
// Uso: node tools/proceso.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'erronkari-roncal', out = 'entrega/procesos'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
let k = 0; const shot = async (n) => { await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${town}-${k++}-${n}.png`, timeout: 180000 }); };
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'process'); G.say = async () => {}; window.__d = false; G.dialog(M, M.host).then(() => window.__d = true); });
await p.waitForTimeout(1500); await shot('que-es');
await p.evaluate(() => { window.__autoWin = true; document.querySelector('.mg-overlay:not(.out) button')?.click(); });
await p.waitForFunction(() => window.__d, null, { timeout: 60000 });
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'process'); M.step = 2; window.__autoWin = false; window.__d = false; G.dialog(M, M.host).then(() => window.__d = true); });
await p.waitForTimeout(1500); await shot('como-se-hace');
await p.evaluate(() => { window.__autoWin = true; document.querySelector('.mg-overlay:not(.out) button')?.click(); });
await p.waitForFunction(() => window.__d, null, { timeout: 60000 });
console.log('hecha', await p.evaluate(() => window.__game.missions.find(M => M.type === 'process').done), await p.evaluate(() => JSON.stringify(window.__game.P.bag)));
await browser.close();
