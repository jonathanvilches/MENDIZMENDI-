// La leyenda del taller de un oficio: abajo y sin velo, para que se vea el puesto del que se habla (la cámara está en él).
// Una sola tarjeta que se queda entre paso y paso y cambia su texto con un fundido corto: el número del paso, el rótulo,
// el título, una o dos frases y el botón. Mientras dura un minijuego se esconde; al acabar el taller, se quita.
import { esc, el } from '../util/html.js';
import { windowKeys } from '../util/keys.js';
import './tallerPaso.css';
import { laminaTecnica, laminaPaso, LAMINA_PASOS } from './anatomia.js';

let P = null, voz = null;
// (la voz del maestro de la tarjeta, si la tiene: data/vozTalleres.js; se calla al pasar de tarjeta, al abrir la lámina o al quitarla)
const calla = () => { if (voz) { voz.pause(); voz = null; } };
function panel() {
  if (P && P.isConnected) return P;
  P = el(`<div class="tl-paso fuera" role="dialog" aria-live="polite"><div class="tl-card"><div class="tl-n"><b></b><small></small></div><button type="button" class="tl-lam" hidden><img alt=""><span><small>En la lámina</small><b></b></span></button><div class="tl-txt"><p class="tl-k"></p><h3 class="tl-t"></h3><p class="tl-p"></p></div><button class="btn primary tl-b"></button></div></div>`);
  document.body.appendChild(P);
  return P;
}
// muestra un paso y espera al botón (o a Intro, la E o el espacio). eu: el nombre en euskera, junto al título. lam: { id, i },
// la lámina técnica del oficio en el paso que se explica (ui/anatomia.js): su miniatura, con la pieza que trabaja
// iluminada, y al tocarla la lámina entera en ese paso, con todos sus pasos para recorrerla
export function pasoTaller(ui, { kicker = '', title = '', eu = '', text = '', button = 'Seguir', i = 0, n = 0, lam = null, audio = null }) {
  if (window.__autoWin) return Promise.resolve();
  calla();
  return new Promise(res => {
    const o = panel(), c = o.querySelector('.tl-card');
    const pon = () => {
      o.querySelector('.tl-n b').textContent = n ? String(i + 1) : '';
      o.querySelector('.tl-n small').textContent = n ? `/${n}` : '';
      o.querySelector('.tl-n').hidden = !n; c.classList.toggle('sin-n', !n);
      o.querySelector('.tl-k').textContent = kicker;
      o.querySelector('.tl-t').innerHTML = esc(title) + (eu ? ` <i>${esc(eu)}</i>` : '');
      const p = o.querySelector('.tl-p'); p.textContent = text; p.hidden = !text;
      o.querySelector('.tl-b').textContent = button;
      const lb = o.querySelector('.tl-lam'), mini = lam && laminaPaso(lam.id, lam.i);
      lb.hidden = !mini; c.classList.toggle('con-lam', !!mini);
      if (mini) { lb.querySelector('img').src = mini; lb.querySelector('b').textContent = `${lam.i + 1} · ${LAMINA_PASOS[lam.id][lam.i]}`;
        lb.onclick = () => { calla(); ui.sound?.ui?.('card'); o.classList.add('tapada'); laminaTecnica(ui, lam.id, { paso: lam.i, hechos: lam.hechos || [], kicker: kicker || 'Cómo funciona', button: 'Volver al taller' }).then(() => { o.classList.remove('tapada'); setTimeout(() => o.querySelector('.tl-b')?.focus({ preventScroll: true }), 60); }); }; }
    };
    const visible = !o.classList.contains('fuera');
    if (visible) { c.classList.add('cambia'); setTimeout(() => { pon(); c.classList.remove('cambia'); }, 140); }
    else { pon(); requestAnimationFrame(() => o.classList.remove('fuera')); }
    ui.sound?.ui?.('card');
    if (audio) { const a = voz = new Audio(audio); setTimeout(() => { if (voz === a) a.play().catch(() => {}); }, visible ? 320 : 480); }
    const b = o.querySelector('.tl-b'); setTimeout(() => b.focus({ preventScroll: true }), 60);
    let hecho = false;
    const fin = () => { if (hecho) return; hecho = true; calla(); removeEventListener('keydown', k, true); b.onclick = null; ui.sound?.ui?.('click'); res(); };
    // (con la lámina abierta encima, las teclas son suyas)
    const k = windowKeys((e) => { if (document.querySelector('.lt-ov:not(.out)')) return; if (['e', 'enter', ' '].includes(e.key.toLowerCase())) { e.preventDefault(); e.stopImmediatePropagation(); fin(); } });
    addEventListener('keydown', k, true);
    b.onclick = fin;
  });
}
// la esconde (para un minijuego, que va a pantalla entera) o la quita del todo
export function escondePaso() { calla(); P?.classList.add('fuera'); }
export function quitaPaso() { calla(); const o = P; P = null; if (!o) return; o.classList.add('fuera'); setTimeout(() => o.remove(), 260); }
