// Liga Navarra en la página de pruebas: pantalla de la liga (escritorio y móvil apaisado), presentación de un partido
// entre clubes (equipaciones con rayas y banda), resultados de la jornada. Uso: node tools/liga-vistas.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/liga'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const open = async (url, w, h, touch) => { const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => { localStorage.removeItem('mendimendiz-liga-v1'); }); await p.goto(url, { timeout: 300000 }); return p; };
// 1) pantalla de la liga en el móvil apaisado y en escritorio
for (const [n, w, h, t] of [['movil', 844, 390, true], ['escritorio', 1100, 680, false]]) {
  const p = await open('http://127.0.0.1:5173/lab/futbol-demo.html?go=liga&club=baztan&notuto&quality=low', w, h, t);
  await p.waitForSelector('.lg-root', { timeout: 120000 }); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/liga-${n}.png` });
  if (n === 'escritorio') {
    // jugar la jornada: el partido empieza; se da por terminado 2-1 y salen los resultados
    await p.click('[data-a="play"]');
    await p.waitForFunction(() => window.__futbol?.live, null, { timeout: 300000 });
    await p.waitForFunction(() => { const m = window.__futbol; return m.introLen - m.intro >= 4.2; }, null, { timeout: 300000 });
    await p.screenshot({ path: `${out}/partido-presentacion.png` });
    await p.evaluate(() => window.__futbol.skipIntro());
    await p.waitForFunction(() => window.__futbol.intro <= 0, null, { timeout: 300000 }); await p.waitForTimeout(2500);
    await p.screenshot({ path: `${out}/partido-saque.png` });
    await p.evaluate(() => window.__futbol.exit({ win: true, you: 2, cpu: 1 }));
    await p.waitForSelector('.lg-res', { timeout: 120000 }); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/liga-resultados.png` });
    await p.click('[data-a="ok"]'); await p.waitForSelector('.lg-next', { timeout: 60000 }); await p.screenshot({ path: `${out}/liga-jornada2.png` });
  }
  await p.close();
}
// 2) equipaciones con rayas (Izarra) y banda (Cantolagua), y choque de colores (Baztan–Aoiz)
for (const [c, r] of [['izarra', 'cantolagua'], ['baztan', 'aoiz']]) {
  const p = await open(`http://127.0.0.1:5173/lab/futbol-demo.html?go=club&club=${c}&rival=${r}&notuto&quality=low`, 1100, 620, false);
  await p.waitForFunction(() => window.__futbol?.live, null, { timeout: 300000 });
  await p.waitForFunction(() => { const m = window.__futbol; return m.introLen - m.intro >= 3.6; }, null, { timeout: 300000 }); await p.screenshot({ path: `${out}/kits-${c}-${r}-a.png` });
  await p.waitForFunction(() => { const m = window.__futbol; return m.introLen - m.intro >= 5.2; }, null, { timeout: 300000 }); await p.screenshot({ path: `${out}/kits-${c}-${r}-b.png` });
  await p.close();
}
console.log('errores', JSON.stringify(errs.slice(0, 6)));
await b.close();
