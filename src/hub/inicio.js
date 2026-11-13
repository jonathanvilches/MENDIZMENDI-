// El inicio del menú: el mapa 3D de Navarra por comarcas (mapa3d.js) a toda la pantalla, que es por donde se elige todo,
// como el mapa del mundo de un juego, con el círculo de lo descubierto, la misión de ahora y las comarcas encima; al elegir
// una comarca, su rótulo arriba; al tocar un pueblo, la cámara se acerca, se levanta su maqueta y junto a su chincheta sale
// el botón de empezar la misión. Jugando, es la pantalla de siempre: las secciones se abren encima (hub.js)
import './inicio.css';
import COMARCAS from '../data/comarcas.json';
import { LEVELS, levelById } from '../data/levels.js';
import { SITES } from '../data/dolmen.js';
import { townImg, townCover, comarcaCover, laminaUrl, comarcaVideo, encuadreComarca } from '../ui/laminas.js';
import { videoTag } from '../ui/videos.js';
import { stampImg } from '../assets.js';
import { iconSVG } from '../ui/icons.js';
import { profile, townProgress, comarcaProgress } from '../game/profile.js';
import { esc } from '../util/html.js';
import { mapa3d } from './mapa3d.js';
import { sencillo, graficaFloja } from '../util/sencillo.js';
import { isDidactico } from '../util/modo.js';
import { releaseStage } from './stage.js';
import { coleccionDe } from './coleccionMapa.js';

const I = (n, s = 24) => iconSVG(n, s);
const comarca = (id) => COMARCAS.find(c => c.id === id);
const corto = (l) => l.name.split(' /')[0];
// (la excavación de un yacimiento: su pueblo y si ya está hecha)
const digDone = (p, S, id) => { const l = levelById(S.town), k = l?.missions?.findIndex(m => m.type === 'dolmen' && m.site === id) ?? -1; return k >= 0 && !!p.towns[l.id]?.done?.[k]; };

// ---------- lo que toca ahora: la misión de ahora y los próximos destinos ----------
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

// (lo que pone el menú: el icono de cada misión, las misiones que tocan por la edad y dónde cae cada pueblo en el mapa de
// comarcas; hub.js)
let OPC = { icono: () => 'star', slots: (l) => (l.missions || []).map((m, si) => ({ m, si })), misiones: () => [], xy: () => null };
// (en el modo didáctico, el mapa vive en su sección, Mapa: sin la misión, lo descubierto ni los sellos, y cada pueblo lleva a
// su página)
let DD = false;

// ---------- el mapa 3D: el círculo de lo descubierto, las comarcas de abajo, el rótulo de la comarca y la ficha del pueblo ----------
// (un aro que se llena: f de 0 a 1)
const aro = (f, cls = '') => `<svg class="m3-aro ${cls}" viewBox="0 0 48 48" aria-hidden="true"><circle class="tr" cx="24" cy="24" r="21"/><circle class="ar" cx="24" cy="24" r="21" stroke-dasharray="${(131.9 * Math.min(1, f)).toFixed(1)} 131.9" transform="rotate(-90 24 24)"/></svg>`;
const pueblos = (n) => `${n} ${n === 1 ? 'pueblo' : 'pueblos'}`;
const estado = (p, l) => { const t = townProgress(p, l); return t.stamp ? 'ok' : t.done || p.towns[l.id]?.visits ? 'go' : ''; };
function avance(p) {
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
  const K = avance(p), pct = Math.round(K.f * 100);
  return `${DD ? '' : `${misionHTML(p, items)}<div class="m3-tot">${aro(K.f, 'grande')}<b class="m3-pct">${pct}<small>%</small></b>
      <span class="m3-tt"><small>Navarra descubierta</small><b>${K.comp}/${K.C.length} comarcas</b><i>${I('stamp', 18)}${K.sell}/${K.tot} sellos</i></span></div>`}
    <span class="m3-ayuda" aria-hidden="true">${I('hand', 20)}<span class="fino">Arrastra para moverte · rueda para acercar · clic derecho para girar</span><span class="dedo">Arrastra para moverte · pellizca para acercar</span></span>
    <div class="m3-rail" role="list">${K.C.map(({ c, r }) => { const st = estadoC(p, c, r);
      return `<button class="m3-chip ${DD ? 'ok' : st}" data-sel="${c.id}" style="--c:${c.color};${encuadreComarca(c.id)}" role="listitem"><img class="m3-fondo" src="${comarcaCover(c.id, true)}" alt="" loading="lazy" decoding="async"><img class="m3-foto" src="${comarcaCover(c.id, true)}" alt="" loading="lazy" decoding="async">${videoTag(comarcaVideo(c.id, true), 'm3-vid')}${!DD && r.towns && r.stamps >= r.towns ? `<span class="m3-hecha" role="img" aria-label="Terminada">${I('check', 13)}</span>` : ''}${VER('Ver comarca')}<span class="m3-ct"><b>${esc(c.name.replace(/^Comarca de /, ''))}</b><small>${DD ? pueblos(r.towns) : `${barraSellos(r.stamps, r.towns)}<span>${r.stamps}/${r.towns}<span class="m3-sw"> sellos</span></span>`}</small></span></button>`; }).join('')}</div>
    <button class="m3-fl ant" type="button" aria-label="Comarcas anteriores">${I('back', 22)}</button><button class="m3-fl sig" type="button" aria-label="Más comarcas">${I('back', 22)}</button>
    <div class="m3-col" hidden></div><div class="m3-crail" hidden role="list"></div>
    <div class="m3-ft" hidden aria-live="polite"></div><div class="m3-ex" hidden role="dialog" aria-label="Las comarcas de Navarra" tabindex="-1"></div>`;
}
const estadoC = (p, c, r) => r.stamps === r.towns ? 'ok' : r.done || LEVELS.some(l => l.comarca === c.id && estado(p, l)) ? 'go' : '';
// ---------- las comarcas en fotos: otra forma de recorrer Navarra, sin el mapa. Primero las doce, en tarjetas grandes con su
// foto, su sello y sus pueblos; al tocar una, sus pueblos, cada uno con su foto, cómo va y los botones de jugar y de verlo en
// el mapa. Se pasan deslizando (o con la rueda y las flechas), como un carrusel ----------
const flechas = () => `<span class="ex-fl"><button class="ex-ar" data-exdir="-1" aria-label="Anteriores">${I('back', 20)}</button><button class="ex-ar sig" data-exdir="1" aria-label="Siguientes">${I('back', 20)}</button></span>`;
const alMapa = `<button class="ex-x" data-exx aria-label="Volver al mapa">${I('map', 20)}<span>Mapa</span></button>`;
function exComarcasHTML(p) {
  const K = avance(p);
  return `<div class="ex-head"><span class="ex-tt"><small>Navarra</small><b>Las comarcas</b></span>${DD ? '' : `<span class="ex-sub">${I('stamp', 18)}${K.sell}/${K.tot}</span>`}${flechas()}${alMapa}</div>
    <div class="ex-track">${K.C.map(({ c, r }, i) => { const st = estadoC(p, c, r), ts = LEVELS.filter(l => l.comarca === c.id && OPC.xy(l));
      return `<button class="ex-c ${st}" data-exc="${c.id}" style="--c:${c.color};--i:${i}" aria-label="${esc(c.name)}">
        <img class="ex-img" src="${comarcaCover(c.id, true)}" alt="" loading="${i < 5 ? 'eager' : 'lazy'}" decoding="async">
        <span class="ex-sello">${aro(r.towns ? r.stamps / r.towns : 0)}<img src="${stampImg(c.id)}" alt=""></span>
        <span class="ex-tx"><b>${esc(c.name)}</b><small>${pueblos(ts.length)}${DD ? '' : ` · ${r.stamps}/${r.towns} sellos`}</small>
          <span class="ex-mini">${ts.slice(0, 5).map(l => `<img src="${townCover(l.id, true) || townImg(l, true)}" alt="" loading="lazy" decoding="async">`).join('')}${ts.length > 5 ? `<i>+${ts.length - 5}</i>` : ''}</span></span>
      </button>`; }).join('')}</div>`;
}
function exComarcaHTML(p, id) {
  const c = comarca(id), r = comarcaProgress(p, id), ts = LEVELS.filter(l => l.comarca === id && OPC.xy(l));
  return `<div class="ex-head"><button class="ex-back" data-exback aria-label="Todas las comarcas">${I('back', 22)}</button><span class="ex-tt"><small>Comarca</small><b>${esc(c.name)}</b></span>${DD ? '' : `<span class="ex-sub">${I('stamp', 18)}${r.stamps}/${r.towns}</span>`}${flechas()}${alMapa}</div>
    <div class="ex-track"><article class="ex-c ex-hero" style="--c:${c.color};--i:0"><img class="ex-img" src="${comarcaCover(id, true)}" alt="" decoding="async">
        <span class="ex-sello">${aro(r.towns ? r.stamps / r.towns : 0)}<img src="${stampImg(id)}" alt=""></span>
        <span class="ex-tx"><small class="ex-k">${c.river ? `Río ${esc(c.river)}` : 'Comarca'}</small><b>${esc(c.full || c.name)}</b><small>${pueblos(ts.length)}${DD ? '' : ' por descubrir'}</small>
          <button class="ex-ver" data-excm="${id}">${I('map', 20)}<span>Ver en el mapa</span></button></span></article>
      ${ts.map((l, i) => { const t = townProgress(p, l), st = DD ? '' : estado(p, l), nombre = esc(corto(l));
        return `<article class="ex-t ${st}" style="--c:${c.color};--i:${i + 1}">
          <button class="ex-fot" data-exmapa="${l.id}" aria-label="Ver ${nombre} en el mapa"><img class="ex-img" src="${townCover(l.id, true) || townImg(l, true)}" alt="" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async"></button>
          ${DD ? '' : `<span class="ex-st ${st}">${I(st === 'ok' ? 'stamp' : st === 'go' ? 'exclaim' : l.bosque ? 'tree' : 'compass', 16)}<span>${st === 'ok' ? 'Sellado' : st === 'go' ? 'Empezado' : l.bosque ? 'Bosque' : 'Por descubrir'}</span></span>`}
          <span class="ex-tx"><b>${nombre}</b>${DD ? `<small>${esc(c.name)}</small>` : `<small>${t.done}/${t.total} misiones</small><span class="ex-bar"><i style="width:${t.total ? Math.round(t.done / t.total * 100) : 0}%"></i></span>`}
            <span class="ex-bts">${DD ? `<button class="ex-go" data-town="${l.id}">${I('book', 20)}<span>Ver el pueblo</span></button>` : `<button class="ex-go" data-play="${l.id}">${I('play', 20)}<span>${t.stamp ? 'Volver' : t.done ? 'Seguir' : l.bosque ? 'Explorar' : 'Jugar'}</span></button>`}<button class="ex-pin" data-exmapa="${l.id}" aria-label="Ver ${nombre} en el mapa" title="Ver en el mapa">${I('pin', 20)}</button></span></span>
        </article>`; }).join('')}</div>`;
}
// la fila de las comarcas de abajo, solo con las comarcas: al elegir una, su tarjeta se enciende y dice qué hace otro
// toque, ver la página de la comarca. Los pueblos, en el mapa, en sus medallones. Volver a toda Navarra, con el botón de la
// casa o Escape (noviembre de 2026)
const VER = (txt) => `<i class="m3-vr" title="${txt}">${I('book', 16)}</i>`;
// (los sellos de una comarca en las tarjetas de abajo: una barra con un tramo por pueblo, los conseguidos en dorado)
const barraSellos = (n, de) => `<span class="m3-pr" aria-hidden="true">${Array.from({ length: de }, (_, k) => `<i class="${k < n ? 'ok' : ''}"></i>`).join('')}</span>`;
// lo que sale junto a la chincheta del pueblo elegido, mientras se levanta su maqueta: de fondo, su portada; encima, su
// comarca y su nombre, el icono de cada misión (las hechas, en el color de la comarca) y el botón de empezar, que hace el
// zoom hasta tu personaje en el pueblo. Ancha y baja, a un lado, para no tapar el pueblo que se está formando
function fichaHTML(p, l) {
  const t = townProgress(p, l), nombre = esc(corto(l)), ms = OPC.misiones(l);
  const txt = l.bosque ? 'Explorar' : t.stamp ? 'Volver a jugar' : t.done ? 'Seguir misión' : 'Empezar misión';
  const img = townImg(l, true);
  return `${img ? `<span class="ft-fondo"><img src="${img}" alt="" decoding="async"></span>` : ''}<span class="ft-n"><small>${esc(comarca(l.comarca)?.name || '')}</small><b>${nombre}</b></span>
    ${ms.length && !DD ? misionesHTML(ms, t) : ''}
    ${DD ? `<button class="ft-go" data-town="${l.id}">${I('book', 18)}<span>Ver el pueblo</span></button>` : `<button class="ft-go" data-play="${l.id}">${I('play', 18)}<span>${txt}</span></button>`}`;
}
// (las misiones del pueblo en su ficha: cuántas van con su barra y una casilla igual para cada una en una o dos filas
// parejas, hechas con su color y la siguiente marcada; sin más texto: es la ficha corta para empezar a jugar)
function misionesHTML(ms, t) {
  const sig = ms.find(m => !m.done), cols = ms.length > 8 ? Math.ceil(ms.length / 2) : ms.length, pct = Math.round(100 * t.done / Math.max(1, t.total));
  return `<span class="ft-ms"><span class="ft-ms-h"><b>Misiones</b><em>${t.done}/${t.total}</em></span><i class="ft-ms-bar"><u style="width:${pct}%"></u></i>
    <span class="ft-ms-g" style="--n:${cols}">${ms.map(m => `<i class="${m.done ? 'ok' : m === sig ? 'sig' : ''}" style="--mc:${m.mc || '#c9b8ff'}" title="${esc(m.title)}">${I(m.icon || 'star', 16)}</i>`).join('')}</span></span>`;
}
let MAPA = null;
/** Para el mapa 3D (al cambiar de pantalla o al entrar a jugar): suelta lo suyo y deja libre el renderizador. */
export function cierraMapa() { MAPA?.dispose(); MAPA = null; }
/** El inicio, como la pantalla del mapa del mundo de un juego: Navarra en 3D a toda la pantalla y, encima, la misión de
 *  ahora con su botón de continuar, lo descubierto y las comarcas. */
export function inicioHTML(opc, pantalla = 'home') {
  if (opc) OPC = { ...OPC, ...opc };
  DD = isDidactico();
  const p = profile(), items = DD ? [] : ahora(p);
  return `<section class="m3d${DD ? ' m3-dd' : ''}" data-pantalla="${pantalla}">${mapaHTML(p, items)}</section>`;
}
// el mapa 3D y lo de encima: las comarcas de abajo llevan a cada una, con su rótulo arriba; tocar un pueblo acerca la cámara
// y abre su ficha junto a su chincheta
function mapaOn(root, p) {
  const sec = root.querySelector('.m3d'); if (!sec) return;
  cierraMapa();
  // (jugando, con una sección abierta encima o el menú, el mapa no se pinta ni se mueve: está tapado. En el didáctico vive
  // en su sección, Mapa)
  // (tapado también con la bienvenida encima, .onb: su selector de personaje usa el mismo lienzo que el mapa, stage.js, y
  // el mapa, que seguía pintando debajo, se lo quitaba en cada imagen; en el móvil no salía el personaje)
  const hub = sec.closest('#hub'), aqui = sec.dataset.pantalla || 'home', tapado = () => !!hub && ((hub.dataset.screen || 'home') !== aqui || hub.classList.contains('menu-on') || !!hub.querySelector('.onb'));
  const ficha = sec.querySelector('.m3-ft'), rail = sec.querySelector('.m3-rail');
  const entra = (el) => { el.classList.remove('entra'); void el.offsetWidth; el.classList.add('entra'); };
  // (lo elegido: la comarca y el pueblo, encendidos en la fila de abajo)
  let cid = null, tid = null;
  // (una tarjeta de la fila, a la vista: la comarca, al principio, con sus pueblos detrás; un pueblo, en medio)
  const aLaVista = (b, medio) => { if (!b || !rail.clientWidth) return; const x = medio ? b.offsetLeft - (rail.clientWidth - b.offsetWidth) / 2 : b.offsetLeft - 8; rail.scrollTo({ left: Math.max(0, x), behavior: 'smooth' }); };
  // (la fila de abajo, solo con las comarcas: la elegida, encendida y a la vista. Los pueblos se eligen en el mapa, en sus
  // medallones. Hasta noviembre de 2026 los pueblos de la comarca salían en la fila, detrás de ella)
  const enFila = () => {
    rail.querySelectorAll('.m3-chip[data-sel]').forEach(b => { b.classList.toggle('on', b.dataset.sel === cid); b.classList.toggle('ver', b.dataset.sel === cid && !tid); });
    const ch = cid && rail.querySelector(`.m3-chip[data-sel="${cid}"]`);
    if (ch) requestAnimationFrame(() => aLaVista(ch, true));
  };
  const abre = (id) => {
    sec.classList.toggle('con-sel', !!id); huT = 0;
    cid = id || null; if (!cid) tid = null;
    enFila();
  };
  const pueblo = (id) => {
    const l = id && levelById(id); huT = 0;
    sec.classList.toggle('con-ficha', !!l);
    tid = l ? id : null; enFila();
    if (!l) { ficha.hidden = true; ficha.innerHTML = ''; delete ficha.dataset.t; return; }
    ficha.dataset.t = id; ficha.style.setProperty('--c', comarca(l.comarca)?.color || '#fff'); ficha.innerHTML = fichaHTML(p, l);
    ficha.hidden = false; ficha.style.visibility = 'hidden'; entra(ficha);
  };
  // (la ficha, quieta en su sitio mientras el dron vuela sobre el pueblo: a la derecha en las pantallas anchas, en lo que
  // el mapa deja libre con el hueco, y abajo en el móvil de pie. Antes iba pegada a la chincheta y se movía con la cámara)
  const ESTRECHA = 640, m = 12, lim = { t: m, b: 0 };   // (lim: entre lo de arriba y las comarcas de abajo, medido con el hueco)
  let ya = '';
  // (lo que ocupan a la derecha los botones del mapa: la ficha va a su izquierda)
  const padR = () => { const P = sec.querySelector('.m3-pad'); return P?.offsetParent ? sec.clientWidth - P.offsetLeft + 8 : m; };
  const sigue = () => {
    if (ficha.hidden) return;
    const W = sec.clientWidth, H = sec.clientHeight, w = ficha.offsetWidth, h = ficha.offsetHeight, abajo = W < ESTRECHA, fondo = lim.b || H - m;
    const l = abajo ? (W - w) / 2 : W - w - padR(), t = Math.max(lim.t, abajo ? fondo - h : Math.min(fondo - h, (lim.t + fondo - h) / 2));
    const k = `translate(${Math.round(l)}px, ${Math.round(t)}px)`;
    if (k !== ya || ficha.style.visibility) { ya = k; ficha.style.transform = k; ficha.style.visibility = ''; ficha.classList.add('fija'); }
  };
  const towns = LEVELS.map(l => { const xy = OPC.xy(l); return xy && { id: l.id, name: corto(l), comarca: l.comarca, size: l.size, sx: xy[0], sy: xy[1], state: DD ? '' : estado(p, l), pct: ((t) => t.total ? t.done / t.total : 0)(townProgress(p, l)), bosque: !!l.bosque, here: l.id === p.last, foto: townCover(l.id, true) || townImg(l, true) }; }).filter(Boolean);
  const comarcas = COMARCAS.filter(c => c.path).map(c => { const r = comarcaProgress(p, c.id); return { id: c.id, name: c.name, color: c.color, path: c.path, pct: !DD && r.towns ? r.pct : 0, done: !DD && !!r.towns && r.stamps === r.towns, stamps: r.stamps, towns: r.towns || 0 }; });
  // (lo que tapa lo de encima: arriba, la fila del HUD (lo descubierto, la misión de ahora y el rótulo de la comarca); abajo,
  // las comarcas y, en el móvil de pie, la misión; y la ficha del pueblo, que deja el pueblo a su izquierda o, en el móvil de
  // pie, encima de ella. Medido cada poco)
  let hu = null, huT = 0;
  const hueco = () => {
    const now = performance.now(); if (hu && now - huT < 250) return hu; huT = now;
    const a = sec.getBoundingClientRect(), k = a.height / (sec.clientHeight || 1) || 1, R = sec.querySelector(sec.classList.contains('con-col') ? '.m3-crail' : '.m3-rail');
    let t = 0, r = 0, b = 0;
    if (R?.offsetParent) b = (a.bottom - R.getBoundingClientRect().top) / k + 8;
    for (const e of [sec.querySelector('.m3-tot'), sec.querySelector('.m3-mision'), sec.querySelector('.m3-col')]) if (e && !e.hidden && e.offsetParent) {
      const q = e.getBoundingClientRect(); if (q.top < a.top + a.height * 0.5) t = Math.max(t, (q.bottom - a.top) / k + 8); else b = Math.max(b, (a.bottom - q.top) / k + 8);
    }
    if (!ficha.hidden) { if (a.width / k < ESTRECHA) b = Math.max(b, (R?.offsetParent ? b : 0) + ficha.offsetHeight + 2 * m); else r = ficha.offsetWidth + padR() + 40 + m; }
    lim.t = Math.max(m, t + 4); lim.b = R?.offsetParent ? (R.getBoundingClientRect().top - a.top) / k - m : 0;
    return (hu = { t, r, b });
  };
  // (las comarcas en fotos, encima del mapa, que mientras tanto no se pinta)
  const ex = sec.querySelector('.m3-ex');
  const pintaEx = (id) => {
    const antes = ex.dataset.c; ex.innerHTML = id ? exComarcaHTML(p, id) : exComarcasHTML(p); ex.dataset.c = id || '';
    const tr = ex.querySelector('.ex-track');
    // (la rueda del ratón pasa las tarjetas; al volver a todas, se ve la comarca de la que se venía)
    tr.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); tr.scrollLeft += e.deltaY; } }, { passive: false });
    if (!id && antes) tr.querySelector(`[data-exc="${antes}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  };
  const abreEx = (id = null) => { pintaEx(id); if (ex.hidden) { ex.hidden = false; sec.classList.add('con-ex'); ex.focus({ preventScroll: true }); } };
  const cierraEx = () => { if (ex.hidden) return; ex.hidden = true; ex.innerHTML = ''; delete ex.dataset.c; sec.classList.remove('con-ex'); };
  ex.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; e.stopPropagation(); if (ex.dataset.c) abreEx(null); else if (MAPA) cierraEx(); });
  // (el mapa 3D siempre. En el modo sencillo, más ligero y sin la entrada. Si deja de pintarse o pierde la tarjeta gráfica,
  // se vuelve a hacer con un renderizador nuevo, hasta dos veces; si aun así no puede, o el navegador no tiene WebGL, las
  // comarcas en fotos, que no necesitan 3D)
  let rehechos = 0;
  const sin3d = () => { sec.classList.add('sin-3d'); abreEx(null); };
  const falla = () => { cierraMapa(); releaseStage(); if (++rehechos > 2) return sin3d(); setTimeout(() => { if (sec.isConnected) monta(); }, 400); };
  const monta = () => {
    try { MAPA = mapa3d(sec, { comarcas, towns, hueco, icono: (n) => I(n, 16), tapa: '.m3-tot, .m3-rail, .m3-fl, .m3-pad, .m3-ft, .m3-mision, .m3-col, .m3-crail, .hub-menu-btn', onSelect: abre, onTown: pueblo, sigue, onTrashumancia: () => OPC.trashumancia?.(), falla, pausado: () => !ex.hidden || tapado(), ligero: sencillo() || graficaFloja(), intro: !DD, abiertas: DD }); }
    catch (e) { console.error('mapa 3D', e); (window.__errors ||= []).push('mapa 3D: ' + (e?.message || e)); MAPA = null; }
    if (!MAPA) sin3d(); else COLX?.pinta();
  };
  monta();
  // (lo que mide lo descubierto, para que en el móvil tumbado lo de arriba empiece justo a su lado, en cualquier idioma)
  rail.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); rail.scrollLeft += e.deltaY; } }, { passive: false });
  // (las flechas de la fila de las comarcas, en el ordenador y la tableta, para que se vea que es un carrusel: pasan las
  // tarjetas que se ven enteras, y la siguiente queda con la anterior asomando por la izquierda. La de un lado se va al
  // llegar a su punta, y ese borde deja de fundirse: .rail-ini y .rail-fin en la sección)
  const ASOMA = 64, puntas = () => { const L = rail.scrollLeft, M = rail.scrollWidth - rail.clientWidth; sec.classList.toggle('rail-ini', L <= 2); sec.classList.toggle('rail-fin', L >= M - 2); };
  let puT = 0; rail.addEventListener('scroll', () => { puT ||= requestAnimationFrame(() => { puT = 0; puntas(); }); }, { passive: true });
  new ResizeObserver(puntas).observe(rail); puntas();
  const pasa = (d) => {
    const cs = [...rail.querySelectorAll('.m3-chip')]; if (!cs.length) return;
    const L = rail.scrollLeft, W = rail.clientWidth, iz = L > 2 ? ASOMA : 0;
    const vis = cs.map((c, i) => [i, c.offsetLeft, c.offsetLeft + c.offsetWidth]).filter(([, a, b]) => a >= L + iz - 4 && b <= L + W - ASOMA + 4);
    const i0 = vis.length ? vis[0][0] : cs.findIndex(c => c.offsetLeft + c.offsetWidth > L + iz), n = Math.max(1, vis.length);
    const i = Math.max(0, Math.min(cs.length - 1, i0 + d * n));
    rail.scrollTo({ left: i === 0 ? 0 : Math.max(0, cs[i].offsetLeft - ASOMA), behavior: 'smooth' });
  };
  sec.querySelector('.m3-fl.ant')?.addEventListener('click', () => pasa(-1));
  sec.querySelector('.m3-fl.sig')?.addEventListener('click', () => pasa(1));
  const tot = sec.querySelector('.m3-tot'); if (tot) new ResizeObserver(() => sec.style.setProperty('--totw', tot.offsetWidth + 'px')).observe(tot);
  const mis = sec.querySelector('.m3-mision'); if (mis) new ResizeObserver(() => sec.style.setProperty('--misw', mis.offsetWidth + 'px')).observe(mis);
  sec.addEventListener('click', (e) => {
    const ch = e.target.closest('[data-sel]');
    if (ch) { if (ch.classList.contains('m3-chip') && ch.dataset.sel === cid && !tid && MAPA) return OPC.comarca?.(cid); if (MAPA) MAPA.select(ch.dataset.sel); else abreEx(ch.dataset.sel); return; }
    // (las comarcas en fotos: abrir, una comarca, volver, al mapa, verla o ver un pueblo en él, pasar tarjetas; y jugar, que
    // cierra esto y sigue, con el vuelo hasta el pueblo, en el menú)
    const x = e.target.closest('[data-ex],[data-exc],[data-exback],[data-exx],[data-excm],[data-exmapa],[data-exdir]');
    if (x) {
      const d = x.dataset;
      if (d.exdir) { const tr = ex.querySelector('.ex-track'); tr?.scrollBy({ left: +d.exdir * tr.clientWidth * 0.8, behavior: 'smooth' }); }
      else if (d.exc) abreEx(d.exc); else if (d.exback != null) abreEx(null); else if (d.ex != null) abreEx(null);
      else { cierraEx(); if (d.excm) MAPA?.select(d.excm); else if (d.exmapa) MAPA?.volar(d.exmapa); }
      return;
    }
    if (e.target.closest('.m3-ex [data-play]')) cierraEx();
    if (e.target.closest('[data-cierra]')) { if (MAPA) MAPA.vista(); else abre(null); }
  });
}

/** Lo que se mueve: el mapa 3D y lo que va encima. */
export function inicioOn(root) { mapaOn(root, profile()); }

// ---------- las colecciones en el mapa: la naturaleza, los escudos y los personajes (coleccionMapa.js) ----------
// Arriba a la izquierda, su cabecera: qué es, cuántas llevas descubiertas, sus pestañas y los botones de verla en lista y de
// volver al mapa. Abajo, en lugar de las comarcas, sus tarjetas. Y en el mapa, cada sitio con lo suyo: su pueblo o su
// comarca, con las imágenes de lo que hay allí y cuántas son. Al tocar una tarjeta, se ve dónde está (sus sitios, sus
// comarcas en primer plano y la cámara encima) y sale su botón; al tocarla otra vez, su ficha. Al tocar un sitio del
// mapa, abajo solo lo de ese sitio; al tocar fuera, todo otra vez. Lo que aún no has descubierto, con su candado y su pista
let COLX = null;
const X_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const nombreLugar = (L) => L.town ? corto(levelById(L.town) || { name: L.town }) : comarca(L.comarca)?.name || '';
/** Pone en el mapa del inicio una colección (kind: 'nature', 'escudos' o 'personajes') o la quita (null).
 *  ui: { sound, lista(), cierra() } */
export function modoColeccion(kind, ui = {}) {
  COLX?.fin(); COLX = null;
  const sec = document.querySelector('#hMapa .m3d'), def = kind && coleccionDe(kind, { sound: ui.sound });
  if (!sec || !def) return;
  const cab = sec.querySelector('.m3-col'), rail = sec.querySelector('.m3-crail');
  let tab = def.tabs?.[0]?.[0], lugar = null, elegido = null, cosas = def.cosas(tab);
  const enLugar = (c) => !lugar || (lugar.town ? c.towns.includes(lugar.town) : c.comarcas.includes(lugar.comarca));
  // (los sitios de una cosa: sus pueblos o, si no tiene, sus comarcas)
  const sitios = (c) => c.towns.length ? c.towns.map(town => ({ town })) : c.comarcas.map(comarca => ({ comarca }));
  const foto = (c, cls = '') => c.img && !c.locked ? `<img class="${cls}" src="${c.img}" alt="" loading="lazy" decoding="async">` : `<i class="${cls} cm-ic">${I(c.locked ? 'lock' : c.icon, 18)}</i>`;
  const cabeza = () => {
    const des = cosas.filter(c => !c.locked).length;
    cab.innerHTML = `<span class="mc-tt"><small>${I(def.icon, 16)}${esc(def.kicker)}</small><b>${esc(def.titulo)}</b></span>
      <span class="mc-n">${des}<small>/${cosas.length}</small></span>
      <button type="button" class="mc-b" data-collista title="Verlo en lista">${I('scroll', 20)}<span>Lista</span></button>
      <button type="button" class="mc-b mc-x" data-colx aria-label="Volver al mapa" title="Volver al mapa">${X_SVG}</button>
      ${def.tabs ? `<span class="mc-tabs">${def.tabs.map(([k, n]) => `<button type="button" data-coltab="${k}" class="${k === tab ? 'on' : ''}">${esc(n)}</button>`).join('')}</span>` : ''}
      ${lugar ? `<button type="button" class="mc-lugar" data-collugar>${I('pin', 16)}<span>${esc(nombreLugar(lugar))}</span>${X_SVG}</button>` : ''}`;
  };
  const tarjetas = () => {
    const L = cosas.filter(enLugar);
    rail.innerHTML = L.length ? L.map(c => { const on = elegido === c.id;
      return `<button type="button" class="mc-c${c.locked ? ' bloq' : ''}${on ? ' on' : ''}" data-colc="${esc(c.id)}" role="listitem">
        <span class="mc-f">${c.img ? `<img src="${c.img}" alt="" loading="lazy" decoding="async">` : I(c.icon, 44)}${c.locked ? `<i class="mc-candado">${I('lock', 22)}</i>` : ''}</span>
        <span class="mc-t"><b>${c.locked ? '¿?' : esc(c.name)}</b><small>${c.locked ? ['Por descubrir', ...sitios(c).map(nombreLugar)].map(esc).join(' · ').replace(/ · (.*)$/, (m, r) => ' · ' + r.replace(/ · /g, ', ')) : esc(c.sub)}</small></span>
        ${on && !c.locked ? `<span class="mc-ver">${I('book', 16)}<span>${esc(c.verbo)}</span></span>` : ''}</button>`; }).join('')
      : '<p class="mc-vacio">Aquí no hay nada de esta colección.</p>';
    rail.querySelector('.mc-c.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  };
  // (los marcadores: un sitio, sus imágenes, hasta tres, y cuántas son; con una cosa elegida, solo los suyos)
  const marcadores = () => {
    if (!MAPA?.coleccion) return;
    const el = elegido && cosas.find(c => c.id === elegido), grupos = new Map();
    for (const c of el ? [el] : cosas) for (const L of sitios(c)) { const k = L.town ? 't:' + L.town : 'c:' + L.comarca; if (!grupos.has(k)) grupos.set(k, { ...L, cs: [] }); grupos.get(k).cs.push(c); }
    const items = [...grupos.values()].map(g => {
      const e = document.createElement('div'), mio = lugar && (g.town ? lugar.town === g.town : lugar.comarca === g.comarca || (lugar.comarca && levelById(g.town)?.comarca === lugar.comarca));
      e.className = `m3-cm${el ? ' sel' : ''}${lugar && !mio && !el ? ' apag' : ''}`;
      e.innerHTML = `<span class="cm-fs">${g.cs.slice(0, 3).map(c => foto(c, 'cm-f')).join('')}</span><b>${esc(nombreLugar(g))}</b>${g.cs.length > 1 ? `<i class="cm-n">${g.cs.length}</i>` : ''}`;
      return { el: e, town: g.town, comarca: g.comarca, sel: !!el || !!mio };
    });
    const towns = new Set([...grupos.values()].filter(g => g.town).map(g => g.town));
    const resalta = el ? new Set(el.comarcas) : lugar ? new Set([lugar.comarca || levelById(lugar.town)?.comarca]) : null;
    MAPA.coleccion({ items, resalta, pines: towns, toque });
  };
  const pinta = () => { cabeza(); tarjetas(); marcadores(); };
  // (tocar el mapa: un pueblo o una comarca con algo, abajo solo lo suyo; fuera, todo otra vez)
  function toque(q) {
    const hay = (L) => cosas.some(c => L.town ? c.towns.includes(L.town) : c.comarcas.includes(L.comarca));
    const L = q?.town && hay({ town: q.town }) ? { town: q.town } : q?.comarca && hay({ comarca: q.comarca }) ? { comarca: q.comarca } : q?.town && hay({ comarca: levelById(q.town)?.comarca }) ? { comarca: levelById(q.town).comarca } : null;
    if (!L && !lugar && !elegido) return;
    ui.sound?.ui?.('click'); lugar = L; elegido = null; pinta();
    if (L?.comarca) MAPA?.encuadra({ comarcas: [L.comarca] }); else if (!L) MAPA?.vista();
  }
  const clic = (e) => {
    const t = e.target.closest('[data-colc],[data-coltab],[data-collista],[data-colx],[data-collugar]'); if (!t) return;
    e.stopPropagation(); const d = t.dataset;
    if (d.collista != null) return ui.lista?.();
    if (d.colx != null) return ui.cierra?.();
    ui.sound?.ui?.('click');
    if (d.coltab) { tab = d.coltab; cosas = def.cosas(tab); lugar = null; elegido = null; pinta(); MAPA?.vista(); return; }
    if (d.collugar != null) { lugar = null; elegido = null; pinta(); MAPA?.vista(); return; }
    const c = cosas.find(x => x.id === d.colc); if (!c) return;
    if (elegido === c.id && !c.locked) { Promise.resolve(c.abre?.()).then(() => { if (COLX?.vivo === vivo) { cosas = def.cosas(tab); pinta(); } }); return; }
    elegido = c.id; pinta(); MAPA?.encuadra({ comarcas: c.comarcas });   // (sus comarcas enteras: de un pueblo solo, la cámara se metía demasiado)
  };
  // (la rueda del ratón pasa las tarjetas; Escape quita lo elegido y, sin nada elegido, cierra la colección. Con una ficha
  // abierta encima, no: la cierra ella)
  const rueda = (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); rail.scrollLeft += e.deltaY; } };
  const tecla = (e) => {
    if (e.key !== 'Escape' || !sec.isConnected || document.querySelector('[role="dialog"]:not([hidden]), .sheet')) return;
    e.preventDefault(); if (lugar || elegido) { lugar = null; elegido = null; pinta(); MAPA?.vista(); } else ui.cierra?.();
  };
  const vivo = {};
  sec.addEventListener('click', clic); rail.addEventListener('wheel', rueda, { passive: false }); addEventListener('keydown', tecla);
  sec.classList.add('con-col'); sec.dataset.col = kind; cab.hidden = false; rail.hidden = false;
  MAPA?.cierraPueblo?.();
  pinta(); rail.scrollLeft = 0;
  // (toda Navarra, en el hueco que dejan la cabecera y las tarjetas: cuando ya se ha medido, que se mide cada 250 ms)
  const encaje = setTimeout(() => { if (COLX?.vivo === vivo && !lugar && !elegido) MAPA?.vista?.(); }, 320);
  COLX = { vivo, pinta, fin() {
    clearTimeout(encaje); sec.removeEventListener('click', clic); rail.removeEventListener('wheel', rueda); removeEventListener('keydown', tecla);
    MAPA?.coleccion?.(null); sec.classList.remove('con-col'); delete sec.dataset.col;
    cab.hidden = true; cab.innerHTML = ''; rail.hidden = true; rail.innerHTML = '';
  } };
}
