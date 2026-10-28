// El inicio del menú: el mapa 3D de Navarra por comarcas (mapa3d.js) a toda la pantalla, que es por donde se elige todo,
// como el mapa del mundo de un juego, con el círculo de lo conquistado, la misión de ahora y las comarcas encima; al elegir
// una comarca, su rótulo arriba; al tocar un pueblo, la cámara se acerca, se levanta su maqueta y junto a su chincheta sale
// el botón de empezar la misión. Jugando, es la pantalla de siempre: las secciones se abren encima (hub.js)
import './inicio.css';
import COMARCAS from '../data/comarcas.json';
import { LEVELS, levelById } from '../data/levels.js';
import { SITES } from '../data/dolmen.js';
import { townImg, townCover, comarcaCover, laminaUrl } from '../ui/laminas.js';
import { stampImg } from '../assets.js';
import { iconSVG } from '../ui/icons.js';
import { profile, townProgress, comarcaProgress } from '../game/profile.js';
import { esc } from '../util/html.js';
import { mapa3d } from './mapa3d.js';
import { sencillo } from '../util/sencillo.js';
import { isDidactico } from '../util/modo.js';
import { releaseStage } from './stage.js';

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
// (en el modo didáctico, el mapa vive en su sección, Mapa: sin la misión, lo conquistado ni los sellos, y cada pueblo lleva a
// su página)
let DD = false;

// ---------- el mapa 3D: el círculo de lo conquistado, las comarcas de abajo, el rótulo de la comarca y la ficha del pueblo ----------
// (un aro que se llena: f de 0 a 1)
const aro = (f, cls = '') => `<svg class="m3-aro ${cls}" viewBox="0 0 48 48" aria-hidden="true"><circle class="tr" cx="24" cy="24" r="21"/><circle class="ar" cx="24" cy="24" r="21" stroke-dasharray="${(131.9 * Math.min(1, f)).toFixed(1)} 131.9" transform="rotate(-90 24 24)"/></svg>`;
const pueblos = (n) => `${n} ${n === 1 ? 'pueblo' : 'pueblos'}`;
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
  return `${DD ? '' : `${misionHTML(p, items)}<div class="m3-tot">${aro(K.f, 'grande')}<b class="m3-pct">${pct}<small>%</small></b>
      <span class="m3-tt"><small>Navarra conquistada</small><b>${K.comp}/${K.C.length} comarcas</b><i>${I('stamp', 18)}${K.sell}/${K.tot} sellos</i></span></div>`}
    <span class="m3-ayuda" aria-hidden="true">${I('hand', 20)}<span class="fino">Arrastra para moverte · rueda para acercar · clic derecho para girar</span><span class="dedo">Arrastra para moverte · pellizca para acercar</span></span>
    <div class="m3-rail" role="list">${K.C.map(({ c, r }) => { const st = estadoC(p, c, r);
      return `<button class="m3-chip ${DD ? 'ok' : st}" data-sel="${c.id}" style="--c:${c.color}" role="listitem"><img class="m3-foto" src="${comarcaCover(c.id, true)}" alt="" loading="lazy" decoding="async"><span class="m3-sello">${aro(DD ? 1 : r.stamps / r.towns)}<img src="${stampImg(c.id)}" alt="">${st || DD ? '' : `<i class="m3-lock">${I('lock', 16)}</i>`}</span><span class="m3-ct"><b>${esc(c.name)}</b><small>${DD ? pueblos(r.towns) : `${r.stamps}/${r.towns} sellos`}</small></span></button>`; }).join('')}</div>
    <div class="m3-cb" hidden></div><div class="m3-ft" hidden aria-live="polite"></div><div class="m3-ex" hidden role="dialog" aria-label="Las comarcas de Navarra" tabindex="-1"></div>`;
}
const estadoC = (p, c, r) => r.stamps === r.towns ? 'ok' : r.done || LEVELS.some(l => l.comarca === c.id && estado(p, l)) ? 'go' : '';
// ---------- las comarcas en fotos: otra forma de recorrer Navarra, sin el mapa. Primero las doce, en tarjetas grandes con su
// foto, su sello y sus pueblos; al tocar una, sus pueblos, cada uno con su foto, cómo va y los botones de jugar y de verlo en
// el mapa. Se pasan deslizando (o con la rueda y las flechas), como un carrusel ----------
const flechas = () => `<span class="ex-fl"><button class="ex-ar" data-exdir="-1" aria-label="Anteriores">${I('back', 20)}</button><button class="ex-ar sig" data-exdir="1" aria-label="Siguientes">${I('back', 20)}</button></span>`;
const alMapa = `<button class="ex-x" data-exx aria-label="Volver al mapa">${I('map', 20)}<span>Mapa</span></button>`;
function exComarcasHTML(p) {
  const K = conquista(p);
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
// el rótulo de la comarca elegida: su sello en su aro, su nombre, sus sellos, su página y el botón de volver a toda Navarra
function bandaHTML(p, id) {
  const c = comarca(id), r = comarcaProgress(p, id); if (!c) return '';
  return `<span class="m3-sello">${aro(r.towns ? r.stamps / r.towns : 0)}<img src="${stampImg(id)}" alt=""></span>
    <span class="cb-tt"><small>Comarca</small><b>${esc(c.name)}</b><i>${DD ? pueblos(r.towns) : `${r.stamps}/${r.towns} sellos`}</i></span>
    <button class="cb-b" data-comarca="${id}" aria-label="Todo sobre ${esc(c.name)}" title="Todo sobre ${esc(c.name)}">${I('book', 20)}</button>
    <button class="cb-b" data-cierra aria-label="Ver toda Navarra" title="Ver toda Navarra"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
}
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
    <span class="ft-ms-g" style="--n:${cols}">${ms.map(m => `<i class="${m.done ? 'ok' : m === sig ? 'sig' : ''}" title="${esc(m.title)}">${I(m.icon || 'star', 16)}</i>`).join('')}</span></span>`;
}
let MAPA = null;
/** Para el mapa 3D (al cambiar de pantalla o al entrar a jugar): suelta lo suyo y deja libre el renderizador. */
export function cierraMapa() { MAPA?.dispose(); MAPA = null; }
// (al darle a jugar en un pueblo con el mapa a la vista: el vuelo hasta él; una promesa, o null si no hay)
export const entraMapa = (id) => MAPA?.entrar?.(id) || null;
/** El inicio, como la pantalla del mapa del mundo de un juego: Navarra en 3D a toda la pantalla y, encima, la misión de
 *  ahora con su botón de continuar, lo conquistado y las comarcas. */
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
  const hub = sec.closest('#hub'), aqui = sec.dataset.pantalla || 'home', tapado = () => !!hub && ((hub.dataset.screen || 'home') !== aqui || hub.classList.contains('menu-on'));
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
  const towns = LEVELS.map(l => { const xy = OPC.xy(l); return xy && { id: l.id, name: corto(l), comarca: l.comarca, sx: xy[0], sy: xy[1], state: DD ? '' : estado(p, l), pct: ((t) => t.total ? t.done / t.total : 0)(townProgress(p, l)), bosque: !!l.bosque, here: l.id === p.last }; }).filter(Boolean);
  const comarcas = COMARCAS.filter(c => c.path).map(c => { const r = comarcaProgress(p, c.id); return { id: c.id, name: c.name, color: c.color, path: c.path, pct: !DD && r.towns ? r.pct : 0, done: !DD && !!r.towns && r.stamps === r.towns, stamps: r.stamps, towns: r.towns || 0 }; });
  // (lo que tapa lo de encima: arriba, la fila del HUD (lo conquistado, la misión de ahora y el rótulo de la comarca); abajo,
  // las comarcas y, en el móvil de pie, la misión; y la ficha del pueblo, que deja el pueblo a su izquierda o, en el móvil de
  // pie, encima de ella. Medido cada poco)
  let hu = null, huT = 0;
  const hueco = () => {
    const now = performance.now(); if (hu && now - huT < 250) return hu; huT = now;
    const a = sec.getBoundingClientRect(), k = a.height / (sec.clientHeight || 1) || 1, R = sec.querySelector('.m3-rail');
    let t = 0, r = 0, b = 0;
    if (R?.offsetParent) b = (a.bottom - R.getBoundingClientRect().top) / k + 8;
    for (const e of [sec.querySelector('.m3-tot'), sec.querySelector('.m3-mision'), banda]) if (e && !e.hidden && e.offsetParent) {
      const q = e.getBoundingClientRect(); if (q.top < a.top + a.height * 0.5) t = Math.max(t, (q.bottom - a.top) / k + 8); else b = Math.max(b, (a.bottom - q.top) / k + 8);
    }
    if (!ficha.hidden) { if (a.width / k < ESTRECHA) b = Math.max(b, ficha.offsetHeight + 64 + 2 * m); else r = ficha.offsetWidth + padR() + 40 + m; }
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
    try { MAPA = mapa3d(sec, { comarcas, towns, hueco, icono: (n) => I(n, 16), tapa: '.m3-tot, .m3-rail, .m3-pad, .m3-cb, .m3-ft, .m3-mision, .hub-menu-btn', onSelect: abre, onTown: pueblo, sigue, falla, pausado: () => !ex.hidden || tapado(), ligero: sencillo(), intro: !DD, abiertas: DD }); }
    catch (e) { console.error('mapa 3D', e); (window.__errors ||= []).push('mapa 3D: ' + (e?.message || e)); MAPA = null; }
    if (!MAPA) sin3d();
  };
  monta();
  // (lo que mide lo conquistado, para que en el móvil tumbado lo de arriba empiece justo a su lado, en cualquier idioma)
  const tot = sec.querySelector('.m3-tot'); if (tot) new ResizeObserver(() => sec.style.setProperty('--totw', tot.offsetWidth + 'px')).observe(tot);
  const mis = sec.querySelector('.m3-mision'); if (mis) new ResizeObserver(() => sec.style.setProperty('--misw', mis.offsetWidth + 'px')).observe(mis);
  sec.addEventListener('click', (e) => {
    const ch = e.target.closest('[data-sel]'); if (ch) { if (MAPA) MAPA.select(ch.dataset.sel); else abreEx(ch.dataset.sel); return; }
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
