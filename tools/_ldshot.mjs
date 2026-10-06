import { chromium } from 'playwright-core';
const [,, out, town = 'lumbier'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h] of [[844, 390], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); } catch (e) { } });
  await p.goto(`http://127.0.0.1:5173/?town=${town}`, { timeout: 300000 });
  await p.waitForFunction(() => document.querySelector('#loading:not(.hidden) .ld-hero[src]'), null, { timeout: 300000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/ld-${town}-${w}x${h}.png` });
  await p.close();
}
await b.close();
