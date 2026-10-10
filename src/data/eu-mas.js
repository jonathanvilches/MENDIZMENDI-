// Euskarazko itzulpenaren bigarren zatia (2026-10): menuko fitxak, herrien misioak eta elkarrizketak, mendiak, flora
// eta fauna. Esaldi osoak eu-mas.json-en daude (tools/eu-faltan.mjs-ek aurkitutako testuak); hemen, plantillak.
import MAS from './eu-mas.json';
import { EU_EXACT } from './eu.js';

// herrien eta lekuen euskarazko izenak (testuetan ere aldatzen dira)
export const EU_TOWNS = {
  'Lumbier': 'Irunberri', 'Sangüesa': 'Zangoza', 'Sangüesa / Zangoza': 'Zangoza', 'Estella': 'Lizarra', 'Estella-Lizarra': 'Lizarra',
  'Olite': 'Erriberri', 'Olite / Erriberri': 'Erriberri', 'Ujué': 'Uxue', 'Ujué / Uxue': 'Uxue', 'Puente la Reina': 'Gares', 'Puente la Reina / Gares': 'Gares',
  'Aoiz': 'Agoitz', 'Aoiz / Agoitz': 'Agoitz', 'Pamplona': 'Iruña', 'Pamplona / Iruña': 'Iruña', 'Iruña / Pamplona': 'Iruña', 'Alsasua': 'Altsasu',
  'Altsasu / Alsasua': 'Altsasu', 'Tudela': 'Tutera', 'Marcilla': 'Martzilla', 'Javier': 'Xabier', 'Artajona': 'Artaxoa', 'Roncesvalles': 'Orreaga',
  'Orreaga / Roncesvalles': 'Orreaga', 'Isaba': 'Izaba', 'Isaba / Izaba': 'Izaba', 'Roncal': 'Erronkari', 'Roncal / Erronkari': 'Erronkari',
  'Burgui': 'Burgi', 'Burgui / Burgi': 'Burgi', 'Ochagavía': 'Otsagabia', 'Viana': 'Viana', 'Cortes': 'Cortes', 'Tafalla': 'Tafalla',
  'Leire': 'Leire', 'Monasterio de Leyre': 'Leireko monasterioa', 'Usún': 'Usun', 'Amaiur / Maya del Baztan': 'Amaiur', 'Mendigorría': 'Mendigorria',
  'Peralta': 'Azkoien', 'Lodosa': 'Lodosa', 'Pitillas': 'Pitillas', 'Leyre': 'Leire', 'Yesa': 'Esa',
  'Amaiur / Maya': 'Amaiur', 'Erronkari / Roncal': 'Erronkari', 'Otsagabia / Ochagavía': 'Otsagabia', 'Ochagavía / Otsagabia': 'Otsagabia', 'Javier / Xabier': 'Xabier',
  'Burgi / Burgui': 'Burgi', 'Izaba / Isaba': 'Izaba', 'Zangoza / Sangüesa': 'Zangoza', 'Erriberri / Olite': 'Erriberri', 'Uxue / Ujué': 'Uxue', 'Gares / Puente la Reina': 'Gares',
  'Agoitz / Aoiz': 'Agoitz', 'Alsasua / Altsasu': 'Altsasu', 'Roncesvalles / Orreaga': 'Orreaga',
  'Mesa de los Tres Reyes': 'Hiru Erregeen Mahaia', 'Peña de Ezkaurre': 'Ezkaurre', 'Sierra de Urbasa': 'Urbasa mendilerroa', 'Sierra de Aralar': 'Aralar mendilerroa',
  // eskualdeak
  'Comarca de Pamplona': 'Iruñerria', 'Pirineo': 'Pirinioa', 'Prepirineo': 'Aurrepirinioa', 'Tierra Estella': 'Lizarraldea', 'Valdizarbe-Novenera': 'Izarbeibar-Novenera',
  'Zona Media': 'Erdialdea', 'Ribera Alta': 'Erribera Garaia', 'Ribera': 'Erribera', 'Baztan-Bidasoa': 'Baztan-Bidasoa', 'Larraun-Leitzaldea': 'Larraun-Leitzaldea', 'Sakana': 'Sakana',
};
// lanbideak eta ezizenak, «Izena, lanbidea» eta «Mota · lanbidea» moduetan agertzen direnak
export const EU_ROLES = {
  'del museo': 'museokoa', 'ciclista': 'txirrindularia', 'arqueóloga': 'arkeologoa', 'arqueólogo': 'arkeologoa', 'guía del palacio': 'jauregiko gidaria',
  'guía del castillo': 'gazteluko gidaria', 'guía de la judería': 'juderiako gidaria', 'guía de Pitillas': 'Pitillasko gidaria', 'guía de montaña': 'mendiko gidaria',
  'montañero': 'mendizalea', 'montañera': 'mendizalea', 'molinero': 'errotaria', 'molinera': 'errotaria', 'guarda del río': 'ibaiko zaindaria',
  'guarda de Belagua': 'Belaguako zaindaria', 'guarda de Irati': 'Iratiko zaindaria', 'pelotari': 'pilotaria', 'anillador de aves': 'hegazti-eraztuntzailea',
  'guía': 'gidaria', 'Pastor del encierro': 'Entzierroko artzaina', 'Agricultor de Lodosa': 'Lodosako nekazaria', 'Joven de la comparsa': 'Konpartsako gaztea',
  'Pastor de Urbasa': 'Urbasako artzaina', 'Alcalde de Isaba': 'Izabako alkatea', 'Maestro de música': 'Musika-irakaslea', 'Tratante de ganado': 'Abere-tratularia',
  'Guarda de la foz': 'Arroilako zaindaria', 'harrijasotzaile': 'harrijasotzailea', 'guía del museo': 'museoko gidaria', 'quesera': 'gaztagilea', 'quesero': 'gaztagilea',
  'pastor': 'artzaina', 'pastora': 'artzaina', 'herrero': 'errementaria', 'herrera': 'errementaria', 'cestero': 'saskigilea', 'cestera': 'saskigilea',
  'carbonero': 'ikazkina', 'apicultora': 'erlezaina', 'apicultor': 'erlezaina', 'panadera': 'okina', 'panadero': 'okina', 'viticultor': 'mahastizaina',
  'viticultora': 'mahastizaina', 'tonelero': 'upelgilea', 'cantero': 'hargina', 'almadiero': 'almadiazaina', 'hortelana': 'baratzezaina', 'hortelano': 'baratzezaina',
  'ganadera': 'abeltzaina', 'ganadero': 'abeltzaina', 'agricultora': 'nekazaria', 'agricultor': 'nekazaria', 'dantzari': 'dantzaria', 'txistulari': 'txistularia', 'palomero': 'usazalea', 'guarda forestal': 'basozaina', 'lavandera': 'garbitzailea', 'criador': 'hazlea', 'criadora': 'hazlea', 'peregrino': 'erromesa', 'peregrina': 'erromesa', 'violinista': 'biolin-jolea', 'carnicera': 'harakina', 'Amona Felisa': 'Felisa amona', 'Aizkolari': 'Aizkolaria', 'Cantero': 'Hargina', 'palomera': 'usazalea', 'aizkolari': 'aizkolaria', 'leñador': 'egurgilea',
  'ovejas': 'ardiak', 'vacas': 'behiak', 'cerdos': 'txerriak', 'cabras': 'ahuntzak', 'caballos': 'zaldiak', 'patatas': 'patatak', 'manzanas': 'sagarrak',
};
const T = { ...EU_TOWNS, ...EU_ROLES };
// deklinabidea (eu.js-en berdinak, hemen ere bai)
const loc = (n) => /ak$/.test(n) ? n.slice(0, -2) + 'etako' : /pirinioa$/i.test(n) ? n.slice(0, -1) + 'ko' : /(ia|ea)$/.test(n) ? n.slice(0, -1) + 'ko' : /[aeiou]$/i.test(n) ? n + 'ko' : /[nl]$/i.test(n) ? n + 'go' : n + 'ko';
const rr = (n) => /[aeiou]r$/i.test(n) ? n + 'r' : n;   // «Etxalar» → «Etxalarr-en», «Xabier» → «Xabierr-era»
const gen = (n) => /ak$/.test(n) ? n.slice(0, -2) + 'en' : /[aeiou]$/i.test(n) ? n + 'ren' : rr(n) + 'en';
const ine = (n) => /(ia|ea)$/.test(n) ? n.slice(0, -1) + 'n' : /[aeiou]$/i.test(n) ? n + 'n' : rr(n) + 'en';
const ala = (n) => /(ia|ea)$/.test(n) ? n.slice(0, -1) + 'ra' : /[aeiou]$/i.test(n) ? n + 'ra' : rr(n) + 'era';
const abl = (n) => /(ia|ea)$/.test(n) ? n.slice(0, -1) + 'tik' : /[aeiou]$/i.test(n) ? n + 'tik' : rr(n) + 'etik';
const erg = (n) => /[aeiou]$/i.test(n) ? n + 'k' : rr(n) + 'ek';
const pers = (n) => /[aeiou]$/i.test(n) ? n + 'rengana' : rr(n) + 'engana';   // «itzuli X-rengana»
// lo que cae en un hueco: diccionario o, si no está, el traductor entero (con sus plantillas: «Guía Maite»…)
let TR = null; export const setTr = (f) => { TR = f; };
// «Amaiur / Maya» moduko izen bikoitzak: zerrendan ez badago, euskarazkoa dirudiena (tx, tz, k… eta ez ñ, ll, ch, que…)
const isEu = (w) => !/ñ|ll|ch|qu|c[eiaou]|j/i.test(w);
const pair = (x) => { const m = /^(.+?)\s*\/\s*(.+)$/.exec(x); if (!m) return null; return T[m[1]] ?? T[m[2]] ?? (isEu(m[1]) ? m[1] : isEu(m[2]) ? m[2] : m[1]); };
const e = (x) => T[x] ?? EU_EXACT[x] ?? MAS[x] ?? pair(x) ?? (TR && x.length < 300 ? TR(x) : x);
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const DIRS = { norte: 'Iparraldera', sur: 'Hegoaldera', este: 'Ekialdera', oeste: 'Mendebaldera', noreste: 'Ipar-ekialdera', noroeste: 'Ipar-mendebaldera', sureste: 'Hego-ekialdera', suroeste: 'Hego-mendebaldera' };
const low = (x) => x.charAt(0).toLowerCase() + x.slice(1);
const ec = (a) => { const t = e(a); return t !== a ? t : low(e(cap(a))); };   // («tomate» → «tomatea»: el nombre en minúscula)
const MES = { enero: 'urtarrila', febrero: 'otsaila', marzo: 'martxoa', abril: 'apirila', mayo: 'maiatza', junio: 'ekaina', julio: 'uztaila', agosto: 'abuztua', septiembre: 'iraila', octubre: 'urria', noviembre: 'azaroa', diciembre: 'abendua' };
// «10–14 septiembre» → «irailaren 10–14», «31 julio – 6 agosto» → «uztailaren 31 – abuztuaren 6»
const mes = (x) => { let ok = true;
  const r = x.replace(/(\d+(?:–\d+)?)\s+(?:de\s+)?([a-z]+)/g, (m, d, k) => MES[k] ? `${MES[k].slice(0, -1)}aren ${d}` : ((ok = false), m));
  return ok && r !== x ? r : null; };
const fecha = (x) => { const t = e(x); return t !== x ? t : mes(x) ?? x; };
const FOODS = 'Pan|Moras|Avellanas|Manzana|Queso|Cuajada|Miel|Txistorra|Pimientos asados|Uvas|Tomate|Almendras|Talo con txistorra|Pochas|Espárragos|Alcachofa';
const supply = (s) => s.replace(/\bagua\b/g, 'ura').replace(/\bcomida\b/g, 'janaria').replace(/\by\b/g, 'eta');

export const EU_MAS = { ...MAS, ...T };
export const EU_RX_MAS = [
  // herriko fitxak, oroigarriak, mendiak eta begiratokiak (2026-10, bigarren itzulia)
  [/^Patrimonio de (.+)$/, (m, a) => `${loc(e(a))} ondarea`],
  // herriko liburua, mapa, motxila eta denda
  [/^hacia (\d+)$/, '$1 inguruan'], [/^hacia (\d+) – (\d+)$/, '$1 inguru – $2'], [/^siglo ([IVXL]+)$/, '$1. mendea'],
  [/^Aros (\d+)\/(\d+)$/, 'Uztaiak $1/$2'], [/^Nivel( \d+)? · (\d+) XP$/, 'Maila$1 · $2 XP'], [/^(.+) · comparsa$/, (m, a) => `${e(a)} · konpartsa`],
  [/^(\d+)\/(\d+) misiones · completa todas para ganar el sello$/, '$1/$2 misio · osatu denak zigilua irabazteko'],
  [/^[Cc]on ([A-ZÁÉÍÓÚÑ][^.!?]*)$/, (m, a) => { const t = e(a); return /[aeiou]$/i.test(t) ? t + 'rekin' : rr(t) + 'ekin'; }],
  [/^Naturaleza de (.+)$/, (m, a) => `${loc(e(a))} natura`], [/^Mapa de (.+)$/, (m, a) => `${loc(e(a))} mapa`],
  [/^Energía (\d+) % ·$/, 'Energia $1 % ·'], [/^\+(\d+) energía$/, '+$1 energia'],
  [/^¡(.+?)! Soy (.+?)\. ¿Conoces nuestro producto estrella\? ¡(.+)!$/, (m, h, k, p) => `${e(h)}! ${k} naiz. Ezagutzen duzu gure produktu izarra? ${e(p)}!`],
  [/^Producto estrella de la comarca · (.+)$/, (m, a) => `Eskualdeko produktu izarra · ${e(a)}`], [/^Comprar por (\d+)$/, 'Erosi: $1'],
  [/^(.+), de la tienda$/, (m, a) => `${e(a)}, dendakoa`], [/^¡Que aproveche! (.+)$/, (m, a) => `On egin! ${e(a)}`],
  [/^¡Eskerrik asko! (.+) a cambio de (\d+) txanpon\. Ahora puedes llevarte comida\.$/, (m, a, n) => `Eskerrik asko! ${e(a)}, ${n} txanponen truke. Orain janaria eraman dezakezu.`],
  [/^La tienda del pueblo está a (\d+) m, hacia el (norte|sur|este|oeste|noreste|noroeste|sureste|suroeste): compra comida o cámbiala por lo que traigas del campo\.$/, (m, d, k) => `Herriko denda ${d} m-ra dago, ${low(DIRS[k])}: erosi janaria edo aldatu landatik ekartzen duzunarengatik.`],
  [/^(\d+(?:–\d+)?) (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)$/, (m) => mes(m)],
  [/^Seguir \((\d+)\/(\d+)\)$/, 'Jarraitu ($1/$2)'], [/^Seguir buscando \((\d+)\/(\d+)\)$/, 'Jarraitu bilatzen ($1/$2)'],
  [/^Seguir paseando por (.+)$/, (m, a) => `Jarraitu ${ine(e(a))} paseatzen`], [/^Frontón cubierto de (.+)$/, (m, a) => `${loc(e(a))} pilotaleku estalia`],
  [/^(Torneo por parejas|Torneo de mano) · edición (\d+)$/, (m, a, n) => `${e(a)} · ${n}. edizioa`],
  [/^Seguir jugando en (.+)$/, (m, a) => `Jarraitu jolasten ${ine(e(a))}`], [/^Jugar en (.+)$/, (m, a) => `Jolastu ${ine(e(a))}`],
  [/^(.*?) ?· ficha de (flora|fauna)$/, (m, k, f) => `${k ? e(k) + ' · ' : ''}${f}-fitxa`],
  [/^Has completado una misión en (.+)\.$/, (m, a) => `Misio bat osatu duzu ${ine(e(a))}.`],
  [/^Sabio de (.+)$/, (m, a) => `${loc(e(a))} jakintsua`], [/^Mirador de (.+)$/, (m, a) => `${loc(e(a))} begiratokia`],
  [/^Desde aquí se ven (.+)\.$/, (m, a) => `Hemendik ikusten dira: ${a.split(', ').map(e).join(', ')}.`],
  [/^Buzón de cumbre · (.+)$/, (m, a) => `Gailurreko postontzia · ${e(a)}`],
  [/^Altitud: ([\d.]+) m\.$/, 'Altuera: $1 m.'], [/^En el juego has subido (\d+) m\.$/, 'Jokoan $1 m igo dituzu.'],
  [/^Desde (.+): ([\d,.]+) km y (\d+) m de desnivel\.$/, (m, a, k, g) => `Irteera: ${e(a)} · ${k} km eta ${g} m-ko desnibela.`],
  [/^En la subida has descubierto: (.+)\.$/, (m, a) => `Igoeran aurkitu duzu: ${a.split(', ').map(x => low(e(cap(x)))).join(', ')}.`],
  [/^Desde ((?:[A-ZÁÉÍÓÚÑ][^\s.,:]*)(?: (?:de|del|la|las|los|[A-ZÁÉÍÓÚÑ][^\s.,:]*))*)$/, (m, a) => abl(e(a))],
  [/^([\d,.]+) km · está en el juego$/, '$1 km · jokoan dago'], [/^Hallazgo (\d+) de (\d+)$/, 'Aurkikuntza $1/$2'],
  [/^(Danza|Carnaval|Fiesta|Traje) · (.+)$/, (m, k, a) => `${e(k)} · ${fecha(a)}`],
  [new RegExp(`^(${FOODS}) y (${FOODS})$`), (m, a, b) => `${e(a)} eta ${low(e(b))}`],
  [/^La placa de (.+)$/, (m, a) => `${gen(e(a))} plaka`],
  [/^Ver el recuerdo de (.+)$/, (m, a) => `Ikusi ${gen(e(a))} oroigarria`], [/^Ve a ver el recuerdo de (.+)$/, (m, a) => `Joan ${gen(e(a))} oroigarria ikustera`],
  [/^Ve al recuerdo de (.+): lo verás con el aro dorado\.$/, (m, a) => `Joan ${gen(e(a))} oroigarrira: urrezko uztaiarekin ikusiko duzu.`],
  [/^Has conocido todos los pueblos de (.+)\. Se ilumina en tu mapa de Navarra\.$/, (m, a) => `${loc(e(a))} herri guztiak ezagutu dituzu. Nafarroako zure mapan argitzen da.`],
  [/^Vuelve con (.+) y cierra el trato$/, (m, a) => `Itzuli ${pers(e(a))} eta itxi tratua`], [/^Lleva todo a (.+)$/, (m, a) => `Eraman dena ${pers(e(a))}`],
  [/^(.+) · (\d+) de (\d+)$/, (m, a, n, k) => { const t = e(a); return t === a ? null : `${t} · ${n}/${k}`; }],
  [/^Busca a (.+) entre las casas de (.+)\. Puede huir por las calles de tierra\.$/, (m, a, b) => `Bilatu ${e(a)} ${loc(e(b))} etxeen artean. Lur-kaleetatik ihes egin dezake.`],
  [/^Encuentra a los ([^()—]+)$/, (m, a) => { const t = e('los ' + a); return t === 'los ' + a ? null : `Aurkitu ${t}`; }],
  // misioen esaldi errepikatuak
  [/^¡Ya conoces (.+)! Ahora la gente del pueblo te pedirá ayuda\.$/, (m, a) => `${e(a)} ezagutzen duzu jada! Orain herriko jendeak laguntza eskatuko dizu.`],
  [/^Soy ([^,]+), ([^.]+)\. Ven al banco de trabajo y te enseño cómo se hacía, paso a paso\.$/, (m, a, b) => `${a} naiz, ${e(b)}. Etorri lan-mahaira eta nola egiten zen erakutsiko dizut, pausoz pauso.`],
  [/^Primero: (.+)\. Necesito (\d+)\.$/, (m, a, n) => { const t = e(cap(a)); return t === cap(a) ? null : `Lehenik: ${t.charAt(0).toLowerCase() + t.slice(1)}. ${n} behar ditut.`; }],
  [/^Taller de (.+): paso (\d+) de (\d+)$/, (m, a, n, k) => `${cap(e(a))}aren tailerra: ${n}. urratsa (${k})`],
  [/^Encuentra a ([^()]+)$/, (m, a) => `Aurkitu ${e(a)}`], [/^([^–]+) – ([^–]+)$/, (m, a, b) => { const t = e(a), u = e(b); return t === a && u === b ? null : `${t} – ${u}`; }],
  [/^(.+) · (\d+) contra (\d+)$/, (m, a, n, k) => `${e(a)} · ${n}en kontra ${k}`], [/^Comarca · (.+)$/, (m, a) => `Eskualdea · ${e(a)}`], [/^Encuentra (\d+) montes\.$/, 'Aurkitu $1 mendi.'],
  [/^Recoge ([^.!?()]+)$/, (m, a) => { const t = e(a); return t === a ? null : `Bildu ${t}`; }],
  // lanbidea aurretik: «Apicultora Maite» → «Maite erlezaina»
  [/^(Apicultora|Apicultor|Carnicera|Carnicero|Hospitalera|Hospitalero|Panadera|Panadero|Pastora|Pastor|Quesera|Quesero|Molinera|Molinero) (\S+)$/, (m, r, a) => `${a} ${({ Apicultora: 'erlezaina', Apicultor: 'erlezaina', Carnicera: 'harakina', Carnicero: 'harakina', Hospitalera: 'ospitalaria', Hospitalero: 'ospitalaria', Panadera: 'okina', Panadero: 'okina', Pastora: 'artzaina', Pastor: 'artzaina', Quesera: 'gaztagilea', Quesero: 'gaztagilea', Molinera: 'errotaria', Molinero: 'errotaria' })[r]}`],
  [/^Soy ([^,.]+)\. Ven al banco de trabajo y te enseño cómo se hacía, paso a paso\.$/, (m, a) => `${e(a)} naiz. Etorri lan-mahaira eta nola egiten zen erakutsiko dizut, pausoz pauso.`],
  [/^Construyendo (.+)…$/, (m, a) => `${e(a)} eraikitzen…`], [/^Mirar: (.+)$/, (m, a) => `Begiratu: ${e(a)}`],
  [/^¡Has bailado (.+) como en las fiestas! (\d+)\/(\d+) pasos\.$/, (m, a, n, k) => `${e(a)} dantzatu duzu jaietan bezala! ${n}/${k} urrats.`],
  [/^Sube al? (.+)$/, (m, a) => `Igo ${ala(e(a))}`],
  [/^La cosecha: (.+)$/, (m, a) => `Uzta: ${e(a)}`], [/^Al redil: (.+)$/, (m, a) => `Artegira: ${e(a)}`],
  // txapelketak (menuko pantaila)
  [/^Frontón de (.+)$/, (m, a) => `${loc(e(a))} frontoia`], [/^Pista de (.+)$/, (m, a) => `${loc(e(a))} pista`],
  [/^Tu club: (.+)$/, (m, a) => `Zure kluba: ${e(a)}`], [/^(\d+) txapelas?$/, '$1 txapela'],
  [/^(\d+) partidos · (\d+) ganados$/, '$1 partida · $2 irabazita'],
  [/^(Esku pilota|Pelota a mano) · (.+)$/, (m, a, b) => `Esku pilota · ${e(b)}`],
  // kontagailuak eta « — » zatiak: zati bakoitza bere aldetik (biak itzultzen badira bakarrik)
  [/^(.+?) \((\d+)\/(\d+)\)$/, (m, a, n, k) => { const t = e(a); return t === a ? null : `${t} (${n}/${k})`; }],
  [/^(.+?) \((\d+)\/(\d+)\) — (.+)$/, (m, a, n, k, b) => { const t = e(a), u = e(b); return t === a || u === b ? null : `${t} (${n}/${k}) — ${u}`; }],
  [/^(.+?) — (.+)$/, (m, a, b) => { const t = e(a), u = e(b); return t === a && u === b ? null : `${t} — ${u}`; }],
  // herriko galdetegia
  [/^¿En qué comarca está (.+)\?$/, (m, a) => `Zein eskualdetan dago ${e(a)}?`],
  [/^¿Qué puedes visitar en (.+)\?$/, (m, a) => `Zer bisita dezakezu ${ine(e(a))}?`],
  [/^¿Qué río o regata pasa por (.+)\?$/, (m, a) => `Zein ibai edo erreka igarotzen da ${abl(e(a))}?`],
  [/^¿Cómo se llama la iglesia principal de (.+)\?$/, (m, a) => `Nola du izena ${loc(e(a))} eliza nagusiak?`],
  [/^¿Qué animal vive en los montes de (.+)\?$/, (m, a) => `Zein animalia bizi da ${loc(e(a))} mendietan?`],
  [/^¿Qué fiesta se celebra en (.+)\?$/, (m, a) => `Zein jai ospatzen da ${ine(e(a))}?`],
  [/^¿Qué se cosecha en (.+)\?$/, (m, a) => `Zer biltzen da ${ine(e(a))}?`],
  [/^¿Qué carnaval es famoso en (.+)\?$/, (m, a) => `Zein inauteri da ospetsua ${ine(e(a))}?`],
  [/^¿Qué danza es típica de (.+)\?$/, (m, a) => `Zein dantza da ${loc(e(a))} ohikoa?`],
  [/^¿Qué producto has aprendido a hacer en (.+)\?$/, (m, a) => `Zer produktu egiten ikasi duzu ${ine(e(a))}?`],
  // ekoizpena
  [/^¡Así se hace (.+)! Es un producto de (.+)\.$/, (m, a, b) => `Horrela egiten da ${e(a)}! ${loc(e(b))} produktua da.`],
  [/^¡Perfecto! Ahora hagamos (.+) paso a paso\.$/, (m, a) => `Primeran! Orain egin dezagun ${e(a)} pausoz pauso.`],
  [/^Dicen que la receta de (.+) pasa de abuelas a nietos… y que nunca se ha escrito en ningún libro\.$/, (m, a) => { const t = e(cap(a)); return `Diotenez, ${gen(t === cap(a) ? a : t.charAt(0).toLowerCase() + t.slice(1))} errezeta amonengandik bilobengana pasatzen da… eta ez da inoiz liburu batean idatzi.`; }],
  // kakoak eta ahotsa
  [/^Hay personas que cambiaron (.+)… y su historia todavía se puede escuchar\.$/, (m, a) => `Badira ${e(a)} aldatu zuten pertsonak… eta haien istorioa oraindik entzun daiteke.`],
  [/^La tierra de (.+) esconde su tesoro\. Sólo hay que saber dónde mirar\.$/, (m, a) => `${loc(e(a))} lurrak bere altxorra gordetzen du. Non begiratu jakitea besterik ez da behar.`],
  [/^Cae la noche sobre (.+)…$/, (m, a) => `Gaua dator ${ala(e(a))}…`],
  [/^Ya lo tienes cerca\. Ve con cuidado… (.+) te está esperando\.$/, (m, a) => `Gertu duzu. Kontuz ibili… ${e(a)} zure zain dago.`],
  [/^Las pistas llevan hasta aquí… (.+) está cerca$/, (m, a) => `Arrastoek honaino ekarri zaituzte… ${e(a)} gertu dago`],
  [/^¡Meta! Vuelve con (.+)$/, (m, a) => `Helmuga! Itzuli ${pers(e(a))}`],
  [/^¡Todos en el redil! Vuelve con (.+)$/, (m, a) => `Denak artegian! Itzuli ${pers(e(a))}`],
  [/^El castillo de ([A-ZÁÉÍÓÚÑ][^\s.,]*(?: [^\s.,]+){0,2})$/, (m, a) => `${loc(e(a))} gaztelua`],
  [/^Productos de ([^.…!?]+)$/, (m, a) => `${loc(e(a))} produktuak`],
  [/^El sabio de ([^.…!?]+)$/, (m, a) => `${loc(e(a))} jakintsua`], [/^La sabia de ([^.…!?]+)$/, (m, a) => `${loc(e(a))} jakintsua`],
  [/^(\d+) misiones te esperan$/, '$1 misio zure zain'], [/^Te espera 1 misión$/, 'Misio 1 zure zain'], [/^Ya has hecho todas sus misiones$/, 'Bere misio guztiak egin dituzu'],
  [/^¡Kaixo, (.+?)! Ongi etorri: ¡te damos la bienvenida a (.+)!$/, (m, a, b) => `Kaixo, ${a}! Ongi etorri ${ala(e(b))}!`],
  [/^Aquí hay (\d+) lugares que tienes que conocer: (.+)\.$/, (m, n, l) => `Hemen ${n} leku dituzu ezagutzeko: ${l.split(', ').map(e).join(', ')}.`],
  [/^Visita los lugares importantes \((\d+)\/(\d+)\)$/, 'Bisitatu leku garrantzitsuak ($1/$2)'],
  [/^Cada piedra de (.+) guarda un secreto… ¿serás capaz de descubrirlos todos\?$/, (m, a) => `${loc(e(a))} harri bakoitzak sekretu bat gordetzen du… denak aurkitzeko gai izango zara?`],
  [/^¡Encontrado! (.+)$/, (m, a) => `Aurkituta! ${e(a)}`],
  [/^Encuentra a los (.+?) \((\d+)\/(\d+)\) — escucha sus cencerros$/, (m, a, n, k) => `Aurkitu ${e(a)} (${n}/${k}) — entzun haien joareak`],
  [/^Encuentra a (.+?) \((\d+)\/(\d+)\) — escucha sus cencerros$/, (m, a, n, k) => `Aurkitu ${e(a)} (${n}/${k}) — entzun haren joareak`],
  [/^¡Todos encontrados! Vuelve con (.+)$/, (m, a) => `Denak aurkituta! Itzuli ${pers(e(a))}`],
  [/^Vuelve con (.+)$/, (m, a) => `Itzuli ${pers(e(a))}`], [/^Habla con (.+)$/, (m, a) => `Hitz egin ${e(a)}(r)ekin`.replace(/\(r\)ekin$/, /[aeiou]$/i.test(e(a)) ? 'rekin' : 'ekin')],
  [/^¡Los has encontrado a todos! Así se vive el carnaval en (.+)\.$/, (m, a) => `Denak aurkitu dituzu! Horrela bizi da inauteria ${ine(e(a))}.`],
  [/^Fíjate bien: (.+)$/, (m, a) => `Erreparatu ondo: ${e(a)}`],
  [/^Recoge (\d+) (.+) en los campos\. Te los marco con un brillo\.$/, (m, n, a) => `Bildu ${n} ${e(a)} soroetan. Distira batez markatuko dizkizut.`],
  [/^Recoge (.+) \((\d+)\/(\d+)\)$/, (m, a, n, k) => `Bildu ${e(a)} (${n}/${k})`], [/^Lleva la cosecha a (.+)$/, (m, a) => `Eraman uzta ${pers(e(a))}`],
  [/^A la mochila: (.+) ×(\d+) \(para el trueque en la tienda\)$/, (m, a, n) => `Motxilara: ${ec(a)} ×${n} (dendako trukerako)`], [/^A la mochila: (.+)$/, (m, a) => `Motxilara: ${ec(a)}`],
  [/^¡Hola, (.+?)! Soy quien más sabe de (.+)\. ¿Aceptas mi reto\? Tres preguntas sobre el pueblo y la comarca\.$/, (m, a, b) => `Kaixo, ${a}! ${gen(e(b))} gauzei buruz gehien dakiena naiz. Nire erronka onartzen duzu? Hiru galdera herriari eta eskualdeari buruz.`],
  [/^Responde bien las preguntas \((\d+)\/(\d+)\)$/, 'Erantzun ondo galderei ($1/$2)'],
  [/^Sabi[oa] (\S+): la historia de (.+)$/, (m, a, b) => `${a} jakintsua: ${gen(e(b))} historia`],
  [/^(.+) guarda las respuestas… y sólo las comparte con quien sabe escuchar\.$/, (m, a) => `${erg(e(a))} erantzunak gordetzen ditu… eta entzuten dakienarekin bakarrik partekatzen ditu.`],
  [/^¿Ves ese monte de ahí arriba\? Es como el (.+?) \((.+?)\): (.+)$/, (m, a, b, c) => `Ikusten duzu goiko mendi hori? ${a} bezalakoa da (${b}): ${e(c)}`],
  [/^El de verdad mide (\d+) metros\. Desde (.+) son ([\d,.]+) km y (\d+) metros de desnivel\.$/, (m, a, b, c, d) => `Benetakoak ${a} metro ditu. ${abl(e(b))} ${c} km eta ${d} metroko desnibela daude.`],
  [/^Prepara la mochila: (.+) y vuelve con (.+)$/, (m, a, b) => `Prestatu motxila: ${supply(a)} eta itzuli ${pers(e(b))}`],
  [/^Sigue los mojones hasta la cima \((\d+)\/(\d+)\)(?: · animales (\d+)\/(\d+))?$/, (m, a, b, c, d) => `Jarraitu mugarriei gailurreraino (${a}/${b})${c != null ? ` · animaliak ${c}/${d}` : ''}`],
  [/^¡Cima! (.+), (\d+) m$/, 'Gailurra! $1, $2 m'],
  [/^Al (norte|sur|este|oeste|noreste|noroeste|sureste|suroeste): (.+) · ([\d,.]+) km$/, (m, d, a, k) => `${DIRS[d]}: ${e(a)} · ${k} km`],
  [/^(\d+) pueblos? jugables? · (\d+) sellos? · txapela: (por ganar|ganada)$/, (m, a, b, c) => `${a} herri jokagarri · ${b} zigilu · txapela: ${c === 'ganada' ? 'irabazita' : 'irabazteko'}`],
  [/^Jolastu: (.+)$/, (m, a) => `Jolastu: ${e(a)}`], [/^Ezagutu (.+)$/, (m, a) => `Ezagutu ${e(a)}`], [/^Conoce (.+)$/, (m, a) => `Ezagutu ${e(a)}`],
  [/^Sube a los montes en las misiones de montaña: sigue los mojones hasta el buzón de cumbre\. Llevas$/, 'Igo mendietara mendiko misioetan: jarraitu mugarriei gailurreko postontziraino. Daramatzazu:'],
  // «Izena, lanbidea» (gidaria, artzaina…) eta «Mota · Izena, lanbidea»: lanbidea ezaguna denean bakarrik
  [/^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+), ([^,.;:!?]+)$/, (m, a, b) => EU_ROLES[b] ? `${a}, ${EU_ROLES[b]}` : null],
  [/^Guía (\S+)$/, (m, a) => `${a} gidaria`], [/^Sabi[oa] (\S+)$/, (m, a) => `${a} jakintsua`],
];
// zerrendak («Orkatza, Basurdea…»): elementu guztiak itzultzen badira bakarrik; beste plantilla guztien ondoren
export const EU_RX_LISTA = [
  [/^([^,.:;!?]{2,32}(?:, [^,.:;!?]{2,32})+)$/, (m, a) => { const L = a.split(', '), T = L.map(x => e(x)); return T.every((t, i) => t !== L[i]) ? T.join(', ') : null; }],
];
