// Puntos de interés de cada pueblo, medidos: ¿desde cualquier sitio por donde se anda se ve algo a lo lejos que apetece
// alcanzar?, ¿cuánto hay que andar por paisaje vacío?, ¿cuánto distan los puntos entre sí?, ¿hay retos de las tres escalas?
//   node tools/puntos-interes.mjs <salida.json> [pueblos,separados,por,comas | todos]   (BASE: la web compilada, 8099)
// Qué cuenta como punto de interés: lo que el mapa del pueblo rotula (iglesia, monumentos, granja, campos, frontón), los
// vecinos que dan misión y lo que añade la aventura de cada pueblo: su atalaya y sus kutxas (game.puntosInteres()).
// Las kutxas están escondidas (solo se ven de cerca): cuentan para no dejar paisaje vacío, no como algo visto de lejos.
// Cómo se mide:
//  · Muestras: una rejilla de 20 m por todo lo que se puede pisar (ni agua honda ni dentro de una casa) hasta 260 m de la
//    plaza, a 1,6 m del suelo.
//  · Visible a lo lejos: un punto a 60 m o más con la línea de vista libre, contando el relieve y las casas (8 m de alto;
//    la iglesia, las torres y los castillos, 18 m de alto, asoman por encima).
//  · Vacío: lo que se tarda andando (3,3 m/s) desde cada muestra hasta el punto más cercano. No más de 60 s.
//  · Escalas: grande (iglesia, castillo, torre, palacio, monte), mediana (ermita, dolmen, cueva, puente, monumento) y
//    pequeña (tesoro, fuente, granja y lo demás).
// Pasa si: el 85 % de las muestras ve algo a lo lejos, ninguna queda a más de 60 s y hay puntos de las tres escalas.
import { chromium } from 'playwright-core';
import { writeFileSync, readFileSync } from 'node:fs';
const [, , out = 'entrega/puntos-interes.json', lista = 'lesaka'] = process.argv;
const BASE = process.env.BASE || 'http://127.0.0.1:8099/';
const todos = () => [...readFileSync(new URL('../src/data/levels.js', import.meta.url), 'utf8').matchAll(/\{ id: '([a-z0-9-]+)', name:/g)].map(m => m[1]);
const pueblos = lista === 'todos' ? todos() : lista.split(',');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const R = { cuando: new Date().toISOString(), base: BASE, pueblos: {} }; let fallan = 0;
for (const town of pueblos) {
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }), errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
  await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pastor', seen: { heroBenat: true, dog: true }, dogOn: false })); });
  try {
    await p.goto(`${BASE}?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 });
    // (la aventura del pueblo, con su atalaya y sus kutxas, se monta en el primer fotograma de juego)
    await p.waitForFunction(() => !window.__game.aventuraInicia || window.__game.av, null, { timeout: 60000 }).catch(() => { });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const G = window.__game, hf = window.__hf, L = window.__layout, pl = L.PLACES.plaza;
      const GRANDE = /church|castle|tower|palace|peak|mountain|fort|wall|cathedral|monastery/i, MEDIA = /chapel|hermit|dolmen|cave|bridge|monument|cross|mill|menhir|statue|fountain2|arch|pelota/i;
      const pts = [];
      for (const l of (G.mapLabels ? G.mapLabels() : [])) if (l.icon) pts.push({ x: l.x, z: l.z, n: l.label, k: l.icon, e: GRANDE.test(l.icon) ? 'grande' : MEDIA.test(l.icon) ? 'mediana' : 'pequeña' });
      for (const M of (G.missions || [])) { const h = M.host?.pos; if (h && !pts.some(q => Math.hypot(q.x - h.x, q.z - h.z) < 12)) pts.push({ x: h.x, z: h.z, n: M.m?.title || 'misión', k: 'mision', e: 'pequeña' }); }
      for (const q of (G.puntosInteres ? G.puntosInteres() : [])) if (!pts.some(o => Math.hypot(o.x - q.x, o.z - q.z) < 6)) pts.push({ x: q.x, z: q.z, n: q.n, k: q.k, e: q.e || 'pequeña', alto: q.alto, oculto: !!q.oculto });
      for (const q of pts) { q.y = hf.groundHeight(q.x, q.z); q.alto = q.alto || (q.e === 'grande' ? 18 : q.e === 'mediana' ? 6 : 2.5); }
      // ¿se ve b desde a? (el relieve, y las casas con 8 m de alto; los árboles no tapan del todo y no cuentan)
      const C = window.__colliders;
      const tapa = (x, z) => { if (!C) return false; for (const c of C.nearby(x, z, 2)) { if (c.tree || c.mover || c.vine) continue; if (c.type === 'circle') { if (c.r > 1.5 && Math.hypot(x - c.x, z - c.z) < c.r) return true; } else { const dx = x - c.x, dz = z - c.z, lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos; if (Math.abs(lx) < c.hw && Math.abs(lz) < c.hd && Math.min(c.hw, c.hd) > 1.5) return true; } } return false; };
      const ve = (ax, ay, az, q) => { const d = Math.hypot(q.x - ax, q.z - az), n = Math.max(2, Math.ceil(d / 3)), by = q.y + q.alto; for (let i = 1; i < n; i++) { const t = i / n, x = ax + (q.x - ax) * t, z = az + (q.z - az) * t, y = ay + (by - ay) * t, g = hf.groundHeight(x, z); if (g > y + 0.3) return false; if (d * (1 - t) > 9 && y < g + 8 && tapa(x, z)) return false; } return true; };
      const R = 260, paso = 20, muestras = []; let ven = 0, peor = 0, peorEn = null, suma = 0;
      for (let x = pl.x - R; x <= pl.x + R; x += paso) for (let z = pl.z - R; z <= pl.z + R; z += paso) {
        if (Math.hypot(x - pl.x, z - pl.z) > R) continue;
        const g = hf.groundHeight(x, z), w = hf.waterLevelAt(x, z) - g; if (w > 0.9 || tapa(x, z)) continue;
        if (L.BOUNDARY && Math.pow(x ** 4 + z ** 4, 0.25) > L.BOUNDARY) continue;
        let cerca = 1e9, lejosVisto = false;
        for (const q of pts) { const d = Math.hypot(q.x - x, q.z - z); if (d < cerca) cerca = d; if (!lejosVisto && !q.oculto && d >= 60 && d < 900 && ve(x, g + 1.6, z, q)) lejosVisto = true; }   // (lo escondido, las kutxas, no cuenta como visto de lejos: solo llena el paseo)
        if (lejosVisto) ven++; suma += cerca; if (cerca > peor) { peor = cerca; peorEn = { x: Math.round(x), z: Math.round(z) }; }
        muestras.push(lejosVisto ? 1 : 0);
      }
      const entre = pts.map(a => Math.min(...pts.filter(o => o !== a).map(o => Math.hypot(o.x - a.x, o.z - a.z))));
      const esc = { grande: 0, mediana: 0, pequeña: 0 }; for (const q of pts) esc[q.e]++;
      const n = muestras.length || 1;
      return { puntos: pts.length, escalas: esc, muestras: n, venLejos: +(ven / n * 100).toFixed(1), vacioMaxS: +(peor / 3.3).toFixed(0), vacioMedioS: +(suma / n / 3.3).toFixed(0), peorEn, entreMedia: +(entre.reduce((a, c) => a + c, 0) / (entre.length || 1)).toFixed(0), entreMax: +Math.max(0, ...entre).toFixed(0), colisiones: !!C };
    });
    r.pasa = r.venLejos >= 85 && r.vacioMaxS <= 60 && r.escalas.grande > 0 && r.escalas.mediana > 0 && r.escalas.pequeña > 0;
    r.errores = errs; R.pueblos[town] = r; if (!r.pasa) fallan++;
    console.log(town.padEnd(24), r.pasa ? 'PASA ' : 'FALLA', `puntos ${r.puntos} (${r.escalas.grande}/${r.escalas.mediana}/${r.escalas.pequeña})  ven lejos ${r.venLejos} %  vacío máx ${r.vacioMaxS} s, medio ${r.vacioMedioS} s  entre puntos ${r.entreMedia} m (máx ${r.entreMax})`);
  } catch (e) { R.pueblos[town] = { error: e.message.slice(0, 120) }; fallan++; console.log(town, 'ERROR', e.message.slice(0, 120)); }
  await p.close();
}
R.fallan = fallan; writeFileSync(out, JSON.stringify(R, null, 1));
await b.close(); process.exit(fallan ? 1 : 0);
