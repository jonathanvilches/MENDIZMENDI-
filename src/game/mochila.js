// La mochila del explorador: equipo que se va consiguiendo, agua de la cantimplora, comida y energía.
// La energía baja al andar, más al correr y mucho más al subir cuesta arriba (con la makila, menos).
// Bebiendo y comiendo se recupera; sin energía se corre más despacio (nunca se queda sin correr).
import { profile, saveProfile } from './profile.js';
import { GEAR, GEAR_ORDER, FOOD } from '../data/equipo.js';
import { iconSVG } from '../ui/icons.js';
import { infoCard } from '../ui/minigames.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Mochila {
  constructor(game) {
    this.g = game; const P = this.P = profile();
    P.gear ||= ['mochila'];
    P.bag ||= { agua: 0, food: { pan: 2 } };
    if (P.energy == null) P.energy = 100;
    P.energy = Math.max(P.energy, 35);   // al llegar a otro pueblo has descansado del viaje
    this.lastY = null; this.warned = 0; this.tired = false;
    this.button();
  }
  has(id) { return this.P.gear.includes(id); }
  get energy() { return this.P.energy; }

  // ---------- botón con anillo de energía (junto al cuaderno) ----------
  button() {
    const book = document.getElementById('bBook'); if (!book || document.getElementById('bBag')) { this.btn = document.getElementById('bBag'); this.paint(); return; }
    const b = document.createElement('button'); b.className = 'round bag'; b.id = 'bBag'; b.setAttribute('aria-label', 'Mochila (B)');
    b.innerHTML = `${iconSVG('backpack', 26)}<i class="ering"></i>`;
    book.parentElement.insertBefore(b, book);
    b.onclick = (e) => { e.stopPropagation(); this.open(); };
    this.btn = b; this.paint();
  }
  paint() {
    if (!this.btn) return;
    const e = Math.max(0, Math.min(100, this.P.energy));
    this.btn.style.setProperty('--e', e.toFixed(0));
    this.btn.classList.toggle('low', e < 25);
  }

  // ---------- energía ----------
  update(dt, player) {
    const P = this.P, sp = player.speed || 0, y = player.pos.y;
    let use = 0.03;                                       // en reposo casi nada
    if (sp > 0.3) use += sp > 4.6 ? 0.16 : 0.05;           // andar / correr
    if (this.lastY != null && sp > 0.3) { const dy = y - this.lastY; if (dy > 0) use += dy / dt * (this.has('baston') ? 0.22 : 0.4); }
    this.lastY = y;
    P.energy = Math.max(0, P.energy - use * dt);
    // cansado: sin carrera hasta que comas o bebas
    const tired = P.energy <= 0.5;
    if (tired !== this.tired) {
      this.tired = tired;
      player.tired = tired; document.getElementById('cRun')?.classList.toggle('tired', tired);
      if (tired) this.g.ui.toast('¡Sin energía! Corres más despacio. Abre la mochila: bebe agua o come algo', 'energy', 4200);
    }
    if (P.energy < 25 && this.warned < 1) { this.warned = 1; const empty = !Object.values(P.bag.food || {}).some(n => n > 0); const broke = (P.coins ?? 12) < 2 && !Object.values(P.bag?.goods || {}).some(n => n > 0); this.g.ui.toast(empty && broke && this.g.jornales ? `Tienes hambre y no te queda dinero. ${this.g.jornales.suggest()}` : empty && this.g.tienda ? `Tienes hambre y la mochila está vacía. ${this.g.tienda.hint()}` : 'Te estás cansando: en la mochila llevas agua y comida', empty ? 'basket' : 'backpack', empty ? 6000 : 3600); }
    if (P.energy > 40) this.warned = 0;
    this.t = (this.t || 0) + dt; if (this.t > 0.5) { this.t = 0; this.paint(); }
    if ((this.save = (this.save || 0) + dt) > 10) { this.save = 0; saveProfile(); }
  }
  gain(n) { this.P.energy = Math.min(100, this.P.energy + n); this.paint(); saveProfile(); }

  // ---------- agua y comida ----------
  async fountain() {
    const first = !this.has('cantimplora');
    this.gain(15);
    if (first) await this.give('cantimplora');
    this.P.bag.agua = 3; saveProfile();
    this.g.ui.toast(first ? 'Has bebido y llenado la cantimplora (3 tragos)' : 'Agua fresca: cantimplora llena (3 tragos)', 'canteen', 2600);
  }
  drink() { if (!this.P.bag.agua) return false; this.P.bag.agua--; this.gain(22); this.g.sound?.splash?.(this.g.player.pos, 0.3); return true; }
  eat(id) { const f = this.P.bag.food; if (!f[id]) return false; f[id]--; if (!f[id]) delete f[id]; this.gain(FOOD[id]?.e || 15); this.g.player.rig.doAct?.('pick', 0.5); return true; }
  addFood(id, n = 1) { if (!FOOD[id]) return; const f = this.P.bag.food; f[id] = (f[id] || 0) + n; saveProfile(); this.g.ui.toast(`A la mochila: ${FOOD[id].name.toLowerCase()}`, FOOD[id].icon, 2200); }

  // ---------- equipo nuevo ----------
  async give(id) {
    if (this.has(id) || !GEAR[id]) return;
    this.P.gear.push(id); saveProfile();
    this.g.gearProps?.set(this.P.gear);
    if (id === 'prismaticos') { this.g.binoOn = true; this.g.ui.showBinoButton(); }
    const G = GEAR[id];
    this.g.sound?.magic?.();
    await infoCard(this.g.ui, { icon: G.icon, kicker: '¡Nuevo equipo de explorador!', title: G.name, text: G.use, badge: 'A la mochila', button: '¡Genial!' });
  }

  // ---------- panel de la mochila ----------
  open() {
    const g = this.g; if (g.mode !== 'play' || g.ui.busy) return;
    g.player.frozen = true; g.mode = 'mini';
    const P = this.P, root = document.createElement('div'); root.className = 'mg-overlay bagpanel';
    const draw = () => {
      const food = Object.entries(P.bag.food).filter(([k, n]) => n > 0 && FOOD[k]);
      const D = g.perro, on = !!D?.dog;
      // (la cabecera en una fila: el icono, el título, la energía, las monedas y «Cerrar», como «Salir» en la tienda; debajo,
      // tres columnas iguales: el perro, el agua y la comida, y el equipo, cada una con su rótulo y su caja. Sin franja abajo
      // para el botón: en el móvil tumbado, con la mochila vacía, había que desplazar)
      const dogBox = D ? `<div class="bp-box">
          <div class="seg" role="group" aria-label="Ir con perro o sin perro"><button data-a="dogon" class="${on ? 'on' : ''}" aria-pressed="${on}">${iconSVG('dog', 22)}<span>Con ${esc(D.name)}</span></button><button data-a="dogoff" class="${on ? '' : 'on'}" aria-pressed="${!on}"><span>Sin perro</span></button></div>
          <div class="bp-actions">${on ? `<button class="btn" data-a="dog">${iconSVG('compass', 22)}<span>Enséñame el camino</span></button>` : ''}<button class="btn" data-a="breed">${iconSVG('dog', 22)}<span>${on ? 'Cambiar de perro' : 'Elegir perro'}</span></button></div>
        </div>` : `<div class="bp-box"><p class="bp-note">Aquí vas sin perro.</p></div>`;
      const water = this.has('cantimplora') ? `<div class="bp-box bp-water"><div class="drops">${[0, 1, 2].map(i => `<span class="${i < P.bag.agua ? 'on' : ''}">${iconSVG('water', 24)}</span>`).join('')}</div><button class="btn" data-a="drink" ${P.bag.agua ? '' : 'disabled'}>${iconSVG('canteen', 22)}<span>Beber</span></button></div>`
        : `<div class="bp-box bp-water"><p class="bp-note" data-vm="no">Bebe en la fuente de una plaza: te darán una cantimplora.</p></div>`;
      const foods = food.length ? `<div class="bp-food">${food.map(([k, n]) => `<button class="fooditem" data-f="${k}" title="${esc(FOOD[k].fact)}">${iconSVG(FOOD[k].icon, 34)}<b>${esc(FOOD[k].name)}</b><span>×${n} · +${FOOD[k].e}</span></button>`).join('')}</div>`
        : '<p class="bp-note" data-vm="no">Vacía. Busca moras, avellanas y manzanas por el campo, o gana comida en las misiones de productos.</p>';
      root.innerHTML = `<div class="mg-card bp-card">
        <div class="bp-scroll">
        <header class="bp-head">${iconSVG('backpack', 44)}<h3>Tu mochila</h3><div class="ebar" role="img" aria-label="Energía ${P.energy.toFixed(0)} %"><i style="width:${P.energy.toFixed(0)}%"></i></div><small>Energía ${P.energy.toFixed(0)} % · ${iconSVG('medal', 14)} ${P.coins ?? 12} txanpon</small><button class="shop-exit bp-close" data-a="close" aria-label="Cerrar la mochila">${iconSVG('close', 18)}<span>Cerrar</span></button></header>
        ${P.energy < 25 ? '<p class="bp-warn">¡Come o bebe algo!</p>' : ''}
        <div class="bp-cols">
          <section class="bp-sec bp-dog"><h4>Perro</h4>${dogBox}</section>
          <section class="bp-sec bp-eat"><h4>Agua</h4>${water}<h4>Comida</h4><div class="bp-box bp-foodbox">${foods}</div></section>
          <section class="bp-sec bp-equip"><h4>Equipo</h4><div class="bp-box"><div class="bp-gear">${GEAR_ORDER.map(id => { const G = GEAR[id], h = this.has(id); return `<button class="gitem ${h ? '' : 'locked'}" data-g="${id}" title="${esc(h ? G.use : G.how)}" aria-label="${esc(h ? G.name : 'Por descubrir')}">${iconSVG(h ? G.icon : 'lock', 30)}<b>${esc(h ? G.name : 'Por descubrir')}</b></button>`; }).join('')}</div></div></section>
        </div>
        </div></div>`;
    };
    draw();
    const close = () => { root.remove(); g.player.frozen = false; g.mode = 'play'; removeEventListener('keydown', key, true); };
    const key = (e) => { if (!document.body.contains(root)) { removeEventListener('keydown', key, true); return; } if (['escape', 'b', 'e'].includes(e.key.toLowerCase())) { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
    addEventListener('keydown', key, true);
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'close') return close();
      if (b.dataset.a === 'dog') { close(); return g.perro.help(); }
      if (b.dataset.a === 'breed') { close(); return g.perro.choose(); }
      if (b.dataset.a === 'dogoff') { if (g.perro.dog) { g.perro.setOn(false); draw(); } return; }
      if (b.dataset.a === 'dogon') { if (!g.perro.dog) { g.perro.setOn(true); draw(); } return; }
      if (b.dataset.a === 'drink') { this.drink(); g.ui.toast('¡Glu, glu! +22 de energía', 'water', 1600); }
      // (en el móvil tumbado el equipo va sin su explicación, para que quepa todo: al tocarlo, sale en un aviso)
      if (b.dataset.g) { const G = GEAR[b.dataset.g], h = this.has(b.dataset.g); g.ui.toast(h ? `${G.name}: ${G.use}` : G.how, h ? G.icon : 'lock', 3600); return; }
      if (b.dataset.f) { const F = FOOD[b.dataset.f]; if (this.eat(b.dataset.f)) g.ui.toast(`¡Ñam! ${F.name}: +${F.e}. ${F.fact}`, F.icon, 4200); }
      draw();
    });
    (g.ui.hud?.parentElement || document.body).appendChild(root);
    g.sound?.ui?.('open');
  }
}
