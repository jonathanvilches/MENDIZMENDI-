// Gorri, el perro que acompaña en las misiones (un euskal artzain txakurra, perro pastor vasco).
// Va detrás del jugador; si se queda lejos, aparece a su lado. Cuando el jugador parece atascado (lleva un rato sin
// acercarse a lo que toca, andando o quieto, o se aleja mucho) le pregunta «¿Necesitas ayuda?»; si dice que sí, o si la
// pide él (tecla H o botón de la mochila), el perro corre por delante hacia lo que busca, o hacia el vecino al que
// preguntar, por las calles (el camino de los vecinos, world/nav.js), ladra y deja huellas para enseñar el camino. Sin
// perro, le dice hacia dónde ir.
import * as THREE from 'three';
import { groundHeight } from '../world/heightfield.js';
import { requestPath } from '../world/nav.js';
import { HALF } from '../world/layout.js';
import { infoCard } from '../ui/minigames.js';
import { saveProfile } from './profile.js';
import { DOG_BREEDS } from '../actors/beasts.js';
import { animalSpec } from '../actors/animalGlb.js';
import { iconSVG } from '../ui/icons.js';
import { esc } from '../util/html.js';

export class Perro {
  constructor(game) {
    this.g = game; const P = game.player.pos;
    // punto al lado del jugador (a su izquierda, un poco adelantado): el perro camina a la par
    this.side = { pos: new THREE.Vector3(), companion: true, speed: 0, face: 0 };
    if (this.on) this.spawnDog(P.x + 1.2, P.z);
    this.lead = null; this.best = null; this.atasco = 0; this.coolAyuda = 40; this.printT = 0;
    this.goal = { pos: new THREE.Vector3(), dist: 0.8 };   // (dist: hasta dónde se acerca a cada punto del camino)
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
  // se queda en casa (no aparece) hasta release(): en la pelota no hace falta
  away() {
    const D = this.dog; if (!D) return;
    this.waiting = true; D.follow = null; D.sit = false; D.pinVisible = false; D.hidden = true; D.obj.visible = false;
  }
  release() {
    const D = this.dog; this.waiting = false; if (!D) return;
    if (D.hidden) { const P = this.g.player?.pos; if (P) D.pos.set(P.x + 1.2, P.y, P.z + 1.2); }   // vuelve junto a ti
    D.hidden = false; D.sit = false; D.pinVisible = false; D.alwaysUpdate = false; D.follow = this.side; D.obj.visible = true;
  }
  get breed() { return DOG_BREEDS[this.g.P.dogBreed] ? this.g.P.dogBreed : 'gorbeia'; }   // por defecto, el pastor vasco (Gorbeia)
  spawnDog(x, z) {
    const F = this.g.fauna, B = DOG_BREEDS[this.breed];
    if (this.dog) { this.g.scene.remove(this.dog.obj); F.animals.splice(F.animals.indexOf(this.dog), 1); }
    // el modelo ya va a la altura real de la raza (el mastín, cerca de un metro); el radio, según su tamaño
    const h = animalSpec('dog', { breed: this.breed })?.h;
    this.dog = F.add('dog', x, z, { range: 3, walk: 1.4, run: 9, radius: h ? h * 0.36 : 0.3, flee: 0, breed: this.breed, scale: h ? 1 : B.scale, companion: true });
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
  // lo que toca ahora: lo de la misión seguida (o del trabajo de pastor o de jornalero) y, si es un vecino, quién; si la
  // misión no tiene un sitio adonde ir (una pista por descubrir, la noche del carnaval), su vecino, que dirá qué hacer
  objetivo() {
    const g = this.g, M = g.missions?.[g.tracked], t = g.jobTarget?.() || g.target?.();
    if (t) { const h = M && !M.done && M.host && Math.hypot(t.x - M.host.pos.x, t.z - M.host.pos.z) < 1.5 ? M.host : null;
      return { x: t.x, z: t.z, key: `${g.tracked}:${M?.step}`, quien: h?.name?.split(',')[0] || null }; }
    if (M && !M.done && M.host) return { x: M.host.pos.x, z: M.host.pos.z, key: `${g.tracked}:${M.step}:h`, quien: M.host.name?.split(',')[0] || null, pregunta: true };
    return null;
  }
  // hacia dónde queda, mirando como mira la cámara: delante, a la derecha, a la izquierda o detrás, y a cuántos metros
  rumbo(t) {
    const g = this.g, P = g.player.pos, f = g.camera?.getWorldDirection?.(new THREE.Vector3()) || new THREE.Vector3(0, 0, -1);
    const dx = t.x - P.x, dz = t.z - P.z, d = Math.hypot(dx, dz), a = Math.atan2(f.x * dz - f.z * dx, f.x * dx + f.z * dz);
    const lado = Math.abs(a) < 0.6 ? 'delante de ti' : Math.abs(a) > 2.4 ? 'detrás de ti' : a > 0 ? 'a tu derecha' : 'a tu izquierda';
    return `${lado}, a unos ${Math.max(5, Math.round(d / 5) * 5)} m`;
  }
  // «¿Necesitas ayuda?»: una tarjeta pequeña abajo, sin parar el juego; si no se contesta, se va sola a los 12 s
  ofrece() {
    const g = this.g; this.cierraOferta();
    const o = this.oferta = document.createElement('div'); o.className = 'dog-ayuda'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', '¿Necesitas ayuda?');
    o.innerHTML = `<span class="da-ic">${iconSVG('dog', 34)}</span><span class="da-tx"><b>¿Necesitas ayuda?</b><small>${this.dog ? `${esc(this.name)} te enseña el camino` : 'Te digo hacia dónde ir'}</small></span>
      <button type="button" class="btn primary small" data-si>Sí, ayúdame</button><button type="button" class="btn small" data-no>No, gracias</button>`;
    o.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; g.sound?.ui?.('click');
      if (b.hasAttribute('data-si')) this.help(); else { this.coolAyuda = 90; this.cierraOferta(); } });
    document.body.appendChild(o); if (this.dog) g.sound?.bark?.(this.dog.pos);
    this.ofertaT = setTimeout(() => { this.coolAyuda = 60; this.cierraOferta(); }, 12000);
  }
  cierraOferta() { clearTimeout(this.ofertaT); const o = this.oferta; if (!o) return; this.oferta = null; o.classList.add('fuera'); setTimeout(() => o.remove(), 300); }
  // el jugador pide ayuda (o dice que sí): el perro le lleva; sin perro, le dice hacia dónde ir
  help() {
    this.cierraOferta(); this.coolAyuda = 45; this.atasco = 0;
    const g = this.g, t = this.objetivo();
    if (!t) { g.ui.toast(this.dog ? `${this.name} mueve la cola: ahora no hay nada que buscar` : 'Ahora no hay nada que buscar', 'dog', 2200); return; }
    const que = t.quien ? (t.pregunta ? `${t.quien}, que te dirá qué hacer,` : t.quien) : 'Lo que buscas';
    if (!this.dog) { g.ui.toast(`${que} está ${this.rumbo(t)}`, 'compass', 4200); return; }
    this.chain = 40; this.startLead(t, t.quien ? `${this.name} te lleva con ${t.quien}${t.pregunta ? ': pregúntale qué hacer' : ''}. ¡Síguelo!` : null);
  }
  // Cada tramo, unos 16 m del camino por las calles hacia lo que busca (el de los vecinos: en línea recta se metía contra
  // las casas y se quedaba atascado a los pocos metros); el perro va de punto en punto, ladra al acabar el tramo y te espera.
  // Mientras llega el camino (unos fotogramas), da un paso hacia allí
  startLead(t, msg = null) {
    const P = this.g.player.pos, D = this.dog, dx = t.x - P.x, dz = t.z - P.z, d = Math.hypot(dx, dz);
    if (d < 8) { this.g.ui.toast(t.quien ? `${this.name} ladra: ¡${t.quien} está aquí mismo!` : `${this.name} ladra: ¡está aquí mismo!`, 'dog', 2200); this.g.sound.bark?.(D.pos); return; }
    const k = Math.min(1, 3 / d);
    this.goal.pos.set(P.x + dx * k, 0, P.z + dz * k); this.goal.t = t; this.ruta = undefined;   // (undefined: el camino aún no ha llegado)
    D.follow = this.goal; this.lead = 15; this.barked = false;   // (si no le sigues, a los 15 s vuelve a tu lado)
    this.g.sound.bark?.(D.pos);
    this.g.ui.toast(msg || `${this.name} te enseña el camino: ¡síguelo!`, 'dog', 3000);
    // (el camino, hasta lo que busca o, si queda lejos, hasta un punto en su dirección: a 140 m, a 70 o a 35, el primero al
    // que se llegue. Lo de fuera del pueblo queda fuera de la rejilla de caminos: hasta allí, por las calles)
    const lim = Math.min(HALF, 300) - 4, ux = dx / d, uz = dz / d;
    const pide = (k) => {
      const r = [Math.min(d, 140), 70, 35][k], f = Math.min(1, lim / Math.max(Math.abs(P.x + ux * r), Math.abs(P.z + uz * r), 1));
      this.cancelaRuta = requestPath(D.pos.x, D.pos.z, (P.x + ux * r) * f, (P.z + uz * r) * f, (path) => {
        if (this.lead == null || this.goal.t !== t) return;
        if (!path?.length && k < 2 && d > 35) return pide(k + 1);
        // (sin camino, en línea recta 14 m hacia allí, como antes)
        if (!path?.length) { const k2 = Math.min(1, 14 / d); this.goal.pos.set(P.x + dx * k2, 0, P.z + dz * k2); this.ruta = null; return; }
        const pts = []; let acc = 0, prev = { x: D.pos.x, z: D.pos.z };
        for (const q of path) { const l = Math.hypot(q.x - prev.x, q.z - prev.z); if (acc + l > 16) { const u = (16 - acc) / l; pts.push({ x: prev.x + (q.x - prev.x) * u, z: prev.z + (q.z - prev.z) * u }); break; } acc += l; pts.push(q); prev = q; }
        this.ruta = pts; this.goal.pos.set(pts[0].x, 0, pts[0].z);
      });
    };
    this.cancelaRuta?.(); pide(0);
  }
  // ¿atascado? Unos 35 s sin acercarse a lo que toca (andando; quieto cuenta algo menos) o alejándose mucho (el doble de
  // deprisa): «¿Necesitas ayuda?». Con una conversación o una ventana abiertas, o mientras el perro guía, no cuenta; y
  // también sin perro (entonces dice hacia dónde ir)
  vigila(dt) {
    const g = this.g, P = g.player.pos;
    this.coolAyuda -= dt;
    const t = g.mode === 'play' && !g.ui.busy && !g.player.frozen && this.lead == null && !this.waiting ? this.objetivo() : null;
    if (!t) { this.best = null; this.atasco = 0; if (this.oferta && g.mode !== 'play') this.cierraOferta(); return; }
    const d = Math.hypot(t.x - P.x, t.z - P.z);
    if (this.best == null || d < this.best - 4 || this.tKey !== t.key) { this.best = d; this.atasco = 0; this.tKey = t.key; }
    else if (d > 6) this.atasco += dt * (g.player.speed > 0.5 ? 1 : 0.7) * (d > this.best + 25 ? 2 : 1);
    if (this.atasco > 35 && this.coolAyuda < 0 && !this.oferta) { this.atasco = 0; this.ofrece(); }
  }
  update(dt) {
    const g = this.g, P = g.player.pos, D = this.dog;
    this.vigila(dt);
    if (!D || this.waiting) return;
    { const h = g.player.heading ?? 0, sp = g.player.speed || 0, lead = Math.min(1.2, sp * 0.18);
      const off = 0.82 + D.radius;   // a su lado, con sitio para su cuerpo (el mastín, un poco más lejos)
      this.side.pos.set(P.x + Math.cos(h) * off + Math.sin(h) * (0.2 + lead), 0, P.z - Math.sin(h) * off + Math.cos(h) * (0.2 + lead));
      this.side.speed = sp; this.side.face = h; }
    // al empezar (el jugador se coloca después de crear el perro) o si se queda muy atrás (cuestas, agua…), aparece
    // junto al jugador
    if (!this.placed) { this.placed = true; const S = this.side.pos; D.pos.set(S.x, groundHeight(S.x, S.z), S.z); D.heading = g.player.heading ?? 0; D.sync?.(); }
    if (Math.hypot(D.pos.x - P.x, D.pos.z - P.z) > 28) { D.pos.set(P.x - 1.5, groundHeight(P.x - 1.5, P.z - 1.5), P.z - 1.5); D.sync?.(); }
    if (this.lead != null) {
      this.lead -= dt;
      // huellas mientras corre por delante
      if ((this.printT -= dt) <= 0 && D.speed > 1) { this.printT = 0.18; g.particles?.emit({ x: D.pos.x, y: D.pos.y + 0.05, z: D.pos.z }, { n: 2, color: ['#ffe38a', '#ffffff'], speed: 0.2, size: 0.18, life: 2.5 }); }
      // (por el camino: al llegar a un punto, al siguiente; el tramo acaba en el último)
      const R = this.ruta; let dg = Math.hypot(D.pos.x - this.goal.pos.x, D.pos.z - this.goal.pos.z);
      if (R && R.length > 1 && dg < 1.5) { R.shift(); this.goal.pos.set(R[0].x, 0, R[0].z); dg = Math.hypot(D.pos.x - R[0].x, D.pos.z - R[0].z); }
      const arrived = R !== undefined && (!R || R.length <= 1) && dg < 2.5;
      if (arrived && !this.barked) { this.barked = true; g.sound.bark?.(D.pos); }
      // cuando el perro ya ha llegado (ha ladrado) y el jugador le alcanza, vuelve a su lado; si el objetivo sigue lejos,
      // se adelanta otra vez. Antes bastaba con que el jugador estuviera cerca del perro: al arrancar lo estaba siempre, y el
      // perro se daba la vuelta antes de salir («enséñame el camino» no hacía nada)
      if ((this.barked && Math.hypot(P.x - D.pos.x, P.z - D.pos.z) < 4) || this.lead < 0) {
        this.lead = null; this.barked = false; D.follow = this.side;
        // (sigue tramo a tramo hasta dejarte junto a lo que buscas; antes paraba a los cuatro tramos o a 20 m, sin llegar)
        const t = this.objetivo(), dd = t ? Math.hypot(t.x - P.x, t.z - P.z) : 0;
        if (t && dd > 8 && this.chain-- > 0) this.startLead(t);
        else if (t && dd <= 8 && this.chain < 40) { g.sound.bark?.(D.pos); g.ui.toast(t.quien ? `${this.name} ladra: ¡aquí está ${t.quien}!` : `${this.name} ladra: ¡es aquí!`, 'dog', 2600); this.chain = 0; }
      }
      return;
    }
  }
}
