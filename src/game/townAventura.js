// El pueblo (game/townGame.js), su aventura: lo que hay que encontrar por libre y lo que cuesta moverse. Son métodos de
// TownGame: townGame.js los une a su clase (util/mezcla.js), con su this.
//  · Tres tamaños de reto que se ven desde distinta distancia: lo grande (el monte, la iglesia, el castillo: ya
//    estaban), lo mediano (la atalaya del pueblo, en el alto más alto que se alcanza, con su banderola a la vista desde
//    abajo) y lo pequeño (las kutxas, cofres de madera escondidos que solo se ven al pasar cerca).
//  · La atalaya enseña en el mapa dónde quedan las kutxas sin abrir y deja llevar una marca propia a la que elijas.
//  · Las mejoras se ganan, nunca se compran: cada dos atalayas, un quinto más de anillo de resistencia; cada ocho
//    kutxas, un corazón más.
//  · Los corazones: una caída desde muy alto quita uno; sentarse en un banco los devuelve. Sin corazones, se vuelve a
//    la plaza con todos. Nadie se hace daño de verdad: es un susto.
//  · Una montura junto a la entrada (pottoka en la montaña, burro en la Zona Media y la Ribera).
//  · Las pistas llegan cuando hacen falta y una sola vez: al trepar, al caer desde un alto, al nadar.
// Todo se guarda en el perfil de siempre, en un campo nuevo (aventura) que no toca los demás.
import * as THREE from 'three';
import { AventuraHud } from '../ui/aventuraHud.js';
import { Capa } from './planeo.js';
import { Montura } from './montura.js';
import { PLACES, BOUNDARY } from '../world/layout.js';
import { TOWN } from '../world/townBuilder.js';
import { groundHeight, terrainHeight, waterLevelAt } from '../world/heightfield.js';
import { freeFast } from '../world/colliders.js';
import { saveProfile, addXP } from './profile.js';
import { VIENTO } from '../world/viento.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const AV = { kutxas: 5, cadaAtalayas: 2, cadaKutxas: 8, maxAguante: 5, maxCorazon: 3, corazones: 3 };
/** El campo de la aventura en el perfil (se crea vacío la primera vez; lo demás del perfil no se toca). */
export function aventuraDe(P) { const a = P.aventura ||= {}; a.atalayas ||= {}; a.kutxas ||= {}; a.pistas ||= {}; a.marcas ||= {}; return a; }
/** Las mejoras ganadas: quintos de anillo y corazones de más. */
export function mejorasDe(P) {
  const a = aventuraDe(P), nA = Object.keys(a.atalayas).length, nK = Object.values(a.kutxas).reduce((s, l) => s + (l?.length || 0), 0);
  return { atalayas: nA, kutxas: nK, aguante: Math.min(AV.maxAguante, Math.floor(nA / AV.cadaAtalayas)), corazon: Math.min(AV.maxCorazon, Math.floor(nK / AV.cadaKutxas)) };
}

// Las piezas de madera se funden en una sola malla con el color en los vértices: la atalaya entera es una llamada de
// dibujo (más la banderola) y cada kutxa, otra. Hechas de cajas sueltas eran catorce llamadas más por pueblo.
const PINTADO = new THREE.MeshLambertMaterial({ vertexColors: true });
const C_MADERA = new THREE.Color('#8a5f3a'), C_MADERA2 = new THREE.Color('#5e3f26'), C_HIERRO = new THREE.Color('#3a3a40'), C_ORO = new THREE.Color('#ffd166');
function pieza(geo, color, x, y, z, rx = 0) {
  if (rx) geo.rotateX(rx); geo.translate(x, y, z);
  const n = geo.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) color.toArray(col, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.deleteAttribute('uv');
  return geo;
}
const caja = (w, h, d, c, x, y, z) => pieza(new THREE.BoxGeometry(w, h, d), c, x, y, z);
function funde(piezas) { const m = new THREE.Mesh(mergeGeometries(piezas), PINTADO); m.castShadow = true; for (const g of piezas) g.dispose(); return m; }
/** La atalaya: cuatro postes, una plataforma con barandilla, una escalera y un mástil alto con banderola que se ve de lejos. */
function hazAtalaya() {
  const g = new THREE.Group(), H = 3.4, P = [];
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(caja(0.2, H + 1, 0.2, C_MADERA2, x * 1.05, (H + 1) / 2, z * 1.05));
  P.push(caja(2.6, 0.16, 2.6, C_MADERA, 0, H, 0));
  for (const [x, z, w, d] of [[0, -1.2, 2.5, 0.1], [0, 1.2, 2.5, 0.1], [-1.2, 0, 0.1, 2.5]]) P.push(caja(w, 0.1, d, C_MADERA2, x, H + 0.95, z));
  for (let i = 0; i < 9; i++) P.push(caja(0.7, 0.07, 0.1, C_MADERA, 1.35, 0.3 + i * 0.36, 0));
  P.push(caja(0.08, H, 0.08, C_MADERA2, 1.35, H / 2, -0.33), caja(0.08, H, 0.08, C_MADERA2, 1.35, H / 2, 0.33));
  // (el mástil, alto: la banderola queda a unos trece metros y asoma por encima de los tejados del pueblo)
  P.push(caja(0.12, 10.2, 0.12, C_MADERA2, -1.05, H + 5.1, -1.05));
  g.add(funde(P));
  // la banderola: dos colores y un triángulo recortado (no depende solo del color), movida por el viento del pueblo
  const geo = new THREE.PlaneGeometry(1.7, 0.75, 8, 1), p = geo.attributes.position, col = new Float32Array(p.count * 3), c1 = new THREE.Color('#ffd166'), c2 = new THREE.Color('#d42f2f');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.85; if (x > 1.1) p.setY(i, p.getY(i) * (1 - (x - 1.1) / 0.6 * 0.85)); (p.getY(i) > 0 ? c1 : c2).toArray(col, i * 3); p.setX(i, x); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => { sh.uniforms.uT = VIENTO.uT; sh.uniforms.uWind = VIENTO.uWind; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT, uWind;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += sin(uT * 6.0 - position.x * 4.0) * 0.16 * position.x * (0.5 + 0.5 * uWind);'); };
  const b = new THREE.Mesh(geo, mat); b.scale.setScalar(1.5); b.position.set(-1.0, H + 9.6, -1.05); g.add(b);
  return g;
}
/** La kutxa: un cofre pequeño de madera con herrajes y una roseta dorada en el frente; la tapa, aparte, para abrirla. */
function hazKutxa() {
  const g = new THREE.Group();
  g.add(funde([caja(0.62, 0.34, 0.42, C_MADERA, 0, 0.17, 0), caja(0.05, 0.36, 0.44, C_HIERRO, -0.2, 0.18, 0), caja(0.05, 0.36, 0.44, C_HIERRO, 0.2, 0.18, 0), pieza(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 8), C_ORO, 0, 0.26, 0.215, Math.PI / 2)]));
  // (la tapa gira por su borde de atrás: su origen está en la bisagra)
  const tapa = funde([caja(0.66, 0.14, 0.46, C_MADERA2, 0, 0.07, 0.23), caja(0.05, 0.15, 0.47, C_HIERRO, -0.2, 0.07, 0.23), caja(0.05, 0.15, 0.47, C_HIERRO, 0.2, 0.07, 0.23)]);
  tapa.position.set(0, 0.34, -0.23); g.add(tapa); g.userData.tapa = tapa;
  return g;
}

export class PuebloAventura {
  /** Al entrar en el pueblo: lo que hay que encontrar y el estado del jugador. */
  aventuraInicia() {
    if (this.campeonato || this.av) return;
    const P = this.player, D = aventuraDe(this.P), id = this.def.id, M = mejorasDe(this.P);
    const A = this.av = { hud: new AventuraHud(), capa: null, cor: AV.corazones + M.corazon, corMax: AV.corazones + M.corazon, kutxas: [], atalaya: null, montura: null, t: 0, cae: 0 };
    P.aguanteMax = 1 + 0.2 * M.aguante; P.aguante = P.aguanteMax; P.agotado = false;
    P.onModo = (m, antes) => this.aventuraModo(m, antes);
    P.onCaida = () => this.aventuraGolpe();
    P.onRescate = () => { P.place(P.lastSafe.x, P.lastSafe.z, P.heading + Math.PI); P.aguante = Math.min(P.aguanteMax, 0.35); P.agotado = false; this.follow.snap?.(P); this.ui.whisper('¡Uf! Sin fuerzas para nadar. Has vuelto a la orilla.', 4200); };
    let s = 0; for (const ch of id) s = (s * 31 + ch.charCodeAt(0)) >>> 0; s = s % 2147483646 + 1;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const pl = PLACES.plaza, libre = (x, z, r = 1.2) => Math.pow(x ** 4 + z ** 4, 0.25) < BOUNDARY - 12 && freeFast(x, z, r) && waterLevelAt(x, z) < groundHeight(x, z) - 0.05;
    // la atalaya: el alto más alto a una distancia razonable de la plaza, lejos de las casas
    { let best = null, bh = -1e9;
      for (let r = 80; r <= 250; r += 14) for (let a = 0; a < Math.PI * 2; a += 0.22) {
        const x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r;
        if (!libre(x, z, 3) || this.nearHouses(x, z, 26)) continue;
        const h = terrainHeight(x, z) - r * 0.03; if (h > bh) { bh = h; best = { x, z }; }
      }
      if (best) { const o = hazAtalaya(); o.position.set(best.x, groundHeight(best.x, best.z), best.z); o.rotation.y = Math.atan2(pl.x - best.x, pl.z - best.z); this.scene.add(o); A.atalaya = { x: best.x, z: best.z, obj: o, vista: !!D.atalayas[id] }; } }
    // las kutxas: cada una, en el sitio que queda más lejos de todo lo que ya hay (así llenan los huecos del paseo)
    { const hay = this.aventuraPuntos().map(p => [p.x, p.z]), abiertas = D.kutxas[id] || [], cand = [];
      for (let r = 45; r <= 250; r += 13) for (let a = rnd() * 0.3; a < Math.PI * 2; a += 9 / r) { const x = pl.x + Math.cos(a) * r + (rnd() - 0.5) * 6, z = pl.z + Math.sin(a) * r + (rnd() - 0.5) * 6; if (libre(x, z, 1) && !this.nearHouses(x, z, 5)) cand.push([x, z]); }
      for (let i = 0; i < AV.kutxas && cand.length; i++) {
        let bi = -1, bd = -1;
        for (let k = 0; k < cand.length; k++) { let d = 1e9; for (const h of hay) d = Math.min(d, Math.hypot(h[0] - cand[k][0], h[1] - cand[k][1])); if (d > bd) { bd = d; bi = k; } }
        const [x, z] = cand.splice(bi, 1)[0]; hay.push([x, z]);
        const o = hazKutxa(); o.position.set(x, groundHeight(x, z), z); o.rotation.y = rnd() * 6.28; o.visible = false; if (abiertas.includes(i)) o.userData.tapa.rotation.x = -1.1; this.scene.add(o);
        A.kutxas.push({ i, x, z, obj: o, abierta: abiertas.includes(i) });
      } }
    // la montura, junto a donde se entra
    { const tipo = ['ribera', 'ribera-alta', 'zona-media', 'tierra-estella', 'valdizarbe-novenera', 'sanguesa', 'pamplona'].includes(this.def.comarca) ? 'burro' : 'pottoka';
      const sp = this.spot({ x: P.pos.x + 7 * Math.cos(P.heading), z: P.pos.z - 7 * Math.sin(P.heading) }, 6);
      if (sp && libre(sp.x, sp.z, 1.4)) { try { A.montura = new Montura(this, tipo, sp.x, sp.z, P.heading); } catch (e) { console.warn('montura', e); } } }
  }
  /** Los puntos de interés del pueblo y su tamaño (lo usa también tools/puntos-interes.mjs). */
  aventuraPuntos() {
    const L = [{ x: PLACES.plaza.x, z: PLACES.plaza.z, escala: 'grande', nombre: 'plaza' }];
    if (TOWN.church) L.push({ x: TOWN.church.x ?? PLACES.church.x, z: TOWN.church.z ?? PLACES.church.z, escala: 'grande', nombre: 'iglesia', alto: 22 });
    for (const l of TOWN.landmarks || []) L.push({ x: l.spot.x, z: l.spot.z, escala: 'grande', nombre: l.kind, alto: 12 });
    if (this.fronton?.spot) L.push({ x: this.fronton.spot.x, z: this.fronton.spot.z, escala: 'mediano', nombre: 'frontón', alto: 9 });
    if (TOWN.farm) L.push({ x: TOWN.farm.x, z: TOWN.farm.z, escala: 'mediano', nombre: 'granja', alto: 6 });
    for (const M of this.missions || []) if (M.host?.pos) L.push({ x: M.host.pos.x, z: M.host.pos.z, escala: 'mediano', nombre: 'misión' });
    const A = this.av; if (A?.atalaya) L.push({ x: A.atalaya.x, z: A.atalaya.z, escala: 'mediano', nombre: 'atalaya', alto: 13.4 });
    for (const k of A?.kutxas || []) L.push({ x: k.x, z: k.z, escala: 'pequeno', nombre: 'kutxa' });
    return L;
  }
  /** Lo que la aventura añade a los puntos de interés, como lo lee tools/puntos-interes.mjs. */
  puntosInteres() {
    const A = this.av, L = []; if (!A) return L;
    if (A.atalaya) L.push({ x: A.atalaya.x, z: A.atalaya.z, n: 'Atalaya', k: 'atalaya', e: 'mediana', alto: 13.4 });
    for (const k of A.kutxas) L.push({ x: k.x, z: k.z, n: 'Kutxa', k: 'kutxa', e: 'pequeña', oculto: true });
    return L;
  }
  aventuraPista(k, texto, ms = 5200) { const D = aventuraDe(this.P); if (D.pistas[k]) return; D.pistas[k] = 1; saveProfile(); this.ui.whisper(texto, ms); }
  aventuraModo(m, antes) {
    const A = this.av, P = this.player; if (!A) return;
    if (m === 'planea') { A.capa ||= new Capa(P); A.capa.abre(true); if (this.sound?.sfx) this.sound.noiseBurst(0.5, 700, 0.7, 0.12, this.sound.sfx); }   // (el golpe de aire de la capa al abrirse)
    else if (antes === 'planea') A.capa?.abre(false);
    if (m === 'trepa') this.aventuraPista('trepa', 'Estás trepando. Mira el anillo: cuando se vacía, te sueltas. Arriba se descansa.');
    if (m === 'nada') this.aventuraPista('nada', 'Nadas mientras te quede anillo. Con lluvia o con frío se gasta antes.');
    if (m === 'resbala') this.ui.whisper('Sin fuerzas: resbalas. Descansa un momento y prueba por otro lado.', 3600);
  }
  aventuraGolpe() {
    const A = this.av, P = this.player; if (!A) return;
    A.cor = Math.max(0, A.cor - 1); if (this.sound?.sfx) this.sound.tone(150, 0.25, 'triangle', 0.25, this.sound.sfx); this.follow.shake = 0.3;
    if (A.cor > 0) { this.ui.whisper('¡Ay, qué golpe! Desde tan alto, salta y vuelve a pulsar saltar: abres la capa y planeas.', 5200); return; }
    A.cor = A.corMax; const pl = PLACES.plaza, s = this.spot({ x: pl.x, z: pl.z }, 5) || pl;
    P.place(s.x, s.z, P.heading); P.aguante = P.aguanteMax; P.agotado = false; this.follow.snap?.(P);
    this.ui.whisper('Menudo susto. Un vecino te ha acompañado a la plaza: ya estás como nuevo.', 5200);
  }
  /** Sentarse en un banco devuelve los corazones (lo llama townGame al descansar). */
  aventuraDescansa() { const A = this.av; if (A && A.cor < A.corMax) { A.cor = A.corMax; this.ui.toast('Has descansado: todos los corazones', 'sparkle'); } }
  aventuraTick(dt) {
    const A = this.av; if (!A) return;
    const P = this.player, jugando = this.mode === 'play' && !this.pelotaMatch && !this.soloCancha && !this.altScene;
    A.t += dt;
    P.puedeAventura = jugando;
    // la lluvia y el frío gastan antes el anillo
    { const W = this.rt?.weather, k = W ? Math.min(1, W.k || 0) : 0; P.gasto = 1 + (W?.kind === 'rain' ? 0.35 * k : W?.kind === 'snow' ? 0.5 : 0); }
    A.capa?.update(dt);
    A.hud.anilloEn(P, this.camera, dt, jugando && !P.vehiculo && P.obj.visible);
    A.hud.corazones(A.cor, A.corMax, dt, jugando, `Corazones: ${A.cor} de ${A.corMax}`);
    A.montura?.quieta(dt, P);
    // pista: cayendo desde un alto sin la capa abierta
    if (jugando && !P.grounded && P.modo === 'pie' && P.vy < -6) this.aventuraPista('capa', 'En el aire, pulsa saltar otra vez: abres la capa de pastor y bajas planeando.');
    // las kutxas solo se ven de cerca; cerradas, sueltan un brillo de vez en cuando
    for (const k of A.kutxas) {
      const d = Math.hypot(k.x - P.pos.x, k.z - P.pos.z); k.obj.visible = d < 16 && jugando;
      if (!k.abierta && d < 9 && (k.br = (k.br || 0) - dt) <= 0) { k.br = 1.1; this.particles?.emit({ x: k.x, y: k.obj.position.y + 0.6, z: k.z }, { n: 3, color: ['#ffd166', '#fff3c4'], speed: 0.5, size: 0.22, life: 0.9, gravity: -0.6, spread: 0.5 }); }
    }
    // la atalaya, al verla cerca por primera vez
    if (A.atalaya && !A.atalaya.vista && jugando && Math.hypot(A.atalaya.x - P.pos.x, A.atalaya.z - P.pos.z) < 40) this.aventuraPista('atalaya', 'Eso de la banderola es una atalaya. Sube: desde arriba se ve dónde hay cosas escondidas.');
  }
  aventuraAcciones(list, ok) {
    const A = this.av, P = this.player; if (!A || this.pelotaMatch) return;
    if (P.vehiculo === A.montura && A.montura) { list.push({ kind: 'desmontar', x: P.pos.x, z: P.pos.z, r: 99, label: A.montura.T.bajar }); return; }
    if (A.montura && !P.vehiculo && ok(A.montura.x, A.montura.z)) list.push({ kind: 'montar', x: A.montura.x, z: A.montura.z, r: 2.6, label: A.montura.T.subir });
    if (A.atalaya && ok(A.atalaya.x, A.atalaya.z)) list.push({ kind: 'atalaya', x: A.atalaya.x, z: A.atalaya.z, r: 4, label: A.atalaya.vista ? 'Marcar otra kutxa desde la atalaya' : 'Subir a la atalaya' });
    for (const k of A.kutxas) if (!k.abierta && ok(k.x, k.z)) list.push({ kind: 'kutxa', k, x: k.x, z: k.z, r: 2.2, label: 'Abrir la kutxa' });
  }
  /** Devuelve true si la acción era de la aventura. */
  aventuraActua(it) {
    const A = this.av, D = aventuraDe(this.P), id = this.def.id; if (!A) return false;
    if (it.kind === 'montar') { A.montura?.sube(this.player); this.aventuraPista('montura', 'Se lleva como andando. Con la palanca a fondo o corriendo, trota y galopa.'); return true; }
    if (it.kind === 'desmontar') { A.montura?.baja(); return true; }
    if (it.kind === 'kutxa') {
      const k = it.k; if (k.abierta) return true;
      const antes = mejorasDe(this.P).corazon; k.abierta = true; (D.kutxas[id] ||= []).push(k.i); addXP(15); saveProfile();
      this.sound?.fanfare?.(); this.particles?.emit({ x: k.x, y: k.obj.position.y + 0.5, z: k.z }, { n: 16, color: ['#ffd166', '#fff3c4', '#ff8a5c'], speed: 1.6, size: 0.3, life: 1.1, gravity: 1.5, spread: 0.8 });
      k.obj.userData.tapa.rotation.x = -1.1;   // (la tapa, abierta)
      const M = mejorasDe(this.P), quedan = A.kutxas.filter(x => !x.abierta).length;
      if (M.corazon > antes) { A.corMax = AV.corazones + M.corazon; A.cor = A.corMax; this.ui.toast('¡Un corazón más! Lo has ganado abriendo kutxas', 'sparkle', 4200); }
      else this.ui.toast(quedan ? `¡Kutxa abierta! Quedan ${quedan} en este pueblo` : '¡Has abierto todas las kutxas de este pueblo!', 'sparkle', 3600);
      if (D.marcas[id] === k.i) delete D.marcas[id];
      return true;
    }
    if (it.kind === 'atalaya') {
      const P = this.player, cerradas = A.kutxas.filter(x => !x.abierta);
      if (!A.atalaya.vista) {
        const antes = mejorasDe(this.P).aguante; A.atalaya.vista = true; D.atalayas[id] = 1; addXP(40); saveProfile();
        this.sound?.fanfare?.();
        const M = mejorasDe(this.P);
        if (M.aguante > antes) { P.aguanteMax = 1 + 0.2 * M.aguante; P.aguante = P.aguanteMax; this.ui.toast('¡Más resistencia! El anillo crece: lo has ganado subiendo atalayas', 'sparkle', 4600); }
        else this.ui.toast(cerradas.length ? `Atalaya descubierta. En el mapa ya salen las ${cerradas.length} kutxas que quedan` : 'Atalaya descubierta', 'flag', 4600);
      }
      // la marca propia: cada vez que se pide, pasa a la siguiente kutxa sin abrir
      if (cerradas.length) { const i = cerradas.findIndex(x => x.i === D.marcas[id]), k = cerradas[(i + 1) % cerradas.length]; D.marcas[id] = k.i; saveProfile(); if (A.atalaya.vista && i >= 0) this.ui.toast('Marca cambiada: mírala en el mapa', 'pin', 2600); }
      return true;
    }
    return false;
  }
  /** Lo que la aventura añade al mapa: la atalaya, las kutxas que ha enseñado y la marca propia. */
  aventuraMarcas(out) {
    const A = this.av, D = aventuraDe(this.P), id = this.def.id; if (!A) return out;
    if (A.atalaya) out.push({ x: A.atalaya.x, z: A.atalaya.z, icon: 'flag', color: '#ffd166', small: A.atalaya.vista, badge: A.atalaya.vista ? 'ok' : undefined, title: 'Atalaya', text: A.atalaya.vista ? 'Descubierta. Desde aquí se marcan las kutxas' : 'Sube y verás dónde hay cosas escondidas', go: true });
    if (A.atalaya?.vista) for (const k of A.kutxas) if (!k.abierta) { const mia = D.marcas[id] === k.i; out.push({ x: k.x, z: k.z, icon: mia ? 'pin' : 'sparkle', color: mia ? '#e03c3c' : '#ffd166', small: !mia, title: mia ? 'Tu marca: una kutxa' : 'Kutxa', text: 'Un cofre escondido. Solo se ve de cerca', go: true }); }
    return out;
  }
  aventuraFin() {
    const A = this.av; if (!A) return; this.av = null;
    const P = this.player; P.onModo = P.onCaida = P.onRescate = null; P.puedeAventura = false;
    A.hud.dispose(); A.capa?.dispose(); A.montura?.dispose();
    if (A.atalaya) this.scene.remove(A.atalaya.obj);
    for (const k of A.kutxas) this.scene.remove(k.obj);
  }
}
