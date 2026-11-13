// La lista de los pueblos del mapa con su centro y su radio (como lo calcula haceNucleo en mapa3d.js), para sus ortofotos
// (tools/relieve/ortofoto.py pueblos-bajar y pueblos-hacer). Con el servidor de desarrollo en marcha (puerto 5173):
//   node tools/relieve/pueblos-lista.mjs <lista.json>
import { chromium } from '../../node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const p = await b.newPage();
await p.goto('http://127.0.0.1:5173/src/hub/mapa3dFormas.js', { timeout: 120000 });
const r = await p.evaluate(async () => {
  const M = await import('/src/data/reales/index.js'), out = [];
  for (const id of M.MAPA_IDS) { const D = await M.loadMapa(id); if (!D?.casas) { out.push({ id, sin: true }); continue; }
    let R = 120; for (const c of D.casas) R = Math.max(R, Math.hypot(c.x, c.z) + Math.max(c.w, c.d) / 2);
    for (const s of D.calles) for (const [x, z] of s.pts) R = Math.max(R, Math.hypot(x, z));
    out.push({ id, lat: D.lat, lon: D.lon, R: Math.min(700, R + 20), casas: D.casas.length }); }
  return out;
});
fs.writeFileSync(process.argv[2], JSON.stringify(r)); console.log(r.length, r.filter(x => x.sin).length, JSON.stringify(r.slice(0, 3)), 'R', r.map(x => Math.round(x.R || 0)).join(' '));
await b.close();
