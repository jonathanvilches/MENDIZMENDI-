// Centro de mando: inicio, mapa de Navarra, comarcas, pueblos, cimas, naturaleza, personajes, insignias, pasaporte y perfil.
import COMARCAS from '../data/comarcas.json';
import { txapelas as TXAPELAS } from '../game/torneo.js';
import MOUNTAINS from '../data/mountains.json';
import { CAST as AVATARS, STAT_LABELS, castById } from '../data/cast.js';
import FOLKLORE from '../data/folklore.json';
import SETTLEMENTS from '../data/settlements.json';
import { LEVELS, levelById } from '../data/levels.js';
import { iconSVG, speciesIcon } from '../ui/icons.js';
import { showFicha, allFichas } from '../ui/ficha.js';
import { floraId } from '../data/flora.js';
import { faunaId } from '../data/fauna.js';
import { floraIllustration } from '../ui/floraArt.js';
import { readTownArms } from '../ui/escudo.js';
import { releaseOffscreen } from '../util/offscreen.js';
import { avatarPortrait, portraitImg, avatarPortraitImg } from '../ui/portraits.js';
import { stampImg, landImg, townImg } from '../assets.js';
import { Stage, releaseStage } from './stage.js';
import { getLang, setLang, langChosen } from '../i18n.js';
import { dioramaShot, heroAvatar, heroAction, townCover, heroPose } from './diorama.js';
import { CLUBS } from '../futbol/clubs.js';
import { SABERES, saberCounts } from '../data/saberes.js';
import { EDADES, edadDe, missionSlots } from '../data/edad.js';
import { ARMAS, PENDIENTES, FIG, GUIA, armsOfTown } from '../data/armas-navarra.js';
import { drawOfficial, officialHeight } from '../world/armas.js';
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
    this.nav = [['home', 'Inicio', 'home'], ['map', 'Mapa', 'map'], ['towns', 'Pueblos', 'church'], ['sports', 'Campeonatos', 'trophy'], ['avatars', 'Personajes', 'person'], ['peaks', 'Cimas', 'peak', 1], ['nature', 'Naturaleza', 'leaf', 1], ['escudos', 'Escudos', 'shield', 1], ['badges', 'Insignias', 'badge', 1], ['passport', 'Pasaporte', 'stamp', 1], ['profile', 'Perfil', 'gear', 1]];
    this.MORE = { peaks: 'Montañas de Navarra con su perfil', nature: 'Fauna, árboles, plantas y flores', escudos: 'Escudos de Navarra y cómo se leen', badges: 'Tus logros', passport: 'Los sellos de tus pueblos', profile: 'Nombre, nivel y ajustes' };
    $('#hNav', this.root).innerHTML = this.nav.map(([id, n, ic, sec]) => `<button data-s="${id}" class="${sec ? 'nav2' : ''}">${I(ic, 26)}<span>${n}</span></button>`).join('') + `<button data-s="more" class="more-btn"><svg viewBox="0 0 24 24" width="26" height="26"><circle cx="5" cy="12" r="2.4" fill="#f7f0e6"/><circle cx="12" cy="12" r="2.4" fill="#f7f0e6"/><circle cx="19" cy="12" r="2.4" fill="#f7f0e6"/></svg><span>Más</span></button>`;
    $('#hNav', this.root).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.s === 'more') return this.more(); this.go(b.dataset.s); });
    this.root.addEventListener('click', e => {
      const t = e.target.closest('[data-go],[data-town],[data-comarca],[data-play],[data-sport],[data-fronton]'); if (!t) return;
      if (t.dataset.fronton) { this.frontonTown = t.dataset.fronton; this.sound?.ui('click'); return this.go('sports', undefined, true); }
      if (t.dataset.sport) { this.sound?.ui('open'); return this.onSport?.(t.dataset.sport, t.dataset.sport === 'pelota' ? this.frontonId() : null); }
      if (t.dataset.play) return this.play(t.dataset.play);
      if (t.dataset.town) return this.townSheet(t.dataset.town);
      if (t.dataset.comarca) return this.go('comarca', t.dataset.comarca);
      if (t.dataset.go) this.go(t.dataset.go);
    });
    this.screen = 'home';
  }
  show(screen = this.screen, arg = this.arg) { this.root.classList.remove('hidden'); this.visible = true; this.go(screen, arg, true); if (!langChosen()) this.langPicker(); else if (!profile().name) this.onboarding(); }
  hide() { this.root.classList.add('hidden'); this.visible = false; this.sheet?.remove(); releaseStage(); this.stage = null; releaseOffscreen(); }
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
    if (!this['s_' + screen]) { screen = this.screen = 'home'; this.root.dataset.screen = screen; }   // pantalla desconocida: la portada
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
    const next = missionSlots(last, edadDe(p)).map(({ m, si }) => ({ m, i: si })).find(x => !done[x.i]);
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
    const ms = missionSlots(last, edadDe(p)).map(({ m, si: i }) => `<span class="mi ${done[i] ? 'ok' : ''}" title="${esc(m.title || m.name || TYPE_NAME[m.type] || '')}">${I(TYPE_ICON[m.type] || 'star', 40)}${done[i] ? `<i class="tick">${I('check', 16)}</i>` : ''}</span>`).join('');
    this.after = () => {
      // portada de juego: una imagen fija con el personaje dentro de la escena de su comarca, sin escena 3D en vivo (en el
      // móvil montaba el diorama entero y un segundo WebGL solo para el menú). Si faltara, foto y personaje por separado
      const fig = $('.hero-av', this.root);
      if (fig) fig.onclick = () => { fig.classList.remove('hop'); void fig.offsetWidth; fig.classList.add('hop'); this.sound?.ui('click'); };
      this.drawMiniMap($('#homeMap', this.root));
      this.lazyLand();
    };
    const next = this.suggestions();
    return `
    <section class="hero3d">
      ${heroAvatar(p.avatar) ? `<div class="hero-img key" style="--bg:url(${landImg(last.comarca, 1280, 720, true)})"></div><img class="hero-av key" src="${heroAvatar(p.avatar)}" alt="">`
        : `<div class="hero-img" style="background-image:url(${landImg(last.comarca, 1280, 720, true)})">${avatarPortraitImg(p.avatar, 'hero').replace('<img ', '<img class="hero-av" ')}</div>`}
      <div class="h-shade"></div>
      <button class="chapter" data-comarca="${last.comarca}" style="--c:${cm?.color}"><img src="${stampImg(last.comarca)}" alt=""><span><small>Capítulo ${chapter} · ${esc(cm?.name || '')}</small><b>${cpr.stamps}/${cts.length} sellos de la comarca</b><span class="cbar"><i style="width:${cts.length ? cpr.stamps / cts.length * 100 : 0}%"></i></span></span></button>
      <div class="h-bot">
        <small class="kicker">${lp.done ? 'Sigue tu aventura en' : 'Próxima parada'}</small>
        <h1>${esc(last.name.split(' /')[0])}</h1>
        <div class="mrow">${ms}<span class="mcount">${lp.done}/${lp.total}<small>misiones</small></span></div>
        <div class="h-cta"><button class="btn primary big go" data-play="${last.id}">${I('play', 28)} <span>${lp.done ? '¡Seguimos!' : '¡A la aventura!'}</span></button><button class="btn ghost sq" data-go="map" aria-label="Elegir en el mapa">${I('map', 30)}<span>Mapa</span></button></div>
      </div>
    </section>
    <section class="saberes">
      <div class="sb-head"><small class="kicker">${I('book', 20)} Lo más importante</small><h2>Aprende Navarra jugando</h2>
        <p>Cada misión, cada paseo y cada partido te enseñan algo de Navarra: su producto local, su arquitectura y sus escudos, su historia, su campo, su fauna, su flora y sus tradiciones. Cada cosa que aprendes es una carta.</p></div>
      <button class="btn ghost sb-arms" data-go="escudos">${I('shield', 26)} Escudos de Navarra: cómo se leen y qué significan</button>
      <div class="sb-grid">${(() => { const n = saberCounts(p); return SABERES.map(sb => `<div class="sb ${n[sb.id] ? 'on' : ''}${sb.id === 'escudos' ? ' link' : ''}" title="${esc(sb.text)}"${sb.id === 'escudos' ? ' data-go="escudos" role="button" tabindex="0"' : ''}>${I(sb.icon, 34)}<b>${n[sb.id]}</b><span>${esc(sb.name)}</span><small>${esc(sb.text)}</small></div>`).join(''); })()}</div>
    </section>
    <section class="story">
      <div class="st-txt"><small class="kicker">${I('book', 20)} La historia</small><h2>El Pasaporte Mendi</h2>
        <p>Las páginas del viejo pasaporte se han quedado en blanco. Cada pueblo de Navarra guarda su sello, pero solo lo entrega a quien ayuda a su gente y aprende de ella: su producto, sus casas y escudos, sus oficios, sus danzas y sus leyendas.</p></div>
      <ol class="hsteps"><li>${I('map', 56)}<b>Viaja</b><span>Elige un pueblo en el mapa</span></li><li>${I('exclaim', 56)}<b>Ayuda</b><span>Habla con su gente y cumple sus misiones</span></li><li>${I('stamp', 56)}<b>Consigue el sello</b><span>Y llena tu pasaporte</span></li></ol>
    </section>
    <button class="sports-cta" data-go="sports">${I('trophy', 44)}<div><b>Campeonatos</b><small>Pelota a mano y fútbol, sin entrar en un pueblo</small></div>${I('play', 26)}</button>
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
  // ---------- Campeonatos ----------
  // pelota a mano y fútbol sin entrar en las misiones de un pueblo: la pelota se juega en el frontón del pueblo que se
  // elija; el fútbol, con tu club (Liga Navarra, amistosos, El Sadar y fútbol sala)
  frontonId() { const p = profile(); return levelById(this.frontonTown)?.id || levelById(p.last)?.id || LEVELS[0].id; }
  s_sports() {
    const p = profile(), fl = levelById(this.frontonId()), club = CLUBS[p.futbolClub], tx = p.txapelas || 0;
    let fb = null; try { fb = JSON.parse(localStorage.getItem('mendimendiz-futbol-v1') || 'null'); } catch (e) { }
    const avP = heroPose('pelotari', 'golpea'), avF = heroPose('osasuna', 'celebra'), sadar = levelById('pamplona');
    const towns = LEVELS.filter(l => !l.special).map(l => `<button class="fr-chip ${l.id === fl.id ? 'on' : ''}" data-fronton="${l.id}">${esc(l.name.split(' /')[0])}</button>`).join('');
    this.after = () => { $('.fr-chip.on', this.root)?.scrollIntoView({ block: 'nearest', inline: 'center' }); };
    return `
    <h2 class="sec">${I('trophy', 34)} Campeonatos</h2>
    <p class="hint sp-hint">Juega sin entrar en las misiones de un pueblo. Lo que ganes cuenta igual.</p>
    <section class="sports">
      <div class="sport" style="--bg:url(${townImg(fl)})">
        ${avP ? `<img class="sp-av" src="${avP}" alt="">` : ''}
        <div class="sp-txt"><small class="kicker">Frontón de ${esc(fl.name.split(' /')[0])}</small><h3>Pelota a mano</h3>
          <p>Partido libre o el torneo de mano por la txapela de la comarca: cuartos, semifinal y final.</p>
          <span class="sp-stat">${I('txapela', 22)} ${tx} ${tx === 1 ? 'txapela' : 'txapelas'}</span></div>
        <div class="fr-pick"><small>Elige frontón</small><div class="fr-rail">${towns}</div></div>
        <button class="btn primary big" data-sport="pelota">${I('play', 26)} <span>Jugar a pelota</span></button>
      </div>
      <div class="sport" style="--bg:url(${townImg(sadar)})">
        ${avF ? `<img class="sp-av" src="${avF}" alt="">` : ''}
        <div class="sp-txt"><small class="kicker">${club ? 'Tu club: ' + esc(club.name) : 'Elige tu club'}</small><h3>Fútbol</h3>
          <p>Liga Navarra con tu club, amistosos contra cualquier club, fútbol 11 en El Sadar y fútbol sala 5 contra 5.</p>
          <span class="sp-stat">${I('balon', 22)} ${fb?.played || 0} partidos · ${fb?.won || 0} ganados</span></div>
        <button class="btn primary big" data-sport="futbol">${I('play', 26)} <span>Jugar a fútbol</span></button>
      </div>
    </section>`;
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
      <div class="cbody"><b>${esc(c.name)}</b><small>${ts.length} pueblos jugables · ${pr.stamps} sellos${ts.length ? ` · ${TXAPELAS()[c.id] ? '¡txapela de pelota!' : 'txapela: por ganar'}` : ''}</small></div>
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
    // cada animal y planta abre su ficha
    const chip = (n, fb, key, title = '') => key ? `<button class="nchip" data-k="${key}" title="${esc(title)}">${I(speciesIcon(n) || fb, 26)}${esc(n)}</button>` : `<span class="nchip" title="${esc(title)}">${I(speciesIcon(n) || fb, 26)}${esc(n)}</span>`;
    const chips = (arr, fb) => (arr || []).map(n => { const k = floraId(n); return chip(n, fb, k && 'flora:' + k); }).join('');
    this.after = () => this.root.querySelectorAll('.nchip[data-k]').forEach(b => b.onclick = () => showFicha(b.dataset.k, { ui: { sound: this.sound }, button: 'Cerrar' }));
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
        <h3>Fauna</h3><div class="nchips">${(c.fauna || []).map(f => { const k = faunaId(f[0]); return chip(f[0], 'bird', k && 'fauna:' + k, f[2]); }).join('')}</div>
        <h3>Árboles</h3><div class="nchips">${chips(c.nature?.trees, 'tree')}</div>
        <h3>Plantas</h3><div class="nchips">${chips(c.nature?.plants, 'herbs')}</div>
        <h3>Flores</h3><div class="nchips">${chips(c.nature?.flowers, 'flower')}</div></div>
    </section>
    ${mts.length ? `<h2 class="sec">${I('peak', 30)} Cimas para subir</h2><section class="peaks">${mts.map(m => this.peakCard(m, LEVELS.find(l => (l.missions || []).some(x => x.type === 'summit' && x.peak === m.id)))).join('')}</section>` : ''}`;
  }
  townCard(l) {
    const p = profile(), t = townProgress(p, l), c = comarca(l.comarca);
    const types = (l.missions || []).map(m => m.type);
    const cov = townCover(l.id, true);
    return `<button class="tcard ${t.stamp ? 'stamped' : ''}${cov ? ' has-cov' : ''}" data-town="${l.id}" style="--c:${c?.color}">
      ${cov ? `<img class="tcov" src="${cov}" alt="" loading="lazy" decoding="async">` : ''}
      <div class="thead">${I(l.special ? 'castle' : ({ romanesque: 'church', gothic: 'church', baroque: 'church', fortress: 'castle', cathedral: 'cathedral', pamplona: 'cathedral' }[l.church?.style] || 'church'), 44)}<div><b>${esc(l.name)}</b><small>${esc(c?.name)}</small></div>${t.stamp ? `<img class="tstamp" src="${stampImg(l.comarca)}" alt="">` : ''}</div>
      <p>${esc(l.intro || '')}</p>
      <div class="ticons">${(l.special ? ['visit', 'herd', 'legend', 'dance', 'observe', 'carnival'] : types).map(ty => `<span title="${TYPE_NAME[ty]}">${I(TYPE_ICON[ty], 24)}</span>`).join('')}</div>
      <div class="mini-prog"><div class="bar"><i style="width:${t.total ? t.done / t.total * 100 : 0}%"></i></div><span>${t.done}/${t.total}</span></div></button>`;
  }
  townSheet(id) {
    const l = levelById(id); if (!l) return;
    this.sound?.ui('open');
    const p = profile(), t = townProgress(p, l), c = comarca(l.comarca), ts = p.towns[id];
    const ms = l.special ? [{ type: 'visit', title: 'Ongi etorri a Otsagabia' }, { type: 'herd', title: 'El rebaño de Joxemari' }, { type: 'observe', title: 'Guardianes de Irati' }, { type: 'legend', title: 'Basajaun y la Lamia' }, { type: 'carnival', title: 'El Zarratrako' }, { type: 'dance', title: 'La fiesta de Muskilda' }]
      : missionSlots(l, edadDe(p)).map(x => x.m);
    const title = (m) => m.title || (m.type === 'visit' ? `Conoce ${l.name}` : m.type === 'quiz' ? `El sabio de ${l.name}` : m.name || m.product || TYPE_NAME[m.type]);
    const hero = heroAction(p.avatar, l.id);
    const s = el(`<div class="sheet"><div class="sheet-in" style="--c:${c?.color};--bg:url(${townImg(l)})">
      <button class="x" aria-label="Cerrar">${I('close', 22)}</button>
      <div class="sh-hero${hero ? ' key' : ''}" data-acc="${hero?.acc || ''}">${hero ? `<div class="sh-avW"><img class="sh-av" src="${hero.url}" alt=""></div>` : ''}<small class="kicker">${esc(c?.name)}</small><h1>${esc(l.name)}</h1><p>${esc(l.intro || '')}</p></div>
      <div class="sh-body">
        <h3>${I('check', 24)} Misiones (${t.done}/${t.total})</h3>
        <ul class="mlist">${ms.map((m, i) => { const k = l.missions?.includes(m) ? l.missions.indexOf(m) : i; return `<li class="${ts?.done?.[k] ? 'ok' : ''}">${I(TYPE_ICON[m.type], 34)}<div><b>${esc(title(m))}</b><small>${TYPE_NAME[m.type]}${m.host ? ' · con ' + esc(m.host.name) : ''}</small></div>${ts?.done?.[k] ? I('check', 26) : ''}</li>`; }).join('')}</ul>
        ${armsOfTown(l.id) ? `<h3>${I('shield', 24)} Su escudo</h3><div class="sh-arms"><canvas width="120" height="${Math.ceil(officialHeight(90, armsOfTown(l.id))) + 6}"></canvas><p><b>${esc(armsOfTown(l.id).name)}.</b> ${esc(armsOfTown(l.id).read)} <button class="lnk" data-go="escudos">Ver todos los escudos</button></p></div>` : ''}
        ${l.church ? `<h3>${I('church', 24)} Qué visitar</h3><ul class="plist"><li><b>${esc(l.church.name)}</b> ${esc(l.church.text)}</li>${(l.landmarks || []).map(x => `<li><b>${esc(x.name)}</b> ${esc(x.text)}</li>`).join('')}</ul>` : ''}
      </div>
      <div class="sh-foot"><button class="btn primary big" data-play="${l.id}">${I('play', 28)} ${t.done ? 'Seguir jugando' : 'Jugar'} en ${esc(l.name)}</button></div></div></div>`);
    this.sheet?.remove(); this.sheet = s; this.root.appendChild(s);
    { const A = armsOfTown(l.id), c = s.querySelector('.sh-arms canvas'); if (A && c) drawOfficial(c.getContext('2d'), c.width / 2, 3, 90, A); }
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
      ${spark(m.profile)}<div class="pmeta"><span>${String(Math.round(m.distance * 10) / 10).replace('.', ',')} km</span><span>+${m.gain} m</span><span class="diff">${'<i></i>'.repeat(m.difficulty)}${'<i class="o"></i>'.repeat(Math.max(0, 5 - m.difficulty))}</span></div>
      <p>${esc(m.intro || '')}</p>
      ${town ? (done ? `<span class="pbadge ok">${I('check', 18)} Cima conseguida</span>` : `<button class="btn small primary" data-town="${town.id}">${I('play', 18)} Misión en ${esc(town.name.split(' /')[0])}</button>`) : ''}</div>`;
  }

  // ---------- Naturaleza ----------
  // la guía de campo: todos los animales y plantas de las comarcas, cada uno con su ficha (al tocarlo). Los que has
  // observado (prismáticos, monte, granja) o identificado (herbario de los pueblos) quedan marcados
  s_nature(tab = 'fauna') {
    const p = profile(), cards = new Set(p.cards);
    const obsMap = { corzo: 'corzo', ciervo: 'ciervo', jabali: 'jabali', buitre: 'buitre' };
    for (const sp of p.species || []) if (obsMap[sp]) cards.add('fauna:' + obsMap[sp]);
    const type = tab === 'fauna' ? 'fauna' : 'flora';
    const kindOk = (d) => tab === 'fauna' || (tab === 'trees' ? d.F.m.t === 'tree' : tab === 'flowers' ? d.F.m.t === 'flower' : d.F.m.t !== 'tree' && d.F.m.t !== 'flower');
    const list = allFichas(type).filter(kindOk).sort((a, b) => (cards.has(type + ':' + b.id) - cards.has(type + ':' + a.id)) || a.F.name.localeCompare(b.F.name, 'es'));
    const nFl = allFichas('flora').length, gotFl = allFichas('flora').filter(d => cards.has('flora:' + d.id)).length, nFa = allFichas('fauna').length, gotFa = allFichas('fauna').filter(d => cards.has('fauna:' + d.id)).length;
    this.after = () => {
      this.root.querySelectorAll('.filters button').forEach(b => b.onclick = (e) => { e.stopPropagation(); this.go('nature', b.dataset.f); });
      this.root.querySelectorAll('.scard[data-k]').forEach(c => c.onclick = () => showFicha(c.dataset.k, { ui: { sound: this.sound }, button: 'Cerrar' }));
      // láminas de las plantas, de una en una (sin bloquear la pantalla)
      const imgs = [...this.root.querySelectorAll('img[data-flora]')], scr = this.screen;
      (async () => { for (const img of imgs) { await new Promise(r => setTimeout(r, 16)); if (this.screen !== scr || !img.isConnected) return; const u = floraIllustration(img.dataset.flora, 260, 220); if (u) { img.src = u; img.classList.add('on'); } } })();
    };
    const fb = { trees: 'tree', plants: 'herbs', flowers: 'flower' };
    const pic = (d) => d.type === 'fauna' ? I(d.F.icon || speciesIcon(d.F.name) || 'bird', 64) : `<span class="spic">${I(speciesIcon(d.F.name) || fb[tab], 40)}<img alt="" data-flora="${d.id}"></span>`;
    return `<h1 class="title">${I('leaf', 40)} Naturaleza de Navarra</h1><p class="lead">Del hayedo atlántico a las Bardenas: cada comarca tiene sus animales y plantas. Toca uno para ver su ficha. En los pueblos, identifica las plantas marcadas con una hoja y observa los animales para completar tu cuaderno.</p>
      <div class="nprog"><span>${I('leaf', 22)} Herbario <b>${gotFl}</b> / ${nFl}</span><span>${I('binoculars', 22)} Cuaderno de fauna <b>${gotFa}</b> / ${nFa}</span></div>
      <div class="filters">${[['fauna', 'Fauna'], ['trees', 'Árboles'], ['plants', 'Arbustos y plantas'], ['flowers', 'Flores']].map(([k, n]) => `<button data-f="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <section class="species">${list.map(d => { const got = cards.has(type + ':' + d.id); return `<button class="scard ${got ? 'seen' : ''}" data-k="${type}:${d.id}">${pic(d)}<b>${esc(d.F.name)}</b><small class="seu">${esc(d.F.eu || '')}${d.F.eu && d.F.sci ? ' · ' : ''}<i>${esc(d.F.sci || '')}</i></small><div class="where">${d.comarcas.map(c => `<i style="background:${c.color}" title="${esc(c.name)}"></i>`).join('')}</div>${got ? `<span class="seenb">${I(type === 'flora' ? 'check' : 'binoculars', 18)} ${type === 'flora' ? 'Identificada' : 'Observado'}</span>` : ''}</button>`; }).join('')}</section>`;
  }

  // ---------- Personajes: selección con el modelo 3D en grande ----------
  castInfo(a) {
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
      <div class="cs-side"><div class="csel-info" id="csInfo">${this.castInfo(cur)}</div></div>
      <div class="cs-roster">${this.castStrip(cur.id)}</div>${extra ? `<div class="cs-extra">${extra}</div>` : ''}
    </section>`;
  }
  bindSelector(host, start, onPick) {
    let cur = start;
    // centra el retrato elegido en la tira sin mover la página
    const center = (id, smooth) => { const b = host.querySelector(`[data-av="${id}"]`), st = b?.parentElement; if (!st) return; st.scrollTo({ left: b.offsetLeft - st.clientWidth / 2 + b.offsetWidth / 2, behavior: smooth ? 'smooth' : 'auto' }); };
    this.stage = new Stage($('#avStage', host), cur);
    const set = (id, dir = 0) => {
      if (id === cur) return; cur = id; const a = castById(id);
      this.stage.setAvatar(id); this.sound?.ui('coin');
      const sec = $('.csel2', host); sec.style.setProperty('--c', a.color);
      const info = $('#csInfo', host); info.innerHTML = this.castInfo(a); info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
      $('.cs-bgname', host).textContent = a.name; $('.cs-count b', host).textContent = AVATARS.indexOf(a) + 1;
      host.querySelectorAll('[data-av]').forEach(x => x.classList.toggle('on', x.dataset.av === id));
      center(id, true);
      onPick(a);
    };
    const step = (d) => { const i = AVATARS.findIndex(a => a.id === cur); set(AVATARS[(i + d + AVATARS.length) % AVATARS.length].id, d); };
    host.querySelectorAll('[data-av]').forEach(b => b.onclick = (e) => { e.stopPropagation(); set(b.dataset.av); });
    host.querySelectorAll('[data-step]').forEach(b => b.onclick = (e) => { e.stopPropagation(); step(+b.dataset.step); });
    const key = (e) => { if (!host.isConnected) return removeEventListener('keydown', key); if (e.target.tagName === 'INPUT') return; if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    addEventListener('keydown', key);
    center(cur);
  }
  s_avatars() {
    const p = profile(), cur = castById(p.avatar);
    this.after = () => this.bindSelector(this.root, p.avatar, (a) => { p.avatar = a.id; saveProfile(); this.renderChip(); $('#csGo', this.root).innerHTML = `${I('play', 26)} Jugar con ${esc(a.name)}`; });
    return `<div class="cs-top"><h1 class="title">Elige tu personaje</h1><button class="btn primary big" id="csGo" data-go="home">${I('play', 26)} Jugar con ${esc(cur.name)}</button></div>
      ${this.selector(cur)}`;
  }

  // ---------- Insignias ----------
  // ---------- Escudos de Navarra ----------
  s_escudos() {
    const p = profile(), seen = new Set(p.cards || []), tn = (id) => (levelById(id)?.name || id).split(' /')[0];
    const KIND = { reino: 'Reino', ciudad: 'Ciudad', valle: 'Valle', municipio: 'Municipio' };
    const read = ARMAS.filter(A => seen.has('armas:' + A.id)).length;
    this.after = () => this.root.querySelectorAll('.ar canvas[data-arm]').forEach(c => { const A = ARMAS.find(a => a.id === c.dataset.arm); try { drawOfficial(c.getContext('2d'), c.width / 2, 4, 120, A); } catch (e) { console.warn(A.id, e); }
      c.style.cursor = 'pointer'; c.onclick = () => readTownArms({ sound: this.sound }, A, { town: A.towns.length ? tn(A.towns[0]) : A.name }); });
    return `<section class="armorial">
      <div class="ar-head"><small class="kicker">${I('shield', 20)} Saberes · Escudos</small><h1>Escudos de Navarra</h1>
        <p>Los escudos son una forma de escribir con dibujos: cada color, cada figura y cada sitio quieren decir algo. Aquí están los escudos oficiales del reino, de las ciudades, de los valles y de los pueblos del juego. En cada pueblo, el escudo está en la fachada del ayuntamiento o en un pilar de la plaza: léelo allí para guardarlo en tu armorial. Toca un escudo para ver su ficha.</p>
        <b class="ar-count">${read} de ${ARMAS.length} leídos en el juego</b></div>
      <details class="ar-guia" open><summary>${I('book', 22)} Cómo se lee un escudo</summary><ol>${GUIA.map(([t, d]) => `<li><b>${esc(t)}.</b> ${esc(d)}</li>`).join('')}</ol></details>
      <div class="ar-grid">${ARMAS.map(A => `<article class="ar${seen.has('armas:' + A.id) ? ' on' : ''}">
        <canvas data-arm="${A.id}" width="160" height="${Math.ceil(officialHeight(120, A)) + 8}" aria-label="Escudo de ${esc(A.name)}"></canvas>
        <div class="ar-tx"><small>${KIND[A.kind] || ''}${A.towns.length ? ' · ' + esc(A.towns.map(tn).join(', ')) : ''}</small><h3>${esc(A.name)}</h3>${seen.has('armas:' + A.id) ? `<span class="ar-ok">${I('check', 16)} Leído en el juego</span>` : ''}
          <p><b>Blasón.</b> ${esc(A.blazon)}</p>
          <details><summary>Cómo se lee y qué significa</summary><p><b>Cómo se lee.</b> ${esc(A.read)}</p><p><b>Su historia.</b> ${esc(A.mean)}</p>
            <ul>${(A.figs || []).filter(k => FIG[k]).map(k => `<li><b>${esc(FIG[k][0])}.</b> ${esc(FIG[k][1])}</li>`).join('')}</ul>${A.conf === 'media' ? '<p class="ar-nt">La fuente resume este escudo: el dibujo puede simplificar algún detalle.</p>' : ''}</details></div></article>`).join('')}</div>
      <div class="ar-pend"><h3>${I('binoculars', 22)} Por comprobar</h3><p>De estos pueblos del juego aún no hemos podido comprobar el escudo en una fuente fiable. Por eso no lo dibujamos: preferimos no inventarlo.</p>
        <ul>${PENDIENTES.map(x => `<li><b>${esc(x.name)}.</b> ${esc(x.note || '')}</li>`).join('')}</ul></div>
      <p class="ar-src">Fuentes: Heraldry of the World (blasones municipales), Ayuntamiento de Pamplona, Ayuntamiento de Sangüesa, Gran Enciclopedia de Navarra, Auñamendi Eusko Entziklopedia y Cátedra de Patrimonio de la Universidad de Navarra. Los dibujos son del juego, hechos a partir del blasón.</p>
    </section>`;
  }
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
        <div class="pstamps">${ts.length ? ts.map(l => { const t = townProgress(p, l), fut = p.towns?.[l.id]?.futsal?.sello; return `<button class="pst ${t.stamp ? 'on' : ''}" data-town="${l.id}"><span class="ink">${I(t.stamp ? 'stamp' : 'lock', 30)}</span>${fut ? `<i class="fsello" title="Sello de fútbol sala">${I('balon', 18)}</i>` : ''}<small>${esc(l.name.split(' /')[0])}</small></button>`; }).join('') : '<small class="empty">Próximamente</small>'}</div></div>`; }).join('')}</section>`;
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
      $('#pAge', r).value = edadDe(p); $('#pAge', r).onchange = e => { p.age = e.target.value; saveProfile(); this.sound?.ui('click'); this.go('profile', undefined, true); };
      $('#pQ', r).onchange = e => { S.quality = e.target.value === 'auto' ? null : e.target.value; S.qualityAuto = false; saveProfile(); this.onSettings?.(S); };
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
        <label class="set">Edad <select id="pAge">${EDADES.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}</select></label>
        <p class="set-note">${esc(EDADES.find(e => e.id === edadDe(p)).text)}. Cambiar de edad no borra nada de lo que ya has hecho.</p>
        <label class="set">Idioma <select id="pLang"><option value="eu">Euskara</option><option value="es">Castellano</option><option value="learn">Aprende euskera</option></select></label>
        <label class="set">Música <input type="checkbox" id="pMusic" ${S.music ? 'checked' : ''}></label>
        <label class="set">Volumen <input type="range" id="pVol" min="0" max="1" step="0.05" value="${S.volume}"></label>
        <label class="set">Calidad gráfica <select id="pQ"><option value="auto">Automática</option><option value="low">Baja (más fluido)</option><option value="mid">Media</option><option value="high">Alta</option></select></label>
        <p class="hint">Controles: WASD o flechas para caminar, ratón para mirar, E para hablar, Espacio para saltar, Mayús para correr. En móvil: arrastra a la izquierda para caminar y a la derecha para mirar.</p>
        <button class="btn danger" id="pReset">Borrar todo el progreso</button></div></section>`;
  }

  // ---------- Primera vez: el idioma (antes que nada; en los dos idiomas, porque aún no se sabe cuál) ----------
  langPicker() {
    const o = el(`<div class="onb langpick"><div class="lp-in">
      <div class="logo">MENDIMENDIZ</div>
      <h2>Hautatu hizkuntza <span>· Elige idioma</span></h2>
      <div class="lp-opts">
        <button data-lang="eu"><b>Euskara</b><small>Jolastu euskaraz</small></button>
        <button data-lang="es"><b>Castellano</b><small>Jugar en castellano</small></button>
        <button data-lang="learn" class="learn"><b>Aprende euskera</b><small>Euskaraz jolastu, con la traducción al castellano a un toque</small></button>
      </div>
      <p class="lp-note">Gero aldatu dezakezu Profilean · Puedes cambiarlo luego en Perfil</p>
    </div></div>`);
    this.root.appendChild(o);
    o.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { this.sound?.ui?.('click'); setLang(b.dataset.lang); });   // guarda y recarga en ese idioma
  }

  // ---------- Primera vez: nombre y personaje ----------
  onboarding() {
    const p = profile();
    let pick = p.avatar || AVATARS[0].id, age = p.age || 'nino';
    const o = el(`<div class="onb"><div class="onb-in">
      <header class="onb-head"><div class="logo">MENDIMENDIZ</div><p class="tag">Navarra, pueblo a pueblo</p>
        <div class="langsel" role="group" aria-label="Idioma"><button data-lang="eu" class="${getLang() === 'eu' ? 'on' : ''}">Euskara</button><button data-lang="es" class="${getLang() === 'es' ? 'on' : ''}">Castellano</button><button data-lang="learn" class="${getLang() === 'learn' ? 'on' : ''}">Aprende euskera</button></div></header>
      ${this.selector(castById(pick), { onb: true, extra: `<div class="onb-foot"><label>¿Cómo te llamas?<input id="oName" maxlength="14" autocomplete="off" placeholder="¿Cómo te llamas?" aria-label="¿Cómo te llamas?"></label>
        <div class="onb-age" role="radiogroup" aria-label="Tu edad"><span>¿Cuántos años tienes?</span>${EDADES.map(e => `<button type="button" role="radio" data-age="${e.id}" aria-checked="${e.id === age}" class="${e.id === age ? 'on' : ''}"><b>${e.name}</b><small>${e.text}</small></button>`).join('')}</div>
        <button class="btn primary big" id="oGo">${I('play', 26)} ¡Empezar la aventura!</button></div>` })}
    </div></div>`);
    this.root.appendChild(o);
    this.bindSelector(o, pick, (a) => { pick = a.id; this.sound?.init?.(); });
    o.querySelectorAll('[data-lang]').forEach(b => b.onclick = (e) => { e.stopPropagation(); if (b.dataset.lang !== getLang()) setLang(b.dataset.lang); });
    const inp = $('#oName', o); inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); });
    o.querySelectorAll('[data-age]').forEach(b => b.onclick = (e) => { e.stopPropagation(); age = b.dataset.age; o.querySelectorAll('[data-age]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); this.sound?.ui?.('click'); });
    const go = () => { p.name = inp.value.trim() || 'Mendi'; p.avatar = pick; p.age = age; saveProfile(); this.sound?.init?.(); this.sound?.ui('open'); o.remove(); this.go('home', null, true); };
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
