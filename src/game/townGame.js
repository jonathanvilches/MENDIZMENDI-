// Partida en un pueblo o ciudad: misiones con pasos claros, personajes, minijuegos y sello final.
import * as THREE from 'three';
import { Actor } from '../actors/people.js';
import { PLACES, BRIDGES } from '../world/layout.js';
import { groundHeight, terrainHeight, waterLevelAt } from '../world/heightfield.js';
import { TOWN } from '../world/townBuilder.js';
import { isFree, segmentBlocked } from '../world/colliders.js';
import { clamp, lerp, angleDiff, mulberry32 } from '../util/math.js';
import { profile, saveProfile, townState, addXP, checkBadges, addCard, comarcaDone, levelOf } from './profile.js';
import { infoCard, timingGame, mashGame, sequenceGame, simonGame, missionComplete, townFinale } from '../ui/minigames.js';
import { makeItem, makeGate, makeWorkbench } from './items.js';
import COMARCAS from '../data/comarcas.json';
import FOLKLORE from '../data/folklore.json';
import { LEVELS } from '../data/levels.js';
import { COSTUMES } from '../actors/minifig.js';
import { stampImg } from '../assets.js';
import { FAUNA, faunaName } from '../data/fauna.js';
import { LEGENDS, NIGHT_CARNIVAL } from '../data/legends.js';
import MOUNTAINS from '../data/mountains.json';
import { Fronton, findFrontonSpot } from './fronton.js';
import { makeClue, makeAura } from './legendFx.js';
import { Chase } from './chase.js';

const CROP = {
  uva: ['racimos de uva', 'uva'], olivo: ['aceitunas', 'olivo'], piquillo: ['pimientos del piquillo', 'piquillo'], esparrago: ['manojos de espárragos', 'esparrago'],
  alcachofa: ['alcachofas', 'alcachofa'], cardo: ['cardos', 'cardo'], tomate: ['tomates', 'tomate'], trigo: ['gavillas de trigo', 'trigo'], patata: ['patatas', 'patata'],
  manzana: ['manzanas', 'manzana'], almendra: ['almendras', 'almendra'], pocha: ['vainas de pocha', 'pocha'], maiz: ['mazorcas', 'corn'],
};
const ANIMAL = { sheep: ['ovejas', 'sheep'], cows: ['vacas', 'cow'], pottoka: ['pottokas', 'pottoka'], horses: ['caballos', 'pottoka'], goats: ['cabras', 'sheep'] };
const TRADE = {
  herrero: { title: 'El herrero', game: 'timing', verb: 'Golpear', icon: 'anvil', hint: 'Golpea el hierro cuando la marca esté en la zona roja.', act: 'hammer', look: { shirt: '#5a4a3a', apron: '#3a2a1a', pants: '#2b2630', hammer: true } },
  palomero: { title: 'Los palomeros', game: 'timing', verb: 'Agitar la paleta', icon: 'net', hint: 'Agita la paleta blanca justo cuando pasa el bando de palomas.', act: 'wave' },
  harrijasotzaile: { title: 'Levantar la piedra', game: 'mash', verb: '¡Arriba!', icon: 'stone', hint: 'Pulsa muy rápido para subir la piedra al hombro.', act: 'lift' },
  aizkolari: { title: 'Aizkolari', game: 'timing', verb: 'Hachazo', icon: 'axe', hint: 'Da cada hachazo en el momento justo para cortar el tronco.', act: 'chop' },
  cantero: { title: 'El cantero', game: 'timing', verb: 'Tallar', icon: 'hammer', hint: 'Talla la piedra con golpes precisos.', act: 'hammer' },
  alpargatero: { title: 'Alpargatas de esparto', game: 'timing', verb: 'Coser', icon: 'espadrille', hint: 'Cose la suela de esparto con puntadas precisas.', act: 'pick' },
};
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
  'comparsa-peralta': { shirt: '#e03c3c', pattern: 'dots', pattern2: '#f2c230', pants: '#3a8fd6', hat: 'cone', hatColor: '#3ca05a' },
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

export class TownGame {
  constructor(ctx, def) {
    Object.assign(this, ctx);        // scene, camera, player, follow, ui, sound, input, sky, fauna, particles, beacon, onExit
    this.def = def;
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
    this.missions = (def.missions || []).map((m, i) => this.makeMission(m, i));
    this.state = { name: this.P.name || 'Mendi', settings: this.P.settings };
    // luz propia de las criaturas de la noche: se crea al cargar (apagada) para que encenderla
    // después no obligue a recompilar los materiales en mitad de la persecución
    if (this.missions.some(M => M.type === 'legend' || (M.type === 'carnival' && M.night))) {
      this.creatureLight = new THREE.PointLight('#9fe0ff', 0, 24, 1.4); this.creatureLight.position.set(0, -50, 0); this.scene.add(this.creatureLight);
    }
  }
  // ---------- Definición de misiones y pasos ----------
  makeMission(m, i) {
    const d = this.def;
    const M = { i, m, type: m.type, step: 0, count: 0, done: !!this.ts.done[i] };
    const host = () => M.host?.name || 'tu guía';
    switch (m.type) {
      case 'visit': {
        M.title = `Conoce ${d.name}`; M.icon = 'church';
        M.places = [{ kind: 'church', name: d.church?.name || 'La iglesia', text: d.church?.text || '', style: d.church?.style }, ...(d.landmarks || []).filter(l => !['walls'].includes(l.kind) || true)];
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
      case 'dance': M.title = m.name || 'La danza'; M.icon = 'dance'; M.steps = () => ['Habla con ' + host(), 'Ve al centro de la plaza', `Baila: ${m.name}`]; break;
      case 'carnival': { const f = FOLKLORE.find(x => x.id === m.character); M.folk = f; M.title = m.title || f?.name || 'Carnaval'; M.icon = 'mask'; M.need = 3; M.night = NIGHT_CARNIVAL[m.character];
        M.steps = () => M.night ? ['Habla con ' + host(), 'Espera a que caiga la noche', `Encuentra a los ${f?.name?.toLowerCase() || 'personajes'}s (${M.count}/${M.need}) — escucha sus cencerros`, 'Vuelve con ' + host()]
          : ['Habla con ' + host(), `Encuentra a ${f?.name || 'los personajes'} (${M.count}/${M.need}) — escucha sus cencerros`, 'Vuelve con ' + host()]; break; }
      case 'trade': { const t = TRADE[m.kind] || TRADE.herrero; M.trade = t; M.title = m.title || t.title; M.icon = t.icon; M.steps = () => ['Habla con ' + host(), `Trabaja en el taller: ${t.title.toLowerCase()}`]; break; }
      case 'legend': { const L = M.leg = LEGENDS[m.who]; M.title = m.title || 'Leyenda'; M.icon = 'legend'; M.need = L?.clues.length || m.gather?.n || 4;
        M.steps = () => ['Escucha la leyenda: habla con ' + host(), 'Espera a que caiga la noche', `Sigue las pistas que brillan en la oscuridad (${M.count}/${M.need})`, `Encuentra a ${L?.creature || 'la criatura'}`]; break; }
      case 'race': { const r = RACE[m.kind] || RACE.camino; M.title = m.title || r[0]; M.icon = r[1]; M.need = 6;
        M.steps = () => ['Habla con ' + host(), `${r[2]}: pasa por los aros (${M.count}/${M.need})`, 'Vuelve con ' + host()]; break; }
      case 'observe': M.title = m.title || 'Observa'; M.icon = 'binoculars'; M.need = m.n || 3; M.species = [].concat(m.species || []);
        M.steps = () => ['Habla con ' + host(), `Con los prismáticos, encuentra ${M.species.map(faunaName).join(' o ').toLowerCase() || 'animales'} (${M.count}/${M.need})`, 'Vuelve con ' + host()]; break;
      case 'tradition': M.title = m.title || 'Tradición'; M.icon = m.kind === 'angel' ? 'angel' : 'music';
        M.steps = () => ['Habla con ' + host(), m.kind === 'angel' ? 'Prepara la bajada: repite la secuencia' : 'Repite la melodía']; break;
      case 'summit': { const pk = M.peak = MOUNTAINS.find(x => x.id === m.peak); M.title = `Sube al ${pk?.name || 'monte'}`; M.icon = 'peak'; M.need = 4;
        M.steps = () => ['Habla con ' + host(), `Sigue los mojones hasta la cima (${M.count}/${M.need})`, `Llega a la cima del ${pk?.name || 'monte'}`]; break; }
      case 'pelota': M.title = m.title || 'Partido en el frontón'; M.icon = 'pelota';
        M.steps = () => ['Habla con ' + host(), 'Gana el partido de pelota a 5 tantos']; break;
      case 'quiz': M.title = `El sabio de ${d.name}`; M.icon = 'quiz'; M.need = QUIZ_N; M.steps = () => ['Habla con ' + host(), `Responde bien las preguntas (${M.count}/${M.need})`]; break;
      default: M.title = m.title || 'Misión'; M.icon = 'star'; M.steps = () => ['Habla con ' + host()];
    }
    return M;
  }
  stepText(M) { if (M.done) return '¡Completada!'; const s = M.steps(); return s[Math.min(M.step, s.length - 1)]; }

  // ---------- Aparición de personajes ----------
  spot(p, r = 4, avoidWater = true) {
    for (let k = 0; k < 60; k++) {
      const a = k * 2.4, d = k === 0 ? 0 : r * 0.3 + k * 0.6;
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (!isFree(x, z, 0.9)) continue;
      if (avoidWater && waterLevelAt(x, z) > groundHeight(x, z) - 0.05) continue;
      const g0 = groundHeight(x, z), g1 = groundHeight(x + 1, z), g2 = groundHeight(x, z + 1);
      if (Math.abs(g1 - g0) > 0.6 || Math.abs(g2 - g0) > 0.6) continue;
      return { x, z };
    }
    return { x: p.x, z: p.z };
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
      case 'trade': return m.kind === 'aizkolari' ? { x: P.forest.x * 0.5 + P.plaza.x * 0.5, z: P.forest.z * 0.4 } : m.kind === 'palomero' ? P.edgeN : { x: P.market.x + 6, z: P.market.z + 4 };
      case 'legend': return M.leg?.teller ? { x: P.plaza.x + (M.i % 2 ? -9 : 9), z: P.plaza.z - 6 } : lm('cave')?.spot ? { x: (lm('cave').spot.x + P.plaza.x) / 2, z: (lm('cave').spot.z + P.plaza.z) / 2 } : { x: P.plaza.x - 9, z: P.plaza.z - 6 };
      case 'race': return { x: P.spawn.x - 4, z: P.spawn.z - 20 };
      case 'observe': return lm('gorge')?.spot || P.edgeN;
      case 'pelota': return this.ensureFronton() ? { x: this.fronton.entry.x + 2, z: this.fronton.entry.z } : P.plaza;
      case 'summit': return { x: P.plaza.x + (P.edgeN ? (P.edgeN.x - P.plaza.x) * 0.25 : 10), z: P.plaza.z + (P.edgeN ? (P.edgeN.z - P.plaza.z) * 0.25 : -14) };
      case 'quiz': return TOWN.church?.door ? { x: TOWN.church.door.x, z: TOWN.church.door.z + 0 } : P.plaza;
    }
    return P.plaza;
  }
  // Frontón del pueblo: está siempre, con o sin misión de pelota
  ensureFronton() {
    if (!this.fronton) { const sp = findFrontonSpot(PLACES.plaza); if (sp) this.fronton = new Fronton(this.scene, sp); }
    return this.fronton;
  }
  spawn() {
    const d = this.def;
    this.ensureFronton();
    for (const M of this.missions) {
      const pos = this.spot(this.placeFor(M), 5);
      const h = (M.leg?.teller) || M.m.host || (M.type === 'visit' ? { name: 'Guía ' + (this.rnd() < 0.5 ? 'Ane' : 'Iker'), look: { shirt: '#f2c230', vest: '#3a8fd6', pants: '#2b3a6b', hair: '#3b2418', ponytail: true, female: true, strap: '#6b4a2e', bag: '#8a6a3a', face: 'happy' } }
        : M.type === 'quiz' ? { name: 'Sabio del concejo', look: { shirt: '#efe9dc', vest: '#2b2630', pants: '#2b2630', hair: '#dcd7cf', beard: '#dcd7cf', txapela: '#1d1d24', old: true, glasses: '#3a2a1a', staff: true } } : { name: 'Vecino', look: {} });
      const a = new Actor({ id: 'm' + M.i, name: h.name, x: pos.x, z: pos.z, heading: Math.atan2(PLACES.plaza.x - pos.x, PLACES.plaza.z - pos.z), look: h.look }, this.scene);
      a.mission = M; M.host = a; this.actors.push(a);
      if (M.type === 'trade') {
        const wb = makeWorkbench(M.m.kind); const p2 = this.spot({ x: pos.x + 2.5, z: pos.z + 1.5 }, 3);
        wb.position.set(p2.x, groundHeight(p2.x, p2.z), p2.z); wb.rotation.y = Math.atan2(pos.x - p2.x, pos.z - p2.z); this.scene.add(wb); M.bench = { x: p2.x, z: p2.z, obj: wb };
      }
    }
    // vecinos que pasean
    const pal = PALETTE[d.family] || PALETTE.central;
    const pts = [PLACES.plaza, PLACES.market, TOWN.church?.door || PLACES.church, ...TOWN.houses.filter((_, i) => i % 7 === 0).map(h => h.door)].filter(Boolean);
    const nW = d.family === 'city' ? 10 : 6;
    for (let i = 0; i < nW && pts.length > 2; i++) {
      const R = this.rnd, pick = (a) => a[Math.floor(R() * a.length)];
      const female = R() < 0.5, old = R() < 0.25, kid = !old && R() < 0.25;
      const look = { skin: pick(SKINS), hair: old ? '#dcd7cf' : pick(HAIRS), shirt: pick(pal.shirts), pants: pick(pal.pants), old,
        height: kid ? 1.3 : undefined, bun: female && !kid && R() < 0.5, braids: female && kid, longHair: female && R() < 0.4, female,
        skirt: female && R() < 0.5 ? pick(pal.pants) : undefined, vest: !female && R() < 0.35 ? pick(pal.extras) : undefined, txapela: !female && old && R() < 0.7 ? '#1d1d24' : undefined,
        scarf: R() < 0.2 ? pick(pal.extras) : undefined, apron: female && old && R() < 0.4 ? '#f4f1ea' : undefined, basket: R() < 0.2, pattern: R() < 0.2 ? 'check' : undefined, moustache: !female && old && R() < 0.5 ? '#dcd7cf' : undefined };
      const route = [0, 1, 2].map(() => { const p = pick(pts); const s = this.spot(p, 3); return { x: s.x, z: s.z }; });
      const s0 = route[0];
      const a = new Actor({ id: 'w' + i, name: ['Maite', 'Josu', 'Amaia', 'Patxi', 'Nekane', 'Koldo', 'Itziar', 'Mikel', 'Leire', 'Fermín'][i % 10], x: s0.x, z: s0.z, look, route, walkSpeed: 1 + R() * 0.4 }, this.scene);
      this.walkers.push(a);
    }
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
    // aparición del jugador
    const sp = this.spot(PLACES.spawn, 4);
    this.player.place(sp.x, sp.z, Math.atan2(PLACES.plaza.x - sp.x, PLACES.plaza.z - sp.z));
    this.follow.snap(this.player);
    this.autoTrack();
    window.__TOWN_PEN = TOWN.pen;
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

  // ---------- Bucle ----------
  update(dt) {
    this.elapsed += dt;
    const P = this.player;
    const cull = (a, max) => {
      const d = Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z);
      const sh = d < 28; if (a.shadowOn !== sh) { a.shadowOn = sh; a.obj.traverse(o => { if (o.isMesh) o.castShadow = sh; }); }
      if (d < max + 15) a.update(dt, P);
      a.obj.visible = a.visible !== false && d < max;
    };
    for (const a of this.actors) cull(a, 110);
    for (const a of this.walkers) cull(a, 70);
    for (const f of this.folk) this.updateFolk(f, dt);
    // objetos
    for (const it of this.items) {
      const o = it.obj; o.visible = Math.abs(it.x - P.pos.x) + Math.abs(it.z - P.pos.z) < 120;
      if (!o.visible) continue;
      o.userData.body.rotation.y += dt * 1.4; o.userData.body.position.y = 0.2 + Math.sin(this.elapsed * 2.5 + it.x) * 0.1;
      o.userData.ring.material.opacity = 0.45 + Math.sin(this.elapsed * 4) * 0.25;
    }
    for (const g of this.gates) if (g.obj.visible) g.obj.userData.torus.rotation.z += dt * (g.next ? 2 : 0.3);
    if (this.herd) this.updateHerd(dt);
    if (this.race) this.updateRace(dt);
    if (this.mode === 'dance') this.updateDance(dt);
    if (this.mode === 'bino') this.updateBino(dt);
    if (this.mode === 'pelota' && this.pelotaTick) this.pelotaTick(dt);
    this.updateNight(dt);
    for (const M of this.missions) if (M.type === 'summit' && M.step === 1 && !M.done) this.updateSummit(M);
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
      case 'summit': { if (M.step >= 1 && M.cairns) { const c = M.cairns.find(c => !c.reached); if (c) return { x: c.x, z: c.z, h: c.top ? 3.2 : 2 }; } return at(M.host); }
      case 'process': case 'harvest': if (M.step === 1) return nearest(this.items.filter(it => it.M === M).map(it => ({ x: it.x, z: it.z, h: 1.4 }))); return at(M.host);
      case 'herd': if (M.step === 1) { const loose = this.herd?.filter(s => !s.penned) || []; const t = nearest(loose.map(s => ({ x: s.pos.x, z: s.pos.z, h: 1.8 }))); return t || { x: TOWN.pen.x, z: TOWN.pen.z, h: 2 }; } return at(M.host);
      case 'dance': return M.step === 1 ? { x: PLACES.plaza.x, z: PLACES.plaza.z, h: 3 } : at(M.host);
      case 'carnival': return (M.night ? M.step === 1 || M.step === 2 : M.step === 1) ? null : at(M.host);
      case 'trade': return M.step === 1 && M.bench ? { x: M.bench.x, z: M.bench.z, h: 2 } : at(M.host);
      case 'race': if (M.step === 1) { const g = this.gates.find(g => g.next); return g ? { x: g.x, z: g.z, h: 4.4 } : null; } return at(M.host);
      case 'observe': if (M.step === 1) { const t = this.obsNearest(M); return t ? { x: t.pos.x, z: t.pos.z, h: 0, noArrow: true } : null; } return at(M.host);
    }
    return at(M.host);
  }
  updateHUD() {
    const M = this.missions[this.tracked];
    const t = this.target();
    this.beacon.set(t && !t.noArrow ? t : null, '#ffd34d');
    if (!M) { this.ui.setQuest(null); return; }
    let dist = null, angle = null;
    if (t) {
      const dx = t.x - this.player.pos.x, dz = t.z - this.player.pos.z; dist = Math.hypot(dx, dz);
      const fwd = Math.atan2(-Math.sin(this.follow.yaw), -Math.cos(this.follow.yaw)); angle = -angleDiff(fwd, Math.atan2(dx, dz));
    }
    const nSteps = M.steps().length;
    this.ui.setQuest({ title: M.title, step: this.stepText(M), icon: M.icon, dist, angle, nSteps, stepIdx: Math.min(M.step, nSteps) });
    this.ui.updateMinimap(this.player, this.follow.yaw, this.mapMarkers(), t);
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
    for (const l of TOWN.landmarks) L.push({ x: l.spot.x, z: l.spot.z, icon: l.kind, label: l.name.length > 18 ? l.name.slice(0, 17) + '…' : l.name });
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
  interactables() {
    const list = [];
    for (const a of this.actors) if (a.visible !== false) list.push({ kind: 'npc', a, x: a.pos.x, z: a.pos.z, r: 3, label: a === this.pelotari ? `Jugar a pelota con ${a.name}` : `Hablar con ${a.name}` });
    for (const a of this.walkers) list.push({ kind: 'walker', a, x: a.pos.x, z: a.pos.z, r: 2.4, label: `Saludar a ${a.name}` });
    for (const it of this.items) list.push({ kind: 'item', it, x: it.x, z: it.z, r: 2.2, label: it.label });
    for (const M of this.missions) if (M.bench && M.step === 1 && !M.done) list.push({ kind: 'bench', M, x: M.bench.x, z: M.bench.z, r: 3, label: M.trade.verb });
    for (const k of this.clues) if (!k.found && k.obj.visible) list.push({ kind: 'clue', k, x: k.x, z: k.z, r: 2.6, label: 'Examinar' });
    for (const M of this.missions) if (M.creature && M.creature.shown && !M.done && !M.chase) list.push({ kind: 'creature', M, x: M.creature.pos.x, z: M.creature.pos.z, r: 3.6, label: `Hablar con ${M.leg.creature}` });
    if (TOWN.fountain) list.push({ kind: 'fountain', x: TOWN.fountain.x, z: TOWN.fountain.z, r: 3.8, label: 'Beber agua' });
    if (this.fronton) list.push({ kind: 'fronton', x: this.fronton.entry.x, z: this.fronton.entry.z, r: 3, label: 'Jugar a pelota' });
    return list;
  }
  updateInteraction() {
    if (this.mode !== 'play' || this.ui.busy) { this.ui.setPrompt(null); return; }
    const P = this.player.pos;
    let best = null, bd = 1e9;
    for (const it of this.interactables()) { const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r && d < bd) { bd = d; best = it; } }
    this.ui.setPrompt(best ? best.label : null);
    if (this.input.consume('e') && best) this.interact(best);
    if (this.input.consume('f') && this.binoOn) this.toggleBinoculars();
    if (this.input.consume('c')) this.ui.openBook();
    if (this.input.consume('m')) this.ui.openMap();
    if (this.input.consume('escape')) this.ui.openMenu();
  }
  async interact(it) {
    this.sound.ui('click');
    if (it.kind === 'npc' && it.a === this.pelotari) return this.freePelota();
    if (it.kind === 'npc') return this.talk(it.a);
    if (it.kind === 'fronton') {
      const M = this.missions.find(M => M.type === 'pelota' && !M.done);
      return M ? this.talk(M.host) : this.freePelota();
    }
    if (it.kind === 'walker') { it.a.say(2.5); it.a.wave = 1.2; const L = WALKER_LINES[this.walkers.indexOf(it.a) % WALKER_LINES.length]; return this.say(it.a, L); }
    if (it.kind === 'item') return this.pick(it.it);
    if (it.kind === 'bench') return this.doTrade(it.M);
    if (it.kind === 'clue') return this.examineClue(it.k);
    if (it.kind === 'creature') return this.meetCreature(it.M);
    if (it.kind === 'fountain') { this.particles.emit({ x: it.x, y: TOWN.fountain.y + 1.4, z: it.z }, { n: 20, color: '#bfe8ff', speed: 1.5, size: 0.25, life: 0.8 }); this.sound.splash(this.player.pos, 0.6); this.ui.toast('Agua fresca de la fuente de la plaza.', 'water'); }
  }
  // Partido libre en el frontón del pueblo (fuera de las misiones): contra el pelotari o el anfitrión de la misión
  async freePelota() {
    const a = this.pelotari || this.missions.find(M => M.type === 'pelota')?.host;
    if (!this.fronton || !a || this.mode !== 'play') return;
    this.player.frozen = true;
    try {
      const first = !this.pelotaSeen; this.pelotaSeen = true;
      await this.say(a, first ? ['¡Aupa! ¿Echamos un partido de pelota a mano?', 'La pelota tiene que dar en el frontis por encima de la chapa, la raya roja. Ve al círculo verde y pulsa GOLPE cuando brille.']
        : ['¿Otro partido? ¡Vamos!']);
    } finally { this.player.frozen = false; a.talking = 0; }
    const r = await this.fronton.play(this, a);
    if (r.quit) return;
    const best = (townState(profile(), this.def.id).best ||= {});
    if (r.win) { best.pelota = (best.pelota || 0) + 1; saveProfile(); }
    await this.say(a, [r.win ? `¡${r.you} a ${r.cpu}! Juegas como un pelotari de verdad. Vuelve cuando quieras.` : `${r.you} a ${r.cpu}. ¡Casi! Aquí estaré para la revancha.`]);
  }
  say(a, lines) {
    const look = a.obj?.userData.look;
    return this.ui.dialog(lines.map(t => ({ who: a.name, look, ...(typeof t === 'string' ? { text: t } : t) })));
  }
  async talk(a) {
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
          await S([`¡Kaixo, ${name}! Ongi etorri: bienvenido a ${d.name}.`, d.intro || '', `Aquí hay ${M.need} lugares que tienes que conocer: ${M.places.map(p => p.name).join(', ')}.`, 'Sigue la luz dorada y la flecha de arriba. Cuando llegues a cada lugar, lo apuntarás en tu cuaderno.'].filter(Boolean));
          this.startVisit(M);
        } else if (M.step === 1) await S([`Te quedan ${M.need - M.count} lugares por visitar. ¡Sigue la luz dorada!`]);
        else { await S([`¡Ya conoces ${d.name}! Ahora la gente del pueblo te pedirá ayuda.`, 'Los que tienen una exclamación amarilla encima tienen una misión para ti.']); await this.complete(M); }
        return;
      case 'process':
        if (M.step === 0) { await S([m.text, `Primero: ${m.gather?.label?.toLowerCase() || 'recoge lo necesario'}. Necesito ${M.need}.`]); this.startGather(M, m.gather?.item || 'star', m.gather?.label || 'Recoger', m.gather?.near); }
        else if (M.step === 1) await S([`Aún faltan ${M.need - M.count}. ¡Tú puedes!`]);
        else if (M.step === 2 || M.step === 3) {
          M.step = 3;
          await S([`¡Perfecto! Ahora hagamos ${m.product} paso a paso. Ordena lo que se hace primero.`]);
          const r = await sequenceGame(this.ui, { title: m.product, hint: 'Toca los pasos en el orden correcto', icon: M.icon, steps: m.steps });
          if (r.win) { await S([`¡Así se hace ${m.product}! Es un producto de ${this.comarca?.name || 'Navarra'}.`]); await this.complete(M, { card: m.product, cardText: m.text }); }
        }
        return;
      case 'harvest':
        if (M.step === 0) { await S([m.text, `Recoge ${M.need} ${CROP[m.crop]?.[0] || 'frutos'} en los campos. Te los marco con un brillo.`]); this.startGather(M, M.item, 'Recoger ' + (CROP[m.crop]?.[0] || ''), 'fields'); }
        else if (M.step === 1) await S([`Te faltan ${M.need - M.count}. ¡Mira en los campos!`]);
        else { this.player.rig.doAct('pick', 0.8); await S(['¡Qué buena cosecha! Esto lo llevaremos al mercado.']); await this.complete(M, { card: CROP[m.crop]?.[0], cardText: m.text }); }
        return;
      case 'herd':
        if (M.step === 0) { await S([m.text, 'Acércate por detrás de los animales para que avancen hacia la puerta del redil. Si corres, se asustan.']); this.startHerd(M); }
        else if (M.step === 1) await S([`Quedan ${M.need - M.count}. Rodéalos con calma.`]);
        else { await S(['¡Todos dentro! Buen trabajo de pastor.']); await this.complete(M, { card: M.title, cardText: m.text }); }
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
        if (M.step === 0) { await S([m.text, `Ven al banco de trabajo. ${M.trade.hint}`]); M.step = 1; }
        else await S(['Ponte en el banco de trabajo cuando quieras.']);
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
        if (M.step === 0 || (M.step === 1 && !this.race)) { await S([m.text, `Pasa por los ${M.need} aros antes de que se acabe el tiempo. ¡Mantén pulsado Mayús o el botón de correr!`]); this.startRace(M); }
        else if (M.step === 2) { await S(['¡Qué rapidez! Lo has conseguido.']); await this.complete(M, { card: M.title, cardText: m.text }); }
        return;
      case 'observe': {
        const F0 = FAUNA[M.species[0]];
        if (M.step === 0) {
          await S([...(m.story || []), m.text, F0 ? `Fíjate bien: ${F0.look}` : '', 'Toma mis prismáticos. Pulsa F (o el botón de prismáticos), busca con calma y, cuando el círculo se ponga amarillo, pulsa E para anotarlo. La brújula te indica hacia dónde mirar.'].filter(Boolean));
          M.step = 1; this.binoOn = true; this.ui.showBinoButton(); this.obsSeen ||= new Set();
        } else if (M.step === 1) await S([`Llevas ${M.count}/${M.need}. ${m.hint || 'Mira al cielo: sigue la marca de la brújula.'}`]);
        else { await S([m.outro || '¡Muy bien observado! Has aprendido a reconocerlos por su silueta, como los guardas de verdad.']); await this.complete(M, { card: M.title, cardText: m.text }); }
        return;
      }
      case 'tradition': {
        await S([m.text, m.kind === 'angel' ? 'Repite los movimientos en el mismo orden.' : 'Escucha la melodía y repítela.']);
        M.step = 1;
        const r = await simonGame(this.ui, { title: M.title, icon: M.icon, rounds: 4, labels: m.kind === 'angel' ? ['Cuerda', 'Alas', 'Bajar', 'Saludo'] : null });
        if (r.win) { await S(['¡Precioso! Así se mantiene viva la tradición.']); await this.complete(M, { card: M.title, cardText: m.text }); }
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
        const r = await this.fronton.play(this, a);
        if (r.win) { await S([`¡${r.you} a ${r.cpu}! Juegas como un pelotari de verdad.`]); await this.complete(M, { card: M.title, cardText: m.text }); }
        else await S([`${r.you} a ${r.cpu}. ¡Casi! Háblame otra vez para jugar la revancha.`]);
        return;
      }
      case 'summit': {
        const pk = M.peak;
        if (M.step === 0) {
          await S([`¿Ves ese monte de ahí arriba? Es como el ${pk.name}${pk.altName ? ' (' + pk.altName + ')' : ''}: ${pk.intro}`,
            `El de verdad mide ${pk.altitude.toLocaleString('es')} metros. Desde ${pk.start} son ${String(pk.distance).replace('.', ',')} km y ${pk.gain} metros de desnivel.`,
            'Te he marcado el camino con mojones pintados de blanco y amarillo, como los de los senderos de verdad. Síguelos hasta la cima y firma en el buzón de cumbre.',
            'Un consejo de montañera: agua, gorra y paso tranquilo. ¡Y nunca subas sola ni solo al monte!']);
          this.startSummit(M);
        } else await S([`Sigue los mojones: te faltan ${M.need - M.count} hasta la cima.`]);
        return;
      }
      case 'quiz':
        if (M.step === 0) { await S([`¡Hola, ${name}! Soy quien más sabe de ${d.name}. ¿Aceptas mi reto? Tres preguntas sobre el pueblo y la comarca.`]); M.step = 1; }
        await this.quizRound(M, a, QUIZ_N - M.count);
        if (M.count >= M.need) await this.complete(M, { card: `Sabio de ${d.name}` });
        return;
    }
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
      if (M.type === 'dance' && M.step === 1 && this.mode === 'play' && !this.ui.busy && Math.hypot(P.x - PLACES.plaza.x, P.z - PLACES.plaza.z) < 5) this.startDance(M);
    }
  }
  async showPlace(M, p) {
    M.count++;
    const kicker = p.kind === 'church' ? ({ romanesque: 'Arte románico', gothic: 'Arte gótico', baroque: 'Arte barroco', fortress: 'Iglesia-fortaleza', cathedral: 'Catedral' }[p.style] || 'Iglesia') : 'Patrimonio de ' + this.def.name;
    const isNew = addCard(this.def.id + ':' + p.name);
    this.sound.magic();
    await infoCard(this.ui, { icon: p.kind === 'church' ? (p.style === 'cathedral' ? 'cathedral' : p.style === 'fortress' ? 'castle' : 'church') : p.kind, kicker, title: p.name, text: p.text, badge: isNew ? 'Nueva carta' : '', button: M.count >= M.need ? `¡Hecho! Vuelve con ${M.host.name}` : `Seguir (${M.count}/${M.need})` });
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
      s.pos.set(sp.x, groundHeight(sp.x, sp.z), sp.z); s.home = { x: sp.x, z: sp.z }; s.range = 4; s.fleeDist = kind === 'cow' ? 5 : 4.2; s.run = kind === 'cow' ? 2.4 : 2.8; s.herd = true; s.penned = false; s.bounds = null;
    });
    this.herdM = M;
  }
  updateHerd(dt) {
    const pen = TOWN.pen, M = this.herdM;
    const inPen = (s) => Math.abs(s.pos.x - pen.x) < pen.w / 2 - 0.6 && Math.abs(s.pos.z - pen.z) < pen.d / 2 - 0.6;
    let n = 0;
    for (const s of this.herd) {
      if (!s.penned && inPen(s)) {
        s.penned = true; s.fleeDist = 0; s.home = { x: pen.x, z: pen.z }; s.range = 3;
        s.bounds = (X, Z) => Math.abs(X - pen.x) < pen.w / 2 - 0.8 && Math.abs(Z - pen.z) < pen.d / 2 - 0.8;
        if (s.kind === 'cow') this.sound.moo(s.pos); else this.sound.baa(s.pos);
        this.sound.ui('coin'); this.particles.emit({ x: s.pos.x, y: s.pos.y + 1.2, z: s.pos.z }, { n: 12, color: '#ffe38a', speed: 1.5, size: 0.25 });
      }
      if (s.penned) n++;
    }
    if (n !== M.count) { M.count = n; this.ui.toast(this.stepText(M), M.icon, 1500); }
    if (n >= this.herd.length) { this.herd = null; M.step = 2; this.sound.magic(); this.ui.toast(`¡Todos en el redil! Vuelve con ${M.host.name}`, 'check', 3000); }
  }

  // Presentación breve del pueblo al llegar: un solo vuelo de cámara hasta el jugador con una frase
  async introFly() {
    const d = this.def, town = d.name.split(' /')[0], P = PLACES.plaza, gy = terrainHeight(P.x, P.z), pl = this.player.pos;
    const first = (d.intro || '').split(/(?<=[.!?])\s/)[0];
    this.mode = 'cine'; this.player.frozen = true; this.ui.hudVisible(false);
    let skip = false; const onSkip = () => { skip = true; };
    setTimeout(() => { addEventListener('keydown', onSkip); addEventListener('pointerdown', onSkip); }, 300);
    const cin = { pos: new THREE.Vector3(P.x + 60, gy + 45, P.z + 60), look: new THREE.Vector3(P.x, gy, P.z), t: 0 };
    this.camera.position.set(P.x + 90, gy + 70, P.z + 90); cin.lookCur = cin.look.clone();
    this.follow.cinematic = cin;
    this.ui.setCinematic(true, first ? `${town}. ${first}` : town);
    for (let t = 0; t < 2600 && !skip; t += 100) await new Promise(r => setTimeout(r, 100));
    cin.pos.set(pl.x + 4, pl.y + 3, pl.z + 6); cin.look.set(pl.x, pl.y + 1.2, pl.z);
    for (let t = 0; t < 1800 && !skip; t += 100) await new Promise(r => setTimeout(r, 100));
    removeEventListener('keydown', onSkip); removeEventListener('pointerdown', onSkip);
    this.follow.cinematic = null; this.follow.snap(this.player);
    this.ui.setCinematic(false); this.ui.hudVisible(true);
    this.player.frozen = false; this.mode = 'play';
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
    M.y0 = this.player.pos.y;
    this.ui.toast('Sigue los mojones blancos y amarillos', 'peak', 2800);
  }
  updateSummit(M) {
    const c = M.cairns.find(c => !c.reached); if (!c || this.mode !== 'play' || this.ui.busy) return;
    if (Math.hypot(c.x - this.player.pos.x, c.z - this.player.pos.z) > (c.top ? 4.5 : 4)) return;
    c.reached = true; M.count++; this.sound.ui('coin');
    this.particles.emit({ x: c.x, y: groundHeight(c.x, c.z) + 1.5, z: c.z }, { n: 20, color: ['#ffffff', '#FFD700'], speed: 1.6, size: 0.25 });
    const pk = M.peak, climbed = Math.max(0, Math.round(this.player.pos.y - M.y0));
    const lines = [pk.route, pk.terrain, `Ya has subido ${climbed} metros. Mira hacia abajo: el pueblo se ve cada vez más pequeño.`];
    if (!c.top) { this.ui.whisper(lines[M.count - 1] || '', 5200); this.ui.toast(this.stepText(M), 'peak', 1600); }
    else this.reachSummit(M, climbed);
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
    await infoCard(this.ui, { icon: 'peak', kicker: `Buzón de cumbre · ${pk.zone}`, title: `${pk.name}${pk.altName ? ' · ' + pk.altName : ''}`, text: `${pk.intro} Altitud: ${pk.altitude.toLocaleString('es')} m. Desde ${pk.start}: ${String(pk.distance).replace('.', ',')} km y ${pk.gain} m de desnivel. En el juego has subido ${climbed} m.`, badge: 'Cima conseguida', button: '¡Firmar en el buzón!' });
    this.follow.cinematic = null; this.follow.snap(P); this.player.frozen = false;
    await this.complete(M, { card: pk.name, cardText: pk.intro });
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
      const a = new Actor({ id: 'c' + M.i, name: M.leg.creature, x: s.x, z: s.z, heading: Math.atan2(this.player.pos.x - s.x, this.player.pos.z - s.z), look, mini: look }, this.scene);
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
      const a = new Actor({ id: 'f' + i, name: M.folk?.name || 'Personaje', x: p.x, z: p.z, look, mini: look, wander: 6, walkSpeed: 0.9 }, this.scene);
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
  async doTrade(M) {
    const t = M.trade;
    this.player.frozen = true; this.mode = 'mini';
    this.player.heading = Math.atan2(M.bench.x - this.player.pos.x, M.bench.z - this.player.pos.z);
    this.ui.onMiniHit = (ok) => { if (ok) { this.player.rig.doAct(t.act === 'wave' ? 'point' : t.act, 0.45); this.particles.emit({ x: M.bench.x, y: groundHeight(M.bench.x, M.bench.z) + 1, z: M.bench.z }, { n: 10, color: t.act === 'hammer' ? ['#ffb34a', '#ffe38a'] : ['#c9a27a', '#ffffff'], speed: 2.5, size: 0.18, life: 0.5 }); } };
    let r;
    try {
      r = t.game === 'mash' ? await mashGame(this.ui, { title: M.title, hint: t.hint, icon: t.icon, verb: t.verb, seconds: 7, goal: 32 })
        : await timingGame(this.ui, { title: M.title, hint: t.hint, icon: t.icon, verb: t.verb, rounds: 5, need: 3, zone: 0.2, speed: 0.6 });
    } finally { this.ui.onMiniHit = null; this.player.frozen = false; this.mode = 'play'; }
    if (r.win) { this.player.rig.doCheer(); await this.say(M.host, [`¡Tienes buenas manos! El oficio de ${t.title.toLowerCase()} pasaba de padres a hijos.`]); await this.complete(M, { card: M.title, cardText: M.m.text }); }
    else await this.say(M.host, ['¡Casi! Vuelve a intentarlo cuando quieras en el banco de trabajo.']);
  }

  // ---------- Carrera por aros ----------
  startRace(M) {
    M.step = 1; M.count = 0;
    for (const g of this.gates) this.scene.remove(g.obj);
    this.gates = [];
    // recorrido: de la salida a la plaza, a la iglesia, a un monumento y de vuelta
    const pts = [PLACES.spawn, PLACES.plaza, TOWN.church?.door || PLACES.church, ...(TOWN.landmarks.slice(0, 2).map(l => l.spot)), PLACES.market, PLACES.plaza];
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
    const c = PLACES.plaza, y = terrainHeight(c.x, c.z);
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
    if (this.mode === 'bino') { this.mode = 'play'; this.ui.binoculars(false); this.camera.fov = this.camera.userData.fov0 || 55; this.camera.updateProjectionMatrix(); this.player.obj.visible = true; this.player.frozen = false; return; }
    if (this.mode !== 'play') return;
    this.mode = 'bino'; this.ui.binoculars(true); this.sound.ui('open');
    this.player.frozen = true; this.player.obj.visible = false;
    this.binoYaw = this.follow.yaw + Math.PI; this.binoPitch = 0.25;
  }
  updateBino(dt) {
    const P = this.player.pos, cam = this.camera;
    const sens = this.input.touch ? 0.0012 : 0.0009;
    this.binoYaw -= this.input.look.dx * sens; this.binoPitch = clamp(this.binoPitch - this.input.look.dy * sens, -0.6, 1.3);
    const mv = this.input.move; this.binoYaw -= mv.x * dt * 0.8; this.binoPitch = clamp(this.binoPitch + mv.y * dt * 0.6, -0.6, 1.3);
    cam.fov = lerp(cam.fov, 10, 1 - Math.exp(-8 * dt)); cam.updateProjectionMatrix();
    const eye = new THREE.Vector3(P.x, P.y + 1.55, P.z);
    const dir = new THREE.Vector3(Math.sin(this.binoYaw) * Math.cos(this.binoPitch), Math.sin(this.binoPitch), Math.cos(this.binoYaw) * Math.cos(this.binoPitch));
    cam.position.copy(eye); cam.lookAt(eye.clone().add(dir));
    this.follow.yaw = this.binoYaw + Math.PI;
    let best = null, ba = 1;
    const obs = this.fauna.observables();
    for (const o of obs) {
      const to = new THREE.Vector3(o.pos.x - eye.x, o.pos.y + (o.h || 0.5) - eye.y, o.pos.z - eye.z);
      const d = to.length(); if (d > (o.far ? 320 : 110) || d < 1) continue;
      const ang = to.normalize().angleTo(dir), tol = Math.max(0.035, (o.far ? 3 : 1.4) / d);
      if (ang < tol && ang < ba && (o.far || !segmentBlocked(eye.x, eye.z, o.pos.x, o.pos.z))) { ba = ang; best = o; }
    }
    // un ave detrás de una casa o de la iglesia no se puede anotar: comprobamos que no haya nada en medio
    if (best && best.far) {
      const town = this.townMeshes ||= (this.scene.getObjectByName('town')?.children || []).filter(m => m.isMesh);
      const to = new THREE.Vector3(best.pos.x - eye.x, best.pos.y - eye.y, best.pos.z - eye.z), d = to.length();
      this.ray ||= new THREE.Raycaster(); this.ray.set(eye, to.normalize()); this.ray.far = d;
      if (this.ray.intersectObjects(town, false).length) best = null;
    }
    const M = this.missions.find(x => x.type === 'observe' && x.step === 1);
    const key = best ? (best.obj?.uuid || best.id + ':' + Math.round(best.pos.x) + ',' + Math.round(best.pos.z)) : null;
    const counts = M && best && (!M.species.length || M.species.includes(best.id));
    const isNew = best && !this.obsSeen?.has(key);
    const F = best ? FAUNA[best.id] : null;
    // sin nada en el visor: flecha hacia el animal buscado más cercano
    let hint = null;
    if (!best && M) { const t = this.obsNearest(M); if (t) { const v = new THREE.Vector3(t.pos.x, t.pos.y + (t.h || 0.4), t.pos.z).project(cam); const behind = v.z > 1; hint = Math.atan2(behind ? -v.y : v.y, behind ? -v.x : v.x); } }
    this.ui.binoTarget(best ? `${F?.name || best.id}${isNew ? (counts || !M ? ' — pulsa E para anotar' : ' — anótalo en tu cuaderno') : ' — anotado'}` : (M ? 'Sigue la flecha' : ''), !!best, hint);
    if (this.input.consume('e') || this.input.consume(' ')) {
      this.sound.ui('photo');
      if (best && isNew) {
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
    if (!first && !M) { this.ui.toast(`${F.name} anotado`, 'binoculars'); return; }
    this.sound.magic();
    const done = M && M.count >= M.need;
    await infoCard(this.ui, { icon: id, kicker: `Cuaderno de campo · ${F.eu}`, title: F.name, text: `${F.look} ${F.fact}`, badge: first ? 'Especie nueva' : '', button: M ? (done ? `¡Hecho! Vuelve con ${M.host.name}` : `Seguir buscando (${M.count}/${M.need})`) : 'Seguir observando' });
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
    this.ts.done[M.i] = true;
    const xp = { visit: 80, quiz: 60, summit: 150 }[M.type] || 100;
    const lvUp = addXP(xp);
    if (card) addCard(this.def.id + ':' + card);
    this.player.rig.doCheer(); this.particles.confetti?.(this.player.pos, 70);
    const doneN = this.missions.filter(x => x.done).length;
    saveProfile();
    await missionComplete(this.ui, { title: M.title, text: cardText ? cardText : `Has completado una misión en ${this.def.name}.`, xp, card, icon: M.icon, progress: { done: doneN, total: this.missions.length, name: this.def.name } });
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
  dispose() { this.ui.setMG(null); if (this.danceKeys) removeEventListener('keydown', this.danceKeys, true); this.rh?.remove(); if (this.mode === 'bino') this.ui.binoculars(false); }
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
