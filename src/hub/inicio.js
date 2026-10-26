// El inicio del menú: el mapa 3D de Navarra por comarcas (mapa3d.js) a toda la pantalla, que es por donde se elige todo,
// como el mapa del mundo de un juego, con el círculo de lo conquistado, la misión de ahora y las comarcas encima; al elegir
// una comarca, su rótulo arriba; al tocar un pueblo, la cámara se acerca y su ficha (lo que es, sus misiones y el botón de
// jugar) sale junto a su chincheta. Debajo, el destacado grande (su lámina, el título, el botón de jugar y las flechas
// para pasar al siguiente, con tu personaje saliendo por fuera del marco), la columna de lo que hay ahora en Navarra (la
// fila marcada es la del destacado), los personajes de leyenda y «Descubre Navarra» con sus pestañas y sus flechas. Todo
// con lo del juego: sus pueblos, bosques, yacimientos, leyendas y campeonatos
import './inicio.css';
import COMARCAS from '../data/comarcas.json';
import { LEVELS, levelById } from '../data/levels.js';
import { SITES } from '../data/dolmen.js';
import { CUENTOS, KIND_LABEL } from '../data/cuentos.js';
import { FIGURAS } from '../data/figuras.js';
import { figuraRecorte } from '../ui/figuras.js';
import { townImg, townCover, comarcaCover, laminaUrl, leyendaUrl } from '../ui/laminas.js';
import { stampImg } from '../assets.js';
import { avatarPortrait } from '../ui/portraits.js';
import { iconSVG } from '../ui/icons.js';
import { profile, townProgress, comarcaProgress, comarcaTowns } from '../game/profile.js';
import { esc } from '../util/html.js';
import { mapa3d } from './mapa3d.js';

const I = (n, s = 24) => iconSVG(n, s);
const comarca = (id) => COMARCAS.find(c => c.id === id);
const corto = (l) => l.name.split(' /')[0];
// (la excavación de un yacimiento: su pueblo y si ya está hecha)
const digDone = (p, S, id) => { const l = levelById(S.town), k = l?.missions?.findIndex(m => m.type === 'dolmen' && m.site === id) ?? -1; return k >= 0 && !!p.towns[l.id]?.done?.[k]; };

// ---------- lo que sale en el destacado y en la columna ----------
function ahora(p) {
  const out = [], seen = new Set(), add = (o) => { if (o && !seen.has(o.key)) { seen.add(o.key); out.push(o); } };
  const town = (l, kicker, btn, tone) => { const t = townProgress(p, l), c = comarca(l.comarca);
    return { key: l.id, l, t, c, kicker, btn, tone, img: townImg(l), thumb: townCover(l.id, true) || townImg(l), title: corto(l), sub: `${t.done}/${t.total} misiones`, attr: `data-play="${l.id}"` }; };
  const nuevo = (l) => !townProgress(p, l).done && !p.towns[l.id]?.visits;
  const last = levelById(p.last);
  if (last && !townProgress(p, last).stamp) add(town(last, 'Sigue tu aventura', 'Seguir', 'av'));
  const sig = LEVELS.find(l => !l.bosque && nuevo(l) && l.id !== p.last);
  if (sig) add({ ...town(sig, out.length ? 'Pueblo nuevo' : 'Próxima parada', 'Jugar', 'yo'), sub: comarca(sig.comarca)?.name || '' });
  const bq = LEVELS.find(l => l.bosque && !townProgress(p, l).stamp);
  if (bq) add({ ...town(bq, 'Bosques de Navarra', 'Explorar', 'nat'), sub: 'Bosque · ' + (comarca(bq.comarca)?.name || '') });
  const [sid, S] = Object.entries(SITES).find(([id, S]) => S.tipo && levelById(S.town) && !digDone(p, S, id)) || [];
  if (S) { const l = levelById(S.town); add({ ...town(l, 'Yacimiento', 'Excavar', 'dep'), key: 'y-' + sid, title: S.title, sub: S.lugar, site: S, icon: S.icon }); }
  add({ key: 'sports', kicker: 'Campeonatos', btn: 'Jugar', tone: 'sab', title: 'Pelota y fútbol', sub: 'Torneos y liga', img: laminaUrl('dep-pelotari'), thumb: laminaUrl('dep-pelotari', true), attr: 'data-go="sports"', icon: 'trophy' });
  return out;
}

// el contenido del destacado de una fila (cambia al elegir otra o con las flechas)
function destacado(it, p) {
  const done = it.l ? p.towns[it.l.id]?.done || {} : {};
  const ms = it.l && !it.site ? `<span class="ih-ms">${OPC.slots(it.l).map(({ m, si }) => `<i class="${done[si] ? 'ok' : ''}">${I(OPC.icono(m) || 'star', 22)}</i>`).join('')}</span>` : '';
  const pr = it.c ? comarcaProgress(p, it.c.id) : null, n = it.c ? comarcaTowns(it.c.id).length : 0;
  return `<div class="ih-img" style="background-image:url(${it.img})"></div>
    ${it.c ? `<button class="ih-chip" data-comarca="${it.c.id}" style="--c:${it.c.color}"><img src="${stampImg(it.c.id)}" alt=""><span><small>${esc(it.c.name)}</small><b>${pr.stamps}/${n} sellos</b></span></button>` : ''}
    <div class="ih-bar">
      <div class="ih-txt"><small class="kicker">${esc(it.kicker)}</small><b class="ih-title">${esc(it.title)}</b>${ms || `<span class="ih-sub">${it.icon ? I(it.icon, 22) : ''}<span>${esc(it.sub)}</span></span>`}</div>
      <div class="ih-ctl"><button class="ih-arrow" data-paso="-1" aria-label="Anterior">${I('back', 22)}</button><button class="ih-play" ${it.attr} aria-label="${esc(it.btn)}">${I('play', 34)}</button><button class="ih-arrow sig" data-paso="1" aria-label="Siguiente">${I('back', 22)}</button></div>
      ${it.t ? `<div class="ih-stat"><b>${it.t.done}/${it.t.total}</b><small>misiones</small></div>` : `<div class="ih-stat">${I(it.icon || 'star', 30)}</div>`}
    </div>`;
}

// ---------- «Descubre Navarra»: las tarjetas de cada pestaña ----------
const PESTANAS = [['pueblos', 'church', 'Pueblos'], ['bosques', 'tree', 'Bosques'], ['yacimientos', 'dolmen', 'Yacimientos'], ['leyendas', 'legend', 'Leyendas'], ['campeonatos', 'trophy', 'Campeonatos']];
function tarjetas(tab, p) {
  const card = ({ img, av, title, sub, meta, attr }) => `<button class="ig-card" ${attr}><span class="ig-img">${img ? `<img src="${img}" alt="" loading="lazy" decoding="async">` : ''}</span>
    <span class="ig-body"><span class="ig-av">${av}</span><span class="ig-tx"><b>${esc(title)}</b><small>${esc(sub)}</small>${meta[0] || meta[1] ? `<em>${meta[0] ? `<span>${esc(meta[0])}</span>` : ''}${meta[1] ? `<i>${esc(meta[1])}</i>` : ''}</em>` : ''}</span></span></button>`;
  const lugar = (l, kind) => { const t = townProgress(p, l), c = comarca(l.comarca);
    return card({ img: townCover(l.id, true), av: `<img src="${stampImg(l.comarca)}" alt="">`, title: corto(l), sub: kind || c?.name || '', meta: [`${t.done}/${t.total} misiones`, t.stamp ? 'Sellado' : t.done ? 'Empezado' : 'Por descubrir'], attr: `data-town="${l.id}"` }); };
  if (tab === 'bosques') return LEVELS.filter(l => l.bosque).map(l => lugar(l, 'Bosque · ' + (comarca(l.comarca)?.name || ''))).join('');
  if (tab === 'yacimientos') return Object.entries(SITES).filter(([, S]) => S.tipo || S.town).map(([id, S]) => { const l = levelById(S.town);
    return l ? card({ img: townCover(l.id, true), av: I(S.icon, 30), title: S.title || S.whatTitle, sub: S.lugar || corto(l), meta: ['Misión en ' + corto(l), digDone(p, S, id) ? 'Excavado' : ''], attr: `data-town="${l.id}"` }) : ''; }).join('');
  if (tab === 'leyendas') { const oidas = new Set(p.cards || []);
    return CUENTOS.filter(C => leyendaUrl(C.id)).map(C => card({ img: leyendaUrl(C.id), av: I(C.icon || 'legend', 30), title: C.title, sub: C.place || '', meta: [KIND_LABEL[C.kind] || '', oidas.has('cuento:' + C.id) ? 'Escuchado' : ''], attr: 'data-go="cuentos"' })).join(''); }
  if (tab === 'campeonatos') return [['dep-pelotari', 'pelota', 'Pelota a mano', 'Manomanista, parejas y cuatro y medio', 'sports'], ['dep-futbol', 'balon', 'Fútbol', 'La liga de los pueblos de Navarra', 'sports'], ['dep-pasaka', 'pelota', 'Pasaka', 'El juego de pelota de antes, con guante', 'pasaka']]
    .map(([lam, ic, title, sub, go]) => card({ img: laminaUrl(lam, true), av: I(ic, 30), title, sub, meta: [], attr: `data-go="${go}"` })).join('');
  // (los pueblos: primero los empezados, luego los que faltan por descubrir; los sellados, al final)
  const orden = (l) => { const t = townProgress(p, l); return t.stamp ? 2 : t.done || p.towns[l.id]?.visits ? 0 : 1; };
  return LEVELS.filter(l => !l.bosque).sort((a, b) => orden(a) - orden(b)).slice(0, 14).map(l => lugar(l)).join('');
}

// (lo que pone el menú: el icono de cada misión, las misiones que tocan por la edad, dónde cae cada pueblo en el mapa de
// comarcas y el mapa plano, para cuando no hay 3D; hub.js)
let OPC = { icono: () => 'star', nombre: (m) => m.title || m.name || '', slots: (l) => (l.missions || []).map((m, si) => ({ m, si })), xy: () => null, plano: () => '' };

// ---------- el mapa 3D: el círculo de lo conquistado, las comarcas de abajo, el rótulo de la comarca y la ficha del pueblo ----------
// (un aro que se llena: f de 0 a 1)
const aro = (f, cls = '') => `<svg class="m3-aro ${cls}" viewBox="0 0 48 48" aria-hidden="true"><circle class="tr" cx="24" cy="24" r="21"/><circle class="ar" cx="24" cy="24" r="21" stroke-dasharray="${(131.9 * Math.min(1, f)).toFixed(1)} 131.9" transform="rotate(-90 24 24)"/></svg>`;
const estado = (p, l) => { const t = townProgress(p, l); return t.stamp ? 'ok' : t.done || p.towns[l.id]?.visits ? 'go' : ''; };
function conquista(p) {
  const C = COMARCAS.map(c => ({ c, r: comarcaProgress(p, c.id) })).filter(x => x.r.towns);
  const sell = C.reduce((a, x) => a + x.r.stamps, 0), tot = C.reduce((a, x) => a + x.r.towns, 0), comp = C.filter(x => x.r.stamps === x.r.towns).length;
  return { C, sell, tot, comp, f: tot ? sell / tot : 0 };
}
// la misión de ahora, como en un juego: la portada, lo que toca (la misión siguiente con su icono), las misiones hechas y el
// botón grande de continuar; debajo, los próximos destinos
function misionHTML(p, items) {
  const it = items[0]; if (!it) return '';
  const done = it.l ? p.towns[it.l.id]?.done || {} : {}, slots = it.l && !it.site ? OPC.slots(it.l) : [];
  const sig = slots.find(({ si }) => !done[si]), m = sig?.m;
  const que = m ? `${I(OPC.icono(m) || 'star', 20)}<span>${esc(m.title || m.name || it.sub)}${m.host?.name ? ` · <i>${esc(m.host.name.split(',')[0])}</i>` : ''}</span>` : `${it.icon ? I(it.icon, 20) : ''}<span>${esc(it.sub)}</span>`;
  const ms = slots.length ? `<span class="mm-ms">${slots.map(({ m, si }) => `<i class="${done[si] ? 'ok' : ''}">${I(OPC.icono(m) || 'star', 16)}</i>`).join('')}</span>` : '';
  const btn = it.tone === 'av' ? 'Continuar' : it.btn;
  return `<div class="m3-mision" style="--t:var(--k-${it.tone})">
      <div class="mm-cab"><img class="mm-img" src="${it.thumb}" alt="" decoding="async"><span class="mm-tt"><small>${esc(it.kicker)}</small><b>${esc(it.title)}</b></span></div>
      <span class="mm-sig">${que}</span>${ms}
      <button class="mm-go" ${it.attr}>${I('play', 26)}<span>${esc(btn)}</span>${it.t ? `<small>${it.t.done}/${it.t.total}</small>` : ''}</button>
      <div class="mm-mas"><small>Próximos destinos</small>${items.slice(1, 4).map(x => `<button class="mm-x" ${x.attr} style="--t:var(--k-${x.tone})"><img src="${x.thumb}" alt="" loading="lazy" decoding="async"><span><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span>${I('play', 18)}</button>`).join('')}</div>
    </div>`;
}
function mapaHTML(p, items) {
  const K = conquista(p), pct = Math.round(K.f * 100);
  return `${misionHTML(p, items)}<div class="m3-tot">${aro(K.f, 'grande')}<b class="m3-pct">${pct}<small>%</small></b>
      <span class="m3-tt"><small>Navarra conquistada</small><b>${K.comp}/${K.C.length} comarcas</b><i>${I('stamp', 18)}${K.sell}/${K.tot} sellos</i></span></div>
    <span class="m3-ayuda" aria-hidden="true">${I('hand', 20)}<span class="fino">Arrastra para moverte · rueda para acercar · clic derecho para girar</span><span class="dedo">Arrastra para moverte · pellizca para acercar</span></span>
    <div class="m3-rail" role="list">${K.C.map(({ c, r }) => { const st = r.stamps === r.towns ? 'ok' : r.done || LEVELS.some(l => l.comarca === c.id && estado(p, l)) ? 'go' : '';
      return `<button class="m3-chip ${st}" data-sel="${c.id}" style="--c:${c.color}" role="listitem"><span class="m3-sello">${aro(r.stamps / r.towns)}<img src="${stampImg(c.id)}" alt="">${st ? '' : `<i class="m3-lock">${I('lock', 16)}</i>`}</span><span class="m3-ct"><b>${esc(c.name)}</b><small>${r.stamps}/${r.towns} sellos</small></span></button>`; }).join('')}</div>
    <div class="m3-cb" hidden></div><div class="m3-ft" hidden aria-live="polite"></div>`;
}
// el rótulo de la comarca elegida: su sello en su aro, su nombre, sus sellos, su página y el botón de volver a toda Navarra
function bandaHTML(p, id) {
  const c = comarca(id), r = comarcaProgress(p, id); if (!c) return '';
  return `<span class="m3-sello">${aro(r.towns ? r.stamps / r.towns : 0)}<img src="${stampImg(id)}" alt=""></span>
    <span class="cb-tt"><small>Comarca</small><b>${esc(c.name)}</b><i>${r.stamps}/${r.towns} sellos</i></span>
    <button class="cb-b" data-comarca="${id}" aria-label="Todo sobre ${esc(c.name)}" title="Todo sobre ${esc(c.name)}">${I('book', 20)}</button>
    <button class="cb-b" data-cierra aria-label="Ver toda Navarra" title="Ver toda Navarra">${I('close', 20)}</button>`;
}
// la ficha de un pueblo, junto a su chincheta: su portada, su comarca, lo que es, sus misiones (las hechas, marcadas) y la
// siguiente, y el botón de jugar, que hace el zoom hasta tu personaje en el pueblo; y el de su página
function fichaHTML(p, l) {
  const c = comarca(l.comarca), t = townProgress(p, l), done = p.towns[l.id]?.done || {}, slots = OPC.slots(l), st = estado(p, l), img = townCover(l.id, true) || townImg(l);
  const sig = slots.find(({ si }) => !done[si])?.m, nombre = esc(corto(l));
  return `<button class="ft-x" data-ftx aria-label="Cerrar">${I('close', 18)}</button>
    <div class="ft-img"${img ? ` style="background-image:url(${img})"` : ''}><span class="ft-st ${st}">${I(st === 'ok' ? 'stamp' : st === 'go' ? 'exclaim' : l.bosque ? 'tree' : 'compass', 18)}</span></div>
    <div class="ft-body"><small class="ft-k">${l.bosque ? 'Bosque · ' : ''}${esc(c?.name || '')}</small><b class="ft-n">${nombre}</b>${l.intro ? `<p class="ft-in">${esc(l.intro)}</p>` : ''}
      <div class="ft-ms"><span>${t.done}/${t.total} misiones</span><div>${slots.map(({ m, si }) => `<i class="${done[si] ? 'ok' : ''}">${I(OPC.icono(m) || 'star', 20)}</i>`).join('')}</div></div>
      ${sig ? `<span class="ft-sig">${I(OPC.icono(sig) || 'star', 18)}<span>${esc(OPC.nombre(sig))}${sig.host?.name ? ` · <i>${esc(sig.host.name.split(',')[0])}</i>` : ''}</span></span>` : ''}
      <div class="ft-bot"><button class="ft-go" data-play="${l.id}">${I('play', 24)}<span>${t.stamp ? 'Volver' : t.done ? 'Seguir' : l.bosque ? 'Explorar' : 'Jugar'}</span></button>
        <button class="ft-info" data-town="${l.id}" aria-label="Todo sobre ${nombre}" title="Todo sobre ${nombre}">${I('book', 22)}</button></div></div>`;
}
let MAPA = null;
/** Para el mapa 3D (al cambiar de pantalla o al entrar a jugar): suelta lo suyo y deja libre el renderizador. */
export function cierraMapa() { MAPA?.dispose(); MAPA = null; }
// (al darle a jugar en un pueblo con el mapa a la vista: el vuelo hasta él; una promesa, o null si no hay)
export const entraMapa = (id) => MAPA?.entrar?.(id) || null;
/** El principio del inicio: el saludo, el destacado con su columna, los personajes y «Descubre Navarra». */
/** El inicio, como la pantalla del mapa del mundo de un juego: Navarra en 3D a toda la pantalla y, encima, la misión de
 *  ahora con su botón de continuar, lo conquistado, las comarcas y el botón de «Tu aventura». */
export function inicioHTML(opc) {
  if (opc) OPC = { ...OPC, ...opc };
  const p = profile(), items = ahora(p);
  inicioHTML.items = items;
  return `<section class="m3d">${mapaHTML(p, items)}<header class="ini-head">
      <button class="ini-sq ini-av" data-go="aventura" aria-label="Tu aventura">${I('book', 26)}<span>Tu aventura</span></button>
    </header></section>`;
}
/** «Tu aventura»: lo que antes iba debajo del mapa (el destacado con lo que hay ahora en Navarra, los personajes de
 *  leyenda y «Descubre Navarra»), en su propia pantalla. */
export function aventuraHTML(opc) {
  if (opc) OPC = { ...OPC, ...opc };
  const p = profile(), items = ahora(p), it = items[0];
  inicioHTML.items = items;
  const pop = avatarPortrait(p.avatar, 'hero');
  return `<section class="ini-top">
      <div class="ini-hero" data-i="0">${destacado(it, p)}${pop ? `<img class="ih-pop" src="${pop}" alt="" aria-hidden="true">` : ''}</div>
      <aside class="ini-live"><h2 class="ini-h">${I('compass', 26)}<span>Ahora en Navarra</span></h2>
        <ul>${items.map((x, i) => `<li class="${i ? '' : 'on'}" data-i="${i}" style="--t:var(--k-${x.tone})"><button class="il-pick" data-i="${i}" aria-label="${esc(x.title)}"><img src="${x.thumb}" alt="" loading="lazy" decoding="async"><span><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span></button><button class="il-btn" ${x.attr}>${esc(x.btn)}</button></li>`).join('')}</ul>
      </aside>
    </section>
    <section class="ini-people"><h2 class="ini-h">${I('legend', 26)}<span>Personajes de leyenda</span><button class="lnk sec-more" data-go="personajes">Ver todos</button></h2>
      <div class="ip-rail">${FIGURAS.filter(f => figuraRecorte(f.id)).map(f => `<button class="ip" data-figura="${f.id}"><span class="ip-av"><img src="${figuraRecorte(f.id)}" alt="" loading="lazy" decoding="async"></span><span class="ip-tx"><b>${esc(f.name)}</b><small>${esc(f.where.split(' · ')[0])}</small></span></button>`).join('')}</div>
    </section>
    <section class="ini-games"><div class="ig-head"><h2 class="ini-h">${I('map', 26)}<span>Descubre Navarra</span></h2><span class="ig-arrows"><button class="ig-arrow" data-dir="-1" aria-label="Anteriores">${I('back', 22)}</button><button class="ig-arrow sig" data-dir="1" aria-label="Siguientes">${I('back', 22)}</button></span></div>
      <div class="ig-tabs" role="tablist">${PESTANAS.map(([k, ic, t], i) => `<button role="tab" data-tab="${k}" aria-selected="${!i}" class="${i ? '' : 'on'}">${I(ic, 22)}<span>${t}</span></button>`).join('')}</div>
      <div class="ig-cards">${tarjetas('pueblos', p)}</div>
    </section>`;
}

// tu personaje, recortado a su silueta (los retratos traen aire alrededor, más o menos según el personaje): así sus pies
// tocan el borde de abajo y la barra empieza justo donde acaba él
function recorta(img, hero) {
  const mide = () => { if (!img.isConnected) return; const w = img.offsetParent ? img.getBoundingClientRect().width : 0; hero.style.setProperty('--popw', w ? Math.max(0, w - 28 - 4) + 'px' : '0px'); };
  const go = () => {
    try {
      const w = img.naturalWidth, h = img.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y += 2) for (let i = 0; i < w; i += 2) if (d[(y * w + i) * 4 + 3] > 30) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 > x0) { const o = document.createElement('canvas'); o.width = x1 - x0 + 2; o.height = y1 - y0 + 2; o.getContext('2d').drawImage(img, -x0, -y0); img.src = o.toDataURL(); }
    } catch (e) { /* (sin recortar, tal cual) */ }
    img.classList.add('listo'); requestAnimationFrame(mide);
  };
  if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
  new ResizeObserver(mide).observe(hero);
}

// el mapa 3D y lo de encima: las comarcas de abajo llevan a cada una, con su rótulo arriba; tocar un pueblo acerca la cámara
// y abre su ficha junto a su chincheta
function mapaOn(root, p) {
  const sec = root.querySelector('.m3d'); if (!sec) return;
  cierraMapa();
  const banda = sec.querySelector('.m3-cb'), ficha = sec.querySelector('.m3-ft');
  const entra = (el) => { el.classList.remove('entra'); void el.offsetWidth; el.classList.add('entra'); };
  const abre = (id) => {
    sec.querySelectorAll('.m3-chip').forEach(b => b.classList.toggle('on', b.dataset.sel === id));
    sec.classList.toggle('con-sel', !!id); huT = 0;
    if (!id) { banda.hidden = true; banda.innerHTML = ''; delete banda.dataset.c; return; }
    if (banda.dataset.c !== id) { banda.dataset.c = id; banda.style.setProperty('--c', comarca(id)?.color || '#fff'); banda.innerHTML = bandaHTML(p, id); banda.hidden = false; entra(banda); }
  };
  const pueblo = (id) => {
    const l = id && levelById(id); huT = 0;
    sec.classList.toggle('con-ficha', !!l);
    if (!l) { ficha.hidden = true; ficha.innerHTML = ''; delete ficha.dataset.t; return; }
    ficha.dataset.t = id; ficha.style.setProperty('--c', comarca(l.comarca)?.color || '#fff'); ficha.innerHTML = fichaHTML(p, l);
    ficha.hidden = false; ficha.style.visibility = 'hidden'; entra(ficha);
  };
  // (la ficha, junto a la chincheta, que mapa3d.js dice dónde queda en cada imagen: a su derecha en las pantallas anchas, o a
  // su izquierda si no cabe; debajo del pueblo en el móvil de pie; siempre dentro, con su pico señalándola)
  const ESTRECHA = 640, m = 12, lim = { t: m, b: 0 };   // (lim: entre lo de arriba y las comarcas de abajo, medido con el hueco)
  const sigue = (x, y, ok) => {
    if (ficha.hidden) return;
    const W = sec.clientWidth, H = sec.clientHeight, w = ficha.offsetWidth, h = ficha.offsetHeight, abajo = W < ESTRECHA;
    let l = abajo ? x - w / 2 : x + 40, t = abajo ? y + 64 : y - h * 0.3;
    if (!abajo && l + w > W - m) l = x - 40 - w;
    l = Math.max(m, Math.min(W - w - m, l)); t = Math.max(lim.t, Math.min((lim.b || H - m) - h, t));
    ficha.style.transform = `translate(${Math.round(l)}px, ${Math.round(t)}px)`; ficha.style.visibility = ok ? '' : 'hidden';
    ficha.classList.toggle('abajo', abajo); ficha.classList.toggle('izq', !abajo && l < x);
    ficha.style.setProperty('--px', Math.round(Math.max(20, Math.min(w - 20, x - l))) + 'px'); ficha.style.setProperty('--py', Math.round(Math.max(20, Math.min(h - 20, y - t))) + 'px');
  };
  const towns = LEVELS.map(l => { const xy = OPC.xy(l); return xy && { id: l.id, name: corto(l), comarca: l.comarca, sx: xy[0], sy: xy[1], state: estado(p, l), pct: ((t) => t.total ? t.done / t.total : 0)(townProgress(p, l)), bosque: !!l.bosque, here: l.id === p.last }; }).filter(Boolean);
  const comarcas = COMARCAS.filter(c => c.path).map(c => { const r = comarcaProgress(p, c.id); return { id: c.id, name: c.name, color: c.color, path: c.path, pct: r.towns ? r.pct : 0, done: !!r.towns && r.stamps === r.towns, stamps: r.stamps, towns: r.towns || 0 }; });
  // (lo que tapa lo de encima: arriba, el botón de tu aventura y el rótulo de la comarca; abajo, las comarcas y la misión de
  // ahora; y la ficha del pueblo, que deja el pueblo a su izquierda o, en el móvil de pie, encima de ella. Medido cada poco)
  let hu = null, huT = 0;
  const hueco = () => {
    const now = performance.now(); if (hu && now - huT < 250) return hu; huT = now;
    const a = sec.getBoundingClientRect(), k = a.height / (sec.clientHeight || 1) || 1, R = sec.querySelector('.m3-rail');
    let t = 0, r = 0, b = 0;
    for (const e of [sec.querySelector('.ini-head'), banda]) if (e && !e.hidden && e.offsetParent) t = Math.max(t, (e.getBoundingClientRect().bottom - a.top) / k + 8);
    if (R?.offsetParent) b = (a.bottom - R.getBoundingClientRect().top) / k + 8;
    const Q = sec.querySelector('.m3-mision');
    if (Q?.offsetParent) { const q = Q.getBoundingClientRect(); if (q.top > a.top + a.height * 0.5) b = Math.max(b, (a.bottom - q.top) / k + 8); }
    if (!ficha.hidden) { if (a.width / k < ESTRECHA) b = Math.max(b, ficha.offsetHeight + 64 + 2 * m); else r = ficha.offsetWidth + 40 + 2 * m; }
    // (con una comarca elegida, también el círculo de lo conquistado, para que nada de ella quede debajo)
    const T2 = sec.querySelector('.m3-tot'); if (!banda.hidden && T2?.offsetParent) t = Math.max(t, (T2.getBoundingClientRect().bottom - a.top) / k + 8);
    lim.t = banda.offsetParent ? (banda.getBoundingClientRect().bottom - a.top) / k + m : m; lim.b = R?.offsetParent ? (R.getBoundingClientRect().top - a.top) / k - m : 0;
    return (hu = { t, r, b });
  };
  MAPA = mapa3d(sec, { comarcas, towns, hueco, icono: (n) => I(n, 16), tapa: '.ini-head, .m3-tot, .m3-rail, .m3-pad, .m3-cb, .m3-ft, .m3-mision', onSelect: abre, onTown: pueblo, sigue });
  // (lo que mide lo conquistado, para que en el móvil tumbado lo de arriba empiece justo a su lado, en cualquier idioma)
  const tot = sec.querySelector('.m3-tot'); if (tot) new ResizeObserver(() => sec.style.setProperty('--totw', tot.offsetWidth + 'px')).observe(tot);
  const mis = sec.querySelector('.m3-mision'); if (mis) new ResizeObserver(() => sec.style.setProperty('--misw', mis.offsetWidth + 'px')).observe(mis);
  if (!MAPA) { sec.classList.add('plano'); sec.insertAdjacentHTML('afterbegin', `<div class="m3-plano">${OPC.plano()}</div>`); }
  sec.addEventListener('click', (e) => {
    const ch = e.target.closest('[data-sel]'); if (ch) { if (MAPA) MAPA.select(ch.dataset.sel); else abre(ch.dataset.sel); return; }
    if (e.target.closest('[data-ftx]')) { MAPA?.cierraPueblo(); return; }
    if (e.target.closest('[data-cierra]')) { if (MAPA) MAPA.vista(); else abre(null); }
  });
}

/** Lo que se mueve: el mapa 3D, elegir fila, las flechas del destacado y de las tarjetas y las pestañas. */
export function inicioOn(root) {
  const p = profile(), items = inicioHTML.items || [], hero = root.querySelector('.ini-hero');
  mapaOn(root, p);
  if (!hero) return;
  const pop0 = hero.querySelector('.ih-pop'); if (pop0) recorta(pop0, hero);
  const pon = (i) => {
    i = (i + items.length) % items.length; if (+hero.dataset.i === i) return;
    hero.dataset.i = i; const pop = hero.querySelector('.ih-pop');
    hero.innerHTML = destacado(items[i], p); if (pop) hero.append(pop);
    hero.classList.remove('cambia'); void hero.offsetWidth; hero.classList.add('cambia');
    root.querySelectorAll('.ini-live li').forEach(li => li.classList.toggle('on', +li.dataset.i === i));
  };
  hero.addEventListener('click', (e) => { const b = e.target.closest('[data-paso]'); if (b) pon(+hero.dataset.i + +b.dataset.paso); });
  root.querySelectorAll('.il-pick').forEach(b => b.onclick = () => pon(+b.dataset.i));
  // (las tarjetas: la pestaña elegida y las flechas, que pasan una pantalla de tarjetas)
  const cards = root.querySelector('.ig-cards');
  root.querySelectorAll('.ig-tabs [data-tab]').forEach(b => b.onclick = () => {
    root.querySelectorAll('.ig-tabs [data-tab]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    cards.innerHTML = tarjetas(b.dataset.tab, p); cards.scrollLeft = 0;
  });
  root.querySelectorAll('.ig-arrow').forEach(b => b.onclick = () => cards.scrollBy({ left: +b.dataset.dir * cards.clientWidth * 0.85, behavior: 'smooth' }));
}
