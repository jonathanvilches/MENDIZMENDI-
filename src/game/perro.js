// Gorri, el perro que acompaña en las misiones (un euskal artzain txakurra, perro pastor vasco).
// Va detrás del jugador; si se queda lejos, aparece a su lado. Cuando el jugador parece perdido (lleva un rato
// sin acercarse al objetivo) o se lo pide (tecla H o botón de la mochila), corre por delante hacia el objetivo,
// ladra y deja huellas para enseñar el camino.
import * as THREE from 'three';
import { groundHeight } from '../world/heightfield.js';
import { infoCard } from '../ui/minigames.js';
import { saveProfile } from './profile.js';
import { DOG_BREEDS } from '../actors/beasts.js';
import { iconSVG } from '../ui/icons.js';

export class Perro {
  constructor(game) {
    this.g = game; const P = game.player.pos;
    // punto al lado del jugador (a su izquierda, un poco adelantado): el perro camina a la par
    this.side = { pos: new THREE.Vector3(), companion: true, speed: 0, face: 0 };
    if (this.on) this.spawnDog(P.x + 1.2, P.z);
    this.lead = null; this.best = null; this.stuck = 0; this.cool = 20; this.printT = 0;
    this.goal = { pos: new THREE.Vector3() };
  }
  // ¿vamos con perro? (se puede elegir ir solo)
  get on() { return this.g.P.dogOn !== false; }
  setOn(v) {
    const g = this.g, P = g.player.pos; g.P.dogOn = !!v; saveProfile();
    if (v && !this.dog) { this.spawnDog(P.x + 1.2, P.z); g.sound?.bark?.(this.dog.pos); g.ui.toast(`${this.name} viene contigo`, 'dog', 2000); }
    if (!v && this.dog) { const F = g.fauna; g.scene.remove(this.dog.obj); F.animals.splice(F.animals.indexOf(this.dog), 1); this.dog = null; this.lead = null; g.ui.toast(`${this.name} se queda en casa. Puedes llamarlo desde la mochila.`, 'dog', 2600); }
  }
  // se sienta a esperar en un sitio (junto a la cancha o el campo) mirando el juego, y luego vuelve contigo
  wait(pos, look) {
    const D = this.dog; if (!D) return;
    this.waiting = true; D.follow = null; D.sit = true; D.pinVisible = true; D.alwaysUpdate = true; D.hidden = false;
    D.pos.set(pos.x, 0, pos.z); if (look) D.heading = Math.atan2(look.x - pos.x, look.z - pos.z); D.sync?.();
  }
  release() {
    const D = this.dog; this.waiting = false; if (!D) return;
    D.sit = false; D.pinVisible = false; D.alwaysUpdate = false; D.follow = this.side; D.obj.visible = true;
  }
  get breed() { return DOG_BREEDS[this.g.P.dogBreed] ? this.g.P.dogBreed : 'gorbeia'; }
  spawnDog(x, z) {
    const F = this.g.fauna, B = DOG_BREEDS[this.breed];
    if (this.dog) { this.g.scene.remove(this.dog.obj); F.animals.splice(F.animals.indexOf(this.dog), 1); }
    this.dog = F.add('dog', x, z, { range: 3, walk: 1.4, run: 9, radius: 0.3, flee: 0, breed: this.breed, scale: B.scale });
    this.dog.follow = this.side;
  }
  // elegir raza: tarjetas con el dibujo de color de cada perro y su historia
  choose() {
    const g = this.g; return new Promise(res => {
      const prev = g.mode; g.player.frozen = true; g.mode = 'mini';
      const o = document.createElement('div'); o.className = 'mg-overlay dogpick';
      const card = (id, B) => `<button data-b="${id}" class="${id === this.breed ? 'on' : ''}"><i style="--c:${B.c};--p:${B.patch || B.light}"></i><b>${B.dogName} · ${B.name}</b><small>${B.text}</small></button>`;
      o.innerHTML = `<div class="mg-card"><div class="mg-top">${iconSVG('dog', 48)}<div><h3>Elige a tu perro</h3><small>Te acompañará a tu lado en todas las misiones</small></div></div><div class="breeds">${Object.entries(DOG_BREEDS).map(([id, B]) => card(id, B)).join('')}</div><div class="dogpick-foot"><button class="btn" data-none>Ir sin perro</button><button class="btn primary" data-ok>¡Este!</button></div></div>`;
      let pick = this.breed;
      o.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.b) { pick = b.dataset.b; o.querySelectorAll('[data-b]').forEach(x => x.classList.toggle('on', x === b)); g.sound?.ui?.('click'); } const done = () => { o.remove(); g.player.frozen = false; g.mode = prev === 'mini' ? 'play' : prev; res(); };
        if (b.hasAttribute('data-none')) { this.setOn(false); done(); }
        if (b.hasAttribute('data-ok')) { if (pick !== this.breed || !this.dog) { g.P.dogBreed = pick; saveProfile(); g.P.dogOn = true; const D = this.dog?.pos || g.player.pos; this.spawnDog(D.x + (this.dog ? 0 : 1.2), D.z); } g.sound?.bark?.(this.dog.pos); done(); } });
      document.body.appendChild(o);
    });
  }
  get name() { return this.g.P.dogName || DOG_BREEDS[this.breed].dogName || 'Gorri'; }
  async hello() {
    const P = this.g.P; if (P.seen?.dog) return;
    (P.seen ||= {}).dog = true; saveProfile();
    await infoCard(this.g.ui, { icon: 'dog', kicker: 'Tu compañero de aventuras', title: 'Tu compañero de cuatro patas', text: `Tu perro te espera. Puedes elegir entre varias razas de Navarra y del Pirineo. Irá siempre a tu lado en las misiones. Si te pierdes, se adelantará para enseñarte el camino. También puedes pedírselo con la tecla H o desde la mochila. Si prefieres ir solo, elige «Ir sin perro»: podrás llamarlo cuando quieras desde la mochila.`, button: 'Elegir mi perro' });
    await this.choose();
  }
  // el jugador pide ayuda
  help() {
    if (!this.dog) { this.g.ui.toast('Vas sin perro. Puedes llamarlo desde la mochila.', 'dog', 2400); return; }
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
    if (!D || this.waiting) return;
    { const h = g.player.heading ?? 0, sp = g.player.speed || 0, lead = Math.min(1.2, sp * 0.18);
      this.side.pos.set(P.x + Math.cos(h) * 1.15 + Math.sin(h) * (0.2 + lead), 0, P.z - Math.sin(h) * 1.15 + Math.cos(h) * (0.2 + lead));
      this.side.speed = sp; this.side.face = h; }
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
        this.lead = null; this.barked = false; D.follow = this.side;
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
