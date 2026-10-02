// Jornales: cuando no llega el dinero para comer, se ayuda a un vecino en su oficio y te paga en txanponak (y a veces
// con lo que sale del trabajo, para el trueque). Cada comarca tiene sus oficios de siempre: el pastor (esquilar, meter
// las ovejas en el redil, acompañarle al monte), la ganadera (ordeñar), el herrero (la fragua), la alpargatera
// (coser la suela), la vendimia y la huerta. La tienda y la mochila te mandan al jornal más cercano y la guía dorada
// te lleva hasta él. Cada trabajo se puede repetir pasado un rato.
import * as THREE from 'three';
import { Actor } from '../actors/people.js';
import { infoCard } from '../ui/minigames.js';
import { milkGame, shearGame, pickGame, forgeGame, stitchGame } from '../ui/oficioGames.js';
import { saveProfile } from './profile.js';
import { TOWN } from '../world/townBuilder.js';
import { PLACES } from '../world/layout.js';
import { groundHeight } from '../world/heightfield.js';

const AGAIN = 150;   // segundos hasta poder repetir el mismo trabajo

export const JOBS = {
  esquilar: { who: 'pastor', title: 'Esquilar las ovejas', icon: 'wool', game: 'shear', pay: 8, goods: 'lana',
    ask: '¿Me ayudas a esquilar? Antes se hacía a mano, con tijeras grandes, a principios del verano. La lana sale entera, como un abrigo.',
    then: 'Con tijeras de mano, oveja por oveja, en el suelo de la borda.', now: 'Con máquinas eléctricas: un buen esquilador pela una oveja en dos minutos.' },
  redil: { who: 'pastor', title: 'Meter las ovejas en el redil', icon: 'sheep', game: 'herd', pay: 9,
    ask: 'Se me han escapado tres ovejas del redil. Ponte detrás de ellas y empújalas despacio hacia la puerta: si corres, se asustan.' },
  acompanar: { who: 'pastor', title: 'Acompañar al pastor', icon: 'sheep', game: 'escort', pay: 8,
    ask: 'Subo con el rebaño a los pastos de arriba. ¿Me acompañas? No te quedes atrás, que las ovejas se despistan.' },
  ordenar: { who: 'ganadera', title: 'Ordeñar', icon: 'milk', game: 'milk', pay: 7, goods: 'leche',
    ask: '¿Me echas una mano con el ordeño? Antes se ordeñaba a mano, dos veces al día, sentados en un taburete de tres patas: una tetilla y luego la otra, con calma.',
    then: 'A mano, al amanecer y al atardecer, sentados en un taburete de tres patas.', now: 'Con ordeñadoras mecánicas que ordeñan varias vacas a la vez.' },
  forja: { who: 'herrero', title: 'Ayudar en la fragua', icon: 'anvil', game: 'forge', pay: 9,
    ask: 'Tengo que hacer herraduras para los caballos del pueblo. Tú sopla con el fuelle y golpea el hierro cuando esté al rojo.',
    then: 'Cada pueblo tenía su fragua: herraduras, rejas de arado, clavos y herramientas.', now: 'Quedan pocos herreros; muchos hacen rejas y barandillas artísticas.' },
  alpargatas: { who: 'alpargatera', title: 'Coser alpargatas', icon: 'espadrille', game: 'stitch', pay: 8,
    ask: 'Las golondrinas, las chicas del Roncal y de Salazar, cruzaban el Pirineo cada otoño para coser alpargatas en Mauleón. ¿Me ayudas a coser esta suela?',
    then: 'A mano, puntada a puntada, con la suela de yute en las rodillas.', now: 'Casi todas se hacen a máquina; las de artesanía se siguen cosiendo a mano.' },
  vendimia: { who: 'viticultor', title: 'La vendimia', icon: 'grapes', game: 'pick', kind: 'uva', pay: 8, goods: null,
    ask: 'Es tiempo de vendimia. Coge los racimos maduros, los morados, y deja los verdes en la cepa, que aún les falta.',
    then: 'A mano, con navaja y cestos de mimbre; las cuadrillas iban de pueblo en pueblo.', now: 'En muchas viñas se vendimia con máquina, de noche y con el fresco.' },
  huerta: { who: 'hortelana', title: 'Cosechar en la huerta', icon: 'pepper', game: 'pick', kind: 'pimiento', pay: 7, goods: null,
    ask: 'Ayúdame a recoger la huerta: solo lo que está en su punto, lo demás lo dejamos para otro día.',
    then: 'Toda la familia en la huerta, a mano, de madrugada para no pasar calor.', now: 'Las huertas de la Ribera siguen recogiéndose casi todo a mano.' },
};
// los oficios de cada comarca (además de los del pastor y la ganadera donde los hay)
const BY_COMARCA = {
  bidasoa: ['forja'], 'larraun-leitzaldea': ['forja'], sakana: ['forja'], pirineo: ['alpargatas'], prepirineo: ['forja'],
  sanguesa: ['vendimia', 'forja'], 'tierra-estella': ['vendimia', 'huerta'], 'valdizarbe-novenera': ['vendimia', 'forja'], 'zona-media': ['vendimia', 'forja'],
  'ribera-alta': ['huerta', 'vendimia'], ribera: ['huerta', 'vendimia'], pamplona: ['alpargatas', 'forja'],
};
const LOOK = {
  ganadera: { shirt: '#6b8fb3', vest: '#2d3a2b', pants: '#3a3530', hair: '#6b3b1f', ponytail: true, female: true },
  herrero: { shirt: '#8a7a6a', vest: '#3a2a20', pants: '#2e2a26', hair: '#2a1a12', moustache: '#2a1a12', apron: '#4a3020' },
  alpargatera: { shirt: '#f4efe2', vest: '#2a3a5a', pants: '#3a3040', hair: '#3a2418', bun: true, female: true },
  viticultor: { shirt: '#e6dcc0', vest: '#6a2a3a', pants: '#3a3530', hair: '#5a4030', txapela: '#1d1d24' },
  hortelana: { shirt: '#e8c86a', vest: '#4a6a3a', pants: '#3a4a5a', hair: '#2a1a12', ponytail: true, female: true, hat: 'straw' },
};
const NAME = { ganadera: 'Ganadera', herrero: 'Herrero', alpargatera: 'Alpargatera', viticultor: 'Viticultor', hortelana: 'Hortelana' };

export class Jornales {
  constructor(g) {
    this.g = g; this.guide = null; this.escort = null;
    const d = g.def, P = g.P; P.jobs ||= {}; this.done = (P.jobs[d.id] ||= {});
    this.list = [];   // { a: actor, jobs: [ids] }
    const walker = (id) => g.walkers.find(w => w.id === id);
    const pastor = walker('pastor');
    if (pastor) this.attach(pastor, TOWN.pen ? ['esquilar', 'redil', 'acompanar'] : ['esquilar', 'acompanar']);
    let ganadera = walker('vaquera');
    if (!ganadera && (d.family === 'atlantic' || d.family === 'pyrenean')) ganadera = this.spawn('ganadera', this.nearFarm(10));
    if (ganadera) this.attach(ganadera, ['ordenar']);
    const kinds = BY_COMARCA[d.comarca] || ['forja'];
    for (const k of kinds) {
      const who = JOBS[k].who, at = k === 'vendimia' || k === 'huerta' ? this.nearFarm(k === 'huerta' ? -14 : 18) : this.nearHouse();
      if (at) this.attach(this.spawn(who, at, k), [k]);
    }
    if (d.comarca === 'ribera' || d.comarca === 'ribera-alta') JOBS.huerta.kind = d.comarca === 'ribera' ? 'alcachofa' : 'pimiento';
  }
  // sitios: junto a la granja (o a las afueras) para el campo, en la puerta de una casa para los talleres
  nearFarm(off = 0) {
    const f = TOWN.farm || PLACES.farm || PLACES.plaza, s = this.g.spot({ x: f.x + off, z: f.z + 12 + Math.abs(off) * 0.3 }, 3);
    return s;
  }
  nearHouse() {
    const P = PLACES.plaza, hs = (TOWN.houses || []).filter(h => h.door).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
    const h = hs[2 + (this.list.length * 3) % Math.max(1, hs.length - 2)] || hs[0];
    return h ? this.g.spot(h.door, 2) : this.g.spot({ x: P.x + 14, z: P.z + 10 }, 3);
  }
  spawn(who, at, k) {
    const a = new Actor({ id: 'job-' + who, name: NAME[who] || who, x: at.x, z: at.z, look: LOOK[who] || {}, wander: 1.5, walkSpeed: 0.6 }, this.g.scene);
    this.g.walkers.push(a);
    // el herrero, con su yunque al lado
    if (who === 'herrero') { const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.32, 0.3), new THREE.MeshStandardMaterial({ color: '#3a3a40', metalness: 0.6, roughness: 0.5 })); const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.5, 0.28), m.material); m.position.y = 0.66; b.position.y = 0.25; const anv = new THREE.Group(); anv.add(m, b); anv.position.set(at.x + 1.2, groundHeight(at.x + 1.2, at.z), at.z); this.g.scene.add(anv); }
    return a;
  }
  attach(a, jobs) { a.jobs = jobs; this.list.push({ a, jobs }); }

  ready(id) { const t = this.done[id]; return !t || (Date.now() - t) / 1000 > AGAIN; }
  /** El trabajo disponible más cercano: { a, id } o null. */
  nearest() {
    const P = this.g.player.pos; let best = null, bd = 1e9;
    for (const { a, jobs } of this.list) { const id = jobs.find(j => this.ready(j)); if (!id) continue; const d = Math.hypot(a.pos.x - P.x, a.pos.z - P.z); if (d < bd) { bd = d; best = { a, id, d }; } }
    return best;
  }
  /** Consejo de la tienda o de la mochila cuando no hay dinero: a quién ayudar, y la guía dorada te lleva. */
  suggest() {
    const n = this.nearest(); if (!n) return 'Hoy ya has ayudado a todos: vuelve dentro de un rato, que siempre hay trabajo en el pueblo.';
    this.guide = n.a; this.guideT = 180;
    const J = JOBS[n.id];
    return `${n.a.name} necesita ayuda: «${J.title.toLowerCase()}». Te pagará ${J.pay} txanponak. Sigue la luz dorada.`;
  }
  guideTarget() {
    const a = this.guide; if (!a) return null;
    return { x: a.pos.x, z: a.pos.z, h: (a.obj.userData.H || 1.6) + 0.7 };
  }
  update(dt) {
    if (this.guide && (this.guideT -= dt) <= 0) this.guide = null;
    const e = this.escort; if (!e) return;
    // acompañar al pastor: él sube por su camino y tú vas a su lado; si te alejas mucho, te espera un poco y luego se va
    const g = this.g, a = e.a, P = g.player.pos, d = Math.hypot(a.pos.x - P.x, a.pos.z - P.z);
    a.ignorePlayer = true;
    if (d < 14) { e.t += dt; e.lost = 0; } else { e.lost += dt; if (e.lost > 1 && !e.warned) { e.warned = true; g.ui.toast('¡No te quedes atrás! Ve junto al pastor', 'sheep', 2000); } }
    if (d < 14 && e.warned) e.warned = false;
    if (Math.floor(e.t / 8) !== Math.floor((e.t - dt) / 8) && e.t < e.need) g.ui.toast(`Acompañando al pastor… ${Math.round(e.t / e.need * 100)} %`, 'sheep', 1400);
    if (e.lost > 14) { this.escort = null; a.ignorePlayer = false; g.ui.toast('El pastor ha seguido sin ti. Háblale para volver a intentarlo', 'sheep', 3000); return; }
    if (e.t >= e.need) { this.escort = null; a.ignorePlayer = false; this.pay(e.id, a, '¡Ya estamos arriba! Las ovejas pastan tranquilas. Gracias por la compañía.'); }
  }

  /** Hablar con alguien que tiene trabajo: te lo cuenta y, si quieres, te pones a ello. */
  async talk(a) {
    const g = this.g, h = g.herdJob;
    // vuelves de meter las ovejas en el redil: a cobrar
    if (h && h.host === a && h.step >= 2) { g.herdJob = null; g.herdM = null; return this.pay('redil', a, '¡Todas dentro! Eres un pastor de primera.'); }
    if (h && h.host === a) return g.say(a, [`Llevas ${h.count || 0} de ${h.need}. Ponte detrás de cada oveja para que camine hacia el redil.`]);
    if (this.escort?.a === a) return g.say(a, ['¡Vamos, que ya queda poco! No te separes.']);
    const free = a.jobs.filter(j => this.ready(j));
    if (!free.length) return g.say(a, ['Por hoy ya está, ¡eskerrik asko! Vuelve dentro de un rato si necesitas txanponak.']);
    if (a.info && !a.explained) { a.explained = true; await g.explainWork(a, true); }
    const id = free.length > 1 ? await this.choose(a, free) : free[0];
    if (!id) return;
    return this.work(a, id);
  }
  // si hay varios trabajos, cuál prefieres
  choose(a, ids) {
    return new Promise(res => {
      const g = this.g; g.ui.closeModal?.();
      const o = document.createElement('div'); o.className = 'mg-overlay info';
      o.innerHTML = `<div class="mg-card"><small class="kicker">${a.name}</small><h2>¿En qué me ayudas?</h2><p>Cada trabajo se paga en txanponak.</p>
        <div class="job-pick">${ids.map(id => `<button class="btn primary" data-j="${id}">${JOBS[id].title} · ${JOBS[id].pay} txanpon</button>`).join('')}<button class="btn" data-j="">Ahora no</button></div></div>`;
      document.body.appendChild(o); g.ui.modal = o;
      o.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { o.remove(); if (g.ui.modal === o) g.ui.modal = null; res(b.dataset.j || null); });
    });
  }
  async work(a, id) {
    const g = this.g, J = JOBS[id];
    g.player.frozen = true; a.say(3); a.wave = 1.2;
    let r = null;
    try {
      await g.say(a, [J.ask]);
      if (J.game === 'herd') { if (g.herd) { await g.say(a, ['Primero termina con el otro rebaño, que no podemos con todo a la vez.']); return; } this.startHerd(a); return; }
      if (J.game === 'escort') { this.startEscort(a, id); return; }
      g.mode = 'mini';
      if (J.game === 'shear') r = await shearGame(g.ui, {});
      else if (J.game === 'milk') r = await milkGame(g.ui, {});
      else if (J.game === 'pick') r = await pickGame(g.ui, { title: J.title, icon: J.icon, kind: J.kind });
      else if (J.game === 'forge') r = await forgeGame(g.ui, {});
      else if (J.game === 'stitch') r = await stitchGame(g.ui, {});
    } finally { g.player.frozen = false; if (g.mode === 'mini') g.mode = 'play'; a.talking = 0; }
    if (!r) return;
    if (r.win) { g.player.rig.doCheer?.(); await this.pay(id, a, null); }
    else await g.say(a, ['¡Casi! Es más difícil de lo que parece. Cuando quieras, lo volvemos a intentar.']);
  }
  async pay(id, a, line) {
    const g = this.g, J = JOBS[id];
    this.done[id] = Date.now(); g.P.coins = (g.P.coins ?? 12) + J.pay; if (this.guide === a) this.guide = null;
    saveProfile(); g.sound.ui?.('coin');
    if (line) await g.say(a, [line]);
    await infoCard(g.ui, { icon: J.icon, kicker: 'Jornal', title: `+${J.pay} txanponak`, text: `${a.name} te paga por ${J.title.toLowerCase()}. Con ellos puedes comprar comida en la tienda del pueblo.`,
      extra: J.then ? `<div class="antes-ahora"><div><b>Antes</b>${J.then}</div><div><b>Ahora</b>${J.now}</div></div>` : '', button: '¡Eskerrik asko!' });
    if (J.goods) g.giveGoods(J.goods, 1);
    g.mochila?.paint?.();
  }
  // meter tres ovejas en el redil: el mismo juego que la misión del rebaño, más corto
  startHerd(a) {
    const g = this.g, M = { need: 3, count: 0, step: 1, host: a, icon: 'sheep', title: JOBS.redil.title, m: { animal: 'sheep' }, jornal: true,
      steps: () => ['', `Mete las ovejas en el redil (${M.count}/${M.need}): acércate por detrás para empujarlas`, `Vuelve con ${a.name} a cobrar`] };
    g.startHerd(M); M.step = 1; g.herdJob = M;
    g.ui.toast(M.steps()[1], 'sheep', 3000);
  }
  startEscort(a, id) {
    const g = this.g; this.escort = { a, id, t: 0, need: 40, lost: 0 };
    // el pastor echa a andar por su camino, un poco más deprisa
    a.walkSpeed = Math.max(a.walkSpeed, 1.0); a.wait = 0; a.state = 'idle';
    g.ui.toast('Ve junto al pastor mientras sube con el rebaño', 'sheep', 3000);
  }
}
