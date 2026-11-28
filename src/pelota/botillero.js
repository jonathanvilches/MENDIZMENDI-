// El descanso como en los frontones de verdad (el autor, 25 de noviembre de 2026: «cuando se pide un descanso, los
// jugadores suelen ir junto con sus entrenadores a sentarse a unas sillas… el botillero suele dar consejos… ve los puntos
// débiles del rival y le dice: está lento, puedes hacerle un dos paredes, o al de una dejada, o al de un gancho, o cánsale
// atrás»; dos fotos de partidos: el pelotari sentado en una silla plegable negra y el botillero de pie, echado hacia él,
// junto a una columna verde con las botellas encima; «es una nevera y a cada lado son las sillas del botillero y del
// pelotari, y nada más»; y luego: «que no se vea cómo se sienta o cómo se levanta… elimina acciones como las de beber»).
// Aquí, lo que no depende de quién lo dibuja:
//  - dónde van la nevera, las sillas y el botillero de cada lado, en las medidas de la cancha (sillasDe);
//  - la nevera, las sillas y las botellas de encima, en dos piezas (montaSillas);
//  - los botilleros que se pueden elegir, con su palmarés (BOTILLEROS, en botilleroRetrato.js): cada uno, una persona del
//    público tal cual, sentada en su silla, que en el descanso llega andando hasta su pelotari (game/fronton.js);
//  - la postura sentada de los pelotaris, encima de su animación (posturaSentado): ellos no traen la de sentarse;
//  - el consejo del descanso (consejo) y las palabras cuando pierdes varios tantos seguidos (animoRacha).
// match.js hace el fundido del descanso y sienta a los pelotaris; game/fronton.js pone a los botilleros.
import { COURT } from './rules.js';

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
 *  cuidado»). Sin asiento, la cadera baja hasta que los pies vuelven al suelo. o.atento: el cuerpo más derecho. La cabeza,
 *  como la lleve su animación. */
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
  u.silla.ult = H.position.clone();
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
    bien: ['Lo estás haciendo muy bien. Sigue jugando así.', 'Así, así. Sigue con lo mismo, que le estás ganando.', 'Muy bien. No cambies nada: sigue jugando así.',
      'Vas por delante: no regales nada, juega seguro.', 'Esto va muy bien. Cabeza fría y sigue apretando.'],
    bienMas: { cansado: ['Y está cansad{o}: hazle una dejada, que no llega.', 'Y ya va justo de piernas: muéve{lo} de lado a lado.'],
      nada: ['Respira y a seguir igual.', 'No te confíes: cada tanto cuenta.', 'Sigue mandando tú en el peloteo.'] },
    cansado: ['Está cansad{o}: ya no corre igual. Hazle una dejada, que no llega.', 'Va justo de piernas. Muéve{lo} de lado a lado y remata cuando se quede corto.',
      'Se le nota cansad{o}. Alarga los peloteos: cuanto más corra, mejor para ti.', 'Le cuesta llegar. Una dejada al txoko y luego una larga al rebote: a las dos no llega.'],
    defensor: ['Corre mucho y llega a las dejadas. Juégale largo, al fondo, y cánsa{lo}.', 'Lo recoge todo. No tengas prisa: aguanta el peloteo y espera a que se quede corto.',
      'Llega a todo lo de delante. Juégale al rebote y que corra hacia atrás.'],
    rematador: ['Pega muy fuerte. No le dejes la pelota cómoda: muéve{lo} de un lado a otro.', 'Si le das la pelota a la altura de la cintura, remata. Juégale bajo, a ras de chapa.',
      'Tiene mucha pegada: no le dejes armar el brazo. Apúra{lo} con pelotas rápidas.'],
    estratega: ['Tiene muy buenas manos y se defiende bien en la pared. Muéve{lo}: una dejada y luego larga.', 'Lee muy bien el juego. Sorpréndel{e}: cambia el ritmo y la dirección cada dos golpes.',
      'Juega con la cabeza. Tú, más rápido: no le des tiempo a pensar.'],
    zurdo: ['Es zurd{o}: su derecha es la mala. Búscale el ancho, lejos de la pared.', 'Con la derecha le cuesta: mándale la pelota al ancho, al lado contrario de la pared.',
      'Zurd{o}: busca su derecha y, cuando te la devuelva floja, remata.'],
    diestro: ['Juégale a la pared: pegada a la pared le toca darle con la izquierda, su mano mala.', 'Su izquierda es la mano mala: pégala a la pared y que tenga que darle de zurda.',
      'Pelota pegada a la pared y baja: con la izquierda no te hace daño.'],
    estrella: {
      dejada: ['Lo suyo es la dejada. No te quedes atrás: espérala un paso más adelante.', 'Le gusta mucho la dejada. Cuando le veas adelantarse, sal ya hacia el frontis.'],
      cortada: ['Lo suyo es la cortada: viene rápida y baja. Espérala un paso más atrás.', 'Su golpe es la cortada. No te pegues al frontis: deja sitio y llegarás.'],
      dosparedes: ['Lo suyo es el dos paredes. Cuando la pelota vaya a la pared, prepárate para el cruce.', 'Busca mucho el dos paredes. Si la pelota toca la pared izquierda y viene cruzada, ve al ancho.'],
      gancho: ['Lo suyo es el gancho: si le das la pelota alta, de aire, te la manda al ancho. Juégale baja.', 'Tiene un gancho muy bueno. No le levantes la pelota: rasa y al cuerpo.'],
      largo: ['Lo suyo es la pelota larga, al rebote. No te adelantes: espérala atrás.', 'Le gusta mandarla al rebote. Quédate un paso más atrás y la tendrás cómoda.'],
    },
    // (lo que ha pasado: n, cuántas veces)
    suDejada: [(n) => `Ya te ha hecho ${n} tantos de dejada. No te quedes tan atrás: espéralas más adelante.`, (n) => `Lleva ${n} tantos de dejada. Cuando le veas cerca del frontis, adelántate.`],
    suCortada: [(n) => `Sus cortadas te han ganado ${n} tantos. Ponte un paso más atrás y espérala.`, (n) => `Ya van ${n} cortadas que no coges. Retrocede un paso cuando le veas cortar.`],
    suSaque: [(n) => `Te ha hecho ${n} tantos de saque. Para restar, colócate más atrás.`, (n) => `Van ${n} saques que no restas. Ponte más al centro y atrás, y no te precipites.`],
    suAire: [(n) => `Ya van ${n} tantos que te la coge de aire. No le dejes la pelota alta.`, (n) => `Te ha volado ${n} pelotas de aire. Juega más bajo, a ras de chapa.`],
    suDos: [(n) => `Te ha ganado ${n} tantos con el dos paredes. Cuando vaya a la pared, prepárate para el cruce.`, (n) => `Van ${n} tantos de dos paredes. Al ver que va a la pared izquierda, sal al ancho.`],
    noLlegas: [(n) => `Ya van ${n} tantos que no llegas a su pelota. Vuelve antes al centro después de cada golpe.`, (n) => `Van ${n} pelotas que no alcanzas. Usa el esprint para llegar a las que se van lejos.`],
    tuChapa: [(n) => `Ya van ${n} a la chapa. Pégale un poco más alto, sin miedo.`, (n) => `Van ${n} pelotas a la chapa. No la bajes tanto: apunta un poco más arriba.`],
    tuLarga: [(n) => `Se te ha ido larga ${n} veces. No la cargues tanto: con menos fuerza también hace daño.`, (n) => `Van ${n} largas. No cargues siempre el golpe al máximo: a media fuerza también se ganan tantos.`],
    tuFuera: [(n) => `Se te ha ido fuera ${n} veces por el ancho. Apunta un poco más al centro.`, (n) => `Van ${n} fuera por el ancho. Más hacia la pared, que ahí no hay riesgo.`],
    tuSaque: [(n) => `Llevas ${n} saques malos. Asegúralo: que bote entre la raya de falta y la de pasa.`, (n) => `Van ${n} saques fallados. Saca sin forzar: lo importante es que entre.`],
    tuDejada: ['Tus dejadas le hacen daño: sigue con ellas.', 'Las dejadas le están matando. Guárdate una para cuando esté atrás.'],
    tuCortada: ['Tus cortadas le cuestan mucho: sigue por ahí.', 'Tu cortada le cuesta: úsala cuando le veas lejos del frontis.'],
    fallos: ['Estás fallando mucho. Asegura: echa la pelota atrás, larga y al centro.', 'Espera la pelota y pégale limpio, sin prisas.',
      'Muchos errores. Juega al centro del frontis, sin arriesgar, hasta que te llegue una fácil.', 'No busques el tanto en cada golpe: aguanta y que falle {el}.'],
    cansadoYo: ['Respira hondo. Estás cansado: juega largo y que corra {el}.', 'Aguanta, que estás justo de fuerzas. Juega largo y que corra {el}.',
      'Vas sin energía: no esprintes por nada, guárdalo para lo importante.'],
    pierdes: ['Tranquilo, queda partido. Haz más dejadas y cámbiale el ritmo.', 'Aguanta, resiste, que queda partido.',
      'Aún hay partido. Ve tanto a tanto, sin pensar en el marcador.', 'Cambia algo: si no te sale la pelota larga, prueba con dejadas y cortadas.'],
    mano: ['Intenta meter la pelota en la mano: espérala y pégale en su momento.', 'Pégale cuando la pelota baje a la altura de la cintura: ahí sale con más fuerza.',
      'Colócate antes y golpea con calma: mejor un golpe limpio que uno rápido.'],
    // (ideas de cómo ganar, con lo que se puede hacer en el juego: cargar el golpe, la dirección, la cortada a ras de chapa,
    // el dos paredes, el gancho, la volea, el esprint, el saque. El autor, 26 nov 2026: «que el botillero te dé más tips o
    // más ideas de cómo ganar el partido, no que siempre se repitan las mismas situaciones»)
    tactica: ['Mantén pulsado el golpe hasta que el botón se llene: a tope, la pelota llega al rebote.',
      'Con la dirección hacia abajo, la cortada sale a ras de chapa: muy difícil de devolver.',
      'Un dos paredes cuando esté pegad{o} a la pared izquierda: la pelota se le va al ancho.',
      'Alterna: una larga al rebote y luego una dejada. Así no sabe dónde ponerse.',
      'Después de cada golpe, vuelve al centro de la cancha: así llegas a todo.',
      'El saque es tu primer golpe: sácale al ancho para que tenga que correr desde el principio.',
      'Cuando la pelota venga alta, pégale de aire, de volea: le quitas tiempo.',
      'Si {el} está atrás, dejada. Si está delante, larga. Míralo antes de pegar.',
      'Guarda el esprint para las dejadas: corriendo normal no llegas a todas.',
      'Apunta: hacia la derecha, a la raya; hacia la izquierda, pegada a la pared.',
      'No pegues siempre a tope: a media fuerza la pelota bota más corta y también hace daño.',
      'El gancho sale cuando la pelota llega alta: búscalo por encima de la cabeza.'],
    final: '¡Mucho ánimo, que es la final!',
    animo: ['¡Venga, que tú puedes!', 'Aguanta, resiste, que esto se gana.', '¡Ánimo, que esto se gana!', 'Cabeza fría, y a por {el}.', '¡Vamos, que lo tienes!', 'Confía en tu juego.'],
  },
  eu: {
    quien: 'Zure botilleroa',
    bien: ['Oso ondo ari zara. Jarraitu horrela jokatzen.', 'Horrela, horrela. Jarraitu berdin, irabazten ari zara.', 'Oso ondo. Ez aldatu ezer: jarraitu horrela.',
      'Aurretik zoaz: ez oparitu ezer, jokatu seguru.', 'Oso ondo doa. Burua hotz eta jarraitu estutzen.'],
    bienMas: { cansado: ['Eta nekatuta dago: egiozu utzi bat, ez da iristen.', 'Eta hankak justu ditu: mugi ezazu alde batetik bestera.'],
      nada: ['Arnasa hartu eta berdin jarraitu.', 'Ez fidatu: tanto bakoitzak balio du.', 'Jarraitu zuk agintzen peloteoan.'] },
    cansado: ['Nekatuta dago: ez du lehen bezala korritzen. Egiozu utzi bat, ez da iristen.', 'Hankak justu ditu. Mugi ezazu alde batetik bestera eta errematatu laburra geratzen denean.',
      'Nekatuta dago. Luzatu peloteoak: zenbat eta gehiago korritu, hobe zuretzat.', 'Kosta egiten zaio iristea. Utzi bat txokora eta gero luze errebotera: bietara ez da iristen.'],
    defensor: ['Asko korritzen du eta utziei iristen da. Jokatu luze, atzera, eta neka ezazu.', 'Dena jasotzen du. Ez izan presarik: eutsi peloteoari eta itxaron motz geratu arte.',
      'Aurreko guztira iristen da. Jokatu errebotera eta korri dezala atzera.'],
    rematador: ['Oso gogor jotzen du. Ez utzi pilota eroso: mugi ezazu alde batetik bestera.', 'Pilota gerriaren parean ematen badiozu, errematatu egiten du. Jokatu baxu, txapatik gertu.',
      'Indar handia du: ez utzi besoa prestatzen. Estutu pilota azkarrekin.'],
    estratega: ['Esku onak ditu eta horman ondo defendatzen da. Mugi ezazu: utzi bat eta gero luze.', 'Oso ondo irakurtzen du jokoa. Harritu ezazu: aldatu erritmoa eta norabidea bi kolpetik behin.',
      'Buruarekin jokatzen du. Zu, azkarrago: ez eman pentsatzeko denborarik.'],
    zurdo: ['Ezkertia da: eskuina du txarra. Bilatu zabalera, horman urrun.', 'Eskuinarekin kosta egiten zaio: bidali pilota zabalera, hormaren kontrako aldera.',
      'Ezkertia da: bilatu bere eskuina eta, ahul itzultzen dizunean, errematatu.'],
    diestro: ['Jokatu paretara: horman itsatsita ezkerrarekin jo behar du, esku txarrarekin.', 'Ezkerra du esku txarra: itsatsi pilota paretari eta ezkerrez jo beharko du.',
      'Pilota paretari itsatsita eta baxu: ezkerrarekin ez dizu minik egingo.'],
    estrella: {
      dejada: ['Berea utzia da. Ez geratu atzean: itxaron pauso bat aurrerago.', 'Asko gustatzen zaio utzia. Aurreratzen ikusten duzunean, atera frontisera.'],
      cortada: ['Berea cortada da: azkar eta baxu dator. Itxaron pauso bat atzerago.', 'Bere kolpea cortada da. Ez itsatsi frontisari: utzi tartea eta iritsiko zara.'],
      dosparedes: ['Berea bi paretakoa da. Pilota paretara doanean, prestatu gurutzerako.', 'Bi paretakoa asko bilatzen du. Pilotak ezkerreko paretan jo eta gurutzatuta badator, joan zabalera.'],
      gancho: ['Berea gancho da: pilota altua ematen badiozu, airean, zabalera bidaltzen dizu. Jokatu baxu.', 'Gancho oso ona du. Ez altxatu pilota: baxu eta gorputzera.'],
      largo: ['Berea pilota luzea da, errebotera. Ez aurreratu: itxaron atzean.', 'Errebotera bidaltzea gustatzen zaio. Geratu pauso bat atzerago eta eroso izango duzu.'],
    },
    suDejada: [() => 'Behin baino gehiagotan irabazi dizu utziarekin. Ez geratu hain atzean: itxaron aurrerago.', () => 'Utziekin tantoak egiten ari zaizu. Frontisetik gertu ikusten duzunean, aurreratu.'],
    suCortada: [() => 'Bere cortadek tantoak irabazi dizkizute. Jarri pauso bat atzerago eta itxaron.', () => 'Ez dituzu bere cortadak hartzen. Atzeratu pauso bat mozten ikusten duzunean.'],
    suSaque: [() => 'Sakearekin tantoak egin dizkizu. Erantzuteko, jarri atzerago.', () => 'Ez dituzu sakeak erantzuten. Jarri erdirago eta atzerago, eta ez izan presarik.'],
    suAire: [() => 'Behin baino gehiagotan airean hartu dizu. Ez utzi pilota altua.', () => 'Airean hartzen dizkizu pilotak. Jokatu baxuago, txapatik gertu.'],
    suDos: [() => 'Bi paretakoarekin tantoak irabazi dizkizu. Paretara doanean, prestatu gurutzerako.', () => 'Bi paretakoarekin irabazten dizu. Ezkerreko paretara doala ikusten duzunean, atera zabalera.'],
    noLlegas: [() => 'Ez zara bere pilotara iristen. Itzuli lehenago erdira kolpe bakoitzaren ondoren.', () => 'Ez zara pilota batzuetara iristen. Erabili esprinta urrun doazenetara iristeko.'],
    tuChapa: [() => 'Behin baino gehiagotan txapara bota duzu. Jo pixka bat altuago, beldurrik gabe.', () => 'Txapara joaten zaizu. Ez jaitsi hainbeste: apuntatu pixka bat gorago.'],
    tuLarga: [() => 'Luzeegi joan zaizu behin baino gehiagotan. Ez kargatu hainbeste: indar gutxiagorekin ere min ematen du.', () => 'Luze joaten zaizu. Ez kargatu kolpea beti gehienera: indar ertainarekin ere tantoak irabazten dira.'],
    tuFuera: [() => 'Kanpora joan zaizu zabaletik behin baino gehiagotan. Apuntatu pixka bat erdirago.', () => 'Kanpora joaten zaizu zabaletik. Gehiago paretara, hor ez dago arriskurik.'],
    tuSaque: [() => 'Sake txarrak egin dituzu. Ziurtatu: falta eta pasa marren artean bote dezala.', () => 'Sakeak huts egiten dituzu. Atera behartu gabe: garrantzitsuena sartzea da.'],
    tuDejada: ['Zure utziek min ematen diote: jarraitu horiekin.', 'Zure utziek asko kostatzen zaizkio. Gorde bat atzean dagoenerako.'],
    tuCortada: ['Zure cortadak asko kostatzen zaizkio: jarraitu horretan.', 'Zure cortada kosta egiten zaio: erabili frontisetik urrun ikusten duzunean.'],
    fallos: ['Asko huts egiten ari zara. Ziurtatu: bota pilota atzera, luze eta erdira.', 'Itxaron pilota eta jo garbi, presarik gabe.',
      'Akats asko. Jokatu frontisaren erdira, arriskatu gabe, pilota erraz bat iritsi arte.', 'Ez bilatu tantoa kolpe bakoitzean: eutsi eta huts egin dezala berak.'],
    cansadoYo: ['Arnasa hartu. Nekatuta zaude: jokatu luze eta korri dezala berak.', 'Eutsi, indar justu zaude. Jokatu luze eta korri dezala berak.',
      'Energiarik gabe zoaz: ez egin esprintik alferrik, gorde garrantzitsurako.'],
    pierdes: ['Lasai, partida badago oraindik. Egin utzi gehiago eta aldatu erritmoa.', 'Eutsi gogor, partida badago oraindik.',
      'Partida badago oraindik. Tantoz tanto, markagailuan pentsatu gabe.', 'Aldatu zerbait: pilota luzea ateratzen ez bazaizu, saiatu utziekin eta cortadekin.'],
    mano: ['Saiatu pilota eskuan sartzen: itxaron eta jo bere momentuan.', 'Jo pilota gerriaren parera jaisten denean: hor indar gehiagorekin ateratzen da.',
      'Kokatu lehenago eta jo lasai: hobe kolpe garbi bat azkar bat baino.'],
    tactica: ['Eutsi golpea sakatuta botoia bete arte: gehienera, pilota errebotera iristen da.',
      'Norabidea behera duzula, cortada txapatik gertu ateratzen da: oso zaila itzultzen.',
      'Bi paretakoa ezkerreko paretari itsatsita dagoenean: pilota zabalera joaten zaio.',
      'Txandakatu: luze bat errebotera eta gero utzi bat. Horrela ez daki non jarri.',
      'Kolpe bakoitzaren ondoren, itzuli kantxaren erdira: horrela denera iristen zara.',
      'Sakea zure lehen kolpea da: atera zabalera, hasieratik korri dezan.',
      'Pilota altu datorrenean, jo airean, bolean: denbora kentzen diozu.',
      'Atzean badago, utzia. Aurrean badago, luzea. Begiratu jo aurretik.',
      'Gorde esprinta utzietarako: korrika arruntean ez zara denetara iristen.',
      'Apuntatu: eskuinera, marrara; ezkerrera, paretari itsatsita.',
      'Ez jo beti gehienera: indar ertainarekin pilotak motzago egiten du bote eta min ematen du.',
      'Ganchoa pilota altu iristen denean ateratzen da: bilatu buruaren gainetik.'],
    final: 'Animo handia, finala da!',
    animo: ['Tira, zuk ahal duzu!', 'Eutsi gogor, hau irabazten da.', 'Animo, hau irabazten da!', 'Burua hotz, eta aurrera!', 'Goazen, zurea da!', 'Fidatu zure jokoaz.'],
  },
};
const gen = (s, chica) => s.replace(/\{o\}/g, chica ? 'a' : 'o').replace(/\{lo\}/g, chica ? 'la' : 'lo').replace(/\{el\}/g, chica ? 'ella' : 'él').replace(/\{e\}/g, chica ? 'a' : 'e');
const NUM = { es: ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'] };
const num = (n, lang) => (NUM[lang] || [])[n] || String(n);

// (lo que ya te ha dicho, también en partidos anteriores: las últimas frases, guardadas en este aparato, para no repetir
// siempre lo mismo. De cada consejo hay varias frases y se elige una que no haya dicho hace poco; si las ha dicho todas,
// la que dijo hace más tiempo)
const MEM_K = 'herrizherri-botillero-dichos';
let MEM = null;
const memoria = () => {
  if (MEM) return MEM;
  try { MEM = JSON.parse(localStorage.getItem(MEM_K) || '[]'); } catch (e) { MEM = []; }
  if (!Array.isArray(MEM)) MEM = [];
  return MEM;
};
const recuerda = (id) => {
  const m = memoria(), i = m.indexOf(id); if (i >= 0) m.splice(i, 1); m.push(id); while (m.length > 80) m.shift();
  try { localStorage.setItem(MEM_K, JSON.stringify(m)); } catch (e) { /* sin guardado: solo en este partido */ }
};
// (una frase de la lista: de las que no ha dicho hace poco, una cualquiera; si no, la más antigua)
function elige(clave, arr, chica, dichos) {
  const m = memoria(), ids = arr.map((_, i) => `${clave}:${i}`);
  const nuevas = ids.map((id, i) => [id, i]).filter(([id]) => !m.includes(id) && !dichos.has(id));
  const [id, i] = nuevas.length ? nuevas[Math.floor(Math.random() * nuevas.length)] : ids.map((id, i) => [id, i]).sort((a, b) => m.indexOf(a[0]) - m.indexOf(b[0]))[0];
  dichos.add(id); recuerda(id);
  return gen(arr[i], chica);
}
// (cuánto de lo de una lista ha dicho ya hace poco: 0, nada; 1, todo)
const gastado = (clave, arr) => { const m = memoria(); return arr.filter((_, i) => m.includes(`${clave}:${i}`)).length / Math.max(1, arr.length); };

/** El consejo del botillero a tu pelotari, por lo que ha pasado en el partido. g: la partida (game.js); arq: el estilo
 *  del rival (rules.js, pelotariArq: { arq, zurdo, estrella }); chica: si el rival es chica; dichos: lo ya dicho en
 *  este partido (para no repetir); final: si es la final del campeonato (y entonces, al acabar, ánimo para la final: el
 *  autor, 25 de noviembre de 2026: «y que den ánimos, mucho ánimo para la final. Venga, que tú puedes, aguanta,
 *  resiste. Intenta meter la pelota en la mano»). Devuelve { quien, lineas: [dos o tres frases], bien }. */
export function consejo(g, arq = {}, lang = 'es', chica = false, dichos = new Set(), final = false) {
  const L = FR[lang] || FR.es;
  const rv = g.players?.rival, yo = g.players?.you, por = g.stats?.por || {}, mio = por.you || {}, suyo = por.rival || {}, F = mio.faltas || {};
  const enR = rv?.en ?? 1, enY = yo?.en ?? 1, dif = (g.score?.you ?? 0) - (g.score?.rival ?? 0);
  const ag = g.qual?.rival?.agilidad ?? 3;   // (cuanta más agilidad, menos le cuesta su mano mala: game.js, calidad)
  const N = (k) => num(k, lang);
  // (lo que hace daño: tus tantos ganados, por cómo)
  const tuyo = (mio.dejada || 0) >= 2 ? ['tuDejada', L.tuDejada] : (mio.cortada || 0) >= 2 ? ['tuCortada', L.tuCortada] : null;
  // (vas bien: por delante en el marcador y sin fallar más de lo que aciertas. Que sigas así, y con qué; y una idea más)
  if (dif >= 2 && (mio.fallos || 0) <= Math.max(2, mio.hechos || 0) && enY > 0.3) {
    dichos.add('bien');
    const l = [elige('bien', L.bien, chica, dichos), tuyo ? elige(tuyo[0], tuyo[1], chica, dichos) : enR < 0.45 ? elige('bienCansado', L.bienMas.cansado, chica, dichos) : elige('tactica', L.tactica, chica, dichos)];
    if (final) l.push(L.final); else if (!tuyo && enR >= 0.45) l.push(elige('bienNada', L.bienMas.nada, chica, dichos));
    return { quien: L.quien, bien: true, lineas: l };
  }
  const op = [];
  // (fijo: lo que sabe por la ficha del rival o las ideas de siempre; si ya lo ha dicho casi todo hace poco, pesa menos
  // y sale otra cosa)
  const pon = (clave, peso, lista, fijo = false) => { if (!lista) return; const arr = Array.isArray(lista) ? lista : [lista];
    op.push({ clave, peso: peso * (dichos.has(clave) ? 0.35 : 1) * (fijo ? 1 - 0.45 * gastado(clave, arr) : 1), arr }); };
  // 1) lo que ha pasado en este partido: con qué te gana tantos el rival y dónde fallas tú (lo que más pesa)
  const ev = (clave, k, f, base = 2.6) => { if (k >= 2) pon(clave, base + k * 0.3, (Array.isArray(f) ? f : [f]).map(fn => fn(N(k)))); };
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
  if (tuyo) pon(tuyo[0], 1.9, tuyo[1]);
  // 2) cómo está el partido: el cansancio de cada uno (la barra de energía) y el marcador
  if (enR < 0.5) pon('cansado', 3 + (0.5 - enR) * 10, L.cansado);
  if (enY < 0.35) pon('cansadoYo', 2.5, L.cansadoYo);
  if ((mio.fallos || 0) >= 3 && (mio.fallos || 0) > (mio.hechos || 0)) pon('fallos', 2.2 + (mio.fallos || 0) * 0.1, L.fallos);
  if (dif <= -3) pon('pierdes', 1.9, L.pierdes);
  // 3) lo que sabe del rival por su ficha: su mano mala, su estilo y su golpe estrella
  if (arq.zurdo) pon('zurdo', 1.5 + (5 - ag) * 0.25, L.zurdo, true); else pon('diestro', 1.0 + (5 - ag) * 0.25, L.diestro, true);
  if (arq.arq === 'defensor') pon('defensor', 1.6, L.defensor, true);
  if (arq.arq === 'rematador') pon('rematador', 1.6, L.rematador, true);
  if (arq.arq === 'estratega') pon('estratega', 1.6, L.estratega, true);
  if (arq.estrella && L.estrella[arq.estrella]) pon('estrella-' + arq.estrella, 1.7, L.estrella[arq.estrella], true);
  // 4) ideas de cómo ganar el partido, con lo que se puede hacer en el juego (la segunda frase, casi siempre)
  pon('tactica', 1.85, L.tactica, true);
  pon('mano', 0.9, L.mano, true);
  op.sort((a, b) => b.peso - a.peso);
  // (el consejo más claro y, si hay otro que también pesa, el segundo; si no, una palabra de ánimo)
  const [a, b] = op; dichos.add(a.clave);
  const lineas = [elige(a.clave, a.arr, chica, dichos)];
  // (dos ideas casi siempre: la segunda, otra cosa que pese algo, la ficha del rival o una idea de juego)
  const dos = b && b.peso >= 1.5;
  if (dos) { lineas.push(elige(b.clave, b.arr, chica, dichos)); dichos.add(b.clave); } else lineas.push(elige('animo', L.animo, chica, dichos));
  // (y siempre una palabra de ánimo al final; en la final, la de la final)
  if (final) lineas.push(L.final); else if (dos) lineas.push(elige('animo', L.animo, chica, dichos));
  return { quien: L.quien, bien: false, lineas };
}

// ---- unas palabras cuando pierdes varios tantos seguidos ----
// (el autor, 25 de noviembre de 2026: «si llevas unos cuantos tantos que estás perdiendo seguidos, el entrenador también te
// dice unas palabras». Cortas, en una burbuja que no para el juego; {el}, el rival: chico o chica. Si esos tantos se han
// perdido igual, eso es lo que te dice: con qué te los ha ganado o dónde has fallado)
const RACHA = {
  es: ['Tranquilo, respira. Un tanto y cambiamos esto.', 'Venga, que tú puedes. Aguanta, resiste.', 'No te precipites: juega largo y espera tu pelota.',
    'Intenta meter la pelota en la mano y pégale limpio.', 'Cabeza fría. Échala atrás y que corra {el}.', 'Cambia el ritmo: una dejada y luego atrás.',
    'Paciencia: un buen tanto y se pone nervios{o}.', 'Juega más seguro: pelota al centro del frontis y a esperar.', 'Respira entre tanto y tanto. No hay prisa.',
    'Le estás dejando la pelota fácil. Muéve{lo} más.'],
  eu: ['Lasai, arnasa hartu. Tanto bat eta hau aldatuko dugu.', 'Tira, zuk ahal duzu. Eutsi gogor.', 'Ez presarik izan: jokatu luze eta itxaron zure pilota.',
    'Saiatu pilota eskuan sartzen eta jo garbi.', 'Burua hotz. Bota atzera eta korri dezala berak.', 'Aldatu erritmoa: utzi bat eta gero atzera.',
    'Pazientzia: tanto on bat eta urduri jarriko da.', 'Jokatu seguruago: pilota frontisaren erdira eta itxaron.', 'Arnasa hartu tanto batetik bestera. Ez dago presarik.',
    'Pilota errazegi uzten diozu. Mugi ezazu gehiago.'],
};
const RACHA_POR = {
  es: { dejada: ['Te está ganando con dejadas. No te quedes tan atrás.', 'Otra dejada. Adelántate un paso, que te pilla lejos.'],
    cortada: ['Sus cortadas te están ganando. Espérala un paso más atrás.', 'Las cortadas vienen bajas y rápidas: retrocede un paso.'],
    saque: ['Te gana con el saque. Para restar, colócate más atrás.', 'Ese saque te hace daño. Ponte más al centro para restar.'],
    aire: ['Te la coge de aire. No le dejes la pelota alta.', 'Te la vuela. Juega más bajo, a ras de chapa.'],
    dosparedes: ['Te gana con el dos paredes. Atento al cruce.', 'Cuando vaya a la pared izquierda, sal al ancho: viene el dos paredes.'],
    chapa: ['Le estás dando a la chapa. Pégale un poco más alto.', 'Otra a la chapa. Sin miedo: un poco más arriba.'],
    largo: ['Se te va larga. No la cargues tanto.', 'Larga otra vez: suelta el golpe un poco antes.'],
    fuera: ['Se te va fuera por el ancho. Apunta más al centro.', 'Fuera por el ancho. Más hacia la pared.'],
    saqueMal: ['Asegura el saque, sin arriesgar.', 'Saca tranquilo: que entre, aunque no haga daño.'] },
  eu: { dejada: ['Utziekin irabazten ari zaizu. Ez geratu hain atzean.', 'Beste utzi bat. Aurreratu pauso bat, urrun harrapatzen zaitu.'],
    cortada: ['Bere cortadak irabazten ari dira. Itxaron pauso bat atzerago.', 'Cortadak baxu eta azkar datoz: atzeratu pauso bat.'],
    saque: ['Sakearekin irabazten dizu. Erantzuteko, jarri atzerago.', 'Sake horrek min ematen dizu. Jarri erdirago erantzuteko.'],
    aire: ['Airean hartzen dizu. Ez utzi pilota altua.', 'Airean kentzen dizu. Jokatu baxuago, txapatik gertu.'],
    dosparedes: ['Bi paretakoarekin irabazten dizu. Adi gurutzeari.', 'Ezkerreko paretara doanean, atera zabalera: bi paretakoa dator.'],
    chapa: ['Txapara ari zara botatzen. Jo pixka bat altuago.', 'Beste bat txapara. Beldurrik gabe: pixka bat gorago.'],
    largo: ['Luzeegi joaten zaizu. Ez kargatu hainbeste.', 'Luze berriro: askatu kolpea pixka bat lehenago.'],
    fuera: ['Kanpora joaten zaizu zabaletik. Apuntatu erdirago.', 'Kanpora zabaletik. Gehiago paretara.'],
    saqueMal: ['Ziurtatu sakea, arriskatu gabe.', 'Atera lasai: sar dadila, min egiten ez badu ere.'] },
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
  // (cada frase, de las que no ha dicho hace poco: elige, como el consejo del descanso)
  if (mas && mas[1] >= 2 && P[mas[0]]) return elige('racha-' + mas[0], P[mas[0]], chica, new Set());
  return elige('racha', RACHA[lang] || RACHA.es, chica, new Set());
}
