// Montes vistos con los prismáticos desde el mirador del pueblo: una foto hacia cada monte de la misión.
// Uso: node tools/catalejo.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'isaba-izaba', out = '/tmp/claude-0/catalejo'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, gear: ['prismaticos'], bag: { agua: 2, food: {}, items: ['prismaticos'] } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=high&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
const montes = await p.evaluate(() => {
  const G = window.__game, M = G.missions.find(M => M.type === 'mirador'); if (!M) return null;
  M.step = 1; G.binoOn = true; const s = G.miradorSpot(); G.player.place(s.x, s.z, 0); G.toggleBinoculars();
  return M.montes.map(m => ({ name: m.name, bearing: m.bearing, km: Math.round(m.km), alt: m.altitude }));
});
console.log(town, JSON.stringify(montes));
if (montes) for (const [i, m] of montes.entries()) {
  await p.evaluate((b) => { const G = window.__game; G.binoYaw = Math.PI - b * Math.PI / 180; G.binoPitch = 0.02; }, m.bearing);
  for (let k = 0; k < 3; k++) { await p.waitForTimeout(1500); }
  await p.screenshot({ path: `${out}/${town}-${i}.png` });
}
// y una vista normal desde el mirador (sin prismáticos)
await p.evaluate(() => { const G = window.__game; G.toggleBinoculars(); });
await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/${town}-normal.png` });
console.log(errs.length ? 'ERRORES ' + errs.slice(0, 3).join(' | ') : 'sin errores');
await b.close();
