// El inicio del menú: arriba, a toda la pantalla, el mapa 3D de Navarra por comarcas (mapa3d.js), con el saludo, el
// buscador, el círculo de lo conquistado y las comarcas encima, como en un juego; al elegir una comarca, su panel con sus
// pueblos, sus fotos y sus misiones. Debajo, el destacado grande (su lámina, el título, el botón de jugar y las flechas
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

// ---------- el buscador: pueblos, bosques y yacimientos ----------
const QUITA = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function buscar(q) {
  q = QUITA(q.trim()); if (q.length < 2) return [];
  const r = LEVELS.filter(l => QUITA(l.name).includes(q)).map(l => ({ id: l.id, img: townCover(l.id, true), t: corto(l), s: l.bosque ? 'Bosque' : comarca(l.comarca)?.name || '' }));
  for (const S of Object.values(SITES)) if (S.town && QUITA((S.title || '') + ' ' + (S.lugar || '')).includes(q)) { const l = levelById(S.town); if (l) r.push({ id: l.id, img: townCover(l.id, true), t: S.title || S.whatTitle, s: 'Yacimiento · ' + corto(l) }); }
  return r.slice(0, 7);
}

// (lo que pone el menú: el icono de cada misión, las misiones que tocan por la edad, dónde cae cada pueblo en el mapa de
// comarcas y el mapa plano, para cuando no hay 3D; hub.js)
let OPC = { icono: () => 'star', slots: (l) => (l.missions || []).map((m, si) => ({ m, si })), xy: () => null, plano: () => '' };

// ---------- el mapa 3D: el círculo de lo conquistado, las comarcas de abajo y el panel de la comarca elegida ----------
// (un aro que se llena: f de 0 a 1)
const aro = (f, cls = '') => `<svg class="m3-aro ${cls}" viewBox="0 0 48 48" aria-hidden="true"><circle class="tr" cx="24" cy="24" r="21"/><circle class="ar" cx="24" cy="24" r="21" stroke-dasharray="${(131.9 * Math.min(1, f)).toFixed(1)} 131.9" transform="rotate(-90 24 24)"/></svg>`;
const estado = (p, l) => { const t = townProgress(p, l); return t.stamp ? 'ok' : t.done || p.towns[l.id]?.visits ? 'go' : ''; };
function conquista(p) {
  const C = COMARCAS.map(c => ({ c, r: comarcaProgress(p, c.id) })).filter(x => x.r.towns);
  const sell = C.reduce((a, x) => a + x.r.stamps, 0), tot = C.reduce((a, x) => a + x.r.towns, 0), comp = C.filter(x => x.r.stamps === x.r.towns).length;
  return { C, sell, tot, comp, f: tot ? sell / tot : 0 };
}
function mapaHTML(p) {
  const K = conquista(p), pct = Math.round(K.f * 100);
  return `<div class="m3-tot">${aro(K.f, 'grande')}<b class="m3-pct">${pct}<small>%</small></b>
      <span class="m3-tt"><small>Navarra conquistada</small><b>${K.comp}/${K.C.length} comarcas</b><i>${I('stamp', 18)}${K.sell}/${K.tot} sellos</i></span></div>
    <span class="m3-ayuda" aria-hidden="true">${I('hand', 20)}<span class="fino">Arrastra para moverte · rueda para acercar · clic derecho para girar</span><span class="dedo">Arrastra para moverte · pellizca para acercar</span></span>
    <div class="m3-rail" role="list">${K.C.map(({ c, r }) => { const st = r.stamps === r.towns ? 'ok' : r.done || LEVELS.some(l => l.comarca === c.id && estado(p, l)) ? 'go' : '';
      return `<button class="m3-chip ${st}" data-sel="${c.id}" style="--c:${c.color}" role="listitem"><span class="m3-sello">${aro(r.stamps / r.towns)}<img src="${stampImg(c.id)}" alt="">${st ? '' : `<i class="m3-lock">${I('lock', 16)}</i>`}</span><span class="m3-ct"><b>${esc(c.name)}</b><small>${r.stamps}/${r.towns} sellos</small></span></button>`; }).join('')}</div>
    <aside class="m3-panel" hidden></aside>`;
}
function panelHTML(p, id) {
  const c = comarca(id), r = comarcaProgress(p, id), ts = comarcaTowns(id); if (!c) return '';
  return `<header class="m3p-head" style="--c:${c.color}">${(u => u ? `<img class="m3p-bg" src="${u}" alt="" decoding="async">` : '')(comarcaCover(id, true) || townCover(ts[0]?.id, true))}
      <button class="m3p-x" data-cierra aria-label="Cerrar">${I('close', 22)}</button>
      <span class="m3-sello grande">${aro(r.towns ? r.stamps / r.towns : 0)}<img src="${stampImg(id)}" alt=""></span>
      <span class="m3p-tt"><small>Comarca</small><b>${esc(c.name)}</b><i>${r.stamps}/${r.towns} sellos · ${Math.round(r.pct * 100)}% misiones</i></span></header>
    <div class="m3p-towns">${ts.map(l => { const st = estado(p, l), done = p.towns[l.id]?.done || {}, t = townProgress(p, l);
      const ms = OPC.slots(l).map(({ m, si }) => `<i class="${done[si] ? 'ok' : ''}">${I(OPC.icono(m) || 'star', 18)}</i>`).join('');
      return `<article class="m3t ${st}" data-t="${l.id}">
        <button class="m3t-img" data-town="${l.id}" aria-label="Ficha de ${esc(corto(l))}">${(u => u ? `<img src="${u}" alt="" loading="lazy" decoding="async">` : I(l.bosque ? 'tree' : 'church', 40))(townCover(l.id, true) || townImg(l))}<span class="m3t-st">${I(st === 'ok' ? 'stamp' : st === 'go' ? 'exclaim' : l.bosque ? 'tree' : 'compass', 18)}</span></button>
        <span class="m3t-tx"><b>${esc(corto(l))}</b><small>${l.bosque ? 'Bosque · ' : ''}${t.done}/${t.total} misiones</small><span class="m3t-ms">${ms}</span></span>
        <button class="m3t-go" data-play="${l.id}" aria-label="Jugar en ${esc(corto(l))}">${I('play', 26)}</button></article>`; }).join('')}</div>
    <button class="m3p-more" data-comarca="${id}">${I('map', 22)}<span>Toda la comarca</span></button>`;
}
let MAPA = null;
/** Para el mapa 3D (al cambiar de pantalla o al entrar a jugar): suelta lo suyo y deja libre el renderizador. */
export function cierraMapa() { MAPA?.dispose(); MAPA = null; }
/** El principio del inicio: el saludo, el destacado con su columna, los personajes y «Descubre Navarra». */
export function inicioHTML(opc) {
  if (opc) OPC = { ...OPC, ...opc };
  const p = profile(), items = ahora(p), it = items[0];
  inicioHTML.items = items;
  const pop = avatarPortrait(p.avatar, 'hero');
  return `<section class="m3d">${mapaHTML(p)}<header class="ini-head">
      <span class="ini-me"><img src="${avatarPortrait(p.avatar)}" alt=""></span><span class="ini-hola"><small>Kaixo,</small><b>${esc(p.name || 'Aventurero')}</b></span>
      <label class="ini-busca">${I('search', 22)}<input type="search" placeholder="Busca un pueblo o un yacimiento" aria-label="Buscar en Navarra" autocomplete="off"><span class="ib-res" hidden></span></label>
      <button class="ini-sq" data-go="map" aria-label="Mapa">${I('map', 28)}</button>
    </header></section>
    <section class="ini-top">
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

// el mapa 3D y lo de encima: las comarcas de abajo lo llevan a cada una, y el panel sale con sus pueblos
function mapaOn(root, p) {
  const sec = root.querySelector('.m3d'); if (!sec) return;
  cierraMapa();
  const panel = sec.querySelector('.m3-panel');
  const abre = (id) => {
    sec.querySelectorAll('.m3-chip').forEach(b => b.classList.toggle('on', b.dataset.sel === id));
    sec.classList.toggle('con-sel', !!id);
    huT = 0;
    if (!id) { panel.hidden = true; panel.innerHTML = ''; return; }
    if (panel.dataset.c !== id || panel.hidden) { panel.dataset.c = id; panel.innerHTML = panelHTML(p, id); panel.hidden = false; panel.classList.remove('entra'); void panel.offsetWidth; panel.classList.add('entra'); }
  };
  const towns = LEVELS.map(l => { const xy = OPC.xy(l); return xy && { id: l.id, name: corto(l), comarca: l.comarca, sx: xy[0], sy: xy[1], state: estado(p, l), bosque: !!l.bosque, here: l.id === p.last }; }).filter(Boolean);
  const comarcas = COMARCAS.filter(c => c.path).map(c => { const r = comarcaProgress(p, c.id); return { id: c.id, name: c.name, color: c.color, path: c.path, pct: r.towns ? r.pct : 0, done: !!r.towns && r.stamps === r.towns, stamps: r.stamps, towns: r.towns || 0 }; });
  // (lo que tapa lo de encima: el saludo arriba, las comarcas abajo y el panel a la derecha o, en el móvil de pie, abajo;
  // medido cada poco, no en cada imagen)
  let hu = null, huT = 0;
  const hueco = () => {
    const now = performance.now(); if (hu && now - huT < 250) return hu; huT = now;
    const a = sec.getBoundingClientRect(), k = a.height / (sec.clientHeight || 1) || 1, H = sec.querySelector('.ini-head')?.getBoundingClientRect(), R = sec.querySelector('.m3-rail');
    let t = H ? (H.bottom - a.top) / k + 8 : 0; const rr = R && R.offsetParent ? R.getBoundingClientRect() : null;
    let r = 0, b = rr ? (a.bottom - rr.top) / k + 8 : 0;
    if (!panel.hidden) { const q = panel.getBoundingClientRect(); if (q.width > a.width * 0.7) b = Math.max(b, (a.bottom - q.top) / k + 8); else r = (a.right - q.left) / k + 8; }
    // (con una comarca elegida, también el círculo de lo conquistado, para que nada de ella quede debajo)
    const T2 = sec.querySelector('.m3-tot'); if (!panel.hidden && T2?.offsetParent) t = Math.max(t, (T2.getBoundingClientRect().bottom - a.top) / k + 8);
    return (hu = { t, r, b });
  };
  MAPA = mapa3d(sec, { comarcas, towns, hueco, tapa: '.ini-head, .m3-tot, .m3-rail, .m3-pad, .m3-panel', onSelect: abre,
    onTown: (id) => { const card = panel.querySelector(`[data-t="${id}"]`), list = panel.querySelector('.m3p-towns'); if (!card) return;
      panel.querySelectorAll('.m3t.on').forEach(x => x.classList.remove('on')); card.classList.add('on');
      list.scrollTo({ top: card.offsetTop - list.offsetTop - 8, left: card.offsetLeft - list.offsetLeft - 8, behavior: 'smooth' }); } });
  // (lo que mide lo conquistado, para que en el móvil tumbado el buscador empiece justo a su lado, en cualquier idioma)
  const tot = sec.querySelector('.m3-tot'); if (tot) new ResizeObserver(() => sec.style.setProperty('--totw', tot.offsetWidth + 'px')).observe(tot);
  if (!MAPA) { sec.classList.add('plano'); sec.insertAdjacentHTML('afterbegin', `<div class="m3-plano">${OPC.plano()}</div>`); }
  sec.addEventListener('click', (e) => {
    const ch = e.target.closest('[data-sel]'); if (ch) { if (MAPA) MAPA.select(ch.dataset.sel); else abre(ch.dataset.sel); return; }
    if (e.target.closest('[data-cierra]')) { if (MAPA) MAPA.vista(); else abre(null); }
  });
}

/** Lo que se mueve: el mapa 3D, elegir fila, las flechas del destacado y de las tarjetas, las pestañas y el buscador. */
export function inicioOn(root) {
  const p = profile(), items = inicioHTML.items || [], hero = root.querySelector('.ini-hero'); if (!hero) return;
  mapaOn(root, p);
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
  // (el buscador: lo que coincide, con su portada; Intro abre el primero)
  const inp = root.querySelector('.ini-busca input'), res = root.querySelector('.ib-res');
  const pinta = () => { const r = buscar(inp.value); res.hidden = !inp.value.trim();
    res.innerHTML = r.length ? r.map(x => `<button type="button" data-town="${x.id}">${x.img ? `<img src="${x.img}" alt="">` : I('church', 30)}<span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span></button>`).join('') : `<span class="ib-no">No hay nada con ese nombre</span>`; };
  inp.addEventListener('input', pinta);
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') res.querySelector('[data-town]')?.click(); if (e.key === 'Escape') { inp.value = ''; pinta(); } });
}
