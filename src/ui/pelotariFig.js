// Los pelotaris del autor (src/assets/pelotaris): 22 chicos y chicas de cuerpo entero, cada uno de azul y de rojo, para
// las cartas, la pantalla VS, la colección y las portadas del menú de pelota. Cada nombre de la plantilla tiene su figura;
// otro nombre (el tuyo, si lo has cambiado, o el de un compañero) toma una del mismo género, siempre la misma.
// En la web van los de 512 de los dos colores; en el archivo único, el rojo de 256 y la camiseta azul suelta, que se pone
// encima del rojo (el resto del dibujo es igual): la figura azul sale de dos imágenes, una sobre otra.
// Las figuras miran a su izquierda (a la derecha de la pantalla): en la pantalla VS se gira solo la roja, una vez.
import { nameGender } from '../data/nombres.js';

const byId = (g) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
const ROJO = byId(import.meta.glob('@pelotaris/rojo/*.webp', { eager: true, query: '?url', import: 'default' }));
const AZUL = byId(import.meta.glob('@pelotaris/azul/*.webp', { eager: true, query: '?url', import: 'default' }));
const CAMISETA = byId(import.meta.glob('@pelotaris/camiseta/*.webp', { eager: true, query: '?url', import: 'default' }));

// la plantilla del autor: 11 chicos y 11 chicas (Mendi es el protagonista: no sale de rival)
const CHICOS = ['Mendi', 'Unai', 'Mikel', 'Aitor', 'Iñaki', 'Ander', 'Xabier', 'Jokin', 'Ekaitz', 'Julen', 'Asier'];
const CHICAS = ['Oihana', 'Garazi', 'Maialen', 'Amaia', 'Irati', 'Nahia', 'Nerea', 'Leire', 'Ane', 'Miren', 'Uxue'];
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const PLANTILLA = [...CHICOS.map(name => ({ id: fold(name), name, girl: false })), ...CHICAS.map(name => ({ id: fold(name), name, girl: true }))];
const BY = new Map(PLANTILLA.map(p => [p.id, p]));
const ALIAS = { oihane: 'oihana' };
/** Los nombres de los rivales (toda la plantilla menos Mendi) */
export const RIVALES = PLANTILLA.filter(p => p.id !== 'mendi').map(p => p.name);
/** ¿Es chica? (por la plantilla o por el nombre) */
export const pelotariGirl = (name) => BY.get(pelotariId(name))?.girl ?? false;

/** El pelotari de la plantilla para un nombre («Ane», «Iñaki, pelotari», «Unai · Ane» → el primero) */
export function pelotariId(name) {
  const n = fold(String(name || '').split(/[,·(]/)[0]).split(/\s+/)[0] || '';
  if (BY.has(n)) return n;
  if (ALIAS[n]) return ALIAS[n];
  const g = nameGender(n);
  if (!g) return 'mendi';
  const pool = PLANTILLA.filter(p => p.girl === (g === 'f') && p.id !== 'mendi');
  let h = 7; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length].id;
}
/** El pelotari de cada pueblo para su frontón (siempre el mismo; los de las misiones de pelota, el de la misión) */
export function townPelotari(townId, host = null) {
  if (host) return String(host).split(',')[0].trim();
  let h = 11; for (const c of String(townId)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return RIVALES[h % RIVALES.length];
}

/** La imagen (la de color entera; la roja, si el azul se monta encima) */
export const pelotariSrc = (name, side = 'rojo') => { const id = pelotariId(name); return (side === 'azul' && AZUL[id]) || ROJO[id]; };
/** HTML de la figura: una imagen o, en el archivo único y de azul, el rojo con la camiseta azul encima (class: la de las imágenes) */
export function pelotariImgs(name, side = 'rojo', cls = '') {
  const id = pelotariId(name), c = cls ? ` class="${cls}"` : '';
  if (side === 'azul' && !AZUL[id] && CAMISETA[id]) return `<img${c} src="${ROJO[id]}" alt="" draggable="false"><img class="${cls ? cls + ' ' : ''}pf-azul" src="${CAMISETA[id]}" alt="" draggable="false">`;
  return `<img${c} src="${pelotariSrc(name, side)}" alt="" draggable="false">`;
}
/** La figura en su caja (.pf): para ponerla donde va una sola imagen (pantalla VS, portadas del menú) */
export const pelotariFig = (name, side = 'rojo', cls = '') => `<span class="pf${cls ? ' ' + cls : ''}">${pelotariImgs(name, side)}</span>`;
