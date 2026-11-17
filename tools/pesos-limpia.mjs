// Limpieza de los pesos de piel de los personajes de Meshy (sin dependencias: la usan tools/meshy-pesos.mjs y las pruebas
// en el navegador). El rigging automático de Meshy, con el personaje en postura A y las manos colgando junto a la cadera,
// reparte a veces el peso de la mano y del antebrazo por la faja, el pantalón o el muslo, y el de la cadera o el muslo por
// la mano: en la pelotari de la melena, al levantar la mano en un golpe, el pantalón se estiraba en una punta blanca de
// medio metro que salía de la cadera (noviembre de 2026).
// (y el del brazo por la cintura: con el brazo arriba, en el gancho, la cintura del pantalón subía hasta la axila).
// Cada vértice se mide contra los ejes de los huesos en la postura de unión: si está lejos del brazo, el antebrazo y la
// mano y más cerca de la cadera, el vientre o el muslo, el brazo no lo mueve; si está pegado al brazo, el antebrazo o la
// mano y lejos de la cadera y del muslo, la cadera y las piernas no lo mueven. Al que se queda sin ningún hueso se le dan los
// pesos de sus vecinos (por la superficie, uniendo los vértices que el glTF duplica en las costuras de la textura).

const LADO = (s) => ({ brazo: `${s}Arm`, ante: `${s}ForeArm`, giro: `${s}ForeArmTwist`, mano: `${s}Hand` });
// (los huesos de abajo del cuerpo, que nunca mueven la mano; y los del brazo que nunca mueven el cuerpo)
const ABAJO = /^(Hips|Spine|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg|LeftFoot|RightFoot|LeftToeBase|RightToeBase)$/;
const MANO = /^(Left|Right)(Arm|ForeArm|ForeArmTwist|Hand)$/;

function distSeg(px, py, pz, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l2 = dx * dx + dy * dy + dz * dz;
  let t = l2 > 0 ? ((px - a[0]) * dx + (py - a[1]) * dy + (pz - a[2]) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t));
  const x = a[0] + dx * t - px, y = a[1] + dy * t - py, z = a[2] + dz * t - pz; return Math.sqrt(x * x + y * y + z * z);
}

/**
 * @param {{ P: ArrayLike<number>, I: ArrayLike<number>, J: ArrayLike<number>, W: Float32Array|number[], nombres: string[],
 *   huesos: number[][], alto?: number }} o
 *   P posiciones del vértice (x, y, z), I triángulos, J y W los 4 huesos y pesos de cada vértice (W se cambia en su sitio),
 *   nombres de los huesos (sin «mixamorig»), huesos: la posición de cada hueso en el mismo espacio que P (la inversa de su
 *   matriz de unión), alto: lo que mide el personaje en ese espacio (por defecto, el alto de la caja de P).
 * @returns {{ quitados: number, vertices: number, rellenos: number, porHueso: Record<string, number> }}
 */
export function limpiaPesos({ P, I, J, W, nombres, huesos, alto, marca = null }) {
  const n = W.length / 4, idx = Object.fromEntries(nombres.map((x, i) => [x, i]));
  if (!alto) { let a = Infinity, b = -Infinity; for (let i = 0; i < n; i++) { const y = P[i * 3 + 1]; if (y < a) a = y; if (y > b) b = y; } alto = b - a; }
  const m = alto / 1.8;
  const pos = (nm) => idx[nm] != null ? huesos[idx[nm]] : null;
  // los ejes, cada uno con su grosor (radio, en metros de una persona de 1,80): brazo, antebrazo y mano de cada lado (la
  // mano, de la muñeca a 11 cm más allá); y la cadera, el vientre y los muslos. Un vértice es del que tiene más cerca en
  // proporción a su grosor: la cintura queda a 12 cm del codo y a 15 del eje del vientre, pero el vientre es tres veces más
  // ancho que el brazo
  const segMano = [], segAbajo = [];
  for (const s of ['Left', 'Right']) {
    const L = LADO(s), A = pos(L.brazo), F = pos(L.ante), H = pos(L.mano); if (!F || !H) continue;
    const d = [H[0] - F[0], H[1] - F[1], H[2] - F[2]], l = Math.hypot(...d) || 1, tip = H.map((v, k) => v + d[k] / l * 0.11 * m);
    segMano.push([F, H, 0.04], [H, tip, 0.045]); if (A) segMano.push([A, F, 0.05]);
  }
  const par = (a, b, r) => { const A = pos(a), B = pos(b); if (A && B) segAbajo.push([A, B, r]); };
  par('Hips', 'Spine', 0.15); par('Spine', 'Spine1', 0.14); par('Spine1', 'Spine2', 0.14); par('Hips', 'LeftUpLeg', 0.12); par('Hips', 'RightUpLeg', 0.12); par('LeftUpLeg', 'LeftLeg', 0.085); par('RightUpLeg', 'RightLeg', 0.085);
  // (solo del pecho para abajo: más arriba, el hombro y la axila sí van con el brazo. Con el corte a media tripa, el peso
  // malo de la mano seguía por encima y la camiseta se rasgaba en esa raya al cruzar el brazo)
  const corte = pos('Spine2') ? pos('Spine2')[1] : pos('Spine1') ? pos('Spine1')[1] : Infinity;
  const esMano = nombres.map(x => MANO.test(x)), esAbajo = nombres.map(x => ABAJO.test(x));
  const porHueso = {}; let quitados = 0; const tocado = new Uint8Array(n), vacio = new Uint8Array(n);
  const cerca = (x, y, z, segs) => { let best = Infinity; for (const [a, b, r] of segs) best = Math.min(best, distSeg(x, y, z, a, b) / (r * m)); return best; };
  for (let i = 0; i < n; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; if (y > corte) continue;
    let hayMano = false, hayAbajo = false;
    for (let k = 0; k < 4; k++) { const w = W[i * 4 + k]; if (w <= 0) continue; if (esMano[J[i * 4 + k]]) hayMano = true; if (esAbajo[J[i * 4 + k]]) hayAbajo = true; }
    if (!hayMano) continue;
    const nM = cerca(x, y, z, segMano), nA = cerca(x, y, z, segAbajo);
    let quita = null;
    if (nA < nM * 0.85) quita = esMano;                    // (de la faja, el pantalón, la cintura o el muslo: el brazo no lo mueve)
    else if (nM < nA * 0.85 && hayAbajo) quita = esAbajo;  // (de la mano o del antebrazo: la cadera no lo mueve)
    if (!quita) continue;
    for (let k = 0; k < 4; k++) { const b = J[i * 4 + k]; if (W[i * 4 + k] > 0 && quita[b]) { porHueso[nombres[b]] = (porHueso[nombres[b]] || 0) + 1; W[i * 4 + k] = 0; quitados++; tocado[i] = 1; } }
    const s = W[i * 4] + W[i * 4 + 1] + W[i * 4 + 2] + W[i * 4 + 3];
    if (s > 1e-6) for (let k = 0; k < 4; k++) W[i * 4 + k] /= s; else vacio[i] = 1;
  }
  // los que se han quedado sin hueso: los pesos de sus vecinos, desde el borde hacia dentro
  let rellenos = 0;
  if (vacio.some(v => v)) {
    let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const v = P[i * 3 + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; }
    const q = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) * 1e-5 || 1e-9, grupo = new Int32Array(n), clave = new Map(); let ng = 0;
    for (let i = 0; i < n; i++) { const k = `${Math.round((P[i * 3] - mn[0]) / q)},${Math.round((P[i * 3 + 1] - mn[1]) / q)},${Math.round((P[i * 3 + 2] - mn[2]) / q)}`; let g = clave.get(k); if (g === undefined) { g = ng++; clave.set(k, g); } grupo[i] = g; }
    const vec = new Map(); const add = (a, b) => { (vec.get(a) || vec.set(a, []).get(a)).push(b); };
    const miembros = new Map(); for (let i = 0; i < n; i++) (miembros.get(grupo[i]) || miembros.set(grupo[i], []).get(grupo[i])).push(i);
    for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) if (vacio[a] || vacio[b]) { add(a, b); add(b, a); }
    for (let pasada = 0; pasada < 200; pasada++) {
      const ahora = []; for (let i = 0; i < n; i++) if (vacio[i]) ahora.push(i); if (!ahora.length) break;
      const listos = [];
      for (const i of ahora) {
        const acc = new Map(); let c = 0;
        const vecinos = [...(vec.get(i) || [])]; for (const j of miembros.get(grupo[i])) if (j !== i) vecinos.push(...(vec.get(j) || []), j);
        for (const j of vecinos) { if (vacio[j]) continue; c++; for (let k = 0; k < 4; k++) { const w = W[j * 4 + k]; if (w > 0) acc.set(J[j * 4 + k], (acc.get(J[j * 4 + k]) || 0) + w); } }
        if (c) listos.push([i, [...acc].sort((a, b) => b[1] - a[1]).slice(0, 4)]);
      }
      if (!listos.length) break;
      for (const [i, top] of listos) { const s = top.reduce((a, [, w]) => a + w, 0); for (let k = 0; k < 4; k++) { const e = top[k]; J[i * 4 + k] = e ? e[0] : 0; W[i * 4 + k] = e ? e[1] / s : 0; } vacio[i] = 0; rellenos++; }
    }
  }
  let vertices = 0; for (let i = 0; i < n; i++) vertices += tocado[i];
  if (marca) for (let i = 0; i < n; i++) marca[i] = tocado[i];   // (para verlos en las pruebas)
  return { quitados, vertices, rellenos, porHueso };
}
