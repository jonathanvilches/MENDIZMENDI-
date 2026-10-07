// Móvil en horizontal (el formato principal): captura cada pantalla del menú y mide lo que estorba al jugar con el
// pulgar: botones de menos de 44 px, letra de menos de 12 px, scroll de lado y cuánto alto útil queda.
// Uso: node tools/horizontal.mjs [carpeta] [ancho] [alto]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/horizontal', W = '844', H = '390'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', age: 'nino', seen: { heroBenat: true, dog: true }, xp: 900, last: 'lesaka', towns: { lesaka: { done: { 0: true }, visits: 1 } }, cards: ['armas:baztan'], settings: { quality: 'low' } })); });
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(1500);
const screens = ['home', 'map', 'towns', 'sports', 'avatars', 'peaks', 'nature', 'escudos', 'badges', 'passport', 'profile'];
const measure = () => p.evaluate(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight; };
  const small = [...document.querySelectorAll('button, [role=button], a, select, input')].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height) < 40; }).map(e => (e.className || e.tagName).toString().slice(0, 30) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
  const tiny = [...document.querySelectorAll('body *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).filter(vis).filter(e => parseFloat(getComputedStyle(e).fontSize) < 12).map(e => (e.className || e.tagName).toString().slice(0, 24) + ':' + getComputedStyle(e).fontSize);
  const main = document.querySelector('#hMain'), nav = document.querySelector('#hNav'), top = document.querySelector('.h-top, header');
  return { scrollX: document.documentElement.scrollWidth > innerWidth + 1, small: [...new Set(small)].slice(0, 8), tiny: [...new Set(tiny)].slice(0, 8), main: main && Math.round(main.getBoundingClientRect().height), nav: nav && Math.round(nav.getBoundingClientRect().width) };
});
for (const s of screens) {
  await p.evaluate((s) => window.__hub.go(s, undefined, true), s); await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/${s}.png` });
  console.log(s, JSON.stringify(await measure()));
}
await p.evaluate(() => window.__hub.townSheet('lesaka')); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/ficha-pueblo.png` }); console.log('ficha', JSON.stringify(await measure()));
await p.evaluate(() => { window.__hub.sheet?.remove(); window.__hub.onboarding(); }); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/bienvenida.png` }); console.log('bienvenida', JSON.stringify(await measure()));
console.log(errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
