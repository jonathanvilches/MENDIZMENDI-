// Los bailes de los pelotaris de siempre (el autor, 18 de noviembre de 2026: «deben tener las mismas animaciones más
// bailes para cada jugador»). Son diez bailes de la biblioteca de Meshy, uno por pelotari, pedidos sobre uno de los 10
// con el esqueleto automático de Meshy; aquí se pasan al ESQUELETO DEL PELOTARI DE SIEMPRE, que es el que llevan todos:
//  - los huesos de Meshy y los del pelotari no se llaman igual ni están orientados igual: cada giro se pasa por cómo
//    gira el hueso en el mundo respecto a su reposo (los dos reposos son la misma pose), no copiando los números
//  - la cadera se mueve lo mismo, a la escala de cada esqueleto
//  - a 15 fotogramas por segundo y hasta 6 s de cada baile: el juego los repite en bucle
// Sale src/assets/pelota/bailes.glb: solo los huesos y los clips Baile1…Baile10 (actors/glbChar.js los añade a los del
// pelotari). Uso: node tools/pelotaris10-bailes.mjs <bailes-meshy.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { statSync } from 'fs';
const [,, ENT] = process.argv; const FPS = 15, MAX = 6;
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const S = await io.read(ENT), T = await io.read('src/assets/meshy/pelotari.glb'), RS = S.getRoot(), RT = T.getRoot();
const mul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const inv = (q) => [-q[0], -q[1], -q[2], q[3]], norm = (q) => { const l = Math.hypot(...q) || 1; return q.map(v => v / l); };
const gira = (q, v) => { const p = mul(mul(q, [v[0], v[1], v[2], 0]), inv(q)); return [p[0], p[1], p[2]]; };
const slerp = (a, b, t) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; const s = d < 0 ? -1 : 1; d *= s;
  if (d > 0.9995) return norm(a.map((v, i) => v + (s * b[i] - v) * t)); const th = Math.acos(d), k0 = Math.sin(th * (1 - t)) / Math.sin(th), k1 = Math.sin(th * t) / Math.sin(th); return a.map((v, i) => v * k0 + s * b[i] * k1); };
const padre = (R) => { const p = new Map(); for (const n of R.listNodes()) for (const c of n.listChildren()) p.set(c, n); return p; };
const orden = (R, P) => { const out = [], vis = (n) => { out.push(n); n.listChildren().forEach(vis); }; R.listNodes().filter(n => !P.has(n)).forEach(vis); return out; };
const PS = padre(RS), PT = padre(RT), OS = orden(RS, PS), OT = orden(RT, PT);
const reposo = (O, P) => { const W = new Map(); for (const n of O) W.set(n, P.has(n) ? mul(W.get(P.get(n)), n.getRotation()) : n.getRotation()); return W; };
const WS0 = reposo(OS, PS), WT0 = reposo(OT, PT);
// (cada hueso del pelotari, su pareja de Meshy: la columna va con otros nombres y en otro orden)
const PAREJA = { Spine: 'Spine02', Spine1: 'Spine01', Spine2: 'Spine', Neck: 'neck' };
const NS = new Map(RS.listNodes().map(n => [n.getName(), n])), huesos = RT.listSkins()[0].listJoints();
const de = (n) => { const k = n.getName().replace('mixamorig:', ''); return NS.get(PAREJA[k] || k); };
for (const h of huesos) if (!de(h)) console.log('  (sin pareja en Meshy:', h.getName() + ')');
const cT = huesos.find(h => /Hips$/.test(h.getName())), cS = de(cT);
// (la escala de la cadera: lo que mide cada esqueleto de la cadera al suelo, en sus unidades)
const largo = (n, P) => { let s = 1; for (let p = P.get(n); p; p = P.get(p)) s *= p.getScale()[1]; return s; };
const kS = largo(cS, PS), kT = largo(cT, PT), alto = (Math.hypot(...cT.getTranslation()) * kT) / (Math.hypot(...cS.getTranslation()) * kS);
const clips = RS.listAnimations().map((a) => {
  const rot = new Map(), tra = new Map();
  for (const c of a.listChannels()) { const s = c.getSampler(), e = { t: s.getInput().getArray(), v: s.getOutput().getArray() }; if (c.getTargetPath() === 'rotation') rot.set(c.getTargetNode(), e); else if (c.getTargetPath() === 'translation') tra.set(c.getTargetNode(), e); }
  const dur = Math.min(MAX, Math.max(...[...rot.values()].map(e => e.t[e.t.length - 1]))), N = Math.round(dur * FPS) + 1;
  const muestra = (e, t, k) => { const n = e.t.length; if (t <= e.t[0]) return [...e.v.slice(0, k)]; if (t >= e.t[n - 1]) return [...e.v.slice((n - 1) * k, n * k)];
    let i = 0; while (e.t[i + 1] < t) i++; const u = (t - e.t[i]) / (e.t[i + 1] - e.t[i]), A = [...e.v.slice(i * k, i * k + k)], B = [...e.v.slice((i + 1) * k, (i + 1) * k + k)]; return k === 4 ? slerp(A, B, u) : A.map((v, j) => v + (B[j] - v) * u); };
  const R = new Map(huesos.map(h => [h, []])), Tr = [], tiempos = [];
  for (let f = 0; f < N; f++) {
    const t = f / FPS; tiempos.push(t);
    const WS = new Map(); for (const n of OS) { const L = rot.has(n) ? muestra(rot.get(n), t, 4) : n.getRotation(); WS.set(n, PS.has(n) ? mul(WS.get(PS.get(n)), L) : L); }
    const WT = new Map();
    for (const n of OT) {
      const s = huesos.includes(n) ? de(n) : null, wp = PT.has(n) ? WT.get(PT.get(n)) : [0, 0, 0, 1]; let L = n.getRotation();
      if (s && rot.has(s)) { const delta = mul(WS.get(s), inv(WS0.get(s))); L = norm(mul(inv(wp), mul(delta, WT0.get(n)))); }
      WT.set(n, mul(wp, L)); if (R.has(n)) R.get(n).push(...L);
    }
    // (la cadera: su desplazamiento respecto al reposo, del mundo de Meshy al del pelotari y a su escala)
    const ts = tra.get(cS), v = ts ? muestra(ts, t, 3) : cS.getTranslation(), r0 = cS.getTranslation(), d = gira(WS0.get(PS.get(cS)), v.map((x, j) => (x - r0[j]) * kS)), dl = gira(inv(WT0.get(PT.get(cT))), d.map(x => x * alto / kT));
    Tr.push(...cT.getTranslation().map((x, j) => x + dl[j]));
  }
  return { nombre: a.getName(), tiempos, R, Tr };
});
// ---- el archivo: los huesos del pelotari y los bailes, sin malla ni sus otros clips
for (const a of RT.listAnimations()) a.dispose();
for (const m of RT.listMeshes()) m.dispose();
const buf = RT.listBuffers()[0];
clips.forEach((c, i) => {
  const A = T.createAnimation('Baile' + (i + 1)), tm = T.createAccessor().setType('SCALAR').setArray(new Float32Array(c.tiempos)).setBuffer(buf);
  const canal = (n, path, arr, tipo) => { const s = T.createAnimationSampler().setInterpolation('LINEAR').setInput(tm).setOutput(T.createAccessor().setType(tipo).setArray(new Float32Array(arr)).setBuffer(buf)); A.addSampler(s); A.addChannel(T.createAnimationChannel().setTargetNode(n).setTargetPath(path).setSampler(s)); };
  for (const [n, arr] of c.R) canal(n, 'rotation', arr, 'VEC4'); canal(cT, 'translation', c.Tr, 'VEC3');
  console.log(`Baile${i + 1}: ${c.nombre}, ${c.tiempos.length} fotogramas, ${(c.tiempos.at(-1)).toFixed(1)} s`);
});
await T.transform(prune({ keepLeaves: true }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write('src/assets/pelota/bailes.glb', T); console.log('src/assets/pelota/bailes.glb', (statSync('src/assets/pelota/bailes.glb').size / 1024).toFixed(0), 'KB');
