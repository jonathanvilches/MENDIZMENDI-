// El descanso como en los frontones de verdad (el autor, 25 de noviembre de 2026: «cuando se pide un descanso, los
// jugadores suelen ir junto con sus entrenadores a sentarse a unas sillas… el botillero suele dar consejos… ve los puntos
// débiles del rival y le dice: está lento, puedes hacerle un dos paredes, o al de una dejada, o al de un gancho, o cánsale
// atrás»; dos fotos de partidos: el pelotari sentado en una silla plegable negra y el botillero de pie, echado hacia él,
// junto a una columna verde con las botellas encima; «es una nevera y a cada lado son las sillas del botillero y del
// pelotari, y nada más»; y luego: «que no se vea cómo se sienta o cómo se levanta… elimina acciones como las de beber»).
// Aquí, lo que no depende de quién lo dibuja:
//  - dónde van la nevera, las sillas y el botillero de cada lado, en las medidas de la cancha (sillasDe);
//  - la nevera, las sillas y las botellas de encima, en dos piezas (montaSillas);
//  - los botilleros que se pueden elegir, con su palmarés y su camiseta, que nunca es roja ni azul (BOTILLEROS), y su ropa
//    de calle sobre la figura de un pelotari (vistePaisano);
//  - la postura sentada, encima de la animación (posturaSentado), y la del botillero de pie, un poco echado hacia su
//    pelotari (posturaDePie);
//  - el consejo del descanso (consejo) y las palabras cuando pierdes varios tantos seguidos (animoRacha).
// match.js hace el fundido del descanso y sienta a los pelotaris; game/fronton.js pone a los botilleros.
import { COURT } from './rules.js';
import { fillMaterial, sharpMap } from '../engine/charLight.js';

/** Hacia dónde mira el que está sentado: hacia la cancha (la pared izquierda), en el giro de las figuras de match.js. */
export const MIRA_SENTADO = -Math.PI / 2;
/** Tiempos del descanso (s): cuándo habla el botillero tras el corte, y el fundido a negro de la entrada y de la salida
 *  (baja, se queda en negro y sube). Nadie se ve andando a la silla, sentándose ni levantándose: en negro, cada uno aparece
 *  ya en su sitio (el autor, 25 de noviembre de 2026: «que no se vea cómo se sienta o cómo se levanta»). */
// (lo alto del tablero del asiento de las sillas: a la medida de las piernas de las figuras del juego, que sentadas tienen
// la rodilla a unos 40 cm del suelo y el muslo, por debajo, a unos 31-34 (más con el pantalón ancho); con el asiento a 48, como una silla de adulto, o
// se hundían en él o se quedaban con los pies colgando. El autor, 26 de noviembre de 2026: «los pelotaris traspasan las sillas… mucho cuidado»)
export const ASIENTO_Y = 0.31;
export const DESC = { consejo: 1.2, fundido: { baja: 0.3, negro: 0.2, sube: 0.4 } };

export { BOTILLEROS, botilleroDe } from './botilleroRetrato.js';   // (los datos, con sus retratos: el menú los lee sin cargar nada del partido)

/** El rincón del descanso, en las medidas de la cancha (x de la pared izquierda, -W/2, hacia el ancho; z desde el
 *  frontis), como en los frontones (el autor, 25 de noviembre de 2026, con dos fotos de partidos de verdad: «es una
 *  nevera y a cada lado son las sillas del botillero y del pelotari, y nada más»): una sola nevera en medio, una columna
 *  verde a la altura de la cintura con el agua encima, y a cada lado las sillas plegables negras de un equipo, la de su
 *  pelotari pegada a la nevera y la de su botillero detrás. Tu lado, hacia el frontis; el del rival, hacia el fondo.
 *  En la contracancha, entre el juez del 4 y el del 7, mirando a la cancha; en el trinquete, que no tiene contracancha,
 *  dentro, junto a la pared de la derecha y al fondo. pairs: con compañeros, su silla entre la del pelotari y la del
 *  botillero. pie: dónde se pone de pie el botillero en el descanso, delante de su pelotari y un poco a un lado. */
export function sillasDe(contra = 2.6, pairs = false) {
  const conContra = contra >= 1.2, W = COURT.W;
  const x = conContra ? W / 2 + Math.min(1.45, contra * 0.5) : W / 2 - 0.95;
  const zc = conContra ? 19.2 : 28.5;
  const S = {}, bot = {}, pie = {};
  for (const [lado, s] of [['you', -1], ['rival', 1]]) {
    let d = 0.7; S[lado] = { x, z: zc + s * d };   // (a 17 cm de la nevera: con 0,6 el codo del pelotari sentado se metía en ella)
    if (pairs) { d += 0.54; S[lado + 'Mate'] = { x, z: zc + s * d }; }
    d += 0.54; bot[lado] = { x, z: zc + s * d };
    // (cada uno, a un lado de su pelotari, un poco por delante y mirándole, como en la primera foto; los dos igual, uno
    // reflejo del otro a cada lado de la nevera: el autor, 26 nov, «el botillero del rival tiene que estar en la misma
    // posición que nuestro botillero… todo tiene que ser coherente». A 0,8 de lado y no a medio metro: las cabezas de los
    // muñecos son grandes y, echado hacia él, la suya se metía en la del pelotari sentado: «choca con la cabeza»)
    // (y luego delante de él, frente a frente, como se ponen en los frontones: el autor, 26 nov, «el botillero se suele
    // poner uno delante del otro, el botillero delante del pelotari». A 1,2: a 0,95 las caras casi se tocaban, nariz con
    // nariz; así, a un palmo largo, como dos que hablan)
    pie[lado] = pairs ? { x: x - 1.0, z: S[lado].z + s * 0.27 } : { x: x - 1.2, z: S[lado].z };
  }
  return { ...S, sillas: [...Object.values(S), bot.you, bot.rival], nevera: { x, z: zc }, bot, pie, x };
}

/** Las sillas plegables (asiento y respaldo negros, patas de tubo), la nevera (una columna verde con la tapa clara, sin
 *  marca) y encima una botella de agua y otra de zumo: una malla opaca con los colores en los vértices y otra para el
 *  agua, que se transparenta. T: three; S: sillasDe. Devuelve el grupo, para quitarlo luego. */
export function montaSillas(T, S) {
  const op = [], agua = [];
  const col = (g, c) => { const k = new T.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = k.r; a[i * 3 + 1] = k.g; a[i * 3 + 2] = k.b; } g.setAttribute('color', new T.BufferAttribute(a, 3)); return g; };
  const caja = (c, w, h, d, x, y, z) => { const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); op.push(col(g, c)); };
  const cil = (arr, c, r0, r1, h, x, y, z, n = 10) => { const g = new T.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); arr.push(col(g, c)); };
  const NEG = '#1b1b1e', TUBO = '#6a6d72';
  // (la silla mira hacia -x, a la cancha: el respaldo, del lado de +x, arriba de las patas de atrás)
  for (const s of S.sillas) {
    const { x, z } = s;
    const A = ASIENTO_Y;
    caja(NEG, 0.42, 0.035, 0.42, x, A - 0.0175, z);                      // (asiento)
    caja(NEG, 0.025, 0.2, 0.4, x + 0.205, A + 0.29, z);                  // (respaldo)
    for (const dz of [-0.19, 0.19]) {
      caja(TUBO, 0.024, A + 0.4, 0.024, x + 0.21, (A + 0.4) / 2, z + dz);  // (patas de atrás, hasta el respaldo)
      caja(TUBO, 0.024, A, 0.024, x - 0.19, A / 2, z + dz);              // (patas de delante)
      caja(TUBO, 0.4, 0.018, 0.018, x + 0.01, 0.11, z + dz);             // (travesaño de abajo)
    }
  }
  { const { x, z } = S.nevera, H = 1.0;
    caja('#174f37', 0.48, 0.06, 0.64, x, 0.03, z);                       // (zócalo)
    caja('#1f6e4a', 0.46, H - 0.06, 0.62, x, 0.06 + (H - 0.06) / 2, z);  // (la columna verde)
    caja('#d9dcd6', 0.48, 0.03, 0.64, x, H + 0.015, z);                  // (su tapa)
    cil(agua, '#cfe9f6', 0.038, 0.038, 0.24, x - 0.08, H + 0.15, z - 0.15);   // (la botella de agua, encima)
    cil(op, '#2a7fd4', 0.016, 0.016, 0.03, x - 0.08, H + 0.285, z - 0.15, 8);  // (su tapón)
    cil(op, '#f0a020', 0.04, 0.04, 0.22, x - 0.05, H + 0.14, z + 0.13);       // (y la de zumo)
    cil(op, '#f4f2ee', 0.017, 0.017, 0.03, x - 0.05, H + 0.265, z + 0.13, 8); }
  const G = new T.Group(); G.name = 'descanso-rincon';
  const une = (arr, mat) => { if (!arr.length) return; const m = new T.Mesh(juntar(T, arr), mat); m.castShadow = true; m.receiveShadow = true; G.add(m); };
  une(op, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 }));
  une(agua, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0, transparent: true, opacity: 0.78 }));
  return G;
}
// (une geometrías sin índice en una sola: las cajas y cilindros de three llevan índice, se quitan antes)
function juntar(T, arr) {
  const at = { position: [], normal: [], color: [] };
  for (const g0 of arr) { const g = g0.index ? g0.toNonIndexed() : g0; for (const k in at) at[k].push(g.attributes[k].array); g0.dispose(); if (g !== g0) g.dispose(); }
  const geo = new T.BufferGeometry();
  for (const k in at) { const n = at[k].reduce((s, a) => s + a.length, 0), A = new Float32Array(n); let o = 0; for (const a of at[k]) { A.set(a, o); o += a.length; } geo.setAttribute(k, new T.BufferAttribute(A, 3)); }
  geo.computeBoundingSphere(); return geo;
}

// ---- la ropa de calle del botillero ----
// (el autor, 25 de noviembre de 2026: «los dos botilleros son iguales… no tienen que ser iguales, tienen mucha falta de
// dibujo, de pintura, de color… y sobre todo los botilleros no llevan tacos en las manos». Cada uno es un pelotari
// distinto de los de siempre, con su cara y su pelo, y sobre su textura, con sus pliegues y sus sombras, la ropa de
// calle: la camiseta azul pasa a la del botillero, con los hombros de otro color, como en la primera foto; el pantalón
// blanco, a vaqueros; y la faja, a la camiseta, que cae por encima. Las manos, de piel: actors/sinTacos.js)
const GL_HSV = `vec3 boHsv(vec3 c){ vec4 K = vec4(0., -1./3., 2./3., -1.); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y), e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6. * d + e)), d / (q.x + e), q.x); }
vec3 boTono(vec3 c, float v, float ref){ float k = clamp(v / ref, 0.45, 1.25); return clamp(c * k + (k - 1.) * 0.07, 0., 1.); }`;
/** Viste de calle al botillero (root: su figura, un pelotari de los de siempre): camiseta del color ropa.camiseta con
 *  los hombros de ropa.hombros, vaqueros ropa.vaqueros. Encima de su material, sin perder su textura. */
export function vistePaisano(T, root, ropa) {
  const c = (x) => { const k = new T.Color(x); return new T.Vector3(Math.pow(k.r, 1 / 2.2), Math.pow(k.g, 1 / 2.2), Math.pow(k.b, 1 / 2.2)); };
  const U = { uBoCam: { value: c(ropa.camiseta) }, uBoHom: { value: c(ropa.hombros || ropa.camiseta) }, uBoVaq: { value: c(ropa.vaqueros || '#3b5878') } };
  root.traverse(o => {
    if (o.userData.pelo || o.userData.peloColor || !o.isSkinnedMesh || !o.material?.map) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox, kit = new T.Vector2(bb.min.y, Math.max(1e-3, bb.max.y - bb.min.y));
    // (las manos y las muñecas, por los huesos que las mueven: ahí, lo blanco de las vendas pasa a piel)
    if (!g.attributes.aBoMano && g.attributes.skinIndex && o.skeleton) {
      // (y, para quitarle la mano cuando lleva la del sanferminero, aBoPalma: cuánto la mueve el hueso de la mano y dónde
      // está su muñeca, en los ejes de la malla; esos puntos se recogen en la muñeca, sin dejar bordes rotos)
      const bs = o.skeleton.bones, man = bs.map(b => /Hand|ForeArm/.test(b.name)), si = g.attributes.skinIndex, sw = g.attributes.skinWeight, A = new Float32Array(si.count), P = new Float32Array(si.count * 4);
      const BI = new T.Matrix4().copy(o.bindMatrix).invert(), mun = bs.map((b, i) => /Hand$/.test(b.name) ? new T.Vector3().applyMatrix4(new T.Matrix4().copy(o.skeleton.boneInverses[i]).invert()).applyMatrix4(BI) : null);
      for (let i = 0; i < si.count; i++) {
        let w = 0, wp = 0, mj = null, mw = 0;
        for (let c = 0; c < 4; c++) { const k = si.getComponent(i, c), x = sw.getComponent(i, c); if (man[k]) w += x; if (mun[k]) { wp += x; if (x > mw) { mw = x; mj = mun[k]; } } }
        A[i] = w; if (mj) { P[i * 4] = mj.x; P[i * 4 + 1] = mj.y; P[i * 4 + 2] = mj.z; } P[i * 4 + 3] = wp;
      }
      g.setAttribute('aBoMano', new T.BufferAttribute(A, 1)); g.setAttribute('aBoPalma', new T.BufferAttribute(P, 4));
    }
    // (una copia del material, que pierde los sombreadores del original: se le vuelven a poner, como a los pelotaris del
    // partido (actors/npcOutfit.js): el relleno de luz y su pintura, y la textura nítida, sin mezclar sus piezas)
    const fk = o.material.userData.fillK, m = o.material.clone(); m.userData.own = true; delete m.userData.pintado;
    m.onBeforeCompile = (sh) => {
      // (el color de la piel, el que saca de su textura actors/sinTacos.js; si no está, uno de piel clara)
      Object.assign(sh.uniforms, U, { uBoKit: { value: kit }, uBoPiel: m.userData.sinTacos?.uPiel || { value: new T.Vector3(0.95, 0.78, 0.68) }, uBoSinMano: { value: ropa.sinMano ? 1 : 0 } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vBoY, vBoMano; uniform vec2 uBoKit; uniform float uBoSinMano; attribute float aBoMano; attribute vec4 aBoPalma;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBoY = (position.y - uBoKit.x) / uBoKit.y; vBoMano = aBoMano;\nif (uBoSinMano > 0.5) transformed = mix(transformed, aBoPalma.xyz, smoothstep(0.3, 0.7, aBoPalma.w));');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uBoCam, uBoHom, uBoVaq, uBoPiel; varying float vBoY, vBoMano;
${GL_HSV}
vec3 boRopa(vec3 lin){
  vec3 cs = pow(max(lin, vec3(0.)), vec3(0.4545)); vec3 q = boHsv(cs); float h = q.x, s = q.y, v = q.z, y = vBoY;
  // (con pesos suaves y no con cortes de sí o no: los puntos de la textura entre dos colores, en el borde del cuello o
  // de la manga, se quedaban sin pintar con el color de antes y el borde salía en escalera. El autor, 26 nov 2026: «los
  // modelos, cuando los miras de cerca, tienen muchos fallos de pintura»)
  float blue = smoothstep(0.45, 0.49, h) * (1. - smoothstep(0.77, 0.81, h)) * smoothstep(0.17, 0.24, s);
  float white = (1. - smoothstep(0.17, 0.23, s)) * smoothstep(0.38, 0.45, v);
  float red = max(1. - smoothstep(0.03, 0.07, h), smoothstep(0.91, 0.95, h)) * smoothstep(0.38, 0.5, s) * smoothstep(0.15, 0.25, v);
  vec3 top = boTono(mix(uBoCam, uBoHom, smoothstep(0.61, 0.65, y)), v, 0.62);
  vec3 o = cs;
  if (vBoMano > 0.3 && vBoMano < 0.6 && blue > 0.5 && y > 0.2) return pow(mix(cs, top, blue), vec3(2.2));   // (el borde de la manga, donde ya pesa algo el antebrazo)
  if (vBoMano > 0.3) { float k = max(max(white, step(0.6, vBoMano)), smoothstep(0.07, 0.1, h) * (1. - smoothstep(0.19, 0.22, h)) * smoothstep(0.34, 0.4, v));
    o = mix(cs, uBoPiel * clamp(pow(v / 0.8, 0.8), 0.55, 1.2), k * smoothstep(0.3, 0.55, vBoMano)); return pow(o, vec3(2.2)); }
  o = mix(o, top, blue * smoothstep(0.18, 0.22, y) * (1. - smoothstep(0.7, 0.74, y)));
  o = mix(o, boTono(uBoCam, v, 0.62), red * smoothstep(0.28, 0.32, y) * (1. - smoothstep(0.48, 0.52, y)));
  o = mix(o, boTono(uBoVaq, v, 0.86), white * smoothstep(0.065, 0.085, y) * (1. - smoothstep(0.4, 0.44, y)));
  return pow(o, vec3(2.2));
}`).replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = boRopa(diffuseColor.rgb);')
        // (y la luz propia del personaje, que sale de la textura: con el color ya cambiado; si no, asomaba la ropa de antes)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = emissive * diffuseColor.rgb;');
    };
    m.customProgramCacheKey = () => 'botillero-' + ropa.camiseta + (ropa.sinMano ? '-sm' : '');
    if (fk != null) fillMaterial(m, fk);
    o.material = sharpMap(m);
    m.needsUpdate = true;
  });
}

// ---- las posturas, encima de la animación ----
const _a = { a: null, b: null, c: null, d: null, q: null, q2: null, q3: null, I: null };
function v(T, k) { return _a[k] ||= new T.Vector3(); }
function q(T, k) { return _a[k] ||= new T.Quaternion(); }
function huesos(obj) {
  const u = obj.userData; if (u.huesosSilla) return u.huesosSilla;
  const B = {}, want = ['Hips', 'Spine', 'Neck', 'Head', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand'];
  obj.traverse(o => { if (!o.isBone) return; for (const k of want) if (!B[k] && new RegExp('(^|[^A-Za-z]|mixamorig)' + k + '$').test(o.name)) B[k] = o; });
  return (u.huesosSilla = B.Hips && B.LeftUpLeg && B.RightUpLeg && B.LeftLeg && B.RightLeg ? B : null);
}
// (gira el hueso b para que la línea de b a su hijo c apunte a dir, mezclado con su pose por w; en el mundo)
function apunta(T, b, c, dir, w) {
  if (!b || !c || !b.parent) return;
  const pa = b.getWorldPosition(v(T, 'a')), pc = c.getWorldPosition(v(T, 'b')); const d = pc.sub(pa); if (d.lengthSq() < 1e-8) return; d.normalize();
  const qq = q(T, 'q').setFromUnitVectors(d, dir), qi = q(T, 'I').identity(), qw = q(T, 'q2').copy(qi).slerp(qq, w);
  const wq = b.getWorldQuaternion(q(T, 'q3')); wq.premultiply(qw);
  const pq = b.parent.getWorldQuaternion(q(T, 'q')); b.quaternion.copy(pq.invert().multiply(wq)); b.updateMatrixWorld(true);
}
// (los vértices de la figura que se apoyan en el asiento: los que mueven sobre todo la cadera, los muslos o la espalda
// baja; se buscan una vez por figura)
function nalgas(obj) {
  const u = obj.userData; if (u.nalgas) return u.nalgas;
  const L = [];
  obj.traverse(m => {
    if (!m.isSkinnedMesh || !m.skeleton) return;
    const sk = m.skeleton.bones.map(b => /(^|[^A-Za-z]|mixamorig)(Hips|LeftUpLeg|RightUpLeg|Spine)$/.test(b.name));
    const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight; if (!si || !sw) return;
    const idx = [];
    for (let i = 0; i < si.count; i += 2) { let w = 0; for (let c = 0; c < 4; c++) if (sk[si.getComponent(i, c)]) w += sw.getComponent(i, c); if (w >= 0.45) idx.push(i); }
    if (idx.length) L.push({ m, idx });
  });
  return (u.nalgas = L);
}
// (cuánto queda la cadera por encima de lo más bajo del cuerpo que cae encima del asiento: con la figura ya sentada. Sin
// la tira de entre las piernas, la entrepierna del pantalón, que al doblar los muslos cuelga, estirada entre los dos, y
// subía a algunos pelotaris diez centímetros; y sin los tres vértices más bajos, por si alguno se sale)
function altoNalga(T, obj, H, a, de) {
  const vv = v(T, 'e'), hp = H.getWorldPosition(new T.Vector3()), ys = [];
  for (const { m, idx } of nalgas(obj)) for (const i of idx) {
    vv.fromBufferAttribute(m.geometry.attributes.position, i); m.applyBoneTransform(i, vv); vv.applyMatrix4(m.matrixWorld);
    if (Math.hypot(vv.x - a.cx, vv.z - a.cz) > a.r) continue;
    if (Math.abs((vv.x - hp.x) * de.x + (vv.z - hp.z) * de.z) < 0.05) continue;
    ys.push(vv.y);
  }
  if (ys.length < 12) return null;
  ys.sort((p, q) => p - q);
  return hp.y - ys[3];
}
/** Sienta a la figura obj con peso w (0 de pie, 1 sentado), mirando hacia fx, fz (en el mundo): muslos al frente,
 *  espinillas abajo, el cuerpo algo echado hacia delante y los antebrazos en los muslos, quietos. Sin esqueleto, no hace
 *  nada. o.asiento = { y, cx, cz, r } (en el mundo: la altura de encima del asiento, su centro y su radio): la figura se
 *  apoya en él, sin hundirse ni quedarse en el aire (se mide con sus vértices), y las espinillas bajan hasta que los pies
 *  tocan el suelo, sin meterse en él (el autor, 26 de noviembre de 2026: «los pelotaris traspasan las sillas… mucho
 *  cuidado»). Sin asiento, la cadera baja hasta que los pies vuelven al suelo. o.atento: el cuerpo más derecho, para seguir
 *  el partido; o.mira: un punto del mundo al que mira (la pelota), con la cabeza. */
export function posturaSentado(T, obj, w, fx, fz, o = {}) {
  const B = huesos(obj); if (!B) return;
  const H = B.Hips, u = obj.userData;
  // (la cadera la mueve la animación en cada fotograma; si esta no tiene pista de posición, se deshace lo que se bajó en
  // el anterior antes de volver a bajarla, para que no se hunda)
  if (u.silla?.ult && H.position.equals(u.silla.ult)) H.position.copy(u.silla.base);
  if (w <= 0.001) { if (u.silla) u.silla.ult = null; return; }
  (u.silla ||= { base: new T.Vector3(), ult: null, n: 0, nalga: null, tobillo: null }).base.copy(H.position);
  obj.updateMatrixWorld(true);
  const up = v(T, 'c').set(0, 1, 0), f = new T.Vector3(fx, 0, fz).normalize(), suelo = obj.getWorldPosition(new T.Vector3()).y;
  const pie = () => Math.min(B.LeftFoot ? B.LeftFoot.getWorldPosition(v(T, 'd')).y : Infinity, B.RightFoot ? B.RightFoot.getWorldPosition(v(T, 'd')).y : Infinity);
  const y0 = pie(), hp = H.getWorldPosition(new T.Vector3());
  // (lo alto del tobillo de pie, sobre el suelo: con eso, los pies se quedan en el suelo al sentarse)
  if (u.silla.tobillo == null && Number.isFinite(y0)) u.silla.tobillo = Math.max(0.03, Math.min(0.16, y0 - suelo));
  // (y cómo va el pie de pie, del tobillo a los dedos: tanto hacia delante, tanto hacia abajo; sentado, igual, plano en el suelo)
  if (u.silla.pieDir == null && B.LeftFoot && B.LeftToeBase) { const d = B.LeftToeBase.getWorldPosition(new T.Vector3()).sub(B.LeftFoot.getWorldPosition(new T.Vector3())), h = Math.hypot(d.x, d.z), l = d.length(); if (l > 1e-4) u.silla.pieDir = [h / l, d.y / l]; }
  // (la pelvis, derecha y de cara adonde mira: la animación la inclina o la gira, y entonces los muslos y las nalgas
  // bajaban o se torcían y se metían en el asiento)
  if (B.Spine) apunta(T, H, B.Spine, up, w);
  { const lr = B.RightUpLeg.getWorldPosition(new T.Vector3()).sub(B.LeftUpLeg.getWorldPosition(new T.Vector3())).setY(0), de = new T.Vector3().crossVectors(f, up).normalize();
    if (lr.lengthSq() > 1e-8) { lr.normalize(); const ang = Math.atan2(lr.z * de.x - lr.x * de.z, lr.x * de.x + lr.z * de.z) * w;
      const qd = new T.Quaternion().setFromAxisAngle(up, ang), wq = H.getWorldQuaternion(new T.Quaternion()).premultiply(qd); H.quaternion.copy(H.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(wq)); H.updateMatrixWorld(true); } }
  hp.copy(H.getWorldPosition(new T.Vector3()));
  // (muslos al frente, un poco abiertos; espinillas abajo, con los pies algo adelantados)
  for (const [U, L, F] of [[B.LeftUpLeg, B.LeftLeg, B.LeftFoot], [B.RightUpLeg, B.RightLeg, B.RightFoot]]) {
    const fuera = U.getWorldPosition(new T.Vector3()).sub(hp).setY(0); if (fuera.lengthSq() > 1e-6) fuera.normalize();
    apunta(T, U, L, new T.Vector3().copy(f).multiplyScalar(0.97).addScaledVector(fuera, 0.13).addScaledVector(up, -0.06).normalize(), w);
    apunta(T, L, F, new T.Vector3().copy(f).multiplyScalar(0.16).addScaledVector(up, -1).addScaledVector(fuera, 0.05).normalize(), w);
  }
  const a = o.asiento;
  if (a && w > 0.99) {
    // (encima del asiento: lo más bajo de las nalgas y los muslos que caen sobre él, a medio centímetro de su tablero.
    // Se mide de vez en cuando; la pose de las piernas no cambia)
    if (u.silla.nalga == null || ++u.silla.n % 30 === 0) { const k = altoNalga(T, obj, H, a, new T.Vector3().crossVectors(f, up).normalize()); if (k != null && k > 0.02 && k < 0.4) u.silla.nalga = k; }
    if (u.silla.nalga != null) {
      const wp = H.getWorldPosition(new T.Vector3()); wp.y = a.y + 0.005 + u.silla.nalga;
      H.parent.updateMatrixWorld(true); H.position.copy(H.parent.worldToLocal(wp)); H.updateMatrixWorld(true);
    }
    // (las espinillas, hasta que el tobillo queda a su altura de pie sobre el suelo: ni en el aire ni dentro del suelo)
    const tob = suelo + (u.silla.tobillo ?? 0.08);
    for (const [U, L, F] of [[B.LeftUpLeg, B.LeftLeg, B.LeftFoot], [B.RightUpLeg, B.RightLeg, B.RightFoot]]) {
      if (!F) continue;
      const kn = L.getWorldPosition(new T.Vector3()), Ls = kn.distanceTo(F.getWorldPosition(new T.Vector3())), dy = kn.y - tob;
      const fuera = U.getWorldPosition(new T.Vector3()).sub(hp).setY(0); if (fuera.lengthSq() > 1e-6) fuera.normalize();
      // (si no llega al suelo, la espinilla algo hacia delante, con el pie colgando un poco adelantado: recta hacia abajo, la
      // pantorrilla rozaba el borde del asiento)
      const adel = dy >= Ls * 0.98 ? 0.2 : Math.sqrt(Ls * Ls - dy * dy) / Ls, abajo = dy >= Ls * 0.98 ? 0.98 : Math.min(1, Math.max(0, dy) / Ls);
      apunta(T, L, F, new T.Vector3().copy(f).multiplyScalar(adel).addScaledVector(up, -abajo).addScaledVector(fuera, 0.04).normalize(), 1);
      const Tb = F === B.LeftFoot ? B.LeftToeBase : B.RightToeBase, pd = u.silla.pieDir;
      if (Tb && pd) apunta(T, F, Tb, new T.Vector3().copy(f).multiplyScalar(pd[0]).addScaledVector(up, pd[1]).addScaledVector(fuera, 0.05).normalize(), 1);   // (el pie, plano)
    }
  } else {
    // (la cadera, abajo hasta que los pies vuelven al suelo: así se queda sentado, con el culo a la altura del asiento)
    const y1 = pie();
    if (Number.isFinite(y0) && Number.isFinite(y1) && y1 > y0) {
      const wp = H.getWorldPosition(new T.Vector3()); wp.y -= (y1 - y0);
      H.parent.updateMatrixWorld(true); H.position.copy(H.parent.worldToLocal(wp)); H.updateMatrixWorld(true);
    }
  }
  // (el cuerpo: algo echado hacia delante, cansado; atento al partido, más derecho)
  if (B.Spine && B.Neck) apunta(T, B.Spine, B.Neck, new T.Vector3().copy(up).addScaledVector(f, o.atento ? 0.2 : 0.38).normalize(), w);
  // (los brazos: los antebrazos apoyados en los muslos)
  const sp = (B.Spine || H).getWorldPosition(new T.Vector3());
  for (const [A, Fa, Hd] of [[B.LeftArm, B.LeftForeArm, B.LeftHand], [B.RightArm, B.RightForeArm, B.RightHand]]) {
    if (!A || !Fa || !Hd) continue;
    const fuera = A.getWorldPosition(new T.Vector3()).sub(sp).setY(0); if (fuera.lengthSq() > 1e-6) fuera.normalize();
    apunta(T, A, Fa, new T.Vector3().addScaledVector(up, -0.78).addScaledVector(f, 0.5).addScaledVector(fuera, 0.06).normalize(), w);
    apunta(T, Fa, Hd, new T.Vector3().copy(f).multiplyScalar(0.85).addScaledVector(up, -0.42).addScaledVector(fuera, -0.28).normalize(), w);
  }
  if (o.mira) mira(T, obj, B, o.mira, f, w, o.dt || 1 / 60, { arriba: o.arriba });
  u.silla.ult = H.position.clone();
}
/** La cabeza hacia un punto del mundo (la pelota, o su botillero), con el cuello: como quien sigue el partido. Con un poco
 *  de retraso, sin pasar de lo que gira un cuello (unos 70° a cada lado; hacia arriba, o.arriba, casi nada si no se dice).
 *  f: hacia dónde mira el cuerpo. Lo de arriba y abajo se suma a la cabeza de su animación, sin ponerla recta: puesta
 *  «derecha» con el eje del hueso, la cara de estos muñecos quedaba mirando al cielo (el autor, 26 nov: «durante el
 *  partido los botilleros tienen la cabeza como levantada») */
function mira(T, obj, B, punto, f, w, dt, o = {}) {
  if (!B.Neck || !B.Head) return;
  const u = obj.userData, M = u.mirada ||= { yaw: 0, pitch: 0 };
  const up = new T.Vector3(0, 1, 0);
  const hp = B.Head.getWorldPosition(new T.Vector3()), d = new T.Vector3().subVectors(punto, hp); if (d.lengthSq() < 1e-4) return; d.normalize();
  const dh = new T.Vector3(d.x, 0, d.z); if (dh.lengthSq() < 1e-6) return; dh.normalize();
  // (hacia dónde mira ya la cara, con lo que traiga su animación de reposo: se gira lo que falta hasta la pelota, no
  // encima de lo que tuviera; si no, el que la animación deja con la cabeza ladeada se quedaba mirando a otro lado)
  const ang = (a, b) => Math.atan2(a.z * b.x - a.x * b.z, a.x * b.x + a.z * b.z);   // (el giro, sobre la vertical, de a hasta b)
  const cara = () => new T.Vector3(0, 0, 1).applyQuaternion(B.Head.getWorldQuaternion(new T.Quaternion()));
  // (arriba, casi nada: la pelota alta se sigue con los ojos; abajo, algo más)
  const yaw = Math.max(-1.22, Math.min(1.22, ang(f, dh))), pitch = Math.max(-0.35, Math.min(o.arriba ?? 0.06, Math.asin(Math.max(-1, Math.min(1, d.y))) * 0.7));
  const k = 1 - Math.exp(-dt * 7); M.yaw += (yaw - M.yaw) * k; M.pitch += (pitch - M.pitch) * k;
  const gira = (b, a, eje) => { const qd = new T.Quaternion().setFromAxisAngle(eje, a * w), wq = b.getWorldQuaternion(new T.Quaternion()).premultiply(qd); b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(wq)); b.updateMatrixWorld(true); };
  const c0 = cara(), ch = new T.Vector3(c0.x, 0, c0.z); if (ch.lengthSq() < 1e-6) return; ch.normalize();
  const falta = M.yaw - ang(f, ch);
  gira(B.Neck, falta * 0.4, up);
  gira(B.Head, falta * 0.6, up);
  const c1 = cara(), fy = new T.Vector3(c1.x, 0, c1.z).normalize(), eje = new T.Vector3().crossVectors(fy, up).normalize();
  gira(B.Neck, M.pitch * 0.35, eje);
  gira(B.Head, M.pitch * 0.55, eje);
}
/** El botillero de pie delante de su pelotari sentado (las fotos del autor): con peso w (0 a 1), un poco echado hacia él y
 *  la cabeza algo baja, mirándole; los brazos, como los lleve su animación de reposo. fx, fz: hacia el pelotari. */
export function posturaDePie(T, obj, w, fx, fz, o = {}) {
  const B = huesos(obj); if (!B || w <= 0.001) return;
  obj.updateMatrixWorld(true);
  const up = v(T, 'c').set(0, 1, 0), f = new T.Vector3(fx, 0, fz).normalize(), t = o.habla || 0;
  // (apenas echado: inclinado como antes, su cabeza bajaba hasta la altura de la del pelotari sentado)
  if (B.Spine && B.Neck) apunta(T, B.Spine, B.Neck, new T.Vector3().copy(up).addScaledVector(f, 0.12).normalize(), w);
  // (hablando, asiente un poco con la cabeza, despacio)
  if (B.Neck && B.Head) apunta(T, B.Neck, B.Head, new T.Vector3().copy(up).addScaledVector(f, 0.3 + (t ? 0.07 * Math.sin(t * 4.2) : 0)).normalize(), w);
  // (los brazos, abajo y sueltos, a los lados: con los de su animación de reposo, abiertos y con las palmas arriba,
  // parecía que se encogía de hombros; y la mano por delante, abierta, no parecía una mano normal: el autor, 26 nov)
  const sp = (B.Spine || B.Hips).getWorldPosition(new T.Vector3());
  for (const [A, Fa, Hd] of [[B.LeftArm, B.LeftForeArm, B.LeftHand], [B.RightArm, B.RightForeArm, B.RightHand]]) {
    if (!A || !Fa || !Hd) continue;
    const fuera = A.getWorldPosition(new T.Vector3()).sub(sp).setY(0); if (fuera.lengthSq() > 1e-6) fuera.normalize();
    apunta(T, A, Fa, new T.Vector3().addScaledVector(up, -1).addScaledVector(fuera, 0.14).addScaledVector(f, 0.06).normalize(), w);
    apunta(T, Fa, Hd, new T.Vector3().addScaledVector(up, -1).addScaledVector(f, 0.16).addScaledVector(fuera, -0.04).normalize(), w);
    // (y la palma hacia el muslo, con el pulgar delante, como cuelga una mano suelta: las figuras no tienen huesos en los
    // dedos, la mano es de una pieza, abierta y algo curvada, y con la palma hacia delante, como la dejaba su animación,
    // parecía una garra. El autor, 26 nov: «las manos de los botilleros no están bien, no son manos normales». Se gira
    // el brazo entero sobre sí mismo, desde el hombro, y no la muñeca, que se retorcería)
    const th = pulgar(T, obj, Hd); if (!th) continue;
    const ax = Hd.getWorldPosition(new T.Vector3()).sub(Fa.getWorldPosition(new T.Vector3())).normalize();
    const a1 = th.clone().applyQuaternion(Hd.getWorldQuaternion(new T.Quaternion())), a2 = f.clone();
    a1.addScaledVector(ax, -a1.dot(ax)); a2.addScaledVector(ax, -a2.dot(ax));
    if (a1.lengthSq() < 1e-6 || a2.lengthSq() < 1e-6) continue; a1.normalize(); a2.normalize();
    const ang = Math.atan2(ax.dot(new T.Vector3().crossVectors(a1, a2)), a1.dot(a2));
    const wq = A.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromAxisAngle(ax, ang * w));
    A.quaternion.copy(A.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(wq)); A.updateMatrixWorld(true);
  }
}
// (hacia dónde queda el pulgar en la mano, en sus ejes: en la postura en que se hizo la figura, con los brazos en cruz y
// las palmas abajo, el pulgar apunta hacia delante, hacia donde mira la figura; se calcula una vez por mano)
function pulgar(T, obj, Hd) {
  const u = obj.userData.pulgar ||= new Map(); if (u.has(Hd)) return u.get(Hd);
  let r = null;
  obj.traverse(m => {
    if (r || !m.isSkinnedMesh || !m.skeleton) return; const i = m.skeleton.bones.indexOf(Hd); if (i < 0) return;
    const qb = new T.Quaternion(), qi = new T.Quaternion(), e = new T.Vector3();
    m.bindMatrix.decompose(e, qb, new T.Vector3()); m.skeleton.boneInverses[i].decompose(e, qi, new T.Vector3());
    r = new T.Vector3(0, 0, 1).applyQuaternion(qb).applyQuaternion(qi).normalize();
  });
  u.set(Hd, r); return r;
}

// ---- el consejo del botillero ----
// (sus palabras: cortas, de frontón, sin explicar la regla; en la ventana de conversación, como las charlas de los
// vecinos. Y que vayan con el juego (el autor, 26 de noviembre de 2026: «que las conversaciones tengan sentido. Que vaya
// con el juego»): primero lo que ha pasado de verdad en este partido (con qué te gana tantos el rival, dónde fallas tú,
// qué le hace daño), y solo si aún no ha pasado nada, lo que sabe del rival por su ficha, y todo lo que dice el juego lo
// cumple: la mano mala (game.js, calidad: al diestro le cuesta la pared; al zurdo, el ancho), el cansancio (corre menos y
// llega tarde a las dejadas), su golpe estrella (el que más busca), la fuerza y las piernas. {o} {lo} {el}: chico o chica)
const FR = {
  es: {
    quien: 'Tu botillero',
    bien: ['Lo estás haciendo muy bien. Sigue jugando así.', 'Así, así. Sigue con lo mismo, que le estás ganando.', 'Muy bien. No cambies nada: sigue jugando así.'],
    bienMas: { cansado: 'Y está cansad{o}: hazle una dejada, que no llega.', nada: 'Respira y a seguir igual.' },
    cansado: ['Está cansad{o}: ya no corre igual. Hazle una dejada, que no llega.', 'Va justo de piernas. Muéve{lo} de lado a lado y remata cuando se quede corto.'],
    defensor: ['Corre mucho y llega a las dejadas. Juégale largo, al fondo, y cánsa{lo}.'],
    rematador: ['Pega muy fuerte. No le dejes la pelota cómoda: muéve{lo} de un lado a otro.'],
    estratega: ['Tiene muy buenas manos y se defiende bien en la pared. Muéve{lo}: una dejada y luego larga.'],
    zurdo: ['Es zurd{o}: su derecha es la mala. Búscale el ancho, lejos de la pared.'],
    diestro: ['Juégale a la pared: pegada a la pared le toca darle con la izquierda, su mano mala.'],
    estrella: {
      dejada: 'Lo suyo es la dejada. No te quedes atrás: espérala un paso más adelante.',
      cortada: 'Lo suyo es la cortada: viene rápida y baja. Espérala un paso más atrás.',
      dosparedes: 'Lo suyo es el dos paredes. Cuando la pelota vaya a la pared, prepárate para el cruce.',
      gancho: 'Lo suyo es el gancho: si le das la pelota alta, de aire, te la manda al ancho. Juégale baja.',
      largo: 'Lo suyo es la pelota larga, al rebote. No te adelantes: espérala atrás.',
    },
    // (lo que ha pasado: n, cuántas veces)
    suDejada: (n) => `Ya te ha hecho ${n} tantos de dejada. No te quedes tan atrás: espéralas más adelante.`,
    suCortada: (n) => `Sus cortadas te han ganado ${n} tantos. Ponte un paso más atrás y espérala.`,
    suSaque: (n) => `Te ha hecho ${n} tantos de saque. Para restar, colócate más atrás.`,
    suAire: (n) => `Ya van ${n} tantos que te la coge de aire. No le dejes la pelota alta.`,
    suDos: (n) => `Te ha ganado ${n} tantos con el dos paredes. Cuando vaya a la pared, prepárate para el cruce.`,
    noLlegas: (n) => `Ya van ${n} tantos que no llegas a su pelota. Vuelve antes al centro después de cada golpe.`,
    tuChapa: (n) => `Ya van ${n} a la chapa. Pégale un poco más alto, sin miedo.`,
    tuLarga: (n) => `Se te ha ido larga ${n} veces. No la cargues tanto: con menos fuerza también hace daño.`,
    tuFuera: (n) => `Se te ha ido fuera ${n} veces por el ancho. Apunta un poco más al centro.`,
    tuSaque: (n) => `Llevas ${n} saques malos. Asegúralo: que bote entre la raya de falta y la de pasa.`,
    tuDejada: 'Tus dejadas le hacen daño: sigue con ellas.',
    tuCortada: 'Tus cortadas le cuestan mucho: sigue por ahí.',
    fallos: ['Estás fallando mucho. Asegura: echa la pelota atrás, larga y al centro.', 'Espera la pelota y pégale limpio, sin prisas.'],
    cansadoYo: ['Respira hondo. Estás cansado: juega largo y que corra {el}.', 'Aguanta, que estás justo de fuerzas. Juega largo y que corra {el}.'],
    pierdes: ['Tranquilo, queda partido. Haz más dejadas y cámbiale el ritmo.', 'Aguanta, resiste, que queda partido.'],
    mano: ['Intenta meter la pelota en la mano: espérala y pégale en su momento.'],
    final: '¡Mucho ánimo, que es la final!',
    animo: ['¡Venga, que tú puedes!', 'Aguanta, resiste, que esto se gana.', '¡Ánimo, que esto se gana!', 'Cabeza fría, y a por {el}.'],
  },
  eu: {
    quien: 'Zure botilleroa',
    bien: ['Oso ondo ari zara. Jarraitu horrela jokatzen.', 'Horrela, horrela. Jarraitu berdin, irabazten ari zara.', 'Oso ondo. Ez aldatu ezer: jarraitu horrela.'],
    bienMas: { cansado: 'Eta nekatuta dago: egiozu utzi bat, ez da iristen.', nada: 'Arnasa hartu eta berdin jarraitu.' },
    cansado: ['Nekatuta dago: ez du lehen bezala korritzen. Egiozu utzi bat, ez da iristen.', 'Hankak justu ditu. Mugi ezazu alde batetik bestera eta errematatu laburra geratzen denean.'],
    defensor: ['Asko korritzen du eta utziei iristen da. Jokatu luze, atzera, eta neka ezazu.'],
    rematador: ['Oso gogor jotzen du. Ez utzi pilota eroso: mugi ezazu alde batetik bestera.'],
    estratega: ['Esku onak ditu eta horman ondo defendatzen da. Mugi ezazu: utzi bat eta gero luze.'],
    zurdo: ['Ezkertia da: eskuina du txarra. Bilatu zabalera, horman urrun.'],
    diestro: ['Jokatu paretara: horman itsatsita ezkerrarekin jo behar du, esku txarrarekin.'],
    estrella: {
      dejada: 'Berea utzia da. Ez geratu atzean: itxaron pauso bat aurrerago.',
      cortada: 'Berea cortada da: azkar eta baxu dator. Itxaron pauso bat atzerago.',
      dosparedes: 'Berea bi paretakoa da. Pilota paretara doanean, prestatu gurutzerako.',
      gancho: 'Berea gancho da: pilota altua ematen badiozu, airean, zabalera bidaltzen dizu. Jokatu baxu.',
      largo: 'Berea pilota luzea da, errebotera. Ez aurreratu: itxaron atzean.',
    },
    suDejada: () => 'Behin baino gehiagotan irabazi dizu utziarekin. Ez geratu hain atzean: itxaron aurrerago.',
    suCortada: () => 'Bere cortadek tantoak irabazi dizkizute. Jarri pauso bat atzerago eta itxaron.',
    suSaque: () => 'Sakearekin tantoak egin dizkizu. Erantzuteko, jarri atzerago.',
    suAire: () => 'Behin baino gehiagotan airean hartu dizu. Ez utzi pilota altua.',
    suDos: () => 'Bi paretakoarekin tantoak irabazi dizkizu. Paretara doanean, prestatu gurutzerako.',
    noLlegas: () => 'Ez zara bere pilotara iristen. Itzuli lehenago erdira kolpe bakoitzaren ondoren.',
    tuChapa: () => 'Behin baino gehiagotan txapara bota duzu. Jo pixka bat altuago, beldurrik gabe.',
    tuLarga: () => 'Luzeegi joan zaizu behin baino gehiagotan. Ez kargatu hainbeste: indar gutxiagorekin ere min ematen du.',
    tuFuera: () => 'Kanpora joan zaizu zabaletik behin baino gehiagotan. Apuntatu pixka bat erdirago.',
    tuSaque: () => 'Sake txarrak egin dituzu. Ziurtatu: falta eta pasa marren artean bote dezala.',
    tuDejada: 'Zure utziek min ematen diote: jarraitu horiekin.',
    tuCortada: 'Zure cortadak asko kostatzen zaizkio: jarraitu horretan.',
    fallos: ['Asko huts egiten ari zara. Ziurtatu: bota pilota atzera, luze eta erdira.', 'Itxaron pilota eta jo garbi, presarik gabe.'],
    cansadoYo: ['Arnasa hartu. Nekatuta zaude: jokatu luze eta korri dezala berak.', 'Eutsi, indar justu zaude. Jokatu luze eta korri dezala berak.'],
    pierdes: ['Lasai, partida badago oraindik. Egin utzi gehiago eta aldatu erritmoa.', 'Eutsi gogor, partida badago oraindik.'],
    mano: ['Saiatu pilota eskuan sartzen: itxaron eta jo bere momentuan.'],
    final: 'Animo handia, finala da!',
    animo: ['Tira, zuk ahal duzu!', 'Eutsi gogor, hau irabazten da.', 'Animo, hau irabazten da!', 'Burua hotz, eta aurrera!'],
  },
};
const gen = (s, chica) => s.replace(/\{o\}/g, chica ? 'a' : 'o').replace(/\{lo\}/g, chica ? 'la' : 'lo').replace(/\{el\}/g, chica ? 'ella' : 'él').replace(/\{e\}/g, chica ? 'a' : 'e');
const NUM = { es: ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'] };
const num = (n, lang) => (NUM[lang] || [])[n] || String(n);

/** El consejo del botillero a tu pelotari, por lo que ha pasado en el partido. g: la partida (game.js); arq: el estilo
 *  del rival (rules.js, pelotariArq: { arq, zurdo, estrella }); chica: si el rival es chica; dichos: lo ya dicho en
 *  este partido (para no repetir); final: si es la final del campeonato (y entonces, al acabar, ánimo para la final: el
 *  autor, 25 de noviembre de 2026: «y que den ánimos, mucho ánimo para la final. Venga, que tú puedes, aguanta,
 *  resiste. Intenta meter la pelota en la mano»). Devuelve { quien, lineas: [dos o tres frases], bien }. */
export function consejo(g, arq = {}, lang = 'es', chica = false, dichos = new Set(), final = false) {
  const L = FR[lang] || FR.es;
  const rv = g.players?.rival, yo = g.players?.you, por = g.stats?.por || {}, mio = por.you || {}, suyo = por.rival || {}, F = mio.faltas || {};
  const enR = rv?.en ?? 1, enY = yo?.en ?? 1, dif = (g.score?.you ?? 0) - (g.score?.rival ?? 0), n = (g.score?.you || 0) + (g.score?.rival || 0) + dichos.size;
  const ag = g.qual?.rival?.agilidad ?? 3;   // (cuanta más agilidad, menos le cuesta su mano mala: game.js, calidad)
  const una = (arr) => gen(arr[n % arr.length], chica), N = (k) => num(k, lang);
  // (lo que hace daño: tus tantos ganados, por cómo)
  const tuyo = (mio.dejada || 0) >= 2 ? L.tuDejada : (mio.cortada || 0) >= 2 ? L.tuCortada : null;
  // (vas bien: por delante en el marcador y sin fallar más de lo que aciertas. Que sigas así, y con qué)
  if (dif >= 2 && (mio.fallos || 0) <= Math.max(2, mio.hechos || 0) && enY > 0.3) {
    dichos.add('bien');
    const l = [una(L.bien), tuyo || gen(enR < 0.45 ? L.bienMas.cansado : L.bienMas.nada, chica)]; if (final) l.push(L.final);
    return { quien: L.quien, bien: true, lineas: l };
  }
  const op = [];
  const pon = (clave, peso, lista) => { if (lista) op.push({ clave, peso: dichos.has(clave) ? peso * 0.35 : peso, arr: Array.isArray(lista) ? lista : [lista] }); };
  // 1) lo que ha pasado en este partido: con qué te gana tantos el rival y dónde fallas tú (lo que más pesa)
  const ev = (clave, k, f, base = 2.6) => { if (k >= 2) pon(clave, base + k * 0.3, f(N(k))); };
  ev('suDejada', suyo.dejada || 0, L.suDejada);
  ev('suCortada', suyo.cortada || 0, L.suCortada);
  ev('suSaque', suyo.saque || 0, L.suSaque);
  ev('suAire', (suyo.aire || 0) + (suyo.volea || 0), L.suAire);
  ev('suDos', suyo.dosparedes || 0, L.suDos);
  { const otros = (suyo.hechos || 0) - (suyo.dejada || 0) - (suyo.cortada || 0) - (suyo.saque || 0) - (suyo.aire || 0) - (suyo.volea || 0) - (suyo.dosparedes || 0); ev('noLlegas', otros, L.noLlegas, 2.2); }
  ev('tuChapa', F.chapa || 0, L.tuChapa, 2.8);
  ev('tuLarga', (F.largo || 0) + (F.cuatro || 0), L.tuLarga, 2.7);
  ev('tuFuera', (F.fuera || 0) + (F.lado || 0), L.tuFuera, 2.7);
  ev('tuSaque', (F.falta || 0) + (F.pasa || 0) + (F.falta45 || 0) + (F.pasa45 || 0), L.tuSaque, 2.7);
  if (tuyo) pon('tuyo', 1.9, tuyo);
  // 2) cómo está el partido: el cansancio de cada uno (la barra de energía) y el marcador
  if (enR < 0.5) pon('cansado', 3 + (0.5 - enR) * 10, L.cansado);
  if (enY < 0.35) pon('cansadoYo', 2.5, L.cansadoYo);
  if ((mio.fallos || 0) >= 3 && (mio.fallos || 0) > (mio.hechos || 0)) pon('fallos', 2.2 + (mio.fallos || 0) * 0.1, L.fallos);
  if (dif <= -3) pon('pierdes', 1.9, L.pierdes);
  // 3) lo que sabe del rival por su ficha: su mano mala, su estilo y su golpe estrella
  if (arq.zurdo) pon('zurdo', 1.5 + (5 - ag) * 0.25, L.zurdo); else pon('diestro', 1.0 + (5 - ag) * 0.25, L.diestro);
  if (arq.arq === 'defensor') pon('defensor', 1.6, L.defensor);
  if (arq.arq === 'rematador') pon('rematador', 1.6, L.rematador);
  if (arq.arq === 'estratega') pon('estratega', 1.6, L.estratega);
  if (arq.estrella && L.estrella[arq.estrella]) pon('estrella', 1.7, L.estrella[arq.estrella]);
  pon('mano', 0.9, L.mano);
  op.sort((a, b) => b.peso - a.peso);
  // (el consejo más claro y, si hay otro que también pesa, el segundo; si no, una palabra de ánimo)
  const [a, b] = op; dichos.add(a.clave);
  const lineas = [una(a.arr)];
  if (b && b.peso >= 1.8) { lineas.push(una(b.arr)); dichos.add(b.clave); } else lineas.push(una(L.animo));
  // (y siempre una palabra de ánimo al final; en la final, la de la final)
  if (final) lineas.push(L.final); else if (b && b.peso >= 1.8) lineas.push(una(L.animo));
  return { quien: L.quien, bien: false, lineas };
}

// ---- unas palabras cuando pierdes varios tantos seguidos ----
// (el autor, 25 de noviembre de 2026: «si llevas unos cuantos tantos que estás perdiendo seguidos, el entrenador también te
// dice unas palabras». Cortas, en una burbuja que no para el juego; {el}, el rival: chico o chica. Si esos tantos se han
// perdido igual, eso es lo que te dice: con qué te los ha ganado o dónde has fallado)
const RACHA = {
  es: ['Tranquilo, respira. Un tanto y cambiamos esto.', 'Venga, que tú puedes. Aguanta, resiste.', 'No te precipites: juega largo y espera tu pelota.',
    'Intenta meter la pelota en la mano y pégale limpio.', 'Cabeza fría. Échala atrás y que corra {el}.', 'Cambia el ritmo: una dejada y luego atrás.'],
  eu: ['Lasai, arnasa hartu. Tanto bat eta hau aldatuko dugu.', 'Tira, zuk ahal duzu. Eutsi gogor.', 'Ez presarik izan: jokatu luze eta itxaron zure pilota.',
    'Saiatu pilota eskuan sartzen eta jo garbi.', 'Burua hotz. Bota atzera eta korri dezala berak.', 'Aldatu erritmoa: utzi bat eta gero atzera.'],
};
const RACHA_POR = {
  es: { dejada: 'Te está ganando con dejadas. No te quedes tan atrás.', cortada: 'Sus cortadas te están ganando. Espérala un paso más atrás.',
    saque: 'Te gana con el saque. Para restar, colócate más atrás.', aire: 'Te la coge de aire. No le dejes la pelota alta.',
    dosparedes: 'Te gana con el dos paredes. Atento al cruce.', chapa: 'Le estás dando a la chapa. Pégale un poco más alto.',
    largo: 'Se te va larga. No la cargues tanto.', fuera: 'Se te va fuera por el ancho. Apunta más al centro.', saqueMal: 'Asegura el saque, sin arriesgar.' },
  eu: { dejada: 'Utziekin irabazten ari zaizu. Ez geratu hain atzean.', cortada: 'Bere cortadak irabazten ari dira. Itxaron pauso bat atzerago.',
    saque: 'Sakearekin irabazten dizu. Erantzuteko, jarri atzerago.', aire: 'Airean hartzen dizu. Ez utzi pilota altua.',
    dosparedes: 'Bi paretakoarekin irabazten dizu. Adi gurutzeari.', chapa: 'Txapara ari zara botatzen. Jo pixka bat altuago.',
    largo: 'Luzeegi joaten zaizu. Ez kargatu hainbeste.', fuera: 'Kanpora joaten zaizu zabaletik. Apuntatu erdirago.', saqueMal: 'Ziurtatu sakea, arriskatu gabe.' },
};
/** Por qué has perdido un tanto, para el botillero (match.js, en cada tanto perdido): 'dejada', 'cortada', 'saque',
 *  'aire', 'dosparedes' (te lo ha ganado así), 'chapa', 'largo', 'fuera', 'saqueMal' (has fallado así) o ''. */
export function porQuePierdes(call, R) {
  if (call === 'bote') { if (!R) return ''; if (R.serve) return 'saque'; const K = R.real || R.kind; if (K === 'dejada' || K === 'cortada' || K === 'dosparedes') return K; return R.volea ? 'aire' : ''; }
  if (call === 'chapa') return 'chapa';
  if (call === 'largo' || call === 'cuatro') return 'largo';
  if (call === 'fuera' || call === 'lado') return 'fuera';
  if (call === 'falta' || call === 'pasa' || call === 'falta45' || call === 'pasa45') return 'saqueMal';
  return '';
}
/** Lo que te dice tu botillero tras n tantos perdidos seguidos (vez: cuántas veces lo ha dicho ya en este partido;
 *  causas: por qué se han perdido, porQuePierdes, del más antiguo al último). */
export function animoRacha(lang = 'es', vez = 0, chica = false, causas = []) {
  const P = RACHA_POR[lang] || RACHA_POR.es, ult = causas.slice(-3).filter(Boolean), cuenta = {};
  for (const c of ult) cuenta[c] = (cuenta[c] || 0) + 1;
  const [mas] = Object.entries(cuenta).sort((a, b) => b[1] - a[1]);
  if (mas && mas[1] >= 2 && P[mas[0]]) return gen(P[mas[0]], chica);
  const L = RACHA[lang] || RACHA.es; return gen(L[vez % L.length], chica);
}
