// Partida en un pueblo o ciudad: misiones con pasos claros, personajes, minijuegos y sello final.
import * as THREE from 'three';
import { Actor, cullActor, frameFrustum } from '../actors/people.js';
import { PLACES } from '../world/layout.js';
import { loadMeshy, hasMeshy } from '../actors/glbChar.js';
import { QUALITY } from '../util/quality.js';
import { Jornales } from './jornales.js';
import { groundHeight, terrainHeight, waterLevelAt, onPlatform } from '../world/heightfield.js';
import { TOWN } from '../world/townBuilder.js';
import { isFree, addCircle } from '../world/colliders.js';
import { angleDiff, mulberry32 } from '../util/math.js';
import { profile, saveProfile, townState, addXP, checkBadges, addCard, comarcaDone, levelOf } from './profile.js';
import { infoCard, missionComplete, townFinale } from '../ui/minigames.js';
import { OFICIOS } from '../data/oficios.js';
import { personajeUrl } from '../ui/laminas.js';
import { tr } from '../i18n.js';
import { PERSONAJES } from '../data/personajes.js';
import { makeItem, makeWorkbench, makeMemorial } from './items.js';
import COMARCAS from '../data/comarcas.json';
import FOLKLORE from '../data/folklore.json';
import { LEVELS } from '../data/levels.js';
import { stampImg } from '../assets.js';
import { drawTownArms, casaImg, casaReady, casaReadyHD, drawReady } from '../ui/escudoImg.js';
import { faunaName } from '../data/fauna.js';
import { LEGENDS, NIGHT_CARNIVAL } from '../data/legends.js';
import MOUNTAINS from '../data/mountains.json';
import { buildAgro } from '../world/agro.js';
import { PASTOR_INFO, VAQUERA_INFO, CROP } from '../data/campo.js';
import { kaixo } from './saludo.js';
import { enCss } from '../util/tele.js';
import { Mochila } from './mochila.js';
import { Perro } from './perro.js';
import { makeTownSignpost } from './senales.js';
import { foodFrom } from '../data/equipo.js';
import { Tienda } from './tienda.js';
import { Mercado, marketDay } from './mercado.js';
import { GOODS } from '../data/tiendas.js';
import { PET } from '../data/tocar.js';
import { SITES } from '../data/dolmen.js';
import { SABIOS, NO_SABIO } from '../data/sabios.js';
import { montesFrom, townLatLon, MIRADOR_TOWNS } from '../data/miradores.js';
import { relievePolar } from '../world/relieve.js';
import { houseArms } from '../data/blasones.js';
import { armsOfTown } from '../data/armas-navarra.js';
import { missionSlots, edadDe } from '../data/edad.js';
import { officialHeight } from '../world/armas.js';
import { CAT_BY_TYPE, SABERES } from '../data/saberes.js';
import { drawArms } from '../world/heraldry.js';
import { readArms, readTownArms } from '../ui/escudo.js';
import { instrumentosDe, instrumentoById } from '../data/instrumentos.js';
import { PASAKA } from '../data/pasaka.js';
import { CASTLE_TOWNS } from '../data/castillos.js';
import { GearProps } from '../actors/gear3d.js';
import { Fronton, findFrontonSpot, frontonWall, frontonExtent, labritInTown } from './fronton.js';
import { Pista, findPistaSpot } from './pista.js';
import { clubOfTown } from '../futbol/clubs.js';
import { FloraSpots } from './floraSpots.js';
import { cuentoOfTown } from '../data/cuentos.js';
import { repartirTareas, TAREAS } from './rutinas.js';
import { townPelotari, pelotariGirl } from '../ui/pelotariFig.js';
import { vueloPueblo } from './llegadas.js';
import { mezcla } from '../util/mezcla.js';
import { PuebloDeportes } from './townDeportes.js';
import { PuebloCimas } from './townCimas.js';
import { PuebloLeyendas } from './townLeyendas.js';
import { PuebloActividades, ANIMAL } from './townActividades.js';
import { PuebloCharla, QUIZ_N } from './townCharla.js';
// el encierro y el fútbol (motores grandes) se descargan al entrar en ellos, no al abrir el juego

const TRADE = {
  herrero: { art: 'anvil', title: 'El herrero', game: 'timing', verb: 'Golpear', icon: 'anvil', hint: 'Golpea el hierro al rojo para darle forma.', act: 'hammer', look: { shirt: '#5a4a3a', apron: '#3a2a1a', pants: '#2b2630', hammer: true } },
  palomero: { art: 'dove', title: 'Los palomeros', game: 'timing', verb: 'Agitar la paleta', icon: 'net', hint: 'Agita la paleta blanca justo cuando pasa el bando de palomas.', act: 'wave' },
  harrijasotzaile: { art: 'lift', title: 'Levantar la piedra', game: 'mash', verb: '¡Arriba!', icon: 'stone', hint: 'Sube la piedra con una mano y otra, y luego al hombro.', act: 'lift' },
  aizkolari: { art: 'chop', title: 'Aizkolari', game: 'timing', verb: 'Hachazo', icon: 'axe', hint: 'Corta el tronco a hachazos, a un lado y a otro.', act: 'chop' },
  cantero: { art: 'stone', title: 'El cantero', game: 'timing', verb: 'Tallar', icon: 'hammer', hint: 'Talla la piedra con golpes precisos.', act: 'hammer' },
  alpargatero: { art: 'sole', title: 'Alpargatas de esparto', game: 'timing', verb: 'Coser', icon: 'espadrille', hint: 'Cose la suela de esparto con puntadas precisas.', act: 'pick' },
};
const _to = new THREE.Vector3();   // (vector de trabajo de los bocadillos)
// nombre del guía del pueblo, nunca el mismo que el de quien juega («Guía Ane: ¡Kaixo, Ane!» confundía)
const guideName = (g, me = '') => (g ? ['Ane', 'Maite'] : ['Iker', 'Unai']).find(n => n.toLowerCase() !== String(me).trim().toLowerCase());
const RACE = { camino: ['El Camino de Santiago', 'camino', 'Sigue las conchas y flechas amarillas'], almadia: ['Bajada en almadía', 'raft', 'Guía la almadía por el río'], encierro: ['Carrera del encierro', 'bull', '¡Corre delante de los toros!'], romeria: ['Romería', 'footprint', 'Sube por el camino de los romeros'], bici: ['Vía verde', 'bike', 'Recorre el viejo trazado del tren'], senda: ['La senda del bosque', 'footprint', 'Sigue la senda del bosque'] };
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

/** ¿Sale el pastor con su rebaño en este pueblo? (pueblos con granja, no ciudades). Se mira al terminar de montar el
 *  pueblo, para descargar su personaje solo donde hace falta. */
export const hasShepherd = (d) => !!(TOWN.farm || PLACES.farm) && d.family !== 'city';

export class TownGame {
  constructor(ctx, def) {
    Object.assign(this, ctx);        // scene, camera, player, follow, ui, sound, input, sky, fauna, particles, beacon, onExit
    this.def = def;
    // (en los pueblos con mirador, el relieve de detalle se abre ya, para tenerlo cuando se saquen los prismáticos)
    if (def.id in MIRADOR_TOWNS) relievePolar(def.id).then((G) => { this.polarG = G; });
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
    this.state = { name: this.P.name || 'Iñigo', settings: this.P.settings };
    // luz propia de las criaturas de la noche: se crea al cargar (apagada) para que encenderla
    // después no obligue a recompilar los materiales en mitad de la persecución. En calidad baja, sin ella: aunque esté
    // apagada, cada material la calcula en cada punto de la imagen, y en las gráficas flojas eso pesa
    if (QUALITY !== 'low' && this.missions.some(M => M.type === 'legend' || (M.type === 'carnival' && M.night))) {
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
      case 'legend': { const L = M.leg = m.leg ? { ...LEGENDS[m.who], ...m.leg } : LEGENDS[m.who];   // (un bosque cuenta la suya: leg) M.title = m.title || 'Leyenda'; M.icon = 'legend'; M.need = L?.clues.length || m.gather?.n || 4;
        M.steps = () => ['Escucha la leyenda: habla con ' + host(), 'Espera a que caiga la noche', `Sigue las pistas que brillan en la oscuridad (${M.count}/${M.need})`, `Encuentra a ${L?.creature || 'la criatura'}`]; break; }
      case 'race': { const r = RACE[m.kind] || RACE.camino; M.title = m.title || r[0]; M.icon = r[1]; M.need = 6;
        M.steps = () => ['Habla con ' + host(), `${r[2]}: pasa por los aros (${M.count}/${M.need})`, 'Vuelve con ' + host()]; break; }
      case 'observe': M.title = m.title || 'Observa'; M.icon = 'binoculars'; M.need = m.n || 3; M.species = [].concat(m.species || []);
        M.steps = () => ['Habla con ' + host(), `Con los prismáticos, encuentra ${M.species.map(faunaName).join(' o ').toLowerCase() || 'animales'} (${M.count}/${M.need})`, 'Vuelve con ' + host()]; break;
      case 'tradition': M.title = m.title || 'Tradición'; M.icon = m.kind === 'angel' ? 'angel' : 'music';
        M.steps = () => ['Habla con ' + host(), m.kind === 'angel' ? 'Prepara la bajada: repite la secuencia' : 'Repite la melodía']; break;
      case 'summit': { const pk = M.peak = MOUNTAINS.find(x => x.id === m.peak); M.title = `Sube al ${pk?.name || 'monte'}`; M.icon = 'peak'; M.need = 4;
        M.steps = () => [M.prep ? `Prepara la mochila: ${this.supplyText()} y vuelve con ${host()}` : 'Habla con ' + host(), `Sigue los mojones hasta la cima (${M.count}/${M.need})${M.wild ? ` · animales ${M.wild.filter(w => w.found).length}/${M.wild.length}` : ''}`, `Llega a la cima del ${pk?.name || 'monte'}`]; break; }
      case 'mirador': { const ll = townLatLon(d); M.montes = ll ? montesFrom(ll.lat, ll.lon, 4, d.id) : []; M.title = m.title || 'Los montes desde el mirador'; M.icon = 'binoculars'; M.need = Math.min(3, M.montes.length) || 1;
        M.steps = () => ['Habla con ' + host(), `Ve al mirador y busca los montes con los prismáticos (${M.count}/${M.need})`, 'Vuelve con ' + host()]; break; }
      case 'dolmen': { const st = M.site = SITES[m.site || 'dolmen']; M.title = m.title || 'El secreto del dolmen'; M.icon = st.icon; M.need = st.finds.length;
        M.steps = () => ['Habla con ' + host(), `Excava ${st.where} con cuidado (${M.count}/${M.need})`, 'Vuelve con ' + host()]; break; }
      case 'castle': { const C = M.castle = CASTLE_TOWNS[m.castle]; M.title = m.title || C.title; M.icon = 'castle'; M.need = C.parts.length;
        M.steps = () => ['Habla con ' + host(), `Recorre las partes del castillo: busca las banderas (${M.count}/${M.need})`, 'Vuelve con ' + host()]; break; }
      case 'feria': M.title = m.title || 'Feria de ganado'; M.icon = 'cow';
        M.steps = () => ['Habla con ' + host(), 'Ve a los corrales: juez por un día', 'Vuelve con ' + host() + ' y cierra el trato']; break;
      case 'figure': { const F = M.fig = PERSONAJES[m.who]; M.figImg = personajeUrl(m.who) || ''; M.title = F.name; M.icon = F.icon;
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
    // (con lo que lo rodea: la iglesia, la casa consistorial o las casas de la calle; si eso no cabe, el de la plaza con su grada)
    if (!this.fronton && !this.def.bosque) {
      const W = frontonWall(this.def), at = PLACES.frontonNear || PLACES.plaza;
      let sp = findFrontonSpot(at, frontonExtent(W.estilo), !!PLACES.frontonReal);
      if (!sp && W.estilo !== 'plaza') { W.estilo = 'plaza'; sp = findFrontonSpot(at, undefined, !!PLACES.frontonReal); }
      if (sp) this.fronton = new Fronton(this.scene, sp, this.def.name.split(' /')[0], W);
    }
    return this.fronton;
  }
  // pista polideportiva del pueblo (donde espera el entrenador; el partido se juega en el campo del pueblo), si hay sitio llano cerca de la plaza (en Pamplona se juega en El
  // Sadar). Se levanta justo después del frontón y antes que la flora, los puestos y los demás objetos, para que nada
  // quede encima de ella (antes se ponía al final y podía caer sobre plantas que no cuentan como obstáculo)
  ensurePista() {
    if (this._pistaDone) return this.pista;
    this._pistaDone = true;
    if (this.def.bosque || TOWN.landmarks.find(l => l.kind === 'stadium') || /nopista/.test(location.search)) return null;
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
    // los postes indicadores: en la plaza y, si se llega lejos de ella, también donde se aparece
    try { this.carteles(); } catch (e) { console.warn('carteles', e); }
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
    // el músico del pueblo, junto al corro de la plaza, con el instrumento de su zona (data/instrumentos.js): enseña a tocarlo (tocarCon)
    try { const inst = instrumentosDe(d.id)[0];
      if (inst) { const c = this.plazaStage(), s = this.spot({ x: c.x + 5.5, z: c.z - 4.5 }, 2.5), [nm] = inst.musico, fem = !!inst.female;
        const m = new Actor({ id: 'musico', name: nm, x: s.x, z: s.z, heading: Math.atan2(c.x - s.x, c.z - s.z), look: { shirt: '#f4f1ea', pants: '#1d1d24', skirt: fem ? '#1d1d24' : undefined, txapela: fem ? undefined : '#1d1d24', scarf: '#d42f2f', sash: '#d42f2f', espadrille: true, laces: '#d42f2f', female: fem, bun: fem, hair: fem ? '#3b2418' : '#2a1a12', staff: inst.id === 'txalaparta' || inst.id === 'kirikoketa', region: d.comarca, seed: 77 } }, this.scene);
        m.musico = inst.id; this.walkers.push(m); } } catch (e) { console.warn('músico', e); }
    // el canónigo del claustro de la catedral (Pamplona): invita a jugar a la pasaka (ui/pasaka.js, pasakaCon)
    if (d.id === 'pamplona' && TOWN.church?.claustro) try {
      const k = TOWN.church.claustro, s = this.spot({ x: k.x, z: k.z }, 2.5);
      const m = new Actor({ id: 'canonigo', name: PASAKA.canonigo.name, x: s.x, z: s.z, heading: k.heading || 0, look: { shirt: '#15131a', pants: '#15131a', hair: '#8c8c8c', old: true, glasses: '#3a2a1a', region: d.comarca, seed: 41 } }, this.scene);
      m.pasaka = true; this.canonigo = m; this.walkers.push(m);
    } catch (e) { console.warn('canónigo', e); }
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
    try { this.spawnBalcones(); } catch (e) { console.warn('balcones', e); }
    this.spawnShepherds();
    // jornales: ayudar en los oficios del pueblo para ganar txanponak (esquilar, ordeñar, fragua, vendimia…); después
    // del pastor y la ganadera, que son los que dan los trabajos del ganado
    try { this.jornales = new Jornales(this); } catch (e) { console.warn('jornales', e); }
    // pelotari del pueblo: espera junto al frontón para jugar cuando se quiera
    if (this.fronton && !this.missions.some(M => M.type === 'pelota')) {
      const e = this.fronton.entry, c = this.fronton.toWorld(0, 12), s = this.spot({ x: e.x - 2.5, z: e.z + 1 }, 3);
      // (de la plantilla del autor, siempre el mismo en cada pueblo: el de su carta en la colección; R() se sigue
      // llamando para que el resto del pueblo salga igual que antes)
      const R = this.rnd, name = townPelotari(this.def.id); R();
      const blue = R() < 0.5;
      this.pelotari = new Actor({ id: 'pelotari', name, x: s.x, z: s.z, heading: Math.atan2(c.x - s.x, c.z - s.z),
        look: { shirt: '#f6f3ec', pants: '#f6f3ec', sash: blue ? '#2f5fb3' : '#c8222a', espadrille: true, laces: blue ? '#2f5fb3' : '#c8222a',
          skin: SKINS[Math.floor(R() * SKINS.length)], hair: HAIRS[Math.floor(R() * HAIRS.length)], female: pelotariGirl(name), ponytail: pelotariGirl(name) } }, this.scene);
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
  // Vecinos asomados al balcón: en las casas con balcón más cerca de la plaza, alguien mira la calle y saluda cuando
  // pasas por debajo (sin hablar con ellos: están arriba; no estorban a quien pasa por la calle)
  spawnBalcones() {
    this.balconVecinos = [];
    const P = PLACES.plaza, d = this.def, n = QUALITY === 'low' ? 2 : 4;
    const B = TOWN.balcones.map(b => ({ ...b, k: Math.hypot(b.x - P.x, b.z - P.z) })).filter(b => b.k < 90).sort((a, b) => a.k - b.k);
    for (const b of B) {
      if (this.balconVecinos.length >= n) break;
      if (this.balconVecinos.some(a => Math.hypot(a.pos.x - b.x, a.pos.z - b.z) < 12)) continue;
      const i = this.balconVecinos.length, fem = (i + d.id.length) % 3 !== 1;
      const a = new Actor({ id: 'balcon' + i, name: fem ? 'Vecina' : 'Vecino', x: b.x, z: b.z, y: b.y, heading: b.ry, ghost: true, wander: 0,
        look: { region: d.comarca, female: fem, old: i % 2 === 0, seed: i * 13 + d.id.length } }, this.scene);
      a.frozen = true; a.balcon = true; this.balconVecinos.push(a);
    }
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
    // (mira cuatro veces por segundo, con el tiempo que ha pasado: sus plazos son de 15 y 45 s, y buscar ventanas abiertas
    // en toda la página en cada fotograma costaba casi medio milisegundo)
    this.wdT = (this.wdT || 0) + dt; if (this.wdT < 0.25) return; dt = this.wdT; this.wdT = 0;
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
    // (en Campeonatos solo el frontón: ni vecinos ni paseantes, salvo el pelotari; townDeportes.soloFronton)
    const solo = this.soloCancha, fuera = (a) => { a.obj.visible = false; a.onScreen = false; };
    for (const a of this.actors) { if (solo && a !== solo.keep) { fuera(a); continue; } cull(a, lowQ ? 70 : 110); }
    for (const a of this.walkers) { if (solo) { fuera(a); continue; } cull(a, lowQ ? 50 : 70); }
    for (const a of this.balconVecinos || []) {   // (los del balcón saludan cuando pasas cerca; otra vez si vuelves)
      if (solo) { fuera(a); continue; }
      cull(a, lowQ ? 70 : 110);
      const dd = Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z); if (dd < 14 && !a.saludo) { a.saludo = true; a.wave = 2.2; } else if (dd > 30) a.saludo = false;
    }
    for (const f of this.folk) { if (solo) { fuera(f); continue; } this.updateFolk(f, dt); }
    if (this.mode === 'play') this.bocadillos(dt); if (this._boc?.capa) this._boc.capa.hidden = this.mode !== 'play';   // (en los vídeos, los diálogos y los minijuegos, sin bocadillos)
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
    if (this.herd) this.updateHerd();
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
  // Bocadillos de los vecinos: al pasar junto a uno que va por la calle, te dice algo corto encima de la cabeza, en euskera
  // y a la hora que es («Egun on!», «Kaixo!», «Zer moduz?»…), como en una plaza de verdad. Dos a la vez como mucho y
  // cada vecino, una vez por minuto; se van solos a los dos segundos y medio
  bocadillos(dt) {
    const P = this.player.pos, cam = this.camera, B = this._boc ||= { t: 0, on: [], capa: null };
    B.t += dt;
    if (!B.capa) { B.capa = document.createElement('div'); B.capa.className = 'boc-capa'; document.body.appendChild(B.capa); }
    if (B.on.length < 2 && !this.ui.busy) for (const a of this.walkers) {
      if (B.on.length >= 2 || !a.pos || (a.bocT && B.t - a.bocT < 60) || B.on.some(o => o.a === a)) continue;
      const d = Math.hypot(a.pos.x - P.x, a.pos.z - P.z); if (d > 6 || d < 1.2) continue;
      const k = kaixo(this), frases = [k + '!', 'Kaixo!', 'Zer moduz?', 'Aupa!', k + '!', 'Ongi etorri!'];
      const el = document.createElement('div'); el.className = 'boc'; el.textContent = frases[Math.floor(this.rnd() * frases.length)];
      B.capa.appendChild(el); a.bocT = B.t; B.on.push({ a, el, t: 0 });
    }
    for (const o of B.on) {
      o.t += dt; const a = o.a, q = _to.set(a.pos.x, (a.pos.y ?? groundHeight(a.pos.x, a.pos.z)) + 2.25, a.pos.z).project(cam);
      const fuera = q.z > 1 || Math.abs(q.x) > 1.1 || Math.abs(q.y) > 1.1;
      o.el.style.transform = `translate(${enCss((q.x + 1) / 2 * innerWidth).toFixed(1)}px, ${enCss((1 - q.y) / 2 * innerHeight).toFixed(1)}px) translate(-50%, -100%)`;   // (en la tele, con la interfaz ampliada)
      o.el.classList.toggle('fuera', fuera || o.t > 2.5);
      if (o.t > 2.9) o.el.remove();
    }
    B.on = B.on.filter(o => o.t <= 2.9);
  }
  // Postes indicadores del pueblo: desde la plaza (y desde donde se llega, si queda lejos), una tablilla hacia cada sitio
  // que importa, con su nombre y su distancia: el frontón, la iglesia, la tienda, la pista y dos monumentos. Lo más
  // cerca, arriba; nada a menos de 20 m (se ve) ni a más de 400 (no se va andando)
  carteles() {
    if (this.def.bosque) return;
    // (los nombres largos, por palabra entera y sin acabar en «de los», «del» o «y»)
    const corto = (n) => { n = tr(n); if (n.length <= 18) return n; n = n.slice(0, 18).replace(/\s+\S*$/, ''); while (/\s(de|del|la|las|los|el|y|eta)$/i.test(n)) n = n.replace(/\s\S+$/, ''); return n; };
    const dest = [];
    if (this.fronton) dest.push({ name: tr('Frontón'), p: this.fronton.entry || this.fronton.spot });
    if (TOWN.church) dest.push({ name: corto(this.def.church?.label || 'Iglesia'), p: TOWN.church.door || PLACES.church });
    if (this.tienda?.pos) dest.push({ name: tr('Tienda'), p: this.tienda.pos });
    if (this.pista?.center) dest.push({ name: tr('Pista'), p: this.pista.center });
    for (const l of TOWN.landmarks.filter(l => l.spot && !['wall', 'house', 'stelae', 'cross'].includes(l.kind)).slice(0, 3)) dest.push({ name: corto(l.name), p: l.spot });
    const pon = (c) => {
      const at = this.spot(c, 4), y = groundHeight(at.x, at.z);
      const sitios = dest.filter(d => d.p).map(d => ({ name: d.name, dist: Math.hypot(d.p.x - at.x, d.p.z - at.z), ang: Math.atan2(d.p.x - at.x, d.p.z - at.z) }))
        .filter(s => s.dist > 20 && s.dist < 400).sort((a, b) => a.dist - b.dist).slice(0, 5);
      if (sitios.length < 2) return;
      const g = makeTownSignpost(sitios); g.position.set(at.x, y, at.z); this.scene.add(g); (this._carteles ||= []).push(g);
    };
    pon({ x: PLACES.plaza.x + 6, z: PLACES.plaza.z + 6 });
    if (PLACES.spawn && Math.hypot(PLACES.spawn.x - PLACES.plaza.x, PLACES.spawn.z - PLACES.plaza.z) > 45) pon({ x: PLACES.spawn.x + 3, z: PLACES.spawn.z + 3 });
  }
  mapLabels() {
    const L = [{ x: PLACES.plaza.x, z: PLACES.plaza.z - 18, label: this.def.name }];
    if (TOWN.church) L.push({ x: TOWN.church.x ?? PLACES.church.x, z: TOWN.church.z ?? PLACES.church.z, icon: 'church', label: this.def.church?.label || 'Iglesia' });
    for (const l of TOWN.landmarks) L.push({ x: l.spot.x, z: l.spot.z, icon: l.kind, label: (n => n.length > 24 ? n.slice(0, 23).replace(/\s+\S*$/, '') + '…' : n)(tr(l.name)) })   // (se corta por palabra entera, ya traducido);
    if (TOWN.farm) L.push({ x: TOWN.farm.x, z: TOWN.farm.z, icon: 'sheep', label: 'Granja' });
    L.push({ x: PLACES.fields.x, z: PLACES.fields.z, icon: 'wheat', label: 'Campos' });
    if (this.fronton) L.push({ x: this.fronton.spot.x, z: this.fronton.spot.z, icon: 'pelota', label: 'Frontón', text: 'Acércate al frontón para jugar a pelota', fronton: true, go: false });
    if (this.canonigo) L.push({ x: this.canonigo.pos.x, z: this.canonigo.pos.z, icon: 'pelota', label: 'Pasaka', text: 'El canónigo del claustro te enseña la pasaka' });
    return L;
  }
  setBook(M) { if (!M.done) { this.tracked = M.i; this.sound.ui('click'); } }
  /** Viajar a una misión (desde el libro o el mapa): junto al vecino que la da, mirándole, o, si ya está en marcha, al
   *  sitio de su paso siguiente; y se sigue con la luz dorada. Con un fundido, como al entrar al pueblo. */
  async goMission(M) {
    if (!M || this.disposed || this.goingM) return;
    const t = !M.done && M.step > 0 ? this.target(M) : null, dest = t || M.host?.pos; if (!dest) return;
    this.goingM = true;
    try {
      await this.ui.fadeOut(); if (this.disposed) return;
      const s = this.spot(dest, t ? 3 : 2.2); this.player.place(s.x, s.z, Math.atan2(dest.x - s.x, dest.z - s.z));
      this.follow.yaw = this.player.heading + Math.PI; this.follow.snap(this.player);
      if (!M.done) this.tracked = M.i;
      await this.ui.fadeIn();
    } finally { this.goingM = false; }
  }
  // Acciones del mapa: ir a una misión o a un sitio
  mapAct(a, it) {
    if (a === 'mission' || a === 'track') return this.goMission(this.missions[it.id]);
    if (a === 'go') this.teleport(it.x, it.z);
  }

  // ---------- Interacción ----------
  // ---------------------------------------------------------------- escudos de las fachadas
  // (en la fachada va el escudo con el acabado del autor en cuanto llega su imagen, src/assets/escudos/casas; mientras, y en
  // las casas que aún no la tienen, el tallado en piedra dibujado. La ficha enseña los dos: «En color» y «En piedra»)
  buildShields() {
    this.blasones = [];
    // (en las fachadas salen primero las casas que ya tienen el escudo del autor: un pueblo con dos fachadas y las imágenes
    // de las casas 7 y 8 las enseñaba talladas y dejaba las imágenes sin usar. El índice de la casa, no el de la fachada,
    // es el que guarda la carta «escudo:<pueblo>:<n>» y el que pide su imagen)
    const order = [...Array(8).keys()].sort((a, b) => (casaImg(this.def.id, b) ? 1 : 0) - (casaImg(this.def.id, a) ? 1 : 0) || a - b);
    TOWN.shields.slice(0, 8).forEach((sh, j) => {
      const i = order[j], A = houseArms(this.def, i), c = document.createElement('canvas'); c.width = 256; c.height = 336;
      const g = c.getContext('2d'); g.scale(2, 2); drawArms(g, 64, 4, 92, A, { stone: true }); g.setTransform(1, 0, 0, 1, 0, 0);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 2.03), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.9 }));
      m.position.set(sh.x + Math.sin(sh.ry) * 0.01, sh.y + 0.04, sh.z + Math.cos(sh.ry) * 0.01); m.rotation.y = sh.ry; this.scene.add(m);
      const b = { ...sh, A, idx: i, mesh: m, id: 'escudo:' + this.def.id + ':' + i };
      this.blasones.push(b);
      // (primero la imagen que va dentro y, en el archivo único con conexión, la grande de la web en cuanto llega)
      b.paint = (L) => { if (!L || !m.parent) return; g.clearRect(0, 0, c.width, c.height); drawReady(g, L, 8, 8, c.width - 16, c.height - 16); tex.needsUpdate = true; b.color = true; };
      casaReady(this.def.id, i).then(L => { b.paint(L); casaReadyHD(this.def.id, i).then(b.paint); });
    });
  }
  // escudo oficial del pueblo (o de su valle) pintado en el pilar de la plaza
  buildTownArms() {
    const A = armsOfTown(this.def.id), S = TOWN.armsSpot; if (!A || !S) return;
    const W = 200, c = document.createElement('canvas'); c.width = 256; c.height = Math.ceil(officialHeight(W, A)) + 10;
    drawTownArms(c.getContext('2d'), 128, 4, W, A);
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
    if (b.paint) casaReadyHD(this.def.id, b.idx).then(b.paint);   // (si la lista de la web llegó después de montar el pueblo)
    try { await this.lookAtArms(b.mesh, b.ry, 2.03); await readArms(this.ui, b.A, { town: this.def.name.split(' /')[0], isNew, regla: (P.cards || []).filter(c => c.startsWith('escudo:')).length, image: casaImg(this.def.id, b.idx) || '' }); }
    finally { this.endLookAtArms(); this.player.frozen = false; }
    addXP(isNew ? 20 : 4); saveProfile();
    for (const bd of checkBadges()) await infoCard(this.ui, { icon: bd.icon, kicker: 'Nueva insignia', title: bd.name, text: bd.text, button: '¡Bien!' });
    const left = this.blasones.filter(x => !P.cards.includes(x.id)).length;
    if (isNew) this.ui.toast(left ? `Escudo leído. Quedan ${left} en ${this.def.name.split(' /')[0]}` : `¡Has leído todos los escudos de ${this.def.name.split(' /')[0]}!`, 'shield', 2600);
  }
  // near: solo lo que está a unos pasos (el bucle de cada fotograma); sin near, todo (lo usan las pruebas). Se mira la
  // distancia antes de crear cada objeto con su texto: así no se fabrican cien rótulos por fotograma para quedarse con uno
  interactables(near = null) {
    const list = [], ok = (x, z) => !near || (Math.abs(x - near.x) < 7 && Math.abs(z - near.z) < 7);
    if (this.townArms && ok(this.townArms.read.x, this.townArms.read.z)) list.push({ kind: 'armas', x: this.townArms.read.x, z: this.townArms.read.z, r: 3, label: this.P.cards.includes(this.townArms.id) ? `Volver a leer el escudo de ${this.def.name.split(' /')[0]}` : `Leer el escudo de ${this.def.name.split(' /')[0]}` });
    for (const b of this.blasones || []) if (ok(b.read.x, b.read.z)) list.push({ kind: 'escudo', b, x: b.read.x, z: b.read.z, r: 3, label: this.P.cards.includes(b.id) ? 'Volver a leer el escudo' : 'Leer el escudo de la casa' });
    for (const a of this.actors) if (a.visible !== false && ok(a.pos.x, a.pos.z)) list.push({ kind: 'npc', a, x: a.pos.x, z: a.pos.z, r: 3, label: a.market ? `Puesto del mercado: ${a.market.toLowerCase()}` : a === this.pelotari ? `Jugar a pelota con ${a.name}` : a === this.coach ? 'Jugar un partido en El Sadar' : a === this.futsalCoach ? `Fútbol con ${clubOfTown(this.def.id)?.name || 'el club del pueblo'}` : a.sabio ? `${a.name}: la historia de ${a.sabio.name}` : a.cuento ? `${a.name}: escuchar «${a.cuento.title}»` : `Hablar con ${a.name}` });
    for (const a of this.walkers) if (ok(a.pos.x, a.pos.z)) list.push({ kind: 'walker', a, x: a.pos.x, z: a.pos.z, r: a.info || a.jobs ? 3 : 2.4, label: a.pasaka ? `Jugar a pasaka con ${a.name}` : a.musico ? `Tocar ${instrumentoById(a.musico)?.short || 'música'} con ${a.name}` : a.stall ? 'Productos del pueblo' : a.jobs ? `Ayudar a ${a.name.toLowerCase()} (txanponak)` : a.info ? `Hablar con ${a.name.toLowerCase() === 'pastor' ? 'el pastor' : 'la ganadera'}` : `Saludar a ${a.name}${TAREAS[a.tarea] ? ' · ' + TAREAS[a.tarea].name : ''}` });
    for (const o of this.agro?.list || []) if (ok(o.x, o.z)) list.push({ kind: 'agro', o, x: o.x, z: o.z, r: o.kind === 'combine' ? 6 : 4.5, label: `Mirar: ${o.info.title.toLowerCase()}` });
    for (const it of this.items) if (ok(it.x, it.z)) list.push({ kind: 'item', it, x: it.x, z: it.z, r: 2.2, label: it.label });
    for (const M of this.missions) if (M.bench && M.step === 1 && !M.done && ok(M.bench.x, M.bench.z)) list.push({ kind: 'bench', M, x: M.bench.x, z: M.bench.z, r: 3, label: M.oficio ? 'Entrar al taller' : M.trade.verb });
    for (const M of this.missions) if (M.memo && ok(M.memo.x, M.memo.z)) list.push({ kind: 'memorial', M, x: M.memo.x, z: M.memo.z, r: 2.8, label: M.step === 1 && !M.done ? `Ver el recuerdo de ${M.fig.name}` : `Leer la placa` });
    for (const k of this.clues) if (!k.found && k.obj.visible && ok(k.x, k.z)) list.push({ kind: 'clue', k, x: k.x, z: k.z, r: 2.6, label: 'Examinar' });
    for (const M of this.missions) if (M.creature && M.creature.shown && !M.done && !M.chase && ok(M.creature.pos.x, M.creature.pos.z)) list.push({ kind: 'creature', M, x: M.creature.pos.x, z: M.creature.pos.z, r: 3.6, label: `Hablar con ${M.leg.creature}` });
    // animales de granja cercanos (los del rebaño de una misión no)
    const Pp = this.player.pos;
    for (const a of this.fauna.animals) if (PET[a.kind] && !a.herd && Math.abs(a.pos.x - Pp.x) < 4 && Math.abs(a.pos.z - Pp.z) < 4) list.push({ kind: 'pet', a, x: a.pos.x, z: a.pos.z, r: a.kind === 'cow' ? 2.8 : 2.2, label: `Acariciar a ${PET[a.kind].name}` });
    if (TOWN.church?.door && this.def.church?.style !== 'borda') list.push({ kind: 'bell', x: TOWN.church.door.x, z: TOWN.church.door.z, r: 2.6, label: 'Tocar la campana' });
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
    for (const it of this.interactables(P)) { const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r && d < bd) { bd = d; best = it; } }
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
    if (it.kind === 'walker' && it.a.pasaka) return this.pasakaCon(it.a);
    if (it.kind === 'walker' && it.a.musico) return this.tocarCon(it.a);
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
    if (it.kind === 'walker') { it.a.chatWith = null; it.a.talkTo = null; it.a.say(2.5); it.a.wave = 1.2; const L = TAREAS[it.a.tarea]?.lines || WALKER_LINES[this.walkers.indexOf(it.a) % WALKER_LINES.length]; return this.say(it.a, [...L, ...this.hitzLines(it.a)]); }   // (lo que cuenta: lo que está haciendo, y una palabra en euskera)
    if (it.kind === 'item') return this.pick(it.it);
    if (it.kind === 'bench') return this.doTrade(it.M);
    if (it.kind === 'clue') return this.examineClue(it.k);
    if (it.kind === 'memorial') return this.doMemorial(it.M);
    if (it.kind === 'creature') return this.meetCreature(it.M);
    if (it.kind === 'fountain') { this.particles.emit({ x: it.x, y: TOWN.fountain.y + 1.4, z: it.z }, { n: 20, color: '#bfe8ff', speed: 1.5, size: 0.25, life: 0.8 }); this.sound.splash(this.player.pos, 0.6); return this.mochila.fountain(); }
  }
  // La llegada al pueblo, al empezar o al seguir la aventura: el vuelo por encima del pueblo con su nombre, su comarca y
  // Navarra con la comarca encendida (llegadas.js); acaba detrás del jugador, listo para andar
  async llegada() {
    if (this.mode !== 'play' || this.disposed) return;
    this.mode = 'cine'; this.player.frozen = true;
    try { await vueloPueblo({ follow: this.follow, player: this.player, ui: this.ui, def: this.def, centro: PLACES.plaza, iglesia: TOWN.church?.door || PLACES.church }); }
    finally { if (!this.disposed) { this.follow.snap(this.player); this.player.frozen = false; this.mode = 'play'; this.ui.hudVisible(true); } }
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
    else if (r === 'map') { await this.ui.fadeOut(); if (!this.disposed) this.onExit?.(); this.ui.fadeIn(); }   // (al mapa, con un fundido)
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
    document.querySelectorAll('.lg-root:not(.out), .pel-root, .sport-bg, .cartel').forEach(o => o.remove());   // (el panel que se está desvaneciendo, que acabe)
    this.perro?.cierraOferta();   // (el «¿Necesitas ayuda?» del perro, si estaba a la vista)
    if (this.townArms) { for (const m of [this.townArms.mesh, this.townArms.plate]) if (m) { m.geometry.dispose(); m.material.map?.dispose(); m.material.dispose(); } this.townArms = null; }
    for (const b of this.blasones || []) { b.mesh.geometry.dispose(); b.mesh.material.map?.dispose(); b.mesh.material.dispose(); }
    for (const c of this._carteles || []) c.userData.dispose?.();
    this._boc?.capa?.remove();
    // (que la interfaz, que dura toda la partida, no siga apuntando al pueblo que se deja: lo dejaba entero en memoria)
    if (this.ui.onDialogLine) this.ui.onDialogLine = null; this.ui.onMiniHit = null; if (this.ui.stage3d?.show) this.ui.stage3d = null;
    this.flora?.dispose(); document.querySelectorAll('.mg-overlay, .dogpick, .bagpanel').forEach(o => o.remove()); this.ui.closeModal?.(); this.ui.setMG(null); if (this.danceKeys) removeEventListener('keydown', this.danceKeys, true); this.rh?.remove(); if (this.mode === 'bino') this.ui.binoculars(false); }
}
// (sus métodos por temas, cada uno en su archivo: los deportes, los montes, las leyendas, lo que se hace en las misiones
// y las conversaciones)
mezcla(TownGame, PuebloDeportes, PuebloCimas, PuebloLeyendas, PuebloActividades, PuebloCharla);



