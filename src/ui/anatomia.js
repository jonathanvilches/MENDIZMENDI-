// Láminas técnicas (skill Anatomy): ilustraciones isométricas interactivas que enseñan por dentro cómo se hace o cómo
// funciona algo de Navarra (la almadía en el portillo, el queso, el rosado, el espárrago, el molino, el piquillo, el aceite, la miel, la cuajada, la txistorra, la ferrería, el salmón, la carbonera, la lana, la barrica, el pan, la alpargata, la cesta, las palomeras, el cantero, el aizkolari, la piedra, las setas...). Se dibujan con tools/anatomia/*.mjs, que las deja en
// public/anatomia/<id>.html, y aquí se abren encima del juego, casi a pantalla entera, con su título y «Seguir».
// El autor, 21 de noviembre de 2026: «explicaciones técnicas en 3D [...] todo esto quiero que poco a poco lo vayas
// aplicando y lo vayas metiendo en el juego y en las misiones».
import { esc, el } from '../util/html.js';
import { windowKeys } from '../util/keys.js';

export const LAMINAS_TEC = {
  almadia: { title: 'La almadía en el portillo', kicker: 'Cómo funciona' },
  queso: { title: 'Cómo se hace el queso', kicker: 'Cómo se hace' },
  vino: { title: 'Cómo se hace el rosado', kicker: 'Cómo se hace' },
  esparrago: { title: 'Cómo se recoge el espárrago', kicker: 'Cómo se hace' },
  molino: { title: 'Cómo funciona el molino', kicker: 'Cómo funciona' },
  piquillo: { title: 'Cómo se hace el piquillo', kicker: 'Cómo se hace' },
  aceite: { title: 'Cómo se hace el aceite', kicker: 'Cómo se hace' },
  miel: { title: 'Cómo se hace la miel', kicker: 'Cómo se hace' },
  cuajada: { title: 'Cómo se hace la cuajada', kicker: 'Cómo se hace' },
  txistorra: { title: 'Cómo se hace la txistorra', kicker: 'Cómo se hace' },
  ferreria: { title: 'Cómo trabajaba una ferrería', kicker: 'Oficio de antes' },
  salmon: { title: 'El viaje del salmón', kicker: 'Cómo vive' },
  carbonera: { title: 'La carbonera', kicker: 'Oficio de antes' },
  hilandera: { title: 'De la oveja al ovillo', kicker: 'Oficio de antes' },
  tonelero: { title: 'Cómo se hace una barrica', kicker: 'Oficio de antes' },
  pan: { title: 'Cómo se hace el pan', kicker: 'Oficio de antes' },
  alpargata: { title: 'Cómo se hace una alpargata', kicker: 'Oficio de antes' },
  cesta: { title: 'Cómo se hace una cesta', kicker: 'Oficio de antes' },
  palomeras: { title: 'Las palomeras de Etxalar', kicker: 'Oficio de antes' },
  cantero: { title: 'Del monte al puente: el cantero', kicker: 'Oficio de antes' },
  aizkolari: { title: 'Cómo se corta un tronco: el aizkolari', kicker: 'Oficio de antes' },
  harrijasotzaile: { title: 'Cómo se levanta una piedra', kicker: 'Oficio de antes' },
  setas: { title: 'Cómo vive una seta', kicker: 'Cómo vive' },
};
// los productos de las misiones (data/procesos.js) que tienen su lámina
export const LAMINA_DE = { idiazabal: 'queso', roncal: 'queso', wine: 'vino', mill: 'molino', olive: 'aceite', olivo: 'aceite', honey: 'miel', chistorra: 'txistorra', herrero: 'ferreria', carbonero: 'carbonera', hilandera: 'hilandera', tonelero: 'tonelero', panadero: 'pan', alpargatero: 'alpargata', cestero: 'cesta', palomero: 'palomeras' };   // (el espárrago y el piquillo, por su id: esparrago, piquillo; los oficios, por su kind: herrero, carbonero, hilandera, tonelero, panadero, alpargatero, cestero)
export const laminaDe = (id) => LAMINA_DE[id] || (LAMINAS_TEC[id] ? id : null);

const CSS = `.lt-ov{position:fixed;inset:0;z-index:960;display:grid;place-items:center;background:rgba(8,3,18,.92);
padding:max(10px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));
opacity:0;transition:opacity .25s ease}
.lt-ov.on{opacity:1}.lt-ov.out{opacity:0;pointer-events:none}
.lt-card{width:min(1100px,100%);height:100%;max-height:760px;display:flex;flex-direction:column;gap:6px;padding:0 0 10px;border-radius:12px;background:#160c2a;overflow:hidden}
.lt-card iframe{flex:1;min-height:0;width:100%;border:0;background:#160c2a}
.lt-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 12px 0 18px}
.lt-foot small{display:block;color:#ff7ac8;font:700 11px/1.2 var(--f-cond,sans-serif);letter-spacing:.14em;text-transform:uppercase}
.lt-foot b{display:block;color:#fff;font:400 clamp(18px,2.6vw,26px)/1.05 var(--f-display,sans-serif)}`;
let css = false;

/** Abre la lámina técnica id; se resuelve al cerrarla. Si no hay lámina con ese id, o en las pruebas, no hace nada */
export function laminaTecnica(ui, id, { button = 'Seguir' } = {}) {
  const L = LAMINAS_TEC[id];
  if (!L || window.__autoWin) return Promise.resolve();
  if (!css) { css = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  return new Promise((res) => {
    ui?.closeModal?.(); ui?.sound?.ui?.('card');
    const o = el(`<div class="lt-ov mg-overlay" role="dialog" aria-label="${esc(L.title)}"><div class="lt-card">
      <iframe src="./anatomia/${id}.html?juego" title="${esc(L.title)}" loading="eager"></iframe>
      <div class="lt-foot"><div><small>${esc(L.kicker)}</small><b>${esc(L.title)}</b></div><button class="btn primary">${esc(button)}</button></div>
    </div></div>`);
    document.body.appendChild(o); if (ui) ui.modal = o;
    requestAnimationFrame(() => o.classList.add('on'));
    const b = o.querySelector('button'); setTimeout(() => b.focus({ preventScroll: true }), 60);
    const k = windowKeys((e) => { e.stopImmediatePropagation(); if (['enter', 'escape', 'e'].includes(e.key.toLowerCase())) { e.preventDefault(); cierra(); } });
    const cierra = () => {
      ui?.sound?.ui?.('click'); removeEventListener('keydown', k, true); o.classList.add('out');
      setTimeout(() => o.remove(), 260); if (ui && ui.modal === o) ui.modal = null; res();
    };
    addEventListener('keydown', k, true); b.onclick = cierra;
  });
}
