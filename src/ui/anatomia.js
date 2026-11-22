// Láminas técnicas (skill Anatomy): ilustraciones isométricas interactivas que enseñan por dentro cómo se hace o cómo
// funciona algo de Navarra (la almadía en el portillo, el queso, el rosado, el espárrago, el molino, el piquillo, el aceite, la miel, la cuajada, la txistorra, la ferrería, el salmón, la carbonera, la lana, la barrica, el pan, la alpargata, la cesta, las palomeras, el cantero, el aizkolari, la piedra, las setas, la Bajada del Ángel, la sidra...). Se dibujan con tools/anatomia/*.mjs, que las deja en
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
  angel: { title: 'La Bajada del Ángel', kicker: 'Cómo funciona' },
  sidra: { title: 'Cómo se hace la sidra', kicker: 'Cómo se hace' },
};
// los productos de las misiones (data/procesos.js) que tienen su lámina
export const LAMINA_DE = { idiazabal: 'queso', roncal: 'queso', wine: 'vino', mill: 'molino', olive: 'aceite', olivo: 'aceite', honey: 'miel', chistorra: 'txistorra', herrero: 'ferreria', carbonero: 'carbonera', hilandera: 'hilandera', tonelero: 'tonelero', panadero: 'pan', alpargatero: 'alpargata', cestero: 'cesta', palomero: 'palomeras', uva: 'vino', trigo: 'molino', manzana: 'sidra' };   // (el espárrago y el piquillo, por su id: esparrago, piquillo; los oficios, por su kind: herrero, carbonero, hilandera, tonelero, panadero, alpargatero, cestero)
export const laminaDe = (id) => LAMINA_DE[id] || (LAMINAS_TEC[id] ? id : null);
// los pasos de las láminas de los oficios con taller (los de tools/anatomia/<lámina>.mjs, PASOS): el taller enseña cada
// herramienta y cada paso en su lámina (game/talleres.js, TALLERES.<oficio>.lamina) y la tarjeta del paso lleva su
// miniatura (public/anatomia/pasos, tools/anatomia/pasos-miniaturas.mjs)
export const LAMINA_PASOS = {
  ferreria: ['El agua', 'Carbón y vena', 'Los barquines', 'La zamarra', 'El mazo', 'Las barras'],
  pan: ['Amasar', 'Reposar', 'Calentar', 'Limpiar', 'Meter', 'Cocer'],
  cantero: ['Arrancar', 'Desbastar', 'Labrar', 'Escuadrar', 'La marca', 'El arco'],
  tonelero: ['Secar', 'Levantar', 'Tostar', 'Cerrar', 'Tapas', 'Probar'],
  cesta: ['Cortar', 'Cocer', 'Rajar', 'Armar', 'Tejer', 'Rematar'],
};
/** La miniatura de la lámina id en el paso i (o null si esa lámina no tiene pasos con miniatura) */
export const laminaPaso = (id, i) => (LAMINA_PASOS[id] && i != null ? `./anatomia/pasos/${id}-${i}.webp` : null);

const CSS = `.lt-ov{position:fixed;inset:0;z-index:960;display:grid;place-items:center;background:rgba(8,3,18,.92);
padding:max(10px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));
opacity:0;transition:opacity .25s ease}
.lt-ov.on{opacity:1}.lt-ov.out{opacity:0;pointer-events:none}
.lt-card{width:min(1100px,100%);height:100%;max-height:760px;display:flex;flex-direction:column;gap:6px;padding:0 0 10px;border-radius:12px;background:#160c2a;overflow:hidden}
.lt-card iframe{flex:1;min-height:0;width:100%;border:0;background:#160c2a}
.lt-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 12px 0 18px}
.lt-foot small{display:block;color:#ff7ac8;font:700 11px/1.2 var(--f-cond,sans-serif);letter-spacing:.14em;text-transform:uppercase}
.lt-foot b{display:block;color:#fff;font:400 clamp(18px,2.6vw,26px)/1.05 var(--f-display,sans-serif)}
.lt-pasos{display:flex;gap:8px;padding:2px 12px 0;overflow-x:auto;scrollbar-width:none;flex:none}
.lt-pasos::-webkit-scrollbar{display:none}
.lt-pasos button{flex:1 1 0;min-width:96px;display:flex;align-items:center;gap:8px;padding:7px 10px 7px 7px;border:0;border-radius:8px;cursor:pointer;color:#e9e1ff;text-align:left;
  background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);font:800 13px/1.05 var(--f-cond,sans-serif);letter-spacing:.04em;text-transform:uppercase;
  transition:background var(--d-encima,.2s) var(--ease,ease),box-shadow var(--d-encima,.2s) var(--ease,ease),transform var(--d-toque,.09s) var(--ease,ease);animation:ltPaso var(--d-entra,.3s) var(--ease,ease) backwards;animation-delay:calc(160ms + var(--k) * var(--escalon,30ms))}
.lt-pasos button:active{transform:scale(.97)}
.lt-pasos i{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:400 15px/1 var(--f-display,sans-serif);font-style:normal;color:#fff;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1.5px rgba(255,122,200,.45)}
.lt-pasos .hecho i{background:linear-gradient(135deg,#7dffb0,#1fa864);box-shadow:none;font-size:0}
.lt-pasos .hecho i::after{content:'';width:9px;height:5px;margin-top:-3px;border:solid #fff;border-width:0 0 2.5px 2.5px;transform:rotate(-45deg)}
.lt-pasos .on{background:rgba(255,122,200,.16);box-shadow:inset 0 0 0 1.5px #ff7ac8,0 0 18px rgba(255,122,200,.28);color:#fff}
@keyframes ltPaso{from{opacity:0;transform:translateY(8px)}}
@media (max-height:460px){.lt-card{gap:4px;padding-bottom:6px}.lt-pasos button{padding:5px 8px 5px 5px;font-size:12px}.lt-pasos i{width:22px;height:22px;font-size:13px}}
/* (en el móvil tumbado, con fichas: fichas y botón en una sola fila, sin el título, para que la lámina sea más grande) */
@media (max-height:460px){.lt-card.con-pasos{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:minmax(0,1fr) auto;gap:6px 8px}
  .lt-card.con-pasos iframe{grid-column:1/-1;height:100%}.lt-card.con-pasos .lt-pasos{padding-right:0;align-self:center}
  .lt-card.con-pasos .lt-foot{padding:0 10px 0 0}.lt-card.con-pasos .lt-foot>div{display:none}.lt-card.con-pasos .lt-foot .btn{min-height:40px;padding:0 14px;font-size:16px}.lt-card.con-pasos .lt-pasos button{min-width:76px;gap:6px}}
@media (prefers-reduced-motion:reduce){.lt-pasos button{animation:none}}`;
let css = false;

/** Abre la lámina técnica id; se resuelve al cerrarla. Si no hay lámina con ese id, o en las pruebas, no hace nada.
 *  paso: la abre quieta en ese paso (si no, se recorre sola); hechos: los pasos que ya se han hecho en el taller (con su
 *  marca). Las láminas con pasos (LAMINA_PASOS) llevan debajo sus pasos, como fichas: tocar uno lleva la lámina a él, y
 *  la ficha encendida sigue a la lámina cuando se recorre sola o se mueve con el dedo (el puente de tools/anatomia/comun.mjs) */
export function laminaTecnica(ui, id, { button = 'Seguir', paso = null, hechos = [], kicker = '' } = {}) {
  const L = LAMINAS_TEC[id];
  if (!L || window.__autoWin) return Promise.resolve();
  if (!css) { css = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  return new Promise((res) => {
    ui?.closeModal?.(); ui?.sound?.ui?.('card');
    const PS = LAMINA_PASOS[id], hecho = new Set(hechos);
    const pasos = PS ? `<div class="lt-pasos" role="tablist" aria-label="Paso a paso">${PS.map((t, i) => `<button type="button" role="tab" data-i="${i}" style="--k:${i}" class="${hecho.has(i) ? 'hecho' : ''}${i === paso ? ' on' : ''}"><i>${i + 1}</i><span>${esc(t)}</span></button>`).join('')}</div>` : '';
    const o = el(`<div class="lt-ov mg-overlay" role="dialog" aria-label="${esc(L.title)}"><div class="lt-card${PS ? ' con-pasos' : ''}">
      <iframe src="./anatomia/${id}.html?juego${paso != null ? '&paso=' + paso : ''}" title="${esc(L.title)}" loading="eager"></iframe>
      ${pasos}<div class="lt-foot"><div><small>${esc(kicker || L.kicker)}</small><b>${esc(L.title)}</b></div><button class="btn primary">${esc(button)}</button></div>
    </div></div>`);
    // (la lámina y sus pasos, a la par: tocar un paso lleva la lámina a él; la lámina dice en qué paso está)
    const fr = o.querySelector('iframe'), botones = [...o.querySelectorAll('.lt-pasos button')];
    const enciende = (i) => botones.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-selected', k === i ? 'true' : 'false'); if (k === i) b.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); });
    botones.forEach((b, k) => { b.onclick = () => { fr.contentWindow?.postMessage({ anatomia: 'paso', i: k }, '*'); enciende(k); ui?.sound?.ui?.('click'); }; });
    const oye = (e) => { if (e.source !== fr.contentWindow || e.data?.anatomia !== 'en') return; enciende(e.data.i); };
    if (PS) addEventListener('message', oye);
    document.body.appendChild(o); if (ui) ui.modal = o;
    requestAnimationFrame(() => o.classList.add('on'));
    const b = o.querySelector('.lt-foot button'); setTimeout(() => b.focus({ preventScroll: true }), 60);
    const k = windowKeys((e) => { e.stopImmediatePropagation(); if (['enter', 'escape', 'e'].includes(e.key.toLowerCase())) { e.preventDefault(); cierra(); } });
    const cierra = () => {
      ui?.sound?.ui?.('click'); removeEventListener('keydown', k, true); removeEventListener('message', oye); o.classList.add('out');
      setTimeout(() => o.remove(), 260); if (ui && ui.modal === o) ui.modal = null; res();
    };
    addEventListener('keydown', k, true); b.onclick = cierra;
  });
}
