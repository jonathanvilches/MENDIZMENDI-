// El encaje de las comarcas con las mugas orgánicas: cada arista de dentro, en dos comarcas justas; el borde de fuera, un
// solo anillo cerrado cuya área es la suma de las de las comarcas; ningún contorno se cruza a sí mismo; cada pueblo, en
// la misma comarca que antes; y cuánto se han movido los puntos
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await p.goto('http://127.0.0.1:5173/?skipintro=1', { timeout: 300000 }); await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const F = await import('/src/hub/mapa3dFormas.js'), E = (await import('/src/data/comarcas-encaje.json')).default, { CENTROS } = await import('/src/data/reales/centros.js'), { mapaXY } = await import('/src/util/geo.js');
  const ids = Object.keys(E), N = {}, V = {}; for (const id of ids) { N[id] = F.contorno({ id }).P; const a = E[id]; V[id] = []; for (let i = 0; i < a.length; i += 2) V[id].push([a[i], a[i + 1]]); }
  const k = (p) => p[0].toFixed(6) + ',' + p[1].toFixed(6), cuenta = new Map(), aristas = [];
  for (const id of ids) N[id].forEach((p, i) => { const q = N[id][(i + 1) % N[id].length], a = k(p), c = k(q), kk = a < c ? a + '|' + c : c + '|' + a; cuenta.set(kk, (cuenta.get(kk) || 0) + 1); aristas.push([p, q, kk]); });
  const veces = [...cuenta.values()], dos = veces.filter(v => v === 2).length, una = veces.filter(v => v === 1).length, mas = veces.filter(v => v > 2).length;
  const area = (P) => { let s = 0; P.forEach((p, i) => { const q = P[(i + 1) % P.length]; s += p[0] * q[1] - q[0] * p[1]; }); return Math.abs(s) / 2; };
  // el anillo de fuera: se encadenan sus aristas
  const fuera = aristas.filter(a => cuenta.get(a[2]) === 1), sig = new Map(); for (const [p, q] of fuera) sig.set(k(p), q);
  const anillo = [fuera[0][0]]; let cur = fuera[0][1], pasos = 0; while (k(cur) !== k(anillo[0]) && pasos++ < 99999) { anillo.push(cur); cur = sig.get(k(cur)); if (!cur) break; }
  const sumaN = ids.reduce((s, id) => s + area(N[id]), 0), sumaV = ids.reduce((s, id) => s + area(V[id]), 0);
  // cruces de cada contorno consigo mismo
  const cruza = (a, b2, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b2, c) * o(a, b2, d) < 0 && o(c, d, a) * o(c, d, b2) < 0; };
  const cruces = {}; for (const id of ids) { const P = N[id], n = P.length; let c = 0; for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; if (cruza(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n])) c++; } if (c) cruces[id] = c; }
  const de = (R, x, y) => ids.find(id => F.enPoligono(R[id], x, y)) || null, cambian = [];
  for (const [t, c] of Object.entries(CENTROS)) { const [x, y] = mapaXY(...c), a = de(V, x, y), n = de(N, x, y); if (a !== n) cambian.push([t, a, n]); }
  return { comarcas: ids.length, puntos: ids.map(id => N[id].length).reduce((a, c) => a + c, 0), antes: ids.map(id => V[id].length).reduce((a, c) => a + c, 0), deDos: dos, deUna: una, deMas: mas, anilloCerrado: k(cur || [0, 0]) === k(anillo[0]) && anillo.length === una, areaAnillo: +area(anillo).toFixed(3), sumaAreas: +sumaN.toFixed(3), sumaAntes: +sumaV.toFixed(3), cruces, cambian,
    areas: ids.map(id => [id, +(area(N[id]) / area(V[id]) * 100 - 100).toFixed(2)]) };
});
console.log(JSON.stringify(r)); console.log('errores', JSON.stringify(errs.slice(0, 4))); await b.close();
