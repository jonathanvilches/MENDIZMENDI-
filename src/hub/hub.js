// Centro de mando: inicio, mapa de Navarra, comarcas, pueblos, cimas, naturaleza, personajes, insignias, pasaporte y perfil.
import COMARCAS from '../data/comarcas.json';
import { txapelas as TXAPELAS, torneosGuardados, KINDS, yourMatch } from '../game/torneo.js';
import { ligasGuardadas, table as ligaTabla } from '../futbol/liga.js';
import { pelotarisCount } from '../game/pelotaris.js';
import MOUNTAINS from '../data/mountains.json';
import { CAST as AVATARS, STAT_LABELS, castById } from '../data/cast.js';
import SETTLEMENTS from '../data/settlements.json';
import { LEVELS, levelById } from '../data/levels.js';
import { REAL_IDS, ATRIBUCION } from '../data/reales/index.js';
import { iconSVG, speciesIcon } from '../ui/icons.js';
import { showFicha, allFichas } from '../ui/ficha.js';
import { floraId } from '../data/flora.js';
import { faunaId } from '../data/fauna.js';
import { floraIllustration } from '../ui/floraArt.js';
import { floraFoto } from '../ui/floraFoto.js';
import { faunaImg } from '../ui/faunaImg.js';
import { readTownArms, readArms, infoCard } from '../ui/escudo.js';
import { houseArms } from '../data/blasones.js';
import { drawArms } from '../world/heraldry.js';
import { releaseOffscreen } from '../util/offscreen.js';
import { mapaXY } from '../util/geo.js';
import { townLatLon } from '../data/miradores.js';
import { SITES } from '../data/dolmen.js';
import { avatarPortrait, avatarPortraitImg } from '../ui/portraits.js';
import { figurasHTML, openFigura } from '../ui/figuras.js';
import { personajesHTML, openPersonaje, MUJERES, HOMBRES } from '../ui/personajes.js';
import { instrumentosHTML, openInstrumento } from '../ui/instrumentos.js';
import { pasakaPreview } from '../ui/pasaka.js';
import { PASAKA } from '../data/pasaka.js';
import { INSTRUMENTOS } from '../data/instrumentos.js';
import { FIGURAS_LEYENDA, FIGURAS_CARNAVAL } from '../data/figuras.js';
import { stampImg } from '../assets.js';
import { Stage, releaseStage } from './stage.js';
import { getLang, setLang, langChosen } from '../i18n.js';
import { laminaUrl, laminasDe, laminaRail, bindLaminas, townCover, comarcaCover, townImg, leyendaUrl, openVisor, cimaUrl, tradicionUrl } from '../ui/laminas.js';
import { LAMINAS } from '../data/laminas.js';
import { CLUBS } from '../futbol/clubs.js';
import { SABERES, saberCounts } from '../data/saberes.js';
import { STAR } from '../data/tiendas.js';
import { EDADES, edadDe, missionSlots } from '../data/edad.js';
import { ARMAS, PENDIENTES, GUIA, armsOfTown } from '../data/armas-navarra.js';
import { CUENTOS, KIND_LABEL } from '../data/cuentos.js';
import { drawOfficial, officialHeight } from '../world/armas.js';
import { armsImg, armsImgBig, clubImg, casaImg } from '../ui/escudoImg.js';
import { comoJugar, vistoComoJugar } from './comojugar.js';
import { puedeDescargar, queFalta, descargarTodo } from '../web/todo.js';
import { profile, saveProfile, levelOf, rankOf, townProgress, comarcaProgress, comarcaTowns, navarraProgress, stampCount, BADGES, checkBadges, resetProfile, salazarState } from '../game/profile.js';
import { esc, el } from '../util/html.js';
import { lettersOnly } from '../util/text.js';
import { isDidactico, markDidactico } from '../util/modo.js';
import { TACTIL } from '../util/tactil.js';
import { DIDACTICO } from './didactico.js';
import { inicioHTML, aventuraHTML, inicioOn, cierraMapa, entraMapa } from './inicio.js';
import { ORIENTA, ORIENTA_TIPS, MONTE_TIPS } from '../game/senales.js';
import { enCss } from '../util/tele.js';

const $ = (s, r = document) => r.querySelector(s);
const I = (n, s = 24, c = '') => iconSVG(n, s, c);
const cnt = (n, one, many) => `${n} ${n === 1 ? one : many}`;   // (1 sello, 2 sellos: nunca «1 sellos»)
const comarca = (id) => COMARCAS.find(c => c.id === id);
// el color de cada parte del juego, para distinguirlas de un vistazo (hub.css, --cat): la aventura, en fucsia; los torneos,
// en naranja; los saberes, en cian; la naturaleza, en verde; los personajes y las leyendas, en ámbar; y lo tuyo, en azul
const KC = { aventura: 'av', sports: 'dep', pasaka: 'dep', escudos: 'sab', instrumentos: 'sab', album: 'sab', tradiciones: 'sab', oficios: 'sab', productos: 'sab', historia: 'sab', euskera: 'sab', nature: 'nat', peaks: 'nat', personajes: 'ley', cuentos: 'ley', badges: 'yo', avatars: 'yo', profile: 'yo' };
const kc = (id) => KC[id] || 'av';
const bg = (u, v = 'background-image') => u ? ` style="${v}:url(${u})"` : '';   // (una imagen de fondo, solo si la hay)
const SBK = { producto: '#ffc23d', agricultura: '#b9e34a', ganaderia: '#ff9b4a', oficios: '#4fd1ff', arquitectura: '#6ea8ff', escudos: '#2dd4ff', historia: '#a78bfa', tradiciones: '#ff4fd8', fauna: '#3ee07a', flora: '#7be05a', montes: '#5eead4' };
const TYPE_NAME = { visit: 'Visita', process: 'Producto', harvest: 'Cosecha', herd: 'Ganadería', dance: 'Danza', carnival: 'Carnaval', trade: 'Oficio', legend: 'Leyenda', race: 'Carrera', observe: 'Naturaleza', tradition: 'Tradición', quiz: 'Preguntas', summit: 'Montaña', pelota: 'Pelota', figure: 'Personajes', feria: 'Feria', dolmen: 'Arqueología', castle: 'Castillo', mirador: 'Mirador' };
const TYPE_ICON = { visit: 'church', process: 'basket', harvest: 'wheat', herd: 'sheep', dance: 'dance', carnival: 'mask', trade: 'anvil', legend: 'legend', race: 'running', observe: 'binoculars', tradition: 'music', quiz: 'quiz', summit: 'peak', pelota: 'pelota', figure: 'person', feria: 'cow', dolmen: 'dolmen', castle: 'castle', mirador: 'binoculars' };
// (una excavación, con el icono de su yacimiento: el crómlech, la cueva, la columna romana…)
const mIcon = (m) => (m.type === 'dolmen' && SITES[m.site || 'dolmen']?.icon) || TYPE_ICON[m.type];
// El nombre corto de un pueblo: el del juego o, si no está en el juego, el de su núcleo en settlements.json; nunca su
// identificador (en euskera salía en minúsculas, como «uztarroz-uztarroze»)
function townName(id) {
  const lv = levelById(id); if (lv) return lv.name.split(' /')[0];
  const n = lettersOnly(id), ps = id.split('-').map(lettersOnly);
  const s = SETTLEMENTS.find(s => lettersOnly(s[2]) === n) || SETTLEMENTS.find(s => { const q = lettersOnly(s[2].split(' /')[0]); return ps.length > 1 && q.startsWith(ps[0]) && q.endsWith(ps.at(-1)); }) || SETTLEMENTS.find(s => s[2].split(/[/()]/).some(q => ps.includes(lettersOnly(q))));
  return s ? s[2].split(/\s*[/(]/)[0].trim() : id.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
}
function townXY(lv) {
  const ll = townLatLon(lv);   // (la misma búsqueda que el cartel de la llegada: llegadas.js)
  if (ll) return mapaXY(ll.lat, ll.lon);
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

// el mapa de Navarra se dibuja en su propia escala (725 de ancho) y en el móvil se ve a menos de la mitad: --k es cuántas
// unidades del mapa hay en un píxel, para que los números de las comarcas nunca bajen de 12 px en la pantalla
function fitMaps(root) {
  const fit = () => { for (const s of root.querySelectorAll('svg.navarra')) { const w = enCss(s.getBoundingClientRect().width); if (!w) continue; const k = s.viewBox.baseVal.width / w; s.style.setProperty('--k', k.toFixed(3)); s.classList.toggle('tiny', k > 1.6);
    // (también en el atributo: así el círculo tiene su tamaño aunque el navegador no lea «r» en el CSS)
    for (const c of s.querySelectorAll('.cnum circle')) c.setAttribute('r', ((k > 1.6 ? 10 : 13) * k).toFixed(1)); } };
  requestAnimationFrame(fit);
  if (!fitMaps.on) { fitMaps.on = true; addEventListener('resize', () => fitMaps.root && requestAnimationFrame(() => fitMaps(fitMaps.root))); }
  fitMaps.root = root;
}
// la fila de comarcas de Pueblos, fija arriba: tocar una baja hasta sus pueblos y, al desplazarse, se enciende la que se
// está viendo (y la fila se corre para tenerla a la vista). `ir`: la comarca con que se abre
function indiceComarcas(m, ir) {
  const bar = $('.tidx', m), B = [...bar.querySelectorAll('button')], G = [...m.querySelectorAll('.tgrp')];
  let destino = null, hasta = 0;   // (mientras baja sola hasta una comarca tocada, no se cambia la encendida)
  const marca = (id) => { for (const b of B) { const on = b.dataset.f === id; if (on === b.classList.contains('on')) continue; b.classList.toggle('on', on);
    if (on) bar.scrollTo({ left: b.offsetLeft - (bar.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' }); } };
  // (pegada al borde de arriba, sobre el relleno de la lista, y con fondo solo cuando está pegada)
  const pega = () => { bar.style.top = -parseFloat(getComputedStyle(m).paddingTop) + 'px'; bar.classList.toggle('pegada', m.scrollTop > 0 && bar.getBoundingClientRect().top <= m.getBoundingClientRect().top + 1); };
  // (cada grupo, justo debajo de la fila ya pegada arriba)
  const baja = (id, suave) => { const g = G.find(x => x.dataset.c === id); if (!g) return; marca(id);
    const y = m.scrollTop + enCss(g.getBoundingClientRect().top - m.getBoundingClientRect().top) - bar.offsetHeight - 8;
    destino = Math.max(0, Math.min(Math.round(y), m.scrollHeight - m.clientHeight)); hasta = performance.now() + 2000;
    m.scrollTo({ top: destino, behavior: suave ? 'smooth' : 'instant' }); if (!suave) pega(); };
  B.forEach(b => b.onclick = (e) => { e.stopPropagation(); baja(b.dataset.f, true); });
  m.onscroll = () => { pega();
    if (destino != null) { if (Math.abs(m.scrollTop - destino) > 2 && performance.now() < hasta) return; destino = null; }
    const y = m.getBoundingClientRect().top + bar.getBoundingClientRect().height + 16; let g = G[0]; for (const x of G) if (x.getBoundingClientRect().top <= y) g = x;
    if (m.scrollTop + m.clientHeight >= m.scrollHeight - 4) g = G[G.length - 1];   // (abajo del todo, la última, aunque no llegue arriba)
    marca(g.dataset.c); };
  pega(); marca(G[0]?.dataset.c);
  // (con una comarca pedida, se baja hasta ella cuando la página ya tiene sus letras y ha terminado de entrar: mientras
  // sube, todo está algo más abajo)
  const entra = [...m.children].flatMap(e => e.getAnimations?.() || []).map(a => a.finished.catch(() => {}));
  if (ir && G.some(g => g.dataset.c === ir)) Promise.all([document.fonts?.ready, ...entra]).then(() => bar.isConnected && baja(ir, false));
}
function spark(profile, w = 160, h = 44) {
  if (!profile?.length) return '';
  const xs = profile.map(p => p[0]), ys = profile.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const P = profile.map(([x, y]) => [(x - x0) / (x1 - x0 || 1) * w, h - 4 - (y - y0) / (y1 - y0 || 1) * (h - 8)]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="M0 ${h} ${P.map(p => 'L' + p.join(' ')).join(' ')} L${w} ${h}Z" fill="rgba(201,178,255,.22)"/><path d="M${P.map(p => p.join(' ')).join(' L')}" fill="none" stroke="#c9b2ff" stroke-width="2.5"/></svg>`;
}

// ---------- Panel de control del inicio: el dial de Navarra y los medidores ----------
// Todo texto va dentro de su figura y centrado; en los círculos, curvado por dentro del borde, sin tocar nunca un aro.
// Ángulos en grados, 0 arriba y en el sentido del reloj
const pol = (c, r, a) => [c + r * Math.sin(a * Math.PI / 180), c - r * Math.cos(a * Math.PI / 180)].map(v => +v.toFixed(1));
const arcoArriba = (c, r, a0, a1) => { const [x0, y0] = pol(c, r, a0), [x1, y1] = pol(c, r, a1); return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };
// (el de abajo va de izquierda a derecha por debajo del centro: así sus letras se leen derechas, con la cabeza hacia dentro)
const arcoAbajo = (c, r, m) => { const [x0, y0] = pol(c, r, 180 + m), [x1, y1] = pol(c, r, 180 - m); return `M${x0} ${y0}A${r} ${r} 0 0 0 ${x1} ${y1}`; };
// (html: el rótulo ya escrito, con sus trozos en tspan para que el traductor los lea por separado)
const curvo = (id, cls, txt, max, html = false) => `<text class="${cls} arc" data-max="${max}"><textPath href="#${id}">${html ? txt : esc(txt)}</textPath></text>`;   // (centrado al pintarse: dashOn)
// el dial: un tramo por comarca con su color (se llena con sus sellos), el aro de lo descubierto y, en el disco del centro,
// el tanto por ciento con un rótulo curvado arriba y otro abajo
function dialSVG(all, coms, nivel) {
  const C = 120, seg = 360 / coms.length, R = 92, L = +(2 * Math.PI * R).toFixed(1);
  const tramos = coms.map((c, i) => { const a0 = i * seg + 2, a1 = (i + 1) * seg - 2;
    return `<g class="dl-c" data-comarca="${c.id}" style="--c:${c.color}" role="button" tabindex="0" aria-label="${esc(c.name)}"><title>${esc(c.name)}</title><path class="dl-cb" d="${arcoArriba(C, 108, a0, a1)}"/>${c.k > 0 ? `<path class="dl-cf" d="${arcoArriba(C, 108, a0, a0 + (a1 - a0) * c.k)}"/>` : ''}</g>`; }).join('');
  let ticks = ''; for (let i = 0; i < 72; i++) { const [x0, y0] = pol(C, 116, i * 5), [x1, y1] = pol(C, i % 6 ? 118 : 119.5, i * 5); ticks += `M${x0} ${y0}L${x1} ${y1}`; }
  return `<svg class="dial" viewBox="0 0 240 240">
    <defs><path id="dlTop" d="${arcoArriba(C, 61, -64, 64)}"/><path id="dlBot" d="${arcoAbajo(C, 67, 62)}"/>
      <linearGradient id="dlG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff2bd6"/><stop offset=".55" stop-color="#ff7ac8"/><stop offset="1" stop-color="#ffd166"/></linearGradient>
      <radialGradient id="dlD" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="#4a1a8f"/><stop offset="1" stop-color="#1a0838"/></radialGradient></defs>
    <path class="dl-ticks" d="${ticks}"/>${tramos}
    <circle class="dl-trk" cx="${C}" cy="${C}" r="${R}"/><circle class="dl-arc" cx="${C}" cy="${C}" r="${R}" stroke-dasharray="${+(L * all / 100).toFixed(1)} ${L}" transform="rotate(-90 ${C} ${C})"/>
    <circle class="dl-disc" cx="${C}" cy="${C}" r="78"/><circle class="dl-scan" cx="${C}" cy="${C}" r="74"/>
    <text class="dl-pct" x="${C}" y="${C + 15}" text-anchor="middle"><tspan class="cnt" data-n="${all}">${all}</tspan><tspan class="u" dx="2">%</tspan></text>
    ${curvo('dlTop', 'dl-t', 'Navarra descubierta', 128)}${curvo('dlBot', 'dl-b', nivel, 136, true)}</svg>`;
}
// un medidor: el aro se llena con lo hecho (sin total, entero); dentro del disco, el icono arriba, la cifra en el centro y
// el rótulo curvado por dentro del borde de abajo
function gaugeHTML([ic, k, v, de, cat], i) {
  const L = +(2 * Math.PI * 52).toFixed(1), f = de ? Math.min(1, v / de) : v > 0 ? 1 : 0, id = 'gb' + i;
  return `<div class="gauge" data-cat="${cat}" style="--d:${(i * 0.06).toFixed(2)}s"><svg viewBox="0 0 120 120" aria-hidden="true"><defs><path id="${id}" d="${arcoAbajo(60, 35, 60)}"/></defs>
    <circle class="g-trk" cx="60" cy="60" r="52"/><circle class="g-arc" cx="60" cy="60" r="52" stroke-dasharray="${+(L * f).toFixed(1)} ${L}" transform="rotate(-90 60 60)"/><circle class="g-disc" cx="60" cy="60" r="44"/>
    <text class="g-n" x="60" y="70" text-anchor="middle"><tspan class="cnt" data-n="${v}">${v}</tspan>${de != null ? `<tspan class="g-de" dx="1">/${de}</tspan>` : ''}</text>${curvo(id, 'g-l', k, 62)}</svg>
    <span class="g-ico">${I(ic, 26)}</span><span class="sr">${esc(k)}: ${v}${de != null ? ' / ' + de : ''}</span></div>`;
}
// al pintarse: los rótulos curvados que no quepan en su arco se encogen (también en euskera, que suele ser más largo), las
// cifras suben desde cero y los aros se dibujan
function dashOn(root) {
  const dash = root.querySelectorAll('.dash'); if (!dash.length) return;
  // (y cada uno se centra a mano en su arco, medido, y otra vez al cargar la letra: con el centrado del navegador, Chrome
  // dejaba los rótulos largos corridos hacia un lado y montados sobre la cifra)
  const fit = () => { for (const t of root.querySelectorAll('.dash text.arc')) {
    const tp = t.firstElementChild, path = t.ownerSVGElement?.querySelector(tp?.getAttribute('href')); if (!path || !t.getComputedTextLength) continue;
    t.style.fontSize = ''; const max = +t.dataset.max; let w = t.getComputedTextLength();
    if (w > max) { t.style.fontSize = (parseFloat(getComputedStyle(t).fontSize) * max / w).toFixed(2) + 'px'; w = t.getComputedTextLength(); }
    const ls = parseFloat(getComputedStyle(t).letterSpacing) || 0;
    tp.setAttribute('startOffset', Math.max(0, (path.getTotalLength() - w + ls) / 2).toFixed(2)); } };
  requestAnimationFrame(() => { fit(); setTimeout(fit, 400); dash.forEach(d => d.classList.add('on')); });
  document.fonts?.ready.then(() => requestAnimationFrame(fit));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const n of root.querySelectorAll('.dash .cnt')) {
    const to = +n.dataset.n; if (!(to > 0)) continue; const t0 = performance.now(), dur = 900 + Math.min(600, to * 4);
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); n.textContent = Math.round(to * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); };
    n.textContent = '0'; requestAnimationFrame(step);
  }
}

export class Hub {
  constructor({ sound, onPlay }) {
    this.sound = sound; this.onPlay = onPlay;
    this.root = el(`<div id="hub"><div class="hub-bg"><div class="bgimg"></div></div>
      <header class="hub-top"><div class="brand logo">HERRIZHERRI</div><button type="button" class="app-btn" data-cj-abre hidden><svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="19"/><path d="M20 16l12 8-12 8z"/></svg><span>Cómo jugar</span></button><button type="button" class="app-btn alt" data-mando hidden>${I('control', 24)}<span>Mando del móvil</span></button><div class="chip" id="hChip"></div></header>
      <nav class="hub-nav" id="hNav"></nav><main class="hub-main" id="hMain"></main></div>`);
    document.body.appendChild(this.root);
    // (en el archivo único: en cuanto se sabe que se llega a la web, la pantalla del menú se repinta con las ilustraciones
    // que no van dentro, src/web/hd.js; solo si no se ha bajado en ella ni hay nada abierto encima)
    addEventListener('herrizherri-web', () => { const m = $('#hMain', this.root); if (this.visible && !this.sheet && m && m.scrollTop < 40 && !document.querySelector('.mg-overlay, .lam-view')) this.go(this.screen, this.arg, true); });
    // en el ordenador o en una tele (sin dedo: util/tactil.js), el mando del móvil a mano desde el principio (en el artefacto de claude.ai no puede conectarse); su
    // código y el del QR se cargan en un rato libre, para que el panel salga al momento
    const mb = this.root.querySelector('[data-mando]');
    if (!TACTIL && !(typeof __AF__ !== 'undefined' && __AF__) && !isDidactico()) {
      mb.hidden = false; mb.onclick = () => import('../mando/mando.js').then(m => m.abrirMando());
      (window.requestIdleCallback || setTimeout)(() => { import('../mando/mando.js').then(m => m.esperarMovil()); import('qrcode-generator'); }, { timeout: 4000 });   // (y, si ya se conectó un móvil, se le espera)
    }
    // el modo didáctico (util/modo.js): se elige en la primera pantalla o en Ajustes, o con ?didactico=1 (?didactico=0, quitarlo)
    { const S = profile().settings, u = new URLSearchParams(location.search).get('didactico');
      if (u != null) { S.didactic = u !== '0'; saveProfile(); }
      markDidactico(S.didactic); }
    // cómo jugar (en el ordenador, con el móvil de mando o en el móvil) e instalar el juego o la app Mando: siempre a mano
    // arriba (en el móvil de pie, en «Más»), salvo en el modo didáctico, que no se juega
    const cb = this.root.querySelector('[data-cj-abre]');
    cb.hidden = isDidactico(); cb.onclick = () => { this.sound?.ui('open'); comoJugar(this.root); };
    this.buildNav();
    $('#hNav', this.root).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.s === 'more') return this.more(); this.go(b.dataset.s); });
    this.root.addEventListener('click', e => {
      const t = e.target.closest('[data-go],[data-town],[data-comarca],[data-play],[data-sport],[data-fronton],[data-frpick],[data-figura],[data-personaje],[data-instrumento],[data-pasaka],[data-ficha]'); if (!t) return;
      if (t.dataset.ficha) { this.sound?.ui('open'); return showFicha(t.dataset.ficha, { ui: { sound: this.sound }, button: 'Cerrar' }); }
      if (t.dataset.frpick != null) return this.frontonPicker();
      if (t.dataset.figura) { this.sound?.ui('open'); return openFigura({ sound: this.sound }, t.dataset.figura); }   // (la ficha de una figura de leyenda o carnaval)
      if (t.dataset.personaje) { this.sound?.ui('open'); return openPersonaje({ sound: this.sound }, t.dataset.personaje); }   // (la ficha de un personaje de Navarra)
      if (t.dataset.pasaka) { this.sound?.ui('open'); return this.onSport?.('pasaka', 'pamplona'); }   // (un partido de pasaka en 3D: Pamplona en modo campeonato, al sobreclaustro; al salir, de vuelta aquí)
      if (t.dataset.instrumento) { this.sound?.ui('open'); return openInstrumento({ sound: this.sound, townName }, t.dataset.instrumento).then(() => { if (this.screen === 'instrumentos') this.go('instrumentos', undefined, true); }); }   // (la ficha de un instrumento; al volver, la lista con lo tocado)
      // (el frontón elegido cambia en su caja, sin volver a pintar la pantalla ni subirla arriba)
      if (t.dataset.fronton) { this.frontonTown = t.dataset.fronton; this.sound?.ui('click'); this.sheet?.remove(); this.sheet = null; const b = $('.sp-pick', this.root); if (b) b.outerHTML = this.frontonBox(); else this.go('sports', undefined, true); return; }
      if (t.dataset.sport) { this.sound?.ui('open'); return this.onSport?.(t.dataset.sport, t.dataset.sport === 'pelota' ? (t.dataset.en || this.frontonId()) : null); }   // (data-en: el pueblo del frontón, desde el resumen del inicio)
      if (t.dataset.play) return this.play(t.dataset.play);
      if (t.dataset.town) return isDidactico() ? this.go('pueblo', t.dataset.town) : this.townSheet(t.dataset.town);
      if (t.dataset.comarca) return this.go('comarca', t.dataset.comarca);
      if (t.dataset.go) this.go(t.dataset.go);
    });
    this.screen = 'home';
  }
  // secciones: las principales siempre a la vista; las demás (1), en «Más» cuando falta sitio; la de elegir avatar (2), a
  // la vista salvo en el móvil de pie, donde la barra de abajo no tiene sitio para tantas (también está en el Perfil).
  // En el modo didáctico, solo el material: sin torneos, avatar, pasaka para jugar, insignias ni pasaporte
  buildNav() {
    this.nav = isDidactico()
      ? [['home', 'Inicio', 'home'], ['map', 'Mapa', 'map'], ['towns', 'Pueblos', 'church'], ['personajes', 'Personajes', 'book'], ['cuentos', 'Leyendas', 'legend'], ['tradiciones', 'Tradiciones', 'mask', 1], ['oficios', 'Oficios', 'anvil', 1], ['productos', 'Productos', 'cheese', 1], ['historia', 'Historia', 'castle', 1], ['nature', 'Naturaleza', 'leaf', 1], ['peaks', 'Cimas', 'peak', 1], ['escudos', 'Escudos', 'shield', 1], ['instrumentos', 'Instrumentos', 'music', 1], ['euskera', 'Euskera', 'talk', 1], ['album', 'Láminas', 'scroll', 1], ['profile', 'Ajustes', 'gear', 1]]
      : [['home', 'Inicio', 'home'], ['map', 'Mapa', 'map'], ['towns', 'Pueblos', 'church'], ['sports', 'Torneos', 'trophy'], ['personajes', 'Personajes', 'book'], ['avatars', 'Avatar', 'person', 2], ['peaks', 'Cimas', 'peak', 1], ['nature', 'Naturaleza', 'leaf', 1], ['escudos', 'Escudos', 'shield', 1], ['cuentos', 'Leyendas', 'legend', 1], ['instrumentos', 'Instrumentos', 'music', 1], ['pasaka', 'Pasaka', 'pelota', 1], ['album', 'Láminas', 'scroll', 1], ['badges', 'Insignias', 'badge', 1], ['passport', 'Pasaporte', 'stamp', 1], ['profile', 'Perfil', 'gear', 1]];
    this.MORE = { avatars: 'Elige con quién juegas', peaks: 'Montañas de Navarra con su perfil', nature: 'Fauna, árboles, plantas y flores', escudos: 'Escudos de Navarra y cómo se leen', cuentos: 'Cuentos, leyendas e historias de Navarra', instrumentos: 'Txistu, gaita, txalaparta… escúchalos y aprende a tocarlos', pasaka: 'El juego de pelota con red de los claustros: apréndelo y juégalo', album: 'Las ilustraciones de cada pueblo y comarca', badges: 'Tus logros', passport: 'Los sellos de tus pueblos', profile: isDidactico() ? 'Idioma, sonido y modo' : 'Nombre, nivel y ajustes',
      sports: 'Pelota a mano y fútbol, sin entrar en un pueblo', personajes: 'Mujeres y hombres de Navarra, seres de leyenda y figuras de carnaval',
      tradiciones: 'Danzas, carnavales, fiestas, ferias y pelota', oficios: 'Cómo se trabajaba y con qué herramientas', productos: 'Quesos, huerta, cosechas y ganadería', historia: 'Castillos, dólmenes y monumentos', euskera: 'Saludos, herramientas, animales y pueblos' };
    if (isDidactico()) this.MORE.instrumentos = 'Txistu, gaita, txalaparta… qué son y cómo suenan';
    // (las principales 4.ª y 5.ª, en los móviles más estrechos, van a «Más»: en la barra de abajo no caben sus nombres)
    $('#hNav', this.root).innerHTML = this.nav.map(([id, n, ic, sec], i) => `<button data-s="${id}" data-cat="${kc(id)}" class="${sec === 2 ? 'nav3' : sec ? 'nav2' : i === 3 ? 'navp4' : i === 4 ? 'navp5' : ''}">${I(ic, 26)}<span>${n}</span></button>`).join('') + `<button data-s="more" class="more-btn"><svg viewBox="0 0 24 24" width="26" height="26"><circle cx="5" cy="12" r="2.4" fill="#f7f0e6"/><circle cx="12" cy="12" r="2.4" fill="#f7f0e6"/><circle cx="19" cy="12" r="2.4" fill="#f7f0e6"/></svg><span>Más</span></button>`;
  }
  /** Pone o quita el modo didáctico y vuelve a la portada. */
  setDidactico(on) {
    const S = profile().settings; S.didactic = !!on; saveProfile(); markDidactico(on); this.root.querySelector('[data-cj-abre]').hidden = !!on;
    this.buildNav(); this.sound?.ui('open'); this.go('home', undefined, true);
    if (!on && !profile().name) this.primeraVez();
  }
  show(screen = this.screen, arg = this.arg) { if (this.root.classList.contains('hidden')) { this.root.classList.remove('entra'); void this.root.offsetWidth; this.root.classList.add('entra'); } this.root.classList.remove('hidden'); this.visible = true; this.go(screen, arg, true); if (!langChosen()) this.langPicker(); else if (!profile().name && !isDidactico()) this.primeraVez(); }
  // (quien empieza: primero cómo quiere jugar y después su nombre y su personaje)
  primeraVez() { if (vistoComoJugar()) return this.onboarding(); comoJugar(this.root, { primera: true, despues: () => { if (!profile().name && !isDidactico()) this.onboarding(); } }); }
  hide() { this.root.classList.add('hidden'); this.visible = false; this.sheet?.remove(); cierraMapa(); releaseStage(); this.stage = null; releaseOffscreen(); }
  go(screen, arg, silent) {
    this.screen = screen; this.arg = arg;
    if (!silent) this.sound?.ui('click');
    this.sheet?.remove(); this.sheet = null;
    const secScreen = this.nav.some(n => n[0] === screen) && this.navHidden(screen);
    this.root.querySelectorAll('#hNav button').forEach(b => b.classList.toggle('on', !!(b.dataset.s === screen || (screen === 'comarca' && b.dataset.s === 'map') || (b.dataset.s === 'more' && secScreen))));
    const bgc = screen === 'comarca' ? arg : (levelById(profile().last) || LEVELS[0]).comarca;
    if (this.bgc !== bgc) { this.bgc = bgc; $('.bgimg', this.root).style.backgroundImage = `url(${comarcaCover(bgc, true)})`; }
    this.root.dataset.screen = screen;
    if (this.visible) this.sound?.setMood?.(screen === 'sports' ? 'torneos' : 'inicio');   // (Torneos, con su propia música)
    const m = $('#hMain', this.root);
    if (!this['s_' + screen]) { screen = this.screen = 'home'; this.root.dataset.screen = screen; }   // pantalla desconocida: la portada
    m.dataset.cat = kc(screen);
    cierraMapa(); m.onscroll = null; m.innerHTML = this['s_' + screen](arg);
    m.querySelectorAll('[data-go]:not([data-cat])').forEach(b => { b.dataset.cat = kc(b.dataset.go); });   // (cada enlace, en el color de adonde lleva)
    m.scrollTop = 0; fitMaps(m);
    this.after?.(); this.after = null; bindLaminas(m, this.sound);
    this.renderChip();
  }
  // ¿el botón de esa sección no cabe en la barra con este tamaño de pantalla? (entonces va en «Más»)
  navHidden(id) { const b = this.root.querySelector(`#hNav [data-s="${id}"]`); return !b || getComputedStyle(b).display === 'none'; }
  more() {
    this.sound?.ui('open');
    const s = el(`<div class="sheet more"><div class="more-in"><div class="grab"></div><small class="kicker">Más secciones</small>
      ${isDidactico() ? '' : `<button data-cj class="more-app">${I('play', 34)}<div><b>Cómo jugar</b><small>En el ordenador, con el móvil de mando o en el móvil; e instalar las apps</small></div>${I('play', 20)}</button>`}${this.nav.filter(n => this.navHidden(n[0])).map(([id, n, ic]) => `<button data-go="${id}" data-cat="${kc(id)}" class="${this.screen === id ? 'on' : ''}">${I(ic, 34)}<div><b>${n}</b><small>${this.MORE[id]}</small></div>${I('play', 20)}</button>`).join('')}</div></div>`);
    this.sheet?.remove(); this.sheet = s; this.root.appendChild(s);
    s.addEventListener('click', e => { if (e.target === s) { s.remove(); this.sheet = null; } });
    s.querySelector('[data-cj]')?.addEventListener('click', () => { s.remove(); this.sheet = null; comoJugar(this.root); });
  }
  renderChip() {
    if (isDidactico()) { $('#hChip', this.root).innerHTML = `<span class="dd-chip">${I('book', 26)}<b class="dd-chl">Material didáctico</b><b class="dd-chs">Didáctico</b></span>`; $('#hChip', this.root).onclick = () => this.go('profile'); return; }
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
    // (si ya has hecho alguna, las que te quedan: antes decía «si completas las 6» aunque ya llevaras 4)
    const left = lp.total - lp.done;
    lines.push(lp.stamp ? `¡El sello de ${town} ya es tuyo! Elige otro pueblo en el mapa.` : lp.done ? `Te ${left === 1 ? 'queda 1 misión' : `quedan ${left} misiones`} para ganar el sello de ${town}.` : `Si completas las ${lp.total} misiones, el sello de ${town} será tuyo.`);
    lines.push('Las páginas del Pasaporte Herri están en blanco. ¡Cada pueblo guarda un sello!');
    return lines;
  }
  // lo que el inicio le pasa a inicio.js: el icono de cada misión, las que tocan por la edad, dónde cae cada pueblo en el
  // mapa y el mapa plano para cuando no hay 3D
  opcInicio(p) { return { icono: mIcon, nombre: (m) => m.title || m.name || TYPE_NAME[m.type] || '', slots: (l) => missionSlots(l, edadDe(p)), xy: (l) => XY.get(l.id), plano: () => this.navarraSVG({ pins: true }) }; }
  // el inicio: el mapa del mundo, a toda la pantalla, como en un juego (inicio.js); sin desplazarse
  s_home() {
    if (isDidactico()) return this.d_home();
    this.after = () => inicioOn(this.root);
    return inicioHTML(this.opcInicio(profile()));
  }
  // «Tu aventura»: lo que antes iba debajo del mapa (el destacado, los personajes, «Descubre Navarra», cómo vas, los saberes,
  // la historia, lo que te espera, las comarcas y las mujeres de Navarra)
  s_aventura() {
    const p = profile(), N = navarraProgress(p);
    const last = levelById(p.last) || LEVELS.find(l => !townProgress(p, l).stamp) || LEVELS[0];
    let doneM = 0, totM = 0; for (const l of LEVELS) { const t = townProgress(p, l); doneM += t.done; totM += t.total; }
    this.after = () => {
      this.drawMiniMap($('#homeMap', this.root));
      this.cabeSugg($('.next-panel .sugg', this.root));
      dashOn(this.root);
      inicioOn(this.root);
    };
    const next = this.suggestions();
    // (en cuanto se ha jugado algo, el resumen de cómo vas)
    const empezado = doneM > 0 || p.xp > 0 || Object.values(p.towns || {}).some(t => t.visits) || ligasGuardadas().some(S => S.j > 0) || torneosGuardados().length > 0;
    return `
    <div class="av-head"><button class="back" data-go="home">${I('back', 26)} Mapa</button><h1 class="title">${I('book', 40)} Tu aventura</h1></div>
    ${aventuraHTML(this.opcInicio(p))}
    ${empezado ? this.progreso(p, last) : ''}
    <section class="saberes" data-cat="sab">
      <div class="sb-head"><small class="kicker">${I('book', 20)} Lo más importante</small><h2>Aprende Navarra jugando</h2></div>
      <div class="sb-links">${[['escudos', 'shield', 'Escudos', armsImg('navarra'), 1], ['cuentos', 'legend', 'Leyendas', leyendaUrl('aralar')], ['instrumentos', 'music', 'Instrumentos', tradicionUrl('trovadores_olite')], ['pasaka', 'pelota', 'Pasaka', laminaUrl('dep-pasaka', true)]]
        .map(([go, ic, t, img, fit], i) => `<button class="sb-tile" data-go="${go}" style="--d:${i * 0.07}s"><span class="sb-img${fit ? ' fit' : ''}"${bg(img)}>${img ? '' : I(ic, 52)}</span><b>${I(ic, 28)}${t}</b></button>`).join('')}</div>
      <div class="sb-grid">${(() => { const n = saberCounts(p); return SABERES.map(sb => `<div class="sb ${n[sb.id] ? 'on' : ''}${sb.id === 'escudos' ? ' link' : ''}" style="--cat:${SBK[sb.id] || ''}" title="${esc(sb.text)}"${sb.id === 'escudos' ? ' data-go="escudos" role="button" tabindex="0"' : ''}>${I(sb.icon, 40)}<b>${n[sb.id]}</b><span>${esc(sb.name)}</span></div>`).join(''); })()}</div>
    </section>
    <section class="story">${(u => u ? `<img class="st-img" src="${u}" alt="" loading="lazy" decoding="async">` : '')(comarcaCover(last.comarca, true))}
      <div class="st-txt"><small class="kicker">${I('book', 20)} La historia</small><h2>El Pasaporte Herri</h2></div>
      <ol class="hsteps"><li>${I('map', 60)}<b>Viaja</b></li><li>${I('exclaim', 60)}<b>Ayuda</b></li><li><img src="${stampImg(last.comarca)}" alt=""><b>Gana el sello</b></li></ol>
    </section>
    ${empezado ? '' : `<button class="sports-cta" data-go="sports" data-cat="dep"><span class="cta-fotos" aria-hidden="true">${['dep-pelotari', 'dep-futbol'].map(f => `<i${bg(laminaUrl(f, true))}></i>`).join('')}</span>${I('trophy', 44)}<div><b>Campeonatos</b></div>${I('play', 26)}</button>
    <section class="dash dash-mini"><div class="dash-gauges">${[['stamp', 'Sellos', N.stamps, N.towns, 'av'], ['shield', 'Comarcas', N.comarcas, N.comarcasTotal, 'av'], ['check', 'Misiones', doneM, totM, 'av'],
      ['badge', 'Insignias', p.badges.length, BADGES.length, 'yo'], ['star', 'Puntos', p.xp, null, 'yo']].map(gaugeHTML).join('')}</div></section>`}
    <section class="two">
      <div class="panel next-panel"><h2 class="sec">${I('exclaim', 34)} Te esperan</h2>${next}</div>
      <div class="panel map-panel" data-go="map"><h2 class="sec">${I('map', 34)} Mapa de Navarra</h2><div id="homeMap" class="mini-map"></div></div>
    </section>
    <h2 class="sec">${I('shield', 34)} Capítulos: las comarcas</h2>
    <section class="comarcas rail">${COMARCAS.map(c => this.comarcaCard(c)).join('')}</section>
    <h2 class="sec" data-cat="ley">${I('person', 34)} Mujeres de Navarra<button class="lnk sec-more" data-go="personajes">Ver todos</button></h2>
    <section class="figuras rail">${personajesHTML(MUJERES)}</section>
`;
  }
  // ---------- Cómo vas: el panel de control del inicio ----------
  // de un vistazo, al empezar o al volver: el dial de Navarra (lo descubierto y un tramo por comarca que se llena con sus
  // sellos), un medidor por cada cosa, los pueblos empezados (para seguir donde lo dejaste) y los campeonatos abiertos de
  // fútbol y de pelota, con su botón para seguir. Cada texto, dentro de su figura (nunca encima de una línea)
  progreso(p, last) {
    const N = navarraProgress(p), L = levelOf(p.xp);
    let doneM = 0, totM = 0; for (const l of LEVELS) { const t = townProgress(p, l); doneM += t.done; totM += t.total; }
    const pct = (a, b) => (b ? Math.round(100 * a / b) : 0), all = pct(doneM, totM);
    const coms = COMARCAS.filter(c => comarcaTowns(c.id).length).map(c => { const r = comarcaProgress(p, c.id); return { id: c.id, color: c.color, name: c.name, k: r.towns ? r.stamps / r.towns : 0 }; });
    const heard = CUENTOS.filter(Cu => (p.cards || []).includes('cuento:' + Cu.id)).length, pc = pelotarisCount();
    const total = `<div class="panel dash-core"><h2 class="dash-tag">${I('compass', 26)}<span>Tu Navarra</span></h2>${dialSVG(all, coms, `<tspan>Nivel ${L.lv}</tspan> · <tspan>${esc(rankOf(L.lv))}</tspan>`)}
      <div class="dash-gauges">${[['stamp', 'Sellos', N.stamps, N.towns, 'av'], ['check', 'Misiones', doneM, totM, 'av'], ['shield', 'Comarcas', N.comarcas, N.comarcasTotal, 'av'], ['book', 'Cartas', (p.cards || []).length, null, 'sab'],
        ['legend', 'Cuentos', heard, CUENTOS.length, 'ley'], ['pelota', 'Pelotaris', pc.have, pc.total, 'dep'], ['badge', 'Insignias', p.badges.length, BADGES.length, 'yo'], ['star', 'Puntos', p.xp, null, 'yo']].map(gaugeHTML).join('')}</div></div>`;
    // los pueblos empezados y sin sello: primero el último en el que jugaste, después los que van más adelantados
    const started = LEVELS.map(l => ({ l, t: townProgress(p, l), v: p.towns[l.id]?.visits || 0 })).filter(x => !x.t.stamp && (x.t.done || x.v))
      .sort((a, b) => (b.l.id === p.last) - (a.l.id === p.last) || b.t.done / (b.t.total || 1) - a.t.done / (a.t.total || 1));
    // (cada dato en su línea, sin «·» que se quede suelto al principio de una; el botón de seguir, con su rótulo, que en una
    // columna estrecha se queda en el icono: así el nombre no se parte palabra a palabra)
    const go = (attr) => `<button class="btn primary small pg-go" ${attr} aria-label="Seguir">${I('play', 18)}<span>Seguir</span></button>`;
    // (la placa de cada pueblo: su portada en un círculo con el aro de lo hecho alrededor y un segmento por misión)
    const orb = (inner, f) => `<span class="pg-orb">${inner}<svg viewBox="0 0 64 64" aria-hidden="true"><circle class="o-trk" cx="32" cy="32" r="30"/>${f > 0 ? `<circle class="o-arc" cx="32" cy="32" r="30" stroke-dasharray="${(188.5 * f).toFixed(1)} 188.5" transform="rotate(-90 32 32)"/>` : ''}</svg></span>`;
    const row = ({ l, t }) => { const c = comarca(l.comarca), cov = townCover(l.id, true); return `<li style="--c:${c?.color}">${orb(cov ? `<img src="${cov}" alt="" loading="lazy" decoding="async">` : I('church', 30), t.total ? t.done / t.total : 0)}<div><b>${esc(l.name.split(' /')[0])}</b><small>${esc(c?.name || '')}</small><span class="pg-seg" aria-hidden="true">${Array.from({ length: t.total }, (_, i) => `<i${i < t.done ? ' class="ok"' : ''}></i>`).join('')}</span><em>${t.done}/${t.total} misiones</em></div>${go(`data-play="${l.id}"`)}</li>`; };
    const sellos = LEVELS.filter(l => townProgress(p, l).stamp).length;
    const partidas = `<div class="panel pg-partidas"><h2 class="dash-tag">${I('play', 26)}<span>Partidas empezadas</span></h2>${started.length
      ? `<ul class="pg-list">${started.slice(0, 5).map(row).join('')}</ul>${started.length > 5 ? `<button class="btn ghost small pg-more" data-go="towns">Y ${cnt(started.length - 5, 'pueblo más', 'pueblos más')}</button>` : ''}`
      : `<p class="pg-empty"><span>${sellos ? 'Ningún pueblo a medias.' : 'Aún no has empezado ningún pueblo.'}</span> <span>Próxima parada</span>: <b>${esc(last.name.split(' /')[0])}</b></p><button class="btn primary small pg-more" data-play="${last.id}">${I('play', 18)} Ir</button>`}</div>`;
    // los campeonatos: tu liga de fútbol (la del club de Campeonatos, primero) y los torneos de pelota de cada comarca
    const ligas = ligasGuardadas().filter(S => S.j > 0 || S.titles).sort((a, b) => (b.club === p.futbolClub) - (a.club === p.futbolClub) || b.j - a.j).slice(0, 2);
    const ord = (n) => `${n}.º`, fut = ligas.map(S => { const T = ligaTabla(S), pos = T.findIndex(x => x.id === S.club) + 1, me = T[pos - 1], fin = S.j >= S.rounds.length, Cl = CLUBS[S.club];
      const estado = fin ? (pos === 1 ? '<span>¡Campeones de liga!</span>' : `<span>Liga terminada: ${ord(pos)}</span>`) : `<span>Jornada ${S.j + 1} de ${S.rounds.length}</span><span>${ord(pos)} con ${cnt(me?.pts || 0, 'punto', 'puntos')}</span>`;
      return `<li>${orb(`<img class="pg-crest" src="${clubImg(S.club) || ''}" alt="">`, fin ? 1 : S.j / S.rounds.length)}<div><b>${esc(Cl.name)}</b><small class="pg-sub"><span><span>Liga Navarra</span>${S.titles ? ` · <span>${cnt(S.titles, 'título', 'títulos')}</span>` : ''}</span>${estado}</small></div>${go('data-sport="futbol"')}</li>`; });
    const tors = torneosGuardados().sort((a, b) => (a.done - b.done) || (b.past?.length || 0) - (a.past?.length || 0)).slice(0, 3), pel = tors.map(T => {
      const m = yourMatch(T), yo = T.players.findIndex(x => x.you), en = (last.comarca === T.comarca ? last : LEVELS.find(l => l.comarca === T.comarca))?.id || '';
      const estado = T.done ? (T.champion === yo ? '¡Txapela ganada!' : 'Terminado') : m ? `${m.round} contra ${m.pairs ? m.rival.mates[0] : m.rival.name}` : 'Eliminado: el torneo sigue';
      return `<li>${orb(I('txapela', 34), T.done ? 1 : (T.past?.length || 0) / Math.max(1, (T.past?.length || 0) + 1))}<div><b>Txapela de ${esc(T.comarcaName)}</b><small class="pg-sub"><span><span>${(KINDS[T.kind] || KINDS.mano).name}</span>${T.txapelas ? ` · <span>${cnt(T.txapelas, 'txapela', 'txapelas')}</span>` : ''}</span><span>${esc(estado)}</span></small></div>${en ? go(`data-sport="pelota" data-en="${en}"`) : ''}</li>`; });
    const camp = `<div class="panel pg-camp" data-cat="dep"><h2 class="dash-tag">${I('trophy', 26)}<span>Campeonatos</span></h2>${fut.length || pel.length
      ? `<ul class="pg-list">${[...fut, ...pel].join('')}</ul>` : `<div class="pg-fotos">${[['pelota', 'dep-pelotari', 'Pelota'], ['futbol', 'dep-futbol', 'Fútbol']].map(([s, f, t]) => `<button data-sport="${s}"${bg(laminaUrl(f, true))}><b>${I(s === 'pelota' ? 'pelota' : 'balon', 28)}${t}</b></button>`).join('')}</div>`}<button class="btn ${fut.length || pel.length ? 'ghost' : 'primary'} small pg-more" data-go="sports">${I('trophy', 18)} Ir a Campeonatos</button></div>`;
    return `<section class="dash progreso" aria-label="Cómo vas"><h2 class="dash-tag big">${I('flag', 30)}<span>Cómo vas</span></h2><div class="pg-grid">${total}${partidas}${camp}</div></section>`;
  }
  // ---------- Campeonatos ----------
  // pelota a mano y fútbol sin entrar en las misiones de un pueblo: la pelota se juega en el frontón del pueblo que se
  // elija; el fútbol, con tu club (Liga Navarra, amistosos y El Sadar)
  frontonId() { const p = profile(); return levelById(this.frontonTown)?.id || levelById(p.last)?.id || LEVELS[0].id; }
  s_sports() {
    const p = profile(), fl = levelById(this.frontonId()), club = CLUBS[p.futbolClub], tx = p.txapelas || 0;
    let fb = null; try { fb = JSON.parse(localStorage.getItem('herrizherri-futbol-v1') || 'null'); } catch (e) { }
    // (las figuras, las mismas de las cartas: en reposo, limpias, como el resto de pantallas de deporte)
    const sadar = levelById('pamplona');
    // (una carta por fila con su portada: la lámina del protagonista en acción, a todo color, a la derecha; a la izquierda,
    // en una sola columna, el rótulo con tu marca a su derecha, el título y el texto, y abajo lo que se elige (el frontón,
    // que abre la lista por comarcas, o tu club) con el botón de jugar al lado. Las dos cartas, iguales; en el iPhone
    // tumbado, cada una cabe entera a la vista. En vertical, la portada entera arriba y lo demás debajo)
    const kit = club ? (clubImg(p.futbolClub) ? `<img class="sp-media sp-em" src="${clubImg(p.futbolClub)}" alt="">` : `<i class="sp-media sp-kit" style="--a:${club.shirt};--b:${club.shirt2 || club.shorts || club.shirt}"></i>`) : `<i class="sp-media sp-ico">${I('balon', 32)}</i>`;
    return `
    <h2 class="sec">${I('trophy', 34)} Campeonatos</h2>
    <section class="sports">
      <div class="sport sp-pelota">
        <span class="sp-cover" aria-hidden="true" style="background-image:url(${laminaUrl('dep-pelotari') || laminaUrl('dep-fronton') || townImg(fl)})"></span>
        <div class="sp-txt"><small class="kicker">Tres campeonatos</small><h3>Pelota a mano</h3>
          <p class="sp-chips"><span>${I('pelota', 22)}Manomanista</span><span>${I('person', 22)}Parejas</span><span>${I('target', 22)}4½</span></p>
          <span class="sp-stat">${I('txapela', 22)} ${tx} ${tx === 1 ? 'txapela' : 'txapelas'}</span></div>
        <div class="sp-bar"><div class="sp-row"><small>Elige frontón</small>${this.frontonBox(fl)}</div>
          <button class="gx-go" data-sport="pelota">${I('play', 24)} <span>Jugar</span></button></div><span class="sp-shine"></span>
      </div>
      <div class="sport sp-futbol">
        <span class="sp-cover" aria-hidden="true" style="background-image:url(${laminaUrl('dep-futbol') || laminaUrl('dep-estadio') || townImg(sadar)})"></span>
        <div class="sp-txt"><small class="kicker">Liga Navarra</small><h3>Fútbol</h3>
          <p class="sp-chips"><span>${I('trophy', 22)}Liga</span><span>${I('balon', 22)}Amistosos</span><span>${I('pin', 22)}El Sadar</span></p>
          <span class="sp-stat">${I('balon', 22)} ${fb?.played || 0} ${(fb?.played || 0) === 1 ? 'partido' : 'partidos'} · ${fb?.won || 0} ${(fb?.won || 0) === 1 ? 'ganado' : 'ganados'}</span></div>
        <div class="sp-bar"><div class="sp-row"><small>Tu club</small><div class="sp-box">${kit}<span><b>${club ? esc(club.name) : 'Sin club'}</b><small>${club ? 'En El Sadar' : 'Lo eliges al jugar'}</small></span></div></div>
          <button class="gx-go" data-sport="futbol">${I('play', 24)} <span>Jugar</span></button></div><span class="sp-shine"></span>
      </div>
    </section>`;
  }
  // el frontón elegido: su portada, el pueblo y la comarca; al tocarlo, la lista de todos los frontones por comarcas
  frontonBox(l = levelById(this.frontonId())) {
    return `<button class="sp-box sp-pick" data-frpick aria-haspopup="dialog"><img class="sp-media" src="${townImg(l)}" alt=""><span><b>${esc(l.name.split(' /')[0])}</b><small>${esc(comarca(l.comarca)?.name || '')}</small></span><i class="sp-chev" aria-hidden="true"></i></button>`;
  }
  frontonPicker() {
    this.sound?.ui('open');
    const cur = this.frontonId(), groups = COMARCAS.map(c => [c, LEVELS.filter(l => !l.special && !l.bosque && l.comarca === c.id)]).filter(([, ts]) => ts.length);
    const s = el(`<div class="sheet frs"><div class="frs-in" role="dialog" aria-label="Elige frontón">
      <div class="frs-head"><small class="kicker">Pelota a mano</small><h2>Elige frontón</h2></div><button class="x" aria-label="Cerrar">${I('close', 22)}</button>
      <div class="frs-list">${groups.map(([c, ts]) => `<section><h3>${esc(c.name)}</h3><div class="frs-grid">${ts.map(l => `<button class="fr-chip ${l.id === cur ? 'on' : ''}" data-fronton="${l.id}">${esc(l.name.split(' /')[0])}</button>`).join('')}</div></section>`).join('')}</div></div></div>`);
    this.sheet?.remove(); this.sheet = s; this.root.appendChild(s);
    s.addEventListener('click', e => { if (e.target === s || e.target.closest('.x')) { s.remove(); this.sheet = null; } });
    s.querySelector('.fr-chip.on')?.scrollIntoView({ block: 'nearest' });
  }
  // «Te esperan»: junto al mapa, los pueblos que quepan enteros en su alto (tres como poco); en una columna, cuatro
  cabeSugg(sg) {
    if (!sg) return;
    const cabe = () => {
      if (!sg.isConnected) { ro.disconnect(); return; }
      const L = [...sg.children]; L.forEach(x => { x.hidden = false; });
      if (!getComputedStyle(sg).contain.includes('size')) { L.forEach((x, i) => { x.hidden = i >= 4; }); return; }
      const lim = sg.getBoundingClientRect().bottom + 1, i = L.findIndex((x, k) => k >= 3 && x.getBoundingClientRect().bottom > lim);
      if (i >= 0) L.slice(i).forEach(x => { x.hidden = true; });
    };
    const ro = new ResizeObserver(cabe); ro.observe(sg); cabe();
  }
  suggestions() {
    const p = profile();
    // (los pueblos sin sello y, si ya hay alguno empezado, los que faltan por empezar: los otros salen en «Partidas
    // empezadas». Salen los que quepan junto al mapa: cabeSugg)
    const nuevo = (l) => !(p.towns[l.id]?.visits || townProgress(p, l).done), alguno = LEVELS.some(l => !nuevo(l));
    const list = LEVELS.filter(l => !townProgress(p, l).stamp && (!alguno || nuevo(l))).slice(0, 8);
    return `<div class="sugg">${list.map(l => { const t = townProgress(p, l), c = comarca(l.comarca), cov = townCover(l.id, true); return `<button class="sg" data-town="${l.id}" style="--c:${c?.color}">${cov ? `<img class="sg-img" src="${cov}" alt="" loading="lazy" decoding="async">` : '<span class="dot"></span>'}<div><b>${esc(l.name)}</b><small>${esc(c?.name)} · ${t.done}/${t.total} misiones</small></div>${I('play', 26)}</button>`; }).join('')}</div>`;
  }
  comarcaCard(c) {
    const p = profile(), pr = comarcaProgress(p, c.id), ts = comarcaTowns(c.id), tx = TXAPELAS()[c.id];
    return `<button class="ccard ${ts.length ? '' : 'soon'}" data-comarca="${c.id}" style="--c:${c.color}">
      <div class="cimg ready" style="background-image:url(${comarcaCover(c.id, true)})"></div>
      <img class="cstamp ${pr.stamps ? '' : 'gray'}" src="${stampImg(c.id)}" alt="">
      <div class="cbody"><b>${esc(c.name)}</b>${ts.length ? `<span class="cchips"><span>${I('church', 22)}${ts.length}</span><span>${I('stamp', 22)}${pr.stamps}/${ts.length}</span><span class="tx${tx ? ' won' : ''}" title="${tx ? 'Txapela ganada' : 'Txapela por ganar'}">${I('txapela', 24)}</span></span><span class="cbar"><i style="width:${Math.round(pr.pct * 100)}%"></i></span>` : `<small>Próximamente</small>`}</div></button>`;
  }
  drawMiniMap(box) {
    if (!box) return;
    box.innerHTML = this.navarraSVG({ pins: true, small: true });
  }
  navarraSVG({ pins = true, small = false, focus = null } = {}) {
    const p = profile();
    const paths = COMARCAS.map(c => {
      const pr = comarcaProgress(p, c.id), done = pr.towns && pr.stamps === pr.towns, dd = isDidactico();
      // (cada comarca en su color, el mismo de su tarjeta y su página del pasaporte: más viva cuanto más sellada)
      const op = dd ? 0.85 : done ? 1 : 0.6 + pr.pct * 0.3;
      return `<path d="${c.path}" data-comarca="${c.id}" class="cpath ${done ? 'done' : ''} ${focus && focus !== c.id ? 'dim' : ''}" style="fill:${c.color};fill-opacity:${op}"/>`;
    }).join('');
    const labels = small ? '' : COMARCAS.map(c => `<text x="${c.label.x}" y="${c.label.y}" class="clabel" text-anchor="middle">${c.label.lines.map((l, i) => `<tspan x="${c.label.x}" dy="${i ? 12 : 0}">${esc(l)}</tspan>`).join('')}</text>`).join('')
      // en el móvil, números en lugar de nombres (la lista de debajo lleva los mismos números)
      + COMARCAS.filter(c => comarcaTowns(c.id).length).map((c, i) => { const [bx, by] = mapLayout().badges[c.id]; return `<g class="cnum" data-comarca="${c.id}" transform="translate(${bx.toFixed(1)} ${by.toFixed(1)})"><circle r="15" fill="${c.color}"/><text dy=".36em" text-anchor="middle">${i + 1}</text></g>`; }).join('');
    const pinsSvg = pins ? LEVELS.filter(l => !focus || l.comarca === focus).map(l => { const [x, y] = XY.get(l.id), t = isDidactico() ? {} : townProgress(p, l), nm = mapLayout().names[l.id]; return `<g class="pin ${t.stamp ? 'ok' : t.done ? 'go' : ''}" data-town="${l.id}" transform="translate(${x} ${y})"><circle r="${small ? 5 : 7}"/>${small || !nm ? '' : `<text x="${nm.x}" y="${nm.y}" text-anchor="${nm.anchor}">${esc(l.name.split(' /')[0])}</text>`}</g>`; }).join('') : '';
    return `<svg class="navarra" viewBox="10 10 725 780">${paths}${labels}${pinsSvg}</svg>`;
  }

  // ---------- Mapa ----------
  s_map() {
    if (isDidactico()) return `<h1 class="title map-title">${I('map', 36)} Mapa de Navarra</h1><p class="lead map-lead">Toca una comarca para ver su material: sus pueblos, su cultura, su naturaleza y sus montes.</p>
      <div class="map-wrap"><div class="bigmap">${this.navarraSVG({ pins: true })}</div>
      <aside class="legend2"><div class="clist">${COMARCAS.filter(c => comarcaTowns(c.id).length).map((c, i) => `<button data-comarca="${c.id}" style="--d:${(i * 0.04).toFixed(2)}s;--c:${c.color}"><i>${i + 1}</i><b>${esc(c.name)}</b><small>${comarcaTowns(c.id).length}</small></button>`).join('')}</div></aside></div>`;
    const p = profile(), pct = Math.round(navarraProgress(p).stamps / LEVELS.length * 100);
    // (en el móvil tumbado, el mapa a toda la altura y al lado lo que llevas sellado y las comarcas, sin desplazar)
    return `<h1 class="title map-title">${I('map', 36)} Mapa de Navarra</h1><p class="lead map-lead">Toca una comarca para ver sus pueblos. Las comarcas se iluminan a medida que completas sus pueblos.</p>
      <div class="map-wrap"><div class="bigmap">${this.navarraSVG({ pins: true })}<div class="map-ov" aria-hidden="true"><small>Navarra sellada</small><b>${pct}<small>%</small></b></div></div>
      <aside class="legend2"><div class="map-head"><small class="gx-kick">Navarra sellada</small><b class="map-pct">${pct}<small>%</small></b><i class="map-bar"><u style="width:${pct}%"></u></i></div>
        <div class="lg"><span><i class="pin0"></i> Por descubrir</span><span><i class="pin1"></i> Empezado</span><span><i class="pin2"></i> Sellado</span></div>
        <div class="clist">${COMARCAS.filter(c => comarcaTowns(c.id).length).map((c, i) => { const pr = comarcaProgress(p, c.id); return `<button data-comarca="${c.id}" style="--d:${(i * 0.04).toFixed(2)}s;--c:${c.color}"><i>${i + 1}</i><b>${esc(c.name)}</b><small>${pr.stamps}/${pr.towns}</small><em class="cbar2"><u style="width:${pr.towns ? pr.stamps / pr.towns * 100 : 0}%"></u></em></button>`; }).join('')}</div></aside></div>`;
  }

  // ---------- Comarca ----------
  s_comarca(id) {
    const c = comarca(id); if (!c) return this.s_map();
    const p = profile(), pr = comarcaProgress(p, id), ts = comarcaTowns(id), C = c.culture || {}, dd = isDidactico(), star = dd && STAR[id];
    // (la danza de la comarca, con su ilustración si la hay: se abre en grande al tocarla)
    const danza = tradicionUrl('danza-' + id);
    const block = (ic, k, o, img = '') => o ? `<div class="cult${img ? ' con-img' : ''}">${img ? `<button type="button" class="cult-img" data-cultimg aria-label="Ver la ilustración"><img src="${img}" alt="" loading="lazy"></button>` : I(ic, 48)}<div><small>${k}${o.date ? ' · ' + esc(o.date) : ''}</small><b>${esc(o.title)}</b><p>${esc(o.text)}</p>${o.place ? `<em>${esc(o.place)}</em>` : ''}</div></div>` : '';
    const mts = MOUNTAINS.filter(m => m.region === id && LEVELS.some(l => (l.missions || []).some(x => x.type === 'summit' && x.peak === m.id)));
    // cada animal y planta abre su ficha
    const pic = (n, fb, key) => { const [t, id] = (key || '').split(':'), u = t === 'fauna' ? faunaImg(id)?.small : t === 'flora' ? floraFoto(id)?.planta : null;
      return u ? `<img class="nimg${t === 'fauna' ? ' fa' : ''}" src="${u}" alt="" loading="lazy" decoding="async">` : I(speciesIcon(n) || fb, 26); };
    const chip = (n, fb, key, title = '') => key ? `<button class="nchip" data-k="${key}" title="${esc(title)}">${pic(n, fb, key)}${esc(n)}</button>` : `<span class="nchip" title="${esc(title)}">${pic(n, fb)}${esc(n)}</span>`;
    const chips = (arr, fb) => (arr || []).map(n => { const k = floraId(n); return chip(n, fb, k && 'flora:' + k); }).join('');
    this.after = () => {
      this.root.querySelectorAll('.nchip[data-k]').forEach(b => b.onclick = () => showFicha(b.dataset.k, { ui: { sound: this.sound }, button: 'Cerrar' }));
      const cb = this.root.querySelector('[data-cultimg]'); if (cb) cb.onclick = () => openVisor([{ src: danza, title: C.dance.title }], 0, this.sound);
    };
    return `
    <section class="chero" style="--c:${c.color};--bg:url(${comarcaCover(id)})">
      <button class="back" data-go="map">${I('back', 26)} Mapa</button>
      <img class="bigstamp ${pr.stamps || dd ? '' : 'gray'}${dd ? '' : ' con-aro'}" src="${stampImg(id)}" alt="" style="--f:${pr.towns ? pr.stamps / pr.towns : 0}">
      <div><small class="kicker">Comarca</small><h1>${esc(c.full || c.name)}</h1><p>${dd ? `<b>${ts.length}</b> <span>${ts.length === 1 ? 'pueblo' : 'pueblos'}</span> · ${I('river', 20)} <span>${esc(c.river || '')}</span>` : `${cnt(ts.length, 'pueblo', 'pueblos')} · ${cnt(pr.stamps, 'sellado', 'sellados')} · río ${esc(c.river || '')}`}</p></div>
      ${comarcaCover(id) ? `<img class="chero-img" src="${comarcaCover(id)}" alt="" decoding="async">` : ''}
    </section>
    ${(L => L.length ? `<h2 class="sec">${I('scroll', 30)} Láminas</h2>${laminaRail(L)}` : '')(this.comarcaLaminas(id))}
    <h2 class="sec">${I('church', 30)} Pueblos y ciudades</h2>
    <section class="towns">${ts.length ? ts.map(l => this.townCard(l)).join('') : '<p class="empty">Muy pronto habrá pueblos jugables en esta comarca.</p>'}</section>
    <section class="two">
      <div class="panel"><h2>${I('dance', 30)} Cultura</h2><div class="cultgrid">${block('dance', 'Danza', C.dance, danza)}${block('mask', 'Carnaval', C.carnival)}${block('flag', 'Fiesta', C.festival)}${block('ribbon', 'Traje', C.costume)}${star ? block('star', 'Producto estrella', { title: star.name, text: star.text }) : ''}</div></div>
      <div class="panel"><h2>${I('leaf', 30)} Naturaleza</h2>
        <h3>Fauna</h3><div class="nchips">${(c.fauna || []).map(f => { const k = faunaId(f[0]); return chip(f[0], 'bird', k && 'fauna:' + k, f[2]); }).join('')}</div>
        <h3>Árboles</h3><div class="nchips">${chips(c.nature?.trees, 'tree')}</div>
        <h3>Plantas</h3><div class="nchips">${chips(c.nature?.plants, 'herbs')}</div>
        <h3>Flores</h3><div class="nchips">${chips(c.nature?.flowers, 'flower')}</div></div>
    </section>
    ${mts.length ? `<h2 class="sec">${I('peak', 30)} Cimas para subir</h2><section class="peaks">${mts.map(m => this.peakCard(m, dd ? null : LEVELS.find(l => (l.missions || []).some(x => x.type === 'summit' && x.peak === m.id)))).join('')}</section>` : ''}`;
  }
  // un pueblo: su lámina entera arriba (la misma medida en todas las tarjetas), con la cuenta de lo hecho en una esquina;
  // debajo, el nombre (el otro, en la otra lengua, debajo y en pequeño) y una línea con un icono por misión, encendido si
  // ya está hecha. La comarca la dice el grupo en que va; la presentación, su ficha
  townCard(l) {
    const p = profile(), t = townProgress(p, l), dd = isDidactico(), [n1, n2] = l.name.split(' / '), hecho = p.towns[l.id]?.done || {};
    const types = l.special ? ['visit', 'herd', 'legend', 'dance', 'observe', 'carnival'] : (l.missions || []).map(m => m.type);
    const cov = townCover(l.id, true);
    return `<button class="tcard${t.stamp ? ' stamped' : ''}" data-town="${l.id}">
      <span class="tc-img">${cov ? `<img class="tcov" src="${cov}" alt="" loading="lazy" decoding="async">` : I(l.special ? 'castle' : ({ fortress: 'castle', cathedral: 'cathedral', pamplona: 'cathedral' }[l.church?.style] || 'church'), 48)}${t.stamp ? `<img class="tstamp" src="${stampImg(l.comarca)}" alt="">` : ''}${dd ? '' : `<i class="tc-n${t.done ? ' ok' : ''}">${t.done}/${t.total}</i>`}</span>
      <b class="tc-nm">${esc(n1)}${n2 ? `<small>${esc(n2)}</small>` : ''}</b>
      <span class="ticons">${types.map((ty, i) => `<i title="${TYPE_NAME[ty]}"${dd || hecho[i] ? ' class="ok"' : ''}>${I(TYPE_ICON[ty], 20)}</i>`).join('')}</span></button>`;
  }
  townSheet(id) {
    const l = levelById(id); if (!l) return;
    this.sound?.ui('open');
    const p = profile(), t = townProgress(p, l), c = comarca(l.comarca), ts = p.towns[id];
    const ms = l.special ? [{ type: 'visit', title: 'Ongi etorri a Otsagabia' }, { type: 'herd', title: 'El rebaño de Joxemari' }, { type: 'observe', title: 'Guardianes de Irati' }, { type: 'legend', title: 'Basajaun y la Lamia' }, { type: 'carnival', title: 'El Zarratrako' }, { type: 'dance', title: 'La fiesta de Muskilda' }]
      : missionSlots(l, edadDe(p)).map(x => x.m);
    const title = (m) => m.title || (m.type === 'visit' ? `Conoce ${l.name}` : m.type === 'quiz' ? `El sabio de ${l.name}` : m.name || m.product || TYPE_NAME[m.type]);
    const lams = laminasDe({ town: l.id });
    const s = el(`<div class="sheet pueblo"><div class="sheet-in" role="dialog" aria-label="${esc(l.name)}">
      <button class="x" aria-label="Cerrar">${I('close', 18)}</button>
      <div class="sh-hero"><img class="sh-cov" src="${townImg(l)}" alt=""><div class="sh-txt"><small class="kicker">${esc(c?.name)}</small><h1>${esc(l.name)}</h1></div></div>
      <div class="sh-body">${l.intro ? `<p class="sh-intro">${esc(l.intro)}</p>` : ''}
        <h3>${I('check', 18)} Misiones <span>${t.done}/${t.total}</span></h3>
        <ul class="mlist">${ms.map((m, i) => { const k = l.missions?.includes(m) ? l.missions.indexOf(m) : i; return `<li class="${ts?.done?.[k] ? 'ok' : ''}">${I(mIcon(m), 26)}<div><b>${esc(title(m))}</b><small>${TYPE_NAME[m.type]}${m.host ? ' · con ' + esc(m.host.name) : ''}</small></div>${ts?.done?.[k] ? I('check', 18) : ''}</li>`; }).join('')}</ul>
        ${lams.length > 1 ? `<h3>${I('scroll', 18)} Láminas</h3>${laminaRail(lams)}` : ''}
        ${armsOfTown(l.id) ? `<h3>${I('shield', 18)} Su escudo</h3><div class="sh-arms">${armsImg(armsOfTown(l.id).id) ? `<img class="sh-armimg" src="${armsImg(armsOfTown(l.id).id)}" alt="">` : `<canvas width="120" height="${Math.ceil(officialHeight(90, armsOfTown(l.id))) + 6}"></canvas>`}<p><b>${esc(armsOfTown(l.id).name)}.</b> ${esc(armsOfTown(l.id).read)}</p><button class="lnk" data-go="escudos">Ver todos los escudos</button></div>` : ''}
        ${l.church ? `<h3>${I('church', 18)} Qué visitar</h3><ul class="plist"><li><b>${esc(l.church.name)}</b> ${esc(l.church.text)}</li>${(l.landmarks || []).map(x => `<li><b>${esc(x.name)}</b> ${esc(x.text)}</li>`).join('')}</ul>` : ''}
        ${REAL_IDS.includes(l.id) ? `<p class="sh-src"><span>Trazado real del pueblo</span>: ${esc(ATRIBUCION)}</p>` : ''}
      </div>
      <div class="sh-foot"><button class="btn primary" data-play="${l.id}">${I('play', 22)} <span>${t.done ? 'Seguir jugando' : 'Empezar a jugar'}</span></button></div></div></div>`);
    this.sheet?.remove(); this.sheet = s; this.root.appendChild(s); bindLaminas(s, this.sound);
    { const A = armsOfTown(l.id), c = s.querySelector('.sh-arms canvas'); if (A && c) drawOfficial(c.getContext('2d'), c.width / 2, 3, 90, A); }
    s.addEventListener('click', e => { if (e.target === s || e.target.closest('.x')) { s.remove(); this.sheet = null; } });
  }
  play(id) { const l = levelById(id); if (!l) return; if (isDidactico()) return this.go('pueblo', id);   // (en el modo didáctico no se entra al juego: su página)
    if (this.entrando) return;
    const p = profile(); p.last = id; saveProfile(); this.sound?.ui('open');
    // (desde el mapa del inicio, primero el vuelo hasta el pueblo; luego, la partida)
    const vuelo = entraMapa(id); if (!vuelo) return this.onPlay?.(l);
    this.entrando = true; vuelo.then(() => { this.entrando = false; this.onPlay?.(l, { desdeMapa: true }); }); }

  // ---------- Pueblos ----------
  // todos, por comarcas, en una sola lista; arriba, fija, la fila de las comarcas para saltar a la que se quiera (con
  // `ir`, se abre ya en esa comarca)
  s_towns(ir) {
    const p = profile(), dd = isDidactico(), grupos = COMARCAS.map(c => ({ c, ts: comarcaTowns(c.id) })).filter(g => g.ts.length);
    this.after = () => indiceComarcas($('#hMain', this.root), ir);
    return `<h1 class="title">${I('church', 40)} Pueblos y ciudades</h1>${dd ? '<p class="lead">Toca un pueblo para ver todo lo que enseña: qué visitar, su escudo, sus cuentos, sus productos, sus oficios, sus danzas y su carnaval.</p>' : ''}
      <nav class="filters tidx" aria-label="Comarcas">${grupos.map(({ c }) => `<button data-f="${c.id}">${esc(c.name)}</button>`).join('')}</nav>
      ${grupos.map(({ c, ts }) => { const r = comarcaProgress(p, c.id); return `<section class="tgrp" data-c="${c.id}"><h2 class="tg-h">${esc(c.name)} <small>${dd ? cnt(ts.length, 'pueblo', 'pueblos') : `${r.stamps}/${r.towns} sellos`}</small></h2>
        <div class="towns">${ts.map(l => this.townCard(l)).join('')}</div></section>`; }).join('')}`;
  }

  // ---------- Cimas ----------
  // Cimas: las que se suben en el juego (misión de montaña en un pueblo) y el resto como guía
  s_peaks(filter = 'game') {
    const p = profile();
    const inGame = new Map(); for (const l of LEVELS) for (const m of l.missions || []) if (m.type === 'summit') inGame.set(m.peak, l);
    const list = MOUNTAINS.filter(m => filter === 'game' ? inGame.has(m.id) : filter === 'all' || m.region === filter).sort((a, b) => (inGame.has(b.id) - inGame.has(a.id)) || b.altitude - a.altitude);
    this.after = () => this.root.querySelectorAll('.filters button').forEach(b => b.onclick = (e) => { e.stopPropagation(); this.go('peaks', b.dataset.f); });
    const won = [...inGame.keys()].filter(id => p.peaks.includes(id)).length;
    const dd = isDidactico();
    return `<h1 class="title">${I('peak', 40)} Cimas de Navarra</h1>${dd ? '<p class="lead">Los montes de Navarra con su altura, su recorrido y su perfil. Debajo, cómo se leen las señales de los senderos y cómo ir al monte.</p>' : `<p class="lead-chip">${I('peak', 24)}<b>${won}/${inGame.size}</b> cimas</p>`}
      <div class="filters"><button data-f="game" class="${filter === 'game' ? 'on' : ''}">${I('flag', 20)} En el juego</button><button data-f="all" class="${filter === 'all' ? 'on' : ''}">Todas</button>${COMARCAS.filter(c => MOUNTAINS.some(m => m.region === c.id)).map(c => `<button data-f="${c.id}" class="${filter === c.id ? 'on' : ''}" style="--c:${c.color}">${esc(c.name)}</button>`).join('')}</div>
      <section class="peaks">${list.map(m => this.peakCard(m, dd ? null : inGame.get(m.id))).join('')}</section>
      ${dd ? `<h2 class="sec">${I('flag', 30)} Las señales de los senderos</h2><div class="dd-grid">${ORIENTA.map(o => `<article class="dd-b"><header>${I('flag', 34)}<div><h3>${esc(o.title)}</h3></div></header><p>${esc(o.text)}</p></article>`).join('')}</div>
        <h2 class="sec">${I('backpack', 30)} Para ir al monte</h2><ul class="dd-datos">${[...ORIENTA_TIPS, ...MONTE_TIPS].map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`;
  }
  peakCard(m, town = null) {
    const done = profile().peaks.includes(m.id), c = comarca(m.region);
    // (las cimas de las misiones llevan arriba su escena, entera en 16:9, como las tarjetas de los pueblos)
    return `<div class="pcard ${done ? 'done' : ''}" style="--c:${c?.color || '#6d3b5c'}">${(u => u ? `<figure class="pc-img"><img src="${u}" alt="" loading="lazy" decoding="async"></figure>` : '')(cimaUrl(m.id))}<div class="phead">${I('peak', 40)}<div><b>${esc(m.name)}</b><small>${esc(m.zone || '')}</small></div><span class="alt">${m.altitude} m</span></div>
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
      // (con foto real, la foto; si no, la lámina dibujada)
      (async () => { for (const img of imgs) { const ph = floraFoto(img.dataset.flora); if (ph) { img.src = ph.planta; img.classList.add('on', 'photo'); const lf = img.nextElementSibling; if (ph.hoja && lf?.classList.contains('sleaf')) { lf.src = ph.hoja; lf.classList.add('on'); } continue; } await new Promise(r => setTimeout(r, 16)); if (this.screen !== scr || !img.isConnected) return; const u = floraIllustration(img.dataset.flora, 260, 220); if (u) { img.src = u; img.classList.add('on'); } } })();
    };
    const fb = { trees: 'tree', plants: 'herbs', flowers: 'flower' };
    // (de las plantas, la foto de la planta entera de borde a borde por arriba y su hoja en un círculo encima)
    const pic = (d) => d.type === 'fauna' ? (fi => fi ? `<img class="fpic" src="${fi.small}" alt="" loading="lazy" decoding="async">` : I(d.F.icon || speciesIcon(d.F.name) || 'bird', 64))(faunaImg(d.id)) : `<span class="spic">${I(speciesIcon(d.F.name) || fb[tab], 40)}<img alt="" loading="lazy" decoding="async" data-flora="${d.id}"><img class="sleaf" alt="" decoding="async"></span>`;
    return `<h1 class="title">${I('leaf', 40)} Naturaleza de Navarra</h1>${isDidactico() ? '<p class="lead">Del hayedo atlántico a las Bardenas: cada comarca tiene sus animales y plantas. Toca uno para ver su ficha.</p>' : ''}
      ${isDidactico() ? '' : `<div class="nprog"><span>${I('leaf', 22)} Herbario <b>${gotFl}</b> / ${nFl}</span><span>${I('binoculars', 22)} Cuaderno de fauna <b>${gotFa}</b> / ${nFa}</span></div>`}
      <div class="filters">${[['fauna', 'Fauna'], ['trees', 'Árboles'], ['plants', 'Arbustos y plantas'], ['flowers', 'Flores']].map(([k, n]) => `<button data-f="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <section class="species">${list.map(d => { const got = cards.has(type + ':' + d.id); return `<button class="scard ${type === 'flora' ? 'fl' : ''} ${got ? 'seen' : ''}" data-k="${type}:${d.id}">${pic(d)}<b>${esc(d.F.name)}</b><small class="seu">${esc(d.F.eu || '')}${d.F.eu && d.F.sci ? ' · ' : ''}<i>${esc(d.F.sci || '')}</i></small><div class="where">${d.comarcas.map(c => `<i style="background:${c.color}" title="${esc(c.name)}"></i>`).join('')}</div>${got ? `<span class="seenb">${I(type === 'flora' ? 'check' : 'binoculars', 18)} ${type === 'flora' ? 'Identificada' : 'Observado'}</span>` : ''}</button>`; }).join('')}</section>`;
  }

  // ---------- Personajes: selección con el modelo 3D en grande ----------
  castInfo(a) {
    // (como la carta de un jugador: la media grande, el puesto y de dónde es, y las cinco cualidades en cifras)
    const ovr = Math.round(a.stats.reduce((x, y) => x + y, 0) / a.stats.length);
    return `<div class="ci-top"><div class="ci-ovr"><b>${ovr}</b><small>MEDIA</small></div><div class="ci-id"><span class="crole">${esc(a.role)}</span><b class="cname">${esc(a.name)}</b><small class="cfrom">${I('pin', 16)} ${esc(a.from)}</small></div></div>
      <em class="tl">«${esc(a.tagline)}»</em><p class="cdesc">${esc(a.desc)}</p>
      <div class="stats">${a.stats.map((v, i) => `<div class="stat" style="--d:${i * 0.06}s"><b>${v}</b><span>${STAT_LABELS[i]}</span><span class="sbar"><i style="--v:${v}%"></i></span></div>`).join('')}</div>
      <div class="abil"><span class="aic">${I('sparkle', 26)}</span><span><small>Habilidad especial</small>${esc(a.ability)}</span></div>`;
  }
  castStrip(cur) { return `<div class="cstrip">${AVATARS.map(a => `<button data-av="${a.id}" class="${cur === a.id ? 'on' : ''}" style="--c:${a.color}" aria-label="${esc(a.name)}">${avatarPortraitImg(a.id)}<span>${esc(a.name)}</span></button>`).join('')}</div>`; }
  // selector de personaje estilo videojuego (pantalla Personajes y primera vez)
  selector(cur, { onb = false, extra = '', cta = '' } = {}) {
    const i = AVATARS.findIndex(a => a.id === cur.id);
    return `<section class="csel2 ${onb ? 'onbsel' : ''}" style="--c:${cur.color}">
      <div class="cs-stage"><div class="cs-bgname" aria-hidden="true">${esc(cur.name)}</div><div id="avStage" class="stage-host"></div>
        <button class="cs-arrow prev" data-step="-1" aria-label="Anterior"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M15 4l-8 8 8 8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="cs-arrow next" data-step="1" aria-label="Siguiente"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M9 4l8 8-8 8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span class="cs-count"><b>${i + 1}</b>/${AVATARS.length}</span><span class="cs-hint">Arrastra para girarlo · tócalo para saludar</span></div>
      <div class="cs-side">${cta ? '<small class="gx-kick cs-kick">Elige tu personaje</small>' : ''}<div class="csel-info" id="csInfo">${this.castInfo(cur)}</div>${cta ? `<div class="cs-cta">${cta}</div>` : ''}</div>
      <div class="cs-roster">${this.castStrip(cur.id)}</div>${extra ? `<div class="cs-extra">${extra}</div>` : ''}
    </section>`;
  }
  bindSelector(host, start, onPick) {
    let cur = start;
    // centra el retrato elegido en la tira sin mover la página
    const center = (id, smooth) => { const b = host.querySelector(`[data-av="${id}"]`), st = b?.parentElement; if (!st) return; st.scrollTo({ left: b.offsetLeft - st.clientWidth / 2 + b.offsetWidth / 2, behavior: smooth ? 'smooth' : 'auto' }); };
    const stage = this.stage = new Stage($('#avStage', host), cur), sec = $('.csel2', host);
    // (solo mientras se ve este selector: al jugar, el menú se esconde pero sigue en la página, y las flechas del pueblo
    // cambiaban de personaje con el escenario ya cerrado: «Cannot read properties of null (reading 'setAvatar')»)
    const vivo = () => sec.isConnected && !sec.closest('.hidden') && this.stage === stage;
    const set = (id) => {
      if (id === cur || !vivo()) return; cur = id; const a = castById(id);
      stage.setAvatar(id); this.sound?.ui('coin');
      sec.style.setProperty('--c', a.color);
      const info = $('#csInfo', host); info.innerHTML = this.castInfo(a); info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
      $('.cs-bgname', host).textContent = a.name; $('.cs-count b', host).textContent = AVATARS.indexOf(a) + 1;
      host.querySelectorAll('[data-av]').forEach(x => x.classList.toggle('on', x.dataset.av === id));
      center(id, true);
      onPick(a);
    };
    const step = (d) => { const i = AVATARS.findIndex(a => a.id === cur); set(AVATARS[(i + d + AVATARS.length) % AVATARS.length].id); };
    host.querySelectorAll('[data-av]').forEach(b => b.onclick = (e) => { e.stopPropagation(); set(b.dataset.av); });
    host.querySelectorAll('[data-step]').forEach(b => b.onclick = (e) => { e.stopPropagation(); step(+b.dataset.step); });
    const key = (e) => { if (!sec.isConnected || this.stage !== stage) return removeEventListener('keydown', key); if (!vivo() || e.target.tagName === 'INPUT') return; if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    addEventListener('keydown', key);
    center(cur);
  }
  s_avatars() {
    const p = profile(), cur = castById(p.avatar);
    this.after = () => this.bindSelector(this.root, p.avatar, (a) => { p.avatar = a.id; saveProfile(); this.renderChip(); $('#csGo', this.root).innerHTML = `${I('play', 24)} Jugar con ${esc(a.name)}`; });
    // (el título y el botón de jugar van dentro del selector: en el móvil tumbado todo cabe en una pantalla; los personajes
    // de Navarra, de leyenda y de carnaval tienen su propia sección: s_personajes)
    return `<h1 class="title cs-title">Elige tu personaje</h1>${this.selector(cur, { cta: `<button class="gx-go" id="csGo" data-go="home">${I('play', 24)} Jugar con ${esc(cur.name)}</button>` })}`;
  }
  // ---------- Personajes ----------
  // su propia sección: las mujeres y los personajes de Navarra con su ficha (ui/personajes.js) y los seres de leyenda y
  // las figuras de carnaval del juego (ui/figuras.js), con pestañas para ver un grupo o todos
  s_personajes(tab = 'all') {
    const G = [
      ['mujeres', 'Mujeres', 'Mujeres de Navarra', 'person', 'Mujeres que hicieron historia en Navarra: reinas, maestras, trabajadoras del campo y de la fábrica. Toca una para leer su ficha.', personajesHTML(MUJERES), MUJERES.length],
      ['navarra', 'Personajes', 'Personajes de Navarra', 'book', 'Músicos, deportistas, viajeros, sabios, pastores, hortelanos y arquitectos de Navarra. Cada uno tiene su recuerdo en un pueblo del juego.', personajesHTML(HOMBRES), HOMBRES.length],
      ['leyenda', 'Leyenda', 'Seres de leyenda', 'legend', 'Los seres de las leyendas de Navarra, tal como salen de noche en el juego. Toca uno para leer su ficha.', figurasHTML(FIGURAS_LEYENDA), FIGURAS_LEYENDA.length],
      ['carnaval', 'Carnaval', 'Carnavales', 'mask', 'Los personajes de los carnavales de Navarra, con el traje de verdad de cada pueblo.', figurasHTML(FIGURAS_CARNAVAL), FIGURAS_CARNAVAL.length]];
    if (!G.some(g => g[0] === tab)) tab = 'all';
    const total = G.reduce((a, g) => a + g[6], 0);
    this.after = () => this.root.querySelectorAll('.pj .filters button').forEach(b => b.onclick = (e) => { e.stopPropagation(); this.go('personajes', b.dataset.f); });
    return `<section class="armorial pj">
      <div class="ar-head"><small class="kicker">${I('book', 20)} Saberes · Personajes</small><h1>Personajes de Navarra</h1>
        ${isDidactico() ? '<p>Las mujeres y los hombres que hicieron historia, los seres de las leyendas y las figuras de los carnavales, con la ficha de cada uno.</p>' : ''}
        <b class="ar-count">${total} personajes</b></div>
      <div class="filters">${[['all', 'Todos', total], ...G.map(g => [g[0], g[1], g[6]])].map(([k, n, c]) => `<button data-f="${k}" class="${tab === k ? 'on' : ''}">${n} <small>${c}</small></button>`).join('')}</div>
      ${G.filter(g => tab === 'all' || g[0] === tab).map(g => `<div class="pj-g"><h2 class="sec">${I(g[3], 34)} ${g[2]}</h2>${isDidactico() ? `<p class="lead">${g[4]}</p>` : ''}<section class="figuras">${g[5]}</section></div>`).join('')}
    </section>`;
  }

  // ---------- Insignias ----------
  // ---------- Escudos de Navarra ----------
  s_escudos() {
    const dd = isDidactico(), p = profile(), seen = new Set(dd ? [] : p.cards || []), tn = townName;
    const KIND = { reino: 'Reino', ciudad: 'Ciudad', valle: 'Valle', municipio: 'Municipio' };
    // (los pueblos de cada escudo, debajo de su nombre y en letra de leer; no los que ya dice el nombre, como Pamplona)
    const pueblos = (A) => A.towns.map(tn).filter(t => !lettersOnly(A.name).includes(lettersOnly(t)));
    const read = ARMAS.filter(A => seen.has('armas:' + A.id)).length;
    // (cada escudo es una tarjeta que abre su ficha, la misma que en el pueblo: el blasón, cómo se lee, los esmaltes, las
    // figuras y su historia, en pestañas; la guía de cómo se lee un escudo y los que faltan por comprobar, también en ficha)
    const ui = { sound: this.sound };
    this.after = () => {
      this.root.querySelectorAll('.ar canvas[data-draw]').forEach(c => { const A = ARMAS.find(a => a.id === c.dataset.draw); try { drawOfficial(c.getContext('2d'), c.width / 2, 4, 120, A); } catch (e) { console.warn(A.id, e); } });
      this.root.querySelectorAll('button.ar[data-arm]').forEach(b => { const A = ARMAS.find(a => a.id === b.dataset.arm); b.onclick = () => readTownArms(ui, A, { town: A.towns.length ? tn(A.towns[0]) : A.name }); });
      // (los de las casas: la misma ficha que en la fachada, con la imagen del autor si la tiene y el tallado en piedra)
      this.root.querySelectorAll('.ar canvas[data-casa]').forEach(c => { const [t, i] = c.dataset.casa.split(':'); const L = levelById(t); if (!L) return; try { drawArms(c.getContext('2d'), c.width / 2, 4, 92, houseArms(L, +i), { stone: true }); } catch (e) { console.warn(t, e); } });
      this.root.querySelectorAll('button.ar[data-casa]').forEach(b => { const [t, i] = b.dataset.casa.split(':'); const L = levelById(t); if (!L) return; b.onclick = () => readArms(ui, houseArms(L, +i), { town: tn(t), image: casaImg(t, +i) || '' }); });
      $('[data-guia]', this.root)?.addEventListener('click', () => infoCard(ui, { kicker: 'Saberes · Escudos', title: 'Cómo se lee un escudo', image: armsImgBig('navarra') || armsImg('navarra') || '',
        sub: 'Un escudo se lee como una frase: primero el campo, luego las figuras, sus colores y su sitio.',
        secs: GUIA.map(([t, d], i) => [String(i + 1), `<b>${esc(t)}.</b> ${esc(d)}`]) }));   // (las pestañas, con el número de cada paso)
      $('[data-pend]', this.root)?.addEventListener('click', () => infoCard(ui, { kicker: 'Saberes · Escudos', title: 'Por comprobar', media: I('binoculars', 160),
        sub: 'De estos pueblos del juego aún no hemos podido comprobar el escudo en una fuente fiable. Por eso no lo dibujamos: preferimos no inventarlo.',
        secs: PENDIENTES.map(x => [x.name.split(' · ')[0], `<b>${esc(x.name)}.</b> ${esc(x.note || '')}`]) }));
    };
    // los escudos de casa leídos en las fachadas (cartas «escudo:<pueblo>:<n>»): la imagen del autor y, si no la tiene, el tallado
    const casas = (p.cards || []).filter(c => c.startsWith('escudo:')).map(c => { const [, t, i] = c.split(':'); const L = levelById(t); return L ? { t, i: +i, L, A: houseArms(L, +i), img: casaImg(t, +i) } : null; }).filter(Boolean);
    // (el aviso de «ninguno» va dentro de la cabecera: la sección es una rejilla con 16 px de hueco entre hijos y, suelto,
    // el texto quedaba a 31 px del título)
    const casasHTML = `<div class="ar-h2"><h2>Escudos de las casas</h2><small>${casas.length ? `${casas.length} ${casas.length === 1 ? 'leído' : 'leídos'} en las fachadas` : ''}</small>${casas.length ? '' : '<p class="ar-none">Aún no has leído ninguno: están sobre las puertas de las casas de cada pueblo.</p>'}</div>
      ${casas.length ? `<div class="ar-grid ar-casas">${casas.map(c => `<button type="button" class="ar on" data-casa="${c.t}:${c.i}">
        ${c.img ? `<img class="ar-img" src="${c.img}" alt="Escudo de la casa ${esc(c.A.house)}" loading="lazy" decoding="async">` : `<canvas data-casa="${c.t}:${c.i}" width="160" height="172" aria-label="Escudo de la casa ${esc(c.A.house)}"></canvas>`}
        <span class="ar-tx"><small>Casa · ${esc(tn(c.t))}</small><b class="ar-nm">${esc(c.A.house)}</b><span class="ar-pu">Siglo ${esc(c.A.century)}</span></span>${I('play', 20)}</button>`).join('')}</div>` : ''}`;
    return `<section class="armorial">
      <div class="ar-head"><small class="kicker">${I('shield', 20)} Saberes · Escudos</small><h1>Escudos de Navarra</h1>
        ${dd ? '<p>Los escudos son una forma de escribir con dibujos: cada color, cada figura y cada sitio quieren decir algo. Aquí están los escudos oficiales del reino, de las ciudades, de los valles y de los pueblos del juego. Toca un escudo para ver su ficha.</p>' : ''}
        ${dd ? `<b class="ar-count">${ARMAS.length} <span>escudos</span></b>` : `<b class="ar-count">${read} de ${ARMAS.length} leídos en el juego</b>`}</div>
      <button type="button" class="ar-btn" data-guia>${I('book', 32)}<span><b>Cómo se lee un escudo</b><small>Siete pasos para leer cualquier escudo</small></span>${I('play', 20)}</button>
      <div class="ar-grid">${ARMAS.map(A => `<button type="button" class="ar${seen.has('armas:' + A.id) ? ' on' : ''}" data-arm="${A.id}">
        ${armsImg(A.id) ? `<img class="ar-img" src="${armsImg(A.id)}" alt="Escudo de ${esc(A.name)}" loading="lazy" decoding="async">` : `<canvas data-draw="${A.id}" width="160" height="${Math.ceil(officialHeight(120, A)) + 8}" aria-label="Escudo de ${esc(A.name)}"></canvas>`}
        <span class="ar-tx"><small>${KIND[A.kind] || ''}</small><b class="ar-nm">${esc(A.name)}</b>${(t => t.length ? `<span class="ar-pu">${esc(t.join(', '))}</span>` : '')(pueblos(A))}${seen.has('armas:' + A.id) ? `<span class="ar-ok">${I('check', 16)} Leído en el juego</span>` : ''}</span>${I('play', 20)}</button>`).join('')}</div>
      ${dd ? '' : casasHTML}
      ${PENDIENTES.length ? `<button type="button" class="ar-btn" data-pend>${I('binoculars', 32)}<span><b>Por comprobar</b><small>${PENDIENTES.length === 1 ? 'Un escudo que aún no dibujamos' : `${PENDIENTES.length} escudos que aún no dibujamos`}</small></span>${I('play', 20)}</button>` : ''}
      <p class="ar-src">Fuentes: Heraldry of the World (blasones municipales), NAVARCHIVO, Ayuntamiento de Pamplona, Ayuntamiento de Sangüesa, Gran Enciclopedia de Navarra, Auñamendi Eusko Entziklopedia y Cátedra de Patrimonio de la Universidad de Navarra. Los dibujos son del juego, hechos a partir del blasón.</p>
    </section>`;
  }
  // ---------- Álbum de láminas ----------
  // (una tira horizontal por comarca, con sus paisajes y las de sus pueblos; luego los oficios y los deportes)
  comarcaLaminas(id) { return [...LAMINAS.filter(l => l.comarca === id && laminaUrl(l.id)), ...comarcaTowns(id).flatMap(t => laminasDe({ town: t.id }))]; }
  s_album() {
    const groups = [...COMARCAS.map(c => ({ name: c.name, color: c.color, list: this.comarcaLaminas(c.id) })),
      { name: 'Oficios de antes', list: laminasDe({ group: 'oficios' }) }, { name: 'Deportes', list: laminasDe({ group: 'deportes' }) }].filter(g => g.list.length);
    return `<h1 class="title">${I('scroll', 40)} Láminas de Navarra</h1>
      ${groups.map(g => `<section class="album-sec" style="--c:${g.color || '#c9b2ff'}"><h2 class="sec"><i class="adot"></i>${esc(g.name)}</h2>${laminaRail(g.list)}</section>`).join('')}`;
  }
  // ---------- Cuentos y leyendas ----------
  s_cuentos() {
    if (isDidactico()) return this.d_cuentos();
    const p = profile(), seen = new Set(p.cards || []), tn = townName;
    const heard = CUENTOS.filter(C => seen.has('cuento:' + C.id)).length;
    // (la ilustración de un cuento ya escuchado se abre en grande, con las de los otros escuchados para pasar de una a otra)
    this.after = () => { const on = CUENTOS.filter(C => seen.has('cuento:' + C.id) && leyendaUrl(C.id, true)), list = on.map(C => ({ src: leyendaUrl(C.id, true), title: C.title }));
      this.root.querySelectorAll('.ct-lam[data-ley]').forEach(f => f.onclick = () => openVisor(list, Math.max(0, on.findIndex(C => C.id === f.dataset.ley)), this.sound)); };
    return `<section class="armorial cuentos">
      <div class="ar-head"><small class="kicker">${I('legend', 20)} Saberes · Leyendas</small><h1>Cuentos y leyendas de Navarra</h1>
        <b class="ar-count">${heard} de ${CUENTOS.length} escuchados</b></div>
      <div class="ar-grid">${CUENTOS.map(C => { const on = seen.has('cuento:' + C.id); return `<article class="ar ct${on ? ' on' : ''}">
        ${(u => u ? `<figure class="ct-lam${on ? '' : ' locked'}"${on ? ` data-ley="${C.id}"` : ''}><img src="${u}" alt="" loading="lazy" decoding="async">${on ? '' : `<span>${I('lock', 40)}</span>`}</figure>` : `<div class="ct-ic">${I(on ? C.icon : 'lock', 64)}</div>`)(leyendaUrl(C.id))}
        <div class="ar-tx"><small>${esc(KIND_LABEL[C.kind])} · ${esc(C.towns.map(tn).join(', '))}</small><h3>${esc(C.title)}</h3><p class="ct-pl">${esc(C.place)}</p>
          ${on ? `<span class="ar-ok">${I('check', 16)} Escuchado</span><details><summary>Volver a leerlo</summary>${C.parts.map(t => `<p>${esc(t)}</p>`).join('')}<p><b>Lo que puedes ver hoy.</b> ${esc(C.today)}</p></details>`
            : `<p>Ve a ${esc(tn(C.towns[0]))} y habla con ${esc(C.teller.name)} en la plaza.</p><button class="btn ct-go" data-play="${C.towns[0]}">${I('play', 20)} Ir a ${esc(tn(C.towns[0]))}</button>`}</div></article>`; }).join('')}</div>
      <p class="ar-src">Fuentes: Cátedra de Patrimonio de la Universidad de Navarra, Auñamendi Eusko Entziklopedia, Senditur, Noticias de Navarra, culturanavarra.es, las Leyendas de Gustavo Adolfo Bécquer y los santuarios y ayuntamientos de cada lugar. Las leyendas tienen muchas versiones: aquí está la más contada, adaptada para niños y niñas.</p>
    </section>`;
  }
  // ---------- Instrumentos ----------
  s_instrumentos() {
    const p = profile(), seen = new Set(p.cards || []), played = INSTRUMENTOS.filter(x => seen.has('instrumento:' + x.id)).length;
    return `<section class="armorial instrumentos">
      <div class="ar-head"><small class="kicker">${I('music', 20)} Saberes · Instrumentos</small><h1>Instrumentos de Navarra</h1>
        ${isDidactico() ? '<p>Los instrumentos de la música de siempre: qué son, cómo se tocan y dónde se oyen. Toca uno para leer su ficha y escucharlo.</p>' : ''}
        ${isDidactico() ? '' : `<b class="ar-count">${played} de ${INSTRUMENTOS.length} tocados</b>`}</div>
      ${instrumentosHTML(INSTRUMENTOS)}
      <p class="ar-src">Fuentes: Auñamendi Eusko Entziklopedia, Museo Etnológico de Navarra «Julio Caro Baroja», Soinuenea (Herri Musikaren Txokoa), Euskal Herriko Txistularien Elkartea, Ortzadar Euskal Folklore Taldea y los ayuntamientos y grupos de cada zona. Las frases que se tocan son del juego, al estilo de cada música.</p>
    </section>`;
  }
  s_pasaka() {
    const p = profile(), won = p.pasakaWon || 0, played = p.pasaka || 0, has = (p.cards || []).includes('pasaka:claustro');
    // (la portada se dibuja con la misma vista del minijuego, al tamaño que tenga)
    this.after = () => { const cv = this.root.querySelector('.pk-prev'); if (cv) try { pasakaPreview(cv); } catch (e) { console.warn('pasaka', e); } };
    return `<section class="armorial pasaka">
      <div class="ar-head"><small class="kicker">${I('pelota', 20)} Saberes · Tradiciones</small><h1>Pasaka</h1>
        <p>${esc(PASAKA.lead)}</p>
        <b class="ar-count">${played ? `${won} ${won === 1 ? 'partido ganado' : 'partidos ganados'} de ${played}` : 'Todavía no has jugado'}${has ? ' · carta de tradiciones' : ''}</b></div>
      <div class="pk-hero"${laminaUrl('dep-pasaka') ? ` style="--bg:url(${laminaUrl('dep-pasaka')})"` : ''}>${laminaUrl('dep-pasaka') ? `<img class="pk-cov" src="${laminaUrl('dep-pasaka')}" alt="" decoding="async">` : '<canvas class="pk-prev" aria-hidden="true"></canvas>'}
        <div class="pk-hero-tx"><small class="kicker">${esc(PASAKA.kicker)}</small><b>Dos parejas, una red por medio y un guante de cuero</b><button class="btn primary big" data-pasaka="jugar">${I('play', 26)} <span>Jugar a pasaka</span></button></div></div>
      <div class="ar-grid pk-secs">${PASAKA.secs.map(([t, x], i) => `<article class="ar-guia pk-sec"><h3>${I(['book', 'castle', 'pelota', 'pin', 'cathedral', 'play'][i] || 'book', 30)}${esc(t)}</h3><p>${esc(x)}</p></article>`).join('')}</div>
      <p class="ar-src">${esc(PASAKA.sources)}</p>
    </section>`;
  }
  s_badges() {
    const p = profile(); checkBadges(); saveProfile();
    return `<h1 class="title">${I('badge', 40)} Insignias</h1><p class="lead-chip">${I('badge', 24)}<b>${p.badges.length}/${BADGES.length}</b></p>
      <section class="badges">${BADGES.map(b => { const on = p.badges.includes(b.id); return `<div class="bcard ${on ? 'on' : ''}"><div class="bic">${I(b.icon, 64)}${on ? '' : `<i class="blk">${I('lock', 24)}</i>`}</div><b>${esc(b.name)}</b><p>${esc(b.text)}</p></div>`; }).join('')}</section>`;
  }

  // ---------- Pasaporte ----------
  s_passport() {
    const p = profile();
    return `<h1 class="title">${I('stamp', 40)} Pasaporte Herri</h1>
      <section class="passport">${COMARCAS.map(c => { const ts = comarcaTowns(c.id), pr = comarcaProgress(p, c.id);
        return `<div class="ppage" style="--c:${c.color}"><header><img class="${pr.stamps ? '' : 'gray'}" src="${stampImg(c.id)}" alt=""><div><b>${esc(c.name)}</b><small>${pr.stamps}/${ts.length} sellos</small></div></header>
        <div class="pstamps">${ts.length ? ts.map(l => { const t = townProgress(p, l), fut = p.towns?.[l.id]?.futsal?.sello; return `<button class="pst ${t.stamp ? 'on' : ''}" data-town="${l.id}">${(u => u ? `<img class="pst-img" src="${u}" alt="" loading="lazy" decoding="async">` : '')(townCover(l.id, true))}<span class="ink">${t.stamp ? `<img src="${stampImg(c.id)}" alt="">` : I('lock', 30)}</span>${fut ? `<i class="fsello" title="Sello de fútbol">${I('balon', 18)}</i>` : ''}<small>${esc(l.name.split(' /')[0])}</small></button>`; }).join('') : '<small class="empty">Próximamente</small>'}</div></div>`; }).join('')}</section>`;
  }

  // ---------- Perfil y ajustes ----------
  s_profile() {
    const p = profile(), L = levelOf(p.xp), S = p.settings, sal = salazarState();
    this.after = () => {
      const r = this.root;
      $('#pMusic', r).onchange = e => { S.music = e.target.checked; saveProfile(); this.onSettings?.(S); };
      $('#pVol', r).oninput = e => { S.volume = +e.target.value; saveProfile(); this.onSettings?.(S); };
      $('#pLang', r).value = getLang(); $('#pLang', r).onchange = e => setLang(e.target.value);
      $('#pMode', r).value = isDidactico() ? 'didactico' : 'juego'; $('#pMode', r).onchange = e => this.setDidactico(e.target.value === 'didactico');
      if (isDidactico()) return;   // (en el modo didáctico no hay nombre, edad, calidad ni progreso que borrar)
      $('#pName', r).onchange = e => { p.name = e.target.value.trim().slice(0, 14) || p.name; saveProfile(); this.renderChip(); };
      $('#pName', r).addEventListener('keydown', e => e.stopPropagation());
      $('#pQ', r).value = S.quality || 'auto';
      $('#pCj', r).onclick = () => { this.sound?.ui('open'); comoJugar(this.root); };
      $('#pPad', r)?.addEventListener('click', () => import('../mando/mando.js').then(m => m.abrirMando()));   // (en el ordenador: el móvil como mando)
      // (descargar el juego entero: cuánto falta y, al pulsar, el progreso)
      const bt = $('#pTodo', r), nt = $('#pTodoN', r), mb = (n) => Math.round(n / 1e6);
      if (bt) {
        const pon = (t, n) => { bt.querySelector('span').textContent = t; if (n) nt.textContent = n; };
        queFalta().then(q => { if (!bt.isConnected) return; if (!q.falta) { pon('Juego entero descargado'); bt.disabled = true; nt.textContent = 'Ya está todo en este ordenador: puedes jugar sin esperas y sin conexión.'; } else pon(`Descargar el juego entero · ${mb(q.bytesFalta)} MB`); }).catch(() => { bt.hidden = true; nt.hidden = true; });
        bt.onclick = async () => {
          bt.disabled = true; pon('Descargando…');
          try {
            const fallos = await descargarTodo(({ hechos, total, bytes, bytesTotal }) => { if (bt.isConnected) pon(`Descargando · ${Math.round(100 * bytes / bytesTotal)} %`, `${hechos} de ${total} archivos · ${mb(bytes)} de ${mb(bytesTotal)} MB. Puedes seguir jugando mientras tanto.`); });
            if (bt.isConnected) { if (fallos) { bt.disabled = false; pon('Seguir descargando', `Faltan ${fallos} archivos: comprueba la conexión y vuelve a pulsar.`); } else pon('Juego entero descargado', 'Ya está todo en este ordenador: puedes jugar sin esperas y sin conexión.'); }
          } catch (e) { if (bt.isConnected) { bt.disabled = false; pon('Descargar el juego entero', 'No se ha podido descargar: comprueba la conexión y vuelve a pulsar.'); } }
        };
      }
      $('#pAge', r).value = edadDe(p); $('#pAge', r).onchange = e => { p.age = e.target.value; saveProfile(); this.sound?.ui('click'); this.go('profile', undefined, true); };
      $('#pQ', r).onchange = e => { S.quality = e.target.value === 'auto' ? null : e.target.value; S.qualityAuto = false; delete S.slowPc; saveProfile(); this.onSettings?.(S); };
      const rb = $('#pReset', r); rb.onclick = (e) => { e.stopPropagation(); if (rb.dataset.sure) { resetProfile(); try { localStorage.removeItem('herrizherri-salazar-v2'); } catch (err) { } this.go('home'); } else { rb.dataset.sure = 1; rb.textContent = '¿Seguro? Pulsa otra vez para borrar todo'; this.sound?.ui('error'); } };
    };
    const mode = `<label class="set">Modo <select id="pMode"><option value="juego">Juego</option><option value="didactico">Material didáctico</option></select></label>
        <p class="set-note">${isDidactico() ? 'Solo el material para aprender, sin el juego: todo abierto para leer y estudiar.' : 'Con «Material didáctico» se oculta el juego y queda todo lo que se aprende, abierto para leer y estudiar. Tu partida no se borra.'}</p>`;
    if (isDidactico()) return `<h1 class="title">${I('gear', 40)} Ajustes</h1>
      <section class="two"><div class="panel"><h2>${I('gear', 30)} Ajustes</h2>${mode}
        <label class="set">Idioma <select id="pLang"><option value="eu">Euskara</option><option value="es">Castellano</option><option value="learn">Aprende euskera</option></select></label>
        <label class="set">Música <input type="checkbox" id="pMusic" ${S.music ? 'checked' : ''}></label>
        <label class="set">Volumen <input type="range" id="pVol" min="0" max="1" step="0.05" value="${S.volume}"></label></div></section>${this.creditos()}`;
    let doneM = 0; for (const l of LEVELS) doneM += townProgress(p, l).done;
    return `<h1 class="title">${I('gear', 40)} Perfil y ajustes</h1>
      <section class="two pf"><div class="panel prof"><img src="${avatarPortrait(p.avatar, 'hero')}" alt=""><div>
        <label>Tu nombre<input id="pName" maxlength="14" value="${esc(p.name)}" autocomplete="off"></label>
        <div class="lvl"><b>Nivel ${L.lv}</b> · ${rankOf(L.lv)}<div class="xp big"><i style="width:${L.cur / L.need * 100}%"></i></div><small>${L.cur}/${L.need} XP para el siguiente nivel</small></div>
        <div class="pstats"><span>${I('stamp', 26)} ${cnt(stampCount(p), 'sello', 'sellos')}</span><span>${I('check', 26)} ${cnt(doneM, 'misión', 'misiones')}</span><span>${I('book', 26)} ${cnt(p.cards.length, 'carta', 'cartas')}</span><span>${I('peak', 26)} ${cnt(p.peaks.length, 'cima', 'cimas')}</span><span>${I('binoculars', 26)} ${cnt(p.species.length, 'especie', 'especies')}</span><span>${I('ribbon', 26)} ${sal?.ribbons?.length || 0}/8 cintas de Muskilda</span></div>
        <button class="btn" data-go="avatars">${I('person', 22)} Cambiar personaje</button></div></div>
      <div class="panel pjugar"><h2>${I('play', 30)} Cómo jugar</h2>
        <button class="btn" id="pCj">${I('play', 22)} Cómo jugar e instalar</button><p class="set-note">En el ordenador, con el móvil de mando o en el móvil: los pasos de cada forma y sus botones para instalar el juego o la app Mando.</p>
        ${TACTIL ? '' : `<button class="btn" id="pPad">${I('control', 22)} Usar el móvil como mando</button><p class="set-note">El móvil hace de mando por la wifi, sin instalar nada: el ordenador te enseña un código para escanearlo con la cámara.</p>`}
        ${puedeDescargar() ? `<button class="btn" id="pTodo">${I('home', 22)} <span>Descargar el juego entero</span></button><p class="set-note" id="pTodoN">Todo se guarda en este ordenador: los pueblos y los minijuegos abren sin esperar a internet, y se puede jugar sin conexión.</p>` : ''}
      </div>
      <div class="panel pajustes"><h2>${I('gear', 30)} Ajustes</h2>${mode}
        <label class="set">Edad <select id="pAge">${EDADES.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}</select></label>
        <p class="set-note">${esc(EDADES.find(e => e.id === edadDe(p)).text)}. Cambiar de edad no borra nada de lo que ya has hecho.</p>
        <label class="set">Idioma <select id="pLang"><option value="eu">Euskara</option><option value="es">Castellano</option><option value="learn">Aprende euskera</option></select></label>
        <label class="set">Música <input type="checkbox" id="pMusic" ${S.music ? 'checked' : ''}></label>
        <label class="set">Volumen <input type="range" id="pVol" min="0" max="1" step="0.05" value="${S.volume}"></label>
        <label class="set">Calidad gráfica <select id="pQ"><option value="auto">Automática</option><option value="low">Baja (más fluido)</option><option value="mid">Media</option><option value="high">Alta</option></select></label>
        <p class="hint">Controles: WASD o flechas para caminar, ratón para mirar, E para hablar, Espacio para saltar, Mayús para correr. En móvil: arrastra a la izquierda para caminar y a la derecha para mirar. También vale un mando de consola.</p>
        <button class="btn danger" id="pReset">Borrar todo el progreso</button></div></section>${this.creditos()}`;
  }
  // de quién es cada cosa y con qué licencia (las de three.js y del código QR piden llevar su aviso, que va en inglés tal cual)
  creditos() {
    return `<details class="panel creditos"><summary>${I('scroll', 26)} Créditos y licencias</summary><ul>
      <li>Ilustraciones, iconos y personajes: creados por el autor del juego con ayuda de herramientas de inteligencia artificial.</li>
      <li>Modelos 3D de base: hechos con Meshy (meshy.ai) y adaptados para el juego.</li>
      <li>Fotos de las plantas: iNaturalist, de dominio público (CC0).</li>
      <li>Mapas de los pueblos: © colaboradores de OpenStreetMap (ODbL), Overture Maps y relieve EU-DEM de Copernicus (Unión Europea).</li>
      <li>Mapa de Navarra del inicio: relieve de SRTM y GMTED2010 (U.S. Geological Survey, dominio público) y EU-DEM de Copernicus (Unión Europea); ríos y embalses © colaboradores de OpenStreetMap (ODbL), con Overture Maps.</li>
      <li>Paisaje de los prismáticos en los miradores: relieve EU-DEM de Copernicus (Unión Europea), SRTM y GMTED2010 (U.S. Geological Survey, dominio público) y ETOPO1 (NOAA, dominio público).</li>
      <li>Músicas, público y gol: de Envato Elements, con licencia solo para este juego («Epic» de MrClaps y de MDFactory, «Game» de cinematic-alex, «Brazil Soccer crowd steady» de rhumphriesDC, «Crowd Cheering and Applauding» de GameChestAudio y «Football Goal» de WistanSound). No se pueden usar fuera del juego.</li>
      <li>Letras: Barlow Condensed, Lilita One y Nunito, con licencia SIL Open Font License 1.1.</li>
      <li>Programas: three.js (© 2010-2025 Three.js Authors) y qrcode-generator (© 2009 Kazuhiko Arase), con licencia MIT:</li></ul>
      <p class="mit" data-notr>Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p></details>`;
  }

  // ---------- Primera vez: el idioma (antes que nada; en los dos idiomas, porque aún no se sabe cuál) ----------
  langPicker() {
    const o = el(`<div class="onb langpick"><div class="lp-in">
      <div class="logo">HERRIZHERRI</div>
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
      <header class="onb-head"><div class="logo">HERRIZHERRI</div><p class="tag">Navarra, pueblo a pueblo</p>
        <div class="langsel" role="group" aria-label="Idioma"><button data-lang="eu" class="${getLang() === 'eu' ? 'on' : ''}">Euskara</button><button data-lang="es" class="${getLang() === 'es' ? 'on' : ''}">Castellano</button><button data-lang="learn" class="${getLang() === 'learn' ? 'on' : ''}">Aprende euskera</button></div></header>
      ${this.selector(castById(pick), { onb: true, extra: `<div class="onb-foot"><label>¿Cómo te llamas?<input id="oName" maxlength="14" autocomplete="off" placeholder="Tu nombre" aria-label="¿Cómo te llamas?"></label>
        <div class="onb-age" role="radiogroup" aria-label="Tu edad"><span>¿Cuántos años tienes?</span>${EDADES.map(e => `<button type="button" role="radio" data-age="${e.id}" aria-checked="${e.id === age}" class="${e.id === age ? 'on' : ''}"><b>${e.name}</b><small>${e.text}</small></button>`).join('')}</div>
        <button class="btn primary big" id="oGo">${I('play', 26)} ¡Empezar<span class="go-long"> la aventura</span>!</button>
        <button type="button" class="btn ghost onb-dd" id="oDd">${I('book', 24)} Solo el material didáctico, sin jugar</button></div>` })}
    </div></div>`);
    this.root.appendChild(o);
    this.bindSelector(o, pick, (a) => { pick = a.id; this.sound?.init?.(); });
    o.querySelectorAll('[data-lang]').forEach(b => b.onclick = (e) => { e.stopPropagation(); if (b.dataset.lang !== getLang()) setLang(b.dataset.lang); });
    const inp = $('#oName', o); inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); });
    o.querySelectorAll('[data-age]').forEach(b => b.onclick = (e) => { e.stopPropagation(); age = b.dataset.age; o.querySelectorAll('[data-age]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); this.sound?.ui?.('click'); });
    const go = () => { p.name = inp.value.trim() || 'Iñigo'; p.avatar = pick; p.age = age; saveProfile(); this.sound?.init?.(); this.sound?.ui('open'); o.remove(); this.go('home', null, true); };
    $('#oGo', o).onclick = go;
    $('#oDd', o).onclick = (e) => { e.stopPropagation(); p.age = age; saveProfile(); o.remove(); this.setDidactico(true); };   // (sin nombre ni personaje: no se juega)
  }
}
// las pantallas del modo didáctico (didactico.js)
Object.assign(Hub.prototype, DIDACTICO);
