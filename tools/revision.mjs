// Revisión general: carga cada pueblo (calidad baja) y comprueba errores de JavaScript, que todas las misiones
// tengan anfitrión, que el jugador y el perro estén en el suelo y que haya un objetivo. Escribe un informe.
// Uso: node tools/revision.mjs [pueblos separados por comas]
import { chromium } from 'playwright-core';
import { writeFileSync } from 'fs';
const only = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p0 = await browser.newPage();
await p0.goto('http://127.0.0.1:5173/', { timeout: 300000 });
const ids = only ? only.split(',') : await p0.evaluate(async () => (await import('/src/data/levels.js')).LEVELS.filter(l => !l.special).map(l => l.id));
await p0.close();
const out = [];
for (const id of ids) {
  const p = await browser.newPage({ viewport: { width: 800, height: 450 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 160)));
  p.on('console', m => { if (m.type() === 'error') errs.push('ERR ' + m.text().slice(0, 160)); });
  await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); } catch (e) { } });
  const t0 = Date.now(); let info = null;
  try {
    await p.goto(`http://127.0.0.1:5173/?town=${id}&q=low`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
    await p.waitForTimeout(2500);
    info = await p.evaluate(() => { const G = window.__game, gh = window.__hf.groundHeight, P = G.player.pos, D = G.perro?.dog?.pos;
      return { misiones: G.missions.map(M => M.type).join(','), sinAnfitrion: G.missions.filter(M => !M.host).length,
        jugadorSuelo: +(P.y - gh(P.x, P.z)).toFixed(2), perro: D ? +Math.hypot(D.x - P.x, D.z - P.z).toFixed(1) : null, objetivo: !!G.target(), interactuables: G.interactables().length }; });
  } catch (e) { errs.push('CARGA ' + e.message.slice(0, 120)); }
  const r = { id, s: Math.round((Date.now() - t0) / 1000), ...info, errores: [...new Set(errs)].slice(0, 6) };
  out.push(r); console.log(JSON.stringify(r));
  await p.close();
}
writeFileSync('entrega/revision.json', JSON.stringify(out, null, 1));
await browser.close();
