// El capítulo «Frontones de Navarra» del menú (y del material didáctico): una galería como la de Tradiciones, con
// pestañas. «Con historia», los frontones de los que hay noticias (el Labrit, el Euskal Jai, el Atarrabia, el trinquete de
// Sangüesa del siglo XVI…); «La Montaña», «Zona Media y Tierra Estella» y «La Ribera», frontones de los pueblos con su foto
// de verdad (Wikimedia Commons, con su autor y su licencia en la ficha); «Tipos de cancha», la plaza libre, la pared
// izquierda, el trinquete y las medidas; y «Todos», los 653 frontones de Navarra contados pueblo a pueblo, con un buscador.
// Los datos, en data/frontones.js; las fotos, en assets/frontones (también las usa la elección de frontón del torneo).
import COMARCAS from '../data/comarcas.json';
import { DESTACADOS, TIPOS, MEDIDAS, TODOS, CUENTA } from '../data/frontones.js';
import { LEVELS, levelById } from '../data/levels.js';
import { galeria } from './ddgal.js';
import { iconSVG } from '../ui/icons.js';
import { esc } from '../util/html.js';
import { lettersOnly } from '../util/text.js';

const I = (n, s = 24) => iconSVG(n, s);
import { fotoFronton } from '../ui/frontonFotos.js';
const colorDe = (c) => COMARCAS.find(x => x.id === c)?.color;
const nombreComarca = (c) => { const x = COMARCAS.find(y => y.id === c); return x ? x.full || x.name : ''; };
const num = (n) => n.toLocaleString('es-ES');

// (el crédito de la foto, debajo del texto: autor, licencia y enlace a su página de Wikimedia Commons)
const credito = (f) => {
  if (!f.cred || !fotoFronton(f.foto)) return '';
  const [autor, lic, fichero] = f.cred;
  const url = fichero ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fichero.replace(/ /g, '_'))}` : '';
  return `<p class="ar-src ftn-cred">Foto: ${esc(autor || 'sin nombre de autor')} · ${esc(lic)} · ${url ? `<a href="${url}" target="_blank" rel="noopener">Wikimedia Commons</a>` : 'Wikimedia Commons'}</p>`;
};
const datos = (f) => {
  const d = [['Tipo', TIPOS[f.tipo].nombre + (f.cubierto ? ', cubierto' : '')], ['Año', f.anio], ['Aforo', f.aforo], ['Comarca', nombreComarca(f.comarca)]].filter(([, v]) => v);
  return `<ul class="ftn-datos">${d.map(([k, v]) => `<li><small>${k}</small><b>${esc(String(v))}</b></li>`).join('')}</ul>`;
};
const tarjeta = (f) => ({ k: f.id, img: fotoFronton(f.foto), icon: TIPOS[f.tipo].icon, c: colorDe(f.comarca), kicker: f.lugar, title: f.nombre,
  sub: f.sub || (f.anio ? `${f.anio} · ${TIPOS[f.tipo].nombre}` : TIPOS[f.tipo].nombre),
  secs: [['El frontón', `<p>${esc(f.texto)}</p>${datos(f)}${credito(f)}`]], towns: f.town && levelById(f.town) ? [f.town] : [] });

// la lista de todos: un bloque por comarca y, en cada uno, sus pueblos con cuántos frontones tienen de cada tipo; el
// pueblo que está en el juego lleva su enlace. El buscador esconde los que no coinciden (y las comarcas que se quedan vacías)
const PILL = [['plaza', 'pl', 'Plaza libre'], ['izquierda', 'iz', 'Pared izquierda'], ['trinquete', 'tr', 'Trinquete']];
// (cada nombre del pueblo, en las dos lenguas, con su pueblo del juego)
const POR_NOMBRE = new Map(LEVELS.flatMap(l => l.name.split(' / ').map(n => [lettersOnly(n), l.id])));
const enJuego = (nombre) => nombre.split(' / ').map(n => POR_NOMBRE.get(lettersOnly(n))).find(Boolean);
function todosHTML() {
  const filas = (c) => TODOS.filter(r => r[1] === c.id);
  return `<div class="ftn-cat">
    <label class="ftn-busca">${I('binoculars', 26)}<input type="search" placeholder="Busca tu pueblo" aria-label="Busca tu pueblo" autocomplete="off" enterkeyhint="search"></label>
    <p class="ftn-ley">${PILL.map(([, cls, n]) => `<span><i class="ftn-n ${cls}"></i>${n}</span>`).join('')}</p>
    <p class="ftn-nada" hidden>No hay ningún pueblo con ese nombre en la lista.</p>
    ${COMARCAS.map(c => { const R = filas(c); if (!R.length) return ''; const n = R.reduce((s, r) => s + r[2] + r[3] + r[4], 0);
      return `<section class="ftn-com" style="--c:${c.color}"><h3>${esc(c.full || c.name)}<small>${num(n)} ${n === 1 ? 'frontón' : 'frontones'}</small></h3>
        <ul>${R.map(r => { const id = enJuego(r[0]);
          return `<li data-q="${esc(lettersOnly(r[0]))}"><span class="ftn-pueblo">${id ? `<button type="button" class="lnk" data-town="${id}">${I('pin', 18)}${esc(r[0])}</button>` : esc(r[0])}</span>
            <span class="ftn-ns">${PILL.map(([, cls, t], i) => r[2 + i] ? `<i class="ftn-n ${cls}" title="${t}">${r[2 + i]}</i>` : '').join('')}</span></li>`; }).join('')}</ul></section>`; }).join('')}
    <p class="ar-src">Fuente: directorio de frontones frontons.net (noviembre de 2026), ${num(CUENTA.total)} frontones en Navarra; cada uno, en el pueblo más cercano. El Instituto Navarro de Deporte cuenta 656.</p></div>`;
}
function buscador(root) {
  const inp = root.querySelector('.ftn-busca input'); if (!inp) return;
  const filas = [...root.querySelectorAll('.ftn-com li')], coms = [...root.querySelectorAll('.ftn-com')], nada = root.querySelector('.ftn-nada');
  inp.oninput = () => {
    const q = lettersOnly(inp.value);
    for (const li of filas) li.hidden = !!q && !li.dataset.q.includes(q);
    let alguno = false;
    for (const s of coms) { const v = [...s.querySelectorAll('li')].some(li => !li.hidden); s.hidden = !v; alguno ||= v; }
    nada.hidden = alguno;
  };
}

export const FRONTONES = {
  s_frontones(tab) {
    const de = (g) => DESTACADOS.filter(f => f.grupo === g).map(tarjeta);
    const tipo = (k, foto) => ({ k: 't-' + k, img: fotoFronton(foto), icon: TIPOS[k].icon, kicker: 'Tipo de cancha', title: TIPOS[k].nombre, eu: TIPOS[k].eu,
      secs: [['Qué es', `<p>${esc(TIPOS[k].texto)}</p><p>En Navarra hay <b>${num(CUENTA[k])}</b>.</p>`]] });
    const grupos = [
      { k: 'historia', name: 'Con historia', icon: 'scroll', intro: 'Los frontones de los que más se sabe: cuándo se hicieron, quién los hizo y qué pasó en ellos.', items: de('historia') },
      { k: 'montana', name: 'La Montaña', icon: 'mountain', intro: 'Baztan, Bidasoa, Malerreka, Leitzaldea, Larraun, el Pirineo y Sakana: casi cada pueblo tiene su frontón.', items: de('montana') },
      { k: 'media', name: 'Zona Media y Tierra Estella', icon: 'wheat', intro: 'La Cuenca de Pamplona, el Prepirineo, los valles de Tierra Estella y la Zona Media.', items: de('media') },
      { k: 'ribera', name: 'La Ribera', icon: 'sun', intro: 'Los frontones de la Ribera del Ebro.', items: de('ribera') },
      { k: 'tipos', name: 'Tipos de cancha', icon: 'pelota', items: [tipo('plaza', 'mendaza'), tipo('izquierda', 'labrit'), tipo('trinquete', 'elizondo-trinquete'),
        { k: 'medidas', icon: 'pelota', kicker: 'Frontón de pared izquierda', title: 'Las medidas', secs: [['Las medidas', `<p>${esc(MEDIDAS)}</p>`]] }] },
      { k: 'todos', name: 'Todos', icon: 'map', n: CUENTA.total, intro: 'Los frontones de cada pueblo de Navarra: plazas libres, de pared izquierda y trinquetes.', html: todosHTML(), init: buscador },
    ];
    const head = `<div class="ar-head dd-head"><small class="kicker">${I('pelota', 20)} Saberes · Pelota</small><h1>Frontones de Navarra</h1>
      <p>Navarra tiene más de 650 frontones: casi cada pueblo tiene el suyo, en la plaza, junto a la iglesia o cubierto. Aquí están los que tienen más historia, fotos de frontones de toda Navarra, los tipos de cancha y la lista de todos, pueblo a pueblo. Toca uno para ver su ficha.</p>
      <p class="ftn-cifras"><span><b>${num(CUENTA.total)}</b> frontones</span><span><b>${num(CUENTA.izquierda)}</b> de pared izquierda</span><span><b>${num(CUENTA.plaza)}</b> plazas libres</span><span><b>${num(CUENTA.trinquete)}</b> trinquetes</span></p></div>`;
    return galeria(this, 'frontones', tab, head, grupos);
  },
};
