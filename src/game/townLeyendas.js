// El pueblo (game/townGame.js), sus leyendas y su carnaval: las misiones de noche con las pistas, la criatura y la
// persecución, y las figuras del carnaval que hay que encontrar. Son métodos de TownGame: townGame.js los une a su clase
// (util/mezcla.js), con su this.

import { Actor } from '../actors/people.js';
import { Chase } from './chase.js';
import { MYTHS } from '../actors/outfits.js';
import { PLACES, PONDS } from '../world/layout.js';
import * as THREE from 'three';
import { TOWN } from '../world/townBuilder.js';
import { clamp } from '../util/math.js';
import { makeAura, makeClue } from './legendFx.js';
import { terrainHeight } from '../world/heightfield.js';
import { COSTUMES } from '../actors/minifig.js';
import { addCard, saveProfile } from './profile.js';
// Aspecto de los personajes de carnaval y leyenda
const FOLK = {
  joaldun: { traje: 'joaldun', shirt: '#f4f1ea', fur: '#ece4d2', hat: 'cone', hatColor: '#f4f1ea', skirt: '#f4f1ea', pants: '#1d2a4a', bells: true, scarf: '#3a8fd6', handkerchief: '#e8e0cc', face: 'brave' },
  mozorro: { shirt: '#6b8a3a', pattern: 'check', pattern2: '#e03c3c', pants: '#3a2a1a', hat: 'mask', hatColor: '#6b4a2e', maskColor: '#f1e7d6', stick: '#8a5a32' },
  momotxorro: { ...COSTUMES.momotxorro, traje: 'momotxorro', height: 1.8 },   // (un mozo alto: la cesta y los cuernos ya lo agrandan)
  'miel-otxin': { traje: 'miel-otxin', shirt: '#e03c3c', ribbons: true, pants: '#f2c230', hat: 'cone', hatColor: '#3a8fd6', height: 2.1, build: 1.2, face: 'angry' },
  zarratrako: { shirt: '#8a6a4a', pattern: 'stripes', pattern2: '#3ca05a', pants: '#6b4a2e', fur: '#b08650', hat: 'mask', hatColor: '#3a2a1a', bell: true, stick: '#6b4a2e' },
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
    const fog = this.scene.fog;
    if (fog && fog.isFog) { this.fogFar0 ??= fog.far; const want = active && night ? Math.min(this.fogFar0, 140) : this.fogFar0; fog.far += (want - fog.far) * Math.min(1, dt * 0.8); }
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
}
