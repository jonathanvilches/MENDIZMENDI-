// Palabras en euskera que enseñan los vecinos del pueblo. Cada vecino enseña una palabra de lo que está haciendo
// (quien va a por agua, «ura»; quien lleva el pan, «ogia»; quien pasea con lluvia, «euria») y te pregunta si la
// recuerdas. Las que aprendes se guardan en el cuaderno del pueblo (pestaña Euskera) y se repasan con otros vecinos.
// Cada palabra: [euskera, castellano]. El castellano lleva su artículo, como se diría al hablar.
export const HITZAK = {
  base: [['Kaixo', 'hola'], ['Eskerrik asko', 'gracias'], ['Mesedez', 'por favor'], ['Bai', 'sí'], ['Ez', 'no'], ['Agur', 'adiós'],
    ['herria', 'el pueblo'], ['txakurra', 'el perro'], ['ardia', 'la oveja'], ['behia', 'la vaca']],
  misa: [['eliza', 'la iglesia'], ['kanpaia', 'la campana'], ['dorrea', 'la torre'], ['igandea', 'el domingo']],
  compra: [['denda', 'la tienda'], ['gazta', 'el queso'], ['saskia', 'la cesta'], ['dirua', 'el dinero'], ['sagarra', 'la manzana']],
  tertulia: [['Zer moduz?', '¿qué tal?'], ['ondo', 'bien'], ['laguna', 'el amigo, la amiga'], ['Gero arte', 'hasta luego']],
  juego: [['jolastu', 'jugar'], ['korrika', 'corriendo'], ['pilota', 'la pelota'], ['irabazi', 'ganar']],
  fuente: [['ura', 'el agua'], ['iturria', 'la fuente'], ['ibaia', 'el río'], ['hotza', 'frío']],
  pan: [['ogia', 'el pan'], ['etxea', 'la casa'], ['labea', 'el horno'], ['goxoa', 'rico, sabroso']],
  paseo: [['mendia', 'el monte'], ['basoa', 'el bosque'], ['zuhaitza', 'el árbol'], ['bidea', 'el camino'], ['txoria', 'el pájaro']],
  tiempo: [['eguzkia', 'el sol'], ['euria', 'la lluvia'], ['elurra', 'la nieve'], ['gaua', 'la noche'], ['ilargia', 'la luna']],
};
// el título de cada grupo en el cuaderno
export const HITZAK_TEMA = { base: 'Para empezar', misa: 'En la iglesia', compra: 'De compras', tertulia: 'Charlando en la plaza', juego: 'Jugando en la calle',
  fuente: 'En la fuente', pan: 'El pan', paseo: 'De paseo', tiempo: 'El tiempo que hace' };
const ALL = Object.values(HITZAK).flat();
export const HITZAK_N = ALL.length;

/** La palabra que toca enseñar: la primera que aún no sabes de lo que hace el vecino (con el tiempo de ahora delante),
 *  y si no, de las de empezar. null si ya las sabes todas. */
export function nextWord(theme, known, weather = null) {
  const T = HITZAK.tiempo.filter(([eu]) => eu === weather);
  for (const w of [...T, ...(HITZAK[theme] || []), ...HITZAK.base]) if (!known[w[0]]) return w;
  return null;
}
/** Una palabra ya aprendida para repasarla: mejor una que fallaste (1) que una que acertaste (2). */
export function reviewWord(known, rnd = Math.random) {
  const K = ALL.filter(([eu]) => known[eu]); if (!K.length) return null;
  const weak = K.filter(([eu]) => known[eu] < 2), L = weak.length ? weak : K;
  return L[Math.floor(rnd() * L.length)];
}
/** Tres opciones en euskera para la pregunta: la buena y dos más, en orden revuelto. */
export function choicesFor(w, rnd = Math.random) {
  const others = ALL.filter(x => x[0] !== w[0]), out = [w[0]];
  while (out.length < 3) { const o = others[Math.floor(rnd() * others.length)][0]; if (!out.includes(o)) out.push(o); }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
// lo que dicen los vecinos (en castellano; las plantillas de abajo lo pasan al euskera con las dos palabras tal cual)
export const HITZ_TXT = {
  teach: (eu, es) => `Te enseño una palabra en euskera: «${es}» se dice «${eu}».`,
  ask: (es) => `¿Cómo se dice «${es}» en euskera?`,
  review: (es) => `¿Te acuerdas? ¿Cómo se dice «${es}» en euskera?`,
  ok: (eu, es) => `¡Zuzen! «${eu}» es «${es}». Muy bien.`,
  no: (eu, es) => `¡Casi! «${es}» se dice «${eu}». Repásala en tu cuaderno.`,
  toast: (eu, es) => `Palabra nueva en tu cuaderno: «${eu}», ${es}`,
};
// (en euskera, las dos palabras se quedan como están: la pregunta es justo cómo se dice una en la otra lengua)
export const EU_RX_HITZAK = [
  [/^Te enseño una palabra en euskera: «(.+?)» se dice «(.+?)»\.$/, (m, es, eu) => `Hitz bat irakatsiko dizut: «${es}» euskaraz «${eu}» da.`],
  [/^¿Te acuerdas\? ¿Cómo se dice «(.+?)» en euskera\?$/, (m, es) => `Gogoratzen duzu? Nola esaten da «${es}» euskaraz?`],
  [/^¿Cómo se dice «(.+?)» en euskera\?$/, (m, es) => `Nola esaten da «${es}» euskaraz?`],
  [/^¡Zuzen! «(.+?)» es «(.+?)»\. Muy bien\.$/, (m, eu, es) => `Zuzen! «${eu}», gaztelaniaz «${es}». Oso ondo.`],
  [/^¡Casi! «(.+?)» se dice «(.+?)»\. Repásala en tu cuaderno\.$/, (m, es, eu) => `Ia-ia! «${es}» euskaraz «${eu}» da. Errepasatu koadernoan.`],
  [/^Palabra nueva en tu cuaderno: «(.+?)», (.+)$/, (m, eu, es) => `Hitz berria koadernoan: «${eu}», ${es}`],
  [/^(\d+) de (\d+) palabras$/, '$1 / $2 hitz'],
];
