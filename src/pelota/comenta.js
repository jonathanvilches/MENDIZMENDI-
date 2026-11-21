// Los comentarios del partido de pelota, como en la tele: Mikel narra (la jugada, los nombres, el marcador) y Edurne, que
// jugó a pelota, lo explica y cuenta historias del frontón, de los pelotaris y de la pelota en Navarra. Todas las frases
// están grabadas con sus voces (guionVoz.js: ElevenLabs, noviembre de 2026; antes, la voz del autor, que se guarda en
// old/voz-autor) y se oyen (voz.js); escritas, solo con los subtítulos de Ajustes. Cada frase tiene su clave, que es el
// nombre de su archivo (src/assets/voz/hombre/es/t-dejada-txoko-1.mp3), y se eligen por grupos: «t-dejada-txoko» son las
// de Mikel cuando una dejada al rincón gana el tanto y «t-dejada-txoko-e», la explicación de Edurne. Nunca se repite la
// última de un grupo, y las que se cuentan una vez (la historia del frontón, la vida de un pelotari, un diálogo) no se
// repiten en el mismo partido. Con nombre propio, solo los pelotaris de la plantilla (pelotariFig.js), cada uno con su
// pueblo fijo; con otro nombre, las frases sin nombre. Solo hay grabación en castellano: en euskera también se oye así.
import { GUION } from './guionVoz.js';
import { duoElegido, ponDuo } from '../util/comentarios.js';
export { duoElegido, ponDuo };

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
// (el grupo de una clave: sin su número final; «-e2» queda en «-e», las explicaciones de Edurne)
const base = (k) => (/-e\d+$/.test(k) ? k.replace(/\d+$/, '') : k.replace(/-\d+$/, ''));
const G = new Map(), DLG = new Map();
for (const k of Object.keys(GUION)) {
  // (las versiones en femenino, «<clave>-f», no forman grupo: salen en lugar de su clave cuando hablan de una chica, fem())
  if (/-f$/.test(k)) continue;
  // (los diálogos, «d-<tema>-<n>-<turno>»: cada uno con sus turnos en orden)
  const d = /^d-(.+)-(\d+)-(\d+)$/.exec(k);
  if (d) { if (!DLG.has(d[1])) DLG.set(d[1], new Map()); const T = DLG.get(d[1]); if (!T.has(d[2])) T.set(d[2], []); T.get(d[2])[+d[3] - 1] = k; continue; }
  const b = base(k); if (!G.has(b)) G.set(b, []); G.get(b).push(k);
}
// (las frases de toda la lista de grupos, para el guion de grabación: tools/corta-voz.mjs)
export const F = { es: Object.fromEntries([...G].map(([g, L]) => [g, L.map(k => [GUION[k][0] === 'M' ? 'n' : 'e', GUION[k][1]])])) };

// El frontón del partido para sus frases (f-<sede>-k, la de Mikel al empezar; f-<sede>-1 y -2, la historia que cuenta
// Edurne): el Labrit, el cubierto o la plaza de los pueblos con sede de campeonato, o «fuera», en el frontón del rival.
// venue: el nombre del frontón (sin nombre, la plaza del pueblo: fronton.js, playPelota); town: el pueblo
const SEDES = [['iruna', /iruna|pamplona/], ['lesaka', /lesaka/], ['leitza', /leitza/], ['gares', /gares|puente la reina/], ['elizondo', /elizondo|baztan/],
  ['sanguesa', /sanguesa|zangoza/], ['estella', /estella|lizarra/], ['tafalla', /tafalla/], ['marcilla', /marcilla/]];
export function sedeVoz(venue, town, fuera = false) {
  if (fuera) return 'fuera';
  const v = fold(venue), t = fold(town);
  if (/labrit/.test(v)) return 'labrit';
  const s = SEDES.find(([, re]) => re.test(t) || re.test(v))?.[0]; if (!s) return null;
  return !v && G.has(`f-${s}-plaza-k`) ? `${s}-plaza` : s;
}
// (el pueblo que dice la presentación grabada de cada uno, «Y enfrente, Unai, de Tafalla.»: sus frases solo valen para ese
// Unai. Antes bastaba con el nombre, y un Unai de otro pueblo, o el propio jugador si se llamaba Ane, salían presentados
// con el pueblo de la grabación. El autor, el 14 de noviembre de 2026: «falla con el nombre y la procedencia del pelotari»)
const PUEBLO_VOZ = {};
for (const k of Object.keys(GUION)) { const m = /^n-presenta-b-(.+)$/.exec(k), t = m && /, de ([^.]+)\.?\s*$/.exec(GUION[k][1]); if (t) PUEBLO_VOZ[m[1]] = fold(t[1]); }
const mismoPueblo = (a, b) => { const x = fold(a).split(/[\s/-]+/)[0], y = fold(b).split(/[\s/-]+/)[0]; return !!x && !!y && (x === y || fold(a).includes(fold(b)) || fold(b).includes(fold(a))); };
/** El pelotari de la plantilla con frases propias para un nombre («Unai», «Unai (Tafalla)») y el pueblo con el que sale en
 *  el partido, o null si no es él (otro pueblo, o sin pueblo cuando su grabación dice uno) */
export function pelotariVoz(name, town = '') {
  const id = fold(String(name || '').split(/[,·(]/)[0]).split(/\s+/)[0]; if (!G.has(`n-tanto-${id}`)) return null;
  const pv = PUEBLO_VOZ[id], tw = town || (/\(([^)]+)\)/.exec(String(name || ''))?.[1] ?? '');
  return !pv || mismoPueblo(pv, tw) ? id : null;
}
// (la ronda de un campeonato, para su frase)
const ronda = (r = '') => (/semi/i.test(r) ? 'semis' : /cuartos/i.test(r) ? 'cuartos' : /octavos/i.test(r) ? 'octavos' : /final$/i.test(r) ? 'final' : /liguilla|jornada/i.test(r) ? 'liguilla' : null);
// (el golpe que gana el tanto: el grupo de Mikel; la explicación de Edurne es el mismo con «-e»)
const GANA = (kind, sub) => kind === 'saque' ? 't-saque' : kind === 'dejada' ? (sub === 'dejadaAncho' ? 't-dejada-ancho' : 't-dejada-txoko')
  : kind === 'cortada' ? (sub === 'cortDos' ? 't-cortada-2p' : sub === 'cortAncho' ? 't-cortada-ancho' : sub === 'cortPared' ? 't-cortada-pared' : 't-hueco')
  : kind === 'dosparedes' ? 't-dosparedes' : kind === 'gancho' ? 't-gancho-ancho'   // (el gancho, siempre a la contracancha: ya no hay «gancho a la pared»)
  : kind === 'volea' ? 't-volea' : kind === 'largo' || kind === 'rebote' ? 't-largo' : 't-hueco';
// (el fallo que pierde el tanto: el canto del juez, game.js)
const FALLO = { chapa: 'e-chapa', alta: 'e-alta', pared: 'e-fuera', lado: 'e-fuera', ladoIzq: 'e-fuera', red: 'e-fuera', fuera: 'e-fuera', largo: 'e-largo', falta: 'e-falta', falta45: 'e-falta45', pasa: 'e-pasa', pasa45: 'e-pasa45', cuatro: 'e-cuatro' };
const FALLO_E = { chapa: 'e-chapa-e', alta: 'e-alta-e', pared: 'e-fuera-e', lado: 'e-fuera-e', ladoIzq: 'e-fuera-e', red: 'e-fuera-e', fuera: 'e-fuera-e', largo: 'e-fuera-e', falta: 'e-falta-e', pasa: 'e-pasa-e', cuatro: 'e-cuatro-e' };
const VISTOSO = new Set(['t-gancho-ancho', 't-cortada-2p', 't-dosparedes', 't-volea']);
const ROL = { M: 'Mikel', E: 'Edurne' };
// Las frases grabadas en masculino que hablan de un pelotari concreto («el rival», «cansado», «tranquilo», «un rematador»):
// con una chica suena su versión en femenino, la misma clave con «-f» («Es una rematadora», «la rival», «cansada»),
// grabada con la misma voz. De quién hablan: 'rival', tu rival; 'yo', tú; 'pierde', quien ha perdido el tanto; 'gana',
// quien lo ha ganado; 'mano', quien anda fino con una mano (manoQuien); 'cansado', el que va cansado (cansadoQuien). Si
// no se sabe de quién, o si no está su versión, con una chica en la cancha se callan (sale otra del grupo o un silencio).
// El autor, el 21 de noviembre de 2026: «en las frases de pelota también hay que cambiar el género para cuando se refiera
// a un chico o a una chica pelotari» y «graba las voces de pelota para las chicas pelotaris».
const ELLA = {
  'rival-rematador': 'rival', 'rival-defensor': 'rival', 'est-favorito': 'rival', 'm-final-rival-1': 'rival', 'r-consejo-2': 'rival',
  'r-consejo-3': 'rival', 'r-consejo-4': 'rival', 'r-consejo-6': 'rival', 'r-consejo-7': 'rival', 'd-descanso-2-2': 'rival',
  't-dejada-txoko-e': 'pierde', 't-dejada-ancho-e': 'pierde', 't-dosparedes-e': 'pierde', 't-volea-e': 'pierde', 't-largo-e': 'pierde',
  't-saque-e': 'pierde', 't-hueco-e1': 'pierde', 't-hueco-e2': 'pierde', 't-encima-e2': 'pierde', 'm-corta-e': 'pierde', 'm-escapa-e': 'pierde',
  'd-tanto-3-2': 'pierde', 'm-ventaja-e': 'gana', 'e-cuatro-e': 'gana', 'm-salva-1': 'gana',
  'm-cansado-1': 'cansado', 'est-lider': 'yo', 'r-derecha-2': 'mano', 'r-izquierda-2': 'mano' };
/** ¿De quién habla la frase, de un chico o de una chica? 'chico', 'chica' o null (no se sabe). c.chica: { you, rival }
 *  (match.js); c.w: quien ha ganado el tanto ('you' o 'rival'); c.manoQuien y c.cansadoQuien ('you', 'rival' o 'ambos') */
function deQuien(k, c) {
  const q = ELLA[k], ch = c?.chica; if (!q || !ch || (!ch.you && !ch.rival)) return 'chico';
  const de = (w) => (w === 'you' || w === 'rival' ? (ch[w] ? 'chica' : 'chico') : null);
  const otro = (w) => (w === 'you' ? 'rival' : w === 'rival' ? 'you' : null);
  if (q === 'rival') return de('rival');
  if (q === 'yo') return de('you');
  if (q === 'gana') return de(c.w);
  if (q === 'pierde') return de(otro(c.w));
  if (q === 'mano') return de(c.manoQuien);
  if (q === 'cansado') return c.cansadoQuien === 'ambos' ? (ch.you && ch.rival ? 'chica' : null) : de(c.cansadoQuien);
  return null;
}

export class Comentarios {
  /** lang: 'es' o 'eu'; voz: 'duo' (los dos), 'hombre' (solo Mikel), 'mujer' (solo Edurne) o 'no' (por defecto, lo de Ajustes) */
  constructor(lang = 'es', voz = duoElegido()) {
    this.lang = lang === 'eu' ? 'eu' : 'es'; this.voz = voz === 'no' ? null : voz; this.ult = {}; this.dichas = new Set(); this.n = 0; this.rec = []; this.gUso = {};
  }
  get on() { return !!this.voz; }
  // (con un solo comentarista, solo sus frases; los diálogos, solo con los dos)
  puede(q) { return this.voz === 'duo' || (q === 'M' ? this.voz === 'hombre' : this.voz === 'mujer'); }
  hay(g) { return (G.get(g) || []).some(k => this.puede(GUION[k][0])); }
  item(k, g) { const q = GUION[k][0]; return { id: k, g, texto: GUION[k][1], rol: ROL[q], r: q === 'M' ? 'n' : 'e', voz: q === 'M' ? 'hombre' : 'mujer', lang: 'es', estricta: true }; }
  azar(p) { return Math.random() < p; }
  /** Una frase del grupo g, sin repetir la última del grupo; una: solo si aún no se ha dicho en este partido; q: solo de
   *  Mikel ('M') o de Edurne ('E'), en los grupos con frases de los dos. { id, texto, … } o null */
  frase(g, una = false, q = null) {
    if (!this.voz || !g) return null;
    // (con herramienta, en el trinquete: fuera las frases que hablan de la mano o de jugar a mano; match.js, sinMano)
    let L = (G.get(g) || []).filter(k => this.puede(GUION[k][0]) && (!q || GUION[k][0] === q) && !(una && this.dichas.has(k)) && !(this.sinMano && /\bmanos?\b/i.test(GUION[k][1]))
      && !(this.tiene && !this.tiene(this.item(this.fem(k), g))) && !this.fuera(k));
    // (contra la repetición, desde el 16 de noviembre de 2026; el autor: «los comentarios son muy repetitivos». Ninguna de las
    // 40 últimas que se han oído, si queda otra; y los grupos de jugada, tanto y relleno que solo tienen una o dos frases se
    // callan durante seis tantos después de usarse, y los de una sola frase, ocho: mejor un silencio que otra vez lo mismo.
    // El 17 de noviembre el autor lo vio aún repetitivo: antes eran 24 y cuatro tantos. La presentación, el tanto de
    // partido, el descanso y el final no esperan)
    const enGrupo = L.length;
    if (L.length > 1) L = L.filter(k => k !== this.ult[g]);
    if (L.length > 1) { const N = L.filter(k => !this.rec.includes(k)); if (N.length) L = N; }
    if (!L.length) return null;
    if (/^(j|t|e|r|o)-|^m-(racha|corta|iguala|igualado|escapa|remonta|empieza|mitad|ados|atres|cansado)/.test(g) && enGrupo <= 2 && this.n - (this.gUso[g] ?? -99) < (enGrupo === 1 ? 8 : 6)) return null;
    const k = L[Math.floor(Math.random() * L.length)]; this.ult[g] = k; this.dichas.add(k); this.gUso[g] = this.n;
    this.rec.push(k); if (this.rec.length > 40) this.rec.shift();
    return this.item(this.fem(k), g);
  }
  // (las que no vienen a cuento en este partido: el consejo contra un zurdo si el rival no lo es, el de la pared izquierda en
  // una plaza sin ella, el de las cortadas seguidas si nadie las encadena; y las de la grada en pie o en silencio, que solo
  // valen tras un tanto de los que levantan al público o en un final apretado, no en mitad de cualquier cosa: tanto() y
  // tantoPartido() las piden con ctx.grada)
  // (de quién habla la frase en este momento: el contexto del tanto o del relleno, con las chicas del partido)
  quien(k) { const c = this.ctx || {}; return deQuien(k, { ...c, chica: c.chica || this.chica, w: c.w ?? this.w }); }
  // (la clave que suena: su versión en femenino si habla de una chica y está grabada)
  fem(k) { return ELLA[k] && GUION[k + '-f'] && this.quien(k) === 'chica' ? k + '-f' : k; }
  fuera(k) {
    const c = this.ctx || {};
    if (ELLA[k]) { const q = this.quien(k); if (q === null || (q === 'chica' && !GUION[k + '-f'])) return true; }
    if (k === 'r-consejo-7' && !c.zurdo) return true;
    if ((k === 'r-consejo-5' || /^j-pared-saca/.test(k)) && c.cancha === 'plaza') return true;
    if (k === 'r-energia-2' && !((c.cortadas || 0) >= 4)) return true;
    if (/^r-grada-(3|6|7)$/.test(k) && c.grada !== k) return true;
    return false;
  }
  // (la explicación de Edurne tras un tanto: mejor una que aún no ha dicho en este partido; si ya las ha dicho todas, solo a
  // veces la repite. Una explicación larga oída tres veces en un partido cansa más que una frase corta de Mikel)
  explica(g, otro = null) {
    const f = this.frase(g, true) || (otro && this.frase(otro, true)); if (f) return f;
    return this.azar(0.3) ? this.frase(g) || (otro && this.frase(otro)) : null;
  }
  /** Un diálogo del tema entre los dos (solo con los dos): sus turnos en orden, o null. Cada uno, una vez por partido */
  dialogo(tema) {
    if (this.voz !== 'duo') return null;
    const T = DLG.get(tema); if (!T) return null;
    const L = [...T.entries()].filter(([n, ks]) => !this.dichas.has(`d-${tema}-${n}`) && !(this.sinMano && ks.some(k => k && /\bmanos?\b/i.test(GUION[k][1]))) && !ks.some(k => k && this.fuera(k))); if (!L.length) return null;
    const [n, ks] = L[Math.floor(Math.random() * L.length)]; this.dichas.add(`d-${tema}-${n}`);
    return ks.filter(Boolean).map(k => this.item(this.fem(k), `d-${tema}`));
  }
  // (varias frases seguidas, cada una al acabar la anterior: voz.js, sigue; sin las que no haya)
  seguidas(...L) { const s = L.flat(Infinity).filter(Boolean); return s.length > 1 ? s : s[0] || null; }
  // (la frase con nombre, si el pelotari tiene las suyas)
  nombre(tipo, id) { return id ? this.frase(`n-${tipo}-${id}`) : null; }
  // (lo que cuenta Edurne de un pelotari: Mikel se lo pide y ella lo cuenta; con uno solo, el que lo tenga)
  bio(id) { if (!id) return null; const b = this.frase(`b-${id}`, true); if (!b) return null; return this.seguidas(this.frase(`d-pelotari-${id}`, true), b); }

  /** La presentación, seguida, al empezar el partido. o: { sede (sedeVoz), camp: { kind, ronda }, yo, rival (pelotariVoz),
   *  arq, estrella (los del rival: rules.js, pelotariArq) } */
  presenta(o = {}) {
    if (!this.voz) return null;
    const s = [(this.azar(0.6) && this.dialogo('inicio')) || this.frase('inicio')];
    if (o.sede) s.push(this.frase(`f-${o.sede}-k`));
    if (o.camp) { const r = ronda(o.camp.ronda); if (r) s.push(this.frase(`ronda-${r}`)); s.push(this.frase(`camp-${o.camp.kind}`)); }
    if (o.yo && o.rival) s.push(this.frase(`n-presenta-a-${o.yo}`), this.frase(`n-presenta-b-${o.rival}`));
    else if (o.rival) s.push(this.frase(`n-presenta-b-${o.rival}`));
    s.push(this.azar(0.5) ? this.frase(`rival-${o.arq}`) : this.frase(`estrella-${o.estrella}`));
    return this.seguidas(s);
  }
  /** Al sacar: el primer saque del partido o, a veces, quién saca (id) */
  saque(primero, id) { return primero ? this.frase('saque') : this.nombre('saque', id); }

  /** Lo que se dice al acabar un tanto (no el último: final). x: el tanto del registro (game.js, stats.log: w, call, kind,
   *  sub, hits); o: { yo, rival (pelotariVoz), racha ('seguidos', 'iguala', 'remonta' o ''), n (seguidos), corta (corta la
   *  racha del otro), empieza, escapa, mitad, salva, yaDicho (la jugada ya se comentó en el peloteo), y lo del relleno } */
  tanto(x, o = {}) {
    if (!this.voz || !x) return null;
    this.n++; this.ctx = o; this.w = x.w;
    const quien = x.w === 'you' ? o.yo : o.rival, otro = x.w === 'you' ? o.rival : o.yo, duo = this.voz === 'duo';
    if (o.salva) return this.seguidas(this.frase('m-salva'), this.azar(0.5) && this.frase('m-salva-e'));
    // (el marcador, desde el 16 de noviembre de 2026, con las ideas del autor: «está a dos tantos»; la primera vez que el que
    // va por delante se queda a dos del final, y alguna vez a tres)
    if (o.ados) { const f = this.seguidas(this.frase('m-ados'), this.azar(0.4) && this.frase('m-ados-e')); if (f) return f; }
    if (o.atres && this.azar(0.5)) { const f = this.frase('m-atres'); if (f) return f; }
    if (o.racha === 'iguala') return this.seguidas(this.frase('m-iguala'), this.azar(0.4) && this.frase('m-iguala-e'));
    if (o.racha === 'remonta') return (duo && this.azar(0.3) && this.dialogo('remonta')) || this.seguidas((this.azar(0.6) && this.nombre('remonta', quien)) || this.frase('m-remonta'), this.azar(0.5) && this.frase('m-remonta-e'));
    if (o.empieza) return this.frase('m-empieza');
    if (o.racha === 'seguidos' && o.n >= 3) return (duo && o.n === 4 && this.azar(0.4) && this.dialogo('racha')) || (this.azar(0.5) && this.nombre('racha', quien)) || this.seguidas(this.frase('m-racha', false, 'M'), this.azar(0.5) && this.frase('m-racha', false, 'E'));
    if (o.corta) return this.seguidas(this.frase('m-corta'), this.azar(0.5) && this.frase('m-corta-e'));
    if (o.escapa) return this.seguidas(this.frase('m-escapa'), this.frase(this.azar(0.5) ? 'm-escapa-e' : 'm-ventaja-e'));
    if (o.mitad) return this.seguidas(this.frase('m-mitad'), this.azar(0.5) && this.frase('m-mitad-e'));
    // (tras un peloteo largo: «¡por fin se acaba!» y lo que explica Edurne; a veces lo hablan entre ellos)
    // (más charla entre los dos: el autor, 17 de noviembre de 2026, «me hace falta más dinamismo entre los locutores»)
    if (x.hits >= 10) return (duo && this.azar(0.5) && (this.dialogo('peloteo') || this.dialogo('tanto'))) || this.seguidas(this.azar(0.5) && this.frase('t-peloteo'), this.explica('t-peloteo-e'));
    if (x.hits >= 6 && duo && this.azar(0.4)) { const d = this.dialogo('tanto'); if (d) return d; }
    // (si en el peloteo ya se comentó la jugada, no se repite: quién gana el tanto, algo de relleno o nada)
    if (o.yaDicho) return this.azar(0.4) ? this.nombre('tanto', quien) : this.azar(0.4) ? this.relleno(o) : null;
    // (de los demás, alguno con relleno en vez de la jugada y alguno sin nada, para que no se haga pesado)
    const r = Math.random();
    // (desde la noche del 14 de noviembre de 2026, Edurne habla más: «solo habla Miquel y se me queda muy soso el partido»;
    // más relleno, que es casi todo suyo, y su explicación detrás de la jugada dos de cada tres veces en vez de dos de cinco)
    if (r < 0.28) return this.relleno(o);
    if (r < 0.34) return null;
    if (x.call === 'bote') {
      // («¡vaya resto de saque!»: el tanto lo gana el resto, el segundo golpe del peloteo; «le ha pasado la pelota por
      // encima»: lo gana una pelota larga que pasa por encima del otro)
      if (x.hits === 2 && x.kind !== 'saque') { const f = this.seguidas(this.frase('t-resto'), this.azar(0.5) && this.frase('t-resto-e')); if (f) return f; }
      if ((x.kind === 'largo' || x.kind === 'rebote') && this.azar(0.55)) { const f = this.seguidas(this.frase('t-encima'), this.azar(0.4) && this.frase('t-encima-e')); if (f) return f; }
      const g = GANA(x.kind, x.sub);
      // (tras un golpe de los que levantan a la grada, a veces la grada en pie)
      if (VISTOSO.has(g) && this.azar(0.22)) { this.ctx = { ...o, grada: this.azar(0.5) ? 'r-grada-7' : 'r-grada-3' }; const f = this.seguidas(this.frase(g), this.frase('r-grada')); this.ctx = o; if (f) return f; }
      const m = (this.azar(VISTOSO.has(g) ? 0.3 : 0.2) && this.nombre(VISTOSO.has(g) ? 'golazo' : 'tanto', quien)) || this.frase(g);
      // (y Edurne contesta casi siempre que tiene algo que decir: tres de cada cuatro)
      return this.seguidas(m, this.azar(0.75) && this.explica(`${g}-e`, g === 't-gancho-ancho' ? 't-gancho-e' : null));
    }
    const m = (this.azar(0.2) && this.nombre('falla', otro)) || this.frase(FALLO[x.call] || 'e-fallo');
    return this.seguidas(m, this.azar(0.7) && this.explica(FALLO_E[x.call] || 'e-fallo-e'));
  }
  /** El tanto de partido: ambos (los dos a un tanto) o el de quien está a uno (id) */
  tantoPartido(ambos, id) {
    if (!this.voz) return null;
    if (ambos) { if (this.azar(0.35)) { this.ctx = { ...(this.ctx || {}), grada: 'r-grada-6' }; const f = this.seguidas(this.frase('m-ultimo'), this.frase('r-grada')); this.ctx = { ...this.ctx, grada: null }; if (f) return f; } return this.frase('m-ultimo'); }
    return this.seguidas((this.azar(0.5) && this.nombre('partido', id)) || this.frase('m-tantopartido'), this.azar(0.35) && this.frase('m-tantopartido-e'));
  }
  /** El descanso de un minuto */
  descanso() { return (this.azar(0.5) && this.dialogo('descanso')) || this.frase('m-descanso'); }
  /** Al acabar el partido. o: { gano (has ganado tú), ganador (pelotariVoz), txapela (gana la final del campeonato),
   *  pasa (pasas de ronda), fuera (quedas fuera), justo, claro, vuelta (cómo ha sido: ajustado, sin historia, remontado) } */
  final(o = {}) {
    if (!this.voz) return null;
    const s = [this.nombre(o.txapela ? 'txapela' : 'gana', o.ganador) || this.frase(o.txapela ? 'm-txapela' : o.gano ? 'm-final-yo' : 'm-final-rival')];
    s.push(this.frase(o.txapela ? 'm-txapela-e' : o.vuelta ? 'm-final-vuelta-e' : o.justo ? 'm-final-justo-e' : o.claro ? 'm-final-claro-e' : o.gano ? 'm-final-yo-e' : 'm-final-rival-e'));
    if (o.pasa) s.push(this.frase('m-pasa'), this.azar(0.5) && this.frase('m-pasa-e')); else if (o.fuera) s.push(this.frase('m-fuera-e'));
    s.push(o.txapela ? this.dialogo('txapela') : this.dialogo('final'));
    return this.seguidas(s);
  }
  /** Durante el peloteo, una frase corta del golpe que se acaba de dar (e, el evento 'hit' de game.js, con anim: la figura
   *  del golpe, match.js swingAnim; n, los golpes del peloteo; prof, lo hondo que está quien golpea, en metros desde el
   *  frontis). Como mucho una cada pocos segundos (t, el reloj del partido) y no siempre; el gancho, siempre que pueda */
  // (el golpe por lo que hace de verdad la pelota: e.real y e.realSub, game.js nombreReal. El gancho, siempre de izquierda
  // a derecha, a la contracancha; la dejada, la que bota pegada al frontis; atrás, la que bota al fondo. El autor, 17 de
  // noviembre de 2026: «los comentarios de golpeos no se adaptan al golpeo real del jugador». Lo que se quería hacer, e.shot,
  // solo si no hay e.real)
  enJuego(e, n, t, prof = 0) {
    const kind = e?.real ?? e?.shot, sub = e?.real != null ? (e.realSub || '') : (e?.sub || ''), gancho = kind === 'gancho';
    if (!this.voz || !e || (n < 2 && !gancho && !/^saque(Cortado|Pared|Ancho)$/.test(e.sub || '')) || t - (this.jT ?? -99) < (gancho ? 2.5 : 5.5)) return null;
    const an = e.anim || '';
    let g = null;
    if (e.sub === 'saqueCortado') g = 'j-saque-cortado';
    // (el saque pegado a la pared o abierto al ancho, a veces: game.js, serve)
    else if (e.sub === 'saquePared' || e.sub === 'saqueAncho') g = this.azar(0.5) ? (e.sub === 'saquePared' ? 'j-saque-pared' : 'j-saque-ancho') : null;
    else if (gancho) g = this.azar(0.5) ? 'j-gancho-ancho' : 'j-gancho';
    else if (kind === 'dejada' && e.q > 0.45) g = sub === 'dejadaAncho' ? 'j-dejada-ancho' : 'j-dejada-txoko';
    else if (kind === 'cortada' && e.q > 0.45) g = sub === 'cortDos' ? 'j-cortada-2p' : sub === 'cortAncho' ? 'j-cortada-ancho' : 'j-cortada-pared';
    else if (kind === 'dosparedes') g = 'j-dosparedes';
    // («¡atrás!», «¡pelota atrás!»: la pelota que bota al fondo; el autor, 16 de noviembre de 2026. Solo si bota de verdad
    // pasado el cuadro 6: con e.real, «largo» y «rebote» ya lo dicen)
    else if (kind === 'rebote') g = this.hay('j-atras') && this.azar(0.6) ? 'j-atras' : 'j-rebote';
    else if (kind === 'largo' && (e.real != null || (e.pow ?? 0) > 0.85)) g = this.hay('j-atras') && this.azar(0.6) ? 'j-atras' : 'j-largo';
    // («¡qué bien ha sacado esa pelota de la pared!»: la saca pegada a la pared izquierda, ya en el peloteo)
    else if (e.pared && n > 2 && this.hay('j-pared-saca')) g = 'j-pared-saca';
    else if (e.volea && e.q > 0.4) g = 'j-aire';
    else if (/^Besagain/.test(an)) g = 'j-besagain';
    else if (/^BotePronto/.test(an)) g = 'j-botepronto';
    else if (n === 2 && e.q > 0.55) g = 'j-resto';
    else if (prof > 25 && n > 3 && (e.q ?? 0) > 0.5) g = this.azar(0.5) ? 'j-defensa' : 'j-llega';
    else if (/^Low/.test(an) && n > 3) g = 'j-sotamano';
    else if (n === 8) g = 'j-peloteo';
    else if (kind === 'pared' && e.q > 0.6) g = 'j-pared';
    else if (kind === 'ancho' && e.q > 0.6) g = 'j-ancho';
    if (!g || (!gancho && g !== 'j-saque-cortado' && !this.azar(g === 'j-peloteo' ? 0.8 : g === 'j-pared' || g === 'j-ancho' ? 0.2 : 0.38))) return null;
    // (y en el peloteo, a veces la reacción es de Edurne y no de Mikel: sus frases cortas de jugada, «j-…-e»; con «Solo
    // Edurne», siempre las suyas. Desde el 17 de noviembre se turnan: si la última fue de Mikel, casi siempre contesta ella)
    const ge = /^j-gancho/.test(g) ? 'j-gancho-e' : `${g}-e`, deElla = this.hay(ge) && (this.voz === 'mujer' || (this.voz === 'duo' && this.azar(this.jQ === 'M' ? 0.7 : 0.25)));
    const f = (deElla && this.frase(ge)) || this.frase(g); if (f) { this.jT = t; this.jQ = f.r === 'e' ? 'E' : 'M'; } return f;
  }
  /** Algo entre tanto y tanto, según cómo va el partido, para que no se haga el silencio: la historia del frontón, la de
   *  los pelotaris, cómo llega cada uno, la pelota, la mano, la grada, consejos y, con los dos, alguna charla entre ellos.
   *  o: { sede, yo, rival, est, bola ('viva', 'pesada' o 'media'), mano (tantos seguidos), igualado, tantos, cansado,
   *  cuatro, parejas, campeonato, laFinal, zurdo } */
  relleno(o = {}) {
    if (!this.voz) return null;
    this.ctx = o; this.w = null;
    const ops = [], add = (w, k, f) => { if (k !== this.ultR) for (let i = 0; i < w; i++) ops.push([k, f]); };
    // (lo nuevo del 16 de noviembre de 2026, con las ideas del autor, y antes que lo demás porque habla de lo que está
    // pasando en este partido: el que está haciendo un partido perfecto, el que falla mucho, el que anda fino con una mano,
    // y lo que se sabe de los otros partidos del campeonato)
    const dicho = (k, f) => { if (f) o.marca?.(k); return f; };
    if (o.perfecto) add(5, 'perfecto', () => dicho('p' + o.perfecto, this.seguidas(this.frase('r-perfecto'), this.azar(0.4) && this.frase('r-entrena'))));
    // («se le nota cansado» detrás del que falla, solo si el cansado es él)
    if (o.falla) add(5, 'falla', () => dicho('f' + o.falla, this.seguidas(this.frase('r-falla'), o.cansado && (o.cansadoQuien === o.falla || o.cansadoQuien === 'ambos') && this.azar(0.5) && (this.ctx = { ...o, cansadoQuien: o.falla }) && this.frase('m-cansado'))));
    if (o.manoLado === 'R') add(4, 'lado', () => dicho('m' + o.manoQuien, this.frase('r-derecha')));
    else if (o.manoLado === 'L') add(4, 'lado', () => dicho('m' + o.manoQuien, this.frase('r-izquierda')));
    if ((o.mano || 0) >= 3) add(1, 'entrena', () => this.frase('r-entrena', true));
    if (o.otros?.length) add(3, 'otros', () => { for (const k of [...o.otros].sort(() => Math.random() - 0.5)) { const f = this.frase(`o-${k}`, true); if (f) return f; } return null; });
    if (o.sede) add(3, 'sede', () => this.frase(`f-${o.sede}`, true));
    add(3, 'bio', () => this.bio(o.rival));
    add(1, 'bioYo', () => this.bio(o.yo));
    if (o.est) add(2, 'est', () => this.frase(`est-${o.est}`, true));
    add(3, 'historia', () => (this.azar(0.65) && this.dialogo('historia')) || this.frase('h', true));
    add(1, 'grada', () => (this.azar(0.6) && this.dialogo('grada')) || this.frase('r-grada'));
    add(1, 'frontis', () => this.frase('r-frontis'));
    add(2, 'consejo', () => this.frase('r-consejo'));
    add(1, 'material', () => this.frase('r-material', true));
    add(2, 'cancha', () => this.dialogo('cancha'));
    add(2, 'golpes', () => this.dialogo(this.azar(0.5) ? 'gancho' : 'dosparedes'));
    if ((o.mano || 0) >= 2) add(2, 'mano', () => (this.azar(0.5) && this.dialogo('mano')) || this.frase('r-mano'));
    if (o.bola === 'viva') add(2, 'bola', () => (this.azar(0.5) && this.dialogo('viva')) || this.frase('r-viva'));
    else if (o.bola === 'pesada') add(2, 'bola', () => (this.azar(0.5) && this.dialogo('pesada')) || this.frase('r-pesada'));
    if (o.igualado) add(2, 'igualado', () => (this.azar(0.5) && this.dialogo('igualado')) || this.frase('m-igualado'));
    if ((o.tantos || 0) >= 14) add(1, 'piernas', () => this.frase('r-piernas'));
    if ((o.tantos || 0) >= 10) add(1, 'energia', () => this.frase('r-energia'));
    if (o.cansado) add(2, 'cansado', () => (this.azar(0.5) && this.dialogo('cansancio')) || this.seguidas(this.frase('m-cansado'), this.azar(0.5) && this.frase('m-cansado-e')));
    if (o.cuatro) add(2, 'cuatro', () => this.frase('r-cuatro'));
    if (o.parejas) add(2, 'parejas', () => this.frase('r-parejas'));
    if (o.laFinal) add(2, 'camp', () => this.frase('r-final')); else if (o.campeonato) add(1, 'camp', () => this.frase('r-camp'));
    if (o.zurdo) add(1, 'zurdo', () => this.dialogo('zurdo'));
    // (al azar, de lo que haya: si un tema ya no tiene nada que decir, otro)
    while (ops.length) {
      const j = Math.floor(Math.random() * ops.length), [k, fn] = ops[j], f = fn();
      if (f) { this.ultR = k; return f; }
      for (let i = ops.length - 1; i >= 0; i--) if (ops[i][0] === k) ops.splice(i, 1);
    }
    return null;
  }
}
