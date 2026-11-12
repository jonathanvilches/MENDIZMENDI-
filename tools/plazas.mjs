// Revisión de las plazas de todos los pueblos (noviembre de 2026, tras la plaza de Roncal al borde del Esca): que la plaza
// esté llana y no llegue al agua, que el pie de la fuente sea llano y que los puestos del mercado, quien vende, la tienda y
// quien da las misiones estén en suelo llano y seco. Una línea JSON por pueblo, una captura desde arriba de cada plaza y,
// al final, la lista de los que fallan.
// Uso: node tools/plazas.mjs <carpeta> [pueblo,pueblo,…]   (sin lista, todos; BASE=http://127.0.0.1:8099/ para la web compilada)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [,, out = 'entrega/plazas', lista = ''] = process.argv;
const BASE = process.env.BASE || 'http://127.0.0.1:5173/';
const towns = lista ? lista.split(',') : [...fs.readFileSync(new URL('../src/data/levels.js', import.meta.url), 'utf8').matchAll(/^ {2}\{ id: '([a-z0-9-]+)', name:/gm)].map(m => m[1]).filter(t => t !== 'otsagabia-ochagavia');
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const res = [];
for (const town of towns) {
  const p = await b.newPage({ viewport: { width: 1000, height: 560 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, comoJugar: true } })); });
  try {
    await p.goto(`${BASE}?town=${town}&q=low&weather=clear&skipintro=1&t=12&market=1`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game?.mode === 'play' && window.__rt?.active, null, { timeout: 400000 });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const L = window.__layout, HF = window.__hf, g = window.__game, c = L.PLACES.plaza;
      // (el terreno, sin escalinatas ni tarimas: el kiosco de Pamplona contaba como cuesta)
      const T = (x, z) => HF.terrainHeight(x, z), G = (x, z) => HF.groundHeight(x, z), wet = (x, z) => HF.waterLevelAt(x, z) > G(x, z) - 0.1;
      let n = 0, rio = 1e9, empinadas = 0, mojadas = 0;
      for (let x = c.x - 60; x <= c.x + 60; x += 1) for (let z = c.z - 60; z <= c.z + 60; z += 1) {
        if (L.plazaMask(x, z) < 0.5) continue; n++;
        const h = T(x, z); rio = Math.min(rio, L.riverInfo(x, z).edge);
        if (Math.max(Math.abs(T(x + 1, z) - h), Math.abs(T(x, z + 1) - h)) > 0.35) empinadas++;
        if (wet(x, z)) mojadas++;
      }
      const pie = (o, rr) => { if (!o) return null; let a = 1e9, bb = -1e9, w = false; for (let i = 0; i < 16; i++) for (const k of [0, 0.5, 1]) { const x = o.x + Math.cos(i / 16 * 6.283) * rr * k, z = o.z + Math.sin(i / 16 * 6.283) * rr * k, h = G(x, z); a = Math.min(a, h); bb = Math.max(bb, h); w ||= wet(x, z); } return { x: Math.round(o.x), z: Math.round(o.z), d: +(bb - a).toFixed(2), agua: w }; };
      const malos = (l, rr, lim) => l.map(o => pie(o, rr)).filter(q => q && (q.d > lim || q.agua));
      const hosts = (g.actors || []).filter(a => /^m[0-9]+$|^musico$|^pelotari$/.test(a.id || '')).map(a => a.pos);
      return { celdas: n, empinadas, mojadas, rio: +rio.toFixed(1), fuente: pie(c, 3.2), puestos: (g.mercado?.stalls || []).length,
        puestosMal: malos(g.mercado?.stalls || [], 1.5, 0.4), vendedoresMal: malos((g.mercado?.sellers || []).map(v => v.pos), 0.5, 0.4),
        tienda: pie(g.tienda?.pos, 1.6), anfitrionesMal: malos(hosts, 0.5, 0.45) };
    });
    r.town = town; r.errores = errs.slice(0, 3);
    r.mal = r.empinadas > 12 || r.mojadas > 0 || (r.fuente && (r.fuente.d > 0.25 || r.fuente.agua)) || r.puestosMal.length > 0 || r.vendedoresMal.length > 0 || (r.tienda && (r.tienda.d > 0.5 || r.tienda.agua)) || r.anfitrionesMal.length > 0 || r.errores.length > 0;
    console.log(JSON.stringify(r)); res.push(r);
    await p.evaluate(() => { const c = window.__layout.PLACES.plaza, cam = window.__rt.camera, y = window.__hf.groundHeight(c.x, c.z); document.querySelector('.rotulo')?.remove(); window.__game.ui.hudVisible?.(false); window.__rt.follow.update = () => {}; cam.position.set(c.x + 24, y + 22, c.z + 24); cam.lookAt(c.x, y, c.z); });
    await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}.png` });
  } catch (e) { console.log(JSON.stringify({ town, fallo: String(e.message || e).slice(0, 200) })); res.push({ town, mal: true }); }
  await p.close();
}
fs.writeFileSync(`${out}/resumen.json`, JSON.stringify(res, null, 1));
console.log('FIN', res.length, 'pueblos · fallan:', res.filter(r => r.mal).map(r => r.town).join(', ') || 'ninguno');
await b.close();
