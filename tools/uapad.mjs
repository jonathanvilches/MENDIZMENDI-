// Lista los botones que dependen del relleno por defecto del navegador (en iOS es mayor y descentra los iconos)
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const seen = new Map();
const scan = async (tag) => { for (const r of await p.evaluate(() => [...document.querySelectorAll('button')].filter(x => { const c = getComputedStyle(x); return c.paddingLeft === '6px' || c.paddingTop === '1px'; }).map(x => (x.id ? '#' + x.id : '') + '.' + [...x.classList].join('.') + ' [' + (x.textContent.trim().slice(0, 20) || 'icono') + ']'))) if (!seen.has(r)) seen.set(r, tag); };
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForTimeout(8000); await scan('hub');
await p.goto('http://127.0.0.1:5173/?town=lumbier', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await scan('hud');
for (const f of ['openBook', 'openMap', 'openMenu']) { await p.evaluate((f) => window.__game.ui[f](), f); await p.waitForTimeout(800); await scan(f); await p.evaluate(() => window.__game.ui.closeModal()); }
for (const [k, v] of seen) console.log(v.padEnd(9), k);
await b.close();
