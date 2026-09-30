// Lógica del juego: estado, misiones, interacción, minijuegos y escenas
import * as THREE from 'three';
import { RIBBONS, QUESTS, CARDS, SPECIES_OBS, QUIZ, EGUZKILORES } from './content.js';
import { npcDefs, walkerDefs, WALKER_LINES } from './npcs.js';
import { Actor } from '../actors/people.js';
import { Animal } from '../actors/animals.js';
import { PLACES, BRIDGES, rx, MEADOW, riverInfo, iratiMask, pathQuery } from '../world/layout.js';
import { groundHeight, terrainHeight, bridgeAt, waterLevelAt } from '../world/heightfield.js';
import { VILLAGE } from '../world/village.js';
import { LANDMARKS } from '../world/landmarks.js';
import { isFree, segmentBlocked } from '../world/colliders.js';
import { makeEguzkilore, makeRibbon, makeComb, makeLitter } from '../fx.js';
import { wait } from '../ui.js';
import { Fronton, playPelota } from './fronton.js';
import { clamp, lerp, angleDiff, mulberry32 } from '../util/math.js';

const SAVE_KEY = 'mendimendiz-salazar-v2';
// misiones del valle que se pueden empezar en cualquier orden (Muskilda es el final: pide las 8 cintas)
const OPEN_QUESTS = ['bienvenida', 'escudos', 'ovejas', 'pelota', 'irati', 'basajaun', 'lamia', 'zarratrako'];

function freshState() {
  return {
    v: 2, name: 'Mendi', started: false, introDone: false,
    quests: { ...Object.fromEntries(OPEN_QUESTS.map(k => [k, { state: 'available', step: 0 }])), muskilda: { state: 'locked', step: 0 } },
    tracked: 'bienvenida', ribbons: [], cards: [], eguz: [], observed: [], palaces: [], litter: [], quiz: [], stars: 0,
    hasBino: false, comb: false, done: false, pos: null, time: 9.3,
    settings: { music: true, volume: 0.8, quality: null, timeSpeed: 1 },
  };
}

export class Game {
  constructor(ctx) {
    Object.assign(this, ctx); // scene, camera, player, follow, ui, sound, input, sky, fauna, particles, beacon
    this.state = this.load();
    this.npcs = {}; this.walkers = [];
    this.items = []; // coleccionables en el mundo
    this.mode = 'play'; // play | bino | pelota | dance | cine
    this.elapsed = 0; this.lastHour = -1; this.ambT = 3;
    this.rnd = mulberry32(12345);
  }
  // ---------- Guardado ----------
  load() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 2) return Object.assign(freshState(), s, { settings: Object.assign(freshState().settings, s.settings) }); } catch (e) { }
    return freshState();
  }
  save() {
    try {
      this.state.pos = { x: this.player.pos.x, z: this.player.pos.z, h: this.player.heading };
      this.state.time = this.sky.time;
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (e) { }
  }
  reset() { this.resetState(this.state.name); }
  // Nueva partida sin recargar la página
  resetState(name) {
    for (const it of this.items) if (it.obj) this.scene.remove(it.obj);
    this.items = []; this.litterItems = []; this.combItem = null;
    if (this.herd) { for (const s of this.herd) { this.scene.remove(s.obj); const i = this.fauna.animals.indexOf(s); if (i >= 0) this.fauna.animals.splice(i, 1); } this.herd = null; }
    this.dog.follow = null; this.zarra = null;
    if (this.mode === 'bino') this.toggleBinoculars();
    if (this.mode === 'pelota') this.endPelota();
    if (this.dn || this.mode === 'dance') { removeEventListener('keydown', this.danceKeys, true); this.rh?.remove(); this.dn = null; this.ui.setMG(null); this.sound.setMusic(this.state.settings.music); }
    this.follow.cinematic = null; this.player.frozen = false;
    this.mode = 'play';
    this.state = freshState(); this.state.name = name || 'Mendi';
    for (const d of npcDefs()) {
      const a = this.npcs[d.id]; if (!a) continue;
      a.route = null; a.state = 'idle'; a.dance = 0; a.setPos(d.x, d.z, d.heading);
      if (d.hidden) { a.visible = false; a.collider.ghost = true; a.sync(); }
    }
    for (const a of this.dancers) { a.visible = false; a.dance = 0; a.sync(); }
    this.spawnEguz();
    this.ui.hideBinoButton?.();
    this.player.place(PLACES.crucero.x - 2, PLACES.crucero.z + 5, Math.PI * 0.9);
    this.follow.snap(this.player);
    this.sky.time = 9.3;
    this.save(); this.refreshHUD();
  }
  applySettings() {
    const s = this.state.settings;
    this.sound.setMusic(s.music); this.sound.setVolume(s.volume);
    this.sky.speed = 24 / (16 * 60) * (s.timeSpeed ?? 1);
  }

  // ---------- Construcción del mundo de juego ----------
  spawn() {
    this.ensureFronton();
    for (const d of npcDefs()) {
      const a = new Actor(d, this.scene);
      a.face = d.face; a.color = d.color;
      if (d.hidden) { a.visible = false; a.collider.ghost = true; a.sync(); }
      this.npcs[d.id] = a;
    }
    this.npcs.basajaun.walkSpeed = 0.8;
    for (const d of walkerDefs()) { const a = new Actor({ ...d, walkSpeed: 1.1 }, this.scene); a.face = d.face; a.color = d.color; a.walker = true; this.walkers.push(a); }
    // bailarines (aparecen en la fiesta)
    this.dancers = [];
    const m = LANDMARKS.muskilda.dance;
    const hairs = ['#3b2418', '#1f1712', '#6b4a2e', '#2a1a12', '#8c5a2b', '#3b2418', '#1f1712', '#6b4a2e'];
    for (let i = 0; i < 8; i++) {
      const row = i < 4 ? -1 : 1, k = i % 4;
      const a = new Actor({ id: 'd' + i, name: 'Danzante', x: m.x + (k - 1.5) * 2.2, z: m.z + row * 1.6 + 1, heading: Math.PI, look: { skin: ['#f1c7a5', '#e2b08a', '#f3cfb3', '#dba882'][i % 4], hair: hairs[i], shirt: '#ffffff', pants: '#ffffff', sash: '#d42f2f', ribbons: true, socks: '#ffffff', shoes: '#1a1a1a', scarf: '#d42f2f', height: 1.62 + (i % 3) * 0.05 } }, this.scene);
      a.visible = false; a.collider.ghost = true; a.frozen = true; a.sync();
      this.dancers.push(a);
    }
    // perro del pastor
    this.dog = this.fauna.dog; this.dog.home = { x: PLACES.borda.x + 8, z: PLACES.borda.z + 6 };
    this.spawnEguz();
    // estado de misiones guardado: todas se pueden hacer en cualquier orden (también en partidas antiguas)
    const qs = this.state.quests;
    for (const k of OPEN_QUESTS) if (this.q(k).state === 'locked') this.q(k).state = 'available';
    if (qs.ovejas?.state === 'active') this.startHerding(true);
    if (qs.basajaun?.state === 'active') this.spawnLitter();
    if (qs.lamia?.state === 'active' && !this.state.comb) this.spawnComb();
    if (qs.zarratrako?.state === 'active') this.startZarratrako(true);
    if (qs.bienvenida?.state === 'done') this.npcs.maite.setPos(PLACES.plaza.x - 7, PLACES.plaza.z + 5, Math.PI / 2);
    if (this.state.hasBino) this.ui.showBinoButton();
    this.refreshHUD();
  }

  spawnEguz() {
    EGUZKILORES.forEach(([x, z], i) => {
      if (this.state.eguz.includes(i)) return;
      let X = x, Z = z;
      for (let k = 0; k < 30 && (!isFree(X, Z, 0.6) || waterLevelAt(X, Z) > terrainHeight(X, Z) - 0.1); k++) { X += (this.rnd() - 0.5) * 4; Z += (this.rnd() - 0.5) * 4; }
      const o = makeEguzkilore(); o.position.set(X, terrainHeight(X, Z) + 0.12, Z); this.scene.add(o);
      this.items.push({ kind: 'eguz', idx: i, obj: o, x: X, z: Z, r: 1.8, label: 'Coger el eguzkilore' });
    });
  }

  // ---------- Utilidades de misiones ----------
  q(id) { return this.state.quests[id] || (this.state.quests[id] = { state: 'locked', step: 0 }); }
  stepText(id) {
    const q = this.q(id), Q = QUESTS[id];
    if (id === 'escudos' && q.step === 0) return `${Q.steps[0]} (${this.state.palaces.length}/3)`;
    if (id === 'ovejas' && q.step === 1) return `${Q.steps[1]} (${this.penned || 0}/6)`;
    if (id === 'irati' && q.step === 1) return `${Q.steps[1]} (${Math.min(5, this.state.observed.length)}/5)`;
    if (id === 'basajaun' && q.step === 1) return `${Q.steps[1]} (${this.state.litter.length}/5)`;
    if (id === 'zarratrako' && q.step === 1) return `${Q.steps[1]} (${q.found || 0}/3)`;
    if (id === 'muskilda' && q.step === 0) return `${Q.steps[0]} (${this.state.ribbons.length}/8)`;
    if (q.state === 'available') return `Habla con ${this.npcs[Q.giver]?.name || '…'}`;
    return Q.steps[Math.min(q.step, Q.steps.length - 1)];
  }
  activate(id) {
    const q = this.q(id);
    if (q.state === 'active' || q.state === 'done') return;
    q.state = 'active'; q.step = q.step || 0;
    this.state.tracked = id;
    this.ui.toast(`Nueva misión: ${QUESTS[id].title}`, QUESTS[id].icon);
    this.sound.ui('open');
    this.save(); this.refreshHUD();
  }
  advance(id, step) { const q = this.q(id); q.step = step; this.save(); this.refreshHUD(); }
  track(id) { this.state.tracked = id; this.save(); this.refreshHUD(); }
  async completeQuest(id) {
    const q = this.q(id); q.state = 'done';
    const Q = QUESTS[id];
    const rib = RIBBONS.find(r => r.id === Q.ribbon);
    this.player.rig.doCheer();
    this.particles.confetti(this.player.pos, 80);
    if (rib && !this.state.ribbons.includes(rib.id)) {
      this.state.ribbons.push(rib.id);
      await this.ui.reward({ ribbon: rib.color, title: rib.name, text: `"${rib.eu}" en euskera. ¡Ya tienes ${this.state.ribbons.length} de 8 cintas para la fiesta de Muskilda!` });
    }
    if (this.state.ribbons.length >= 8 && this.q('muskilda').state !== 'done') { this.q('muskilda').state = 'active'; this.q('muskilda').step = 1; this.state.tracked = 'muskilda'; this.ui.toast('¡Tienes las 8 cintas! Sube a Muskilda', 'dance', 4000); }
    else if (this.q('muskilda').state === 'locked' && id === 'bienvenida') { this.q('muskilda').state = 'active'; this.q('muskilda').step = 0; }
    // seguir otra misión
    this.autoTrack();
    this.save(); this.refreshHUD();
  }
  autoTrack() {
    const qs = this.state.quests;
    if (qs[this.state.tracked]?.state === 'active' && !(this.state.tracked === 'muskilda' && qs.muskilda.step === 0)) return;
    const order = ['bienvenida', 'escudos', 'zarratrako', 'pelota', 'ovejas', 'irati', 'lamia', 'basajaun', 'muskilda'];
    const pick = order.find(id => qs[id]?.state === 'active' && !(id === 'muskilda' && qs[id].step === 0)) || order.find(id => qs[id]?.state === 'available');
    this.state.tracked = pick || 'muskilda';
  }
  giveCard(id, silent) {
    if (this.state.cards.includes(id)) return;
    this.state.cards.push(id);
    const c = CARDS.find(c => c.id === id);
    if (!silent) { this.ui.toast(`Nueva carta: ${c.title}`, c.icon); this.sound.ui('card'); }
    this.save();
  }
  // Destino de la misión seguida
  questTarget(id = this.state.tracked) {
    const q = this.state.quests[id]; if (!q) return null;
    const N = this.npcs, P = PLACES;
    const at = (a, h = 2.6) => a ? { x: a.pos.x, z: a.pos.z, h: a.obj.userData.H ? a.obj.userData.H + 0.6 : h } : null;
    if (q.state === 'available') return at(N[QUESTS[id].giver]);
    if (q.state !== 'active') return null;
    switch (id) {
      case 'bienvenida': return [at(N.maite), { x: BRIDGES[0].cx, z: BRIDGES[0].z, h: 3 }, { x: VILLAGE.fountain.x, z: VILLAGE.fountain.z, h: 3.5 }, at(N.itziar), at(N.maite)][q.step];
      case 'escudos': {
        if (q.step === 1) return at(N.itziar);
        const left = VILLAGE.palaces.filter(p => !this.state.palaces.includes(p.id));
        return this.nearest(left.map(p => ({ x: p.door.x, z: p.door.z, h: 4 })));
      }
      case 'ovejas': {
        if (q.step === 0 || q.step === 2) return at(N.joxemari);
        const loose = (this.herd || []).filter(s => !s.penned);
        const t = this.nearest(loose.map(s => ({ x: s.pos.x, z: s.pos.z, h: 1.6 })));
        return t || { x: LANDMARKS.pen.x, z: LANDMARKS.pen.z, h: 2 };
      }
      case 'pelota': return at(N.kike);
      case 'irati': return q.step === 1 ? { x: 0, z: -290, h: 3, noArrow: true } : at(N.inaki);
      case 'basajaun': {
        if (q.step === 0 || q.step === 2) return at(N.basajaun);
        return this.nearest((this.litterItems || []).map(l => ({ x: l.x, z: l.z, h: 1.2 })));
      }
      case 'lamia': return q.step === 1 && this.combItem ? { x: this.combItem.x, z: this.combItem.z, h: 1.5 } : at(N.lamia);
      case 'zarratrako': {
        if (q.step === 1) return null; // hay que guiarse por el oído
        return at(N.amaia);
      }
      case 'muskilda': return q.step === 0 ? null : at(N.bobo);
    }
    return null;
  }
  nearest(list) {
    let best = null, bd = 1e9;
    for (const t of list) { const d = Math.hypot(t.x - this.player.pos.x, t.z - this.player.pos.z); if (d < bd) { bd = d; best = t; } }
    return best;
  }
  mapMarkers() {
    const out = [];
    for (const [id, q] of Object.entries(this.state.quests)) {
      const Q = QUESTS[id], n = this.npcs[Q.giver];
      if (q.state === 'available') { if (n) out.push({ x: n.pos.x, z: n.pos.z, icon: 'exclaim', title: Q.title, text: `Habla con ${n.name}`, act: 'track', id, go: true }); }
      else if (q.state === 'active') { const t = this.questTarget(id); if (t) out.push({ x: t.x, z: t.z, icon: Q.icon, title: Q.title, text: this.stepText(id), act: 'track', id }); }
    }
    for (const it of this.items) if (it.kind === 'eguz' && this.state.eguz.length >= 6) out.push({ x: it.x, z: it.z, icon: 'eguzkilore' });
    return out;
  }
  mapHouses() { return [...VILLAGE.houses, ...VILLAGE.palaces.map(p => ({ x: p.x, z: p.z, w: 14, d: 14, ry: p.ry || 0 }))]; }
  mapLabels() {
    const P = PLACES;
    return [
      { x: P.plaza.x, z: P.plaza.z - 30, label: 'Otsagabia' }, { x: 0, z: -320, label: 'Selva de Irati' }, { x: P.muskilda.x, z: P.muskilda.z, icon: 'church', label: 'Muskilda' },
      { x: P.borda.x, z: P.borda.z, icon: 'sheep', label: 'Borda' }, { x: P.pond.x, z: P.pond.z, icon: 'water', label: 'Balsa' }, { x: P.fronton.x, z: P.fronton.z, icon: 'pelota', label: 'Frontón', text: 'Juega a pelota con Kike cuando quieras', act: 'pelota', go: false },
      { x: P.church.x, z: P.church.z, icon: 'church', label: 'San Juan' }, { x: P.mirador.x, z: P.mirador.z, icon: 'lookout', label: 'Mirador' }, { x: P.crucero.x, z: P.crucero.z, icon: 'cross', label: 'Crucero' },
    ];
  }
  refreshHUD() {
    this.ui.setRibbons(this.state.ribbons, this.state.eguz.length);
  }

  // ---------- Bucle ----------
  update(dt) {
    this.elapsed += dt;
    const P = this.player;
    // NPCs
    const cull = (a, d, max) => {
      const sh = d < 30; if (a.shadowOn !== sh) { a.shadowOn = sh; a.obj.traverse(o => { if (o.isMesh) o.castShadow = sh; }); }
      if (d < max + 20) a.update(dt, P);
      a.obj.visible = d < max;
    };
    for (const a of Object.values(this.npcs)) if (a.visible) cull(a, Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z), 90);
    for (const a of this.walkers) cull(a, Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z), 80);
    for (const a of this.dancers) if (a.visible) a.update(dt, P);
    // objetos
    for (const it of this.items) {
      const o = it.obj; if (!o) continue;
      o.visible = Math.abs(it.x - P.pos.x) + Math.abs(it.z - P.pos.z) < 110;
      if (!o.visible) continue;
      o.rotation.y += dt * (it.kind === 'eguz' ? 0.6 : 1.5);
      if (it.kind !== 'eguz' && it.kind !== 'litter') o.position.y = terrainHeight(it.x, it.z) + 0.8 + Math.sin(this.elapsed * 2) * 0.15;
      if (it.kind === 'eguz' && Math.random() < dt * 2) this.particles.emit(o.position, { n: 1, color: '#ffe38a', speed: 0.4, size: 0.18, life: 1.2, gravity: -0.5, spread: 0.6 });
    }
    // Minijuegos y modos
    if (this.herd) this.updateHerding(dt);
    if (this.zarra) this.updateZarratrako(dt);
    if (this.mode === 'pelota' && this.pelotaTick) this.pelotaTick(dt);
    if (this.mode === 'dance') this.updateDance(dt);
    if (this.mode === 'bino') this.updateBino(dt);
    // detección de pasos por lugares
    this.checkPlaces();
    // interacción
    this.updateInteraction();
    // HUD de misión
    this.updateQuestHUD();
    // campanas en punto
    const hour = Math.floor(this.sky.time);
    if (hour !== this.lastHour) { if (this.lastHour >= 0 && this.mode === 'play') { const n = hour % 12 || 12; this.sound.churchBell(Math.min(n, 6), { x: PLACES.church.x, z: PLACES.church.z }); } this.lastHour = hour; }
    // sonidos de animales
    this.ambT -= dt;
    if (this.ambT < 0) {
      this.ambT = 2 + Math.random() * 4;
      const near = this.fauna.animals.filter(a => a.obj.visible && Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z) < 45);
      const a = near[Math.floor(Math.random() * near.length)];
      if (a) { if (a.kind === 'sheep') { this.sound.baa(a.pos); if (Math.random() < 0.6) this.sound.cowbell(a.pos, 0.2); } else if (a.kind === 'cow') { if (Math.random() < 0.4) this.sound.moo(a.pos); else this.sound.cowbell(a.pos, 0.5); } else if (a.kind === 'dog') this.sound.bark(a.pos); }
    }
    // guardado periódico
    this.saveT = (this.saveT || 0) + dt;
    if (this.saveT > 10 && this.mode === 'play') { this.saveT = 0; this.save(); }
  }

  updateQuestHUD() {
    const id = this.state.tracked, Q = QUESTS[id];
    const t = this.questTarget();
    this.beacon.set(t, id === 'muskilda' ? '#ff7eb6' : '#ffd34d');
    if (!Q) { this.ui.setQuest(null); return; }
    let dist = null, angle = null;
    if (t) {
      const dx = t.x - this.player.pos.x, dz = t.z - this.player.pos.z;
      dist = Math.hypot(dx, dz);
      const fwd = Math.atan2(-Math.sin(this.follow.yaw), -Math.cos(this.follow.yaw));
      angle = -angleDiff(fwd, Math.atan2(dx, dz));
    }
    this.ui.setQuest({ title: Q.title, step: this.stepText(id), icon: Q.icon, dist, angle });
    this.ui.updateMinimap(this.player, this.follow.yaw, this.mapMarkers(), t);
  }

  checkPlaces() {
    const P = this.player.pos;
    const qb = this.q('bienvenida');
    if (qb.state === 'active' && qb.step === 1) {
      const b = bridgeAt(P.x, P.z);
      if (b && b.main && Math.abs(P.x - b.cx) < 3) { this.advance('bienvenida', 2); this.giveCard('puente'); this.ui.toast('¡Has cruzado el puente medieval!', 'bridge'); this.sound.magic(); }
    }
    // cartas por descubrir lugares
    const near = (x, z, r) => Math.hypot(P.x - x, P.z - z) < r;
    if (!this.state.cards.includes('muskilda') && near(PLACES.muskilda.x, PLACES.muskilda.z, 22)) { this.giveCard('muskilda'); }
    if (!this.state.cards.includes('irati') && P.z < -190) { this.giveCard('irati'); this.ui.toast('Entras en la Selva de Irati', 'tree'); }
    if (!this.state.cards.includes('haya') && P.z < -330) this.giveCard('haya');
    if (!this.state.cards.includes('pottoka') && this.fauna.animals.some(a => a.kind === 'pottoka' && Math.hypot(a.pos.x - P.x, a.pos.z - P.z) < 10)) this.giveCard('pottoka');
    if (!this.state.cards.includes('barrios') && near(PLACES.mirador.x, PLACES.mirador.z, 6)) { this.giveCard('barrios'); this.ui.toast('¡Qué vistas del pueblo y sus cuatro barrios!', 'lookout'); }
  }

  // ---------- Interacción ----------
  interactables() {
    const list = [];
    for (const a of Object.values(this.npcs)) if (a.visible && !a.noTalk) list.push({ kind: 'npc', a, x: a.pos.x, z: a.pos.z, r: a.id === 'basajaun' ? 4 : 2.8, label: `Hablar con ${a.name}` });
    for (const a of this.walkers) list.push({ kind: 'walker', a, x: a.pos.x, z: a.pos.z, r: 2.4, label: `Hablar con ${a.name}` });
    const f = VILLAGE.fountain; list.push({ kind: 'fountain', x: f.x, z: f.z, r: 3.8, label: 'Beber agua' });
    for (const p of VILLAGE.palaces) if (!this.state.palaces.includes(p.id)) list.push({ kind: 'palace', p, x: p.door.x, z: p.door.z, r: 3.5, label: 'Mirar el escudo' });
    for (const it of this.items) list.push({ kind: 'item', it, x: it.x, z: it.z, r: it.r, label: it.label });
    // el frontón está abierto siempre: con la misión de Kike activa es el peloteo; si no, un partido libre
    list.push({ kind: 'fronton', x: PLACES.fronton.x + 2, z: PLACES.fronton.z, r: 3, label: 'Jugar a pelota' });
    const mi = LANDMARKS.mirador; list.push({ kind: 'mirador', x: mi.x + 1.8, z: mi.z - 1.3, r: 2, label: 'Mirar por el catalejo' });
    return list;
  }
  updateInteraction() {
    if (this.mode !== 'play' || this.ui.busy) { this.ui.setPrompt(this.mode === 'bino' ? null : null); this.near = null; return; }
    const P = this.player.pos;
    let best = null, bd = 1e9;
    for (const it of this.interactables()) {
      const d = Math.hypot(it.x - P.x, it.z - P.z);
      if (d < it.r && d < bd) { bd = d; best = it; }
    }
    this.near = best;
    this.ui.setPrompt(best ? best.label : null);
    if (this.input.consume('e') && best) this.interact(best);
    if (this.input.consume('f') && this.state.hasBino) this.toggleBinoculars();
    if (this.input.consume('c')) this.ui.openBook();
    if (this.input.consume('m')) this.ui.openMap();
    if (this.input.consume('escape')) this.ui.openMenu();
  }
  async interact(it) {
    this.sound.ui('click');
    if (it.kind === 'npc') return this.talk(it.a);
    if (it.kind === 'walker') {
      const i = this.walkers.indexOf(it.a);
      it.a.say(3); it.a.wave = 1.2;
      return this.say(it.a, WALKER_LINES[i % WALKER_LINES.length]);
    }
    if (it.kind === 'fountain') {
      this.particles.emit({ x: it.x, y: VILLAGE.fountain.y + 1.4, z: it.z }, { n: 20, color: '#bfe8ff', speed: 1.5, size: 0.25, life: 0.8 });
      this.sound.splash(this.player.pos, 0.6);
      const q = this.q('bienvenida');
      if (q.state === 'active' && q.step === 2) { this.advance('bienvenida', 3); this.ui.toast('¡Qué agua tan fresca! Ahora sube a la iglesia.', 'water'); }
      else this.ui.toast('Agua fresca de la fuente. ¡Glu, glu!', 'water');
      return;
    }
    if (it.kind === 'palace') {
      this.state.palaces.push(it.p.id);
      this.giveCard('palacios');
      this.sound.magic();
      this.particles.emit({ x: it.p.door.x, y: it.p.y + 6, z: it.p.door.z }, { n: 25, color: '#ffe38a', speed: 2, size: 0.3 });
      this.ui.toast(`${it.p.name}: ¡escudo encontrado! (${this.state.palaces.length}/3)`, 'shield');
      const q = this.q('escudos');
      if (q.state === 'active' && this.state.palaces.length >= 3) this.advance('escudos', 1);
      this.save(); return;
    }
    if (it.kind === 'item') return this.pickItem(it.it);
    if (it.kind === 'fronton') return this.startPelota();
    if (it.kind === 'mirador') {
      this.giveCard('barrios');
      this.say({ name: 'Catalejo', icon: 'binoculars' }, ['Desde aquí ves Otsagabia entera: casas de piedra a los dos lados del río Anduña.', 'Al este, en lo alto, el santuario de Muskilda. Al norte, el bosque inmenso de Irati.']);
    }
  }
  async pickItem(it) {
    this.items = this.items.filter(x => x !== it);
    if (it.obj) this.scene.remove(it.obj);
    this.particles.emit({ x: it.x, y: terrainHeight(it.x, it.z) + 0.5, z: it.z }, { n: 30, color: ['#ffe38a', '#ffffff'], speed: 2.5, size: 0.3, life: 1 });
    if (it.kind === 'eguz') {
      this.state.eguz.push(it.idx); this.sound.ui('coin');
      this.giveCard('eguzkilore', this.state.eguz.length > 1);
      this.ui.toast(`Eguzkilore ${this.state.eguz.length}/${EGUZKILORES.length}`, 'eguzkilore');
      if (this.state.eguz.length === EGUZKILORES.length) { this.state.stars += 5; await this.ui.reward({ icon: 'sun', title: '¡Todos los eguzkilores!', text: 'Has encontrado las doce flores del sol. Según la tradición, protegen las casas. ¡+5 estrellas!' }); }
    } else if (it.kind === 'litter') {
      this.state.litter.push(it.id); this.sound.ui('coin');
      this.ui.toast(`Basura recogida ${this.state.litter.length}/5`, 'litter');
      if (this.state.litter.length >= 5) this.advance('basajaun', 2);
    } else if (it.kind === 'comb') {
      this.state.comb = true; this.combItem = null; this.sound.magic();
      this.ui.toast('¡Has encontrado el peine de oro de la Lamia!', 'lamia');
      this.advance('lamia', 2);
    }
    this.save(); this.refreshHUD();
  }
  say(who, lines) {
    const look = who.obj?.userData.look, icon = who.icon;
    return this.ui.dialog(lines.map(t => typeof t === 'string' ? { who: who.name, look, icon, text: t } : { who: who.name, look, icon, ...t }));
  }

  // ---------- Conversaciones ----------
  async talk(a) {
    const st = this.state, id = a.id, name = st.name;
    a.say(4); this.player.frozen = true;
    // girar al jugador hacia el personaje
    this.player.heading = Math.atan2(a.pos.x - this.player.pos.x, a.pos.z - this.player.pos.z);
    try { await this.dialogFor(id, a, name); } finally { this.player.frozen = false; a.talking = 0; }
  }
  async dialogFor(id, a, name) {
    const st = this.state, S = (lines) => this.say(a, lines);
    const qs = st.quests;
    switch (id) {
      case 'maite': {
        const q = this.q('bienvenida');
        if (q.state === 'available' || (q.state === 'active' && q.step === 0)) {
          await S([`¡Kaixo, ${name}! Soy Maite. ¡Ongi etorri a Otsagabia! Así se dice "bienvenido" en euskera.`,
            'Este crucero de piedra marca la entrada del pueblo, justo donde el Zatoya se junta con el Anduña.',
            'Mañana es la fiesta de Muskilda y los danzantes necesitan ocho cintas de colores para sus trajes… ¡pero se han perdido por todo el valle!',
            '¿Nos ayudas a encontrarlas? Primero conoce el pueblo: cruza el puente medieval, bebe en la fuente de la plaza y sube a la iglesia a ver a Itziar.',
            'Te doy este cuaderno: ahí apuntarás tus misiones y todo lo que descubras. ¡Sigue la flecha dorada!']);
          this.giveCard('crucero');
          if (q.state !== 'active') this.activate('bienvenida');
          this.advance('bienvenida', 1);
          return;
        }
        if (q.state === 'active' && q.step === 4) {
          await S([`¡Ya conoces el corazón de Otsagabia, ${name}!`, 'Aquí tienes la primera cinta, la roja. Las otras siete las tienen vecinos del valle… y algún ser de leyenda.', 'Mira tu cuaderno: allí verás a quién ayudar. ¡Te espero en la plaza!']);
          await this.completeQuest('bienvenida');
          this.npcs.maite.route = [{ x: PLACES.plaza.x - 7, z: PLACES.plaza.z + 5 }]; this.npcs.maite.state = 'idle'; this.npcs.maite.wait = 0; this.npcs.maite.home = { x: PLACES.plaza.x - 7, z: PLACES.plaza.z + 5 };
          return;
        }
        if (q.state === 'done') {
          const left = RIBBONS.filter(r => !st.ribbons.includes(r.id));
          if (!left.length) return S(['¡Tienes las ocho cintas! Corre a Muskilda: el Bobo y los danzantes te esperan en la explanada del santuario.']);
          const hints = { horia: 'Itziar sabe mucho de los palacios y sus escudos.', zuria: 'Joxemari, el pastor, tiene problemas con su rebaño en la borda, al oeste.', berdea: 'Kike está en el frontón. ¡Le encanta la pelota!', urdina: 'Iñaki, el guarda, vigila la entrada de Irati, al norte.', laranja: 'Dicen que en lo más profundo de Irati vive el Basajaun…', morea: 'En la balsa de Irati, al noreste, a veces se ve a una Lamia peinándose.', arrosa: 'Amaia está junto al río. ¡Dice que ha visto al Zarratrako!' };
          return S([`Te faltan ${left.length} cintas.`, hints[left[0].id]]);
        }
        return S(['¡Sigue la flecha dorada! Primero el puente medieval, luego la fuente y después la iglesia.']);
      }
      case 'itziar': {
        const q = this.q('bienvenida');
        if (q.state === 'active' && q.step === 3) {
          await S([`Egun on, ${name}. Soy Itziar. Esta es la iglesia de San Juan Evangelista.`, 'Dentro guarda retablos renacentistas del escultor Miguel de Espinal. Y su torre se ve desde todo el valle.', 'Cuando suenan sus campanas, sabemos qué hora es. ¡Escucha en cada hora en punto!', 'Anda, vuelve con Maite. Seguro que te tiene preparada una sorpresa.']);
          this.giveCard('iglesia');
          this.advance('bienvenida', 4); return;
        }
        const e = this.q('escudos');
        if (e.state === 'available') {
          await S(['¿Sabes que en Otsagabia hay palacios con escudos de piedra?', 'Son los palacios de Urrutia, Iriarte y Donamaría. Sus escudos cuentan la historia de las familias que vivieron allí.', 'Encuéntralos los tres y mira bien sus escudos. Si lo haces, te daré la cinta amarilla.']);
          this.activate('escudos');
          if (st.palaces.length >= 3) this.advance('escudos', 1);
          return;
        }
        if (e.state === 'active' && e.step === 1) {
          await S(['¡Los has encontrado todos! Tienes ojos de halcón.', 'Muchas casas del pueblo tienen escudos de los siglos XVIII y XIX. Ahora ya sabrás verlos.']);
          return this.completeQuest('escudos');
        }
        if (e.state === 'active') return S([`Te faltan ${3 - st.palaces.length} escudos. Busca casas grandes de piedra, con balcón de hierro.`]);
        return this.quiz(a);
      }
      case 'garazi': return this.quiz(a, true);
      case 'joxemari': {
        const q = this.q('ovejas');
        if (q.state === 'available' || (q.state === 'active' && q.step === 0)) {
          await S([`Egun on, gazte. Soy Joxemari, el pastor. Este es mi perro, Txuri.`, '¡Qué desastre! Seis de mis ovejas latxas se han escapado del redil y andan desperdigadas por el monte.', 'Las ovejas se apartan de ti cuando te acercas: ponte detrás de ellas y empújalas hacia el redil, junto a la borda.', 'Txuri te ayudará. ¡Ánimo!']);
          this.giveCard('trashumancia');
          this.activate('ovejas'); this.advance('ovejas', 1);
          this.startHerding(false);
          return;
        }
        if (q.state === 'active' && q.step === 2) {
          await S(['¡Todas en el redil! Eres un pastor de primera.', 'Con la leche de estas ovejas latxas hacemos queso. En verano subimos con el rebaño a los pastos altos: eso es la trashumancia.', 'Toma, la cinta blanca, como la lana de mis ovejas.']);
          this.giveCard('latxa');
          return this.completeQuest('ovejas');
        }
        if (q.state === 'active') return S([`Llevas ${this.penned || 0} de 6. Colócate detrás de cada oveja para que camine hacia el redil.`]);
        return S(['Las ovejas latxas tienen la cara oscura y la lana larga. Aguantan bien el frío del Pirineo.', 'Txuri y yo subiremos pronto a los pastos de verano.']);
      }
      case 'kike': {
        const q = this.q('pelota');
        if (q.state === 'available' || (q.state === 'active' && q.step === 0)) {
          await S(['¡Aupa! Soy Kike. ¿Juegas a pelota?', 'Se golpea la pelota contra el frontis, la pared grande. Cuando vuelva botando, ponte cerca y dale con la mano.', 'Si me devuelves seis seguidas, te doy la cinta verde. Ve al círculo verde y pulsa GOLPE cuando la pelota brille.']);
          this.giveCard('pelota');
          this.activate('pelota'); this.advance('pelota', 1);
          return this.startPelota();
        }
        if (q.state === 'active') { await S(['¿Otra partida? ¡Vamos!']); return this.startPelota(); }
        return S(['¡Eres un pelotari de verdad! Vuelve cuando quieras a jugar.']);
      }
      case 'amaia': {
        const q = this.q('zarratrako');
        if (q.state === 'available' || (q.state === 'active' && q.step === 0)) {
          await S([`¡${name}! ¡Menos mal! Estaba tirando piedras al río y he visto al Zarratrako.`, 'Es un personaje del carnaval del valle: va cubierto de pieles de oveja y lleva cencerros… ¡clon, clon!', 'Se esconde por las calles. Escucha sus cencerros para saber dónde está y encuéntralo tres veces.', 'Tiene la cinta rosa. ¡Seguro que te la da si lo pillas!']);
          this.giveCard('zarratrako');
          this.activate('zarratrako'); this.advance('zarratrako', 1);
          return this.startZarratrako(false);
        }
        if (q.state === 'active' && q.step === 2) {
          await S(['¡Lo has pillado tres veces! Menudo susto le has dado tú a él.', '¿Y te ha dado la cinta rosa? ¡Qué bonita! Ya falta menos para la fiesta.']);
          return this.completeQuest('zarratrako');
        }
        if (q.state === 'active') return S(['¡Escucha! ¿Oyes los cencerros? Cuanto más fuerte suenan, más cerca está.']);
        return S(['Desde este puente se ve el pueblo reflejado en el agua. ¡Es mi sitio favorito!', 'A veces saltan truchas. ¡Mira bien el río!']);
      }
      case 'inaki': {
        const q = this.q('irati');
        if (q.state === 'available' || (q.state === 'active' && q.step === 0)) {
          await S([`Kaixo. Soy Iñaki, guarda de Irati. Cuidamos uno de los bosques de hayas y abetos mejor conservados de Europa.`,
            'En el bosque viven corzos, ciervos, jabalíes, ardillas, pájaros carpinteros… y en el cielo planean los buitres.',
            'Toma estos prismáticos. Obsérvalos sin molestarlos: acércate despacio, sin correr.',
            `Anota cinco animales distintos y vuelve. ${this.input.touch ? 'Usa el botón de los prismáticos' : 'Pulsa F para usar los prismáticos'}.`]);
          st.hasBino = true; this.ui.showBinoButton();
          await this.ui.reward({ icon: 'binoculars', title: 'Prismáticos', text: 'Ahora puedes observar animales de lejos y anotarlos en tu cuaderno.' });
          this.activate('irati'); this.advance('irati', 1);
          if (st.observed.length >= 5) this.advance('irati', 2);
          return;
        }
        if (q.state === 'active' && q.step === 2) {
          await S(['¡Cinco especies! Tienes paciencia de guarda forestal.', 'Recuerda: en el monte, mira, escucha y no dejes rastro. Aquí tienes la cinta azul.']);
          return this.completeQuest('irati');
        }
        if (q.state === 'active') return S([`Llevas ${st.observed.length} de 5. Los buitres se ven mejor desde zonas abiertas; el pito negro, en troncos de haya del fondo del bosque.`]);
        return S(['Si ves basura en el monte, recógela. El bosque es de todos.']);
      }
      case 'basajaun': {
        const q = this.q('basajaun');
        if (q.state === 'available' || (q.state === 'active' && q.step === 0)) {
          this.follow.shake = 0.6; this.sound.whoosh();
          await S([`¡Oooh! Una personita en mi bosque… No te asustes, ${name}. Soy el Basajaun, el señor del bosque.`,
            'En las leyendas cuido los rebaños y aviso a los pastores cuando viene la tormenta.',
            'Pero hay algo que me pone triste: gente que deja basura entre mis hayas. Latas, botellas, papeles…',
            'Recoge cinco restos de basura del bosque y te daré una cinta naranja, del color de las hayas en otoño.']);
          this.giveCard('basajaun');
          this.activate('basajaun'); this.advance('basajaun', 1);
          this.spawnLitter();
          return;
        }
        if (q.state === 'active' && q.step === 2) {
          await S(['¡El bosque respira mejor gracias a ti! Mis hayas te lo agradecen.', 'Toma la cinta naranja. Y recuerda: el Basajaun es una leyenda… ¡pero el bosque es de verdad!']);
          return this.completeQuest('basajaun');
        }
        if (q.state === 'active') return S([`Llevas ${st.litter.length} de 5. Busca cerca de los senderos de Irati.`]);
        return S(['Grrr… es mi forma de decir "gracias". ¡Vuelve cuando quieras!']);
      }
      case 'lamia': {
        const q = this.q('lamia');
        if (q.state === 'available' || (q.state === 'active' && q.step === 0)) {
          await S(['¿Quién anda ahí? Ah, eres tú. Soy una Lamia. Vivo junto al agua, como cuentan las leyendas.', '¿Te has fijado en mis pies? ¡Son de pato! Así nado mejor, jiji.', 'Estaba peinándome con mi peine de oro y… ¡plof! Se me cayó al río y la corriente se lo llevó.', 'Búscalo en la orilla del Anduña, río abajo. Brilla mucho. Si me lo traes, te daré la cinta morada.']);
          this.giveCard('lamia');
          this.activate('lamia'); this.advance('lamia', 1);
          this.spawnComb();
          return;
        }
        if (q.state === 'active' && q.step === 2) {
          await S(['¡Mi peine de oro! ¡Eskerrik asko!', 'Toma, la cinta morada. Y un secreto: al atardecer, el agua de la balsa brilla como el oro.']);
          this.npcs.lamia.def.look.comb = true;
          return this.completeQuest('lamia');
        }
        if (q.state === 'active') return S(['Río abajo, en la orilla… ¡sigue el brillo!']);
        return S(['El agua limpia del río es mi casa. ¡Cuídala!']);
      }
      case 'bobo': {
        const q = this.q('muskilda');
        if (st.done) return S(['¡Qué fiesta más bonita! Vuelve el año que viene, que aquí te esperamos.']);
        if (st.ribbons.length < 8) return S(['¡Hola, hola! Soy el Bobo. Acompaño a los ocho danzantes de Muskilda con mis castañuelas.', `Pero sin sus cintas no pueden bailar… Tienes ${st.ribbons.length} de 8. ¡Tráelas todas y bailaremos juntos!`]);
        await S(['¡Las ocho cintas! ¡Los danzantes ya pueden ponerse sus trajes!', 'Bailan danzas de palos, de pañuelos y una jota. Yo marco el ritmo y tú bailas con nosotros.', `Cuando la flecha llegue a la línea, pulsa la misma dirección ${this.input.touch ? 'en los botones' : 'con las flechas o WASD'}. ¿Preparado?`]);
        this.giveCard('danzas');
        this.advance('muskilda', 2);
        return this.startDance();
      }
      case 'zarratrako': return;
    }
  }
  async quiz(a, cheese) {
    const st = this.state;
    const pool = QUIZ.filter((_, i) => !st.quiz.includes(i));
    if (cheese && !st.cards.includes('mesa')) {
      await this.say(a, [`¡Kaixo! Soy Garazi. Vendo queso de oveja del valle.`, 'Aquí, en la mesa del valle, no faltan el queso, la trucha y las migas de pastor.']);
      this.giveCard('mesa');
    }
    if (!pool.length) return this.say(a, ['¡Ya has respondido todas mis preguntas! Eres una enciclopedia del valle.']);
    const idx = QUIZ.indexOf(pool[Math.floor(Math.random() * pool.length)]);
    const Q = QUIZ[idx];
    let ok = false;
    await this.say(a, [{ text: `¿Te hago una pregunta? ${Q.q}`, choices: Q.a, onChoice: (j) => { ok = j === Q.ok; return [{ who: a.name, look: a.obj.userData.look, text: (ok ? '¡Correcto! ' : 'Casi… ') + Q.why }]; } }]);
    if (ok) { st.quiz.push(idx); st.stars++; this.sound.ui('coin'); this.ui.toast(`¡Una estrella! Tienes ${st.stars} estrellas`, 'star'); this.save(); }
    else this.sound.ui('error');
  }

  // ---------- Pastoreo ----------
  startHerding(restore) {
    const pen = LANDMARKS.pen;
    this.herd = [];
    const spots = [[-60, 40], [-30, 60], [-80, -10], [-50, 75], [-95, 30], [-20, 35]];
    this.penned = 0;
    spots.forEach(([dx, dz], i) => {
      const x = pen.x + dx * 0.9 + 20, z = pen.z + dz * 0.8;
      const s = new Animal('sheep', x, z, { flee: 7, run: 3.2, walk: 0.4, range: 5, radius: 0.45, scale: 1.05 }, this.rnd, this.scene);
      s.herd = true; s.alwaysUpdate = true;
      s.bounds = (X, Z) => Math.hypot((X - MEADOW.x) / (MEADOW.rx * 1.25), (Z - MEADOW.z) / (MEADOW.rz * 1.3)) < 1 && riverInfo(X, Z).edge > 3;
      this.fauna.animals.push(s); this.herd.push(s);
    });
    this.dog.follow = this.player;
    if (!restore) this.ui.toast('Empuja las ovejas hacia el redil', 'sheep');
  }
  updateHerding(dt) {
    const pen = LANDMARKS.pen;
    const inPen = (s) => Math.abs(s.pos.x - pen.x) < pen.w / 2 - 0.6 && Math.abs(s.pos.z - pen.z) < pen.d / 2 - 0.6;
    let n = 0;
    for (const s of this.herd) {
      if (!s.penned && inPen(s)) {
        s.penned = true; s.fleeDist = 0; s.home = { x: pen.x, z: pen.z }; s.range = 3;
        s.bounds = (X, Z) => Math.abs(X - pen.x) < pen.w / 2 - 0.8 && Math.abs(Z - pen.z) < pen.d / 2 - 0.8;
        this.sound.baa(s.pos); this.sound.ui('coin');
        this.particles.emit({ x: s.pos.x, y: s.pos.y + 1.2, z: s.pos.z }, { n: 12, color: '#ffe38a', speed: 1.5, size: 0.25 });
      }
      // el perro también las empuja
      if (!s.penned) {
        const dd = Math.hypot(s.pos.x - this.dog.pos.x, s.pos.z - this.dog.pos.z);
        if (dd < 4 && s.state !== 'flee') { s.heading = Math.atan2(s.pos.x - this.dog.pos.x, s.pos.z - this.dog.pos.z); s.speed = Math.max(s.speed, 1.2); }
      }
      if (s.penned) n++;
    }
    if (n !== this.penned) { this.penned = n; this.ui.toast(`Ovejas en el redil: ${n}/6`, 'sheep'); }
    if (n >= 6 && this.q('ovejas').step === 1) {
      this.advance('ovejas', 2); this.dog.follow = null; this.sound.bark(this.dog.pos);
      this.ui.toast('¡Todas dentro! Vuelve con Joxemari', 'sheep', 3500);
    }
    if (this.q('ovejas').state === 'done' && this.herd) { this.dog.follow = null; }
  }

  // ---------- Basura del bosque ----------
  spawnLitter() {
    this.litterItems = [];
    const spots = [[rx(-360) - 12, -360], [rx(-400) - 28, -405], [rx(-440) - 8, -455], [rx(-330) + 14, -330], [rx(-410) - 45, -420], [rx(-380) + 22, -390]];
    spots.forEach(([x, z], i) => {
      if (this.state.litter.includes(i) || this.litterItems.length >= 5 - this.state.litter.length) return;
      let X = x, Z = z; for (let k = 0; k < 20 && !isFree(X, Z, 0.5); k++) { X += (this.rnd() - 0.5) * 3; Z += (this.rnd() - 0.5) * 3; }
      const o = makeLitter(i % 3); o.position.set(X, terrainHeight(X, Z), Z); o.rotation.y = this.rnd() * 6; this.scene.add(o);
      const it = { kind: 'litter', id: i, obj: o, x: X, z: Z, r: 1.8, label: 'Recoger la basura' };
      this.items.push(it); this.litterItems.push(it);
    });
  }
  spawnComb() {
    const z = -236, x = rx(z) - riverInfo(rx(z), z).half - 1.2;
    const o = makeComb(); o.position.set(x, terrainHeight(x, z) + 0.8, z); this.scene.add(o);
    this.combItem = { kind: 'comb', obj: o, x, z, r: 2, label: 'Coger el peine de oro' };
    this.items.push(this.combItem);
  }

  // ---------- Zarratrako (escondite) ----------
  startZarratrako(restore) {
    const spots = [
      { x: PLACES.church.x - 20, z: PLACES.church.z + 18 }, { x: rx(-64) + 22, z: -66 }, { x: rx(40) - 42, z: 40 }, { x: PLACES.fronton.x - 4, z: PLACES.fronton.z - 10 },
      { x: rx(-90) - 30, z: -92 }, { x: PLACES.plaza.x + 20, z: PLACES.plaza.z + 14 },
    ].filter(s => isFree(s.x, s.z, 0.8));
    const z = this.npcs.zarratrako;
    const q = this.q('zarratrako'); q.found = q.found || 0;
    this.zarra = { spots, i: q.found, bell: 0, fleeing: 0 };
    const s = spots[this.zarra.i % spots.length];
    z.setPos(s.x, s.z, 0); z.visible = true; z.collider.ghost = false; z.noTalk = true; z.sync();
    if (!restore) this.ui.toast('Escucha los cencerros del Zarratrako…', 'bell');
  }
  updateZarratrako(dt) {
    const Z = this.zarra, a = this.npcs.zarratrako, P = this.player.pos;
    const q = this.q('zarratrako');
    if (q.step !== 1) { a.visible = false; a.collider.ghost = true; a.sync(); this.zarra = null; return; }
    Z.bell -= dt;
    const d = Math.hypot(a.pos.x - P.x, a.pos.z - P.z);
    if (Z.bell < 0) { Z.bell = d > 40 ? 1.6 : 1.0; for (let i = 0; i < 3; i++) setTimeout(() => this.sound.cowbell(a.pos, 1.2), i * 160); }
    a.J.torso.rotation.z = Math.sin(this.elapsed * 8) * 0.12;
    if (a.J.bell) a.J.bell.rotation.z = Math.sin(this.elapsed * 14) * 0.5;
    if (d < 3.2 && !Z.fleeing) {
      Z.fleeing = 1;
      q.found = (q.found || 0) + 1;
      this.sound.magic(); this.particles.confetti(a.pos, 40);
      this.ui.toast(q.found >= 3 ? '¡Te pillé! El Zarratrako te da la cinta rosa' : `¡Encontrado! (${q.found}/3) …¡y se escapa!`, 'mask', 3000);
      this.save();
      setTimeout(() => {
        this.particles.emit({ x: a.pos.x, y: a.pos.y + 1, z: a.pos.z }, { n: 40, color: '#e8dcc0', speed: 3, size: 0.6, life: 1 });
        if (q.found >= 3) { this.advance('zarratrako', 2); a.visible = false; a.collider.ghost = true; a.sync(); this.zarra = null; return; }
        Z.i++; const s = Z.spots[Z.i % Z.spots.length]; a.setPos(s.x, s.z, 0); Z.fleeing = 0;
      }, 900);
    }
  }

  // ---------- Pelota ----------
  // Frontón de Otsagabia con el motor común: el frontis mira al oeste y la cancha se abre hacia el pueblo
  ensureFronton() {
    if (this.fronton) return this.fronton;
    const f = PLACES.fronton;
    this.fronton = new Fronton(this.scene, { x: f.x + 15, z: f.z, ry: -Math.PI / 2 });
    return this.fronton;
  }
  startPelota() {
    const q = this.q('pelota'), rally = q.state === 'active' && q.step === 1;
    playPelota(this, this.ensureFronton(), this.npcs.kike, { mode: rally ? 'rally' : 'match', target: rally ? 6 : 5 }).then(async (r) => {
      if (rally && r.win) return this.winPelota();
      if (rally && !r.quit) this.ui.toast(r.best ? `¡Casi! Llegaste a ${r.best} seguidas. Habla con Kike para volver a intentarlo` : '¡Casi! Habla con Kike para volver a intentarlo', 'pelota');
      if (!rally && r.win) this.ui.toast(`¡${r.you} a ${r.cpu}! Has ganado a Kike`, 'trophy');
    });
  }
  async winPelota() {
    await this.say(this.npcs.kike, ['¡Seis seguidas! ¡Eres un txapeldun, un campeón!', 'Toma la cinta verde, como el frontón. ¡Vuelve a jugar cuando quieras!']);
    await this.completeQuest('pelota');
  }
  endPelota() { this.pelotaMatch?.exit(false); }

  // ---------- Prismáticos ----------
  toggleBinoculars() {
    if (!this.state.hasBino) return;
    if (this.mode === 'bino') {
      this.mode = 'play'; this.ui.binoculars(false);
      this.camera.fov = this.camera.userData.fov0 || 55; this.camera.updateProjectionMatrix(); this.player.obj.visible = true; this.player.frozen = false;
      return;
    }
    if (this.mode !== 'play') return;
    this.mode = 'bino'; this.ui.binoculars(true); this.sound.ui('open');
    this.player.frozen = true; this.player.obj.visible = false;
    this.binoYaw = this.follow.yaw + Math.PI; this.binoPitch = 0.05;
  }
  updateBino(dt) {
    const P = this.player.pos, cam = this.camera;
    const sens = this.input.touch ? 0.0025 : 0.0018;
    this.binoYaw -= this.input.look.dx * sens; this.binoPitch = clamp(this.binoPitch - this.input.look.dy * sens, -0.6, 1.2);
    const mv = this.input.move; this.binoYaw -= mv.x * dt * 0.8; this.binoPitch = clamp(this.binoPitch + mv.y * dt * 0.6, -0.6, 1.2);
    cam.fov = lerp(cam.fov, 16, 1 - Math.exp(-8 * dt)); cam.updateProjectionMatrix();
    const eye = new THREE.Vector3(P.x, P.y + 1.55, P.z);
    const dir = new THREE.Vector3(Math.sin(this.binoYaw) * Math.cos(this.binoPitch), Math.sin(this.binoPitch), Math.cos(this.binoYaw) * Math.cos(this.binoPitch));
    cam.position.copy(eye); cam.lookAt(eye.clone().add(dir));
    this.follow.yaw = this.binoYaw + Math.PI;
    // buscar animal en el centro
    let best = null, ba = 1;
    for (const o of this.fauna.observables()) {
      const to = new THREE.Vector3(o.pos.x - eye.x, o.pos.y + (o.h || 0.5) - eye.y, o.pos.z - eye.z);
      const d = to.length(); if (d > (o.far ? 260 : 90) || d < 1) continue;
      const ang = to.normalize().angleTo(dir);
      const tol = Math.max(0.025, 1.2 / d);
      if (ang < tol && ang < ba && (o.far || !segmentBlocked(eye.x, eye.z, o.pos.x, o.pos.z))) { ba = ang; best = o; }
    }
    const name = best ? SPECIES_OBS[best.id] : null;
    const isNew = best && !this.state.observed.includes(best.id);
    this.ui.binoTarget(best ? `${name}${isNew ? ' — ¡nuevo! pulsa para anotar' : ' — anotado'}` : '', !!best);
    if (this.input.consume('e') || this.input.consume(' ')) {
      if (best && isNew) {
        this.state.observed.push(best.id); this.sound.ui('photo');
        this.giveCard(best.id);
        this.ui.toast(`¡${name} anotado en el cuaderno!`, 'binoculars');
        const q = this.q('irati');
        if (q.state === 'active' && q.step === 1 && this.state.observed.length >= 5) { this.advance('irati', 2); this.ui.toast('¡Cinco especies! Vuelve con Iñaki', 'binoculars', 3500); }
        this.save();
      } else this.sound.ui('photo');
    }
    if (this.input.consume('f') || this.input.consume('escape')) this.toggleBinoculars();
  }

  // ---------- Danza final ----------
  startDance() {
    this.mode = 'dance';
    const m = LANDMARKS.muskilda.dance;
    this.player.place(m.x - 6, m.z + 1, -Math.PI / 2);
    this.player.frozen = true;
    this.dancers.forEach((d, i) => { d.visible = true; d.collider.ghost = true; d.heading = -Math.PI / 2; d.dance = 0; d.sync(); });
    this.npcs.bobo.setPos(m.x - 3.5, m.z + 4, -Math.PI / 2);
    this.follow.cinematic = { pos: new THREE.Vector3(m.x - 14, terrainHeight(m.x, m.z) + 4.5, m.z + 7), look: new THREE.Vector3(m.x - 2, terrainHeight(m.x, m.z) + 1.4, m.z + 1), t: 0 };
    this.sound.setMusic(false);
    const seq = [];
    const bpm = 100, beat = 60 / bpm;
    const pattern = [0, 3, 0, 3, 1, 2, 1, 2, 0, 1, 2, 3, 3, 2, 1, 0, 0, 0, 3, 3, 1, 2, 1, 2, 0, 3, 1, 2, 3, 0, 1, 2];
    pattern.forEach((l, i) => seq.push({ t: 2 + i * beat * (i < 16 ? 2 : 1.5), lane: l }));
    this.dn = { seq, t: 0, i: 0, hits: 0, notes: [], beat, fall: 1.8, total: seq.length };
    this.rh = this.ui.rhythm((lane) => this.dancePress(lane));
    this.rh.feedback('¡Prepárate!');
    this.ui.setMG(`Baile de Muskilda<small>Aciertos: <span id="dnN">0</span>/${seq.length}</small>`);
    this.danceKeys = (e) => { const k = e.key.toLowerCase(); const map = { arrowleft: 0, a: 0, q: 0, arrowup: 1, w: 1, z: 1, arrowdown: 2, s: 2, arrowright: 3, d: 3 }; if (k in map) { e.preventDefault(); e.stopPropagation(); this.dancePress(map[k]); } };
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
      this.sound.noiseBurst(0.06, 2200, 2, 0.3, this.sound.sfx); this.sound.tone([392, 440, 523, 587][lane] * 2, 0.15, 'triangle', 0.1, this.sound.sfx);
      const el = document.getElementById('dnN'); if (el) el.textContent = D.hits;
      this.player.rig.doWave();
    } else { this.rh.feedback('¡Uy!'); }
  }
  updateDance(dt) {
    const D = this.dn; if (!D) return;
    D.t += dt;
    // música del baile: tamboril + txistu a ritmo
    const beatIdx = Math.floor(D.t / D.beat);
    if (beatIdx !== D.lastBeat) {
      D.lastBeat = beatIdx;
      if (D.t > 0.5) { this.sound.noiseBurst(0.08, 180, 1, beatIdx % 2 ? 0.25 : 0.45, this.sound.musicBus, 0, 'lowpass'); this.sound.musicBus.gain.value = 0.4; const sc = [587, 659, 698, 784, 880, 784, 698, 659]; this.sound.flute(sc[beatIdx % 8], D.beat * 0.9, 0); }
    }
    // bailarines
    const dAmt = D.t > 1.5 ? 6.3 : 0;
    this.dancers.forEach((d, i) => { d.dance = dAmt ? (dAmt + (i % 2) * 0.01) : 0; d.anim.t = D.t * 1 + (i % 2) * Math.PI; });
    this.npcs.bobo.dance = dAmt ? 5 : 0;
    this.player.rig.obj.position.y = this.player.pos.y + Math.abs(Math.sin(D.t * 6.3)) * 0.15;
    // generar notas
    while (D.i < D.seq.length && D.seq[D.i].t - D.fall <= D.t) {
      const n = D.seq[D.i++]; n.el = this.rh.addNote(n.lane); D.notes.push(n);
    }
    for (const n of D.notes) {
      const k = 1 - (n.t - D.t) / D.fall; // 0 arriba → 1 en la línea
      if (!n.done) n.el.style.bottom = `${64 + (1 - k) * 140 - 25}px`;
      if (!n.done && D.t - n.t > 0.3) { n.done = true; n.el.classList.add('miss'); }
      if (D.t - n.t > 0.6 && n.el.parentNode) n.el.remove();
    }
    if (D.i >= D.seq.length && D.t > D.seq[D.seq.length - 1].t + 1.2) this.endDance();
  }
  async endDance() {
    const D = this.dn; this.dn = null;
    removeEventListener('keydown', this.danceKeys, true);
    this.rh.remove(); this.ui.setMG(null);
    const ok = D.hits >= Math.ceil(D.total * 0.55);
    this.dancers.forEach(d => d.dance = 0); this.npcs.bobo.dance = 0;
    if (!ok) {
      await this.say(this.npcs.bobo, [`¡Muy bien! Has acertado ${D.hits} de ${D.total}. Para la fiesta hacen falta al menos ${Math.ceil(D.total * 0.55)}.`, '¡Probemos otra vez!']);
      this.follow.cinematic = null; return this.startDance();
    }
    this.mode = 'cine';
    this.sound.fanfare();
    for (let i = 0; i < 5; i++) setTimeout(() => this.particles.confetti({ x: this.player.pos.x + (Math.random() - 0.5) * 8, y: this.player.pos.y, z: this.player.pos.z + (Math.random() - 0.5) * 8 }, 90), i * 500);
    this.sound.churchBell(3, { x: PLACES.muskilda.x, z: PLACES.muskilda.z });
    this.dancers.forEach(d => { d.dance = 5; });
    this.npcs.bobo.dance = 4;
    this.player.rig.doCheer();
    await wait(2500);
    this.state.done = true; this.q('muskilda').state = 'done';
    this.save();
    await this.ui.reward({ stamp: 'MUSKILDA<br>Otsagabia<br>8 CINTAS', title: '¡Pasaporte sellado!', text: `${this.state.name}, has devuelto las ocho cintas y has bailado en la fiesta de Muskilda. ¡Eskerrik asko! Puedes seguir explorando el valle: quedan eguzkilores, cartas y preguntas por descubrir.`, button: 'Seguir explorando' });
    this.dancers.forEach(d => d.dance = 0);
    this.follow.cinematic = null; this.player.frozen = false; this.mode = 'play';
    this.sound.setMusic(this.state.settings.music);
    this.autoTrack(); this.refreshHUD();
  }

  // ---------- Escenas ----------
  async intro() {
    this.mode = 'cine'; this.player.frozen = true;
    this.ui.hudVisible(false); this.ui.setCinematic(true);
    const shots = [
      { pos: [60, 90, 230], look: [0, 10, -40], text: 'El valle de Salazar, en el Pirineo de Navarra…' },
      { pos: [-40, 40, 60], look: [PLACES.church.x, 15, PLACES.church.z], text: 'Aquí, junto al río Anduña, está Otsagabia, o Ochagavía.' },
      { pos: [PLACES.muskilda.x - 60, 70, PLACES.muskilda.z + 50], look: [PLACES.muskilda.x, 50, PLACES.muskilda.z], text: 'Mañana es la fiesta del santuario de Muskilda…' },
      { pos: [PLACES.crucero.x - 8, 0, PLACES.crucero.z + 10], look: [PLACES.crucero.x + 3, 1.6, PLACES.crucero.z - 3], text: `…y ${this.state.name} acaba de llegar al pueblo.` },
    ];
    let skip = false;
    const onSkip = () => { skip = true; };
    addEventListener('keydown', onSkip); addEventListener('pointerdown', onSkip);
    for (const s of shots) {
      if (skip) break;
      const gy = terrainHeight(s.pos[0], s.pos[2]);
      const p = new THREE.Vector3(s.pos[0], Math.max(s.pos[1], gy + 3), s.pos[2]);
      const l = new THREE.Vector3(s.look[0], terrainHeight(s.look[0], s.look[2]) + s.look[1], s.look[2]);
      if (!this.follow.cinematic) { this.camera.position.copy(p).add(new THREE.Vector3(30, 20, 30)); }
      this.follow.cinematic = { pos: p, look: l, t: 0, lookCur: this.follow.cinematic?.lookCur };
      this.ui.setCinematic(true, s.text);
      for (let t = 0; t < 3600 && !skip; t += 100) await wait(100);
    }
    removeEventListener('keydown', onSkip); removeEventListener('pointerdown', onSkip);
    this.follow.cinematic = null; this.follow.snap(this.player);
    this.ui.setCinematic(false); this.ui.hudVisible(true);
    this.player.frozen = false; this.mode = 'play';
    this.npcs.maite.wave = 2;
    this.state.introDone = true; this.save();
    this.ui.toast(this.input.touch ? 'Habla con Maite: acércate y toca el botón amarillo' : 'Habla con Maite: acércate y pulsa E', 'talk', 4500);
  }
  teleport(x, z) {
    let X = x, Z = z;
    for (let k = 1; k < 40 && (!isFree(X, Z, 0.6) || waterLevelAt(X, Z) > terrainHeight(X, Z) - 0.1); k++) { const a = k * 2.4, r = 1.5 + k * 0.5; X = x + Math.cos(a) * r; Z = z + Math.sin(a) * r; }
    this.player.place(X, Z, this.player.heading); this.follow.snap(this.player);
  }
  // Acciones del mapa: seguir una misión, ir a un sitio o jugar a pelota
  mapAct(a, it) {
    if (a === 'track') return this.track(it.id);
    if (a === 'pelota') return this.goPelota();
    if (a === 'go') this.teleport(it.x, it.z);
  }
  // Ir al frontón y jugar ya (desde el menú o el mapa): con Kike, sea o no misión
  goPelota() {
    if (this.mode !== 'play') return;
    const f = PLACES.fronton; this.teleport(f.x + 3, f.z + 4.5);
    const q = this.q('pelota');
    if (q.state !== 'done' && !(q.state === 'active' && q.step === 1)) return this.talk(this.npcs.kike);
    this.startPelota();
  }
}
