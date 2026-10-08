// Frontón de los pueblos y partido de pelota a mano con el motor común de src/pelota.
// Aquí solo se adapta el motor al juego: dónde va el frontón, colisiones, personajes, cámara e interfaz.
import * as THREE from 'three';
import { armSwing, GlbRig, loadMeshy, hasMeshy, loadedMeshy, fullTexFor } from '../actors/glbChar.js';
import { PelotaCourt, PelotaMatch, labritExtent } from '../pelota/index.js';
import { pelotariStats } from '../pelota/rules.js';
import { terrainHeight, waterLevelAt, addPlatform, onPlatform } from '../world/heightfield.js';
import { addBox, rectFree } from '../world/colliders.js';
import { rx, pathQuery } from '../world/layout.js';
import { clearGrass, clearTrees } from '../world/nature.js';
import { isEU } from '../i18n.js';
import { profile } from './profile.js';
import { QUALITY } from '../util/quality.js';
import { crowd3d } from '../actors/crowd3d.js';
import { shieldSpec, drawShield } from '../world/heraldry.js';
import { drawOfficial, officialHeight } from '../world/armas.js';
import { armsOfTown } from '../data/armas-navarra.js';
import { LEVELS } from '../data/levels.js';

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
  const i = Math.max(0, LEVELS.filter(l => l.comarca === cid && !l.special).findIndex(l => l.id === def.id)), V = VARIANTS[cid] || [{}];
  return { ...c, ...V[i % V.length], ...(LOOK_TOWN[def.id] || {}) };
}

// nombre del pueblo y su escudo para la pared izquierda (como el letrero del ayuntamiento en los frontones de verdad)
// y cómo es el frontón de allí (look)
export function frontonWall(def) {
  // el escudo oficial del pueblo o de su valle cuando está comprobado; si no, uno propio del juego
  const spec = shieldSpec(def), A = armsOfTown(def.id);
  const shield = A ? (g, cx, top, h) => drawOfficial(g, cx, top, h / officialHeight(1, A), A) : (g, cx, top, h) => drawShield(g, cx, top, h, spec);
  return { wallName: (def.name || '').split(/\s*\/\s*/).join(' · ').toUpperCase(), wallSub: 'AYUNTAMIENTO · UDALA', shield, look: frontonLook(def) };
}

// nombres para los compañeros de los partidos por parejas
const MATE_NAMES = ['Unai', 'Ane', 'Jon', 'Maite', 'Iñaki', 'Nerea', 'Aitor', 'Leire', 'Ander', 'Amaia', 'Xabier', 'Garazi'];

// huella del frontón en coordenadas locales (se calcula una vez)
let EXTENT = null;
function extent() { if (!EXTENT) { const c = new PelotaCourt(THREE, { texScale: 0.25 }); EXTENT = c.extent; c.dispose(); } return EXTENT; }

// Busca un sitio llano y libre cerca de la plaza
export function findFrontonSpot(plaza, E = extent()) {
  // primero cerca de la plaza y sin calles ni caminos debajo (las paredes los cortarían) y con sitio de sobra alrededor
  // (los tejados sobresalen del choque de las casas: antes quedaban esquinas de casa pegadas a la cancha); si así no
  // cabe, más lejos; luego dejando pasar algún camino; y al final con menos holgura: todos los pueblos tienen frontón
  return frontonSearch(plaza, 34, 130, 3, 0.2, true, E) || frontonSearch(plaza, 130, 240, 3, 0.15, true, E)
    || frontonSearch(plaza, 34, 240, 1.5, 0.2, false, E) || frontonSearch(plaza, 34, 260, 0.6, 0.15, false, E);
}
function frontonSearch(plaza, r0, r1, gap, da, noRoad, E) {
  let best = null, bs = 1e9;
  for (let r = r0; r <= r1; r += 8) for (let a = 0; a < Math.PI * 2; a += da) {
    const x = plaza.x + Math.cos(a) * r, z = plaza.z + Math.sin(a) * r, face = Math.atan2(plaza.x - x, plaza.z - z);
    if (Math.sign(x - rx(z)) !== Math.sign(plaza.x - rx(plaza.z))) continue;   // en la misma orilla que la plaza (sin río, rx es 9999: todo vale)
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
export function courtHeight(x, z, ry, E = extent()) {
  const c = Math.cos(ry), s = Math.sin(ry); let mx = -1e9;
  for (let lx = E.x0; lx <= E.x1 + 0.01; lx += 1.5) for (let lz = E.z0; lz <= E.z1 + 0.01; lz += 1.5) mx = Math.max(mx, terrainHeight(x + lx * c + lz * s, z - lx * s + lz * c));
  return mx + 0.05;
}

export class Fronton {
  // spot: centro del frontis a ras de suelo; ry: giro (la cancha crece hacia +z local); sin y, se calcula
  // extra: { wallName, wallSub, shield } → nombre y escudo pintados en la pared izquierda
  constructor(scene, spot, title = '', extra = {}) {
    if (spot.y == null) spot = { ...spot, y: courtHeight(spot.x, spot.z, spot.ry, extra.inTown ? labritExtent() : undefined) };
    this.spot = spot;
    const court = this.court = new PelotaCourt(THREE, { title, texScale: QUALITY === 'low' ? 0.5 : 1, ...extra });
    const g = court.group; g.position.set(spot.x, spot.y, spot.z); g.rotation.y = spot.ry; scene.add(g); g.updateMatrixWorld(true);
    const E = court.extent, mid = this.toWorld((E.x0 + E.x1) / 2, 0);
    if (!extra.noClear) { clearGrass(mid.x, mid.z, E.x1 - E.x0, E.z1, spot.ry); clearTrees(mid.x, mid.z, E.x1 - E.x0, E.z1, spot.ry); }
    for (const b of court.boxes) { const p = this.toWorld(b.x, b.z); addBox(p.x, p.z, b.w, b.d, spot.ry, { solidView: true }); }
    const PF = court.platform || { x0: E.x0, x1: E.x1 - 3.3, z0: E.z0, z1: E.z1 };
    addPlatform(spot.x, spot.z, spot.ry, PF.x0, PF.x1, PF.z0, PF.z1, spot.y);   // la cancha es suelo (sin las gradas)
    this.entry = this.toWorld(court.entry.x, court.entry.z);
    this.out = court.out ? this.toWorld(court.out.x, court.out.z) : null;   // (al salir, mirando a la calle y no a la pared)
  }
  toWorld(lx, lz) { const v = new THREE.Vector3(lx, 0, lz); this.court.group.localToWorld(v); return v; }
  play(G, rival, opts) { return playPelota(G, this, rival, opts); }
}

// El frontón Labrit de Iruña, donde se juegan las finales: se monta una vez, muy por encima del pueblo y fuera de sus
// límites (no toca casas, árboles ni caminos; dentro, cubierto, no se ve nada de fuera)
let LABRIT = null;
function labritOpts() {
  // (en la pared izquierda, el escudo de Pamplona y su nombre, como en el de verdad, sin el logotipo del ayuntamiento)
  const A = armsOfTown('pamplona'), shield = A ? (g, cx, top, h) => drawOfficial(g, cx, top, h / officialHeight(1, A), A) : null;
  return { labrit: true, wallName: 'IRUÑA · PAMPLONA', wallSub: 'FRONTÓN LABRIT', shield, signAt: { y: 5.4 },
    look: { frontis: '#1d5846', wall: '#1d5846', floor: '#1a1f21', contra: '#d49a5c', parquet: true, line: '#f3f2ec', mark: '#f3f2ec', chapa: '#d9dcd8', chapaMetal: true, stone: null, brick: false, roof: null, cap: '#1d5846' } };
}
export function labrit(scene, out) {
  if (LABRIT && LABRIT.court.group.parent === scene) return LABRIT;
  LABRIT = new Fronton(scene, { x: out.x, z: out.z, y: 2400, ry: 0 }, 'LABRIT', { ...labritOpts(), noClear: true });
  return LABRIT;
}
// En Iruña, el frontón de la ciudad es el Labrit de verdad: el edificio entero en la calle, junto a la plaza de toros
export function labritInTown(scene, near) {
  const sp = findFrontonSpot(near, labritExtent());
  return sp ? new Fronton(scene, sp, 'LABRIT', { ...labritOpts(), inTown: true }) : null;
}

/**
 * Partido (o peloteo) en un frontón. Devuelve una promesa con { win, you, cpu, best, quit }.
 * G: juego (player, camera, follow, ui, mode); rival: Actor del pueblo.
 */
// (torneo: rivalName para el nombre del rival en el marcador y fixedLevel para no elegir nivel)
// rivalStats: las cualidades del rival (fuerza, agilidad, velocidad, de 1 a 5); sin ellas, las suyas según su nombre
export function playPelota(G, fronton, rival, { mode = 'match', target = 5, level, rivalName, fixedLevel = false, returnTo = null, rivalStats = null } = {}) {
  if (window.__autoWin) return Promise.resolve({ win: true, you: target, cpu: 0 });
  return new Promise(res => {
    const P = G.player, rig0 = P.rig, home = { x: rival.pos.x, z: rival.pos.z, h: rival.heading };
    let seated = null, seatedZ = 0, cheerT = 0;
    let rig = rig0, pel = null, red = null, bf = null, bfWas = false, ended = false, match = null, mates = null; const hidden = [], hiddenR = [];
    // si algo falla al montar el partido, de vuelta al pueblo con todo como estaba (nunca congelado en la cancha)
    const fail = (e) => {
      console.warn('frontón', e);
      try { done({ win: false, error: true }); }
      catch (e2) { console.warn('frontón', e2); P.rig = rig0; P.frozen = false; G.mode = 'play'; G.pelotaTick = null; G.ui.hudVisible?.(true); res({ win: false, you: 0, cpu: 0, best: 0, quit: true }); }   // (resolver dos veces no hace nada)
    };
    (async () => {
    // para el partido te conviertes en el pelotari (camiseta, pantalón blanco y tacos en las manos); al acabar vuelves a ser tú
    // (si ya juegas con el pelotari, no hace falta cambiar; los modelos se piden antes, al acercarte al frontón)
    G.pelotaLoading = true;   // (preparándose: si se pierde la memoria gráfica ahora, el pueblo se rehace junto al frontón)
    const wait = !loadedMeshy('pelotari') || !loadedMeshy('pelotari_rojo');
    if (wait) G.ui.toast?.(isEU() ? 'Pilotariak prestatzen…' : 'Preparando a los pelotaris…', 'pelota', 1800);
    if (rig0.id !== 'pelotari' && hasMeshy('pelotari')) try { fullTexFor('pelotari'); pel = new GlbRig(await loadMeshy('pelotari'), 'pelotari'); } catch (e) { console.warn('pelotari', e); }
    // (el cuerpo de siempre se aparta del todo mientras dura el partido: así nada lo vuelve a mostrar)
    if (pel) { hidden.push(...P.obj.children); for (const c of hidden) P.obj.remove(c); P.obj.add(pel.char.root); rig = pel; }
    // y el rival juega de rojo (el pelotari colorado), como en los partidos de verdad: azules contra colorados
    if (hasMeshy('pelotari_rojo')) try { fullTexFor('pelotari_rojo'); red = new GlbRig(await loadMeshy('pelotari_rojo'), 'pelotari_rojo'); } catch (e) { console.warn('pelotari rojo', e); }
    // (si mientras se preparaban los pelotaris el pueblo se ha rehecho —en el iPhone, al quedarse sin memoria gráfica—,
    // este partido ya no se juega: antes salían sus controles sobre el pueblo nuevo, en la llegada)
    if (G.disposed) { pel?.dispose(); red?.dispose(); G.pelotaLoading = false; res({ win: false, you: 0, cpu: 0, best: 0, quit: true }); return; }
    if (red) { hiddenR.push(...rival.obj.children); for (const c of hiddenR) rival.obj.remove(c); rival.obj.add(red.char.root); red.setStance('Ready'); }
    // el partido anima al jugador y coloca a los dos: el rig del jugador pasa a nuestras manos
    P.rig = { update() { }, doAct() { }, doCheer() { }, doWave() { }, setExpr() { } };
    P.frozen = true; G.mode = 'pelota'; G.ui.hudVisible?.(false); G.ui.setPrompt?.(null);
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
    if (G.sky) G.sky.flood = 1;          // de noche, los focos del frontón encendidos
    // y el público sentado en los bancos de la grada (una sola llamada de dibujo; se va al acabar)
    // (los más cercanos a la cámara, en 3D; con pañuelos que se agitan en cada tanto)
    // todo el público en 3D con su textura (sin láminas planas a lo lejos): cuántos, según la calidad, repartidos por la grada
    try { const C = fronton.court, all = C?.standSpots || [], full = C?.labrit ? (QUALITY === 'low' ? 1.6 : 3) : 1, cap = Math.round((QUALITY === 'low' ? 44 : QUALITY === 'mid' ? 64 : 90) * full);   // (en el Labrit, la final: lleno)
      const sp = all.filter(() => Math.random() < Math.min(1, cap / Math.max(1, all.length)));
      // (en coordenadas del mundo: el público 3D elige a los que tiene cerca de la cámara)
      C.group.updateMatrixWorld(true); const yaw = new THREE.Euler().setFromQuaternion(C.group.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
      const wsp = sp.map(([x, y, z, ry]) => { const v = C.group.localToWorld(new THREE.Vector3(x, y, z)); return [v.x, v.y, v.z, ry + yaw]; });
      if (wsp.length) seatedZ = wsp.reduce((a, q) => a + q[2], 0) / wsp.length;
      if (wsp.length && G.scene) { seated = crowd3d(wsp, 'pelota', 1.36, { sit: false, all3d: true }); /* de pie en los escalones: sentados en cuclillas se veían raros */ G.scene.add(seated); } } catch (e) { console.warn('público del frontón', e); }
    const once = (who, key, on, fn) => { if (on && !flags[who][key]) { flags[who][key] = true; fn(); } else if (!on) flags[who][key] = false; };
    const stYou = { v: null }, stRival = { v: null };
    armSwing(rig.char, () => stYou.v, { windOnly: !!pel }); armSwing(red ? red.char : rival.glb, () => stRival.v, { windOnly: !!red });
    const animYou = (obj, st, dt) => {
      stYou.v = st;
      P.pos.copy(obj.position); P.heading = obj.rotation.y;
      if (rig.char) rig.char.back = st.back; rig.update(dt, st.speed, true, 0);
      once('you', 'swing', st.swing >= 0, () => rig.doAct?.('hit', 0.5));
      once('you', 'won', st.won, () => rig.doCheer?.());
    };
    const animRival = (obj, st, dt = 1 / 60) => {
      stRival.v = st;
      rival.pos.copy(obj.position); rival.heading = obj.rotation.y; rival.speed = st.speed;
      if (red) { red.char.back = st.back; red.update(dt, st.speed, true, 0); }
      once('rival', 'swing', st.swing >= 0, () => red ? red.doAct('hit', 0.5) : rival.anim?.doAct?.('throw', 0.35));
      once('rival', 'won', st.won, () => red?.doCheer());
      if (st.won) rival.cheer = 0.6;
    };
    const youName = profile().name || (isEU() ? 'Zu' : 'Tú'), rivName = rivalName || String(rival.name).split(',')[0];
    // por parejas: tu compañero (vestido como tú) y el del rival (de colorado). Se preparan solo si eliges jugar por
    // parejas, la primera vez, y se van al acabar
    const makeMates = async () => {
      if (mates) return mates;
      const free = MATE_NAMES.filter(n => n !== youName && n !== rivName), n1 = free.splice(Math.floor(Math.random() * free.length), 1)[0], n2 = free[Math.floor(Math.random() * free.length)];
      const mk = async (model, name, lv) => {
        let r = null;
        if (hasMeshy(model)) try { fullTexFor(model); r = new GlbRig(await loadMeshy(model), model); } catch (e) { console.warn('pareja', e); }
        const obj = new THREE.Group(); obj.visible = false; G.scene.add(obj);
        if (r) { obj.add(r.char.root); r.setStance?.('Ready'); }
        else { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.1, 4, 8), new THREE.MeshStandardMaterial({ color: model === 'pelotari_rojo' ? '#c0392b' : '#f2f2f2' })); m.position.y = 0.8; obj.add(m); }
        const st = { v: null }, fl = {}; if (r) armSwing(r.char, () => st.v, { windOnly: true });
        const flag = (k, on, fn) => { if (on && !fl[k]) { fl[k] = true; fn(); } else if (!on) fl[k] = false; };
        return { obj, name, stats: pelotariStats(name, lv),
          animate: (o, s2, dt = 1 / 60) => { st.v = s2; if (r) { r.char.back = s2.back; r.update(dt, s2.speed, true, 0); flag('swing', s2.swing >= 0, () => r.doAct('hit', 0.5)); flag('won', s2.won, () => r.doCheer()); } },
          dispose() { obj.parent?.remove(obj); if (r) { r.char.post = null; r.dispose(); } else obj.traverse(c => { c.geometry?.dispose(); c.material?.dispose?.(); }); } };
      };
      const m = { youMate: await mk('pelotari', n1, 2), rivalMate: await mk('pelotari_rojo', n2, level === 'dificil' ? 3 : level === 'facil' ? 1 : 2) };
      if (ended || G.disposed) { for (const x of Object.values(m)) x.dispose(); throw new Error('partido acabado'); }
      return (mates = m);
    };
    fronton.court.setScore?.(youName, rivName, 0, 0);
    const rStats = rivalStats || pelotariStats(rivName, level === 'dificil' ? 3 : level === 'facil' ? 1 : 2);
    try { match = G.pelotaMatch = new PelotaMatch({
      THREE, court: fronton.court, camera: G.camera, lang: isEU() ? 'eu' : 'es', mode, target, level, fixedLevel, rivalStats: rStats,
      you: { obj: P.obj, name: profile().name || (isEU() ? 'Zu' : 'Tú'), animate: animYou },
      rival: { obj: rival.obj, name: rivalName || String(rival.name).split(',')[0], animate: animRival },
      onEnd: (r) => done(r), onExit: (r) => done(r),
      mates: mode === 'match' && !fixedLevel ? makeMates : null,   // (en el torneo, mano a mano)
      onEvent: (e) => { if (e.type === 'call' && e.score) { const [a, b] = match?.labels?.() || [youName, rivName]; fronton.court.setScore?.(a, b, e.score.you, e.score.rival); } if (e.type === 'call' && seated) { seated.cheer(true); cheerT = e.final ? 4.6 : 1.6; } },
    }); } catch (e) { console.warn('frontón', e); done({ win: false, error: true }); return; }   // (si no se monta, de vuelta al pueblo)
    // (si el partido falla una y otra vez, se acaba y se vuelve al pueblo: nunca el marcador puesto en mitad de la calle)
    let bad = 0;
    G.pelotaAbort = () => done({ win: false, quit: true, error: true }); G.pelotaLoading = false;
    G.pelotaTick = (dt) => {
      try { match.update(dt); bad = 0; } catch (e) { console.warn('partido', e); if (++bad > 20) { done({ win: false, quit: true, error: true }); return; } }
      try { if (seated) { seated.tick(match.t || 0, cheerT > 0 ? 1 : 0.15, seatedZ, G.camera); if (cheerT > 0 && (cheerT -= dt) <= 0) seated.cheer(false); } } catch (e) { console.warn('público', e); seated = null; }
    };
    })().catch(fail);
    function done(r) {
      if (ended) return; ended = true;
      G.pelotaTick = null; G.pelotaMatch = null; G.pelotaRig = null; G.pelotaAbort = null; G.pelotaLoading = false;
      // el marcador y los botones del partido, fuera siempre (también si algo falló al montarlo)
      try { match?.destroy(); } catch (e) { console.warn('frontón', e); }
      document.querySelectorAll('.pel-root').forEach(el => el.remove());
      // (cada paso por su cuenta: si uno falla, los demás se hacen igual y se vuelve al pueblo con todo en su sitio)
      const safe = (f) => { try { f(); } catch (e) { console.warn('frontón', e); } };
      safe(() => { if (seated) { seated.parent?.remove(seated); seated.dispose(); seated = null; } });
      safe(() => { if (mates) for (const m of Object.values(mates)) m.dispose(); mates = null; });
      safe(() => { if (rig.char) rig.char.post = null; if (rival.glb) rival.glb.post = null; rig.setStance?.(null); });
      safe(() => { if (pel) { P.obj.remove(pel.char.root); pel.dispose(); } });
      safe(() => { for (const c of hidden) if (!c.parent) P.obj.add(c); });
      safe(() => { if (bf) bf.visible = bfWas; if (G.beacon) G.beacon.off = false; if (G.sky) G.sky.flood = 0; });
      safe(() => { if (red) { red.char.post = null; rival.obj.remove(red.char.root); red.dispose(); } });
      safe(() => { for (const c of hiddenR) if (!c.parent) rival.obj.add(c); });
      safe(() => G.rt?.boost?.(false));
      P.rig = rig0; P.frozen = false; G.mode = 'play';
      safe(() => G.ui.hudVisible?.(true)); safe(() => G.perro?.release?.());
      safe(() => { rival.frozen = false; rival.speed = 0; rival.setPos(home.x, home.z, home.h); });
      safe(() => { const back = returnTo || fronton, e = back.entry, c = back.out || back.toWorld(0, 12); P.place(e.x, e.z, Math.atan2(c.x - e.x, c.z - e.z)); });
      safe(() => { G.follow.cinematic = null; G.follow.snap(P); });
      res({ win: !!r.win, you: r.score?.you ?? 0, cpu: r.score?.rival ?? 0, best: r.best ?? 0, quit: !!r.quit });
    }
  });
}
