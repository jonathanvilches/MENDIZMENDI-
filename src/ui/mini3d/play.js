// Marco común de los minijuegos en 3D: la escena ocupa toda la pantalla; arriba, un panel con el título, la
// explicación corta, el tiempo y el avance; abajo, el mensaje y los botones (o la barra de precisión). Una capa
// transparente recoge los toques para tocar cosas en la escena. Mientras se cargan los modelos se ve «Preparando…».
import { iconSVG } from '../icons.js';
import { Stage } from './stage.js';
import { releaseTextures } from './kit.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function hud(ui, { title, hint, icon, buttons = '', extra = '' }) {
  ui.closeModal?.();
  const o = document.createElement('div'); o.className = 'mg3d loading';
  o.innerHTML = `<div class="m3-cap"></div>
    <div class="m3-top">${iconSVG(icon, 40)}<div class="m3-txt"><h3>${esc(title)}</h3><small>${esc(hint)}</small></div>
      <b class="m3-clock"></b><div class="m3-prog"><i></i></div></div>
    <div class="m3-bot"><div class="fb">¡Cuando quieras!</div>${extra}<div class="m3-btns">${buttons}</div></div>
    <div class="m3-load"><span></span>Preparando…</div>`;
  document.body.appendChild(o); ui.modal = o; document.body.classList.add('mg3d-on');   // el HUD del pueblo se oculta (style.css)
  const $ = (s) => o.querySelector(s);
  let keyFn = null;
  return {
    o, cap: $('.m3-cap'), fb: $('.fb'), clock: $('.m3-clock'), top: $('.m3-top'), bot: $('.m3-bot'),
    prog(p) { $('.m3-prog i').style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; },
    time(s) { this.clock.textContent = Math.max(0, s).toFixed(1) + ' s'; },
    keys(fn) { keyFn = (e) => { if (o.classList.contains('loading')) return; e.stopImmediatePropagation(); fn(e); }; addEventListener('keydown', keyFn, true); },
    ready() { o.classList.remove('loading'); },
    remove() {
      if (keyFn) removeEventListener('keydown', keyFn, true); keyFn = null; o.classList.add('out'); if (ui.modal === o) ui.modal = null;
      setTimeout(() => { o.remove(); if (!document.querySelector('.mg3d')) document.body.classList.remove('mg3d-on'); }, 260);
    },
  };
}

/**
 * Juega un minijuego 3D. setup(S, H, end) monta la escena (puede esperar a los modelos) y registra su lógica con
 * S.every; end({ win }, mensaje) lo termina. Devuelve una promesa con el resultado.
 */
let live = null;   // el minijuego 3D en marcha: si empieza otro, el anterior se cierra del todo antes

export function play3d(ui, opts, setup) {
  if (window.__autoWin) return Promise.resolve({ win: true });
  live?.abort();
  return new Promise((res) => {
    const H = hud(ui, opts), S = new Stage(ui, opts.stage);
    let over = false, closed = false;
    // cerrar: quita el panel, libera la escena y las texturas, y devuelve el resultado (una sola vez)
    const close = (value) => { if (closed) return; closed = true; over = true; H.remove(); S.dispose(); releaseTextures(); if (live === me) live = null; res(value); };
    const me = { abort: () => close({ win: false }) }; live = me;
    const end = (value, msg, wait = 1400) => {
      if (over) return; over = true;
      if (msg) H.fb.textContent = msg; H.fb.classList.toggle('win', !!value.win);
      if (value.win) ui.sound?.fanfare?.();
      setTimeout(() => close(value), wait);
    };
    // si alguien quita la ventana (otra ventana encima, salir al mapa), se da por perdido y se libera todo
    S.every(() => { if (!closed && !H.o.isConnected) close({ win: false }); });
    // el escenario deja libre lo que ocupan los paneles
    const measure = () => { const t = H.top.getBoundingClientRect(), b = H.bot.getBoundingClientRect(); S.setPanels(t.bottom + 6, innerHeight - b.top + 6); };
    addEventListener('resize', measure);
    const origDispose = S.dispose.bind(S); S.dispose = () => { removeEventListener('resize', measure); origDispose(); };
    Promise.resolve().then(() => setup(S, H, end, () => over)).then(() => {
      if (over) return;
      H.ready(); S.start(); requestAnimationFrame(measure);
    }).catch((e) => { console.warn('minijuego 3D', e); close({ win: false, error: true }); });
  });
}

export const blip = (ui, f, d = 0.06, v = 0.08, type = 'triangle') => ui.sound?.tone?.(f, d, type, v, ui.sound.sfx);
