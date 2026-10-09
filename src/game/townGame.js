// Partida en un pueblo o ciudad: misiones con pasos claros, personajes, minijuegos y sello final.
import * as THREE from 'three';
import { Actor, cullActor, frameFrustum } from '../actors/people.js';
import { MYTHS } from '../actors/outfits.js';
import { PLACES } from '../world/layout.js';
import { loadMeshy, hasMeshy } from '../actors/glbChar.js';
import { QUALITY } from '../util/quality.js';
import { Jornales } from './jornales.js';
import { groundHeight, terrainHeight, waterLevelAt, onPlatform } from '../world/heightfield.js';
import { TOWN } from '../world/townBuilder.js';
import { isFree, segmentBlocked, addCircle, addBox } from '../world/colliders.js';
import { clamp, lerp, angleDiff, mulberry32 } from '../util/math.js';
import { profile, saveProfile, townState, addXP, checkBadges, addCard, comarcaDone, levelOf } from './profile.js';
import { infoCard, timingGame, mashGame, sequenceGame, simonGame, choiceGame, missionComplete, townFinale, play3d } from '../ui/minigames.js';
import { OFICIOS } from '../data/oficios.js';
import { PERSONAJES } from '../data/personajes.js';
import { makeItem, makeGate, makeWorkbench, makeMemorial } from './items.js';
import COMARCAS from '../data/comarcas.json';
import FOLKLORE from '../data/folklore.json';
import { LEVELS } from '../data/levels.js';
import { COSTUMES } from '../actors/minifig.js';
import { stampImg } from '../assets.js';
import { FAUNA, faunaName } from '../data/fauna.js';
import { LEGENDS, NIGHT_CARNIVAL } from '../data/legends.js';
import MOUNTAINS from '../data/mountains.json';
import { viewFrom } from '../data/panorama.js';
import { buildAgro } from '../world/agro.js';
import { PASTOR_INFO, VAQUERA_INFO } from '../data/campo.js';
import { Mochila } from './mochila.js';
import { Perro } from './perro.js';
import { makeTrailSign, makeSignpost, makeBalizas, signSVG, ORIENTA, ORIENTA_TIPS, MONTE_TIPS } from './senales.js';
import { FOOD } from '../data/equipo.js';
import { Tienda } from './tienda.js';
import { Mercado, marketDay } from './mercado.js';
import { GOODS } from '../data/tiendas.js';
import { FERIA } from '../data/ferias.js';
import { PET, BELL, BENCH_LINES } from '../data/tocar.js';
import { SITES } from '../data/dolmen.js';
import { SABIOS, STYLE_TIP, LABEL_TIP, KIND_TIP, NO_SABIO } from '../data/sabios.js';
// el encierro y el fútbol (motores grandes) se descargan al entrar en ellos, no al abrir el juego
const loadEncierro = () => import('./encierro.js').then(m => m.Encierro);
const loadFutbol = () => import('./futbol.js').then(m => m.Futbol);
import { montesFrom, townLatLon } from '../data/miradores.js';
import { Panorama } from '../world/panorama.js';
import { houseArms } from '../data/blasones.js';
import { armsOfTown } from '../data/armas-navarra.js';
import { missionSlots, edadDe } from '../data/edad.js';
import { drawOfficial, officialHeight } from '../world/armas.js';
import { CAT_BY_TYPE, SABERES } from '../data/saberes.js';
import { drawArms } from '../world/heraldry.js';
import { readArms, readTownArms } from '../ui/escudo.js';
import { PARTS, CASTLE_QUIZ, CASTLE_TOWNS, CASTILLOS } from '../data/castillos.js';
import { GearProps } from '../actors/gear3d.js';
import { foodFrom } from '../data/equipo.js';
import { PROCESOS, TRADICIONES } from '../data/procesos.js';
import { bird } from '../actors/beasts.js';
import { Fronton, findFrontonSpot, frontonWall, labrit, labritInTown, hallVenue } from './fronton.js';
import { Pista, findPistaSpot } from './pista.js';
import { clubOfTown, teamOfClub } from '../futbol/clubs.js';
import { clubPanel } from '../futbol/liga.js';
import { season as ligaSeason } from '../futbol/liga.js';
import { CLUBS } from '../futbol/clubs.js';
const CLUBS_NAME = (id) => CLUBS[id]?.name || '';
import { torneo, yourMatch, playTorneoRound, torneoPanel, pelotaMenu, youBonus } from './torneo.js';
import { showChampion } from '../ui/champion.js';
import { makeClue, makeAura } from './legendFx.js';
import { Chase } from './chase.js';
import { FloraSpots } from './floraSpots.js';
import { showFicha } from '../ui/ficha.js';
import { cuentoOfTown, KIND_LABEL } from '../data/cuentos.js';
import { repartirTareas, TAREAS } from './rutinas.js';

const CROP = {
  uva: ['racimos de uva', 'uva'], olivo: ['aceitunas', 'olivo'], piquillo: ['pimientos del piquillo', 'piquillo'], esparrago: ['manojos de espárragos', 'esparrago'],
  alcachofa: ['alcachofas', 'alcachofa'], cardo: ['cardos', 'cardo'], tomate: ['tomates', 'tomate'], trigo: ['gavillas de trigo', 'trigo'], patata: ['patatas', 'patata'],
  manzana: ['manzanas', 'manzana'], almendra: ['almendras', 'almendra'], pocha: ['vainas de pocha', 'pocha'], maiz: ['mazorcas', 'corn'],
};
const ANIMAL = { sheep: ['ovejas', 'sheep'], cows: ['vacas', 'cow'], pottoka: ['pottokas', 'pottoka'], horses: ['caballos', 'pottoka'], goats: ['cabras', 'sheep'], pigs: ['cerdos', 'pig'] };
const TRADE = {
  herrero: { art: 'anvil', title: 'El herrero', game: 'timing', verb: 'Golpear', icon: 'anvil', hint: 'Golpea el hierro cuando la marca esté en la zona roja.', act: 'hammer', look: { shirt: '#5a4a3a', apron: '#3a2a1a', pants: '#2b2630', hammer: true } },
  palomero: { art: 'dove', title: 'Los palomeros', game: 'timing', verb: 'Agitar la paleta', icon: 'net', hint: 'Agita la paleta blanca justo cuando pasa el bando de palomas.', act: 'wave' },
  harrijasotzaile: { art: 'lift', title: 'Levantar la piedra', game: 'mash', verb: '¡Arriba!', icon: 'stone', hint: 'Pulsa muy rápido para subir la piedra al hombro.', act: 'lift' },
  aizkolari: { art: 'chop', title: 'Aizkolari', game: 'timing', verb: 'Hachazo', icon: 'axe', hint: 'Da cada hachazo en el momento justo para cortar el tronco.', act: 'chop' },
  cantero: { art: 'stone', title: 'El cantero', game: 'timing', verb: 'Tallar', icon: 'hammer', hint: 'Talla la piedra con golpes precisos.', act: 'hammer' },
  alpargatero: { art: 'sole', title: 'Alpargatas de esparto', game: 'timing', verb: 'Coser', icon: 'espadrille', hint: 'Cose la suela de esparto con puntadas precisas.', act: 'pick' },
};
// nombre del guía del pueblo, nunca el mismo que el de quien juega («Guía Ane: ¡Kaixo, Ane!» confundía)
const guideName = (g, me = '') => (g ? ['Ane', 'Maite'] : ['Iker', 'Unai']).find(n => n.toLowerCase() !== String(me).trim().toLowerCase());
const RACE = { camino: ['El Camino de Santiago', 'camino', 'Sigue las conchas y flechas amarillas'], almadia: ['Bajada en almadía', 'raft', 'Guía la almadía por el río'], encierro: ['Carrera del encierro', 'bull', '¡Corre delante de los toros!'], romeria: ['Romería', 'footprint', 'Sube por el camino de los romeros'], bici: ['Vía verde', 'bike', 'Recorre el viejo trazado del tren'] };
// Aspecto de los personajes de carnaval y leyenda
const FOLK = {
  joaldun: { shirt: '#f4f1ea', fur: '#ece4d2', hat: 'cone', hatColor: '#f4f1ea', skirt: '#f4f1ea', pants: '#1d2a4a', bells: true, scarf: '#3a8fd6', handkerchief: '#e8e0cc', face: 'brave' },
  mozorro: { shirt: '#6b8a3a', pattern: 'check', pattern2: '#e03c3c', pants: '#3a2a1a', hat: 'mask', hatColor: '#6b4a2e', maskColor: '#f1e7d6', stick: '#8a5a32' },
  momotxorro: COSTUMES.momotxorro,
  'miel-otxin': { shirt: '#e03c3c', ribbons: true, pants: '#f2c230', hat: 'cone', hatColor: '#3a8fd6', height: 2.1, build: 1.2, face: 'angry' },
  zarratrako: { shirt: '#8a6a4a', pattern: 'stripes', pattern2: '#3ca05a', pants: '#6b4a2e', fur: '#b08650', hat: 'mask', hatColor: '#3a2a1a', bell: true, stick: '#6b4a2e' },
  cascabobo: { shirt: '#f2c230', pattern: 'dots', pattern2: '#e03c3c', pants: '#e03c3c', hat: 'cone', hatColor: '#e03c3c', bladder: true, face: 'happy' },
  irasko: { shirt: '#3ca05a', pattern: 'check', pattern2: '#f2c230', pants: '#2b3a6b', hat: 'mask', hatColor: '#3ca05a', bell: true },
  paloki: { shirt: '#b34fc4', ribbons: true, pants: '#f4f1ea', hat: 'cone', hatColor: '#f2c230', height: 2.0 },
  'comparsa-mendigorria': { shirt: '#3a8fd6', pattern: 'stripes', pattern2: '#f4f1ea', pants: '#e03c3c', hat: 'mask', hatColor: '#3a8fd6' },
  lagunero: { shirt: '#2b3a6b', print: 'coat', pants: '#f4f1ea', hat: 'bicorne', bigHead: true, face: 'angry', moustache: '#2a1a12', moustacheCurl: true },
  zipotero: { shirt: '#3a8fd6', pattern: 'stripes', pattern2: '#f2c230', pants: '#e03c3c', hat: 'mask', hatColor: '#f2c230', bladder: true, face: 'angry' },
  caravinagre: COSTUMES.caravinagre,
  // criaturas de la noche: claramente más grandes que una persona (1,5 a 2,5 veces)
  lamia: { skin: '#e6e2cf', hair: '#e8c34a', hairStyle: 'long', hairLen: 5.2, duck: true, lashes: true, eyes: '#2f9f8a', shirt: '#6ab0a0', print: 'blouse', bodice: '#3a8a7a', skirt: '#4a9a8a', pants: '#4a9a8a', comb: true, height: 2.55, build: 0.95, face: 'smirk', female: true },
  basajaun: { skin: '#b08462', hair: '#4e3420', hairStyle: 'long', hairLen: 2.6, shaggy: '#5a3e26', beard: '#4e3420', brows: '#2e1c10', fur: '#5a3e26', shirt: '#5a3e26', pants: '#4a3420', staff: true, height: 3.4, build: 1.45, face: 'brave' },
  sorgina: { skin: '#e8d0b8', hair: '#dcd7cf', hairStyle: 'long', shirt: '#3d3350', print: 'shawl', shawl: '#2a2440', skirt: '#2a2440', pants: '#2a2440', kerchief: '#3d3350', old: true, staff: true, height: 2.4 },
  roldan: { skin: '#dfe6ff', hair: '#c9d4ff', beard: '#c9d4ff', shirt: '#aab6d8', print: 'coat', pants: '#8a96b8', shoes: '#6a7698', boots: true, staff: true, height: 2.7, build: 1.15, face: 'brave' },
  tartalo: { skin: '#c9a27a', hair: '#3b2418', shirt: '#6b4a2e', fur: '#8a6a4a', pants: '#4a3a2a', height: 2.6, build: 1.4, face: 'angry', staff: true },
};
// Paletas de trajes para los vecinos según la zona
const PALETTE = {
  atlantic: { shirts: ['#f4f1ea', '#e8e0cc', '#c9d8e6', '#d9e4c8'], pants: ['#2b2630', '#3a3530', '#1d2a4a'], extras: ['#d42f2f', '#2b5a3a', '#1d1d24'] },
  pyrenean: { shirts: ['#f0ebe0', '#e2d6c0', '#b8c4cc'], pants: ['#2b2630', '#4a3f36', '#1a1a1a'], extras: ['#1d1d24', '#8a2f2f', '#3a4a3a'] },
  central: { shirts: ['#f4f1ea', '#e8d6b0', '#d0c0a0', '#b8c8d8'], pants: ['#4a3a2a', '#2b2630', '#3a4a5a'], extras: ['#d42f2f', '#6b4a2e', '#2b3a6b'] },
  ribera: { shirts: ['#f4f1ea', '#f2dcb0', '#e8c8a0', '#d8e0e8'], pants: ['#3a3530', '#1d2a4a', '#5a4a3a'], extras: ['#d42f2f', '#1d1d24', '#c9772f'] },
  city: { shirts: ['#f4f1ea', '#d42f2f', '#3a8fd6', '#f2c230', '#6d3b5c', '#3ca05a'], pants: ['#1d2a4a', '#2b2630', '#6b6f75', '#f4f1ea'], extras: ['#d42f2f', '#1d1d24'] },
};
const SKINS = ['#f1c7a5', '#eab89a', '#e2b08a', '#d9a57f', '#c98f6b', '#f3d2b8', '#a8755a'];
const HAIRS = ['#2a1a12', '#3b2418', '#6b4a2e', '#a0522d', '#c9772f', '#1a1a1a', '#dcd7cf', '#e2c46a'];
const WALKER_LINES = [
  ['¡Egun on! Qué día más bonito para pasear.'], ['¿Has visto ya la iglesia? Cada pueblo la construyó a su manera.'], ['Mi abuela dice que antes aquí todo se hacía a mano.'],
  ['¡Aupa! Si buscas a alguien, sigue la luz dorada.'], ['En fiestas la plaza se llena de música.'], ['Cuida el campo, que de él comemos todos.'], ['¿Sabes que cada pueblo tiene su santo patrón?'], ['Por aquí pasan los peregrinos a veces.'],
];
const QUIZ_N = 3;

/** ¿Sale el pastor con su rebaño en este pueblo? (pueblos con granja, no ciudades). Se mira al terminar de montar el
 *  pueblo, para descargar su personaje solo donde hace falta. */
export const hasShepherd = (d) => !!(TOWN.farm || PLACES.farm) && d.family !== 'city';

export class TownGame {
  constructor(ctx, def) {
    Object.assign(this, ctx);        // scene, camera, player, follow, ui, sound, input, sky, fauna, particles, beacon, onExit
    this.def = def;
    // los minijuegos en 3D se dibujan con el renderer del juego, en una escena propia (el pueblo queda en pausa)
    const G = this;
    this.ui.stage3d = {
      get quality() { return G.rt?.quality; }, get renderer() { return G.rt?.renderer; },
      show: (scene, camera, update) => { this._alt3d = [this.altScene, this.altCamera, this.altUpdate]; this.altScene = scene; this.altCamera = camera; this.altUpdate = update; },
      hide: () => { const p = this._alt3d || [null, null, null]; this._alt3d = null; [this.altScene, this.altCamera, this.altUpdate] = p; },
    };
    this.kind = 'town';
    // la cara de quien habla sigue lo que dice: alegría, duda, susto o pena
    this.ui.onDialogLine = (L) => {
      const a = this.speaker; if (!a?.anim?.setExpr || !L?.text) return;
      const t = L.text;
      const e = /miedo|cuidado|oscur|de noche|susto|¡ay|socorro/i.test(t) ? 'surprised' : /triste|perdid|perdió|se han ido|nadie/i.test(t) ? 'sad' : /\?$|¿/.test(t) ? 'thinking' : /!/.test(t) ? 'happy' : null;
      if (e) a.anim.setExpr(e, 2.4);
    };
    this.comarca = COMARCAS.find(c => c.id === def.comarca);
    this.P = profile();
    this.ts = townState(this.P, def.id);
    this.ts.visits = (this.ts.visits || 0) + 1;
    this.mode = 'play';
    this.elapsed = 0;
    this.rnd = mulberry32(def.id.length * 131 + 7);
    this.actors = []; this.walkers = []; this.items = []; this.gates = []; this.folk = []; this.clues = [];
    // (según la edad de quien juega, sin las misiones que no tocan; cada una guarda su número en el pueblo)
    this.missions = missionSlots(def, edadDe(this.P)).map(({ m, si }, i) => this.makeMission(m, i, si));
    this.state = { name: this.P.name || 'Mendi', settings: this.P.settings };
    // luz propia de las criaturas de la noche: se crea al cargar (apagada) para que encenderla
    // después no obligue a recompilar los materiales en mitad de la persecución
    if (this.missions.some(M => M.type === 'legend' || (M.type === 'carnival' && M.night))) {
      this.creatureLight = new THREE.PointLight('#9fe0ff', 0, 24, 1.4); this.creatureLight.position.set(0, -50, 0); this.scene.add(this.creatureLight);
    }
  }
  // ---------- Definición de misiones y pasos ----------
  makeMission(m, i, si = i) {
    const d = this.def;
    const M = { i, si, m, type: m.type, step: 0, count: 0, done: !!this.ts.done[si] };
    const host = () => M.host?.name || 'tu guía';
    switch (m.type) {
      case 'visit': {
        M.title = `Conoce ${d.name}`; M.icon = 'church';
        M.places = [{ kind: 'church', name: d.church?.name || 'La iglesia', text: d.church?.text || '', style: d.church?.style, label: d.church?.label }, ...(d.landmarks || []).filter(l => !['walls'].includes(l.kind) || true)];
        M.need = M.places.length;
        M.steps = () => ['Habla con ' + host(), `Visita los lugares importantes (${M.count}/${M.need})`, 'Vuelve con ' + host()];
        break;
      }
      case 'process': M.title = m.title || m.product; M.icon = m.gather?.item === 'milk' ? 'cheese' : m.gather?.item === 'corn' ? 'corn' : m.gather?.item === 'litter' ? 'fish' : 'basket'; M.need = m.gather?.n || 4;
        M.steps = () => ['Habla con ' + host(), `${m.gather?.label || 'Recoge los ingredientes'} (${M.count}/${M.need})`, `Lleva todo a ${host()}`, `Ordena los pasos: ${m.product}`]; break;
      case 'harvest': { const c = CROP[m.crop] || ['frutos', 'star']; M.title = `La cosecha: ${c[0]}`; M.icon = m.crop; M.need = m.n || 8; M.item = c[1];
        M.steps = () => ['Habla con ' + host(), `Recoge ${c[0]} (${M.count}/${M.need})`, `Lleva la cosecha a ${host()}`]; break; }
      case 'herd': { const a = ANIMAL[m.animal] || ANIMAL.sheep; M.title = m.title || `Al redil: ${a[0]}`; M.icon = a[1]; M.need = m.n || 5;
        M.steps = () => ['Habla con ' + host(), `Lleva ${a[0]} al redil (${M.count}/${M.need}) — acércate por detrás para empujarlas`, 'Vuelve con ' + host()]; break; }
      case 'dance': M.title = m.name || 'La danza'; M.icon = 'dance'; M.steps = () => ['Habla con ' + host(), 'Ve al corro de baile de la plaza', `Baila: ${m.name}`]; break;
      case 'carnival': { const f = FOLKLORE.find(x => x.id === m.character); M.folk = f; M.title = m.title || f?.name || 'Carnaval'; M.icon = 'mask'; M.need = 3; M.night = NIGHT_CARNIVAL[m.character];
        M.steps = () => M.night ? ['Habla con ' + host(), 'Espera a que caiga la noche', `Encuentra a los ${f?.name?.toLowerCase() || 'personajes'}s (${M.count}/${M.need}) — escucha sus cencerros`, 'Vuelve con ' + host()]
          : ['Habla con ' + host(), `Encuentra a ${f?.name || 'los personajes'} (${M.count}/${M.need}) — escucha sus cencerros`, 'Vuelve con ' + host()]; break; }
      case 'trade': { const t = TRADE[m.kind] || TRADE.herrero, of = OFICIOS[m.kind]; M.trade = t; M.oficio = of; M.tstep = 0; M.title = m.title || of?.name || t.title; M.icon = of?.icon || t.icon;
        M.steps = () => ['Habla con ' + host(), of ? `Taller de ${of.name.toLowerCase()}: paso ${Math.min(M.tstep + 1, of.steps.length)} de ${of.steps.length}` : `Trabaja en el taller: ${t.title.toLowerCase()}`]; break; }
      case 'legend': { const L = M.leg = LEGENDS[m.who]; M.title = m.title || 'Leyenda'; M.icon = 'legend'; M.need = L?.clues.length || m.gather?.n || 4;
        M.steps = () => ['Escucha la leyenda: habla con ' + host(), 'Espera a que caiga la noche', `Sigue las pistas que brillan en la oscuridad (${M.count}/${M.need})`, `Encuentra a ${L?.creature || 'la criatura'}`]; break; }
      case 'race': { const r = RACE[m.kind] || RACE.camino; M.title = m.title || r[0]; M.icon = r[1]; M.need = 6;
        M.steps = () => ['Habla con ' + host(), `${r[2]}: pasa por los aros (${M.count}/${M.need})`, 'Vuelve con ' + host()]; break; }
      case 'observe': M.title = m.title || 'Observa'; M.icon = 'binoculars'; M.need = m.n || 3; M.species = [].concat(m.species || []);
        M.steps = () => ['Habla con ' + host(), `Con los prismáticos, encuentra ${M.species.map(faunaName).join(' o ').toLowerCase() || 'animales'} (${M.count}/${M.need})`, 'Vuelve con ' + host()]; break;
      case 'tradition': M.title = m.title || 'Tradición'; M.icon = m.kind === 'angel' ? 'angel' : 'music';
        M.steps = () => ['Habla con ' + host(), m.kind === 'angel' ? 'Prepara la bajada: repite la secuencia' : 'Repite la melodía']; break;
      case 'summit': { const pk = M.peak = MOUNTAINS.find(x => x.id === m.peak); M.title = `Sube al ${pk?.name || 'monte'}`; M.icon = 'peak'; M.need = 4;
        M.steps = () => [M.prep ? `Prepara la mochila: ${this.supplyText()} y vuelve con ${host()}` : 'Habla con ' + host(), `Sigue los mojones hasta la cima (${M.count}/${M.need})${M.wild ? ` · animales ${M.wild.filter(w => w.found).length}/${M.wild.length}` : ''}`, `Llega a la cima del ${pk?.name || 'monte'}`]; break; }
      case 'mirador': { const ll = townLatLon(d); M.montes = ll ? montesFrom(ll.lat, ll.lon, 4) : []; M.title = m.title || 'Los montes desde el mirador'; M.icon = 'binoculars'; M.need = Math.min(3, M.montes.length) || 1;
        M.steps = () => ['Habla con ' + host(), `Ve al mirador y busca los montes con los prismáticos (${M.count}/${M.need})`, 'Vuelve con ' + host()]; break; }
      case 'dolmen': { const st = M.site = SITES[m.site || 'dolmen']; M.title = m.title || 'El secreto del dolmen'; M.icon = st.icon; M.need = st.finds.length;
        M.steps = () => ['Habla con ' + host(), `Excava ${st.where} con cuidado (${M.count}/${M.need})`, 'Vuelve con ' + host()]; break; }
      case 'castle': { const C = M.castle = CASTLE_TOWNS[m.castle]; M.title = m.title || C.title; M.icon = 'castle'; M.need = C.parts.length;
        M.steps = () => ['Habla con ' + host(), `Recorre las partes del castillo: busca las banderas (${M.count}/${M.need})`, 'Vuelve con ' + host()]; break; }
      case 'feria': M.title = m.title || 'Feria de ganado'; M.icon = 'cow';
        M.steps = () => ['Habla con ' + host(), 'Ve a los corrales: juez por un día', 'Vuelve con ' + host() + ' y cierra el trato']; break;
      case 'figure': { const F = M.fig = PERSONAJES[m.who]; M.title = F.name; M.icon = F.icon;
        M.steps = () => ['Habla con ' + host(), `Ve a ver el recuerdo de ${F.name}`, 'Responde la pregunta']; break; }
      case 'pelota': M.title = m.title || 'Partido en el frontón'; M.icon = 'pelota';
        M.steps = () => ['Habla con ' + host(), 'Gana el partido de pelota a 5 tantos']; break;
      case 'quiz': M.title = `El sabio de ${d.name}`; M.icon = 'quiz'; M.need = QUIZ_N; M.steps = () => ['Habla con ' + host(), `Responde bien las preguntas (${M.count}/${M.need})`]; break;
      default: M.title = m.title || 'Misión'; M.icon = 'star'; M.steps = () => ['Habla con ' + host()];
    }
    return M;
  }
  stepText(M) { if (M.done) return '¡Completada!'; const s = M.steps(); return s[Math.min(M.step, s.length - 1)]; }

  // ---------- Aparición de personajes ----------
  // sitio libre en la plaza para bailar (la fuente o el kiosco ocupan el centro): el centro y el corro de
  // dantzaris (radio r) tienen que estar despejados
  plazaStage(r = 3.6) {
    if (this._stage) return this._stage;
    const c = PLACES.plaza, ok = (x, z) => isFree(x, z, 0.8) && [...Array(8)].every((_, i) => { const a = i / 8 * Math.PI * 2; return isFree(x + Math.sin(a) * r, z + Math.cos(a) * r, 0.6); });
    for (const d of [0, 6.5, 7.5, 8.5, 10, 12]) for (let k = 0; k < (d ? 12 : 1); k++) {
      const a = k / 12 * Math.PI * 2 + 0.4, x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;
      if (ok(x, z)) return (this._stage = { x, z });
    }
    return (this._stage = this.spot(c, 6));
  }
  // sitio libre y llano cerca de un punto. Cada sitio dado queda apartado: los personajes no son obstáculos fijos y,
  // sin esto, la tienda caía encima del personaje de la misión que espera junto al mercado (Lesaka, Viana). Tampoco
  // sirven las canchas del frontón ni de la pista
  // (gap: hueco que deja con los demás sitios dados; la tienda, que es ancha, pide más; ok: otra condición del sitio)
  spot(p, r = 4, avoidWater = true, gap = 1.6, ok = null) {
    const taken = this._taken ||= [];
    const done = (x, z) => { taken.push(x, z, gap); return { x, z }; };
    for (let k = 0; k < 60; k++) {
      const a = k * 2.4, d = k === 0 ? 0 : r * 0.3 + k * 0.6;
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (!isFree(x, z, 0.9) || onPlatform(x, z, 0.5)) continue;
      let near = false; for (let i = 0; i < taken.length && !near; i += 3) { const g = Math.max(gap, taken[i + 2]); near = Math.abs(taken[i] - x) < g && Math.abs(taken[i + 1] - z) < g; }
      if (near || (ok && !ok(x, z))) continue;
      if (avoidWater && waterLevelAt(x, z) > groundHeight(x, z) - 0.05) continue;
      const g0 = groundHeight(x, z), g1 = groundHeight(x + 1, z), g2 = groundHeight(x, z + 1);
      if (Math.abs(g1 - g0) > 0.6 || Math.abs(g2 - g0) > 0.6) continue;
      return done(x, z);
    }
    return done(p.x, p.z);
  }
  placeFor(M) {
    const P = PLACES, m = M.m, lm = (k) => TOWN.landmarks.find(l => l.kind === k);
    const near = (key) => key === 'farm' ? (TOWN.farm?.door || P.farm) : key === 'cave' ? (lm('cave')?.spot || P.forest) : P[key] || P.market;
    switch (M.type) {
      case 'visit': return { x: P.spawn.x + 3, z: P.spawn.z - 12 };
      case 'process': return m.gather?.near ? near(m.gather.near) : P.market;
      case 'harvest': return P.fields;
      case 'herd': return TOWN.pen ? { x: TOWN.pen.x, z: TOWN.pen.z + TOWN.pen.d / 2 + 4 } : P.farm;
      case 'dance': case 'carnival': case 'tradition': return { x: P.plaza.x + (M.i % 2 ? 7 : -7), z: P.plaza.z + 6 };
      case 'trade': return m.kind === 'aizkolari' || m.kind === 'carbonero' ? { x: P.forest.x * 0.5 + P.plaza.x * 0.5, z: P.forest.z * 0.4 } : m.kind === 'palomero' ? P.edgeN : { x: P.market.x + 6, z: P.market.z + 4 };
      case 'legend': return M.leg?.teller ? { x: P.plaza.x + (M.i % 2 ? -9 : 9), z: P.plaza.z - 6 } : lm('cave')?.spot ? { x: (lm('cave').spot.x + P.plaza.x) / 2, z: (lm('cave').spot.z + P.plaza.z) / 2 } : { x: P.plaza.x - 9, z: P.plaza.z - 6 };
      case 'race': return m.kind === 'encierro' && P.encierro ? { x: P.encierro[0].x + 5, z: P.encierro[0].z + 4 } : { x: P.spawn.x - 4, z: P.spawn.z - 20 };
      case 'observe': return lm('gorge')?.spot || P.edgeN;
      case 'pelota': return this.ensureFronton() ? { x: this.fronton.entry.x + 2, z: this.fronton.entry.z } : P.plaza;
      case 'summit': return { x: P.plaza.x + (P.edgeN ? (P.edgeN.x - P.plaza.x) * 0.25 : 10), z: P.plaza.z + (P.edgeN ? (P.edgeN.z - P.plaza.z) * 0.25 : -14) };
      case 'dolmen': { const d = TOWN.landmarks.find(l => l.kind === SITES[m.site || 'dolmen'].landmark); return d?.spot ? { x: d.spot.x + 6, z: d.spot.z + 6 } : P.edgeN; }
      case 'castle': { const d = TOWN.landmarks.find(l => l.kind === 'castle'); return d?.spot ? { x: d.spot.x + 7, z: d.spot.z + 4 } : P.plaza; }
      case 'mirador': { const v = this.miradorSpot(); return v ? { x: v.x + 5, z: v.z + 3 } : P.plaza; }
      case 'feria': return { x: (P.market || P.plaza).x - 8, z: (P.market || P.plaza).z + 10 };
      case 'figure': { const k = this.missions.filter(x => x.type === 'figure').indexOf(M), a = 2.2 + k * 1.6; return { x: P.plaza.x + Math.cos(a) * 15, z: P.plaza.z + Math.sin(a) * 15 }; }
      case 'quiz': return TOWN.church?.door ? { x: TOWN.church.door.x, z: TOWN.church.door.z + 0 } : P.plaza;
    }
    return P.plaza;
  }
  // Frontón del pueblo: está siempre, con o sin misión de pelota
  ensureFronton() {
    // (en Iruña, el Labrit: el edificio entero junto a la plaza de toros; si no cupiera, el frontón de siempre)
    if (!this.fronton && this.def.id === 'pamplona') try { this.fronton = labritInTown(this.scene, PLACES.frontonNear || PLACES.plaza); } catch (e) { console.warn('labrit', e); }
    if (!this.fronton) { const sp = findFrontonSpot(PLACES.frontonNear || PLACES.plaza); if (sp) this.fronton = new Fronton(this.scene, sp, this.def.name.split(' /')[0], frontonWall(this.def)); }
    return this.fronton;
  }
  // pista polideportiva del pueblo (donde espera el entrenador; el partido se juega en el campo del pueblo), si hay sitio llano cerca de la plaza (en Pamplona se juega en El
  // Sadar). Se levanta justo después del frontón y antes que la flora, los puestos y los demás objetos, para que nada
  // quede encima de ella (antes se ponía al final y podía caer sobre plantas que no cuentan como obstáculo)
  ensurePista() {
    if (this._pistaDone) return this.pista;
    this._pistaDone = true;
    if (TOWN.landmarks.find(l => l.kind === 'stadium') || /nopista/.test(location.search)) return null;
    try { const sp = findPistaSpot(PLACES.plaza); if (sp) this.pista = new Pista(this.scene, sp); } catch (e) { console.warn('pista', e); }
    return this.pista;
  }
  spawn() {
    const d = this.def;
    this.ensureFronton();
    this.ensurePista();
    for (const M of this.missions) {
      const pos = this.spot(this.placeFor(M), 5);
      const h = (M.leg?.teller) || M.m.host || (M.type === 'visit' ? ((g) => ({ name: 'Guía ' + guideName(g, this.P.name), look: { shirt: '#f2c230', vest: '#3a8fd6', pants: '#2b3a6b', hair: '#3b2418', ponytail: g, female: g, strap: '#6b4a2e', bag: '#8a6a3a', face: 'happy' } }))(this.rnd() < 0.5)
        : M.type === 'quiz' ? { name: 'Sabio del concejo', look: { shirt: '#efe9dc', vest: '#2b2630', pants: '#2b2630', hair: '#dcd7cf', beard: '#dcd7cf', txapela: '#1d1d24', old: true, glasses: '#3a2a1a', staff: true } } : { name: 'Vecino', look: {} });
      const a = new Actor({ id: 'm' + M.i, name: h.name, x: pos.x, z: pos.z, heading: Math.atan2(PLACES.plaza.x - pos.x, PLACES.plaza.z - pos.z), look: h.look }, this.scene);
      a.mission = M; M.host = a; this.actors.push(a);
      if (M.type === 'feria') this.buildFair(M, pos);
      if (M.type === 'figure') {
        const o = makeMemorial(M.fig.attr, M.fig.stele), p2 = this.spot({ x: pos.x + (PLACES.plaza.x - pos.x) * 0.3, z: pos.z + (PLACES.plaza.z - pos.z) * 0.3 }, 3);
        o.position.set(p2.x, groundHeight(p2.x, p2.z), p2.z); o.rotation.y = Math.atan2(PLACES.plaza.x - p2.x, PLACES.plaza.z - p2.z); this.scene.add(o);
        o.userData.ring.visible = false; M.memo = { x: p2.x, z: p2.z, obj: o }; addCircle(p2.x, p2.z, 0.8);
      }
      if (M.type === 'trade') {
        const wb = makeWorkbench(M.m.kind); const p2 = this.spot({ x: pos.x + 2.5, z: pos.z + 1.5 }, 3);
        wb.position.set(p2.x, groundHeight(p2.x, p2.z), p2.z); wb.rotation.y = Math.atan2(pos.x - p2.x, pos.z - p2.z); this.scene.add(wb); M.bench = { x: p2.x, z: p2.z, obj: wb };
      }
    }
    // la tienda del pueblo (productos locales, producto estrella y trueque)
    try { this.tienda = new Tienda(this); } catch (e) { console.warn('tienda', e); }
    // (antes que los vecinos: la compra se hace en ella)
    // los vecinos: cada uno con su tarea del día (ir a misa, la compra, la charla en la plaza, jugar a pillar, la fuente,
    // el pan, el paseo), con sus paradas y lo que hace en cada una; nadie pasea porque sí (rutinas.js)
    const pal = PALETTE[d.family] || PALETTE.central;
    const nW = d.family === 'city' ? 10 : 7;
    const hs = TOWN.houses.filter((_, i) => i % 5 === 0).map(h => h.door).filter(Boolean).filter(h => Math.hypot(h.x - PLACES.plaza.x, h.z - PLACES.plaza.z) < 110);
    const shop = this.tienda?.pos || PLACES.market || null, view = TOWN.landmarks?.find?.(l => l.kind === 'mirador' || l.kind === 'ermita') || null;
    const tareas = repartirTareas(this, nW, { plaza: PLACES.plaza, church: TOWN.church?.door || PLACES.church || null, shop, fountain: TOWN.fountain, houses: hs, view });
    for (let i = 0; i < nW; i++) {
      const R = this.rnd, pick = (a) => a[Math.floor(R() * a.length)], T = tareas[i], tk = TAREAS[T.kind];
      const female = R() < 0.5, old = tk.old || (!tk.kid && R() < 0.2), kid = !!tk.kid;
      const look = { skin: pick(SKINS), hair: old ? '#dcd7cf' : pick(HAIRS), shirt: pick(pal.shirts), pants: pick(pal.pants), old,
        height: kid ? 1.3 : undefined, bun: female && !kid && R() < 0.5, braids: female && kid, longHair: female && R() < 0.4, female,
        skirt: female && R() < 0.5 ? pick(pal.pants) : undefined, vest: !female && R() < 0.35 ? pick(pal.extras) : undefined, txapela: !female && old && R() < 0.7 ? '#1d1d24' : undefined,
        scarf: R() < 0.2 ? pick(pal.extras) : undefined, apron: female && old && R() < 0.4 ? '#f4f1ea' : undefined, basket: !!tk.basket, staff: T.kind === 'paseo', pattern: R() < 0.2 ? 'check' : undefined, moustache: !female && old && R() < 0.5 ? '#dcd7cf' : undefined,
        region: R() < 0.7 ? d.comarca : undefined, seed: 1 + Math.floor(R() * 1000) };   // la mayoría, con el traje tradicional de su comarca
      const route = T.steps, s0 = route[route.length - 1];   // (empieza en su última parada: en casa, en la plaza…)
      const a = new Actor({ id: 'w' + i, name: female ? ['Maite', 'Amaia', 'Nekane', 'Itziar', 'Leire', 'Ainhoa', 'Garazi', 'Miren'][i % 8] : ['Josu', 'Patxi', 'Koldo', 'Mikel', 'Fermín', 'Iñaki', 'Xabier', 'Unai'][i % 8], x: s0.x, z: s0.z, look, route, walkSpeed: kid ? 1.25 : old ? 0.8 + R() * 0.15 : 1 + R() * 0.3 }, this.scene);
      a.tarea = T.kind;
      this.walkers.push(a);
    }
    // algunos días hay mercado en la plaza
    try { if (marketDay(d, this.rnd)) { this.mercado = new Mercado(this); this.marketToast = true; } } catch (e) { console.warn('mercado', e); }
    // mochila del explorador: equipo visible, agua, comida y energía; frutos del campo para recoger
    this.mochila = new Mochila(this);
    this.gearProps = new GearProps(this.player.rig); this.gearProps.set(this.P.gear);
    if (this.mochila.has('prismaticos')) { this.binoOn = true; this.ui.showBinoButton(); }
    this.spawnForage();
    this.perro = new Perro(this);
    // el campo trabajando: tractores, cosechadoras y pacas en las parcelas
    this.agro = buildAgro(this.scene, d, this.rnd);
    // escudos de las fachadas: cada casa blasonada con sus armas talladas, para leerlas desde la calle
    try { this.buildShields(); } catch (e) { console.warn('escudos', e); }
    try { this.buildTownArms(); } catch (e) { console.warn('escudo del pueblo', e); }
    // plantas reales de la comarca para identificar (herbario)
    if (!/noflora/.test(location.search)) try { this.flora = new FloraSpots(this); } catch (e) { console.warn('flora', e); }
    this.spawnSabios();
    this.spawnKontalari();
    this.spawnShepherds();
    // jornales: ayudar en los oficios del pueblo para ganar txanponak (esquilar, ordeñar, fragua, vendimia…); después
    // del pastor y la ganadera, que son los que dan los trabajos del ganado
    try { this.jornales = new Jornales(this); } catch (e) { console.warn('jornales', e); }
    // pelotari del pueblo: espera junto al frontón para jugar cuando se quiera
    if (this.fronton && !this.missions.some(M => M.type === 'pelota')) {
      const e = this.fronton.entry, c = this.fronton.toWorld(0, 12), s = this.spot({ x: e.x - 2.5, z: e.z + 1 }, 3);
      const R = this.rnd, name = ['Unai', 'Mikel', 'Aitor', 'Iñaki', 'Oihana', 'Garazi'][Math.floor(R() * 6)];
      const blue = R() < 0.5;
      this.pelotari = new Actor({ id: 'pelotari', name, x: s.x, z: s.z, heading: Math.atan2(c.x - s.x, c.z - s.z),
        look: { shirt: '#f6f3ec', pants: '#f6f3ec', sash: blue ? '#2f5fb3' : '#c8222a', espadrille: true, laces: blue ? '#2f5fb3' : '#c8222a',
          skin: SKINS[Math.floor(R() * SKINS.length)], hair: HAIRS[Math.floor(R() * HAIRS.length)], female: name === 'Oihana' || name === 'Garazi', ponytail: name === 'Garazi' } }, this.scene);
      this.actors.push(this.pelotari);
    }
    // El Sadar: la entrenadora de la cantera de Osasuna espera junto al túnel para jugar un partido
    const sadar = TOWN.landmarks.find(l => l.kind === 'stadium');
    // pista polideportiva del pueblo (donde espera el entrenador; el partido se juega en el campo del pueblo), si hay sitio llano cerca de la plaza; el entrenador del club espera
    // en la entrada (en Pamplona se juega en El Sadar)
    if (!sadar && !/nopista/.test(location.search)) try {
      // (sin sitio para la pista, el entrenador del club espera en la plaza: liga y amistosos igual)
      this.ensurePista();
      if (this.pista || clubOfTown(this.def.id)) {
        const e = this.pista ? this.pista.entry : this.spot({ x: PLACES.plaza.x + 9, z: PLACES.plaza.z + 6 }, 4), c = this.pista ? this.pista.center : PLACES.plaza, R = this.rnd, female = R() < 0.5;
        const name = female ? ['Ane', 'Maite', 'Nerea', 'Leire', 'Amaia'][Math.floor(R() * 5)] : ['Jon', 'Xabier', 'Ander', 'Iker', 'Koldo'][Math.floor(R() * 5)];
        const s2 = this.spot({ x: e.x, z: e.z }, 2.5);
        const club = clubOfTown(this.def.id);
        this.futsalCoach = new Actor({ id: 'futsal', name: `${name}, ${female ? 'entrenadora' : 'entrenador'} ${club ? 'del ' + club.name : 'del club'}`, x: s2.x, z: s2.z, heading: Math.atan2(c.x - s2.x, c.z - s2.z),
          look: { shirt: '#2f6fd0', pants: '#1d2a4a', shoes: '#f4f4f2', hair: HAIRS[Math.floor(R() * HAIRS.length)], skin: SKINS[Math.floor(R() * SKINS.length)], female, ponytail: female } }, this.scene);
        this.actors.push(this.futsalCoach);
      }
    } catch (e) { console.warn('pista', e); }
    if (sadar) {
      const x = sadar.x - 20, z = sadar.z + 6;
      this.coach = new Actor({ id: 'coach', name: 'Leire, entrenadora de fútbol', x, z, heading: Math.PI / 2,
        look: { shirt: '#c41f2c', pants: '#1f2d5a', shoes: '#1d1d1f', hair: '#3a2418', female: true, ponytail: true, skin: '#e2b08a' } }, this.scene);
      this.actors.push(this.coach); this.sadar = sadar;
    }
    // aparición del jugador
    const sp = this.spot(PLACES.spawn, 4);
    this.player.place(sp.x, sp.z, Math.atan2(PLACES.plaza.x - sp.x, PLACES.plaza.z - sp.z));
    this.follow.snap(this.player);
    this.autoTrack();
    window.__TOWN_PEN = TOWN.pen;
  }
  // Moras en las zarzas del borde del bosque, avellanas y manzanas: comida para la mochila
  spawnForage() {
    const P = PLACES, R = this.rnd, farm = TOWN.farm || P.farm;
    const flat = (x, z) => { const g = terrainHeight(x, z); return [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]].every(([dx, dz]) => Math.abs(terrainHeight(x + dx, z + dz) - g) < 0.4); };   // (nada en una ladera a la que no se puede subir)
    const put = (kind, c, n, r0, r1, label) => { if (!c) return; for (let i = 0; i < n; i++) { let s; for (let k = 0; k < 8; k++) { const a = R() * Math.PI * 2, r = r0 + R() * (r1 - r0); s = this.spot({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r }, 4, true); if (flat(s.x, s.z)) break; }
      const o = makeItem(kind); o.position.set(s.x, terrainHeight(s.x, s.z), s.z); this.scene.add(o); this.items.push({ M: null, food: kind === 'berries' ? 'moras' : kind === 'hazelnut' ? 'avellanas' : 'manzana', x: s.x, z: s.z, obj: o, label, kind }); } };
    put('berries', P.forest, 4, 70, 120, 'Coger moras');
    put('hazelnut', P.forest, 3, 80, 130, 'Coger avellanas');
    put('manzana', farm, 3, 14, 30, 'Coger una manzana');
  }
  // Pastor que pasea con su rebaño y su perro; ganadera junto a las vacas. Al hablar, explican su oficio.
  // Un sabio o una sabia junto a la iglesia y a cada lugar histórico: al hablar explica su historia
  spawnSabios() {
    const d = this.def, places = [{ kind: 'church', name: d.church?.name || 'La iglesia', text: d.church?.text || '', style: d.church?.style, label: d.church?.label, at: TOWN.church?.door || PLACES.church }];
    TOWN.landmarks.forEach((l, k) => { if (!NO_SABIO.has(l.kind) && l.text) places.push({ kind: l.kind, name: l.name, text: l.text, at: l.spot || { x: l.x, z: l.z }, li: k + 1 }); });
    places.forEach((p, i) => {
      const S = SABIOS[(i + d.id.length) % SABIOS.length], f = !!S.female;
      const sp = this.spot({ x: p.at.x + 3.2, z: p.at.z + 1.5 }, 4);
      const look = { old: true, female: f, hair: f ? '#e4e0d8' : '#d6d0c6', shirt: f ? '#6d4a6a' : '#efe9dc', vest: f ? undefined : '#2b2630', skirt: f ? '#2b2630' : undefined, pants: '#2b2630', scarf: f ? '#3a2a3a' : '#2b2630', bun: f, txapela: f ? undefined : '#1d1d24', beard: f ? undefined : '#e8e4dc', staff: !f };
      const a = new Actor({ id: 'sabio' + i, name: S.name, x: sp.x, z: sp.z, heading: Math.atan2(p.at.x - sp.x, p.at.z - sp.z), look, wander: 0 }, this.scene);
      a.sabio = p; this.actors.push(a);
    });
  }
  // Un contador o una contadora de cuentos en la plaza: cuenta la leyenda (o la historia) del lugar por partes
  spawnKontalari() {
    const list = cuentoOfTown(this.def.id); if (!list.length) return;
    list.forEach((C, i) => {
      const T = C.teller, f = !!T.female, P = PLACES.plaza, ang = 2.6 + i * 1.3;
      const sp = this.spot({ x: P.x + Math.cos(ang) * ((P.r || 10) + 3), z: P.z + Math.sin(ang) * ((P.r || 10) + 3) }, 5);
      const look = { old: true, female: f, hair: f ? '#cfc8bd' : '#bdb6aa', shirt: f ? '#2f4a6b' : '#7a3a2a', vest: f ? undefined : '#2b2630', skirt: f ? '#3a2a3a' : undefined, pants: '#2b2630', scarf: f ? '#c8a23a' : '#c8a23a', bun: f, txapela: f ? undefined : '#1d1d24', moustache: f ? undefined : '#d8d2c8', staff: true, bag: '#7a5a3a' };
      const a = new Actor({ id: 'kontalari' + i, name: T.name, x: sp.x, z: sp.z, heading: Math.atan2(P.x - sp.x, P.z - sp.z), look, wander: 0 }, this.scene);
      a.cuento = C; this.actors.push(a);
    });
  }
  async kontalariTalk(a) {
    const C = a.cuento, town = this.def.name.split(' /')[0], f = !!C.teller.female, n = C.parts.length;
    a.say(5); this.player.frozen = true; this.speaker = a;
    this.player.heading = Math.atan2(a.pos.x - this.player.pos.x, a.pos.z - this.player.pos.z);
    let isNew = false;
    try {
      const heard = this.P.cards.includes('cuento:' + C.id);
      await this.say(a, [heard ? `¡Otra vez por aquí, ${this.state.name}! ¿Quieres volver a oír «${C.title}»? Siéntate, que empiezo.`
        : `Kaixo, ${this.state.name}. Soy ${a.name.replace(/^Kontalari /, '')}, ${f ? 'la contadora' : 'el contador'} de cuentos de ${town}. ¿Te cuento ${C.kind === 'historia' ? 'una historia que pasó de verdad' : 'una leyenda'}? Se llama «${C.title}».`]);
      for (let i = 0; i < n; i++) await infoCard(this.ui, { icon: C.icon, kicker: `${KIND_LABEL[C.kind]} · ${i + 1} de ${n}`, title: C.title, text: C.parts[i], button: i < n - 1 ? 'Sigue…' : 'Fin' });
      await infoCard(this.ui, { icon: 'visit', kicker: C.place, title: 'Lo que puedes ver hoy', text: C.today, button: 'Seguir' });
      await choiceGame(this.ui, { title: C.title, icon: 'quiz', q: C.q.q, options: C.q.options, answer: C.q.answer, why: C.q.why });
      isNew = addCard('cuento:' + C.id, C.kind === 'historia' ? 'historia' : 'tradiciones');
      addXP(isNew ? 25 : 3); saveProfile();
    } finally { this.player.frozen = false; a.talking = 0; this.speaker = null; }
    for (const bd of checkBadges()) await infoCard(this.ui, { icon: bd.icon, kicker: 'Nueva insignia', title: bd.name, text: bd.text, button: '¡Bien!' });
    if (isNew) this.ui.toast('Cuento guardado en tu libro de leyendas (menú · Leyendas)', 'book', 3000);
  }
  async sabioTalk(a) {
    const p = a.sabio, d = this.def, f = /^Sabia/.test(a.name);
    a.say(5); this.player.frozen = true; this.speaker = a;
    this.player.heading = Math.atan2(a.pos.x - this.player.pos.x, a.pos.z - this.player.pos.z);
    try {
      const tip = p.kind === 'church' ? (LABEL_TIP[p.label] || STYLE_TIP[p.style]) : KIND_TIP[p.kind];
      await this.say(a, [`Kaixo, ${this.state.name}. Soy ${a.name.replace(/^Sabi[oa] /, '')}, ${f ? 'la sabia' : 'el sabio'} del pueblo: conozco la historia de cada piedra de ${d.name.split(' /')[0]}.`, `${p.name}. ${p.text}`, tip].filter(Boolean));
      // cuenta como lugar visitado en la misión «Conoce el pueblo»
      const M = this.missions.find(x => x.type === 'visit' && !x.done);
      if (M) { if (M.step === 0) this.startVisit(M); const q = M.places.find(x => x.name === p.name); if (q && !q.seen) { q.seen = true; await this.showPlace(M, q); } }
    } finally { this.player.frozen = false; a.talking = 0; this.speaker = null; }
  }
  spawnShepherds() {
    const d = this.def, P = PLACES, R = this.rnd, farm = TOWN.farm || P.farm; if (!hasShepherd(d)) return;
    const route = [0, 1, 2, 3].map(i => { const a = i / 4 * Math.PI * 2 + 0.6, s = this.spot({ x: farm.x + Math.cos(a) * 42, z: farm.z + Math.sin(a) * 42 }, 6); return { x: s.x, z: s.z }; });
    const s0 = route[0];
    // el pastor del pueblo, con su rebaño y su perro: es el personaje del pastor (modelo de Meshy con txapela)
    const pastor = new Actor({ id: 'pastor', name: 'Pastor', x: s0.x, z: s0.z, route, walkSpeed: 0.75,
      look: { meshy: this.P.avatar === 'pastor' ? null : 'pastor', shirt: '#efe9dc', vest: '#3a2a22', pants: '#3a3530', txapela: '#1d1d24', hair: '#8a8478', moustache: '#8a8478', staff: true, old: R() < 0.5, bag: '#7a5a3a' } }, this.scene);
    pastor.info = PASTOR_INFO(d.family); this.walkers.push(pastor);
    // el rebaño va detrás en fila: cada oveja sigue a otra (las primeras, al pastor)
    const flock = [];
    for (let i = 0; i < 9; i++) {
      const a = this.fauna.add('sheep', s0.x - 2 - i * 1.3 + (R() - 0.5), s0.z + (R() - 0.5) * 2, { range: 3, walk: 0.6, run: 2.6, flee: 0, radius: 0.45 });
      a.follow = i < 2 ? pastor : flock[Math.floor(R() * flock.length)]; flock.push(a);
    }
    const dog = this.fauna.add('dog', s0.x + 2, s0.z + 2, { range: 4, walk: 1.2, run: 6, radius: 0.3 }); dog.follow = pastor;
    // ganadera con sus vacas en el prado (valles húmedos y zona media)
    if (d.family !== 'ribera') {
      const c = this.spot({ x: farm.x + (farm.x > 0 ? -1 : 1) * 30, z: farm.z - 40 }, 6);
      const v = new Actor({ id: 'vaquera', name: 'Ganadera', x: c.x, z: c.z, look: { shirt: '#6b8fb3', vest: '#2d3a2b', pants: '#3a3530', hair: '#6b3b1f', ponytail: true, female: true, staff: true } }, this.scene);
      v.info = VAQUERA_INFO; this.walkers.push(v);
      for (let i = 0; i < 4; i++) this.fauna.add('cow', c.x + 6 + (R() - 0.5) * 14, c.z + 4 + (R() - 0.5) * 14, { range: 10, walk: 0.5, radius: 0.8, flee: 0 });
    }
  }
  giveGoods(k, n = 1) {
    const b = this.P.bag ||= { agua: 0, food: {} }; b.goods ||= {}; b.goods[k] = (b.goods[k] || 0) + n; saveProfile();
    this.ui.toast(`A la mochila: ${GOODS[k].name.toLowerCase()} ×${n} (para el trueque en la tienda)`, GOODS[k].icon, 2600);
  }
  async explainWork(a, fromJob = false) {
    const I = a.info; a.say(3); a.wave = 1.2;
    this.player.frozen = true;
    try {
      await this.say(a, I.lines);
      await infoCard(this.ui, { icon: I.icon, kicker: 'Oficios del campo', title: I.title, text: 'Así ha cambiado este trabajo:', extra: `<div class="antes-ahora"><div><b>Antes</b>${I.then}</div><div><b>Ahora</b>${I.now}</div></div>`, badge: addCard('campo:' + I.title) ? 'Nueva carta' : '', button: '¡Lo he entendido!' });
    } finally { this.player.frozen = false; a.talking = 0; }
  }
  async showAgro(o) {
    const I = o.info; this.player.frozen = true;
    try { await infoCard(this.ui, { icon: I.icon, kicker: 'El campo de ' + this.def.name.split(' /')[0], title: I.title, text: I.text, extra: `<div class="antes-ahora"><div><b>Antes</b>${I.then}</div><div><b>Ahora</b>${I.now}</div></div>`, badge: addCard('campo:' + I.title) ? 'Nueva carta' : '', button: 'Seguir explorando' }); }
    finally { this.player.frozen = false; }
  }
  autoTrack() {
    const open = this.missions.filter(M => !M.done);
    const cur = this.missions[this.tracked];
    if (cur && !cur.done && (cur.step > 0 || open.includes(cur))) return;
    const active = open.find(M => M.step > 0);
    this.tracked = (active || open[0] || this.missions[0])?.i ?? 0;
  }
  get tracked() { return this._tr ?? 0; }
  set tracked(v) { this._tr = v; }

  // Vigilante: si el jugador se queda congelado (o en modo minijuego) sin ninguna ventana, diálogo ni escena abiertos,
  // se le devuelve el control. Evita que un fallo en una ventana deje el juego bloqueado.
  watchdog(dt) {
    const P = this.player, open = this.ui.busy || this.sportBusy || document.querySelector('.mg-overlay, .dogpick, .bagpanel, .ctxlost, .lg-root');
    const stuck = !open && !this.follow.cinematic && ((this.mode === 'mini') || (this.mode === 'play' && P.frozen));
    this.stuckT = stuck ? (this.stuckT || 0) + dt : 0;
    if (this.stuckT > 15) { this.stuckT = 0; P.frozen = false; if (this.mode === 'mini') this.mode = 'play'; console.warn('[vigilante] control devuelto al jugador'); (window.__errors ||= []).push('vigilante'); }
    // un menú o partido de pelota o fútbol que se quedó a medias sin nada en pantalla: el pueblo vuelve a responder
    const idle = this.sportBusy && !this.sportMode && this.mode === 'play' && !this.ui.busy && !this.pelotaMatch && !this.pelotaLoading && !this.altScene && !document.querySelector('.lg-root, .pel-root, .mg-overlay, .fb-root, .champ, #fade.on');
    this.sportIdleT = idle ? (this.sportIdleT || 0) + dt : 0;
    if (this.sportIdleT > 45) { this.sportIdleT = 0; this.sportBusy = false; P.frozen = false; this.ui.hudVisible?.(true); console.warn('[vigilante] menú de deporte sin menú: el pueblo vuelve a responder'); (window.__errors ||= []).push('vigilante-deporte'); }
  }
  // ---------- Bucle ----------
  update(dt) {
    this.elapsed += dt;
    const P = this.player;
    this.watchdog(dt);
    // el partido de pelota, lo primero y aparte: si algo del pueblo falla, el partido sigue (antes se quedaba quieto,
    // con el marcador puesto y la cámara en la calle)
    if (this.mode === 'pelota') {
      if (this.pelotaTick) { this.pelotaStuck = 0; try { this.pelotaTick(dt); } catch (e) { console.warn('partido', e); } }
      else if ((this.pelotaStuck = (this.pelotaStuck || 0) + dt) > 3) { this.pelotaStuck = 0; this.mode = 'play'; P.frozen = false; this.ui.hudVisible?.(true); document.querySelectorAll('.pel-root').forEach(el => el.remove()); console.warn('[vigilante] partido sin partido: de vuelta al pueblo'); }
    } else if ((this.pelHudT = (this.pelHudT || 0) + dt) > 1) { this.pelHudT = 0; if (!this.pelotaMatch) document.querySelectorAll('.pel-root').forEach(el => el.remove()); }
    // al pasar por la plaza se avisa del escudo del pueblo
    if (this.townArms && !this.armsHint && !this.P.cards.includes(this.townArms.id) && Math.hypot(this.townArms.read.x - P.pos.x, this.townArms.read.z - P.pos.z) < 12) {
      this.armsHint = true; this.ui.whisper(`En la plaza está el escudo de ${this.def.name.split(' /')[0]}. Acércate y aprende a leerlo: cada figura cuenta algo del pueblo.`, 5600);
    }
    // al acercarse por primera vez a una casa con escudo, se avisa de que se puede leer
    if (this.blasones?.length && !this.shieldHint && (this.shieldT = (this.shieldT || 0) - dt) <= 0) {
      this.shieldT = 1;
      const b = this.blasones.find(x => !this.P.cards.includes(x.id) && Math.hypot(x.read.x - P.pos.x, x.read.z - P.pos.z) < 14);
      if (b) { this.shieldHint = true; this.ui.whisper(`Esa casa tiene un escudo en la fachada. Acércate a la puerta y léelo: cuenta quién vivía allí.`, 5200); }
    }
    // cerca del frontón se piden ya los dos pelotaris (así el partido empieza al momento, sin esperar a descargarlos)
    if (this.fronton && !this.pelPrefetch && Math.hypot(this.fronton.entry.x - P.pos.x, this.fronton.entry.z - P.pos.z) < 60) {
      this.pelPrefetch = true; for (const n of ['pelotari', 'pelotari_rojo']) if (hasMeshy(n)) loadMeshy(n).catch(() => {});
    }
    const fr = frameFrustum(this.camera);
    const cull = (a, max) => cullActor(a, Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z), max, dt, P, fr);
    const lowQ = QUALITY === 'low';   // en móviles los vecinos se dibujan más cerca
    for (const a of this.actors) cull(a, lowQ ? 70 : 110);
    for (const a of this.walkers) cull(a, lowQ ? 50 : 70);
    for (const f of this.folk) this.updateFolk(f, dt);
    // objetos
    for (const it of this.items) {
      const o = it.obj; o.visible = Math.abs(it.x - P.pos.x) + Math.abs(it.z - P.pos.z) < 120;
      if (!o.visible) continue;
      o.userData.body.rotation.y += dt * 1.4; o.userData.body.position.y = 0.2 + Math.sin(this.elapsed * 2.5 + it.x) * 0.1;
      o.userData.ring.material.opacity = 0.45 + Math.sin(this.elapsed * 4) * 0.25;
    }
    for (const g of this.gates) if (g.obj.visible) g.obj.userData.torus.rotation.z += dt * (g.next ? 2 : 0.3);
    this.agro?.update(dt, P, this.particles);
    if (this.mode === 'play' && !this.sportBusy) this.mochila?.update(dt, P);   // (en los menús de pelota no da hambre)
    this.flora?.update(dt, P.pos);
    if (this.mode !== 'futbol') this.perro?.update(dt);
    if (!this.dogHi && this.mode === 'play' && !this.ui.busy && !this.sportBusy && this.elapsed > 5) { this.dogHi = true; this.perro?.hello(); }
    this.gearProps?.night(this.isNight() ? 1 : 0);
    if (this.herd) this.updateHerd(dt);
    this.jornales?.update(dt);
    if (this.race) this.updateRace(dt);
    if (this.mode === 'dance') this.updateDance(dt);
    if (this.mode === 'bino') this.updateBino(dt);
    if (this.mode === 'futbol') this.futbol?.update(dt);
    this.updateNight(dt);
    for (const M of this.missions) if (M.type === 'summit' && M.step === 1 && !M.done) this.updateSummit(M, dt);
    this.checkArrival();
    this.updateInteraction();
    this.updateHUD();
  }

  // ---------- HUD, objetivo y minimapa ----------
  target(M = this.missions[this.tracked]) {
    if (!M || M.done) return null;
    const at = (a) => a ? { x: a.pos.x, z: a.pos.z, h: a.obj.userData.H + 0.7 } : null;
    if (M.step === 0) return at(M.host);
    const P = this.player.pos;
    const nearest = (list) => { let b = null, bd = 1e9; for (const t of list) { const d = Math.hypot(t.x - P.x, t.z - P.z); if (d < bd) { bd = d; b = t; } } return b; };
    switch (M.type) {
      case 'visit': if (M.step === 1) { const left = M.places.filter(p => !p.seen); return nearest(left.map(p => ({ x: p.at.x, z: p.at.z, h: 5 }))); } return at(M.host);
      case 'legend': {
        if (M.step === 1) return null;
        if (M.step === 2) { const c = nearest(this.clues.filter(k => k.M === M && !k.found).map(k => ({ x: k.x, z: k.z, h: 1.2 }))); return c; }
        if (M.step === 3 && M.lair) return { x: M.lair.x, z: M.lair.z, h: 3 };
        return at(M.host);
      }
      case 'summit': { if (M.step === 0 && M.prep) { if (this.supplyOk()) return at(M.host); const P = this.P.bag; if ((P.agua || 0) < 1 && TOWN.fountain) return { x: TOWN.fountain.x, z: TOWN.fountain.z, h: 2.5 }; if (this.stall) return { x: this.stall.x, z: this.stall.z, h: 3 }; }
        if (M.step >= 1 && M.cairns) { const c = M.cairns.find(c => !c.reached); if (c) return { x: c.x, z: c.z, h: c.top ? 3.2 : 2 }; } return at(M.host); }
      case 'process': case 'harvest': if (M.step === 1) return nearest(this.items.filter(it => it.M === M).map(it => ({ x: it.x, z: it.z, h: 1.4 }))); return at(M.host);
      case 'herd': if (M.step === 1) { const loose = this.herd?.filter(s => !s.penned) || []; const t = nearest(loose.map(s => ({ x: s.pos.x, z: s.pos.z, h: 1.8 }))); return t || { x: TOWN.pen.x, z: TOWN.pen.z, h: 2 }; } return at(M.host);
      case 'dance': return M.step === 1 ? { ...this.plazaStage(), h: 3 } : at(M.host);
      case 'carnival': return (M.night ? M.step === 1 || M.step === 2 : M.step === 1) ? null : at(M.host);
      case 'mirador': if (M.step === 1) { const v = this.miradorSpot(); return v && Math.hypot(v.x - this.player.pos.x, v.z - this.player.pos.z) > 6 ? { x: v.x, z: v.z, h: 2 } : null; } return at(M.host);
      case 'dolmen': case 'castle': if (M.step === 1) return nearest(this.items.filter(it => it.M === M).map(it => ({ x: it.x, z: it.z, h: 1.4 }))); return at(M.host);
      case 'feria': return M.step === 1 && M.fair ? { x: M.fair.x, z: M.fair.z, h: 3 } : at(M.host);
      case 'figure': return M.step === 1 && M.memo ? { x: M.memo.x, z: M.memo.z, h: 3 } : at(M.host);
      case 'trade': return M.step === 1 && M.bench ? { x: M.bench.x, z: M.bench.z, h: 2 } : at(M.host);
      case 'race': if (M.step === 1) { const g = this.gates.find(g => g.next); return g ? { x: g.x, z: g.z, h: 4.4 } : null; } return at(M.host);
      case 'observe': if (M.step === 1) { const t = this.obsNearest(M); return t ? { x: t.pos.x, z: t.pos.z, h: 0, noArrow: true } : null; } return at(M.host);
    }
    return at(M.host);
  }
  jobTarget() {
    const h = this.herdJob, P = this.player.pos;
    if (h) {
      if (h.step >= 2) return { x: h.host.pos.x, z: h.host.pos.z, h: 2.3 };
      let b = null, bd = 1e9; for (const s of this.herd || []) { if (s.penned) continue; const d = Math.hypot(s.pos.x - P.x, s.pos.z - P.z); if (d < bd) { bd = d; b = s; } }
      return b ? { x: b.pos.x, z: b.pos.z, h: 1.8 } : TOWN.pen ? { x: TOWN.pen.x, z: TOWN.pen.z, h: 2 } : null;
    }
    const e = this.jornales?.escort; if (e) return { x: e.a.pos.x, z: e.a.pos.z, h: 2.3 };
    return this.jornales?.guideTarget() || null;
  }
  updateHUD() {
    const M = this.missions[this.tracked];
    const t = this.jobTarget() || this.target();
    this.beacon.set(t && !t.noArrow ? t : null, '#ffd34d');
    if (!M) { this.ui.setQuest(null); return; }
    let dist = null, angle = null;
    if (t) {
      const dx = t.x - this.player.pos.x, dz = t.z - this.player.pos.z; dist = Math.hypot(dx, dz);
      const fwd = Math.atan2(-Math.sin(this.follow.yaw), -Math.cos(this.follow.yaw)); angle = -angleDiff(fwd, Math.atan2(dx, dz));
    }
    const nSteps = M.steps().length;
    this.ui.setQuest({ title: M.title, step: this.stepText(M), icon: M.icon, dist, angle, nSteps, stepIdx: Math.min(M.step, nSteps) });
    // las marcas del mapa (recorren todas las misiones) se rehacen cinco veces por segundo, no en cada fotograma
    if (!this.mkList || this.elapsed - this.mkT > 0.2 || this.elapsed < this.mkT) { this.mkList = this.mapMarkers(); this.mkT = this.elapsed; }
    this.ui.updateMinimap(this.player, this.follow.yaw, this.mkList, t);
    if (this.carnivalHint) this.carnivalHint();
  }
  mapMarkers() {
    const out = [];
    for (const M of this.missions) {
      const h = M.host.pos;
      if (M.done) { out.push({ x: h.x, z: h.z, icon: 'check', small: true, title: M.title, text: `¡Hecha! Con ${M.host.name}`, go: true }); continue; }
      if (M.step === 0) out.push({ x: h.x, z: h.z, icon: 'exclaim', title: M.title, text: `Habla con ${M.host.name}`, act: 'track', id: M.i, go: true });
      else { const t = this.target(M); if (t) out.push({ x: t.x, z: t.z, icon: M.icon, title: M.title, text: this.stepText(M), act: 'track', id: M.i }); }
    }
    if (this.fronton) out.push({ x: this.fronton.entry.x, z: this.fronton.entry.z, icon: 'pelota', small: true, title: 'Frontón', text: 'Acércate al frontón para jugar a pelota', fronton: true });
    return out;
  }
  mapLabels() {
    const L = [{ x: PLACES.plaza.x, z: PLACES.plaza.z - 18, label: this.def.name }];
    if (TOWN.church) L.push({ x: TOWN.church.x ?? PLACES.church.x, z: TOWN.church.z ?? PLACES.church.z, icon: 'church', label: 'Iglesia' });
    for (const l of TOWN.landmarks) L.push({ x: l.spot.x, z: l.spot.z, icon: l.kind, label: l.name.length > 24 ? l.name.slice(0, 23).replace(/\s+\S*$/, '') + '…' : l.name })   // (se corta por palabra entera);
    if (TOWN.farm) L.push({ x: TOWN.farm.x, z: TOWN.farm.z, icon: 'sheep', label: 'Granja' });
    L.push({ x: PLACES.fields.x, z: PLACES.fields.z, icon: 'wheat', label: 'Campos' });
    if (this.fronton) L.push({ x: this.fronton.spot.x, z: this.fronton.spot.z, icon: 'pelota', label: 'Frontón', text: 'Acércate al frontón para jugar a pelota', fronton: true, go: false });
    return L;
  }
  setBook(M) { if (!M.done) { this.tracked = M.i; this.sound.ui('click'); } }
  // Acciones del mapa: seguir una misión o ir a un sitio
  mapAct(a, it) {
    if (a === 'track') return this.setBook(this.missions[it.id]);
    if (a === 'go') this.teleport(it.x, it.z);
  }

  // ---------- Interacción ----------
  // ---------------------------------------------------------------- escudos de las fachadas
  buildShields() {
    this.blasones = [];
    TOWN.shields.slice(0, 8).forEach((sh, i) => {
      const A = houseArms(this.def, i), c = document.createElement('canvas'); c.width = 128; c.height = 168;
      drawArms(c.getContext('2d'), 64, 4, 92, A, { stone: true });
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 2.03), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.9 }));
      m.position.set(sh.x + Math.sin(sh.ry) * 0.01, sh.y + 0.04, sh.z + Math.cos(sh.ry) * 0.01); m.rotation.y = sh.ry; this.scene.add(m);
      this.blasones.push({ ...sh, A, mesh: m, id: 'escudo:' + this.def.id + ':' + i });
    });
  }
  // escudo oficial del pueblo (o de su valle) pintado en el pilar de la plaza
  buildTownArms() {
    const A = armsOfTown(this.def.id), S = TOWN.armsSpot; if (!A || !S) return;
    const W = 200, c = document.createElement('canvas'); c.width = 256; c.height = Math.ceil(officialHeight(W, A)) + 10;
    drawOfficial(c.getContext('2d'), 128, 4, W, A);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const W3 = S.hall ? 1.5 : 1.35, h = W3 * c.height / c.width, m = new THREE.Mesh(new THREE.PlaneGeometry(W3, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.85 }));
    m.position.set(S.x + Math.sin(S.ry) * 0.01, S.y + (S.hall ? 0.02 : 0), S.z + Math.cos(S.ry) * 0.01); m.rotation.y = S.ry; this.scene.add(m);
    // placa de la casa consistorial sobre la puerta, en euskera y en castellano
    let plate = null;
    if (S.hall) {
      const pc = document.createElement('canvas'); pc.width = 512; pc.height = 96; const g = pc.getContext('2d');
      g.fillStyle = '#e9e1cf'; g.fillRect(0, 0, 512, 96); g.strokeStyle = '#6b5a3e'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 88);
      g.fillStyle = '#3a2a1c'; g.font = '700 40px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('UDALA · AYUNTAMIENTO', 256, 50);
      const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace;
      plate = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.32), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.8 }));
      plate.position.set(S.x - Math.sin(S.ry) * 0.165, S.plateY, S.z - Math.cos(S.ry) * 0.165); plate.rotation.y = S.ry; this.scene.add(plate);
    }
    this.townArms = { A, mesh: m, plate, read: S.read, id: 'armas:' + A.id };
  }
  // la cámara deja al jugador y se planta delante del escudo, a su altura y de frente, para verlo entero y bien; al
  // cerrar la ficha vuelve detrás del jugador
  async lookAtArms(mesh, ry, h) {
    const c = mesh.position, n = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)), fov = (this.camera.fov || 55) * Math.PI / 180;
    const d = Math.max(2.6, (h * 0.5 * 1.7) / Math.tan(fov / 2));   // el escudo ocupa algo más de media pantalla de alto
    this.follow.cinematic = { pos: c.clone().addScaledVector(n, d).add(new THREE.Vector3(0, -0.15, 0)), look: c.clone(), t: 0 };
    this.ui.toast?.('Mira el escudo…', 'shield', 1300);
    await new Promise(r => setTimeout(r, window.__autoWin ? 0 : 1500));
  }
  endLookAtArms() { this.follow.cinematic = null; this.follow.snap?.(this.player); }
  async readTownArmsAt() {
    const T = this.townArms, isNew = addCard(T.id, 'escudos'); this.player.frozen = true;
    try { await this.lookAtArms(T.mesh, TOWN.armsSpot?.ry ?? T.mesh.rotation.y, T.mesh.geometry.parameters.height); await readTownArms(this.ui, T.A, { town: this.def.name.split(' /')[0], isNew }); }
    finally { this.endLookAtArms(); this.player.frozen = false; }
    addXP(isNew ? 30 : 4); saveProfile();
    for (const bd of checkBadges()) await infoCard(this.ui, { icon: bd.icon, kicker: 'Nueva insignia', title: bd.name, text: bd.text, button: '¡Bien!' });
    if (isNew) this.ui.toast('Escudo guardado en tu armorial de Navarra (Saberes · Escudos)', 'shield', 3000);
  }
  async readShield(b) {
    const P = this.P, isNew = addCard(b.id, 'escudos'); this.player.frozen = true;
    try { await this.lookAtArms(b.mesh, b.ry, 2.03); await readArms(this.ui, b.A, { town: this.def.name.split(' /')[0], isNew, regla: (P.cards || []).filter(c => c.startsWith('escudo:')).length }); }
    finally { this.endLookAtArms(); this.player.frozen = false; }
    addXP(isNew ? 20 : 4); saveProfile();
    for (const bd of checkBadges()) await infoCard(this.ui, { icon: bd.icon, kicker: 'Nueva insignia', title: bd.name, text: bd.text, button: '¡Bien!' });
    const left = this.blasones.filter(x => !P.cards.includes(x.id)).length;
    if (isNew) this.ui.toast(left ? `Escudo leído. Quedan ${left} en ${this.def.name.split(' /')[0]}` : `¡Has leído todos los escudos de ${this.def.name.split(' /')[0]}!`, 'shield', 2600);
  }
  interactables() {
    const list = [];
    if (this.townArms) list.push({ kind: 'armas', x: this.townArms.read.x, z: this.townArms.read.z, r: 3, label: this.P.cards.includes(this.townArms.id) ? `Volver a leer el escudo de ${this.def.name.split(' /')[0]}` : `Leer el escudo de ${this.def.name.split(' /')[0]}` });
    for (const b of this.blasones || []) list.push({ kind: 'escudo', b, x: b.read.x, z: b.read.z, r: 3, label: this.P.cards.includes(b.id) ? 'Volver a leer el escudo' : 'Leer el escudo de la casa' });
    for (const a of this.actors) if (a.visible !== false) list.push({ kind: 'npc', a, x: a.pos.x, z: a.pos.z, r: 3, label: a.market ? `Puesto del mercado: ${a.market.toLowerCase()}` : a === this.pelotari ? `Jugar a pelota con ${a.name}` : a === this.coach ? 'Jugar un partido en El Sadar' : a === this.futsalCoach ? `Fútbol con ${clubOfTown(this.def.id)?.name || 'el club del pueblo'}` : a.sabio ? `${a.name}: la historia de ${a.sabio.name}` : a.cuento ? `${a.name}: escuchar «${a.cuento.title}»` : `Hablar con ${a.name}` });
    for (const a of this.walkers) list.push({ kind: 'walker', a, x: a.pos.x, z: a.pos.z, r: a.info || a.jobs ? 3 : 2.4, label: a.stall ? 'Productos del pueblo' : a.jobs ? `Ayudar a ${a.name.toLowerCase()} (txanponak)` : a.info ? `Hablar con ${a.name.toLowerCase() === 'pastor' ? 'el pastor' : 'la ganadera'}` : `Saludar a ${a.name}${TAREAS[a.tarea] ? ' · ' + TAREAS[a.tarea].name : ''}` });
    for (const o of this.agro?.list || []) list.push({ kind: 'agro', o, x: o.x, z: o.z, r: o.kind === 'combine' ? 6 : 4.5, label: `Mirar: ${o.info.title.toLowerCase()}` });
    for (const it of this.items) list.push({ kind: 'item', it, x: it.x, z: it.z, r: 2.2, label: it.label });
    for (const M of this.missions) if (M.bench && M.step === 1 && !M.done) list.push({ kind: 'bench', M, x: M.bench.x, z: M.bench.z, r: 3, label: M.oficio ? 'Entrar al taller' : M.trade.verb });
    for (const M of this.missions) if (M.memo) list.push({ kind: 'memorial', M, x: M.memo.x, z: M.memo.z, r: 2.8, label: M.step === 1 && !M.done ? `Ver el recuerdo de ${M.fig.name}` : `Leer la placa` });
    for (const k of this.clues) if (!k.found && k.obj.visible) list.push({ kind: 'clue', k, x: k.x, z: k.z, r: 2.6, label: 'Examinar' });
    for (const M of this.missions) if (M.creature && M.creature.shown && !M.done && !M.chase) list.push({ kind: 'creature', M, x: M.creature.pos.x, z: M.creature.pos.z, r: 3.6, label: `Hablar con ${M.leg.creature}` });
    // animales de granja cercanos (los del rebaño de una misión no)
    const Pp = this.player.pos;
    for (const a of this.fauna.animals) if (PET[a.kind] && !a.herd && Math.abs(a.pos.x - Pp.x) < 4 && Math.abs(a.pos.z - Pp.z) < 4) list.push({ kind: 'pet', a, x: a.pos.x, z: a.pos.z, r: a.kind === 'cow' ? 2.8 : 2.2, label: `Acariciar a ${PET[a.kind].name}` });
    if (TOWN.church?.door) list.push({ kind: 'bell', x: TOWN.church.door.x, z: TOWN.church.door.z, r: 2.6, label: 'Tocar la campana' });
    for (const b of TOWN.benches) if (Math.abs(b.x - Pp.x) < 3 && Math.abs(b.z - Pp.z) < 3) list.push({ kind: 'seat', b, x: b.x, z: b.z, r: 1.7, label: 'Sentarse a descansar' });
    if (TOWN.fountain) list.push({ kind: 'fountain', x: TOWN.fountain.x, z: TOWN.fountain.z, r: 3.8, label: 'Beber agua' });
    if (this.tienda) list.push(this.tienda.interactable());
    if (this.fronton) list.push({ kind: 'fronton', x: this.fronton.entry.x, z: this.fronton.entry.z, r: 3, label: 'Jugar a pelota' });
    this.flora?.interactables(list);
    return list;
  }
  updateInteraction() {
    if (this.mode === 'futbol') return;
    // (con un menú o un partido de pelota a medias, nada del pueblo: antes, con E, se empezaba otro partido detrás)
    if (this.mode !== 'play' || this.ui.busy || this.sportBusy) { this.ui.setPrompt(null); return; }
    const P = this.player.pos;
    let best = null, bd = 1e9;
    for (const it of this.interactables()) { const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r && d < bd) { bd = d; best = it; } }
    this.ui.setPrompt(best ? best.label : null);
    if (this.input.consume('e') && best) this.safeInteract(best);
    if (this.input.consume('f') && this.binoOn) this.toggleBinoculars();
    if (this.input.consume('c')) this.ui.openBook();
    if (this.input.consume('b')) this.mochila?.open();
    if (this.input.consume('h')) this.perro?.help();
    if (this.input.consume('m')) this.ui.openMap();
    if (this.input.consume('escape')) this.ui.openMenu();
  }
  // cualquier fallo dentro de una interacción (diálogo, prueba, minijuego) no deja el juego congelado: se anota,
  // se cierran las ventanas a medias y se devuelve el control al jugador
  safeInteract(it) {
    Promise.resolve().then(() => this.interact(it)).catch((e) => {
      console.error('[interacción]', e); (window.__errors ||= []).push(String(e?.message || e));
      this.recover();
    });
  }
  recover() {
    try { this.ui._dlgCleanup?.(); } catch (e) { }
    document.querySelectorAll('.mg-overlay').forEach(o => o.remove());
    this.ui.modal = null; this.ui.dialogOpen = false; this.player.frozen = false; this.follow.cinematic = null;
    if (['mini', 'cine', 'dance'].includes(this.mode)) this.mode = 'play';
    this.ui.hudVisible?.(true);
  }
  async interact(it) {
    this.sound.ui('click');
    if (it.kind === 'npc' && it.a === this.pelotari) return this.freePelota();
    if (it.kind === 'npc' && it.a === this.coach) return this.playFutbol();
    if (it.kind === 'npc' && it.a === this.futsalCoach) return this.playFutsal();
    if (it.kind === 'shop' || (it.kind === 'npc' && it.a.shop)) return this.tienda.open();
    if (it.kind === 'npc') return this.talk(it.a);
    if (it.kind === 'fronton') {
      const M = this.missions.find(M => M.type === 'pelota' && !M.done);
      return M ? this.talk(M.host) : this.freePelota();
    }
    if (it.kind === 'walker' && it.a.jobs && this.jornales) return this.jornales.talk(it.a);
    if (it.kind === 'walker' && it.a.info) return this.explainWork(it.a);
    if (it.kind === 'walker' && it.a.stall) return this.buyStall();
    if (it.kind === 'agro') return this.showAgro(it.o);
    if (it.kind === 'escudo') return this.readShield(it.b);
    if (it.kind === 'armas') return this.readTownArmsAt();
    if (it.kind === 'pet') return this.petAnimal(it.a);
    if (it.kind === 'flora') return this.flora.interact(it.s);
    if (it.kind === 'bell') return this.ringBell();
    if (it.kind === 'seat') return this.restBench(it.b);
    if (it.kind === 'walker') { it.a.chatWith = null; it.a.talkTo = null; it.a.say(2.5); it.a.wave = 1.2; const L = TAREAS[it.a.tarea]?.lines || WALKER_LINES[this.walkers.indexOf(it.a) % WALKER_LINES.length]; return this.say(it.a, L); }   // (lo que cuenta: lo que está haciendo)
    if (it.kind === 'item') return this.pick(it.it);
    if (it.kind === 'bench') return this.doTrade(it.M);
    if (it.kind === 'clue') return this.examineClue(it.k);
    if (it.kind === 'memorial') return this.doMemorial(it.M);
    if (it.kind === 'creature') return this.meetCreature(it.M);
    if (it.kind === 'fountain') { this.particles.emit({ x: it.x, y: TOWN.fountain.y + 1.4, z: it.z }, { n: 20, color: '#bfe8ff', speed: 1.5, size: 0.25, life: 0.8 }); this.sound.splash(this.player.pos, 0.6); return this.mochila.fountain(); }
  }
  // un solo menú o partido a la vez (pelota o fútbol): mientras dura, nada del pueblo responde y el jugador no se mueve
  // detrás de los menús; al acabar, todo como estaba (si el pueblo se ha rehecho o se ha viajado, el nuevo manda)
  async sportGuard(fn) {
    if (this.sportBusy || this.mode !== 'play') return;
    this.sportBusy = true; this.player.frozen = true;
    try { return await fn(); }
    finally { if (!this.disposed) { this.sportBusy = false; this.player.frozen = false; this.ui.hudVisible(true); } }
  }
  // Partido de fútbol en El Sadar con la entrenadora de la cantera
  playFutbol() { return this.sportGuard(() => this.futbolSadar()); }
  async futbolSadar() {
    const a = this.coach; if (!a) return;
    this.player.frozen = true;
    try {
      const first = !this.futSeen; this.futSeen = true;
      await this.say(a, first ? ['¡Kaixo! Soy Leire, entrenadora de la cantera de Iruña. ¿Te atreves a jugar en El Sadar?',
        'Un partido once contra once en el campo de El Sadar, con porteros y árbitro. ¡Al campo!',
        'Con el balón: PASE y TIRO (mantenlo pulsado para chutar más fuerte). Sin balón: ROBO cuando se le separe del pie, o ENTRADA. ¡Aupa Iruña!'] : ['¿Otro partido? ¡La grada está llena!']);
    } finally { a.talking = 0; }
    const Futbol = await loadFutbol();
    this.futbol = new Futbol(this, this.sadar);
    const r = await this.futbol.run();
    if (r.quit) return;
    const best = (townState(profile(), this.def.id).best ||= {});
    if (r.win) { best.futbol = (best.futbol || 0) + 1; saveProfile(); }
    await this.say(a, [r.win ? `¡${r.you} a ${r.cpu}! Juegas como un rojillo de verdad.` : r.you === r.cpu ? `${r.you} a ${r.cpu}. ¡Empate! Muy buen partido.` : `${r.you} a ${r.cpu}. ¡Casi! Vuelve cuando quieras para la revancha.`]);
  }
  // Fútbol en el pueblo con el entrenador del club. Es un minijuego: la primera vez, un partido contra el equipo vecino
  // da el sello de fútbol del pasaporte; después, otro partido cuando quieras.
  playFutsal() { return this.sportGuard(() => this.futbolPueblo()); }
  async futbolPueblo() {
    const a = this.futsalCoach; if (!a) return;
    const st = (townState(profile(), this.def.id).futsal ||= { step: 0, tries: 0, sello: false });
    const town = this.def.name.split(' /')[0], club = clubOfTown(this.def.id);
    const local = club ? teamOfClub(club.id) : { name: town, short: town.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() };
    // el rival del partido del pueblo: el club vecino más parecido de la liga (o el equipo de los vecinos)
    const rivalId = club ? ligaSeason(club.id).teams[1] : null, rivalTeam = rivalId ? teamOfClub(rivalId) : null, rivalName = rivalTeam?.name || 'los vecinos';
    const Futbol = await loadFutbol();
    // (un solo fútbol, el de once, y todos los partidos en El Sadar: con sus gradas llenas es más espectacular que el
    // campo del pueblo)
    const fut = new Futbol(this, null, { campo: 'sadar', title: 'El Sadar', sub: 'Partido de fútbol', local });
    this.player.frozen = true;
    try {
      if (st.step === 0 && !st.met) {
        await this.say(a, [club ? `¡Kaixo! Entreno al equipo de ${club.name}. Aquí puedes jugar con nosotros.` : `¡Kaixo! Esta es la pista de ${town}.`,
          this.pista ? 'Tienes la Liga Navarra contra los clubes de la zona, amistosos contra cualquier club de Navarra y el partido del pueblo. Todos se juegan en El Sadar, el estadio de Iruña.' : 'Tienes la Liga Navarra contra los clubes de la zona y amistosos contra cualquier club de Navarra. Todos se juegan en El Sadar, el estadio de Iruña.',
          ...(this.pista ? [`Juega un partido contra ${rivalName}. Si ganas, te pongo el sello de fútbol en el pasaporte.`] : [])].filter(Boolean));
        st.step = this.pista ? 2 : 0; if (!this.pista) st.met = true; saveProfile();
      } else await this.say(a, [club ? `¡Aupa ${club.name}! ¿Qué jugamos hoy?` : '¿Qué jugamos hoy?']);
    } finally { a.talking = 0; }   // (el jugador sigue quieto con el menú del club delante)
    // menú del club (como en los juegos de fútbol): liga, partido del pueblo, amistoso. En la liga juegas con «tu club» (el del primer pueblo
    // en el que la empezaste); todas las jornadas, en El Sadar, desde cualquier pueblo
    const P = profile(), myClub = P.futbolClub || club?.id, S = myClub ? ligaSeason(myClub) : null;
    if (st.step === 1) st.step = 2;   // (ya no hay entrenamiento previo: directo al partido por el sello)
    const sala = !this.pista ? null : st.step === 2 ? ['sala', 'Partido por el sello', `Contra ${rivalName} · en El Sadar`] : ['sala', 'Partido de fútbol', 'En El Sadar'];
    const ligaSub = `${P.futbolClub ? CLUBS_NAME(myClub) + ' · ' : ''}en El Sadar`;
    const items = (club ? [['liga', S.j < S.rounds.length ? `Liga Navarra · jornada ${S.j + 1}` : 'Liga Navarra · nueva temporada', ligaSub], sala, ['amistoso', 'Amistoso', 'Contra cualquier club de Navarra'], ['exit', 'Salir', '']] : [sala, ['exit', 'Salir', '']]).filter(Boolean);
    const pick = club ? await clubPanel(club.id, items, `${town} · tu club`) : 'sala';
    if (pick === 'exit' || (pick === 'sala' && !this.pista)) return;
    if (pick === 'liga') {
      if (!P.futbolClub) { P.futbolClub = club.id; saveProfile(); }
      const r = await fut.liga(myClub); if (!r.quit && r.win) addXP(30);
      return;
    }
    if (pick === 'amistoso') { const r = await fut.friendly(club.id); if (r.quit) return; await this.say(a, [r.win ? `¡${r.you} a ${r.cpu}! ¡Qué partidazo!` : r.you === r.cpu ? `${r.you} a ${r.cpu}. Empate.` : `${r.you} a ${r.cpu}. La próxima, seguro.`]); return; }
    if (st.step === 2) {
      const r = await fut.match('vecinos', 'facil', 2, rivalTeam); if (r.quit) return;
      if (r.win) {
        st.step = 3; st.sello = true; addXP(60); saveProfile();
        await this.say(a, [`¡${r.you} a ${r.cpu}! Has ganado a ${rivalName}. Toma: el sello de fútbol de ${town} para tu pasaporte.`, 'Vuelve cuando quieras a jugar otro partido.']);
        this.ui.toast?.(`Sello de fútbol de ${town}`, 'balon', 2600);
      } else await this.say(a, [r.you === r.cpu ? `${r.you} a ${r.cpu}. ¡Empate! Para el sello hay que ganar: ¿la revancha?` : `${r.you} a ${r.cpu}. ¡Casi! Habla conmigo para la revancha.`]);
      return;
    }
    const r = await fut.run(); if (r.quit) return;
    await this.say(a, [r.win ? `¡${r.you} a ${r.cpu}! ¡Qué partidazo!` : r.you === r.cpu ? `${r.you} a ${r.cpu}. Empate.` : `${r.you} a ${r.cpu}. La próxima, seguro.`]);
  }
  // los pueblos del juego donde se juega el torneo de la comarca: los de la comarca y, si son pocos, los más cercanos
  comarcaVenues() {
    const own = LEVELS.filter(l => l.comarca === this.def.comarca), i0 = LEVELS.findIndex(l => l.id === this.def.id);
    const near = LEVELS.filter(l => l.comarca !== this.def.comarca && l.id !== 'pamplona').sort((a, b) => Math.abs(LEVELS.indexOf(a) - i0) - Math.abs(LEVELS.indexOf(b) - i0));
    return [...own, ...near].slice(0, Math.max(own.length, 4)).map(l => ({ id: l.id, name: l.name.split(' /')[0] }));
  }
  // Partido libre en el frontón del pueblo (fuera de las misiones): contra el pelotari o el anfitrión de la misión
  // (un solo menú o partido de pelota a la vez: mientras dura, el jugador quieto y sin los botones del pueblo debajo
  // del menú; al acabar, todo como estaba)
  async freePelota() {
    const a = this.pelotari || this.missions.find(M => M.type === 'pelota')?.host;
    if (!this.fronton || !a || this.mode !== 'play' || this.sportBusy) return;
    this.sportBusy = true; this.player.frozen = true;
    try {
      const first = !this.pelotaSeen; this.pelotaSeen = true;
      await this.say(a, first ? ['¡Aupa! ¿Echamos un partido de pelota a mano?', 'La pelota tiene que dar en el frontis por encima de la chapa, la raya roja. Ve al círculo verde y pulsa GOLPE cuando brille.']
        : ['¿Otro partido? ¡Vamos!']);
      a.talking = 0;
      // partido libre o el torneo de mano de la comarca (la txapela, parte de la misión de la comarca)
      const P = profile(), town = this.def.name.split(' /')[0], cm = this.comarca?.name || 'la comarca';
      const ctx = { comarca: this.def.comarca, comarcaName: cm, towns: this.comarcaVenues() };
      const you = { name: P.name || 'Tú', town };
      this.ui.hudVisible(false);
      const pick = await pelotaMenu(torneo(you, ctx), town, torneo(you, ctx, false, 'parejas'));
      if (this.disposed || pick === 'exit') return;
      if (pick === 'torneo') return await this.pelotaTorneo(a, ctx);
      if (pick === 'torneoParejas') return await this.pelotaTorneo(a, ctx, 'parejas');
      const r = await this.fronton.play(this, a);
      if (this.disposed || r.quit) return;
      const best = (townState(profile(), this.def.id).best ||= {});
      if (r.win) { best.pelota = (best.pelota || 0) + 1; saveProfile(); }
      this.player.frozen = true;
      await this.say(a, [r.win ? `¡${r.you} a ${r.cpu}! Juegas como un pelotari de verdad. Vuelve cuando quieras.` : `${r.you} a ${r.cpu}. ¡Casi! Aquí estaré para la revancha.`]);
    } finally { if (!this.disposed) { this.sportBusy = false; this.player.frozen = false; a.talking = 0; this.ui.hudVisible(true); } }
  }
  // Campeonato de pelota desde el menú (sin misiones): el frontón del pueblo elegido con su menú de pelota (partido
  // libre o torneo por la txapela, todos los partidos aquí, sin viajar). Al salir del menú, de vuelta al inicio
  async sportOnly() {
    this.sportMode = true; this.sportBusy = true; this.ui.hudVisible(false);
    this.perro?.away?.();   // (en el campeonato no hace falta el perro: ni saluda ni avisa entre partido y partido)
    const a = this.pelotari || this.missions.find(M => M.type === 'pelota')?.host;
    try {
      if (!this.fronton || !a) return;
      const e = this.fronton.entry, c = this.fronton.toWorld(0, 12);
      this.player.place(e.x, e.z, Math.atan2(c.x - e.x, c.z - e.z)); this.follow.snap(this.player);
      const P = profile(), town = this.def.name.split(' /')[0], cm = this.comarca?.name || 'la comarca';
      const ctx = { comarca: this.def.comarca, comarcaName: cm, towns: this.comarcaVenues() };
      for (;;) {
        // (entre partido y partido, el jugador quieto en la puerta del frontón y sin el perro, que vuelve al acabar
        // cada partido: el pueblo solo es el fondo de los menús)
        this.ui.hudVisible(false); this.player.frozen = true; this.perro?.away?.();
        const you = { name: P.name || 'Tú', town };
        const pick = await pelotaMenu(torneo(you, ctx), town, torneo(you, ctx, false, 'parejas'));
        if (this.disposed || pick === 'exit') return;
        if (pick === 'torneo' || pick === 'torneoParejas') { await this.pelotaTorneo(a, ctx, pick === 'torneoParejas' ? 'parejas' : 'mano'); if (this.disposed) return; continue; }
        // (el partido de Campeonatos, como el torneo, en el frontón cubierto; el de la calle queda para las misiones)
        const hv = this.fronton.court.labrit ? this.fronton : this.hallVenue(); if (hv !== this.fronton) await this.hallIntro(hv);
        if (this.disposed) return;
        const r = await hv.play(this, a, { returnTo: this.fronton, comp: 'Partido de exhibición' });
        if (this.disposed) return;
        if (r.quit) continue;
        const best = (townState(profile(), this.def.id).best ||= {});
        if (r.win) { best.pelota = (best.pelota || 0) + 1; saveProfile(); }
        this.ui.hudVisible(false); this.player.frozen = true;
        await this.say(a, [r.win ? `¡${r.you} a ${r.cpu}! Juegas como un pelotari de verdad.` : `${r.you} a ${r.cpu}. ¡Casi! ¿La revancha?`]);
      }
    } finally { if (!this.disposed) this.onExit?.('sports'); }   // (de vuelta a Torneos, de donde se vino; si el pueblo se rehízo, el nuevo sigue)
  }
  // el torneo entero se juega en este frontón (los rivales vienen aquí): el del pueblo elegido en Campeonatos o el
  // del pueblo en el que estás
  async pelotaTorneo(a, ctx, kind = 'mano') {
    const P = profile(), town = this.def.name.split(' /')[0], pairs = kind === 'parejas';
    let T = torneo({ name: P.name || 'Tú', town }, ctx, false, kind);
    for (;;) {
      this.ui.hudVisible(false); this.player.frozen = true;   // (con el cuadro del torneo delante, nada del pueblo debajo)
      const act = await torneoPanel(T, town);
      if (this.disposed || act === 'exit') return;   // (el pueblo se rehízo mientras tanto: este torneo ya no sigue)
      if (act === 'new') { T = torneo({ name: P.name || 'Tú', town }, ctx, true, kind); continue; }
      if (act === 'sim') { playTorneoRound(T); continue; }
      const m = yourMatch(T);
      // la final, en el frontón Labrit de Iruña (los cuartos y las semifinales, aquí)
      // (los cuartos y las semifinales, en el frontón cubierto del pueblo; en Iruña, en el Labrit)
      const fin = m.round === 'Final', venue = this.fronton?.court.labrit ? this.fronton : fin ? this.labritVenue() : this.hallVenue();
      if (fin) await this.labritIntro(venue); else if (venue.court.hall) await this.hallIntro(venue);
      if (this.disposed) return;
      // (por parejas: juegas con tu compañero contra el delantero y el zaguero rivales)
      const r = await venue.play(this, a, { target: m.target, level: m.level, rivalName: `${pairs ? m.rival.mates[0] : m.rival.name} (${m.rival.town})`, fixedLevel: true, returnTo: this.fronton, rivalStats: m.stats,
        pairs: pairs ? { partner: m.partner, rivalMate: m.mate } : null, rivalTown: m.rival.townId ? { id: m.rival.townId, name: m.rival.town } : null,
        comp: `${pairs ? 'Torneo por parejas' : 'Torneo de mano'} · ${m.round}`, youBonus: youBonus(T), rivalBonus: ((m.rival.lv || 2) - 2) * 3 });
      if (this.disposed) return;
      if (r.quit && r.later) continue;   // («Ahora no» antes de empezar: de vuelta al cuadro del torneo, de donde se vino)
      if (r.quit) return;   // (salir del partido es salir: de vuelta al pueblo, no al panel del torneo otra vez)
      this.ui.hudVisible(false); this.player.frozen = true;   // (lo que dice el pelotari y el cuadro, sin el pueblo debajo)
      playTorneoRound(T, r.you, r.cpu);
      if (T.done && T.players[T.champion].you) {
        P.txapelas = (P.txapelas || 0) + 1; addXP(150); saveProfile();
        this.player.rig.doCheer?.(); this.particles.confetti?.(this.player.pos, 120);
        // la gran celebración: la txapela baja, confeti, fuegos y el frontón en pie
        if (pairs) {
          await showChampion({ kind: 'pelota', kicker: `Torneo por parejas · ${ctx.comarcaName}`, title: '¡Txapeldunak!', name: T.players[T.champion].name, sub: `La txapela de parejas de ${ctx.comarcaName} es vuestra. Zorionak!`, score: `Final · ${r.you} – ${r.cpu}`, sound: this.sound, button: 'Ponerme la txapela' });
          await this.say(a, [`¡Txapeldunak! Sois campeones del torneo por parejas de ${ctx.comarcaName}. Llevas ${P.txapelas} ${P.txapelas === 1 ? 'txapela' : 'txapelas'}.`]);
        } else {
          await showChampion({ kind: 'pelota', kicker: `Torneo de mano · ${ctx.comarcaName}`, title: '¡Txapeldun!', name: P.name || 'Campeón', sub: `La txapela de ${ctx.comarcaName} es tuya. Zorionak!`, score: `Final · ${r.you} – ${r.cpu}`, sound: this.sound, button: 'Ponerme la txapela' });
          await this.say(a, [`¡Txapeldun! Eres campeón del torneo de mano de ${ctx.comarcaName}. Llevas ${P.txapelas} ${P.txapelas === 1 ? 'txapela' : 'txapelas'}.`]);
        }
      } else if (!r.win) await this.say(a, [`${r.you} a ${r.cpu}. ¡Qué pena! El torneo sigue: mira quién se lleva la txapela.`]);
      else if (!T.done) await this.say(a, [yourMatch(T)?.round === 'Final' ? `¡${r.you} a ${r.cpu}! Pasas a la final. Se juega en el frontón Labrit de Pamplona.` : `¡${r.you} a ${r.cpu}! Pasas a ${yourMatch(T)?.round.toLowerCase() || 'la siguiente ronda'}. El próximo partido, aquí mismo.`]);
    }
  }
  // el frontón Labrit: muy por encima del pueblo y fuera de sus límites (solo se ve por dentro y en la llegada)
  labritVenue() { return labrit(this.scene, { x: PLACES.plaza.x + 2600, z: PLACES.plaza.z }); }
  // el frontón cubierto del pueblo (los campeonatos): también muy por encima y fuera de sus límites, al otro lado
  hallVenue() { return hallVenue(this.scene, { x: PLACES.plaza.x - 2600, z: PLACES.plaza.z }, this.def); }
  // llegada al frontón cubierto: un plano desde lo alto del fondo, con la grada llena y las luces encendidas
  async hallIntro(L) {
    if (window.__autoWin) return;
    const g = L.court.group, V = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
    this.sky.flood = 1; this.sky.indoor = true; this.sky.floodCur = 1; this.ui.hudVisible?.(false); this.perro?.away?.();
    this.player.place(L.entry.x, L.entry.z, 0); this.player.frozen = true;   // (el cielo y las sombras van con el jugador)
    try {
      const rt = this.rt, shot = async (pos, look, ms) => { this.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; this.camera.position.copy(pos); this.camera.lookAt(look);
        const f0 = rt?.frameNo ?? 0, t0 = performance.now(); await new Promise(r => { const k = () => (performance.now() - t0 >= ms && (rt?.frameNo ?? 1e9) - f0 >= 30) || performance.now() - t0 > ms + 12000 ? r() : setTimeout(k, 50); k(); }); };
      this.ui.toast?.(`Frontón cubierto de ${this.def.name.split(' /')[0]}`, 'pelota', 2600);
      await shot(V(12.5, 7.6, 31), V(0, 3, 6), 1800);
    } finally { this.follow.cinematic = null; }
  }
  // llegada a la final: la fachada de ladrillo con sus torreones y, dentro, la cancha llena
  async labritIntro(L) {
    if (window.__autoWin) return;
    const g = L.court.group, V = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z)), E = L.court.extent;
    const xc = (E.x0 + E.x1) / 2, zb = E.z1;
    this.sky.flood = 1; this.ui.hudVisible?.(false); this.perro?.away?.();   // (los focos ya encendidos: el partido sigue con la misma luz, sin apagar y encender)
    this.player.place(L.entry.x, L.entry.z, 0); this.player.frozen = true;   // (el cielo y las sombras van con el jugador: que esté ya allí)
    try {
      // (cada plano dura su tiempo y, como poco, 40 imágenes: la primera vez, el móvil tarda en preparar el edificio)
      const rt = this.rt, shot = async (pos, look, ms) => { this.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; this.camera.position.copy(pos); this.camera.lookAt(look);
        const f0 = rt?.frameNo ?? 0, t0 = performance.now(); await new Promise(r => { const k = () => (performance.now() - t0 >= ms && (rt?.frameNo ?? 1e9) - f0 >= 40) || performance.now() - t0 > ms + 15000 ? r() : setTimeout(k, 50); k(); }); };
      this.ui.toast?.('La final, en el frontón Labrit de Iruña', 'pelota', 3600);
      await shot(V(xc + 14, 7, zb + 34), V(xc, 7, zb), 2600);
      await shot(V(xc - 6, 3, zb + 14), V(xc, 6, zb), 1600);
      await shot(V(12, 7.5, 30), V(0, 3, 4), 2200);   // dentro: desde lo alto de la grada hacia el frontis
    } finally { this.follow.cinematic = null; }   // (el jugador sigue quieto: el partido lo coloca y lo suelta al acabar)
  }
  say(a, lines) {
    const look = a.obj?.userData.look;
    return this.ui.dialog(lines.map(t => ({ who: a.name, look, ...(typeof t === 'string' ? { text: t } : t) })));
  }
  async talk(a) {
    if (a.sabio) return this.sabioTalk(a);
    if (a.cuento) return this.kontalariTalk(a);
    // vecinos sin misión (pelotari, entrenador, puestos): lo suyo, o un saludo; nunca un diálogo de misión vacío
    if (!a.mission) {
      if (a === this.pelotari) return this.freePelota();
      if (a === this.coach) return this.playFutbol();
      if (a === this.futsalCoach) return this.playFutsal();
      if (a.shop) return this.tienda.open();
      a.say?.(2); return this.say(a, [`¡Kaixo! Soy ${a.name}. ¡Que disfrutes de ${this.def.name.split(' /')[0]}!`]);
    }
    const M = a.mission;
    a.say(4); this.player.frozen = true; this.speaker = a;
    this.player.heading = Math.atan2(a.pos.x - this.player.pos.x, a.pos.z - this.player.pos.z);
    const first = M && !M.done && M.step === 0;
    try { await this.dialog(M, a); } finally { this.player.frozen = false; a.talking = 0; this.speaker = null; }
    // la voz del narrador abre cada misión con un pequeño misterio
    if (first && M.step > 0 && M.type !== 'legend') { const h = this.hook(M); if (h) setTimeout(() => this.ui.whisper?.(h, 5200), 400); }
    this.autoTrack();
  }
  // Diálogos de cada misión según el paso
  async dialog(M, a) {
    const d = this.def, m = M.m, name = this.state.name;
    if (M.done) {
      const extra = M.type === 'quiz' ? ['¿Quieres otra pregunta?'] : [];
      await this.say(a, [`¡Gracias por tu ayuda, ${name}! Aquí en ${d.name} ya te conocemos.`, ...extra]);
      if (M.type === 'quiz') await this.quizRound(M, a, 1);
      return;
    }
    this.tracked = M.i;
    const S = (lines) => this.say(a, lines);
    switch (M.type) {
      case 'visit':
        if (M.step === 0) {
          await S([`¡Kaixo, ${name}! Ongi etorri: ¡te damos la bienvenida a ${d.name}!`, d.intro || '', `Aquí hay ${M.need} lugares que tienes que conocer: ${M.places.map(p => p.name).join(', ')}.`, 'Sigue la luz dorada y la flecha de arriba. Cuando llegues a cada lugar, lo apuntarás en tu cuaderno.'].filter(Boolean));
          this.startVisit(M);
        } else if (M.step === 1) await S([`Te quedan ${M.need - M.count} lugares por visitar. ¡Sigue la luz dorada!`]);
        else { await S([`¡Ya conoces ${d.name}! Ahora la gente del pueblo te pedirá ayuda.`, 'Los que tienen una exclamación amarilla encima tienen una misión para ti.']); await this.complete(M); }
        return;
      case 'process':
        if (M.step === 0) { await S([m.text]); await this.explain(PROCESOS[m.id], m.product, 'what'); await S([`Primero: ${m.gather?.label?.toLowerCase() || 'recoge lo necesario'}. Necesito ${M.need}.`]); this.startGather(M, m.gather?.item || 'star', m.gather?.label || 'Recoger', m.gather?.near); }
        else if (M.step === 1) await S([`Aún faltan ${M.need - M.count}. ¡Tú puedes!`]);
        else if (M.step === 2 || M.step === 3) {
          M.step = 3;
          await S([`¡Perfecto! Ahora hagamos ${m.product} paso a paso.`]);
          await this.explain(PROCESOS[m.id], m.product, 'how');
          await S(['Ordena los pasos: ¿qué se hace primero?']);
          const r = await sequenceGame(this.ui, { title: m.product, hint: 'Toca los pasos en el orden correcto', icon: M.icon, steps: m.steps });
          if (r.win) { await S([`¡Así se hace ${m.product}! Es un producto de ${this.comarca?.name || 'Navarra'}.`]); await this.explain(PROCESOS[m.id], m.product, 'then'); await this.complete(M, { card: m.product, cardText: m.text }); }
        }
        return;
      case 'harvest':
        if (M.step === 0) { await S([m.text, `Recoge ${M.need} ${CROP[m.crop]?.[0] || 'frutos'} en los campos. Te los marco con un brillo.`]); this.startGather(M, M.item, 'Recoger ' + (CROP[m.crop]?.[0] || ''), 'fields'); }
        else if (M.step === 1) await S([`Te faltan ${M.need - M.count}. ¡Mira en los campos!`]);
        else { this.player.rig.doAct('pick', 0.8); await S(['¡Qué buena cosecha! Esto lo llevaremos al mercado.']); await this.complete(M, { card: CROP[m.crop]?.[0], cardText: m.text }); }
        return;
      case 'herd':
        if (M.step === 0) { await S([...(m.story || []), m.text, 'Acércate por detrás de los animales para que avancen hacia la puerta del redil. Si corres, se asustan.']); this.startHerd(M); }
        else if (M.step === 1) await S([`Quedan ${M.need - M.count}. Rodéalos con calma.`]);
        else { await S([m.outro || '¡Todos dentro! Buen trabajo de pastor.']); await this.complete(M, { card: m.card || M.title, cardText: m.cardText || m.text }); }
        return;
      case 'dance':
        if (M.step === 0) { await S([m.text, 'Ven al centro de la plaza y sigue el ritmo con las flechas.']); M.step = 1; }
        else await S(['¡La plaza nos espera! Ponte en el centro.']);
        return;
      case 'carnival':
        if (M.night) {
          if (M.step === 0) { await S([...M.night.story, m.text || ''].filter(Boolean)); M.step = 1; }
          if (M.step === 1) { if (this.isNight()) { await S([M.night.night]); this.startCarnival(M); } else await this.offerNight(a, M.night.wait, () => this.startCarnival(M)); }
          else if (M.step === 2) await S([`Te faltan ${M.need - M.count}. Escucha los cencerros…`]);
          else { await S([`¡Los has encontrado a todos! Así se vive el carnaval de ${this.def.name.split(' /')[0]}: una tradición que se remonta a tiempos muy antiguos.`]); await this.complete(M, { card: M.folk?.name, cardText: M.folk?.fact }); }
          return;
        }
        if (M.step === 0) { await S([m.text || M.folk?.fact || '', M.folk?.culture || '', `Hay ${M.need} escondidos por el pueblo. No los verás desde lejos: escucha sus cencerros, suenan más fuerte cuando estás cerca.`].filter(Boolean)); this.startCarnival(M); }
        else if (M.step === 1) await S([`Te faltan ${M.need - M.count}. Escucha…`]);
        else { await S([`¡Los has encontrado a todos! ${M.folk?.clue ? '' : ''}Así se vive el carnaval en ${this.comarca?.name}.`]); await this.complete(M, { card: M.folk?.name, cardText: M.folk?.fact }); }
        return;
      case 'trade':
        if (M.step === 0) { const of = M.oficio; await S(of ? [of.intro, `Soy ${a.name}. Ven al banco de trabajo y te enseño cómo se hacía, paso a paso.`] : [m.text, `Ven al banco de trabajo. ${M.trade.hint}`]); M.step = 1; }
        else await S([M.tstep ? `Íbamos por el paso ${M.tstep + 1}. Vuelve al banco de trabajo.` : 'Ponte en el banco de trabajo cuando quieras.']);
        return;
      case 'legend': {
        const L = M.leg;
        if (M.step === 0) { await S(L.story); M.step = 1; }
        if (M.step === 1) { if (this.isNight()) { await S([L.night]); this.startLegend(M); } else await this.offerNight(a, L.wait, () => this.startLegend(M)); }
        else if (M.step === 2) await S([`Te quedan ${M.need - M.count} pistas. Busca las luces en la oscuridad.`]);
        else if (M.step === 3) await S([`Ya lo tienes cerca. Ve con cuidado… ${L.creature} te está esperando.`]);
        return;
      }
      case 'race':
        if (m.kind === 'encierro') {
          if (M.step === 2) { await S(['¡Has llegado a la plaza! Así se vive el encierro.']); await this.complete(M, { card: 'El encierro', cardText: m.text }); return; }
          await S([m.text, 'Recuerda: en la vida real solo pueden correr las personas mayores de 18 años. Aquí, en el juego, sí puedes probar. ¿Preparado? Vamos a la Estafeta.']);
          const Encierro = await loadEncierro();
          const r = await new Encierro(this).run();
          if (this.disposed || r.quit || r.error) return;   // (salir a medias o sin poder prepararlo no es «los toros son muy rápidos»)
          if (r.win) { M.step = 2; saveProfile(); await S(['¡Bravo! Has corrido el encierro hasta la plaza.']); await this.complete(M, { card: 'El encierro', cardText: m.text }); }
          else await S(['No pasa nada: los toros son muy rápidos. Habla conmigo cuando quieras intentarlo otra vez.']);
          return;
        }
        if (M.step === 0 || (M.step === 1 && !this.race)) { await S([m.text, `Pasa por los ${M.need} aros antes de que se acabe el tiempo. ¡Mantén pulsado Mayús o el botón de correr!`]); this.startRace(M); }
        else if (M.step === 2) { await S(['¡Qué rapidez! Lo has conseguido.']); await this.complete(M, { card: M.title, cardText: m.text }); }
        return;
      case 'observe': {
        const F0 = FAUNA[M.species[0]];
        if (M.step === 0) {
          await S([...(m.story || []), m.text, F0 ? `Fíjate bien: ${F0.look}` : '', 'Toma mis prismáticos. Pulsa F (o el botón de prismáticos), busca con calma y, cuando el círculo se ponga amarillo, pulsa E para anotarlo. La brújula te indica hacia dónde mirar.'].filter(Boolean));
          M.step = 1; this.binoOn = true; this.ui.showBinoButton(); this.obsSeen ||= new Set(); await this.mochila.give('prismaticos');
        } else if (M.step === 1) await S([`Llevas ${M.count}/${M.need}. ${m.hint || 'Mira al cielo: sigue la marca de la brújula.'}`]);
        else { await S([m.outro || '¡Muy bien observado! Has aprendido a reconocerlos por su silueta, como los guardas de verdad.']); await this.complete(M, { card: M.title, cardText: m.text }); }
        return;
      }
      case 'tradition': {
        await S([m.text]);
        if (M.step === 0) { await this.explain(TRADICIONES[m.title], m.title, 'what'); await this.explain(TRADICIONES[m.title], m.title, 'how'); }
        await S([m.kind === 'angel' ? 'Repite los movimientos en el mismo orden.' : 'Escucha la melodía y repítela.']);
        M.step = 1;
        const r = await simonGame(this.ui, { title: M.title, icon: M.icon, rounds: 4, labels: m.kind === 'angel' ? ['Cuerda', 'Alas', 'Bajar', 'Saludo'] : null });
        if (r.win) { await S(['¡Precioso! Así se mantiene viva la tradición.']); await this.explain(TRADICIONES[m.title], m.title, 'then'); await this.complete(M, { card: M.title, cardText: m.text }); }
        else await S(['No pasa nada, inténtalo otra vez cuando quieras.']);
        return;
      }
      case 'pelota': {
        if (!this.fronton) { await S(['Hoy el frontón está cerrado. ¡Vuelve otro día!']); return; }
        if (M.step === 0) {
          await S([...(m.story || []), m.text || '',
            'Así se juega: la pelota tiene que dar en el frontis por encima de la chapa, la raya roja. La puedes devolver de aire o después de un bote.',
            'Ve al círculo verde y pulsa GOLPE cuando la pelota brille. ¡El primero que llegue a 5 tantos gana!'].filter(Boolean));
          M.step = 1;
        } else await S(['¿La revancha? ¡Vamos al frontón!']);
        a.talking = 0; this.player.frozen = false;
        this.sportBusy = true; let r;
        try { r = await this.fronton.play(this, a); } finally { this.sportBusy = false; }
        if (this.disposed || r.quit) return;   // (si se deja a medias, sin «¡Casi!» de un partido que no se ha jugado)
        if (r.win) { await S([`¡${r.you} a ${r.cpu}! Juegas como un pelotari de verdad.`]); await this.complete(M, { card: M.title, cardText: m.text }); }
        else await S([`${r.you} a ${r.cpu}. ¡Casi! Háblame otra vez para jugar la revancha.`]);
        return;
      }
      case 'summit': {
        const pk = M.peak;
        if (M.step === 0 && M.prep) {
          if (!this.supplyOk()) { await S([`Aún no: ${this.supplyText()}. Agua en la fuente de la plaza y comida en el puesto de productos del pueblo.`]); return; }
          M.prep = false;
          await S(['¡Mochila lista! Agua, comida de aquí y ganas de subir. ¡Vamos!', 'Fíjate en las señales pintadas en las piedras: te enseñaré a leerlas por el camino.']);
          this.startSummit(M); return;
        }
        if (M.step === 0) {
          await S([`¿Ves ese monte de ahí arriba? Es como el ${pk.name}${pk.altName ? ' (' + pk.altName + ')' : ''}: ${pk.intro}`,
            `El de verdad mide ${pk.altitude.toLocaleString('es')} metros. Desde ${pk.start} son ${String(pk.distance).replace('.', ',')} km y ${pk.gain} metros de desnivel.`,
            'Te he marcado el camino con mojones pintados de blanco y amarillo, como los de los senderos de verdad. Síguelos hasta la cima y firma en el buzón de cumbre.',
            'Y abre bien los ojos: en la subida viven animales del monte. Si caminas despacio, podrás acercarte a ellos sin asustarlos.',
            'Un consejo de montañera: agua, gorra y paso tranquilo. ¡Y nunca subas sola ni solo al monte!']);
          if (!this.supplyOk()) {
            M.prep = true; this.spawnStall();
            await S(['Pero antes, ¡a llenar la mochila! Al monte se sube con agua y con comida que alimente.', `Necesitas la cantimplora llena (en la fuente de la plaza) y dos alimentos de aquí: pan, queso, miel… Los encontrarás en el puesto de productos del pueblo.`]);
            return;
          }
          M.prep = false;
          this.startSummit(M);
        } else await S([`Sigue los mojones: te faltan ${M.need - M.count} hasta la cima.`]);
        return;
      }
      case 'dolmen': {
        const st = M.site;
        if (M.step === 0) {
          await S(st.intro);
          await infoCard(this.ui, { icon: st.icon, kicker: '¿Qué es?', title: st.whatTitle, text: st.what, button: '¡A excavar!' });
          M.step = 1; M.count = 0;
          const c = TOWN.landmarks.find(l => l.kind === st.landmark)?.spot || M.host.pos;
          st.finds.forEach(([kind], i) => { const a = i / st.finds.length * Math.PI * 2 + 0.4, s2 = this.spot({ x: c.x + Math.cos(a) * 7, z: c.z + Math.sin(a) * 7 }, 3);
            const o = makeItem(kind); o.position.set(s2.x, terrainHeight(s2.x, s2.z), s2.z); this.scene.add(o); this.items.push({ M, x: s2.x, z: s2.z, obj: o, label: 'Excavar con cuidado', kind, find: i }); });
          this.ui.toast(`Busca los brillos ${st.where} y excava con cuidado`, st.icon, 3000);
        } else if (M.step === 1) await S([`Te quedan ${M.need - M.count} hallazgos. ¡Despacio, como una arqueóloga de verdad!`]);
        else {
          await S([st.hostDone]);
          const r = await sequenceGame(this.ui, { title: st.stepsTitle, hint: 'Toca los pasos en orden', icon: st.icon, steps: st.steps });
          if (!r.win) { await S(['¡Casi! Vuelve a hablar conmigo y lo intentamos otra vez.']); return; }
          await infoCard(this.ui, { icon: st.icon, kicker: 'Antes y ahora', title: st.nowTitle, text: 'Así ha cambiado:', extra: `<div class="antes-ahora"><div><b>Antes</b>${st.then}</div><div><b>Ahora</b>${st.now}</div></div>`, button: '¡Lo he aprendido!' });
          await this.complete(M, { card: st.card, cardText: st.what });
        }
        return;
      }
      case 'mirador': {
        if (M.step === 0) {
          await S([`Desde el mirador se ven muchos montes de Navarra. Los montañeros los reconocen por su forma y por su dirección.`, `Toma los prismáticos. Ve al mirador, pulsa F (o el botón de prismáticos) y busca las marcas con interrogación: cada una es un monte de verdad, en su dirección real. Céntrala y pulsa E.`, `Encuentra ${M.need} montes.`]);
          M.step = 1; M.count = 0; this.binoOn = true; this.ui.showBinoButton(); this.obsSeen ||= new Set(); await this.mochila.give('prismaticos');
        } else if (M.step === 1) await S([`Llevas ${M.count} de ${M.need}. Desde el mirador, gira despacio con los prismáticos: las marcas están en el horizonte.`]);
        else {
          const li = M.montes.map(x => `<li><b>${x.name}</b><i>al ${x.dir}</i><span>${x.altitude.toLocaleString('es')} m · ${Math.round(x.km)} km</span></li>`).join('');
          await infoCard(this.ui, { icon: 'peak', kicker: 'Desde el mirador', title: 'Los montes que se ven', text: 'Estos son los montes que se ven desde aquí. ¡Ya sabes encontrarlos!', extra: `<ul class="peaklist">${li}</ul>`, button: '¡Los recordaré!' });
          await this.complete(M, { card: 'Mirador de ' + this.def.name.split(' /')[0], cardText: 'Desde aquí se ven ' + M.montes.map(x => x.name).join(', ') + '.' });
        }
        return;
      }
      case 'castle': {
        const C = M.castle;
        if (M.step === 0) {
          await S(C.intro);
          M.step = 1; M.count = 0;
          // banderas en las partes del castillo, medidas desde su centro hacia la puerta
          const lm = TOWN.landmarks.find(l => l.kind === 'castle'), c = { x: lm?.x ?? M.host.pos.x, z: lm?.z ?? M.host.pos.z }, g = lm?.spot || { x: c.x, z: c.z + 20 };
          const fx = g.x - c.x, fz = g.z - c.z, fl = Math.hypot(fx, fz) || 1, F = { x: fx / fl, z: fz / fl }, Sd = { x: F.z, z: -F.x }, R = 18 * C.size;
          C.parts.forEach((id, i) => { const p = { ...PARTS[id], ...(C.own[id] || {}) }, want = { x: c.x + (F.x * p.f + Sd.x * p.s) * R, z: c.z + (F.z * p.f + Sd.z * p.s) * R }, s2 = this.spot(want, 5);
            const o = makeItem('flag'); o.position.set(s2.x, terrainHeight(s2.x, s2.z), s2.z); this.scene.add(o); this.items.push({ M, x: s2.x, z: s2.z, obj: o, label: 'Mirar: ' + p.name, kind: 'flag', part: id }); });
          this.ui.toast('Busca las banderas alrededor del castillo', 'castle', 3000);
        } else if (M.step === 1) await S([`Te quedan ${M.need - M.count} partes por ver. ¡Busca las banderas!`]);
        else {
          await S(['¡Ya conoces todas las partes del castillo! Una pregunta de guardián:']);
          const r = await choiceGame(this.ui, { title: 'Guardián del castillo', icon: 'castle', q: CASTLE_QUIZ.q, options: CASTLE_QUIZ.options, answer: CASTLE_QUIZ.answer, why: CASTLE_QUIZ.why });
          if (r && r.win === false) { await S(['¡Casi! Piénsalo otra vez y vuelve a hablar conmigo.']); return; }
          await infoCard(this.ui, { icon: 'castle', kicker: 'Antes y ahora', title: C.title, text: 'Así ha cambiado:', extra: `<div class="antes-ahora"><div><b>Antes</b>${C.then}</div><div><b>Ahora</b>${C.now}</div></div>`, button: 'Seguir' });
          await infoCard(this.ui, { icon: 'castle', kicker: 'Ruta de los castillos', title: 'Castillos de Navarra', text: 'Después de la conquista de Navarra muchos castillos se derribaron. Estos son algunos de los que quedan, en pie o en ruinas:', extra: `<ul class="castlelist">${CASTILLOS.map(([n, t]) => `<li><b>${n}</b> ${t}</li>`).join('')}</ul>`, button: '¡A por ellos!' });
          await this.complete(M, { card: C.title, cardText: C.then });
        }
        return;
      }
      case 'feria': {
        if (M.step === 0) { await S([...FERIA.intro, m.note || '']); M.step = 1; }
        else if (M.step === 1) await S(['Ve a los corrales y mira bien los animales. ¡Luego me cuentas!']);
        else {
          await S(['¿Qué te han parecido? Ahora aprende lo más importante de una feria: cómo se cierra un trato.']);
          const ord = [0, 1, 2].sort(() => this.rnd() - 0.5), D = FERIA.deal;
          const r = await choiceGame(this.ui, { title: 'El trato', icon: 'hand', q: D.q, options: ord.map(i => D.options[i]), answer: ord.indexOf(D.answer), why: D.why });
          if (!r.win) { await S(['¡Casi! Piénsalo otra vez y vuelve a hablar conmigo.']); return; }
          this.player.rig.doAct?.('point', 0.5);
          await infoCard(this.ui, { icon: 'cow', kicker: 'Antes y ahora', title: M.title, text: 'Así han cambiado las ferias de ganado:', extra: `<div class="antes-ahora"><div><b>Antes</b>${FERIA.then}</div><div><b>Ahora</b>${FERIA.now}</div></div>`, button: '¡Trato hecho!' });
          this.mochila.addFood('queso', 1);
          await this.complete(M, { card: M.title, cardText: 'En la feria se compra, se vende y se premia el ganado; el trato se cierra con un apretón de manos.' });
        }
        return;
      }
      case 'figure': {
        const F = M.fig;
        if (M.step === 0) {
          await S([F.hello]);
          for (let i = 0; i < F.pages.length; i++) await infoCard(this.ui, { icon: F.icon, kicker: F.kicker, title: `${F.name}${F.eu ? ' · ' + F.eu : ''}`, text: F.pages[i], badge: F.years, button: i < F.pages.length - 1 ? `Seguir (${i + 1}/${F.pages.length})` : 'Ir a ver su recuerdo' });
          await S([`Su recuerdo está aquí al lado. Acércate y lee la placa: luego te haré una pregunta.`]);
          M.step = 1; M.memo.obj.userData.ring.visible = true;
        } else await S([`Ve al recuerdo de ${F.name}: lo verás con el aro dorado.`]);
        return;
      }
      case 'quiz':
        if (M.step === 0) { await S([`¡Hola, ${name}! Soy quien más sabe de ${d.name}. ¿Aceptas mi reto? Tres preguntas sobre el pueblo y la comarca.`]); M.step = 1; }
        await this.quizRound(M, a, QUIZ_N - M.count);
        if (M.count >= M.need) await this.complete(M, { card: `Sabio de ${d.name}` });
        return;
    }
  }

  // Tarjetas que explican un producto o una tradición: qué es, cómo se hace, y antes/ahora
  async explain(X, title, part) {
    if (!X) return;
    const icon = this.missions.find(M => M.m.product === title || M.m.title === title)?.icon || 'book';
    if (part === 'what') return infoCard(this.ui, { icon, kicker: '¿Qué es?', title, text: X.what, button: 'Entendido' });
    if (part === 'how') return infoCard(this.ui, { icon, kicker: 'Cómo se hace', title, text: X.how, button: '¡Vamos!' });
    return infoCard(this.ui, { icon, kicker: 'Antes y ahora', title, text: 'Así ha cambiado:', extra: `<div class="antes-ahora"><div><b>Antes</b>${X.then}</div><div><b>Ahora</b>${X.now}</div></div>`, button: '¡Lo he aprendido!' });
  }
  // Feria de ganado: corrales con vacas, ovejas y caballos junto al mercado, un puesto y gente mirando
  buildFair(M, hostPos) {
    // un prado llano y despejado a las afueras (los corrales ocupan unos 40 × 14 m)
    const R = this.rnd, P0 = PLACES.plaza; let c = null;
    const clear = (x, z) => { if (waterLevelAt(x, z) > groundHeight(x, z) - 0.3) return false; const h0 = groundHeight(x, z); for (let dx = -22; dx <= 22; dx += 5.5) for (let dz = -8; dz <= 10; dz += 4.5) { const qx = x + dx, qz = z + dz; if (!isFree(qx, qz, 1.5) || this.nearHouses(qx, qz, 9) || Math.abs(groundHeight(qx, qz) - h0) > 2.2 || waterLevelAt(qx, qz) > groundHeight(qx, qz) - 0.3) return false; } return true; };
    for (let r = 45; r <= 170 && !c; r += 12) for (let a = 0; a < 6.28 && !c; a += 0.35) { const x = P0.x + Math.cos(a) * r, z = P0.z + Math.sin(a) * r; if (clear(x, z)) c = { x, z }; }
    c ||= this.spot({ x: hostPos.x - 16, z: hostPos.z + 8 }, 10);
    // el tratante espera junto a la feria
    const hs = this.spot({ x: c.x + 4, z: c.z + 12 }, 3); M.host.setPos?.(hs.x, hs.z, Math.atan2(c.x - hs.x, c.z - hs.z));
    const g = new THREE.Group(); this.scene.add(g);
    const wood = new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.85 }), dark = new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.9 });
    const pens = [];
    [['cow', 4, 11, 8], ['sheep', 7, 8, 6], ['pottoka', 2, 8, 6]].forEach(([kind, n, w, d], i) => {
      const px = c.x + (i - 1) * 13, pz = c.z, y0 = groundHeight(px, pz);
      for (const [x0, z0, x1, z1] of [[-w / 2, -d / 2, w / 2, -d / 2], [w / 2, -d / 2, w / 2, d / 2], [w / 2, d / 2, -w / 2, d / 2], [-w / 2, d / 2, -w / 2, -d / 2]]) {
        const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), mx = px + (x0 + x1) / 2, mz = pz + (z0 + z1) / 2;
        for (const hh of [0.45, 0.95]) { const r_ = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, len), wood); r_.position.set(mx, groundHeight(mx, mz) + hh, mz); r_.rotation.y = ang; r_.castShadow = true; g.add(r_); }
        for (let k = 0; k <= Math.round(len / 2.5); k++) { const t = k / Math.round(len / 2.5), qx = px + x0 + (x1 - x0) * t, qz = pz + z0 + (z1 - z0) * t; const po = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.3, 6), dark); po.position.set(qx, groundHeight(qx, qz) + 0.55, qz); g.add(po); }
        addBox(mx, mz, Math.abs(x1 - x0) + 0.3, Math.abs(z1 - z0) + 0.3, 0);
      }
      const box = { x0: px - w / 2 + 0.8, x1: px + w / 2 - 0.8, z0: pz - d / 2 + 0.8, z1: pz + d / 2 - 0.8 };
      for (let k = 0; k < n; k++) {
        const ax = box.x0 + R() * (box.x1 - box.x0), az = box.z0 + R() * (box.z1 - box.z0);
        const a = this.fauna.add(kind, ax, az, { range: 2, walk: 0.4, run: 1, flee: 0, radius: kind === 'cow' ? 0.8 : 0.45 });
        a.pos.set(ax, groundHeight(ax, az), az); a.home = { x: ax, z: az }; a.bounds = (x, z) => x > box.x0 && x < box.x1 && z > box.z0 && z < box.z1;
      }
      pens.push({ kind, x: px, z: pz });
    });
    // gente de la feria
    const looks = [{ shirt: '#3a4a6a', txapela: '#1d1d24', pants: '#3a3530', hair: '#4a3020', staff: true }, { shirt: '#b5485d', skirt: '#3a3530', pants: '#3a3530', hair: '#2a1a12', bun: true, female: true, basket: true }, { shirt: '#e8e0cc', vest: '#2b2630', pants: '#2b2630', txapela: '#1d1d24', hair: '#bdb6aa', old: true, staff: true }];
    looks.forEach((look, i) => { const s2 = this.spot({ x: c.x + (i - 1) * 9, z: c.z + 7 }, 3); const a = new Actor({ id: 'feria' + i, name: ['Ganadero', 'Vecina', 'Aitona'][i], x: s2.x, z: s2.z, heading: Math.PI, look }, this.scene); this.walkers.push(a); });
    M.fair = { x: c.x, z: c.z, pens, obj: g };
  }
  async judgeFair(M) {
    if (M.judging) return; M.judging = true; this.player.frozen = true;
    try {
      const li = FERIA.breeds.map(([n, t]) => `<li><b>${n}</b><span>${t}</span></li>`).join('');
      await infoCard(this.ui, { icon: 'cow', kicker: 'Concurso de ganado', title: 'Las razas del país', text: 'En las ferias se premia a los mejores animales de las razas de aquí:', extra: `<ul class="tools">${li}</ul>`, button: 'Ser juez' });
      const J = FERIA.judge, ord = [0, 1, 2].sort(() => this.rnd() - 0.5);
      const r = await choiceGame(this.ui, { title: 'Juez por un día', icon: 'cow', q: J.q, options: ord.map(i => J.options[i]), answer: ord.indexOf(J.answer), why: J.why });
      if (r.win) { M.step = 2; this.sound.fanfare?.(); this.ui.toast(`¡Buen ojo! Vuelve con ${M.host.name}`, 'check', 3000); }
    } finally { this.player.frozen = false; setTimeout(() => { M.judging = false; }, 4000); }
  }
  // ---------- Cosas para tocar ----------
  async petAnimal(a) {
    const I = PET[a.kind]; a.state = 'idle'; a.timer = 3; a.heading = Math.atan2(this.player.pos.x - a.pos.x, this.player.pos.z - a.pos.z);
    this.player.heading = Math.atan2(a.pos.x - this.player.pos.x, a.pos.z - this.player.pos.z); this.player.rig.doAct?.('pick', 0.5);
    if (I.sound) this.sound[I.sound]?.(a.pos);
    this.particles.emit({ x: a.pos.x, y: a.pos.y + 1.3, z: a.pos.z }, { n: 8, color: ['#ff6b8a', '#ffd1dc'], speed: 0.8, size: 0.22, life: 1 });
    this.mochila?.gain(3);
    const fid = { sheep: 'oveja', cow: 'vaca', pottoka: 'pottoka', goat: 'cabra', pig: 'cerdo' }[a.kind];
    if (addCard('granja:' + a.kind)) { if (fid) addCard('fauna:' + fid); this.player.frozen = true; try { if (fid) await showFicha('fauna:' + fid, { ui: this.ui, kicker: 'Animales de la granja · ficha de fauna', badge: 'Nueva carta', button: '¡Qué suave!' }); else await infoCard(this.ui, { icon: I.icon, kicker: 'Animales de la granja', title: I.title, text: I.fact, badge: 'Nueva carta', button: '¡Qué suave!' }); } finally { this.player.frozen = false; } }
    else this.ui.toast(`A ${I.name} le gusta que la acaricies`, I.icon, 1800);
  }
  async ringBell() {
    if (this.bellT && this.elapsed - this.bellT < 6) return; this.bellT = this.elapsed;
    this.sound.churchBell?.(3); this.player.rig.doAct?.('point', 0.6);
    const ch = TOWN.church; this.particles.emit({ x: ch.door.x, y: groundHeight(ch.door.x, ch.door.z) + 6, z: ch.door.z }, { n: 16, color: ['#FFD700', '#ffffff'], speed: 1.4, size: 0.3, life: 1.4 });
    if (addCard('pueblo:campanas')) { this.player.frozen = true; try { await new Promise(r => setTimeout(r, 1200)); await infoCard(this.ui, { icon: 'bell', kicker: 'Tradiciones', title: BELL.title, text: BELL.fact, badge: 'Nueva carta', button: '¡Ding, dong!' }); } finally { this.player.frozen = false; } }
  }
  async restBench(b) {
    this.player.frozen = true; this.player.place(b.x, b.z, b.ry + Math.PI); this.follow.snap?.(this.player);
    try {
      this.ui.whisper(BENCH_LINES[Math.floor(this.rnd() * BENCH_LINES.length)], 3800);
      await new Promise(r => setTimeout(r, 2600));
      this.mochila?.gain(25); this.ui.toast('Has descansado: +25 de energía', 'energy', 2000);
    } finally { this.player.frozen = false; }
  }
  // Lo que se gana al terminar: comida del producto y equipo nuevo
  async afterComplete(M) {
    const f = M.type === 'process' ? foodFrom(M.m.product) : M.type === 'harvest' ? foodFrom(M.m.crop) : null;
    if (f) this.mochila.addFood(f, 2);
    if (M.type === 'summit') await this.mochila.give('baston');
    if (M.type === 'legend' || (M.type === 'carnival' && M.night)) await this.mochila.give('farol');
    const total = Object.values(this.P.towns || {}).reduce((n, t) => n + Object.keys(t.done || {}).length, 0);
    if (total >= 5) await this.mochila.give('brujula');
  }
  // ---------- Recuerdo de un personaje: placa, pregunta y su huella hoy ----------
  async doMemorial(M) {
    const F = M.fig;
    if (M.step !== 1 || M.done) { await infoCard(this.ui, { icon: F.icon, kicker: F.kicker, title: F.name, text: `${F.years}. ${F.today}`, button: 'Seguir explorando' }); return; }
    this.player.frozen = true; this.mode = 'mini';
    let ok = false;
    try {
      this.player.heading = Math.atan2(M.memo.x - this.player.pos.x, M.memo.z - this.player.pos.z);
      const ord = F.q.options.map((_, i) => i).sort(() => this.rnd() - 0.5);
      const r = await choiceGame(this.ui, { title: `La placa de ${F.name}`, icon: F.icon, q: F.q.q, options: ord.map(i => F.q.options[i]), answer: ord.indexOf(F.q.answer), why: F.q.why });
      ok = r.win;
    } finally { this.player.frozen = false; this.mode = 'play'; }
    if (!ok) { this.ui.toast('Vuelve a leer la historia: habla otra vez y prueba de nuevo', F.icon, 3200); M.step = 0; M.memo.obj.userData.ring.visible = false; return; }
    M.memo.obj.userData.ring.visible = false;
    this.player.rig.doCheer();
    await infoCard(this.ui, { icon: F.icon, kicker: 'Su huella hoy', title: F.name, text: F.today, badge: F.women ? 'Mujeres de Navarra' : 'Personajes de Navarra', button: '¡Lo recordaré!' });
    await this.complete(M, { card: F.name, cardText: F.today });
  }

  // ---------- Recoger objetos ----------
  startGather(M, kind, label, near) {
    M.step = 1; M.count = 0;
    const P = PLACES, lm = (k) => TOWN.landmarks.find(l => l.kind === k);
    const c = near === 'farm' ? (TOWN.farm || P.farm) : near === 'cave' ? (lm('cave')?.spot || P.forest) : near === 'river' ? P.riverSpot : near === 'forest' ? P.forest : near === 'church' ? P.church : P[near] || (M.type === 'harvest' ? P.fields : P.market);
    const R = M.type === 'harvest' ? 28 : 26;
    for (let i = 0; i < M.need; i++) {
      const a = (i / M.need) * Math.PI * 2 + this.rnd() * 0.6, r = 6 + this.rnd() * R;
      const s = this.spot({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r }, 4, true);
      const o = makeItem(kind); o.position.set(s.x, terrainHeight(s.x, s.z), s.z); this.scene.add(o);
      this.items.push({ M, x: s.x, z: s.z, obj: o, label: label.split(' (')[0] || 'Recoger', kind });
    }
    this.ui.toast(`${this.stepText(M)}`, M.icon);
  }
  pick(it) {
    const M = it.M;
    this.items = this.items.filter(x => x !== it); this.scene.remove(it.obj);
    if (!M) { this.player.rig.doAct('pick', 0.6); this.sound.ui('coin'); this.mochila.addFood(it.food); return; }
    if (it.part != null) {
      const C = M.castle, p = { ...PARTS[it.part], ...(C.own[it.part] || {}) }; this.sound.magic?.(); M.count++;
      if (M.count >= M.need) M.step = 2;
      this.player.frozen = true;
      infoCard(this.ui, { icon: p.icon || 'castle', kicker: `${C.title} · ${M.count} de ${M.need}`, title: p.name, text: p.text, badge: addCard('castillo:' + p.name) ? 'Nueva carta' : '', button: M.count >= M.need ? `¡Hecho! Vuelve con ${M.host.name}` : 'Seguir buscando' }).finally(() => { this.player.frozen = false; });
      return;
    }
    if (it.find != null) {
      const st = M.site, [, name, text] = st.finds[it.find]; this.player.rig.doAct('pick', 0.8); this.sound.magic?.(); M.count++;
      this.particles.emit({ x: it.x, y: terrainHeight(it.x, it.z) + 0.3, z: it.z }, { n: 20, color: ['#c9a46a', '#8a6a45'], speed: 1.2, size: 0.25, life: 1 });
      if (M.count >= M.need) M.step = 2;
      this.player.frozen = true;
      infoCard(this.ui, { icon: st.icon, kicker: `Hallazgo ${M.count} de ${M.need}`, title: name, text, badge: addCard(st.landmark + ':' + name) ? 'Nueva carta' : '', button: M.count >= M.need ? `¡Hecho! Vuelve con ${M.host.name}` : 'Seguir excavando' }).finally(() => { this.player.frozen = false; });
      return;
    }
    this.player.rig.doAct('pick', 0.6);
    this.particles.emit({ x: it.x, y: terrainHeight(it.x, it.z) + 0.5, z: it.z }, { n: 24, color: ['#ffe38a', '#ffffff'], speed: 2.2, size: 0.28, life: 0.9 });
    this.sound.ui('coin');
    M.count++;
    this.ui.toast(`${this.stepText(M)}`, M.icon, 1800);
    if (M.count >= M.need) { M.step = 2; this.sound.magic(); this.ui.toast(`¡Ya está! Vuelve con ${M.host.name}`, 'check', 3200); }
  }

  // ---------- Visitar lugares ----------
  startVisit(M) {
    M.step = 1; M.count = 0;
    const ch = TOWN.church;
    M.places[0].at = ch?.door || PLACES.church;
    for (let k = 1; k < M.places.length; k++) { const l = TOWN.landmarks[k - 1]; M.places[k].at = l?.spot || PLACES.plaza; }
  }
  checkArrival() {
    const P = this.player.pos;
    for (const M of this.missions) {
      if (M.done) continue;
      if (M.type === 'visit' && M.step === 1 && this.mode === 'play' && !this.ui.busy) {
        for (const p of M.places) if (!p.seen && Math.hypot(P.x - p.at.x, P.z - p.at.z) < (p.kind === 'church' ? 8 : 9)) { p.seen = true; this.showPlace(M, p); break; }
      }
      if (M.type === 'feria' && M.step === 1 && M.fair && this.mode === 'play' && !this.ui.busy && Math.hypot(P.x - M.fair.x, P.z - M.fair.z) < 9) this.judgeFair(M);
      if (M.type === 'dance' && M.step === 1 && this.mode === 'play' && !this.ui.busy && Math.hypot(P.x - this.plazaStage().x, P.z - this.plazaStage().z) < 5) this.startDance(M);
    }
  }
  async showPlace(M, p) {
    M.count++;
    const kicker = p.kind === 'church' ? (p.label || { romanesque: 'Arte románico', gothic: 'Arte gótico', baroque: 'Arte barroco', fortress: 'Iglesia-fortaleza', cathedral: 'Catedral', pamplona: 'Catedral' }[p.style] || 'Iglesia') : 'Patrimonio de ' + this.def.name;
    const isNew = addCard(this.def.id + ':' + p.name, 'arquitectura');
    this.sound.magic();
    await infoCard(this.ui, { icon: p.kind === 'church' ? (p.style === 'cathedral' || p.style === 'pamplona' ? 'cathedral' : p.style === 'fortress' ? 'castle' : 'church') : p.kind, kicker, title: p.name, text: p.text, badge: isNew ? 'Nueva carta' : '', button: M.count >= M.need ? `¡Hecho! Vuelve con ${M.host.name}` : `Seguir (${M.count}/${M.need})` });
    if (M.count >= M.need) M.step = 2;
    saveProfile();
  }

  // ---------- Rebaño ----------
  startHerd(M) {
    M.step = 1; M.count = 0;
    const pen = TOWN.pen;
    const kind = ANIMAL[M.m.animal]?.[1] || 'sheep';
    let pool = this.fauna.animals.filter(a => a.kind === kind && Math.hypot(a.pos.x - pen.x, a.pos.z - pen.z) < 160);
    if (pool.length < M.need) pool = this.fauna.animals.filter(a => a.kind === 'sheep');
    this.herd = pool.slice(0, M.need);
    // colocar el rebaño a una distancia razonable del redil
    this.herd.forEach((s, i) => {
      const a = i / this.herd.length * 1.6 - 0.8, sp = this.spot({ x: pen.x + Math.sin(a) * 18, z: pen.z + pen.d / 2 + 16 + Math.cos(a) * 6 }, 4);
      s.follow = null; s.pos.set(sp.x, groundHeight(sp.x, sp.z), sp.z); s.home = { x: sp.x, z: sp.z }; s.range = 4; s.fleeDist = kind === 'cow' ? 5 : 4.2; s.run = kind === 'cow' ? 2.4 : 2.8; s.herd = true; s.penned = false; s.bounds = null;
    });
    this.herdM = M;
  }
  updateHerd(dt) {
    const pen = TOWN.pen, M = this.herdM;
    const inPen = (s) => Math.abs(s.pos.x - pen.x) < pen.w / 2 - 0.6 && Math.abs(s.pos.z - pen.z) < pen.d / 2 - 0.6;
    let n = 0;
    for (const s of this.herd) {
      if (!s.penned && inPen(s)) {
        // ya dentro: entra caminando tranquilo hacia el centro y luego pasta por el redil (el cercado es un poco más
        // amplio que la zona en la que cuenta como dentro, para que no se quede atrapado en el borde)
        s.penned = true; s.fleeDist = 0; s.home = { x: pen.x, z: pen.z }; s.range = Math.max(1, Math.min(pen.w, pen.d) / 2 - 1.6);
        s.state = 'walk'; s.timer = 6; s.target = { x: pen.x + (Math.random() - 0.5) * pen.w * 0.4, z: pen.z + (Math.random() - 0.5) * pen.d * 0.4 };
        s.bounds = (X, Z) => Math.abs(X - pen.x) < pen.w / 2 - 0.35 && Math.abs(Z - pen.z) < pen.d / 2 - 0.35;
        if (s.kind === 'cow') this.sound.moo(s.pos); else if (s.kind === 'pig') this.sound.oink?.(s.pos); else this.sound.baa(s.pos);
        this.sound.ui('coin'); this.particles.emit({ x: s.pos.x, y: s.pos.y + 1.2, z: s.pos.z }, { n: 12, color: '#ffe38a', speed: 1.5, size: 0.25 });
      }
      if (s.penned) n++;
    }
    if (n !== M.count) { M.count = n; this.ui.toast(this.stepText(M), M.icon, 1500); }
    if (n >= this.herd.length) { this.herd = null; M.step = 2; this.sound.magic(); this.ui.toast(`¡Todos en el redil! Vuelve con ${M.host.name}`, 'check', 3000); }
  }

  // Frase del narrador al empezar cada misión
  hook(M) {
    const town = this.def.name.split(' /')[0], m = M.m, c = this.comarca?.name || 'Navarra';
    const H = {
      visit: `Cada piedra de ${town} guarda un secreto… ¿serás capaz de descubrirlos todos?`,
      process: `Dicen que la receta de ${m.product ? m.product.toLowerCase() : 'este pueblo'} pasa de abuelas a nietos… y que nunca se ha escrito en ningún libro.`,
      harvest: `La tierra de ${c} esconde su tesoro. Sólo hay que saber dónde mirar.`,
      herd: 'Cuando cae la tarde, el rebaño se dispersa por el monte… y alguien tiene que traerlo de vuelta.',
      dance: 'Cuando suena el txistu, hasta las piedras de la plaza tienen ganas de bailar.',
      carnival: 'Algo se mueve entre las casas… se oyen cencerros, pero no se ve a nadie.',
      trade: 'Las manos de quien trabaja un oficio cuentan historias que no están en los libros.',
      race: 'El camino te espera. Muchos lo han recorrido antes que tú… ¿llegarás a tiempo?',
      observe: 'Desde lo alto, alguien te está mirando. Levanta la vista… y aprende a ver.',
      tradition: 'Una tradición muy antigua… si nadie la recuerda, se perderá para siempre.',
      figure: `Hay personas que cambiaron ${town}… y su historia todavía se puede escuchar.`,
      quiz: `El sabio de ${town} guarda las respuestas… y sólo las comparte con quien sabe escuchar.`,
    };
    return H[M.type];
  }
  // ---------- Subida al monte ----------
  startSummit(M) {
    M.step = 1; M.count = 0;
    for (const c of M.cairns || []) this.scene.remove(c.obj);
    // la cima: el punto más alto a una distancia razonable del pueblo
    const P = PLACES.plaza, h0 = M.host.pos;
    let best = null, bh = -1e9;
    for (let r = 90; r <= 300; r += 15) for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
      if (Math.abs(x) > 440 || Math.abs(z) > 440 || waterLevelAt(x, z) > groundHeight(x, z) - 0.2) continue;
      if (this.nearHouses(x, z, 35)) continue;
      const h = terrainHeight(x, z) - r * 0.02;
      if (h > bh) { bh = h; best = { x, z }; }
    }
    const top = this.spot(best, 6);
    M.cairns = [];
    const n = M.need;
    for (let i = 1; i <= n; i++) {
      const t = i / n, jig = i < n ? (i % 2 ? 1 : -1) * 8 : 0;
      const dx = top.x - h0.x, dz = top.z - h0.z, l = Math.hypot(dx, dz) || 1;
      const s = i < n ? this.spot({ x: h0.x + dx * t - dz / l * jig, z: h0.z + dz * t + dx / l * jig }, 4) : top;
      const o = makeCairn(i === n); o.position.set(s.x, groundHeight(s.x, s.z), s.z); o.rotation.y = Math.atan2(dx, dz); this.scene.add(o);
      M.cairns.push({ x: s.x, z: s.z, obj: o, top: i === n });
    }
    // señales pintadas junto a los mojones: sigue, una X en un ramal equivocado y un giro
    for (const o of M.signs || []) this.scene.remove(o);
    M.signs = [];
    const dx0 = top.x - h0.x, dz0 = top.z - h0.z, l0 = Math.hypot(dx0, dz0) || 1, px = -dz0 / l0, pz = dx0 / l0, ang = Math.atan2(dx0, dz0);
    const put = (kind, x, z, face) => { const s = this.spot({ x, z }, 2); const o = makeTrailSign(kind); o.position.set(s.x, groundHeight(s.x, s.z), s.z); o.rotation.y = face; this.scene.add(o); M.signs.push(o); };
    M.cairns.forEach((c, i) => { if (c.top || i > 2) return; const k = ORIENTA[i].kind;
      put(k === 'mal' ? 'sigue' : k, c.x + px * 1.8, c.z + pz * 1.8, ang + Math.PI);
      if (k === 'mal') put('mal', c.x - px * 9 + dx0 / l0 * 2, c.z - pz * 9 + dz0 / l0 * 2, ang + Math.PI - 0.9); });
    // al empezar la subida, ya fuera del pueblo: el poste indicador con la cima (altitud, distancia y desnivel reales
    // de la ruta) y la vuelta al pueblo; y por el camino, balizas de madera con las dos franjas cada pocos metros
    for (const o of M.posts || []) { this.scene.remove(o); o.userData.dispose?.(); }
    M.posts = [];
    try {
      const pk = M.peak || {}, trail = []; let t0 = null;
      for (let t = 0.04; t <= 0.97; t += 0.01) { const x = h0.x + dx0 * t, z = h0.z + dz0 * t; if (!this.nearHouses(x, z, 14)) { t0 = t; break; } }
      if (t0 != null) {
        const sx = h0.x + dx0 * t0 + px * 2.2, sz = h0.z + dz0 * t0 + pz * 2.2, sp = this.spot({ x: sx, z: sz }, 2);
        const info = [pk.distance ? `${String(pk.distance).replace('.', ',')} km` : '', pk.gain ? `+${pk.gain} m de subida` : ''].filter(Boolean).join(' · ');
        const post = makeSignpost({ peak: pk.name || 'Cima', alt: pk.altitude, info, town: this.def.name.split(' /')[0] });
        post.position.set(sp.x, groundHeight(sp.x, sp.z), sp.z); post.rotation.y = ang + 0.7; this.scene.add(post); M.posts.push(post);   // (algo girado: se lee al llegar)
        // balizas: a un lado del camino, cada 12 m, sin pisar los mojones
        const L = l0 * (1 - t0); for (let d = 10; d < L - 6; d += 12) {
          const t = t0 + d / l0, side = (Math.round(d / 12) % 2 ? 1 : -1) * 1.6, x = h0.x + dx0 * t + px * side, z = h0.z + dz0 * t + pz * side;
          if (M.cairns.some(c => Math.hypot(c.x - x, c.z - z) < 4) || waterLevelAt(x, z) > groundHeight(x, z) - 0.2) continue;
          trail.push([x, groundHeight(x, z) - 0.05, z, ang + Math.PI]);
        }
        if (trail.length) { const b = makeBalizas(trail); this.scene.add(b); M.posts.push(b); }
      }
    } catch (e) { console.warn('señales del monte', e); }
    M.tipT = 25; M.tips = MONTE_TIPS.map((_, i) => i).sort(() => this.rnd() - 0.5);
    M.y0 = this.player.pos.y;
    this.spawnClimbFauna(M, top);
    this.ui.toast('Sigue los mojones blancos y amarillos', 'peak', 2800);
  }
  nearHouses(x, z, d) { for (const h of TOWN.houses) { const p = h.door || h; if (p && Math.abs(p.x - x) < d && Math.abs(p.z - z) < d) return true; } return Math.hypot(x - PLACES.plaza.x, z - PLACES.plaza.z) < d * 1.4; }
  // Animales del monte en la subida: aparecen junto a los mojones; acercándose despacio se descubren
  spawnClimbFauna(M, top) {
    if (M.wild) return;
    const fam = this.def.family, pyr = /Pirineo/.test(M.peak.zone || '');
    const kinds = fam === 'ribera' ? ['zorro', 'jabali', 'corzo'] : fam === 'central' ? ['corzo', 'jabali', 'zorro'] : ['corzo', 'zorro', 'ciervo'];
    const OPT = { corzo: { walk: 0.7, run: 6, radius: 0.35 }, zorro: { walk: 0.9, run: 6, radius: 0.3 }, ciervo: { walk: 0.8, run: 6.5, radius: 0.5 }, jabali: { walk: 0.7, run: 5, radius: 0.45 } };
    // por el camino, a partir del tramo que ya sale del pueblo (lejos de las casas)
    const h0 = M.host.pos, path = [];
    for (let t = 0.2; t <= 0.92; t += 0.02) { const x = lerp(h0.x, top.x, t), z = lerp(h0.z, top.z, t); if (!this.nearHouses(x, z, 22)) path.push({ x, z, t }); }
    const dx = top.x - h0.x, dz = top.z - h0.z, l = Math.hypot(dx, dz) || 1;
    M.wild = kinds.map((k, i) => {
      const q = path.length ? path[Math.min(path.length - 1, Math.floor((i + 0.6) / kinds.length * path.length))] : { x: lerp(h0.x, top.x, 0.4 + i * 0.18), z: lerp(h0.z, top.z, 0.4 + i * 0.18) }, side = i % 2 ? 1 : -1;
      const sp = this.spot({ x: q.x - dz / l * side * 9, z: q.z + dx / l * side * 9 }, 4, true);
      const a = this.fauna.add(k, sp.x, sp.z, { id: k, range: 5, flee: 5, ...OPT[k] });
      this.fauna.wild?.push(a);
      return { id: k, a, found: false };
    });
    // rapaz planeando sobre la cumbre
    const rk = pyr ? 'quebrantahuesos' : M.peak.id.length % 2 ? 'aguila' : 'buitre';
    const o = bird(rk); o.scale.setScalar(1.4); this.scene.add(o);
    const ty = terrainHeight(top.x, top.z);
    this.fauna.vultures?.push({ obj: o, c: new THREE.Vector3(top.x, ty + 22, top.z), r: 16, a: 0, w: 0.22, id: rk, pos: o.position, flapK: o.userData.flap });
    M.raptor = rk;
  }
  async discoverClimb(M, w) {
    w.found = true; this.sound.magic?.();
    const F = FAUNA[w.id], n = M.wild.filter(x => x.found).length;
    const isNew = addCard('fauna:' + w.id);
    this.player.frozen = true;
    try { await showFicha('fauna:' + w.id, { ui: this.ui, kicker: `Animal del monte · ${n} de ${M.wild.length}`, badge: isNew ? 'Nueva carta' : '', button: 'Seguir subiendo' }); await this.mochila.give('cuaderno'); }
    finally { this.player.frozen = false; }
  }
  updateSummit(M, dt = 1 / 60) {
    if (this.mode !== 'play' || this.ui.busy) return;
    // un consejo de montaña cada rato mientras se sube (sin repetir)
    if (M.tips?.length && !M.done && (M.tipT -= dt) <= 0) { M.tipT = 38; const k = M.tips.shift(); this.ui.whisper?.(MONTE_TIPS[k], 7000); }
    for (const w of M.wild || []) if (!w.found && w.a.obj.visible && Math.hypot(w.a.pos.x - this.player.pos.x, w.a.pos.z - this.player.pos.z) < 11) { this.discoverClimb(M, w); return; }
    const c = M.cairns.find(c => !c.reached); if (!c) return;
    if (Math.hypot(c.x - this.player.pos.x, c.z - this.player.pos.z) > (c.top ? 4.5 : 4)) return;
    c.reached = true; M.count++; this.sound.ui('coin');
    this.particles.emit({ x: c.x, y: groundHeight(c.x, c.z) + 1.5, z: c.z }, { n: 20, color: ['#ffffff', '#FFD700'], speed: 1.6, size: 0.25 });
    const pk = M.peak, climbed = Math.max(0, Math.round(this.player.pos.y - M.y0));
    const lines = [pk.route, pk.terrain, `Ya has subido ${climbed} metros. Mira hacia abajo: el pueblo se ve cada vez más pequeño.`];
    if (!c.top) { this.ui.toast(this.stepText(M), 'peak', 1600); this.orientCard(M, M.count - 1, lines[M.count - 1]); }
    else this.reachSummit(M, climbed);
  }
  // en cada mojón: cómo se leen las señales del monte y un consejo de orientación
  async orientCard(M, i, line) {
    const O = ORIENTA[i]; if (!O) { if (line) this.ui.whisper(line, 5200); return; }
    this.player.frozen = true;
    try {
      if (O.ask) {
        const opts = ['Camino equivocado: por ahí no', 'Hay una fuente cerca', 'Es la mitad de la subida'], ord = [0, 1, 2].sort(() => this.rnd() - 0.5);
        await choiceGame(this.ui, { title: 'Señales del monte', icon: 'compass', q: 'Junto a este mojón, en un ramal del camino, hay una piedra con una X pintada en blanco y amarillo. ¿Qué significa?', options: ord.map(k => opts[k]), answer: ord.indexOf(0), why: O.text });
      } else await infoCard(this.ui, { image: signSVG(O.kind), kicker: 'Señales del monte', title: O.title, text: O.text, button: 'Seguir subiendo' });
      const tip = ORIENTA_TIPS[i]; if (tip) this.ui.whisper(tip, 6500);
      else if (line) this.ui.whisper(line, 5200);
    } finally { this.player.frozen = false; }
  }
  // ¿lleva la mochila lo necesario para el monte? agua y dos alimentos
  supplyOk() { const b = this.P.bag || {}; return (b.agua || 0) >= 1 && Object.values(b.food || {}).reduce((a, n) => a + n, 0) >= 2; }
  supplyText() { const b = this.P.bag || {}, n = Object.values(b.food || {}).reduce((a, k) => a + k, 0); return `${(b.agua || 0) >= 1 ? 'agua ✓' : 'agua'} · comida ${Math.min(2, n)}/2`; }
  // Puesto de productos del pueblo: pan, queso y miel (gratis para quien va al monte)
  spawnStall() {
    if (this.stall) return;
    const P = PLACES, c = this.spot({ x: (P.market || P.plaza).x + 5, z: (P.market || P.plaza).z - 4 }, 4);
    const o = makeStall(); o.position.set(c.x, groundHeight(c.x, c.z), c.z); o.rotation.y = Math.atan2(P.plaza.x - c.x, P.plaza.z - c.z); this.scene.add(o);
    const s2 = this.spot({ x: c.x + Math.sin(o.rotation.y + Math.PI) * 1.6, z: c.z + Math.cos(o.rotation.y + Math.PI) * 1.6 }, 2);
    const a = new Actor({ id: 'tendera', name: 'Tendera', x: s2.x, z: s2.z, heading: o.rotation.y, look: { shirt: '#c0573a', apron: '#f4f1ea', skirt: '#3a3530', pants: '#3a3530', hair: '#4a3020', bun: true, female: true } }, this.scene);
    this.walkers.push(a); a.stall = true;
    this.stall = { x: c.x, z: c.z, obj: o, a, given: {} };
  }
  async buyStall() {
    const S = this.stall, a = S.a; this.player.frozen = true;
    try {
      const fam = this.def.family, list = [['pan', 'Pan de horno de leña, del obrador del pueblo.'], ['queso', fam === 'ribera' ? 'Queso de oveja de la Bardena.' : 'Queso de oveja latxa, de un pastor del valle.'], ['miel', 'Miel de las colmenas del monte: brezo y flores silvestres.']];
      const left = list.filter(([k]) => !S.given[k]);
      if (!left.length) { await this.say(a, ['¡Ya llevas de todo! Que tengas buena subida.']); return; }
      await this.say(a, ['¡Egun on! Aquí todo es de aquí: lo hacen vecinos del pueblo.', 'Para el monte, coge lo que quieras.']);
      for (const [k, why] of left) { S.given[k] = true; this.mochila.addFood(k, 1); await infoCard(this.ui, { icon: FOOD[k].icon, kicker: 'Producto local', title: FOOD[k].name, text: `${why} ${FOOD[k].fact}`, button: 'A la mochila' }); }
      if (!this.supplyOk()) this.ui.toast('Te falta agua: llena la cantimplora en la fuente', 'canteen', 3200);
      else this.ui.toast('¡Mochila lista! Vuelve con tu guía de montaña', 'backpack', 3200);
    } finally { this.player.frozen = false; a.talking = 0; }
  }
  async reachSummit(M, climbed) {
    const pk = M.peak, P = this.player;
    this.player.frozen = true; this.player.rig.doCheer(); this.sound.fanfare?.(); this.particles.confetti?.(P.pos, 90);
    // vista panorámica desde la cumbre
    const c0 = new THREE.Vector3(P.pos.x, P.pos.y, P.pos.z);
    this.follow.cinematic = { pos: new THREE.Vector3(c0.x + 9, c0.y + 5, c0.z + 9), look: new THREE.Vector3(PLACES.plaza.x, terrainHeight(PLACES.plaza.x, PLACES.plaza.z), PLACES.plaza.z), t: 0 };
    this.ui.whisper(`¡Cima! ${pk.name}, ${pk.altitude.toLocaleString('es')} m`, 3500);
    await new Promise(r => setTimeout(r, 2600));
    if (!this.P.peaks.includes(pk.id)) this.P.peaks.push(pk.id);
    saveProfile();
    await infoCard(this.ui, { icon: 'peak', kicker: `Buzón de cumbre · ${pk.zone}`, title: `${pk.name}${pk.altName ? ' · ' + pk.altName : ''}`, text: `${pk.intro} Altitud: ${pk.altitude.toLocaleString('es')} m. Desde ${pk.start}: ${String(pk.distance).replace('.', ',')} km y ${pk.gain} m de desnivel. En el juego has subido ${climbed} m.`, badge: 'Cima conseguida', button: 'Mirar alrededor' });
    await this.panorama(M, c0);
    // almuerzo en la cima, como los pastores
    const b = this.P.bag?.food || {}, eat = ['queso', 'pan', 'miel', 'txistorra', 'manzana', 'avellanas', 'moras'].filter(k => b[k] > 0).slice(0, 2);
    if (eat.length) { eat.forEach(k => this.mochila.eat(k)); await infoCard(this.ui, { icon: FOOD[eat[0]].icon, kicker: 'Almuerzo en la cima', title: eat.map(k => FOOD[k].name).join(' y '), text: 'Sentado en la cumbre, con el valle a tus pies, el almuerzo sabe mejor. ¡Energía recuperada para bajar! Recuerda: la bajada cansa las rodillas, ve despacio.', button: '¡Qué rico!' }); }
    this.follow.cinematic = null; this.follow.snap(P); this.player.frozen = false;
    await this.complete(M, { card: pk.name, cardText: pk.intro });
  }

  // Navarra desde la cima: la cámara gira hacia cada pueblo (dirección real desde el monte) y lo nombra;
  // luego la rapaz que vuela sobre la cumbre y la lista de lo que se ve
  async panorama(M, c0) {
    const pk = M.peak, list = pk.lat ? viewFrom(pk.lat, pk.lon) : [];
    const C = this.follow.cinematic; if (!C) return;
    const eye = new THREE.Vector3(c0.x, c0.y + 5, c0.z);
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    for (const v of list) {
      const b = v.bearing * Math.PI / 180, dx = Math.sin(b), dz = -Math.cos(b);
      C.pos = eye.clone().add(new THREE.Vector3(-dx * 5, 0, -dz * 5));
      C.look = new THREE.Vector3(c0.x + dx * 140, c0.y - 22, c0.z + dz * 140);
      this.ui.whisper(`Al ${v.dir}: ${v.name.split(' /')[0]} · ${v.km < 10 ? v.km.toFixed(1).replace('.', ',') : Math.round(v.km)} km`, 2300);
      await wait(2600);
    }
    if (M.raptor) {
      const F = FAUNA[M.raptor], isNew = addCard('fauna:' + M.raptor);
      C.look = new THREE.Vector3(c0.x, c0.y + 22, c0.z); C.pos = eye.clone().add(new THREE.Vector3(6, -0.5, 6));
      await wait(1800);
      await infoCard(this.ui, { icon: F.icon, kicker: 'Sobre la cumbre', title: `${F.name} · ${F.eu}`, text: `${F.look} ${F.fact}`, badge: isNew ? 'Nueva carta' : '', button: 'Seguir mirando' });
    }
    if (list.length) {
      const li = list.map(v => `<li><b>${v.name}</b><i>al ${v.dir}</i><span>${v.km < 10 ? v.km.toFixed(1).replace('.', ',') : Math.round(v.km)} km${v.inGame ? ' · está en el juego' : ''}</span></li>`).join('');
      const seen = (M.wild || []).filter(w => w.found).map(w => FAUNA[w.id].name.toLowerCase());
      await infoCard(this.ui, { icon: 'compass', kicker: 'Navarra desde arriba', title: `Desde ${pk.name}`, text: `Desde una cima se entiende cómo es Navarra: valles, sierras, ríos y pueblos unidos por caminos.${seen.length ? ` En la subida has descubierto: ${seen.join(', ')}.` : ''} Con el día despejado, desde la cima real verías:`, extra: `<ul class="tools">${li}</ul>`, button: '¡Firmar en el buzón!' });
    }
  }

  // ---------- Noche y leyendas ----------
  isNight() { const t = this.sky?.time ?? 12; return t > 20.4 || t < 6.1; }
  // Ofrece esperar a que anochezca: fundido, la luna sale y empieza la parte nocturna
  async offerNight(a, text, then) {
    let wait = false;
    await this.say(a, [{ text, choices: ['Esperar a que anochezca', 'Todavía no'], onChoice: (j) => { wait = j === 0; return []; } }]);
    if (!wait) { this.ui.toast('Vuelve cuando quieras: al caer la noche empezará la búsqueda', 'moon', 3200); return; }
    this.player.frozen = true;
    await this.ui.fadeOut();
    this.sky.time = 21.9;
    await new Promise(r => setTimeout(r, 500));
    await this.ui.fadeIn();
    this.player.frozen = false;
    this.sound.owl?.(this.player.pos);
    this.ui.whisper?.(`Cae la noche sobre ${this.def.name.split(' /')[0]}…`, 3200);
    then();
  }
  // Pistas de la leyenda: se encienden de noche, camino de la guarida
  startLegend(M) {
    const L = M.leg; M.step = M.count >= M.need ? 3 : 2;
    const P = PLACES, lm = (k) => TOWN.landmarks.find(l => l.kind === k);
    const lairP = L.lair === 'cave' ? (lm('cave')?.spot || P.forest) : L.lair === 'river' ? (lm('bridge')?.spot || P.riverSpot || P.forest) : P.forest || P.edgeN;
    M.lair = this.spot(lairP, 6);
    for (const k of this.clues.filter(c => c.M === M)) this.scene.remove(k.obj);
    this.clues = this.clues.filter(c => c.M !== M);
    const from = { x: M.host.pos.x, z: M.host.pos.z };
    L.clues.forEach((c, i) => {
      const t = (i + 1) / (L.clues.length + 1);
      const side = (i % 2 ? 1 : -1) * (5 + this.rnd() * 5);
      const dx = M.lair.x - from.x, dz = M.lair.z - from.z, len = Math.hypot(dx, dz) || 1;
      const s = this.spot({ x: from.x + dx * t - dz / len * side, z: from.z + dz * t + dx / len * side }, 4, L.lair !== 'river');
      const o = makeClue(L.clueKind, L.color); o.position.set(s.x, terrainHeight(s.x, s.z), s.z); o.rotation.y = Math.atan2(dx, dz); this.scene.add(o);
      this.clues.push({ M, i, x: s.x, z: s.z, obj: o, text: c.text, found: i < M.count });
    });
    this.clues.forEach(k => { if (k.found) k.obj.visible = false; });
    this.ui.toast('Busca las luces en la oscuridad', 'legend', 3000);
  }
  async examineClue(k) {
    const M = k.M; k.found = true;
    this.player.rig.doAct('pick', 0.6);
    this.particles.emit({ x: k.x, y: terrainHeight(k.x, k.z) + 0.6, z: k.z }, { n: 30, color: [M.leg.color, '#ffffff'], speed: 1.6, size: 0.3, life: 1.4 });
    this.sound.magic();
    k.obj.userData.fade = 1;
    M.count++;
    this.ui.whisper?.(k.text, 5200);
    if (M.count >= M.need) {
      M.step = 3;
      setTimeout(() => this.ui.toast(`Las pistas llevan hasta aquí… ${M.leg.creature} está cerca`, 'legend', 3600), 2400);
    } else this.ui.toast(this.stepText(M), 'legend', 1800);
  }
  // Aparición: sólo de noche y cuando ya has seguido todas las pistas
  showCreature(M) {
    const look = FOLK[M.m.who] || FOLK.basajaun;
    if (!M.creature) {
      const s = M.lair;
      const myth = MYTHS[M.m.who] ? M.m.who : null;   // con el cuerpo de los personajes nuevos y su traje de leyenda
      const a = new Actor({ id: 'c' + M.i, name: M.leg.creature, x: s.x, z: s.z, heading: Math.atan2(this.player.pos.x - s.x, this.player.pos.z - s.z), look: myth ? { ...look, myth } : look }, this.scene);
      a.collider.ghost = true; a.base = a.obj.scale.x || 1;
      // el caballero es sólo una sombra de niebla: translúcido y azulado
      if (M.m.who === 'roldan') a.obj.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.62; o.material.depthWrite = false; } });
      const aura = makeAura(M.leg.color, 3.2); aura.position.y = 1.4; a.obj.add(aura); a.aura = aura;
      M.creature = a;
    }
    const a = M.creature; a.shown = true; a.visible = true; a.obj.visible = true; a.appear = 0;
    this.particles.emit({ x: a.pos.x, y: a.pos.y + 1.2, z: a.pos.z }, { n: 60, color: [M.leg.color, '#ffffff'], speed: 2.2, size: 0.35, life: 1.8 });
    this.sound.magic(); this.sound.owl?.(a.pos);
    this.ui.whisper?.(`${M.leg.creature}…`, 2600);
    // la cámara se vuelve hacia la criatura mientras se forma entre la niebla
    const P = this.player.pos, dx = a.pos.x - P.x, dz = a.pos.z - P.z, l = Math.hypot(dx, dz) || 1, H = a.obj.userData.H || 2;
    const cp = new THREE.Vector3(P.x - dx / l * 2.5 + dz / l * 2.2, P.y + H * 0.9, P.z - dz / l * 2.5 - dx / l * 2.2);
    this.player.frozen = true; this.player.heading = Math.atan2(dx, dz);
    this.follow.cinematic = { pos: cp, look: new THREE.Vector3(a.pos.x, a.pos.y + H * 0.55, a.pos.z), t: 0 };
    setTimeout(() => { if (this.follow.cinematic?.look) { this.follow.cinematic = null; this.follow.snap?.(this.player); } this.player.frozen = false; if (a.shown && !M.done) this.startChase(M); }, 3400);
  }
  // la criatura huye: hay que atraparla con estrategia (ver chase.js)
  startChase(M) {
    if (M.chase) return;
    const a = M.creature, L = M.leg, who = M.m.who;
    if (this.creatureLight) this.creatureLight.color.set(L.color);
    M.chase = new Chase(a, this.player, this.scene, {
      color: L.color, lair: M.lair, water: who === 'lamia', light: this.creatureLight, speedMul: 1.2,
      eyeColor: who === 'lamia' ? '#b8fff0' : '#ffe9a0',
      sound: (k, pos) => this.sound.creature?.(who, k, pos),
      onTired: () => { if (!M.tiredHint) { M.tiredHint = true; this.ui.toast(`¡${L.creature} se cansa! Es tu momento`, 'running', 2400); } },
      onCornered: () => { if (!M.cornerHint) { M.cornerHint = true; this.ui.toast('¡No tiene salida! Acércate', 'legend', 2000); } },
      onCaught: () => { M.chase?.dispose(); M.chase = null; this.meetCreature(M); },
    });
    this.ui.toast(`${L.creature} huye y es más rápido que tú. Mira hacia dónde avisa que va para cortarle el paso, acorrálalo o espera a que se canse.`, 'legend', 6000);
  }
  hideCreature(M, burst) {
    const a = M.creature; if (!a || !a.shown) return;
    a.shown = false; a.visible = false; a.obj.visible = false;
    M.chase?.dispose(); M.chase = null;
    if (burst) this.particles.emit({ x: a.pos.x, y: a.pos.y + 1.4, z: a.pos.z }, { n: 70, color: [M.leg.color, '#ffffff'], speed: 2.6, size: 0.35, life: 2 });
  }
  async meetCreature(M) {
    const a = M.creature; if (!a) return;
    this.player.frozen = true; a.say(5); this.player.rig.setExpr?.('surprised', 3);
    this.player.heading = Math.atan2(a.pos.x - this.player.pos.x, a.pos.z - this.player.pos.z);
    a.heading = Math.atan2(this.player.pos.x - a.pos.x, this.player.pos.z - a.pos.z);
    try { await this.say(a, M.leg.meet); } finally { this.player.frozen = false; }
    this.hideCreature(M, true); this.sound.whoosh?.();
    this.ui.whisper?.('…y desaparece entre la niebla.', 3000);
    await new Promise(r => setTimeout(r, 1200));
    await this.complete(M, { card: M.leg.creature, cardText: M.leg.card });
  }
  updateNight(dt) {
    const night = this.isNight();
    let active = false;
    for (const M of this.missions) {
      if (M.done) { if (M.creature?.shown) this.hideCreature(M); continue; }
      if (M.type === 'legend' && M.step >= 2) {
        active = true;
        for (const k of this.clues) if (k.M === M) {
          const o = k.obj; if (!o.userData.fade && !k.found) o.visible = night;
          if (o.userData.fade) { o.userData.fade -= dt * 0.8; o.scale.setScalar(Math.max(0.01, o.userData.fade)); if (o.userData.fade <= 0) { o.visible = false; o.userData.fade = 0; } }
          if (o.visible) o.userData.tick?.(dt, this.elapsed);
        }
        if (M.step === 3 && night && M.lair) {
          const d = Math.hypot(M.lair.x - this.player.pos.x, M.lair.z - this.player.pos.z);
          if (!M.creature?.shown && d < 26) this.showCreature(M);
        }
        if (M.creature?.shown) {
          const a = M.creature; a.appear = Math.min(1, (a.appear || 0) + dt * 0.8);
          a.base ??= a.obj.scale.x || 1;
          a.obj.scale.setScalar(a.base * (0.3 + 0.7 * (1 - Math.pow(1 - a.appear, 3)))); a.aura?.userData.tick?.(dt);
          if (M.chase) M.chase.update(dt);
          else if (!this.player.frozen || this.mode !== 'play') { a.heading = Math.atan2(this.player.pos.x - a.pos.x, this.player.pos.z - a.pos.z); a.update(dt, this.player); }
          if (!night) this.hideCreature(M, true);
        }
        // si amanece antes de terminar, las pistas se apagan hasta la noche siguiente
        if (!night && !M.dawnWarned && this.mode === 'play') { M.dawnWarned = true; this.ui.toast('Ha amanecido: las pistas sólo se ven de noche. Habla con quien te contó la leyenda.', 'sun', 4200); M.step = 1; }
        if (night) M.dawnWarned = false;
      }
      if (M.type === 'carnival' && M.night && M.step === 2) active = true;
    }
    // la noche dura más mientras se sigue una leyenda, y la niebla la hace más misteriosa
    const base = 24 / (16 * 60) * (this.P.settings.timeSpeed ?? 1);
    if (this.sky) this.sky.speed = active && night ? base * 0.12 : base;
    const fog = this.scene.fog;
    if (fog && fog.isFog) { this.fogFar0 ??= fog.far; const want = active && night ? Math.min(this.fogFar0, 140) : this.fogFar0; fog.far += (want - fog.far) * Math.min(1, dt * 0.8); }
    for (const f of this.folk) if (f.fm?.night) { f.obj.visible = f.obj.visible && night; }
  }

  // ---------- Carnaval: buscar por el sonido ----------
  startCarnival(M) {
    M.step = M.night ? 2 : 1; M.count = 0;
    for (const a of this.folk.filter(f => f.fm === M)) this.scene.remove(a.obj);
    this.folk = this.folk.filter(f => f.fm !== M);
    const look = FOLK[M.m.character] || FOLK.joaldun;
    const houses = TOWN.houses.filter((_, i) => i % 3 === 1);
    for (let i = 0; i < M.need; i++) {
      const h = houses[Math.floor(this.rnd() * houses.length)] || PLACES.market;
      const p = this.spot(h.door || h, 3);
      const a = new Actor({ id: 'f' + i, name: M.folk?.name || 'Personaje', x: p.x, z: p.z, look, wander: 6, walkSpeed: 0.9 }, this.scene);
      a.fm = M; a.bellT = this.rnd() * 2; this.folk.push(a);
      // de noche llevan una antorcha: se ve su luz entre las casas
      if (M.night) { const aura = makeAura('#ffb45a', 0.9); aura.position.y = 2.1; a.obj.add(aura); a.aura = aura; }
    }
    if (M.night) this.ui.toast('Los momotxorros han salido… escucha sus cencerros', 'mask', 3400);
    this.carnivalHint = () => {
      const f = this.folk.filter(a => !a.found);
      if (!f.length) { this.ui.setMG(null); this.carnivalHint = null; return; }
      let d = 1e9; for (const a of f) d = Math.min(d, Math.hypot(a.pos.x - this.player.pos.x, a.pos.z - this.player.pos.z));
      const lv = d < 12 ? 5 : d < 25 ? 4 : d < 45 ? 3 : d < 75 ? 2 : 1;
      if (this.mode === 'play') this.ui.setMG(`<b>Cencerros</b><span class="meter">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span><small>${lv >= 4 ? '¡Muy cerca!' : lv >= 3 ? 'Se oyen cerca' : 'Se oyen lejos'}</small>`);
    };
  }
  updateFolk(a, dt) {
    const P = this.player;
    const d = Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z);
    a.obj.visible = d < 45;
    // de noche los momotxorros no se dejan coger: escapan entre las casas como las criaturas de leyenda
    if (a.fm.night && !a.found && this.isNight()) {
      a.chase ||= new Chase(a, P, this.scene, {
        color: '#ffb45a', lair: { x: a.home.x, z: a.home.z }, range: 45, speedMul: 1.1, eyeColor: '#ffd08a',
        sound: (k, pos) => { if (k === 'call') this.sound.creature?.('momotxorro', k, pos); },
        onTired: () => this.ui.toast('¡Se ha cansado! Alcánzalo', 'running', 1800),
        onCaught: () => { a.chase.dispose(); a.chase = null; this.catchFolk(a); },
      });
      if (a.chase && d < 70) a.chase.update(dt);
    } else if (d < 60) a.update(dt, P);
    a.bellT -= dt;
    if (!a.found && a.bellT < 0) { a.bellT = 0.35 + this.rnd() * 0.25; if (d < 90) this.sound.cowbell(a.pos, clamp(1.2 - d / 80, 0.1, 0.9)); if (a.J.bell) a.J.bell.rotation.z = 0.6; }
    if (a.J.bell) a.J.bell.rotation.z *= 0.9;
    if (!a.found && !a.chase && d < 3.2 && this.mode === 'play') this.catchFolk(a);
    if (a.aura) a.aura.userData.tick?.(dt);
  }
  catchFolk(a) {
    a.found = true; a.dance = 6; a.wander = 0; a.state = 'idle'; const M = a.fm; M.count++;
    a.chase?.dispose(); a.chase = null;
    this.particles.confetti ? this.particles.confetti(a.pos, 40) : this.particles.emit({ x: a.pos.x, y: a.pos.y + 2, z: a.pos.z }, { n: 30, color: ['#e03c3c', '#f2c230', '#3a8fd6'], speed: 3, size: 0.3 });
    this.sound.magic(); this.ui.toast(`¡Encontrado! ${this.stepText(M)}`, 'mask', 2400);
    if (M.count >= M.need) { M.step = M.night ? 3 : 2; this.ui.toast(`¡Todos encontrados! Vuelve con ${M.host.name}`, 'check', 3200); }
  }

  // ---------- Oficios ----------
  // Taller guiado: herramientas, pasos explicados con una acción cada uno y, al final, el antes y el ahora
  async doTrade(M) {
    if (M.oficio) return this.doWorkshop(M);
    const t = M.trade;
    this.player.frozen = true; this.mode = 'mini';
    this.player.heading = Math.atan2(M.bench.x - this.player.pos.x, M.bench.z - this.player.pos.z);
    this.ui.onMiniHit = (ok) => { if (ok) { this.player.rig.doAct(t.act === 'wave' ? 'point' : t.act, 0.45); this.particles.emit({ x: M.bench.x, y: groundHeight(M.bench.x, M.bench.z) + 1, z: M.bench.z }, { n: 10, color: t.act === 'hammer' ? ['#ffb34a', '#ffe38a'] : ['#c9a27a', '#ffffff'], speed: 2.5, size: 0.18, life: 0.5 }); } };
    let r;
    try {
      r = t.game === 'mash' ? await mashGame(this.ui, { title: M.title, hint: t.hint, icon: t.icon, verb: t.verb, seconds: 7, goal: 32, art: t.art })
        : await timingGame(this.ui, { title: M.title, hint: t.hint, icon: t.icon, verb: t.verb, rounds: 5, need: 3, zone: 0.2, speed: 0.6, art: t.art });
    } finally { this.ui.onMiniHit = null; this.player.frozen = false; this.mode = 'play'; }
    if (r.win) { this.player.rig.doCheer(); await this.say(M.host, [`¡Tienes buenas manos! El oficio de ${t.title.toLowerCase()} pasaba de padres a hijos.`]); await this.complete(M, { card: M.title, cardText: M.m.text }); }
    else await this.say(M.host, ['¡Casi! Vuelve a intentarlo cuando quieras en el banco de trabajo.']);
  }

  async doWorkshop(M) {
    const of = M.oficio, t = M.trade, n = of.steps.length;
    this.player.frozen = true; this.mode = 'mini';
    this.player.heading = Math.atan2(M.bench.x - this.player.pos.x, M.bench.z - this.player.pos.z);
    this.ui.onMiniHit = (ok) => { if (ok) { this.player.rig.doAct(of.act === 'wave' ? 'point' : of.act, 0.45); this.particles.emit({ x: M.bench.x, y: groundHeight(M.bench.x, M.bench.z) + 1, z: M.bench.z }, { n: 10, color: of.act === 'hammer' ? ['#ffb34a', '#ffe38a'] : ['#c9a27a', '#ffffff'], speed: 2.5, size: 0.18, life: 0.5 }); } };
    let finished = false;
    try {
      if (!M.tstep) {
        const list = of.tools.map(([es, eu, what]) => `<li><b>${es}</b>${eu ? `<i>${eu}</i>` : '<i></i>'}<span>${what}</span></li>`).join('');
        await infoCard(this.ui, { icon: of.icon, kicker: 'Las herramientas', title: `${of.name}${of.eu ? ' · ' + of.eu : ''}`, text: 'Esto es lo que se usaba en el taller:', extra: `<ul class="tools">${list}</ul>`, button: '¡A trabajar!' });
      }
      while (M.tstep < n) {
        const st = of.steps[M.tstep], title = `Paso ${M.tstep + 1} de ${n}: ${st.title}`;
        if (st.game !== 'choice') await infoCard(this.ui, { icon: of.icon, kicker: `${of.name} · paso ${M.tstep + 1} de ${n}`, title: st.title, text: st.text, button: st.game === 'order' ? 'Ordenar' : st.verb || 'Hacerlo' });
        let r;
        if (st.game === 'choice') r = await choiceGame(this.ui, { title, icon: of.icon, q: `${st.text} ${st.q}`, options: st.options, answer: st.answer, why: st.why });
        else if (st.game === 'order') r = await sequenceGame(this.ui, { title, icon: of.icon, hint: 'Toca los pasos en el orden en que se hacían', steps: st.items });
        else if (st.game === 'mash') r = await mashGame(this.ui, { title, hint: st.text, icon: of.icon, verb: st.verb, seconds: 7, goal: 28, art: st.art });
        else if (st.game === 'forge') r = await play3d('forgeGame', this.ui, { title: st.title });
        else if (st.game === 'stitch') r = await play3d('stitchGame', this.ui, { title: st.title });
        else if (st.game === 'shear') r = await play3d('shearGame', this.ui, { title: st.title });
        else r = await timingGame(this.ui, { title, hint: st.text, icon: of.icon, verb: st.verb, rounds: st.rounds || 4, need: st.need || 3, zone: 0.22, speed: 0.6, art: st.art });
        // si la escena 3D no se pudo montar, el paso no bloquea el taller: se da por visto
        if (r.quit) { await this.say(M.host, ['Cuando quieras, seguimos donde lo has dejado.']); return; }
        if (!r.win && !r.error) { await this.say(M.host, ['¡Casi! Así se aprende: vuelve a probar este paso en el banco de trabajo.']); return; }
        M.tstep++;
      }
      finished = true;
    } finally { this.ui.onMiniHit = null; this.player.frozen = false; this.mode = 'play'; }
    if (!finished) return;
    this.player.rig.doCheer();
    await infoCard(this.ui, { icon: of.icon, kicker: 'Antes y ahora', title: of.product, text: `Así trabajaba ${of.name === 'Panadera' || of.name === 'Alpargatera' || of.name === 'Hilandera' ? 'la' : 'el'} ${of.name.toLowerCase()}.`, extra: `<div class="antes-ahora"><div><b>Antes</b>${of.then}</div><div><b>Ahora</b>${of.now}</div></div>`, button: '¡Lo he aprendido!' });
    const ord = of.steps.find(s => s.game === 'order')?.items, low = (x) => x[0].toLowerCase() + x.slice(1);
    await this.complete(M, { card: M.title, cardText: `Cómo se hacía: ${(ord || of.steps.filter(s => s.game !== 'choice').map(s => s.title)).map(low).join(', ')}.` });
  }

  // ---------- Carrera por aros ----------
  startRace(M) {
    M.step = 1; M.count = 0;
    for (const g of this.gates) this.scene.remove(g.obj);
    this.gates = [];
    // recorrido: de la salida a la plaza, a la iglesia, a un monumento y de vuelta
    // en Pamplona, el encierro de verdad: de los corrales de Santo Domingo a la plaza de toros por la Estafeta
    const pts = M.m.kind === 'encierro' && PLACES.encierro ? PLACES.encierro
      : [PLACES.spawn, PLACES.plaza, TOWN.church?.door || PLACES.church, ...(TOWN.landmarks.slice(0, 2).map(l => l.spot)), PLACES.market, PLACES.plaza];
    const route = [];
    for (let i = 0; i < M.need; i++) {
      const f = (i + 1) / (M.need + 1) * (pts.length - 1), k = Math.floor(f), t = f - k;
      const a = pts[k], b = pts[Math.min(k + 1, pts.length - 1)];
      route.push(this.spot({ x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t) }, 3));
    }
    route.forEach((p, i) => {
      const nx = route[i + 1] || route[i - 1];
      const o = makeGate(i === route.length - 1 ? '#3ca05a' : '#f5c542');
      o.position.set(p.x, groundHeight(p.x, p.z), p.z); o.rotation.y = Math.atan2(nx.x - p.x, nx.z - p.z) + (route[i + 1] ? 0 : Math.PI);
      this.scene.add(o); this.gates.push({ x: p.x, z: p.z, obj: o, next: i === 0 });
    });
    let dist = 0; let prev = this.player.pos; for (const p of route) { dist += Math.hypot(p.x - prev.x, p.z - prev.z); prev = p; }
    this.race = { M, t: Math.ceil(dist / 5.2) + 12 };
    this.ui.toast('¡Adelante! Pasa por el aro dorado', 'running', 2200);
  }
  updateRace(dt) {
    const R = this.race; if (!R) return; const M = R.M;
    R.t -= dt;
    const g = this.gates.find(g => g.next);
    if (g && Math.hypot(g.x - this.player.pos.x, g.z - this.player.pos.z) < 2.6) {
      g.next = false; g.obj.visible = false; M.count++; this.sound.ui('coin'); this.particles.emit({ x: g.x, y: groundHeight(g.x, g.z) + 2.2, z: g.z }, { n: 30, color: '#ffe38a', speed: 3, size: 0.3 });
      const n = this.gates.find(x => x.obj.visible); if (n) n.next = true;
      R.t += 3;
    }
    this.ui.setMG(`<b>${M.title}</b><span class="big">${Math.max(0, R.t).toFixed(1)} s</span><small>Aros ${M.count}/${M.need}</small>`);
    if (M.count >= M.need) { this.race = null; this.ui.setMG(null); M.step = 2; this.player.rig.doCheer(); this.sound.fanfare(); this.ui.toast(`¡Meta! Vuelve con ${M.host.name}`, 'trophy', 3000); for (const x of this.gates) this.scene.remove(x.obj); this.gates = []; }
    else if (R.t <= 0) { this.race = null; this.ui.setMG(null); M.step = 1; for (const x of this.gates) this.scene.remove(x.obj); this.gates = []; this.ui.toast(`¡Se acabó el tiempo! Habla con ${M.host.name} para repetir`, 'clock', 3500); this.sound.ui('error'); }
  }

  // ---------- Danza (ritmo) ----------
  startDance(M) {
    this.mode = 'dance'; this.danceM = M;
    const c = this.plazaStage(), y = terrainHeight(c.x, c.z);
    this.player.place(c.x, c.z, 0); this.player.frozen = true;
    const cols = M.m.colors || ['#ffffff', '#d42f2f'];
    this.dancers = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4, x = c.x + Math.sin(a) * 3.2, z = c.z + Math.cos(a) * 3.2;
      const d = new Actor({ id: 'd' + i, name: 'Dantzari', x, z, heading: a + Math.PI, look: { shirt: cols[0], pants: cols[0], sash: cols[1], scarf: cols[1], txapela: i % 2 ? cols[1] : undefined, espadrille: true, laces: cols[1], ribbons: i % 2 === 0 ? [cols[1], '#f2c230'] : undefined } }, this.scene);
      d.collider.ghost = true; this.dancers.push(d);
    }
    this.follow.cinematic = { pos: new THREE.Vector3(c.x + 8, y + 4, c.z + 9), look: new THREE.Vector3(c.x, y + 1.3, c.z), t: 0 };
    this.sound.setMusic(false);
    const beat = 60 / 104, pat = [0, 3, 0, 3, 1, 2, 1, 2, 0, 1, 2, 3, 3, 2, 1, 0, 0, 3, 1, 2, 2, 1, 3, 0];
    this.dn = { seq: pat.map((l, i) => ({ t: 2 + i * beat * (i < 12 ? 2 : 1.5), lane: l })), t: 0, i: 0, hits: 0, notes: [], fall: 1.8, beat };
    this.dn.total = this.dn.seq.length;
    this.rh = this.ui.rhythm((lane) => this.dancePress(lane));
    this.rh.feedback('¡Prepárate!');
    this.ui.setMG(`<b>${M.title}</b><small>Aciertos: <span id="dnN">0</span>/${this.dn.total}</small>`);
    this.danceKeys = (e) => { const k = e.key.toLowerCase(); const map = { arrowleft: 0, a: 0, arrowup: 1, w: 1, arrowdown: 2, s: 2, arrowright: 3, d: 3 }; if (k in map) { e.preventDefault(); e.stopPropagation(); this.dancePress(map[k]); } };
    addEventListener('keydown', this.danceKeys, true);
  }
  dancePress(lane) {
    const D = this.dn; if (!D) return;
    this.rh.flash(lane);
    let best = null, bd = 1;
    for (const n of D.notes) if (!n.done && n.lane === lane) { const dt = Math.abs(D.t - n.t); if (dt < bd) { bd = dt; best = n; } }
    if (best && bd < 0.28) {
      best.done = true; best.el.classList.add('hit'); D.hits++;
      this.rh.feedback(bd < 0.1 ? '¡Perfecto!' : '¡Bien!');
      this.sound.tone([392, 440, 523, 587][lane] * 2, 0.15, 'triangle', 0.1, this.sound.sfx);
      const el = document.getElementById('dnN'); if (el) el.textContent = D.hits;
      this.player.rig.doWave();
    } else this.rh.feedback('¡Uy!');
  }
  updateDance(dt) {
    const D = this.dn; if (!D) return;
    D.t += dt;
    // música sencilla de txistu y tambor
    const b = Math.floor(D.t / D.beat);
    if (b !== D.lastB && D.t > 1) { D.lastB = b; this.sound.tone([523, 587, 659, 587, 523, 440, 392, 440][b % 8], D.beat * 0.8, 'triangle', 0.06, this.sound.sfx); if (b % 2 === 0) this.sound.noiseBurst(0.08, 180, 1, 0.35, this.sound.sfx); }
    while (D.i < D.seq.length && D.seq[D.i].t - D.fall <= D.t) { const s = D.seq[D.i++]; const el = this.rh.addNote(s.lane); D.notes.push({ ...s, el }); }
    for (const n of D.notes) {
      const k = 1 - (n.t - D.t) / D.fall;
      n.el.style.top = (k * 78) + '%';
      if (!n.done && D.t - n.t > 0.3) { n.done = true; n.el.classList.add('miss'); }
      if (D.t - n.t > 0.6) n.el.remove();
    }
    const amt = D.hits > 0 ? 5 : 0;
    this.dancers.forEach((d, i) => { d.dance = amt ? amt + i * 0.01 : 0; d.update(dt, this.player); });
    if (this.follow.cinematic) this.follow.cinematic.t += dt;
    if (D.i >= D.seq.length && D.t > D.seq[D.seq.length - 1].t + 1) this.endDance();
  }
  async endDance() {
    const D = this.dn, M = this.danceM; this.dn = null;
    removeEventListener('keydown', this.danceKeys, true); this.rh.remove(); this.ui.setMG(null);
    const win = D.hits >= Math.ceil(D.total * 0.55);
    if (win) { this.dancers.forEach(d => d.dance = 5); this.player.rig.doCheer(); this.particles.confetti?.(this.player.pos, 80); }
    await new Promise(r => setTimeout(r, 1200));
    this.follow.cinematic = null; this.player.frozen = false; this.mode = 'play';
    for (const d of this.dancers) { this.scene.remove(d.obj); d.collider.ghost = true; }
    this.dancers = [];
    this.sound.setMusic(this.P.settings.music);
    this.follow.snap(this.player);
    if (win) { await this.say(M.host, [`¡Has bailado ${M.title} como en las fiestas! ${D.hits}/${D.total} pasos.`]); await this.complete(M, { card: M.title, cardText: M.m.text }); }
    else { M.step = 1; await this.say(M.host, [`${D.hits}/${D.total}. Hacen falta ${Math.ceil(D.total * 0.55)}. ¡Vuelve al centro de la plaza para probar otra vez!`]); this.player.place(PLACES.plaza.x + 6, PLACES.plaza.z + 6, 0); }
  }

  // ---------- Prismáticos ----------
  toggleBinoculars() {
    if (!this.binoOn) return;
    if (this.mode === 'bino') {
      this.mode = 'play'; this.fauna.farView = false; this.ui.binoculars(false); this.camera.fov = this.camera.userData.fov0 || 55; this.camera.updateProjectionMatrix(); this.player.obj.visible = true; this.player.frozen = false;
      if (this.panoOn) { this.panoOn = false; this.altScene = null; this.altCamera = null; this.altUpdate = null; }
      return;
    }
    if (this.mode !== 'play') return;
    this.mode = 'bino'; this.fauna.farView = true; this.ui.binoculars(true); this.sound.ui('open');
    this.player.frozen = true; this.player.obj.visible = false;
    this.binoYaw = this.follow.yaw + Math.PI; this.binoPitch = 0.25;
    // en el mirador: la vista lejana con los montes de verdad en su dirección
    const v = this.miradorSpot(), P = this.player.pos, montes = this.panoMontes();
    if (v && montes.length && Math.hypot(P.x - v.x, P.z - v.z) < 30) {
      try {
        // colores del cielo según la hora (los del pueblo pueden venir sin actualizar)
        const sk = this.sky?.sample?.(this.sky.time ?? 10);
        if (!this.pano) this.pano = new Panorama(montes, { quality: this.rt?.quality, sun: this.sky?.sunDir, zenith: sk?.zen, horizon: sk?.hor });
        this.panoOn = true; this.altScene = this.pano.scene; this.altCamera = this.pano.camera; this.altUpdate = (dt) => this.updateBino(dt);
        const M = this.missions.find(x => x.type === 'mirador'), next = this.pano.peaks.find(pk => !(M?.seenIds?.has(pk.m.id))) || this.pano.peaks[0];
        this.binoYaw = Math.PI - next.m.bearing * Math.PI / 180 + 0.12; this.binoPitch = Math.atan2(next.summit.y * 0.6 - this.pano.eye.y, next.ds);
        this.pano.camera.fov = 45;
      } catch (e) { console.warn('vista del mirador', e); this.panoOn = false; }
    }
  }
  // montes que se ven desde el mirador: los de la misión o, si no la hay, los cuatro más vistosos desde el pueblo
  panoMontes() {
    const M = this.missions.find(x => x.type === 'mirador'); if (M?.montes?.length) return M.montes;
    if (!this._panoM) { const ll = townLatLon(this.def); this._panoM = ll ? montesFrom(ll.lat, ll.lon, 4) : []; }
    return this._panoM;
  }
  updateBino(dt) {
    const P = this.player.pos, pano = this.panoOn ? this.pano : null, cam = pano ? pano.camera : this.camera;
    const sens = (this.input.touch ? 0.0012 : 0.0009) * (pano ? cam.fov / 10 : 1);
    this.binoYaw -= this.input.look.dx * sens; this.binoPitch = clamp(this.binoPitch - this.input.look.dy * sens, -0.6, 1.3);
    const mv = this.input.move; this.binoYaw -= mv.x * dt * 0.8; this.binoPitch = clamp(this.binoPitch + mv.y * dt * 0.6, -0.6, 1.3);
    const fov = lerp(cam.fov, pano ? 24 : 10, 1 - Math.exp(-(pano ? 2.5 : 8) * dt));
    const eye = pano ? pano.eye.clone() : new THREE.Vector3(P.x, P.y + 1.55, P.z);
    const dir = new THREE.Vector3(Math.sin(this.binoYaw) * Math.cos(this.binoPitch), Math.sin(this.binoPitch), Math.cos(this.binoYaw) * Math.cos(this.binoPitch));
    if (pano) pano.look(this.binoYaw, this.binoPitch, fov);
    else { cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(eye); cam.lookAt(eye.clone().add(dir)); }
    this.follow.yaw = this.binoYaw + Math.PI;
    let best = null, ba = 1;
    const obs = pano ? this.monteObs(eye) : [...this.fauna.observables(), ...this.monteObs(eye)];
    for (const o of obs) {
      const to = new THREE.Vector3(o.pos.x - eye.x, o.pos.y + (o.h || 0.5) - eye.y, o.pos.z - eye.z);
      const d = to.length(); if ((!o.pano && d > (o.far ? 320 : 110)) || d < 1) continue;
      const ang = to.normalize().angleTo(dir), tol = o.pano ? 0.06 : Math.max(0.035, (o.far ? 3 : 1.4) / d);
      if (ang < tol && ang < ba && (o.far || !segmentBlocked(eye.x, eye.z, o.pos.x, o.pos.z))) { ba = ang; best = o; }
    }
    // un ave detrás de una casa o de la iglesia no se puede anotar: comprobamos que no haya nada en medio
    if (best && best.far && !best.monte) {
      // solo las piezas grandes conservan sus posiciones (el resto se liberó al subirlo a la tarjeta): se comprueba con una copia que solo tiene posiciones
      const town = this.townMeshes ||= (this.scene.getObjectByName('town')?.children || []).filter(m => m.isMesh && m.geometry.attributes.position?.array).map(m => { const g = new THREE.BufferGeometry(); g.setAttribute('position', m.geometry.attributes.position); g.setIndex(m.geometry.index); g.boundingSphere = m.geometry.boundingSphere; g.boundingBox = m.geometry.boundingBox; const r = new THREE.Mesh(g, m.material); r.matrixWorld.copy(m.matrixWorld); r.matrixAutoUpdate = false; return r; });
      const to = new THREE.Vector3(best.pos.x - eye.x, best.pos.y - eye.y, best.pos.z - eye.z), d = to.length();
      this.ray ||= new THREE.Raycaster(); this.ray.set(eye, to.normalize()); this.ray.far = d;
      if (this.ray.intersectObjects(town, false).length) best = null;
    }
    const M = this.missions.find(x => x.type === 'observe' && x.step === 1);
    const key = best ? (best.obj?.uuid || best.id + ':' + Math.round(best.pos.x) + ',' + Math.round(best.pos.z)) : null;
    const counts = M && best && (!M.species.length || M.species.includes(best.id));
    const isNew = best && (best.monte ? !best.seen : !this.obsSeen?.has(key));
    const F = best ? (best.monte ? { name: best.seen ? best.monte.name : '¡Un monte! Pulsa para descubrir su nombre' } : FAUNA[best.id]) : null;
    // misión del mirador: panel con los montes por descubrir, brújula y flecha al siguiente
    const MM = this.missions.find(x => x.type === 'mirador' && x.step === 1), DIRS = ['NORTE', 'NORESTE', 'ESTE', 'SURESTE', 'SUR', 'SUROESTE', 'OESTE', 'NOROESTE'];
    const brg = ((Math.atan2(dir.x, -dir.z) * 180 / Math.PI) + 360) % 360;
    let goal = '', monteHint = null;
    if (MM) {
      const v = this.miradorSpot(), far = !pano && (!v || Math.hypot(P.x - v.x, P.z - v.z) > 30);
      if (far) goal = `<b>Los montes desde el mirador</b>Desde aquí no se ven bien. Sal de los prismáticos y ve al mirador: lo marca la flecha amarilla del mapa.`;
      else {
        const list = this.monteObs(eye), next = list.find(o => !o.seen);
        goal = `<b>Busca ${MM.need} montes con los prismáticos (${MM.count}/${MM.need})</b>Centra la marca «?» de una cumbre y pulsa ${this.input.touch ? 'el botón de acción' : 'E'}.<ul>${list.map(o => `<li class="${o.seen ? 'ok' : o === next ? 'next' : ''}">${o.seen ? '✔ ' + o.monte.name : '? Monte al ' + o.monte.dir + ' · ' + Math.round(o.monte.km) + ' km'}</li>`).join('')}</ul>`;
        if (!best && next) { const q = next.pos.clone().project(cam); const behind = q.z > 1; monteHint = Math.atan2(behind ? -q.y : q.y, behind ? -q.x : q.x); }
      }
    }
    this.ui.binoInfo?.(goal, 'MIRAS AL ' + DIRS[Math.round(brg / 45) % 8]);
    // sin nada en el visor: flecha hacia el animal buscado más cercano
    let hint = monteHint;
    if (!best && M) { const t = this.obsNearest(M); if (t) { const v = new THREE.Vector3(t.pos.x, t.pos.y + (t.h || 0.4), t.pos.z).project(cam); const behind = v.z > 1; hint = Math.atan2(behind ? -v.y : v.y, behind ? -v.x : v.x); } }
    this.ui.binoTarget(best ? (best.monte ? (best.seen ? `${best.monte.name} · ${best.monte.altitude} m` : F.name) : `${F?.name || best.id}${isNew ? (counts || !M ? ' — pulsa E para anotar' : ' — anótalo en tu cuaderno') : ' — anotado'}`) : (M || monteHint != null ? 'Sigue la flecha' : ''), !!best, hint);
    if (this.input.consume('e') || this.input.consume(' ')) {
      this.sound.ui('photo');
      if (best?.monte && !best.seen) { this.seeMonte(best); }
      else if (best && isNew && !best.monte) {
        this.obsSeen ||= new Set(); this.obsSeen.add(key);
        const first = !this.P.species.includes(best.id);
        if (first) this.P.species.push(best.id);
        if (counts) { M.count++; if (M.count >= M.need) M.step = 2; }
        saveProfile();
        this.fieldCard(best.id, first, counts ? M : null);
      }
    }
    if (this.input.consume('f') || this.input.consume('escape')) this.toggleBinoculars();
  }

  // mirador del pueblo (el landmark «lookout» o «pass») y montes vistos desde él, en su dirección real (norte = −z)
  // centro de la tarima del mirador (para las pruebas y la cámara)
  miradorDeck() { const l = TOWN.landmarks.find(l => l.kind === 'lookout') || TOWN.landmarks.find(l => l.kind === 'pass'); return l ? { x: l.x, z: l.z } : null; }
  miradorSpot() { const l = TOWN.landmarks.find(l => l.kind === 'lookout') || TOWN.landmarks.find(l => l.kind === 'pass'); return l ? (l.spot || { x: l.x, z: l.z }) : null; }
  monteObs(eye) {
    if (this.panoOn && this.pano) {
      const M = this.missions.find(x => x.type === 'mirador'), S = this.pano.scene;
      if (!this.panoPins) this.panoPins = this.pano.peaks.map(pk => { const seen = this.P.montes?.includes(pk.m.id) && (!M || M.seenIds?.has(pk.m.id)); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinTex(seen ? pk.m.name : '?'), depthTest: false, transparent: true, fog: false })); sp.renderOrder = 20; sp.userData.named = seen; S.add(sp); return sp; });
      return this.pano.peaks.map((pk, i) => {
        const pin = this.panoPins[i], s = pk.ds * 0.026, named = pin.userData.named;
        pin.scale.set(named ? s * 3.4 : s, named ? s * 0.85 : s, 1); pin.position.copy(pk.summit).add(new THREE.Vector3(0, s * 0.75 + pk.H * 0.05, 0));
        return { pos: pk.summit, h: 0, far: true, pano: true, id: 'monte:' + pk.m.id, monte: pk.m, seen: named, pin, i };
      });
    }
    const M = this.missions.find(x => x.type === 'mirador'), v = this.miradorSpot();
    if (!M || M.step < 1 || !v || Math.hypot(eye.x - v.x, eye.z - v.z) > 30) { if (this.montePins) this.montePins.forEach(p => p.visible = false); return []; }
    if (!this.montePins) this.montePins = M.montes.map(mt => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinTex('?'), depthTest: false, transparent: true })); sp.scale.set(14, 14, 1); sp.renderOrder = 20; this.scene.add(sp); return sp; });
    return M.montes.map((mt, i) => {
      const b = mt.bearing * Math.PI / 180, pos = new THREE.Vector3(eye.x + Math.sin(b) * 300, eye.y + 14 + Math.min(20, mt.altitude / 120), eye.z - Math.cos(b) * 300);
      const pin = this.montePins[i]; pin.position.copy(pos).add(new THREE.Vector3(0, 10, 0)); pin.visible = this.mode === 'bino';
      return { pos, h: 0, far: true, id: 'monte:' + mt.id, monte: mt, seen: this.P.montes?.includes(mt.id) && M.seenIds?.has(mt.id), pin, i };
    });
  }
  seeMonte(o) {
    const M = this.missions.find(x => x.type === 'mirador'), mt = o.monte;
    if (M) (M.seenIds ||= new Set()).add(mt.id); (this.P.montes ||= []).includes(mt.id) || this.P.montes.push(mt.id);
    o.pin.material.map?.dispose(); o.pin.material.map = pinTex(mt.name); o.pin.material.needsUpdate = true; o.pin.scale.set(36, 9, 1); o.pin.userData.named = true;
    if (M && M.step === 1) { M.count = M.seenIds.size; if (M.count >= M.need) M.step = 2; }
    saveProfile(); this.sound.magic?.();
    const isNew = addCard('monte:' + mt.id);
    infoCard(this.ui, { icon: 'peak', kicker: `Al ${mt.dir} · ${Math.round(mt.km)} km`, title: `${mt.name}${mt.alt ? ' · ' + mt.alt : ''}`, text: `${mt.altitude.toLocaleString('es')} metros${mt.zone ? ' · ' + mt.zone : ''}. ${mt.intro || ''}`, badge: isNew ? 'Nueva carta' : '', button: M?.step === 2 ? `¡Hecho! Vuelve con ${M.host.name}` : 'Seguir mirando' });
  }
  // animal buscado más cercano (para la brújula y la flecha del visor)
  obsNearest(M) {
    const P = this.player.pos; let b = null, bd = 1e9;
    for (const o of this.fauna.observables()) {
      if (M.species.length && !M.species.includes(o.id)) continue;
      const k = o.obj?.uuid || o.id + ':' + Math.round(o.pos.x) + ',' + Math.round(o.pos.z); if (this.obsSeen?.has(k)) continue;
      const d = Math.hypot(o.pos.x - P.x, o.pos.z - P.z); if (d < bd) { bd = d; b = o; }
    }
    return b;
  }
  // ficha del cuaderno de campo al anotar un animal
  async fieldCard(id, first, M) {
    const F = FAUNA[id]; if (!F) return;
    if (!first && !M) { if (this.mode === 'bino') this.ui.binoNote(`${F.name} anotado`); else this.ui.toast(`${F.name} anotado`, 'binoculars'); return; }
    this.sound.magic();
    const done = M && M.count >= M.need;
    if (first) addCard('fauna:' + id);
    await showFicha('fauna:' + id, { ui: this.ui, kicker: 'Cuaderno de campo · ficha de fauna', badge: first ? 'Especie nueva' : '', button: M ? (done ? `¡Hecho! Vuelve con ${M.host.name}` : `Seguir buscando (${M.count}/${M.need})`) : 'Seguir observando' });
    if (first) await this.mochila.give('cuaderno');
    if (done) this.ui.toast(`¡Muy bien! Vuelve con ${M.host.name}`, 'check', 3000);
  }

  // ---------- Preguntas ----------
  questions() {
    const d = this.def, c = this.comarca, others = LEVELS.filter(l => l.id !== d.id && l.church);
    const pick3 = (right, pool) => { const w = [...new Set(pool.filter(x => x && x !== right))].sort(() => this.rnd() - 0.5).slice(0, 2); const opts = [right, ...w].sort(() => this.rnd() - 0.5); return { a: opts, ok: opts.indexOf(right) }; };
    const Q = [];
    if (d.church) Q.push({ q: `¿Cómo se llama la iglesia principal de ${d.name}?`, ...pick3(d.church.name, others.map(o => o.church.name)), why: d.church.text });
    Q.push({ q: `¿En qué comarca está ${d.name}?`, ...pick3(c?.name, COMARCAS.map(x => x.name)), why: `${d.name} pertenece a ${c?.name}.` });
    if (d.river) Q.push({ q: `¿Qué río o regata pasa por ${d.name}?`, ...pick3(d.river.name, LEVELS.filter(l => l.river).map(l => l.river.name)), why: `El ${d.river.name} da vida a los campos y antes movía molinos.` });
    if (c?.culture?.dance) Q.push({ q: `¿Qué danza es típica de ${c.name}?`, ...pick3(c.culture.dance.title, COMARCAS.filter(x => x.culture?.dance).map(x => x.culture.dance.title)), why: c.culture.dance.text });
    if (c?.culture?.carnival) Q.push({ q: `¿Qué carnaval es famoso en ${c.name}?`, ...pick3(c.culture.carnival.title, COMARCAS.filter(x => x.culture?.carnival).map(x => x.culture.carnival.title)), why: c.culture.carnival.text });
    if (c?.culture?.festival) Q.push({ q: `¿Qué fiesta se celebra en ${c.culture.festival.place}?`, ...pick3(c.culture.festival.title, COMARCAS.filter(x => x.culture?.festival).map(x => x.culture.festival.title)), why: c.culture.festival.text });
    for (const lm of d.landmarks || []) Q.push({ q: `¿Qué puedes visitar en ${d.name}?`, ...pick3(lm.name, LEVELS.flatMap(l => (l.landmarks || []).map(x => x.name))), why: lm.text });
    const pm = (d.missions || []).find(m => m.type === 'process');
    if (pm) Q.push({ q: `¿Qué producto has aprendido a hacer en ${d.name}?`, ...pick3(pm.product, LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'process').map(m => m.product))), why: pm.text });
    const cropM = (d.missions || []).find(m => m.type === 'harvest');
    if (cropM) Q.push({ q: `¿Qué se cosecha en ${d.name}?`, ...pick3(CROP[cropM.crop]?.[0], Object.values(CROP).map(x => x[0])), why: cropM.text });
    if (c?.nature?.animals?.length) { const an = c.nature.animals[0]; Q.push({ q: `¿Qué animal vive en los montes de ${c.name}?`, ...pick3(an, ['Pingüino', 'Camello', 'Canguro', 'Cebra']), why: `En ${c.name} puedes ver ${c.nature.animals.join(', ').toLowerCase()}.` }); }
    return Q.filter(q => q.a.length >= 2);
  }
  async quizRound(M, a, n) {
    const all = this.questions(); this.quizUsed ||= new Set();
    let pool = all.filter(q => !this.quizUsed.has(q.q)); if (pool.length < n) { this.quizUsed.clear(); pool = all; }
    for (let i = 0; i < n && pool.length; i++) {
      const Q = pool.splice(Math.floor(this.rnd() * pool.length), 1)[0]; this.quizUsed.add(Q.q);
      let ok = false;
      await this.say(a, [{ text: Q.q, choices: Q.a, onChoice: (j) => { ok = j === Q.ok; return [{ who: a.name, look: a.obj.userData.look, text: (ok ? '¡Correcto! ' : `No era esa. La respuesta es: ${Q.a[Q.ok]}. `) + (Q.why || '') }]; } }]);
      if (ok) { M.count++; this.sound.ui('coin'); this.ts.quizOk = (this.ts.quizOk || 0) + 1; } else this.sound.ui('error');
      this.ui.setQuest && this.updateHUD();
    }
    saveProfile();
  }

  // ---------- Completar ----------
  async complete(M, { card, cardText } = {}) {
    if (M.done) return;
    M.done = true; M.step = M.steps().length;
    this.ts.done[M.si ?? M.i] = true;
    const xp = { visit: 80, quiz: 60, summit: 150 }[M.type] || 100;
    // txanponak para la tienda y, en las tareas del campo, lo que se cosecha o se ordeña (sirve para el trueque)
    this.P.coins = (this.P.coins ?? 12) + 4;
    const gk = { harvest: ['trigo', 'patatas', 'maiz'], herd: ['lana', 'leche'], feria: ['leche', 'huevos'] }[M.type];
    if (gk) { const k = gk[M.i % gk.length]; this.giveGoods(k, 2); }
    const lvUp = addXP(xp);
    if (card) addCard(this.def.id + ':' + card, CAT_BY_TYPE[M.type] || 'historia');
    this.player.rig.doCheer(); this.particles.confetti?.(this.player.pos, 70);
    const doneN = this.missions.filter(x => x.done).length;
    saveProfile();
    await missionComplete(this.ui, { title: M.title, text: cardText ? cardText : `Has completado una misión en ${this.def.name}.`, xp, card, saber: card ? SABERES.find(x => x.id === (CAT_BY_TYPE[M.type] || 'historia')) : null, icon: M.icon, progress: { done: doneN, total: this.missions.length, name: this.def.name } });
    await this.afterComplete(M);
    if (lvUp) { const L = levelOf(this.P.xp); await infoCard(this.ui, { icon: 'star', kicker: '¡Subes de nivel!', title: `Nivel ${L.lv}`, text: 'Cada misión te hace más sabio sobre Navarra. ¡Sigue así!', button: '¡Genial!' }); }
    const last = doneN === this.missions.length && !this.ts.stamp;
    if (last) { this.ts.stamp = true; saveProfile(); }
    for (const b of checkBadges()) await infoCard(this.ui, { icon: b.icon, kicker: 'Nueva insignia', title: b.name, text: b.text, button: '¡Bien!' });
    saveProfile();
    if (last) { await this.stampTown(); return; }
    this.autoTrack();
    const next = this.missions.find(x => !x.done);
    if (next) this.ui.toast(`Siguiente: ${next.title} — busca la exclamación amarilla`, 'exclaim', 3800);
  }
  async stampTown() {
    this.ts.stamp = true; addXP(150); saveProfile();
    const town = this.def.name.split(' /')[0];
    const img = stampImg(this.def.comarca, town, this.missions.find(M => M.type !== 'visit' && M.type !== 'quiz')?.icon);
    if (comarcaDone(this.P, this.def.comarca)) await infoCard(this.ui, { icon: 'shield', kicker: '¡Comarca completa!', title: this.comarca.name, text: `Has conocido todos los pueblos de ${this.comarca.name}. Se ilumina en tu mapa de Navarra.`, button: '¡Increíble!' });
    saveProfile();
    // celebración: fuegos en el cielo del pueblo y el personaje lo festeja
    this.player.rig.doCheer(); this.particles.confetti?.(this.player.pos, 120); this.sound.fanfare?.();
    const xp = this.missions.reduce((s, M) => s + ({ visit: 80, quiz: 60 }[M.type] || 100), 0) + 150;
    const nextL = LEVELS.find(l => l.comarca === this.def.comarca && l.id !== this.def.id && !this.P.towns[l.id]?.stamp) || LEVELS.find(l => l.id !== this.def.id && !this.P.towns[l.id]?.stamp);
    const r = await townFinale(this.ui, { town, stamp: img, missions: this.missions.map(M => ({ title: M.title, icon: M.icon })), xp, next: nextL?.name.split(' /')[0] });
    if (r === 'next' && nextL) this.onPlayTown?.(nextL.id);
    else if (r === 'map') this.onExit?.();
  }

  // Compatibilidad con la interfaz
  mapHouses() { return TOWN.houses; }
  save() { saveProfile(); }
  applySettings() { const S = this.P.settings; this.sound.setMusic(S.music); this.sound.setVolume(S.volume); this.sky.speed = 24 / (16 * 60) * (S.timeSpeed ?? 1); }
  teleport(x, z) { const s = this.spot({ x, z }, 3); this.player.place(s.x, s.z, 0); this.follow.snap(this.player); }
  dispose() {
    // (lo que estaba a medias —el menú de pelota, el cuadro del torneo, un partido preparándose— se para: el pueblo
    // nuevo no debe recibir sus ventanas ni sus controles)
    this.disposed = true;
    try { this.pelotaAbort?.(); } catch (e) { }
    document.querySelectorAll('.lg-root, .pel-root').forEach(o => o.remove());
    if (this.townArms) { for (const m of [this.townArms.mesh, this.townArms.plate]) if (m) { m.geometry.dispose(); m.material.map?.dispose(); m.material.dispose(); } this.townArms = null; }
    for (const b of this.blasones || []) { b.mesh.geometry.dispose(); b.mesh.material.map?.dispose(); b.mesh.material.dispose(); }
    // (que la interfaz, que dura toda la partida, no siga apuntando al pueblo que se deja: lo dejaba entero en memoria)
    if (this.ui.onDialogLine) this.ui.onDialogLine = null; this.ui.onMiniHit = null; if (this.ui.stage3d?.show) this.ui.stage3d = null;
    this.flora?.dispose(); document.querySelectorAll('.mg-overlay, .dogpick, .bagpanel').forEach(o => o.remove()); this.ui.closeModal?.(); this.ui.setMG(null); if (this.danceKeys) removeEventListener('keydown', this.danceKeys, true); this.rh?.remove(); if (this.mode === 'bino') this.ui.binoculars(false); }
}

// Puesto de productos: mesa con toldo, panes, quesos y tarros de miel
function makeStall() {
  const g = new THREE.Group(), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
  const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(2.2, 0.08, 1), M('#8a5a32'), 0, 0.9, 0);
  for (const [x, z] of [[-1, -0.42], [1, -0.42], [-1, 0.42], [1, 0.42]]) add(new THREE.BoxGeometry(0.08, 0.9, 0.08), M('#6b4a2e'), x, 0.45, z);
  for (const x of [-1.05, 1.05]) add(new THREE.BoxGeometry(0.07, 2.2, 0.07), M('#6b4a2e'), x, 1.1, -0.5);
  for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.38, 0.03, 1.2), M(i % 2 ? '#ffffff' : '#c8302a'), -0.95 + i * 0.38, 2.15, -0.05).rotation.x = 0.35;
  for (let i = 0; i < 3; i++) { const b = add(new THREE.SphereGeometry(0.16, 12, 8), M('#c9934a'), -0.8 + i * 0.22, 1.0, 0.1); b.scale.set(1.3, 0.6, 0.9); }
  for (let i = 0; i < 2; i++) add(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 18), M('#f0dca0'), 0.05 + i * 0.1, 1.02 + i * 0.14, -0.05);
  for (let i = 0; i < 3; i++) { add(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12), M('#e0a020', { transparent: true, opacity: 0.85 }), 0.6 + i * 0.17, 1.02, 0.15); add(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 12), M('#c8302a'), 0.6 + i * 0.17, 1.12, 0.15); }
  return g;
}

// Mojón de sendero (piedras con franjas blanca y amarilla) y, en la cima, hito con buzón y bandera
function makeCairn(top) {
  const g = new THREE.Group(), st = new THREE.MeshStandardMaterial({ color: '#9a938a', roughness: 0.9 });
  const n = top ? 6 : 4;
  for (let i = 0; i < n; i++) { const r = (top ? 0.75 : 0.42) * (1 - i / (n + 1)); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), st); m.position.y = r * 0.6 + i * r * 0.95; m.rotation.set(i, i * 1.3, 0); m.scale.y = 0.7; m.castShadow = true; g.add(m); }
  const h = top ? 3.4 : 1.5;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, h, 0.16), new THREE.MeshStandardMaterial({ color: '#d9d2c4', roughness: 0.8 })); post.position.y = h / 2; post.castShadow = true; g.add(post);
  for (const [y, c] of [[h - 0.18, '#ffffff'], [h - 0.36, '#f2c230']]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.18), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: c, emissiveIntensity: 0.15 })); b.position.y = y; g.add(b); }
  if (top) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.3), new THREE.MeshStandardMaterial({ color: '#b83a2a', metalness: 0.4, roughness: 0.4 })); box.position.set(0, 1.9, 0.2); g.add(box);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ color: '#d42f2f', side: THREE.DoubleSide, roughness: 0.7 })); flag.position.set(0.53, h - 0.35, 0); g.add(flag);
    const star = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 20), new THREE.MeshStandardMaterial({ color: '#FFD700', metalness: 0.6, roughness: 0.3 })); star.position.set(0.53, h - 0.35, 0.02); g.add(star);
  }
  return g;
}

// marca del visor: «?» o el nombre del monte ya descubierto
function pinTex(t) {
  const c = document.createElement('canvas'), q = t === '?'; c.width = q ? 128 : 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,12,40,0.78)'; g.strokeStyle = '#FFD700'; g.lineWidth = 6; g.beginPath(); g.roundRect(4, 4, c.width - 8, 92, 30); g.fill(); g.stroke();
  g.fillStyle = '#FFD700'; g.beginPath(); g.moveTo(c.width / 2 - 14, 96); g.lineTo(c.width / 2 + 14, 96); g.lineTo(c.width / 2, 124); g.fill();
  g.fillStyle = '#fff'; g.font = `900 ${q ? 64 : 48}px Nunito, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, c.width / 2, 52);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
