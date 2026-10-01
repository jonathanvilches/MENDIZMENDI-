// Cambia de pueblo varias veces en la misma partida y apunta la memoria tras cada carga (para detectar fugas).
// Uso: node tools/memoria.mjs pamplona,lumbier,javier,pamplona,estella,pamplona
import { chromium } from 'playwright-core';
const ids = (process.argv[2] || 'pamplona,lumbier,javier,pamplona').split(',');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const p = await browser.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`http://127.0.0.1:5173/?town=${ids[0]}&q=mid`, { timeout: 300000 });
const meas = async (id) => { await p.waitForFunction((id) => window.__game && window.__game.mode === 'play' && window.__game.def?.id === id, id, { timeout: 600000 }); await p.waitForTimeout(3000);
  return p.evaluate(() => { if (window.gc) window.gc(); const R = window.__renderer; return { heap: Math.round(performance.memory.usedJSHeapSize / 1048576), geos: R.info.memory.geometries, texs: R.info.memory.textures, errores: (window.__errors || []).length }; }); };
console.log(ids[0], JSON.stringify(await meas(ids[0])));
for (const id of ids.slice(1)) {
  await p.evaluate((id) => { document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); window.__game.onPlayTown(id); }, id);
  console.log(id, JSON.stringify(await meas(id)));
}
await browser.close();
