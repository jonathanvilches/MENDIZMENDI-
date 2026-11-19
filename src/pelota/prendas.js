// Las prendas de la equipación en 3D, hechas por Meshy: el fajín y las zapatillas. El autor, el 19 de noviembre de 2026:
// «el fajín más abajo y no intentes hacerlo tú, que lo haga Meshy»; y, visto el primero: «y las zapatillas igual, no
// me gusta como lo estás haciendo tú… la faja que sea finita en la cintura, al final de la camiseta… mira en las fotos de
// los pelotaris: el fajín es como la faja de sanfermines pero más pequeña y estilizada». La referencia es la lámina de los
// pelotaris (entrega/pelotaris-nuevos/completo-detalle-manos-faja.jpg): una cinta fina justo donde acaba la camiseta,
// con el nudo a un lado y dos puntas largas y estrechas que caen rectas.
// Los dos modelos vienen ya medidos (tools de la sesión, en el comentario de cada uno) y aquí se ajustan al cuerpo de
// cada pelotari, que no miden lo mismo:
//   - el fajín (assets/pelota/fajin.glb): un anillo de radio 1 por dentro, con la banda de alto 1 centrada en y = 0 y el
//     nudo hacia +z. Se mide en la malla, en la pose de reposo, dónde acaba la camiseta (en su textura: dónde acaba lo
//     azul del tronco, delante y detrás) y lo ancho y lo hondo del tronco a esa altura; el anillo abraza el tronco (y, por
//     ángulos, se aparta hasta donde llega el cuerpo, que no es una elipse), se inclina con el bajo de la camiseta, la
//     banda es fina (FAJIN.BANDA) con su borde de arriba sobre ese bajo, las puntas son cortas (FAJIN.PUNTAS) y el nudo,
//     pequeño, va por delante, algo a la izquierda (FAJIN.NUDO): como en las fotos de los pelotaris que pasó el autor el
//     19 de noviembre («más fino… no es tan largo»). Cuelga del hueso de la cadera: se mueve con ella
//   - la zapatilla (assets/pelota/zapatilla.glb): la suela en y = 0, el talón en z = 0, la punta en z = 1, de ancho y alto
//     1. Se mide cada pie (lo que queda por debajo del tobillo, del lado de ese pie), se pone a lo largo del pie, de la
//     base de los dedos hacia delante, envolviendo la zapatilla del modelo con algo de holgura, y cada vértice toma los
//     huesos del punto del pie que le queda más cerca: así se dobla con el pie al correr, también por los dedos. Dos
//     colores: la zapatilla y la suela (el autor: «solo la suela y la zapatilla, no la puntera»)
// Las lleva tu pelotari, con la equipación que elijas (pelota/kit.js); los rivales van como siempre.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadGLB } from '../util/glb.js';

const URLS = Object.fromEntries(Object.entries(import.meta.glob('../assets/pelota/{fajin,zapatilla}.glb', { eager: true, query: '?url', import: 'default' })).map(([p, u]) => [p.split('/').pop().replace('.glb', ''), u]));
/** El fajín: BANDA, el alto de la banda en partes del alto del pelotari; HOLGURA, cuánto más ancho que el tronco; NUDO, a
 *  cuántos grados del frente (hacia la izquierda del pelotari); PUNTAS, hasta dónde caen las puntas por debajo de la
 *  banda, en partes del alto; SOBRE, cuánto de la banda queda por encima del bajo de la camiseta */
export const FAJIN = { BANDA: 0.013, HOLGURA: 1.04, NUDO: 30, PUNTAS: 0.06, SOBRE: 0.35 };
/** La zapatilla: lo que sobra a lo largo, a lo ancho y por arriba de la del modelo, y dónde empieza la suela (en partes
 *  de su alto) */
export const ZAPA = { LARGO: 1.06, ANCHO: 1.12, ALTO: 1.1, SUELA: 0.3 };

// ---- los modelos, una vez cada uno ----
const formas = {};
function forma(k) {
  return formas[k] ||= loadGLB(new GLTFLoader(), URLS[k]).then(gl => { let geo = null; gl.scene.traverse(o => { if (!geo && o.isMesh) geo = o.geometry; }); if (!geo) throw new Error(k + ' sin malla'); return geo; });
}

// ---- lo que hace falta medir de un pelotari, en las unidades de su malla y en la pose de reposo ----
function malla(root) { let sk = null; root.traverse(o => { if (o.isSkinnedMesh && o.skeleton && (!sk || o.geometry.attributes.position.count > sk.geometry.attributes.position.count)) sk = o; }); return sk; }
function huesoEn(sk, re) {
  const i = sk.skeleton.bones.findIndex(b => re.test(b.name)); if (i < 0) return null;
  const M = new THREE.Matrix4().copy(sk.skeleton.boneInverses[i]).invert().premultiply(new THREE.Matrix4().copy(sk.bindMatrix).invert());
  return { i, p: new THREE.Vector3().setFromMatrixPosition(M) };
}
const alto = (g) => { if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox; };
// el bajo de la camiseta: dónde acaba lo azul del tronco, leído en la textura del modelo (la camiseta es azul en todos; de
// colorado se tiñe en el sombreador, la textura sigue azul). Por sectores alrededor del tronco, lo azul más bajo de cada
// uno (sin el 4 % más bajo, que en algunos modelos hay motas azules en el pantalón); y de esos, la mediana de los de
// delante y la de los de detrás. Sin textura legible, null
function bajoCamiseta(sk, cad, mus, lado, H) {
  const map = sk.material?.map, img = map?.image, uv = sk.geometry.attributes.uv; if (!img || !uv || !(img.width > 0)) return null;
  let D; try { const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, N, N); D = x.getImageData(0, 0, N, N).data; } catch (e) { return null; }
  const p = sk.geometry.attributes.position, fy = map.flipY, NS = 16, sec = Array.from({ length: NS }, () => []);
  let n = 0;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i); if (y < mus.y - H * 0.08 || y > cad.y + H * 0.2 || Math.abs(p.getX(i) - cad.x) > lado * 2.1) continue;
    const u = uv.getX(i), v = fy ? 1 - uv.getY(i) : uv.getY(i), px = Math.min(511, Math.max(0, Math.floor(u * 512))), py = Math.min(511, Math.max(0, Math.floor(v * 512))), o = (py * 512 + px) * 4;
    const r = D[o] / 255, g = D[o + 1] / 255, b = D[o + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (mx < 0.08 || d / mx < 0.4) continue;
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = ((h / 6) % 1 + 1) % 1;
    if (h > 0.5 && h < 0.72) { n++; const a = Math.atan2(p.getX(i) - cad.x, p.getZ(i) - cad.z); sec[((Math.floor((a / (2 * Math.PI) + 1) * NS) % NS) + NS) % NS].push(y); }
  }
  if (n <= 20) return null;
  const bajo = sec.map(l => { if (l.length < 6) return null; l.sort((a, b) => a - b); return l[Math.floor(l.length * 0.04)]; });
  const mediana = (l) => { l = l.filter(v => v != null).sort((a, b) => a - b); return l.length ? l[Math.floor(l.length / 2)] : null; };
  // (sectores 0..15 desde delante, +z, hacia +x: delante, los 0-2 y 13-15; detrás, los 6-9)
  const yF = mediana([bajo[13], bajo[14], bajo[15], bajo[0], bajo[1], bajo[2]]), yB = mediana([bajo[6], bajo[7], bajo[8], bajo[9]]), y = mediana(bajo);
  if (y == null) return null;
  return { y, yF: yF ?? y, yB: yB ?? y, bajo };
}

/** Pone (o cambia de color, o quita, con color vacío) el fajín a un pelotari. root: el de su GlbChar. */
export async function ponFajin(root, color) {
  if (!root) return;
  const ya = root.userData.fajin;
  if (!color) { if (ya) { ya.parent?.remove(ya); ya.geometry.dispose(); ya.material.dispose(); root.userData.fajin = null; } return; }
  if (ya) { ya.material.color.set(color); return; }
  const base = await forma('fajin');
  if (root.userData.fajin) { root.userData.fajin.material.color.set(color); return; }   // (otra llamada se adelantó)
  const sk = malla(root); if (!sk) return;
  const C = huesoEn(sk, /Hips$/), Mu = huesoEn(sk, /LeftUpLeg$/); if (!C || !Mu) return;
  const bb = alto(sk.geometry), H = bb.max.y - bb.min.y, lado = Math.abs(Mu.p.x - C.p.x), banda = H * FAJIN.BANDA;
  // (a qué altura: el borde de arriba un poco por encima del bajo de la camiseta; sin camiseta legible, algo por debajo
  // de la cadera)
  // (el bajo no siempre está a nivel: si por detrás queda más alto que por delante, la banda se inclina con él, hasta un
  // 4 % del alto del pelotari, para que no asome el pantalón entre la camiseta y el fajín)
  const hem = bajoCamiseta(sk, C.p, Mu.p, lado, H), dHem = hem ? THREE.MathUtils.clamp(hem.yB - hem.yF, -H * 0.04, H * 0.04) : 0;
  const yS = (hem ? Math.min(hem.yF, hem.yB) + Math.abs(dHem) / 2 : (Mu.p.y + (C.p.y - Mu.p.y) * 0.15)) + banda * (FAJIN.SOBRE - 0.5);
  // el tronco a esa altura: los puntos de la malla en la franja de la banda, sin los brazos
  const p = sk.geometry.attributes.position; let xA = -Infinity, xB = Infinity, zA = -Infinity, zB = Infinity;
  for (let i = 0; i < p.count; i++) { if (Math.abs(p.getY(i) - yS) > banda * 0.6) continue; const px = p.getX(i) - C.p.x; if (Math.abs(px) > lado * 2.1) continue;
    xA = Math.max(xA, px); xB = Math.min(xB, px); const pz = p.getZ(i); zA = Math.max(zA, pz); zB = Math.min(zB, pz); }
  if (!(xA > xB && zA > zB)) return;
  // la forma de este pelotari: las puntas, hasta su largo (en unidades de la banda)
  const g = base.clone(), q = g.attributes.position; let yMin = 0; for (let i = 0; i < q.count; i++) yMin = Math.min(yMin, q.getY(i));
  const k = (FAJIN.PUNTAS * H / banda) / Math.max(0.5, -0.5 - yMin);
  for (let i = 0; i < q.count; i++) { const y = q.getY(i); if (y < -0.5) q.setY(i, -0.5 + (y + 0.5) * k); }
  g.deleteAttribute('normal');
  // el anillo de radio 1 → girado con el nudo en la cadera izquierda → abrazando el tronco → a su altura; y, de las
  // unidades de la malla, a las del hueso de la cadera, del que cuelga
  const izq = Math.sign(Mu.p.x - C.p.x) || 1;
  const enMalla = new THREE.Matrix4().compose(new THREE.Vector3(C.p.x + (xA + xB) / 2, yS, (zA + zB) / 2), new THREE.Quaternion(), new THREE.Vector3((xA - xB) / 2 * FAJIN.HOLGURA, banda, (zA - zB) / 2 * FAJIN.HOLGURA))
    .multiply(new THREE.Matrix4().makeRotationY(izq * THREE.MathUtils.degToRad(FAJIN.NUDO)));
  // (y que no se meta en el cuerpo: el tronco no es una elipse, por detrás y en las esquinas sale más; por ángulos, se
  // mide hasta dónde llega el cuerpo a la altura de la banda y la pieza, nudo y puntas con ella, se aparta hasta ahí)
  g.applyMatrix4(enMalla);
  const cx = C.p.x + (xA + xB) / 2, cz = (zA + zB) / 2, NS = 72, rC = new Float32Array(NS), sec = (dx, dz) => ((Math.floor((Math.atan2(dx, dz) / (2 * Math.PI) + 1) * NS) % NS) + NS) % NS;
  for (let i = 0; i < p.count; i++) { if (Math.abs(p.getY(i) - yS) > banda * 0.7 || Math.abs(p.getX(i) - C.p.x) > lado * 2.1) continue; const dx = p.getX(i) - cx, dz = p.getZ(i) - cz, s = sec(dx, dz); rC[s] = Math.max(rC[s], Math.hypot(dx, dz)); }
  const rS = Float32Array.from(rC, (r, s) => Math.max(r, rC[(s + 1) % NS], rC[(s + NS - 1) % NS]) * 1.025 + banda * 0.06);
  for (let i = 0; i < q.count; i++) { const dx = q.getX(i) - cx, dz = q.getZ(i) - cz, r = Math.hypot(dx, dz); if (r < 1e-6) continue; const f = Math.max(1, rS[sec(dx, dz)] / r); if (f > 1) { q.setX(i, cx + dx * f); q.setZ(i, cz + dz * f); } }
  if (dHem) { const s = -dHem / Math.max(1e-6, zA - zB); for (let i = 0; i < q.count; i++) q.setY(i, q.getY(i) + (q.getZ(i) - cz) * s); }
  g.computeVertexNormals(); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 }));
  m.name = 'fajin'; m.castShadow = true; m.matrixAutoUpdate = false; m.frustumCulled = false;
  m.matrix.copy(sk.skeleton.boneInverses[C.i]).multiply(sk.bindMatrix);
  sk.skeleton.bones[C.i].add(m); root.userData.fajin = m;
}

// ---- las zapatillas ----
// (el color: la zapatilla por encima de la suela, la suela por debajo, con el corte limpio a una altura de la zapatilla)
function zapaMaterial(arriba, suela) {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, metalness: 0 });
  const U = { uArriba: { value: new THREE.Color(arriba) }, uSuela: { value: new THREE.Color(suela) }, uCorte: { value: ZAPA.SUELA } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aAlto; varying float vAlto;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlto = aAlto;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uArriba, uSuela; uniform float uCorte; varying float vAlto;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * (vAlto < uCorte ? uSuela : uArriba), opacity );');
  };
  m.customProgramCacheKey = () => 'zapatilla-kit';
  m.userData.zapaU = U;
  return m;
}
/** Pone (o cambia de color, o quita, sin color) las zapatillas a un pelotari. arriba: el color de la zapatilla; suela: el
 *  de la suela (sin él, como la zapatilla). */
export async function ponZapatillas(root, arriba, suela) {
  if (!root) return;
  const ya = root.userData.zapas;
  if (!arriba) { if (ya) { for (const z of ya.mallas) { z.parent?.remove(z); z.geometry.dispose(); } ya.mat.dispose(); root.userData.zapas = null; } return; }
  const pon = (Z) => { Z.mat.userData.zapaU.uArriba.value.set(arriba); Z.mat.userData.zapaU.uSuela.value.set(suela || arriba); };
  if (ya) { pon(ya); return; }
  const base = await forma('zapatilla');
  if (root.userData.zapas) { pon(root.userData.zapas); return; }
  const sk = malla(root); if (!sk) return;
  const G = sk.geometry, P = G.attributes.position, SI = G.attributes.skinIndex, SW = G.attributes.skinWeight; if (!SI || !SW) return;
  const bb = alto(G), suelo = bb.min.y;
  const pies = [[/LeftFoot$/, /LeftToeBase$/], [/RightFoot$/, /RightToeBase$/]].map(([a, b]) => { const t = huesoEn(sk, a), d = huesoEn(sk, b); return t && d ? { t: t.p, d: d.p } : null; });
  if (!pies[0] || !pies[1]) return;
  const mat = zapaMaterial(arriba, suela || arriba), mallas = [], B = base.attributes.position, nB = B.count;
  for (let lado = 0; lado < 2; lado++) {
    const { t, d } = pies[lado], otro = pies[1 - lado].t, techo = suelo + (t.y - suelo) * 0.9;
    // el eje del pie: del tobillo a la base de los dedos, en el suelo
    const f = new THREE.Vector3(d.x - t.x, 0, d.z - t.z).normalize(), s = new THREE.Vector3(f.z, 0, -f.x);
    // lo que es de este pie: por debajo del tobillo y más cerca de su tobillo que del otro
    const idx = [];
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); if (y > techo) continue;
      if ((x - t.x) ** 2 + (z - t.z) ** 2 < (x - otro.x) ** 2 + (z - otro.z) ** 2) idx.push(i); }
    if (idx.length < 20) return;
    let u0 = Infinity, u1 = -Infinity, w0 = Infinity, w1 = -Infinity, y1 = -Infinity;
    for (const i of idx) { const dx = P.getX(i) - t.x, dz = P.getZ(i) - t.z, u = dx * f.x + dz * f.z, w = dx * s.x + dz * s.z;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); w0 = Math.min(w0, w); w1 = Math.max(w1, w); y1 = Math.max(y1, P.getY(i)); }
    const L = (u1 - u0) * ZAPA.LARGO, uc = (u0 + u1) / 2, W = (w1 - w0) * ZAPA.ANCHO, wc = (w0 + w1) / 2, Hz = (y1 - suelo) * ZAPA.ALTO;
    // la zapatilla de Meshy en su sitio, en las unidades de la malla del pelotari
    const pos = new Float32Array(nB * 3), alt = new Float32Array(nB), si = new Uint16Array(nB * 4), sw = new Float32Array(nB * 4);
    for (let j = 0; j < nB; j++) {
      const bx = B.getX(j), by = B.getY(j), bz = B.getZ(j), u = uc + (bz - 0.5) * L, w = wc + bx * W;
      const x = t.x + f.x * u + s.x * w, y = suelo - Hz * 0.012 + by * Hz, z = t.z + f.z * u + s.z * w;
      pos[j * 3] = x; pos[j * 3 + 1] = y; pos[j * 3 + 2] = z; alt[j] = by;
      // (los huesos del punto del pie más cercano)
      let best = -1, bd = Infinity; for (const i of idx) { const e = (P.getX(i) - x) ** 2 + (P.getY(i) - y) ** 2 + (P.getZ(i) - z) ** 2; if (e < bd) { bd = e; best = i; } }
      for (let c = 0; c < 4; c++) { si[j * 4 + c] = SI.getComponent(best, c); sw[j * 4 + c] = SW.getComponent(best, c); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aAlto', new THREE.BufferAttribute(alt, 1));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    g.setIndex(base.index.clone()); g.computeVertexNormals(); g.computeBoundingSphere();
    const z = new THREE.SkinnedMesh(g, mat); z.name = 'zapatilla'; z.castShadow = true; z.frustumCulled = false;
    z.position.copy(sk.position); z.quaternion.copy(sk.quaternion); z.scale.copy(sk.scale);
    sk.parent.add(z); z.bind(sk.skeleton, sk.bindMatrix); mallas.push(z);
  }
  root.userData.zapas = { mallas, mat };
}
