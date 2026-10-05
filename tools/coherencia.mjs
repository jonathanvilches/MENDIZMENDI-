// Comprobación de coherencia del trazado de cada pueblo: calles, casas y monumentos que caen dentro del río, iglesia
// junto al agua, puentes. Opcionalmente guarda el mapa del pueblo (SHOTS=carpeta). Uso: node tools/coherencia.mjs [pueblos|all]
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const arg = process.argv[2] || 'all';
const ids = arg === 'all' ? [...readFileSync('src/data/levels.js', 'utf8').matchAll(/^\s*\{ id: '([^']+)'/gm)].map(m => m[1]).filter(id => id !== 'otsagabia-ochagavia') : arg.split(',');
const shots = process.env.SHOTS; if (shots) mkdirSync(shots, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const id of ids) {
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })); } catch (e) {} });
  const t0 = Date.now();
  try {
    await p.goto(`${URL}/?town=${id}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
    const r = await p.evaluate(() => {
      const L = window.__layout, T = window.__TOWN, G = window.__game, def = G.def;
      const ri = (x, z) => L.riverInfo(x, z);
      const bridgeIds = new Set(L.BRIDGES.map(b => b.id));
      let street = 0, streetIds = new Set();
      for (const pth of L.PATHS) {
        if (['overRiver', 'beyond'].includes(pth.id) || /^br/.test(pth.id)) continue;
        for (const [x, z] of pth.pts) if (ri(x, z).edge < 0) { street++; streetIds.add(pth.id); }
      }
      const houses = T.houses.filter(h => ri(h.x, h.z).edge < Math.max(h.w, h.d) / 2).length;
      const lms = T.landmarks.filter(l => !['bridge', 'raft', 'gorge', 'mill'].includes(l.kind)).map(l => ({ k: l.kind, e: +ri(l.x, l.z).edge.toFixed(1) })).filter(l => l.e < 4);
      const ch = T.church ? +ri(T.church.x, T.church.z).edge.toFixed(1) : null;
      const far = T.landmarks.map(l => ({ k: l.kind, d: Math.hypot(l.x - L.PLACES.plaza.x, l.z - L.PLACES.plaza.z) | 0 }));
      return { river: def.river?.name || '-', R: L.MOD?.R, bridges: L.BRIDGES.length, street, streetIds: [...streetIds], houses, lms, church: ch, nHouses: T.houses.length, far };
    });
    console.log(`${id.padEnd(22)} río ${r.river.padEnd(18)} R ${String(r.R).padEnd(4)} puentes ${r.bridges} | calles en el río: ${r.street}${r.streetIds.length ? ' (' + r.streetIds.join(',') + ')' : ''} | casas en el río: ${r.houses}/${r.nHouses} | monumentos en el río: ${JSON.stringify(r.lms)} | iglesia-río ${r.church} | ${((Date.now() - t0) / 1000).toFixed(0)} s${errs.length ? ' | ERR ' + errs.join(' ; ') : ''}`);
    console.log(`   monumentos (distancia a la plaza): ${r.far.map(f => f.k + ' ' + f.d).join(', ')}`);
    if (shots) {
      await p.waitForTimeout(1500);
      await p.evaluate(() => window.__game.ui.openMap());
      await p.waitForTimeout(2500);
      await p.screenshot({ path: `${shots}/${id}-mapa.png`, timeout: 120000 });
    }
  } catch (e) { console.log(`${id} FALLO ${String(e.message).slice(0, 160)} ${errs.join(' ; ')}`); }
  await p.close();
}
await b.close();
