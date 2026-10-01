// Gorri, el perro que acompaña en las misiones (un euskal artzain txakurra, perro pastor vasco).
// Va detrás del jugador; si se queda lejos, aparece a su lado. Cuando el jugador parece perdido (lleva un rato
// sin acercarse al objetivo) o se lo pide (tecla H o botón de la mochila), corre por delante hacia el objetivo,
// ladra y deja huellas para enseñar el camino.
import * as THREE from 'three';
import { groundHeight } from '../world/heightfield.js';
import { infoCard } from '../ui/minigames.js';
import { saveProfile } from './profile.js';

export class Perro {
  constructor(game) {
    this.g = game; const P = game.player.pos;
    this.dog = game.fauna.add('dog', P.x + 1.5, P.z - 1.5, { range: 3, walk: 1.4, run: 8, radius: 0.3, flee: 0 });
    this.dog.follow = game.player;
    this.lead = null; this.best = null; this.stuck = 0; this.cool = 20; this.printT = 0;
    this.goal = { pos: new THREE.Vector3() };
  }
  get name() { return this.g.P.dogName || 'Gorri'; }
  async hello() {
    const P = this.g.P; if (P.seen?.dog) return;
    (P.seen ||= {}).dog = true; saveProfile();
    await infoCard(this.g.ui, { icon: 'dog', kicker: 'Tu compañero de aventuras', title: `${this.name} · euskal artzain txakurra`, text: `${this.name} es un perro pastor vasco: listo, fiel y con mucho olfato. Te acompañará en las misiones. Si te pierdes, se adelantará para enseñarte el camino. También puedes pedírselo con la tecla H o desde la mochila.`, button: '¡Vamos, ' + this.name + '!' });
  }
  // el jugador pide ayuda
  help() {
    const t = this.g.target();
    if (!t) { this.g.ui.toast(`${this.name} mueve la cola: ahora no hay nada que buscar`, 'dog', 2200); return; }
    this.chain = 3; this.startLead(t);
  }
  startLead(t) {
    const P = this.g.player.pos, dx = t.x - P.x, dz = t.z - P.z, d = Math.hypot(dx, dz);
    if (d < 8) { this.g.ui.toast(`${this.name} ladra: ¡está aquí mismo!`, 'dog', 2000); this.g.sound.bark?.(this.dog.pos); return; }
    const k = Math.min(1, 14 / d);
    this.goal.pos.set(P.x + dx * k, 0, P.z + dz * k); this.goal.t = t;
    this.dog.follow = this.goal; this.lead = 6; this.cool = 25;
    this.g.sound.bark?.(this.dog.pos);
    this.g.ui.toast(`${this.name} te enseña el camino: ¡síguelo!`, 'dog', 2600);
  }
  update(dt) {
    const g = this.g, P = g.player.pos, D = this.dog;
    // si se queda muy atrás (cuestas, agua…), aparece junto al jugador
    if (Math.hypot(D.pos.x - P.x, D.pos.z - P.z) > 28) { D.pos.set(P.x - 1.5, groundHeight(P.x - 1.5, P.z - 1.5), P.z - 1.5); D.sync?.(); }
    if (this.lead != null) {
      this.lead -= dt;
      // huellas mientras corre por delante
      if ((this.printT -= dt) <= 0 && D.speed > 1) { this.printT = 0.18; g.particles?.emit({ x: D.pos.x, y: D.pos.y + 0.05, z: D.pos.z }, { n: 2, color: ['#ffe38a', '#ffffff'], speed: 0.2, size: 0.18, life: 2.5 }); }
      const arrived = Math.hypot(D.pos.x - this.goal.pos.x, D.pos.z - this.goal.pos.z) < 2.5;
      if (arrived && !this.barked) { this.barked = true; g.sound.bark?.(D.pos); }
      // cuando el jugador llega cerca del perro, vuelve a su lado; si el objetivo sigue lejos, se adelanta otra vez
      if (Math.hypot(P.x - D.pos.x, P.z - D.pos.z) < 4 || this.lead < 0) {
        this.lead = null; this.barked = false; D.follow = g.player;
        const t = g.target(); if (t && Math.hypot(t.x - P.x, t.z - P.z) > 20 && this.chain-- > 0) this.startLead(t);
      }
      return;
    }
    // ¿perdido? lleva 30 s andando sin acercarse al objetivo
    this.cool -= dt;
    const t = g.mode === 'play' ? g.target() : null;
    if (!t) { this.best = null; this.stuck = 0; return; }
    const d = Math.hypot(t.x - P.x, t.z - P.z);
    if (this.best == null || d < this.best - 4 || this.tKey !== t.x + ',' + t.z) { this.best = d; this.stuck = 0; this.tKey = t.x + ',' + t.z; }
    else if (g.player.speed > 0.5 && d > 30) this.stuck += dt;
    if (this.stuck > 30 && this.cool < 0) { this.stuck = 0; this.chain = 2; this.startLead(t); }
  }
}
