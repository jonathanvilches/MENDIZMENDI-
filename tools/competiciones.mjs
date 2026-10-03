// Competiciones en el pueblo (como un iPhone en horizontal): menú del pelotari, cuadro del torneo de mano de la comarca
// (con el viaje al pueblo del partido), menú del club y pantalla de la liga con la jornada en otro pueblo; y la pantalla
// de controles del partido. Uso: node tools/competiciones.mjs <carpeta> [pueblo]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/competiciones', town = 'etxalar'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
// 1) controles del partido
{ const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:5173/lab/futbol-demo.html?go=match&notuto&quality=low&chars=simple', { timeout: 300000 });
  await p.waitForFunction(() => window.__futbol?.live, null, { timeout: 300000 }); await p.evaluate(() => window.__futbol.skipIntro());
  await p.waitForFunction(() => window.__futbol.intro <= 0, null, { timeout: 300000 });
  await p.evaluate(() => { window.__futbol.showControls(); }); await p.waitForTimeout(600); await p.screenshot({ path: `${out}/controles.png` });
  await p.close(); }
// 2) en el pueblo
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })); localStorage.setItem('mendimendiz-lang', 'es'); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
await p.evaluate(() => { const G = window.__game; G.ui.dialog = async () => 0; window.__trav = []; G.onPlayTown = (id) => window.__trav.push(id); });
// pelota: menú → torneo
p.evaluate(() => window.__game.freePelota());
await p.waitForSelector('.lg-root', { timeout: 60000 }); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/pelota-menu.png` });
await p.click('[data-a="torneo"]'); await p.waitForSelector('.tq-bracket', { timeout: 60000 }); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/torneo.png` });
const tv = await p.evaluate(() => !!document.querySelector('[data-a="travel"]'));
if (tv) { await p.click('[data-a="travel"]'); await p.waitForTimeout(800); }
else await p.click('[data-a="exit"]');
console.log('torneo: viajar', tv, JSON.stringify(await p.evaluate(() => window.__trav)));
// fútbol: menú del club → liga
await p.waitForTimeout(500);
p.evaluate(() => window.__game.playFutsal());
await p.waitForSelector('.lg-root', { timeout: 60000 }); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/club-menu.png` });
await p.click('[data-a="liga"]'); await p.waitForSelector('.lg-next', { timeout: 60000 }); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/liga.png` });
const lv = await p.evaluate(() => document.querySelector('.lg-btn.go')?.textContent);
console.log('liga: botón', lv);
await p.click('[data-a="sim"]'); await p.waitForSelector('.lg-res', { timeout: 60000 }); await p.click('[data-a="ok"]'); await p.waitForSelector('.lg-next', { timeout: 60000 });
const lv2 = await p.evaluate(() => document.querySelector('.lg-btn.go')?.textContent); console.log('liga jornada 2: botón', lv2);
await p.screenshot({ path: `${out}/liga2.png` });
if (await p.evaluate(() => !!document.querySelector('[data-a="travel"]'))) { await p.click('[data-a="travel"]'); await p.waitForTimeout(800); } else await p.click('[data-a="exit"]');
console.log('viajes', JSON.stringify(await p.evaluate(() => window.__trav)), 'club', await p.evaluate(() => JSON.parse(localStorage.getItem('mendimendiz-perfil-v1')).futbolClub));
console.log('errores', JSON.stringify(errs.slice(0, 5)));
await b.close();
