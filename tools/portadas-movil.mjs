// Las portadas en el iPhone: el inicio, la lista de pueblos y la ficha de un pueblo, con el tamaño real de cada imagen frente
// al que ocupa en pantalla («falta»: píxeles de pantalla por píxel de imagen; más de 1,2 se ve blanda) y si la grande ha
// llegado (src/web/hd.js). Uso: node tools/portadas-movil.mjs <carpeta> [pueblo]   (VISTA=390x844 para vertical; PUERTO=…; INICIO=pueblo, el de la portada del inicio)
import { chromium } from 'playwright-core';
const out = process.argv[2], town = process.argv[3] || 'erronkari-roncal';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const [W, H] = (process.env.VISTA || '844x390').split('x').map(Number);
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 200)));
await p.addInitScript((last) => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', avatar: 'sanfermin', last, seen: { heroBenat: true, dog: true, intro: true }, coins: 0, settings: { quality: 'low' } })); }, process.env.INICIO || undefined);   // (INICIO=pueblo: el que sale en la portada del inicio)
await p.goto('http://127.0.0.1:' + (process.env.PUERTO || 5173) + '/', { timeout: 300000 });
await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(2500);
const info = (sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].slice(0, 6).map(im => { const r = im.getBoundingClientRect(); const cs = getComputedStyle(im); return { src: (im.currentSrc || im.src).split('/').pop().slice(0, 40), nat: [im.naturalWidth, im.naturalHeight], css: [Math.round(r.width), Math.round(r.height)], pos: cs.objectPosition, fit: cs.objectFit, falta: +(im.naturalWidth ? (r.width * devicePixelRatio / im.naturalWidth) : 0).toFixed(2) }; }), sel);
await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/inicio.png` }); console.log('inicio imgs', JSON.stringify(await info('.hub-main img')));
console.log('inicio fondos', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.hub-main [style*="url("], .hub-main .hero, .hub-main [class*=hero]')].filter(e => getComputedStyle(e).backgroundImage !== 'none').slice(0, 4).map(e => { const r = e.getBoundingClientRect(); return { cls: e.className.toString().slice(0, 40), bg: getComputedStyle(e).backgroundImage.split('/').pop().slice(0, 50), css: [Math.round(r.width), Math.round(r.height)], size: getComputedStyle(e).backgroundSize, pos: getComputedStyle(e).backgroundPosition }; }))));
await p.evaluate(() => window.__hub.show('towns')); await p.waitForTimeout(2500); await p.evaluate(() => scrollTo(0, 0));
await p.screenshot({ path: `${out}/pueblos.png` }); console.log('pueblos', JSON.stringify(await info('.tcard .tcov')));
await p.waitForTimeout(3000); console.log('pueblos tras hd', JSON.stringify((await info('.tcard .tcov')).map(x => [x.src, x.nat[0], x.falta])));
const bg = await p.evaluate(() => [...document.querySelectorAll('[style*="url("]')].slice(0, 4).map(e => ({ cls: e.className.toString().slice(0, 30), st: e.getAttribute('style').slice(0, 120) })));
console.log('fondos', JSON.stringify(bg));
try { await p.evaluate((t) => window.__hub.townSheet(t), town); } catch (e) { await p.evaluate((t) => document.querySelector(`[data-town="${t}"]`)?.click(), town); }
await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/ficha-${town}.png` });
console.log('ficha imgs', JSON.stringify(await info('.sheet img, .sh-hero img, .ppage img')));
console.log('ficha fondos', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.sh-hero, [class*=sh-]')].filter(e => getComputedStyle(e).backgroundImage !== 'none').slice(0, 3).map(e => { const r = e.getBoundingClientRect(); return { cls: e.className.toString().slice(0, 30), bg: getComputedStyle(e).backgroundImage.split('/').pop().slice(0, 50), css: [Math.round(r.width), Math.round(r.height)], size: getComputedStyle(e).backgroundSize, pos: getComputedStyle(e).backgroundPosition }; }))));
await b.close();
