// Recorre todas las pantallas del menú (y cada comarca, con un perfil con progreso) buscando errores.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1000, height: 640 } });
await p.addInitScript((k) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, 'es'); } catch (e) { } }, 'mendimendiz-lang');
const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push('consola ' + m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Prueba', seen: { heroBenat: true, dog: true }, xp: 900, towns: { pamplona: { done: { 0: true, 1: true }, stamp: false, visits: 2 }, peralta: { done: { 0: true }, stamp: true }, corella: { done: { 0: true } } }, last: 'peralta', peaks: ['erga'], species: ['buitre'], cards: ['pottoka'], montes: ['izaga'], badges: [] })); });
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 });
await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
await p.waitForTimeout(3000);
const screens = await p.evaluate(() => Object.getOwnPropertyNames(Object.getPrototypeOf(window.__hub)).filter(k => k.startsWith('s_')).map(k => k.slice(2)));
console.log('pantallas', screens.join(','));
const comarcas = await p.evaluate(async () => (await import('/src/data/comarcas.json')).default.map(c => c.id));
for (const s of screens) { if (s === 'comarca') continue; try { await p.evaluate((s) => window.__hub.go(s, undefined, true), s); } catch (e) { errs.push(s + ': ' + e.message); } await p.waitForTimeout(400); }
for (const c of comarcas) { try { await p.evaluate((c) => window.__hub.go('comarca', c, true), c); } catch (e) { errs.push('comarca ' + c + ': ' + e.message); } await p.waitForTimeout(400); }
// abrir la ficha de cada pueblo desde el mapa
const towns = await p.evaluate(() => [...document.querySelectorAll('[data-town]')].length);
console.log('fichas en la última comarca', towns);
console.log(JSON.stringify([...new Set(errs)], null, 1));
await b.close();
