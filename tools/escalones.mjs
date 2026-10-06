// Escalones: el jugador se sube a los escalones que sobresalen del suelo (de 10 a 35 cm: los de las puertas y los
// peldaños de las escalinatas) andando hacia ellos; se comprueba que sus pies quedan encima y no hundidos.
// Uso: node tools/escalones.mjs [pueblo,pueblo…]   (servidor en 5173)
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of (process.argv[2] || 'elizondo,tudela').split(',')) {
  const p = await b.newPage({ viewport: { width: 400, height: 300 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&skipintro=1&noflora`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
  const r = await p.evaluate(() => {
    const G = window.__game, P = G.player, H = window.__hf;
    const steps = H.PLATFORMS.filter(q => q.step).map(q => ({ q, up: q.y - H.terrainHeight(q.x, q.z) })).filter(s => s.up > 0.1 && s.up < 0.35).slice(0, 8);
    const inp = { move: { x: 0, y: 1 }, run: false, consume: () => false, look: { dx: 0, dy: 0 } };
    return steps.map(({ q, up }) => {
      // desde 2,5 m por delante (fuera de la casa) hacia el centro del escalón
      const fx = q.x + q.s * 2.5, fz = q.z + q.c * 2.5;
      P.place(fx, fz, Math.atan2(q.x - fx, q.z - fz)); let best = 1e9, top = -9;
      for (let k = 0; k < 120; k++) { const camYaw = Math.atan2(-(q.x - P.pos.x), -(q.z - P.pos.z)); P.update(1 / 30, inp, camYaw); const d = Math.hypot(q.x - P.pos.x, q.z - P.pos.z); if (d < best) { best = d; top = P.pos.y - q.y; } if (d < 0.2) break; }
      return { alto: +up.toFixed(2), llega: +best.toFixed(2), pies: +top.toFixed(2) };
    });
  });
  console.log(town, JSON.stringify(r), errs.length ? errs[0] : '');
  await p.close();
}
await b.close();
