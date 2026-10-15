// Capturas de la pantalla Personajes (el selector con las chicas y las figuras de leyenda y carnaval), del inicio con su
// tira de figuras y de la ficha de una figura, en escritorio y en el móvil tumbado, para revisarlas a ojo.
// Uso: node tools/personajes-ver.mjs <carpeta>   (servidor de pruebas en 5173, u otro con PUERTO=…)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [,, out] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [tag, vp, dpr, movil] of [['escritorio', { width: 1920, height: 1080 }, 1, false], ['movil', { width: 844, height: 390 }, 3, true]]) {
  const p = await (await b.newContext({ viewport: vp, deviceScaleFactor: dpr, isMobile: movil, hasTouch: movil })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__vs = true; localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', age: 'nino', avatar: 'leire', seen: { heroBenat: true, dog: true }, xp: 900, last: 'altsasu-alsasua', settings: { quality: 'low' } })); });
  await p.goto('http://127.0.0.1:' + (process.env.PUERTO || 5173) + '/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(2000);
  await p.evaluate(() => document.querySelector('.figuras.rail')?.scrollIntoView()); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${tag}-inicio-figuras.png` });
  await p.evaluate(() => window.__hub.go('avatars')); await p.waitForTimeout(6000); await p.screenshot({ path: `${out}/${tag}-personajes.png` });
  await p.evaluate(() => document.querySelector('.figuras')?.scrollIntoView()); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${tag}-personajes-figuras.png` });
  await p.click('[data-figura="joaldun"]'); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${tag}-ficha-joaldun.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // la chica elegida en el perfil: su retrato en la cabecera y en el perfil
  await p.evaluate(() => window.__hub.go('profile')); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${tag}-perfil.png` });
  console.log(tag, 'errores:', errs.join(' | ') || 'ninguno'); await p.close();
}
await b.close();
