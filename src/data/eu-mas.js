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
  'ganadera': 'abeltzaina', 'ganadero': 'abeltzaina', 'agricultora': 'nekazaria', 'agricultor': 'nekazaria', 'dantzari': 'dantzaria', 'txistulari': 'txistularia',
};
const T = { ...EU_TOWNS, ...EU_ROLES };
// deklinabidea (eu.js-en berdinak, hemen ere bai)
const loc = (n) => /ak$/.test(n) ? n.slice(0, -2) + 'etako' : /(ia|ea)$/.test(n) ? n.slice(0, -1) + 'ko' : /[aeiou]$/i.test(n) ? n + 'ko' : /[nl]$/i.test(n) ? n + 'go' : n + 'ko';
const gen = (n) => /[aeiou]$/i.test(n) ? n + 'ren' : n + 'en';
const ine = (n) => /(ia|ea)$/.test(n) ? n.slice(0, -1) + 'n' : /[aeiou]$/i.test(n) ? n + 'n' : n + 'en';
const ala = (n) => /(ia|ea)$/.test(n) ? n.slice(0, -1) + 'ra' : /[aeiou]$/i.test(n) ? n + 'ra' : n + 'era';
const abl = (n) => /(ia|ea)$/.test(n) ? n.slice(0, -1) + 'tik' : /[aeiou]$/i.test(n) ? n + 'tik' : n + 'etik';
const erg = (n) => /[aeiou]$/i.test(n) ? n + 'k' : n + 'ek';
const pers = (n) => /[aeiou]$/i.test(n) ? n + 'rengana' : n + 'engana';   // «itzuli X-rengana»
const e = (x) => T[x] ?? EU_EXACT[x] ?? MAS[x] ?? x;
const DIRS = { norte: 'Iparraldera', sur: 'Hegoaldera', este: 'Ekialdera', oeste: 'Mendebaldera', noreste: 'Ipar-ekialdera', noroeste: 'Ipar-mendebaldera', sureste: 'Hego-ekialdera', suroeste: 'Hego-mendebaldera' };
const supply = (s) => s.replace(/\bagua\b/g, 'ura').replace(/\bcomida\b/g, 'janaria').replace(/\by\b/g, 'eta');

export const EU_MAS = { ...MAS, ...T };
export const EU_RX_MAS = [
  [/^El sabio de ([^.…!?]+)$/, (m, a) => `${loc(e(a))} jakintsua`], [/^La sabia de ([^.…!?]+)$/, (m, a) => `${loc(e(a))} jakintsua`],
  [/^(\d+) misiones te esperan$/, '$1 misio zure zain'],
  [/^¡Kaixo, (.+?)! Ongi etorri: ¡te damos la bienvenida a (.+)!$/, (m, a, b) => `Kaixo, ${a}! Ongi etorri ${ala(e(b))}!`],
  [/^Aquí hay (\d+) lugares que tienes que conocer: (.+)\.$/, (m, n, l) => `Hemen ${n} leku dituzu ezagutzeko: ${l.split(', ').map(e).join(', ')}.`],
  [/^Visita los lugares importantes \((\d+)\/(\d+)\)$/, 'Bisitatu leku garrantzitsuak ($1/$2)'],
  [/^Cada piedra de (.+) guarda un secreto… ¿serás capaz de descubrirlos todos\?$/, (m, a) => `${loc(e(a))} harri bakoitzak sekretu bat gordetzen du… denak aurkitzeko gai izango zara?`],
  [/^¡Encontrado! (.+)$/, (m, a) => `Aurkituta! ${a}`],
  [/^Encuentra a los (.+?) \((\d+)\/(\d+)\) — escucha sus cencerros$/, (m, a, n, k) => `Aurkitu ${e(a)} (${n}/${k}) — entzun haien joareak`],
  [/^Encuentra a (.+?) \((\d+)\/(\d+)\) — escucha sus cencerros$/, (m, a, n, k) => `Aurkitu ${e(a)} (${n}/${k}) — entzun haren joareak`],
  [/^¡Todos encontrados! Vuelve con (.+)$/, (m, a) => `Denak aurkituta! Itzuli ${pers(e(a))}`],
  [/^Vuelve con (.+)$/, (m, a) => `Itzuli ${pers(e(a))}`], [/^Habla con (.+)$/, (m, a) => `Hitz egin ${e(a)}(r)ekin`.replace(/\(r\)ekin$/, /[aeiou]$/i.test(e(a)) ? 'rekin' : 'ekin')],
  [/^¡Los has encontrado a todos! Así se vive el carnaval en (.+)\.$/, (m, a) => `Denak aurkitu dituzu! Horrela bizi da inauteria ${ine(e(a))}.`],
  [/^Fíjate bien: (.+)$/, (m, a) => `Erreparatu ondo: ${e(a)}`],
  [/^Recoge (\d+) (.+) en los campos\. Te los marco con un brillo\.$/, (m, n, a) => `Bildu ${n} ${e(a)} soroetan. Distira batez markatuko dizkizut.`],
  [/^Recoge (.+) \((\d+)\/(\d+)\)$/, (m, a, n, k) => `Bildu ${e(a)} (${n}/${k})`], [/^Lleva la cosecha a (.+)$/, (m, a) => `Eraman uzta ${pers(e(a))}`],
  [/^A la mochila: (.+) ×(\d+) \(para el trueque en la tienda\)$/, (m, a, n) => `Motxilara: ${e(a)} ×${n} (dendako trukerako)`], [/^A la mochila: (.+)$/, (m, a) => `Motxilara: ${e(a)}`],
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
