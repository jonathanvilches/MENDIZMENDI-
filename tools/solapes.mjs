// Revisión de solapes en todos los pueblos: cosas que han quedado donde no deben tras mover pueblos, plazas o
// frontones (el árbol en medio del frontón de Tafalla):
//  · árboles dentro de canchas y tarimas (frontón, pista de fútbol sala, miradores…)
//  · árboles dentro de edificios o muros, o en mitad de una calle o camino
//  · farolas, fuentes o bancos metidos en una casa
//  · objetos con choque (fuentes, bancos, farolas…) dentro de la cancha del frontón o de la pista
//  · plantas de la flora y puestos del mercado en una cancha, dentro de un edificio o en mitad de un camino
//  · la tienda del pueblo en mitad de una calle o dentro de un edificio
//  · personajes de las misiones metidos en un edificio
//  · frontón o pista encima de un camino (y a qué distancia de la plaza han quedado)
// Uso: node tools/solapes.mjs [pueblos separados por comas | todos] [calidad] [en paralelo]
//      (URL=http://127.0.0.1:5174 por defecto; conviene un servidor recién arrancado para que los módulos sean los mismos)
import { chromium } from 'playwright-core';
import { readFileSync } from 'fs';
const [,, only = 'todos', q = 'low', par = '2'] = process.argv;
const BASE = (process.env.URL || 'http://127.0.0.1:5174').replace(/\/$/, '');
const all = [...readFileSync(new URL('../src/data/levels.js', import.meta.url), 'utf8').matchAll(/\{ id: '([a-z-]+)'/g)].map(m => m[1]).filter(t => t !== 'otsagabia-ochagavia');
const towns = only === 'todos' ? all : only.split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
async function check(town) {
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  // cada obstáculo apunta quién lo ha puesto (para no confundir las columnas de un pórtico con una farola mal puesta)
  await p.route(/\/src\/world\/colliders\.js/, async (route) => {
    const r = await route.fetch(), t = (await r.text()).replace('function insert(c, x, z, r) {', "function insert(c, x, z, r) { c.at = new Error().stack.split('\\n').slice(3, 6).join(' ');");
    await route.fulfill({ response: r, body: t });
  });
  await p.addInitScript((q) => { try { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: q } })); } catch (e) { } }, q);
  try {
    await p.goto(`${BASE}/?town=${town}&q=${q}&weather=clear&skipintro=1`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
    await p.waitForTimeout(800);
    const r = await p.evaluate(async () => {
      const [nat, hf, col, lay, TB] = await Promise.all([import('/src/world/nature.js'), import('/src/world/heightfield.js'), import('/src/world/colliders.js'), import('/src/world/layout.js'), import('/src/world/townBuilder.js')]);
      const G = window.__game, TREES = nat.TREES, PL = hf.PLATFORMS, COL = col.COLLIDERS, out = [];
      const local = (x, z, p) => { const dx = x - p.x, dz = z - p.z; return [dx * p.c - dz * p.s, dx * p.s + dz * p.c]; };
      const inPlat = (x, z, p, m) => { const [lx, lz] = local(x, z, p); return lx > p.x0 - m && lx < p.x1 + m && lz > p.z0 - m && lz < p.z1 + m; };
      const inBox = (x, z, c, m) => { const dx = x - c.x, dz = z - c.z, lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos; return Math.abs(lx) < c.hw + m && Math.abs(lz) < c.hd + m; };
      // qué es cada tarima
      const near = (a, b) => a && Math.hypot(a.x - b.x, a.z - b.z) < 0.5;
      const what = (p) => near(G.fronton?.spot, p) ? 'frontón' : near(G.pista?.spot, p) ? 'pista' : 'tarima';
      const f = (v) => v.toFixed(0);
      // 1) árboles en canchas y tarimas (el tronco dentro, o la copa encima del borde)
      for (const t of TREES) for (const p of PL) if (inPlat(t.x, t.z, p, 0.6 + 0.6 * t.s)) out.push(['árbol en ' + what(p), `${t.type}${t.special ? ' (especial)' : ''} en ${f(t.x)},${f(t.z)}`]);
      // 2) árboles dentro de edificios o muros, y en mitad de calles y caminos
      const boxes = COL.filter(c => c.type === 'box' && !c.tree);
      for (const t of TREES) {
        if (boxes.some(c => inBox(t.x, t.z, c, 0.15))) out.push(['árbol dentro de un edificio o muro', `${t.type} en ${f(t.x)},${f(t.z)}`]);
        const pq = lay.pathQuery?.(t.x, t.z); if (pq && pq.d < pq.w * 0.85) out.push(['árbol en una calle o camino', `${t.type} en ${f(t.x)},${f(t.z)} (${pq.type || 'camino'})`]);
      }
      // 2b) farolas, fuentes, bancos… (obstáculos redondos) metidos dentro de una casa: se mira solo la planta de las casas
      // y lo que queda a más de 1,2 m de su borde (las columnas de los soportales van en el borde, y están bien)
      const houses = (TB.TOWN?.houses || []).filter(h => h.w && h.d).map(h => ({ x: h.x, z: h.z, hw: h.w / 2, hd: h.d / 2, cos: Math.cos(h.ry || 0), sin: Math.sin(h.ry || 0) }));
      const arq = /(pamplona|pamplonaOut|monuments|landmarks|houses|castle)\.js/;   // (arquitectura: sus columnas y pilares)
      for (const c of COL) if (c.type === 'circle' && !c.tree && !c.mover && !arq.test(c.at || '') && houses.some(b => inBox(c.x, c.z, b, -1.2))) out.push(['objeto dentro de una casa', `círculo r${c.r.toFixed(1)} en ${f(c.x)},${f(c.z)} (${(c.at || '').match(/at (\w+)/)?.[1] || '?'})`]);
      // 3) objetos con choque dentro de la cancha del frontón o de la pista (sin contar sus propias paredes)
      const own = new Set();
      if (G.fronton) for (const bx of G.fronton.court.boxes) { const w = G.fronton.toWorld(bx.x, bx.z); for (const c of COL) if (Math.hypot(c.x - w.x, c.z - w.z) < 0.2) own.add(c); }
      if (G.pista) for (const bx of G.pista.boxes || []) { const w = G.pista.toWorld(bx.x, bx.z); for (const c of COL) if (Math.hypot(c.x - w.x, c.z - w.z) < 0.2) own.add(c); }   // (porterías y muretes de la pista)
      for (const p of PL) {
        const kind = what(p); if (kind === 'tarima') continue;
        const x1 = kind === 'frontón' ? p.x1 - 0.5 : p.x1;
        for (const c of COL) { if (c.tree || own.has(c) || c.mover) continue; const [lx, lz] = local(c.x, c.z, p); if (lx > p.x0 + 1 && lx < x1 - 1 && lz > p.z0 + 1 && lz < p.z1 - 1) out.push([`objeto dentro del ${kind}`, `${c.type} en ${f(c.x)},${f(c.z)}`]); }
        // 5) encima de un camino
        let onPath = 0, n = 0; for (let lx = p.x0; lx <= p.x1; lx += 2) for (let lz = p.z0; lz <= p.z1; lz += 2) { const X = p.x + lx * p.c + lz * p.s, Z = p.z - lx * p.s + lz * p.c, pq = lay.pathQuery?.(X, Z); n++; if (pq && pq.d < pq.w * 0.8) onPath++; }
        if (onPath > n * 0.04) out.push([`${kind} encima de un camino`, `${Math.round(100 * onPath / n)} % de su suelo`]);
      }
      // 1b) flora de la comarca y puestos del mercado: ni en canchas ni dentro de edificios
      for (const fl of G.flora?.list || []) {
        for (const p of PL) if (inPlat(fl.x, fl.z, p, fl.big ? 1.5 : 0.5)) out.push([(fl.big ? 'árbol' : 'planta') + ' de la flora en ' + what(p), `${fl.id} en ${f(fl.x)},${f(fl.z)}`]);
        if (boxes.some(c => inBox(fl.x, fl.z, c, 0.2))) out.push(['flora dentro de un edificio o muro', `${fl.id} en ${f(fl.x)},${f(fl.z)}`]);
        const pq = lay.pathQuery?.(fl.x, fl.z); if (pq && pq.d < pq.w * 0.85) out.push(['flora en una calle o camino', `${fl.id} en ${f(fl.x)},${f(fl.z)}`]);
      }
      for (const st of G.mercado?.stalls || []) for (const p of PL) if (inPlat(st.x, st.z, p, 1.5)) out.push(['puesto del mercado en ' + what(p), `${f(st.x)},${f(st.z)}`]);
      // la tienda del pueblo: ni en mitad de una calle (la taparía) ni dentro de un edificio
      if (G.tienda?.pos) { const t = G.tienda.pos, pq = lay.pathQuery?.(t.x, t.z); if (pq && pq.d < pq.w * 0.7) out.push(['tienda en mitad de una calle', `${f(t.x)},${f(t.z)} (${pq.type})`]); if (boxes.some(c => Math.hypot(c.x - t.x, c.z - t.z) > 0.3 && inBox(t.x, t.z, c, 0))) out.push(['tienda dentro de un edificio', `${f(t.x)},${f(t.z)}`]); }
      // 4) personajes de las misiones dentro de un edificio
      for (const a of G.actors || []) {
        if (!a.mission) continue; const o = a.root || a.group || a.obj; const x = o?.position?.x ?? a.x, z = o?.position?.z ?? a.z;
        if (boxes.some(c => inBox(x, z, c, -0.1))) out.push(['personaje de misión dentro de un edificio', `${a.name} en ${f(x)},${f(z)}`]);
      }
      // a qué distancia de la plaza han quedado el frontón y la pista (para ver si alguno se ha ido demasiado lejos)
      const P0 = lay.PLACES.frontonNear || lay.PLACES.plaza, dist = (o, c = lay.PLACES.plaza) => o ? Math.round(Math.hypot(o.spot.x - c.x, o.spot.z - c.z)) + ' m' : 'no';
      return { trees: TREES.length, plataformas: PL.map(what), out, lejos: `frontón a ${dist(G.fronton, P0)}, pista a ${dist(G.pista)}` };
    });
    results.push({ town, ...r, errs });
  } catch (e) { results.push({ town, error: e.message.split('\n')[0], errs }); }
  await p.close();
}
const queue = towns.slice();
await Promise.all(Array.from({ length: +par }, async () => { while (queue.length) await check(queue.shift()); }));
await b.close();
let total = 0;
for (const r of results.sort((a, b) => a.town.localeCompare(b.town))) {
  if (r.error) { console.log(`${r.town}: NO SE PUDO REVISAR (${r.error})`); continue; }
  const groups = new Map(); for (const [k, v] of r.out) { if (!groups.has(k)) groups.set(k, []); groups.get(k).push(v); }
  total += r.out.length;
  console.log(`${r.town}: ${r.out.length ? r.out.length + ' solapes' : 'sin solapes'} · ${r.trees} árboles · ${r.plataformas.join(', ') || 'sin tarimas'} · ${r.lejos}${r.errs.length ? ' · errores: ' + r.errs.slice(0, 2).join(' | ') : ''}`);
  for (const [k, l] of groups) console.log(`   ${k}: ${l.length} (${l.slice(0, 4).join('; ')}${l.length > 4 ? '…' : ''})`);
}
console.log(`TOTAL: ${total} solapes en ${results.length} pueblos`);
