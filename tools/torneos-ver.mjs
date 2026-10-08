// La pantalla de Torneos del menú en el móvil tumbado: captura y el texto de las dos tarjetas (pelota y fútbol).
// Uso: node tools/torneos-ver.mjs [carpeta] [es|eu]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/torneos', lang = 'es'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript((lang) => { localStorage.setItem('mendimendiz-lang', lang); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', futbolClub: 'agoitz', seen: { heroBenat: true, dog: true } })); }, lang);
await p.goto('http://127.0.0.1:5173/?q=low&weather=clear', { timeout: 300000 });
await p.waitForFunction(() => window.__ready && window.__hub?.visible, null, { timeout: 300000 });
await p.evaluate(() => document.querySelector('#hNav [data-s="sports"]').click()); await p.waitForTimeout(2500);
console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.sport .sp-txt')].map(e => e.innerText.replace(/\s+/g, ' '))), null, 1));
await p.screenshot({ path: `${out}/${lang}-torneos.png` });
console.log(errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
