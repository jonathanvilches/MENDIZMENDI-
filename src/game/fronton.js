// Frontón de los pueblos y partido de pelota a mano con el motor común de src/pelota.
// Aquí solo se adapta el motor al juego: dónde va el frontón, colisiones, personajes, cámara e interfaz.
import * as THREE from 'three';
import { armSwing, GlbRig, loadMeshy, hasMeshy, loadedMeshy, fullTexFor, avatarIsGirl } from '../actors/glbChar.js';
import { hairTint } from '../actors/hairColor.js';
import { outfitTint } from '../actors/npcOutfit.js';
import { loadChica, hasChica } from '../actors/chicas.js';
import { PelotaCourt, PelotaMatch, labritExtent } from '../pelota/index.js';
import { entornoExtent } from '../pelota/entorno.js';
import { pelotariStats, levelTier, COURT } from '../pelota/rules.js';
import { terrainHeight, waterLevelAt, addPlatform, removePlatform, onPlatform } from '../world/heightfield.js';
import { addBox, removeCollider, rectFree, removeMover, nearby } from '../world/colliders.js';
import { rx, pathQuery, cercaDeYacimiento } from '../world/layout.js';
import { clearGrass, clearTrees } from '../world/nature.js';
import { isEU } from '../i18n.js';
import { profile } from './profile.js';
import { tusCualidades, tuPelotari, sumaPartido } from './pelotariProgreso.js';
import { QUALITY } from '../util/quality.js';
import { crowd3d } from '../actors/crowd3d.js';
import { officialHeight } from '../world/armas.js';
import { drawTownArms } from '../ui/escudoImg.js';
import { armsOfTown } from '../data/armas-navarra.js';
import { LEVELS } from '../data/levels.js';
import { txapelas, coloresPartido } from './torneo.js';
import { Actor } from '../actors/people.js';
import { avatarPortrait } from '../ui/portraits.js';
import { meetPelotari } from './pelotaris.js';
// las figuras de la pantalla VS (nuestros pelotaris en 3D, en pleno golpe: tools/meshy-retratos.mjs con CLIP=Hit T=0.2)
import { pelotariFig, RIVALES, pelotariHair, pelotariGirl } from '../ui/pelotariFig.js';   // (las mismas figuras que las cartas: así no van dos veces en el archivo único)
import { crowdBuffers, PUBLICO } from '../crowdAudio.js';
import { pelotaLigera } from '../util/diag.js';
// un pelotari rival o compañero (el azul, pelotari; el colorado, pelotari_rojo) con el pelo de su figura (el rubio Mikel,
// la pelirroja Leire…); las chicas, con su cuerpo de chica (chicas.js: la pelotari, con la camiseta teñida de colorado
// en el lado rojo)
const COLORADO = '#c8222a';
// la textura de los pelotaris, entera (2048 px) en el ordenador; en el móvil, a 1024 como los demás personajes: con los
// dos a 2048 el partido pasaba de 74 MB de texturas y el iPhone pierde la imagen hacia los 65. Es la que tenían en el
// iPhone hasta octubre de 2026, cuando se cargaban antes de tiempo junto al frontón del pueblo
const nitido = (model) => { if (!(QUALITY === 'low' && matchMedia?.('(pointer: coarse)').matches)) fullTexFor(model); };
async function rigPelotari(model, name, girl = pelotariGirl(name), hair = pelotariHair(name)) {
  if (girl && hasChica('pelotari')) try {
    nitido('pelotari'); const r = new GlbRig(await loadChica('pelotari'), 'pelotari');
    outfitTint(r.char.root, 'pelotari', { shirt: model === 'pelotari_rojo' ? COLORADO : null, hair }); return r;
  } catch (e) { console.warn('pelotari', e); }
  nitido(model); const r = new GlbRig(await loadMeshy(model), model); hairTint(r.char.root, model, hair); return r;
}

// Los jueces de la contracancha: tres, de blanco, a la altura de la chapa, del 4 y del 7, de cara a la cancha. En cada
// falta (chapa, fuera, alta, pasa…) levanta la mano el que la ve: el de la chapa lo del frontis; si no, el más cercano
const _jv = new THREE.Vector3();
function makeJueces(G, C) {
  const g = C.group; g.updateMatrixWorld(true);
  const yaw = new THREE.Euler().setFromQuaternion(g.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y, x = COURT.W / 2 + (C.contra || 2.6) * 0.62;
  return [3.2, COURT.FALTA, COURT.PASA].map((z, i) => {
    const w = g.localToWorld(new THREE.Vector3(x, 0, z));
    const a = new Actor({ id: 'juez' + i, name: 'Juez', x: w.x, z: w.z, y: w.y, heading: Math.atan2(-Math.cos(yaw), Math.sin(yaw)), ghost: true, wander: 0,
      look: { shirt: '#f7f7f2', pants: '#1d1f2a', shoes: '#16161c', female: i === 1, hair: ['#2b1d14', '#5a3a22', '#bdb6aa'][i], bun: i === 1, txapela: i === 1 ? undefined : '#1d1d24', old: i === 2 } }, G.scene);
    a.frozen = true; a.zl = z; return a;
  });
}
function senalaJuez(J, call, b) {
  if (!J?.length || !call || call === 'bote' || call === 'tanto') return;
  const z = ['chapa', 'alta', 'lado', 'corta'].includes(call) ? 0 : b?.z ?? COURT.FALTA;
  let best = J[0]; for (const j of J) if (Math.abs(j.zl - z) < Math.abs(best.zl - z)) best = j;
  best.wave = 2.2;
}
// Cómo es el frontón de cada sitio. Se parte de la comarca y de lo que cuentan las fuentes (legal/estado-legal.md): los
// frontones viejos de los pueblos, junto a la iglesia y con el frontis de sillería (arenisca rojiza en Baztan y Bidasoa,
// piedra oscura en el Pirineo, caliza dorada en la Navarra media); en las villas grandes, frontón cubierto con cerchas
// de acero y franja translúcida (como Labrit en Iruña); cubiertas de madera laminada atirantada como las de la Cuenca y
// la montaña húmeda; el ladrillo en la Ribera. Paredes de un solo color (verde, azul o pardo terroso, los que piden los
// reglamentos) distinto del suelo, y el colchón de abajo de metal o pintado. Es el estilo de la comarca, no una copia
// de un frontón concreto.
const GREEN = '#5d8c74', BLUE = '#58799a', EARTH = '#a27e5c', OCHRE = '#c09a6a', PLASTER = '#e2dccd', GREY = '#cfcac0';
const STONE = { red: '#b0876f', dark: '#77716a', gold: '#c4ab80', grey: '#9c958a' };
const LOOK_COMARCA = {
  bidasoa: { stone: STONE.red, wall: PLASTER, floor: '#8e918c', contra: '#a79d88', chapa: '#2f5a46', chapaMetal: false, cap: '#c99a84', stands: '#b9a58c' },
  'larraun-leitzaldea': { roof: 'wood', frontis: GREEN, wall: GREEN, floor: '#7f8781', contra: '#9f9886', chapa: '#8a2f2a', chapaMetal: false },
  pirineo: { stone: STONE.dark, wall: GREY, floor: '#8a8d8e', contra: '#a19a8c', chapa: '#5b3b28', chapaMetal: false, cap: '#8f8a82', stands: '#9a8a76' },
  sakana: { frontis: GREEN, wall: GREEN, floor: '#80857f', contra: '#a59c88' },
  pamplona: { roof: 'metal', frontis: '#4f8a70', wall: '#4f8a70', floor: '#6f7f78', contra: '#9d9583' },
  prepirineo: { stone: STONE.gold, wall: EARTH, floor: '#8c8a84', contra: '#ab9f88' },
  sanguesa: { stone: STONE.gold, wall: PLASTER, floor: '#8b8d88', contra: '#ab9f88', chapa: '#7d2a24', chapaMetal: false },
  'tierra-estella': { stone: STONE.gold, wall: EARTH, floor: '#8d8b85', contra: '#ad9f86' },
  'valdizarbe-novenera': { stone: STONE.gold, wall: OCHRE, floor: '#8f8b83', contra: '#ae9f84', chapa: '#2f4f6a', chapaMetal: false },
  'zona-media': { stone: STONE.gold, wall: EARTH, floor: '#918c82', contra: '#b09f82' },
  ribera: { frontis: '#c08a5e', wall: '#c08a5e', brick: true, floor: '#9a9183', contra: '#b6a487', chapa: '#7a2b22', chapaMetal: false, stands: '#c7a782' },
};
LOOK_COMARCA['ribera-alta'] = { ...LOOK_COMARCA.ribera, frontis: '#cfa877', wall: '#cfa877', chapa: '#2f4f6a', floor: '#968d7f' };
// dentro de la comarca, cada pueblo con lo suyo (por orden de los pueblos de la comarca): otra pared, otro colchón,
// la piedra algo distinta o, en alguno, cubierta. Así no hay dos frontones iguales y todos son de su comarca.
const VARIANTS = {
  bidasoa: [{}, { wall: GREEN, chapa: '#7a2a24' }, { wall: OCHRE, chapa: '#2f4f6a', stone: '#a47c68' }, { wall: BLUE, chapa: '#c9d0d4', chapaMetal: true }, { wall: '#e8dfc9', chapa: '#6b4a30', roof: 'wood', stone: '#b89480' }, { wall: EARTH, chapa: '#24453a' }],
  pirineo: [{ wall: PLASTER }, { wall: GREEN, chapa: '#7a2a24', stone: '#6b6a66' }, { wall: '#cbbfa8', chapa: '#c9d0d4', chapaMetal: true, stone: '#837a6f' }, { wall: BLUE, chapa: '#3a3f46', stone: '#6f6862' }, { wall: EARTH, chapa: '#2f5a46', stone: '#8a8178' }],
  'larraun-leitzaldea': [{}, { frontis: BLUE, wall: BLUE, chapa: '#c9d0d4', chapaMetal: true }],
  sakana: [{}, { frontis: BLUE, wall: BLUE }],
  sanguesa: [{}, { wall: '#dccdb1', chapa: '#2f5a46' }, { wall: OCHRE, chapa: '#6b4a30' }],
  'tierra-estella': [{}, { wall: OCHRE, chapa: '#7a2a24' }],
  'valdizarbe-novenera': [{}, { wall: EARTH, chapa: '#7a2a24', stone: '#b9a27a' }],
  'zona-media': [{}, { wall: OCHRE, chapa: '#2f4f6a' }, { wall: '#b98d66', chapa: '#6b4a30' }],
  ribera: [{}, { chapa: '#2f5a46', floor: '#9d9487' }],
};
const FAMILY = { atlantic: 'bidasoa', pyrenean: 'pirineo', central: 'zona-media', ribera: 'ribera', city: 'pamplona' };
const COVERED = { stone: null, chapa: '#c9d0d4', chapaMetal: true };   // frontón cubierto moderno: hormigón pintado y chapa de metal
const LOOK_TOWN = {
  elizondo: { ...COVERED, roof: 'metal', frontis: GREEN, wall: GREEN },                  // el frontón Baztan (1975), cubierto
  'isaba-izaba': { roof: 'wood', roofTop: '#4b4f55' }, 'erronkari-roncal': { roof: 'wood', roofTop: '#4b4f55' },   // tejados de nieve
  'altsasu-alsasua': { ...COVERED, roof: 'metal', frontis: BLUE, wall: BLUE },
  irulegi: { ...COVERED, roof: 'wood', frontis: GREEN, wall: GREEN, floor: '#7f8781' },  // la Cuenca: madera laminada (Orkoien)
  sanguesa: { ...COVERED, roof: 'metal', frontis: GREEN, wall: GREEN },
  estella: { ...COVERED, roof: 'metal', frontis: BLUE, wall: BLUE },                      // Remontival, cubierto
  tafalla: { ...COVERED, roof: 'metal', frontis: GREEN, wall: GREEN },
  tudela: { roof: 'metal', chapa: '#c9d0d4', chapaMetal: true },
  ujue: { stone: STONE.grey, wall: PLASTER }, javier: { stone: STONE.grey },
};
export function frontonLook(def = {}) {
  const cid = LOOK_COMARCA[def.comarca] ? def.comarca : FAMILY[def.family], c = LOOK_COMARCA[cid] || {};
  const i = Math.max(0, LEVELS.filter(l => l.comarca === cid && !l.special && !l.bosque).findIndex(l => l.id === def.id)), V = VARIANTS[cid] || [{}];
  return legible({ ...c, ...V[i % V.length], ...(LOOK_TOWN[def.id] || {}) });
}
// que la pelota se vea siempre bien: contra el frontis, la pared izquierda y el suelo, la pelota (casi blanca) ha de ser
// al menos tres veces más clara (el cociente de luminancias de las pautas de legibilidad; 2,6 contra el suelo, que se ve
// de lado). Si un color de la comarca es más claro, se oscurece sin cambiarle el tono. Antes, en los frontones de pared de
// yeso o de frontis de piedra dorada (Lesaka, Ituren, Orreaga, Lumbier, Ujué, Olite, Marcilla…), la pelota casi no se veía.
// El frontis, cuatro: le da el sol de cara y en la imagen sale más claro que su color (la pared izquierda suele estar a
// la sombra)
const BOLA = '#f4eedd', MIN_CONTRASTE = { frontis: 4, stone: 4, wall: 3, floor: 2.6 };
const luminancia = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;   // (THREE.Color guarda el color en lineal)
const cociente = (a, b) => { const x = luminancia(a), y = luminancia(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function legible(L) {
  const o = { ...L }, bola = new THREE.Color(BOLA), hsl = {};
  for (const [k, min] of Object.entries(MIN_CONTRASTE)) {
    if (!o[k]) continue;
    const c = new THREE.Color(o[k]);
    for (let n = 0; n < 40 && cociente(bola, c) < min; n++) { c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, hsl.l * 0.95); }
    o[k] = '#' + c.getHexString();
  }
  return o;
}

// Lo que rodea al frontón de la calle de cada pueblo (src/pelota/entorno.js): junto a la iglesia, en la plaza del
// ayuntamiento, en la calle entre casas o en la plaza con su grada (el de siempre). Comprobado en las fuentes: Etxalar,
// en la plaza mayor junto a la iglesia; Leitza, en la plaza del ayuntamiento; Elizondo, el cubierto (pilotaleku Juanjo
// Atxa, 1975). En los demás, el de su comarca: en los pueblos pequeños de la montaña, junto a la iglesia; en las villas,
// en la plaza del ayuntamiento o en la calle, como se jugaba antes de que hubiera frontones. Los cubiertos, con su cubierta
const ESTILO_TOWN = {
  etxalar: 'iglesia', zugarramurdi: 'iglesia', 'amaiur-maya-del-baztan': 'calle', ituren: 'consistorio', lesaka: 'calle',
  leitza: 'consistorio', 'orreaga-roncesvalles': 'iglesia', aribe: 'iglesia', 'otsagabia-ochagavia': 'iglesia', 'burgui-burgi': 'calle',
  aoiz: 'consistorio', lumbier: 'calle', viana: 'consistorio', 'puente-la-reina': 'calle', artajona: 'iglesia', ujue: 'iglesia',
  olite: 'calle', cortes: 'consistorio',
};
// (los de la lista, al aire libre aunque los de su comarca suelan ser cubiertos, salvo que su pueblo tenga cubierta propia)
export const frontonEstilo = (def = {}) => ESTILO_TOWN[def.id] && !LOOK_TOWN[def.id]?.roof ? ESTILO_TOWN[def.id] : 'plaza';
// nombre del pueblo y su escudo para la pared izquierda (como el letrero del ayuntamiento en los frontones de verdad),
// cómo es el frontón de allí (look) y lo que lo rodea (estilo). Solo el escudo y el nombre: sin «AYUNTAMIENTO» ni «FRONTÓN»
export function frontonWall(def) {
  // el escudo oficial del pueblo o de su valle, con el acabado del autor; si no lo tiene, ninguno, solo el nombre (antes,
  // uno inventado por el juego, que no era el suyo)
  const A = armsOfTown(def.id);
  const shield = A ? (g, cx, top, h) => drawTownArms(g, cx, top, h / officialHeight(1, A), A) : null;
  const estilo = frontonEstilo(def), look = { ...frontonLook(def), ...(estilo !== 'plaza' ? { roof: null } : {}) }, seed = [...(def.id || '')].reduce((a, ch) => a * 31 + ch.charCodeAt(0) >>> 0, 7) % 9973;
  return { wallName: (def.name || '').split(/\s*\/\s*/).join(' · ').toUpperCase(), shield, look, estilo, seed,
    roofCol: def.family === 'pyrenean' ? '#5a5e66' : '#a4553c' };   // (en el Pirineo, pizarra; en el resto, teja)
}

// lo que has ganado a pelota (para tu ficha): los partidos ganados en todos los pueblos y tus txapelas
function myRecord() {
  try { const P = profile(), won = Object.values(P.towns || {}).reduce((a, t) => a + (t?.best?.pelota || 0), 0), tx = Object.values(txapelas()).reduce((a, n) => a + n, 0), yo = tuPelotari(); return { won, txapelas: tx, nivel: yo.n, partidos: yo.partidos }; }
  catch (e) { return { won: 0, txapelas: 0 }; }
}
// cómo es el frontón para jugar: con cubierta o al aire libre, con el frontis de sillería, el suelo mojado si llueve
// en un frontón sin cubierta (con nieve, también) y el Labrit de las finales
export function frontonCond(G, fronton) {
  const C = fronton?.court || {}, L = C.look || {}, labrit = !!C.labrit, hall = !!C.hall, covered = labrit || hall || !!L.roof, W = G?.rt?.weather;
  const wet = !covered && !!W && W.kind !== 'clear' && (W.kind === 'snow' || W.raining) && (W.k ?? 1) > 0.25;
  return { covered, stone: !!L.stone && !labrit && !hall, wet, snow: wet && W.kind === 'snow', labrit, hall };   // (snow: si lo que cae es nieve, se dice «nieva» y no «llueve»)
}
// nombres para los compañeros de los partidos por parejas
const MATE_NAMES = RIVALES;   // (los compañeros y los rivales por parejas: de la plantilla del autor, cada uno con su figura)

// huella del frontón en coordenadas locales (se calcula una vez; con su iglesia, su casa consistorial o sus casas de la
// calle, la de cada estilo: entorno.js)
let EXTENT = null;
function extent() { if (!EXTENT) { const c = new PelotaCourt(THREE, { texScale: 0.25 }); EXTENT = c.extent; c.dispose(); } return EXTENT; }
export const frontonExtent = (estilo) => !estilo || estilo === 'plaza' ? extent() : entornoExtent(estilo);

// Busca un sitio llano y libre cerca de la plaza
export function findFrontonSpot(plaza, E = extent(), exact = false) {
  // (en un pueblo con su trazado de verdad, el frontón va donde está el real: su casa de los datos no se levanta y el
  // sitio queda libre; se busca primero ahí mismo)
  if (exact) { const s = frontonSearch(plaza, 0, 24, 1, 0.15, false, E); if (s) return s; }
  // primero cerca de la plaza y sin calles ni caminos debajo (las paredes los cortarían) y con sitio de sobra alrededor
  // (los tejados sobresalen del choque de las casas: antes quedaban esquinas de casa pegadas a la cancha); si así no
  // cabe, más lejos; luego dejando pasar algún camino; y al final con menos holgura: todos los pueblos tienen frontón
  return frontonSearch(plaza, 34, 130, 3, 0.2, true, E) || frontonSearch(plaza, 130, 240, 3, 0.15, true, E)
    || frontonSearch(plaza, 34, 240, 1.5, 0.2, false, E) || frontonSearch(plaza, 34, 260, 0.6, 0.15, false, E);
}
function frontonSearch(plaza, r0, r1, gap, da, noRoad, E) {
  let best = null, bs = 1e9;
  for (let r = r0; r <= r1; r += 8) for (let a = 0; a < Math.PI * 2; a += da) {
    const x = plaza.x + Math.cos(a) * r, z = plaza.z + Math.sin(a) * r, face = r < 1 && plaza.ry != null ? plaza.ry : Math.atan2(plaza.x - x, plaza.z - z);
    if (Math.sign(x - rx(z)) !== Math.sign(plaza.x - rx(plaza.z))) continue;   // en la misma orilla que la plaza (sin río, rx es 9999: todo vale)
    if (cercaDeYacimiento(x, z, 26)) continue;   // (ni encima de un yacimiento)
    // la cancha se abre hacia la plaza; si así no cabe, también de lado (como muchos frontones, a lo largo de la calle)
    for (const [ry, turned] of [[face, 0], [face + Math.PI / 2, 1], [face - Math.PI / 2, 1]]) {
      if (!rectFree(x, z, ry, E.x0, E.x1, E.z0, E.z1, gap)) continue;   // ni casas ni muros ni farolas dentro
      const c = Math.cos(ry), s = Math.sin(ry); let mn = 1e9, mx = -1e9, ok = true, road = 0;
      for (let lx = E.x0 - 1; lx <= E.x1 + 1.01 && ok; lx += 2.5) for (let lz = E.z0 - 1; lz <= E.z1 + 1.01; lz += 2.5) {
        const X = x + lx * c + lz * s, Z = z - lx * s + lz * c;
        if (onPlatform(X, Z, 1) || waterLevelAt(X, Z) > terrainHeight(X, Z) - 0.3) { ok = false; break; }
        const h = terrainHeight(X, Z); mn = Math.min(mn, h); mx = Math.max(mx, h);
        const q = pathQuery(X, Z); if (q.d < q.w + 1.5) road++;
      }
      if (!ok || (noRoad && road)) continue;
      // llano, cerca de la plaza, sin caminos debajo y mejor de frente a la plaza
      const score = (mx - mn) * 10 + r * 0.05 + road * 2 + turned * 1.5;
      if (score < bs) { bs = score; best = { x, z, ry, y: mx + 0.05, road, score }; }
    }
  }
  return best;
}

// Altura para que la cancha quede por encima del terreno en toda su huella
// (el terreno, mirado cada medio metro: cada metro y medio, entre punto y punto asomaba algún montículo por el suelo de la
// cancha, como el bulto verde junto al frontis de Javier)
export function courtHeight(x, z, ry, E = extent()) {
  const c = Math.cos(ry), s = Math.sin(ry); let mx = -1e9;
  for (let lx = E.x0; lx <= E.x1 + 0.01; lx += 0.5) for (let lz = E.z0; lz <= E.z1 + 0.01; lz += 0.5) mx = Math.max(mx, terrainHeight(x + lx * c + lz * s, z - lx * s + lz * c));
  return mx + 0.06;
}

export class Fronton {
  // spot: centro del frontis a ras de suelo; ry: giro (la cancha crece hacia +z local); sin y, se calcula
  // extra: { wallName, wallSub, shield } → nombre y escudo pintados en la pared izquierda
  constructor(scene, spot, title = '', extra = {}) {
    // (la del sitio elegido, findFrontonSpot, se miraba cada 2,5 m: por eso asomaba el montículo de Javier. Los de muy
    // por encima del pueblo, el cubierto y el Labrit, noClear, van a su altura)
    if (spot.y == null || !extra.noClear) spot = { ...spot, y: Math.max(spot.y ?? -1e9, courtHeight(spot.x, spot.z, spot.ry, extra.inTown ? labritExtent() : frontonExtent(extra.estilo))) };
    this.spot = spot;
    const court = this.court = new PelotaCourt(THREE, { title, texScale: QUALITY === 'low' ? 0.5 : 1, ...extra });
    const g = court.group; g.position.set(spot.x, spot.y, spot.z); g.rotation.y = spot.ry; scene.add(g); g.updateMatrixWorld(true);
    const E = court.extent, mid = this.toWorld((E.x0 + E.x1) / 2, 0);
    // (y los árboles de detrás del rebote, donde se pone la cámara en las pelotas largas: su copa tapaba la cancha)
    if (!extra.noClear) { clearGrass(mid.x, mid.z, E.x1 - E.x0, E.z1, spot.ry); clearTrees(mid.x, mid.z, E.x1 - E.x0, E.z1 + (court.hall || court.labrit ? 0 : 9), spot.ry); }
    if (!court.hall && !court.labrit) court.camZMax = Math.min(court.camZMax, this.fondoLibre(E.z1 + 0.2, COURT.L + 11));
    this.colls = court.boxes.map(b => { const p = this.toWorld(b.x, b.z); return addBox(p.x, p.z, b.w, b.d, spot.ry, { solidView: true }); });
    const PF = court.platform || { x0: E.x0, x1: E.x1 - 3.3, z0: E.z0, z1: E.z1 };
    this.plat = addPlatform(spot.x, spot.z, spot.ry, PF.x0, PF.x1, PF.z0, PF.z1, spot.y);   // la cancha es suelo (sin las gradas)
    this.entry = this.toWorld(court.entry.x, court.entry.z);
    this.out = court.out ? this.toWorld(court.out.x, court.out.z) : null;   // (al salir, mirando a la calle y no a la pared)
  }
  /** Hasta dónde puede ir la cámara del partido por detrás del rebote (en metros desde el frontis, como la cancha): hasta
   *  la primera casa o muro del pueblo, con 1,5 m de margen. Antes retrocedía en las pelotas largas hasta 11 m detrás de
   *  la última raya y, si había una casa cerca, se metía dentro y la pared tapaba la imagen entera. */
  fondoLibre(z0, z1) {
    for (let lz = z0; lz <= z1; lz += 0.5) for (let lx = -4.5; lx <= 8.5; lx += 1) {
      const p = this.toWorld(lx, lz);
      for (const c of nearby(p.x, p.z, 1.5)) {
        if (c.type !== 'box' || !c.solidView) continue;
        const dx = p.x - c.x, dz = p.z - c.z, u = dx * c.cos - dz * c.sin, v = dx * c.sin + dz * c.cos;
        if (Math.abs(u) < c.hw + 1.5 && Math.abs(v) < c.hd + 1.5) return Math.max(z0, lz - 0.5);
      }
    }
    return z1;
  }
  toWorld(lx, lz) { const v = new THREE.Vector3(lx, 0, lz); this.court.group.localToWorld(v); return v; }
  play(G, rival, opts) { return playPelota(G, this, rival, opts); }
  /** Lo quita del todo: de la escena, de la tarjeta gráfica y sus paredes y su suelo del mundo */
  dispose() {
    const g = this.court.group; g.parent?.remove(g);
    try { this.court.dispose(); } catch (e) { console.warn('frontón', e); }
    for (const c of this.colls || []) removeCollider(c); if (this.plat) removePlatform(this.plat); this.colls = []; this.plat = null;
  }
}

// El frontón Labrit de Iruña, donde se juegan las finales: se monta una vez, muy por encima del pueblo y fuera de sus
// límites (no toca casas, árboles ni caminos; dentro, cubierto, no se ve nada de fuera)
let LABRIT = null;
// la chapa de los campeonatos, en el cubierto y en el Labrit: de metal pintado algo naranja (se distingue bien del
// verde del frontis y de la raya)
const CHAPA_CAMP = '#c8763a';
function labritOpts() {
  // (en la pared izquierda, el escudo de Pamplona y su nombre, como en el de verdad, sin el logotipo del ayuntamiento)
  const A = armsOfTown('pamplona'), shield = A ? (g, cx, top, h) => drawTownArms(g, cx, top, h / officialHeight(1, A), A) : null;
  return { labrit: true, wallName: 'IRUÑA · PAMPLONA', shield, signAt: { y: 5.4 },
    look: { frontis: '#1d5846', wall: '#1d5846', floor: '#1a1f21', contra: '#d49a5c', parquet: true, line: '#f3f2ec', mark: '#f3f2ec', chapa: CHAPA_CAMP, chapaMetal: true, stone: null, brick: false, roof: null, cap: '#1d5846' } };
}
export function labrit(scene, out) {
  if (LABRIT && LABRIT.court.group.parent === scene) return LABRIT;
  LABRIT = new Fronton(scene, { x: out.x, z: out.z, y: 2400, ry: 0 }, 'LABRIT', { ...labritOpts(), noClear: true });
  return LABRIT;
}
// El frontón cubierto del pueblo, donde se juegan los campeonatos (el torneo y los partidos de Campeonatos): cerrado y
// con la grada a lo largo de la contracancha. Se monta una vez por pueblo, muy por encima y fuera de sus límites, como
// el Labrit (dentro no se ve nada de fuera). Los frontones de la calle quedan para las misiones y los partidos sueltos.
let HALL = null;
const HALL_LOOK = { frontis: '#2b6a56', wall: '#2b6a56', floor: '#5b6461', contra: '#7c8583', line: '#f3f2ec', mark: '#d8333f', chapa: CHAPA_CAMP, chapaMetal: true, cap: '#2b6a56', stone: null, brick: false, roof: null, stands: '#8c8794' };
// (cada cubierto con sus colores: las paredes, del color del frontón de la calle del pueblo si son de color, o uno de los
// de los reglamentos; las butacas, de otro. Antes eran todos verdes con butacas moradas, iguales en todos los pueblos)
const HALL_PARED = [GREEN, BLUE, '#2b6a56', '#3d5f8a', '#4f7a5c', '#6a5a8c'], HALL_SILLA = [['#5b34c4', '#8e6ae8'], ['#b0262c', '#e0565c'], ['#1f5fa8', '#5a8fd8'], ['#1f7a4a', '#4fb07a'], ['#c06a12', '#eba04a'], ['#2a2a32', '#6a6a78']];
function hallLook(def, seed = 0) {
  const L = frontonLook(def), col = L.frontis && !L.stone && L.frontis !== PLASTER ? L.frontis : HALL_PARED[seed % HALL_PARED.length], [s1, s2] = HALL_SILLA[(seed >> 3) % HALL_SILLA.length];
  return { ...HALL_LOOK, frontis: col, wall: col, cap: col, seat: s1, seat2: s2 };
}
export function hallVenue(scene, out, def) {
  if (HALL && HALL.court.group.parent === scene && HALL.town === def?.id) return HALL;
  if (HALL) { try { HALL.dispose(); } catch (e) { console.warn('frontón cubierto', e); } }
  const W = frontonWall(def || {}), town = (def?.name || '').split(' /')[0];
  HALL = new Fronton(scene, { x: out.x, z: out.z, y: 2400, ry: 0 }, town, { ...W, estilo: null, look: hallLook(def || {}, W.seed), hall: true, noClear: true });
  HALL.town = def?.id; HALL.townName = town;   // (el de otro pueblo, en los campeonatos: su nombre en el partido)
  return HALL;
}
// En el móvil (calidad baja), un solo frontón aparte a la vez, el que se va a usar (keep; ninguno al volver al pueblo).
// Montados los dos, el cubierto y el Labrit, junto al pueblo entero, ocupaban en la tarjeta gráfica casi tanto como el
// pueblo, y al entrar en un campeonato tras otro el iPhone se quedaba sin memoria: perdía la imagen y te devolvía al
// pueblo. Se vuelven a montar al elegirlos (unos segundos, tapados por el fondo de los campeonatos)
/** El sitio de espera de un campeonato que no se juega en el pueblo (main.js, solo el frontón): donde aguarda el
 *  jugador entre partido y partido, tapado por el fondo de los campeonatos. Sin cancha ni nada que dibujar: los partidos
 *  van en el cubierto o en el Labrit (townDeportes.venueDe). labrit: el de Iruña, que juega en el Labrit */
export function anclaFronton(at, labrit = false) {
  return { ancla: true, entry: { x: at.x, z: at.z }, out: { x: at.x, z: at.z + 12 }, court: { labrit, group: null },
    toWorld: (x, z) => new THREE.Vector3(at.x + x, terrainHeight(at.x, at.z), at.z + z) };
}
export function freeVenues(keep = null) {
  if (HALL && HALL !== keep) { HALL.dispose(); HALL = null; }
  if (LABRIT && LABRIT !== keep) { LABRIT.dispose(); LABRIT = null; }
}
// En Iruña, el frontón de la ciudad es el Labrit de verdad: el edificio entero en la calle, junto a la plaza de toros
export function labritInTown(scene, near) {
  const sp = findFrontonSpot(near, labritExtent());
  return sp ? new Fronton(scene, sp, 'LABRIT', { ...labritOpts(), inTown: true }) : null;
}

// Las pancartas de la grada, sostenidas en alto por la gente (en la calle, en los balcones): «¡Aupa…!» para ti y para
// el rival, cada una de su color, y la de los pelotazales del pueblo. Devuelve con qué quitarlas
const COL_PANC = { azul: '#4b3cff', rojo: '#d8243c' };
function pancartasDe(C, you, riv, town, colors) {
  const S = (C.ocupados || C.standSpots || []).filter(p => p[1] > 0.3).sort((a, b) => a[2] - b[2]); if (S.length < 6) return null;
  const txt = [[`¡AUPA ${you}!`.toUpperCase(), COL_PANC[colors.you] || COL_PANC.azul], [`¡AUPA ${riv}!`.toUpperCase(), COL_PANC[colors.rival] || COL_PANC.rojo], [`${town} · PILOTAZALEAK`.toUpperCase(), '#1c1630']];
  const out = [];
  txt.forEach(([t, col], i) => {
    const sp = S[Math.floor(S.length * (0.22 + i * 0.28))]; if (!sp) return;
    const c = document.createElement('canvas'); c.width = 512; c.height = 120; const g = c.getContext('2d');
    g.fillStyle = col; g.fillRect(0, 0, 512, 120); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(6, 6, 500, 4); g.fillRect(6, 110, 500, 4);
    let fs = 64; g.font = `400 ${fs}px "MZ Display", "Lilita One", Nunito, Arial, sans-serif`; const w = g.measureText(t).width; if (w > 470) { fs *= 470 / w; g.font = `400 ${fs}px "MZ Display", "Lilita One", Nunito, Arial, sans-serif`; }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 256, 62);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.61), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }));
    // (delante de quien la sostiene, hacia donde mira: la cancha)
    m.position.set(sp[0] + Math.sin(sp[3]) * 0.55, sp[1] + 0.95, sp[2] + Math.cos(sp[3]) * 0.55); m.rotation.y = sp[3]; m.rotation.z = (Math.random() - 0.5) * 0.06; m.name = 'pancarta';
    C.group.add(m); out.push(m);
  });
  return () => { for (const m of out) { m.parent?.remove(m); m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); } };
}

/**
 * Partido (o peloteo) en un frontón. Devuelve una promesa con { win, you, cpu, best, quit }.
 * G: juego (player, camera, follow, ui, mode); rival: Actor del pueblo.
 */
// (torneo: rivalName para el nombre del rival en el marcador y fixedLevel para no elegir nivel)
// rivalStats: las cualidades del rival (fuerza, agilidad, velocidad, de 1 a 5); sin ellas, las suyas según su nombre
// pairs: { partner: { name, stats }, rivalMate: { name, stats } } (el torneo por parejas: el partido es por parejas)
// rivalTown: { id, name } del pueblo del rival (en el torneo, el suyo; si no, el del frontón): para la colección
// stay: al acabar no se vuelve al pueblo (los campeonatos y el torneo siguen con su menú)
// (los fallos que el partido recoge para no quedarse colgado, también al informe, util/informe.js: si no, en el móvil el
// partido «se sale solo» sin que se sepa por qué)
const apunta = (donde, e) => { const l = String(e?.stack || '').split('\n').find(x => /\.js/.test(x))?.trim().slice(0, 140) || ''; (window.__errors ||= []).push(`${donde}: ${e?.message || e}${l ? ' @ ' + l : ''}`.slice(0, 300)); };
export function playPelota(G, fronton, rival, { mode = 'match', target = 5, level, rivalName, fixedLevel = false, returnTo = null, rivalStats = null, pairs = null, rivalTown = null, comp = null, final = false, youBonus = 2, rivalBonus = 0, stay = false, intro = null, cuatro = false } = {}) {
  if (window.__autoWin) return Promise.resolve({ win: true, you: target, cpu: 0 });
  return new Promise(res => {
    const P = G.player, rig0 = P.rig, home = { x: rival.pos.x, z: rival.pos.z, h: rival.heading };
    let seated = null, seatedZ = 0, cheerT = 0;
    let temporal = false, natu = null, vd0 = null, flo0 = false;   // (el pueblo sin vecinos ni bosque mientras dura el partido, y cómo estaba)
    // (pancartas, aquí y no dentro del montaje: si no, al acabar no se veían y se quedaban en la grada de partido en
    // partido, cada una con su textura, gastando memoria gráfica)
    let rig = rig0, pel = null, red = null, bf = null, bfWas = false, ended = false, match = null, mates = null, rivName = rivalName || String(rival.name).split(',')[0], rStatsKeep = null, jueces = [], pancartas = null; const hidden = [], hiddenR = [];
    // (si el rival se llama como tú, con la inicial de su pueblo detrás, «Ane I.»: si no, en el marcador salían dos «Ane»)
    { const yo = String(profile().name || '').trim().toLowerCase(), tw = String(rivalTown?.name || G.def?.name || '').trim(); if (yo && rivName.trim().toLowerCase() === yo) rivName = `${rivName.trim()} ${(tw[0] || 'B').toUpperCase()}.`; }
    // los colores, como en los frontones: viste de colorado quien debutó antes y el otro de azul. Tú empiezas de
    // debutante: cada campeonato que acabas es una temporada más
    const { colors, seasons } = coloresPartido(rivName, level, pairs?.rivalMate?.name, pairs?.partner?.name);
    const MODEL = { azul: 'pelotari', rojo: 'pelotari_rojo' }, youModel = MODEL[colors.you], rivModel = MODEL[colors.rival];
    // (el marcador del frontis: los azules a la izquierda y los colorados a la derecha)
    const marca = (a, b, sa, sb) => (colors.you === 'azul' ? fronton.court.setScore?.(a, b, sa, sb) : fronton.court.setScore?.(b, a, sb, sa));
    // si algo falla al montar el partido, de vuelta al pueblo con todo como estaba (nunca congelado en la cancha)
    const fail = (e) => {
      console.warn('frontón', e); apunta('frontón', e);
      try { done({ win: false, error: true }); }
      catch (e2) { console.warn('frontón', e2); P.rig = rig0; P.frozen = false; G.mode = 'play'; G.pelotaTick = null; G.ui.hudVisible?.(true); res({ win: false, you: 0, cpu: 0, best: 0, quit: true }); }   // (resolver dos veces no hace nada)
    };
    (async () => {
    // para el partido te conviertes en el pelotari (camiseta, pantalón blanco y tacos en las manos); al acabar vuelves a ser tú
    // (si ya juegas con el pelotari, no hace falta cambiar; los modelos se piden antes, al acercarte al frontón)
    G.pelotaLoading = true;   // (preparándose: si se pierde la memoria gráfica ahora, el pueblo se rehace junto al frontón)
    if (PUBLICO) crowdBuffers(G.sound?.ctx);   // (las voces y los aplausos del público se calculan mientras se preparan los pelotaris)
    const wait = !loadedMeshy('pelotari') || !loadedMeshy('pelotari_rojo');
    if (wait) G.ui.toast?.(isEU() ? 'Pilotariak prestatzen…' : 'Preparando a los pelotaris…', 'pelota', 1800);
    // (la jugadora, con su cuerpo de chica de pelotari y su pelo: chicas.js)
    const ella = avatarIsGirl(profile().avatar);
    if ((rig0.id !== youModel || ella) && hasMeshy(youModel)) try { if (ella) pel = await rigPelotari(youModel, '', true, null); else { nitido(youModel); pel = new GlbRig(await loadMeshy(youModel), youModel); } } catch (e) { console.warn('pelotari', e); apunta('pelotari', e); }
    // (el cuerpo de siempre se aparta del todo mientras dura el partido: así nada lo vuelve a mostrar)
    if (pel) { hidden.push(...P.obj.children); for (const c of hidden) P.obj.remove(c); P.obj.add(pel.char.root); rig = pel; }
    // y el rival, con el color que le toca (azules contra colorados, como en los partidos de verdad)
    if (hasMeshy(rivModel)) try { red = await rigPelotari(rivModel, rivName); } catch (e) { console.warn('pelotari rival', e); apunta('pelotari rival', e); }
    // (si mientras se preparaban los pelotaris el pueblo se ha rehecho —en el iPhone, al quedarse sin memoria gráfica—,
    // este partido ya no se juega: antes salían sus controles sobre el pueblo nuevo, en la llegada)
    if (G.disposed) { pel?.dispose(); red?.dispose(); G.pelotaLoading = false; res({ win: false, you: 0, cpu: 0, best: 0, quit: true }); return; }
    if (red) { hiddenR.push(...rival.obj.children); for (const c of hiddenR) rival.obj.remove(c); rival.obj.add(red.char.root); red.setStance('Ready'); }
    // el partido anima al jugador y coloca a los dos: el rig del jugador pasa a nuestras manos
    P.rig = { update() { }, doAct() { }, doCheer() { }, doWave() { }, setExpr() { } };
    P.frozen = true; G.mode = 'pelota'; G.ui.hudVisible?.(false); G.ui.setPrompt?.(null);
    // en calidad baja (los móviles), el partido más ligero: el iPhone perdía la imagen a los pocos segundos de empezar
    // (Lesaka, Irurtzun) con 1,2 millones de triángulos a la vez: el pueblo, el bosque lejano y el público. Sin la silueta
    // del bosque lejano y con menos público de figura entera; y si en este aparato ya se perdió la imagen en un partido,
    // además sin nada a más de 60 m del frontón, con menos público y menos resolución (util/diag.js: pelotaLigera)
    const ligero = QUALITY === 'low', muyLigero = ligero && pelotaLigera();
    if (G.rt) G.rt.partidoLigero = muyLigero;
    if (ligero) try { G.rt?.nature?.partido(true, muyLigero ? fronton.toWorld(0, COURT.L / 2) : null, 60); } catch (e) { console.warn('frontón ligero', e); apunta('frontón ligero', e); }
    // (y en el partido del pueblo, mientras dura, sin vecinos, animales, bosque ni flores: para jugar a pelota no hacen
    // falta. En Campeonatos ya no estaban desde el principio: townDeportes.soloFronton)
    temporal = !G.soloCancha; natu = G.rt?.nature; vd0 = G.rt?.fauna?.visDist; flo0 = !!natu?.flowers?.mesh?.visible;
    if (temporal) { G.soloCancha = { keep: rival }; if (natu) { natu.group.visible = false; if (natu.flowers?.mesh) natu.flowers.mesh.visible = false; } if (G.rt?.fauna) G.rt.fauna.visDist = 0; }
    G.rt?.boost?.(true);   // partido: imagen más nítida (en el móvil, los pelotaris con su detalle)
    // para jugar a pelota no hace falta el perro: se queda en casa y vuelve al acabar
    G.perro?.away?.();
    bf = G.fauna?.bfMesh; bfWas = bf?.visible; if (bf) bf.visible = false;   // sin mariposas sobre la cancha
    rig.setStance?.('Ready');                     // en la cancha, postura de pelotari
    G.pelotaRig = rig;
    rival.frozen = true; rival.talking = 0;
    const flags = { you: {}, rival: {} };
    // (el público es uno solo, el de la grada en 3D: antes llegaban además vecinos de otro estilo y se mezclaban dos diseños)
    if (G.beacon) G.beacon.off = true;   // sin el haz de luz del objetivo sobre el frontón
    if (G.sky) { G.sky.flood = 1; G.sky.indoor = !!(fronton.court.hall || fronton.court.labrit); if (G.sky.indoor) G.sky.floodCur = 1; }   // de noche, los focos; a cubierto, la luz del pabellón siempre
    // y el público sentado en los bancos de la grada (una sola llamada de dibujo; se va al acabar)
    // (los más cercanos a la cámara, en 3D; con pañuelos que se agitan en cada tanto)
    // todo el público en 3D con su textura (sin láminas planas a lo lejos): cuántos, según la calidad, repartidos por la grada
    // (en el Labrit, donde se juegan las finales, todas las butacas ocupadas: los lejanos van con la figura de lejos, ver
    // crowd3d.js; en el frontón cubierto, casi lleno; en el del pueblo, los que caben según la calidad)
    // (menos gente que antes, para que el partido vaya fluido: en el del pueblo, 40, 72 y 110; en el cubierto, algo más; en
    // el Labrit y en la calle, que se llenaban enteros, como mucho 90 en el móvil y 160 en calidad media)
    try { const C = fronton.court, all = C?.standSpots || [], full = C?.hall ? (QUALITY === 'low' ? 1.4 : 2) : 1, lleno = QUALITY === 'low' ? 60 : QUALITY === 'mid' ? 160 : all.length;
      const cap0 = C?.labrit || C?.estilo === 'calle' ? Math.min(all.length, lleno) : Math.round((QUALITY === 'low' ? 40 : QUALITY === 'mid' ? 72 : 110) * full), cap = muyLigero ? Math.min(cap0, 30) : cap0;
      const sp = all.filter(() => Math.random() < Math.min(1, cap / Math.max(1, all.length)));
      // (en coordenadas del mundo: el público 3D elige a los que tiene cerca de la cámara)
      C.group.updateMatrixWorld(true); const yaw = new THREE.Euler().setFromQuaternion(C.group.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
      const wsp = sp.map(([x, y, z, ry]) => { const v = C.group.localToWorld(new THREE.Vector3(x, y, z)); return [v.x, v.y, v.z, ry + yaw]; });
      if (wsp.length) seatedZ = wsp.reduce((a, q) => a + q[2], 0) / wsp.length;
      // (sentados en sus asientos, en todos los frontones: el sitio es el asiento y la figura, algo adelantada y más baja;
      // en cada tanto celebran sin levantarse, con los brazos en alto. Cuánto se adelanta lo dice la grada: en las butacas
      // con respaldo, la cadera sobre el asiento, 8 cm; en los bancos corridos al borde del escalón, 30, con los pies en el
      // de abajo. Nadie atraviesa ni el escalón ni lo que tiene delante)
      const sit = !!C.seated, ad = C.sitAdelante ?? 0.3, wsp2 = sit ? wsp.map(([x, y, z, ry]) => [x + Math.sin(ry) * ad, y - 0.4, z + Math.cos(ry) * ad, ry]) : wsp;
      C.ocupados = sp;   // (las pancartas, solo donde hay alguien que las sostenga)
      if (wsp.length && G.scene) { seated = crowd3d(wsp2, 'pelota', 1.36, { sit, all3d: true, arriba: true, kc: muyLigero ? 1 : ligero ? 6 : null }); G.scene.add(seated); }
      // (en el móvil, el público sale cuando sus texturas ya están en la tarjeta, subidas poco a poco: si no, se subían
      // todas de golpe en la entrada a la cancha y el iPhone perdía la imagen; rt.subePoco)
      if (seated && ligero && G.rt?.subePoco) { const pub = seated; pub.userData.espera = true; pub.listo?.then(() => { const s = G.rt.subePoco(pub, true); const mira = () => { if (s.listo()) pub.userData.espera = false; else setTimeout(mira, 120); }; mira(); }).catch(() => { pub.userData.espera = false; }); }
      // los operadores de las cámaras de la tele (en el Labrit), de pie detrás de ellas: con el público, en el mismo grupo
      if (seated && C.tvCrew?.length) {
        const crew = crowd3d(C.tvCrew.map(([x, y, z, ry]) => { const v = C.group.localToWorld(new THREE.Vector3(x, y, z)); return [v.x, v.y, v.z, ry + yaw]; }), 'pelota', 1.36, { all3d: true, quietos: true });
        seated.add(crew); const tick0 = seated.tick, dispose0 = seated.dispose;
        seated.tick = (t, ex, f, cam) => { tick0(t, ex, f, cam); crew.tick(t, 0, f, cam); }; seated.dispose = () => { dispose0(); crew.dispose(); };
      } } catch (e) { console.warn('público del frontón', e); apunta('público del frontón', e); }
    // las pancartas de la afición en la grada: «¡Aupa…!» para cada uno, de su color, y la de los pelotazales del pueblo
    try { pancartas = pancartasDe(fronton.court, profile().name || (isEU() ? 'Zu' : 'Tú'), rivName, (G.def?.name || '').split(' /')[0], colors); } catch (e) { console.warn('pancartas', e); apunta('pancartas', e); }
    const once = (who, key, on, fn) => { if (on && !flags[who][key]) { flags[who][key] = true; fn(); } else if (!on) flags[who][key] = false; };
    const stYou = { v: null }, stRival = { v: null };
    armSwing(rig.char, () => stYou.v, { windOnly: !!pel }); armSwing(red ? red.char : rival.glb, () => stRival.v, { windOnly: !!red });
    const animYou = (obj, st, dt) => {
      stYou.v = st;
      P.pos.copy(obj.position); P.heading = obj.rotation.y;
      if (rig.char) rig.char.back = st.back; rig.update(dt, st.speed, true, 0);
      once('you', 'swing', st.swing >= 0, () => rig.doAct?.('hit', 0.5));
      once('you', 'won', st.won, () => rig.doCheer?.());
      once('you', 'saluda', st.saluda, () => rig.doWave?.());   // (al salir a la cancha, saluda a la grada)
    };
    const animRival = (obj, st, dt = 1 / 60) => {
      stRival.v = st;
      rival.pos.copy(obj.position); rival.heading = obj.rotation.y; rival.speed = st.speed;
      if (red) { red.char.back = st.back; red.update(dt, st.speed, true, 0); }
      once('rival', 'swing', st.swing >= 0, () => red ? red.doAct('hit', 0.5) : rival.anim?.doAct?.('throw', 0.35));
      once('rival', 'won', st.won, () => red?.doCheer());
      once('rival', 'saluda', st.saluda, () => red ? red.doWave() : rival.anim?.doWave?.());
      if (st.won) rival.cheer = 0.6;
    };
    const youName = profile().name || (isEU() ? 'Zu' : 'Tú');
    // por parejas: tu compañero (vestido como tú) y el del rival (de colorado). Se preparan solo si eliges jugar por
    // parejas, la primera vez, y se van al acabar
    const makeMates = async () => {
      if (mates) return mates;
      const free = MATE_NAMES.filter(n => n !== youName && n !== rivName), n1 = pairs?.partner?.name || free.splice(Math.floor(Math.random() * free.length), 1)[0], n2 = pairs?.rivalMate?.name || free.filter(n => n !== n1)[Math.floor(Math.random() * (free.length - 1))];
      const mk = async (model, name, lv, stats = null) => {
        let r = null;
        if (hasMeshy(model)) try { r = await rigPelotari(model, name); } catch (e) { console.warn('pareja', e); apunta('pareja', e); }
        const obj = new THREE.Group(); obj.visible = false; G.scene.add(obj);
        if (r) { obj.add(r.char.root); r.setStance?.('Ready'); }
        else { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.1, 4, 8), new THREE.MeshStandardMaterial({ color: model === 'pelotari_rojo' ? '#c0392b' : '#f2f2f2' })); m.position.y = 0.8; obj.add(m); }
        const st = { v: null }, fl = {}; if (r) armSwing(r.char, () => st.v, { windOnly: true });
        const flag = (k, on, fn) => { if (on && !fl[k]) { fl[k] = true; fn(); } else if (!on) fl[k] = false; };
        return { obj, name, stats: stats || pelotariStats(name, lv),
          animate: (o, s2, dt = 1 / 60) => { st.v = s2; if (r) { r.char.back = s2.back; r.update(dt, s2.speed, true, 0); flag('swing', s2.swing >= 0, () => r.doAct('hit', 0.5)); flag('won', s2.won, () => r.doCheer()); flag('saluda', s2.saluda, () => r.doWave()); } },
          dispose() { obj.parent?.remove(obj); if (r) { r.char.post = null; r.dispose(); } else obj.traverse(c => { c.geometry?.dispose(); c.material?.dispose?.(); }); } };
      };
      const m = { youMate: await mk(youModel, n1, 2, pairs?.partner?.stats), rivalMate: await mk(rivModel, n2, levelTier(level), pairs?.rivalMate?.stats) };
      if (ended || G.disposed) { for (const x of Object.values(m)) x.dispose(); throw new Error('partido acabado'); }
      return (mates = m);
    };
    marca(youName, rivName, 0, 0);
    // los jueces, en la contracancha (a la altura de la chapa, del 4 y del 7): levantan la mano en cada falta
    try { jueces = G.pelotaJueces = makeJueces(G, fronton.court); } catch (e) { console.warn('jueces', e); apunta('jueces', e); }
    const rStats = rivalStats || pelotariStats(rivName, levelTier(level)); rStatsKeep = rStats;
    try { match = G.pelotaMatch = new PelotaMatch({
      THREE, court: fronton.court, camera: G.camera, lang: isEU() ? 'eu' : 'es', mode, target, level, fixedLevel, rivalStats: rStats,
      you: { obj: P.obj, name: profile().name || (isEU() ? 'Zu' : 'Tú'), animate: animYou },
      rival: { obj: rival.obj, name: rivName, animate: animRival },
      onEnd: (r) => done(r), onExit: (r) => done(r),
      colors, seasons, cuatro,   // (quién viste de cada color y sus temporadas; el Cuatro y Medio)
      fly: intro,   // (la llegada: el vuelo de la cámara hasta la cancha, con los pelotaris y el público ya en su sitio)
      mates: mode === 'match' && (!fixedLevel || pairs) ? makeMates : null, forcePairs: !!pairs,   // (en el torneo individual, mano a mano; en el de parejas, por parejas)
      back: fixedLevel ? 'torneo' : G.sportMode ? 'menu' : 'pueblo',   // (a dónde lleva el botón del final)
      town: (G.def?.name || '').split(' /')[0], youRecord: myRecord(),   // (para las fichas: el pueblo del frontón y lo que has ganado)
      // (tus cualidades, las que vas ganando; y cada partido acabado suma experiencia: lo enseña el panel del final)
      youStats: tusCualidades(), progreso: (e, st, modo) => sumaPartido(e, st, modo),
      cond: frontonCond(G, fronton),   // (cómo es el frontón: a cubierto o al aire libre, de piedra, mojado o el Labrit)
      // (la presentación con los focos, solo en la final de un campeonato: la luz de la imagen baja y vuelve; show.js)
      focos: final, exposure: (v) => { const R = G.rt?.renderer; if (R) R.toneMappingExposure = v ?? 1.05; },
      venue: fronton.court.labrit ? (isEU() ? 'Labrit frontoia · Iruña' : 'Frontón Labrit · Iruña') : fronton.court.hall ? (isEU() ? `${fronton.townName || (G.def?.name || '').split(' /')[0]} · frontoi estalia` : `Frontón cubierto de ${fronton.townName || (G.def?.name || '').split(' /')[0]}`) : null, vsImg: { fig: (name, side) => pelotariFig(name, side, '', true) }, comp,
      youBonus, rivalBonus,   // (la presentación: qué se juega y la media de cada uno)
      caras: { you: avatarPortrait(profile().avatar), fig: (name, side) => pelotariFig(name, side, 'pfx-fig') },   // (las caras del panel: tu retrato y la figura de cada pelotari)
      onEvent: (e) => { if (e.type === 'entrada' && seated) { seated.cheer(true); cheerT = 3.2; }   // (la grada, al salir los pelotaris)
        if (e.type === 'call' && e.score) { const [a, b] = match?.labels?.() || [youName, rivName]; marca(a, b, e.score.you, e.score.rival); } if (e.type === 'call' && seated) { seated.cheer(true); cheerT = e.final ? 4.6 : 1.6; }
        if (e.type === 'call') senalaJuez(jueces, e.call, match?.game?.ball?.p); },
    }); } catch (e) { console.warn('frontón', e); apunta('frontón', e); done({ win: false, error: true }); return; }   // (si no se monta, de vuelta al pueblo)
    // (si el partido falla una y otra vez, se acaba y se vuelve al pueblo: nunca el marcador puesto en mitad de la calle)
    let bad = 0;
    G.pelotaAbort = () => done({ win: false, quit: true, error: true }); G.pelotaLoading = false;
    // (los pelotaris, sus parejas y el público, compilados antes del primer saque: si no, la imagen se paraba al empezar)
    for (const o of [pel?.char.root, red?.char.root, seated]) if (o) G.rt?.warm?.(o);
    G.pelotaTick = (dt) => {
      try { match.update(dt); bad = 0; } catch (e) { console.warn('partido', e); if (!bad) apunta('partido', e); if (++bad > 20) { done({ win: false, quit: true, error: true }); return; } }
      // (en la llegada al Labrit, mientras la cámara va por la calle, el público de dentro no se ve: ni se mueve ni se dibuja)
      try { if (seated) { seated.visible = !seated.userData.espera && !(fronton.court.labrit && G.sky && !G.sky.indoor); if (seated.visible) seated.tick(match.t || 0, cheerT > 0 ? 1 : 0.15, seatedZ, G.camera); if (cheerT > 0 && (cheerT -= dt) <= 0) seated.cheer(false); } } catch (e) { console.warn('público', e); apunta('público', e); seated = null; }
      // (los jueces siguen la pelota con la mirada)
      try { if (jueces.length) { const b = match.game.ball.p, w = fronton.court.group.localToWorld(_jv.set(b.x, 0, b.z)); for (const j of jueces) { j.mira = w; j.update(dt, null); } } } catch (e) { console.warn('jueces', e); apunta('jueces', e); jueces = []; }
    };
    })().catch(fail);
    function done(r) {
      if (ended) return; ended = true;
      G.pelotaTick = null; G.pelotaMatch = null; G.pelotaRig = null; G.pelotaAbort = null; G.pelotaLoading = false;
      // el marcador y los botones del partido, fuera siempre (también si algo falló al montarlo)
      try { match?.destroy(); } catch (e) { console.warn('frontón', e); apunta('frontón', e); }
      document.querySelectorAll('.pel-root:not(.pel-fuera)').forEach(el => el.remove());   // (el que se está desvaneciendo, que acabe)
      // (cada paso por su cuenta: si uno falla, los demás se hacen igual y se vuelve al pueblo con todo en su sitio)
      const safe = (f) => { try { f(); } catch (e) { console.warn('frontón', e); apunta('frontón', e); } };
      // la vuelta, sin ver cómo se recoge la cancha ni cómo salta la cámara a la puerta del frontón: en los campeonatos,
      // el fondo de sus menús delante al momento; en el pueblo, un fundido a negro y, al volver la imagen, ya junto al
      // frontón (si algo falló, sin esperas)
      if (stay && G.sportMode) { safe(() => G.sportBackdrop?.(true, false, true)); vuelve(); }
      else if (!r.error && G.ui?.fadeOut) {
        // (la cámara, quieta donde estaba mientras se funde: si no, saltaba a la del pueblo, a ras de suelo junto al jugador)
        safe(() => { G.follow.cinematic = { t: 0, fly: () => {} }; });
        G.ui.fadeOut().catch(() => {}).then(() => { vuelve(); G.ui.fadeIn?.(); });
      }
      else vuelve();
      function vuelve() {
        safe(() => { if (seated) { seated.parent?.remove(seated); seated.dispose(); seated = null; } });
        safe(() => { pancartas?.(); pancartas = null; });
        safe(() => { for (const j of jueces) { j.obj.parent?.remove(j.obj); removeMover(j.collider); j.glb?.dispose(); } jueces = []; G.pelotaJueces = null; });
        safe(() => { if (mates) for (const m of Object.values(mates)) m.dispose(); mates = null; });
        safe(() => { if (rig.char) rig.char.post = null; if (rival.glb) rival.glb.post = null; rig.setStance?.(null); });
        safe(() => { if (pel) { P.obj.remove(pel.char.root); pel.dispose(); } });
        safe(() => { for (const c of hidden) if (!c.parent) P.obj.add(c); });
        safe(() => { if (bf) bf.visible = bfWas; if (G.beacon) G.beacon.off = false; if (G.sky) { G.sky.flood = 0; G.sky.indoor = false; } });
        safe(() => { if (red) { red.char.post = null; rival.obj.remove(red.char.root); red.dispose(); } });
        safe(() => { for (const c of hiddenR) if (!c.parent) rival.obj.add(c); });
        safe(() => { G.rt?.nature?.partido(false); if (G.rt) G.rt.partidoLigero = false; });
        safe(() => { if (!temporal) return; G.soloCancha = null; if (natu && !natu.fijo) { natu.group.visible = true; if (natu.flowers?.mesh) natu.flowers.mesh.visible = flo0; } if (G.rt?.fauna && vd0 != null) G.rt.fauna.visDist = vd0; });
        safe(() => G.rt?.boost?.(false));
        // (en los campeonatos, stay: del partido se pasa al menú o al cuadro del torneo sin volver al pueblo, ni sus
        // botones ni el perro; el jugador sigue quieto en la puerta del frontón, de fondo)
        P.rig = rig0; P.frozen = !!stay; G.mode = 'play';
        if (!stay) { safe(() => G.ui.hudVisible?.(true)); safe(() => G.perro?.release?.()); }
        safe(() => { rival.frozen = false; rival.speed = 0; rival.setPos(home.x, home.z, home.h); });
        safe(() => { const back = returnTo || fronton, e = back.entry, c = back.out || back.toWorld(0, 12); P.place(e.x, e.z, Math.atan2(c.x - e.x, c.z - e.z)); });
        safe(() => { G.follow.cinematic = null; G.follow.snap(P); });
        // (la colección de pelotaris: el rival queda en su pueblo en cuanto se juega contra él; el resultado, si se acabó)
        safe(() => { if (mode === 'match' && (match?.met || match?.game?.phase !== 'intro') && !r.later && !r.error) { const tw = rivalTown || { id: G.def?.id, name: (G.def?.name || '').split(' /')[0] }; meetPelotari(tw, { name: rivName, stats: rStatsKeep }, r.quit ? null : !!r.win); } });
        res({ win: !!r.win, you: r.score?.you ?? 0, cpu: r.score?.rival ?? 0, best: r.best ?? 0, quit: !!r.quit, later: !!r.later, error: !!r.error, color: colors.you });
      }
    }
  });
}
