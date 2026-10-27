// Modo didáctico del menú (util/modo.js): todo lo que el juego enseña, para leer sin jugar y desbloqueado. La portada con
// los temas, la página entera de cada pueblo (lo que se visita, su escudo, sus cuentos y lo que enseña cada misión, sin
// las instrucciones del juego) y las páginas de tradiciones, oficios, producto local y campo, historia y euskera. Son
// métodos del menú (Hub): se le añaden en hub.js.
// Cada texto de los datos va solo en su elemento, tal cual: así el traductor de euskera lo encuentra entero.
import COMARCAS from '../data/comarcas.json';
import MOUNTAINS from '../data/mountains.json';
import FOLKLORE from '../data/folklore.json';
import { LEVELS, levelById } from '../data/levels.js';
import { CUENTOS, KIND_LABEL, cuentoOfTown } from '../data/cuentos.js';
import { PROCESOS, TRADICIONES } from '../data/procesos.js';
import { OFICIOS } from '../data/oficios.js';
import { LEGENDS, NIGHT_CARNIVAL } from '../data/legends.js';
import { PARTS, CASTLE_QUIZ, CASTLE_TOWNS, CASTILLOS } from '../data/castillos.js';
import { SITES } from '../data/dolmen.js';
import { MAS_YACIMIENTOS } from '../data/yacimientos.js';
import { mapaXY } from '../util/geo.js';
import { FERIA } from '../data/ferias.js';
import { PASTOR_INFO, VAQUERA_INFO, CROP } from '../data/campo.js';
import { PET, BELL } from '../data/tocar.js';
import { FOOD } from '../data/equipo.js';
import { GOODS, STAR } from '../data/tiendas.js';
import { STYLE_TIP, LABEL_TIP, KIND_TIP } from '../data/sabios.js';
import { DATOS } from '../data/saberes.js';
import { FAUNA } from '../data/fauna.js';
import { FIGURE_TOWNS, PERSONAJES } from '../data/personajes.js';
import { FIGURAS } from '../data/figuras.js';
import { HITZAK, HIZKETAK, hizketaLines } from '../data/hitzak.js';
import { INSTRUMENTOS, instrumentosDe } from '../data/instrumentos.js';
import { PASAKA } from '../data/pasaka.js';
import { ARMAS, armsOfTown } from '../data/armas-navarra.js';
import { LAMINAS, OFICIO_LAMINA } from '../data/laminas.js';
import { montesFrom, townLatLon } from '../data/miradores.js';
import { KAIXO_ES } from '../game/saludo.js';
import { allFichas } from '../ui/ficha.js';
import { personajesHTML } from '../ui/personajes.js';
import { figurasHTML } from '../ui/figuras.js';
import { instrumentosHTML } from '../ui/instrumentos.js';
import { laminaUrl, laminasDe, laminaRail, townImg, comarcaCover, leyendaUrl, tradicionUrl, openVisor } from '../ui/laminas.js';
import { armsImg, oficioImg } from '../ui/escudoImg.js';
import { readTownArms } from '../ui/escudo.js';
import { drawOfficial, officialHeight } from '../world/armas.js';
import { iconSVG } from '../ui/icons.js';
import { isEU, tr } from '../i18n.js';
import { esc } from '../util/html.js';
import { galeria, palabras } from './ddgal.js';
import { faunaImg } from '../ui/faunaImg.js';
import { floraFoto } from '../ui/floraFoto.js';
import { figuraImg, figuraIlus } from '../ui/figuras.js';
import './didactico.css';

const I = (n, s = 24) => iconSVG(n, s);
const P = (s) => s ? `<p>${esc(s)}</p>` : '';
const Ps = (a) => (a || []).map(P).join('');
const H4 = (s) => `<h4>${esc(s)}</h4>`;
const ol = (a) => a?.length ? `<ol class="dd-ol">${a.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '';
const ul = (a) => a?.length ? `<ul class="dd-ul">${a.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '';
const tn = (id) => (levelById(id)?.name || id || '').split(' /')[0];
const comarca = (id) => COMARCAS.find(c => c.id === id);
const sec = (icon, title, id = '') => `<h2 class="sec"${id ? ` id="${id}"` : ''}>${I(icon, 30)} ${esc(title)}</h2>`;
/** Un bloque de material: icono, rótulo pequeño, título y lo de dentro (img: una ilustración apaisada arriba). */
// (eu: su nombre en euskera, que el traductor deja como está)
const block = (icon, kicker, title, body, { sub = '', eu = '', img = '', cls = '', where = '' } = {}) => `<article class="dd-b ${cls}">
  ${img ? `<figure class="dd-img"><img src="${img}" alt="" loading="lazy" decoding="async"></figure>` : ''}
  <header>${I(icon, 34)}<div>${kicker ? `<small>${esc(kicker)}</small>` : ''}<h3>${esc(title)}</h3>${sub ? `<em>${esc(sub)}</em>` : ''}${eu ? `<em class="dd-eu" data-notr lang="eu">${esc(eu)}</em>` : ''}</div></header>
  ${body}${where}</article>`;
const aa = (then, now) => then || now ? `<div class="antes-ahora"><div><b>Antes</b><span>${esc(then)}</span></div><div><b>Ahora</b><span>${esc(now)}</span></div></div>` : '';
/** Una pregunta con su respuesta marcada y la explicación (para repasar o para clase). */
const quiz = (Q) => Q ? `<details class="dd-q"><summary>${I('quiz', 22)}<span>${esc(Q.q)}</span></summary><ul>${Q.options.map((o, i) => `<li class="${i === Q.answer ? 'ok' : ''}">${I(i === Q.answer ? 'check' : 'close', 18)}<span>${esc(o)}</span></li>`).join('')}</ul>${P(Q.why)}</details>` : '';
const where = (ids) => ids?.length ? `<p class="dd-where">${I('pin', 18)}${ids.map(id => `<button type="button" class="lnk" data-town="${id}">${esc(tn(id))}</button>`).join('')}</p>` : '';
// las frases que son instrucciones del juego («Recoge las vainas.», «¡Síguelos por el ruido!») no van en el material; en
// euskera se quitan las mismas frases de la traducción entera, si tiene las mismas
const ORDEN = /^¡?(Recoge|Golpea|Pulsa|Llév|Lleva|Guía|Sigue|Síg|Encuentra|Encuéntr|Busca|Búsca|Observa|Obsérva|Descubre|Repite|Ayuda|Ayúda|Recorre|Sube|Baja|Vendimia|Escucha|Gana|Corre|Pasa|Toca|Ve |Ven )/;
const SPLIT = /(?<=[.!?])\s+/;
function sinOrdenes(s) {
  if (!s) return '';
  const S = s.split(SPLIT), keep = S.map(x => !ORDEN.test(x));
  if (keep.every(Boolean)) return P(s);
  if (!keep.some(Boolean)) return '';
  if (!isEU()) return P(S.filter((_, i) => keep[i]).join(' '));
  const E = tr(s).split(SPLIT);
  return E.length === S.length ? `<p data-notr>${esc(E.filter((_, i) => keep[i]).join(' '))}</p>` : P(s);
}
// las ilustraciones que ya hay para cada producto, cosecha, animal y yacimiento (láminas del autor); lo que no la tiene
// va con su icono grande hasta que llegue la suya (está en el encargo de imágenes)
// (las ilustraciones del autor para el producto estrella de cuatro comarcas y para la cuajada paso a paso: van con las
// tradiciones, src/assets/tradiciones; las demás llevan una lámina)
const STAR_ILUS = { bidasoa: 'prod-cuajada', 'larraun-leitzaldea': 'prod-talo', sakana: 'prod-queso-urbasa', 'ribera-alta': 'prod-esparrago' }, PROC_ILUS = { cuajada: 'como-cuajada' };
const STAR_LAM = { pamplona: 'pamplona-txistorra', pirineo: 'roncal-queso', prepirineo: 'aoiz-miel', sanguesa: 'sanguesa-pochas', 'tierra-estella': 'cortes-pimientos', 'valdizarbe-novenera': 'ujue-almendras', 'zona-media': 'c-vendimia', ribera: 'c-huerta' };
const FOOD_ICON = { cuajada: 'milk', talo: 'corn', queso: 'cheese', txistorra: 'chistorra', miel: 'honey', pochas: 'beans', pimientos: 'pepper', almendras: 'almond', uvas: 'grapes', esparragos: 'asparagus', alcachofa: 'artichoke' };
const PROC_LAM = { salmon: 'lesaka-salmon', mill: 'c-molino', idiazabal: 'etxalar-ovejas', roncal: 'roncal-queso', chistorra: 'pamplona-txistorra', honey: 'aoiz-miel', wine: 'c-vendimia', olive: 'tafalla-olivas', piquillo: 'cortes-pimientos' };
const PROC_ICON = { salmon: 'fish', cuajada: 'milk', mill: 'mill', idiazabal: 'cheese', roncal: 'cheese', chistorra: 'chistorra', honey: 'honey', wine: 'grapes', olive: 'olive', piquillo: 'pepper' };
const CROP_LAM = { patata: 'aribe-patatas', manzana: 'irurtzun-manzanas', olivo: 'tafalla-olivas', pocha: 'sanguesa-pochas', piquillo: 'cortes-pimientos', uva: 'c-vendimia', trigo: 'c-cereal', almendra: 'ujue-almendras', esparrago: 'c-huerta', alcachofa: 'c-huerta', tomate: 'c-huerta' };
const HERD_LAM = { lekunberri: 'lekunberri-txerri', 'isaba-izaba': 'isaba-vacas' };
const PET_FAUNA = { sheep: 'oveja', cow: 'vaca', pottoka: 'pottoka', goat: 'cabra', pig: 'cerdo', dog: 'perro' };
const SITE_LAM = { dolmen: 'artajona-dolmen', irulegi: 'irulegi-mano' };
// el mapa de los yacimientos: los de las misiones y algunos más, cada uno en su punto (aproximado) con su número dentro de
// un círculo; los que caen muy juntos se apartan un poco, para que ningún círculo tape a otro (en el móvil, con --k:
// fitMaps de hub.js, los círculos crecen hasta unas 48 unidades del mapa)
function mapaYacimientos() {
  const P = [...Object.values(SITES).filter(S => S.lat).map(S => ({ n: S.title || S.whatTitle, l: S.lugar || tn(S.town), lat: S.lat, lon: S.lon, t: S.town })),
    ...MAS_YACIMIENTOS.map(([n, l, txt, lat, lon, , t]) => ({ n, l, txt, lat, lon, t }))].map(p => ({ ...p, xy: mapaXY(p.lat, p.lon) }));
  for (let it = 0; it < 80; it++) for (const a of P) for (const b of P) {
    if (a === b) continue; const dx = b.xy[0] - a.xy[0], dy = b.xy[1] - a.xy[1], d = Math.hypot(dx, dy) || 0.1;
    if (d < 48) { const k = (48 - d) / 2 / d; a.xy[0] -= dx * k; a.xy[1] -= dy * k; b.xy[0] += dx * k; b.xy[1] += dy * k; }
  }
  for (const a of P) { a.xy[0] = Math.min(705, Math.max(40, a.xy[0])); a.xy[1] = Math.min(760, Math.max(40, a.xy[1])); }   // (y dentro del marco)
  const svg = `<svg class="navarra yac-mapa" viewBox="10 10 725 780" role="img" aria-label="Mapa de los yacimientos de Navarra">${COMARCAS.map(c => `<path d="${c.path}" style="fill:${c.color}"/>`).join('')}${P.map((p, i) => `<g class="ynum" transform="translate(${p.xy[0].toFixed(1)} ${p.xy[1].toFixed(1)})"><circle r="14"/><text dy=".36em" text-anchor="middle">${i + 1}</text></g>`).join('')}</svg>`;
  const li = P.map((p, i) => `<li><i>${i + 1}</i><span><b>${esc(p.n)}</b><small>${esc(p.l)}</small>${p.txt ? `<em>${esc(p.txt)}</em>` : ''}</span>${p.t && levelById(p.t) ? `<button type="button" class="lnk" data-town="${p.t}">${I('pin', 20)}${esc(tn(p.t))}</button>` : ''}</li>`).join('');
  return `<section class="yac"><h3>${I('map', 30)}<span>El mapa de los yacimientos</span></h3><p class="dd-intro">En Navarra hay catalogados más de 400 dólmenes y muchos otros yacimientos. Estos son algunos de ellos, con el pueblo donde está su misión.</p><div class="yac-in">${svg}<ol class="yac-lista">${li}</ol></div></section>`;
}
const ESTILO = { romanesque: 'Románica', gothic: 'Gótica', baroque: 'Barroca', fortress: 'Iglesia-fortaleza', cathedral: 'Catedral' };
const MONUMENTO = { bridge: 'Puentes de piedra', castle: 'Castillos', walls: 'Murallas', palace: 'Palacios', house: 'Casas con escudo', towerhouse: 'Casas-torre', dolmen: 'Dólmenes', chapel: 'Ermitas', pass: 'Puertos de montaña', dig: 'Excavaciones', palomeras: 'Palomeras', gorge: 'Foces', fountain: 'Fuentes', kiosk: 'Quioscos', arch: 'Arcos y portales',
  ruin: 'Ruinas', cross: 'Cruceros', mill: 'Molinos', monolith: 'Monolitos', lookout: 'Miradores', tunnel: 'Túneles', horreo: 'Hórreos', stelae: 'Estelas discoidales', cave: 'Cuevas', townhall: 'Ayuntamientos' };
// (el dibujo de cada palabra de los vecinos y de los saludos)
const PALABRA_ICO = { Kaixo: 'hand', 'Egun on': 'sun', 'Arratsalde on': 'sun', Gabon: 'moon', 'Ongi etorri': 'home', 'Eskerrik asko': 'heart', Agur: 'hand', Mesedez: 'star', Bai: 'check', Ez: 'close',
  herria: 'house', txakurra: 'dog', ardia: 'sheep', behia: 'cow', eliza: 'church', kanpaia: 'bell', dorrea: 'towerhouse', igandea: 'clock', denda: 'kiosk', gazta: 'cheese', saskia: 'basket', dirua: 'medal', sagarra: 'apple',
  'Zer moduz?': 'talk', ondo: 'check', laguna: 'person', 'Gero arte': 'hand', jolastu: 'play', korrika: 'running', pilota: 'pelota', irabazi: 'trophy', ura: 'water', iturria: 'fountain', ibaia: 'river', hotza: 'snow',
  ogia: 'bread', etxea: 'house', labea: 'fire', goxoa: 'heart', mendia: 'mountain', basoa: 'pine', zuhaitza: 'tree', bidea: 'footprint', txoria: 'bird', eguzkia: 'sun', euria: 'cloud', elurra: 'snow', gaua: 'moon', ilargia: 'moon' };
// (las romerías y los monumentos que ya tienen una lámina que es justo eso: el camino, la almadía, el puente…)
const ROMERIA_LAM = { 'orreaga-roncesvalles': 'orreaga-camino', 'burgui-burgi': 'burgui-almadia', irurtzun: 'lekunberri-plazaola', sanguesa: 'sanguesa', 'puente-la-reina': 'puente-la-reina', javier: 'javier-camino', ujue: 'ujue' };
// (las iglesias por estilo y los monumentos, con su ilustración del autor; si no la hay, la lámina que lo enseña)
const IGLESIA_ILUS = { romanesque: 'iglesia-romanica', gothic: 'iglesia-gotica', baroque: 'iglesia-barroca', fortress: 'iglesia-fortaleza', 'Iglesia neoclásica': 'iglesia-neoclasica', 'Iglesia neobarroca': 'iglesia-neobarroca', 'Basílica neogótica': 'iglesia-neogotica', 'Iglesia del siglo XIX': 'iglesia-neogotica', 'Iglesia del siglo XVI': 'iglesia-renacimiento', 'Iglesia de ladrillo': 'iglesia-ladrillo', 'Iglesia medieval': 'iglesia-romanica', 'Portada románica': 'portada-romanica' };
const MONUMENTO_ILUS = { house: 'casa-escudo', towerhouse: 'casa-torre', ruin: 'ruinas', chapel: 'ermita', cross: 'crucero', monolith: 'monolito', lookout: 'mirador', pass: 'puerto-montana', horreo: 'horreo', stelae: 'estelas' };
const MONUMENTO_LAM = { bridge: 'puente-la-reina', castle: 'javier', walls: 'pamplona-murallas', palace: 'olite', dolmen: 'artajona-dolmen', mill: 'c-molino', tunnel: 'lekunberri-plazaola', cave: 'zugarramurdi', dig: 'irulegi-mano', palomeras: 'etxalar-palomeras', townhall: 'pamplona', arch: 'amaiur-maya-del-baztan', gorge: 'lumbier' };
const LM_ICON = { chapel: 'church', pass: 'mountain', dig: 'dolmen', palomeras: 'net', gorge: 'gorge', fountain: 'fountain', kiosk: 'kiosk', arch: 'arch' };
const towns = (pred) => LEVELS.filter(l => (l.missions || []).some(pred)).map(l => l.id);

export const DIDACTICO = {
  // ---------- Portada ----------
  d_home() {
    const nFa = allFichas('fauna').length, nFl = allFichas('flora').length, nPer = Object.keys(PERSONAJES).length + FIGURAS.length;
    const T = [['towns', 'church', 'Pueblos y ciudades', 'Qué visitar, su escudo, sus cuentos y todo lo que se aprende en cada uno', LEVELS.length, 'pueblos'],
      ['map', 'map', 'Comarcas', 'Su danza, su carnaval, su fiesta, su traje, su naturaleza y su producto estrella', COMARCAS.length, 'comarcas'],
      ['cuentos', 'legend', 'Cuentos y leyendas', 'Las leyendas e historias de cada pueblo, enteras', CUENTOS.length + Object.keys(LEGENDS).length, 'relatos'],
      ['personajes', 'book', 'Personajes', 'Mujeres y hombres de Navarra, seres de leyenda y figuras de carnaval', nPer, 'fichas'],
      ['tradiciones', 'mask', 'Tradiciones', 'Danzas, carnavales, fiestas, romerías, ferias y pelota', '', ''],
      ['oficios', 'anvil', 'Oficios de antes', 'Cómo trabajaban, con qué herramientas y cómo es hoy', Object.keys(OFICIOS).length, 'oficios'],
      ['productos', 'cheese', 'Producto local y campo', 'Quesos, aceite, vino, huerta, cosechas y ganadería', '', ''],
      ['historia', 'castle', 'Historia y arquitectura', 'Castillos, dólmenes, los vascones y cómo reconocer cada monumento', '', ''],
      ['nature', 'leaf', 'Naturaleza', 'Animales, árboles, plantas y flores de cada comarca', nFa + nFl, 'fichas'],
      ['peaks', 'peak', 'Montes', 'Las cimas de Navarra, las señales de los senderos y cómo ir al monte', MOUNTAINS.length, 'cimas'],
      ['escudos', 'shield', 'Escudos', 'Los escudos de Navarra y cómo se leen', ARMAS.length, 'escudos'],
      ['instrumentos', 'music', 'Instrumentos', 'Qué son, cómo se tocan y dónde suenan; escúchalos', INSTRUMENTOS.length, 'instrumentos'],
      ['euskera', 'talk', 'Palabras en euskera', 'Saludos, herramientas, animales, plantas, productos y pueblos', '', ''],
      ['album', 'scroll', 'Láminas', 'Las ilustraciones de todos los pueblos', LAMINAS.filter(l => laminaUrl(l.id)).length, 'láminas']];
    return `<section class="dd-portada"><small class="kicker">${I('book', 20)} Material didáctico</small><h1>Aprende Navarra</h1>
      <p>Todo lo que enseña Herrizherri, para leer y estudiar sin jugar: los pueblos y las comarcas, sus cuentos y leyendas, sus personajes, sus tradiciones, sus oficios y productos, su historia, su naturaleza, sus montes, sus escudos, su música y sus palabras en euskera.</p></section>
      <section class="dd-temas">${T.map(([go, ic, t, d, n, u]) => `<button type="button" class="dd-tema" data-go="${go}">${I(ic, 44)}<span><b>${esc(t)}</b><small>${esc(d)}</small></span>${n ? `<i><b>${n}</b><small>${esc(u)}</small></i>` : ''}</button>`).join('')}</section>
      ${sec('sparkle', '¿Sabías que…?')}<ul class="dd-datos">${DATOS.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
      ${sec('shield', 'Las comarcas')}<section class="comarcas rail">${COMARCAS.map(c => this.d_ccard(c)).join('')}</section>`;
  },
  d_ccard(c) {
    const n = LEVELS.filter(l => l.comarca === c.id).length;
    return `<button class="ccard dd-cc" data-comarca="${c.id}" style="--c:${c.color}"><div class="cimg ready" style="background-image:url(${comarcaCover(c.id, true)})"></div>
      <div class="cbody"><b>${esc(c.name)}</b><small><b>${n}</b> <span>${n === 1 ? 'pueblo' : 'pueblos'}</span></small></div><span class="cgo">Ver la comarca</span></button>`;
  },

  // ---------- Un pueblo, entero ----------
  s_pueblo(id) {
    const l = levelById(id); if (!l) return this.s_towns();
    const c = comarca(l.comarca), A = armsOfTown(l.id), ms = l.missions || [];
    const tip = l.church ? (LABEL_TIP[l.church.label] || STYLE_TIP[l.church.style]) : '';
    const visit = [l.church && block('church', 'Iglesia', l.church.name, P(l.church.text) + (tip ? `<p class="dd-tip">${esc(tip)}</p>` : '')),
      ...(l.landmarks || []).map(m => block(LM_ICON[m.kind] || m.kind, '', m.name, P(m.text) + (KIND_TIP[m.kind] ? `<p class="dd-tip">${esc(KIND_TIP[m.kind])}</p>` : '')))].filter(Boolean);
    const learn = ms.map(m => this.d_mision(l, m)).filter(Boolean);
    const pers = FIGURE_TOWNS[l.id] || [], figs = FIGURAS.filter(f => f.town === l.id), ins = instrumentosDe(l.id), lams = laminasDe({ town: l.id }), cts = cuentoOfTown(l.id);
    this.after = () => {
      const cv = this.root.querySelector('.dd-arms canvas'); if (A && cv) drawOfficial(cv.getContext('2d'), cv.width / 2, 3, 90, A);
      this.root.querySelector('[data-armas]')?.addEventListener('click', () => readTownArms({ sound: this.sound }, A, { town: tn(l.id) }));
      this.d_bindLey();
    };
    return `<section class="armorial dd dd-town" style="--c:${c?.color}">
      <header class="dd-hero"><img src="${townImg(l)}" alt=""><div><button class="back" data-go="towns">${I('back', 24)} Pueblos</button>
        <button type="button" class="kicker lnk" data-comarca="${l.comarca}">${esc(c?.full || c?.name || '')}</button><h1>${esc(l.name)}</h1>${P(l.intro)}
        ${l.river ? `<p class="dd-river">${I('river', 20)}<span>${esc(l.river.name)}</span></p>` : ''}</div></header>
      ${visit.length ? sec('visit', 'Qué visitar') + `<div class="dd-grid">${visit.join('')}</div>` : ''}
      ${A ? `${sec('shield', 'Su escudo')}<div class="dd-arms">${armsImg(A.id) ? `<img src="${armsImg(A.id)}" alt="">` : `<canvas width="120" height="${Math.ceil(officialHeight(90, A)) + 6}"></canvas>`}<div><b>${esc(A.name)}</b>${P(A.read)}<button type="button" class="btn ghost" data-armas>${I('book', 22)} Cómo se lee</button></div></div>` : ''}
      ${cts.length ? sec('legend', 'Cuentos y leyendas') + `<div class="dd-grid dd-cts">${cts.map(C => this.d_cuento(C)).join('')}</div>` : ''}
      ${learn.length ? sec('book', 'Lo que se aprende aquí') + `<div class="dd-grid">${learn.join('')}</div>` : ''}
      ${pers.length || figs.length ? sec('person', 'Personajes') + `<section class="figuras">${personajesHTML(pers)}${figurasHTML(figs)}</section>` : ''}
      ${ins.length ? sec('music', 'Instrumentos') + instrumentosHTML(ins) : ''}
      ${lams.length ? sec('scroll', 'Láminas') + laminaRail(lams) : ''}
    </section>`;
  },
  // lo que enseña una misión, sin el juego: su texto, su explicación (qué es, cómo se hace, antes y ahora) y su pregunta
  d_mision(l, m) {
    switch (m.type) {
      case 'process': { const X = PROCESOS[m.id]; return block('basket', 'Producto local', m.title || m.product, (X ? H4('¿Qué es?') + P(X.what) + H4('Cómo se hace') + P(X.how) : P(m.text)) + (m.steps ? H4('Paso a paso') + ol(m.steps) : '') + (X ? aa(X.then, X.now) : ''), { sub: m.product }); }
      case 'tradition': { const X = TRADICIONES[m.title]; return block('music', 'Tradición', m.title, X ? H4('¿Qué es?') + P(X.what) + H4('Cómo se hace') + P(X.how) + aa(X.then, X.now) : sinOrdenes(m.text), { img: tradicionUrl(m.ilus) || '' }); }
      case 'dance': return block('dance', 'Danza', m.name, P(m.text), { img: tradicionUrl(m.ilus) || '' });
      case 'trade': return this.d_oficio(m.kind, m.title);
      case 'legend': return this.d_leyendaNoche(m.who, m.title);
      case 'carnival': return this.d_carnaval(m.character, m.title);
      case 'harvest': { const C = CROP[m.crop]; return block(C?.[1] || 'wheat', 'Cosecha', C?.[0] || m.crop, sinOrdenes(m.text), { cls: 'cap' }); }
      case 'herd': {
        if (m.story) return block('sheep', 'Ganadería', m.title || '', Ps(m.story) + (m.cardText ? `<p class="dd-tip">${esc(m.cardText)}</p>` : ''));
        const X = m.animal === 'cows' ? VAQUERA_INFO : PASTOR_INFO(l.family);
        return block(X.icon, 'Ganadería', m.title || X.title, sinOrdenes(m.text) + Ps(X.lines) + aa(X.then, X.now));
      }
      case 'race': return block('footprint', 'Fiestas y caminos', m.title || '', sinOrdenes(m.text));
      case 'observe': return block('binoculars', 'Fauna', m.title || '', Ps(m.story) + `<ul class="dd-sp">${[].concat(m.species || []).map(id => FAUNA[id] ? `<li><button type="button" class="nchip" data-ficha="fauna:${id}">${I(FAUNA[id].icon || 'bird', 24)}${esc(FAUNA[id].name)}</button><span>${esc(FAUNA[id].look || '')}</span></li>` : '').join('')}</ul>`);
      case 'pelota': return block('pelota', 'Pelota', m.title || '', Ps(m.story) + P('Así se juega: la pelota tiene que dar en el frontis por encima de la chapa, la raya roja. La puedes devolver de aire o después de un bote.'));
      case 'summit': { const pk = MOUNTAINS.find(x => x.id === m.peak); return pk ? `<div class="dd-pk">${this.peakCard(pk)}</div>` : ''; }
      case 'mirador': { const ll = townLatLon(l), M = ll ? montesFrom(ll.lat, ll.lon, 6, l.id) : []; return M.length ? block('binoculars', 'Desde el mirador', 'Los montes que se ven', `<ul class="peaklist">${M.map(x => `<li><b>${esc(x.name)}</b><i>${esc('al ' + x.dir)}</i><span>${x.altitude.toLocaleString('es')} m · ${Math.round(x.km)} km</span></li>`).join('')}</ul>`) : ''; }
      case 'dolmen': return this.d_site(m.site || 'dolmen');
      case 'castle': return this.d_castillo(m.castle);
      case 'feria': return this.d_feria(m);
      default: return '';   // (la visita va en «Qué visitar»; los personajes, en su apartado; el sabio pregunta lo que ya está aquí)
    }
  },
  d_oficio(kind, title = '') {
    const O = OFICIOS[kind]; if (!O) return '';
    const img = laminaUrl(OFICIO_LAMINA[kind], true) || '', esc2 = oficioImg(kind);
    return block(O.icon, 'Oficio de antes', title || O.name, P(O.intro)
      + H4('Sus herramientas') + `<table class="dd-tools"><tbody>${O.tools.map(([es, eu, d]) => `<tr><th data-notr lang="es">${esc(es)}</th><td data-notr lang="eu">${esc(eu)}</td><td>${esc(d)}</td></tr>`).join('')}</tbody></table>`
      + H4('Cómo se trabajaba') + O.steps.map(s => `<div class="dd-paso"><b>${esc(s.title)}</b>${P(s.text)}${s.q ? quiz({ q: s.q, options: s.options, answer: s.answer, why: s.why }) : ''}</div>`).join('')
      + aa(O.then, O.now) + (esc2 ? `<p class="dd-ofarms"><img src="${esc2}" alt=""><span>El escudo del oficio</span></p>` : ''),
    { sub: title ? O.name : '', eu: O.eu, img, where: where(towns(m => m.type === 'trade' && m.kind === kind)) });
  },
  d_leyendaNoche(who, title = '') {
    const L = LEGENDS[who]; if (!L) return '';
    return block('legend', 'Leyenda de noche', title || L.creature, Ps(L.story) + H4('Las pistas') + ul(L.clues.map(c => c.text)) + H4('El encuentro') + Ps(L.meet) + (L.card ? `<p class="dd-tip">${esc(L.card)}</p>` : ''),
      { sub: L.creature, where: where(towns(m => m.type === 'legend' && m.who === who)) });
  },
  d_carnaval(id, title = '') {
    const F = FOLKLORE.find(x => x.id === id); if (!F) return '';
    const fig = FIGURAS.find(f => f.id === id), N = NIGHT_CARNIVAL[id], myth = F.category === 'myth';
    return block(myth ? 'legend' : 'mask', myth ? 'Mitología' : 'Carnaval', title || F.name, P(F.fact) + P(F.culture) + (N ? Ps(N.story) : '') + (fig ? `<button type="button" class="btn ghost" data-figura="${fig.id}">${I(myth ? 'legend' : 'mask', 22)} ${myth ? 'Su ficha' : 'Su ficha y su traje'}</button>` : ''),
      { sub: F.origin, where: where(towns(m => m.type === 'carnival' && m.character === id)), img: tradicionUrl(id) || '' });
  },
  d_site(id) {
    const S = SITES[id]; if (!S) return '';
    return block(S.icon, 'Arqueología', S.title || S.whatTitle, Ps(S.intro) + P(S.what) + H4('Lo que se encuentra') + `<ul class="dd-ul dd-finds">${S.finds.map(([, n, t]) => `<li><b>${esc(n)}</b> <span>${esc(t)}</span></li>`).join('')}</ul>` + H4(S.stepsTitle) + ol(S.steps) + H4(S.nowTitle) + aa(S.then, S.now) + (S.q ? quiz(S.q) : ''),
      { where: where(towns(m => m.type === 'dolmen' && (m.site || 'dolmen') === id)) });
  },
  d_castillo(id) {
    const C = CASTLE_TOWNS[id]; if (!C) return '';
    const parts = C.parts.map(p => ({ ...PARTS[p], ...(C.own[p] || {}) }));
    return block('castle', 'Castillo', C.title, Ps(C.intro) + H4('Sus partes') + `<ul class="dd-ul dd-finds">${parts.map(p => `<li><b>${esc(p.name)}</b> <span>${esc(p.text)}</span></li>`).join('')}</ul>` + aa(C.then, C.now),
      { where: where([id]) });
  },
  d_feria(m = null) {
    return block('cow', 'Feria de ganado', m?.title || 'Feria de ganado', Ps(FERIA.intro) + (m?.note ? P(m.note) : '') + (FERIA.breeds ? H4('Las razas') + `<ul class="dd-ul dd-finds">${FERIA.breeds.map(([n, t]) => `<li><b>${esc(n)}</b> <span>${esc(t)}</span></li>`).join('')}</ul>` : '')
      + quiz(FERIA.judge) + quiz(FERIA.deal) + aa(FERIA.then, FERIA.now), { where: m ? '' : where(towns(x => x.type === 'feria')), img: (m && tradicionUrl(m.ilus)) || '' });
  },
  // un cuento entero: su ilustración, las cuatro partes, lo que se ve hoy y su pregunta
  d_cuento(C) {
    const u = leyendaUrl(C.id);
    return `<article class="dd-b dd-ct" id="ct-${C.id}">${u ? `<figure class="dd-img" data-ley="${C.id}" role="button" tabindex="0"><img src="${u}" alt="" loading="lazy" decoding="async"></figure>` : ''}
      <header>${I(C.icon, 34)}<div><small>${esc(KIND_LABEL[C.kind])}</small><h3>${esc(C.title)}</h3><em>${esc(C.place)}</em></div></header>
      ${Ps(C.parts)}${H4('Lo que puedes ver hoy')}${P(C.today)}${quiz(C.q)}${where(C.towns)}</article>`;
  },
  d_bindLey() {
    const on = CUENTOS.filter(C => leyendaUrl(C.id, true)), list = on.map(C => ({ src: leyendaUrl(C.id, true), title: C.title }));
    this.root.querySelectorAll('[data-ley]').forEach(f => f.onclick = () => openVisor(list, Math.max(0, on.findIndex(C => C.id === f.dataset.ley)), this.sound));
  },
  // los cuentos y leyendas, todos abiertos y por comarcas; luego las leyendas de noche
  d_cuentos() {
    this.after = () => this.d_bindLey();
    const by = COMARCAS.map(c => ({ c, list: CUENTOS.filter(C => levelById(C.towns[0])?.comarca === c.id) })).filter(g => g.list.length);
    return `<section class="armorial dd"><div class="ar-head dd-head"><small class="kicker">${I('legend', 20)} Material didáctico</small><h1>Cuentos y leyendas de Navarra</h1>
      <p>Las leyendas de cada pueblo, lo que cuenta la tradición, y las historias que pasaron de verdad. Cada relato dice qué puedes ver hoy en ese lugar y lleva una pregunta para repasar, con su respuesta.</p></div>
      ${by.map(g => `<h2 class="sec dd-csec" style="--c:${g.c.color}"><i class="adot"></i>${esc(g.c.name)}</h2><div class="dd-grid dd-cts">${g.list.map(C => this.d_cuento(C)).join('')}</div>`).join('')}
      ${sec('legend', 'Leyendas de noche')}<p class="lead">Las que en el juego se viven al anochecer, con sus pistas y su encuentro.</p><div class="dd-grid">${Object.keys(LEGENDS).map(k => this.d_leyendaNoche(k)).join('')}</div>
      ${sec('legend', 'Seres de la mitología')}<div class="dd-grid">${FOLKLORE.filter(f => f.category === 'myth').map(f => this.d_carnaval(f.id)).join('')}</div>
      <p class="ar-src">Fuentes: Cátedra de Patrimonio de la Universidad de Navarra, Auñamendi Eusko Entziklopedia, Senditur, Noticias de Navarra, culturanavarra.es, las Leyendas de Gustavo Adolfo Bécquer y los santuarios y ayuntamientos de cada lugar. Las leyendas tienen muchas versiones: aquí está la más contada, adaptada para niños y niñas.</p></section>`;
  },

  // ---------- Tradiciones (galería, como Naturaleza) ----------
  s_tradiciones(tab) {
    const dances = LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'dance').map(m => ({ l, m })));
    const races = LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'race').map(m => ({ l, m })));
    const trads = LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'tradition').map(m => ({ l, m })));
    const cult = (o, ic) => o ? `<div class="dd-cu">${o.date ? `<small>${esc(o.date)}</small>` : ''}<h4>${esc(o.title)}</h4>${P(o.text)}${o.place ? `<p class="dd-place">${I('pin', 18)}${esc(o.place)}</p>` : ''}</div>` : '';
    const pelota = LEVELS.flatMap(l => l.missions || []).find(m => m.type === 'pelota');
    const grupos = [
      { k: 'comarcas', name: 'Cada comarca', icon: 'map', intro: 'La danza, el carnaval, la fiesta y el traje de cada comarca.',
        items: COMARCAS.filter(c => c.culture).map(c => { const K = c.culture; return { k: 'c-' + c.id, img: tradicionUrl('danza-' + c.id) || comarcaCover(c.id, true) || '', icon: 'dance', c: c.color, kicker: 'Comarca', title: c.full || c.name,
          secs: [['Danza', cult(K.dance)], ['Carnaval', cult(K.carnival)], ['Fiesta', cult(K.festival)], ['Traje', cult(K.costume)]] }; }) },
      { k: 'danzas', name: 'Danzas', icon: 'dance', items: dances.map(({ l, m }) => ({ k: 'd-' + l.id, img: tradicionUrl(m.ilus) || '', icon: 'dance', c: comarca(l.comarca)?.color, kicker: tn(l.id), title: m.name, secs: [['La danza', P(m.text)]], towns: [l.id] })) },
      { k: 'carnavales', name: 'Carnavales', icon: 'mask', items: FOLKLORE.filter(f => f.category === 'carnival').map(f => { const N = NIGHT_CARNIVAL[f.id], fig = FIGURAS.find(x => x.id === f.id), T = tradicionUrl(f.id);
        // (la escena del carnaval del autor, si la hay; si no, la figura)
        return { k: 'f-' + f.id, img: T || figuraImg(f.id) || '', fit: !T && !figuraIlus(f.id), icon: 'mask', kicker: f.origin || 'Carnaval', title: f.name,
          secs: [['Qué es', P(f.fact) + P(f.culture)], ['La noche del carnaval', N ? Ps(N.story) : ''], ['Su traje', fig ? `<p><button type="button" class="btn ghost" data-figura="${fig.id}">${I('mask', 22)} Su ficha y su traje</button></p>` : '']],
          towns: towns(m => m.type === 'carnival' && m.character === f.id) }; }) },
      { k: 'tradiciones', name: 'Tradiciones', icon: 'music', items: trads.map(({ l, m }) => { const X = TRADICIONES[m.title]; return { k: 't-' + l.id, img: tradicionUrl(m.ilus) || '', icon: 'music', c: comarca(l.comarca)?.color, kicker: tn(l.id), title: m.title,
        secs: X ? [['Qué es', P(X.what)], ['Cómo se hace', P(X.how)], ['Antes y ahora', aa(X.then, X.now)]] : [['Qué es', sinOrdenes(m.text)]], towns: [l.id] }; }) },
      { k: 'romerias', name: 'Romerías y caminos', icon: 'footprint', items: races.map(({ l, m }) => ({ k: 'r-' + l.id, img: tradicionUrl(m.ilus) || (ROMERIA_LAM[l.id] && laminaUrl(ROMERIA_LAM[l.id], true)) || '', icon: 'footprint', c: comarca(l.comarca)?.color, kicker: tn(l.id), title: m.title || '', secs: [['Qué es', sinOrdenes(m.text)]], towns: [l.id] })) },
      { k: 'ferias', name: 'Ferias de ganado', icon: 'cow', items: [{ k: 'feria', img: laminaUrl('elizondo-feria', true) || '', icon: 'cow', kicker: 'Feria de ganado', title: 'La feria de ganado',
        secs: [['Qué es', Ps(FERIA.intro)], ['Las razas', FERIA.breeds ? `<ul class="dd-ul dd-finds">${FERIA.breeds.map(([n, t]) => `<li><b>${esc(n)}</b> <span>${esc(t)}</span></li>`).join('')}</ul>` : ''], ['Preguntas', quiz(FERIA.judge) + quiz(FERIA.deal)], ['Antes y ahora', aa(FERIA.then, FERIA.now)]],
        towns: towns(x => x.type === 'feria') }] },
      { k: 'pelota', name: 'Pelota y pasaka', icon: 'pelota', items: [
        { k: 'pelota', img: laminaUrl('dep-pelotari', true) || '', icon: 'pelota', kicker: 'Pelota', title: 'Pelota a mano', secs: [['La historia', Ps(pelota?.story)], ['Cómo se juega', P('La pelota tiene que dar en el frontis por encima de la chapa, la raya roja. La puedes devolver de aire o después de un bote.')]] },
        { k: 'pasaka', img: laminaUrl('dep-pasaka', true) || '', icon: 'pelota', kicker: PASAKA.kicker, title: 'Pasaka', secs: PASAKA.secs.filter(([t]) => t !== 'En el juego').map(([t, x]) => [t, P(x)]).concat([['Fuentes', `<p class="ar-src">${esc(PASAKA.sources)}</p>`]]) }] },
      { k: 'campanas', name: 'Las campanas', icon: 'bell', items: [{ k: 'campanas', img: tradicionUrl('campanas') || '', icon: 'bell', kicker: 'Tradición', title: BELL.title, secs: [['Qué es', P(BELL.fact)]] }] },
    ];
    const head = `<div class="ar-head dd-head"><small class="kicker">${I('mask', 20)} Material didáctico</small><h1>Tradiciones de Navarra</h1>
      <p>Las danzas, los carnavales, las fiestas y los trajes de cada comarca; las tradiciones de los pueblos, las romerías y los caminos, las ferias de ganado, la pelota y la música. Toca una para ver su ficha.</p></div>`;
    grupos.at(-1).after = `<p class="dd-more"><button type="button" class="btn ghost" data-go="instrumentos">${I('music', 22)} Los instrumentos de la música de siempre</button><button type="button" class="btn ghost" data-go="personajes">${I('mask', 22)} Las fichas de los personajes de leyenda y carnaval</button></p>`;
    return galeria(this, 'tradiciones', tab, head, grupos);
  },

  // ---------- Oficios (galería) ----------
  s_oficios(tab) {
    const items = Object.entries(OFICIOS).map(([k, O]) => {
      const esc2 = oficioImg(k);
      return { k, img: laminaUrl(OFICIO_LAMINA[k], true) || '', icon: O.icon, kicker: 'Oficio de antes', title: O.name, eu: O.eu,
        secs: [['El oficio', P(O.intro) + (esc2 ? `<p class="dd-ofarms"><img src="${esc2}" alt=""><span>El escudo del oficio</span></p>` : '')],
          ['Herramientas', `<table class="dd-tools"><thead><tr><th>Castellano</th><th>Euskera</th><th>Para qué sirve</th></tr></thead><tbody>${O.tools.map(([es, eu, d]) => `<tr><th data-notr lang="es">${esc(es)}</th><td data-notr lang="eu">${esc(eu)}</td><td>${esc(d)}</td></tr>`).join('')}</tbody></table>`],
          ['Cómo se trabajaba', O.steps.map((s, i) => `<div class="dd-paso"><h4><span class="dd-n">${i + 1}</span>${esc(s.title)}</h4>${P(s.text)}${s.q ? quiz({ q: s.q, options: s.options, answer: s.answer, why: s.why }) : ''}</div>`).join('')],
          ['Antes y ahora', aa(O.then, O.now)]],
        towns: towns(m => m.type === 'trade' && m.kind === k) };
    });
    const head = `<div class="ar-head dd-head"><small class="kicker">${I('anvil', 20)} Material didáctico</small><h1>Oficios de antes</h1>
      <p>Cómo se hacían las cosas cuando no había máquinas. Cada oficio tiene su ficha: qué hacía, sus herramientas en castellano y en euskera, cómo se trabajaba paso a paso, con una pregunta en cada paso, y cómo es hoy.</p></div>`;
    return galeria(this, 'oficios', tab, head, [{ k: 'oficios', name: 'Oficios', icon: 'anvil', items }]);
  },

  // ---------- Producto local y campo (galería) ----------
  s_productos(tab) {
    const proc = LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'process').map(m => ({ l, m })));
    const herd = LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'herd' && m.story).map(m => ({ l, m })));
    // (las cosechas, una por cultivo, con todos los pueblos donde se recoge)
    const crops = [...new Set(LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'harvest').map(m => m.crop)))];
    const cropTowns = (c) => LEVELS.filter(l => (l.missions || []).some(m => m.type === 'harvest' && m.crop === c));
    const cropText = (c) => { for (const l of cropTowns(c)) for (const m of l.missions) if (m.type === 'harvest' && m.crop === c) { const t = sinOrdenes(m.text); if (t) return t; } return ''; };
    const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
    const lam = (id) => (id && laminaUrl(id, true)) || '';
    const grupos = [
      { k: 'estrella', name: 'Producto estrella', icon: 'star', intro: 'Lo más típico de cada comarca.',
        items: COMARCAS.filter(c => STAR[c.id]).map(c => { const S = STAR[c.id]; return { k: 's-' + c.id, img: tradicionUrl(STAR_ILUS[c.id]) || lam(STAR_LAM[c.id]), icon: FOOD_ICON[S.food] || 'cheese', c: c.color, kicker: c.name, title: S.name, eu: S.eu, secs: [['Qué es', P(S.text)]] }; }) },
      { k: 'como', name: 'Cómo se hace', icon: 'basket', intro: 'Del campo o del animal a la mesa, paso a paso.',
        items: proc.map(({ l, m }) => { const X = PROCESOS[m.id]; return { k: 'p-' + l.id + '-' + m.id, img: tradicionUrl(PROC_ILUS[m.id]) || lam(PROC_LAM[m.id]), icon: PROC_ICON[m.id] || 'basket', c: comarca(l.comarca)?.color, kicker: tn(l.id), title: m.title || m.product, sub: m.product,
          secs: X ? [['Qué es', P(X.what)], ['Cómo se hace', P(X.how) + (m.steps ? H4('Paso a paso') + ol(m.steps) : '')], ['Antes y ahora', aa(X.then, X.now)]] : [['Qué es', P(m.text)]], towns: [l.id] }; }) },
      { k: 'cosechas', name: 'Las cosechas', icon: 'wheat', intro: 'Qué se recoge en cada sitio.',
        items: crops.map(c => ({ k: 'h-' + c, img: lam(CROP_LAM[c]), icon: CROP[c]?.[1] || 'wheat', kicker: 'Cosecha', title: cap(CROP[c]?.[0] || c), secs: [['La cosecha', cropText(c)]], towns: cropTowns(c).map(l => l.id) })) },
      { k: 'ganaderia', name: 'Ganadería', icon: 'sheep', intro: 'Pastores, vaqueras y sus rebaños.',
        items: [[PASTOR_INFO('atlantic'), 'Montaña', 'etxalar-ovejas'], [PASTOR_INFO('ribera'), 'Ribera y Zona Media', 'c-bardenas'], [VAQUERA_INFO, '', 'ituren-vacas']].map(([X, sub, l], i) => ({ k: 'g-' + i, img: lam(l), icon: X.icon, kicker: 'Ganadería', title: X.title, sub, secs: [['El oficio', Ps(X.lines)], ['Antes y ahora', aa(X.then, X.now)]] }))
          .concat(herd.map(({ l, m }) => ({ k: 'g-' + l.id, img: lam(HERD_LAM[l.id]), icon: 'sheep', c: comarca(l.comarca)?.color, kicker: tn(l.id), title: m.title || '', secs: [['La historia', Ps(m.story) + (m.cardText ? `<p class="dd-tip">${esc(m.cardText)}</p>` : '')]], towns: [l.id] }))) },
      { k: 'granja', name: 'La granja', icon: 'cow', intro: 'Los animales del caserío y de la borda.',
        items: Object.entries(PET).filter(([, X]) => X?.fact).map(([k, X]) => ({ k: 'a-' + k, img: faunaImg(PET_FAUNA[k])?.small || '', fit: true, icon: X.icon, kicker: 'Animales de la granja', title: X.title, secs: [['Cómo es', P(X.fact)]] })) },
      { k: 'monte', name: 'Comida para el monte', icon: 'backpack', items: Object.values(FOOD).filter(f => f.fact).map(f => ({ k: 'm-' + f.name, img: '', icon: f.icon, kicker: 'Para el monte', title: f.name, secs: [['Qué es', P(f.fact)]] })) },
      { k: 'campo', name: 'Del campo', icon: 'basket', items: Object.values(GOODS).map(g => ({ k: 'c-' + g.name, img: '', icon: g.icon, kicker: 'Del campo y la ganadería', title: g.name, eu: g.eu, secs: [['De dónde sale', P(cap(g.from || ''))]] })) },
    ];
    const head = `<div class="ar-head dd-head"><small class="kicker">${I('cheese', 20)} Material didáctico</small><h1>Producto local y campo</h1>
      <p>Lo que se cultiva, se cría y se elabora en cada comarca: cómo se hace, cómo era antes y cómo es ahora. Toca uno para ver su ficha.</p></div>`;
    return galeria(this, 'productos', tab, head, grupos);
  },

  // ---------- Historia y arquitectura (galería) ----------
  s_historia(tab) {
    const H = CUENTOS.filter(C => C.kind === 'historia');
    const lista = (a) => `<ul class="dd-ul dd-finds">${a.map(([n, t]) => `<li><b>${esc(n)}</b> <span>${esc(t)}</span></li>`).join('')}</ul>`;
    const grupos = [
      { k: 'pobladores', name: 'Los primeros pobladores', icon: 'dolmen', intro: 'De los cazadores de la Edad de Hielo a las ciudades romanas: dólmenes, crómlech, cuevas, poblados y villas de Navarra.', after: mapaYacimientos(),
        items: Object.entries(SITES).map(([k, S]) => ({ k: 's-' + k, img: laminaUrl(SITE_LAM[k], true) || '', icon: S.icon, kicker: S.lugar || 'Arqueología', title: S.title || S.whatTitle,
          secs: [['Qué es', Ps(S.intro) + P(S.what)], ['Lo que se encuentra', lista(S.finds.map(([, n, t]) => [n, t]))], [S.stepsTitle, ol(S.steps)], [S.nowTitle || 'Antes y ahora', aa(S.then, S.now)], S.q && ['Pregunta', quiz(S.q)]],
          towns: towns(m => m.type === 'dolmen' && (m.site || 'dolmen') === k) })) },
      { k: 'castillos', name: 'Los castillos', icon: 'castle', intro: 'Cómo eran por dentro y los que quedan en pie.',
        items: [{ k: 'partes', img: tradicionUrl('castillo-partes') || '', icon: 'castle', kicker: 'Castillo', title: 'Las partes de un castillo', secs: [['Sus partes', lista(Object.values(PARTS).map(p => [p.name, p.text]))], ['Pregunta', quiz(CASTLE_QUIZ)]] },
          ...Object.entries(CASTLE_TOWNS).map(([k, C]) => ({ k: 'c-' + k, img: laminaUrl(k, true) || '', icon: 'castle', c: comarca(levelById(k)?.comarca)?.color, kicker: tn(k), title: C.title,
            secs: [['Su historia', Ps(C.intro)], ['Sus partes', lista(C.parts.map(p => ({ ...PARTS[p], ...(C.own[p] || {}) })).map(p => [p.name, p.text]))], ['Antes y ahora', aa(C.then, C.now)]], towns: [k] })),
          { k: 'ruta', img: laminaUrl('ujue', true) || '', icon: 'castle', kicker: 'Ruta de los castillos', title: 'Castillos de Navarra', secs: [['Los que quedan', P('Después de la conquista de Navarra muchos castillos se derribaron. Estos son algunos de los que quedan, en pie o en ruinas:') + lista(CASTILLOS)]] }] },
      { k: 'iglesias', name: 'Cómo reconocer una iglesia', icon: 'church', intro: 'Los estilos: fíjate en los arcos, las ventanas y la decoración.',
        items: [...Object.entries(STYLE_TIP).map(([k, t]) => [ESTILO[k] || k, t, k]), ...Object.entries(LABEL_TIP).map(([k, t]) => [k, t, k])].map(([n, t, k]) => ({ k: 'i-' + k, img: tradicionUrl(IGLESIA_ILUS[k]) || (k === 'cathedral' && laminaUrl('tudela', true)) || '', icon: k === 'cathedral' ? 'cathedral' : 'church', kicker: 'Estilo', title: n, secs: [['Cómo reconocerla', P(t)]] })) },
      { k: 'monumentos', name: 'Monumentos', icon: 'arch', intro: 'Puentes, murallas, palacios y casas con escudo: qué mirar en cada uno.',
        items: Object.entries(KIND_TIP).map(([k, t]) => ({ k: 'm-' + k, img: tradicionUrl(MONUMENTO_ILUS[k]) || (MONUMENTO_LAM[k] && laminaUrl(MONUMENTO_LAM[k], true)) || '', icon: LM_ICON[k] || k, kicker: 'Monumento', title: MONUMENTO[k] || k, secs: [['Qué mirar', P(t)]] })) },
      { k: 'historias', name: 'Historias que pasaron', icon: 'book', intro: 'Lo que pasó de verdad en los pueblos de Navarra.',
        items: H.map(C => ({ k: 'h-' + C.id, img: leyendaUrl(C.id) || '', icon: C.icon, kicker: KIND_LABEL[C.kind], title: C.title, sub: C.place, secs: [['La historia', Ps(C.parts)], ['Lo que puedes ver hoy', P(C.today)], ['Pregunta', quiz(C.q)]], towns: C.towns })) },
    ];
    const head = `<div class="ar-head dd-head"><small class="kicker">${I('castle', 20)} Material didáctico</small><h1>Historia y arquitectura</h1>
      <p>De los primeros pastores que levantaron los dólmenes a los vascones de Irulegi, los castillos del reino y los monumentos de los pueblos: qué son y cómo reconocerlos. Toca uno para ver su ficha.</p></div>`;
    grupos.at(-1).after = `<p class="dd-more"><button type="button" class="btn ghost" data-go="personajes">${I('book', 22)} Los personajes de la historia de Navarra</button><button type="button" class="btn ghost" data-go="escudos">${I('shield', 22)} Los escudos y cómo se leen</button></p>`;
    return galeria(this, 'historia', tab, head, grupos);
  },

  // ---------- Palabras en euskera (por temas, como tarjetas con su imagen) ----------
  s_euskera(tab) {
    // (los pueblos con dos nombres: unos llevan delante el euskera, como Amaiur / Maya, y otros el castellano)
    const EU_DELANTE = new Set(['Amaiur', 'Orreaga', 'Otsagabia', 'Erronkari', 'Altsasu']);
    const both = (name) => { const [a, b] = name.split(' / '); return b ? (EU_DELANTE.has(a) ? [a, b] : [b, a]) : null; };
    const W = (eu, es, o = {}) => ({ eu, es, ...o });
    const lam = (id) => (id && laminaUrl(id, true)) || '';
    const grupos = [
      { k: 'saludos', name: 'Saludos', icon: 'talk', intro: 'Para saludar, dar las gracias y despedirse.',
        items: [['Kaixo', 'Hola'], ...Object.entries(KAIXO_ES), ['Ongi etorri', 'Bienvenida, bienvenido'], ['Eskerrik asko', 'Gracias'], ['Agur', 'Adiós']].map(([eu, es]) => W(eu, es, { icon: PALABRA_ICO[eu] || 'talk' })) },
      { k: 'charlas', name: 'Conversaciones', icon: 'talk', intro: 'Lo que te dicen los vecinos y lo que se contesta.',
        chats: HIZKETAK.map(h => hizketaLines(h).map(([eu, es]) => [eu.replace('{izena}', 'Ane'), es.replace('{izena}', 'Ane')])) },
      { k: 'vecinos', name: 'Palabras de los vecinos', icon: 'house', intro: 'Las que enseñan los vecinos en el juego.',
        items: Object.values(HITZAK).flat().filter(([eu]) => !['Kaixo', 'Eskerrik asko', 'Agur'].includes(eu)).map(([eu, es]) => W(eu, es, { icon: PALABRA_ICO[eu] || 'talk' })) },
      { k: 'oficios', name: 'Oficios', icon: 'anvil', items: Object.entries(OFICIOS).map(([k, o]) => W(o.eu, o.name, { img: lam(OFICIO_LAMINA[k]), icon: o.icon })) },
      { k: 'herramientas', name: 'Herramientas', icon: 'hammer', items: Object.values(OFICIOS).flatMap(o => o.tools.map(([es, eu, d]) => W(eu, es, { d, icon: o.icon }))) },
      { k: 'instrumentos', name: 'Instrumentos', icon: 'music', items: INSTRUMENTOS.map(x => W(x.eu, x.name, { icon: x.icon })) },
      { k: 'productos', name: 'Productos', icon: 'cheese', items: [...Object.entries(STAR).map(([c, s]) => W(s.eu, s.name, { img: lam(STAR_LAM[c]), icon: FOOD_ICON[s.food] || 'cheese' })), ...Object.values(GOODS).map(g => W(g.eu, g.name, { icon: g.icon }))] },
      { k: 'seres', name: 'Leyenda y carnaval', icon: 'mask', items: FIGURAS.filter(f => f.eu && f.eu !== f.name).map(f => W(f.eu, f.name, { img: figuraImg(f.id) || '', fit: !figuraIlus(f.id), icon: 'mask' })) },
      { k: 'animales', name: 'Animales', icon: 'bird', items: allFichas('fauna').filter(d => d.F.eu).map(d => W(d.F.eu, d.F.name, { img: faunaImg(d.id)?.small || '', fit: true, icon: d.F.icon || 'bird' })) },
      { k: 'plantas', name: 'Árboles y plantas', icon: 'leaf', items: allFichas('flora').filter(d => d.F.eu).map(d => W(d.F.eu, d.F.name, { img: floraFoto(d.id)?.planta || '', icon: d.F.m?.t === 'tree' ? 'tree' : 'leaf' })) },
      { k: 'pueblos', name: 'Pueblos', icon: 'church', items: LEVELS.map(l => { const n = both(l.name); return n && W(n[0], n[1], { img: townImg(l, true), icon: 'church' }); }).filter(Boolean) },
      { k: 'comarcas', name: 'Comarcas', icon: 'map', items: COMARCAS.map(c => { const n = both(c.full || c.name); return n && W(n[0], n[1], { img: comarcaCover(c.id, true) || '', icon: 'map' }); }).filter(Boolean) },
    ];
    const head = `<div class="ar-head dd-head"><small class="kicker">${I('talk', 20)} Material didáctico</small><h1>Palabras en euskera</h1>
      <p>Las palabras en euskera que salen en el juego, por temas: cada una con su dibujo, en euskera en grande y en castellano debajo.</p></div>`;
    return palabras(this, 'euskera', tab, head, grupos);
  },
};
