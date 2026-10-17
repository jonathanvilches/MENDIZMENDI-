// La ficha de un escudo de casa con la imagen del autor y su vista en piedra, y una ficha de oficio con su escudo, en el móvil
// tumbado. Uso: node tools/escudos-ver.mjs <carpeta> [pueblo]   (servidor de pruebas en 5173; con ARCHIVO=MENDIMENDIZ-jugar.html,
// el archivo único, con las imágenes grandes de la web servidas desde docs/, como hace nitidez-hd.mjs)
import { chromium } from 'playwright-core';
import { resolve } from 'path';
import { existsSync } from 'fs';
const out = process.argv[2], town = process.argv[3] || 'lesaka';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, coins: 14, settings: { quality: 'low' } })); });
const SITE = 'https://jonathanvilches.github.io/MENDIZMENDI-/docs/';
if (process.env.ARCHIVO) await p.route(SITE + '**', (r) => { const f = resolve('docs', r.request().url().slice(SITE.length).split('?')[0]); return existsSync(f) ? r.fulfill({ path: f }) : r.abort(); });
await p.goto(process.env.ARCHIVO ? `file://${resolve(process.env.ARCHIVO)}?town=${town}&q=low&noflora&weather=clear&skipintro=1&t=12` : `http://127.0.0.1:5173/?town=${town}&q=low&noflora&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 }); await p.waitForTimeout(2000);
const st = () => p.evaluate(() => { const f = document.querySelector('.ix-frame'); const im = f?.querySelector('img'), cv = f?.querySelector('canvas'); return { ficha: !!f, img: im ? [im.getAttribute('src').split('/').pop(), im.naturalWidth, getComputedStyle(im).display] : null, canvas: cv ? [cv.width, cv.height, getComputedStyle(cv).display, Math.round(cv.getBoundingClientRect().width), Math.round(cv.getBoundingClientRect().height)] : null, titulo: document.querySelector('.ix-title')?.textContent }; });
await p.evaluate(() => { const G = window.__game; G.readShield(G.blasones[0]); });
await p.waitForTimeout(3500); console.log('casa color', JSON.stringify(await st())); await p.screenshot({ path: `${out}/casa-color.png` });
await p.evaluate(() => document.querySelector('.es-toggle button[data-s="1"]')?.click()); await p.waitForTimeout(800);
console.log('casa piedra', JSON.stringify(await st())); await p.screenshot({ path: `${out}/casa-piedra.png` });
await p.evaluate(() => document.querySelector('.es-toggle button[data-s="0"]')?.click()); await p.waitForTimeout(500); console.log('casa color 2', JSON.stringify(await st()));
await p.evaluate(() => document.querySelector('.mg-overlay .next')?.click()); await p.waitForTimeout(800);
if (!process.env.ARCHIVO) await p.evaluate(async () => { const G = window.__game; const m = await import('/src/ui/escudoImg.js'); const { infoCard } = await import('/src/ui/minigames.js'); console.log('oficio url', m.oficioImg('herrero')); infoCard(G.ui, { icon: 'anvil', image: m.oficioImg('herrero') || '', kicker: 'Herrero · paso 1 de 4', title: 'Calentar el hierro', text: 'El hierro se mete en la fragua hasta que se pone al rojo.', button: 'Hacerlo' }); });
if (!process.env.ARCHIVO) { await p.waitForTimeout(1500); console.log('oficio', JSON.stringify(await st())); await p.screenshot({ path: `${out}/oficio.png` }); }
await p.evaluate(() => document.querySelector('.mg-overlay button.btn')?.click()); await p.waitForTimeout(500);
console.log('errores:', errs.length ? errs.join(' | ') : 'ninguno'); await b.close();
