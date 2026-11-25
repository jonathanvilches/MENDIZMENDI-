// El descanso como en los frontones de verdad (el autor, 25 de noviembre de 2026: «cuando se pide un descanso, los
// jugadores suelen ir junto con sus entrenadores a sentarse a unas sillas y a beber agua… el botillero suele dar
// consejos… ve los puntos débiles del rival y le dice: está lento, puedes hacerle un dos paredes, o al de una dejada, o
// al de un gancho, o cánsale atrás»; y dos fotos de partidos: el pelotari sentado en una silla plegable negra, secándose
// la cara con la toalla, y el botillero de pie, echado hacia él, con un termo en la mano, junto a una columna verde con
// las botellas encima; «es una nevera y a cada lado son las sillas del botillero y del pelotari, y nada más»).
// Aquí, lo que no depende de quién lo dibuja:
//  - dónde van la nevera, las sillas y el botillero de cada lado, en las medidas de la cancha (sillasDe);
//  - la nevera, las sillas y las botellas de encima, en dos piezas (montaSillas);
//  - la postura sentada del pelotari, encima de su animación: muslos al frente, espinillas abajo, la cadera bajada hasta
//    que los pies vuelven a tocar el suelo, el cuerpo algo echado hacia delante y los antebrazos en los muslos; al
//    beber, el brazo derecho lleva la botella a la boca, y al secarse, las dos manos la toalla a la cara (posturaSentado);
//  - la del botillero de pie delante de él, echado hacia él con el termo en la mano (posturaDePie);
//  - el consejo del botillero, en la ventana de conversación de los vecinos, sacado de cómo va el partido de verdad: si vas
//    bien, que sigas así; si no, el cansancio del rival, su estilo (rematador,
//    defensor, estratega o zurdo), su golpe estrella, tus fallos, tu cansancio y el marcador (consejo).
// match.js lleva a los pelotaris a su silla y los vuelve a su sitio; game/fronton.js sienta a los botilleros en la suya
// y, con su pelotari ya sentado, los levanta y los pone delante de él.
import { COURT } from './rules.js';
import { fillMaterial, sharpMap } from '../engine/charLight.js';

/** Hacia dónde mira el que está sentado: hacia la cancha (la pared izquierda), en el giro de las figuras de match.js. */
export const MIRA_SENTADO = -Math.PI / 2;
/** Tiempos del descanso (s): lo que tarda en sentarse y en levantarse, cuándo bebe y cuándo se seca la cara con la
 *  toalla tras sentarse, cuándo habla el botillero, y lo que tarda este en levantarse y llegar delante de su pelotari. */
export const DESC = { sienta: 0.7, levanta: 0.55, anda: 1.7, beber: [[1.0, 2.6], [5.6, 6.8]], toalla: [3.0, 4.7], consejo: 1.2, botSube: 1.3 };

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
    let d = 0.6; S[lado] = { x, z: zc + s * d };
    if (pairs) { d += 0.54; S[lado + 'Mate'] = { x, z: zc + s * d }; }
    d += 0.54; bot[lado] = { x, z: zc + s * d };
    // (el tuyo, delante de tu pelotari y un poco a un lado, echado hacia él, como en la primera foto; el del rival, de pie
    // detrás de la silla del suyo, a su lado: la cámara del descanso mira desde la cancha y, delante, lo tapaba todo)
    pie[lado] = lado === 'rival' ? { x: x + 0.42, z: S[lado].z + s * (pairs ? 0.27 : 0.45) } : pairs ? { x: x - 0.86, z: S[lado].z + s * 0.27 } : { x: x - 0.64, z: S[lado].z + s * 0.5 };
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
    caja(NEG, 0.42, 0.035, 0.42, x, 0.46, z);                          // (asiento)
    caja(NEG, 0.025, 0.22, 0.4, x + 0.205, 0.79, z);                     // (respaldo)
    for (const dz of [-0.19, 0.19]) {
      caja(TUBO, 0.024, 0.92, 0.024, x + 0.21, 0.46, z + dz);            // (patas de atrás, hasta el respaldo)
      caja(TUBO, 0.024, 0.46, 0.024, x - 0.19, 0.23, z + dz);            // (patas de delante)
      caja(TUBO, 0.4, 0.018, 0.018, x + 0.01, 0.12, z + dz);             // (travesaño de abajo)
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

/** La botella del pelotari sentado: en su mano derecha mientras está en la silla (se dibuja en el mundo, siguiendo a
 *  la mano; no cuelga del hueso, que en estos modelos viene a escala 0,01). */
export function botella(T) {
  const g = new T.Group(); g.name = 'descanso-botella';
  const cuerpo = new T.Mesh(new T.CylinderGeometry(0.034, 0.034, 0.2, 10), new T.MeshStandardMaterial({ color: '#cfe9f6', roughness: 0.18, transparent: true, opacity: 0.8 }));
  const tapon = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 0.03, 8), new T.MeshStandardMaterial({ color: '#2a7fd4', roughness: 0.5 }));
  tapon.position.y = 0.115; g.add(cuerpo, tapon); g.visible = false; return g;
}
/** La toalla con la que el pelotari se seca la cara (la primera foto del autor): un paño claro entre sus dos manos. */
export function toalla(T) {
  const m = new T.Mesh(new T.BoxGeometry(0.34, 0.46, 0.014), new T.MeshStandardMaterial({ color: '#c9d3df', roughness: 0.95 }));
  m.name = 'descanso-toalla'; m.visible = false; return m;
}
/** El termo de metal del botillero (la primera foto: lo lleva en la mano, delante de su pelotari). */
export function termo(T) {
  const g = new T.Group(); g.name = 'descanso-termo';
  const mt = new T.MeshStandardMaterial({ color: '#b9bdc2', roughness: 0.28, metalness: 0.85 });
  const cuerpo = new T.Mesh(new T.CylinderGeometry(0.036, 0.036, 0.25, 12), mt), tapa = new T.Mesh(new T.CylinderGeometry(0.03, 0.036, 0.05, 12), mt);
  tapa.position.y = 0.15; g.add(cuerpo, tapa); g.visible = false; return g;
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
      const man = o.skeleton.bones.map(b => /Hand|ForeArm/.test(b.name)), si = g.attributes.skinIndex, sw = g.attributes.skinWeight, A = new Float32Array(si.count);
      for (let i = 0; i < si.count; i++) { let w = 0; for (let c = 0; c < 4; c++) if (man[si.getComponent(i, c)]) w += sw.getComponent(i, c); A[i] = w; }
      g.setAttribute('aBoMano', new T.BufferAttribute(A, 1));
    }
    // (una copia del material, que pierde los sombreadores del original: se le vuelven a poner, como a los pelotaris del
    // partido (actors/npcOutfit.js): el relleno de luz y su pintura, y la textura nítida, sin mezclar sus piezas)
    const fk = o.material.userData.fillK, m = o.material.clone(); m.userData.own = true; delete m.userData.pintado;
    m.onBeforeCompile = (sh) => {
      // (el color de la piel, el que saca de su textura actors/sinTacos.js; si no está, uno de piel clara)
      Object.assign(sh.uniforms, U, { uBoKit: { value: kit }, uBoPiel: m.userData.sinTacos?.uPiel || { value: new T.Vector3(0.95, 0.78, 0.68) } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vBoY, vBoMano; uniform vec2 uBoKit; attribute float aBoMano;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBoY = (position.y - uBoKit.x) / uBoKit.y; vBoMano = aBoMano;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uBoCam, uBoHom, uBoVaq, uBoPiel; varying float vBoY, vBoMano;
${GL_HSV}
vec3 boRopa(vec3 lin){
  vec3 cs = pow(max(lin, vec3(0.)), vec3(0.4545)); vec3 q = boHsv(cs); float h = q.x, s = q.y, v = q.z, y = vBoY;
  bool blue = h > 0.5 && h < 0.75 && s > 0.3, white = s < 0.2 && v > 0.42, red = (h < 0.05 || h > 0.93) && s > 0.45 && v > 0.2;
  vec3 o = cs;
  if (vBoMano > 0.3) { if (white || (h > 0.085 && h < 0.2 && v > 0.38) || vBoMano > 0.6) o = mix(cs, uBoPiel * clamp(pow(v / 0.8, 0.8), 0.55, 1.2), smoothstep(0.3, 0.55, vBoMano)); return pow(o, vec3(2.2)); }
  if (y > 0.2 && y < 0.72 && blue) o = boTono(y > 0.63 ? uBoHom : uBoCam, v, 0.62);
  else if (y > 0.3 && y < 0.5 && red) o = boTono(uBoCam, v, 0.62);
  else if (y > 0.075 && y <= 0.42 && white) o = boTono(uBoVaq, v, 0.86);
  return pow(o, vec3(2.2));
}`).replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = boRopa(diffuseColor.rgb);')
        // (y la luz propia del personaje, que sale de la textura: con el color ya cambiado; si no, asomaba la ropa de antes)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = emissive * diffuseColor.rgb;');
    };
    m.customProgramCacheKey = () => 'botillero-' + ropa.camiseta;
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
  const B = {}, want = ['Hips', 'Spine', 'Neck', 'Head', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand'];
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
// (un objeto suelto en el mundo, colocado en p con su eje y hacia eje)
function coloca(T, o, p, eje) {
  const par = o.parent; if (!par) return;
  par.updateMatrixWorld(true); o.position.copy(par.worldToLocal(p.clone()));
  const qw = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), eje.clone().normalize());
  qw.premultiply(par.getWorldQuaternion(new T.Quaternion()).invert()); o.quaternion.copy(qw);
}
/** Sienta a la figura obj con peso w (0 de pie, 1 sentado), mirando hacia fx, fz (en el mundo). bebe: 0 a 1, lo que
 *  sube la botella a la boca. bot: la botella (botella()), que se coloca en su mano. habla: 0 a 1, la mano derecha
 *  adelante y arriba, como quien explica algo. seca: 0 a 1, las dos manos a la cara con la toalla toa (toalla()).
 *  Sin esqueleto, no hace nada. */
export function posturaSentado(T, obj, w, fx, fz, bebe = 0, bot = null, habla = 0, seca = 0, toa = null) {
  const B = huesos(obj); if (!B) { if (bot) bot.visible = false; if (toa) toa.visible = false; return; }
  const H = B.Hips, u = obj.userData;
  // (la cadera la mueve la animación en cada fotograma; si esta no tiene pista de posición, se deshace lo que se bajó en
  // el anterior antes de volver a bajarla, para que no se hunda)
  if (u.silla?.ult && H.position.equals(u.silla.ult)) H.position.copy(u.silla.base);
  if (w <= 0.001) { if (bot) bot.visible = false; if (toa) toa.visible = false; if (u.silla) u.silla.ult = null; return; }
  (u.silla ||= { base: new T.Vector3(), ult: null }).base.copy(H.position);
  obj.updateMatrixWorld(true);
  const up = v(T, 'c').set(0, 1, 0), f = new T.Vector3(fx, 0, fz).normalize();
  const pie = () => Math.min(B.LeftFoot ? B.LeftFoot.getWorldPosition(v(T, 'd')).y : Infinity, B.RightFoot ? B.RightFoot.getWorldPosition(v(T, 'd')).y : Infinity);
  const y0 = pie(), hp = H.getWorldPosition(new T.Vector3());
  // (muslos al frente, un poco abiertos; espinillas abajo, con los pies algo adelantados)
  for (const [U, L, F] of [[B.LeftUpLeg, B.LeftLeg, B.LeftFoot], [B.RightUpLeg, B.RightLeg, B.RightFoot]]) {
    const fuera = U.getWorldPosition(new T.Vector3()).sub(hp).setY(0); if (fuera.lengthSq() > 1e-6) fuera.normalize();
    apunta(T, U, L, new T.Vector3().copy(f).multiplyScalar(0.97).addScaledVector(fuera, 0.16).addScaledVector(up, -0.08).normalize(), w);
    apunta(T, L, F, new T.Vector3().copy(f).multiplyScalar(0.16).addScaledVector(up, -1).addScaledVector(fuera, 0.05).normalize(), w);
  }
  // (la cadera, abajo hasta que los pies vuelven al suelo: así se queda sentado, con el culo a la altura del asiento)
  const y1 = pie();
  if (Number.isFinite(y0) && Number.isFinite(y1) && y1 > y0) {
    const wp = H.getWorldPosition(new T.Vector3()); wp.y -= (y1 - y0);
    H.parent.updateMatrixWorld(true); H.position.copy(H.parent.worldToLocal(wp)); H.updateMatrixWorld(true);
  }
  // (el cuerpo, algo echado hacia delante, cansado; al secarse, más, hacia la toalla)
  if (B.Spine && B.Neck) apunta(T, B.Spine, B.Neck, new T.Vector3().copy(up).addScaledVector(f, 0.38 + 0.2 * seca).normalize(), w);
  // (los brazos: los antebrazos apoyados en los muslos; el derecho, al beber, lleva la botella a la boca; al secarse,
  // los dos a la cara)
  const sp = (B.Spine || H).getWorldPosition(new T.Vector3());
  for (const [A, Fa, Hd, der] of [[B.LeftArm, B.LeftForeArm, B.LeftHand, false], [B.RightArm, B.RightForeArm, B.RightHand, true]]) {
    if (!A || !Fa || !Hd) continue;
    const fuera = A.getWorldPosition(new T.Vector3()).sub(sp).setY(0); if (fuera.lengthSq() > 1e-6) fuera.normalize();
    const b = Math.max(der ? bebe : 0, seca), hb = der ? habla : 0;
    const brazo = new T.Vector3().addScaledVector(up, -0.78 + 0.45 * b + 0.3 * hb).addScaledVector(f, 0.5 + 0.1 * b + 0.2 * hb).addScaledVector(fuera, 0.1 + 0.2 * b + 0.15 * hb).normalize();
    apunta(T, A, Fa, brazo, w);
    let ante = new T.Vector3().copy(f).multiplyScalar(0.85).addScaledVector(up, -0.42 + 0.75 * hb).addScaledVector(fuera, -0.28 + 0.2 * hb).normalize();
    if (b > 0 && B.Head) {   // (a la boca, un poco delante y debajo de la cabeza; o a la cara, cada mano a su lado)
      const cab = B.Head.getWorldPosition(new T.Vector3()), codo = Fa.getWorldPosition(new T.Vector3());
      const boca = cab.clone().addScaledVector(f, 0.12).addScaledVector(up, -0.06), cara = cab.clone().addScaledVector(f, 0.13).addScaledVector(fuera, 0.06).addScaledVector(up, 0.02);
      const ob = seca >= (der ? bebe : 0) ? cara : boca;
      ante.lerp(ob.sub(codo).normalize(), b).normalize();
    }
    apunta(T, Fa, Hd, ante, w);
  }
  u.silla.ult = H.position.clone();
  // (la botella, en la palma derecha; de pie, con el tapón arriba, y al beber, inclinada hacia la boca. Mientras se seca,
  // guardada)
  if (bot && B.RightHand) {
    bot.visible = w > 0.6 && seca < 0.25;
    if (bot.visible) coloca(T, bot, B.RightHand.getWorldPosition(new T.Vector3()).addScaledVector(f, 0.05), new T.Vector3().copy(up).lerp(new T.Vector3().copy(f).multiplyScalar(-1).addScaledVector(up, 0.55), bebe));
  }
  // (la toalla, entre las dos manos y la cara, colgando un poco)
  if (toa && B.LeftHand && B.RightHand) {
    toa.visible = w > 0.6 && seca > 0.3;
    if (toa.visible) {
      const m = B.LeftHand.getWorldPosition(new T.Vector3()).add(B.RightHand.getWorldPosition(new T.Vector3())).multiplyScalar(0.5).addScaledVector(f, -0.03).addScaledVector(up, -0.1);
      const par = toa.parent; par.updateMatrixWorld(true); toa.position.copy(par.worldToLocal(m));
      const lado = new T.Vector3().crossVectors(up, f).normalize(), mm = new T.Matrix4().makeBasis(lado, up, f);
      toa.quaternion.setFromRotationMatrix(mm).premultiply(par.getWorldQuaternion(new T.Quaternion()).invert());
    }
  }
}
/** El botillero de pie delante de su pelotari sentado (las dos fotos del autor): con peso w (0 a 1), echado hacia él,
 *  la cabeza baja mirándole, el termo en la mano derecha a la altura de la cintura y la izquierda por delante, moviéndose
 *  al hablar (habla, 0 a 1). fx, fz: hacia el pelotari. ter: el termo (termo()). */
export function posturaDePie(T, obj, w, fx, fz, habla = 0, ter = null) {
  const B = huesos(obj); if (!B || w <= 0.001) { if (ter) ter.visible = false; return; }
  obj.updateMatrixWorld(true);
  const up = v(T, 'c').set(0, 1, 0), f = new T.Vector3(fx, 0, fz).normalize(), H = B.Hips;
  if (B.Spine && B.Neck) apunta(T, B.Spine, B.Neck, new T.Vector3().copy(up).addScaledVector(f, 0.6).normalize(), w);
  if (B.Neck && B.Head) apunta(T, B.Neck, B.Head, new T.Vector3().copy(up).addScaledVector(f, 0.75).normalize(), w);
  const sp = (B.Spine || H).getWorldPosition(new T.Vector3());
  for (const [A, Fa, Hd, der] of [[B.LeftArm, B.LeftForeArm, B.LeftHand, false], [B.RightArm, B.RightForeArm, B.RightHand, true]]) {
    if (!A || !Fa || !Hd) continue;
    const fuera = A.getWorldPosition(new T.Vector3()).sub(sp).setY(0); if (fuera.lengthSq() > 1e-6) fuera.normalize();
    const hb = der ? 0 : habla;
    apunta(T, A, Fa, new T.Vector3().addScaledVector(up, -0.85 + 0.25 * hb).addScaledVector(f, 0.42 + 0.15 * hb).addScaledVector(fuera, 0.1).normalize(), w);
    apunta(T, Fa, Hd, new T.Vector3().copy(f).multiplyScalar(0.9).addScaledVector(up, der ? 0.05 : 0.15 + 0.55 * hb).addScaledVector(fuera, der ? -0.15 : -0.3).normalize(), w);
  }
  if (ter && B.RightHand) { ter.visible = w > 0.5; if (ter.visible) coloca(T, ter, B.RightHand.getWorldPosition(new T.Vector3()).addScaledVector(f, 0.04).addScaledVector(up, -0.02), up); }
}

// ---- el consejo del botillero ----
// (sus palabras: cortas, de frontón, sin explicar la regla; en la ventana de conversación, como las charlas de los
// vecinos. Si vas bien, que sigas así; si no, lo que haría él: un dos paredes, más dejadas, echar la pelota atrás,
// cansarle atrás… según cómo va el rival. {o} {lo} {el}: chico o chica, según el rival)
const FR = {
  es: {
    quien: 'Tu botillero',
    bien: ['Lo estás haciendo muy bien. Sigue jugando así.', 'Así, así. Sigue con lo mismo, que le estás ganando.', 'Muy bien. No cambies nada: sigue jugando así.'],
    bienMas: { cansado: 'Y está cansad{o}: hazle una dejada, que no llega.', nada: 'Bebe, respira y a seguir igual.' },
    cansado: ['Está cansad{o}. Hazle una dejada, que no llega.', 'Está lent{o}. Hazle un dos paredes y muéve{lo} de lado a lado.', 'Va justo de piernas. Cánsa{lo} atrás y remata cuando se quede corto.'],
    defensor: ['Llega a todo. Cánsa{lo} atrás: echa la pelota larga y espera la tuya.'],
    rematador: ['Si le dejas la pelota alta, te remata. Échala atrás, larga y baja.'],
    estratega: ['Te está moviendo mucho. Haz más dejadas y gánale la delantera.'],
    zurdo: ['Es zurd{o}: su derecha es la mala. Búscale el ancho, lejos de la pared.'],
    diestro: ['Juégale a la pared: su izquierda es la mano mala.'],
    estrella: (g) => `Cuidado con su ${g}: es su golpe. No le des pelota a media altura.`,
    fallos: ['Estás fallando mucho. Asegura: echa la pelota atrás, larga y al centro.', 'Intenta meter la pelota en la mano. Espérala y pégale limpio.'],
    cansadoYo: ['Respira hondo. Juega largo y que corra {el}.', 'Aguanta, resiste. Juega largo y que corra {el}.'],
    pierdes: ['Tranquilo, queda partido. Haz más dejadas y cámbiale el ritmo.', 'Aguanta, resiste, que queda partido.'],
    mano: ['Intenta meter la pelota en la mano.'],
    final: '¡Mucho ánimo, que es la final!',
    animo: ['¡Venga, que tú puedes!', 'Aguanta, resiste, que esto se gana.', '¡Ánimo, que esto se gana!', 'Cabeza fría, y a por {el}.'],
  },
  eu: {
    quien: 'Zure botilleroa',
    bien: ['Oso ondo ari zara. Jarraitu horrela jokatzen.', 'Horrela, horrela. Jarraitu berdin, irabazten ari zara.', 'Oso ondo. Ez aldatu ezer: jarraitu horrela.'],
    bienMas: { cansado: 'Eta nekatuta dago: egiozu utzi bat, ez da iristen.', nada: 'Edan, arnasa hartu eta berdin jarraitu.' },
    cansado: ['Nekatuta dago. Egiozu utzi bat, ez da iristen.', 'Motel dago. Egiozu bi paretakoa eta mugi ezazu alde batetik bestera.', 'Hankak justu ditu. Neka ezazu atzean eta errematatu laburra geratzen denean.'],
    defensor: ['Denetara iristen da. Neka ezazu atzean: bota pilota luze eta itxaron zurea.'],
    rematador: ['Pilota altua uzten badiozu, errematatu egingo dizu. Bota atzera, luze eta baxu.'],
    estratega: ['Asko mugitzen ari zaitu. Egin utzi gehiago eta irabazi aurrealdea.'],
    zurdo: ['Ezkertia da: eskuina du txarra. Bilatu zabalera, horman urrun.'],
    diestro: ['Jokatu paretara: ezkerra du esku txarra.'],
    estrella: (g) => `Kontuz bere ${g}rekin: hori du kolpea. Ez eman pilota erdi altueran.`,
    fallos: ['Asko huts egiten ari zara. Ziurtatu: bota pilota atzera, luze eta erdira.', 'Saiatu pilota eskuan sartzen. Itxaron eta jo garbi.'],
    cansadoYo: ['Arnasa hartu. Jokatu luze eta korri dezala berak.', 'Eutsi gogor. Jokatu luze eta korri dezala berak.'],
    pierdes: ['Lasai, partida badago oraindik. Egin utzi gehiago eta aldatu erritmoa.', 'Eutsi gogor, partida badago oraindik.'],
    mano: ['Saiatu pilota eskuan sartzen.'],
    final: 'Animo handia, finala da!',
    animo: ['Tira, zuk ahal duzu!', 'Eutsi gogor, hau irabazten da.', 'Animo, hau irabazten da!', 'Burua hotz, eta aurrera!'],
  },
};
const GOLPE = { es: { cortada: 'cortada', dosparedes: 'dos paredes', gancho: 'gancho', dejada: 'dejada', largo: 'pelota larga' }, eu: { cortada: 'cortada', dosparedes: 'bi paretako', gancho: 'gancho', dejada: 'utzi', largo: 'pilota luze' } };
const gen = (s, chica) => s.replace(/\{o\}/g, chica ? 'a' : 'o').replace(/\{lo\}/g, chica ? 'la' : 'lo').replace(/\{el\}/g, chica ? 'ella' : 'él').replace(/\{e\}/g, chica ? 'a' : 'e');

/** El consejo del botillero a tu pelotari, por lo que ha pasado en el partido. g: la partida (game.js); arq: el estilo
 *  del rival (rules.js, pelotariArq: { arq, zurdo, estrella }); chica: si el rival es chica; dichos: lo ya dicho en
 *  este partido (para no repetir); final: si es la final del campeonato (y entonces, al acabar, ánimo para la final: el
 *  autor, 25 de noviembre de 2026: «y que den ánimos, mucho ánimo para la final. Venga, que tú puedes, aguanta,
 *  resiste. Intenta meter la pelota en la mano»). Devuelve { quien, lineas: [dos o tres frases], bien }. */
export function consejo(g, arq = {}, lang = 'es', chica = false, dichos = new Set(), final = false) {
  const L = FR[lang] || FR.es, Gp = GOLPE[lang] || GOLPE.es;
  const rv = g.players?.rival, yo = g.players?.you, por = g.stats?.por || {}, mio = por.you || {};
  const enR = rv?.en ?? 1, enY = yo?.en ?? 1, dif = (g.score?.you ?? 0) - (g.score?.rival ?? 0), n = (g.score?.you || 0) + (g.score?.rival || 0) + dichos.size;
  const una = (arr) => gen(arr[n % arr.length], chica);
  // (vas bien: por delante en el marcador y sin fallar más de lo que aciertas. Que sigas así)
  if (dif >= 2 && (mio.fallos || 0) <= Math.max(2, mio.hechos || 0) && enY > 0.3) {
    dichos.add('bien');
    const l = [una(L.bien), gen(enR < 0.45 ? L.bienMas.cansado : L.bienMas.nada, chica)]; if (final) l.push(L.final);
    return { quien: L.quien, bien: true, lineas: l };
  }
  const op = [];
  const pon = (clave, peso, lista) => { if (lista) op.push({ clave, peso: dichos.has(clave) ? peso * 0.35 : peso, arr: Array.isArray(lista) ? lista : [lista] }); };
  if (enR < 0.5) pon('cansado', 3 + (0.5 - enR) * 10, L.cansado);
  if (arq.arq === 'defensor') pon('defensor', 2, L.defensor);
  if (arq.arq === 'rematador') pon('rematador', 2, L.rematador);
  if (arq.arq === 'estratega') pon('estratega', 2, L.estratega);
  if (arq.zurdo) pon('zurdo', 2.1, L.zurdo); else pon('diestro', 1.4, L.diestro);
  if (arq.estrella && Gp[arq.estrella]) pon('estrella', 1.2, [L.estrella(Gp[arq.estrella])]);
  if ((mio.fallos || 0) >= 3 && (mio.fallos || 0) > (mio.hechos || 0)) pon('fallos', 2.4 + (mio.fallos || 0) * 0.15, L.fallos);
  if (enY < 0.35) pon('cansadoYo', 2.5, L.cansadoYo);
  if (dif <= -3) pon('pierdes', 1.9, L.pierdes);
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
