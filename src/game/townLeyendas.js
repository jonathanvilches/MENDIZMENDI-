// El pueblo (game/townGame.js), sus leyendas y su carnaval: las misiones de noche con las pistas, la criatura y la
// persecución, y las figuras del carnaval que hay que encontrar. Son métodos de TownGame: townGame.js los une a su clase
// (util/mezcla.js), con su this.

import { Actor } from '../actors/people.js';
import { Chase } from './chase.js';
import { MYTHS } from '../actors/outfits.js';
import { PLACES, PONDS, plazaMask } from '../world/layout.js';
import * as THREE from 'three';
import { TOWN } from '../world/townBuilder.js';
import { clamp } from '../util/math.js';
import { makeAura, makeClue } from './legendFx.js';
import { terrainHeight, groundHeight } from '../world/heightfield.js';
import { COSTUMES } from '../actors/minifig.js';
import { addCard, saveProfile } from './profile.js';
import { QUALITY } from '../util/quality.js';
import { removeMover, isFree } from '../world/colliders.js';

// el final de los momotxorros (manadaMomotxorros): un tinte rojo suave de la luz que ya hay, no una noche roja
const ROJO_MANADA = new THREE.Color('#ff3a1c');
// (y un velo rojo suave en los bordes de la pantalla, que sube con el tinte; nunca oscuro del todo: «menos es más»)
const MANADA_CSS = `.manada-velo{position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0;transition:opacity .4s linear;background:radial-gradient(ellipse at center,rgba(255,40,10,.06) 35%,rgba(220,24,0,.3) 72%,rgba(150,0,0,.52) 100%)}`;
// Aspecto de los personajes de carnaval y leyenda
const FOLK = {
  joaldun: { myth: 'joaldun', traje: 'joaldun', shirt: '#f4f1ea', fur: '#ece4d2', hat: 'cone', hatColor: '#f4f1ea', skirt: '#f4f1ea', pants: '#1d2a4a', bells: true, scarf: '#3a8fd6', handkerchief: '#e8e0cc', face: 'brave' },
  mozorro: { shirt: '#6b8a3a', pattern: 'check', pattern2: '#e03c3c', pants: '#3a2a1a', hat: 'mask', hatColor: '#6b4a2e', maskColor: '#f1e7d6', stick: '#8a5a32' },
  momotxorro: { ...COSTUMES.momotxorro, myth: 'momotxorro', traje: 'momotxorro', height: 1.8 },   // (un mozo alto: la cesta y los cuernos ya lo agrandan)
  'miel-otxin': { traje: 'miel-otxin', shirt: '#e03c3c', ribbons: true, pants: '#f2c230', hat: 'cone', hatColor: '#3a8fd6', height: 2.1, build: 1.2, face: 'angry' },
  zarratrako: { myth: 'zarratrako', shirt: '#8a6a4a', pattern: 'stripes', pattern2: '#3ca05a', pants: '#6b4a2e', fur: '#b08650', hat: 'mask', hatColor: '#3a2a1a', bell: true, stick: '#6b4a2e' },
  cascabobo: { traje: 'cascabobo', shirt: '#f2c230', pattern: 'dots', pattern2: '#e03c3c', pants: '#e03c3c', hat: 'cone', hatColor: '#e03c3c', bladder: true, face: 'happy' },
  irasko: { traje: 'irasko', shirt: '#3ca05a', pattern: 'check', pattern2: '#f2c230', pants: '#2b3a6b', hat: 'mask', hatColor: '#3ca05a', bell: true },
  paloki: { traje: 'paloki', shirt: '#b34fc4', ribbons: true, pants: '#f4f1ea', hat: 'cone', hatColor: '#f2c230', height: 2.0 },
  'comparsa-mendigorria': { traje: 'comparsa-mendigorria', shirt: '#3a8fd6', pattern: 'stripes', pattern2: '#f4f1ea', pants: '#e03c3c', hat: 'mask', hatColor: '#3a8fd6' },
  lagunero: { traje: 'lagunero', shirt: '#2b3a6b', print: 'coat', pants: '#f4f1ea', hat: 'bicorne', bigHead: true, face: 'angry', moustache: '#2a1a12', moustacheCurl: true },
  zipotero: { traje: 'zipotero', shirt: '#3a8fd6', pattern: 'stripes', pattern2: '#f2c230', pants: '#e03c3c', hat: 'mask', hatColor: '#f2c230', bladder: true, face: 'angry' },
  // criaturas de la noche: claramente más grandes que una persona (1,5 a 2,5 veces)
  lamia: { traje: 'lamia', skin: '#e6e2cf', hair: '#e8c34a', hairStyle: 'long', hairLen: 5.2, duck: true, lashes: true, eyes: '#2f9f8a', shirt: '#6ab0a0', print: 'blouse', bodice: '#3a8a7a', skirt: '#4a9a8a', pants: '#4a9a8a', comb: true, height: 2.55, build: 0.95, face: 'smirk', female: true },
  basajaun: { traje: 'basajaun', skin: '#b08462', hair: '#4e3420', hairStyle: 'long', hairLen: 2.6, shaggy: '#5a3e26', beard: '#4e3420', brows: '#2e1c10', fur: '#5a3e26', shirt: '#5a3e26', pants: '#4a3420', staff: true, height: 3.4, build: 1.45, face: 'brave' },
  sorgina: { traje: 'sorgina', skin: '#e8d0b8', hair: '#dcd7cf', hairStyle: 'long', shirt: '#3d3350', print: 'shawl', shawl: '#2a2440', skirt: '#2a2440', pants: '#2a2440', kerchief: '#3d3350', old: true, staff: true, height: 2.4 },
  roldan: { traje: 'roldan', skin: '#dfe6ff', hair: '#c9d4ff', beard: '#c9d4ff', shirt: '#aab6d8', print: 'coat', pants: '#8a96b8', shoes: '#6a7698', boots: true, staff: true, height: 2.7, build: 1.15, face: 'brave' },
  tartalo: { traje: 'tartalo', skin: '#c9a27a', hair: '#3b2418', shirt: '#6b4a2e', fur: '#8a6a4a', pants: '#4a3a2a', height: 2.6, build: 1.4, face: 'angry', staff: true },
};

export class PuebloLeyendas {
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
    const pd = PONDS[0], lairP = L.lair === 'cave' ? (lm('cave')?.spot || P.forest) : L.lair === 'river' ? (lm('bridge')?.spot || P.riverSpot || P.forest) : L.lair === 'pond' && pd ? { x: pd.x + pd.r + 5, z: pd.z } : P.forest || P.edgeN;   // (pond: la charca del bosque)
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
      if (M.m.who === 'roldan' || M.leg.ghost) a.obj.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.62; o.material.depthWrite = false; } });
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
    if (M.figura && addCard('figura:' + M.figura, 'tradiciones')) saveProfile();   // (se te ha aparecido: se abre en Personajes)
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
    this.leyendaNoche = active && night;   // (la posada no avisa de dormir mientras se sigue una leyenda: posada.js)
    const fog = this.scene.fog;
    if (fog && fog.isFog) { this.fogFar0 ??= fog.far; const want = this.desfileOn?.rojo ? Math.min(this.fogFar0, 85) : active && night ? Math.min(this.fogFar0, 140) : this.fogFar0; fog.far += (want - fog.far) * Math.min(1, dt * 0.8); }   // (y en el final de los momotxorros, aún más cerca: la niebla roja)
    for (const f of this.folk) if (f.fm?.night) { f.obj.visible = f.obj.visible && night; }
  }
  // ---------- Carnaval: buscar por el sonido ----------
  startCarnival(M) {
    if (M.figura && addCard('figura:' + M.figura, 'tradiciones')) saveProfile();   // (las figuras del carnaval, ya en la calle: en Personajes)
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
    if (!a.found && a.bellT < 0) { a.bellT = (d > 60 ? 0.9 : 0.5) + this.rnd() * 0.25; if (d < 160) this.sound.cencerroGuia(a.pos, d < 40 ? 2 : 1); if (a.J.bell) a.J.bell.rotation.z = 0.6; }   // (que se oigan en todo el pueblo: audio.js, cencerroGuia)
    if (a.J.bell) a.J.bell.rotation.z *= 0.9;
    if (!a.found && !a.chase && d < 3.2 && this.mode === 'play') this.catchFolk(a);
    if (a.aura) a.aura.userData.tick?.(dt);
  }
  catchFolk(a) {
    a.found = true; a.dance = 6; a.wander = 0; a.state = 'idle'; const M = a.fm; M.count++;
    a.chase?.dispose(); a.chase = null;
    this.particles.confetti ? this.particles.confetti(a.pos, 40) : this.particles.emit({ x: a.pos.x, y: a.pos.y + 2, z: a.pos.z }, { n: 30, color: ['#e03c3c', '#f2c230', '#3a8fd6'], speed: 3, size: 0.3 });
    this.sound.magic(); this.ui.toast(`¡Encontrado! ${this.stepText(M)}`, 'mask', 2400);
    if (M.count >= M.need) { M.step = M.night ? 3 : 2; this.ui.toast(`¡Todos encontrados! Vuelve con ${M.host.name}`, 'check', 3200);
      setTimeout(() => { if (this.scene) this.desfileCarnaval(M, { x: a.pos.x, z: a.pos.z }); }, 2600); }
  }
  // ---------- La fiesta al encontrarlos todos: el desfile por las calles ----------
  // (como en el propio carnaval: salen muchos más, en comparsa, y recorren el pueblo con sus cencerros. En Altsasu, los
  // momotxorros van en manada a la plaza: manadaMomotxorros)
  desfileCarnaval(M, desde) {
    if (this.desfileOn) return;
    if (M.m.character === 'momotxorro') { this.manadaMomotxorros(); return; }
    const look = FOLK[M.m.character] || FOLK.joaldun, P0 = PLACES.plaza || desde;
    const D = desde || P0, lejos = TOWN.houses.map(h => h.door).filter(p => p && Math.hypot(p.x - P0.x, p.z - P0.z) > 25 && Math.hypot(p.x - P0.x, p.z - P0.z) < 90);
    const otra = lejos.length ? lejos[Math.floor(this.rnd() * lejos.length)] : P0, iglesia = TOWN.church?.door || TOWN.church;
    // (el recorrido: de donde estaba el último hacia la plaza, la iglesia y la fuente, por otra calle y vuelta a la plaza)
    const pts = [P0, iglesia, TOWN.fountain, otra, P0].filter(p => p && Number.isFinite(p.x));
    const n = QUALITY === 'low' ? 6 : QUALITY === 'mid' ? 10 : 14, gente = [];
    for (let i = 0; i < n; i++) {
      const t = this.rnd() * 6.28, r = 2 + this.rnd() * 6, sp = this.spot({ x: D.x + Math.cos(t) * r, z: D.z + Math.sin(t) * r }, 2);
      const route = pts.map((p) => ({ x: p.x + (this.rnd() - 0.5) * 5, z: p.z + (this.rnd() - 0.5) * 5 }));
      const a = new Actor({ id: 'desfile' + i, name: M.folk?.name || 'Personaje', x: sp.x, z: sp.z, look, route, walkSpeed: 1.0 + this.rnd() * 0.4, ghost: true }, this.scene);
      const halo = makeAura('#ffb45a', 0.8); halo.position.y = 2.25; a.obj.add(halo); a.aura = halo;
      a.wait = 0.3 + i * 0.22;   // (salen uno detrás de otro, en comparsa)
      gente.push(a);
    }
    this.desfileOn = { gente, t: 0, dur: 80, cen: 0, chispa: 0 };
    this.sound.bucleCencerros?.(0);   // (prepara el rumor de la comparsa, audio.js)
    this.ui.toast('¡Salen a celebrarlo por las calles!', 'mask', 3800);
  }
  // ---------- Altsasu: la manada de momotxorros que llena la plaza ----------
  // El autor, 21 de noviembre de 2026, por la mañana: «antes ellos saltaban como unas chispas rojas, que eso me gustaba
  // mucho, eso quiero mantener. Y luego que aparezcan el triple de momotxorros, que llenen la plaza, que se pongan a
  // bailar, que el ambiente sea mucho más rojo, que dure unos segundos y que todos empiecen a correr por el pueblo para
  // irse y desaparecer». (La víspera había pedido menos rojo y que se distinguieran bien: sin halos ni ojos encendidos.)
  // Así que: (1) de cuatro calles alrededor de la plaza llegan corriendo, el triple que antes (30, 54 o 90 según la
  // calidad), echando chispas rojas; (2) se reparten por toda la plaza (los huecos libres de plazaMask, del centro al
  // borde) y bailan en su sitio: saltan en ola desde el centro, giran, se paran a bailar con el cencerro, y cada salto
  // levanta chispas; el aire se pone rojo (tinte de la luz hasta 0,72, brasas que flotan y un velo rojo suave en los
  // bordes); (3) cuando llevas unos segundos mirando (14 s), salen corriendo por las calles en todas direcciones y, al
  // llegar lejos, desaparecen en un chispazo
  manadaMomotxorros() {
    const look = FOLK.momotxorro, P = this.player.pos, PL = PLACES.plaza;
    const kio = TOWN.landmarks.find(l => l.kind === 'kiosk' || l.kind === 'nogal');
    const C = kio ? { x: kio.x, z: kio.z, r: 4.2 } : { x: PL.x, z: PL.z, r: 2.5 };
    const n = QUALITY === 'low' ? 30 : QUALITY === 'mid' ? 54 : 90;
    // (los huecos de la plaza: una rejilla de 1,6 m dentro de la plaza de verdad, libres de casas, fuentes y del kiosco)
    const R = Math.max(16, (PL.r || 14) * 2), huecos = [];
    for (let x = -R; x <= R; x += 1.6) for (let z = -R; z <= R; z += 1.6) {
      const X = C.x + x + (this.rnd() - 0.5) * 0.5, Z = C.z + z + (this.rnd() - 0.5) * 0.5, d = Math.hypot(X - C.x, Z - C.z);
      if (d > R || d < C.r) continue;
      if (plazaMask(X, Z) < 0.5 && Math.hypot(X - PL.x, Z - PL.z) > (PL.r || 14)) continue;
      if (!isFree(X, Z, 0.55)) continue;
      huecos.push({ x: X, z: Z, d });
    }
    huecos.sort((a, b) => a.d - b.d);
    // (repartidos por toda la plaza, del centro al borde; si la plaza es pequeña, se apretujan alrededor)
    const sitios = [];
    if (huecos.length >= n) for (let i = 0; i < n; i++) sitios.push(huecos[Math.floor(i * huecos.length / n)]);
    else { sitios.push(...huecos); for (let i = sitios.length, k = 0; i < n; i++, k++) { const a = k * 2.4, r = C.r + 1 + k * 0.18; sitios.push({ x: C.x + Math.cos(a) * r, z: C.z + Math.sin(a) * r, d: r }); } }
    // (de dónde llegan: cuatro puertas a 30-75 m, cada una en un cuarto distinto alrededor de la plaza)
    const puertas = TOWN.houses.map(h => h.door).filter(p => p && Math.hypot(p.x - C.x, p.z - C.z) > 30 && Math.hypot(p.x - C.x, p.z - C.z) < 75);
    const origen = [0, 1, 2, 3].map(k => { const t = k / 4 * 6.283 + Math.atan2(P.z - C.z, P.x - C.x); let b = null, bd = 1e9; for (const p of puertas) { const a = Math.atan2(p.z - C.z, p.x - C.x), da = Math.abs(Math.atan2(Math.sin(a - t), Math.cos(a - t))); if (da < bd) { bd = da; b = p; } } return b || { x: C.x + Math.cos(t) * 45, z: C.z + Math.sin(t) * 45 }; });
    const gente = [];
    for (let i = 0; i < n; i++) {
      const o = origen[i % 4], t = this.rnd() * 6.283, r = 1 + this.rnd() * 3.5, sp = this.spot({ x: o.x + Math.cos(t) * r, z: o.z + Math.sin(t) * r }, 3);
      const a = new Actor({ id: 'desfile' + i, name: 'Momotxorro', x: sp.x, z: sp.z, look, walkSpeed: 1.0 + this.rnd() * 0.35, ghost: true }, this.scene);
      a.ignorePlayer = true; a.wait = 1e9; a.oculto = true; a.obj.visible = false;
      a.sale = 0.2 + Math.floor(i / 4) * 0.06 + (i % 4) * 0.15;   // (en tropel, por las cuatro calles a la vez)
      a.sitio = sitios[i]; a.fase = -sitios[i].d * 0.45; a.giro = (this.rnd() - 0.5) * 3; a.baile = 1 + this.rnd() * 5;
      gente.push(a);
    }
    if (!document.getElementById('manada-css')) { const st = document.createElement('style'); st.id = 'manada-css'; st.textContent = MANADA_CSS; document.head.appendChild(st); }
    const velo = document.createElement('div'); velo.className = 'manada-velo'; velo.setAttribute('aria-hidden', 'true'); document.body.appendChild(velo);
    this.desfileOn = { gente, t: 0, dur: Infinity, cen: 0, chispa: 0, brasa: 0, manada: true, C, fase: 'llegan', k: 0, mirado: 0, grita: 1.5, velo };
    this.sound.bucleCencerros?.(0);
    this.ui.toast('¡Llegan corriendo los momotxorros! Van a llenar la plaza', 'mask', 4200);
  }
  /** La manada en cada fotograma: llegan corriendo, llenan la plaza bailando y se van (ver manadaMomotxorros). */
  updateManada(D, dt) {
    const P = this.player, C = D.C, G = D.gente, chispas = (x, y, z, k = 1) => this.particles.emit({ x, y, z }, { n: Math.round(5 * k), color: ['#ff2a12', '#ff6a2a', '#ffc08a'], speed: 1.6, size: 0.36, life: 0.8, gravity: 2.2, spread: 0.5, up: 1.4 });
    // (el rojo: sube en 3 s hasta 0,55 mientras bailan y se va en 7 s al marcharse)
    const sube = Math.min(1, D.t / 3), baja = D.fase === 'van' ? Math.max(0, 1 - (D.t - D.van) / 7) : 1;
    D.k = sube * baja * (D.fase === 'llegan' ? 0.7 : 1);
    this.tinte = D.k > 0.01 ? { col: ROJO_MANADA, k: D.k * 0.72, parpadeo: D.k * 0.18 } : null;
    if (D.velo && Math.abs((D.veloK ?? -1) - D.k) > 0.02) { D.veloK = D.k; D.velo.style.opacity = D.k.toFixed(2); }
    // (brasas rojas que flotan sobre la plaza)
    // (el autor, 21 nov: «esas chispas o ascuas de fuego [...] me gustaban, le daban un toque»: más y más grandes, que se
    // vean bajo el velo rojo; en el rodaje del tráiler, con 0,17 apenas eran puntitos)
    // (la mitad, por la plaza; la otra mitad, delante de quien mira, para que siempre se vean algunas cerca)
    if (D.k > 0.15 && (D.brasa -= dt) <= 0) {
      D.brasa = QUALITY === 'low' ? 0.08 : 0.035;
      const cam = this.camera?.position, cerca = cam && Math.hypot(cam.x - C.x, cam.z - C.z) < 45 && (D.lado = !D.lado);
      let ox = C.x, oz = C.z, R = 20;
      if (cerca) { const f = this.camera.getWorldDirection(D.dir ||= new THREE.Vector3()); ox = cam.x + f.x * 9; oz = cam.z + f.z * 9; R = 7; }
      const t = this.rnd() * 6.283, r = this.rnd() * R, x = ox + Math.cos(t) * r, z = oz + Math.sin(t) * r;
      this.particles.emit({ x, y: groundHeight(x, z) + 0.3 + this.rnd() * 2.6, z }, { n: QUALITY === 'low' ? 1 : 2, color: ['#ff3a1c', '#ff7a3a', '#ffc070'], speed: 0.3, size: 0.38, life: 3.4, gravity: -0.4, spread: 0.35, drag: 0.3 });
    }
    // (de vez en cuando, uno grita)
    if ((D.grita -= dt) <= 0) { D.grita = 1.6 + this.rnd() * 2.4; const a = G[Math.floor(this.rnd() * G.length)]; if (a && !a.oculto) this.sound.creature?.('momotxorro', 'call', a.pos); }
    const dPlaza = Math.hypot(P.pos.x - C.x, P.pos.z - C.z);
    if (D.fase === 'llegan' || D.fase === 'baile') {
      let enSitio = 0;
      for (const a of G) {
        if (a.oculto) { if (D.t >= a.sale) { a.oculto = false; a.obj.visible = true; a.goTo({ x: a.sitio.x, z: a.sitio.z, run: true }); a.pide = D.t; } continue; }
        if (!a.enSitio) {
          // (corriendo hacia la plaza, saltando y soltando chispas)
          if (a.state === 'walk' && this.rnd() < dt * 1.2) chispas(a.pos.x, a.pos.y + 0.3, a.pos.z, 0.6);
          const d = Math.hypot(a.pos.x - a.sitio.x, a.pos.z - a.sitio.z);
          if (d < 1.4 || (a.arrived && d < 6)) { a.enSitio = true; a.state = 'idle'; a.target = null; a.path = null; a.goal = null; a.heading = Math.atan2(C.x - a.pos.x, C.z - a.pos.z); a.h0 = a.heading; }
          else if (a.state === 'idle' && D.t - (a.pide || 0) > 1.2) { a.goTo({ x: a.sitio.x, z: a.sitio.z, run: true }); a.pide = D.t; }   // (sin camino o atascado: otra vez)
          continue;
        }
        enSitio++;
        // en su sitio de la plaza: saltan en ola desde el centro, giran y, de vez en cuando, bailan con el cencerro
        const s = Math.sin(D.t * 6.5 + a.fase), arriba = Math.max(0, s);
        a.alto = groundHeight(a.pos.x, a.pos.z) + arriba * 0.42;
        if (s < -0.9 && !a.cayo) { a.cayo = true; if (this.rnd() < (QUALITY === 'low' ? 0.18 : 0.3)) chispas(a.pos.x, a.pos.y + 0.1, a.pos.z, 0.8); } else if (s > 0) a.cayo = false;
        // (unos giran sobre sí mismos; los demás, de cara al centro, se balancean a un lado y a otro)
        if (Math.abs(a.giro) > 0.9) a.heading += a.giro * dt; else a.heading = a.h0 + Math.sin(D.t * 2.2 + a.fase) * 0.5;
        if (a.dance) { if ((a.bailaT -= dt) <= 0) { a.dance = 0; a.baile = 3 + this.rnd() * 5; } }
        else if ((a.baile -= dt) <= 0) { a.dance = 1; a.bailaT = 1.6; this.sound.cencerroCerca?.(a.pos, 2, 0.8); }
      }
      if (D.fase === 'llegan' && (enSitio >= G.length * 0.75 || D.t > 40)) { D.fase = 'baile'; D.baile = D.t; this.ui.toast('¡Los momotxorros bailan en la plaza!', 'mask', 3000); }
      if (D.fase === 'baile') {
        // (unos segundos: cuentan mientras estás cerca de la plaza; si no vienes, al cabo de dos minutos y medio se van)
        if (dPlaza < 45) D.mirado += dt;
        if (D.mirado > 14 || D.t - D.baile > 150) this.vanseMomotxorros(D);
      }
    } else if (D.fase === 'van') {
      // (corren por las calles hacia las afueras; al llegar lejos, o a los 16 s, desaparecen en un chispazo)
      let quedan = 0;
      for (const a of G) {
        if (!a.obj.visible || a.oculto) continue;
        if (a.state === 'walk' && this.rnd() < dt * 1.2) chispas(a.pos.x, a.pos.y + 0.3, a.pos.z, 0.5);
        const lejos = Math.hypot(a.pos.x - C.x, a.pos.z - C.z) > a.irse || a.arrived || D.t - D.van > a.limite;
        if (lejos) { chispas(a.pos.x, a.pos.y + 1, a.pos.z, 3); a.obj.visible = false; a.oculto = true; } else quedan++;
      }
      if (!quedan || D.t - D.van > 18) this.finDesfile();
    }
  }
  /** Se acaba el baile: salen corriendo por las calles, cada uno por la que le pilla, y desaparecen al alejarse. */
  vanseMomotxorros(D) {
    D.fase = 'van'; D.van = D.t; const C = D.C;
    const lejos = TOWN.houses.map(h => h.door).filter(p => p && Math.hypot(p.x - C.x, p.z - C.z) > 70 && Math.hypot(p.x - C.x, p.z - C.z) < 140);
    const N = 7, salidas = [...Array(N)].map((_, k) => { const t = k / N * 6.283 + this.rnd() * 0.4; let b = null, bd = 1e9; for (const p of lejos) { const d = Math.hypot(p.x - (C.x + Math.cos(t) * 100), p.z - (C.z + Math.sin(t) * 100)); if (d < bd) { bd = d; b = p; } } return { p: b || { x: C.x + Math.cos(t) * 100, z: C.z + Math.sin(t) * 100 }, t }; });
    for (const a of D.gente) {
      if (a.oculto) continue;
      const ang = Math.atan2(a.pos.z - C.z, a.pos.x - C.x); let s = salidas[0], sd = 9;
      for (const o of salidas) { const da = Math.abs(Math.atan2(Math.sin(ang - o.t), Math.cos(ang - o.t))); if (da < sd) { sd = da; s = o; } }
      a.dance = 0; a.alto = null; a.enSitio = false; a.lookAt = null; a.walkSpeed = 1.15 + this.rnd() * 0.3;
      a.irse = 55 + this.rnd() * 30; a.limite = 9 + this.rnd() * 7;
      a.goTo({ x: s.p.x + (this.rnd() - 0.5) * 4, z: s.p.z + (this.rnd() - 0.5) * 4, run: true });
    }
    for (let i = 0; i < 4; i++) { const a = D.gente[Math.floor(this.rnd() * D.gente.length)]; if (a) this.sound.creature?.('momotxorro', 'call', a.pos); }
    this.ui.toast('Los momotxorros se van corriendo por las calles de Altsasu', 'mask', 3200);
  }
  updateDesfile(dt) {
    const D = this.desfileOn; if (!D) return; D.t += dt; const P = this.player;
    if (D.manada) this.updateManada(D, dt);
    if (!this.desfileOn) return;
    // (la manada se mueve aunque estés lejos: si no, desde la otra punta del pueblo se quedaban quietos y nunca llegaban
    // al kiosco; la comparsa de antes, solo de cerca)
    for (const a of D.gente) { if (a.oculto) continue; const d = Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z); a.obj.visible = d < 100; if (d < 100 || D.manada) a.update(dt, P); a.aura?.userData.tick?.(dt); }
    // (sus cencerros, de los que tienes cerca, uno tras otro, y chispas rojas de sus luces)
    if ((D.cen -= dt) <= 0) { D.cen = (D.manada ? 0.2 : 0.35) + this.rnd() * 0.3; const c = D.gente.filter(a => !a.oculto && Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z) < 70); const a = c[Math.floor(this.rnd() * c.length)]; if (a) this.sound.cencerroCerca?.(a.pos, 3, 0.85); }
    if ((D.chispa -= dt) <= 0) {
      // (en la manada, ascuas rojas que suben de sus cabezas sin parar, como en la fiesta de antes; se apagan al irse)
      const m = D.manada; D.chispa = m ? (QUALITY === 'low' ? 0.09 : 0.03) : 0.25;
      // (en la manada, de tres al azar, el más cercano a quien mira: así las ascuas se ven, no se pierden al fondo)
      let a = D.gente[Math.floor(this.rnd() * D.gente.length)];
      const cam = m && this.camera?.position;
      if (cam) for (let i = 0; i < 2; i++) { const b = D.gente[Math.floor(this.rnd() * D.gente.length)]; if (b && !b.oculto && b.obj.visible && (a.oculto || Math.hypot(b.pos.x - cam.x, b.pos.z - cam.z) < Math.hypot(a.pos.x - cam.x, a.pos.z - cam.z))) a = b; }
      if (a?.obj.visible && !a.oculto && (!m || D.k > 0.05)) this.particles.emit({ x: a.pos.x, y: a.pos.y + 2.3, z: a.pos.z }, m
        ? { n: QUALITY === 'low' ? 3 : 5, color: ['#ff4a1e', '#ff8a2a', '#ffd08a'], speed: 0.9, size: 0.46, life: 1.3, gravity: -0.75, spread: 0.35 }
        : { n: 4, color: ['#ffb45a', '#fff1c0'], speed: 0.8, size: 0.22, life: 0.9, gravity: -0.6 });
    }
    // (y el rumor de toda la comparsa, más fuerte cuanto más cerca, que se apaga en los últimos segundos)
    if ((D.rum = (D.rum || 0) - dt) <= 0) { D.rum = 0.5; let d = 1e9; for (const a of D.gente) if (!a.oculto) d = Math.min(d, Math.hypot(a.pos.x - P.pos.x, a.pos.z - P.pos.z)); this.sound.bucleCencerros?.(Math.max(0, 1 - d / 90) * Math.min(1, (D.dur - D.t) / 6)); }
    if (D.t > D.dur) this.finDesfile();
  }
  /** Se acaba el desfile (o se sale del pueblo): fuera la comparsa, el tinte rojo y los sonidos. */
  finDesfile() {
    const D = this.desfileOn; if (!D) return;
    for (const a of D.gente) { this.scene?.remove(a.obj); removeMover(a.collider); }
    D.velo?.remove();
    this.desfileOn = null; this.tinte = null; this.sound?.bucleCencerros?.(0); this.sound?.terror?.(0);
  }
}
