// Capturas de la ficha de un pueblo en el menú (portada con el personaje) y de las tarjetas de su comarca.
// Uso: node tools/fichapueblo-shot.mjs <carpeta> [pueblo]
import { chromium } from 'playwright-core';
const [,, out, town = 'olite'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h] of [[844, 390], [390, 844], [1280, 720]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 900 ? 2 : 1, isMobile: w < 900, hasTouch: w < 900 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); } catch (e) { } });
  await p.goto('http://127.0.0.1:5173/', { timeout: 300000 });
  await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
  const com = await p.evaluate(async (t) => (await import('/src/data/levels.js')).LEVELS.find(l => l.id === t).comarca, town);
  await p.evaluate((c) => window.__hub.go('comarca', c), com); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('.towns')?.scrollIntoView()); await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/tarjetas-${w}x${h}.png` });
  await p.evaluate((t) => window.__hub.townSheet(t), town); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/ficha-${town}-${w}x${h}.png` });
  await p.close();
}
await b.close();
