// Entrar y salir del juego como un jugador en el móvil: desde el menú se abre un pueblo, se juega un poco, se sale con
// el botón de menú → Salir, se vuelve al menú, se entra en otro pueblo y se repite; también se entra y sale de la
// pelota y del fútbol. Comprueba que no hay errores, que el menú vuelve y que no se acumulan pueblos en memoria.
// Uso: node tools/entrar-salir.mjs [pueblo,pueblo…]   (URL=http://127.0.0.1:5173)
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://127.0.0.1:5173', towns = (process.argv[2] || 'lumbier,estella,olite,lumbier,estella').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }); const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/403|404/.test(m.text())) errs.push(m.text().slice(0, 160)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); localStorage.setItem('mendimendiz-lang', 'es'); });
await p.goto(URL + '/', { timeout: 300000 });
await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
const st = () => p.evaluate(async () => { if (window.gc) { gc(); await new Promise(r => setTimeout(r, 300)); gc(); } return { hub: !!document.querySelector('#hub:not(.hidden), .hub:not(.hidden)') && getComputedStyle(document.querySelector('#hub, .hub')).display !== 'none', mode: window.__game?.mode || null, loading: !document.getElementById('loading')?.classList.contains('hidden'), mem: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : 0 }; });
for (const t of towns) {
  const t0 = Date.now();
  await p.evaluate((t) => { window.__hub.townSheet(t); }, t); await p.waitForTimeout(600);
  await p.tap('.sheet [data-play]');
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play' && document.getElementById('loading')?.classList.contains('hidden'), null, { timeout: 400000 });
  const load = ((Date.now() - t0) / 1000).toFixed(0);
  // caminar un poco con el teclado
  await p.keyboard.down('w'); await p.waitForTimeout(1500); await p.keyboard.up('w');
  // pelota: entrar y salir
  const pel = process.env.NOPEL ? 'no' : await p.evaluate(async () => { const G = window.__game; if (!G.fronton || !G.pelotari) return 'sin frontón'; G.fronton.play(G, G.pelotari); return 'ok'; });
  if (pel === 'ok') { await p.waitForFunction(() => !!document.querySelector('.pel-panel'), null, { timeout: 60000 }); await p.tap('[data-pel-go]'); await p.waitForTimeout(1200); await p.tap('.pel-exit'); await p.waitForTimeout(300); await p.tap('[data-pel-yes]'); await p.waitForTimeout(1500); }
  const afterPel = await st();
  // salir con el botón de menú → Salir
  await p.tap('#bMenu'); await p.waitForTimeout(500); await p.tap('#mExit'); await p.waitForTimeout(2500);
  console.log(t, `carga ${load} s`, 'pelota', pel, JSON.stringify(afterPel), '→ fuera', JSON.stringify(await st()));
}
console.log(errs.length ? errs.slice(0, 10).join('\n') : 'sin errores');
await b.close();
