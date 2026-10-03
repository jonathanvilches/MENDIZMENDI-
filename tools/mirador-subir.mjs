// Subir al mirador de madera andando (como el jugador): desde el pie de la rampa, hacia la tarima; ¿llega arriba?
// Fotos desde la tarima. Uso: node tools/mirador-subir.mjs <carpeta> [pueblos separados por comas]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/mirador', list = 'etxalar,ujue'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of list.split(',')) {
  const p = await b.newPage({ viewport: { width: 844, height: 390 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
  const info = await p.evaluate(() => { const G = window.__game, v = G.miradorSpot(), lm = G.miradorDeck() || {}; G.player.place(v.x, v.z, Math.atan2(lm.x - v.x, lm.z - v.z)); G.follow.snap(G.player); return { spot: v, deck: { x: lm.x, z: lm.z } }; });
  if (!info.deck.x && info.deck.x !== 0) { console.log(town, 'sin datos del mirador', JSON.stringify(info)); }
  await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${town}-pie.png` });
  // andar hacia el centro de la tarima (dirigiendo el rumbo cada poco)
  let y0 = await p.evaluate(() => window.__game.player.pos.y);
  // andar con la física del personaje (adelante hacia el centro de la tarima), 6 s a 30 pasos por segundo
  const track = await p.evaluate((d) => { const G = window.__game, P = G.player, out = [];
    for (let i = 0; i < 180; i++) { const dx = d.x - P.pos.x, dz = d.z - P.pos.z; if (Math.hypot(dx, dz) < 0.4) break; const yaw = Math.atan2(-dx, -dz);
      P.update(1 / 30, { move: { x: 0, y: 1 }, run: false, consume: () => false }, yaw); if (i % 15 === 0) out.push([+P.pos.y.toFixed(2), +Math.hypot(dx, dz).toFixed(2)]); }
    G.follow.snap(P); return out; }, info.deck);
  console.log(town, 'subida (altura, distancia):', JSON.stringify(track));
  const r = await p.evaluate((d) => { const G = window.__game, P = G.player.pos; return { dist: Math.hypot(P.x - d.x, P.z - d.z).toFixed(2), y: P.y.toFixed(2) }; }, info.deck);
  console.log(town, 'al pie y', y0.toFixed(2), '→ arriba', JSON.stringify(r), errs.length ? 'ERRORES ' + errs[0] : '');
  await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${town}-arriba.png` });
  await p.close();
}
await b.close();
