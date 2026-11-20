// Elegir tu montura: el caballo de Burguete, la pottoka o el burro (montura.js). Es la misma ventana que la de elegir
// perro (perro.js, choose): tarjetas con el círculo de su pelaje, su nombre y lo que tiene de bueno; abajo, «Llamar» y
// «¡Esta!». La elección se guarda en el perfil (montura) y vale para todos los pueblos y para Otsagabia: la montura
// nueva sale donde estaba la otra y viene trotando hacia ti. Se abre desde la mochila y desde la pausa.
// (20 de noviembre de 2026, el autor: «en todas las partidas puedas tener tu propio caballo o la selección, una
// selección de caballos, al igual que la de perros»)
import { MONTURAS, MONTURA_FICHA, tipoMontura, aLa } from './montura.js';
import { profile, saveProfile } from './profile.js';
import { iconSVG } from '../ui/icons.js';
import { esc } from '../util/html.js';

/** La montura que tiene ahora este jugador en esta partida (o la que tendría) */
export function monturaActual(g) { return g.monturaPropia?.()?.tipo || tipoMontura(profile(), g.def?.comarca); }

/** La ventana de elegir montura. Resuelve con la elegida, o null si se cierra sin cambiar */
export function eligeMontura(g) {
  return new Promise((res) => {
    const prev = g.mode; if (g.player) g.player.frozen = true; g.mode = 'mini';
    const actual = monturaActual(g), m = g.monturaPropia?.(), montado = !!m && g.player?.vehiculo === m;
    let pick = actual;
    const o = document.createElement('div'); o.className = 'mg-overlay dogpick monturapick';
    const card = (id) => { const F = MONTURA_FICHA[id]; return `<button data-m="${id}" class="${id === pick ? 'on' : ''}" aria-pressed="${id === pick}"><i style="--c:${F.c};--p:${F.p}"></i><b>${esc(F.titulo)}</b><small>${esc(F.texto)}</small></button>`; };
    const nombre = (id) => MONTURAS[id].nombre;
    o.innerHTML = `<div class="mg-card"><div class="mg-top">${iconSVG('horse', 48)}<div><h3>Elige tu montura</h3><small>Te espera en cada pueblo, junto a la entrada. Si queda lejos, llámala y vendrá</small></div></div>
      <div class="breeds">${Object.keys(MONTURAS).map(card).join('')}</div>
      <div class="dogpick-foot">${m && !montado ? `<button class="btn" data-llama>${iconSVG('horse', 20)}<span>Llamar ${esc(aLa(nombre(actual)))}</span></button>` : ''}<button class="btn primary" data-ok>¡Esta!</button></div></div>`;
    const done = (v) => { o.remove(); removeEventListener('keydown', key, true); if (g.player) g.player.frozen = false; g.mode = prev === 'mini' ? 'play' : prev; res(v); };
    const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); done(null); } };
    addEventListener('keydown', key, true);
    o.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.m) { pick = b.dataset.m; o.querySelectorAll('[data-m]').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); g.sound?.ui?.('click'); return; }
      if (b.hasAttribute('data-llama')) { done(null); g.llamaMontura?.(); return; }
      if (b.hasAttribute('data-ok')) {
        g.sound?.ui?.('click');
        if (pick !== actual || !profile().montura) { const P = profile(); P.montura = pick; saveProfile(); }
        done(pick);
        if (pick !== actual) g.cambiaMontura?.(pick);
        else if (m && !montado) g.llamaMontura?.();
      }
    });
    document.body.appendChild(o);
  });
}
