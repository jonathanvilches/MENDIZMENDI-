// La elección de material con la caja de pelotas en 3D (pelota/cestano3d.js, desde match.js eleccion): se abre un partido
// en el frontón del pueblo, se pide la elección (window.__material) y se fotografía la escena con la tarjeta, después de
// cambiar a «vivas» y al pasar «Al cestaño», cuando la caja ya se ha ido y sigue el partido.
// Uso: node tools/pelota-cestano.mjs [pueblo] [carpeta] [ancho] [alto]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/pelota-cestano', W = '844', H = '390'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const movil = +W < 1000;
const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: movil, hasTouch: movil }); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'warning' && /cesta/i.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); window.__material = true; });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari || G.missions.find(M => M.type === 'pelota')?.host); });
await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 180000 });
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
await p.waitForSelector('.pel-panel.con-cestano', { timeout: 240000 });
await p.waitForTimeout(4000);
await p.screenshot({ path: `${out}/cestano-${W}.png` });
await p.evaluate(() => document.querySelector('[data-mat-k="pegador"]')?.click()); await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/cestano-vivas-${W}.png` });
await p.evaluate(() => document.querySelector('[data-mat-go]')?.click());
await p.waitForFunction(() => !window.__game.pelotaMatch?.cestano && !document.querySelector('.pel-panel.con-cestano'), null, { timeout: 60000 });
await p.waitForTimeout(3000);
await p.screenshot({ path: `${out}/despues-${W}.png` });
console.log(JSON.stringify(await p.evaluate(() => ({ caja: !!window.__game.scene.getObjectByName('cestano'), fase: window.__game.pelotaMatch?.game?.phase, cesta: window.__game.pelotaMatch?.cesta?.you?.map(b => b.n) }))));
console.log(errs.length ? errs.slice(0, 4) : 'sin errores'); await b.close();
