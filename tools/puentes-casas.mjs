// Revisión de los puentes y las casas de todos los pueblos con trazado de verdad (noviembre de 2026): puentes con los dos
// extremos en tierra, agua debajo, un tablero sin cuestas imposibles y nada encima; calles que cruzan el agua sin puente;
// casas en el agua, atravesadas por una calle, metidas en otra casa, sobre un puente o en la plaza, y casas junto a una
// calle torcidas respecto a ella, en mucha cuesta o lejos de toda calle; y puentes que salen contra una casa. Una línea JSON por pueblo y capturas de lo peor.
// Uso: node tools/puentes-casas.mjs <carpeta> [pueblo,pueblo,…]   (BASE=http://127.0.0.1:8099/ para la web compilada)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [,, out = 'entrega/puentes-casas', lista = ''] = process.argv;
const BASE = process.env.BASE || 'http://127.0.0.1:5173/';
const towns = lista ? lista.split(',') : fs.readdirSync(new URL('../src/data/reales/', import.meta.url)).filter(f => f.endsWith('.json') && f !== 'emblemas.json').map(f => f.slice(0, -5));
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const res = [];
for (const town of towns) {
  const p = await b.newPage({ viewport: { width: 1000, height: 560 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, comoJugar: true } })); });
  try {
    await p.goto(`${BASE}?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
    await p.waitForFunction(() => window.__game?.mode === 'play' && window.__rt?.active, null, { timeout: 400000 });
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => {
      const L = window.__layout, HF = window.__hf, R = L.MOD?.real; if (!R) return { sinDatos: true };
      const T = (x, z) => HF.terrainHeight(x, z), G = (x, z) => HF.groundHeight(x, z), E = (x, z) => L.riverInfo(x, z);
      const C = window.__colliders?.COLLIDERS || [];
      // --- casas que se levantan (como realHouses: ni la iglesia, ni las cogidas por un lugar, ni las diminutas)
      const casas = R.casas.filter(c => !R.taken.has(c) && c.k !== 'church' && c.a >= 9 && c !== L.PLACES.church?.real);
      const loc = (c, lx, lz) => ({ x: c.x + lx * Math.cos(c.ry) + lz * Math.sin(c.ry), z: c.z - lx * Math.sin(c.ry) + lz * Math.cos(c.ry) });
      const dentro = (c, x, z, m = 0) => { const dx = x - c.x, dz = z - c.z, lx = dx * Math.cos(c.ry) - dz * Math.sin(c.ry), lz = dx * Math.sin(c.ry) + dz * Math.cos(c.ry); return Math.abs(lx) < c.w / 2 - m && Math.abs(lz) < c.d / 2 - m; };
      const puntos = (c, n = 3, m = 0.6) => { const o = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) o.push(loc(c, (-0.5 + (i + 0.5) / n) * (c.w - 2 * m), (-0.5 + (j + 0.5) / n) * (c.d - 2 * m))); return o; };
      // segmentos de calle, para la dirección de la calle junto a una casa
      const segs = []; for (const P of L.PATHS || []) for (let i = 1; i < P.pts.length; i++) segs.push([P.pts[i - 1], P.pts[i], P.w || 2]);
      const calleCerca = (x, z) => { let best = null, bd = 1e9; for (const [a, bb, w] of segs) { const vx = bb[0] - a[0], vz = bb[1] - a[1], l2 = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2)), d = Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t) - w; if (d < bd) { bd = d; best = Math.atan2(vx, vz); } } return { d: bd, ang: best }; };
      const malas = { agua: [], calle: [], solape: [], plaza: [], torcida: [], puente: [], cuesta: [], aislada: [] };
      const puentesHechos = R.puentes.filter(P => P.hecho && P.pts.length > 1);
      const enPuente = (x, z, m = 0.5) => puentesHechos.some(P => { for (let i = 1; i < P.pts.length; i++) { const a = P.pts[i - 1], bb = P.pts[i], vx = bb[0] - a[0], vz = bb[1] - a[1], l2 = vx * vx + vz * vz || 1, t = ((x - a[0]) * vx + (z - a[1]) * vz) / l2; if (t < 0 || t > 1) continue; if (Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t) < P.w + 0.5 + m) return true; } return false; });
      for (let k = 0; k < casas.length; k++) {
        const c = casas[k], pts = puntos(c), q = { x: Math.round(c.x), z: Math.round(c.z), w: +c.w.toFixed(1), d: +c.d.toFixed(1) };
        if (pts.some(o => E(o.x, o.z).edge < 0.3)) malas.agua.push(q);
        { const hs = puntos(c, 3, 0).map(o => T(o.x, o.z)), dz = Math.max(...hs) - Math.min(...hs); if (dz > 2.5) malas.cuesta.push({ ...q, desnivel: +dz.toFixed(1) }); }
        { const pq = L.pathQuery(c.x, c.z); if (pq.d - (pq.w || 0) - Math.max(c.w, c.d) / 2 > 25) malas.aislada.push({ ...q, lejos: Math.round(pq.d) }); }
        const enCalle = pts.filter(o => { const pq = L.pathQuery(o.x, o.z); return pq.d < pq.w - 0.4; }).length;
        if (enCalle >= 2) malas.calle.push({ ...q, n: enCalle });
        if (L.plazaMask(c.x, c.z) > 0.5) malas.plaza.push(q);
        if (pts.some(o => enPuente(o.x, o.z, 0))) malas.puente.push(q);
        for (let j = k + 1; j < casas.length; j++) { const o = casas[j]; if (Math.abs(o.x - c.x) > 16 || Math.abs(o.z - c.z) > 16) continue; const n = pts.filter(s => dentro(o, s.x, s.z, 0.4)).length; if (n >= 2) malas.solape.push({ ...q, con: [Math.round(o.x), Math.round(o.z)], n }); }
        const cc = calleCerca(c.x, c.z);
        if (cc.d < Math.max(c.w, c.d) / 2 + 1.5 && cc.ang != null) { let a = Math.abs(((c.ry - cc.ang) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2)); a = Math.min(a, Math.PI / 2 - a) * 180 / Math.PI; if (a > 25) malas.torcida.push({ ...q, grados: Math.round(a) }); }
      }
      // --- puentes
      const puentes = [];
      for (const P of puentesHechos) {
        const cum = [0]; for (let i = 1; i < P.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(P.pts[i][0] - P.pts[i - 1][0], P.pts[i][1] - P.pts[i - 1][1]));
        const Ln = cum[cum.length - 1], at = (s) => { let i = 1; while (i < P.pts.length - 1 && cum[i] < s) i++; const a = P.pts[i - 1], bb = P.pts[i], t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return { x: a[0] + (bb[0] - a[0]) * t, z: a[1] + (bb[1] - a[1]) * t, tx: (bb[0] - a[0]) / ((cum[i] - cum[i - 1]) || 1), tz: (bb[1] - a[1]) / ((cum[i] - cum[i - 1]) || 1) }; };
        let agua = 0, minLibre = 1e9, cuesta = 0, prev = null;
        for (let s = 0; s <= Ln; s += 0.5) { const o = at(s), e = E(o.x, o.z), g = G(o.x, o.z); if (e.edge < 0) { agua++; minLibre = Math.min(minLibre, g - e.level); } if (prev != null) cuesta = Math.max(cuesta, Math.abs(g - prev) / 0.5); prev = g; }
        const a0 = at(0), a1 = at(Ln), e0 = E(a0.x, a0.z).edge, e1 = E(a1.x, a1.z).edge;
        // el escalón al subir: el suelo a 1,5 m fuera de cada extremo frente al tablero en el extremo
        const fuera = (o, sg) => ({ x: o.x - sg * o.tx * 1.5, z: o.z - sg * o.tz * 1.5 });
        const f0 = fuera(a0, 1), f1 = fuera(a1, -1), esc0 = Math.abs(G(a0.x, a0.z) - T(f0.x, f0.z)), esc1 = Math.abs(G(a1.x, a1.z) - T(f1.x, f1.z));
        // (lo que hay al salir del puente: una casa justo delante de una punta)
        const salida = [[a0, -1], [a1, 1]].some(([o, sg]) => [1, 2].some(d => casas.some(c => dentro(c, o.x + sg * o.tx * d, o.z + sg * o.tz * d, 0))));
        const casasEncima = casas.filter(c => { for (let s = 0; s <= Ln; s += 1) { const o = at(s); if (dentro(c, o.x, o.z, -(P.w + 0.4))) return true; } return false; }).length;
        const q = { n: P.n || null, x: Math.round((a0.x + a1.x) / 2), z: Math.round((a0.z + a1.z) / 2), largo: Math.round(Ln), ancho: +(2 * P.w).toFixed(1), aguaM: agua / 2, libre: minLibre < 1e8 ? +minLibre.toFixed(1) : null, cuesta: +cuesta.toFixed(2), extremos: [+e0.toFixed(1), +e1.toFixed(1)], escalon: [+esc0.toFixed(2), +esc1.toFixed(2)], casasEncima, salida };
        q.mal = [agua === 0 && 'sin agua debajo', (e0 < 1 || e1 < 1) && agua > 0 && 'un extremo en el agua', cuesta > 0.45 && 'cuesta', (esc0 > 0.5 || esc1 > 0.5) && 'escalón al subir', q.libre != null && q.libre < 0.8 && 'tablero pegado al agua', casasEncima > 0 && 'casa encima', salida && 'sale contra una casa'].filter(Boolean);
        puentes.push(q);
      }
      // --- calles que van por el agua sin puente
      const vados = [];
      for (const P of L.PATHS || []) for (let i = 1; i < P.pts.length; i++) { const a = P.pts[i - 1], bb = P.pts[i], l = Math.hypot(bb[0] - a[0], bb[1] - a[1]); for (let s = 0; s <= l; s += 1) { const x = a[0] + (bb[0] - a[0]) * s / l, z = a[1] + (bb[1] - a[1]) * s / l; if (E(x, z).edge < -0.5 && !enPuente(x, z, 1) && !HF.bridgeAt?.(x, z)) { if (!vados.some(v => Math.hypot(v.x - x, v.z - z) < 12)) vados.push({ x: Math.round(x), z: Math.round(z), calle: P.name || P.cls || P.type }); } } }
      return { casas: casas.length, malas: Object.fromEntries(Object.entries(malas).map(([k, v]) => [k, v.length])), ejemplos: Object.fromEntries(Object.entries(malas).map(([k, v]) => [k, v.slice(0, 4)])), puentes: puentes.length, puentesMal: puentes.filter(q => q.mal.length), vados };
    });
    r.town = town; r.errores = errs.slice(0, 3);
    console.log(JSON.stringify(r)); res.push(r);
    // capturas: el peor puente y un ejemplo de cada tipo de casa mala
    const foco = [...(r.puentesMal || []).slice(0, 3).map((q, i) => ['puente' + i, q.x, q.z, q.largo]), ...Object.entries(r.ejemplos || {}).filter(([, v]) => v.length).map(([k, v]) => ['casa-' + k, v[0].x, v[0].z, 12]), ...(r.vados || []).slice(0, 1).map(v => ['vado', v.x, v.z, 10])];
    for (const [k, x, z, s] of foco) {
      await p.evaluate(([x, z, s]) => { const cam = window.__rt.camera, y = window.__hf.groundHeight(x, z), d = Math.max(14, s * 0.9); document.querySelector('.rotulo')?.remove(); window.__game.ui.hudVisible?.(false); window.__rt.follow.update = () => {}; window.__game.player.place(x + 200, z + 200, 0); cam.position.set(x + d * 0.7, y + d * 0.55, z + d * 0.7); cam.lookAt(x, y, z); }, [x, z, s]);
      await p.waitForTimeout(2200); await p.screenshot({ path: `${out}/${town}-${k}.png` });
    }
  } catch (e) { console.log(JSON.stringify({ town, fallo: String(e.message || e).slice(0, 200) })); }
  await p.close();
}
fs.writeFileSync(`${out}/resumen.json`, JSON.stringify(res, null, 1));
console.log('FIN', res.length);
await b.close();
