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
      { sub: F.origin, where: where(towns(m => m.type === 'carnival' && m.character === id)) });
  },
  d_site(id) {
    const S = SITES[id]; if (!S) return '';
    return block(S.icon, 'Arqueología', S.whatTitle, Ps(S.intro) + P(S.what) + H4('Lo que se encuentra') + `<ul class="dd-ul dd-finds">${S.finds.map(([, n, t]) => `<li><b>${esc(n)}</b> <span>${esc(t)}</span></li>`).join('')}</ul>` + H4(S.stepsTitle) + ol(S.steps) + H4(S.nowTitle) + aa(S.then, S.now),
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
      + quiz(FERIA.judge) + quiz(FERIA.deal) + aa(FERIA.then, FERIA.now), { where: m ? '' : where(towns(x => x.type === 'feria')) });
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

  // ---------- Tradiciones ----------
  s_tradiciones() {
    const C = (ic, k, o) => o ? `<div class="cult">${I(ic, 40)}<div><small>${esc(k)}${o.date ? ' · ' + esc(o.date) : ''}</small><b>${esc(o.title)}</b>${P(o.text)}${o.place ? `<em>${esc(o.place)}</em>` : ''}</div></div>` : '';
    const dances = LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'dance').map(m => ({ l, m })));
    const races = LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'race').map(m => ({ l, m })));
    const trads = LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'tradition').map(m => ({ l, m })));
    return `<section class="armorial dd"><div class="ar-head dd-head"><small class="kicker">${I('mask', 20)} Material didáctico</small><h1>Tradiciones de Navarra</h1>
      <p>Las danzas, los carnavales, las fiestas y los trajes de cada comarca; las tradiciones de los pueblos, las romerías y los caminos, las ferias de ganado, la pelota y la música.</p></div>
      ${sec('dance', 'Cada comarca: danza, carnaval, fiesta y traje')}
      ${COMARCAS.map(c => { const K = c.culture || {}; return `<div class="dd-com" style="--c:${c.color}"><h3><i class="adot"></i><button type="button" class="lnk" data-comarca="${c.id}">${esc(c.full || c.name)}</button></h3><div class="cultgrid">${C('dance', 'Danza', K.dance)}${C('mask', 'Carnaval', K.carnival)}${C('flag', 'Fiesta', K.festival)}${C('ribbon', 'Traje', K.costume)}</div></div>`; }).join('')}
      ${sec('dance', 'Danzas de los pueblos')}<div class="dd-grid">${dances.map(({ l, m }) => block('dance', 'Danza', m.name, P(m.text), { img: tradicionUrl(m.ilus) || '', where: where([l.id]) })).join('')}</div>
      ${sec('mask', 'Carnavales')}<div class="dd-grid">${FOLKLORE.filter(f => f.category === 'carnival').map(f => this.d_carnaval(f.id)).join('')}</div>
      ${trads.length ? sec('music', 'Tradiciones de los pueblos') + `<div class="dd-grid">${trads.map(({ l, m }) => { const X = TRADICIONES[m.title]; return block('music', 'Tradición', m.title, X ? H4('¿Qué es?') + P(X.what) + H4('Cómo se hace') + P(X.how) + aa(X.then, X.now) : '', { img: tradicionUrl(m.ilus) || '', where: where([l.id]) }); }).join('')}</div>` : ''}
      ${sec('footprint', 'Romerías, caminos y fiestas')}<div class="dd-grid">${races.map(({ l, m }) => block('footprint', 'Fiestas y caminos', m.title || '', sinOrdenes(m.text), { where: where([l.id]) })).join('')}</div>
      ${sec('cow', 'Ferias de ganado')}<div class="dd-grid">${this.d_feria()}</div>
      ${sec('pelota', 'Pelota y pasaka')}<div class="dd-grid">${block('pelota', 'Pelota', 'Pelota a mano', Ps(LEVELS.flatMap(l => l.missions || []).find(m => m.type === 'pelota')?.story) + P('Así se juega: la pelota tiene que dar en el frontis por encima de la chapa, la raya roja. La puedes devolver de aire o después de un bote.'), { where: where(towns(m => m.type === 'pelota')) })}
        ${block('pelota', PASAKA.kicker, 'Pasaka', PASAKA.secs.filter(([t]) => t !== 'En el juego').map(([t, x]) => H4(t) + P(x)).join('') + `<p class="ar-src">${esc(PASAKA.sources)}</p>`, { img: laminaUrl('dep-pasaka') || '' })}</div>
      ${sec('bell', 'Las campanas')}<div class="dd-grid">${block('bell', '', BELL.title, P(BELL.fact))}</div>
      <p class="dd-more"><button type="button" class="btn ghost" data-go="instrumentos">${I('music', 22)} Los instrumentos de la música de siempre</button><button type="button" class="btn ghost" data-go="personajes">${I('mask', 22)} Las fichas de los personajes de leyenda y carnaval</button></p></section>`;
  },

  // ---------- Oficios ----------
  s_oficios() {
    return `<section class="armorial dd"><div class="ar-head dd-head"><small class="kicker">${I('anvil', 20)} Material didáctico</small><h1>Oficios de antes</h1>
      <p>Cómo se hacían las cosas cuando no había máquinas: quién hacía cada trabajo, con qué herramientas, en castellano y en euskera, cómo se trabajaba paso a paso y cómo es hoy. Cada paso lleva una pregunta con su respuesta.</p></div>
      <div class="dd-grid dd-wide">${Object.keys(OFICIOS).map(k => this.d_oficio(k)).join('')}</div></section>`;
  },

  // ---------- Producto local y campo ----------
  s_productos() {
    const proc = LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'process').map(m => ({ l, m })));
    const harv = LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'harvest').map(m => ({ l, m })));
    const herd = LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'herd' && m.story).map(m => ({ l, m })));
    return `<section class="armorial dd"><div class="ar-head dd-head"><small class="kicker">${I('cheese', 20)} Material didáctico</small><h1>Producto local y campo</h1>
      <p>Lo que se cultiva, se cría y se elabora en cada comarca: cómo se hace, cómo era antes y cómo es ahora.</p></div>
      ${sec('star', 'El producto estrella de cada comarca')}<div class="dd-grid">${COMARCAS.filter(c => STAR[c.id]).map(c => block('star', c.name, STAR[c.id].name, P(STAR[c.id].text), { eu: STAR[c.id].eu })).join('')}</div>
      ${sec('basket', 'Cómo se hace')}<div class="dd-grid">${proc.map(({ l, m }) => this.d_mision(l, m).replace('</article>', where([l.id]) + '</article>')).join('')}</div>
      ${sec('wheat', 'Las cosechas')}<div class="dd-grid">${harv.map(({ l, m }) => this.d_mision(l, m).replace('</article>', where([l.id]) + '</article>')).join('')}</div>
      ${sec('sheep', 'Ganadería')}<div class="dd-grid">${[PASTOR_INFO('atlantic'), PASTOR_INFO('ribera'), VAQUERA_INFO].map((X, i) => block(X.icon, 'Ganadería', X.title, Ps(X.lines) + aa(X.then, X.now), { sub: ['Montaña', 'Ribera y Zona Media', ''][i] })).join('')}
        ${herd.map(({ l, m }) => this.d_mision(l, m).replace('</article>', where([l.id]) + '</article>')).join('')}</div>
      ${sec('cow', 'Los animales de la granja')}<div class="dd-grid">${Object.values(PET).filter(Boolean).map(X => block(X.icon, '', X.title, P(X.fact))).join('')}</div>
      ${sec('backpack', 'Comida para el monte')}<div class="dd-grid">${Object.values(FOOD).filter(f => f.fact).map(f => block(f.icon, '', f.name, P(f.fact))).join('')}</div>
      ${sec('basket', 'Del campo y la ganadería')}<ul class="dd-goods">${Object.values(GOODS).map(g => `<li>${I(g.icon, 30)}<b>${esc(g.name)}</b><i data-notr lang="eu">${esc(g.eu)}</i></li>`).join('')}</ul></section>`;
  },

  // ---------- Historia y arquitectura ----------
  s_historia() {
    const H = CUENTOS.filter(C => C.kind === 'historia');
    const kinds = Object.entries(KIND_TIP);
    return `<section class="armorial dd"><div class="ar-head dd-head"><small class="kicker">${I('castle', 20)} Material didáctico</small><h1>Historia y arquitectura</h1>
      <p>De los primeros pastores que levantaron los dólmenes a los vascones de Irulegi, los castillos del reino y los monumentos de los pueblos: qué son y cómo reconocerlos.</p></div>
      ${sec('dolmen', 'Los primeros pobladores')}<div class="dd-grid">${Object.keys(SITES).map(k => this.d_site(k)).join('')}</div>
      ${sec('castle', 'Los castillos')}<div class="dd-grid">${block('castle', 'Castillo', 'Las partes de un castillo', `<ul class="dd-ul dd-finds">${Object.values(PARTS).map(p => `<li><b>${esc(p.name)}</b> <span>${esc(p.text)}</span></li>`).join('')}</ul>` + quiz(CASTLE_QUIZ))}
        ${Object.keys(CASTLE_TOWNS).map(k => this.d_castillo(k)).join('')}
        ${block('castle', 'Ruta de los castillos', 'Castillos de Navarra', P('Después de la conquista de Navarra muchos castillos se derribaron. Estos son algunos de los que quedan, en pie o en ruinas:') + `<ul class="dd-ul dd-finds">${CASTILLOS.map(([n, t]) => `<li><b>${esc(n)}</b> <span>${esc(t)}</span></li>`).join('')}</ul>`)}</div>
      ${sec('church', 'Cómo reconocer una iglesia')}<div class="dd-grid">${[...Object.values(STYLE_TIP), ...Object.values(LABEL_TIP)].map(t => `<article class="dd-b dd-tipb">${I('church', 30)}${P(t)}</article>`).join('')}</div>
      ${sec('visit', 'Monumentos de los pueblos')}<div class="dd-grid">${kinds.map(([k, t]) => `<article class="dd-b dd-tipb">${I(LM_ICON[k] || k, 30)}${P(t)}</article>`).join('')}</div>
      ${sec('book', 'Historias que pasaron de verdad')}<div class="dd-grid dd-cts">${H.map(C => this.d_cuento(C)).join('')}</div>
      <p class="dd-more"><button type="button" class="btn ghost" data-go="personajes">${I('book', 22)} Los personajes de la historia de Navarra</button><button type="button" class="btn ghost" data-go="escudos">${I('shield', 22)} Los escudos y cómo se leen</button></p></section>`;
  },

  // ---------- Palabras en euskera ----------
  s_euskera() {
    // (las dos columnas tal cual: el traductor no las toca, ni en euskera ni al ver el castellano)
    const tab = (rows) => `<table class="dd-voc"><tbody>${rows.map(([eu, es, d = '']) => `<tr><th data-notr lang="eu">${esc(eu)}</th><td data-notr lang="es">${esc(es)}</td>${d ? `<td class="dd-vd">${esc(d)}</td>` : ''}</tr>`).join('')}</tbody></table>`;
    const both = (name) => { const [a, b] = name.split(' / '); return b ? [b, a] : null; };
    const fauna = allFichas('fauna').filter(d => d.F.eu).map(d => [d.F.eu, d.F.name]), flora = allFichas('flora').filter(d => d.F.eu).map(d => [d.F.eu, d.F.name]);
    const S = [['talk', 'Saludos', [['Kaixo', 'Hola'], ...Object.entries(KAIXO_ES), ['Ongi etorri', 'Bienvenida, bienvenido'], ['Eskerrik asko', 'Gracias'], ['Agur', 'Adiós']]],
      ['anvil', 'Oficios', Object.values(OFICIOS).map(o => [o.eu, o.name])],
      ['hammer', 'Herramientas de los oficios', Object.values(OFICIOS).flatMap(o => o.tools.map(([es, eu, d]) => [eu, es, d]))],
      ['music', 'Instrumentos', INSTRUMENTOS.map(x => [x.eu, x.name])],
      ['cheese', 'Productos', [...Object.values(STAR).map(s => [s.eu, s.name]), ...Object.values(GOODS).map(g => [g.eu, g.name])]],
      ['mask', 'Seres de leyenda y carnaval', FIGURAS.filter(f => f.eu && f.eu !== f.name).map(f => [f.eu, f.name])],
      ['bird', 'Animales', fauna], ['leaf', 'Árboles y plantas', flora],
      ['church', 'Pueblos', LEVELS.map(l => both(l.name)).filter(Boolean)],
      ['map', 'Comarcas', COMARCAS.map(c => both(c.full || c.name)).filter(Boolean)]];
    return `<section class="armorial dd"><div class="ar-head dd-head"><small class="kicker">${I('talk', 20)} Material didáctico</small><h1>Palabras en euskera</h1>
      <p>Las palabras en euskera que salen en el juego, con su traducción: para saludar, los oficios y sus herramientas, los instrumentos, los productos, los animales y las plantas, y los nombres de los pueblos y las comarcas.</p></div>
      ${S.filter(s => s[2].length).map(([ic, t, rows], i) => `<details class="dd-vsec"${i < 2 ? ' open' : ''}><summary>${I(ic, 28)}<b>${esc(t)}</b><small>${rows.length}</small></summary>${tab(rows)}</details>`).join('')}</section>`;
  },
};
