// El inicio del menú, como la primera página de un libro de aventuras: el saludo con el buscador, el destacado grande
// (su lámina, el título, el botón de jugar y las flechas para pasar al siguiente, con tu personaje saliendo por fuera del
// marco), la columna de lo que hay ahora en Navarra (la fila marcada es la del destacado), el reino de Navarra (el mapa
// en pergamino con sus doce capítulos, uno por comarca, y en cada capítulo sus pantallas, una por pueblo), los personajes
// de leyenda y «Descubre Navarra» con sus pestañas y sus flechas. Todo con lo del juego: sus pueblos, bosques,
// yacimientos, leyendas y campeonatos
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

const I = (n, s = 24) => iconSVG(n, s);
const ROMANO = (n) => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'][n - 1] || String(n);
// (el adorno de los títulos: dos trazos con un rombo, como en los mapas antiguos)
const ADORNO = '<svg class="ep-orla" viewBox="0 0 64 12" aria-hidden="true"><path d="M0 6h24M40 6h24" stroke="currentColor" stroke-width="1.5"/><path d="M32 1l5 5-5 5-5-5z" fill="currentColor"/><circle cx="20" cy="6" r="1.6" fill="currentColor"/><circle cx="44" cy="6" r="1.6" fill="currentColor"/></svg>';
const titulo = (ic, t, mas = '') => `<h2 class="ini-h ep-h">${I(ic, 26)}<span>${t}</span>${ADORNO}${mas}</h2>`;
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

// ---------- el reino de Navarra: los capítulos (comarcas) y sus pantallas (pueblos y bosques) ----------
const CAPS = () => COMARCAS.filter(c => comarcaTowns(c.id).length);
const estadoDe = (p, l) => { const t = townProgress(p, l); return t.stamp ? 'ok' : t.done || p.towns[l.id]?.visits ? 'go' : ''; };
// (un capítulo: su lámina con el número y el nombre, cuánto llevas y sus pantallas, cada una con su portada y su número)
function capitulo(c, p) {
  const k = CAPS().indexOf(c) + 1, ts = comarcaTowns(c.id), pr = comarcaProgress(p, c.id);
  const est = { ok: ['stamp', 'Sellado'], go: ['compass', 'En camino'], '': ['star', 'Por descubrir'] };
  // (la lámina entera, en 16:9, a la derecha; el número y el nombre a su izquierda, sobre la misma lámina difuminada)
  const lam = comarcaCover(c.id, true) || townImg(ts[0], true);
  return `<div class="ic-banner" style="--c:${c.color};--bg:url(${lam})">
      <span class="ic-num">Capítulo ${ROMANO(k)}</span><b class="ic-name">${esc(c.name)}</b>
      <span class="ic-meta">${I('church', 20)}${ts.length} pantallas · ${pr.stamps} ${pr.stamps === 1 ? 'sello' : 'sellos'}</span>
      <img class="ic-foto" src="${lam}" alt="" decoding="async"><img class="ic-sello${pr.stamps ? '' : ' gris'}" src="${stampImg(c.id)}" alt=""></div>
    <i class="ic-barra" style="--c:${c.color}"><u style="width:${Math.round(pr.stamps / ts.length * 100)}%"></u></i>
    <div class="ic-towns">${ts.map((l, i) => { const e = estadoDe(p, l), [ic, tx] = est[e];
      return `<button class="ic-town ${e}" data-town="${l.id}" style="--d:${(i * 0.04).toFixed(2)}s"><span class="ic-img"><img src="${townImg(l, true)}" alt="" loading="lazy" decoding="async"><i class="ic-n">${i + 1}</i>${l.bosque ? `<i class="ic-bq">${I('tree', 18)}</i>` : ''}</span><b>${esc(corto(l))}</b><small>${I(ic, 16)}${tx}</small></button>`; }).join('')}</div>
    <button class="ep-btn" data-comarca="${c.id}">${I('map', 22)}<span>Ver la comarca</span></button>`;
}
// (el capítulo que se abre al entrar: el del último pueblo jugado o el primero sin sellar)
const capInicial = (p) => { const l = levelById(p.last); return CAPS().find(c => c.id === l?.comarca) || CAPS().find(c => comarcaProgress(p, c.id).stamps < comarcaTowns(c.id).length) || CAPS()[0]; };
function reino(p) {
  const caps = CAPS(), sel = capInicial(p), pueblos = LEVELS.filter(l => !l.bosque).length, bosques = LEVELS.filter(l => l.bosque).length;
  const sellos = LEVELS.filter(l => townProgress(p, l).stamp).length;
  const cifra = (ic, n, t) => `<span>${ic}<b>${n}</b><small>${t}</small></span>`;
  return `<section class="ini-reino">
      <div class="ir-head">${titulo('map', 'El reino de Navarra')}
        <p class="ir-lead">Cada comarca es un capítulo y cada pueblo, una pantalla. Elige en el mapa adónde viajar.</p>
        <div class="ir-cifras">${cifra(I('shield', 28), caps.length, 'capítulos')}${cifra(I('church', 28), pueblos, 'pueblos')}${cifra(I('tree', 28), bosques, 'bosques')}${cifra(`<img src="${stampImg(sel.id)}" alt="">`, sellos, sellos === 1 ? 'sello' : 'sellos')}</div></div>
      <div class="ir-tabs" role="tablist">${caps.map((c, i) => { const pr = comarcaProgress(p, c.id);
        return `<button role="tab" class="ir-tab${c === sel ? ' on' : ''}" data-cap="${c.id}" aria-selected="${c === sel}" style="--c:${c.color}"><i>${ROMANO(i + 1)}</i><img src="${stampImg(c.id)}" alt=""><span><b>${esc(c.name)}</b><small>${pr.stamps}/${comarcaTowns(c.id).length}</small></span></button>`; }).join('')}</div>
      <div class="ir-body">
        <div class="ir-mapa" data-sel="${sel.id}">${OPC.mapa ? OPC.mapa() : ''}<span class="ir-cartela" data-notr><small>Nafarroa</small><b>Navarra</b></span>${ROSA}</div>
        <div class="ir-cap" aria-live="polite">${capitulo(sel, p)}</div>
      </div>
    </section>`;
}
// (la rosa de los vientos de la esquina del mapa)
const ROSA = '<svg class="ir-rosa" viewBox="-50 -50 100 100" aria-hidden="true"><circle r="34" fill="none" stroke="currentColor" stroke-width="1.2"/><circle r="27" fill="none" stroke="currentColor" stroke-width=".8" stroke-dasharray="2 3"/><path d="M0-46L7 0 0 46-7 0z" fill="currentColor"/><path d="M-46 0L0-7 46 0 0 7z" fill="currentColor" opacity=".7"/><path d="M0-46L7 0H-7z" fill="#a8322d"/><text y="-36" text-anchor="middle" font-size="11" fill="currentColor">N</text></svg>';

// ---------- el buscador: pueblos, bosques y yacimientos ----------
const QUITA = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function buscar(q) {
  q = QUITA(q.trim()); if (q.length < 2) return [];
  const r = LEVELS.filter(l => QUITA(l.name).includes(q)).map(l => ({ id: l.id, img: townCover(l.id, true), t: corto(l), s: l.bosque ? 'Bosque' : comarca(l.comarca)?.name || '' }));
  for (const S of Object.values(SITES)) if (S.town && QUITA((S.title || '') + ' ' + (S.lugar || '')).includes(q)) { const l = levelById(S.town); if (l) r.push({ id: l.id, img: townCover(l.id, true), t: S.title || S.whatTitle, s: 'Yacimiento · ' + corto(l) }); }
  return r.slice(0, 7);
}

// (lo que pone el menú: el icono de cada misión y las misiones que tocan por la edad; hub.js)
let OPC = { icono: () => 'star', slots: (l) => (l.missions || []).map((m, si) => ({ m, si })) };
/** El principio del inicio: el saludo, el destacado con su columna, los personajes y «Descubre Navarra». */
export function inicioHTML(opc) {
  if (opc) OPC = { ...OPC, ...opc };
  const p = profile(), items = ahora(p), it = items[0];
  inicioHTML.items = items;
  const pop = avatarPortrait(p.avatar, 'hero');
  return `<div class="ini-epic"><header class="ini-head">
      <span class="ini-me"><img src="${avatarPortrait(p.avatar)}" alt=""></span><span class="ini-hola"><small>Kaixo,</small><b>${esc(p.name || 'Aventurero')}</b></span>
      <label class="ini-busca">${I('search', 22)}<input type="search" placeholder="Busca un pueblo o un yacimiento" aria-label="Buscar en Navarra" autocomplete="off"><span class="ib-res" hidden></span></label>
      <button class="ini-sq" data-go="map" aria-label="Mapa">${I('map', 28)}</button>
    </header>
    <section class="ini-top">
      <div class="ini-hero" data-i="0">${destacado(it, p)}${pop ? `<img class="ih-pop" src="${pop}" alt="" aria-hidden="true">` : ''}</div>
      <aside class="ini-live">${titulo('compass', 'Ahora en Navarra')}
        <ul>${items.map((x, i) => `<li class="${i ? '' : 'on'}" data-i="${i}" style="--t:var(--k-${x.tone})"><button class="il-pick" data-i="${i}" aria-label="${esc(x.title)}"><img src="${x.thumb}" alt="" loading="lazy" decoding="async"><span><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span></button><button class="il-btn" ${x.attr}>${esc(x.btn)}</button></li>`).join('')}</ul>
      </aside>
    </section>
    ${reino(p)}
    <section class="ini-people">${titulo('legend', 'Personajes de leyenda', '<button class="lnk sec-more" data-go="personajes">Ver todos</button>')}
      <div class="ip-rail">${FIGURAS.filter(f => figuraRecorte(f.id)).map(f => `<button class="ip" data-figura="${f.id}"><span class="ip-av"><img src="${figuraRecorte(f.id)}" alt="" loading="lazy" decoding="async"></span><span class="ip-tx"><b>${esc(f.name)}</b><small>${esc(f.where.split(' · ')[0])}</small></span></button>`).join('')}</div>
    </section>
    <section class="ini-games"><div class="ig-head">${titulo('compass', 'Descubre Navarra')}<span class="ig-arrows"><button class="ig-arrow" data-dir="-1" aria-label="Anteriores">${I('back', 22)}</button><button class="ig-arrow sig" data-dir="1" aria-label="Siguientes">${I('back', 22)}</button></span></div>
      <div class="ig-tabs" role="tablist">${PESTANAS.map(([k, ic, t], i) => `<button role="tab" data-tab="${k}" aria-selected="${!i}" class="${i ? '' : 'on'}">${I(ic, 22)}<span>${t}</span></button>`).join('')}</div>
      <div class="ig-cards">${tarjetas('pueblos', p)}</div>
    </section></div>`;
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

/** Lo que se mueve: elegir fila, las flechas del destacado y de las tarjetas, las pestañas y el buscador. */
export function inicioOn(root) {
  const p = profile(), items = inicioHTML.items || [], hero = root.querySelector('.ini-hero'); if (!hero) return;
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
  // (el reino: un capítulo se abre con su pestaña o tocando su comarca en el mapa, sin salir del inicio; los pueblos del
  // mapa y las pantallas abren la ficha del pueblo, como en el resto del menú)
  const mapa = root.querySelector('.ir-mapa'), cap = root.querySelector('.ir-cap');
  if (mapa && cap) {
    mapa.querySelectorAll('.cnum text').forEach((t, i) => { t.textContent = ROMANO(i + 1); });
    const abre = (id) => {
      const c = CAPS().find(x => x.id === id); if (!c || mapa.dataset.sel === id) return;
      mapa.dataset.sel = id; cap.innerHTML = capitulo(c, p);
      cap.classList.remove('cambia'); void cap.offsetWidth; cap.classList.add('cambia');
      root.querySelectorAll('.ir-tab').forEach(b => { const on = b.dataset.cap === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); if (on) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); });
      marca();
    };
    const marca = () => mapa.querySelectorAll('.cpath, .cnum').forEach(x => x.classList.toggle('sel', x.dataset.comarca === mapa.dataset.sel));
    mapa.addEventListener('click', (e) => { const z = e.target.closest('.cpath, .cnum'); if (!z) return; e.stopPropagation(); abre(z.dataset.comarca); }, true);
    root.querySelectorAll('.ir-tab').forEach(b => b.onclick = () => abre(b.dataset.cap));
    marca();
  }
  // (el buscador: lo que coincide, con su portada; Intro abre el primero)
  const inp = root.querySelector('.ini-busca input'), res = root.querySelector('.ib-res');
  const pinta = () => { const r = buscar(inp.value); res.hidden = !inp.value.trim();
    res.innerHTML = r.length ? r.map(x => `<button type="button" data-town="${x.id}">${x.img ? `<img src="${x.img}" alt="">` : I('church', 30)}<span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span></button>`).join('') : `<span class="ib-no">No hay nada con ese nombre</span>`; };
  inp.addEventListener('input', pinta);
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') res.querySelector('[data-town]')?.click(); if (e.key === 'Escape') { inp.value = ''; pinta(); } });
}
