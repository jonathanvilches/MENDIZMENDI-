// Centro de mando: inicio, mapa de Navarra, comarcas, pueblos, cimas, naturaleza, personajes, insignias, pasaporte y perfil.
import COMARCAS from '../data/comarcas.json';
import MOUNTAINS from '../data/mountains.json';
import { CAST as AVATARS, STAT_LABELS, castById } from '../data/cast.js';
import FOLKLORE from '../data/folklore.json';
import SETTLEMENTS from '../data/settlements.json';
import { LEVELS, levelById } from '../data/levels.js';
import { iconSVG, speciesIcon } from '../ui/icons.js';
import { avatarPortrait, portraitImg, avatarPortraitImg } from '../ui/portraits.js';
import { stampImg, landImg } from '../assets.js';
import { Stage } from './stage.js';
import { GLB_AVATARS, setMio } from '../actors/glbChar.js';
import { MIO_BASES, MIO_FEMALE, SKINS, HAIRS, CLOTH, HATS, defaultMio } from '../actors/miAvatar.js';
import { OUTFITS, setOutfitChoices } from '../actors/outfits.js';
import { getLang, setLang } from '../i18n.js';
import { dioramaShot } from './diorama.js';
import { profile, saveProfile, levelOf, rankOf, townProgress, comarcaProgress, comarcaTowns, navarraProgress, stampCount, BADGES, checkBadges, resetProfile, salazarState } from '../game/profile.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const I = (n, s = 24, c = '') => iconSVG(n, s, c);
const comarca = (id) => COMARCAS.find(c => c.id === id);
const TYPE_NAME = { visit: 'Visita', process: 'Producto', harvest: 'Cosecha', herd: 'Ganadería', dance: 'Danza', carnival: 'Carnaval', trade: 'Oficio', legend: 'Leyenda', race: 'Carrera', observe: 'Naturaleza', tradition: 'Tradición', quiz: 'Preguntas', summit: 'Montaña', pelota: 'Pelota', figure: 'Personajes', feria: 'Feria', dolmen: 'Arqueología', castle: 'Castillo', mirador: 'Mirador' };
const TYPE_ICON = { visit: 'church', process: 'basket', harvest: 'wheat', herd: 'sheep', dance: 'dance', carnival: 'mask', trade: 'anvil', legend: 'legend', race: 'running', observe: 'binoculars', tradition: 'music', quiz: 'quiz', summit: 'peak', pelota: 'pelota', figure: 'person', feria: 'cow', dolmen: 'dolmen', castle: 'castle', mirador: 'binoculars' };
// Proyección de coordenadas geográficas al mapa de comarcas
const proj = (lat, lon) => [19 + (lon + 2.52) / 1.80 * 709, 17 + (43.325 - lat) / 1.43 * 765];
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
function townXY(lv) {
  const names = (lv.mapName || lv.name).split('/').map(s => norm(s));
  const hit = SETTLEMENTS.find(s => names.includes(norm(s[2])) || norm(s[2]).startsWith(names[0])) || SETTLEMENTS.find(s => names.some(n => norm(s[2]).includes(n)));
  if (hit) return proj(hit[0], hit[1]);
  const c = comarca(lv.comarca); return c ? [c.label.x, c.label.y + 20] : [380, 400];
}
const XY = new Map(LEVELS.map(l => [l.id, townXY(l)]));
// Colocación sin solapes: número de cada comarca en un hueco libre dentro de ella y nombres de pueblo
// sólo donde caben (arriba, abajo o a un lado del punto)
let MAPL = null;
function mapLayout() {
  if (MAPL) return MAPL;
  const cv = document.createElement('canvas').getContext('2d');
  const pins = LEVELS.map(l => XY.get(l.id));
  const badges = {}, placed = [];
  for (const c of COMARCAS) {
    if (!comarcaTowns(c.id).length) continue;
    const path = new Path2D(c.path), cx = c.label.x, cy = c.label.y - 4;
    let best = [cx, cy], bs = -1e9;
    for (let r = 0; r <= 110; r += 5) for (let a = 0; a < 6.283; a += r ? 0.35 : 7) {
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (!cv.isPointInPath(path, x, y)) continue;
      let dmin = 99; for (const p of pins) dmin = Math.min(dmin, Math.hypot(p[0] - x, p[1] - y)); for (const q of placed) dmin = Math.min(dmin, Math.hypot(q[0] - x, q[1] - y) - 12);
      // lejos de los puntos (≥ 28) y lo más cerca posible del centro de la comarca
      const score = Math.min(dmin, 30) * 3 - r * 0.25;
      if (score > bs) { bs = score; best = [x, y]; }
    }
    badges[c.id] = best; placed.push(best);
  }
  const boxes = [];
  for (const p of pins) boxes.push([p[0] - 10, p[1] - 10, p[0] + 10, p[1] + 10]);
  for (const b of Object.values(badges)) boxes.push([b[0] - 20, b[1] - 20, b[0] + 20, b[1] + 20]);
  const hit = (r) => boxes.some(b => r[0] < b[2] && r[2] > b[0] && r[1] < b[3] && r[3] > b[1]);
  const names = {};
  for (const l of LEVELS) {
    const [x, y] = XY.get(l.id), t = l.name.split(' /')[0], w = t.length * 6.7 + 4, h = 14;
    const cand = [[x - w / 2, y - 12 - h, 'middle', x, y - 14], [x - w / 2, y + 12, 'middle', x, y + 23], [x + 11, y - h / 2, 'start', x + 12, y + 4], [x - 11 - w, y - h / 2, 'end', x - 12, y + 4]];
    for (const [rx, ry, anchor, tx, ty] of cand) { const r = [rx, ry, rx + w, ry + h]; if (rx < 12 || rx + w > 733 || hit(r)) continue; boxes.push(r); names[l.id] = { anchor, x: tx - x, y: ty - y }; break; }
  }
  return (MAPL = { badges, names });
}

function ring(p, size = 54, color = '#FFD700', label = '') {
  const r = size / 2 - 5, C = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="6"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C * p} ${C}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="${size * 0.26}" font-weight="900">${label || Math.round(p * 100) + '%'}</text></svg>`;
}
function spark(profile, w = 160, h = 44) {
  if (!profile?.length) return '';
  const xs = profile.map(p => p[0]), ys = profile.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const P = profile.map(([x, y]) => [(x - x0) / (x1 - x0 || 1) * w, h - 4 - (y - y0) / (y1 - y0 || 1) * (h - 8)]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="M0 ${h} ${P.map(p => 'L' + p.join(' ')).join(' ')} L${w} ${h}Z" fill="rgba(143,209,106,.25)"/><path d="M${P.map(p => p.join(' ')).join(' L')}" fill="none" stroke="#8fd16a" stroke-width="2.5"/></svg>`;
}

export class Hub {
  constructor({ sound, onPlay }) {
    this.sound = sound; this.onPlay = onPlay;
    this.root = el(`<div id="hub"><div class="hub-bg"><div class="bgimg"></div>${Array.from({ length: 12 }, (_, i) => `<i class="mote" style="left:${(i * 37) % 100}%;animation-delay:${-i * 1.7}s;animation-duration:${16 + (i % 5) * 3}s"></i>`).join('')}</div>
      <header class="hub-top"><div class="brand logo">MENDIMENDIZ</div><div class="chip" id="hChip"></div></header>
      <nav class="hub-nav" id="hNav"></nav><main class="hub-main" id="hMain"></main></div>`);
    document.body.appendChild(this.root);
    // secciones: las principales siempre a la vista; las demás, en «Más» cuando falta sitio (móvil)
    this.nav = [['home', 'Inicio', 'home'], ['map', 'Mapa', 'map'], ['towns', 'Pueblos', 'church'], ['avatars', 'Personajes', 'person'], ['peaks', 'Cimas', 'peak', 1], ['nature', 'Naturaleza', 'leaf', 1], ['badges', 'Insignias', 'badge', 1], ['passport', 'Pasaporte', 'stamp', 1], ['profile', 'Perfil', 'gear', 1]];
    this.MORE = { peaks: 'Montañas de Navarra con su perfil', nature: 'Fauna, árboles, plantas y flores', badges: 'Tus logros', passport: 'Los sellos de tus pueblos', profile: 'Nombre, nivel y ajustes' };
    $('#hNav', this.root).innerHTML = this.nav.map(([id, n, ic, sec]) => `<button data-s="${id}" class="${sec ? 'sec' : ''}">${I(ic, 26)}<span>${n}</span></button>`).join('') + `<button data-s="more" class="more-btn"><svg viewBox="0 0 24 24" width="26" height="26"><circle cx="5" cy="12" r="2.4" fill="#f7f0e6"/><circle cx="12" cy="12" r="2.4" fill="#f7f0e6"/><circle cx="19" cy="12" r="2.4" fill="#f7f0e6"/></svg><span>Más</span></button>`;
    $('#hNav', this.root).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.s === 'more') return this.more(); this.go(b.dataset.s); });
    this.root.addEventListener('click', e => {
      const t = e.target.closest('[data-go],[data-town],[data-comarca],[data-play]'); if (!t) return;
      if (t.dataset.play) return this.play(t.dataset.play);
      if (t.dataset.town) return this.townSheet(t.dataset.town);
      if (t.dataset.comarca) return this.go('comarca', t.dataset.comarca);
      if (t.dataset.go) this.go(t.dataset.go);
    });
    this.screen = 'home';
  }
  show(screen = this.screen, arg = this.arg) { this.root.classList.remove('hidden'); this.visible = true; this.go(screen, arg, true); if (!profile().name) this.onboarding(); }
  hide() { this.root.classList.add('hidden'); this.visible = false; this.sheet?.remove(); }
  go(screen, arg, silent) {
    this.screen = screen; this.arg = arg;
    if (!silent) this.sound?.ui('click');
    this.sheet?.remove(); this.sheet = null;
    const secScreen = this.nav.find(n => n[0] === screen)?.[3];
    this.root.querySelectorAll('#hNav button').forEach(b => b.classList.toggle('on', !!(b.dataset.s === screen || (screen === 'comarca' && b.dataset.s === 'map') || (b.dataset.s === 'more' && secScreen))));
    const bgc = screen === 'comarca' ? arg : (levelById(profile().last) || LEVELS[0]).comarca;
    if (this.bgc !== bgc) { this.bgc = bgc; $('.bgimg', this.root).style.backgroundImage = `url(${landImg(bgc, 1280, 720, true)})`; }
    this.root.dataset.screen = screen;
    const m = $('#hMain', this.root);
    m.innerHTML = this['s_' + screen](arg);
    m.scrollTop = 0;
    this.after?.(); this.after = null;
    this.renderChip();
  }
  more() {
    this.sound?.ui('open');
    const s = el(`<div class="sheet more"><div class="more-in"><div class="grab"></div><small class="kicker">Más secciones</small>
      ${this.nav.filter(n => n[3]).map(([id, n, ic]) => `<button data-go="${id}" class="${this.screen === id ? 'on' : ''}">${I(ic, 34)}<div><b>${n}</b><small>${this.MORE[id]}</small></div>${I('play', 20)}</button>`).join('')}</div></div>`);
    this.sheet?.remove(); this.sheet = s; this.root.appendChild(s);
    s.addEventListener('click', e => { if (e.target === s) { s.remove(); this.sheet = null; } });
  }
  renderChip() {
    const p = profile(), L = levelOf(p.xp);
    $('#hChip', this.root).innerHTML = `<img src="${avatarPortrait(p.avatar)}" alt=""><div class="cinfo"><b>${esc(p.name || 'Aventurero')}</b><small>Nv ${L.lv} · ${rankOf(L.lv)}</small><div class="xp"><i style="width:${L.cur / L.need * 100}%"></i></div></div><span class="stamps">${I('stamp', 22)}${stampCount(p)}</span>`;
    $('#hChip', this.root).onclick = () => this.go('profile');
  }

  // ---------- Inicio ----------
  // frases de la historia que cuenta el personaje en la portada
  storyLines(p, av, last) {
    const town = last.name.split(' /')[0], lp = townProgress(p, last), done = p.towns[last.id]?.done || {};
    const next = (last.missions || []).map((m, i) => ({ m, i })).find(x => !done[x.i]);
    const lines = [`¡Kaixo, ${p.name || 'amiga, amigo'}! Soy ${av.name}, ${av.role.toLowerCase()} de ${av.from.split(' /')[0]}.`];
    if (next) {
      const m = next.m, who = m.host?.name?.split(',')[0];
      if (m.type === 'visit') lines.push(`Primero vamos a conocer ${town}: ${last.church?.name ? 'su ' + last.church.name.replace(/^Iglesia/, 'iglesia') : 'sus calles'} y sus rincones.`);
      else lines.push(`${who ? who + ' nos espera en ' + town : 'En ' + town + ' nos esperan'}: «${m.title || m.name || TYPE_NAME[m.type]}». ¡Hay que ayudar!`);
    }
    lines.push(lp.stamp ? `¡El sello de ${town} ya es tuyo! Elige otro pueblo en el mapa.` : `Si completas las ${lp.total} misiones, el sello de ${town} será tuyo.`);
    lines.push('Las páginas del Pasaporte Mendi están en blanco. ¡Cada pueblo guarda un sello!');
    return lines;
  }
  s_home() {
    const p = profile(), N = navarraProgress(p), L = levelOf(p.xp);
    const last = levelById(p.last) || LEVELS.find(l => !townProgress(p, l).stamp) || LEVELS[0];
    const lp = townProgress(p, last), cm = comarca(last.comarca), cpr = comarcaProgress(p, last.comarca), cts = comarcaTowns(last.comarca);
    const chapter = COMARCAS.findIndex(c => c.id === last.comarca) + 1;
    let doneM = 0, totM = 0; for (const l of LEVELS) { const t = townProgress(p, l); doneM += t.done; totM += t.total; }
    const av = AVATARS.find(a => a.id === p.avatar) || AVATARS[0];
    const done = p.towns[last.id]?.done || {};
    const ms = (last.missions || []).map((m, i) => `<span class="mi ${done[i] ? 'ok' : ''}" title="${esc(m.title || m.name || TYPE_NAME[m.type] || '')}">${I(TYPE_ICON[m.type] || 'star', 40)}${done[i] ? `<i class="tick">${I('check', 16)}</i>` : ''}</span>`).join('');
    this.after = () => {
      // el escenario 3D se monta después de pintar la pantalla, para que aparezca al instante
      // (salvo que otro escenario, como el selector de bienvenida, esté ya en uso encima)
      const host = $('#heroStage', this.root);
      // portada de juego: el personaje posa (sin bocadillo); al tocarlo saluda y salta
      requestAnimationFrame(() => setTimeout(() => { if (!host.isConnected) return; const cur = Stage.current; if (cur?.alive && cur.host !== host && cur.host.isConnected) return; this.stage = new Stage(host, p.avatar, { mode: 'scene', comarca: last.comarca }); this.stage.onPoke = () => this.sound?.ui('click'); }, 50));
      this.drawMiniMap($('#homeMap', this.root));
      this.lazyLand();
    };
    const next = this.suggestions();
    return `
    <section class="hero3d">
      <div id="heroStage" class="stage-host"></div>
      <div class="h-shade"></div>
      <button class="chapter" data-comarca="${last.comarca}" style="--c:${cm?.color}"><img src="${stampImg(last.comarca)}" alt=""><span><small>Capítulo ${chapter} · ${esc(cm?.name || '')}</small><b>${cpr.stamps}/${cts.length} sellos de la comarca</b><span class="cbar"><i style="width:${cts.length ? cpr.stamps / cts.length * 100 : 0}%"></i></span></span></button>
      <div class="h-bot">
        <small class="kicker">${lp.done ? 'Sigue tu aventura en' : 'Próxima parada'}</small>
        <h1>${esc(last.name.split(' /')[0])}</h1>
        <div class="mrow">${ms}<span class="mcount">${lp.done}/${lp.total}<small>misiones</small></span></div>
        <div class="h-cta"><button class="btn primary big go" data-play="${last.id}">${I('play', 28)} <span>${lp.done ? '¡Seguimos!' : '¡A la aventura!'}</span></button><button class="btn ghost sq" data-go="map" aria-label="Elegir en el mapa">${I('map', 30)}<span>Mapa</span></button></div>
      </div>
    </section>
    <section class="story">
      <div class="st-txt"><small class="kicker">${I('book', 20)} La historia</small><h2>El Pasaporte Mendi</h2>
        <p>Las páginas del viejo pasaporte se han quedado en blanco. Cada pueblo de Navarra guarda su sello, pero solo lo entrega a quien ayuda a su gente y aprende sus oficios, sus danzas y sus leyendas.</p></div>
      <ol class="hsteps"><li>${I('map', 56)}<b>Viaja</b><span>Elige un pueblo en el mapa</span></li><li>${I('exclaim', 56)}<b>Ayuda</b><span>Habla con su gente y cumple sus misiones</span></li><li>${I('stamp', 56)}<b>Consigue el sello</b><span>Y llena tu pasaporte</span></li></ol>
    </section>
    <section class="tiles">
      <div class="tile">${I('stamp', 44)}<b>${N.stamps}<small>/${N.towns}</small></b><span>Sellos</span></div>
      <div class="tile">${I('shield', 44)}<b>${N.comarcas}<small>/${N.comarcasTotal}</small></b><span>Comarcas</span></div>
      <div class="tile">${I('check', 44)}<b>${doneM}<small>/${totM}</small></b><span>Misiones</span></div>
      <div class="tile">${I('badge', 44)}<b>${p.badges.length}<small>/${BADGES.length}</small></b><span>Insignias</span></div>
      <div class="tile">${I('star', 44)}<b>${L.lv}</b><span>Nivel · ${p.xp} XP</span></div>
    </section>
    <section class="two">
      <div class="panel next-panel"><h2 class="sec">${I('exclaim', 34)} Te esperan</h2>${next}</div>
      <div class="panel map-panel" data-go="map"><h2 class="sec">${I('map', 34)} Mapa de Navarra</h2><div id="homeMap" class="mini-map"></div><p class="hint">Completa pueblos para iluminar sus comarcas.</p></div>
    </section>
    <h2 class="sec">${I('shield', 34)} Capítulos: las comarcas</h2>
    <section class="comarcas rail">${COMARCAS.map(c => this.comarcaCard(c)).join('')}</section>
    <h2 class="sec">${I('mask', 34)} Leyendas y carnaval</h2>
    <section class="folk rail">${FOLKLORE.map(f => `<div class="folkcard">${portraitImg(FOLK_LOOK[f.id] || {}, 'bust', true)}<div><small>${esc(f.origin)}</small><b>${esc(f.name)}</b><p>${esc(f.fact)}</p></div></div>`).join('')}</section>`;
  }
  // fotos 3D de las comarcas: se generan de una en una sin bloquear la pantalla
  lazyLand() {
    const els = [...this.root.querySelectorAll('[data-land]')];
    const step = () => {
      const e = els.shift(); if (!e) return;
      if (e.isConnected) { const [id, w, h] = e.dataset.land.split(':'); dioramaShot(id, +w || 640, +h || 360, { onReady: (u) => { if (e.isConnected) { e.style.backgroundImage = `url(${u})`; e.classList.add('ready'); } } }); }
      step();
    };
    step();
  }
  suggestions() {
    const p = profile();
    const list = LEVELS.filter(l => !townProgress(p, l).stamp).slice(0, 4);
    return `<div class="sugg">${list.map(l => { const t = townProgress(p, l), c = comarca(l.comarca); return `<button class="sg" data-town="${l.id}" style="--c:${c?.color}"><span class="dot"></span><div><b>${esc(l.name)}</b><small>${esc(c?.name)} · ${t.done}/${t.total} misiones</small></div>${I('play', 26)}</button>`; }).join('')}</div>`;
  }
  comarcaCard(c) {
    const p = profile(), pr = comarcaProgress(p, c.id), ts = comarcaTowns(c.id);
    return `<button class="ccard ${ts.length ? '' : 'soon'}" data-comarca="${c.id}" style="--c:${c.color}">
      <div class="cimg" data-land="${c.id}:480:300"></div>
      <img class="cstamp ${pr.stamps ? '' : 'gray'}" src="${stampImg(c.id)}" alt="">
      <div class="cbody"><b>${esc(c.name)}</b><small>${ts.length} pueblos jugables · ${pr.stamps} sellos</small></div>
      <div class="cring">${ring(pr.pct, 50, '#fff')}</div>
      <span class="cgo">${ts.length ? 'Elegir pueblo' : 'Próximamente'}</span></button>`;
  }
  drawMiniMap(box) {
    if (!box) return;
    box.innerHTML = this.navarraSVG({ pins: true, small: true });
  }
  navarraSVG({ pins = true, small = false, focus = null } = {}) {
    const p = profile();
    const paths = COMARCAS.map(c => {
      const pr = comarcaProgress(p, c.id), done = pr.towns && pr.stamps === pr.towns;
      const op = done ? 1 : 0.35 + pr.pct * 0.55;
      return `<path d="${c.path}" data-comarca="${c.id}" class="cpath ${done ? 'done' : ''} ${focus && focus !== c.id ? 'dim' : ''}" style="fill:${c.color};fill-opacity:${op}"/>`;
    }).join('');
    const labels = small ? '' : COMARCAS.map(c => `<text x="${c.label.x}" y="${c.label.y}" class="clabel" text-anchor="middle">${c.label.lines.map((l, i) => `<tspan x="${c.label.x}" dy="${i ? 12 : 0}">${esc(l)}</tspan>`).join('')}</text>`).join('')
      // en el móvil, números en lugar de nombres (la lista de debajo lleva los mismos números)
      + COMARCAS.filter(c => comarcaTowns(c.id).length).map((c, i) => { const [bx, by] = mapLayout().badges[c.id]; return `<g class="cnum" data-comarca="${c.id}" transform="translate(${bx.toFixed(1)} ${by.toFixed(1)})"><circle r="15" fill="${c.color}"/><text y="6" text-anchor="middle">${i + 1}</text></g>`; }).join('');
    const pinsSvg = pins ? LEVELS.filter(l => !focus || l.comarca === focus).map(l => { const [x, y] = XY.get(l.id), t = townProgress(p, l), nm = mapLayout().names[l.id]; return `<g class="pin ${t.stamp ? 'ok' : t.done ? 'go' : ''}" data-town="${l.id}" transform="translate(${x} ${y})"><circle r="${small ? 5 : 7}"/>${small || !nm ? '' : `<text x="${nm.x}" y="${nm.y}" text-anchor="${nm.anchor}">${esc(l.name.split(' /')[0])}</text>`}</g>`; }).join('') : '';
    return `<svg class="navarra" viewBox="10 10 725 780">${paths}${labels}${pinsSvg}</svg>`;
  }

  // ---------- Mapa ----------
  s_map() {
    const p = profile();
    return `<h1 class="title">${I('map', 36)} Mapa de Navarra</h1><p class="lead">Toca una comarca para ver sus pueblos. Las comarcas se iluminan a medida que completas sus pueblos.</p>
      <div class="map-wrap"><div class="bigmap">${this.navarraSVG({ pins: true })}</div>
      <aside class="legend2"><div class="navstats">${ring(navarraProgress(p).stamps / LEVELS.length, 84, '#FFD700')}<span>de Navarra sellada</span></div>
        <div class="lg"><span><i class="pin0"></i> Por descubrir</span><span><i class="pin1"></i> Empezado</span><span><i class="pin2"></i> Sellado</span></div>
        <div class="clist">${COMARCAS.filter(c => comarcaTowns(c.id).length).map((c, i) => { const pr = comarcaProgress(p, c.id); return `<button data-comarca="${c.id}" style="--c:${c.color}"><i>${i + 1}</i><b>${esc(c.name)}</b><small>${pr.stamps}/${pr.towns}</small></button>`; }).join('')}</div></aside></div>`;
  }

  // ---------- Comarca ----------
  s_comarca(id) {
    const c = comarca(id); if (!c) return this.s_map();
    const p = profile(), pr = comarcaProgress(p, id), ts = comarcaTowns(id), C = c.culture || {};
    const block = (ic, k, o) => o ? `<div class="cult">${I(ic, 48)}<div><small>${k}${o.date ? ' · ' + esc(o.date) : ''}</small><b>${esc(o.title)}</b><p>${esc(o.text)}</p>${o.place ? `<em>${esc(o.place)}</em>` : ''}</div></div>` : '';
    const mts = MOUNTAINS.filter(m => m.region === id && LEVELS.some(l => (l.missions || []).some(x => x.type === 'summit' && x.peak === m.id)));
    const chips = (arr, fb) => (arr || []).map(n => `<span class="nchip">${I(speciesIcon(n) || fb, 26)}${esc(n)}</span>`).join('');
    return `
    <section class="chero" style="--c:${c.color};--bg:url(${landImg(id)})">
      <button class="back" data-go="map">${I('back', 26)} Mapa</button>
      <img class="bigstamp ${pr.stamps ? '' : 'gray'}" src="${stampImg(id)}" alt="">
      <div><small class="kicker">Comarca</small><h1>${esc(c.full || c.name)}</h1><p>${ts.length} pueblos para jugar · río ${esc(c.river || '')}</p></div>
      <div class="cring">${ring(pr.pct, 96, '#fff')}</div>
    </section>
    <h2 class="sec">${I('church', 30)} Pueblos y ciudades</h2>
    <section class="towns">${ts.length ? ts.map(l => this.townCard(l)).join('') : '<p class="empty">Muy pronto habrá pueblos jugables en esta comarca.</p>'}</section>
    <section class="two">
      <div class="panel"><h2>${I('dance', 30)} Cultura</h2><div class="cultgrid">${block('dance', 'Danza', C.dance)}${block('mask', 'Carnaval', C.carnival)}${block('flag', 'Fiesta', C.festival)}${block('ribbon', 'Traje', C.costume)}</div></div>
      <div class="panel"><h2>${I('leaf', 30)} Naturaleza</h2>
        <h3>Fauna</h3><div class="nchips">${(c.fauna || []).map(f => `<span class="nchip" title="${esc(f[2])}">${I(speciesIcon(f[0]) || 'bird', 26)}${esc(f[0])}</span>`).join('')}</div>
        <h3>Árboles</h3><div class="nchips">${chips(c.nature?.trees, 'tree')}</div>
        <h3>Plantas</h3><div class="nchips">${chips(c.nature?.plants, 'herbs')}</div>
        <h3>Flores</h3><div class="nchips">${chips(c.nature?.flowers, 'flower')}</div></div>
    </section>
    ${mts.length ? `<h2 class="sec">${I('peak', 30)} Cimas para subir</h2><section class="peaks">${mts.map(m => this.peakCard(m, LEVELS.find(l => (l.missions || []).some(x => x.type === 'summit' && x.peak === m.id)))).join('')}</section>` : ''}`;
  }
  townCard(l) {
    const p = profile(), t = townProgress(p, l), c = comarca(l.comarca);
    const types = (l.missions || []).map(m => m.type);
    return `<button class="tcard ${t.stamp ? 'stamped' : ''}" data-town="${l.id}" style="--c:${c?.color}">
      <div class="thead">${I(l.special ? 'castle' : ({ romanesque: 'church', gothic: 'church', baroque: 'church', fortress: 'castle', cathedral: 'cathedral' }[l.church?.style] || 'church'), 44)}<div><b>${esc(l.name)}</b><small>${esc(c?.name)}</small></div>${t.stamp ? `<img class="tstamp" src="${stampImg(l.comarca)}" alt="">` : ''}</div>
      <p>${esc(l.intro || '')}</p>
      <div class="ticons">${(l.special ? ['visit', 'herd', 'legend', 'dance', 'observe', 'carnival'] : types).map(ty => `<span title="${TYPE_NAME[ty]}">${I(TYPE_ICON[ty], 24)}</span>`).join('')}</div>
      <div class="mini-prog"><div class="bar"><i style="width:${t.total ? t.done / t.total * 100 : 0}%"></i></div><span>${t.done}/${t.total}</span></div></button>`;
  }
  townSheet(id) {
    const l = levelById(id); if (!l) return;
    this.sound?.ui('open');
    const p = profile(), t = townProgress(p, l), c = comarca(l.comarca), ts = p.towns[id];
    const ms = l.special ? [{ type: 'visit', title: 'Ongi etorri a Otsagabia' }, { type: 'herd', title: 'El rebaño de Joxemari' }, { type: 'observe', title: 'Guardianes de Irati' }, { type: 'legend', title: 'Basajaun y la Lamia' }, { type: 'carnival', title: 'El Zarratrako' }, { type: 'dance', title: 'La fiesta de Muskilda' }]
      : l.missions;
    const title = (m) => m.title || (m.type === 'visit' ? `Conoce ${l.name}` : m.type === 'quiz' ? `El sabio de ${l.name}` : m.name || m.product || TYPE_NAME[m.type]);
    const s = el(`<div class="sheet"><div class="sheet-in" style="--c:${c?.color};--bg:url(${landImg(l.comarca)})">
      <button class="x" aria-label="Cerrar">${I('close', 22)}</button>
      <div class="sh-hero"><small class="kicker">${esc(c?.name)}</small><h1>${esc(l.name)}</h1><p>${esc(l.intro || '')}</p></div>
      <div class="sh-body">
        <h3>${I('check', 24)} Misiones (${t.done}/${t.total})</h3>
        <ul class="mlist">${ms.map((m, i) => `<li class="${ts?.done?.[i] ? 'ok' : ''}">${I(TYPE_ICON[m.type], 34)}<div><b>${esc(title(m))}</b><small>${TYPE_NAME[m.type]}${m.host ? ' · con ' + esc(m.host.name) : ''}</small></div>${ts?.done?.[i] ? I('check', 26) : ''}</li>`).join('')}</ul>
        ${l.church ? `<h3>${I('church', 24)} Qué visitar</h3><ul class="plist"><li><b>${esc(l.church.name)}</b> ${esc(l.church.text)}</li>${(l.landmarks || []).map(x => `<li><b>${esc(x.name)}</b> ${esc(x.text)}</li>`).join('')}</ul>` : ''}
      </div>
      <div class="sh-foot"><button class="btn primary big" data-play="${l.id}">${I('play', 28)} ${t.done ? 'Seguir jugando' : 'Jugar'} en ${esc(l.name)}</button></div></div></div>`);
    this.sheet?.remove(); this.sheet = s; this.root.appendChild(s);
    s.addEventListener('click', e => { if (e.target === s || e.target.closest('.x')) { s.remove(); this.sheet = null; } });
  }
  play(id) { const l = levelById(id); if (!l) return; const p = profile(); p.last = id; saveProfile(); this.sound?.ui('open'); this.onPlay?.(l); }

  // ---------- Pueblos ----------
  s_towns(filter = 'all') {
    const list = LEVELS.filter(l => filter === 'all' || l.comarca === filter);
    this.after = () => this.root.querySelectorAll('.filters button').forEach(b => b.onclick = (e) => { e.stopPropagation(); this.go('towns', b.dataset.f); });
    return `<h1 class="title">${I('church', 40)} Pueblos y ciudades</h1><p class="lead">Cada pueblo tiene sus propias misiones: su iglesia y sus monumentos, sus productos, sus oficios, sus danzas y su carnaval.</p>
      <div class="filters"><button data-f="all" class="${filter === 'all' ? 'on' : ''}">Todas</button>${COMARCAS.filter(c => comarcaTowns(c.id).length).map(c => `<button data-f="${c.id}" class="${filter === c.id ? 'on' : ''}" style="--c:${c.color}">${esc(c.name)}</button>`).join('')}</div>
      <section class="towns">${list.map(l => this.townCard(l)).join('')}</section>`;
  }

  // ---------- Cimas ----------
  // Cimas: las que se suben en el juego (misión de montaña en un pueblo) y el resto como guía
  s_peaks(filter = 'game') {
    const p = profile();
    const inGame = new Map(); for (const l of LEVELS) for (const m of l.missions || []) if (m.type === 'summit') inGame.set(m.peak, l);
    const list = MOUNTAINS.filter(m => filter === 'game' ? inGame.has(m.id) : filter === 'all' || m.region === filter).sort((a, b) => (inGame.has(b.id) - inGame.has(a.id)) || b.altitude - a.altitude);
    this.after = () => this.root.querySelectorAll('.filters button').forEach(b => b.onclick = (e) => { e.stopPropagation(); this.go('peaks', b.dataset.f); });
    const won = [...inGame.keys()].filter(id => p.peaks.includes(id)).length;
    return `<h1 class="title">${I('peak', 40)} Cimas de Navarra</h1><p class="lead">Sube a los montes en las misiones de montaña: sigue los mojones hasta el buzón de cumbre. Llevas <b>${won}/${inGame.size}</b> cimas.</p>
      <div class="filters"><button data-f="game" class="${filter === 'game' ? 'on' : ''}">${I('flag', 20)} En el juego</button><button data-f="all" class="${filter === 'all' ? 'on' : ''}">Todas</button>${COMARCAS.filter(c => MOUNTAINS.some(m => m.region === c.id)).map(c => `<button data-f="${c.id}" class="${filter === c.id ? 'on' : ''}" style="--c:${c.color}">${esc(c.name)}</button>`).join('')}</div>
      <section class="peaks">${list.map(m => this.peakCard(m, inGame.get(m.id))).join('')}</section>`;
  }
  peakCard(m, town = null) {
    const done = profile().peaks.includes(m.id), c = comarca(m.region);
    return `<div class="pcard ${done ? 'done' : ''}" style="--c:${c?.color || '#6d3b5c'}"><div class="phead">${I('peak', 40)}<div><b>${esc(m.name)}</b><small>${esc(m.zone || '')}</small></div><span class="alt">${m.altitude} m</span></div>
      ${spark(m.profile)}<div class="pmeta"><span>${m.distance} km</span><span>+${m.gain} m</span><span class="diff">${'<i></i>'.repeat(m.difficulty)}${'<i class="o"></i>'.repeat(Math.max(0, 5 - m.difficulty))}</span></div>
      <p>${esc(m.intro || '')}</p>
      ${town ? (done ? `<span class="pbadge ok">${I('check', 18)} Cima conseguida</span>` : `<button class="btn small primary" data-town="${town.id}">${I('play', 18)} Misión en ${esc(town.name.split(' /')[0])}</button>`) : ''}</div>`;
  }

  // ---------- Naturaleza ----------
  s_nature(tab = 'fauna') {
    const p = profile();
    const agg = (get) => { const m = new Map(); for (const c of COMARCAS) for (const n of get(c) || []) { const k = Array.isArray(n) ? n[0] : n; if (!m.has(k)) m.set(k, { name: k, desc: Array.isArray(n) ? n[2] : '', where: [] }); m.get(k).where.push(c); } return [...m.values()]; };
    const data = { fauna: agg(c => c.fauna), trees: agg(c => c.nature?.trees), plants: agg(c => c.nature?.plants), flowers: agg(c => c.nature?.flowers) };
    const fb = { fauna: 'bird', trees: 'tree', plants: 'herbs', flowers: 'flower' };
    this.after = () => this.root.querySelectorAll('.filters button').forEach(b => b.onclick = (e) => { e.stopPropagation(); this.go('nature', b.dataset.f); });
    const obsMap = { corzo: 'Corzo', ciervo: 'Ciervo', jabali: 'Jabalí', buitre: 'Buitre leonado' };
    const seen = new Set(p.species.map(s => obsMap[s]).filter(Boolean));
    return `<h1 class="title">${I('leaf', 40)} Naturaleza de Navarra</h1><p class="lead">Del hayedo atlántico a las Bardenas: cada comarca tiene sus animales y plantas. Los que observes con los prismáticos quedan marcados.</p>
      <div class="filters">${[['fauna', 'Fauna'], ['trees', 'Árboles'], ['plants', 'Plantas'], ['flowers', 'Flores']].map(([k, n]) => `<button data-f="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <section class="species">${data[tab].map(s => `<div class="scard ${seen.has(s.name) ? 'seen' : ''}">${I(speciesIcon(s.name) || fb[tab], 64)}<b>${esc(s.name)}</b>${s.desc ? `<p>${esc(s.desc)}</p>` : ''}<div class="where">${s.where.map(c => `<i style="background:${c.color}" title="${esc(c.name)}"></i>`).join('')}</div>${seen.has(s.name) ? `<span class="seenb">${I('binoculars', 18)} Observado</span>` : ''}</div>`).join('')}</section>`;
  }

  // ---------- Personajes: selección con el modelo 3D en grande ----------
  castInfo(a) {
    if (a.id === 'mio') a = { ...a, name: profile().name || a.name };
    return `<div class="ci-head"><span class="crole">${esc(a.role)}</span><small class="cfrom">${I('pin', 16)} ${esc(a.from)}</small></div>
      <b class="cname">${esc(a.name)}</b><em class="tl">«${esc(a.tagline)}»</em><p class="cdesc">${esc(a.desc)}</p>
      <div class="stats">${a.stats.map((v, i) => `<div class="stat"><span>${STAT_LABELS[i]}</span><span class="sbar"><i style="--v:${v}%"></i></span><b>${v}</b></div>`).join('')}</div>
      <div class="abil"><span class="aic">${I('sparkle', 26)}</span><span><small>Habilidad especial</small>${esc(a.ability)}</span></div>`;
  }
  castStrip(cur) { return `<div class="cstrip">${AVATARS.map(a => `<button data-av="${a.id}" class="${cur === a.id ? 'on' : ''}" style="--c:${a.color}" aria-label="${esc(a.name)}">${avatarPortraitImg(a.id)}<span>${esc(a.name)}</span></button>`).join('')}</div>`; }
  // selector de personaje estilo videojuego (pantalla Personajes y primera vez)
  selector(cur, { onb = false, extra = '' } = {}) {
    const i = AVATARS.findIndex(a => a.id === cur.id);
    return `<section class="csel2 ${onb ? 'onbsel' : ''}" style="--c:${cur.color}">
      <div class="cs-stage"><div class="cs-bgname" aria-hidden="true">${esc(cur.name)}</div><div id="avStage" class="stage-host"></div>
        <button class="cs-arrow prev" data-step="-1" aria-label="Anterior"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M15 4l-8 8 8 8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="cs-arrow next" data-step="1" aria-label="Siguiente"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M9 4l8 8-8 8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span class="cs-count"><b>${i + 1}</b>/${AVATARS.length}</span><span class="cs-hint">Arrastra para girarlo · tócalo para saludar</span></div>
      <div class="cs-side"><div class="csel-info" id="csInfo">${this.castInfo(cur)}</div><div class="cs-outfits" id="csOutfits"></div></div>
      <div class="cs-roster">${this.castStrip(cur.id)}</div>${extra ? `<div class="cs-extra">${extra}</div>` : ''}
    </section>`;
  }
  bindSelector(host, start, onPick) {
    let cur = start;
    // centra el retrato elegido en la tira sin mover la página
    const center = (id, smooth) => { const b = host.querySelector(`[data-av="${id}"]`), st = b?.parentElement; if (!st) return; st.scrollTo({ left: b.offsetLeft - st.clientWidth / 2 + b.offsetWidth / 2, behavior: smooth ? 'smooth' : 'auto' }); };
    const P0 = profile(); P0.outfits ||= {}; setOutfitChoices(P0.outfits);
    // trajes para los personajes KayKit: original, San Fermín, dantzari, pastor, casero y Osasuna
    const outfits = (id) => {
      const el = $('#csOutfits', host); if (!el) return;
      if (id === 'mio') return this.mioEditor(el, host);
      if (!GLB_AVATARS[id]?.kaykit) { el.innerHTML = ''; return; }
      const curO = P0.outfits[id] || 'original';
      const btn = (o) => `<button class="${o.id === curO ? 'on' : ''}" data-outfit="${o.id}" style="--o:${o.shirt || '#8a7a6a'};--a:${o.sash || o.scarf || o.beret || o.pants || '#8a7a6a'}"><i></i>${esc(o.name)}</button>`;
      el.innerHTML = `<small>Ropa de fiesta</small><div>${OUTFITS.filter(o => !o.region && !o.trade).map(btn).join('')}</div><small>Trajes de cada comarca</small><div>${OUTFITS.filter(o => o.region).map(btn).join('')}</div><small>Oficios de antes</small><div>${OUTFITS.filter(o => o.trade).map(btn).join('')}</div>`;
      el.querySelectorAll('[data-outfit]').forEach(b => b.onclick = (e) => { e.stopPropagation(); P0.outfits[id] = b.dataset.outfit; saveProfile(); setOutfitChoices(P0.outfits); this.stage.setAvatar(id); this.sound?.ui('coin'); outfits(id); });
    };
    this.stage = new Stage($('#avStage', host), cur);
    outfits(cur);
    const set = (id, dir = 0) => {
      if (id === cur) return; cur = id; const a = castById(id);
      this.stage.setAvatar(id); this.sound?.ui('coin');
      const sec = $('.csel2', host); sec.style.setProperty('--c', a.color);
      const info = $('#csInfo', host); info.innerHTML = this.castInfo(a); info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
      $('.cs-bgname', host).textContent = a.name; $('.cs-count b', host).textContent = AVATARS.indexOf(a) + 1;
      host.querySelectorAll('[data-av]').forEach(x => x.classList.toggle('on', x.dataset.av === id));
      center(id, true); outfits(id);
      onPick(a);
    };
    const step = (d) => { const i = AVATARS.findIndex(a => a.id === cur); set(AVATARS[(i + d + AVATARS.length) % AVATARS.length].id, d); };
    host.querySelectorAll('[data-av]').forEach(b => b.onclick = (e) => { e.stopPropagation(); set(b.dataset.av); });
    host.querySelectorAll('[data-step]').forEach(b => b.onclick = (e) => { e.stopPropagation(); step(+b.dataset.step); });
    const key = (e) => { if (!host.isConnected) return removeEventListener('keydown', key); if (e.target.tagName === 'INPUT') return; if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    addEventListener('keydown', key);
    center(cur);
  }
  // creador de tu personaje: cada cambio se ve al momento en el modelo 3D y se guarda en el perfil
  mioEditor(el, host) {
    const P = profile(), c = (P.mio ||= defaultMio());
    const sw = (key, list, none) => `<div class="mio-sw">${none ? `<button class="none ${c[key] ? '' : 'on'}" data-k="${key}" data-v="" aria-label="Sin">∅</button>` : ''}${list.map(v => `<button class="${c[key] === v ? 'on' : ''}" data-k="${key}" data-v="${v}" style="--s:${v}" aria-label="${v}"></button>`).join('')}</div>`;
    const chips = (key, list) => `<div class="mio-ch">${list.map(o => `<button class="${c[key] === o.id ? 'on' : ''}" data-k="${key}" data-v="${o.id}">${esc(o.name)}</button>`).join('')}</div>`;
    const tog = (key, name) => `<button class="mio-tog ${c[key] ? 'on' : ''}" data-t="${key}">${esc(name)}</button>`;
    el.innerHTML = `<div class="mio-ed">
      <div class="mio-top"><b>Crea tu personaje</b><span><button class="mio-rand" data-r="1">Al azar</button><select class="mio-from" aria-label="Empezar desde un traje"><option value="">Desde un traje…</option>${OUTFITS.filter(o => o.id !== 'original').map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select></span></div>
      <small>Cuerpo</small>${chips('base', MIO_BASES)}
      <small>Piel</small>${sw('skin', SKINS)}
      <small>Pelo</small>${sw('hair', HAIRS)}<div class="mio-tg">${tog('longHair', 'Melena larga')}</div>
      <small>En la cabeza</small>${chips('hat', HATS)}${sw('hatColor', ['#1d1d22', '#c8102e', '#2b5a3a', '#1e3a8a', '#8a5ad6', '#f6f3ec'])}
      <small>Camisa</small>${sw('shirt', CLOTH)}
      <small>Pantalón</small>${sw('pants', CLOTH)}
      <small>Calzado</small>${sw('shoes', ['#4a2f1c', '#6b3f24', '#1d1d22', '#efe4cc', '#f6f3ec', '#c8102e'])}
      <small>Detalles (cinturón, chaleco)</small>${sw('accent', CLOTH)}
      <small>Pañuelo al cuello</small>${sw('scarf', CLOTH, true)}
      <small>Faja</small>${sw('sash', CLOTH, true)}
      <small>Falda</small>${sw('skirt', CLOTH, true)}<div class="mio-tg">${tog('apron', 'Delantal')}${tog('fur', 'Zamarra de piel')}</div>
    </div>`;
    const apply = () => { saveProfile(); setMio(c); this.stage.setAvatar('mio'); const im = host.querySelector('[data-av="mio"] img'); if (im) im.outerHTML = avatarPortraitImg('mio'); this.mioEditor(el, host); };
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = (e) => { e.stopPropagation(); const k = b.dataset.k; c[k] = b.dataset.v || null; if (k === 'base' && MIO_FEMALE.has(c.base) && !c.skirt) c.skirt = '#1e3a8a'; this.sound?.ui('click'); apply(); });
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = (e) => { e.stopPropagation(); c[b.dataset.t] = !c[b.dataset.t]; this.sound?.ui('click'); apply(); });
    $('.mio-rand', el).onclick = (e) => { e.stopPropagation(); Object.assign(c, defaultMio(Math.random)); this.sound?.ui('coin'); apply(); };
    const from = $('.mio-from', el); from.onclick = (e) => e.stopPropagation();
    from.onchange = () => { const o = OUTFITS.find(o => o.id === from.value); if (!o) return; Object.assign(c, { shirt: o.shirt, pants: o.pants, shoes: o.shoes, accent: o.accent, scarf: o.scarf || null, sash: o.sash || null, hat: o.beret ? 'beret' : o.cachirulo ? 'cachirulo' : c.hat, hatColor: o.beret || o.cachirulo || c.hatColor, skirt: MIO_FEMALE.has(c.base) ? (o.skirtF || c.skirt) : c.skirt }); this.sound?.ui('coin'); apply(); };
  }
  s_avatars() {
    const p = profile(), cur = castById(p.avatar);
    this.after = () => this.bindSelector(this.root, p.avatar, (a) => { p.avatar = a.id; saveProfile(); this.renderChip(); $('#csGo', this.root).innerHTML = `${I('play', 26)} Jugar con ${esc(a.name)}`; });
    return `<div class="cs-top"><h1 class="title">Elige tu personaje</h1><button class="btn primary big" id="csGo" data-go="home">${I('play', 26)} Jugar con ${esc(cur.name)}</button></div>
      ${this.selector(cur)}`;
  }

  // ---------- Insignias ----------
  s_badges() {
    const p = profile(); checkBadges(); saveProfile();
    return `<h1 class="title">${I('badge', 40)} Insignias</h1><p class="lead">Has ganado ${p.badges.length} de ${BADGES.length}.</p>
      <section class="badges">${BADGES.map(b => { const on = p.badges.includes(b.id); return `<div class="bcard ${on ? 'on' : ''}"><div class="bic">${I(on ? b.icon : 'lock', 64)}</div><b>${esc(b.name)}</b><p>${esc(b.text)}</p></div>`; }).join('')}</section>`;
  }

  // ---------- Pasaporte ----------
  s_passport() {
    const p = profile();
    return `<h1 class="title">${I('stamp', 40)} Pasaporte Mendi</h1><p class="lead">Cada pueblo completado estampa su sello. ¡Llena todas las páginas de Navarra!</p>
      <section class="passport">${COMARCAS.map(c => { const ts = comarcaTowns(c.id), pr = comarcaProgress(p, c.id);
        return `<div class="ppage" style="--c:${c.color}"><header><img class="${pr.stamps ? '' : 'gray'}" src="${stampImg(c.id)}" alt=""><div><b>${esc(c.name)}</b><small>${pr.stamps}/${ts.length} sellos</small></div></header>
        <div class="pstamps">${ts.length ? ts.map(l => { const t = townProgress(p, l); return `<button class="pst ${t.stamp ? 'on' : ''}" data-town="${l.id}"><span class="ink">${I(t.stamp ? 'stamp' : 'lock', 30)}</span><small>${esc(l.name.split(' /')[0])}</small></button>`; }).join('') : '<small class="empty">Próximamente</small>'}</div></div>`; }).join('')}</section>`;
  }

  // ---------- Perfil y ajustes ----------
  s_profile() {
    const p = profile(), L = levelOf(p.xp), S = p.settings, sal = salazarState();
    this.after = () => {
      const r = this.root;
      $('#pName', r).onchange = e => { p.name = e.target.value.trim().slice(0, 14) || p.name; saveProfile(); this.renderChip(); };
      $('#pName', r).addEventListener('keydown', e => e.stopPropagation());
      $('#pMusic', r).onchange = e => { S.music = e.target.checked; saveProfile(); this.onSettings?.(S); };
      $('#pVol', r).oninput = e => { S.volume = +e.target.value; saveProfile(); this.onSettings?.(S); };
      $('#pQ', r).value = S.quality || 'auto';
      $('#pLang', r).value = getLang(); $('#pLang', r).onchange = e => setLang(e.target.value);
      $('#pQ', r).onchange = e => { S.quality = e.target.value === 'auto' ? null : e.target.value; saveProfile(); this.onSettings?.(S); };
      const rb = $('#pReset', r); rb.onclick = (e) => { e.stopPropagation(); if (rb.dataset.sure) { resetProfile(); try { localStorage.removeItem('mendimendiz-salazar-v2'); } catch (err) { } this.go('home'); } else { rb.dataset.sure = 1; rb.textContent = '¿Seguro? Pulsa otra vez para borrar todo'; this.sound?.ui('error'); } };
    };
    let doneM = 0; for (const l of LEVELS) doneM += townProgress(p, l).done;
    return `<h1 class="title">${I('gear', 40)} Perfil y ajustes</h1>
      <section class="two"><div class="panel prof"><img src="${avatarPortrait(p.avatar, 'full')}" alt=""><div>
        <label>Tu nombre<input id="pName" maxlength="14" value="${esc(p.name)}" autocomplete="off"></label>
        <div class="lvl"><b>Nivel ${L.lv}</b> · ${rankOf(L.lv)}<div class="xp big"><i style="width:${L.cur / L.need * 100}%"></i></div><small>${L.cur}/${L.need} XP para el siguiente nivel</small></div>
        <div class="pstats"><span>${I('stamp', 26)} ${stampCount(p)} sellos</span><span>${I('check', 26)} ${doneM} misiones</span><span>${I('book', 26)} ${p.cards.length} cartas</span><span>${I('peak', 26)} ${p.peaks.length} cimas</span><span>${I('binoculars', 26)} ${p.species.length} especies</span><span>${I('ribbon', 26)} ${sal?.ribbons?.length || 0}/8 cintas de Muskilda</span></div>
        <button class="btn" data-go="avatars">${I('person', 22)} Cambiar personaje</button></div></div>
      <div class="panel"><h2>${I('gear', 30)} Ajustes</h2>
        <label class="set">Idioma <select id="pLang"><option value="eu">Euskara</option><option value="es">Castellano</option><option value="learn">Aprende euskera (con traductor)</option></select></label>
        <label class="set">Música <input type="checkbox" id="pMusic" ${S.music ? 'checked' : ''}></label>
        <label class="set">Volumen <input type="range" id="pVol" min="0" max="1" step="0.05" value="${S.volume}"></label>
        <label class="set">Calidad gráfica <select id="pQ"><option value="auto">Automática</option><option value="low">Baja (más fluido)</option><option value="mid">Media</option><option value="high">Alta</option></select></label>
        <p class="hint">Controles: WASD o flechas para caminar, ratón para mirar, E para hablar, Espacio para saltar, Mayús para correr. En móvil: arrastra a la izquierda para caminar y a la derecha para mirar.</p>
        <button class="btn danger" id="pReset">Borrar todo el progreso</button></div></section>`;
  }

  // ---------- Primera vez: nombre y personaje ----------
  onboarding() {
    const p = profile();
    let pick = p.avatar || 'benat';
    const o = el(`<div class="onb"><div class="onb-in">
      <header class="onb-head"><div class="logo">MENDIMENDIZ</div><p class="tag">Navarra, pueblo a pueblo</p>
        <div class="langsel" role="group" aria-label="Idioma"><button data-lang="eu" class="${getLang() === 'eu' ? 'on' : ''}">Euskara</button><button data-lang="es" class="${getLang() === 'es' ? 'on' : ''}">Castellano</button><button data-lang="learn" class="${getLang() === 'learn' ? 'on' : ''}">Aprende euskera</button></div></header>
      ${this.selector(castById(pick), { onb: true, extra: `<div class="onb-foot"><div class="gender" role="group" aria-label="Elige personaje"><button data-g="benat" class="${pick === 'benat' ? 'on' : ''}">Chico · Beñat</button><button data-g="nerea" class="${pick === 'nerea' ? 'on' : ''}">Chica · Nerea</button><button data-g="haritz" class="${pick === 'haritz' ? 'on' : ''}">Neolítico · Haritz</button><button data-g="mio" class="${pick === 'mio' ? 'on' : ''}">Crea el tuyo</button></div><label>¿Cómo te llamas?<input id="oName" maxlength="14" autocomplete="off" placeholder="Tu nombre"></label>
        <button class="btn primary big" id="oGo">${I('play', 26)} ¡Empezar la aventura!</button></div>` })}
    </div></div>`);
    this.root.appendChild(o);
    this.bindSelector(o, pick, (a) => { pick = a.id; this.sound?.init?.(); o.querySelectorAll('[data-g]').forEach(b => b.classList.toggle('on', b.dataset.g === a.id)); });
    o.querySelectorAll('[data-g]').forEach(b => b.onclick = (e) => { e.stopPropagation(); o.querySelector(`[data-av="${b.dataset.g}"]`)?.click(); });
    o.querySelectorAll('[data-lang]').forEach(b => b.onclick = (e) => { e.stopPropagation(); if (b.dataset.lang !== getLang()) setLang(b.dataset.lang); });
    const inp = $('#oName', o); inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); });
    const go = () => { p.name = inp.value.trim() || 'Mendi'; p.avatar = pick; saveProfile(); this.sound?.init?.(); this.sound?.ui('open'); o.remove(); this.go('home', null, true); };
    $('#oGo', o).onclick = go;
  }
}

// Aspecto de los personajes de leyenda y carnaval para sus retratos
export const FOLK_LOOK = {
  joaldun: { shirt: '#f4f1ea', fur: '#ece4d2', hat: 'cone', hatColor: '#f4f1ea', pants: '#1d2a4a', scarf: '#3a8fd6', face: 'brave' },
  mozorro: { shirt: '#6b8a3a', pattern: 'check', pattern2: '#e03c3c', pants: '#3a2a1a', hat: 'mask', hatColor: '#6b4a2e' },
  momotxorro: { skin: '#e2b08a', hair: '#1a1a1a', beard: '#1a1a1a', shirt: '#f2eee6', print: 'sheet', fur: '#7a5a34', horns: true, hat: 'basket', face: 'angry', facePaint: 'soot' },
  'miel-otxin': { shirt: '#e03c3c', ribbons: true, pants: '#f2c230', hat: 'cone', hatColor: '#3a8fd6', face: 'angry' },
  zarratrako: { shirt: '#8a6a4a', pattern: 'stripes', pattern2: '#3ca05a', fur: '#b08650', hat: 'mask', hatColor: '#3a2a1a' },
  cascabobo: { shirt: '#f2c230', pattern: 'dots', pattern2: '#e03c3c', hat: 'cone', hatColor: '#e03c3c', face: 'happy' },
  irasko: { shirt: '#3ca05a', pattern: 'check', pattern2: '#f2c230', hat: 'mask', hatColor: '#3ca05a' },
  paloki: { shirt: '#b34fc4', ribbons: true, hat: 'cone', hatColor: '#f2c230' },
  'comparsa-mendigorria': { shirt: '#3a8fd6', pattern: 'stripes', pattern2: '#f4f1ea', hat: 'mask', hatColor: '#3a8fd6' },
  lagunero: { shirt: '#2b3a6b', print: 'coat', hat: 'bicorne', face: 'angry', moustache: '#2a1a12', moustacheCurl: true, hair: '#dcd7cf' },
  zipotero: { shirt: '#3a8fd6', pattern: 'stripes', pattern2: '#f2c230', hat: 'mask', hatColor: '#f2c230', face: 'angry' },
  lamia: { skin: '#f1d7b8', hair: '#e8c34a', hairStyle: 'long', lashes: true, shirt: '#6ab0a0', print: 'blouse', bodice: '#3a8a7a' },
  basajaun: { skin: '#c49a78', hair: '#5a3a22', hairStyle: 'long', beard: '#5a3a22', fur: '#6b4a2e', shirt: '#6b4a2e' },
  tartalo: { skin: '#c9a27a', hair: '#3b2418', shirt: '#6b4a2e', fur: '#8a6a4a', face: 'angry' },
};
