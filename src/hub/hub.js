// Centro de mando: inicio, mapa de Navarra, comarcas, pueblos, cimas, naturaleza, personajes, insignias, pasaporte y perfil.
import COMARCAS from '../data/comarcas.json';
import MOUNTAINS from '../data/mountains.json';
import AVATARS from '../data/avatars.json';
import FOLKLORE from '../data/folklore.json';
import SETTLEMENTS from '../data/settlements.json';
import { LEVELS, levelById } from '../data/levels.js';
import { iconSVG, speciesIcon } from '../ui/icons.js';
import { avatarPortrait, portrait } from '../ui/portraits.js';
import { IMG, stampImg, avatarImg, landImg } from '../assets.js';
import { profile, saveProfile, levelOf, rankOf, townProgress, comarcaProgress, comarcaTowns, navarraProgress, stampCount, BADGES, checkBadges, resetProfile, salazarState } from '../game/profile.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const I = (n, s = 24, c = '') => iconSVG(n, s, c);
const comarca = (id) => COMARCAS.find(c => c.id === id);
const STAT_LABELS = ['Resistencia', 'Fuerza', 'Agilidad', 'Orientación', 'Naturaleza'];
const TYPE_NAME = { visit: 'Visita', process: 'Producto', harvest: 'Cosecha', herd: 'Ganadería', dance: 'Danza', carnival: 'Carnaval', trade: 'Oficio', legend: 'Leyenda', race: 'Carrera', observe: 'Naturaleza', tradition: 'Tradición', quiz: 'Preguntas' };
const TYPE_ICON = { visit: 'church', process: 'basket', harvest: 'wheat', herd: 'sheep', dance: 'dance', carnival: 'mask', trade: 'anvil', legend: 'legend', race: 'running', observe: 'binoculars', tradition: 'music', quiz: 'quiz' };
// Proyección de coordenadas geográficas al mapa de comarcas
const proj = (lat, lon) => [19 + (lon + 2.52) / 1.80 * 709, 17 + (43.325 - lat) / 1.43 * 765];
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
function townXY(lv) {
  const names = lv.name.split('/').map(s => norm(s));
  const hit = SETTLEMENTS.find(s => names.includes(norm(s[2])) || norm(s[2]).startsWith(names[0])) || SETTLEMENTS.find(s => names.some(n => norm(s[2]).includes(n)));
  if (hit) return proj(hit[0], hit[1]);
  const c = comarca(lv.comarca); return c ? [c.label.x, c.label.y + 20] : [380, 400];
}
const XY = new Map(LEVELS.map(l => [l.id, townXY(l)]));

function ring(p, size = 54, color = '#ffc85a', label = '') {
  const r = size / 2 - 5, C = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="6"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C * p} ${C}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="${size * 0.26}" font-weight="900">${label || Math.round(p * 100) + '%'}</text></svg>`;
}
function radar(stats, color = '#ffc85a') {
  const cx = 90, cy = 90, R = 64, pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
  const grid = [0.33, 0.66, 1].map(k => `<polygon points="${[0, 1, 2, 3, 4].map(i => pt(i, k).join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.18)"/>`).join('');
  const poly = `<polygon points="${stats.map((v, i) => pt(i, v / 100).join(',')).join(' ')}" fill="${color}55" stroke="${color}" stroke-width="3"/>`;
  const labels = STAT_LABELS.map((l, i) => { const [x, y] = pt(i, 1.28); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#e8dcc8" font-weight="800">${l}</text>`; }).join('');
  return `<svg class="radar" viewBox="-34 -8 248 200">${grid}${poly}${labels}</svg>`;
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
    this.root = el(`<div id="hub"><div class="hub-bg"></div>
      <header class="hub-top"><div class="brand logo">MENDIMENDIZ</div><div class="chip" id="hChip"></div></header>
      <nav class="hub-nav" id="hNav"></nav><main class="hub-main" id="hMain"></main></div>`);
    document.body.appendChild(this.root);
    this.nav = [['home', 'Inicio', 'home'], ['map', 'Mapa', 'map'], ['towns', 'Pueblos', 'church'], ['peaks', 'Cimas', 'peak'], ['nature', 'Naturaleza', 'leaf'], ['avatars', 'Personajes', 'person'], ['badges', 'Insignias', 'badge'], ['passport', 'Pasaporte', 'stamp'], ['profile', 'Perfil', 'gear']];
    $('#hNav', this.root).innerHTML = this.nav.map(([id, n, ic]) => `<button data-s="${id}">${I(ic, 26)}<span>${n}</span></button>`).join('');
    $('#hNav', this.root).addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.go(b.dataset.s); });
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
    this.root.querySelectorAll('#hNav button').forEach(b => b.classList.toggle('on', b.dataset.s === screen || (screen === 'comarca' && b.dataset.s === 'map')));
    const m = $('#hMain', this.root);
    m.innerHTML = this['s_' + screen](arg);
    m.scrollTop = 0;
    this.after?.(); this.after = null;
    this.renderChip();
  }
  renderChip() {
    const p = profile(), L = levelOf(p.xp);
    $('#hChip', this.root).innerHTML = `<img src="${avatarPortrait(p.avatar)}" alt=""><div><b>${esc(p.name || 'Aventurero')}</b><small>Nivel ${L.lv} · ${rankOf(L.lv)}</small><div class="xp"><i style="width:${L.cur / L.need * 100}%"></i></div></div><span class="stamps">${I('stamp', 22)}${stampCount(p)}</span>`;
    $('#hChip', this.root).onclick = () => this.go('profile');
  }

  // ---------- Inicio ----------
  s_home() {
    const p = profile(), N = navarraProgress(p), L = levelOf(p.xp);
    const last = levelById(p.last) || LEVELS.find(l => !townProgress(p, l).stamp) || LEVELS[0];
    const lp = townProgress(p, last);
    let doneM = 0, totM = 0; for (const l of LEVELS) { const t = townProgress(p, l); doneM += t.done; totM += t.total; }
    const av = AVATARS.find(a => a.id === p.avatar) || AVATARS[0];
    this.after = () => this.drawMiniMap($('#homeMap', this.root));
    return `
    <section class="hero" style="--bg:url(${landImg(last.comarca)})">
      <div class="hero-txt"><small class="kicker">${I('pin', 18)} ${esc(comarca(last.comarca)?.name || '')}</small>
        <h1>Cada pueblo,<br>una aventura.</h1>
        <p>Recorre Navarra pueblo a pueblo: ayuda a su gente, aprende sus oficios, sus danzas y sus leyendas, y llena tu pasaporte de sellos.</p>
        <div class="row"><button class="btn primary big" data-play="${last.id}">${I('play', 26)} ${lp.done ? 'Continuar en' : 'Jugar en'} ${esc(last.name)}</button><button class="btn" data-go="map">${I('map', 22)} Elegir en el mapa</button></div>
        ${lp.total ? `<div class="mini-prog"><div class="bar"><i style="width:${lp.done / lp.total * 100}%"></i></div><span>${lp.done}/${lp.total} misiones en ${esc(last.name)}</span></div>` : ''}
      </div>
      <div class="hero-fig"><img src="${avatarPortrait(p.avatar, 'full')}" alt=""><span class="tag">${esc(av.name)}</span></div>
    </section>
    <section class="tiles">
      <div class="tile">${I('stamp', 40)}<b>${N.stamps}<small>/${N.towns}</small></b><span>Sellos de pueblo</span></div>
      <div class="tile">${I('shield', 40)}<b>${N.comarcas}<small>/${N.comarcasTotal}</small></b><span>Comarcas completas</span></div>
      <div class="tile">${I('check', 40)}<b>${doneM}<small>/${totM}</small></b><span>Misiones</span></div>
      <div class="tile">${I('badge', 40)}<b>${p.badges.length}<small>/${BADGES.length}</small></b><span>Insignias</span></div>
      <div class="tile">${I('star', 40)}<b>${L.lv}</b><span>Nivel · ${p.xp} XP</span></div>
    </section>
    <section class="two">
      <div class="panel map-panel" data-go="map"><h2>${I('map', 30)} Mapa de Navarra</h2><div id="homeMap" class="mini-map"></div><p class="hint">Completa pueblos para iluminar sus comarcas.</p></div>
      <div class="panel next-panel"><h2>${I('exclaim', 30)} Te esperan</h2>${this.suggestions()}</div>
    </section>
    <h2 class="sec">${I('shield', 30)} Comarcas de Navarra</h2>
    <section class="comarcas">${COMARCAS.map(c => this.comarcaCard(c)).join('')}</section>
    <h2 class="sec">${I('mask', 30)} Leyendas y carnaval</h2>
    <section class="folk">${FOLKLORE.map(f => `<div class="folkcard"><img src="${portrait(FOLK_LOOK[f.id] || {}, 'bust', true)}" alt=""><div><small>${esc(f.origin)}</small><b>${esc(f.name)}</b><p>${esc(f.fact)}</p></div></div>`).join('')}</section>`;
  }
  suggestions() {
    const p = profile();
    const list = LEVELS.filter(l => !townProgress(p, l).stamp).slice(0, 4);
    return `<div class="sugg">${list.map(l => { const t = townProgress(p, l), c = comarca(l.comarca); return `<button class="sg" data-town="${l.id}" style="--c:${c?.color}"><span class="dot"></span><div><b>${esc(l.name)}</b><small>${esc(c?.name)} · ${t.done}/${t.total} misiones</small></div>${I('play', 26)}</button>`; }).join('')}</div>`;
  }
  comarcaCard(c) {
    const p = profile(), pr = comarcaProgress(p, c.id), ts = comarcaTowns(c.id);
    return `<button class="ccard ${ts.length ? '' : 'soon'}" data-comarca="${c.id}" style="--c:${c.color}">
      <div class="cimg" style="background-image:url(${landImg(c.id)})"></div>
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
    const labels = small ? '' : COMARCAS.map(c => `<text x="${c.label.x}" y="${c.label.y}" class="clabel" text-anchor="middle">${c.label.lines.map((l, i) => `<tspan x="${c.label.x}" dy="${i ? 13 : 0}">${esc(l)}</tspan>`).join('')}</text>`).join('');
    const pinsSvg = pins ? LEVELS.filter(l => !focus || l.comarca === focus).map(l => { const [x, y] = XY.get(l.id), t = townProgress(p, l); return `<g class="pin ${t.stamp ? 'ok' : t.done ? 'go' : ''}" data-town="${l.id}" transform="translate(${x} ${y})"><circle r="${small ? 5 : 8}"/>${small ? '' : `<text y="-13" text-anchor="middle">${esc(l.name.split(' /')[0])}</text>`}</g>`; }).join('') : '';
    return `<svg class="navarra" viewBox="10 10 725 780">${paths}${labels}${pinsSvg}</svg>`;
  }

  // ---------- Mapa ----------
  s_map() {
    return `<h1 class="title">${I('map', 40)} Mapa de Navarra</h1><p class="lead">Toca una comarca para ver sus pueblos, o un pueblo para jugar. Las comarcas se iluminan a medida que completas sus pueblos.</p>
      <div class="map-wrap"><div class="bigmap">${this.navarraSVG({ pins: true })}</div>
      <aside class="legend2"><div><i class="pin0"></i> Pueblo por descubrir</div><div><i class="pin1"></i> Misiones empezadas</div><div><i class="pin2"></i> Sello conseguido</div>
      <div class="navstats">${ring(navarraProgress(profile()).stamps / LEVELS.length, 96, '#ffc85a')}<span>de Navarra sellada</span></div></aside></div>`;
  }

  // ---------- Comarca ----------
  s_comarca(id) {
    const c = comarca(id); if (!c) return this.s_map();
    const p = profile(), pr = comarcaProgress(p, id), ts = comarcaTowns(id), C = c.culture || {};
    const block = (ic, k, o) => o ? `<div class="cult">${I(ic, 48)}<div><small>${k}${o.date ? ' · ' + esc(o.date) : ''}</small><b>${esc(o.title)}</b><p>${esc(o.text)}</p>${o.place ? `<em>${esc(o.place)}</em>` : ''}</div></div>` : '';
    const mts = (c.mountains || []).map(mid => MOUNTAINS.find(m => m.id === mid)).filter(Boolean).slice(0, 8);
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
    ${mts.length ? `<h2 class="sec">${I('peak', 30)} Cimas de la comarca</h2><section class="peaks">${mts.map(m => this.peakCard(m)).join('')}</section>` : ''}`;
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
  s_peaks(filter = 'all') {
    const p = profile();
    const list = MOUNTAINS.filter(m => filter === 'all' || m.region === filter).sort((a, b) => b.altitude - a.altitude);
    this.after = () => {
      this.root.querySelectorAll('.filters button').forEach(b => b.onclick = (e) => { e.stopPropagation(); this.go('peaks', b.dataset.f); });
      this.root.querySelectorAll('[data-peak]').forEach(b => b.onclick = (e) => { e.stopPropagation(); const id = b.dataset.peak; const i = p.peaks.indexOf(id); if (i >= 0) p.peaks.splice(i, 1); else p.peaks.push(id); checkBadges(); saveProfile(); this.sound?.ui(i >= 0 ? 'click' : 'coin'); this.go('peaks', filter, true); });
    };
    return `<h1 class="title">${I('peak', 40)} Cimas de Navarra</h1><p class="lead">${MOUNTAINS.length} montañas con su perfil. Marca las que subas de verdad con tu familia: ¡cada cima cuenta para tus insignias! Llevas <b>${p.peaks.length}</b>.</p>
      <div class="filters"><button data-f="all" class="${filter === 'all' ? 'on' : ''}">Todas</button>${COMARCAS.map(c => `<button data-f="${c.id}" class="${filter === c.id ? 'on' : ''}" style="--c:${c.color}">${esc(c.name)}</button>`).join('')}</div>
      <section class="peaks">${list.map(m => this.peakCard(m)).join('')}</section>`;
  }
  peakCard(m) {
    const done = profile().peaks.includes(m.id), c = comarca(m.region);
    return `<div class="pcard ${done ? 'done' : ''}" style="--c:${c?.color || '#6d3b5c'}"><div class="phead">${I('peak', 40)}<div><b>${esc(m.name)}</b><small>${esc(m.zone || '')}</small></div><span class="alt">${m.altitude} m</span></div>
      ${spark(m.profile)}<div class="pmeta"><span>${I('footprint', 18)} ${m.distance} km</span><span>${I('arrow', 18)} +${m.gain} m</span><span class="diff">${'<i></i>'.repeat(m.difficulty)}${'<i class="o"></i>'.repeat(Math.max(0, 5 - m.difficulty))}</span></div>
      <p>${esc(m.intro || '')}</p><button class="btn small ${done ? 'primary' : ''}" data-peak="${m.id}">${done ? I('check', 18) + ' Subida' : 'Marcar como subida'}</button></div>`;
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

  // ---------- Personajes ----------
  s_avatars() {
    const p = profile();
    this.after = () => this.root.querySelectorAll('[data-av]').forEach(b => b.onclick = (e) => { e.stopPropagation(); p.avatar = b.dataset.av; saveProfile(); this.sound?.ui('coin'); this.go('avatars', null, true); });
    return `<h1 class="title">${I('person', 40)} Personajes</h1><p class="lead">Elige con quién recorrer Navarra. Cada personaje viene de una tradición navarra.</p>
      <section class="avatars">${AVATARS.map(a => `<div class="acard ${p.avatar === a.id ? 'on' : ''}">
        <div class="aimgs"><img class="art" src="${avatarImg(a.id)}" alt=""><img class="fig" src="${avatarPortrait(a.id, 'full')}" alt=""></div>
        <div class="abody"><small>${esc(a.role)}</small><b>${esc(a.name)}</b><p>${esc(a.desc)}</p>${radar(a.stats)}<span class="abil">${I('sparkle', 20)} ${esc(a.ability)}</span>
        <button class="btn ${p.avatar === a.id ? 'primary' : ''}" data-av="${a.id}">${p.avatar === a.id ? I('check', 20) + ' Elegido' : 'Elegir'}</button></div></div>`).join('')}</section>`;
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
        <label class="set">Música <input type="checkbox" id="pMusic" ${S.music ? 'checked' : ''}></label>
        <label class="set">Volumen <input type="range" id="pVol" min="0" max="1" step="0.05" value="${S.volume}"></label>
        <label class="set">Calidad gráfica <select id="pQ"><option value="auto">Automática</option><option value="low">Baja (más fluido)</option><option value="mid">Media</option><option value="high">Alta</option></select></label>
        <p class="hint">Controles: WASD o flechas para caminar, ratón para mirar, E para hablar, Espacio para saltar, Mayús para correr. En móvil: arrastra a la izquierda para caminar y a la derecha para mirar.</p>
        <button class="btn danger" id="pReset">Borrar todo el progreso</button></div></section>`;
  }

  // ---------- Primera vez: nombre y personaje ----------
  onboarding() {
    const p = profile();
    let pick = p.avatar || 'sanferminero';
    const o = el(`<div class="onb"><div class="onb-in">
      <div class="logo big">MENDIMENDIZ</div><p class="tag">Navarra, pueblo a pueblo</p>
      <label>¿Cómo te llamas?<input id="oName" maxlength="14" autocomplete="off" placeholder="Tu nombre"></label>
      <p class="lbl">Elige tu personaje</p>
      <div class="opick">${AVATARS.map(a => `<button data-a="${a.id}" class="${a.id === pick ? 'on' : ''}"><img src="${avatarPortrait(a.id)}" alt=""><span>${esc(a.name)}</span></button>`).join('')}</div>
      <button class="btn primary big" id="oGo">${I('play', 26)} ¡Empezar la aventura!</button></div></div>`);
    this.root.appendChild(o);
    const inp = $('#oName', o); inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); });
    o.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { pick = b.dataset.a; o.querySelectorAll('[data-a]').forEach(x => x.classList.toggle('on', x === b)); this.sound?.init?.(); this.sound?.ui('click'); });
    const go = () => { p.name = inp.value.trim() || 'Mendi'; p.avatar = pick; saveProfile(); this.sound?.init?.(); this.sound?.ui('open'); o.remove(); this.go('home', null, true); };
    $('#oGo', o).onclick = go;
    setTimeout(() => inp.focus(), 100);
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
  'comparsa-peralta': { shirt: '#e03c3c', pattern: 'dots', pattern2: '#f2c230', hat: 'cone', hatColor: '#3ca05a' },
  zipotero: { shirt: '#3a8fd6', pattern: 'stripes', pattern2: '#f2c230', hat: 'mask', hatColor: '#f2c230', face: 'angry' },
  lamia: { skin: '#f1d7b8', hair: '#e8c34a', hairStyle: 'long', lashes: true, shirt: '#6ab0a0', print: 'blouse', bodice: '#3a8a7a' },
  basajaun: { skin: '#c49a78', hair: '#5a3a22', hairStyle: 'long', beard: '#5a3a22', fur: '#6b4a2e', shirt: '#6b4a2e' },
  tartalo: { skin: '#c9a27a', hair: '#3b2418', shirt: '#6b4a2e', fur: '#8a6a4a', face: 'angry' },
};
