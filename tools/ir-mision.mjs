// «Empezar la misión»: en el libro de misiones del pueblo, cada misión lleva su botón; al pulsarlo, el personaje aparece
// junto al vecino que la da, mirándole, y la misión queda seguida. Comprueba la distancia al vecino tras cada viaje, que
// el libro se cierra y que no hay errores; con OUT=carpeta, capturas del libro y de la llegada.
// Uso: node tools/ir-mision.mjs [pueblo]
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
const [,, town = 'lesaka'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript(() => { localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true, comoJugar: true }, settings: { quality: 'low' } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.waitForTimeout(2500);
const res = [];
const n = await p.evaluate(() => window.__game.missions.length);
for (let i = 0; i < Math.min(n, 4); i++) {
  await p.evaluate(() => { document.getElementById('hub')?.classList.add('hidden'); window.__game.ui.openTownBook('misiones'); });
  await p.waitForTimeout(600);
  if (i === 0 && process.env.OUT) await p.screenshot({ path: `${process.env.OUT}/libro-misiones.png` });
  const ok = await p.evaluate((i) => { const b = document.querySelector(`[data-go="${i}"]`); b?.click(); return !!b; }, i);
  await p.waitForTimeout(1800);
  const r = await p.evaluate((i) => { const G = window.__game, M = G.missions[i], P = G.player.pos, h = M.host.pos; return { mision: M.title, boton: true, dist: +Math.hypot(P.x - h.x, P.z - h.z).toFixed(1), seguida: G.tracked === i, libroAbierto: !!document.querySelector('.qlist') }; }, i);
  r.boton = ok; res.push(r);
  if (i === 0 && process.env.OUT) { await p.waitForTimeout(2500); await p.screenshot({ path: `${process.env.OUT}/llegada-mision.png` }); }
}
console.log(JSON.stringify(res, null, 1));
const mal = res.filter(r => !r.boton || r.dist > 4 || !r.seguida || r.libroAbierto);
console.log('errores', errs.length ? errs : 'ninguno'); console.log(mal.length || errs.length ? 'MAL' : 'Todo correcto');
await b.close();
