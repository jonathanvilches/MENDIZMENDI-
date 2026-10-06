// Prueba: salir del partido de pelota con la X (sí, salir) a media partida y al final; el juego vuelve al pueblo,
// se puede mover el personaje y no quedan restos del partido (HUD, teclas, cámara congelada).
// Uso: node tools/pelota-salir.mjs   (servidor en 5173)
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); localStorage.setItem('mendimendiz-lang', 'es'); });
await p.goto('http://127.0.0.1:5173/?town=lumbier&q=low&skipintro=1', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
const st = () => p.evaluate(() => { const G = window.__game; return { mode: G.mode, match: !!G.pelotaMatch?.active, hud: !!document.querySelector('.pel-root'), panel: !!document.querySelector('.pel-panel') }; });
for (const when of ['intro', 'juego', 'juego-tap']) {
  await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari); });
  await p.waitForSelector('.pel-panel', { timeout: 60000 });
  if (when === 'intro') await p.click('[data-pel-x]');
  else {
    await p.click('[data-pel-go]'); await p.waitForTimeout(1500);
    if (when === 'juego') await p.click('.pel-exit'); else await p.tap('.pel-exit');
    await p.waitForTimeout(400); const s1 = await st(); console.log(when, 'tras X', JSON.stringify(s1));
    if (when === 'juego') await p.click('[data-pel-yes]'); else await p.tap('[data-pel-yes]');
  }
  await p.waitForTimeout(1500); console.log(when, 'fuera', JSON.stringify(await st()));
}
console.log(errs.length ? errs.join('\n') : 'sin errores');
await b.close();
