// Leer los escudos de las fachadas: el vocabulario de la heráldica (esmaltes, particiones, figuras y timbre), lo que se
// suele decir de cada figura y un generador de escudos de casa según la comarca. Las casas y sus escudos son del juego
// (nombres de casa habituales y armas inventadas con las reglas de la heráldica): no copian el escudo de ninguna familia.
// Fuentes de lo que se enseña: Cátedra de Patrimonio de la Universidad de Navarra (casas y palacios barrocos de Baztán),
// las armas de Navarra en los armoriales (blason.es) y los manuales de heráldica (regla del esmalte, sistema de rayas).

// Esmaltes: dos metales y cuatro colores. En piedra no hay color: desde el siglo XVII se marcan a veces con rayas o
// puntos (el sistema de Petra Sancta), y eso permite «leer» los colores de un escudo tallado
export const ESMALTES = {
  oro: { name: 'oro', es: 'amarillo', metal: true, color: '#e2b43c', piedra: 'puntitos' },
  plata: { name: 'plata', es: 'blanco', metal: true, color: '#f1efe6', piedra: 'liso, sin marcas' },
  gules: { name: 'gules', es: 'rojo', metal: false, color: '#b3202a', piedra: 'rayas verticales' },
  azur: { name: 'azur', es: 'azul', metal: false, color: '#1f4f9a', piedra: 'rayas horizontales' },
  sinople: { name: 'sinople', es: 'verde', metal: false, color: '#2f7d4a', piedra: 'rayas en diagonal' },
  sable: { name: 'sable', es: 'negro', metal: false, color: '#26221f', piedra: 'cuadrícula' },
};
export const METALES = ['oro', 'plata'], COLORES = ['gules', 'azur', 'sinople', 'sable'];

// Particiones del campo
export const PARTICIONES = {
  entero: { name: 'Entero', text: 'Un solo campo, sin dividir.' },
  partido: { name: 'Partido', text: 'Dividido de arriba abajo en dos mitades.' },
  cortado: { name: 'Cortado', text: 'Dividido de lado a lado en dos mitades: la de arriba es el jefe.' },
  cuartelado: { name: 'Cuartelado', text: 'Dividido en cuatro cuarteles. Se leen como un libro: primero arriba a la derecha del escudo (a tu izquierda), luego el de al lado, y después los de abajo. Suele juntar las armas de los cuatro abuelos o de las familias que se unieron por matrimonio.' },
};

// Figuras (muebles y piezas) y lo que se cuenta de ellas
export const FIGURAS = {
  castle: { name: 'Castillo', text: 'Recuerda la defensa de una plaza o el servicio en la guerra. Es de las figuras más frecuentes en los escudos de Navarra.' },
  tower: { name: 'Torre', text: 'Una torre sola: muchas casas solares del norte nacieron como casas torre medievales, como las de Irurita.' },
  oak: { name: 'Árbol', text: 'El árbol habla de la tierra y de la casa solar. En el norte suele ser un roble; a veces lleva un animal pasando junto al tronco.' },
  wolf: { name: 'Lobo', text: 'Muy frecuente en la heráldica vasca y navarra. En euskera lobo es «otso»: de ahí vienen apellidos como Otxoa u Ochoa.' },
  panelas: { name: 'Panelas', text: 'Hojas de álamo en forma de corazón. Son muy típicas de los escudos vascos y navarros, casi siempre en grupos de tres o más.' },
  star: { name: 'Estrella', text: 'Guía y buena fortuna. Las hay de cinco, seis u ocho puntas.' },
  crescent: { name: 'Creciente', text: 'La luna en cuarto creciente, con las puntas hacia arriba.' },
  lion: { name: 'León', text: 'Fuerza y valentía. Es el animal más repetido de la heráldica; el escudo de Pamplona lleva uno.' },
  bend: { name: 'Banda', text: 'Una franja en diagonal desde arriba a la derecha del escudo (a tu izquierda) hasta abajo a la izquierda. Es una «pieza»: una figura geométrica, no un dibujo.' },
  chequy: { name: 'Ajedrezado', text: 'Cuadros alternos como un tablero. El ajedrezado de plata y sable es el del valle de Baztán: aparece en sus casas porque sus vecinos tenían hidalguía colectiva, una nobleza de todo el valle. La tradición lo une a la batalla de Las Navas de Tolosa (1212).' },
};

// Lo que hay alrededor del escudo en las casas barrocas
export const TIMBRE = {
  yelmo: { name: 'Yelmo', text: 'El casco que corona el escudo. A su alrededor caen los lambrequines, unas hojas recortadas que en origen eran la tela que protegía el casco del sol. En las casas barrocas del siglo XVIII son muy grandes y decorativos.' },
};

// Ideas que se aprenden leyendo escudos (salen como pista o pregunta extra)
export const REGLAS = [
  { q: '¿Cuál es la derecha de un escudo?', options: ['La izquierda de quien lo mira', 'La derecha de quien lo mira'], answer: 0, why: 'Un escudo se describe como si lo llevaras puesto delante del pecho: su derecha es tu izquierda cuando lo miras.' },
  { q: 'En heráldica, ¿se suele poner un metal sobre otro metal?', options: ['No: metal sobre color o color sobre metal', 'Sí, cuanto más brillo mejor'], answer: 0, why: 'Es la regla del esmalte: oro y plata van sobre colores y los colores sobre oro o plata, para que se vean bien de lejos.' },
  { q: '¿Por qué tantas casas de Baztán tienen escudo?', options: ['Sus vecinos tenían hidalguía colectiva', 'Porque eran todas castillos'], answer: 0, why: 'Los reyes concedieron la hidalguía a todos los vecinos de algunos valles, entre ellos Baztán. Por eso casi cada casa lucía sus armas en la fachada.' },
];

// Nombres de casa habituales (la casa da nombre a la familia, no al revés)
// (nombres descriptivos y frecuentes, no los de casas o linajes concretos: el escudo es inventado y no se le atribuye a
// ninguna familia real). En el norte, el nombre en euskera dice dónde estaba la casa: se aprende al leerlo
export const CASAS = { Etxeberria: '«casa nueva»', Elizaldea: '«junto a la iglesia»', Iriartea: '«entre los pueblos»', Goienetxea: '«la casa de arriba»', Zubiria: '«la del puente»', Errekaldea: '«junto al arroyo»', Larrea: '«el prado»', Mendiburua: '«la cabecera del monte»', Olaeta: '«donde las ferrerías»', Arotzenea: '«la casa del carpintero»', Errotarena: '«la del molino»', Jauregia: '«el palacio»', Etxegaraia: '«la casa de lo alto»', Landaburua: '«al final del campo»' };
const CASAS_SUR = ['Casa del Mayorazgo', 'Casa del Escribano', 'Casa de la Torre', 'Casa del Arco', 'Casa del Alcalde', 'Casa de los Balcones', 'Casa del Reloj', 'Casa de la Plaza', 'Casa del Cantón', 'Casa del Indiano'];
const BAZTAN = ['elizondo', 'amaiur-maya-del-baztan'];

function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Escudo de una casa del pueblo: { house, part, q: [{ f, c, t, n }], timbre, century } (q: un cuartel por zona; f campo,
 *  c figura, t su esmalte, n cuántas). Siempre respeta la regla del esmalte. */
export function houseArms(def, idx) {
  const r = rng(hash((def.id || 'pueblo') + ':' + idx)), pick = (a) => a[Math.floor(r() * a.length)];
  const north = def.family === 'atlantic' || def.family === 'pyrenean' || ['bidasoa', 'larraun-leitzaldea', 'sakana', 'pirineo'].includes(def.comarca);
  const baztan = BAZTAN.includes(def.id);
  const charges = north ? ['oak', 'wolf', 'panelas', 'tower', 'star', 'bend', 'crescent'] : ['castle', 'lion', 'star', 'tower', 'crescent', 'bend', 'oak'];
  const part = baztan ? (r() < 0.5 ? 'partido' : 'cuartelado') : pick(['entero', 'partido', 'cortado', 'cuartelado', 'cuartelado']);
  const n = part === 'entero' ? 1 : part === 'cuartelado' ? 4 : 2;
  const q = [];
  for (let i = 0; i < n; i++) {
    // en Baztán, uno de los cuarteles es el ajedrezado del valle
    if (baztan && i === (part === 'cuartelado' ? 3 : 1)) { q.push({ f: 'plata', c: 'chequy', t: 'sable', n: 1 }); continue; }
    const metalField = r() < 0.45, f = metalField ? pick(METALES) : pick(COLORES);
    const c = pick(charges), t = metalField ? pick(COLORES) : pick(METALES);
    q.push({ f, c, t, n: c === 'panelas' ? 3 : c === 'wolf' && r() < 0.4 ? 2 : c === 'star' && r() < 0.5 ? 3 : 1 });
  }
  // sin dos cuarteles iguales
  for (let i = 1; i < q.length; i++) if (q[i].c === q[i - 1].c && q[i].c !== 'chequy') { q[i].c = charges[(charges.indexOf(q[i].c) + 2) % charges.length]; q[i].n = q[i].c === 'panelas' ? 3 : 1; }
  // nombres sin repetirse dentro del mismo pueblo
  const names = north ? Object.keys(CASAS) : CASAS_SUR, start = hash(def.id || 'pueblo') % names.length;
  return { house: names[(start + idx * 3) % names.length], part, q, timbre: 'yelmo', century: r() < 0.7 ? 'XVIII' : 'XVII', baztan };
}

// la descripción en lenguaje de heraldista (el «blasón»)
const ORD = ['1.º', '2.º', '3.º', '4.º'];
const NUM = ['', 'un', 'dos', 'tres', 'cuatro'];
function figura(x) {
  if (x.c === 'chequy') return `ajedrezado de ${x.f} y ${x.t}`;
  const F = FIGURAS[x.c].name.toLowerCase();
  const plural = x.n > 1 ? (F.endsWith('n') ? F + 'es' : F.endsWith('s') ? F : F + 's') : F;
  if (x.c === 'bend') return `de ${x.f}, una banda de ${x.t}`;
  if (x.c === 'panelas') return `de ${x.f}, ${NUM[Math.max(3, x.n)]} panelas de ${x.t}`;
  return `de ${x.f}, ${x.n > 1 ? NUM[x.n] : (x.c === 'tower' || x.c === 'star' ? 'una' : 'un')} ${plural} de ${x.t}`;
}
export function blazon(A) {
  const P = PARTICIONES[A.part].name;
  const body = A.q.length === 1 ? figura(A.q[0]) : A.q.map((x, i) => `${ORD[i]} ${figura(x)}`).join('; ');
  return `${A.part === 'entero' ? body[0].toUpperCase() + body.slice(1) : P + ': ' + body}. Timbrado de yelmo con lambrequines.`;
}
// el mismo blasón en euskera: «Eremu gorrian, urrezko gaztelu bat»; los metales van delante de la figura (urrezko,
// zilarrezko) y los colores detrás (otso beltz bat)
const EU_ADJ = { oro: 'urrezko', plata: 'zilarrezko', gules: 'gorri', azur: 'urdin', sinople: 'berde', sable: 'beltz' };
const EU_CAMPO = { oro: 'urrezko eremuan', plata: 'zilarrezko eremuan', gules: 'eremu gorrian', azur: 'eremu urdinean', sinople: 'eremu berdean', sable: 'eremu beltzean' };
const EU_FIG = { castle: 'gaztelu', tower: 'dorre', oak: 'zuhaitz', wolf: 'otso', panelas: 'panela', star: 'izar', crescent: 'ilargi-adar', lion: 'lehoi', bend: 'banda' };
const EU_NUM = ['', 'bat', 'bi', 'hiru', 'lau'];
const EU_PART = { partido: 'Zatitua', cortado: 'Ebakia', cuartelado: 'Laurdendua' };
function figuraEU(x) {
  if (x.c === 'chequy') return x.f === 'plata' && x.t === 'sable' ? 'xake-taula, zilarrezko eta beltzezko laukiekin' : `xake-taula, ${EU_ADJ[x.f]} eta ${EU_ADJ[x.t]}`;
  const n = x.c === 'panelas' ? Math.max(3, x.n) : x.n, F = EU_FIG[x.c], adj = EU_ADJ[x.t], metal = x.t === 'oro' || x.t === 'plata';
  const fig = metal ? (n > 1 ? `${EU_NUM[n]} ${adj} ${F}` : `${adj} ${F} bat`) : (n > 1 ? `${EU_NUM[n]} ${F} ${adj}` : `${F} ${adj} bat`);
  return `${EU_CAMPO[x.f]}, ${fig}`;
}
const up = (s) => s[0].toUpperCase() + s.slice(1);
export function blazonEU(A) {
  const body = A.q.length === 1 ? up(figuraEU(A.q[0])) : `${EU_PART[A.part]}: ` + A.q.map((x, i) => `${i + 1}.ean, ${figuraEU(x)}`).join('; ');
  return `${body}. Gainean, kasko bat lanbrekinekin.`;
}
