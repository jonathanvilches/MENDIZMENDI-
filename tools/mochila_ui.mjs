// Diseño del panel de la mochila en escritorio y móvil, con y sin perro.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/mochila-ui'; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, gear: ['mochila', 'cantimplora'], bag: { agua: 2, food: { pan: 2, queso: 1, miel: 1 } }, dogBreed: 'mastin' })); });
await p.goto('http://127.0.0.1:5173/?town=lumbier&q=low', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.evaluate(() => { document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); const G = window.__game; G.ui.busy = false; G.mode = 'play'; G.P.gear = ['mochila', 'cantimplora']; G.mochila.open(); });
const shot = async (n) => { await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${n}.png`, timeout: 180000 }); console.log('foto', n); };
await shot('escritorio-con-perro');
await p.evaluate(() => document.querySelector('.bp-scroll').scrollTop = 0);
await p.evaluate(() => document.querySelector('[data-a="dogoff"]').click()); await shot('escritorio-sin-perro');
await p.evaluate(() => document.querySelector('[data-a="dogon"]').click());
await p.setViewportSize({ width: 390, height: 780 }); await shot('movil-con-perro');
await p.evaluate(() => { const s = document.querySelector('.bp-scroll'); s.scrollTop = s.scrollHeight; }); await shot('movil-final');
await browser.close();
