// Los dedos de los personajes de Meshy (el autor, 15 de noviembre de 2026: «las manos no cierran, no agarran. Me he fijado
// en todo el videojuego que las manos, los dedos, no se doblan, las falanges no se doblan y agarran»). Los modelos traen la
// mano entera pegada a un solo hueso, sin huesos en los dedos, aunque la malla sí tiene el pulgar y los cuatro dedos
// separados. Aquí se les pone un esqueleto de verdad: se buscan en la malla el pulgar y cada dedo, se parten en sus tres
// falanges y se pegan a huesos nuevos, hijos del de la mano. Con eso se doblan por los nudillos y por cada falange: la mano
// relajada, el puño al correr, la pelota del saque recogida entre los dedos y el mango de la pala, la paleta o el xare
// rodeado por los dedos con el pulgar encima. Antes, un objetivo de forma enrollaba la mano entera como una hoja y desde
// la cámara del juego no se notaba.
//
// Cómo se encuentran los dedos: la distancia por la superficie de la malla desde la muñeca crece hasta la punta de cada
// dedo; bajando desde las puntas, cada dedo es un trozo aparte hasta que se junta con el de al lado en el pliegue entre los
// dos. Lo que queda por debajo de los pliegues es la palma. El pulgar es el dedo que se junta más abajo, más cerca de la
// muñeca. Se hace una vez, en el modelo cargado, antes de copiarlo para cada personaje (las copias comparten la malla y
// llevan sus propios huesos).
import * as THREE from 'three';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const GR = Math.PI / 180;

// (un montón binario para las distancias por la malla)
function monton() {
  const id = [], pr = [];
  return {
    get size() { return id.length; },
    push(i, p) { id.push(i); pr.push(p); let k = id.length - 1; while (k > 0) { const q = (k - 1) >> 1; if (pr[q] <= pr[k]) break; [id[q], id[k]] = [id[k], id[q]]; [pr[q], pr[k]] = [pr[k], pr[q]]; k = q; } },
    pop() {
      const r = id[0], rp = pr[0], li = id.pop(), lp = pr.pop();
      if (id.length) { id[0] = li; pr[0] = lp; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < id.length && pr[a] < pr[m]) m = a; if (b < id.length && pr[b] < pr[m]) m = b; if (m === k) break; [id[m], id[k]] = [id[k], id[m]]; [pr[m], pr[k]] = [pr[k], pr[m]]; k = m; } }
      return [r, rp];
    },
  };
}

/** Pone dedos a las dos manos de un personaje cargado (antes de copiarlo). metro: cuánto mide en metros una unidad del
 *  espacio del hueso de la mano (para el grosor del mango y de la pelota). Devuelve { R, L } con lo que necesita cada
 *  copia (nombres de los huesos y las posturas), o null si no ha podido con ninguna. */
export function ponDedos(root, metro) {
  const out = {};
  for (const [lado, re] of [['R', /RightHand$/], ['L', /LeftHand$/]]) {
    let h = null; root.traverse(o => { if (!h && o.isBone && re.test(o.name)) h = o; });
    if (!h) continue;
    try { const D = dedosDe(root, h, lado, metro); if (D) out[lado] = D; } catch (e) { console.warn('dedos', lado, e); }
  }
  return out.R || out.L ? out : null;
}

function dedosDe(root, hand, lado, metro) {
  if (hand.children.some(c => c.isBone)) return null;   // (ya tiene dedos)
  const meshes = []; root.traverse(o => { if (o.isSkinnedMesh && o.skeleton?.bones.includes(hand)) meshes.push(o); });
  if (!meshes.length) return null;
  // (los puntos que mueve la mano, en el espacio de su hueso)
  const R = [], v = new THREE.Vector3(), mapas = new Map();
  for (const m of meshes) {
    const g = m.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight; if (!P || !SI || !SW) continue;
    const ih = m.skeleton.bones.indexOf(hand), M = new THREE.Matrix4().multiplyMatrices(m.skeleton.boneInverses[ih], m.bindMatrix);
    const mapa = new Int32Array(P.count).fill(-1); mapas.set(m, mapa);
    for (let i = 0; i < P.count; i++) {
      let w = 0; for (let k = 0; k < 4; k++) if (SI.getComponent(i, k) === ih) w += SW.getComponent(i, k);
      if (w < 0.5) continue;
      mapa[i] = R.length; R.push({ m, i, ih, p: v.fromBufferAttribute(P, i).applyMatrix4(M).clone() });
    }
  }
  if (R.length < 30) return null;
  // (hacia dónde van los dedos: de la muñeca, que es el origen del hueso, a lo más lejano)
  let rmax = 0; for (const r of R) rmax = Math.max(rmax, r.p.length());
  const d = new THREE.Vector3(); for (const r of R) if (r.p.length() > 0.75 * rmax) d.add(r.p);
  if (d.lengthSq() < 1e-12) return null; d.normalize();
  let L = 0, tmin = Infinity; for (const r of R) { r.t = r.p.dot(d); L = Math.max(L, r.t); tmin = Math.min(tmin, r.t); }
  // (lo ancho de la mano: el eje en que más se separan los puntos de la zona de los dedos)
  const e1 = new THREE.Vector3(1, 0, 0); if (Math.abs(e1.dot(d)) > 0.9) e1.set(0, 0, 1); e1.addScaledVector(d, -e1.dot(d)).normalize(); const e2 = new THREE.Vector3().crossVectors(d, e1);
  { let a = 0, b = 0, c = 0, mx = 0, my = 0, n = 0;
    for (const r of R) { if (r.t < 0.6 * L) continue; const x = r.p.dot(e1), y = r.p.dot(e2); mx += x; my += y; n++; a += x * x; b += x * y; c += y * y; }
    if (n < 10) return null; mx /= n; my /= n; a = a / n - mx * mx; b = b / n - mx * my; c = c / n - my * my;
    const ang = 0.5 * Math.atan2(2 * b, a - c); var W = e1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(e2, Math.sin(ang)); }
  let N = new THREE.Vector3().crossVectors(d, W).normalize();
  // (los puntos repetidos en las costuras de la textura, juntos; y quién toca a quién por los triángulos)
  const q = L / 260, nodos = new Map(), NP = [];
  for (const r of R) { const k = Math.round(r.p.x / q) + ',' + Math.round(r.p.y / q) + ',' + Math.round(r.p.z / q); let n = nodos.get(k); if (n === undefined) { n = NP.length; nodos.set(k, n); NP.push(r.p); } r.n = n; }
  const nn = NP.length, adj = Array.from({ length: nn }, () => []);
  const une = (x, y) => { if (x < 0 || y < 0) return; const a = R[x].n, b = R[y].n; if (a !== b) { adj[a].push(b); adj[b].push(a); } };
  for (const m of meshes) {
    const mapa = mapas.get(m); if (!mapa) continue; const I = m.geometry.index, cnt = I ? I.count : m.geometry.attributes.position.count;
    for (let k = 0; k + 2 < cnt; k += 3) { const a = mapa[I ? I.getX(k) : k], b = mapa[I ? I.getX(k + 1) : k + 1], c = mapa[I ? I.getX(k + 2) : k + 2]; une(a, b); une(b, c); une(c, a); }
  }
  // (la distancia por la malla desde la muñeca)
  const T = NP.map(p => p.dot(d)), gd = new Float64Array(nn).fill(Infinity), H = monton();
  for (let i = 0; i < nn; i++) if (T[i] < tmin + 0.07 * (L - tmin)) { gd[i] = T[i] - tmin; H.push(i, gd[i]); }
  while (H.size) { const [i, di] = H.pop(); if (di > gd[i]) continue; for (const j of adj[i]) { const nd = di + NP[i].distanceTo(NP[j]); if (nd < gd[j]) { gd[j] = nd; H.push(j, nd); } } }
  // (bajando desde las puntas: cada dedo es un trozo aparte hasta su pliegue)
  const orden = []; for (let i = 0; i < nn; i++) if (gd[i] < Infinity) orden.push(i);
  if (orden.length < 24) return null;
  orden.sort((a, b) => gd[b] - gd[a]);
  const G = gd[orden[0]], tau = 0.085 * G, padre = new Int32Array(nn).fill(-1), comp = new Map(), regiones = [];
  const raiz = (x) => { while (padre[x] !== x) { padre[x] = padre[padre[x]]; x = padre[x]; } return x; };
  for (const u of orden) {
    padre[u] = u;
    const rs = new Set(); for (const w of adj[u]) if (padre[w] >= 0) rs.add(raiz(w)); rs.delete(u);
    if (!rs.size) { comp.set(u, { pico: u, picoG: gd[u], abierto: true, nodos: [u] }); continue; }
    const cs = [...rs].sort((a, b) => comp.get(b).picoG - comp.get(a).picoG), viejo = cs[0], V = comp.get(viejo);
    for (let j = 1; j < cs.length; j++) {
      const y = cs[j], Y = comp.get(y);
      if (Y.picoG - gd[u] >= tau) {
        if (Y.abierto) { regiones.push({ nodos: Y.nodos, pico: Y.pico, cruce: gd[u] }); Y.abierto = false; }
        if (V.abierto) { regiones.push({ nodos: V.nodos, pico: V.pico, cruce: gd[u] }); V.abierto = false; V.nodos = []; }
      } else if (Y.abierto && V.abierto) for (const x of Y.nodos) V.nodos.push(x);
      padre[y] = viejo; comp.delete(y);
    }
    padre[u] = viejo; if (V.abierto) V.nodos.push(u);
  }
  // (cada trozo: su punta, su arranque en el pliegue y hacia dónde va)
  const info = regiones.map(rg => {
    const tip = NP[rg.pico].clone(), alto = gd[rg.pico] - rg.cruce, B = new THREE.Vector3(); let nb = 0;
    for (const n of rg.nodos) if (gd[n] < rg.cruce + 0.12 * alto) { B.add(NP[n]); nb++; }
    if (!nb) B.copy(tip); else B.divideScalar(nb);
    const f = tip.clone().sub(B); const Lc = f.length(); f.normalize();
    return { ...rg, tip, base: B, f, Lc, alto, ang: Math.acos(Math.min(1, Math.max(-1, f.dot(d)))) };
  }).filter(x => x.Lc > 0.12 * L);
  // (el pulgar: el que arranca más abajo, si arranca claramente más abajo que los otros o va torcido; los dedos, los cuatro
  // más largos de los que quedan, ordenados del lado del pulgar al del meñique)
  info.sort((a, b) => a.cruce - b.cruce);
  let pulgar = null;
  if (info.length >= 2) { const resto = info.slice(1).map(x => x.cruce).sort((a, b) => a - b), med = resto[resto.length >> 1]; if (info[0].cruce < 0.82 * med || info[0].ang > 28 * GR) pulgar = info[0]; }
  else if (info.length === 1 && info[0].ang > 35 * GR) pulgar = info[0];
  let dedos = (pulgar ? info.slice(1) : info).sort((a, b) => b.Lc * b.alto - a.Lc * a.alto).slice(0, 4);
  const sDe = (p) => p.dot(W), delPulgar = new Set(pulgar ? pulgar.nodos : []);
  const dSeg = (p, a, b) => { const ab = b.clone().sub(a), t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
  if (dedos.length === 4) {
    if (pulgar) { const sp = sDe(pulgar.base); dedos.sort((a, b) => Math.abs(sDe(a.base) - sp) - Math.abs(sDe(b.base) - sp)); }
    else dedos.sort((a, b) => sDe(a.base) - sDe(b.base));
    // (los dedos que se tocan entre sí, como el corazón y el anular del pelotari con sus cintas, se separan tarde, cerca de
    // las puntas, y su trozo se queda corto. El pliegue de verdad está a la altura del más hondo de los otros: de ahí para
    // arriba, cada punto es del dedo cuyo eje le queda más cerca)
    const tb = dedos.map(x => x.base.dot(d)).sort((a, b) => a - b), tWeb = tb[1];
    const capa = []; for (let i = 0; i < nn; i++) if (!delPulgar.has(i) && Math.abs(T[i] - tWeb) < 0.05 * L) capa.push(i);
    // (primero por lo ancho, con las puntas; luego, con el eje de cada uno)
    let bases = dedos.map(x => x.base.clone());
    for (let it = 0; it < 2; it++) {
      const sum = dedos.map(() => [new THREE.Vector3(), 0]);
      for (const i of capa) { let k = 0, bd = Infinity; dedos.forEach((x, j) => { const dd = it ? dSeg(NP[i], bases[j], x.tip) : Math.abs(sDe(NP[i]) - sDe(x.tip)); if (dd < bd) { bd = dd; k = j; } }); sum[k][0].add(NP[i]); sum[k][1]++; }
      bases = sum.map(([s, n], j) => n >= 3 ? s.divideScalar(n) : bases[j]);
    }
    const nuevos = dedos.map(() => []);
    for (let i = 0; i < nn; i++) { if (delPulgar.has(i) || T[i] < tWeb - 0.02 * L) continue; let k = 0, bd = Infinity; dedos.forEach((x, j) => { const dd = dSeg(NP[i], bases[j], x.tip); if (dd < bd) { bd = dd; k = j; } }); nuevos[k].push(i); }
    dedos.forEach((x, j) => { if (bases[j].dot(d) < x.base.dot(d)) { x.base = bases[j]; x.f = x.tip.clone().sub(x.base); x.Lc = x.f.length(); x.f.normalize(); } x.nodos = nuevos[j]; });
  } else {
    // (manos con los dedos juntos, como una manopla, o en las que la malla no los separa del todo: los cuatro dedos son
    // cuatro tiras iguales a lo ancho, de los nudillos a la punta; el nudillo, a la altura del pliegue más hondo que se haya
    // visto o, si no hay ninguno, algo más allá de la mitad de la mano)
    const tWeb = dedos.length ? Math.min(0.7 * L, Math.max(0.42 * L, Math.min(...dedos.map(x => x.base.dot(d))))) : 0.55 * L;
    const zona = []; for (let i = 0; i < nn; i++) if (!delPulgar.has(i) && T[i] > tWeb - 0.02 * L) zona.push(i);
    if (zona.length < 12) return null;
    const ss2 = zona.map(i => sDe(NP[i])).sort((a, b) => a - b), s0 = ss2[Math.floor(ss2.length * 0.02)], s1 = ss2[Math.floor(ss2.length * 0.98)], ancho = (s1 - s0) / 4;
    const tiras = [0, 1, 2, 3].map(() => []);
    for (const i of zona) tiras[Math.min(3, Math.max(0, Math.floor((sDe(NP[i]) - s0) / ancho)))].push(i);
    // (en las manos de pocos puntos, una tira puede quedarse vacía o corta: entonces su dedo se apoya en el de al lado, a su
    // ancho, y llega hasta donde llegan los dedos)
    const lleno = tiras.findIndex(ns => ns.length); if (lleno < 0) return null;
    dedos = tiras.map((ns, k) => {
      const ref = ns.length ? ns : tiras[lleno], dk = (k - (ns.length ? k : lleno)) * ancho;
      let pico = ref[0]; for (const i of ref) if (T[i] > T[pico]) pico = i;
      const tip = NP[pico].clone().addScaledVector(W, dk), B = new THREE.Vector3(); let nb = 0; for (const i of ref) if (Math.abs(T[i] - tWeb) < 0.05 * L) { B.add(NP[i]); nb++; }
      if (nb) B.divideScalar(nb).addScaledVector(W, dk); else B.copy(tip).addScaledVector(d, -(T[pico] - tWeb));
      if (tip.clone().sub(B).dot(d) < 0.2 * L) tip.copy(B).addScaledVector(d, Math.max(0.2 * L, L - tWeb));
      const f = tip.clone().sub(B), Lc = f.length(); f.normalize();
      return { nodos: ns, pico, tip, base: B, f, Lc, cruce: 0, alto: Lc };
    });
    if (pulgar) { const sp = sDe(pulgar.base); if (Math.abs(sDe(dedos[3].base) - sp) < Math.abs(sDe(dedos[0].base) - sp)) dedos.reverse(); }
  }
  // (la palma: hacia el lado al que se curvan las puntas y al que se adelanta el pulgar)
  let hm = 0, nh = 0; for (const x of dedos) for (const n of x.nodos) { hm += NP[n].dot(N); nh++; } hm /= nh;
  let curva = 0; for (const x of dedos) { const mid = x.base.clone().addScaledVector(x.f, x.Lc * 0.45); curva += x.tip.dot(N) - mid.dot(N); }
  const pul = pulgar ? pulgar.tip.dot(N) - hm : 0;
  const voto = (Math.abs(pul) > 0.08 * L ? Math.sign(pul) * 2 : 0) + (Math.abs(curva) > 0.02 * L ? Math.sign(curva) : 0);
  if (voto < 0) N.negate();
  // (las articulaciones de cada dedo: el nudillo, un poco por debajo del pliegue, dentro de la palma, y las otras dos en el
  // centro del dedo, a lo que miden sus falanges)
  const centro = (x, J0, f, at, ancho) => { const c = new THREE.Vector3(); let k = 0; for (const n of x.nodos) { const s = NP[n].clone().sub(J0).dot(f); if (Math.abs(s - at) < ancho) { c.add(NP[n]); k++; } } return k >= 3 ? c.divideScalar(k) : J0.clone().addScaledVector(f, at); };
  const radio = (x, J0, f, a, b) => { const ds = []; for (const n of x.nodos) { const r = NP[n].clone().sub(J0), s = r.dot(f); if (s > a && s < b) ds.push(r.addScaledVector(f, -s).length()); } ds.sort((p, q) => p - q); return ds.length ? ds[ds.length >> 1] : 0.05 * L; };
  const digs = [];
  for (const x of dedos) {
    const f = x.f, J0 = x.base.clone().addScaledVector(f, -0.3 * x.Lc), Lf = 1.3 * x.Lc;
    const J1 = centro(x, J0, f, 0.45 * Lf, 0.06 * Lf), J2 = centro(x, J0, f, 0.73 * Lf, 0.05 * Lf);
    digs.push({ x, J: [J0, J1, J2, x.tip.clone()], f, Lf, r: radio(x, J0, f, 0.3 * Lf, 0.65 * Lf), cortes: [0, 0.45 * Lf, 0.73 * Lf], bandas: [0.14 * Lf, 0.05 * Lf, 0.05 * Lf] });
  }
  if (pulgar) {
    const f = pulgar.f, Lc = pulgar.Lc, J0 = pulgar.base.clone().addScaledVector(f, -0.45 * Lc);
    const J1 = centro(pulgar, J0, f, 0.55 * Lc, 0.07 * Lc), J2 = centro(pulgar, J0, f, 1.0 * Lc, 0.06 * Lc);
    digs.push({ x: pulgar, J: [J0, J1, J2, pulgar.tip.clone()], f, Lf: 1.45 * Lc, r: radio(pulgar, J0, f, 0.6 * Lc, 1.1 * Lc), cortes: [0, 0.55 * Lc, 1.0 * Lc], bandas: [0.25 * Lc, 0.06 * Lc, 0.06 * Lc], pulgar: true });
  }
  // (a qué dedo va cada punto de la malla: los de cada dedo, a él; los de la palma junto a un nudillo, repartidos entre la
  // palma y el dedo, para que el nudillo doble sin rasgarse; y los sueltos, como las cintas o las uñas, al de su punto
  // más cercano)
  const etiqueta = new Int8Array(nn).fill(-1);
  digs.forEach((g, k) => { for (const n of g.x.nodos) etiqueta[n] = k; });
  const sueltos = [], piezas = [], piezaDe = new Int32Array(nn).fill(-1); for (let i = 0; i < nn; i++) if (gd[i] === Infinity) sueltos.push(i);
  if (sueltos.length) {
    const alc = []; for (let i = 0; i < nn; i++) if (gd[i] < Infinity) alc.push(i);
    // (cada pieza suelta entera al mismo dedo, el que más votan sus puntos: si no, una cinta que cae entre dos dedos se
    // partía y, al cerrar la mano, la mitad se quedaba de punta)
    const cerca = new Int8Array(nn).fill(-1);
    for (const i of sueltos) { let best = -1, bd = Infinity; for (const j of alc) { const dd = NP[i].distanceToSquared(NP[j]); if (dd < bd) { bd = dd; best = j; } } cerca[i] = best >= 0 ? etiqueta[best] : -1; }
    const visto = new Uint8Array(nn);
    for (const i0 of sueltos) {
      if (visto[i0]) continue; const pieza = [i0]; visto[i0] = 1;
      for (let k = 0; k < pieza.length; k++) for (const j of adj[pieza[k]]) if (!visto[j] && gd[j] === Infinity) { visto[j] = 1; pieza.push(j); }
      const votos = new Map(); for (const i of pieza) votos.set(cerca[i], (votos.get(cerca[i]) || 0) + 1);
      let gana = -1, mx = -1; for (const [k, n] of votos) if (n > mx) { mx = n; gana = k; }
      for (const i of pieza) etiqueta[i] = gana;
      // (y entera a una sola falange, la de su centro: una pieza rígida, como las cintas del pelotari, partida entre dos
      // falanges se estiraba en picos al doblar el dedo)
      const c = new THREE.Vector3(); for (const i of pieza) c.add(NP[i]); c.divideScalar(pieza.length);
      const id = piezas.length; piezas.push(c); for (const i of pieza) piezaDe[i] = id;
    }
  }
  const reparto = (k, p, lateral) => {
    const g = digs[k], x = p.clone().sub(g.J[0]).dot(g.f), [, c1, c2] = g.cortes, [b0, b1, b2] = g.bandas;
    let a0 = ss(-b0, b0, x); if (lateral !== undefined) a0 *= 1 - ss(1.3 * g.r, 2.1 * g.r, lateral);
    const a1 = 1 - ss(c1 - b1, c1 + b1, x), a3 = ss(c2 - b2, c2 + b2, x), a2 = 1 - a1 - a3;
    return [1 - a0, a0 * a1, a0 * Math.max(0, a2), a0 * a3];
  };
  const lateralDe = (k, p) => { const g = digs[k], r = p.clone().sub(g.J[0]), s = r.dot(g.f), lim = g.cortes[1]; if (s < -g.bandas[0] * 1.5 || s > lim) return Infinity; return r.addScaledVector(g.f, -s).length(); };
  // (los huesos nuevos: tres por dedo, encadenados, sin giro respecto a la mano)
  const nombres = [], huesos = [];
  digs.forEach((g, k) => {
    let pad = hand;
    for (let j = 0; j < 3; j++) {
      const b = new THREE.Bone(); b.name = `${lado}_${g.pulgar ? 'pulgar' : 'dedo' + (k + 1)}_${j + 1}`;
      b.position.copy(g.J[j]).sub(j ? g.J[j - 1] : v.set(0, 0, 0)); pad.add(b); pad = b; huesos.push(b); nombres.push(b.name);
    }
  });
  // (cada esqueleto con sus huesos nuevos; la inversa de cada uno, la de la mano movida a su articulación)
  const esq = new Map();
  for (const m of meshes) if (!esq.has(m.skeleton)) {
    const sk = m.skeleton, ih = sk.bones.indexOf(hand), base = sk.bones.length, invs = [];
    digs.forEach(g => { for (let j = 0; j < 3; j++) invs.push(new THREE.Matrix4().makeTranslation(-g.J[j].x, -g.J[j].y, -g.J[j].z).multiply(sk.boneInverses[ih])); });
    esq.set(sk, { base, nuevo: new THREE.Skeleton([...sk.bones, ...huesos], [...sk.boneInverses, ...invs]) });
  }
  // (los pesos: lo que el punto tenía en la mano se reparte entre la mano y las falanges)
  const tocados = new Set();
  for (const r of R) {
    let k = etiqueta[r.n], lat;
    if (k < 0) {
      let bd = Infinity; for (let j = 0; j < digs.length; j++) { const l = lateralDe(j, r.p) / digs[j].r; if (l < bd) { bd = l; k = j; } }
      if (k < 0 || bd > 2.1) continue; lat = lateralDe(k, r.p);
    }
    let parte = reparto(k, piezaDe[r.n] >= 0 ? piezas[piezaDe[r.n]] : r.p, lat);
    if (piezaDe[r.n] >= 0) { const j = parte.indexOf(Math.max(...parte)); parte = parte.map((_, i) => i === j ? 1 : 0); }
    if (parte[0] > 0.999) continue;
    const g = r.m.geometry, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, E = esq.get(r.m.skeleton);
    const inf = []; let wh = 0;
    for (let c = 0; c < 4; c++) { const j = SI.getComponent(r.i, c), w = SW.getComponent(r.i, c); if (w <= 0) continue; if (j === r.ih) wh += w; else inf.push([j, w]); }
    if (parte[0] * wh > 1e-4) inf.push([r.ih, parte[0] * wh]);
    for (let j = 0; j < 3; j++) if (parte[j + 1] * wh > 1e-4) inf.push([E.base + k * 3 + j, parte[j + 1] * wh]);
    inf.sort((a, b) => b[1] - a[1]); const top = inf.slice(0, 4), s = top.reduce((a, b) => a + b[1], 0) || 1;
    for (let c = 0; c < 4; c++) { SI.setComponent(r.i, c, top[c] ? top[c][0] : 0); SW.setComponent(r.i, c, top[c] ? top[c][1] / s : 0); }
    tocados.add(g);
  }
  for (const g of tocados) { g.attributes.skinIndex.needsUpdate = true; g.attributes.skinWeight.needsUpdate = true; }
  for (const m of meshes) { const E = esq.get(m.skeleton); if (E) m.bind(E.nuevo, m.bindMatrix); }
  // (la palma, para dejar la pelota en ella: su centro, entre la muñeca y los nudillos, hacia dónde mira y su grosor)
  const nud = digs.filter(g => !g.pulgar).reduce((a, g) => a + g.J[0].dot(d), 0) / 4, pc = new THREE.Vector3(); let np = 0;
  for (let i = 0; i < nn; i++) if (etiqueta[i] < 0 && T[i] > 0.3 * nud && T[i] < 0.95 * nud) { pc.add(NP[i]); np++; }
  if (np) pc.divideScalar(np); else pc.copy(d).multiplyScalar(0.6 * nud);
  let grosor = 0; for (let i = 0; i < nn; i++) if (etiqueta[i] < 0 && Math.abs(T[i] - pc.dot(d)) < 0.2 * L) grosor = Math.max(grosor, NP[i].clone().sub(pc).dot(N));
  hand.userData.palma = { c: pc.toArray(), n: N.toArray(), d: d.toArray(), largo: L, grosor };
  // (las posturas)
  const P = posturas(digs, { d, N, W, pc, grosor, metro, L });
  return { huesos: nombres, poses: P.poses, agarre: P.agarre };
}

// ---- las posturas: cuánto gira cada falange, para cada manera de tener la mano -------------------------------------
function posturas(digs, { d, N, pc, grosor, metro }) {
  const dedos = digs.filter(g => !g.pulgar), pulgar = digs.find(g => g.pulgar), q = new THREE.Quaternion(), tmp = new THREE.Vector3();
  // (el eje de cada dedo para doblarse hacia la palma; el del pulgar, hacia donde vaya a cerrar)
  for (const g of dedos) g.eje = new THREE.Vector3().crossVectors(g.f, N).normalize();
  const ejePulgar = (hacia) => { const g = pulgar, u = hacia.clone().sub(g.J[1]); u.addScaledVector(g.f, -u.dot(g.f)); if (u.lengthSq() < 1e-12) u.copy(N); return new THREE.Vector3().crossVectors(g.f, u.normalize()).normalize(); };
  // (la cadena de un dedo girada: cada articulación gira lo suyo y se lleva las de después)
  const cadena = (g, eje, a) => { const J = g.J.map(p => p.clone()); for (let j = 0; j < 3; j++) { q.setFromAxisAngle(eje, a[j]); for (let k = j + 1; k < 4; k++) J[k].sub(J[j]).applyQuaternion(q).add(J[j]); } return J; };
  const muestras = (J, desde = 0) => { const s = []; for (let j = desde; j < 3; j++) for (let t = j === desde ? 0.25 : 0; t <= 1.001; t += 0.25) s.push(tmp.copy(J[j]).lerp(J[j + 1], t).clone()); return s; };
  // (cierra un dedo hasta tocar: primero todas las articulaciones a la vez y luego, las que no tocan, cada una hasta tocar)
  const cierra = (g, eje, toca, max) => {
    const hay = (a, desde) => muestras(cadena(g, eje, a), desde).some(p => toca(p, g.r));
    let u = 0; for (let i = 1; i <= 40; i++) { const a = max.map(m => m * i / 40); if (hay(a, 0)) break; u = i / 40; }
    const a = max.map(m => m * u);
    if (u < 1) for (let j = 0; j < 3; j++) { const J = cadena(g, eje, a); if (muestras(J, j).slice(0, 5).some(p => toca(p, g.r * 1.04))) continue; for (let i = 0; i < 30; i++) { const b = a.slice(); b[j] = Math.min(max[j], a[j] + max[j] / 30); if (hay(b, j)) break; a[j] = b[j]; } }
    return a;
  };
  const quats = (lista) => { const out = []; for (const [eje, a] of lista) for (let j = 0; j < 3; j++) { q.setFromAxisAngle(eje, a[j]); out.push(q.x, q.y, q.z, q.w); } return out; };
  const rMed = dedos.reduce((s, g) => s + g.r, 0) / 4;
  // (una esfera, como superficie que tocar: si un punto del dedo, con su grosor, queda dentro)
  const esf = (C, rho) => (p, r) => p.distanceTo(C) < rho + r;
  // (y los dedos ya cerrados, para que el pulgar se apoye encima)
  const encima = (cerrados) => { const caps = []; for (const [g, J] of cerrados) for (let j = 0; j < 3; j++) caps.push([J[j], J[j + 1], g.r]); return (p, r) => caps.some(([a, b, rr]) => { const ab = b.clone().sub(a), t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)) < rr + r; }); };
  const MAXD = [95 * GR, 110 * GR, 85 * GR], MAXP = [45 * GR, 55 * GR, 70 * GR];
  const largos = (g) => [g.J[1].distanceTo(g.J[0]), g.J[2].distanceTo(g.J[1]), g.J[3].distanceTo(g.J[2])];
  // (un dedo que rodea un cilindro de radio R tocando la palma a «delta» antes del nudillo: cada falange queda tangente al
  // cilindro por su mitad y cada articulación gira lo que suman las dos medias falanges que junta, vistas desde el centro)
  const envuelve = (g, R, delta, max) => { const [l1, l2, l3] = largos(g), h = (l) => Math.atan(l / (2 * R)); return [Math.atan(Math.max(0, delta) / R) + h(l1), h(l1) + h(l2), h(l2) + h(l3)].map((x, j) => Math.min(max[j], x)); };
  const centroDe = (g, R, delta) => g.J[0].clone().addScaledVector(g.f, -delta).addScaledVector(N, R);
  // (el pulgar se cierra sobre el índice y el corazón ya cerrados, hasta tocarlos)
  const cierraPulgar = (cerrados, extra, max) => {
    const [, Ji] = cerrados[0], hacia = Ji[1].clone().lerp(Ji[2], 0.5).addScaledVector(N, -cerrados[0][0].r), eje = ejePulgar(hacia), t1 = encima(cerrados.slice(0, 2));
    return [eje, cierra(pulgar, eje, (p, r) => t1(p, r) || (extra ? extra(p, r) : false), max)];
  };
  const agarra = (Rde, deltaDe, max, extra) => {
    const lista = [], cerrados = [], centros = [];
    for (const g of dedos) { const R = Rde(g), dl = deltaDe(g), a = envuelve(g, R, dl, max); lista.push([g.eje, a]); cerrados.push([g, cadena(g, g.eje, a)]); centros.push(centroDe(g, R, dl)); }
    if (pulgar) { const [eje, a] = cierraPulgar(cerrados, extra, MAXP); lista.push([eje, a]); cerrados.push([pulgar, cadena(pulgar, eje, a)]); }
    return { lista, cerrados, centros };
  };
  const poses = {};
  poses.abierta = quats(digs.map(g => [g.eje || N, [0, 0, 0]]));
  // (relajada: los dedos un poco doblados, más hacia el meñique, y el pulgar suelto)
  const rel = dedos.map((g, k) => [g.eje, [(10 + 3 * k) * GR, (18 + 4 * k) * GR, (10 + 2 * k) * GR]]);
  if (pulgar) rel.push([ejePulgar(pc.clone().addScaledVector(N, grosor * 2)), [6 * GR, 8 * GR, 10 * GR]]);
  poses.relajada = quats(rel);
  // (el mango: los dedos alrededor de un cilindro del grueso del mango de verdad, apoyado en la palma junto a los nudillos)
  const rho = 0.0165 / metro, m = agarra(g => rho + g.r, g => 0.22 * g.Lf, MAXD);
  poses.mango = quats(m.lista);
  // (el puño, sin nada dentro: lo mismo con un hueco más pequeño que un dedo)
  poses.puno = quats(agarra(g => 0.8 * g.r, g => 0.15 * g.Lf, MAXD).lista);
  // (corriendo: a medio cerrar)
  poses.carrera = mezcla(poses.relajada, poses.puno, 0.55);
  // (la pelota del saque, apoyada en el centro de la palma y recogida por los dedos; los de los lados la rodean por donde
  // es más estrecha)
  const rb = 0.047 / metro, Cb = pc.clone().addScaledVector(N, grosor + rb);
  const Rbola = (g) => { const Rs = rb + g.r, lat = Math.abs(g.J[0].clone().sub(Cb).dot(g.eje)); return lat < 0.9 * Rs ? Math.sqrt(Rs * Rs - lat * lat) : 0.45 * Rs; };
  poses.pelota = quats(agarra(Rbola, g => g.J[0].clone().sub(pc).dot(g.f), [70 * GR, 80 * GR, 62 * GR], esf(Cb, rb)).lista);
  // (dónde queda el hueco del puño con el mango: su centro, el eje del mango hacia el pulgar y lo ancho del puño)
  const Cm = m.centros.reduce((a, c) => a.add(c), new THREE.Vector3()).divideScalar(m.centros.length);
  const eje = m.centros[3].clone().sub(m.centros[0]); eje.addScaledVector(N, -eje.dot(N)).normalize();
  if (pulgar && eje.dot(pulgar.J[0].clone().sub(Cm)) < 0) eje.negate();
  let lo = Infinity, hi = -Infinity; for (const [g, J] of m.cerrados) if (!g.pulgar) for (const p of J) { const s = p.dot(eje); lo = Math.min(lo, s - g.r); hi = Math.max(hi, s + g.r); }
  const agarre = { centro: Cm.toArray(), eje: eje.toArray(), n: N.toArray(), d: d.toArray(), hueco: rho, ancho: hi - lo, R: rho + rMed, largo: 0 };
  return { poses, agarre };
}
function mezcla(a, b, k) {
  const out = [], qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  for (let i = 0; i < a.length; i += 4) { qa.fromArray(a, i); qb.fromArray(b, i); qa.slerp(qb, k); out.push(qa.x, qa.y, qa.z, qa.w); }
  return out;
}

/** Lo que lleva cada copia: sus huesos de los dedos y las posturas, para moverlos poco a poco hacia la que toque. */
export class Dedos {
  constructor(D, huesos) { this.D = D || {}; this.lados = {}; this.pedidos = {}; this.listo = false; this._q = new THREE.Quaternion(); if (huesos) this.liga(huesos); }
  /** Busca sus huesos en la copia (por el nombre) */
  liga(huesos) {
    for (const [lado, x] of Object.entries(this.D)) {
      const bs = x.huesos.map(n => huesos[n]); if (bs.some(b => !b)) continue;
      this.lados[lado] = { bs, poses: x.poses, modo: this.pedidos[lado] ?? null, hecho: null };
    }
    this.listo = true;
  }
  /** Pone una mano en una postura ('abierta', 'relajada', 'carrera', 'puno', 'mango', 'pelota'); null: la de siempre. */
  pon(lado, modo) { this.pedidos[lado] = modo; const L = this.lados[lado]; if (L && L.modo !== modo) { L.modo = modo; L.hecho = null; } }
  update(dt, corre) {
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 16);
    for (const L of Object.values(this.lados)) {
      const modo = L.modo || (corre ? 'carrera' : 'relajada'), P = L.poses[modo] || L.poses.relajada;
      if (L.hecho === modo) continue;
      let fin = true;
      for (let i = 0; i < L.bs.length; i++) {
        const b = L.bs[i]; this._q.fromArray(P, i * 4);
        if (b.quaternion.angleTo(this._q) < 0.01) b.quaternion.copy(this._q); else { b.quaternion.slerp(this._q, k); fin = false; }
      }
      if (fin) L.hecho = modo;
    }
  }
}
