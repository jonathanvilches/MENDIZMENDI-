// Centro de mando: inicio, mapa de Navarra, comarcas, pueblos, cimas, naturaleza, personajes, insignias, pasaporte y perfil.
import COMARCAS from '../data/comarcas.json';
import MOUNTAINS from '../data/mountains.json';
import { CAST as AVATARS, STAT_LABELS, castById } from '../data/cast.js';
import SETTLEMENTS from '../data/settlements.json';
import { LEVELS, levelById, esSede, sedeDePueblo } from '../data/levels.js';
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
import { getLang, setLang, langChosen, isEU } from '../i18n.js';
import { laminaUrl, laminasDe, laminaRail, bindLaminas, townCover, comarcaCover, townImg, leyendaUrl, openVisor, cimaUrl, tradicionUrl, encuadreDe, encuadreComarca } from '../ui/laminas.js';
import { LAMINAS } from '../data/laminas.js';
import { CLUBS } from '../futbol/clubs.js';
import { STAR } from '../data/tiendas.js';
import { EDADES, edadDe, missionSlots } from '../data/edad.js';
import { ARMAS, PENDIENTES, GUIA, armsOfTown } from '../data/armas-navarra.js';
import { CUENTOS, KIND_LABEL, cuentoOfTown } from '../data/cuentos.js';
import { QUESTS, CARDS } from '../game/content.js';
import { drawOfficial, officialHeight } from '../world/armas.js';
import { armsImg, armsImgBig, clubImg, casaImg } from '../ui/escudoImg.js';
import { comoJugar, vistoComoJugar } from './comojugar.js';
import { puedeDescargar, queFalta, descargarTodo } from '../web/todo.js';
import { profile, saveProfile, levelOf, rankOf, townProgress, comarcaProgress, comarcaTowns, stampCount, BADGES, checkBadges, resetProfile, salazarState } from '../game/profile.js';
import { esc, el } from '../util/html.js';
import { lettersOnly } from '../util/text.js';
import { isDidactico, markDidactico } from '../util/modo.js';
import { TACTIL } from '../util/tactil.js';
import { DIDACTICO, LM_ICON } from './didactico.js';
import './fichas.css';
import { inicioHTML, inicioOn, cierraMapa, entraMapa } from './inicio.js';
import { galeria } from './galeria.js';
import './consola.css';
import { ORIENTA, ORIENTA_TIPS, MONTE_TIPS } from '../game/senales.js';
import { enCss } from '../util/tele.js';
import { sencillo, ponSencillo } from '../util/sencillo.js';
import { datos as diagnostico } from '../util/diag.js';
import { codigoPartida, leePartida, traePartida } from '../util/traspaso.js';
import './identidad.css';   // (la última hoja del menú: la identidad común manda sobre las demás)

const $ = (s, r = document) => r.querySelector(s);
// (la X fina de cerrar el menú flotante y las ventanas de las secciones)
const XF = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const I = (n, s = 24, c = '') => iconSVG(n, s, c);
const cnt = (n, one, many) => `${n} ${n === 1 ? one : many}`;   // (1 sello, 2 sellos: nunca «1 sellos»)
// la cabecera de cada sección, la misma en todas: el rótulo, con el grupo, la sección y su icono, y el título grande, sin
// icono (ya va en el rótulo). Las de los saberes, «Saberes · …»; las de tu partida, «Tu partida · …»
const cabeza = (rotulo, ic, titulo, cls = '') => `<small class="kicker${cls}">${I(ic, 20)} ${rotulo}</small><h1 class="title${cls}">${titulo}</h1>`;
const comarca = (id) => COMARCAS.find(c => c.id === id);
// el otro nombre de un pueblo o de una comarca, el de la otra lengua: en euskera el nombre se traduce solo (Olite pasa a ser
// Erriberri), así que debajo va el de castellano, sin traducir (data-notr)
const otroNombre = (n1, n2) => (isEU() ? n1 : n2);
// el color de cada parte del juego, para distinguirlas de un vistazo (hub.css, --cat): la aventura, en fucsia; los torneos,
// en naranja; los saberes, en cian; la naturaleza, en verde; los personajes y las leyendas, en ámbar; y lo tuyo, en azul
const KC = { aventura: 'av', sports: 'dep', pasaka: 'dep', escudos: 'sab', instrumentos: 'sab', album: 'sab', tradiciones: 'sab', oficios: 'sab', productos: 'sab', historia: 'sab', euskera: 'sab', nature: 'nat', peaks: 'nat', personajes: 'ley', cuentos: 'ley', badges: 'yo', avatars: 'yo', profile: 'yo' };
const kc = (id) => KC[id] || 'av';
// (el nombre y el icono, en la barra de arriba, de las secciones del material que no van en el menú del juego)
const OTRAS = { tradiciones: [, 'Tradiciones', 'mask'], oficios: [, 'Oficios', 'anvil'], productos: [, 'Productos', 'cheese'], historia: [, 'Historia', 'castle'], euskera: [, 'Euskera', 'talk'] };
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
// el mapa de los yacimientos se dibuja en su propia escala (725 de ancho) y en el móvil se ve a menos de la mitad: --k es
// cuántas unidades del mapa hay en un píxel, para que sus números nunca bajen de 12 px en la pantalla
function fitMaps(root) {
  const fit = () => { for (const s of root.querySelectorAll('svg.navarra')) { const w = enCss(s.getBoundingClientRect().width); if (!w) continue; const k = s.viewBox.baseVal.width / w; s.style.setProperty('--k', k.toFixed(3)); s.classList.toggle('tiny', k > 1.6);
    // (también en el atributo: así el círculo tiene su tamaño aunque el navegador no lea «r» en el CSS)
    for (const c of s.querySelectorAll('.cnum circle')) c.setAttribute('r', ((k > 1.6 ? 10 : 13) * k).toFixed(1)); } };
  requestAnimationFrame(fit);
  if (!fitMaps.on) { fitMaps.on = true; addEventListener('resize', () => fitMaps.root && requestAnimationFrame(() => fitMaps(fitMaps.root))); }
  fitMaps.root = root;
}
function spark(profile, w = 160, h = 44) {
  if (!profile?.length) return '';
  const xs = profile.map(p => p[0]), ys = profile.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const P = profile.map(([x, y]) => [(x - x0) / (x1 - x0 || 1) * w, h - 4 - (y - y0) / (y1 - y0 || 1) * (h - 8)]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="M0 ${h} ${P.map(p => 'L' + p.join(' ')).join(' ')} L${w} ${h}Z" fill="rgba(201,178,255,.22)"/><path d="M${P.map(p => p.join(' ')).join(' L')}" fill="none" stroke="#c9b2ff" stroke-width="2.5"/></svg>`;
}

export class Hub {
  constructor({ sound, onPlay }) {
    this.sound = sound; this.onPlay = onPlay;
    // (jugando, #hub.juego: una sola pantalla, como en un juego. Debajo, siempre, el mapa de Navarra (#hMapa); el menú, un
    // botón flotante que abre un panel con la barra de arriba y las secciones (.hub-panel); y cada sección, un panel encima
    // del mapa (#hMain) que se cierra con la X y deja el mapa como estaba. En el modo didáctico, la barra de arriba y la de
    // al lado de siempre: .hub-panel no cuenta en la rejilla)
    this.root = el(`<div id="hub"><div class="hub-bg"><div class="bgimg"></div></div><div class="hub-mapa" id="hMapa"></div>
      <button type="button" class="hub-menu-btn" data-menu aria-label="Menú" aria-expanded="false"></button>
      <div class="hub-velo" data-menu-x></div>
      <div class="hub-panel" id="hPanel"><header class="hub-top"><div class="brand logo">HERRIZHERRI</div><button type="button" class="app-btn" data-cj-abre hidden><svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="19"/><path d="M20 16l12 8-12 8z"/></svg><span>Cómo jugar</span></button><button type="button" class="app-btn alt" data-mando hidden>${I('control', 24)}<span>Mando del móvil</span></button><div class="chip" id="hChip"></div><button type="button" class="hub-panel-x" data-menu-x aria-label="Cerrar el menú">${XF}</button></header>
      <nav class="hub-nav" id="hNav"></nav><small class="hub-ver" data-notr>${typeof __VERSION__ !== 'undefined' ? `Versión del ${__VERSION__}` : ''}</small></div><main class="hub-main" id="hMain"></main><div class="hub-cab" id="hCab"></div><div class="hub-pista" aria-hidden="true"><span><kbd>Esc</kbd>Volver al mapa</span><span><kbd>Q</kbd><kbd>E</kbd>Otra sección</span></div><button type="button" class="hub-x" data-go="home" aria-label="Volver al mapa">${XF}</button></div>`);
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
      markDidactico(S.didactic); this.root.classList.toggle('juego', !S.didactic); }
    // (lo que mide tu retrato de arriba a la izquierda, que abre el menú: lo conquistado empieza justo a su lado)
    { const mb = $('[data-menu]', this.root); new ResizeObserver(() => { if (this.screen === 'home') this.root.style.setProperty('--menuw', mb.offsetWidth + 'px'); }).observe(mb); }
    // (el menú flotante: se abre y se cierra con su botón, con la X, tocando fuera o con Escape; al elegir una sección, se cierra)
    this.root.addEventListener('click', e => { if (e.target.closest('[data-menu]')) this.menu(!this.root.classList.contains('menu-on')); else if (e.target.closest('[data-menu-x]')) this.menu(false); });
    addEventListener('keydown', e => { if (e.key !== 'Escape' || !this.visible || !this.root.classList.contains('juego') || document.querySelector('.sheet, .onb, .mg-overlay')) return;
      if (this.root.classList.contains('menu-on')) { e.stopImmediatePropagation(); this.menu(false); } else if (this.screen !== 'home') { e.stopImmediatePropagation(); this.go('home'); } }, true);
    addEventListener('keydown', e => { const k = e.key.toLowerCase(); if ((k !== 'q' && k !== 'e') || e.ctrlKey || e.metaKey || e.altKey || !this.visible || !this.root.classList.contains('juego') || this.screen === 'home' || this.root.classList.contains('menu-on') || e.target.closest?.('input, textarea, select, [contenteditable]') || document.querySelector('.sheet, .onb, .mg-overlay')) return;
      const v = this.vecinas(this.screen); if (v) { e.preventDefault(); this.go(v[k === 'q' ? 0 : 1][0]); } });
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
      if (t.dataset.sport) { this.sound?.ui('open'); return this.onSport?.(t.dataset.sport, t.dataset.sport === 'pelota' ? (t.dataset.en ? sedeDePueblo(t.dataset.en) : this.frontonId()) : null); }   // (data-en: el pueblo del frontón, desde el resumen del inicio)
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
      // (jugando, sin «Mapa»: el inicio ya es el mapa de Navarra en 3D; en el didáctico, que no lo tiene, sí)
      : [['home', 'Inicio', 'home'], ['towns', 'Pueblos', 'church'], ['sports', 'Torneos', 'trophy'], ['personajes', 'Personajes', 'book'], ['avatars', 'Avatar', 'person', 2], ['peaks', 'Cimas', 'peak', 1], ['nature', 'Naturaleza', 'leaf', 1], ['escudos', 'Escudos', 'shield', 1], ['cuentos', 'Leyendas', 'legend', 1], ['instrumentos', 'Instrumentos', 'music', 1], ['pasaka', 'Pasaka', 'pelota', 1], ['album', 'Láminas', 'scroll', 1], ['badges', 'Insignias', 'badge', 1], ['passport', 'Pasaporte', 'stamp', 1], ['profile', 'Perfil', 'gear', 1]];
    this.MORE = { avatars: 'Elige con quién juegas', peaks: 'Montañas de Navarra con su perfil', nature: 'Fauna, árboles, plantas y flores', escudos: 'Escudos de Navarra y cómo se leen', cuentos: 'Cuentos, leyendas e historias de Navarra', instrumentos: 'Txistu, gaita, txalaparta… escúchalos y aprende a tocarlos', pasaka: 'El juego de pelota con red de los claustros: apréndelo y juégalo', album: 'Las ilustraciones de cada pueblo y comarca', badges: 'Tus logros', passport: 'Los sellos de tus pueblos', profile: isDidactico() ? 'Idioma, sonido y modo' : 'Nombre, nivel y ajustes',
      sports: 'Pelota a mano y fútbol, sin entrar en un pueblo', personajes: 'Mujeres y hombres de Navarra, seres de leyenda y figuras de carnaval',
      tradiciones: 'Danzas, carnavales, fiestas, ferias y pelota', oficios: 'Cómo se trabajaba y con qué herramientas', productos: 'Quesos, huerta, cosechas y ganadería', historia: 'Castillos, dólmenes y monumentos', euskera: 'Saludos, herramientas, animales y pueblos' };
    if (isDidactico()) this.MORE.instrumentos = 'Txistu, gaita, txalaparta… qué son y cómo suenan';
    // (las principales 4.ª y 5.ª, en los móviles más estrechos, van a «Más»: en la barra de abajo no caben sus nombres)
    $('#hNav', this.root).innerHTML = this.nav.map(([id, n, ic, sec], i) => `<button data-s="${id}" data-cat="${kc(id)}" class="${sec === 2 ? 'nav3' : sec ? 'nav2' : i === 3 ? 'navp4' : i === 4 ? 'navp5' : ''}">${I(ic, 26)}<span>${n}</span></button>`).join('') + `<button data-s="more" class="more-btn"><svg viewBox="0 0 24 24" width="26" height="26"><circle cx="5" cy="12" r="2.4" fill="#f7f0e6"/><circle cx="12" cy="12" r="2.4" fill="#f7f0e6"/><circle cx="19" cy="12" r="2.4" fill="#f7f0e6"/></svg><span>Más</span></button>`;
  }
  /** Pone o quita el modo didáctico y vuelve a la portada. */
  setDidactico(on) {
    const S = profile().settings; S.didactic = !!on; saveProfile(); markDidactico(on); this.root.querySelector('[data-cj-abre]').hidden = !!on; this.root.classList.toggle('juego', !on);
    cierraMapa(); $('#hMapa', this.root).innerHTML = '';
    this.buildNav(); this.sound?.ui('open'); this.go('home', undefined, true);
    if (!on && !profile().name) this.primeraVez();
  }
  show(screen = this.screen, arg = this.arg) { if (this.root.classList.contains('hidden')) { this.root.classList.remove('entra'); void this.root.offsetWidth; this.root.classList.add('entra'); } this.root.classList.remove('hidden'); this.visible = true; this.go(screen, arg, true); if (!langChosen()) this.langPicker(); else if (!profile().name && !isDidactico()) this.primeraVez(); }
  // (quien empieza: primero cómo quiere jugar y después su nombre y su personaje)
  primeraVez() { if (vistoComoJugar()) return this.onboarding(); comoJugar(this.root, { primera: true, despues: () => { if (!profile().name && !isDidactico()) this.onboarding(); } }); }
  hide() { this.root.classList.add('hidden'); this.visible = false; this.sheet?.remove(); this.menu(false); cierraMapa(); $('#hMapa', this.root).innerHTML = ''; releaseStage(); this.stage = null; releaseOffscreen(); }
  /** El menú flotante (jugando): abierto o cerrado. */
  menu(on) {
    const r = this.root; if (!r.classList.contains('juego')) on = false;
    if (on === r.classList.contains('menu-on')) return;
    r.classList.toggle('menu-on', on); r.querySelector('[data-menu]')?.setAttribute('aria-expanded', on);
    const pn = $('#hPanel', r); if (on) { pn.setAttribute('role', 'dialog'); pn.setAttribute('aria-label', 'Menú'); this.sound?.ui('open'); } else pn.removeAttribute('role');
  }
  go(screen, arg, silent) {
    this.screen = screen; this.arg = arg;
    if (!silent) this.sound?.ui('click');
    this.sheet?.remove(); this.sheet = null;
    const secScreen = this.nav.some(n => n[0] === screen) && this.navHidden(screen);
    this.root.querySelectorAll('#hNav button').forEach(b => b.classList.toggle('on', !!(b.dataset.s === screen || (screen === 'comarca' && b.dataset.s === (isDidactico() ? 'map' : 'home')) || (b.dataset.s === 'more' && secScreen))));
    const bgc = screen === 'comarca' ? arg : (levelById(profile().last) || LEVELS[0]).comarca;
    if (this.bgc !== bgc) { this.bgc = bgc; $('.bgimg', this.root).style.backgroundImage = `url(${comarcaCover(bgc, true)})`; }
    this.root.dataset.screen = screen;
    if (this.visible) this.sound?.setMood?.(screen === 'sports' ? 'torneos' : 'inicio');   // (Torneos, con su propia música)
    const m = $('#hMain', this.root), juego = this.root.classList.contains('juego');
    if (!this['s_' + screen]) { screen = this.screen = 'home'; this.root.dataset.screen = screen; }   // pantalla desconocida: la portada
    this.menu(false);
    if (juego) {
      // (jugando: el mapa, debajo y siempre el mismo; se hace solo si no está, y así al cerrar una sección se vuelve a él tal
      // como se dejó. Elegir personaje usa el mismo lienzo 3D que el mapa: mientras, el mapa se suelta)
      const mapa = $('#hMapa', this.root);
      if (screen === 'avatars') { cierraMapa(); mapa.innerHTML = ''; }
      else if (!mapa.firstElementChild) { this.after = null; mapa.innerHTML = this.s_home(); this.after?.(); this.after = null; }
      if (screen === 'home') { m.innerHTML = ''; m.removeAttribute('role'); this.renderChip(); return; }
      // (la sección, en una ventana encima del mapa, con su nombre arriba entre el botón del menú y el de cerrar)
      // A los lados, como en el menú de pausa de un juego, la sección de antes y la de después: se pasa de una a otra
      // tocándolas o con Q y E, sin volver al mapa
      // (las que no van en el menú del juego, con su nombre igual: la comarca, el pueblo y las del material didáctico)
      const n = this.nav.find(x => x[0] === screen) || (screen === 'comarca' ? [, COMARCAS.find(c => c.id === arg)?.name || 'Comarca', 'map']
        : screen === 'pueblo' ? [, levelById(arg)?.name.split(' / ')[0] || 'Pueblo', 'church'] : OTRAS[screen] || [, '', 'home']);
      m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', n[1]);
      const [ant, sig] = this.vecinas(screen) || [];
      $('#hCab', this.root).innerHTML = `${ant ? `<button type="button" class="cab-v" data-go="${ant[0]}"><kbd>Q</kbd><span>${esc(ant[1])}</span></button>` : ''}<span class="cab-t">${I(n[2], 20)}<span>${esc(n[1])}</span></span>${sig ? `<button type="button" class="cab-v sig" data-go="${sig[0]}"><span>${esc(sig[1])}</span><kbd>E</kbd></button>` : ''}`;
      $('#hCab', this.root).dataset.cat = kc(screen);
    } else cierraMapa();
    m.dataset.cat = kc(screen);
    m.onscroll = null; m.innerHTML = this['s_' + screen](arg);
    m.querySelectorAll('[data-go]:not([data-cat])').forEach(b => { b.dataset.cat = kc(b.dataset.go); });   // (cada enlace, en el color de adonde lleva)
    m.scrollTop = 0; fitMaps(m);
    this.after?.(); this.after = null; bindLaminas(m, this.sound); this.pastillas(m);
    this.renderChip();
  }
  // las secciones de antes y de después de una, en el orden del menú (sin el inicio, que es el mapa); null si no es una de ellas
  vecinas(screen) {
    const L = this.nav.filter(x => x[0] !== 'home'), i = L.findIndex(x => x[0] === screen);
    return i < 0 || L.length < 3 ? null : [L[(i - 1 + L.length) % L.length], L[(i + 1) % L.length]];
  }
  // La pastilla de las pestañas (.filters), jugando: una sola pieza que se desliza hasta la elegida con el borde de delante
  // más rápido que el de detrás, así que se estira al moverse y se recoge al llegar. Recuerda dónde estaba en cada
  // pantalla: al cambiar de pestaña la pantalla se vuelve a pintar, y la pastilla sale de la de antes
  pastillas(m) {
    if (!this.root.classList.contains('juego')) return;
    const mem = this._pasti ||= {};
    m.querySelectorAll('.filters').forEach((f, k) => {
      const ind = document.createElement('i'); ind.className = 'fl-ind'; ind.setAttribute('aria-hidden', 'true'); f.prepend(ind);
      const key = this.screen + ':' + k;
      const pon = () => {
        const b = f.querySelector('button.on'); ind.style.opacity = b ? 1 : 0; if (!b) return;
        const l = b.offsetLeft, r = l + b.offsetWidth, a = mem[key];
        ind.classList.toggle('izq', !!a && l < a.l);
        ind.style.setProperty('--fl-l', l + 'px'); ind.style.setProperty('--fl-r', r + 'px'); ind.style.setProperty('--t', b.offsetTop + 'px'); ind.style.setProperty('--h', b.offsetHeight + 'px');
        mem[key] = { l, r };
      };
      // (sale de donde estaba y, en el cuadro siguiente, va a la nueva; luego sigue a la elegida, también al desplazar)
      const a = mem[key]; if (a) { ind.style.setProperty('--fl-l', a.l + 'px'); ind.style.setProperty('--fl-r', a.r + 'px'); }
      requestAnimationFrame(() => requestAnimationFrame(pon));
      new MutationObserver(pon).observe(f, { subtree: true, attributes: true, attributeFilter: ['class'] });
    });
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
    // (jugando, el menú se abre con tu retrato, arriba a la izquierda, como en los juegos de rol: tu cara con tu nivel y, si
    // hay sitio, tu nombre, tu rango y la barra de experiencia. Nada de iconos de página web)
    $('[data-menu]', this.root).innerHTML = `<span class="yo-c"><img src="${avatarPortrait(p.avatar)}" alt=""><b class="yo-n">${L.lv}</b></span><span class="yo-t"><b>${esc(p.name || 'Aventurero')}</b><small>${rankOf(L.lv)}</small><i class="yo-xp"><i style="width:${L.cur / L.need * 100}%"></i></i></span>`;
  }

  // ---------- Inicio ----------
  // lo que el inicio le pasa a inicio.js: el icono de cada misión, las que tocan por la edad, dónde cae cada pueblo en el
  // mapa y el mapa plano para cuando no hay 3D
  opcInicio(p) { return { icono: mIcon, slots: (l) => missionSlots(l, edadDe(p)), misiones: (l) => this.misiones(l, p), xy: (l) => XY.get(l.id) }; }
  // el inicio: el mapa del mundo, a toda la pantalla, como en un juego (inicio.js); sin desplazarse
  s_home() {
    if (isDidactico()) return this.d_home();
    this.after = () => inicioOn(this.root);
    return inicioHTML(this.opcInicio(profile()));
  }
  // ---------- Campeonatos ----------
  // pelota a mano y fútbol sin entrar en las misiones de un pueblo: la pelota se juega en el frontón del pueblo que se
  // elija; el fútbol, con tu club (Liga Navarra, amistosos y El Sadar)
  frontonId() { const p = profile(); return esSede(this.frontonTown) ? this.frontonTown : sedeDePueblo(p.last || LEVELS[0].id); }
  s_sports() {
    const p = profile(), fl = levelById(this.frontonId()), club = CLUBS[p.futbolClub], tx = p.txapelas || 0;
    let fb = null; try { fb = JSON.parse(localStorage.getItem('herrizherri-futbol-v1') || 'null'); } catch (e) { }
    // (las figuras, las mismas de las cartas: en reposo, limpias, como el resto de pantallas de deporte)
    const sadar = levelById('pamplona');
    // (las dos cartas, iguales y una al lado de la otra, como las demás tarjetas del menú: arriba su lámina, con tu marca en
    // la esquina; debajo el rótulo, el título y los campeonatos que tiene, en etiquetas pequeñas; y abajo lo que se elige,
    // el frontón, que abre la lista por comarcas, o tu club, con el botón de jugar al lado. En el móvil tumbado se ven las
    // dos enteras sin desplazar; en vertical, una debajo de la otra)
    const kit = club ? (clubImg(p.futbolClub) ? `<img class="sp-media sp-em" src="${clubImg(p.futbolClub)}" alt="">` : `<i class="sp-media sp-kit" style="--a:${club.shirt};--b:${club.shirt2 || club.shorts || club.shirt}"></i>`) : `<i class="sp-media sp-ico">${I('balon', 32)}</i>`;
    const tags = (l) => `<p class="sp-chips">${l.map(([ic, t]) => `<span>${I(ic, 16)}${t}</span>`).join('')}</p>`;
    // (la lámina entera, en 16:9, en su marco redondeado: el personaje se ve de pies a cabeza; debajo, el texto y la barra)
    const carta = (cls, img, stat, kick, tit, tg, row) => `<article class="sport ${cls}">
        <div class="sp-cover">${img ? `<img src="${img}" alt="" decoding="async">` : ''}<span class="sp-stat">${stat}</span></div>
        <div class="sp-body"><div class="sp-txt"><small class="kicker">${kick}</small><h3>${tit}</h3>${tags(tg)}</div>
        <div class="sp-bar">${row}</div></div></article>`;
    const fp = fb?.played || 0, fw = fb?.won || 0;
    return `
    ${cabeza('Torneos · Pelota y fútbol', 'trophy', 'Campeonatos')}
    <section class="sports">
      ${carta('sp-pelota', laminaUrl('dep-pelotari') || laminaUrl('dep-fronton') || townImg(fl), `${I('txapela', 20)}<b>${tx}</b> ${tx === 1 ? 'txapela' : 'txapelas'}`,
        'Tres campeonatos', 'Pelota a mano', [['pelota', 'Manomanista'], ['person', 'Parejas'], ['target', '4½']],
        `<div class="sp-row"><small>Elige frontón</small>${this.frontonBox(fl)}</div><button class="gx-go" data-sport="pelota">${I('play', 24)} <span>Jugar</span></button>`)}
      ${carta('sp-futbol', laminaUrl('dep-futbol') || laminaUrl('dep-estadio') || townImg(sadar), `${I('balon', 20)}<b>${fp}</b> ${fp === 1 ? 'partido' : 'partidos'} · <b>${fw}</b> ${fw === 1 ? 'ganado' : 'ganados'}`,
        'Liga Navarra', 'Fútbol', [['trophy', 'Liga'], ['balon', 'Amistosos'], ['pin', 'El Sadar']],
        `<div class="sp-row"><small>Tu club</small><div class="sp-box">${kit}<span><b>${club ? esc(club.name) : 'Sin club'}</b><small>${club ? 'En El Sadar' : 'Lo eliges al jugar'}</small></span></div></div><button class="gx-go" data-sport="futbol">${I('play', 24)} <span>Jugar</span></button>`)}
    </section>`;
  }
  // el frontón elegido: su portada, el pueblo y la comarca; al tocarlo, la lista de todos los frontones por comarcas
  frontonBox(l = levelById(this.frontonId())) {
    return `<button class="sp-box sp-pick" data-frpick aria-haspopup="dialog"><img class="sp-media" src="${townImg(l)}" alt=""><span><b>${esc(l.name.split(' /')[0])}</b><small>${esc(comarca(l.comarca)?.name || '')}</small></span><i class="sp-chev" aria-hidden="true"></i></button>`;
  }
  frontonPicker() {
    this.sound?.ui('open');
    const cur = this.frontonId(), groups = COMARCAS.map(c => [c, LEVELS.filter(l => esSede(l.id) && l.comarca === c.id)]).filter(([, ts]) => ts.length);
    const s = el(`<div class="sheet frs"><div class="frs-in" role="dialog" aria-label="Elige frontón">
      <div class="frs-head"><small class="kicker">Pelota a mano</small><h2>Elige frontón</h2></div><button class="x" aria-label="Cerrar">${I('close', 22)}</button>
      <div class="frs-list">${groups.map(([c, ts]) => `<section><h3>${esc(c.name)}</h3><div class="frs-grid">${ts.map(l => `<button class="fr-chip ${l.id === cur ? 'on' : ''}" data-fronton="${l.id}">${esc(l.name.split(' /')[0])}</button>`).join('')}</div></section>`).join('')}</div></div></div>`);
    this.sheet?.remove(); this.sheet = s; this.root.appendChild(s);
    s.addEventListener('click', e => { if (e.target === s || e.target.closest('.x')) { s.remove(); this.sheet = null; } });
    s.querySelector('.fr-chip.on')?.scrollIntoView({ block: 'nearest' });
  }
  // ---------- Mapa ----------
  // (en el didáctico, el mismo mapa 3D del inicio, en su propia sección: cada comarca lleva a su página y cada pueblo a la
  // suya. Jugando, el mapa ya es el inicio)
  s_map() {
    if (!isDidactico()) return this.s_home();
    this.after = () => inicioOn(this.root);
    return inicioHTML(this.opcInicio(profile()), 'map');
  }

  // ---------- Comarca ----------
  // su ficha: arriba, como la carta de la comarca, su lámina entera (16:9, sin cortar) y, a su lado, el sello en su aro, el
  // nombre (el otro, en la otra lengua, debajo) y sus cifras en un marcador; luego sus pueblos, con la misma carta que la
  // galería; su cultura y su naturaleza; sus cuentos y leyendas (los escuchados, con su ilustración; los que faltan, con
  // quién los cuenta); sus láminas y sus cimas
  s_comarca(id) {
    const c = comarca(id); if (!c) return this.s_towns();
    const p = profile(), pr = comarcaProgress(p, id), ts = comarcaTowns(id), C = c.culture || {}, dd = isDidactico(), star = dd && STAR[id];
    const [cn1, cn2] = (c.full || c.name).split(' / '), cov = comarcaCover(id);
    // (la danza de la comarca, con su ilustración si la hay: se abre en grande al tocarla)
    const danza = tradicionUrl('danza-' + id);
    const block = (ic, k, o, img = '') => o ? `<div class="cult${img ? ' con-img' : ''}">${img ? `<button type="button" class="cult-img" data-cultimg aria-label="Ver la ilustración"><img src="${img}" alt="" loading="lazy"></button>` : `<span class="fh-mi">${I(ic, 30)}</span>`}<div><small>${k}${o.date ? ' · ' + esc(o.date) : ''}</small><b>${esc(o.title)}</b><p>${esc(o.text)}</p>${o.place ? `<em>${esc(o.place)}</em>` : ''}</div></div>` : '';
    const mts = MOUNTAINS.filter(m => m.region === id && LEVELS.some(l => (l.missions || []).some(x => x.type === 'summit' && x.peak === m.id)));
    // cada animal y planta abre su ficha
    const pic = (n, fb, key) => { const [t, id] = (key || '').split(':'), u = t === 'fauna' ? faunaImg(id)?.small : t === 'flora' ? floraFoto(id)?.planta : null;
      return u ? `<img class="nimg${t === 'fauna' ? ' fa' : ''}" src="${u}" alt="" loading="lazy" decoding="async">` : I(speciesIcon(n) || fb, 26); };
    const chip = (n, fb, key, title = '') => key ? `<button class="nchip" data-k="${key}" title="${esc(title)}">${pic(n, fb, key)}${esc(n)}</button>` : `<span class="nchip" title="${esc(title)}">${pic(n, fb)}${esc(n)}</span>`;
    const chips = (arr, fb) => (arr || []).map(n => { const k = floraId(n); return chip(n, fb, k && 'flora:' + k); }).join('');
    const cts = CUENTOS.filter(K => K.towns.some(t => levelById(t)?.comarca === id));
    this.after = () => {
      this.root.querySelectorAll('.nchip[data-k]').forEach(b => b.onclick = () => showFicha(b.dataset.k, { ui: { sound: this.sound }, button: 'Cerrar' }));
      const cb = this.root.querySelector('[data-cultimg]'); if (cb) cb.onclick = () => openVisor([{ src: danza, title: C.dance.title }], 0, this.sound);
      this.bindLeyendas(this.root, cts);
    };
    // (cada cifra de la cabecera, en su pastilla, como los contadores del resto del menú: el icono, la cifra y lo que es; el
    // río, con su nombre detrás)
    const dato = (ic, v, k, antes) => `<span class="ch-dato">${I(ic, 20)}${antes ? `<small>${k}</small><b>${v}</b>` : `<b>${v}</b><small>${k}</small>`}</span>`;
    return `
    <section class="chero" style="--c:${c.color}${cov ? `;--fondo:url('${cov}')` : ''}">${cov ? `<div class="pt-marco" style="${encuadreComarca(id)}"><i class="pt-esp l" aria-hidden="true"></i><img class="chero-img" src="${cov}" alt="" decoding="async"><i class="pt-esp r" aria-hidden="true"></i></div>` : ''}
      <div class="ch-tx"><button class="back" data-go="${dd ? 'map' : 'home'}">${I('back', 22)} Mapa</button>
        <div class="ch-nom"><img class="bigstamp${dd ? '' : ' con-aro'}" src="${stampImg(id)}" alt="" style="--f:${pr.towns ? pr.stamps / pr.towns : 0}"><div><small class="kicker">Comarca</small><h1>${esc(cn1)}${cn2 ? `<em data-notr>${esc(otroNombre(cn1, cn2))}</em>` : ''}</h1></div></div>
        <div class="ch-datos">${dato('church', ts.length, ts.length === 1 ? 'Pueblo' : 'Pueblos')}${dd ? '' : dato('stamp', `${pr.stamps}<i>/${pr.towns}</i>`, 'Sellos') + dato('check', `${pr.done}<i>/${pr.total}</i>`, 'Misiones')}${c.river ? dato('river', esc(c.river), 'Río', true) : ''}</div></div>
    </section>
    <h2 class="sec">${I('church', 30)} Pueblos y ciudades</h2>
    <section class="cm-ts">${ts.length ? ts.map((l, i) => `<button type="button" class="cm-t" data-town="${l.id}" style="--c:${c.color}" aria-label="${esc(l.name.split(' /')[0])}">${this.carta(l, p, i > 5)}</button>`).join('') : '<p class="empty">Muy pronto habrá pueblos jugables en esta comarca.</p>'}</section>
    <section class="two cm-two">
      <div class="panel"><h2>${I('dance', 30)} Cultura</h2><div class="cultgrid">${block('dance', 'Danza', C.dance, danza)}${block('mask', 'Carnaval', C.carnival)}${block('flag', 'Fiesta', C.festival)}${block('ribbon', 'Traje', C.costume)}${star ? block('star', 'Producto estrella', { title: star.name, text: star.text }) : ''}</div></div>
      <div class="panel"><h2>${I('leaf', 30)} Naturaleza</h2>
        <h3>Fauna</h3><div class="nchips">${(c.fauna || []).map(f => { const k = faunaId(f[0]); return chip(f[0], 'bird', k && 'fauna:' + k, f[2]); }).join('')}</div>
        <h3>Árboles</h3><div class="nchips">${chips(c.nature?.trees, 'tree')}</div>
        <h3>Plantas</h3><div class="nchips">${chips(c.nature?.plants, 'herbs')}</div>
        <h3>Flores</h3><div class="nchips">${chips(c.nature?.flowers, 'flower')}</div></div>
    </section>
    ${cts.length ? `<h2 class="sec">${I('legend', 30)} Cuentos y leyendas</h2><section class="fh-ley cm-ley">${this.leyendas(cts, p)}</section>` : ''}
    ${(L => L.length ? `<h2 class="sec">${I('scroll', 30)} Láminas</h2>${laminaRail(L)}` : '')(this.comarcaLaminas(id))}
    ${mts.length ? `<h2 class="sec">${I('peak', 30)} Cimas para subir</h2><section class="peaks">${mts.map(m => this.peakCard(m, dd ? null : LEVELS.find(l => (l.missions || []).some(x => x.type === 'summit' && x.peak === m.id)))).join('')}</section>` : ''}`;
  }
  // las misiones de un pueblo, para sus fichas: su icono, su título, de qué son y si están hechas. Las de Otsagabia son las
  // nueve de la aventura del valle de Salazar (game/content.js), con su estado guardado aparte
  misiones(l, p = profile()) {
    if (l.special === 'salazar') { const S = salazarState()?.quests || {}; return Object.entries(QUESTS).map(([id, q]) => ({ icon: q.icon, title: q.title, sub: q.steps[0], done: S[id]?.state === 'done' })); }
    const hecho = p.towns[l.id]?.done || {}, n1 = l.name.split(' /')[0];
    return missionSlots(l, edadDe(p)).map(({ m, si }) => ({ icon: mIcon(m), done: !!hecho[si], sub: TYPE_NAME[m.type] + (m.host ? ' · con ' + m.host.name : ''),
      title: m.title || (m.type === 'visit' ? `Conoce ${n1}` : m.type === 'quiz' ? `El sabio de ${n1}` : m.name || m.product || TYPE_NAME[m.type]) }));
  }
  // los cuentos de un pueblo o de una comarca: los escuchados, con su ilustración (se abre en grande) y dónde pasa; los que
  // faltan, a oscuras y con quién los cuenta. En el didáctico, todos abiertos
  leyendas(cts, p = profile()) {
    const dd = isDidactico(), oido = new Set(p.cards || []);
    return cts.map(K => { const on = dd || oido.has('cuento:' + K.id), u = leyendaUrl(K.id);
      return `<article class="fh-ct${on ? ' on' : ''}">${u ? `<figure${on ? ` data-ley="${K.id}" role="button" tabindex="0"` : ''}><img src="${u}" alt="" loading="lazy" decoding="async">${on ? '' : `<span>${I('lock', 28)}</span>`}</figure>` : ''}
        <div><small>${esc(KIND_LABEL[K.kind])} · ${esc(K.towns.map(townName).join(', '))}</small><b>${esc(K.title)}</b><p>${on ? esc(K.place) : `Escúchala en ${esc(townName(K.towns[0]))}: te la cuenta ${esc(K.teller.name)}.`}</p></div></article>`; }).join('');
  }
  bindLeyendas(root, cts) {
    const dd = isDidactico(), oido = new Set(profile().cards || []), on = cts.filter(K => (dd || oido.has('cuento:' + K.id)) && leyendaUrl(K.id, true)), list = on.map(K => ({ src: leyendaUrl(K.id, true), title: K.title }));
    root.querySelectorAll('.fh-ct [data-ley]').forEach(f => { const ve = () => openVisor(list, Math.max(0, on.findIndex(K => K.id === f.dataset.ley)), this.sound);
      f.onclick = ve; f.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ve(); } }; });
  }
  // la ficha de un pueblo o de una zona, en una sola columna: arriba su portada grande, a todo lo ancho, con el nombre
  // encima; debajo, sus cifras (misiones, sello, río y leyenda) y su presentación, sus misiones, qué visitar, su leyenda,
  // su escudo y sus láminas, en tarjetas; abajo, fijo, el botón de jugar
  townSheet(id) {
    const l = levelById(id); if (!l) return;
    this.sound?.ui('open');
    const p = profile(), t = townProgress(p, l), c = comarca(l.comarca), ms = this.misiones(l, p), lams = laminasDe({ town: l.id }), A = armsOfTown(l.id), cts = cuentoOfTown(l.id);
    // (qué visitar: la iglesia y los lugares del pueblo; en Otsagabia, los de su aventura)
    const vis = l.special === 'salazar' ? CARDS.filter(x => x.cat === 'Patrimonio').map(x => [x.icon, x.title, x.text])
      : [l.church && [{ fortress: 'castle', cathedral: 'cathedral', pamplona: 'cathedral' }[l.church.style] || 'church', l.church.name, l.church.text], ...(l.landmarks || []).map(x => [LM_ICON[x.kind] || x.kind, x.name, x.text])].filter(Boolean);
    const oidas = cts.filter(K => (p.cards || []).includes('cuento:' + K.id)).length;
    const st = (ic, k, v, cls = '') => `<span class="fh-st${cls}">${I(ic, 22)}<span><small>${k}</small><b>${v}</b></span></span>`, [n1, n2] = l.name.split(' / '), cov = townImg(l);
    const s = el(`<div class="sheet pueblo" style="--c:${c?.color || '#c21cff'}"><div class="sheet-in" role="dialog" aria-label="${esc(l.name)}">
      <button class="x" aria-label="Cerrar">${I('close', 18)}</button>
      <div class="fh-scroll">
        <header class="fh-cab"${cov ? ` style="--fondo:url('${cov}')"` : ''}>${cov ? `<div class="pt-marco" style="${encuadreDe(l)}"><i class="pt-esp l" aria-hidden="true"></i><img class="fh-portada" src="${cov}" alt="" decoding="async"><i class="pt-esp r" aria-hidden="true"></i></div>` : ''}
          <div class="fh-tit"><small class="fh-k">${esc(c?.name || '')}</small><h2>${esc(n1)}${n2 ? `<em data-notr>${esc(otroNombre(n1, n2))}</em>` : ''}</h2></div></header>
        <div class="fh-hud">${t.total ? st('check', 'Misiones', `${t.done}<i>/${t.total}</i>`, t.done === t.total ? ' ok' : '') : ''}${st('stamp', 'Sello', t.stamp ? 'Conseguido' : 'Por ganar', t.stamp ? ' ok' : '')}${l.river ? st('river', 'Río', esc(l.river.name)) : ''}${cts.length ? st('legend', cts.length === 1 ? 'Leyenda' : 'Leyendas', cts.length === 1 ? (oidas ? 'Escuchada' : 'Por escuchar') : `${oidas}<i>/${cts.length}</i>`, oidas === cts.length ? ' ok' : '') : ''}</div>
        <div class="sh-body">${l.intro ? `<p class="sh-intro">${esc(l.intro)}</p>` : ''}
          <h3>${I('check', 18)} Misiones <span>${t.done}/${t.total}</span></h3>
          <ul class="fh-ms">${ms.map(m => `<li class="${m.done ? 'ok' : ''}"><span class="fh-mi">${I(m.icon, 26)}</span><div><b>${esc(m.title)}</b><small>${esc(m.sub)}</small></div>${m.done ? `<i class="fh-hecha">${I('check', 16)}</i>` : ''}</li>`).join('')}</ul>
          ${vis.length ? `<h3>${I('church', 18)} Qué visitar</h3><ul class="fh-vis">${vis.map(([ic, n, tx]) => `<li><span class="fh-mi">${I(ic, 24)}</span><div><b>${esc(n)}</b><p>${esc(tx)}</p></div></li>`).join('')}</ul>` : ''}
          ${cts.length ? `<h3>${I('legend', 18)} ${cts.length === 1 ? 'Su leyenda' : 'Sus leyendas'}</h3><div class="fh-ley">${this.leyendas(cts, p)}</div>` : ''}
          ${A ? `<h3>${I('shield', 18)} Su escudo</h3><div class="sh-arms">${armsImg(A.id) ? `<img class="sh-armimg" src="${armsImg(A.id)}" alt="">` : `<canvas width="120" height="${Math.ceil(officialHeight(90, A)) + 6}"></canvas>`}<p><b>${esc(A.name)}.</b> ${esc(A.read)}</p><button class="lnk" data-go="escudos">Ver todos los escudos</button></div>` : ''}
          ${lams.length > 1 ? `<h3>${I('scroll', 18)} Láminas</h3>${laminaRail(lams)}` : ''}
          ${REAL_IDS.includes(l.id) ? `<p class="sh-src"><span>Trazado real del pueblo</span>: ${esc(ATRIBUCION)}</p>` : ''}
        </div>
      </div>
      <div class="sh-foot"><button class="btn primary" data-play="${l.id}">${I('play', 22)} <span>${t.stamp ? 'Volver a jugar' : t.done ? 'Seguir jugando' : l.bosque ? 'Explorar' : 'Empezar a jugar'}</span></button></div></div></div>`);
    this.sheet?.remove(); this.sheet = s; this.root.appendChild(s); bindLaminas(s, this.sound); this.bindLeyendas(s, cts);
    { const cv = s.querySelector('.sh-arms canvas'); if (A && cv) drawOfficial(cv.getContext('2d'), cv.width / 2, 3, 90, A); }
    s.addEventListener('click', e => { if (e.target === s || e.target.closest('.x')) { s.remove(); this.sheet = null; } });
  }
  play(id) { const l = levelById(id); if (!l) return; if (isDidactico()) return this.go('pueblo', id);   // (en el modo didáctico no se entra al juego: su página)
    if (this.entrando) return;
    const p = profile(); p.last = id; saveProfile(); this.sound?.ui('open');
    // (jugando, si hay una sección o el menú abiertos encima del mapa, se cierran antes: debajo el mapa está quieto y el
    // vuelo no avanzaría nunca; así se ve cómo la ventana se va y la cámara vuela hasta el pueblo)
    if (this.root.classList.contains('juego') && (this.screen !== 'home' || this.root.classList.contains('menu-on'))) this.go('home', undefined, true);
    // (desde el mapa del inicio, primero el vuelo hasta el pueblo; luego, la partida)
    const vuelo = entraMapa(id); if (!vuelo) return this.onPlay?.(l);
    this.entrando = true; vuelo.then(() => { this.entrando = false; this.onPlay?.(l, { desdeMapa: true }); }); }

  // ---------- Pueblos ----------
  // todos, por comarcas, en una sola lista; arriba, fija, la fila de las comarcas para saltar a la que se quiera (con
  // `ir`, se abre ya en esa comarca)
  // Pueblos: una galería en 3D, un carrusel circular por comarca (src/hub/galeria.js). ir: la comarca que se abre (si no,
  // la del último pueblo jugado, con ese pueblo delante)
  s_towns(ir) {
    const p = profile(), dd = isDidactico(), grupos = COMARCAS.filter(c => comarcaTowns(c.id).length);
    const ultimo = levelById(p.last), ini = grupos.some(c => c.id === ir) ? ir : ultimo?.comarca || grupos[0]?.id;
    this.after = () => galeria($('#hMain', this.root), { comarcas: grupos.map(c => ({ id: c.id, nombre: c.name, color: c.color })), inicial: ini, pueblo: ini === ultimo?.comarca ? ultimo.id : null,
      tarjetas: (id) => comarcaTowns(id).map(l => this.galTarjeta(l)).join(''), info: (id, i, n) => this.galInfo(id, i, n),
      abre: (id) => (isDidactico() ? this.go('pueblo', id) : this.townSheet(id)), sonido: (k) => this.sound?.ui(k) });
    const fl = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
    return `${dd ? `${cabeza('Saberes · Pueblos', 'church', 'Pueblos y ciudades', ' gal-lead')}<p class="lead gal-lead">Toca un pueblo para ver todo lo que enseña: qué visitar, su escudo, sus cuentos, sus productos, sus oficios, sus danzas y su carnaval.</p>` : ''}
      <div class="gal">
        <nav class="filters gal-cm" aria-label="Comarcas">${grupos.map(c => `<button type="button" data-gc="${c.id}" aria-pressed="false"><img src="${stampImg(c.id)}" alt="">${esc(c.name)}</button>`).join('')}</nav>
        <div class="gal-centro"><div class="gal-escena" role="group" aria-roledescription="carrusel" aria-label="Pueblos de la comarca"><div class="gal-anillo"></div></div>
        <button type="button" class="gal-fl ant" data-gal="-1" aria-label="Pueblo anterior">${fl('M15 5l-7 7 7 7')}</button><button type="button" class="gal-fl sig" data-gal="1" aria-label="Pueblo siguiente">${fl('M9 5l7 7-7 7')}</button>
        <div class="gal-puntos" aria-hidden="true"></div></div>
        <div class="gal-info" aria-live="polite"></div></div>`;
  }
  // la carta de un pueblo (la galería, la comarca y su ficha): su portada entera, sin recortar, y su franja con el nombre, el
  // otro nombre o la comarca, una raya por misión (encendidas las hechas; en el didáctico no hay misiones) y el sello
  carta(l, p = profile(), lazy = false) {
    const t = townProgress(p, l), dd = isDidactico(), [n1, n2] = l.name.split(' / '), cov = townImg(l), lleno = t.total && t.done === t.total;
    const mis = dd || !t.total ? '' : `<span class="gt-mis${lleno ? ' ok' : ''}"><span class="gt-rayas">${Array.from({ length: t.total }, (_, i) => `<i${i < t.done ? ' class="on"' : ''}></i>`).join('')}</span><em>${t.done}/${t.total}</em></span>`;
    return `<span class="gt-marco"><span class="gt-foto">${cov ? `<img class="gt-img" src="${cov}" alt=""${lazy ? ' loading="lazy"' : ''} decoding="async" draggable="false">` : ''}</span>
      <span class="gt-dato"><span class="gt-nom"><b>${esc(n1)}</b>${n2 ? `<small data-notr>${esc(otroNombre(n1, n2))}</small>` : `<small>${esc(comarca(l.comarca)?.name || '')}</small>`}</span>${mis}${t.stamp ? `<img class="gt-sello" src="${stampImg(l.comarca)}" alt="">` : ''}</span></span>`;
  }
  // (una pantalla de la galería: la carta del pueblo)
  galTarjeta(l) {
    const p = profile(), t = townProgress(p, l), dd = isDidactico();
    return `<button type="button" class="gal-t" data-gt="${l.id}" aria-label="${esc(l.name.split(' / ')[0])}${dd ? '' : `, ${t.done} de ${t.total} misiones`}">${this.carta(l, p)}</button>`;
  }
  // (el pueblo de delante: su comarca y su sitio en ella, su nombre, sus misiones hechas y los botones de jugar y de ver la ficha)
  galInfo(id, i, n) {
    const l = levelById(id); if (!l) return '';
    const p = profile(), t = townProgress(p, l), dd = isDidactico(), [n1, n2] = l.name.split(' / '), c = comarca(l.comarca);
    return `<div class="gi-t"><small>${esc(c?.name || '')} · ${i + 1} de ${n}</small><h2>${esc(n1)}${n2 ? `<em data-notr>${esc(otroNombre(n1, n2))}</em>` : ''}</h2>
      <span class="gi-ms">${this.misiones(l, p).map(m => `<i title="${esc(m.title)}"${dd || m.done ? ' class="ok"' : ''}>${I(m.icon, 20)}</i>`).join('')}${dd ? '' : `<em>${t.done}/${t.total}</em>`}</span></div>
      <div class="gi-b">${dd ? `<button type="button" class="btn primary" data-town="${l.id}">${I('book', 20)}<span>Ver el pueblo</span></button>` : `<button type="button" class="btn" data-town="${l.id}">${I('scroll', 20)}<span>Ficha</span></button><button type="button" class="btn primary" data-play="${l.id}">${I('play', 20)}<span>${t.done ? 'Seguir' : 'Jugar'}</span></button>`}</div>`;
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
    return `${cabeza('Saberes · Cimas', 'peak', 'Cimas de Navarra')}${dd ? '<p class="lead">Los montes de Navarra con su altura, su recorrido y su perfil. Debajo, cómo se leen las señales de los senderos y cómo ir al monte.</p>' : `<p class="lead-chip">${I('peak', 24)}<b>${won}/${inGame.size}</b> cimas</p>`}
      <div class="filters"><button data-f="game" class="${filter === 'game' ? 'on' : ''}">${I('flag', 20)} En el juego</button><button data-f="all" class="${filter === 'all' ? 'on' : ''}">Todas</button>${COMARCAS.filter(c => MOUNTAINS.some(m => m.region === c.id)).map(c => `<button data-f="${c.id}" class="${filter === c.id ? 'on' : ''}" style="--c:${c.color}">${esc(c.name)}</button>`).join('')}</div>
      <section class="peaks">${list.map(m => this.peakCard(m, dd ? null : inGame.get(m.id))).join('')}</section>
      ${dd ? `<h2 class="sec">${I('flag', 30)} Las señales de los senderos</h2><div class="dd-grid">${ORIENTA.map(o => `<article class="dd-b"><header>${I('flag', 34)}<div><h3>${esc(o.title)}</h3></div></header><p>${esc(o.text)}</p></article>`).join('')}</div>
        <h2 class="sec">${I('backpack', 30)} Para ir al monte</h2><ul class="dd-datos">${[...ORIENTA_TIPS, ...MONTE_TIPS].map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`;
  }
  peakCard(m, town = null) {
    const done = profile().peaks.includes(m.id), c = comarca(m.region);
    // (las cimas de las misiones llevan arriba su escena, entera en 16:9, como las tarjetas de los pueblos)
    // (y encima de ella, en el mismo bloque, su icono, su nombre, su zona y su altura)
    const cab = `<div class="phead">${I('peak', 40)}<div><b>${esc(m.name)}</b><small>${esc(m.zone || '')}</small></div><span class="alt">${m.altitude} m</span></div>`;
    return `<div class="pcard ${done ? 'done' : ''}" style="--c:${c?.color || '#6d3b5c'}">${(u => u ? `<figure class="pc-img"><img src="${u}" alt="" loading="lazy" decoding="async">${cab}</figure>` : cab)(cimaUrl(m.id))}
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
    return `${cabeza('Saberes · Naturaleza', 'leaf', 'Naturaleza de Navarra')}${isDidactico() ? '<p class="lead">Del hayedo atlántico a las Bardenas: cada comarca tiene sus animales y plantas. Toca uno para ver su ficha.</p>' : ''}
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
        <b class="ar-count"><b>${total}</b> personajes</b></div>
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
        ${dd ? `<b class="ar-count"><b>${ARMAS.length}</b> <span>escudos</span></b>` : `<b class="ar-count"><b>${read}</b> de ${ARMAS.length} leídos en el juego</b>`}</div>
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
    return `${cabeza('Saberes · Láminas', 'scroll', 'Láminas de Navarra')}
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
        <b class="ar-count"><b>${heard}</b> de ${CUENTOS.length} escuchados</b></div>
      <div class="ar-grid">${CUENTOS.map(C => { const on = seen.has('cuento:' + C.id); return `<article class="ar ct${on ? ' on' : ''}">
        ${(u => u ? `<figure class="ct-lam${on ? '' : ' locked'}"${on ? ` data-ley="${C.id}"` : ''}><img src="${u}" alt="" loading="lazy" decoding="async">${on ? '' : `<span>${I('lock', 40)}</span>`}<figcaption><small>${esc(KIND_LABEL[C.kind])} · ${esc(C.towns.map(tn).join(', '))}</small><h3>${esc(C.title)}</h3></figcaption></figure>` : `<div class="ct-ic">${I(on ? C.icon : 'lock', 64)}</div><div class="ar-tx"><small>${esc(KIND_LABEL[C.kind])} · ${esc(C.towns.map(tn).join(', '))}</small><h3>${esc(C.title)}</h3></div>`)(leyendaUrl(C.id))}
        <div class="ar-tx"><p class="ct-pl">${esc(C.place)}</p>
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
        ${isDidactico() ? '' : `<b class="ar-count"><b>${played}</b> de ${INSTRUMENTOS.length} tocados</b>`}</div>
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
        <b class="ar-count">${played ? `<b>${won}</b> ${won === 1 ? 'partido ganado' : 'partidos ganados'} de ${played}` : 'Todavía no has jugado'}${has ? ' · carta de tradiciones' : ''}</b></div>
      <div class="pk-hero">${laminaUrl('dep-pasaka') ? `<img class="pk-cov" src="${laminaUrl('dep-pasaka')}" alt="" decoding="async">` : '<canvas class="pk-prev" aria-hidden="true"></canvas>'}
        <div class="pk-hero-tx"><small class="kicker">${esc(PASAKA.kicker)}</small><b>Dos parejas, una red por medio y un guante de cuero</b><button class="btn primary big" data-pasaka="jugar">${I('play', 26)} <span>Jugar a pasaka</span></button></div></div>
      <div class="ar-grid pk-secs">${PASAKA.secs.map(([t, x], i) => `<article class="ar-guia pk-sec"><h3>${I(['book', 'castle', 'pelota', 'pin', 'cathedral', 'play'][i] || 'book', 30)}${esc(t)}</h3><p>${esc(x)}</p></article>`).join('')}</div>
      <p class="ar-src">${esc(PASAKA.sources)}</p>
    </section>`;
  }
  s_badges() {
    const p = profile(); checkBadges(); saveProfile();
    return `${cabeza('Tu partida · Insignias', 'badge', 'Insignias')}<p class="lead-chip">${I('badge', 24)}<b>${p.badges.length}/${BADGES.length}</b></p>
      <section class="badges">${BADGES.map(b => { const on = p.badges.includes(b.id); return `<div class="bcard ${on ? 'on' : ''}"><div class="bic">${I(b.icon, 64)}${on ? '' : `<i class="blk">${I('lock', 24)}</i>`}</div><b>${esc(b.name)}</b><p>${esc(b.text)}</p></div>`; }).join('')}</section>`;
  }

  // ---------- Pasaporte ----------
  s_passport() {
    const p = profile();
    return `${cabeza('Tu partida · Pasaporte', 'stamp', 'Pasaporte Herri')}
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
      $('#pSencillo', r).onchange = e => { ponSencillo(e.target.checked); location.reload(); };   // (la calidad se elige al arrancar)
      // (llevar la partida: el código, al portapapeles; y el que se pega, en lugar de la partida de aquí)
      const cp = $('#pCopia', r), cn = $('#pCopiaN', r), pg = $('#pPega', r), tr = $('#pTrae', r), tn = $('#pTraeN', r);
      pg.addEventListener('keydown', e => e.stopPropagation());
      cp.onclick = async () => { const c = codigoPartida(); if (!c) { cn.textContent = 'Aún no hay ninguna partida guardada.'; return; }
        try { await navigator.clipboard.writeText(c); cn.textContent = 'Copiado. Ahora ábrelo donde quieras seguir y pégalo en «Traer esta partida».'; this.sound?.ui('click'); }
        catch (e) { pg.value = c; pg.select(); cn.textContent = 'No se ha podido copiar solo: el código está en el recuadro de abajo, cópialo de ahí.'; } };
      tr.onclick = (e) => { e.stopPropagation(); const d = leePartida(pg.value); if (!d) { tn.textContent = 'Eso no es un código de partida de HERRIZHERRI.'; this.sound?.ui('error'); return; }
        if (!tr.dataset.sure) { tr.dataset.sure = 1; tr.querySelector('span').textContent = `¿Cambiar la partida de aquí por la de ${d.nombre || 'ese código'}? Pulsa otra vez`; this.sound?.ui('error'); return; }
        if (traePartida(pg.value)) location.reload(); else tn.textContent = 'No se ha podido guardar aquí la partida.'; };
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
    if (isDidactico()) return `${cabeza('Material didáctico · Ajustes', 'gear', 'Ajustes')}
      <section class="two"><div class="panel"><h2>${I('gear', 30)} Ajustes</h2>${mode}
        <label class="set">Idioma <select id="pLang"><option value="eu">Euskara</option><option value="es">Castellano</option><option value="learn">Aprende euskera</option></select></label>
        <label class="set">Música <input type="checkbox" id="pMusic" ${S.music ? 'checked' : ''}></label>
        <label class="set">Volumen <input type="range" id="pVol" min="0" max="1" step="0.05" value="${S.volume}"></label>
        <label class="set">Modo sencillo <input type="checkbox" id="pSencillo" ${sencillo() ? 'checked' : ''}></label>
        <p class="set-note">Para los móviles que se cierran al abrir el juego: la imagen y el mapa 3D, más ligeros. Al cambiarlo, el juego vuelve a abrirse.</p></div></section>${this.partida()}${this.creditos()}${this.diagnostico()}`;
    let doneM = 0; for (const l of LEVELS) doneM += townProgress(p, l).done;
    return `${cabeza('Tu partida · Perfil', 'gear', 'Perfil y ajustes')}
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
        <label class="set">Modo sencillo <input type="checkbox" id="pSencillo" ${sencillo() ? 'checked' : ''}></label>
        <p class="set-note">Para los móviles que se cierran al abrir el juego: la imagen y el mapa 3D, más ligeros. Al cambiarlo, el juego vuelve a abrirse.</p>
        <p class="hint">Controles: WASD o flechas para caminar, ratón para mirar, E para hablar, Espacio para saltar, Mayús para correr. En móvil: arrastra a la izquierda para caminar y a la derecha para mirar. También vale un mando de consola.</p>
        <button class="btn danger" id="pReset">Borrar todo el progreso</button></div></section>${this.partida()}${this.creditos()}${this.diagnostico()}`;
  }
  // llevar la partida a otro aparato o a la app nueva (util/traspaso.js): copiar el código aquí y pegarlo allí
  partida() {
    return `<details class="panel creditos partida"><summary>${I('home', 26)} Llevar tu partida</summary>
      <p class="set-note">Para seguir tu partida en otro aparato o en la app nueva: copia aquí el código y pégalo allí, en este mismo sitio.</p>
      <button class="btn" id="pCopia">${I('book', 22)} <span>Copiar mi partida</span></button><p class="set-note" id="pCopiaN"></p>
      <textarea id="pPega" rows="3" placeholder="Pega aquí el código de tu partida" autocomplete="off" spellcheck="false"></textarea>
      <button class="btn" id="pTrae">${I('check', 22)} <span>Traer esta partida</span></button><p class="set-note" id="pTraeN"></p></details>`;
  }
  // (para arreglar un fallo en un móvil: lo que ve el juego de él, para hacerle una captura y mandarla; src/util/diag.js)
  diagnostico() {
    return `<details class="panel creditos diag"><summary>${I('gear', 26)} Diagnóstico</summary><p class="set-note">Si algo no se ve bien, haz una captura de esto y mándala.</p>
      <dl data-notr>${diagnostico().map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>`;
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
      <li>Letras: Barlow, Barlow Condensed, Lilita One y Nunito, con licencia SIL Open Font License 1.1.</li>
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
